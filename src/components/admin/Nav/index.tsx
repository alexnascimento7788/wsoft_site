import type { NavPreferences, ServerProps, VisibleEntities } from 'payload'
import { DefaultNavClient, NavHamburger, NavWrapper } from '@payloadcms/next/client'
import { Logout } from '@payloadcms/ui'
import { EntityType, groupNavItems } from '@payloadcms/ui/shared'
import { PREFERENCE_KEYS } from 'payload/shared'
import React from 'react'

import { canAccessCrmUser, canReadBudgetUser } from '@/access/roles'
import { PainelLink } from './PainelLink'

type Props = ServerProps & { visibleEntities?: VisibleEntities }

// Blocos do menu, nesta ordem. Grupos que não estiverem aqui vão para o fim.
const BLOCOS = [
  {
    grupo: 'Orçamento',
    painel: { path: '/orcamento', label: '📊 Painel do orçamento', id: 'nav-orcamento' },
    pode: canReadBudgetUser,
  },
  {
    grupo: 'CRM',
    painel: { path: '/crm', label: '🎯 Painel do CRM', id: 'nav-crm' },
    pode: canAccessCrmUser,
  },
  { grupo: 'Site' },
] as const

// Versão do menu padrão do Payload (DefaultNav) com o painel de cada área logo acima dos
// itens dela. Quem enxerga cada item continua sendo decidido pelo access control.
export default async function Nav(props: Props) {
  const { i18n, payload, permissions, user, visibleEntities } = props
  if (!payload?.config || !i18n) return null

  const grupos = groupNavItems(
    [
      ...payload.config.collections
        .filter(({ slug }) => visibleEntities?.collections.includes(slug))
        .map((entity) => ({ type: EntityType.collection, entity })),
      ...payload.config.globals
        .filter(({ slug }) => visibleEntities?.globals.includes(slug))
        .map((entity) => ({ type: EntityType.global, entity })),
    ] as Parameters<typeof groupNavItems>[0],
    permissions!,
    i18n,
  )

  // Grupos abertos/fechados que o usuário escolheu (mesma preferência do menu padrão)
  const prefs = user
    ? await payload
        .find({
          collection: 'payload-preferences',
          depth: 0,
          limit: 1,
          pagination: false,
          where: {
            and: [
              { key: { equals: PREFERENCE_KEYS.NAV } },
              { 'user.relationTo': { equals: user.collection } },
              { 'user.value': { equals: user.id } },
            ],
          },
        })
        .then((r) => r.docs[0]?.value as NavPreferences | undefined)
        .catch(() => undefined)
    : undefined

  const doGrupo = (label: string) => grupos.filter((g) => g.label === label)
  const conhecidos: string[] = BLOCOS.map((b) => b.grupo)

  return (
    <NavWrapper baseClass="nav">
      <nav className="nav__wrap">
        {BLOCOS.map((bloco) => {
          const itens = doGrupo(bloco.grupo)
          const comPainel = 'painel' in bloco && bloco.pode(user)
          if (!comPainel && itens.length === 0) return null
          return (
            <React.Fragment key={bloco.grupo}>
              {comPainel && <PainelLink {...bloco.painel} />}
              {itens.length > 0 && <DefaultNavClient groups={itens} navPreferences={prefs as NavPreferences} />}
            </React.Fragment>
          )
        })}
        <DefaultNavClient
          groups={grupos.filter((g) => !conhecidos.includes(g.label))}
          navPreferences={prefs as NavPreferences}
        />
        <div className="nav__controls">
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
