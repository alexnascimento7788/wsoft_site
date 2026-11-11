import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, SetStepNav } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import React from 'react'

import { isCrmAdminUser } from '@/access/roles'
import { podeTerMeuDia } from '@/collections/Crm/meuDiaEndpoints'
import { QUANTIDADE_PADRAO, diaDe, diaValido, hoje, inicioDoDia, serieIndicador, somarDias } from '@/crm/meuDia'
import { Grafico, type PontoGrafico } from './Grafico'
import { ListaDoDia, type ItemDoDia } from './ListaDoDia'
import { Planejador, type MarcaDia } from './Planejador'

import '../CrmView/index.css'
import './index.css'

const idDe = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number))
const DIAS_INDICADOR = 30

// Meu dia (/admin/crm/meu-dia): o vendedor escolhe o dia no calendário e quantas empresas quer
// prospectar; o sistema sorteia (Alta → Média → Baixa). Abaixo, o indicador meta x feito.
export default async function MeuDiaView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const { payload, user } = req
  const adminRoute = payload.config.routes.admin
  const caminho = `${adminRoute}/crm/meu-dia`
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
      <SetStepNav nav={[{ label: 'CRM Wsoft', url: `${adminRoute}/crm` }, { label: 'Meu dia' }]} />
      <Gutter className="crm meudia">{children}</Gutter>
    </DefaultTemplate>
  )

  if (!podeTerMeuDia(user)) return template(<p>O Meu dia é para quem tem o perfil de vendedor no CRM.</p>)

  const admin = isCrmAdminUser(user)
  const diaHoje = hoje()
  const diaPedido = searchParams?.dia
  const dia = diaValido(diaPedido) ? diaPedido : diaHoje
  // crm_admin pode acompanhar o dia de outro vendedor (só consulta)
  const alvoId = admin && Number(searchParams?.usuario) ? Number(searchParams?.usuario) : user.id
  const proprio = alvoId === user.id
  const ver = { overrideAccess: false, user, req } as const

  const vendedores = admin
    ? (
        await payload.find({
          collection: 'users',
          where: { roles: { in: ['vendedor'] } },
          depth: 0,
          pagination: false,
          select: { name: true, email: true },
          ...ver,
        })
      ).docs.map((u) => ({ id: u.id, nome: u.name || u.email }))
    : []

  // Itens do dia escolhido
  const { docs: itensDocs } = await payload.find({
    collection: 'crm-dia-itens',
    where: { and: [{ usuario: { equals: alvoId } }, { dia: { equals: dia } }] },
    depth: 1,
    pagination: false,
    sort: 'createdAt',
    populate: {
      'crm-empresas': {
        razaoSocial: true,
        nomeFantasia: true,
        cidade: true,
        uf: true,
        status: true,
        canais: true,
        prioridade: true,
        retornarEm: true,
      },
    },
    ...ver,
  })
  const itens: ItemDoDia[] = itensDocs.map((i) => {
    const e = typeof i.empresa === 'object' ? i.empresa : null
    return {
      id: i.id,
      empresaId: idDe(i.empresa),
      nome: e ? e.nomeFantasia || e.razaoSocial : `Empresa ${idDe(i.empresa)}`,
      razao: e?.razaoSocial ?? '',
      local: e ? [e.cidade, e.uf?.toUpperCase()].filter(Boolean).join(' / ') : '',
      status: e?.status ?? null,
      canais: e?.canais ?? [],
      prioridade: e?.prioridade ?? null,
      retornarEm: e?.retornarEm ?? null,
      origem: i.origem ?? 'sorteio',
      feito: Boolean(i.feito),
    }
  })

  const { docs: diaDocs } = await payload.find({
    collection: 'crm-dias',
    where: { and: [{ usuario: { equals: alvoId } }, { dia: { equals: dia } }] },
    limit: 1,
    depth: 0,
    ...ver,
  })
  const meta = diaDocs[0]?.meta ?? 0

  // Marcas do calendário: 3 meses em volta do dia escolhido
  const inicioCal = `${somarDias(`${dia.slice(0, 7)}-01`, -31).slice(0, 7)}-01`
  const fimCal = somarDias(`${dia.slice(0, 7)}-01`, 62)
  const { docs: itensCal } = await payload.find({
    collection: 'crm-dia-itens',
    where: { and: [{ usuario: { equals: alvoId } }, { dia: { greater_than_equal: inicioCal } }, { dia: { less_than: fimCal } }] },
    depth: 0,
    pagination: false,
    select: { dia: true, feito: true },
    ...ver,
  })
  const marcas: Record<string, MarcaDia> = {}
  for (const i of itensCal) {
    const m = (marcas[i.dia] ??= { total: 0, feitos: 0 })
    m.total++
    if (i.feito) m.feitos++
  }

  // Indicador meta x feito: últimos 30 dias até hoje
  const inicioInd = somarDias(diaHoje, -(DIAS_INDICADOR - 1))
  const [{ docs: diasInd }, { docs: registros }] = await Promise.all([
    payload.find({
      collection: 'crm-dias',
      where: { and: [{ usuario: { equals: alvoId } }, { dia: { greater_than_equal: inicioInd } }, { dia: { less_than_equal: diaHoje } }] },
      depth: 0,
      pagination: false,
      select: { dia: true, meta: true },
      ...ver,
    }),
    payload.find({
      collection: 'crm-registros-contato',
      where: {
        and: [{ registradoPor: { equals: alvoId } }, { dataHora: { greater_than_equal: inicioDoDia(inicioInd).toISOString() } }],
      },
      depth: 1,
      pagination: false,
      select: { dataHora: true, empresa: true },
      populate: { 'crm-empresas': { razaoSocial: true, nomeFantasia: true } },
      ...ver,
    }),
  ])
  const metas: Record<string, number> = Object.fromEntries(diasInd.map((d) => [d.dia, d.meta ?? 0]))
  const empresasPorDia: Record<string, Map<number, string>> = {}
  for (const r of registros) {
    const d = diaDe(r.dataHora)
    const e = r.empresa
    const id = idDe(e)
    const nome = typeof e === 'object' && e ? e.nomeFantasia || e.razaoSocial : `Empresa ${id}`
    ;(empresasPorDia[d] ??= new Map()).set(id, nome)
  }
  const feitos = Object.fromEntries(Object.entries(empresasPorDia).map(([d, m]) => [d, m.size]))
  const pontos: PontoGrafico[] = serieIndicador(inicioInd, diaHoje, metas, feitos).map((p) => ({
    ...p,
    empresas: [...(empresasPorDia[p.dia]?.values() ?? [])],
  }))
  const totalMeta = pontos.reduce((s, p) => s + p.meta, 0)
  const totalFeito = pontos.reduce((s, p) => s + Math.min(p.feito, p.meta || p.feito), 0)
  const diasSemAcao = pontos.filter((p) => p.dia < diaHoje && p.feito === 0).length
  const nomeAlvo = proprio ? null : vendedores.find((v) => v.id === alvoId)?.nome ?? `Usuário ${alvoId}`

  return template(
    <>
      <header className="crm__header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/wsoft-logo.png" alt="Wsoft" className="crm__logo" />
        <div>
          <h1>
            Meu <span>dia</span>
          </h1>
          <p className="crm__sub">
            {nomeAlvo ? (
              <>
                Acompanhando: <strong>{nomeAlvo}</strong> (só consulta)
              </>
            ) : (
              'Escolha o dia, diga quantas empresas quer prospectar e o sistema monta a sua lista.'
            )}
          </p>
        </div>
        {admin && vendedores.length > 0 && (
          <form className="meudia__alvo" method="get" action={caminho}>
            <input type="hidden" name="dia" value={dia} />
            <label>
              Vendedor
              <select name="usuario" defaultValue={String(alvoId)}>
                <option value={user.id}>Eu</option>
                {vendedores
                  .filter((v) => v.id !== user.id)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome}
                    </option>
                  ))}
              </select>
            </label>
            <button type="submit" className="crm-btn">
              Ver
            </button>
          </form>
        )}
      </header>

      <div className="meudia__corpo">
        <Planejador
          dia={dia}
          hoje={diaHoje}
          marcas={marcas}
          quantidadePadrao={QUANTIDADE_PADRAO}
          podeEditar={proprio}
          usuario={proprio ? null : alvoId}
        />
        <ListaDoDia dia={dia} hoje={diaHoje} itens={itens} meta={meta} podeEditar={proprio} adminRoute={adminRoute} />
      </div>

      <section className="meudia__indicador">
        <div className="meudia__kpis">
          <div className="meudia__kpi" style={{ '--cor': '#4F7BE0' } as React.CSSProperties}>
            <span>Meta nos últimos {DIAS_INDICADOR} dias</span>
            <strong>{totalMeta}</strong>
          </div>
          <div className="meudia__kpi" style={{ '--cor': '#E0650C' } as React.CSSProperties}>
            <span>Feito (empresas contatadas)</span>
            <strong>{pontos.reduce((s, p) => s + p.feito, 0)}</strong>
            {totalMeta > 0 && (
              <span className="meudia__kpi-barra" aria-hidden>
                <span style={{ width: `${Math.min(100, Math.round((totalFeito / totalMeta) * 100))}%` }} />
              </span>
            )}
          </div>
          <div className="meudia__kpi" style={{ '--cor': '#DC2626' } as React.CSSProperties}>
            <span>Dias úteis sem nenhuma ação</span>
            <strong>{diasSemAcao}</strong>
          </div>
        </div>
        <Grafico pontos={pontos} hoje={diaHoje} />
      </section>
    </>,
  )
}
