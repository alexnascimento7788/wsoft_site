import type { Access, CollectionConfig } from 'payload'

import { canAccessCrmUser, isCrmAdminUser } from '../../access/roles'
import { GRUPO_CRM } from './opcoes'
import { endpointsMeuDia } from './meuDiaEndpoints'

// Cada um vê o próprio planejamento; crm_admin vê o da equipe
const doUsuario: Access = ({ req }) => {
  if (!req.user || !canAccessCrmUser(req.user)) return false
  if (isCrmAdminUser(req.user)) return true
  return { usuario: { equals: req.user.id } }
}
const nunca = () => false

// "Meu dia": o dia planejado pelo vendedor (data + meta de empresas a prospectar).
// Criado pela tela Meu dia (sorteio) ou ao marcar uma empresa para o dia; não se cadastra à mão.
export const Dias: CollectionConfig = {
  slug: 'crm-dias',
  labels: { singular: 'Dia planejado', plural: 'Meu dia — dias' },
  access: { create: nunca, delete: nunca, read: doUsuario, update: nunca },
  admin: {
    group: GRUPO_CRM,
    hidden: true, // a tela é /admin/crm/meu-dia
    defaultColumns: ['dia', 'usuario', 'meta'],
  },
  defaultSort: '-dia',
  endpoints: endpointsMeuDia,
  fields: [
    { name: 'usuario', label: 'Vendedor', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'dia', label: 'Dia (AAAA-MM-DD)', type: 'text', required: true, index: true },
    { name: 'meta', label: 'Meta (empresas)', type: 'number', required: true, defaultValue: 5, min: 0 },
  ],
  timestamps: true,
}

// Empresas do dia de cada vendedor. "Feito" é marcado sozinho quando o vendedor registra
// uma tentativa de contato com a empresa naquele dia.
export const DiaItens: CollectionConfig = {
  slug: 'crm-dia-itens',
  labels: { singular: 'Empresa do dia', plural: 'Meu dia — empresas' },
  access: { create: nunca, delete: doUsuario, read: doUsuario, update: nunca },
  admin: {
    group: GRUPO_CRM,
    hidden: true,
    defaultColumns: ['dia', 'empresa', 'usuario', 'feito'],
  },
  defaultSort: '-dia',
  fields: [
    { name: 'usuario', label: 'Vendedor', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'dia', label: 'Dia (AAAA-MM-DD)', type: 'text', required: true, index: true },
    { name: 'empresa', label: 'Empresa', type: 'relationship', relationTo: 'crm-empresas', required: true, index: true },
    {
      name: 'origem',
      label: 'Como entrou',
      type: 'select',
      defaultValue: 'sorteio',
      options: [
        { label: 'Sorteio do Meu dia', value: 'sorteio' },
        { label: 'Marcada pelo vendedor', value: 'manual' },
      ],
    },
    { name: 'feito', label: 'Feito', type: 'checkbox', defaultValue: false, index: true },
    { name: 'feitoEm', label: 'Feito em', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
  ],
  timestamps: true,
}
