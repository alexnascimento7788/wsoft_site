import type { Metadata } from 'next'
import Image from 'next/image'
import { Handshake, HardHat, Users } from 'lucide-react'

import { BrazilMap } from '@/components/BrazilMap'
import { FadeInSection } from '@/components/FadeInSection'
import { getCachedGlobal } from '@/utilities/getGlobals'

export const metadata: Metadata = {
  title: 'Quem Somos — WSoft',
}

const differentials = [
  {
    icon: Users,
    title: 'Atendimento Humanizado',
    description:
      'Uma equipe que atende pelo nome e entende o problema antes de oferecer a solução.',
  },
  {
    icon: HardHat,
    title: 'Equipe Capacitada',
    description:
      'Profissionais especializados no agronegócio, prontos para resolver com agilidade.',
  },
  {
    icon: Handshake,
    title: 'Proximidade Real',
    description:
      'Porque sabemos que quando o sistema para, a operação para — e isso nunca pode acontecer.',
  },
]

export default async function QuemSomosPage() {
  const siteSettings = await getCachedGlobal('site-settings', 0)()

  const digits = siteSettings?.whatsappNumber?.replace(/\D/g, '')
  const whatsappHref = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(
        siteSettings?.whatsappMessage ||
          'Olá! Vim pelo site da WSoft e gostaria de mais informações.',
      )}`
    : '/#solucoes'

  return (
    <main>
      {/* Hero */}
      <section className="relative isolate overflow-hidden text-white min-h-[360px] md:min-h-[440px] flex items-center">
        <Image src="/hero-bg.jpg" alt="" fill priority sizes="1200px" className="object-cover -z-10" />
        <div className="absolute inset-0 -z-10 bg-black/40" aria-hidden />
        <div className="wrap relative py-16 text-center hero-fade-slide-up">
          <h1 className="text-2xl md:text-4xl font-bold max-w-2xl mx-auto drop-shadow-sm">
            Mais de 30 anos conectando o campo à tecnologia.
          </h1>
        </div>
      </section>

      {/* Nossa história */}
      <section className="bg-white py-20">
        <div className="wrap grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Nossa História</h2>
            <p className="mt-4 text-muted-foreground">
              A WSoft nasceu em Boa Esperança, no coração de Minas Gerais, em uma região cercada
              pelo agronegócio. Desde o início, o objetivo foi um só: criar soluções tecnológicas
              que entendessem de verdade a rotina de quem trabalha com grãos, café e cooperativas.
              Três décadas depois, seguimos na mesma cidade, com a mesma proximidade dos nossos
              clientes — só que agora com sistemas que acompanham a evolução do campo, do desktop
              até a nuvem.
            </p>
          </div>
          <div className="rounded-lg bg-muted p-10 flex items-center justify-center min-h-[240px]">
            <Users className="h-16 w-16 text-[#4A9A9A]" />
          </div>
        </div>
      </section>

      <Divider />

      {/* Onde estamos */}
      <section className="py-20" style={{ background: '#FAF7F2' }}>
        <div className="wrap grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Onde Estamos</h2>
            <p className="mt-4 text-muted-foreground">
              Nascemos em Minas Gerais e crescemos junto com nossos clientes. Hoje atendemos
              silos, armazéns e cooperativas em Minas Gerais, São Paulo e Mato Grosso. Mais de 150
              empresas e 600 usuários ativos confiam nos nossos sistemas todos os dias.
            </p>
          </div>
          <FadeInSection className="flex justify-center">
            <BrazilMap />
          </FadeInSection>
        </div>
      </section>

      <Divider />

      {/* Nosso diferencial */}
      <section className="bg-white py-20">
        <div className="wrap">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground">
            Nosso Diferencial
          </h2>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-10">
            {differentials.map((item) => (
              <div key={item.title} className="flex flex-col items-center text-center gap-3">
                <item.icon className="h-10 w-10 text-[#4A9A9A]" />
                <h3 className="font-bold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <FadeInSection>
        <section className="py-20 text-center text-white" style={{ background: '#1A3A1A' }}>
          <div className="wrap">
            <h2 className="text-2xl md:text-3xl font-bold max-w-2xl mx-auto">
              Conheça nossas soluções ou fale com nossa equipe.
            </h2>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-[#E8671A] px-8 py-3 text-sm font-bold uppercase tracking-wide text-white transition-transform duration-300 hover:scale-105"
              >
                Fale com a gente
              </a>
              <a
                href="/#solucoes"
                className="inline-flex items-center justify-center rounded-md border border-white px-8 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors duration-300 hover:bg-white hover:text-[#1A3A1A]"
              >
                Nossas Soluções
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>
    </main>
  )
}

function Divider() {
  return (
    <div className="wrap">
      <div className="h-px bg-[#6BBF4E]/40" />
    </div>
  )
}
