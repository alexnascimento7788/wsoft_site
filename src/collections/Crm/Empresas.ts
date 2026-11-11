import type { CollectionConfig, Field } from 'payload'

import { canCreateLead, canCreateLeadField, crmLeadAccess, hideFromNonCrm, isCrmAdmin, isCrmAdminField } from '../../access/roles'
import { registrarMudancaDeStatus } from './efeitosContato'
import { atualizarCanaisEmpresa, calcularPrioridade, prepararEmpresaManual, registrarNaoContatar } from './hooks'
import {
  BASES_LEGAIS,
  CANAIS_EMPRESA,
  GRUPO_CRM,
  MOTIVOS_DESCARTE,
  PRIORIDADES,
  STATUS_LEAD,
  campoTelefones,
  camposNaoContatar,
  camposOrigem,
} from './opcoes'

const soCrmAdmin = { create: isCrmAdminField, update: isCrmAdminField }
// Dados cadastrais: quem cadastra o lead (vendedor incluído) preenche; depois só o crm_admin altera
const cadastro = { create: canCreateLeadField, update: isCrmAdminField }

// Campos que vão para uma aba (fora da barra lateral)
const naAba = (fields: Field[]): Field[] =>
  fields.map((f) => ('admin' in f && f.admin ? ({ ...f, admin: { ...f.admin, position: undefined } } as Field) : f))

// Listas que nascem da empresa (aparecem dentro da ficha, nas abas)
const lista = (name: string, label: string, collection: string, defaultColumns: string[], allowCreate = false): Field => ({
  name,
  label,
  type: 'join',
  collection: collection as never,
  on: 'empresa',
  defaultLimit: 10,
  admin: { allowCreate, defaultColumns },
})

