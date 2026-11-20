import type { Field, FieldHook, GlobalConfig, PayloadRequest, TextField } from 'payload'

import { hideFromNonCrmAdmins, isCrmAdmin } from '../access/roles'
import { testarAutomacao } from '../crm/automacao/endpoints'
import { MODELOS_IA, PROMPT_PADRAO } from '../crm/automacao/padroes'
import { criptografar, ehMascara, estaCriptografado, mascarar } from '../crm/automacao/segredos'

export const SLUG_AUTOMACAO = 'crm-automacao'

// Valores brutos (criptografados) já salvos — lidos uma vez por requisição, para manter
// o segredo quando a tela devolve a máscara no salvar
async function salvosBrutos(req: PayloadRequest): Promise<Record<string, unknown>> {
  const ctx = req.context as { __automacaoBruta?: Record<string, unknown> }
  if (!ctx.__automacaoBruta) {
    ctx.__automacaoBruta = (await req.payload.findGlobal({
      slug: SLUG_AUTOMACAO,
      depth: 0,
      overrideAccess: true,
      context: { segredos: true },
    })) as unknown as Record<string, unknown>
  }
  return ctx.__automacaoBruta
}

const guardarSegredo =
  (name: string): FieldHook =>
  async ({ value, req }) => {
    // Não mexeu (voltou a máscara) ou não veio: mantém o que está salvo
    if (value === undefined || ehMascara(value)) {
      const atual = (await salvosBrutos(req))[name]
      return estaCriptografado(atual) ? atual : null
    }
    if (value === null || (typeof value === 'string' && value.trim() === '')) return null
    if (estaCriptografado(value)) return value
    return criptografar(String(value).trim())
  }

// Na tela o segredo aparece mascarado; só o código do servidor (context.segredos) lê o valor
const mostrarSegredo: FieldHook = ({ value, context }) => {
  if ((context as { segredos?: boolean })?.segredos) return value
  return typeof value === 'string' && value ? mascarar(value) : value
}

const segredo = (name: string, label: string, description?: string, width = '50%'): TextField => ({
  name,
  label,
  type: 'text',
  admin: {
    width,
    description: description ?? 'Guardado criptografado. Para trocar, apague e cole o novo; para remover, deixe vazio.',
    autoComplete: 'off',
  },
  hooks: { beforeChange: [guardarSegredo(name)], afterRead: [mostrarSegredo] },
})

const testar = (alvo: 'ia' | 'whatsapp' | 'email'): Field => ({
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
      'Conexões do agente de prospecção: inteligência artificial, WhatsApp e e-mail, e os limites do início controlado. Salve antes de testar.',
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
              type: 'row',
              fields: [
                segredo('iaToken', 'Chave da API (Anthropic / Claude)', 'Crie em console.anthropic.com → API Keys. Guardada criptografada.'),
                {
                  name: 'iaModelo',
                  label: 'Modelo',
                  type: 'select',
                  defaultValue: MODELOS_IA[0].value,
                  options: MODELOS_IA.map(({ value, label }) => ({ value, label })),
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'iaEsforco',
              label: 'Esforço (no lugar da temperatura)',
              type: 'select',
              defaultValue: 'low',
              options: [
                { value: 'low', label: 'Baixo: respostas rápidas e baratas (recomendado para conversa)' },
                { value: 'medium', label: 'Médio' },
                { value: 'high', label: 'Alto: pensa mais antes de responder (mais caro e lento)' },
              ],
              admin: {
                description:
                  'Os modelos atuais do Claude não aceitam mais “temperatura”. O tom e a criatividade são controlados pelo prompt abaixo; o esforço controla o quanto ele pensa antes de responder.',
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
          label: 'E-mail',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'emailRemetenteNome', label: 'Nome do remetente', type: 'text', admin: { width: '50%', placeholder: 'Fulano — Wsoft' } },
                { name: 'emailRemetente', label: 'E-mail do remetente', type: 'email', admin: { width: '50%' } },
              ],
            },
            {
              type: 'collapsible',
              label: 'Envio (SMTP)',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'smtpHost', label: 'Servidor', type: 'text', admin: { width: '40%', placeholder: 'smtp.seuprovedor.com.br' } },
                    { name: 'smtpPorta', label: 'Porta', type: 'number', defaultValue: 587, admin: { width: '20%' } },
                    {
                      name: 'smtpSeguro',
                      label: 'SSL direto (porta 465)',
                      type: 'checkbox',
                      admin: { width: '40%', description: 'Deixe desmarcado para a porta 587 (STARTTLS).' },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'smtpUsuario', label: 'Usuário', type: 'text', admin: { width: '50%' } },
                    segredo('smtpSenha', 'Senha', 'Se o provedor pedir, use uma “senha de app”. Guardada criptografada.'),
                  ],
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Recebimento das respostas (IMAP)',
              admin: { description: 'Usado na Etapa 3 para trazer as respostas para o histórico. Usa o mesmo usuário e senha do SMTP.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'imapHost', label: 'Servidor', type: 'text', admin: { width: '60%', placeholder: 'imap.seuprovedor.com.br' } },
                    { name: 'imapPorta', label: 'Porta', type: 'number', defaultValue: 993, admin: { width: '40%' } },
                  ],
                },
              ],
            },
            testar('email'),
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
                  label: 'E-mail: envios por dia',
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
