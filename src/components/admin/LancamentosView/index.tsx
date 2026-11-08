import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, SetStepNav } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import React from 'react'

import { canEditBudgetUser, canReadBudgetUser } from '@/access/roles'
import { MESES } from '@/collections/Orcamento/meses'
import { Lancamentos, type LinhaLancamento } from './Lancamentos'

import '../OrcamentoView/index.css'
import './index.css'

const nome = (rel: unknown, campo: 'nome' | 'codigo' = 'nome') =>
  rel && typeof rel === 'object' ? ((rel as Record<string, unknown>)[campo] as string) ?? null : null

// Lançamento mensal do orçamento (/admin/orcamento/lancamentos): previsão e realizado de um mês
// para todas as despesas do ano, e o fechamento ("efetivar") do mês.
export default async function LancamentosView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const { payload, user } = req
  const adminRoute = payload.config.routes.admin
  const caminho = `${adminRoute}/orcamento/lancamentos`

  if (!user) redirect(`${adminRoute}/login?redirect=${encodeURIComponent(caminho)}`)

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
      <SetStepNav
        nav={[{ label: 'Painel do orçamento', url: `${adminRoute}/orcamento` }, { label: 'Lançamentos do mês' }]}
      />
      <Gutter className="orc">{children}</Gutter>
    </DefaultTemplate>
  )

  if (!canReadBudgetUser(user)) {
    return template(<p>Você não tem acesso ao orçamento.</p>)
  }

  const config = await payload.findGlobal({
    slug: 'configuracao-orcamento',
    depth: 0,
    overrideAccess: false,
    user,
    req,
  })
  const hoje = new Date()
  const ano = Number(searchParams?.ano) || config.anoVigente || hoje.getFullYear()
  const mesFechado = config.mesFechado ? Number(config.mesFechado) : null

  const { docs } = await payload.find({
    collection: 'despesas',
    depth: 1,
    pagination: false,
    overrideAccess: false,
    user,
    req,
    where: { ano: { equals: ano } },
  })

  const linhas: LinhaLancamento[] = docs
    .map((d) => ({
      id: d.id,
      descricao: d.descricao,
      conta: [nome(d.conta, 'codigo'), nome(d.conta)].filter(Boolean).join(' · '),
      fornecedor: nome(d.fornecedor),
      orcado: MESES.map((m) => Number(d.orcado?.[m.key]) || 0),
      previsto: MESES.map((m) => (d.previsto?.[m.key] ?? null) as number | null),
      realizado: MESES.map((m) => (d.realizado?.[m.key] ?? null) as number | null),
    }))
    .sort((a, b) => a.conta.localeCompare(b.conta, 'pt-BR') || a.descricao.localeCompare(b.descricao, 'pt-BR'))

  // Mês sugerido: o seguinte ao último fechado (ex.: fechado agosto → lançar setembro)
  const mesSugerido =
    Number(searchParams?.mes) || (mesFechado ? Math.min(mesFechado + 1, 12) : hoje.getMonth() + 1)

  return template(
    <Lancamentos
      ano={ano}
      anos={[...new Set([ano - 1, ano, ano + 1, hoje.getFullYear()])].sort()}
      mesInicial={mesSugerido}
      mesFechado={mesFechado}
      linhas={linhas}
      podeEditar={canEditBudgetUser(user)}
      apiRoute={payload.config.routes.api}
      adminRoute={adminRoute}
    />,
  )
}
