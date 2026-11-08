// Normalização dos campos das listas de leads. Funções puras, sem dados pessoais em mensagens.

export const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '')

// Texto de célula: trim, espaços repetidos, vazio → null
export const texto = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const t = String(v).replace(/\s+/g, ' ').trim()
  return t ? t : null
}

// Para comparar nomes: sem acento, maiúsculas, só letras/números
export const chave = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()

// CNPJ: só dígitos, completa zeros à esquerda (o Excel guarda como número), valida os dígitos verificadores
export function normalizarCnpj(v: unknown): { cnpj: string | null; erro?: 'cnpj_ausente' | 'cnpj_invalido' } {
  let d = soDigitos(typeof v === 'number' ? Math.round(v).toString() : v)
  if (!d) return { cnpj: null, erro: 'cnpj_ausente' }
  if (d.length > 14) return { cnpj: null, erro: 'cnpj_invalido' }
  d = d.padStart(14, '0')
  return cnpjValido(d) ? { cnpj: d } : { cnpj: null, erro: 'cnpj_invalido' }
}

const dvCnpj = (base: string) => {
  const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const soma = [...base].reduce((s, c, i) => s + Number(c) * pesos[i], 0)
  const r = soma % 11
  return r < 2 ? 0 : 11 - r
}

// 12 primeiros dígitos → CNPJ completo com os dígitos verificadores (usado em dados fictícios de teste)
export function cnpjComDv(base12: string) {
  const d1 = dvCnpj(base12)
  return `${base12}${d1}${dvCnpj(base12 + d1)}`
}

export function cnpjValido(d: string) {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false
  return cnpjComDv(d.slice(0, 12)) === d
}

// CEP: texto de 8 dígitos (o Excel perde o zero à esquerda)
export const normalizarCep = (v: unknown): string | null => {
  const d = soDigitos(typeof v === 'number' ? Math.round(v).toString() : v)
  if (!d || d.length > 8) return null
  return d.padStart(8, '0')
}

// DDDs válidos no Brasil
const DDDS = new Set(
  '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(
    ' ',
  ),
)

export type Telefone = { numero: string; tipo: 'fixo' | 'celular' | null; valido: boolean }

// DDD + número separados → "DDDNÚMERO" (10 ou 11 dígitos). 8 dígitos = fixo; 9 = celular.
export function normalizarTelefone(ddd: unknown, numero: unknown): Telefone | null {
  let n = soDigitos(numero)
  let d = soDigitos(ddd).replace(/^0+/, '')
  if (!n) return null
  if (!d && (n.length === 10 || n.length === 11)) {
    d = n.slice(0, 2)
    n = n.slice(2)
  }
  if (DDDS.has(d)) {
    if (n.length === 8 && /^[2-5]/.test(n)) return { numero: d + n, tipo: 'fixo', valido: true }
    if (n.length === 9 && n.startsWith('9')) return { numero: d + n, tipo: 'celular', valido: true }
  }
  // Fora do padrão: guarda como veio, marcado inválido (fica fora da fila de ligação)
  return { numero: d + n, tipo: null, valido: false }
}

// CNAE "1234567 - DESCRIÇÃO" → código (7 dígitos) + descrição
export function normalizarCnae(v: unknown): { codigo: string; descricao: string | null } | null {
  const t = texto(v)
  if (!t) return null
  const m = t.match(/^([\d./-]+)\s*-?\s*(.*)$/)
  const codigo = soDigitos(m ? m[1] : t)
  if (!codigo || codigo.length > 7) return null
  return { codigo: codigo.padStart(7, '0'), descricao: texto(m?.[2]) }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const normalizarEmail = (v: unknown): string | null => {
  const t = texto(v)?.toLowerCase()
  return t && EMAIL.test(t) ? t : null
}

export const normalizarUf = (v: unknown): string | null => {
  const t = chave(v)
  return /^[A-Z]{2}$/.test(t) ? t : null
}
