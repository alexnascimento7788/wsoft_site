import type { CollectionConfig } from 'payload'

import { canAccessCrm, crmLeadAccess, hideFromNonCrm, isCrmAdmin } from '../../access/roles'
import { aplicarEfeitosDoDesfecho } from './efeitosContato'
import { exigirEmpresaDoUsuario, preencherRegistradoPor } from './hooks'
import { GRUPO_CRM, camposRegistradoPor } from './opcoes'

export const MOTIVOS_PERDA = [
  { label: 'Preço', value: 'preco' },
  { label: 'Já tem sistema', value: 'ja_tem_sistema' },
  { label: 'Sem interesse', value: 'sem_interesse' },
  { label: 'Adiou a decisão', value: 'adiou_decisao' },
  { label: 'Sem retorno', value: 'sem_retorno' },
  { label: 'Outro', value: 'outro' },
]

// Desfecho da venda, registrado pelo apresentador (ou admin)
export const Desfechos: CollectionConfig = {
  slug: 'crm-desfechos',
  labels: { singular: 'Desfecho da venda', plural: 'Desfechos da venda' },
  access: {
    create: canAccessCrm, // a empresa precisa ser do usuário: verificado no hook
    delete: isCrmAdmin,
    read: crmLeadAccess('empresa.'),
    update: isCrmAdmin,
  },
  admin: {
    group: GRUPO_CRM,
    hidden: hideFromNonCrm,
    defaultColumns: ['data', 'empresa', 'resultado', 'valor', 'registradoPorNome'],
    components: { beforeList: ['@/components/admin/crm/AvisoNasceDaEmpresa'] },
  },
  defaultSort: '-data',
  hooks: {
    beforeChange: [exigirEmpresaDoUsuario, preencherRegistradoPor],
    afterChange: [aplicarEfeitosDoDesfecho],
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
          name: 'resultado',
          label: 'Resultado',
          type: 'select',
          required: true,
          options: [
            { label: 'Venda realizada', value: 'venda_realizada' },
            { label: 'Venda não realizada', value: 'venda_nao_realizada' },
          ],
          admin: { width: '40%' },
        },
        {
          name: 'data',
          label: 'Data',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
          admin: { width: '30%' },
        },
        {
          name: 'valor',
          label: 'Valor (R$, opcional)',
          type: 'number',
          min: 0,
          admin: { width: '30%', step: 0.01, condition: (_, s) => s?.resultado === 'venda_realizada' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'fechadoPor',
          label: 'Quem fechou',
          type: 'relationship',
          relationTo: 'users',
          admin: { width: '50%', condition: (_, s) => s?.resultado === 'venda_realizada' },
        },
        {
          name: 'motivo',
          label: 'Motivo',
          type: 'select',
          options: MOTIVOS_PERDA,
          admin: { width: '50%', condition: (_, s) => s?.resultado === 'venda_nao_realizada' },
          validate: (value: unknown, { siblingData }: { siblingData: { resultado?: string } }) =>
            siblingData?.resultado === 'venda_nao_realizada' && !value
              ? 'Informe o motivo da venda não realizada.'
              : true,
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
