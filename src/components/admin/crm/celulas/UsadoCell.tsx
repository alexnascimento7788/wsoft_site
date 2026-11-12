import React from 'react'

import { formatarTelefone } from '@/crm/visual'

// Coluna "Telefone ou e-mail usado": telefone formatado
export default function UsadoCell({ cellData }: { cellData?: string | null }) {
  if (!cellData) return <span className="crm-cel-vazio">—</span>
  return <span className="crm-cel-usado">{/^\d+$/.test(cellData) ? formatarTelefone(cellData) : cellData}</span>
}
