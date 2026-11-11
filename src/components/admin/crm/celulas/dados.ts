import { headers } from 'next/headers'
import type { Payload } from 'payload'
import { cache } from 'react'

import { hoje } from '@/crm/meuDia'

// Dados compartilhados pelas células da lista de Empresas, buscados uma vez por página (React cache)

export const usuarioLogado = cache(async (payload: Payload) => {
  const { user } = await payload.auth({ headers: await headers() })
  return user
})

// Nome de cada usuário (vendedor / apresentador) — só o nome, para a etiqueta da lista
export const nomesDeUsuarios = cache(async (payload: Payload) => {
  const { docs } = await payload.find({
    collection: 'users',
    depth: 0,
    pagination: false,
    select: { name: true, email: true },
    overrideAccess: true, // só o nome aparece na etiqueta
  })
  return new Map(docs.map((u) => [u.id, u.name || u.email.split('@')[0]]))
})

// Empresas pendentes no Meu dia do usuário logado (hoje em diante), com o dia de cada uma
export const meuDiaDoUsuario = cache(async (payload: Payload) => {
  const user = await usuarioLogado(payload)
  if (!user) return new Map<number, string>()
  const { docs } = await payload.find({
    collection: 'crm-dia-itens',
    where: { and: [{ usuario: { equals: user.id } }, { dia: { greater_than_equal: hoje() } }] },
    depth: 0,
    pagination: false,
    select: { empresa: true, dia: true },
    overrideAccess: false,
    user,
  })
  const mapa = new Map<number, string>()
  for (const d of docs) {
    const id = typeof d.empresa === 'object' ? d.empresa.id : d.empresa
    const atual = mapa.get(id)
    if (!atual || d.dia < atual) mapa.set(id, d.dia)
  }
  return mapa
})
