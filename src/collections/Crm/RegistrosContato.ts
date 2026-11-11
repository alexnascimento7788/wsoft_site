import type { CollectionConfig } from 'payload'

import { canAccessCrm, crmLeadAccess, hideFromNonCrm, isCrmAdmin } from '../../access/roles'
import { aplicarEfeitosDoContato } from './efeitosContato'
import { exigirEmpresaDoUsuario, preencherRegistradoPor } from './hooks'
import { GRUPO_CRM, camposRegistradoPor } from './opcoes'
import { CANAIS_CONTATO, RESULTADOS_COM_CONVERSA, RESULTADOS_CONTATO } from './opcoesContato'

export { CANAIS_CONTATO, RESULTADOS_COM_CONVERSA, RESULTADOS_CONTATO }

// Cada tentativa de contato registrada pelo vendedor. Histórico: só crm_admin altera ou apaga.
export const RegistrosContato: CollectionConfig = {
  slug: 'crm-registros-contato',
  labels: { singular: 'Tentativa de contato', plural: 'Tentativas de contato' },
  access: {
    create: canAccessCrm, // a empresa precisa ser do usuário: verificado no hook
    delete: isCrmAdmin,
    read: crmLeadAccess('empresa.'),
    update: isCrmAdmin,
  },
  admin: {
    group: GRUPO_CRM,
    hidden: hideFromNonCrm,
    defaultColumns: ['dataHora', 'empresa', 'canal', 'resultado', 'registradoPorNome'],
    components: { beforeList: ['@/components/admin/crm/AvisoNasceDaEmpresa'] },
  },
  defaultSort: '-dataHora',
  hooks: {
    beforeChange: [
      exigirEmpresaDoUsuario,
      preencherRegistradoPor,
      ({ data }) => {
        if (data.resultado) data.houveConversa = RESULTADOS_COM_CONVERSA.includes(data.resultado)
        return data
      },
    ],
    afterChange: [aplicarEfeitosDoContato],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'empresa',
          label: 'Empresa',
          type: 'relationship',
          relationTo: 'crm-empresas',
          required: true,
          index: true,
          admin: { width: '50%' },
        },
        {
          name: 'contato',
          label: 'Pessoa contatada',
          type: 'relationship',
          relationTo: 'crm-contatos',
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'dataHora',
          label: 'Data e hora',
          type: 'date',
          required: true,
          index: true,
          defaultValue: () => new Date().toISOString(),
          admin: { width: '30%', date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'canal',
          label: 'Canal',
          type: 'select',
          required: true,
          defaultValue: 'ligacao',
          options: CANAIS_CONTATO,
          admin: { width: '30%' },
        },
        {
          name: 'telefoneUsado',
          label: 'Telefone usado',
          type: 'text',
          admin: { width: '40%' },
        },
      ],
    },
    {
      name: 'resultado',
      label: 'Resultado',
      type: 'select',
      required: true,
      index: true,
      options: RESULTADOS_CONTATO,
    },
    {
      name: 'observacao',
      label: 'Observação',
      type: 'textarea',
    },
    {
      type: 'row',
      fields: [
        { name: 'proximoPasso', label: 'Próximo passo', type: 'text', admin: { width: '60%' } },
        {
          name: 'proximoPassoData',
          label: 'Data do próximo passo',
          type: 'date',
          admin: { width: '40%', date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'houveConversa',
      label: 'Houve conversa',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', readOnly: true },
    },
    ...camposRegistradoPor(),
  ],
  timestamps: true,
}
