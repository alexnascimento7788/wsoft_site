import Image from 'next/image'
import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { AnimatedCounter } from '@/components/AnimatedCounter'
import { EbookBanner } from '@/components/EbookBanner'
import { Media } from '@/components/Media'
import { SiagWebHighlight } from '@/components/SiagWebHighlight'
import { getCachedGlobal } from '@/utilities/getGlobals'

export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })

  const [siteSettings, { docs: products }] = await Promise.all([
    getCachedGlobal('site-settings', 1)(),
    payload.find({
      collection: 'products',
      depth: 1,
      limit: 20,
      sort: 'order',
    }),
  ])

  return (
    <main>
      {/* Hero */}
      <section className="relative isolate overflow-hidden text-white min-h-[420px] md:min-h-[560px] flex items-center">
        <Image
          src="/hero-bg.jpg"
          alt=""
          fill
          priority
          sizes="1200px"
          className="object-cover -z-10"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.05))',
          }}
          aria-hidden
        />
        <div className="wrap relative py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold max-w-3xl mx-auto drop-shadow-sm">
            {siteSettings?.heroHeadline || 'Soluções em Sistemas para o Agronegócio'}
          </h1>
          <p className="mt-4 text-base md:text-lg opacity-90 max-w-2xl mx-auto">
            {siteSettings?.heroSubtitle ||
              'Otimizamos processos e recursos alinhando-os à estratégia do seu negócio.'}
          </p>
        </div>
      </section>

      {/* Vitrine de produtos */}
      <section id="solucoes" className="wrap pt-20 pb-10 scroll-mt-24">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Nossas soluções</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products
            .filter((product) => product.slug !== 'siagweb')
            .map((product) => (
              <div
                key={product.id}
                className="flex flex-col items-center text-center rounded-lg border border-border bg-card p-8"
              >
                {product.logo && typeof product.logo === 'object' && (
                  <Media resource={product.logo} imgClassName="h-16 w-auto object-contain mb-4" />
                )}
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                {product.shortDescription && (
                  <p className="text-sm text-muted-foreground mb-6">{product.shortDescription}</p>
                )}
                <Link
                  href={`/produtos/${product.slug}`}
                  className="mt-auto inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
                >
                  Saiba mais
                </Link>
              </div>
            ))}
        </div>
      </section>

      <SiagWebHighlight href="/produtos/siagweb" />

      <EbookBanner background="linear-gradient(to right, #FFFFFF, #F0F7EE)" className="pb-16" />

      <div
        className="h-10"
        style={{ background: 'linear-gradient(to bottom, #F0F7EE, #F4791F)' }}
        aria-hidden
      />

      {/* Suporte empenhado */}
      <section
        id="suporte"
        className="py-20 scroll-mt-24"
        style={{
          background: 'linear-gradient(to bottom, #F4791F 0%, #d9b39a 55%, #d6d6d6 100%)',
        }}
      >
        <div className="wrap flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 flex justify-center">
            <Image
              src="/suporte-illustration.png"
              alt="Suporte empenhado"
              width={500}
              height={480}
              className="w-64 h-auto object-contain"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Suporte empenhado
            </h2>
            <p className="font-semibold text-foreground max-w-xl">
              Temos uma equipe especializada de suporte para o atendimento imediato para sanar
              quaisquer dúvidas!
            </p>
          </div>
        </div>
      </section>

      {/* Nossos números */}
      {siteSettings?.statNumbers && siteSettings.statNumbers.length > 0 && (
        <section id="numeros" className="border-t border-primary/30 bg-background py-16 scroll-mt-24">
          <h2 className="text-center text-xl md:text-2xl font-bold mb-10">Nossos números:</h2>
          <div className="wrap grid grid-cols-2 md:grid-cols-3 gap-8">
            {siteSettings.statNumbers.map((stat, i) => (
              <AnimatedCounter
                key={i}
                value={stat.value}
                suffix={stat.suffix}
                label={stat.label}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
