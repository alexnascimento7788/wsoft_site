import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, SetStepNav } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import React from 'react'

import { canAccessCrmUser, getRoles, isCrmAdminUser } from '@/access/roles'
import { STATUS_LEAD } from '@/collections/Crm/opcoes'

import './index.css'

// Página inicial do CRM (/admin/crm). Os números respeitam o perfil: vendedor e apresentador
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
      <SetStepNav nav={[{ label: 'CRM' }]} />
      <Gutter className="crm">{children}</Gutter>
    </DefaultTemplate>
  )

  if (!canAccessCrmUser(user)) {
    return template(<p>Você não tem acesso ao CRM.</p>)
  }

  const contar = (where?: object) =>
    payload
      .count({ collection: 'crm-empresas', overrideAccess: false, user, req, where: where as never })
      .then((r) => r.totalDocs)

  const [total, ...porStatus] = await Promise.all([
    contar(),
    ...STATUS_LEAD.map((s) => contar({ status: { equals: s.value } })),
  ])

  const roles = getRoles(user)
  const escopo = isCrmAdminUser(user)
    ? 'Todos os leads'
    : roles.includes('vendedor') && roles.includes('apresentador')
      ? 'Seus leads (vendedor e apresentador)'
      : roles.includes('apresentador')
        ? 'Leads encaminhados a você'
        : 'Leads atribuídos a você'

  return template(
    <>
      <header className="crm__header">
        <h1>CRM de prospecção</h1>
        <p className="crm__sub">
          {escopo}: <strong>{total.toLocaleString('pt-BR')}</strong>
        </p>
      </header>

      <section className="crm__cards">
        {STATUS_LEAD.map((s, i) => (
          <a
            key={s.value}
            className={`crm__card crm__card--${s.value}`}
            href={`${adminRoute}/collections/crm-empresas?where[status][equals]=${s.value}`}
          >
            <span className="crm__card-label">{s.label}</span>
            <span className="crm__card-valor">{porStatus[i].toLocaleString('pt-BR')}</span>
          </a>
        ))}
      </section>

      {total === 0 && (
        <p className="crm__vazio">
          {isCrmAdminUser(user)
            ? 'Nenhuma empresa importada ainda. A importação das listas chega nas próximas etapas.'
            : 'Nenhum lead atribuído a você ainda.'}
        </p>
      )}
    </>,
  )
}
