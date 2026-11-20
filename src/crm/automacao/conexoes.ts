import Anthropic from '@anthropic-ai/sdk'
import nodemailer from 'nodemailer'

import type { ConfigAutomacao } from './config'

export type ResultadoTeste = { ok: boolean; mensagem: string }

const falta = (o: string): ResultadoTeste => ({ ok: false, mensagem: `Preencha e salve: ${o}.` })
const TEMPO = 12_000

// IA: consulta o modelo escolhido (confere a chave e se a conta tem acesso ao modelo, sem gastar tokens)
export async function testarIA(cfg: ConfigAutomacao): Promise<ResultadoTeste> {
  if (!cfg.iaToken) return falta('a chave da API')
  const modelo = cfg.iaModelo || 'claude-opus-5-5'
  const client = new Anthropic({ apiKey: cfg.iaToken, timeout: TEMPO, maxRetries: 0 })
  try {
    const info = await client.models.retrieve(modelo)
    return { ok: true, mensagem: `Conectado. Modelo disponível: ${info.display_name}.` }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, mensagem: 'Chave da API inválida ou revogada.' }
    if (e instanceof Anthropic.PermissionDeniedError) return { ok: false, mensagem: 'A chave não tem permissão para usar a API.' }
    if (e instanceof Anthropic.NotFoundError) return { ok: false, mensagem: `O modelo ${modelo} não está disponível nesta conta.` }
    if (e instanceof Anthropic.RateLimitError) return { ok: false, mensagem: 'Limite de uso da conta atingido. Tente de novo em instantes.' }
    if (e instanceof Anthropic.APIConnectionError) return { ok: false, mensagem: 'Sem conexão com a Anthropic.' }
    if (e instanceof Anthropic.APIError) return { ok: false, mensagem: `Erro da Anthropic (${e.status}).` }
    return { ok: false, mensagem: 'Erro inesperado ao testar a IA.' }
  }
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

// E-mail: abre a conexão SMTP e faz login (não envia nada)
export async function testarEmail(cfg: ConfigAutomacao): Promise<ResultadoTeste> {
  if (!cfg.smtpHost) return falta('o servidor SMTP')
  if (!cfg.smtpUsuario || !cfg.smtpSenha) return falta('o usuário e a senha do SMTP')
  if (!cfg.emailRemetente) return falta('o e-mail do remetente')
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
