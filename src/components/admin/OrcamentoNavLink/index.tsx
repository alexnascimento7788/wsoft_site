'use client'

import { Link, useAuth, useConfig } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import React from 'react'

import { canReadBudgetUser } from '@/access/roles'

export default function OrcamentoNavLink() {
  const { user } = useAuth()
  const pathname = usePathname()
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()

  if (!canReadBudgetUser(user)) return null

  const href = `${adminRoute}/orcamento`
  const isActive = pathname === href

  return (
    <Link className="nav__link" href={href} id="nav-orcamento" prefetch={false}>
      {isActive && <div className="nav__link-indicator" />}
      <span className="nav__link-label" style={{ fontWeight: 600 }}>
        📊 Painel do orçamento
      </span>
    </Link>
  )
}
