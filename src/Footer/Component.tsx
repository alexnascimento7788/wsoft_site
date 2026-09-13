import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { getCachedGlobal } from '@/utilities/getGlobals'

export async function Footer() {
  const payload = await getPayload({ config: configPromise })

  const [siteSettings, { docs: products }] = await Promise.all([
    getCachedGlobal('site-settings', 1)(),
    payload.find({
      collection: 'products',
      depth: 0,
      limit: 20,
      sort: 'order',
      select: {
        name: true,
        slug: true,
      },
    }),
  ])

  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-muted text-foreground">
      <div className="wrap py-8 flex flex-col items-center gap-3 text-center">
        <Image
          src="/wsoft-logo.png"
          alt="WSoft"
          width={160}
          height={58}
          className="h-10 w-auto object-contain"
        />
        <span className="text-sm text-muted-foreground">
          Sistemas para o agronegócio: café, cereais, cooperativas e gestão de silos.
        </span>
      </div>

      <div className="wrap py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-center">
        <div>
          <h3 className="font-bold text-primary mb-3">Contato</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {siteSettings?.contactEmail && <li>{siteSettings.contactEmail}</li>}
            {siteSettings?.contactPhone && <li>{siteSettings.contactPhone}</li>}
            {siteSettings?.contactCell && <li>{siteSettings.contactCell}</li>}
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-primary mb-3">Produtos</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {products.map((product) =>
              product.slug ? (
                <li key={product.slug}>
                  <Link href={`/produtos/${product.slug}`} className="hover:text-primary transition-colors">
                    {product.name}
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-primary mb-3">WSoft</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/quem-somos" className="hover:text-primary transition-colors">
                Quem Somos
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="wrap py-4 text-xs text-center text-muted-foreground">
          Copyright © {year} WSoft
        </div>
      </div>
    </footer>
  )
}
