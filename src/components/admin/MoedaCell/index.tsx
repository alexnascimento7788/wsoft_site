import React from 'react'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function MoedaCell({ cellData }: { cellData?: number | null }) {
  if (cellData === null || cellData === undefined) return <span>—</span>
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{brl.format(cellData)}</span>
}
