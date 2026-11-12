'use client'

import { toast, useAuth, useConfig, useDocumentInfo } from '@payloadcms/ui'
import {
  BadgeCheck,
  Check,
  Copy,
  History,
  Mail,
  MessageCircle,
  MessagesSquare,
  Phone,
  PhoneOff,
  Shield,
  Trophy,
  UserRound,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { isCrmAdminUser } from '@/access/roles'
import { STATUS_LEAD } from '@/collections/Crm/opcoes'
import { CANAIS_CONTATO, RESULTADOS_CANAL_RUIM, RESULTADOS_CONTATO } from '@/collections/Crm/opcoesContato'
import { formatarTelefone } from '@/crm/visual'
import { MeuDiaBotao } from './celulas/MeuDiaBotao'
import { Status } from './celulas/StatusCell'
import { FormDesfecho, FormQualificacao, FormTitular } from './Formularios'
import { Mensagens, type Destino } from './mensagens/Mensagens'

import './PainelContato.css'
import './celulas/celulas.css'

type Telefone = { numero: string; tipo?: string | null; valido?: boolean | null; semWhatsapp?: boolean | null }
type Contato = {
  id: number
  nome?: string | null
  email?: string | null
  emailInvalido?: boolean | null
  papel?: string | null
  naoContatar?: boolean | null
  telefones?: Telefone[] | null
}
type Usuario = { id: number; name?: string | null; email?: string }
type Empresa = {
  id: number
  razaoSocial: string
  nomeFantasia?: string | null
  cidade?: string | null
  uf?: string | null
  status: string
  naoContatar?: boolean | null
  telefones?: Telefone[] | null
  retornarEm?: string | null
  vendedor?: number | Usuario | null
}
type Evento = { id: string; quando: string; tipo: 'tentativa' | 'status' | 'qualificacao' | 'desfecho'; titulo: string; detalhe?: string[]; quem?: string | null }

type Canal = { tipo: 'telefone' | 'email'; valor: string; rotulo: string; celular?: boolean; whatsapp?: boolean; contatoId?: number }
type Acao = null | 'tentativa' | 'mensagem' | 'qualificacao' | 'desfecho' | 'titular'

const rotulo = (lista: { label: string; value: string }[], v: string | null | undefined) =>
  lista.find((o) => o.value === v)?.label ?? v ?? ''

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

// Uma tentativa pode usar vários canais de uma vez (ex.: mandou WhatsApp e e-mail): grava um registro por canal
type FormTentativa = {
  canais: string[]
  usados: Record<string, string>
  contato: string
  resultados: Record<string, string>
  observacao: string
  proximoPasso: string
  proximoPassoData: string
  quando: string
}
const vazio: FormTentativa = {
  canais: ['ligacao'],
  usados: {},
  contato: '',
  resultados: {},
  observacao: '',
  proximoPasso: '',
  proximoPassoData: '',
  quando: '',
}
type CanalEscolhido = { canal: string; valor?: string; contatoId?: number }
const NOME_CANAL: Record<string, string> = { ligacao: 'Ligação', whatsapp: 'WhatsApp', email: 'E-mail', outro: 'Outro' }

// Resultados que só fazem sentido em um canal
const SO_NO_CANAL: Record<string, string[]> = {
  numero_invalido: ['ligacao', 'whatsapp'],
  sem_whatsapp: ['whatsapp'],
  email_invalido: ['email'],
}
const resultadosDoCanal = (canal: string) =>
  RESULTADOS_CONTATO.filter((o) => !SO_NO_CANAL[o.value] || SO_NO_CANAL[o.value]!.includes(canal))

const AVISO_RESULTADO: Record<string, string> = {
  numero_invalido: 'O telefone usado será marcado como inválido e sai do sorteio.',
  sem_whatsapp: 'O número será marcado como “não tem WhatsApp”: continua para ligação, sai do WhatsApp.',
  email_invalido: 'O e-mail será marcado como “não existe”: sai das mensagens.',
  nao_contatar: 'nao_contatar',
}

// A ficha fica DENTRO do formulário do Payload: um <form> aqui seria ignorado pelo navegador
// e o botão salvaria a empresa. Por isso <div> + onClick, e Enter num campo não envia nada.
const semEnter = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault()
}

