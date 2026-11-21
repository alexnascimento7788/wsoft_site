import type { CollectionBeforeChangeHook, CollectionConfig, Field, FieldAccess, PayloadRequest } from 'payload'

import {
  ROLES,
  canReadUsers,
  hideFromNonCrmAdmins,
  isAdmin,
  isAdminField,
  isAdminOrSelf,
  isAdminUser,
  legacyRoleFor,
  type Role,
} from '../../access/roles'
import { campoSegredo } from '../../crm/automacao/campoSegredo'
import { testarEmailUsuario } from '../../crm/automacao/endpoints'

// Caixa de e-mail do vendedor: só a própria pessoa (ou o administrador) vê e altera
const proprioOuAdmin: FieldAccess = ({ req, id, doc }) => {
  if (!req.user) return false
  if (isAdminUser(req.user)) return true
  const alvo = id ?? (doc as { id?: number | string } | undefined)?.id
  return alvo !== undefined && String(alvo) === String(req.user.id)
}
const acessoCaixa = { read: proprioOuAdmin, create: proprioOuAdmin, update: proprioOuAdmin }

const carregarUsuario = async (req: PayloadRequest, id?: number | string) =>
  id === undefined
    ? null
    : ((await req.payload.findByID({
        collection: 'users',
        id,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
        context: { segredos: true },
      })) as unknown as Record<string, unknown> | null)

const caixaDeEmail: Field = {
  type: 'collapsible',
  label: 'Minha caixa de e-mail (CRM)',
  admin: {
    initCollapsed: true,
    description:
      'Os e-mails de prospecção saem em seu nome, por esta caixa, e as respostas voltam para ela e para o CRM. Os avisos de "cliente para assumir" também chegam aqui.',
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'emailRemetenteNome', label: 'Nome do remetente', type: 'text', access: acessoCaixa, admin: { width: '50%', placeholder: 'Alex — Wsoft' } },
        {
          name: 'emailRemetente',
          label: 'E-mail do remetente',
          type: 'email',
          access: acessoCaixa,
          admin: { width: '50%', description: 'Vazio = usa o e-mail de login.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'smtpHost', label: 'Servidor de envio (SMTP)', type: 'text', access: acessoCaixa, admin: { width: '40%', placeholder: 'smtp.seuprovedor.com.br' } },
        { name: 'smtpPorta', label: 'Porta', type: 'number', defaultValue: 587, access: acessoCaixa, admin: { width: '20%' } },
        {
          name: 'smtpSeguro',
          label: 'SSL direto (porta 465)',
          type: 'checkbox',
          access: acessoCaixa,
          admin: { width: '40%', description: 'Deixe desmarcado para a porta 587 (STARTTLS).' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'smtpUsuario', label: 'Usuário', type: 'text', access: acessoCaixa, admin: { width: '50%', description: 'Normalmente o próprio e-mail.' } },
        campoSegredo({
          name: 'smtpSenha',
          label: 'Senha',
          chave: 'users',
          carregar: carregarUsuario,
          access: acessoCaixa,
          description: 'Se o provedor pedir, use uma “senha de app”. Guardada criptografada.',
        }),
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'imapHost',
          label: 'Servidor de recebimento (IMAP)',
          type: 'text',
          access: acessoCaixa,
          admin: { width: '60%', placeholder: 'imap.seuprovedor.com.br', description: 'Para trazer as respostas ao CRM. Usa o mesmo usuário e senha.' },
        },
        { name: 'imapPorta', label: 'Porta', type: 'number', defaultValue: 993, access: acessoCaixa, admin: { width: '40%' } },
      ],
    },
    {
      name: 'testarEmail',
      type: 'ui',
      admin: {
        components: { Field: { path: '@/components/admin/crm/automacao/TestarConexao', clientProps: { alvo: 'email' } } },
      },
    },
  ],
}

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
  endpoints: [testarEmailUsuario],
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
      admin: { description: 'Celular com DDD. Recebe pelo WhatsApp os avisos de "cliente para assumir".' },
    },
    caixaDeEmail,
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
