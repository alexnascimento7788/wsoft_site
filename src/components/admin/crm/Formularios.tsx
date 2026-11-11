'use client'

import { toast } from '@payloadcms/ui'
import React, { useState } from 'react'

import { MOTIVOS_DESCARTE } from '@/collections/Crm/opcoes'

// Atenção: a ficha fica DENTRO do formulário do Payload. Formulário dentro de formulário não existe em HTML
// (o navegador ignora o de dentro e o "salvar" vira o salvar da empresa). Por isso: <div> + botão com onClick.
// Formulários curtos da ficha da empresa. Cada um cria o registro já ligado à empresa
// (o usuário nunca escolhe a empresa) e o sistema atualiza o status sozinho.

type Base = { api: string; empresa: number; aoSalvar: () => void; aoCancelar: () => void }

const MOTIVOS_PERDA = [
  { label: 'Preço', value: 'preco' },
  { label: 'Já tem sistema', value: 'ja_tem_sistema' },
  { label: 'Sem interesse', value: 'sem_interesse' },
  { label: 'Adiou a decisão', value: 'adiou_decisao' },
  { label: 'Sem retorno', value: 'sem_retorno' },
  { label: 'Outro', value: 'outro' },
]

const semEnter = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault()
}

const limpar = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined))
const isoOuNada = (v: string) => (v ? new Date(v).toISOString() : undefined)

