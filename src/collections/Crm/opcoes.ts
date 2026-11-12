import type { Field } from 'payload'

import { isCrmAdminField } from '../../access/roles'

type Opcao = { label: string; value: string }

export const GRUPO_CRM = 'CRM'

export const STATUS_LEAD: Opcao[] = [
  { label: 'Na fila', value: 'na_fila' },
  { label: 'Em contato', value: 'em_contato' },
  { label: 'Qualificado', value: 'qualificado' },
  { label: 'Apresentação agendada', value: 'apresentacao_agendada' },
  { label: 'Apresentação feita', value: 'apresentacao_feita' },
  { label: 'Venda realizada', value: 'venda_realizada' },
  { label: 'Venda não realizada', value: 'venda_nao_realizada' },
  { label: 'Retornar depois', value: 'retornar_depois' },
  { label: 'Descartado', value: 'descartado' },
]

// Canais que a empresa tem (calculados): ícones na lista
export const CANAIS_EMPRESA: Opcao[] = [
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Telefone', value: 'telefone' },
  { label: 'E-mail', value: 'email' },
]

export const PRIORIDADES: Opcao[] = [
  { label: 'Alta', value: 'alta' },
  { label: 'Média', value: 'media' },
  { label: 'Baixa', value: 'baixa' },
]

export const ORIGENS: Opcao[] = [
  { label: 'Boa Vista', value: 'boa_vista' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'Indicação', value: 'indicacao' },
  { label: 'Base Wsoft', value: 'base_wsoft' },
  { label: 'Site', value: 'site' },
  { label: 'Outra', value: 'outra' },
]

export const BASES_LEGAIS: Opcao[] = [
  { label: 'Legítimo interesse', value: 'legitimo_interesse' },
  { label: 'Consentimento', value: 'consentimento' },
  { label: 'Outra', value: 'outra' },
]

export const MOTIVOS_DESCARTE: Opcao[] = [
  { label: 'Sem perfil', value: 'sem_perfil' },
  { label: 'Sem interesse', value: 'sem_interesse' },
  { label: 'Empresa inativa', value: 'empresa_inativa' },
  { label: 'Sem canal de contato', value: 'sem_canal' },
  { label: 'Outro', value: 'outro' },
]

export const TIPOS_TELEFONE: Opcao[] = [
  { label: 'Fixo', value: 'fixo' },
  { label: 'Celular', value: 'celular' },
]

// Telefones (da empresa ou do contato). Ficam numa tabela própria, ligada ao dono.
export const campoTelefones = (): Field => ({
  name: 'telefones',
  label: 'Telefones',
  type: 'array',
  labels: { singular: 'Telefone', plural: 'Telefones' },
  admin: { initCollapsed: false },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'numero',
          label: 'Número (DDD + número)',
          type: 'text',
          required: true,
          admin: { width: '40%', description: 'Só dígitos. Ex.: 35912345678' },
        },
        {
          name: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: TIPOS_TELEFONE,
          admin: { width: '20%' },
        },
        {
          name: 'valido',
          label: 'Válido',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            width: '20%',
            description: 'Desmarcado = número inválido/errado; sai da fila de ligação.',
          },
        },
        {
          name: 'semWhatsapp',
          label: 'Não tem WhatsApp',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            width: '20%',
            description: 'Marcado = celular sem WhatsApp; continua para ligação, sai do WhatsApp.',
          },
        },
      ],
    },
  ],
})

// "Não contatar" (empresa ou contato): quem aplicou e quando ficam registrados
export const camposNaoContatar = (): Field[] => [
  {
    name: 'naoContatar',
    label: 'Não contatar',
    type: 'checkbox',
    defaultValue: false,
    index: true,
    admin: {
      position: 'sidebar',
      description: 'Bloqueia o contato e retira das filas e listas de trabalho.',
    },
  },
  {
    name: 'naoContatarEm',
    label: 'Não contatar — desde',
    type: 'date',
    admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
  },
  {
    name: 'naoContatarPor',
    label: 'Não contatar — aplicado por',
    type: 'relationship',
    relationTo: 'users',
    admin: { position: 'sidebar', readOnly: true },
  },
]

// Origem do dado (LGPD): fornecedor, lote e data de importação
export const camposOrigem = (): Field[] => [
  {
    name: 'origem',
    label: 'Origem',
    type: 'select',
    options: ORIGENS,
    index: true,
    access: { update: isCrmAdminField },
    admin: { position: 'sidebar' },
  },
  {
    name: 'fornecedorDado',
    label: 'Fornecedor do dado',
    type: 'text',
    access: { update: isCrmAdminField },
    admin: { position: 'sidebar', description: 'Ex.: Boa Vista' },
  },
  {
    name: 'lote',
    label: 'Lote de importação',
    type: 'relationship',
    relationTo: 'crm-lotes-importacao',
    index: true,
    access: { create: isCrmAdminField, update: isCrmAdminField },
    admin: { position: 'sidebar' },
  },
  {
    name: 'dataImportacao',
    label: 'Data de importação',
    type: 'date',
    access: { create: isCrmAdminField, update: isCrmAdminField },
    admin: { position: 'sidebar', readOnly: true },
  },
]

// Quem registrou (relação + nome gravado, para o histórico manter o nome mesmo se a pessoa sair)
export const camposRegistradoPor = (): Field[] => [
  {
    name: 'registradoPor',
    label: 'Registrado por',
    type: 'relationship',
    relationTo: 'users',
    admin: { position: 'sidebar', readOnly: true, components: { Cell: '@/components/admin/crm/celulas/PessoaCell' } },
  },
  {
    name: 'registradoPorNome',
    label: 'Nome de quem registrou',
    type: 'text',
    admin: { position: 'sidebar', readOnly: true },
  },
]
