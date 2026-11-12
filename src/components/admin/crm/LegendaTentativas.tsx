import type { Payload, Where } from 'payload'
import React from 'react'

import { hoje, inicioDoDia } from '@/crm/meuDia'
import { GRUPOS_RESULTADO } from '@/crm/visual'
import { usuarioLogado } from './celulas/dados'

import './celulas/celulas.css'

const query = (pares: [string, string][]) => pares.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')

// Acima da lista de Tentativas: atalhos com contagem (hoje, minhas) e a legenda das cores, que filtra a lista
export default async function LegendaTentativas({ payload }: { payload?: Payload }) {
  if (!payload) return null
  const user = await usuarioLogado(payload)
  if (!user) return null
  const base = `${payload.config.routes.admin}/collections/crm-registros-contato`
  const contar = (where: Where) =>
    payload
      .count({ collection: 'crm-registros-contato', where, overrideAccess: false, user })
      .then((r) => r.totalDocs)
      .catch(() => null)

  const inicioHoje = inicioDoDia(hoje()).toISOString()
  const atalhos: { rotulo: string; where: Where; url: string }[] = [
    { rotulo: 'Hoje', where: { dataHora: { greater_than_equal: inicioHoje } }, url: query([['where[dataHora][greater_than_equal]', inicioHoje]]) },
    { rotulo: 'Minhas', where: { registradoPor: { equals: user.id } }, url: query([['where[registradoPor][equals]', String(user.id)]]) },
  ]
  const grupos = GRUPOS_RESULTADO.map((g) => ({
    ...g,
    where: { resultado: { in: [...g.resultados] } } as Where,
    url: query(g.resultados.map((r, i) => [`where[resultado][in][${i}]`, r] as [string, string])),
  }))
  const [nAtalhos, nGrupos] = await Promise.all([
    Promise.all(atalhos.map((a) => contar(a.where))),
    Promise.all(grupos.map((g) => contar(g.where))),
  ])

  return (
    <div className="crm-legenda crm-legenda--tentativas" aria-label="Atalhos e legenda das cores">
      {atalhos.map((a, i) => (
        <a key={a.rotulo} href={`${base}?${a.url}`} className="crm-legenda__atalho">
          {a.rotulo}
          {nAtalhos[i] !== null && <b>{nAtalhos[i]}</b>}
        </a>
      ))}
      <span className="crm-legenda__sep" aria-hidden />
      {grupos.map((g, i) => (
        <a key={g.valor} href={`${base}?${g.url}`} style={{ '--cor': g.cor } as React.CSSProperties}>
          <i aria-hidden /> {g.rotulo}
          {nGrupos[i] !== null && <b>{nGrupos[i]}</b>}
        </a>
      ))}
      <a href={base}>Ver todas</a>
    </div>
  )
}
