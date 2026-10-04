import type { CollectionConfig } from 'payload'

import {
  hideFromNonAdmins,
  isAdmin,
  isAdminField,
  isAdminOrSelf,
} from '../../access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req }) => Boolean(req.user),
    create: isAdmin,
    delete: isAdmin,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
  },
  admin: {
    defaultColumns: ['name', 'email', 'role'],
    hidden: hideFromNonAdmins,
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      label: 'Perfil',
      type: 'select',
      required: true,
      defaultValue: 'financeiro',
      options: [
        { label: 'Administrador (site + orçamento + usuários)', value: 'admin' },
        { label: 'Financeiro (edita o orçamento)', value: 'financeiro' },
        { label: 'Consulta (só visualiza o orçamento)', value: 'consulta' },
      ],
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
  versions: false,
}
