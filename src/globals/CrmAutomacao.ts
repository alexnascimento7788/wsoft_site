import type { Field, GlobalConfig, PayloadRequest, TextField } from 'payload'

import { hideFromNonCrmAdmins, isCrmAdmin } from '../access/roles'
import { testarAutomacao } from '../crm/automacao/endpoints'
import { PROMPT_PADRAO, PROVEDORES_IA } from '../crm/automacao/padroes'
import { campoSegredo } from '../crm/automacao/campoSegredo'

export const SLUG_AUTOMACAO = 'crm-automacao'

// Lê a Automação com os segredos ainda criptografados (para manter o valor quando volta a máscara)
const carregarAutomacao = async (req: PayloadRequest) =>
  (await req.payload.findGlobal({
    slug: SLUG_AUTOMACAO,
    depth: 0,
    overrideAccess: true,
    context: { segredos: true },
  })) as unknown as Record<string, unknown>

const segredo = (name: string, label: string, description?: string): TextField =>
  campoSegredo({ name, label, description, chave: SLUG_AUTOMACAO, carregar: carregarAutomacao })

const testar = (alvo: 'ia' | 'whatsapp'): Field => ({
  name: `testar_${alvo}`,
  type: 'ui',
  admin: {
    components: { Field: { path: '@/components/admin/crm/automacao/TestarConexao', clientProps: { alvo } } },
  },
})

const validarHora = (v: unknown) =>
  !v || (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)) || 'Use o formato HH:MM (ex.: 08:00).'

const validarUrl = (v: unknown) =>
  !v || (typeof v === 'string' && /^https?:\/\/[^\s]+$/i.test(v)) || 'Informe o endereço começando com http:// ou https://'

