'use client'

import { Link } from '@payloadcms/ui'
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  Columns3,
  Eye,
  History,
  Image as ImageIcon,
  Layers,
  List,
  NotebookPen,
  Package,
  Phone,
  Receipt,
  Settings,
  Shield,
  Target,
  Trophy,
  Truck,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import type { AreaPronta } from './estrutura'

import './Menu.css'

const ICONES: Record<string, LucideIcon> = {
  badge: BadgeCheck,
  building: Building2,
  calendar: CalendarDays,
  chart: ChartColumn,
  columns: Columns3,
  eye: Eye,
  history: History,
  image: ImageIcon,
  layers: Layers,
  list: List,
  notebook: NotebookPen,
  package: Package,
  phone: Phone,
  receipt: Receipt,
  settings: Settings,
  shield: Shield,
  target: Target,
  trophy: Trophy,
  truck: Truck,
  upload: Upload,
  user: UserRound,
  users: Users,
}

const CHAVE = 'wsoft-menu-v1'

// Menu lateral: áreas e seções que abrem/fecham (lembrado neste navegador), item ativo destacado
export function Menu({ areas }: { areas: AreaPronta[] }) {
  const pathname = usePathname() ?? ''
  const [fechados, setFechados] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(areas.flatMap((a) => a.secoes.filter((s) => s.fechadaPorPadrao).map((s) => [s.id, true]))),
  )

  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Record<string, boolean> | null
      if (salvo) setFechados((f) => ({ ...f, ...salvo }))
    } catch {
      /* sem armazenamento */
    }
  }, [])

  const alternar = (id: string) =>
    setFechados((f) => {
      const novo = { ...f, [id]: !f[id] }
      try {
        localStorage.setItem(CHAVE, JSON.stringify(novo))
      } catch {
        /* ignora */
      }
      return novo
    })

  const ativo = (href: string, exato: boolean) => pathname === href || (!exato && pathname.startsWith(`${href}/`))

  return (
    <div className="wmenu">
      {areas.map((area) => {
        const areaFechada = fechados[area.id]
        const temAtivo = area.secoes.some((s) => s.itens.some((i) => ativo(i.href, i.exato)))
        return (
          <section key={area.id} className="wmenu__area" style={{ '--area': area.cor } as React.CSSProperties}>
            <button
              type="button"
              className={`wmenu__area-titulo${temAtivo ? ' wmenu__area-titulo--ativa' : ''}`}
              onClick={() => alternar(area.id)}
              aria-expanded={!areaFechada}
            >
              <span className="wmenu__area-marca" aria-hidden />
              {area.titulo}
              <ChevronDown size={14} className={`wmenu__seta${areaFechada ? ' wmenu__seta--fechada' : ''}`} />
            </button>
            {!areaFechada &&
              area.secoes.map((secao) => {
                const fechada = secao.titulo ? fechados[secao.id] : false
                return (
                  <div key={secao.id} className="wmenu__secao">
                    {secao.titulo && (
                      <button
                        type="button"
                        className="wmenu__secao-titulo"
                        onClick={() => alternar(secao.id)}
                        aria-expanded={!fechada}
                      >
                        {secao.titulo}
                        <ChevronDown size={12} className={`wmenu__seta${fechada ? ' wmenu__seta--fechada' : ''}`} />
                      </button>
                    )}
                    {!fechada && (
                      <ul>
                        {secao.itens.map((item) => {
                          const Icone = ICONES[item.icone] ?? List
                          const on = ativo(item.href, item.exato)
                          return (
                            <li key={item.id}>
                              <Link
                                href={item.href}
                                prefetch={false}
                                className={`wmenu__item${on ? ' wmenu__item--ativo' : ''}`}
                                aria-current={on ? 'page' : undefined}
                              >
                                <span className="wmenu__icone">
                                  <Icone size={14} strokeWidth={2} />
                                </span>
                                <span className="wmenu__label">{item.label}</span>
                                {item.contador ? (
                                  <span className={`wmenu__contador${item.alerta ? ' wmenu__contador--alerta' : ''}`}>
                                    {item.contador > 99 ? '99+' : item.contador}
                                  </span>
                                ) : null}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )
              })}
          </section>
        )
      })}
    </div>
  )
}
