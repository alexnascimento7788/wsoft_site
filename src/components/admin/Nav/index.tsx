import type { NavPreferences, Payload, ServerProps, VisibleEntities } from 'payload'
import { DefaultNavClient, NavHamburger, NavWrapper } from '@payloadcms/next/client'
import { Logout } from '@payloadcms/ui'
import { EntityType, groupNavItems } from '@payloadcms/ui/shared'
import React from 'react'

import { canAccessCrmUser, canReadBudgetUser, isCrmAdminUser } from '@/access/roles'
import { podeTerMeuDia } from '@/collections/Crm/meuDiaEndpoints'
import { hoje, inicioDoDia } from '@/crm/meuDia'
import { ThemeToggle } from '../ThemeToggle'
import { AREAS, type AreaPronta, type ItemPronto } from './estrutura'
import { Menu } from './Menu'

type Props = ServerProps & { visibleEntities?: VisibleEntities }
type Usuario = NonNullable<ServerProps['user']>

const rotulo = (l: unknown, fallback: string) =>
  typeof l === 'string' ? l : l && typeof l === 'object' ? (Object.values(l)[0] as string) ?? fallback : fallback

// Contadores do menu (do próprio usuário; respeitam o access control). Falha = sem contador.
async function contadores(payload: Payload, user: Usuario) {
  const r: Record<string, number> = {}
  if (!canAccessCrmUser(user)) return r
  const ver = { overrideAccess: false, user } as const
  const contar = async (chave: string, fn: () => Promise<{ totalDocs: number }>) => {
    try {
      r[chave] = (await fn()).totalDocs
    } catch {
      /* sem contador */
    }
  }
  await Promise.all([
    podeTerMeuDia(user as never) &&
      contar('meuDia', () =>
        payload.count({
          collection: 'crm-dia-itens',
          where: { and: [{ usuario: { equals: user.id } }, { dia: { equals: hoje() } }, { feito: { not_equals: true } }] },
          ...ver,
        }),
      ),
    contar('retornos', () =>
      payload.count({
        collection: 'crm-empresas',
        where: {
          and: [
            { status: { in: ['retornar_depois', 'em_contato'] } },
            { retornarEm: { less_than_equal: new Date().toISOString() } },
            { naoContatar: { not_equals: true } },
            ...(isCrmAdminUser(user) ? [{ vendedor: { equals: user.id } }] : []),
          ],
        },
        ...ver,
      }),
    ),
    contar('tentativasHoje', () =>
      payload.count({
        collection: 'crm-registros-contato',
        where: {
          and: [{ registradoPor: { equals: user.id } }, { dataHora: { greater_than_equal: inicioDoDia(hoje()).toISOString() } }],
        },
        ...ver,
      }),
    ),
    isCrmAdminUser(user) &&
      contar('titularAbertas', () =>
        payload.count({ collection: 'crm-solicitacoes-titular', where: { status: { equals: 'aberta' } }, ...ver }),
      ),
  ])
  return r
}

// Contadores que pedem atenção (laranja) e os informativos (cinza)
const ALERTA = new Set(['meuDia', 'retornos', 'titularAbertas'])

