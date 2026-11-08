import type { CollectionConfig } from 'payload'

import { canEditBudget, canReadBudget, hideFromNonBudget } from '../../access/roles'

export const Contas: CollectionConfig = {
  slug: 'contas',
  labels: { singular: 'Conta', plural: 'Contas' },
  access: {
    create: canEditBudget,
    delete: canEditBudget,
    read: canReadBudget,
    update: canEditBudget,
  },
  admin: {
    group: 'Orçamento',
    hidden: hideFromNonBudget,
    useAsTitle: 'nome',
    defaultColumns: ['codigo', 'nome', 'centroDeCusto', 'ativo'],
  },
  defaultSort: 'codigo',
  fields: [
    {
      name: 'centroDeCusto',
      label: 'Centro de custo',
      type: 'relationship',
      relationTo: 'centros-de-custo',
      required: true,
      index: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'codigo',
          label: 'Código',
          type: 'text',
          required: true,
          admin: { width: '30%', description: 'Ex.: 3.1.01' },
        },
        {
          name: 'nome',
          label: 'Nome',
          type: 'text',
          required: true,
          admin: { width: '70%', description: 'Ex.: Licenças de software, Cloud, Telefonia' },
        },
      ],
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
