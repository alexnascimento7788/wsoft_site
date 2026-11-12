import type { DefaultServerCellComponentProps } from 'payload'
import { MapPin } from 'lucide-react'
import React from 'react'

import { Status } from './StatusCell'
import { empresaResumo } from './dados'

import './celulas.css'

// Coluna "Empresa" das tentativas: nome (abre a ficha da empresa), status atual e cidade
export default async function EmpresaDaTentativaCell({ cellData, payload }: DefaultServerCellComponentProps) {
  const id = cellData && typeof cellData === 'object' ? (cellData as { id: number }).id : (cellData as number | null)
  if (!id) return <span>—</span>
  const e = await empresaResumo(payload, id)
  const href = `${payload.config.routes.admin}/collections/crm-empresas/${id}`
  if (!e) return <a href={href}>Empresa {id}</a>
  const local = [e.cidade, e.uf?.toUpperCase()].filter(Boolean).join(' / ')
  return (
    <a href={href} className="crm-cel-empresa">
      <span className="crm-cel-empresa__nome">{e.nomeFantasia || e.razaoSocial}</span>
      <span className="crm-cel-empresa__sub">
        <Status status={e.status} />
        {local && (
          <span>
            <MapPin size={11} aria-hidden /> {local}
          </span>
        )}
      </span>
    </a>
  )
}
