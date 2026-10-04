import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { MESES, type MesKey } from '../src/collections/Orcamento/meses'

// Lançamentos de 2026 do centro de custo 1101 (Tecnologia).
// Sem orçamento neste ano: orçado fica vazio. Janeiro–setembro = realizado; outubro = previsão.
// Idempotente: atualiza pelo par (ano, descrição), pode rodar de novo sem duplicar.

const ANO = 2026
const MES_FECHADO = '9' // setembro
const CODIGO_CENTRO = '1101'

type Valores = Partial<Record<MesKey, number>>

const CONTAS = [
  { codigo: '1101.01', nome: 'Despesas com Software' },
  { codigo: '1101.02', nome: 'Despesas com Hardware' },
] as const

const FORNECEDORES = ['Google', 'GitHub', 'HostGator', 'Anthropic', 'JetBrains', 'Locaweb'] as const

type Lancamento = {
  descricao: string
  conta: (typeof CONTAS)[number]['codigo']
  fornecedor?: (typeof FORNECEDORES)[number]
  periodicidade: 'mensal' | 'anual' | 'eventual'
  realizado?: Valores
  previsto?: Valores
  observacoes?: string
}

const mesesIguais = (meses: MesKey[], valor: number): Valores =>
  Object.fromEntries(meses.map((m) => [m, valor]))

const LANCAMENTOS: Lancamento[] = [
  {
    descricao: 'Google',
    conta: '1101.01',
    fornecedor: 'Google',
    periodicidade: 'mensal',
    realizado: {
      jan: 125.42,
      fev: 110.1,
      mar: 146.94,
      abr: 228.41,
      mai: 138.68,
      jun: 114.8,
      jul: 120.0,
      ago: 233.68,
      set: 268.29,
    },
    previsto: { out: 268.29 },
  },
  {
    descricao: 'GitHub Copilot',
    conta: '1101.01',
    fornecedor: 'GitHub',
    periodicidade: 'mensal',
    realizado: mesesIguais(['jan', 'fev', 'mar', 'abr', 'mai'], 52.2),
  },
  {
    descricao: 'Renovação de domínio wsoftinfo',
    conta: '1101.01',
    fornecedor: 'HostGator',
    periodicidade: 'anual',
    realizado: { jan: 67.99 },
  },
  {
    descricao: 'Hospedagem — plano semestral',
    conta: '1101.01',
    fornecedor: 'HostGator',
    periodicidade: 'eventual',
    realizado: { mar: 415.87 },
    observacoes: 'Plano semestral',
  },
  {
    descricao: 'Domínio SiagWeb',
    conta: '1101.01',
    fornecedor: 'HostGator',
    periodicidade: 'anual',
    realizado: { ago: 71.99 },
  },
  {
    descricao: 'Claude Code',
    conta: '1101.01',
    fornecedor: 'Anthropic',
    periodicidade: 'mensal',
    realizado: mesesIguais(['mai', 'jun', 'jul', 'ago'], 110),
    observacoes: 'Substituído pelo Claude Code Business em setembro',
  },
  {
    descricao: 'Claude Code Business',
    conta: '1101.01',
    fornecedor: 'Anthropic',
    periodicidade: 'mensal',
    realizado: { set: 276 },
    previsto: { out: 276 },
  },
  {
    descricao: 'JetBrains IntelliJ IDEA',
    conta: '1101.01',
    fornecedor: 'JetBrains',
    periodicidade: 'mensal',
    realizado: mesesIguais(['mai', 'jun', 'jul', 'ago', 'set'], 104),
    observacoes: 'Cancelado a partir de outubro',
  },
  {
    descricao: 'VPS Locaweb',
    conta: '1101.01',
    fornecedor: 'Locaweb',
    periodicidade: 'mensal',
    previsto: { out: 370 },
  },
  {
    descricao: 'HD SSD 1TB — servidor de redundância local da VPS',
    conta: '1101.02',
    periodicidade: 'eventual',
    previsto: { out: 900 },
  },
]

// Todos os 12 meses, com null nos vazios, para o resultado não depender do que já existia
const completo = (valores?: Valores) =>
  Object.fromEntries(MESES.map((m) => [m.key, valores?.[m.key] ?? null]))

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

