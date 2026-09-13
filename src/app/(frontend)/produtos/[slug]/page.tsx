import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

type Args = {
  params: Promise<{ slug: string }>
}

async function getProduct(slug: string) {
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 1,
    where: {
      slug: { equals: slug },
    },
  })

  return docs[0] || null
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 100,
    select: { slug: true },
  })

  return docs
    .filter((d) => d.slug && d.slug !== 'siagweb')
    .map((d) => ({ slug: d.slug as string }))
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)

  return {
    title: product ? `${product.name} — WSoft` : 'Produto não encontrado — WSoft',
  }
}

export default async function ProductPage({ params }: Args) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) return notFound()

  return (
    <main className="wrap py-20">
      <div className="flex flex-col items-center text-center mb-12">
        {product.logo && typeof product.logo === 'object' && (
          <Media resource={product.logo} imgClassName="h-20 w-auto object-contain mb-6" />
        )}
        <h1 className="text-2xl md:text-4xl font-bold">Informações - {product.name}</h1>
      </div>

      {product.status === 'em-breve' || !product.features ? (
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-lg text-muted-foreground">
            {product.shortDescription || 'Em breve, mais informações sobre este produto.'}
          </p>
          <span className="inline-block mt-6 rounded-full bg-muted px-4 py-1 text-sm font-medium">
            Em breve
          </span>
        </div>
      ) : (
        <RichText data={product.features} enableGutter={false} />
      )}
    </main>
  )
}