const nomeUsuario = (u: Empresa['vendedor']) =>
  u && typeof u === 'object' ? u.name || u.email?.split('@')[0] || `Usuário ${u.id}` : u ? `Usuário ${u}` : null

const copiar = (texto: string, msg: string) =>
  navigator.clipboard.writeText(texto).then(
    () => toast.success(msg),
    () => toast.error('Não foi possível copiar.'),
  )

const RESULTADO_QUALIF: Record<string, string> = { qualificado: 'Qualificado', retornar_depois: 'Retornar depois', descartado: 'Descartado' }
const RESULTADO_DESFECHO: Record<string, string> = { venda_realizada: 'Venda realizada', venda_nao_realizada: 'Venda não realizada' }

// Topo da ficha da empresa: quem é, status, canais (ligar / WhatsApp / e-mail, com copiar),
// mensagem pronta, ações (tentativa, qualificação, desfecho, Meu dia, LGPD) e o histórico completo.
// Tudo que é registrado aqui já nasce ligado à empresa. Usa a API REST com o login de quem usa.
export default function PainelContato() {
  const { id } = useDocumentInfo()
  const { user } = useAuth()
  const {
    config: { serverURL, routes },
  } = useConfig()
  const api = `${serverURL ?? ''}${routes.api}`
  const router = useRouter()

  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [contatos, setContatos] = useState<Contato[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [diaMarcado, setDiaMarcado] = useState<string | null | undefined>(undefined)
  const [form, setForm] = useState(vazio)
  const [acao, setAcao] = useState<Acao>(null)
  const [salvando, setSalvando] = useState(false)
  // Mensagem copiada / aberta no WhatsApp: oferece registrar a tentativa já preenchida
  // (acumula: se mandou WhatsApp e e-mail, o registro já vem com os dois)
  const [envio, setEnvio] = useState<Partial<Record<'whatsapp' | 'email', Destino | undefined>>>({})
  const admin = isCrmAdminUser(user)

  const carregar = useCallback(async () => {
    if (!id) return
    const obter = (url: string) => fetch(`${api}${url}`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null))
    const hoje = new Date()
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    const [e, c, r, m, q, d, dia] = await Promise.all([
      obter(`/crm-empresas/${id}?depth=1&joins=false`),
      obter(`/crm-contatos?where[empresa][equals]=${id}&depth=0&limit=50`),
      obter(`/crm-registros-contato?where[empresa][equals]=${id}&sort=-dataHora&limit=50&depth=1`),
      obter(`/crm-movimentacoes?where[empresa][equals]=${id}&sort=-createdAt&limit=50&depth=0`),
      obter(`/crm-qualificacoes?where[empresa][equals]=${id}&sort=-createdAt&limit=20&depth=0`),
      obter(`/crm-desfechos?where[empresa][equals]=${id}&sort=-data&limit=20&depth=0`),
      user
        ? obter(`/crm-dia-itens?where[empresa][equals]=${id}&where[usuario][equals]=${user.id}&where[dia][greater_than_equal]=${hojeStr}&sort=dia&limit=1&depth=0`)
        : null,
    ])
    setEmpresa(e)
    setContatos(c?.docs ?? [])
    setDiaMarcado(dia?.docs?.[0]?.dia ?? null)

    const ev: Evento[] = []
    for (const x of r?.docs ?? []) {
      const pessoa = x.contato && typeof x.contato === 'object' ? x.contato.nome : null
      ev.push({
        id: `r${x.id}`,
        quando: x.dataHora,
        tipo: 'tentativa',
        titulo: `${rotulo(CANAIS_CONTATO, x.canal).replace(' (manual)', '')} · ${rotulo(RESULTADOS_CONTATO, x.resultado)}`,
        detalhe: [
          [x.telefoneUsado && (/^\d+$/.test(x.telefoneUsado) ? formatarTelefone(x.telefoneUsado) : x.telefoneUsado), pessoa].filter(Boolean).join(' · '),
          x.observacao,
          x.proximoPasso && `Próximo passo: ${x.proximoPasso}${x.proximoPassoData ? ` (${dataHora(x.proximoPassoData)})` : ''}`,
        ].filter(Boolean),
        quem: x.registradoPorNome,
      })
    }
    for (const x of m?.docs ?? []) {
      ev.push({
        id: `m${x.id}`,
        quando: x.createdAt,
        tipo: 'status',
        titulo: `Status: ${x.de ? `${rotulo(STATUS_LEAD, x.de)} → ` : ''}${rotulo(STATUS_LEAD, x.para)}`,
        detalhe: [x.motivo].filter(Boolean),
        quem: x.usuarioNome,
      })
    }
    for (const x of q?.docs ?? []) {
      ev.push({
        id: `q${x.id}`,
        quando: x.createdAt,
        tipo: 'qualificacao',
        titulo: `Qualificação · ${RESULTADO_QUALIF[x.resultado] ?? x.resultado}`,
        detalhe: [x.graos && `Grãos: ${x.graos}`, x.interesse && `Interesse: ${x.interesse}`, x.observacao].filter(Boolean),
        quem: x.registradoPorNome,
      })
    }
    for (const x of d?.docs ?? []) {
      ev.push({
        id: `d${x.id}`,
        quando: x.data,
        tipo: 'desfecho',
        titulo: RESULTADO_DESFECHO[x.resultado] ?? x.resultado,
        detalhe: [x.observacao].filter(Boolean),
        quem: x.registradoPorNome,
      })
    }
    ev.sort((a, b) => (a.quando < b.quando ? 1 : -1))
    setEventos(ev)
  }, [api, id, user])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // Empresa já marcada como "Em contato" (ou adiante) sem nenhuma tentativa gravada:
  // abre o registro da tentativa logo ao entrar, para o contato entrar no histórico e no Meu dia
  const [semTentativa, setSemTentativa] = useState(false)
  const conferido = useRef(false)
  useEffect(() => {
    if (!empresa || conferido.current) return
    conferido.current = true
    const tentativas = eventos.filter((e) => e.tipo === 'tentativa').length
    if (empresa.status !== 'na_fila' && !empresa.naoContatar && tentativas === 0) {
      setSemTentativa(true)
      setForm(vazio)
      setAcao('tentativa')
    }
  }, [empresa, eventos])

  if (!id) {
    return (
      <div className="crm-contato crm-contato--novo">
        Preencha o cadastro (aba <strong>Cadastro</strong>) e salve. Depois desta etapa aparecem aqui os canais, a mensagem
        pronta e as ações.
      </div>
    )
  }
  if (!empresa) return <div className="crm-contato crm-contato--carregando">Carregando…</div>

  // Canais que existem (telefones válidos e e-mails), sem repetir, fora de quem pediu para não ser contatado
  const canais: Canal[] = []
  const vistos = new Set<string>()
  const addTelefones = (lista: Telefone[] | null | undefined, rot: string, contatoId?: number) => {
    for (const t of lista ?? []) {
      if (t.valido === false || vistos.has(t.numero)) continue
      vistos.add(t.numero)
      const celular = t.tipo === 'celular'
      canais.push({ tipo: 'telefone', valor: t.numero, rotulo: rot, celular, whatsapp: celular && !t.semWhatsapp, contatoId })
    }
  }
  addTelefones(empresa.telefones, 'Empresa')
  for (const c of contatos) {
    if (c.naoContatar) continue
    addTelefones(c.telefones, c.nome || 'Contato', c.id)
    if (c.email && !c.emailInvalido && !vistos.has(c.email)) {
      vistos.add(c.email)
      canais.push({ tipo: 'email', valor: c.email, rotulo: c.nome || 'Contato', contatoId: c.id })
    }
  }
  const todosTelefones = [...(empresa.telefones ?? []), ...contatos.flatMap((c) => c.telefones ?? [])]
  const problemas = (
    [
      [todosTelefones.filter((t) => t.valido === false).length, 'telefone inválido', 'telefones inválidos'],
      [todosTelefones.filter((t) => t.valido !== false && t.semWhatsapp).length, 'celular sem WhatsApp', 'celulares sem WhatsApp'],
      [contatos.filter((c) => c.email && c.emailInvalido).length, 'e-mail que não existe', 'e-mails que não existem'],
    ] as [number, string, string][]
  )
    .filter(([n]) => n > 0)
    .map(([n, um, varios]) => `${n} ${n === 1 ? um : varios}`)
  const bloqueado = Boolean(empresa.naoContatar)
  const tem = {
    whatsapp: canais.some((c) => c.whatsapp),
    telefone: canais.some((c) => c.tipo === 'telefone'),
    email: canais.some((c) => c.tipo === 'email'),
  }
  const destinos: Destino[] = canais
    .filter((c) => c.tipo === 'email' || c.whatsapp)
    .map((c) => ({ tipo: c.tipo === 'email' ? 'email' : 'whatsapp', valor: c.valor, pessoa: c.rotulo === 'Empresa' ? '' : c.rotulo, contatoId: c.contatoId }))

  const abrirTentativa = (escolhidos: CanalEscolhido[], resultado = '') => {
    const pessoa = escolhidos.find((e) => e.contatoId)?.contatoId
    setForm({
      ...vazio,
      canais: escolhidos.map((e) => e.canal),
      usados: Object.fromEntries(escolhidos.filter((e) => e.valor).map((e) => [e.canal, e.valor!])),
      resultados: Object.fromEntries(escolhidos.map((e) => [e.canal, resultado])),
      contato: pessoa ? String(pessoa) : '',
    })
    setAcao('tentativa')
  }

  const alternarCanal = (canal: string) =>
    setForm((f) => ({
      ...f,
      canais: f.canais.includes(canal)
        ? f.canais.filter((c) => c !== canal)
        : CANAIS_CONTATO.map((o) => o.value).filter((v) => v === canal || f.canais.includes(v)),
      // canal novo começa com o mesmo resultado dos outros (ex.: os dois "aguardando retorno")
      resultados: f.resultados[canal]
        ? f.resultados
        : { ...f.resultados, [canal]: Object.values(f.resultados).find((r) => r && !RESULTADOS_CANAL_RUIM.includes(r)) ?? '' },
    }))

  const opcoesDoCanal = (canal: string) =>
    canais.filter((c) =>
      canal === 'ligacao' ? c.tipo === 'telefone' : canal === 'whatsapp' ? c.whatsapp : canal === 'email' ? c.tipo === 'email' : true,
    )

  const depoisDeSalvar = async () => {
    setAcao(null)
    await carregar()
    router.refresh()
  }

  const registrar = async () => {
    if (!form.canais.length) return toast.error('Marque pelo menos um canal.')
    for (const canal of form.canais) {
      const res = form.resultados[canal]
      if (!res) return toast.error(`Escolha o resultado de ${NOME_CANAL[canal] ?? canal}.`)
      if (RESULTADOS_CANAL_RUIM.includes(res) && !form.usados[canal])
        return toast.error(`Em ${NOME_CANAL[canal] ?? canal}, escolha ${canal === 'email' ? 'o e-mail' : 'o número'} usado para o sistema corrigir.`)
    }
    setSalvando(true)
    const dataHora = form.quando ? new Date(form.quando).toISOString() : new Date().toISOString()
    const feitos: string[] = []
    for (const canal of form.canais) {
      const r = await fetch(`${api}/crm-registros-contato`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: id,
          canal,
          telefoneUsado: form.usados[canal] || undefined,
          contato: form.contato ? Number(form.contato) : undefined,
          resultado: form.resultados[canal],
          observacao: form.observacao || undefined,
          proximoPasso: form.proximoPasso || undefined,
          proximoPassoData: form.proximoPassoData ? new Date(form.proximoPassoData).toISOString() : undefined,
          dataHora,
        }),
      })
      if (!r.ok) {
        const json = await r.json().catch(() => ({}))
        const msg = json?.errors?.[0]?.data?.errors?.[0]?.message || json?.errors?.[0]?.message
        setSalvando(false)
        toast.error(
          `${feitos.length ? `Gravado: ${feitos.join(', ')}. ` : ''}Não foi possível registrar ${NOME_CANAL[canal] ?? canal}${msg ? `: ${msg}` : '.'}`,
        )
        if (feitos.length) await depoisDeSalvar()
        return
      }
      feitos.push(NOME_CANAL[canal] ?? canal)
    }
    setSalvando(false)
    toast.success(feitos.length > 1 ? `Tentativa registrada (${feitos.join(' e ')}).` : 'Tentativa registrada.')
    setForm(vazio)
    setSemTentativa(false)
    await depoisDeSalvar()
  }
  const vendedor = nomeUsuario(empresa.vendedor)
  const local = [empresa.cidade, empresa.uf?.toUpperCase()].filter(Boolean).join(' / ')
  const formBase = { api, empresa: empresa.id, aoSalvar: depoisDeSalvar, aoCancelar: () => setAcao(null) }

  const BotaoAcao = ({ valor, Icone, children }: { valor: Exclude<Acao, null>; Icone: typeof Phone; children: React.ReactNode }) => (
    <button
      type="button"
      className={`crm-acao${acao === valor ? ' crm-acao--ativa' : ''}`}
      onClick={() => (acao === valor ? setAcao(null) : valor === 'tentativa' ? abrirTentativa([{ ...canais[0], canal: canais[0]?.tipo === 'email' ? 'email' : 'ligacao' }]) : setAcao(valor))}
    >
      <Icone size={14} /> {children}
    </button>
  )

  return (
    <div className="crm-contato">
      {/* Cabeçalho: empresa, status, vendedor, canais e Meu dia */}
      <div className="crm-ficha__topo">
        <div className="crm-ficha__quem">
          <h3>{empresa.nomeFantasia || empresa.razaoSocial}</h3>
          <span className="crm-ficha__sub">
            {empresa.nomeFantasia && empresa.nomeFantasia !== empresa.razaoSocial ? `${empresa.razaoSocial} · ` : ''}
            {local}
          </span>
        </div>
        <div className="crm-ficha__etiquetas">
          <Status status={empresa.status} />
          <span className={`crm-ficha__vendedor${vendedor ? '' : ' crm-ficha__vendedor--vazio'}`}>
            <UserRound size={13} /> {vendedor ?? 'Sem vendedor'}
          </span>
          <span className="crm-cel-canais" aria-label="Canais">
            {[
              { k: 'whatsapp', I: MessageCircle, cor: '#16A34A', n: 'WhatsApp' },
              { k: 'telefone', I: Phone, cor: '#2563EB', n: 'Telefone' },
              { k: 'email', I: Mail, cor: '#F4791F', n: 'E-mail' },
            ].map(({ k, I, cor, n }) => (
              <span
                key={k}
                className={`crm-cel-canal${tem[k as keyof typeof tem] ? ' crm-cel-canal--ativo' : ''}`}
                style={{ '--cor': cor } as React.CSSProperties}
                title={tem[k as keyof typeof tem] ? `Tem ${n}` : `Sem ${n}`}
              >
                <I size={13} strokeWidth={2.2} />
              </span>
            ))}
          </span>
          {!bloqueado && diaMarcado !== undefined && <MeuDiaBotao empresa={empresa.id} diaMarcado={diaMarcado} comData />}
        </div>
      </div>
      {empresa.retornarEm && <p className="crm-ficha__retorno">Retornar em {dataHora(empresa.retornarEm)}</p>}
      {semTentativa && eventos.every((e) => e.tipo !== 'tentativa') && (
        <p className="crm-ficha__pendente">
          Esta empresa está como <strong>{rotulo(STATUS_LEAD, empresa.status)}</strong>, mas nenhuma tentativa foi registrada.
          Preencha abaixo como foi o contato: ele entra no histórico, na aba Tentativas e no Meu dia.
        </p>
      )}

      {bloqueado ? (
        <p className="crm-contato__bloqueio">
          <PhoneOff size={14} /> Esta empresa está marcada como <strong>Não contatar</strong>.
        </p>
      ) : (
        <>
          {canais.length === 0 ? (
            <p className="crm-contato__vazio">
              Nenhum telefone válido ou e-mail. Inclua uma pessoa na aba “Pessoas de contato” ou um telefone em “Cadastro”.
            </p>
          ) : (
            <ul className="crm-contato__canais">
              {canais.map((c) => (
                <li key={`${c.tipo}-${c.valor}`}>
                  <span className="crm-contato__valor">
                    {c.tipo === 'telefone' ? formatarTelefone(c.valor) : c.valor}
                    <small>
                      {c.rotulo}
                      {c.tipo === 'telefone' ? ` · ${c.celular ? (c.whatsapp ? 'celular' : 'celular sem WhatsApp') : 'fixo'}` : ''}
                    </small>
                  </span>
                  <span className="crm-contato__acoes">
                    <button
                      type="button"
                      className="crm-btn crm-btn--icone"
                      title="Copiar"
                      onClick={() => copiar(c.valor, c.tipo === 'email' ? 'E-mail copiado.' : 'Número copiado.')}
                    >
                      <Copy size={13} />
                    </button>
                    {c.tipo === 'telefone' && (
                      <>
                        <a href={`tel:+55${c.valor}`} onClick={() => abrirTentativa([{ ...c, canal: 'ligacao' }])} className="crm-btn crm-btn--ligar">
                          <Phone size={13} /> Ligar
                        </a>
                        {c.whatsapp && (
                          <button
                            type="button"
                            onClick={() => setAcao('mensagem')}
                            className="crm-btn crm-btn--whats"
                          >
                            <MessageCircle size={13} /> WhatsApp
                          </button>
                        )}
                      </>
                    )}
                    {c.tipo === 'email' && (
                      <button type="button" onClick={() => setAcao('mensagem')} className="crm-btn crm-btn--email">
                        <Mail size={13} /> E-mail
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {problemas.length > 0 && (
            <p className="crm-contato__invalidos">Fora dos contatos: {problemas.join(' · ')}.</p>
          )}

          <div className="crm-acoes">
            <BotaoAcao valor="mensagem" Icone={MessagesSquare}>
              Mensagem pronta
            </BotaoAcao>
            <BotaoAcao valor="tentativa" Icone={Phone}>
              Registrar tentativa
            </BotaoAcao>
            <BotaoAcao valor="qualificacao" Icone={BadgeCheck}>
              Qualificar
            </BotaoAcao>
            <BotaoAcao valor="desfecho" Icone={Trophy}>
              Desfecho da venda
            </BotaoAcao>
            {admin && (
              <BotaoAcao valor="titular" Icone={Shield}>
                Pedido LGPD
              </BotaoAcao>
            )}
          </div>

          {acao === 'mensagem' && (
            <Mensagens
              empresa={empresa.nomeFantasia || empresa.razaoSocial}
              cidade={empresa.cidade ?? ''}
              uf={empresa.uf ?? ''}
              remetentePadrao={(user as { name?: string | null } | null)?.name?.split(' ')[0] ?? ''}
              destinos={destinos}
              aoEnviar={(canal, destino) => setEnvio((e) => ({ ...e, [canal]: destino }))}
            />
          )}
          {acao === 'mensagem' && Object.keys(envio).length > 0 && (
            <div className="crm-ficha__envio">
              <span>Enviou a mensagem? Registre a tentativa para ela contar no Meu dia.</span>
              <button
                type="button"
                className="crm-btn crm-btn--registrar"
                onClick={() => {
                  const enviados = (['whatsapp', 'email'] as const)
                    .filter((k) => k in envio)
                    .map((k) => ({ canal: k, valor: envio[k]?.valor, contatoId: envio[k]?.contatoId }))
                  abrirTentativa(enviados, 'aguardando_retorno')
                  setEnvio({})
                }}
              >
                Registrar envio por {(['whatsapp', 'email'] as const).filter((k) => k in envio).map((k) => (k === 'whatsapp' ? 'WhatsApp' : 'e-mail')).join(' e ')}
              </button>
            </div>
          )}

          {acao === 'tentativa' && (
            <div className="crm-contato__form" role="form" onKeyDown={semEnter}>
              <h4>Tentativa de contato</h4>
              <div className="crm-contato__canais">
                <span>Canais usados (pode marcar mais de um)</span>
                <div>
                  {CANAIS_CONTATO.map((o) => {
                    const on = form.canais.includes(o.value)
                    return (
                      <button
                        key={o.value}
                        type="button"
                        className={`crm-chip${on ? ' crm-chip--on' : ''}`}
                        aria-pressed={on}
                        onClick={() => alternarCanal(o.value)}
                      >
                        {on ? <Check size={12} /> : null}
                        {NOME_CANAL[o.value] ?? o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="crm-tentativa__canais">
                {form.canais.map((canal) => {
                  const res = form.resultados[canal] ?? ''
                  return (
                    <div key={canal} className="crm-tentativa__canal">
                      <strong>{NOME_CANAL[canal] ?? canal}</strong>
                      <label>
                        {canal === 'email' ? 'E-mail usado' : canal === 'outro' ? 'Contato usado' : 'Telefone usado'}
                        <select
                          value={form.usados[canal] ?? ''}
                          onChange={(e) => setForm({ ...form, usados: { ...form.usados, [canal]: e.target.value } })}
                        >
                          <option value="">—</option>
                          {opcoesDoCanal(canal).map((c) => (
                            <option key={`${c.tipo}-${c.valor}`} value={c.valor}>
                              {c.tipo === 'telefone' ? formatarTelefone(c.valor) : c.valor} ({c.rotulo})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Resultado
                        <select
                          value={res}
                          onChange={(e) => setForm({ ...form, resultados: { ...form.resultados, [canal]: e.target.value } })}
                        >
                          <option value="">Escolha…</option>
                          {resultadosDoCanal(canal).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {AVISO_RESULTADO[res] && (
                        <small className="crm-contato__aviso">
                          {res === 'nao_contatar'
                            ? `Será aplicado “Não contatar” ${form.contato ? 'nesta pessoa' : 'na empresa'}, registrando quem e quando.`
                            : AVISO_RESULTADO[res]}
                        </small>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="crm-contato__linha">
                <label>
                  Pessoa contatada
                  <select value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })}>
                    <option value="">—</option>
                    {contatos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome || `Contato ${c.id}`}
                      </option>
                    ))}
                  </select>
                </label>
              <label className="crm-contato__quando-campo">
                Quando foi {semTentativa ? '(o contato que você já fez)' : '(em branco = agora)'}
                <input
                  type="datetime-local"
                  value={form.quando}
                  max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  onChange={(e) => setForm({ ...form, quando: e.target.value })}
                />
              </label>
              </div>
              <label>
                Observação
                <textarea rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
              </label>
              <div className="crm-contato__linha">
                <label>
                  Próximo passo
                  <input
                    value={form.proximoPasso}
                    onChange={(e) => setForm({ ...form, proximoPasso: e.target.value })}
                    placeholder="Ex.: ligar para o gerente"
                  />
                </label>
                <label>
                  Data do próximo passo
                  <input
                    type="datetime-local"
                    value={form.proximoPassoData}
                    onChange={(e) => setForm({ ...form, proximoPassoData: e.target.value })}
                  />
                </label>
              </div>
              <div className="crm-contato__botoes">
                <button type="button" className="crm-btn" onClick={() => setAcao(null)} disabled={salvando}>
                  Cancelar
                </button>
                <button type="button" className="crm-btn crm-btn--registrar" disabled={salvando} onClick={registrar}>
                  {salvando ? 'Registrando…' : 'Registrar tentativa'}
                </button>
              </div>
            </div>
          )}
          {acao === 'qualificacao' && <FormQualificacao {...formBase} />}
          {acao === 'desfecho' && <FormDesfecho {...formBase} />}
          {acao === 'titular' && <FormTitular {...formBase} />}
        </>
      )}

      <div className="crm-contato__historico">
        <h4>
          <History size={14} /> Histórico ({eventos.length})
        </h4>
        {eventos.length === 0 ? (
          <p className="crm-contato__vazio">Nada registrado ainda.</p>
        ) : (
          <ul>
            {eventos.map((ev) => (
              <li key={ev.id} className={`crm-evento crm-evento--${ev.tipo}`}>
                <span className="crm-contato__quando">{dataHora(ev.quando)}</span>
                <span className="crm-contato__oque">
                  <strong>{ev.titulo}</strong>
                  {ev.detalhe?.map((t, i) => <em key={i}>{t}</em>)}
                </span>
                <span className="crm-contato__quem">{ev.quem}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