async function run() {
  const payload = await getPayload({ config })

  const { docs: centros } = await payload.find({
    collection: 'centros-de-custo',
    where: { or: [{ codigo: { equals: CODIGO_CENTRO } }, { nome: { equals: CODIGO_CENTRO } }] },
    limit: 1,
  })
  const centro = centros[0]
  if (!centro) {
    throw new Error(
      `Centro de custo "${CODIGO_CENTRO}" não encontrado. Cadastre-o no admin (Orçamento → Centros de custo) com o código ${CODIGO_CENTRO}.`,
    )
  }
  payload.logger.info(`Centro de custo: ${centro.codigo} — ${centro.nome}`)

  const contaIds: Record<string, number> = {}
  for (const conta of CONTAS) {
    const { docs } = await payload.find({
      collection: 'contas',
      where: { codigo: { equals: conta.codigo } },
      limit: 1,
    })
    const doc = docs[0]
      ? await payload.update({
          collection: 'contas',
          id: docs[0].id,
          data: { nome: conta.nome, centroDeCusto: centro.id },
        })
      : await payload.create({
          collection: 'contas',
          data: { codigo: conta.codigo, nome: conta.nome, centroDeCusto: centro.id, ativo: true },
        })
    contaIds[conta.codigo] = doc.id
    payload.logger.info(`Conta: ${conta.codigo} — ${conta.nome}`)
  }

  const fornecedorIds: Record<string, number> = {}
  for (const nome of FORNECEDORES) {
    const { docs } = await payload.find({
      collection: 'fornecedores',
      where: { nome: { equals: nome } },
      limit: 1,
    })
    const doc = docs[0] ?? (await payload.create({ collection: 'fornecedores', data: { nome } }))
    fornecedorIds[nome] = doc.id
  }
  payload.logger.info(`Fornecedores: ${FORNECEDORES.join(', ')}`)

  for (const l of LANCAMENTOS) {
    const data = {
      ano: ANO,
      descricao: l.descricao,
      conta: contaIds[l.conta],
      fornecedor: l.fornecedor ? fornecedorIds[l.fornecedor] : null,
      periodicidade: l.periodicidade,
      orcado: completo(),
      realizado: completo(l.realizado),
      previsto: completo(l.previsto),
      observacoes: l.observacoes ?? null,
    }
    const { docs } = await payload.find({
      collection: 'despesas',
      where: { and: [{ ano: { equals: ANO } }, { descricao: { equals: l.descricao } }] },
      limit: 1,
    })
    const doc = docs[0]
      ? await payload.update({ collection: 'despesas', id: docs[0].id, data })
      : await payload.create({ collection: 'despesas', data })
    payload.logger.info(
      `Despesa: ${doc.descricao} — realizado ${brl(doc.totalRealizado ?? 0)}, previsto ${brl(doc.totalPrevisto ?? 0)}`,
    )
  }

  await payload.updateGlobal({
    slug: 'configuracao-orcamento',
    data: { anoVigente: ANO, mesFechado: MES_FECHADO },
  })
  payload.logger.info(`Configuração: ano vigente ${ANO}, último mês fechado = setembro`)

  const soma = (campo: 'realizado' | 'previsto') =>
    LANCAMENTOS.reduce(
      (t, l) => t + Object.values(l[campo] ?? {}).reduce((a, b) => a + (b ?? 0), 0),
      0,
    )
  payload.logger.info(
    `Total realizado jan–set: ${brl(soma('realizado'))} · previsão de outubro: ${brl(soma('previsto'))}`,
  )

  process.exit(0)
}

run().catch((err) => {
  const codigo = (err as { cause?: { code?: string } })?.cause?.code
  if (codigo === '42703' || codigo === '42P01') {
    console.error(
      '\nO banco ainda não tem as tabelas/colunas novas. Rode primeiro:  npm run migrate\n' +
        '(ou tudo de uma vez:  npm run orcamento:atualizar)\n',
    )
  } else {
    console.error(err)
  }
  process.exit(1)
})
