import type { CollectionBeforeChangeHook, CollectionConfig, Field } from 'payload'

import { canEditBudget, canReadBudget, hideFromNonBudget } from '../../access/roles'
import { MESES, somaMeses } from './meses'

const moedaCell = '@/components/admin/MoedaCell'

// 12 campos numéricos (jan…dez) em 3 linhas de 4
const camposMensais = (): Field[] =>
  [0, 4, 8].map((inicio) => ({
    type: 'row' as const,
    fields: MESES.slice(inicio, inicio + 4).map(
      (mes): Field => ({
        name: mes.key,
        label: mes.nome,
        type: 'number',
        min: 0,
        admin: { width: '25%', step: 0.01, placeholder: '0,00' },
      }),
    ),
  }))

const preencherDespesa: CollectionBeforeChangeHook = async ({ data, req, originalDoc }) => {
  // Centro de custo vem sempre da conta, para os filtros e o painel
  const contaId =
    typeof data.conta === 'object' && data.conta !== null ? data.conta.id : data.conta
  if (contaId && contaId !== originalDoc?.conta) {
    const conta = await req.payload.findByID({
      collection: 'contas',
      id: contaId,
      depth: 0,
      req,
    })
    data.centroDeCusto = conta.centroDeCusto
  } else if (contaId && !data.centroDeCusto) {
    data.centroDeCusto = originalDoc?.centroDeCusto
  }

  // Valor mensal padrão: preenche apenas os meses do orçado que estão vazios
  if (data.periodicidade === 'mensal' && Number(data.valorMensal) > 0) {
    data.orcado = { ...(data.orcado ?? {}) }
    for (const mes of MESES) {
      if (data.orcado[mes.key] === null || data.orcado[mes.key] === undefined) {
        data.orcado[mes.key] = Number(data.valorMensal)
      }
    }
  }

  // Em atualizações parciais (ex.: só o realizado), os grupos que não vieram mantêm o valor gravado
  data.totalOrcado = somaMeses(data.orcado ?? originalDoc?.orcado)
  data.totalRealizado = somaMeses(data.realizado ?? originalDoc?.realizado)
  data.totalPrevisto = somaMeses(data.previsto ?? originalDoc?.previsto)
  return data
}

export const Despesas: CollectionConfig = {
  slug: 'despesas',
  labels: { singular: 'Despesa', plural: 'Despesas' },
  access: {
    create: canEditBudget,
    delete: canEditBudget,
    read: canReadBudget,
    update: canEditBudget,
  },
  admin: {
    group: 'Orçamento',
    hidden: hideFromNonBudget,
    useAsTitle: 'descricao',
    defaultColumns: [
      'descricao',
      'conta',
      'fornecedor',
      'ano',
      'totalOrcado',
      'totalRealizado',
      'totalPrevisto',
    ],
    listSearchableFields: ['descricao'],
    description:
      'Cada despesa é uma linha do orçamento: conta, fornecedor e os valores orçado, realizado e previsto de cada mês do ano.',
  },
  defaultSort: '-ano',
  hooks: {
    beforeChange: [preencherDespesa],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'descricao',
          label: 'Descrição',
          type: 'text',
          required: true,
          admin: { width: '75%', description: 'Ex.: Microsoft 365 — 25 licenças' },
        },
        {
          name: 'ano',
          label: 'Ano',
          type: 'number',
          required: true,
          index: true,
          min: 2000,
          max: 2100,
          defaultValue: () => new Date().getFullYear(),
          admin: { width: '25%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'conta',
          label: 'Conta',
          type: 'relationship',
          relationTo: 'contas',
          required: true,
          index: true,
          admin: { width: '50%' },
        },
        {
          name: 'fornecedor',
          label: 'Fornecedor',
          type: 'relationship',
          relationTo: 'fornecedores',
          index: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'periodicidade',
          label: 'Periodicidade',
          type: 'select',
          required: true,
          defaultValue: 'mensal',
          options: [
            { label: 'Mensal', value: 'mensal' },
            { label: 'Anual', value: 'anual' },
            { label: 'Eventual', value: 'eventual' },
          ],
          admin: { width: '50%' },
        },
        {
          name: 'valorMensal',
          label: 'Valor mensal padrão (R$)',
          type: 'number',
          min: 0,
          admin: {
            width: '50%',
            step: 0.01,
            condition: (_, siblingData) => siblingData?.periodicidade === 'mensal',
            description: 'Ao salvar, preenche os meses do orçado que estiverem vazios.',
          },
        },
      ],
    },
    {
      name: 'orcado',
      label: 'Orçado (R$)',
      type: 'group',
      fields: camposMensais(),
    },
    {
      name: 'realizado',
      label: 'Realizado (R$)',
      type: 'group',
      admin: { description: 'Preencha conforme os pagamentos de cada mês forem realizados.' },
      fields: camposMensais(),
    },
    {
      name: 'previsto',
      label: 'Previsão (R$)',
      type: 'group',
      admin: {
        description:
          'Quanto se espera gastar nos meses que ainda não fecharam (ex.: outubro). Entra na projeção do ano no lugar do orçado.',
      },
      fields: camposMensais(),
    },
    {
      name: 'observacoes',
      label: 'Observações',
      type: 'textarea',
    },
    {
      name: 'centroDeCusto',
      label: 'Centro de custo',
      type: 'relationship',
      relationTo: 'centros-de-custo',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Definido automaticamente pela conta.',
      },
    },
    {
      name: 'totalOrcado',
      label: 'Total orçado no ano',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
        components: { Cell: moedaCell },
      },
    },
    {
      name: 'totalRealizado',
      label: 'Total realizado no ano',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
        components: { Cell: moedaCell },
      },
    },
    {
      name: 'totalPrevisto',
      label: 'Total previsto no ano',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
        components: { Cell: moedaCell },
      },
    },
  ],
}
