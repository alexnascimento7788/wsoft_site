import type { CollectionConfig } from 'payload'

import { canEditBudget, canReadBudget, hideFromNonBudget } from '../../access/roles'

export const Fornecedores: CollectionConfig = {
  slug: 'fornecedores',
  labels: { singular: 'Fornecedor', plural: 'Fornecedores' },
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
    defaultColumns: ['nome', 'documento', 'email', 'telefone'],
  },
  defaultSort: 'nome',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'nome', label: 'Nome', type: 'text', required: true, admin: { width: '60%' } },
        {
          name: 'documento',
          label: 'CNPJ / CPF',
          type: 'text',
          admin: { width: '40%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'email', label: 'E-mail', type: 'email', admin: { width: '50%' } },
        { name: 'telefone', label: 'Telefone', type: 'text', admin: { width: '50%' } },
      ],
    },
    {
      name: 'observacoes',
      label: 'Observações',
      type: 'textarea',
    },
  ],
}
