import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Tokens e senhas da Automação ficam no banco criptografados (AES-256-GCM).
// A chave vem da variável de ambiente CRM_CHAVE_SEGREDOS — a MESMA em todos os ambientes
// (local, homologação e produção), porque o banco é um só.

const PREFIXO = 'enc1:'
// Valor mostrado na tela no lugar do segredo; se voltar igual no salvar, o segredo é mantido
export const MASCARA = '••••••••'

const chave = () => {
  const bruta = process.env.CRM_CHAVE_SEGREDOS
  if (!bruta || bruta.length < 16) {
    throw new Error('CRM_CHAVE_SEGREDOS não configurada (mínimo 16 caracteres).')
  }
  return createHash('sha256').update(bruta).digest()
}

export const estaCriptografado = (v: unknown): v is string => typeof v === 'string' && v.startsWith(PREFIXO)

export function criptografar(texto: string): string {
  const iv = randomBytes(12)
  const cifra = createCipheriv('aes-256-gcm', chave(), iv)
  const dados = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()])
  const tag = cifra.getAuthTag()
  return PREFIXO + [iv, tag, dados].map((b) => b.toString('base64')).join('.')
}

export function descriptografar(valor: string): string {
  if (!estaCriptografado(valor)) return valor
  const [iv, tag, dados] = valor.slice(PREFIXO.length).split('.').map((p) => Buffer.from(p, 'base64'))
  const decifra = createDecipheriv('aes-256-gcm', chave(), iv)
  decifra.setAuthTag(tag)
  return Buffer.concat([decifra.update(dados), decifra.final()]).toString('utf8')
}

// O que a tela mostra: máscara + 4 últimos caracteres (ajuda a reconhecer qual token está salvo)
export function mascarar(valor: string): string {
  try {
    const aberto = descriptografar(valor)
    return MASCARA + (aberto.length > 8 ? aberto.slice(-4) : '')
  } catch {
    return MASCARA + ' (chave de criptografia diferente — salve o token de novo)'
  }
}

export const ehMascara = (v: unknown) => typeof v === 'string' && v.startsWith(MASCARA)