export const Empresas: CollectionConfig = {
  slug: 'crm-empresas',
  labels: { singular: 'Empresa', plural: 'Empresas' },
  access: {
    create: canCreateLead, // vendedor cadastra o lead que chegou até ele (fica como responsável)
    delete: isCrmAdmin,
    read: crmLeadAccess(),
    update: crmLeadAccess(),
  },
  admin: {
    group: GRUPO_CRM,
    hidden: hideFromNonCrm,
    useAsTitle: 'razaoSocial',
    description: 'O centro do CRM: cada empresa reúne as pessoas de contato, as tentativas, a qualificação e o desfecho.',
    defaultColumns: ['razaoSocial', 'canais', 'status', 'vendedor', 'retornarEm', 'meuDia'],
    listSearchableFields: ['razaoSocial', 'nomeFantasia', 'cnpj', 'cidade'],
    components: { beforeListTable: ['@/components/admin/crm/LegendaEmpresas'] },
  },
  defaultSort: 'ordemImportacao',
  hooks: {
    beforeChange: [prepararEmpresaManual, calcularPrioridade, registrarNaoContatar, atualizarCanaisEmpresa],
    afterChange: [registrarMudancaDeStatus],
  },
  fields: [
    {
      // Topo da ficha: canais, mensagem pronta, ações (tentativa, qualificação, desfecho, Meu dia) e histórico
      name: 'painelContato',
      type: 'ui',
      admin: { components: { Field: '@/components/admin/crm/PainelContato' }, disableListColumn: true },
    },
    {
      // Coluna "Meu dia" na lista: botão para colocar a empresa no dia do vendedor
      name: 'meuDia',
      label: 'Meu dia',
      type: 'ui',
      admin: { components: { Cell: '@/components/admin/crm/celulas/MeuDiaCell' } },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Pessoas de contato',
          description: 'Quem atende nesta empresa. Para incluir uma pessoa, use “Adicionar” abaixo: ela já nasce ligada à empresa.',
          fields: [lista('pessoas', 'Pessoas', 'crm-contatos', ['nome', 'papel', 'email', 'naoContatar'], true)],
        },
        {
          label: 'Cadastro',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'razaoSocial',
                  label: 'Razão social',
                  type: 'text',
                  required: true,
                  access: cadastro,
                  admin: { width: '60%', components: { Cell: '@/components/admin/crm/celulas/EmpresaCell' } },
                },
                { name: 'nomeFantasia', label: 'Nome fantasia', type: 'text', admin: { width: '40%' } },
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
                  access: cadastro,
                  admin: { width: '30%', description: '14 dígitos; pode colar com pontos e barra.' },
                },
                { name: 'situacaoCadastral', label: 'Situação cadastral', type: 'text', access: cadastro, admin: { width: '35%' } },
                {
                  name: 'faixaFundacao',
                  label: 'Tempo de existência',
                  type: 'text',
                  access: cadastro,
                  admin: { width: '35%', description: 'Faixa informada pela fonte.' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'cidade', label: 'Cidade', type: 'text', index: true, admin: { width: '40%' } },
                { name: 'uf', label: 'UF', type: 'text', index: true, maxLength: 2, admin: { width: '15%' } },
                { name: 'cep', label: 'CEP', type: 'text', admin: { width: '20%', description: '8 dígitos' } },
                { name: 'bairro', label: 'Bairro', type: 'text', admin: { width: '25%' } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'logradouro', label: 'Logradouro', type: 'text', admin: { width: '55%' } },
                { name: 'numero', label: 'Número', type: 'text', admin: { width: '15%' } },
                { name: 'complemento', label: 'Complemento', type: 'text', admin: { width: '30%' } },
              ],
            },
            { ...campoTelefones(), label: 'Telefones da empresa', admin: { initCollapsed: true } } as Field,
            {
              name: 'cnaes',
              label: 'Ramos de atividade (CNAEs)',
              type: 'array',
              labels: { singular: 'CNAE', plural: 'CNAEs' },
              access: cadastro,
              admin: { initCollapsed: true },
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
            { name: 'observacoes', label: 'Observações', type: 'textarea' },
          ],
        },
        {
          label: 'Histórico',
          description: 'Tudo nasce do painel acima. Aqui você consulta e, se precisar, abre um registro para corrigir.',
          fields: [
            lista('tentativas', 'Tentativas de contato', 'crm-registros-contato', ['dataHora', 'canal', 'resultado', 'registradoPorNome']),
            lista('qualificacoesDaEmpresa', 'Qualificações', 'crm-qualificacoes', ['createdAt', 'resultado', 'interesse', 'registradoPorNome']),
            lista('desfechosDaEmpresa', 'Desfechos da venda', 'crm-desfechos', ['data', 'resultado', 'valor', 'registradoPorNome']),
            lista('historicoStatus', 'Mudanças de status', 'crm-movimentacoes', ['createdAt', 'de', 'para', 'motivo', 'usuarioNome']),
            {
              ...lista('solicitacoesTitular', 'Pedidos do titular (LGPD)', 'crm-solicitacoes-titular', ['protocolo', 'tipo', 'status', 'recebidaEm']),
              access: { read: isCrmAdminField },
            } as Field,
          ],
        },
        {
          label: 'Dados técnicos',
          description: 'Informações de origem, LGPD e da regra de prioridade. Normalmente não precisa mexer aqui.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'raizCnpj',
                  label: 'Raiz do CNPJ (grupo)',
                  type: 'text',
                  index: true,
                  access: soCrmAdmin,
                  admin: { width: '34%', readOnly: true, description: '8 primeiros dígitos.' },
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
                  admin: { width: '33%' },
                },
                {
                  name: 'ordemImportacao',
                  label: 'Ordem de importação',
                  type: 'number',
                  index: true,
                  access: soCrmAdmin,
                  admin: { width: '33%', readOnly: true },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'prioridade',
                  label: 'Prioridade no sorteio',
                  type: 'select',
                  index: true,
                  options: PRIORIDADES,
                  admin: {
                    width: '34%',
                    readOnly: true,
                    description: 'Ordem do sorteio do Meu dia (Alta primeiro). Vem do ramo de atividade (CNAE).',
                  },
                },
                {
                  name: 'prioridadeCalculada',
                  label: 'Calculada pelo CNAE',
                  type: 'select',
                  options: PRIORIDADES,
                  access: soCrmAdmin,
                  admin: { width: '33%', readOnly: true },
                },
                {
                  name: 'prioridadeManual',
                  label: 'Corrigida à mão',
                  type: 'select',
                  options: PRIORIDADES,
                  access: soCrmAdmin,
                  admin: { width: '33%', description: 'Em branco = usa a calculada.' },
                },
              ],
            },
            {
              name: 'canais',
              label: 'Canais de contato disponíveis',
              type: 'select',
              hasMany: true,
              options: CANAIS_EMPRESA,
              access: { create: () => false, update: () => false }, // calculado pelo sistema
              admin: {
                readOnly: true,
                description: 'Calculado sozinho a partir dos telefones e e-mails da empresa e das pessoas.',
                components: { Cell: '@/components/admin/crm/celulas/CanaisCell' },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'semCanalContato',
                  label: 'Sem canal de contato',
                  type: 'checkbox',
                  defaultValue: false,
                  index: true,
                  access: soCrmAdmin,
                  admin: { width: '50%', description: 'Sem telefone e sem e-mail: fora do sorteio.' },
                },
                {
                  name: 'baseLegal',
                  label: 'Base legal (LGPD)',
                  type: 'select',
                  defaultValue: 'legitimo_interesse',
                  options: BASES_LEGAIS,
                  access: soCrmAdmin,
                  admin: { width: '50%' },
                },
              ],
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
            },
            ...naAba(camposOrigem()),
          ],
        },
      ],
    },

    // ——— Barra lateral: só o que move o lead ———
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'na_fila',
      index: true,
      options: STATUS_LEAD,
      access: soCrmAdmin,
      admin: { position: 'sidebar', components: { Cell: '@/components/admin/crm/celulas/StatusCell' } },
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
      name: 'vendedor',
      label: 'Vendedor',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: soCrmAdmin,
      admin: { position: 'sidebar', components: { Cell: '@/components/admin/crm/celulas/PessoaCell' } },
    },
    {
      name: 'retornarEm',
      label: 'Retornar em',
      type: 'date',
      index: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yy HH:mm' } },
    },
    {
      name: 'apresentador',
      label: 'Apresentador',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: soCrmAdmin,
      admin: { position: 'sidebar', components: { Cell: '@/components/admin/crm/celulas/PessoaCell' } },
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
  ],
  timestamps: true,
}
