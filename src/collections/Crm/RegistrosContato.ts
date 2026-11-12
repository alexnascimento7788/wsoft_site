import { ValidationError, type CollectionConfig } from 'payload'

import { canAccessCrm, crmLeadAccess, hideFromNonCrm, isCrmAdmin } from '../../access/roles'
import { aplicarEfeitosDoContato } from './efeitosContato'
import { exigirEmpresaDoUsuario, preencherRegistradoPor } from './hooks'
import { GRUPO_CRM, camposRegistradoPor } from './opcoes'
import { CANAIS_CONTATO, RESULTADOS_CANAL_RUIM, RESULTADOS_COM_CONVERSA, RESULTADOS_CONTATO } from './opcoesContato'

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
    defaultColumns: ['dataHora', 'empresa', 'canal', 'telefoneUsado', 'resultado', 'registradoPor'],
    components: {
      beforeList: ['@/components/admin/crm/AvisoNasceDaEmpresa'],
      beforeListTable: ['@/components/admin/crm/LegendaTentativas'],
    },
  },
  defaultSort: '-dataHora',
  hooks: {
    beforeChange: [
      exigirEmpresaDoUsuario,
      preencherRegistradoPor,
      ({ data, operation }) => {
        // Canal com defeito: é preciso saber qual número / e-mail corrigir
        if (operation === 'create' && RESULTADOS_CANAL_RUIM.includes(data.resultado) && !String(data.telefoneUsado ?? '').trim()) {
          const qual = data.resultado === 'email_invalido' ? 'o e-mail' : 'o número'
          throw new ValidationError({ errors: [{ path: 'telefoneUsado', message: `Informe ${qual} usado para o sistema corrigir o cadastro.` }] })
        }
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
          admin: { width: '50%', components: { Cell: '@/components/admin/crm/celulas/EmpresaDaTentativaCell' } },
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
          admin: { width: '30%', date: { pickerAppearance: 'dayAndTime' }, components: { Cell: '@/components/admin/crm/celulas/QuandoCell' } },
        },
        {
          name: 'canal',
          label: 'Canal',
          type: 'select',
          required: true,
          defaultValue: 'ligacao',
          options: CANAIS_CONTATO,
          admin: { width: '30%', components: { Cell: '@/components/admin/crm/celulas/CanalCell' } },
        },
        {
          name: 'telefoneUsado',
          label: 'Telefone ou e-mail usado',
          type: 'text',
          admin: { width: '40%', components: { Cell: '@/components/admin/crm/celulas/UsadoCell' } },
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
      admin: { components: { Cell: '@/components/admin/crm/celulas/ResultadoCell' } },
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
