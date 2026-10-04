import type { Metadata } from 'next'
import Image from 'next/image'
import { BarChart3, Cloud, FileSignature, Receipt, ShieldCheck, Warehouse } from 'lucide-react'

import { EbookBanner } from '@/components/EbookBanner'
import { SiagWebLogo } from '@/components/SiagWebLogo'
import { getCachedGlobal } from '@/utilities/getGlobals'

export const metadata: Metadata = {
  title: 'SiagWeb — WSoft',
}

const modules = [
  {
    icon: Warehouse,
    title: 'Gestão de Grãos',
    description: 'Estoque, embarque, romaneio e armazenagem em tempo real.',
  },
  {
    icon: FileSignature,
    title: 'Contratos Digitais',
    description: 'Pedidos de compra e venda com assinatura eletrônica integrada.',
  },
  {
    icon: Receipt,
    title: 'Fiscal',
    description: 'Emissão de NF-e integrada e em conformidade com a legislação.',
  },
  {
    icon: BarChart3,
    title: 'Indicadores',
    description: 'Dashboards e relatórios analíticos para decisões mais rápidas.',
  },
  {
    icon: ShieldCheck,
    title: 'Segurança e Auditoria',
    description: 'Acesso por perfil de usuário e rastreabilidade completa de cada operação.',
  },
  {
    icon: Cloud,
    title: '100% em Nuvem',
    description: 'Sem instalação, sem servidor local, atualizado automaticamente.',
  },
]

export default async function SiagWebPage() {
  const siteSettings = await getCachedGlobal('site-settings', 0)()

  const digits = siteSettings?.whatsappNumber?.replace(/\D/g, '')
  const whatsappHref = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(
        'Olá! Tenho interesse no SiagWeb e gostaria de falar com um especialista.',
      )}`
    : '/#sobre-nos'

  return (
    <main>
      {/* Hero */}
      <section className="relative isolate overflow-hidden text-white min-h-[420px] md:min-h-[560px] flex items-center">
        <Image src="/hero-bg.jpg" alt="" fill priority sizes="1200px" className="object-cover -z-10" />
        <div className="absolute inset-0 -z-10 bg-black/55" aria-hidden />
        <div className="wrap relative py-16 text-center hero-fade-slide-up">
          <SiagWebLogo variant="dark" className="text-4xl md:text-5xl" />
          <h1 className="mt-6 text-2xl md:text-4xl font-bold max-w-2xl mx-auto drop-shadow-sm">
            A gestão agroindustrial que saiu do desktop e foi para o futuro.
          </h1>
          <p className="mt-4 text-base md:text-lg text-white/85 max-w-xl mx-auto">
            Plataforma SaaS completa para armazéns e cerealistas. Acesse de qualquer lugar, sem
            instalação.
          </p>
        </div>
      </section>

      {/* Módulos */}
      <section className="bg-[#F2F2F2] py-20">
        <div className="wrap">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Tudo que seu negócio precisa em um só lugar.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod) => (
              <div
                key={mod.title}
                className="group rounded-lg bg-white p-6 border-t-[3px] border-[#4A9A9A] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-[#E8671A]"
              >
                <mod.icon className="h-8 w-8 text-[#4A9A9A] transition-colors duration-300 group-hover:text-[#E8671A]" />
                <h3 className="mt-4 font-bold">{mod.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{mod.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <EbookBanner background="#F2F2F2" className="pb-20" />

      {/* Destaque SaaS */}
      <section className="bg-[#1A3A1A] py-20 text-center text-white">
        <div className="wrap">
          <h2 className="text-2xl md:text-4xl font-bold max-w-2xl mx-auto">
            Chega de sistema preso no computador.
          </h2>
          <p className="mt-4 text-base md:text-lg text-white/85 max-w-xl mx-auto">
            O SiagWeb é SaaS — acesse pelo navegador de qualquer dispositivo, com seus dados
            seguros na nuvem.
          </p>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-pulse mt-8 inline-flex items-center justify-center rounded-md bg-[#E8671A] px-8 py-3 text-sm font-bold uppercase tracking-wide text-white transition-transform duration-300 hover:scale-105"
          >
            Fale com um especialista
          </a>
        </div>
      </section>
    </main>
  )
}
