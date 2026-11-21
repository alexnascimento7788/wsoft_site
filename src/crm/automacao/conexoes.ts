import Anthropic from '@anthropic-ai/sdk'
import nodemailer from 'nodemailer'

import type { CaixaEmail, ConfigAutomacao } from './config'

export type ResultadoTeste = { ok: boolean; mensagem: string }

const falta = (o: string): ResultadoTeste => ({ ok: false, mensagem: `Preencha e salve: ${o}.` })
const TEMPO = 12_000

// IA: consulta o modelo escolhido no provedor (confere a chave e se o modelo existe, sem gastar tokens)
export async function testarIA(cfg: ConfigAutomacao): Promise<ResultadoTeste> {
  if (!cfg.iaToken) return falta('a chave da API')
  if (!cfg.iaModelo) return falta('o modelo')
  switch (cfg.iaProvedor ?? 'anthropic') {
    case 'openai':
      return testarCompativelOpenAI('OpenAI', 'https://api.openai.com/v1', cfg.iaToken, cfg.iaModelo)
    case 'deepseek':
      return testarCompativelOpenAI('DeepSeek', 'https://api.deepseek.com', cfg.iaToken, cfg.iaModelo)
    case 'gemini':
      return testarGemini(cfg.iaToken, cfg.iaModelo)
    default:
      return testarClaude(cfg.iaToken, cfg.iaModelo)
  }
}

async function testarClaude(apiKey: string, modelo: string): Promise<ResultadoTeste> {
  const client = new Anthropic({ apiKey, timeout: TEMPO, maxRetries: 0 })
  try {
    const info = await client.models.retrieve(modelo)
    return { ok: true, mensagem: `Conectado ao Claude. Modelo disponível: ${info.display_name}.` }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, mensagem: 'Chave da API inválida ou revogada.' }
    if (e instanceof Anthropic.PermissionDeniedError) return { ok: false, mensagem: 'A chave não tem permissão para usar a API.' }
    if (e instanceof Anthropic.NotFoundError) return { ok: false, mensagem: `O modelo ${modelo} não existe ou não está disponível nesta conta.` }
    if (e instanceof Anthropic.RateLimitError) return { ok: false, mensagem: 'Limite de uso da conta atingido. Tente de novo em instantes.' }
    if (e instanceof Anthropic.APIConnectionError) return { ok: false, mensagem: 'Sem conexão com a Anthropic.' }
    if (e instanceof Anthropic.APIError) return { ok: false, mensagem: `Erro da Anthropic (${e.status}).` }
    return { ok: false, mensagem: 'Erro inesperado ao testar a IA.' }
  }
}

const erroHttp = (nome: string, status: number, modelo: string): ResultadoTeste => {
  if (status === 401 || status === 403) return { ok: false, mensagem: `Chave da API recusada pelo ${nome}.` }
  if (status === 404) return { ok: false, mensagem: `O modelo ${modelo} não existe no ${nome}.` }
  if (status === 402) return { ok: false, mensagem: `Conta do ${nome} sem saldo.` }
  if (status === 429) return { ok: false, mensagem: `Limite de uso do ${nome} atingido. Tente de novo em instantes.` }
  return { ok: false, mensagem: `Erro do ${nome} (${status}).` }
}

// OpenAI e DeepSeek usam o mesmo formato: GET /models
async function testarCompativelOpenAI(nome: string, base: string, chave: string, modelo: string): Promise<ResultadoTeste> {
  let r: Response
  try {
    r = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${chave}` },
      signal: AbortSignal.timeout(TEMPO),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, mensagem: `Sem conexão com o ${nome}.` }
  }
  if (!r.ok) return erroHttp(nome, r.status, modelo)
  const dados = (await r.json().catch(() => ({}))) as { data?: { id?: string }[] }
  const ids = (dados.data ?? []).map((m) => m.id)
  if (!ids.includes(modelo)) {
    const exemplos = ids.filter((id): id is string => Boolean(id)).slice(0, 6).join(', ')
    return { ok: false, mensagem: `Chave ok, mas o modelo ${modelo} não está disponível. Disponíveis: ${exemplos}…` }
  }
  return { ok: true, mensagem: `Conectado ao ${nome}. Modelo disponível: ${modelo}.` }
}

async function testarGemini(chave: string, modelo: string): Promise<ResultadoTeste> {
  const nomeModelo = modelo.replace(/^models\//, '')
  let r: Response
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(nomeModelo)}`, {
      headers: { 'x-goog-api-key': chave },
      signal: AbortSignal.timeout(TEMPO),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, mensagem: 'Sem conexão com o Gemini.' }
  }
  // O Google responde 400 para chave inválida
  if (r.status === 400) return { ok: false, mensagem: 'Chave da API recusada pelo Gemini.' }
  if (!r.ok) return erroHttp('Gemini', r.status, nomeModelo)
  const dados = (await r.json().catch(() => ({}))) as { displayName?: string }
  return { ok: true, mensagem: `Conectado ao Gemini. Modelo disponível: ${dados.displayName ?? nomeModelo}.` }
}

