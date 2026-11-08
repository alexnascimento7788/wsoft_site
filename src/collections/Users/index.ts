import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import {
  ROLES,
  canReadUsers,
  hideFromNonCrmAdmins,
  isAdmin,
  isAdminField,
  isAdminOrSelf,
  legacyRoleFor,
  type Role,
} from '../../access/roles'

// Mantém a coluna antiga `role` coerente com `roles` (usada só pelo código anterior)
const syncLegacyRole: CollectionBeforeChangeHook = ({ data }) => {
  if (Array.isArray(data.roles)) data.role = legacyRoleFor(data.roles as Role[])
  return data
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuário', plural: 'Usuários' },
  access: {
    admin: ({ req }) => Boolean(req.user),
    create: isAdmin,
    delete: isAdmin,
    read: canReadUsers,
    update: isAdminOrSelf,
  },
  admin: {
    group: 'Site',
    defaultColumns: ['name', 'email', 'roles', 'ativo'],
    hidden: hideFromNonCrmAdmins,
    useAsTitle: 'name',
  },
  auth: true,
  hooks: {
    beforeChange: [syncLegacyRole],
  },
  fields: [
    {
      name: 'name',
      label: 'Nome',
      type: 'text',
    },
    {
      name: 'telefone',
      label: 'Telefone',
      type: 'text',
    },
    {
      name: 'roles',
      label: 'Perfis',
      type: 'select',
      hasMany: true,
      required: true,
      options: ROLES.map(({ value, label }) => ({ value, label })),
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: {
        position: 'sidebar',
        description: 'Uma pessoa pode ter mais de um perfil (ex.: vendedor e apresentador).',
      },
      validate: (value, { req, id }) => {
        if (!Array.isArray(value) || value.length === 0) return 'Escolha pelo menos um perfil.'
        // Ninguém tira o próprio perfil de administrador (evita ficar sem acesso ao admin)
        if (id && req.user?.id === id && !value.includes('admin') && req.user.roles?.includes('admin')) {
          return 'Você não pode remover o seu próprio perfil de administrador.'
        }
        return true
      },
    },
    {
      name: 'ativo',
      label: 'Ativo',
      type: 'checkbox',
      defaultValue: true,
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: {
        position: 'sidebar',
        description: 'Inativo não recebe novos leads; o histórico mantém o nome.',
      },
    },
    {
      // Perfil antigo (um só). Preenchido automaticamente a partir de "Perfis".
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'financeiro',
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Financeiro', value: 'financeiro' },
        { label: 'Consulta', value: 'consulta' },
      ],
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: { hidden: true },
    },
  ],
  timestamps: true,
  versions: false,
}
