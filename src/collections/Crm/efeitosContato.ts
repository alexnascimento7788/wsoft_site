import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'

import { diaDe } from '../../crm/meuDia'
import { marcarFeitoNoDia } from './meuDiaEndpoints'

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
    await payload.update({
      collection: 'crm-empresas',
      id: empresaId,
      data: dados as never,
      req,
      overrideAccess: true,
      context: { motivoMovimentacao: 'Primeiro contato registrado' },
    })
  }

  // Meu dia: a empresa conta como feita no dia de quem registrou
  const quem = idDe(doc.registradoPor)
  if (quem) await marcarFeitoNoDia(req, quem, empresaId, diaDe(doc.dataHora ?? new Date()))
  return doc
}

// Qualificação registrada na ficha → status do lead acompanha o resultado
export const aplicarEfeitosDaQualificacao: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc
  const empresaId = idDe(doc.empresa)
  if (!empresaId) return doc
  const dados: Record<string, unknown> = { status: doc.resultado }
  if (doc.resultado === 'retornar_depois' && doc.retornarEm) dados.retornarEm = doc.retornarEm
  if (doc.resultado === 'descartado' && doc.motivoDescarte) dados.motivoDescarte = doc.motivoDescarte
  await req.payload.update({
    collection: 'crm-empresas',
    id: empresaId,
    data: dados as never,
    req,
    overrideAccess: true,
    context: { motivoMovimentacao: 'Qualificação registrada' },
  })
  return doc
}

// Desfecho da venda registrado na ficha → status "Venda realizada" / "Venda não realizada"
export const aplicarEfeitosDoDesfecho: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc
  const empresaId = idDe(doc.empresa)
  if (!empresaId) return doc
  await req.payload.update({
    collection: 'crm-empresas',
    id: empresaId,
    data: { status: doc.resultado } as never,
    req,
    overrideAccess: true,
    context: { motivoMovimentacao: 'Desfecho da venda registrado' },
  })
  return doc
}

// Toda mudança de status da empresa (na ficha ou pelo sistema) vai para o Histórico de status
export const registrarMudancaDeStatus: CollectionAfterChangeHook = async ({ context, doc, operation, previousDoc, req }) => {
  if (operation !== 'update' || !previousDoc || previousDoc.status === doc.status) return doc
  const motivo = typeof context?.motivoMovimentacao === 'string' ? context.motivoMovimentacao : 'Alterado na ficha da empresa'
  await registrarMovimentacao(req, doc.id, previousDoc.status, doc.status, motivo)
  return doc
}
