import type { GlobalConfig } from 'payload'

import { canAccessCrm, hideFromNonCrmAdmins, isCrmAdmin } from '../access/roles'
import { BASES_LEGAIS } from '../collections/Crm/opcoes'

// Regra inicial de prioridade (editável aqui; nunca fixa no código do motor de importação)
const CNAES_ALTA = [
  ['5211701', 'Armazéns gerais'],
  ['5211799', 'Depósitos de mercadorias para terceiros'],
  ['0163600', 'Atividades de pós-colheita'],
  ['4622200', 'Comércio atacadista de soja'],
  ['4621400', 'Comércio atacadista de café em grão'],
  ['4623199', 'Comércio atacadista de matérias-primas agrícolas'],
  ['4623108', 'Comércio atacadista de matérias-primas agrícolas'],
  ['4632001', 'Comércio atacadista de cereais e leguminosas beneficiados'],
  ['4632003', 'Comércio atacadista de cereais e leguminosas beneficiados'],
  ['1061901', 'Beneficiamento de arroz'],
  ['1081301', 'Beneficiamento de café'],
  ['1041400', 'Fabricação de óleos vegetais em bruto'],
].map(([codigo, descricao]) => ({ codigo, descricao }))

const CNAES_MEDIA_PRIMARIO = [
  ['4611700', 'Representantes comerciais de matérias-primas agrícolas'],
  ['5212500', 'Carga e descarga'],
].map(([codigo, descricao]) => ({ codigo, descricao }))

const listaCnae = (name: string, label: string, description: string, defaultValue: object[]) => ({
  name,
  label,
  type: 'array' as const,
  labels: { singular: 'CNAE', plural: 'CNAEs' },
  defaultValue,
  admin: { description, initCollapsed: true },
  fields: [
    {
      type: 'row' as const,
      fields: [
        {
          name: 'codigo',
          label: 'Código (7 dígitos)',
          type: 'text' as const,
          required: true,
          admin: { width: '30%' },
        },
        { name: 'descricao', label: 'Descrição', type: 'text' as const, admin: { width: '70%' } },
      ],
    },
  ],
})

export const AVISO_PRIVACIDADE_PADRAO = `A Wsoft Informática trata dados de contato profissional de empresas do agronegócio (nome, telefone e e-mail de sócios e contatos), obtidos de fornecedor de dados cadastrais, com base no legítimo interesse (art. 7º, IX, da LGPD), exclusivamente para apresentar soluções de gestão para silos e armazéns. Os dados são acessados apenas pela equipe comercial responsável e não são compartilhados com terceiros. O titular pode, a qualquer momento, pedir para não ser mais contatado, solicitar acesso, correção ou exclusão dos seus dados pelo canal de atendimento informado abaixo.`

export const CrmConfiguracao: GlobalConfig = {
  slug: 'crm-configuracao',
  label: 'Configuração do CRM',
  access: {
    read: canAccessCrm,
    update: isCrmAdmin,
  },
  admin: {
    group: 'CRM',
    hidden: hideFromNonCrmAdmins,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Prioridade da fila',
          description:
            'A prioridade só ordena a fila e os filtros. Nunca exclui o lead e pode ser corrigida em cada empresa.',
          fields: [
            listaCnae(
              'cnaesAlta',
              'Alta — CNAEs (primário)',
              'CNAE primário nesta lista = Alta. Se algum CNAE secundário estiver aqui = Média.',
              CNAES_ALTA,
            ),
            {
              name: 'termosAlta',
              label: 'Alta — termos na razão social',
              type: 'array',
              labels: { singular: 'Termo', plural: 'Termos' },
              defaultValue: [{ termo: 'COOPERATIV' }],
              admin: { initCollapsed: true },
              fields: [{ name: 'termo', label: 'Termo', type: 'text', required: true }],
            },
            listaCnae(
              'cnaesMediaPrimario',
              'Média — CNAEs (primário)',
              'CNAE primário nesta lista = Média (quando não for Alta).',
              CNAES_MEDIA_PRIMARIO,
            ),
          ],
        },
        {
          label: 'Regras',
          fields: [
            {
              name: 'tentativasParaDescarte',
              label: 'Tentativas para descarte por motivo objetivo',
              type: 'number',
              required: true,
              defaultValue: 3,
              min: 1,
              max: 20,
              admin: {
                description:
                  'Sem nenhuma conversa, o lead só pode ser descartado (empresa inativa, número inexistente, sem canal) depois deste número de tentativas registradas.',
              },
            },
          ],
        },
        {
          label: 'LGPD',
          fields: [
            {
              name: 'baseLegalPadrao',
              label: 'Base legal padrão',
              type: 'select',
              defaultValue: 'legitimo_interesse',
              options: BASES_LEGAIS,
            },
            {
              type: 'row',
              fields: [
                { name: 'encarregadoNome', label: 'Encarregado (DPO)', type: 'text', admin: { width: '50%' } },
                {
                  name: 'canalTitular',
                  label: 'Canal de atendimento ao titular',
                  type: 'text',
                  admin: { width: '50%', description: 'Ex.: e-mail privacidade@wsoftinfo.com.br' },
                },
              ],
            },
            {
              name: 'avisoPrivacidade',
              label: 'Aviso de privacidade (texto-base para revisão do encarregado)',
              type: 'textarea',
              defaultValue: AVISO_PRIVACIDADE_PADRAO,
            },
          ],
        },
      ],
    },
  ],
}