export const CrmAutomacao: GlobalConfig = {
  slug: SLUG_AUTOMACAO,
  label: 'Automação (IA e canais)',
  access: {
    read: isCrmAdmin,
    update: isCrmAdmin,
  },
  admin: {
    group: 'CRM',
    hidden: hideFromNonCrmAdmins,
    description:
      'Conexões do agente de prospecção: inteligência artificial, WhatsApp, catálogo e os limites do início controlado. O e-mail é de cada vendedor (Usuários → Minha caixa de e-mail). Salve antes de testar.',
  },
  endpoints: [testarAutomacao],
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Inteligência artificial',
          description: 'Usada pelo modo Agente IA. O modo Chatbot (fluxos) não usa IA.',
          fields: [
            {
              name: 'iaProvedor',
              label: 'Provedor de IA',
              type: 'radio',
              defaultValue: 'anthropic',
              options: PROVEDORES_IA.map(({ value, label }) => ({ value, label })),
              admin: { layout: 'horizontal' },
            },
            {
              type: 'row',
              fields: [
                segredo(
                  'iaToken',
                  'Chave da API',
                  'Do provedor escolhido acima (Claude: console.anthropic.com · ChatGPT: platform.openai.com · Gemini: aistudio.google.com · DeepSeek: platform.deepseek.com). Guardada criptografada.',
                ),
                {
                  name: 'iaModelo',
                  label: 'Modelo',
                  type: 'text',
                  defaultValue: 'claude-opus-5-5',
                  admin: {
                    width: '50%',
                    description:
                      'Nome exato do modelo, como aparece no painel do provedor. Exemplos: Claude: claude-opus-5-5, claude-sonnet-5-5, claude-haiku-5-5 · ChatGPT: gpt-5, gpt-5-mini · Gemini: gemini-2.5-flash · DeepSeek: deepseek-chat. O botão de teste confere se o modelo existe.',
                  },
                },
              ],
            },
            {
              name: 'iaTemperatura',
              label: 'Temperatura',
              type: 'number',
              defaultValue: 0.4,
              min: 0,
              max: 2,
              admin: {
                step: 0.1,
                condition: (data) => data?.iaProvedor !== 'anthropic',
                description: '0 = respostas mais previsíveis; 1 ou mais = mais criativas. Para prospecção, de 0,2 a 0,6.',
              },
            },
            {
              name: 'iaEsforco',
              label: 'Esforço (o Claude não usa temperatura)',
              type: 'select',
              defaultValue: 'low',
              options: [
                { value: 'low', label: 'Baixo: respostas rápidas e baratas (recomendado para conversa)' },
                { value: 'medium', label: 'Médio' },
                { value: 'high', label: 'Alto: pensa mais antes de responder (mais caro e lento)' },
              ],
              admin: {
                condition: (data) => !data?.iaProvedor || data?.iaProvedor === 'anthropic',
                description:
                  'Os modelos atuais do Claude não aceitam temperatura. O tom vem do prompt abaixo; o esforço controla o quanto ele pensa antes de responder.',
              },
            },
            {
              name: 'iaPrompt',
              label: 'Prompt (instruções do agente)',
              type: 'textarea',
              defaultValue: () => PROMPT_PADRAO, // função: o texto não vira DEFAULT no banco
              admin: { rows: 16, description: 'Quem é o agente, o que ele pode e o que não pode fazer. Os textos prontos do CRM continuam valendo para o 1º contato.' },
            },
            testar('ia'),
          ],
        },
        {
          label: 'WhatsApp',
          fields: [
            {
              name: 'waProvedor',
              label: 'Conexão do WhatsApp',
              type: 'radio',
              defaultValue: 'evolution',
              options: [
                { value: 'evolution', label: 'Evolution API (WhatsApp Web)' },
                { value: 'meta', label: 'API oficial da Meta (WhatsApp Business Platform)' },
              ],
              admin: { layout: 'horizontal' },
            },
            {
              type: 'collapsible',
              label: 'Evolution API',
              admin: { condition: (data) => data?.waProvedor !== 'meta' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'evoUrl',
                      label: 'Endereço do servidor',
                      type: 'text',
                      validate: validarUrl,
                      admin: { width: '50%', placeholder: 'https://evolution.suaempresa.com.br' },
                    },
                    {
                      name: 'evoInstancia',
                      label: 'Nome da instância',
                      type: 'text',
                      admin: { width: '50%', description: 'Como aparece no painel da Evolution.' },
                    },
                  ],
                },
                { type: 'row', fields: [segredo('evoApiKey', 'API Key', 'A apikey global ou a da instância (painel da Evolution). Guardada criptografada.')] },
              ],
            },
            {
              type: 'collapsible',
              label: 'API oficial da Meta',
              admin: { condition: (data) => data?.waProvedor === 'meta' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'metaPhoneNumberId', label: 'Phone number ID', type: 'text', admin: { width: '50%' } },
                    { name: 'metaWabaId', label: 'WhatsApp Business Account ID', type: 'text', admin: { width: '50%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    segredo('metaToken', 'Token de acesso (permanente)', 'Do usuário do sistema no Business Manager. Guardado criptografado.'),
                    segredo('metaAppSecret', 'App secret', 'Confere a assinatura das mensagens recebidas. Guardado criptografado.'),
                  ],
                },
              ],
            },
            testar('whatsapp'),
          ],
        },
        {
          label: 'Catálogo',
          description:
            'Material que o chatbot e o agente enviam quando o cliente pede (ou quando o fluxo chega nessa parte). O e-mail de cada vendedor fica no cadastro do próprio usuário.',
          fields: [
            {
              name: 'catalogo',
              label: 'Catálogo da Wsoft (PDF)',
              type: 'upload',
              relationTo: 'media',
              filterOptions: { mimeType: { equals: 'application/pdf' } },
              admin: { description: 'Envie o PDF aqui. Ele fica num endereço público, porque é mandado para os clientes.' },
            },
            {
              name: 'catalogoMensagem',
              label: 'Mensagem que acompanha o catálogo',
              type: 'textarea',
              defaultValue: () => 'Segue o catálogo do SiagWeb, o sistema da Wsoft para gestão de silos e armazéns. Se quiser, marcamos uma demonstração rápida.',
              admin: { rows: 3 },
            },
          ],
        },
        {
          label: 'Início controlado',
          description:
            'Para o número não ser bloqueado: poucos envios no começo, subindo aos poucos, com intervalos aleatórios e só em horário comercial.',
          fields: [
            {
              name: 'automacaoLiberada',
              label: 'Automação liberada (chave geral)',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description:
                  'Desligada: nenhum agente ou chatbot envia nada, mesmo com o interruptor do vendedor ligado. Use para parar tudo de uma vez.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'waLimiteInicial',
                  label: 'WhatsApp: envios no 1º dia',
                  type: 'number',
                  defaultValue: 15,
                  min: 1,
                  max: 500,
                  admin: { width: '33%' },
                },
                {
                  name: 'waAumentoDiario',
                  label: 'Aumento por dia de uso',
                  type: 'number',
                  defaultValue: 5,
                  min: 0,
                  max: 100,
                  admin: { width: '33%' },
                },
                {
                  name: 'waLimiteMaximo',
                  label: 'Teto por dia',
                  type: 'number',
                  defaultValue: 80,
                  min: 1,
                  max: 1000,
                  admin: { width: '33%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'emailLimiteDia',
                  label: 'E-mail: envios por dia (cada vendedor)',
                  type: 'number',
                  defaultValue: 40,
                  min: 1,
                  max: 1000,
                  admin: { width: '33%' },
                },
                {
                  name: 'intervaloMinSeg',
                  label: 'Intervalo mínimo entre envios (segundos)',
                  type: 'number',
                  defaultValue: 120,
                  min: 30,
                  admin: { width: '33%' },
                },
                {
                  name: 'intervaloMaxSeg',
                  label: 'Intervalo máximo (segundos)',
                  type: 'number',
                  defaultValue: 420,
                  min: 30,
                  admin: { width: '33%' },
                  validate: (v: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
                    v == null ||
                    Number(v) >= Number(siblingData?.intervaloMinSeg ?? 0) ||
                    'O máximo precisa ser maior ou igual ao mínimo.',
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'horaInicio', label: 'Envia a partir de', type: 'text', defaultValue: '08:30', validate: validarHora, admin: { width: '25%' } },
                { name: 'horaFim', label: 'Até', type: 'text', defaultValue: '17:30', validate: validarHora, admin: { width: '25%' } },
                {
                  name: 'diasSemana',
                  label: 'Dias da semana',
                  type: 'select',
                  hasMany: true,
                  defaultValue: ['seg', 'ter', 'qua', 'qui', 'sex'],
                  options: [
                    { value: 'seg', label: 'Segunda' },
                    { value: 'ter', label: 'Terça' },
                    { value: 'qua', label: 'Quarta' },
                    { value: 'qui', label: 'Quinta' },
                    { value: 'sex', label: 'Sexta' },
                    { value: 'sab', label: 'Sábado' },
                    { value: 'dom', label: 'Domingo' },
                  ],
                  admin: { width: '50%', description: 'Horário de Brasília.' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
