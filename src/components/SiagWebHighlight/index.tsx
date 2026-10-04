'use client'

import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { BookOpen, Cloud, Globe, ShieldCheck } from 'lucide-react'

import { SiagWebLogo } from '@/components/SiagWebLogo'

const points = [
  { icon: Cloud, label: '100% em nuvem' },
  { icon: Globe, label: 'Acesse de qualquer lugar' },
  { icon: ShieldCheck, label: 'Dados seguros' },
]

export function SiagWebHighlight({ href }: { href: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section style={{ background: 'linear-gradient(to right, #FFFFFF, #F0F7EE)' }}>
      <div
        ref={ref}
        className={`wrap pt-10 pb-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center transition-all duration-700 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div>
          <SiagWebLogo className="text-3xl md:text-4xl" />
          <h2 className="mt-4 text-2xl md:text-3xl font-bold">
            A nova geração da gestão agroindustrial
          </h2>
          <p className="mt-4 text-muted-foreground max-w-md">
            O único sistema da WSoft 100% web e em nuvem — acesse de qualquer lugar, sem
            instalação, sem servidor local.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href={href}
              className="inline-flex items-center justify-center rounded-md bg-[#E8671A] px-5 py-2 text-sm font-bold text-white transition-transform duration-300 hover:scale-105"
            >
              Saiba mais
            </Link>
            <a
              href="#ebook"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#2E7D32] hover:underline"
            >
              <BookOpen className="h-4 w-4" />
              Baixe o e-book grátis
            </a>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {points.map((point) => (
            <div key={point.label} className="flex flex-col items-center text-center gap-2 sm:gap-3">
              <point.icon className="h-8 w-8 sm:h-10 sm:w-10 text-[#4A9A9A]" />
              <span className="text-xs sm:text-sm text-muted-foreground">{point.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
