'use client'

import { toast, useConfig } from '@payloadcms/ui'
import { CheckCircle2, Circle, Mail, MapPin, MessageCircle, Phone, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React from 'react'

import { Status } from '@/components/admin/crm/celulas/StatusCell'

import '@/components/admin/crm/celulas/celulas.css'

export type ItemDoDia = {
  id: number
  empresaId: number
  nome: string
  razao: string
  local: string
  status: string | null
  canais: string[]
  prioridade: string | null
  retornarEm: string | null
  origem: string
  feito: boolean
}

const CANAIS = [
  { k: 'whatsapp', I: MessageCircle, cor: '#16A34A', n: 'WhatsApp' },
  { k: 'telefone', I: Phone, cor: '#2563EB', n: 'Telefone' },
  { k: 'email', I: Mail, cor: '#F4791F', n: 'E-mail' },
]
const PRIORIDADE: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }

const titulo = (dia: string, hoje: string) => {
  if (dia === hoje) return 'Hoje'
  const d = new Date(`${dia}T12:00:00Z`)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })
}

// Empresas do dia: abrir a ficha, ver se já foi feita, tirar do dia
export function ListaDoDia({
  dia,
  hoje,
  itens,
  meta,
  podeEditar,
  adminRoute,
}: {
  dia: string
  hoje: string
  itens: ItemDoDia[]
  meta: number
  podeEditar: boolean
  adminRoute: string
}) {
  const {
    config: { serverURL, routes },
  } = useConfig()
  const router = useRouter()
  const feitos = itens.filter((i) => i.feito).length
  const alvo = Math.max(meta, itens.length)
  const pct = alvo ? Math.round((feitos / alvo) * 100) : 0

  const tirar = async (item: ItemDoDia) => {
    const r = await fetch(`${serverURL ?? ''}${routes.api}/crm-dia-itens/${item.id}`, { method: 'DELETE', credentials: 'include' })
    if (!r.ok) return toast.error('Não foi possível tirar do dia.')
    toast.success('Empresa retirada do dia.')
    router.refresh()
  }

  return (
    <section className="meudia__lista">
      <div className="meudia__lista-topo">
        <h2>{titulo(dia, hoje)}</h2>
        <span className="meudia__progresso">
          <strong>{feitos}</strong> de {alvo} feita(s)
          <span className="meudia__barra" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </span>
        </span>
      </div>

      {itens.length === 0 ? (
        <p className="meudia__vazio">
          Nenhuma empresa neste dia.{' '}
          {dia >= hoje ? 'Use “Montar meu dia” ou marque empresas na lista de Empresas (coluna Meu dia).' : ''}
        </p>
      ) : (
        <ul className="meudia__itens">
          {itens.map((i) => (
            <li key={i.id} className={`meudia__item${i.feito ? ' meudia__item--feito' : ''}`}>
              <span className="meudia__check" title={i.feito ? 'Feito: tentativa registrada' : 'Pendente'}>
                {i.feito ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </span>
              <a className="meudia__item-nome" href={`${adminRoute}/collections/crm-empresas/${i.empresaId}`}>
                <strong>{i.nome}</strong>
                <span>
                  {i.local && (
                    <>
                      <MapPin size={11} aria-hidden /> {i.local}
                    </>
                  )}
                  {i.prioridade && <em>Prioridade {PRIORIDADE[i.prioridade] ?? i.prioridade}</em>}
                  {i.origem === 'manual' && <em>marcada por você</em>}
                </span>
              </a>
              <span className="crm-cel-canais">
                {CANAIS.map(({ k, I, cor, n }) => (
                  <span
                    key={k}
                    className={`crm-cel-canal${i.canais.includes(k) ? ' crm-cel-canal--ativo' : ''}`}
                    style={{ '--cor': cor } as React.CSSProperties}
                    title={i.canais.includes(k) ? `Tem ${n}` : `Sem ${n}`}
                  >
                    <I size={13} strokeWidth={2.2} />
                  </span>
                ))}
              </span>
              <Status status={i.status} />
              {podeEditar && !i.feito && dia >= hoje && (
                <button type="button" className="crm-btn crm-btn--icone" title="Tirar do dia" onClick={() => tirar(i)}>
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="meudia__dica">
        A empresa fica como feita sozinha quando você registra uma tentativa de contato na ficha dela.
      </p>
    </section>
  )
}
