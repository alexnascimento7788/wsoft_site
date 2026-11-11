import type { DefaultServerCellComponentProps } from 'payload'
import React from 'react'

import { iniciais } from '@/crm/visual'
import { nomesDeUsuarios } from './dados'

import './celulas.css'

// Paleta das bolinhas (cada pessoa sempre com a mesma cor)
const CORES = ['#F4791F', '#2563EB', '#0D9488', '#7C3AED', '#DB2777', '#CA8A04', '#16A34A']

// Coluna "Vendedor" / "Apresentador": bolinha com as iniciais + nome
export default async function PessoaCell({ cellData, payload }: DefaultServerCellComponentProps) {
  const id = cellData && typeof cellData === 'object' ? (cellData as { id: number }).id : (cellData as number | null)
  if (!id) return <span className="crm-cel-pessoa crm-cel-pessoa--vazio">Sem responsável</span>
  const nome = (await nomesDeUsuarios(payload)).get(id) ?? `Usuário ${id}`
  return (
    <span className="crm-cel-pessoa">
      <span className="crm-cel-pessoa__bola" style={{ background: CORES[id % CORES.length] }} aria-hidden>
        {iniciais(nome)}
      </span>
      {nome}
    </span>
  )
}
