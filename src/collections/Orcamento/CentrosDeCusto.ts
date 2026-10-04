import type { CollectionConfig } from 'payload'

import { canEditBudget, canReadBudget } from '../../access/roles'

export const CentrosDeCusto: CollectionConfig = {
  slug: 'centros-de-custo',
  labels: { singular: 'Centro de custo', plural: 'Centros de custo' },
  access: {
    create: canEditBudget,
    delete: canEditBudget,
    read: canReadBudget,
    update: canEditBudget,
  },
  admin: {
    group: 'Orçamento',
    useAsTitle: 'nome',
    defaultColumns: ['codigo', 'nome', 'responsavel', 'ativo'],
  },
  defaultSort: 'codigo',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'codigo',
          label: 'Código',
          type: 'text',
          required: true,
          unique: true,
          admin: { width: '30%', description: 'Ex.: 01, TI, ADM' },
        },
        {
          name: 'nome',
          label: 'Nome',
          type: 'text',
          required: true,
          admin: { width: '70%' },
        },
      ],
    },
    {
      name: 'responsavel',
      label: 'Responsável',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea',
    },
    {
      name: 'ativo',
      label: 'Ativo',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
