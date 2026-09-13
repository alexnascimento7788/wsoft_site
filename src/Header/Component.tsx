import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { MobileNav } from './MobileNav'
import { NavDropdown } from './NavDropdown'

const homeSections = [
  { label: 'Soluções', href: '/#solucoes' },
  { label: 'Suporte', href: '/#suporte' },
  { label: 'Números', href: '/#numeros' },
]

export async function Header() {
  const payload = await getPayload({ config: configPromise })

  const { docs: products } = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 20,
    sort: 'order',
    select: {
      name: true,
      slug: true,
    },
  })

  const productLinks = products
    .filter((product) => product.slug)
    .map((product) => ({ label: product.name, href: `/produtos/${product.slug}` }))

  const mobileItems = [
    { label: 'Home', href: '/', children: homeSections },
    { label: 'Produtos', href: '/#solucoes', children: productLinks },
    { label: 'Quem Somos', href: '/quem-somos' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="wrap relative flex items-center justify-between h-20">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/wsoft-logo.png"
            alt="WSoft"
            width={140}
            height={51}
            priority
            className="h-9 w-auto object-contain"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium xl:gap-8 xl:text-base">
          <NavDropdown label="Home" href="/" items={homeSections} />
          <NavDropdown label="Produtos" href="/#solucoes" items={productLinks} />
          <Link href="/quem-somos" className="text-primary hover:text-primary-hover transition-colors">
            Quem Somos
          </Link>
        </nav>

        <MobileNav items={mobileItems} />
      </div>
    </header>
  )
}
