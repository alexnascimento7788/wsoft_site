import React from 'react'

import { RESULTADOS_CONTATO } from '@/collections/Crm/opcoesContato'
import { grupoDoResultado } from '@/crm/visual'

import './celulas.css'

const ROTULO = Object.fromEntries(RESULTADOS_CONTATO.map((r) => [r.value, r.label]))

// Coluna "Resultado" das tentativas: etiqueta na cor do grupo (a linha inteira ganha a faixa da mesma cor)
export default function ResultadoCell({ cellData }: { cellData?: string | null }) {
  if (!cellData) return <span>—</span>
  const g = grupoDoResultado(cellData)
  return (
    <span
      className="crm-cel-status"
      data-resultado={g?.valor ?? 'outro'}
      title={g?.rotulo}
      style={{ '--cor': g?.cor ?? '#6B7280' } as React.CSSProperties}
    >
      <span className="crm-cel-status__ponto" aria-hidden />
      {ROTULO[cellData] ?? cellData}
    </span>
  )
}
