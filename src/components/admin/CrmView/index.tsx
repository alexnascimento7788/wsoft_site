import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, SetStepNav } from '@payloadcms/ui'
import {
  Ban,
  BadgeCheck,
  CalendarClock,
  CircleX,
  Clock,
  ListTodo,
  PhoneCall,
  Presentation,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import React from 'react'

import { canAccessCrmUser, getRoles, isCrmAdminUser } from '@/access/roles'
import { STATUS_LEAD } from '@/collections/Crm/opcoes'
import { FAROL, agruparPorEstado, farolDoStatus } from './farol'
import { Mapa } from './Mapa'

import './index.css'

const ICONES: Record<string, LucideIcon> = {
  na_fila: ListTodo,
  em_contato: PhoneCall,
  qualificado: BadgeCheck,
  apresentacao_agendada: CalendarClock,
  apresentacao_feita: Presentation,
  venda_realizada: Trophy,
  venda_nao_realizada: CircleX,
  retornar_depois: Clock,
  descartado: Ban,
}

// Ordem dos cartões (3 por linha): andamento → apresentação → desfecho
const ORDEM = [
  'na_fila',
  'em_contato',
  'retornar_depois',
  'qualificado',
  'apresentacao_agendada',
  'apresentacao_feita',
  'venda_realizada',
  'venda_nao_realizada',
  'descartado',
]

const corDoFarol = Object.fromEntries(FAROL.map((f) => [f.key, f.cor]))
const nf = (n: number) => n.toLocaleString('pt-BR')

// Painel do CRM (/admin/crm). Os números respeitam o perfil: vendedor e apresentador
// contam só os próprios leads (access control, sem overrideAccess).
export default async function CrmView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const { payload, user } = req
  const adminRoute = payload.config.routes.admin

  if (!user) redirect(`${adminRoute}/login?redirect=${encodeURIComponent(`${adminRoute}/crm`)}`)

  const template = (children: React.ReactNode) => (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user}
      visibleEntities={visibleEntities}
    >
      <SetStepNav nav={[{ label: 'CRM Wsoft' }]} />
      <Gutter className="crm">{children}</Gutter>
    </DefaultTemplate>
  )

  if (!canAccessCrmUser(user)) {
    return template(<p>Você não tem acesso ao CRM.</p>)
  }

  const { docs: empresas } = await payload.find({
    collection: 'crm-empresas',
    overrideAccess: false,
    user,
    req,
    depth: 0,
    pagination: false,
    select: { uf: true, cidade: true, status: true },
  })

  const porStatus: Record<string, number> = {}
  for (const e of empresas) porStatus[e.status] = (porStatus[e.status] ?? 0) + 1
  const total = empresas.length
  const porUf = agruparPorEstado(empresas)

  const roles = getRoles(user)
  const escopo = isCrmAdminUser(user)
    ? 'Todos os leads'
    : roles.includes('vendedor') && roles.includes('apresentador')
      ? 'Seus leads (vendedor e apresentador)'
      : roles.includes('apresentador')
        ? 'Leads encaminhados a você'
        : 'Leads atribuídos a você'

  const statusPorValor = Object.fromEntries(STATUS_LEAD.map((s) => [s.value, s.label]))

  return template(
    <>
      <header className="crm__header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/wsoft-logo.png" alt="Wsoft" className="crm__logo" />
        <div>
          <h1>
            CRM <span>Wsoft</span>
          </h1>
          <p className="crm__sub">
            Prospecção · {escopo}: <strong>{nf(total)}</strong>
          </p>
        </div>
      </header>

      <div className="crm__corpo">
        <section className="crm__cards" aria-label="Leads por status">
          {ORDEM.map((valor) => {
            const Icone = ICONES[valor]
            const n = porStatus[valor] ?? 0
            const cor = corDoFarol[farolDoStatus(valor)]
            const pct = total ? Math.round((n / total) * 100) : 0
            return (
              <a
                key={valor}
                className="crm__card"
                style={{ '--cor': cor } as React.CSSProperties}
                href={`${adminRoute}/collections/crm-empresas?where[status][equals]=${valor}`}
              >
                <span className="crm__card-topo">
                  <span className="crm__card-icone">
                    <Icone size={16} strokeWidth={2} />
                  </span>
                  <span className="crm__card-label">{statusPorValor[valor]}</span>
                </span>
                <span className="crm__card-valor">{nf(n)}</span>
                <span className="crm__card-barra" aria-hidden>
                  <span style={{ width: `${pct}%` }} />
                </span>
                <span className="crm__card-pct">{total ? `${pct}% do total` : '—'}</span>
              </a>
            )
          })}
        </section>

        <Mapa porUf={porUf} adminRoute={adminRoute} />
      </div>
    </>,
  )
}
