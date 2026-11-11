import type { DefaultServerCellComponentProps } from 'payload'
import React from 'react'

import { podeTerMeuDia } from '@/collections/Crm/meuDiaEndpoints'
import { MeuDiaBotao } from './MeuDiaBotao'
import { meuDiaDoUsuario, usuarioLogado } from './dados'

// Coluna "Meu dia": botão para colocar a empresa no dia de quem está usando
export default async function MeuDiaCell({ rowData, payload }: DefaultServerCellComponentProps) {
  const user = await usuarioLogado(payload)
  if (!user || !podeTerMeuDia(user)) return null
  const r = rowData as { id: number; naoContatar?: boolean | null }
  if (r.naoContatar) return null
  const dia = (await meuDiaDoUsuario(payload)).get(r.id) ?? null
  return <MeuDiaBotao empresa={r.id} diaMarcado={dia} />
}
