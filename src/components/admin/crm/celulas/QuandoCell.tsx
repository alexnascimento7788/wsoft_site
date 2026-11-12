import React from 'react'

import { diaDe, hoje, somarDias } from '@/crm/meuDia'

import './celulas.css'

const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

// Coluna "Data e hora" das tentativas: "Hoje 14:32", "Ontem 09:10" ou a data
export default function QuandoCell({ cellData }: { cellData?: string | null }) {
  if (!cellData) return <span>—</span>
  const d = new Date(cellData)
  const dia = diaDe(d)
  const rotulo =
    dia === hoje()
      ? 'Hoje'
      : dia === somarDias(hoje(), -1)
        ? 'Ontem'
        : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo' })
  return (
    <span className={`crm-cel-quando${dia === hoje() ? ' crm-cel-quando--hoje' : ''}`}>
      <strong>{rotulo}</strong> {hora(d)}
    </span>
  )
}