async function enviar(api: string, colecao: string, corpo: Record<string, unknown>) {
  const r = await fetch(`${api}/${colecao}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(limpar(corpo)),
  })
  if (r.ok) return true
  const json = await r.json().catch(() => ({}))
  const msg = json?.errors?.[0]?.data?.errors?.[0]?.message || json?.errors?.[0]?.message
  toast.error(msg || 'Não foi possível salvar.')
  return false
}

function Botoes({ salvando, rotulo, aoCancelar, aoSalvar }: { salvando: boolean; rotulo: string; aoCancelar: () => void; aoSalvar: () => void }) {
  return (
    <div className="crm-contato__botoes">
      <button type="button" className="crm-btn" onClick={aoCancelar} disabled={salvando}>
        Cancelar
      </button>
      <button type="button" className="crm-btn crm-btn--registrar" disabled={salvando} onClick={aoSalvar}>
        {salvando ? 'Salvando…' : rotulo}
      </button>
    </div>
  )
}

export function FormQualificacao({ api, empresa, aoSalvar, aoCancelar }: Base) {
  const [f, setF] = useState({
    operaArmazenagem: '',
    graos: '',
    sistemaGestao: '',
    sistemaNome: '',
    interesse: '',
    resultado: '',
    retornarEm: '',
    motivoDescarte: '',
    observacao: '',
  })
  const [salvando, setSalvando] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  const salvar = async () => {
    if (!f.resultado) return toast.error('Escolha o resultado da qualificação.')
    setSalvando(true)
    const ok = await enviar(api, 'crm-qualificacoes', {
      ...f,
      empresa,
      retornarEm: f.resultado === 'retornar_depois' ? isoOuNada(f.retornarEm) : undefined,
      motivoDescarte: f.resultado === 'descartado' ? f.motivoDescarte : undefined,
      sistemaNome: f.sistemaGestao === 'outro' ? f.sistemaNome : undefined,
    })
    setSalvando(false)
    if (ok) {
      toast.success('Qualificação registrada. O status da empresa foi atualizado.')
      aoSalvar()
    }
  }

  return (
    <div className="crm-contato__form" role="form" onKeyDown={semEnter}>
      <h4>Qualificação</h4>
      <div className="crm-contato__linha">
        <label>
          Opera armazenagem de grãos?
          <select value={f.operaArmazenagem} onChange={set('operaArmazenagem')}>
            <option value="">—</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
            <option value="nao_sei">Não sei</option>
          </select>
        </label>
        <label>
          Grãos
          <input value={f.graos} onChange={set('graos')} placeholder="Ex.: soja, milho, café" />
        </label>
        <label>
          Interesse na apresentação
          <select value={f.interesse} onChange={set('interesse')}>
            <option value="">—</option>
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
        </label>
      </div>
      <div className="crm-contato__linha">
        <label>
          Usa sistema de gestão hoje?
          <select value={f.sistemaGestao} onChange={set('sistemaGestao')}>
            <option value="">—</option>
            <option value="nenhum">Nenhum</option>
            <option value="planilha">Planilha</option>
            <option value="outro">Outro sistema</option>
          </select>
        </label>
        {f.sistemaGestao === 'outro' && (
          <label>
            Qual sistema?
            <input value={f.sistemaNome} onChange={set('sistemaNome')} />
          </label>
        )}
      </div>
      <div className="crm-contato__linha">
        <label>
          Resultado
          <select required value={f.resultado} onChange={set('resultado')}>
            <option value="">Escolha…</option>
            <option value="qualificado">Qualificado</option>
            <option value="retornar_depois">Retornar depois</option>
            <option value="descartado">Descartado</option>
          </select>
        </label>
        {f.resultado === 'retornar_depois' && (
          <label>
            Retornar em
            <input type="datetime-local" value={f.retornarEm} onChange={set('retornarEm')} />
          </label>
        )}
        {f.resultado === 'descartado' && (
          <label>
            Motivo do descarte
            <select value={f.motivoDescarte} onChange={set('motivoDescarte')}>
              <option value="">—</option>
              {MOTIVOS_DESCARTE.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label>
        Observação
        <textarea rows={2} value={f.observacao} onChange={set('observacao')} />
      </label>
      <Botoes salvando={salvando} rotulo="Registrar qualificação" aoCancelar={aoCancelar} aoSalvar={salvar} />
    </div>
  )
}

export function FormDesfecho({ api, empresa, aoSalvar, aoCancelar }: Base) {
  const [f, setF] = useState({ resultado: '', valor: '', motivo: '', observacao: '' })
  const [salvando, setSalvando] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  const salvar = async () => {
    if (!f.resultado) return toast.error('Escolha o resultado.')
    if (f.resultado === 'venda_nao_realizada' && !f.motivo) return toast.error('Informe o motivo.')
    setSalvando(true)
    const ok = await enviar(api, 'crm-desfechos', {
      empresa,
      resultado: f.resultado,
      data: new Date().toISOString(),
      valor: f.resultado === 'venda_realizada' && f.valor ? Number(f.valor.replace(',', '.')) : undefined,
      motivo: f.resultado === 'venda_nao_realizada' ? f.motivo : undefined,
      observacao: f.observacao,
    })
    setSalvando(false)
    if (ok) {
      toast.success('Desfecho registrado. O status da empresa foi atualizado.')
      aoSalvar()
    }
  }

  return (
    <div className="crm-contato__form" role="form" onKeyDown={semEnter}>
      <h4>Desfecho da venda</h4>
      <div className="crm-contato__linha">
        <label>
          Resultado
          <select required value={f.resultado} onChange={set('resultado')}>
            <option value="">Escolha…</option>
            <option value="venda_realizada">Venda realizada</option>
            <option value="venda_nao_realizada">Venda não realizada</option>
          </select>
        </label>
        {f.resultado === 'venda_realizada' && (
          <label>
            Valor (R$, opcional)
            <input inputMode="decimal" value={f.valor} onChange={set('valor')} />
          </label>
        )}
        {f.resultado === 'venda_nao_realizada' && (
          <label>
            Motivo
            <select value={f.motivo} onChange={set('motivo')}>
              <option value="">Escolha…</option>
              {MOTIVOS_PERDA.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label>
        Observação
        <textarea rows={2} value={f.observacao} onChange={set('observacao')} />
      </label>
      <Botoes salvando={salvando} rotulo="Registrar desfecho" aoCancelar={aoCancelar} aoSalvar={salvar} />
    </div>
  )
}

export function FormTitular({ api, empresa, aoSalvar, aoCancelar }: Base) {
  const [f, setF] = useState({ tipo: '', canal: '', observacao: '' })
  const [salvando, setSalvando] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  const salvar = async () => {
    if (!f.tipo) return toast.error('Escolha o tipo do pedido.')
    setSalvando(true)
    const ok = await enviar(api, 'crm-solicitacoes-titular', {
      empresa,
      tipo: f.tipo,
      canal: f.canal,
      observacao: f.observacao,
      recebidaEm: new Date().toISOString(),
    })
    setSalvando(false)
    if (ok) {
      toast.success('Pedido do titular aberto. Acompanhe em Solicitações de titulares.')
      aoSalvar()
    }
  }

  return (
    <div className="crm-contato__form" role="form" onKeyDown={semEnter}>
      <h4>Pedido do titular (LGPD)</h4>
      <div className="crm-contato__linha">
        <label>
          Tipo
          <select required value={f.tipo} onChange={set('tipo')}>
            <option value="">Escolha…</option>
            <option value="exportacao">Exportação dos dados</option>
            <option value="exclusao">Exclusão definitiva</option>
            <option value="correcao">Correção</option>
            <option value="outro">Outro</option>
          </select>
        </label>
        <label>
          Canal do pedido
          <input value={f.canal} onChange={set('canal')} placeholder="Ex.: telefone, e-mail" />
        </label>
      </div>
      <label>
        Observação (sem dados pessoais)
        <textarea rows={2} value={f.observacao} onChange={set('observacao')} />
      </label>
      <Botoes salvando={salvando} rotulo="Abrir pedido" aoCancelar={aoCancelar} aoSalvar={salvar} />
    </div>
  )
}
