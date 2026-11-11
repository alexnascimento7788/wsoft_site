import type { DefaultServerCellComponentProps } from 'payload'
import { MapPin, PhoneOff } from 'lucide-react'
import React from 'react'

import './celulas.css'

// Coluna "Razão social" da lista de Empresas: nome em destaque, nome fantasia e cidade embaixo
export default function EmpresaCell({ cellData, rowData, payload, linkURL }: DefaultServerCellComponentProps) {
  const r = rowData as { id: number; nomeFantasia?: string | null; cidade?: string | null; uf?: string | null; naoContatar?: boolean | null }
  const href = linkURL ?? `${payload.config.routes.admin}/collections/crm-empresas/${r.id}`
  const local = [r.cidade, r.uf?.toUpperCase()].filter(Boolean).join(' / ')
  const fantasia = r.nomeFantasia && r.nomeFantasia !== cellData ? r.nomeFantasia : null
  return (
    <a href={href} className="crm-cel-empresa">
      <span className="crm-cel-empresa__nome">
        {r.naoContatar && (
          <span className="crm-cel-empresa__bloq" title="Não contatar">
            <PhoneOff size={12} />
          </span>
        )}
        {String(cellData ?? '—')}
      </span>
      {(fantasia || local) && (
        <span className="crm-cel-empresa__sub">
          {fantasia && <span>{fantasia}</span>}
          {local && (
            <span>
              <MapPin size={11} aria-hidden /> {local}
            </span>
          )}
        </span>
      )}
    </a>
  )
}
