'use client'

import { toast, useAuth, useConfig, useDocumentInfo } from '@payloadcms/ui'
import {
  BadgeCheck,
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
import React, { useCallback, useEffect, useState } from 'react'

import { isCrmAdminUser } from '@/access/roles'
import { STATUS_LEAD } from '@/collections/Crm/opcoes'
import { CANAIS_CONTATO, RESULTADOS_CONTATO } from '@/collections/Crm/opcoesContato'
import { formatarTelefone } from '@/crm/visual'
import { MeuDiaBotao } from './celulas/MeuDiaBotao'
import { Status } from './celulas/StatusCell'
import { FormDesfecho, FormQualificacao, FormTitular } from './Formularios'
import { Mensagens, type Destino } from './mensagens/Mensagens'

import './PainelContato.css'
import './celulas/celulas.css'

type Telefone = { numero: string; tipo?: string | null; valido?: boolean | null }
type Contato = {
  id: number
  nome?: string | null
  email?: string | null
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

type Canal = { tipo: 'telefone' | 'email'; valor: string; rotulo: string; celular?: boolean; contatoId?: number }
type Acao = null | 'tentativa' | 'mensagem' | 'qualificacao' | 'desfecho' | 'titular'

const rotulo = (lista: { label: string; value: string }[], v: string | null | undefined) =>
  lista.find((o) => o.value === v)?.label ?? v ?? ''

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

const vazio = { canal: 'ligacao', telefoneUsado: '', contato: '', resultado: '', observacao: '', proximoPasso: '', proximoPassoData: '' }

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
  const [envio, setEnvio] = useState<{ canal: 'whatsapp' | 'email'; destino?: Destino } | null>(null)
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
      canais.push({ tipo: 'telefone', valor: t.numero, rotulo: rot, celular: t.tipo === 'celular', contatoId })
    }
  }
  addTelefones(empresa.telefones, 'Empresa')
  for (const c of contatos) {
    if (c.naoContatar) continue
    addTelefones(c.telefones, c.nome || 'Contato', c.id)
    if (c.email && !vistos.has(c.email)) {
      vistos.add(c.email)
      canais.push({ tipo: 'email', valor: c.email, rotulo: c.nome || 'Contato', contatoId: c.id })
    }
  }
  const invalidos = [...(empresa.telefones ?? []), ...contatos.flatMap((c) => c.telefones ?? [])].filter((t) => t.valido === false)
  const bloqueado = Boolean(empresa.naoContatar)
  const tem = {
    whatsapp: canais.some((c) => c.celular),
    telefone: canais.some((c) => c.tipo === 'telefone'),
    email: canais.some((c) => c.tipo === 'email'),
  }
  const destinos: Destino[] = canais
    .filter((c) => c.tipo === 'email' || c.celular)
    .map((c) => ({ tipo: c.tipo === 'email' ? 'email' : 'whatsapp', valor: c.valor, pessoa: c.rotulo === 'Empresa' ? '' : c.rotulo, contatoId: c.contatoId }))

  const abrirTentativa = (canal: string, canalInfo?: { valor: string; contatoId?: number }, resultado = '') => {
    setForm({
      ...vazio,
      canal,
      resultado,
      telefoneUsado: canalInfo?.valor ?? '',
      contato: canalInfo?.contatoId ? String(canalInfo.contatoId) : '',
    })
    setAcao('tentativa')
  }

  const depoisDeSalvar = async () => {
    setAcao(null)
    await carregar()
    router.refresh()
  }

  const registrar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.resultado) return toast.error('Escolha o resultado da tentativa.')
    setSalvando(true)
    const r = await fetch(`${api}/crm-registros-contato`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresa: id,
        canal: form.canal,
        telefoneUsado: form.telefoneUsado || undefined,
        contato: form.contato ? Number(form.contato) : undefined,
        resultado: form.resultado,
        observacao: form.observacao || undefined,
        proximoPasso: form.proximoPasso || undefined,
        proximoPassoData: form.proximoPassoData ? new Date(form.proximoPassoData).toISOString() : undefined,
        dataHora: new Date().toISOString(),
      }),
    })
    setSalvando(false)
    if (!r.ok) return toast.error('Não foi possível registrar a tentativa.')
    toast.success('Tentativa registrada.')
    setForm(vazio)
    await depoisDeSalvar()
  }

  const ehTelefone = form.canal === 'ligacao' || form.canal === 'whatsapp'
  const opcoesUsado = canais.filter((c) => (ehTelefone ? c.tipo === 'telefone' : form.canal === 'email' ? c.tipo === 'email' : true))
  const vendedor = nomeUsuario(empresa.vendedor)
  const local = [empresa.cidade, empresa.uf?.toUpperCase()].filter(Boolean).join(' / ')
  const formBase = { api, empresa: empresa.id, aoSalvar: depoisDeSalvar, aoCancelar: () => setAcao(null) }

  const BotaoAcao = ({ valor, Icone, children }: { valor: Exclude<Acao, null>; Icone: typeof Phone; children: React.ReactNode }) => (
    <button
      type="button"
      className={`crm-acao${acao === valor ? ' crm-acao--ativa' : ''}`}
      onClick={() => (acao === valor ? setAcao(null) : valor === 'tentativa' ? abrirTentativa(canais[0]?.tipo === 'email' ? 'email' : 'ligacao', canais[0]) : setAcao(valor))}
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
                      {c.tipo === 'telefone' ? ` · ${c.celular ? 'celular' : 'fixo'}` : ''}
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
                        <a href={`tel:+55${c.valor}`} onClick={() => abrirTentativa('ligacao', c)} className="crm-btn crm-btn--ligar">
                          <Phone size={13} /> Ligar
                        </a>
                        {c.celular && (
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
          {invalidos.length > 0 && (
            <p className="crm-contato__invalidos">{invalidos.length} telefone(s) marcado(s) como inválido(s) — fora do sorteio.</p>
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
              aoEnviar={(canal, destino) => setEnvio({ canal, destino })}
            />
          )}
          {acao === 'mensagem' && envio && (
            <div className="crm-ficha__envio">
              <span>Enviou a mensagem? Registre a tentativa para ela contar no Meu dia.</span>
              <button
                type="button"
                className="crm-btn crm-btn--registrar"
                onClick={() => {
                  abrirTentativa(envio.canal, envio.destino, 'aguardando_retorno')
                  setEnvio(null)
                }}
              >
                Registrar envio por {envio.canal === 'whatsapp' ? 'WhatsApp' : 'e-mail'}
              </button>
            </div>
          )}

          {acao === 'tentativa' && (
            <form className="crm-contato__form" onSubmit={registrar}>
              <h4>Tentativa de contato</h4>
              <div className="crm-contato__linha">
                <label>
                  Canal
                  <select value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value, telefoneUsado: '' })}>
                    {CANAIS_CONTATO.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label.replace(' (manual)', '')}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {ehTelefone ? 'Telefone usado' : form.canal === 'email' ? 'E-mail usado' : 'Contato usado'}
                  <select value={form.telefoneUsado} onChange={(e) => setForm({ ...form, telefoneUsado: e.target.value })}>
                    <option value="">—</option>
                    {opcoesUsado.map((c) => (
                      <option key={`${c.tipo}-${c.valor}`} value={c.valor}>
                        {c.tipo === 'telefone' ? formatarTelefone(c.valor) : c.valor} ({c.rotulo})
                      </option>
                    ))}
                  </select>
                </label>
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
              </div>
              <label>
                Resultado
                <select required value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })}>
                  <option value="">Escolha…</option>
                  {RESULTADOS_CONTATO.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {form.resultado === 'numero_invalido' && (
                <small className="crm-contato__aviso">O telefone usado será marcado como inválido e sai do sorteio.</small>
              )}
              {form.resultado === 'nao_contatar' && (
                <small className="crm-contato__aviso">
                  Será aplicado “Não contatar” {form.contato ? 'nesta pessoa' : 'na empresa'}, registrando quem e quando.
                </small>
              )}
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
                <button type="submit" className="crm-btn crm-btn--registrar" disabled={salvando}>
                  {salvando ? 'Registrando…' : 'Registrar tentativa'}
                </button>
              </div>
            </form>
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
