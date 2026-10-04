import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, SetStepNav } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import React from 'react'

import { canEditBudgetUser, canReadBudgetUser } from '@/access/roles'
import { MESES } from '@/collections/Orcamento/meses'
import { calcularPainel, type Linha, type Status } from './dados'
import { Filtros } from './Filtros'
import { GraficoMensal } from './GraficoMensal'
import { Kpis } from './Kpis'
import { TabelaMensal } from './TabelaMensal'

import './index.css'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brl0 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})
const STATUS: Record<Status, { label: string; icon: string }> = {
  ok: { label: 'Dentro do orçado', icon: '✓' },
  atencao: { label: 'Atenção', icon: '!' },
  estourado: { label: 'Estourado', icon: '✕' },
  'sem-orcamento': { label: 'Sem orçamento', icon: '–' },
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`orc-status orc-status--${status}`}>
      <span aria-hidden className="orc-status__icon">
        {STATUS[status].icon}
      </span>
      {STATUS[status].label}
    </span>
  )
}

function LinhaTabela({ linha, nivel }: { linha: Linha; nivel: 0 | 1 }) {
  return (
    <tr className={nivel === 0 ? 'orc-tabela__centro' : undefined}>
      <td style={{ paddingLeft: nivel ? 28 : undefined }}>{linha.nome}</td>
      <td className="num">{brl.format(linha.realizadoAcum)}</td>
      <td className="num">{brl.format(linha.restante)}</td>
      <td className="num">
        <strong>{brl.format(linha.projecao)}</strong>
      </td>
      <td className="num">{brl.format(linha.orcadoAno)}</td>
      <td className={`num ${linha.desvio > 0 && linha.orcadoAcum > 0 ? 'orc-negativo' : ''}`}>
        {linha.orcadoAcum > 0 ? `${linha.desvio > 0 ? '+' : ''}${brl.format(linha.desvio)}` : '—'}
      </td>
      <td>
        <StatusBadge status={linha.status} />
      </td>
    </tr>
  )
}

