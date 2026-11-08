import type { CollectionConfig } from 'payload'

import { hideFromNonCrmAdmins, isCrmAdmin } from '../../access/roles'
import { preencherRegistradoPor } from './hooks'
import { GRUPO_CRM, camposRegistradoPor } from './opcoes'

const soCrmAdmin = { create: isCrmAdmin, delete: isCrmAdmin, read: isCrmAdmin, update: isCrmAdmin }
const nunca = () => false

// Mapeamentos de colunas salvos para a tela de importação (ex.: "Boa Vista — 44 colunas")
export const ModelosImportacao: CollectionConfig = {
  slug: 'crm-modelos-importacao',
  labels: { singular: 'Modelo de importação', plural: 'Modelos de importação' },
  access: soCrmAdmin,
  admin: { group: GRUPO_CRM, hidden: hideFromNonCrmAdmins, useAsTitle: 'nome' },
  fields: [
    { name: 'nome', label: 'Nome', type: 'text', required: true, unique: true },
    {
      name: 'mapeamento',
      label: 'Mapeamento (coluna da planilha → campo)',
      type: 'json',
      required: true,
    },
  ],
  timestamps: true,
}

// Log de auditoria (LGPD): quem fez o quê e quando. Gravado pelo sistema; ninguém altera.
// Nunca guarda dados pessoais — só ação, coleção, id do registro e nomes de campos.
export const Auditoria: CollectionConfig = {
  slug: 'crm-auditoria',
  labels: { singular: 'Registro de auditoria', plural: 'Auditoria' },
  access: { create: nunca, delete: nunca, read: isCrmAdmin, update: nunca },
  admin: {
    group: GRUPO_CRM,
    hidden: hideFromNonCrmAdmins,
    defaultColumns: ['createdAt', 'acao', 'colecao', 'documentoId', 'usuarioNome'],
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'acao',
      label: 'Ação',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Login', value: 'login' },
        { label: 'Criação', value: 'criacao' },
        { label: 'Alteração', value: 'alteracao' },
        { label: 'Exclusão', value: 'exclusao' },
        { label: 'Exportação', value: 'exportacao' },
        { label: 'Importação', value: 'importacao' },
        { label: 'Abertura da ficha', value: 'abertura_ficha' },
        { label: 'Solicitação de titular', value: 'solicitacao_titular' },
      ],
    },
    { name: 'colecao', label: 'Coleção', type: 'text', index: true },
    { name: 'documentoId', label: 'ID do registro', type: 'text', index: true },
    { name: 'campos', label: 'Campos alterados', type: 'json' },
    { name: 'usuario', label: 'Usuário', type: 'relationship', relationTo: 'users', index: true },
    { name: 'usuarioNome', label: 'Nome do usuário', type: 'text' },
  ],
  timestamps: true,
}

// Pedidos dos titulares (LGPD). Não guarda o dado excluído — só o registro do pedido.
export const SolicitacoesTitular: CollectionConfig = {
  slug: 'crm-solicitacoes-titular',
  labels: { singular: 'Solicitação de titular', plural: 'Solicitações de titulares' },
  access: soCrmAdmin,
  admin: {
    group: GRUPO_CRM,
    hidden: hideFromNonCrmAdmins,
    useAsTitle: 'protocolo',
    defaultColumns: ['protocolo', 'tipo', 'status', 'recebidaEm'],
  },
  defaultSort: '-recebidaEm',
  hooks: { beforeChange: [preencherRegistradoPor] },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'protocolo', label: 'Protocolo', type: 'text', required: true, unique: true, admin: { width: '30%' } },
        {
          name: 'tipo',
          label: 'Tipo',
          type: 'select',
          required: true,
          options: [
            { label: 'Exportação dos dados', value: 'exportacao' },
            { label: 'Exclusão definitiva', value: 'exclusao' },
            { label: 'Correção', value: 'correcao' },
            { label: 'Outro', value: 'outro' },
          ],
          admin: { width: '35%' },
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          defaultValue: 'aberta',
          options: [
            { label: 'Aberta', value: 'aberta' },
            { label: 'Concluída', value: 'concluida' },
            { label: 'Recusada', value: 'recusada' },
          ],
          admin: { width: '35%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'recebidaEm',
          label: 'Recebida em',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
          admin: { width: '33%' },
        },
        { name: 'canal', label: 'Canal do pedido', type: 'text', admin: { width: '33%' } },
        { name: 'concluidaEm', label: 'Concluída em', type: 'date', admin: { width: '34%' } },
      ],
    },
    {
      name: 'empresa',
      label: 'Empresa (enquanto existir)',
      type: 'relationship',
      relationTo: 'crm-empresas',
      admin: { description: 'Após a exclusão definitiva este vínculo fica vazio.' },
    },
    {
      name: 'observacao',
      label: 'Observação (sem dados pessoais)',
      type: 'textarea',
    },
    ...camposRegistradoPor(),
  ],
  timestamps: true,
}
