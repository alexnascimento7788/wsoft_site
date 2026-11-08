'use client'

import { toast, useConfig, useDocumentInfo } from '@payloadcms/ui'
import { Mail, MessageCircle, Phone, PhoneOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'

import { STATUS_LEAD } from '@/collections/Crm/opcoes'
import { CANAIS_CONTATO, RESULTADOS_CONTATO } from '@/collections/Crm/opcoesContato'

import './PainelContato.css'

type Telefone = { numero: string; tipo?: string | null; valido?: boolean | null }
type Contato = { id: number; nome?: string | null; email?: string | null; naoContatar?: boolean | null; telefones?: Telefone[] | null }
type Empresa = { id: number; status: string; naoContatar?: boolean | null; telefones?: Telefone[] | null; retornarEm?: string | null }
type Registro = {
  id: number
  dataHora: string
  canal: string
  resultado: string
  telefoneUsado?: string | null
  observacao?: string | null
  proximoPasso?: string | null
  proximoPassoData?: string | null
  registradoPorNome?: string | null
  contato?: number | { id: number; nome?: string | null } | null
}

type Canal = { tipo: 'telefone' | 'email'; valor: string; rotulo: string; celular?: boolean; contatoId?: number }

const rotulo = (lista: { label: string; value: string }[], v: string) => lista.find((o) => o.value === v)?.label ?? v

const formatarTelefone = (n: string) =>
  n.length === 11 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}` : n.length === 10 ? `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}` : n

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

const vazio = { canal: 'ligacao', telefoneUsado: '', contato: '', resultado: '', observacao: '', proximoPasso: '', proximoPassoData: '' }

// Painel "Contato" na ficha da empresa: canais que existem (ligar, WhatsApp, e-mail), registro da
// tentativa e histórico. Usa a API REST com o login de quem está usando (respeita o acesso).
export default function PainelContato() {
  const { id } = useDocumentInfo()
  const {
    config: { serverURL, routes },
  } = useConfig()
  const api = `${serverURL ?? ''}${routes.api}`
  const router = useRouter()

  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [contatos, setContatos] = useState<Contato[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])
  const [form, setForm] = useState(vazio)
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    if (!id) return
    const obter = (url: string) => fetch(`${api}${url}`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null))
    const [e, c, r] = await Promise.all([
      obter(`/crm-empresas/${id}?depth=0`),
      obter(`/crm-contatos?where[empresa][equals]=${id}&depth=0&limit=50`),
      obter(`/crm-registros-contato?where[empresa][equals]=${id}&sort=-dataHora&limit=30&depth=1`),
    ])
    setEmpresa(e)
    setContatos(c?.docs ?? [])
    setRegistros(r?.docs ?? [])
  }, [api, id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (!id) return null
  if (!empresa) return <div className="crm-contato crm-contato--carregando">Carregando contato…</div>

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
    if (c.email) canais.push({ tipo: 'email', valor: c.email, rotulo: c.nome || 'Contato', contatoId: c.id })
  }
  const invalidos = [...(empresa.telefones ?? []), ...contatos.flatMap((c) => c.telefones ?? [])].filter((t) => t.valido === false)
  const bloqueado = Boolean(empresa.naoContatar)

  const abrir = (canal: string, canalInfo?: Canal) => {
    setForm({
      ...vazio,
      canal,
      telefoneUsado: canalInfo?.tipo === 'telefone' ? canalInfo.valor : canalInfo?.tipo === 'email' ? canalInfo.valor : '',
      contato: canalInfo?.contatoId ? String(canalInfo.contatoId) : '',
    })
    setAberto(true)
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
    setAberto(false)
    setForm(vazio)
    await carregar()
    router.refresh()
  }

  const ehTelefone = form.canal === 'ligacao' || form.canal === 'whatsapp'
  const opcoesUsado = canais.filter((c) => (ehTelefone ? c.tipo === 'telefone' : form.canal === 'email' ? c.tipo === 'email' : true))

  return (
    <div className="crm-contato">
      <div className="crm-contato__topo">
        <h3>Contato</h3>
        <span className="crm-contato__status">
          {rotulo(STATUS_LEAD, empresa.status)}
          {empresa.retornarEm && ` · retornar em ${dataHora(empresa.retornarEm)}`}
        </span>
      </div>

      {bloqueado && (
        <p className="crm-contato__bloqueio">
          <PhoneOff size={14} /> Esta empresa está marcada como <strong>Não contatar</strong>.
        </p>
      )}

      {!bloqueado && (
        <>
          {canais.length === 0 ? (
            <p className="crm-contato__vazio">Nenhum telefone válido ou e-mail cadastrado. Use “Outro” para registrar.</p>
          ) : (
            <ul className="crm-contato__canais">
              {canais.map((c) => (
                <li key={`${c.tipo}-${c.valor}`}>
                  <span className="crm-contato__valor">
                    {c.tipo === 'telefone' ? formatarTelefone(c.valor) : c.valor}
                    <small>{c.rotulo}{c.tipo === 'telefone' ? ` · ${c.celular ? 'celular' : 'fixo'}` : ''}</small>
                  </span>
                  <span className="crm-contato__acoes">
                    {c.tipo === 'telefone' && (
                      <>
                        <a href={`tel:+55${c.valor}`} onClick={() => abrir('ligacao', c)} className="crm-btn crm-btn--ligar">
                          <Phone size={13} /> Ligar
                        </a>
                        {c.celular && (
                          <a
                            href={`https://wa.me/55${c.valor}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => abrir('whatsapp', c)}
                            className="crm-btn crm-btn--whats"
                          >
                            <MessageCircle size={13} /> WhatsApp
                          </a>
                        )}
                      </>
                    )}
                    {c.tipo === 'email' && (
                      <a href={`mailto:${c.valor}`} onClick={() => abrir('email', c)} className="crm-btn crm-btn--email">
                        <Mail size={13} /> E-mail
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {invalidos.length > 0 && (
            <p className="crm-contato__invalidos">
              {invalidos.length} telefone(s) marcado(s) como inválido(s) — fora da fila.
            </p>
          )}

          {!aberto ? (
            <button type="button" className="crm-btn crm-btn--registrar" onClick={() => abrir(canais[0]?.tipo === 'email' ? 'email' : 'ligacao', canais[0])}>
              + Registrar tentativa de contato
            </button>
          ) : (
            <form className="crm-contato__form" onSubmit={registrar}>
              <div className="crm-contato__linha">
                <label>
                  Canal
                  <select value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value, telefoneUsado: '' })}>
                    {CANAIS_CONTATO.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
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
                      <option key={c.id} value={c.id}>{c.nome || `Contato ${c.id}`}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Resultado
                <select required value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })}>
                  <option value="">Escolha…</option>
                  {RESULTADOS_CONTATO.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              {form.resultado === 'numero_invalido' && (
                <small className="crm-contato__aviso">O telefone usado será marcado como inválido e sai da fila.</small>
              )}
              {form.resultado === 'nao_contatar' && (
                <small className="crm-contato__aviso">Será aplicado “Não contatar” {form.contato ? 'nesta pessoa' : 'na empresa'}, registrando quem e quando.</small>
              )}
              <label>
                Observação
                <textarea rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
              </label>
              <div className="crm-contato__linha">
                <label>
                  Próximo passo
                  <input value={form.proximoPasso} onChange={(e) => setForm({ ...form, proximoPasso: e.target.value })} placeholder="Ex.: ligar para o gerente" />
                </label>
                <label>
                  Data do próximo passo
                  <input type="datetime-local" value={form.proximoPassoData} onChange={(e) => setForm({ ...form, proximoPassoData: e.target.value })} />
                </label>
              </div>
              <div className="crm-contato__botoes">
                <button type="button" className="crm-btn" onClick={() => setAberto(false)} disabled={salvando}>Cancelar</button>
                <button type="submit" className="crm-btn crm-btn--registrar" disabled={salvando}>
                  {salvando ? 'Registrando…' : 'Registrar tentativa'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      <div className="crm-contato__historico">
        <h4>Histórico de tentativas ({registros.length})</h4>
        {registros.length === 0 ? (
          <p className="crm-contato__vazio">Nenhuma tentativa registrada ainda.</p>
        ) : (
          <ul>
            {registros.map((r) => (
              <li key={r.id}>
                <span className="crm-contato__quando">{dataHora(r.dataHora)}</span>
                <span className="crm-contato__oque">
                  <strong>{rotulo(CANAIS_CONTATO, r.canal).replace(' (manual)', '')}</strong> · {rotulo(RESULTADOS_CONTATO, r.resultado)}
                  {r.telefoneUsado && ` · ${formatarTelefone(r.telefoneUsado)}`}
                  {r.observacao && <em>{r.observacao}</em>}
                  {r.proximoPasso && (
                    <em>
                      Próximo passo: {r.proximoPasso}
                      {r.proximoPassoData && ` (${dataHora(r.proximoPassoData)})`}
                    </em>
                  )}
                </span>
                <span className="crm-contato__quem">{r.registradoPorNome}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
