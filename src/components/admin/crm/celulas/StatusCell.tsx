import React from 'react'

import { STATUS_LEAD } from '@/collections/Crm/opcoes'
import { corDoStatus } from '@/crm/visual'

import './celulas.css'

const ROTULO = Object.fromEntries(STATUS_LEAD.map((s) => [s.value, s.label]))

// Etiqueta colorida do status
export function Status({ status }: { status?: string | null }) {
  if (!status) return <span>—</span>
  return (
    <span className="crm-cel-status" style={{ '--cor': corDoStatus(status) } as React.CSSProperties}>
      <span className="crm-cel-status__ponto" aria-hidden />
      {ROTULO[status] ?? status}
    </span>
  )
}

export default function StatusCell({ cellData }: { cellData?: string | null }) {
  return <Status status={cellData} />
}
