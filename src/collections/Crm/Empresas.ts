import type { CollectionConfig } from 'payload'

import { crmLeadAccess, hideFromNonCrm, isCrmAdmin, isCrmAdminField } from '../../access/roles'
import { calcularPrioridade, registrarNaoContatar } from './hooks'
import {
  BASES_LEGAIS,
  GRUPO_CRM,
  MOTIVOS_DESCARTE,
  PRIORIDADES,
  STATUS_LEAD,
  campoTelefones,
  camposNaoContatar,
  camposOrigem,
} from './opcoes'

const soCrmAdmin = { create: isCrmAdminField, update: isCrmAdminField }

export const Empresas: CollectionConfig = {
  slug: 'crm-empresas',
  labels: { singular: 'Empresa', plural: 'Empresas' },
  access: {
    create: isCrmAdmin,
    delete: isCrmAdmin,
    read: crmLeadAccess(),
    update: crmLeadAccess(),
  },
  admin: {
    group: GRUPO_CRM,
    hidden: hideFromNonCrm,
    useAsTitle: 'razaoSocial',
    defaultColumns: ['razaoSocial', 'cidade', 'uf', 'prioridade', 'status', 'vendedor'],
    listSearchableFields: ['razaoSocial', 'nomeFantasia', 'cnpj', 'cidade'],
  },
  defaultSort: 'ordemImportacao',
  hooks: {
    beforeChange: [calcularPrioridade, registrarNaoContatar],
  },
  fields: [
    {
      // Canais de contato (ligar, WhatsApp, e-mail), registro de tentativa e histórico
      name: 'painelContato',
      type: 'ui',
      admin: { components: { Field: '@/components/admin/crm/PainelContato' } },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'razaoSocial',
          label: 'Razão social',
          type: 'text',
          required: true,
          access: soCrmAdmin,
          admin: { width: '60%' },
        },
        {
          name: 'nomeFantasia',
          label: 'Nome fantasia',
          type: 'text',
          admin: { width: '40%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'cnpj',
          label: 'CNPJ',
          type: 'text',
          required: true,
          unique: true,
          access: soCrmAdmin,
          admin: { width: '25%', description: '14 dígitos, só números.' },
        },
        {
          name: 'raizCnpj',
          label: 'Raiz do CNPJ (grupo)',
          type: 'text',
          index: true,
          access: soCrmAdmin,
          admin: { width: '20%', readOnly: true, description: '8 primeiros dígitos.' },
        },
        {
          name: 'tipo',
          label: 'Matriz / filial',
          type: 'select',
          index: true,
          options: [
            { label: 'Matriz', value: 'matriz' },
            { label: 'Filial', value: 'filial' },
          ],
          access: soCrmAdmin,
          admin: { width: '15%' },
        },
        {
          name: 'situacaoCadastral',
          label: 'Situação cadastral',
          type: 'text',
          access: soCrmAdmin,
          admin: { width: '20%' },
        },
        {
          name: 'faixaFundacao',
          label: 'Tempo de existência',
          type: 'text',
          access: soCrmAdmin,
          admin: { width: '20%', description: 'Faixa informada pela fonte.' },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Endereço',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'logradouro', label: 'Logradouro', type: 'text', admin: { width: '50%' } },
            { name: 'numero', label: 'Número', type: 'text', admin: { width: '15%' } },
            { name: 'complemento', label: 'Complemento', type: 'text', admin: { width: '35%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'bairro', label: 'Bairro', type: 'text', admin: { width: '30%' } },
            { name: 'cidade', label: 'Cidade', type: 'text', index: true, admin: { width: '35%' } },
            { name: 'uf', label: 'UF', type: 'text', index: true, maxLength: 2, admin: { width: '10%' } },
            { name: 'cep', label: 'CEP', type: 'text', admin: { width: '25%', description: '8 dígitos' } },
          ],
        },
      ],
    },
    campoTelefones(),
    {
      name: 'cnaes',
      label: 'CNAEs',
      type: 'array',
      labels: { singular: 'CNAE', plural: 'CNAEs' },
      access: soCrmAdmin,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'codigo', label: 'Código', type: 'text', required: true, index: true, admin: { width: '20%' } },
            { name: 'descricao', label: 'Descrição', type: 'text', admin: { width: '60%' } },
            { name: 'principal', label: 'Primário', type: 'checkbox', defaultValue: false, admin: { width: '20%' } },
          ],
        },
      ],
    },
    {
      name: 'observacoes',
      label: 'Observações',
      type: 'textarea',
    },

    // ——— Barra lateral: fluxo do lead ———
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'na_fila',
      index: true,
      options: STATUS_LEAD,
      access: soCrmAdmin,
      admin: { position: 'sidebar' },
    },
    {
      name: 'retornarEm',
      label: 'Retornar em',
      type: 'date',
      index: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'motivoDescarte',
      label: 'Motivo do descarte',
      type: 'select',
      options: MOTIVOS_DESCARTE,
      access: soCrmAdmin,
      admin: { position: 'sidebar', condition: (data) => data?.status === 'descartado' },
    },
    {
      name: 'prioridade',
      label: 'Prioridade de contato',
      type: 'select',
      index: true,
      options: PRIORIDADES,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Só ordena a fila. Não é a classificação do lead.',
      },
    },
    {
      name: 'prioridadeCalculada',
      label: 'Prioridade calculada (CNAE)',
      type: 'select',
      options: PRIORIDADES,
      access: soCrmAdmin,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'prioridadeManual',
      label: 'Prioridade corrigida',
      type: 'select',
      options: PRIORIDADES,
      access: soCrmAdmin,
      admin: { position: 'sidebar', description: 'Em branco = usa a calculada.' },
    },
    {
      name: 'vendedor',
      label: 'Vendedor',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: soCrmAdmin,
      admin: { position: 'sidebar' },
    },
    {
      name: 'apresentador',
      label: 'Apresentador',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: soCrmAdmin,
      admin: { position: 'sidebar' },
    },
    {
      name: 'apresentacaoData',
      label: 'Data da apresentação',
      type: 'date',
      index: true,
      access: soCrmAdmin,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    ...camposNaoContatar(),
    {
      name: 'semCanalContato',
      label: 'Sem canal de contato',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      access: soCrmAdmin,
      admin: { position: 'sidebar', description: 'Sem telefone e sem e-mail: fora da fila de ligação.' },
    },
    {
      name: 'alertas',
      label: 'Alertas de revisão',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Situação cadastral não ativa', value: 'situacao_nao_ativa' },
        { label: 'Em liquidação', value: 'em_liquidacao' },
        { label: 'Recuperação judicial', value: 'recuperacao_judicial' },
      ],
      access: soCrmAdmin,
      admin: { position: 'sidebar' },
    },
    {
      name: 'ordemImportacao',
      label: 'Ordem de importação',
      type: 'number',
      index: true,
      access: soCrmAdmin,
      admin: { position: 'sidebar', readOnly: true },
    },
    ...camposOrigem(),
    {
      name: 'baseLegal',
      label: 'Base legal (LGPD)',
      type: 'select',
      defaultValue: 'legitimo_interesse',
      options: BASES_LEGAIS,
      access: soCrmAdmin,
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
