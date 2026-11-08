import type { CollectionConfig } from 'payload'

import { canAccessCrm, crmLeadAccess, hideFromNonCrm, isCrmAdmin } from '../../access/roles'
import { exigirEmpresaDoUsuario, preencherRegistradoPor } from './hooks'
import { GRUPO_CRM, MOTIVOS_DESCARTE, camposRegistradoPor } from './opcoes'

// Qualificação do lead (depois de pelo menos um contato com conversa — regra na Etapa 5)
export const Qualificacoes: CollectionConfig = {
  slug: 'crm-qualificacoes',
  labels: { singular: 'Qualificação', plural: 'Qualificações' },
  access: {
    create: canAccessCrm, // a empresa precisa ser do usuário: verificado no hook
    delete: isCrmAdmin,
    read: crmLeadAccess('empresa.'),
    update: isCrmAdmin,
  },
  admin: {
    group: GRUPO_CRM,
    hidden: hideFromNonCrm,
    defaultColumns: ['createdAt', 'empresa', 'resultado', 'interesse', 'registradoPorNome'],
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeChange: [exigirEmpresaDoUsuario, preencherRegistradoPor],
  },
  fields: [
    {
      name: 'empresa',
      label: 'Empresa',
      type: 'relationship',
      relationTo: 'crm-empresas',
      required: true,
      index: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'operaArmazenagem',
          label: 'Opera armazenagem de grãos?',
          type: 'select',
          options: [
            { label: 'Sim', value: 'sim' },
            { label: 'Não', value: 'nao' },
            { label: 'Não sei', value: 'nao_sei' },
          ],
          admin: { width: '50%' },
        },
        {
          name: 'interesse',
          label: 'Interesse em ver a apresentação',
          type: 'select',
          options: [
            { label: 'Alto', value: 'alto' },
            { label: 'Médio', value: 'medio' },
            { label: 'Baixo', value: 'baixo' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'graos',
      label: 'Grãos',
      type: 'text',
      admin: { description: 'Ex.: soja, milho, café' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'sistemaGestao',
          label: 'Usa sistema de gestão hoje?',
          type: 'select',
          options: [
            { label: 'Nenhum', value: 'nenhum' },
            { label: 'Planilha', value: 'planilha' },
            { label: 'Outro sistema', value: 'outro' },
          ],
          admin: { width: '50%' },
        },
        {
          name: 'sistemaNome',
          label: 'Qual sistema?',
          type: 'text',
          admin: { width: '50%', condition: (_, s) => s?.sistemaGestao === 'outro' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'resultado',
          label: 'Resultado',
          type: 'select',
          required: true,
          options: [
            { label: 'Qualificado', value: 'qualificado' },
            { label: 'Retornar depois', value: 'retornar_depois' },
            { label: 'Descartado', value: 'descartado' },
          ],
          admin: { width: '34%' },
        },
        {
          name: 'retornarEm',
          label: 'Retornar em',
          type: 'date',
          admin: {
            width: '33%',
            date: { pickerAppearance: 'dayAndTime' },
            condition: (_, s) => s?.resultado === 'retornar_depois',
          },
        },
        {
          name: 'motivoDescarte',
          label: 'Motivo do descarte',
          type: 'select',
          options: MOTIVOS_DESCARTE,
          admin: { width: '33%', condition: (_, s) => s?.resultado === 'descartado' },
        },
      ],
    },
    {
      name: 'observacao',
      label: 'Observação',
      type: 'textarea',
    },
    ...camposRegistradoPor(),
  ],
  timestamps: true,
}
