import React from 'react'
import { BookOpen, Download, FileText, Landmark, Layers } from 'lucide-react'

import { FadeInSection } from '@/components/FadeInSection'
import { SiagWebLogo } from '@/components/SiagWebLogo'

// Arquivo servido de /public — vai junto no git, então chega igual em qualquer deploy.
export const EBOOK_PATH = '/ebook/SiagWeb_Ebook_2026.pdf'

const highlights = [
  { icon: Layers, label: 'Todos os módulos, do cadastro ao resultado' },
  { icon: Landmark, label: 'Reforma Tributária: o que muda e quando' },
  { icon: FileText, label: '18 páginas em PDF' },
]

function EbookCover() {
  return (
    <div className="relative mx-auto w-40 sm:w-48 md:w-56 rotate-[-4deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-[1.03]">
      <div
        className="relative aspect-[924/1308] overflow-hidden rounded-r-md rounded-l-sm bg-[#1B1F2C] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
        aria-hidden
      >
        {/* lombada */}
        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/40 to-transparent" />
        <div className="flex h-full flex-col p-4 md:p-5">
          <SiagWebLogo variant="dark" className="text-sm md:text-base" />
          <p className="mt-6 md:mt-8 text-[7px] md:text-[8px] font-bold tracking-[0.25em] text-[#4CAF50]">
            E-BOOK 2026
          </p>
          <p className="mt-1.5 text-sm md:text-lg font-extrabold leading-tight text-white">
            Gestão de silos e armazéns de grãos.
          </p>
          <p className="mt-2 text-[7px] md:text-[8px] leading-snug text-white/60">
            ERP completo para a operação do armazém, com análise de dados em cada módulo.
          </p>
        </div>
        {/* campo / silos */}
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-b from-[#1B1F2C] via-[#3d5a2f] to-[#6b8f2a]">
          <div className="absolute bottom-[30%] left-[18%] flex items-end gap-1">
            {[28, 34, 34, 30, 22, 26].map((h, i) => (
              <span
                key={i}
                className="block w-3 md:w-4 rounded-t-full bg-gradient-to-b from-[#c9d1d9] to-[#8a96a3]"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function EbookBanner({
  background = 'transparent',
  className = '',
}: {
  background?: string
  className?: string
}) {
  return (
    <section id="ebook" className={`scroll-mt-24 ${className}`} style={{ background }}>
      <FadeInSection className="wrap">
        <div className="group grid grid-cols-1 md:grid-cols-[auto_1fr] items-center gap-10 md:gap-14 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B1F2C] via-[#1B1F2C] to-[#1f3a24] px-6 py-10 md:px-14 md:py-14 text-white">
          <EbookCover />

          <div className="text-center md:text-left">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#4CAF50]/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#6BBF4E]">
              <BookOpen className="h-3.5 w-3.5" />
              E-book gratuito
            </p>
            <h2 className="mt-4 text-2xl md:text-4xl font-bold leading-tight">
              Gestão de silos e armazéns de grãos.
            </h2>
            <p className="mt-4 text-base md:text-lg text-white/75 max-w-xl mx-auto md:mx-0">
              Conheça o <SiagWebLogo variant="dark" /> módulo a módulo e veja como a análise de
              dados está presente em todo o sistema.
            </p>

            <ul className="mt-6 space-y-2.5 max-w-xl mx-auto md:mx-0 text-left inline-block md:block">
              {highlights.map((item) => (
                <li key={item.label} className="flex items-center gap-3 text-sm text-white/85">
                  <item.icon className="h-4 w-4 shrink-0 text-[#6BBF4E]" />
                  {item.label}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
              <a
                href={EBOOK_PATH}
                download
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-md bg-[#E8671A] px-6 py-3 text-sm font-bold text-white transition-transform duration-300 hover:scale-105"
              >
                <Download className="h-4 w-4" />
                Baixar e-book (PDF)
              </a>
              <a
                href={EBOOK_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-md border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Ler online
              </a>
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>
  )
}