export default async function OrcamentoView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const { payload, user } = req
  const adminRoute = payload.config.routes.admin

  if (!user) redirect(`${adminRoute}/login?redirect=${encodeURIComponent(`${adminRoute}/orcamento`)}`)

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
      <SetStepNav nav={[{ label: 'Painel do orçamento' }]} />
      <Gutter className="orc">{children}</Gutter>
    </DefaultTemplate>
  )

  if (!canReadBudgetUser(user)) {
    return template(<p>Você não tem acesso ao orçamento.</p>)
  }

  const config = await payload.findGlobal({ slug: 'configuracao-orcamento', req, depth: 0 })
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()

  const ano = Number(searchParams?.ano) || config.anoVigente || anoAtual
  const centro = typeof searchParams?.centro === 'string' ? searchParams.centro : undefined

  const mesRef = config.mesFechado
    ? Number(config.mesFechado)
    : ano < anoAtual
      ? 12
      : ano > anoAtual
        ? 0
        : hoje.getMonth()

  const limites = {
    alerta: config.alertaPercentual ?? 90,
    limite: config.limitePercentual ?? 100,
  }

  const [{ docs: despesas }, { docs: centros }] = await Promise.all([
    payload.find({
      collection: 'despesas',
      depth: 1,
      pagination: false,
      req,
      where: {
        and: [{ ano: { equals: ano } }, ...(centro ? [{ centroDeCusto: { equals: centro } }] : [])],
      },
    }),
    payload.find({
      collection: 'centros-de-custo',
      depth: 0,
      pagination: false,
      req,
      sort: 'nome',
      select: { nome: true },
    }),
  ])

  const anos = [...new Set([anoAtual - 1, anoAtual, anoAtual + 1, ano])].sort()
  const dados = calcularPainel(despesas, mesRef, limites)
  const mesRefNome = mesRef > 0 ? MESES[mesRef - 1].nome.toLowerCase() : null
  const proximoNome = mesRef < 12 ? MESES[mesRef].nome.toLowerCase() : null
  const podeEditar = canEditBudgetUser(user)
  const link = (path: string) => `${adminRoute}${path}`

  return template(
    <>
      <header className="orc-header">
        <div>
          <h1>Painel do orçamento</h1>
          <p className="orc-sub">
            {mesRefNome
              ? `${ano} · realizado de janeiro a ${mesRefNome}${
                  proximoNome ? `, previsão de ${proximoNome} em diante` : ''
                }`
              : `${ano} · nenhum mês fechado ainda, tudo é previsão`}
          </p>
        </div>
        <Filtros
          anos={anos}
          ano={ano}
          centros={centros.map((c) => ({ id: c.id, nome: c.nome }))}
          centro={centro}
        />
      </header>

      {despesas.length === 0 ? (
        <div className="orc-vazio">
          <h2>Nenhuma despesa lançada para {ano}.</h2>
          <p>Para montar o orçamento, siga esta ordem:</p>
          <ol>
            <li>
              <a href={link('/collections/centros-de-custo/create')}>Cadastre um centro de custo</a>{' '}
              (ex.: Tecnologia)
            </li>
            <li>
              <a href={link('/collections/contas/create')}>Cadastre as contas</a> desse centro (ex.:
              Licenças de software, Cloud)
            </li>
            <li>
              <a href={link('/collections/fornecedores/create')}>Cadastre os fornecedores</a>
            </li>
            <li>
              <a href={link('/collections/despesas/create')}>Lance as despesas</a> com os valores
              orçados, realizados e previstos de cada mês
            </li>
          </ol>
          {!podeEditar && <p>Seu perfil é de consulta: peça a alguém do financeiro para lançar.</p>}
        </div>
      ) : (
        <>
          <Kpis
            ano={ano}
            mesRef={mesRef}
            realizadoMes={dados.realizadoMes}
            projecaoMes={dados.projecaoMes}
            realizadoAcum={dados.realizadoAcum}
            restante={dados.restante}
            projecao={dados.projecao}
            orcadoAno={dados.orcadoAno}
            mediaMensal={dados.mediaMensal}
            linkDespesas={link('/collections/despesas')}
          />

          <section className="orc-card">
            <div className="orc-card__cabecalho">
              <h2>Gasto mês a mês</h2>
              <span className="orc-sub">Passe o mouse sobre um mês para ver o que foi gasto</span>
            </div>
            <GraficoMensal
              orcado={dados.orcadoMes}
              projecao={dados.projecaoMes}
              itens={dados.contas.flatMap((c) => c.itens)}
              mesRef={mesRef}
            />
          </section>

          <div className="orc-grid">
            <section className="orc-card">
              <h2>Por centro de custo e conta</h2>
              <div className="orc-scroll">
                <table className="orc-tabela">
                  <thead>
                    <tr>
                      <th>Centro / conta</th>
                      <th className="num">Realizado acum.</th>
                      <th className="num">Previsão restante</th>
                      <th className="num">Projeção ano</th>
                      <th className="num">Orçado ano</th>
                      <th className="num">Desvio x orçado</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.centros.map((c) => (
                      <React.Fragment key={c.id}>
                        <LinhaTabela linha={c} nivel={0} />
                        {c.contas.map((conta) => (
                          <LinhaTabela key={conta.id} linha={conta} nivel={1} />
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="orc-card">
              <h2>Maiores fornecedores</h2>
              <p className="orc-sub">Projeção do ano: realizado + previsão</p>
              <ul className="orc-fornecedores">
                {dados.fornecedores.map((f) => {
                  const primeiro = dados.fornecedores[0]
                  const maior = (primeiro ? primeiro.realizado + primeiro.restante : 0) || 1
                  return (
                    <li key={f.nome}>
                      <div className="orc-fornecedores__linha">
                        <span>{f.nome}</span>
                        <b>{brl0.format(f.realizado + f.restante)}</b>
                      </div>
                      <div className="orc-fornecedores__barra">
                        <span style={{ width: `${(f.realizado / maior) * 100}%` }} />
                        <span
                          className="orc-fornecedores__previsto"
                          style={{ width: `${(f.restante / maior) * 100}%` }}
                        />
                      </div>
                      <span className="orc-sub">
                        Realizado {brl0.format(f.realizado)}
                        {f.restante > 0 ? ` · previsão ${brl0.format(f.restante)}` : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>

          <section className="orc-card orc-card--espaco">
            <div className="orc-card__cabecalho">
              <h2>Gastos mês a mês por conta e fornecedor</h2>
              <span className="orc-sub">
                Valores em R$ · colunas em itálico são previsão
              </span>
            </div>
            <TabelaMensal contas={dados.contas} mesRef={mesRef} />
          </section>
        </>
      )}
    </>,
  )
}
