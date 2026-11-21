import type { Payload } from 'payload'

import { descriptografar, estaCriptografado } from './segredos'

const CAMPOS_SEGREDO = ['iaToken', 'evoApiKey', 'metaToken', 'metaAppSecret'] as const

export type ConfigAutomacao = {
  iaProvedor?: 'anthropic' | 'openai' | 'gemini' | 'deepseek' | null
  iaToken?: string | null
  iaTemperatura?: number | null
  iaModelo?: string | null
  iaEsforco?: 'low' | 'medium' | 'high' | null
  iaPrompt?: string | null
  waProvedor?: 'evolution' | 'meta' | null
  evoUrl?: string | null
  evoInstancia?: string | null
  evoApiKey?: string | null
  metaPhoneNumberId?: string | null
  metaWabaId?: string | null
  metaToken?: string | null
  metaAppSecret?: string | null
  catalogo?: number | { id: number; url?: string | null; filename?: string | null } | null
  catalogoMensagem?: string | null
  automacaoLiberada?: boolean | null
  waLimiteInicial?: number | null
  waAumentoDiario?: number | null
  waLimiteMaximo?: number | null
  emailLimiteDia?: number | null
  intervaloMinSeg?: number | null
  intervaloMaxSeg?: number | null
  horaInicio?: string | null
  horaFim?: string | null
  diasSemana?: string[] | null
}

// Configuração com os segredos já abertos — SÓ para uso no servidor (nunca devolver ao navegador)
export async function lerAutomacao(payload: Payload): Promise<ConfigAutomacao> {
  const bruto = (await payload.findGlobal({
    slug: 'crm-automacao',
    depth: 0,
    overrideAccess: true,
    context: { segredos: true },
  })) as unknown as ConfigAutomacao & Record<string, unknown>
  const cfg: ConfigAutomacao & Record<string, unknown> = { ...bruto }
  for (const campo of CAMPOS_SEGREDO) {
    const v = bruto[campo]
    cfg[campo] = estaCriptografado(v) ? descriptografar(v) : null
  }
  return cfg
}

// Caixa de e-mail de um vendedor (cadastro do usuário)
export type CaixaEmail = {
  email?: string | null
  emailRemetenteNome?: string | null
  emailRemetente?: string | null
  smtpHost?: string | null
  smtpPorta?: number | null
  smtpSeguro?: boolean | null
  smtpUsuario?: string | null
  smtpSenha?: string | null
  imapHost?: string | null
  imapPorta?: number | null
}

// Caixa do vendedor com a senha aberta — SÓ para uso no servidor
export async function lerCaixaEmail(payload: Payload, usuarioId: number | string): Promise<CaixaEmail | null> {
  const u = (await payload.findByID({
    collection: 'users',
    id: usuarioId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    context: { segredos: true },
  })) as unknown as CaixaEmail | null
  if (!u) return null
  return { ...u, smtpSenha: estaCriptografado(u.smtpSenha) ? descriptografar(u.smtpSenha) : null }
}
