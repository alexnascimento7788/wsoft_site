import type { Payload } from 'payload'
import React from 'react'

import { SITUACOES } from '@/crm/visual'

import './celulas/celulas.css'

const EM_CONTATO = ['em_contato', 'retornar_depois', 'qualificado', 'apresentacao_agendada', 'apresentacao_feita']

// Filtro de cada situação (clicar na legenda filtra a lista)
const FILTRO: Record<string, string> = {
  nao_contatado: 'where[and][0][status][equals]=na_fila&where[and][1][naoContatar][not_equals]=true',
  em_contato:
    EM_CONTATO.map((s, i) => `where[and][0][status][in][${i}]=${s}`).join('&') + '&where[and][1][naoContatar][not_equals]=true',
  ganho: 'where[status][equals]=venda_realizada',
  perdido: 'where[status][in][0]=venda_nao_realizada&where[status][in][1]=descartado',
  nao_contatar: 'where[naoContatar][equals]=true',
}

// Legenda das cores das linhas, acima da lista de Empresas
export default function LegendaEmpresas({ payload }: { payload?: Payload }) {
  const base = `${payload?.config.routes.admin ?? '/admin'}/collections/crm-empresas`
  return (
    <div className="crm-legenda" aria-label="Legenda das cores">
      {SITUACOES.map((s) => (
        <a key={s.valor} href={`${base}?${FILTRO[s.valor]}`} style={{ '--cor': s.cor } as React.CSSProperties}>
          <i aria-hidden /> {s.rotulo}
        </a>
      ))}
      <a href={base}>Ver todas</a>
    </div>
  )
}
