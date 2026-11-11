import type { CollectionConfig } from 'payload'

import { canAccessCrm, crmLeadAccess, hideFromNonCrm, isCrmAdmin } from '../../access/roles'
import { canaisAposApagarContato, canaisAposContato, exigirEmpresaDoUsuario, registrarNaoContatar } from './hooks'
import { GRUPO_CRM, campoTelefones, camposNaoContatar, camposOrigem } from './opcoes'

export const PAPEIS_CONTATO = [
  { label: 'Decisor', value: 'decisor' },
  { label: 'Influenciador', value: 'influenciador' },
  { label: 'Operacional', value: 'operacional' },
  { label: 'Indefinido', value: 'indefinido' },
]

// Pessoas de contato de cada empresa. Nascem dentro da ficha da empresa (aba "Pessoas de contato");
// depois de criada, a pessoa não muda de empresa.
export const Contatos: CollectionConfig = {
  slug: 'crm-contatos',
  labels: { singular: 'Pessoa de contato', plural: 'Pessoas de contato' },
  access: {
    create: canAccessCrm, // a empresa precisa ser do usuário: verificado no hook
    delete: isCrmAdmin,
    read: crmLeadAccess('empresa.'),
    update: crmLeadAccess('empresa.'),
  },
  admin: {
    group: GRUPO_CRM,
    hidden: hideFromNonCrm,
    useAsTitle: 'nome',
    description: 'As pessoas que atendem em cada empresa. Para incluir alguém, abra a empresa e use a aba “Pessoas de contato”.',
    defaultColumns: ['nome', 'empresa', 'papel', 'email'],
    listSearchableFields: ['nome', 'email'],
    components: { beforeList: ['@/components/admin/crm/AvisoNasceDaEmpresa'] },
  },
  hooks: {
    beforeChange: [exigirEmpresaDoUsuario, registrarNaoContatar],
    afterChange: [canaisAposContato],
    afterDelete: [canaisAposApagarContato],
  },
  fields: [
    {
      name: 'empresa',
      label: 'Empresa',
      type: 'relationship',
      relationTo: 'crm-empresas',
      required: true,
      index: true,
      // Definida só na criação: evita trocar a pessoa de empresa por um clique errado
      access: { update: () => false },
      admin: { description: 'Fixa depois de salvar. Pessoa na empresa errada: apague e cadastre na empresa certa.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'nome', label: 'Nome', type: 'text', admin: { width: '50%' } },
        { name: 'email', label: 'E-mail', type: 'email', admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'papel',
          label: 'Papel',
          type: 'select',
          defaultValue: 'indefinido',
          options: PAPEIS_CONTATO,
          admin: { width: '50%' },
        },
        {
          name: 'empresarioIndividual',
          label: 'Empresário individual',
          type: 'checkbox',
          defaultValue: false,
          admin: { width: '50%', description: 'Nome do contato igual à razão social.' },
        },
      ],
    },
    campoTelefones(),
    ...camposNaoContatar(),
    ...camposOrigem(),
  ],
  timestamps: true,
}
