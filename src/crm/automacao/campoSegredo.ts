import type { FieldAccess, FieldHook, PayloadRequest, TextField } from 'payload'

import { criptografar, ehMascara, estaCriptografado, mascarar } from './segredos'

// Lê o documento com os segredos ainda criptografados (sem a máscara da tela)
export type CarregarBruto = (req: PayloadRequest, id?: number | string) => Promise<Record<string, unknown> | null>

async function brutoEmCache(req: PayloadRequest, chave: string, id: number | string | undefined, carregar: CarregarBruto) {
  const ctx = req.context as Record<string, unknown>
  const k = `__bruto_${chave}_${id ?? ''}`
  if (!(k in ctx)) ctx[k] = await carregar(req, id)
  return ctx[k] as Record<string, unknown> | null
}

const guardar =
  (name: string, chave: string, carregar: CarregarBruto): FieldHook =>
  async ({ value, req, originalDoc }) => {
    // Não mexeu (voltou a máscara) ou não veio: mantém o que está salvo
    if (value === undefined || ehMascara(value)) {
      const id = (originalDoc as { id?: number | string } | undefined)?.id
      const atual = (await brutoEmCache(req, chave, id, carregar))?.[name]
      return estaCriptografado(atual) ? atual : null
    }
    if (value === null || (typeof value === 'string' && value.trim() === '')) return null
    if (estaCriptografado(value)) return value
    return criptografar(String(value).trim())
  }

// Na tela o segredo aparece mascarado; só o código do servidor (context.segredos) lê o valor
const mostrar: FieldHook = ({ value, context }) => {
  if ((context as { segredos?: boolean })?.segredos) return value
  return typeof value === 'string' && value ? mascarar(value) : value
}

export const campoSegredo = (opcoes: {
  name: string
  label: string
  chave: string
  carregar: CarregarBruto
  description?: string
  width?: string
  access?: { read?: FieldAccess; update?: FieldAccess }
}): TextField => ({
  name: opcoes.name,
  label: opcoes.label,
  type: 'text',
  access: opcoes.access,
  admin: {
    width: opcoes.width ?? '50%',
    description:
      opcoes.description ?? 'Guardado criptografado. Para trocar, apague e cole o novo; para remover, deixe vazio.',
    autoComplete: 'off',
  },
  hooks: { beforeChange: [guardar(opcoes.name, opcoes.chave, opcoes.carregar)], afterRead: [mostrar] },
})
