import type { CollectionConfig } from 'payload'

import { hideFromNonCrmAdmins, isCrmAdmin } from '../../access/roles'
import { preencherRegistradoPor } from './hooks'
import { GRUPO_CRM, ORIGENS, camposRegistradoPor } from './opcoes'

const contador = (name: string, label: string) => ({
  name,
  label,
  type: 'number' as const,
  defaultValue: 0,
  admin: { readOnly: true, width: '16%' },
})

// Cada carga de lista (planilha) vira um lote: origem, quem importou e o resultado
export const LotesImportacao: CollectionConfig = {
  slug: 'crm-lotes-importacao',
  labels: { singular: 'Lote de importação', plural: 'Lotes de importação' },
  access: {
    create: isCrmAdmin,
    delete: isCrmAdmin,
    read: isCrmAdmin,
    update: isCrmAdmin,
  },
  admin: {
    group: GRUPO_CRM,
    hidden: hideFromNonCrmAdmins,
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'origem', 'status', 'criados', 'erros', 'createdAt'],
    components: { beforeList: ['@/components/admin/crm/AvisoNasceDaEmpresa'] },
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeChange: [preencherRegistradoPor],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'nome', label: 'Nome do lote', type: 'text', required: true, admin: { width: '50%' } },
        { name: 'origem', label: 'Origem', type: 'select', required: true, options: ORIGENS, admin: { width: '25%' } },
        { name: 'fornecedorDado', label: 'Fornecedor do dado', type: 'text', admin: { width: '25%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'arquivoNome', label: 'Arquivo', type: 'text', admin: { width: '50%', readOnly: true } },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          defaultValue: 'rascunho',
          options: [
            { label: 'Rascunho', value: 'rascunho' },
            { label: 'Processando', value: 'processando' },
            { label: 'Concluído', value: 'concluido' },
            { label: 'Concluído com erros', value: 'concluido_com_erros' },
            { label: 'Falhou', value: 'falhou' },
          ],
          admin: { width: '25%', readOnly: true },
        },
        {
          name: 'modoDuplicados',
          label: 'Duplicados',
          type: 'select',
          defaultValue: 'ignorar',
          options: [
            { label: 'Ignorar', value: 'ignorar' },
            { label: 'Atualizar só campos vazios', value: 'completar' },
          ],
          admin: { width: '25%' },
        },
      ],
    },
    {
      name: 'origemLicitaConfirmada',
      label: 'Confirmo que o arquivo tem origem lícita (LGPD)',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      type: 'row',
      fields: [
        contador('linhas', 'Linhas'),
        contador('criados', 'Criados'),
        contador('atualizados', 'Atualizados'),
        contador('duplicados', 'Duplicados'),
        contador('alertas', 'Com alerta'),
        contador('erros', 'Erros'),
      ],
    },
    {
      name: 'relatorioErros',
      label: 'Linhas com erro',
      type: 'json',
      admin: { readOnly: true, description: 'Usado para baixar as linhas com erro.' },
    },
    ...camposRegistradoPor(),
  ],
  timestamps: true,
}
