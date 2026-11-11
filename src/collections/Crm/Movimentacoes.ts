import type { CollectionConfig } from 'payload'

import { crmLeadAccess, hideFromNonCrm } from '../../access/roles'
import { GRUPO_CRM, STATUS_LEAD } from './opcoes'

// Histórico de status do lead. Gravado pelo sistema a cada movimento; ninguém edita ou apaga.
export const Movimentacoes: CollectionConfig = {
  slug: 'crm-movimentacoes',
  labels: { singular: 'Movimentação', plural: 'Histórico de status' },
  access: {
    create: () => false,
    delete: () => false,
    read: crmLeadAccess('empresa.'),
    update: () => false,
  },
  admin: {
    group: GRUPO_CRM,
    hidden: hideFromNonCrm,
    defaultColumns: ['createdAt', 'empresa', 'de', 'para', 'usuarioNome'],
    components: { beforeList: ['@/components/admin/crm/AvisoNasceDaEmpresa'] },
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'empresa',
      label: 'Empresa',
      type: 'relationship',
      relationTo: 'crm-empresas',
      required: true,
      index: true,
    },
    { name: 'de', label: 'De', type: 'select', options: STATUS_LEAD },
    { name: 'para', label: 'Para', type: 'select', options: STATUS_LEAD, required: true },
    { name: 'motivo', label: 'Motivo / observação', type: 'text' },
    { name: 'usuario', label: 'Usuário', type: 'relationship', relationTo: 'users' },
    { name: 'usuarioNome', label: 'Nome do usuário', type: 'text' },
  ],
  timestamps: true,
}