// Menu lateral próprio: áreas Orçamento / CRM / Site, cada uma com seções que abrem e fecham,
// ícones e contadores. Só aparecem itens que o usuário pode abrir (visibleEntities + access control).
export default async function Nav(props: Props) {
  const { i18n, payload, permissions, user, visibleEntities } = props
  if (!payload?.config || !i18n) return null
  const admin = payload.config.routes.admin
  const colecoes = new Map<string, (typeof payload.config.collections)[number]>(payload.config.collections.map((c) => [c.slug, c]))
  const globais = new Map<string, (typeof payload.config.globals)[number]>(payload.config.globals.map((g) => [g.slug, g]))
  const visivel = (tipo: 'colecao' | 'global', slug: string) =>
    tipo === 'colecao'
      ? Boolean(visibleEntities?.collections.includes(slug as never)) && Boolean(permissions?.collections?.[slug]?.read)
      : Boolean(visibleEntities?.globals.includes(slug as never)) && Boolean(permissions?.globals?.[slug]?.read)

  const nums = user ? await contadores(payload, user) : {}
  const podePainel: Record<string, boolean> = {
    '/orcamento': canReadBudgetUser(user),
    '/orcamento/lancamentos': canReadBudgetUser(user),
    '/crm': canAccessCrmUser(user),
    '/crm/meu-dia': podeTerMeuDia(user as never),
  }

  const usados = new Set<string>()
  const areas: AreaPronta[] = AREAS.map((area) => {
    const secoes = area.secoes.map((s) => {
      const itens: ItemPronto[] = []
      for (const it of s.itens) {
        const n = it.contador ? nums[it.contador] : undefined
        const extra = { contador: n || undefined, alerta: it.contador ? ALERTA.has(it.contador) : false }
        if (it.tipo === 'painel') {
          if (!podePainel[it.path]) continue
          itens.push({ id: `p${it.path}`, href: `${admin}${it.path}`, label: it.label, icone: it.icone, exato: true, ...extra })
          continue
        }
        usados.add(it.slug)
        if (!visivel(it.tipo, it.slug)) continue
        const cfg = it.tipo === 'colecao' ? colecoes.get(it.slug) : globais.get(it.slug)
        const label =
          it.label ??
          (it.tipo === 'colecao'
            ? rotulo((cfg as { labels?: { plural?: unknown } })?.labels?.plural, it.slug)
            : rotulo((cfg as { label?: unknown })?.label, it.slug))
        const href = `${admin}/${it.tipo === 'colecao' ? 'collections' : 'globals'}/${it.slug}`
        itens.push({ id: it.slug, href, label, icone: it.icone, exato: false, ...extra })
      }
      return { id: s.id, titulo: s.titulo, fechadaPorPadrao: s.fechadaPorPadrao, itens }
    })
    // Coleções do grupo que não estão na estrutura (ex.: novas) entram em "Outros"
    const outros: ItemPronto[] = payload.config.collections
      .filter((c) => c.admin?.group === area.grupo && !usados.has(c.slug) && visivel('colecao', c.slug))
      .map((c) => ({
        id: c.slug,
        href: `${admin}/collections/${c.slug}`,
        label: rotulo(c.labels?.plural, c.slug),
        icone: 'list',
        exato: false,
      }))
    if (outros.length) secoes.push({ id: `${area.id}-outros`, titulo: 'Outros', fechadaPorPadrao: true, itens: outros })
    return { id: area.id, titulo: area.titulo, cor: area.cor, secoes: secoes.filter((s) => s.itens.length > 0) }
  }).filter((a) => a.secoes.length > 0)

  // Grupos fora das áreas conhecidas: menu padrão do Payload
  const conhecidos = AREAS.map((a) => a.grupo)
  const restantes = groupNavItems(
    [
      ...payload.config.collections
        .filter(({ slug }) => visibleEntities?.collections.includes(slug as never))
        .map((entity) => ({ type: EntityType.collection, entity })),
      ...payload.config.globals
        .filter(({ slug }) => visibleEntities?.globals.includes(slug as never))
        .map((entity) => ({ type: EntityType.global, entity })),
    ] as Parameters<typeof groupNavItems>[0],
    permissions!,
    i18n,
  ).filter((g) => !conhecidos.includes(g.label))

  return (
    <NavWrapper baseClass="nav">
      <nav className="nav__wrap">
        <Menu areas={areas} />
        {restantes.length > 0 && <DefaultNavClient groups={restantes} navPreferences={{} as NavPreferences} />}
        <div className="nav__controls">
          <ThemeToggle />
          <Logout />
        </div>
      </nav>
      <div className="nav__header">
        <div className="nav__header-content">
          <NavHamburger baseClass="nav" />
        </div>
      </div>
    </NavWrapper>
  )
}