async function evolution(cfg: ConfigAutomacao): Promise<ResultadoTeste> {
  if (!cfg.evoUrl) return falta('o endereço do servidor Evolution')
  if (!cfg.evoInstancia) return falta('o nome da instância')
  if (!cfg.evoApiKey) return falta('a API Key da Evolution')
  const base = cfg.evoUrl.replace(/\/+$/, '')
  let r: Response
  try {
    r = await fetch(`${base}/instance/connectionState/${encodeURIComponent(cfg.evoInstancia)}`, {
      headers: { apikey: cfg.evoApiKey },
      signal: AbortSignal.timeout(TEMPO),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, mensagem: 'Não consegui chegar ao servidor da Evolution. Confira o endereço.' }
  }
  if (r.status === 401 || r.status === 403) return { ok: false, mensagem: 'API Key recusada pela Evolution.' }
  if (r.status === 404) return { ok: false, mensagem: `Instância "${cfg.evoInstancia}" não encontrada.` }
  if (!r.ok) return { ok: false, mensagem: `A Evolution respondeu com erro (${r.status}).` }
  const dados = (await r.json().catch(() => ({}))) as { instance?: { state?: string }; state?: string }
  const estado = dados.instance?.state ?? dados.state
  if (estado === 'open') return { ok: true, mensagem: 'Conectado. O WhatsApp da instância está aberto.' }
  return {
    ok: false,
    mensagem: `A instância existe, mas o WhatsApp está "${estado ?? 'desconhecido'}". Leia o QR Code no painel da Evolution.`,
  }
}

async function meta(cfg: ConfigAutomacao): Promise<ResultadoTeste> {
  if (!cfg.metaPhoneNumberId) return falta('o Phone number ID')
  if (!cfg.metaToken) return falta('o token de acesso da Meta')
  let r: Response
  try {
    r = await fetch(
      `https://graph.facebook.com/v22.0/${encodeURIComponent(cfg.metaPhoneNumberId)}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${cfg.metaToken}` }, signal: AbortSignal.timeout(TEMPO), cache: 'no-store' },
    )
  } catch {
    return { ok: false, mensagem: 'Sem conexão com a Meta.' }
  }
  const dados = (await r.json().catch(() => ({}))) as {
    display_phone_number?: string
    verified_name?: string
    error?: { message?: string }
  }
  if (!r.ok) return { ok: false, mensagem: `A Meta recusou: ${dados.error?.message ?? r.status}.` }
  return { ok: true, mensagem: `Conectado: ${dados.display_phone_number ?? ''} (${dados.verified_name ?? 'sem nome verificado'}).` }
}

export const testarWhatsApp = (cfg: ConfigAutomacao) => (cfg.waProvedor === 'meta' ? meta(cfg) : evolution(cfg))

// E-mail do vendedor: abre a conexão SMTP e faz login (não envia nada)
export async function testarEmail(cfg: CaixaEmail): Promise<ResultadoTeste> {
  if (!cfg.smtpHost) return falta('o servidor SMTP')
  if (!cfg.smtpUsuario || !cfg.smtpSenha) return falta('o usuário e a senha do SMTP')
  const transporte = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPorta ?? 587,
    secure: Boolean(cfg.smtpSeguro),
    auth: { user: cfg.smtpUsuario, pass: cfg.smtpSenha },
    connectionTimeout: TEMPO,
    greetingTimeout: TEMPO,
    socketTimeout: TEMPO,
  })
  try {
    await transporte.verify()
    return { ok: true, mensagem: 'Conectado. O servidor SMTP aceitou usuário e senha.' }
  } catch (e) {
    const codigo = (e as { code?: string; responseCode?: number }).code
    if (codigo === 'EAUTH') return { ok: false, mensagem: 'Usuário ou senha recusados pelo servidor SMTP.' }
    if (codigo === 'ETIMEDOUT' || codigo === 'ECONNECTION' || codigo === 'ESOCKET')
      return { ok: false, mensagem: 'Não consegui conectar ao servidor SMTP. Confira servidor, porta e a opção SSL.' }
    return { ok: false, mensagem: `Falha no SMTP${codigo ? ` (${codigo})` : ''}.` }
  } finally {
    transporte.close()
  }
}
