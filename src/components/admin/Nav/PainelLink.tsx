'use client'

import { Link, useConfig } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import React from 'react'

// Link para um painel (view customizada), no mesmo estilo dos itens do menu do Payload
export function PainelLink({ path, label, id }: { path: string; label: string; id: string }) {
  const pathname = usePathname()
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()

  const href = `${adminRoute}${path}`
  const isActive = pathname === href

  return (
    <Link className="nav__link" href={href} id={id} prefetch={false}>
      {isActive && <div className="nav__link-indicator" />}
      <span className="nav__link-label" style={{ fontWeight: 600 }}>
        {label}
      </span>
    </Link>
  )
}
