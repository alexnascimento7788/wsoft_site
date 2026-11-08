import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'

type Telefone = { id?: string | null; numero: string; tipo?: string | null; valido?: boolean | null }

const idDe = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number | null | undefined))
const nomeDe = (req: PayloadRequest) =>
  (req.user as { name?: string | null } | null)?.name || req.user?.email || 'sistema'

// Status em que o lead ainda não teve contato: o primeiro registro o leva para "Em contato"
const ANTES_DO_CONTATO = ['na_fila', 'retornar_depois']

// Grava uma movimentação de status no histórico (quem e quando)
export async function registrarMovimentacao(
  req: PayloadRequest,
  empresa: number,
  de: string | null | undefined,
  para: string,
  motivo?: string,
) {
  await req.payload.create({
    collection: 'crm-movimentacoes',
    data: { empresa, de: (de ?? undefined) as never, para: para as never, motivo, usuario: req.user?.id, usuarioNome: nomeDe(req) },
    req,
    overrideAccess: true, // histórico é gravado pelo sistema
  })
}

const invalidar = (telefones: Telefone[] | null | undefined, numero: string) => {
  let mudou = false
  const lista = (telefones ?? []).map((t) => {
    if (t.numero === numero && t.valido !== false) {
      mudou = true
      return { ...t, valido: false }
    }
    return t
  })
  return mudou ? lista : null
}

// Depois de registrar uma tentativa de contato:
// - o lead sai da fila para "Em contato";
// - "Número inválido ou errado" marca aquele telefone como inválido (sai da fila de ligação);
// - "Pediu para não ser contatado" aplica "Não contatar" (na pessoa, ou na empresa se não houver pessoa);
// - o próximo passo com data vira o "retornar em" do lead.
// Quem registrou já teve o acesso à empresa conferido; as alterações abaixo são do sistema.
export const aplicarEfeitosDoContato: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc
  const empresaId = idDe(doc.empresa)
  if (!empresaId) return doc
  const { payload } = req
  const empresa = await payload.findByID({ collection: 'crm-empresas', id: empresaId, depth: 0, req, overrideAccess: true })
  const contatoId = idDe(doc.contato)
  const numero = String(doc.telefoneUsado ?? '').replace(/\D/g, '')

  const dados: Record<string, unknown> = {}
  if (ANTES_DO_CONTATO.includes(empresa.status)) dados.status = 'em_contato'
  if (doc.proximoPassoData) dados.retornarEm = doc.proximoPassoData

  if (doc.resultado === 'numero_invalido' && numero) {
    const telefones = invalidar(empresa.telefones as Telefone[], numero)
    if (telefones) dados.telefones = telefones
    const { docs: contatos } = await payload.find({
      collection: 'crm-contatos',
      where: { empresa: { equals: empresaId } },
      depth: 0,
      pagination: false,
      req,
      overrideAccess: true,
    })
    for (const c of contatos) {
      const lista = invalidar(c.telefones as Telefone[], numero)
      if (lista) {
        await payload.update({ collection: 'crm-contatos', id: c.id, data: { telefones: lista as never }, req, overrideAccess: true })
      }
    }
  }

  if (doc.resultado === 'nao_contatar') {
    if (contatoId) {
      await payload.update({ collection: 'crm-contatos', id: contatoId, data: { naoContatar: true }, req, overrideAccess: true })
    } else dados.naoContatar = true
  }

  if (Object.keys(dados).length) {
    await payload.update({ collection: 'crm-empresas', id: empresaId, data: dados as never, req, overrideAccess: true })
    if (dados.status) await registrarMovimentacao(req, empresaId, empresa.status, dados.status as string, 'Primeiro contato registrado')
  }
  return doc
}
