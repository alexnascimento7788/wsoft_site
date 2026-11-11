import { addDataAndFileToRequest, type Endpoint, type PayloadRequest, type Where } from 'payload'

import { canAccessCrmUser, getRoles, isCrmAdminUser } from '../../access/roles'
import {
  STATUS_PROSPECCAO,
  STATUS_RETORNO,
  diaValido,
  fimDoDia,
  hoje,
  limitarQuantidade,
  sortear,
} from '../../crm/meuDia'

type Usuario = NonNullable<PayloadRequest['user']>

// Quem tem "Meu dia": vendedor, crm_admin e admin (cada um planeja o próprio dia)
export const podeTerMeuDia = (user: PayloadRequest['user']) =>
  Boolean(user) && canAccessCrmUser(user) && (isCrmAdminUser(user) || getRoles(user).includes('vendedor'))

const idDe = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number | null | undefined))
const erro = (status: number, message: string) => Response.json({ message }, { status })

// Garante o dia planejado (usuário + data) e devolve id e meta
async function garantirDia(req: PayloadRequest, user: Usuario, dia: string, meta?: number) {
  const { docs } = await req.payload.find({
    collection: 'crm-dias',
    where: { and: [{ usuario: { equals: user.id } }, { dia: { equals: dia } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true, // o dia é sempre do próprio usuário logado
    req,
  })
  if (docs[0]) {
    if (meta !== undefined && meta !== docs[0].meta) {
      await req.payload.update({ collection: 'crm-dias', id: docs[0].id, data: { meta }, overrideAccess: true, req })
    }
    return { id: docs[0].id, meta: meta ?? docs[0].meta }
  }
  const novo = await req.payload.create({
    collection: 'crm-dias',
    data: { usuario: user.id, dia, meta: meta ?? 0 },
    overrideAccess: true,
    req,
  })
  return { id: novo.id, meta: novo.meta }
}

const itensDoDia = (req: PayloadRequest, user: Usuario, dia: string) =>
  req.payload
    .find({
      collection: 'crm-dia-itens',
      where: { and: [{ usuario: { equals: user.id } }, { dia: { equals: dia } }] },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })
    .then((r) => r.docs)

// Empresas já reservadas: pendentes em algum dia de hoje em diante (de qualquer vendedor)
async function reservadas(req: PayloadRequest) {
  const { docs } = await req.payload.find({
    collection: 'crm-dia-itens',
    where: { and: [{ feito: { not_equals: true } }, { dia: { greater_than_equal: hoje() } }] },
    depth: 0,
    pagination: false,
    select: { empresa: true },
    overrideAccess: true,
    req,
  })
  return new Set(docs.map((d) => idDe(d.empresa)))
}

// POST /api/crm-dias/planejar { dia, quantidade }
// Sorteia empresas para o dia: primeiro as de prioridade Alta, depois Média, depois Baixa,
// em ordem aleatória dentro de cada faixa. Entram os leads do vendedor e, se a Configuração
// do CRM permitir, leads ainda sem vendedor (que passam a ser dele).
// Se o dia já tem empresas, só completa até a nova quantidade.
const planejar: Endpoint = {
  path: '/planejar',
  method: 'post',
  handler: async (req) => {
    const user = req.user
    if (!user || !podeTerMeuDia(user)) return erro(403, 'Você não tem acesso ao Meu dia.')
    await addDataAndFileToRequest(req)
    const { dia, quantidade } = (req.data ?? {}) as { dia?: string; quantidade?: number }
    if (!diaValido(dia)) return erro(400, 'Escolha um dia válido.')
    if (dia < hoje()) return erro(400, 'Não dá para planejar um dia que já passou.')
    const qtd = limitarQuantidade(quantidade)

    const doDia = await itensDoDia(req, user, dia)
    await garantirDia(req, user, dia, Math.max(qtd, doDia.length))
    const faltam = qtd - doDia.length
    if (faltam <= 0) return Response.json({ adicionadas: 0, total: doDia.length })

    const cfg = (await req.payload.findGlobal({ slug: 'crm-configuracao', depth: 0, req })) as {
      meuDiaLeadsSemVendedor?: boolean | null
    }
    const semVendedor = cfg?.meuDiaLeadsSemVendedor !== false
    const dono: Where = semVendedor
      ? { or: [{ vendedor: { equals: user.id } }, { vendedor: { exists: false } }] }
      : { vendedor: { equals: user.id } }

    const { docs } = await req.payload.find({
      collection: 'crm-empresas',
      where: {
        and: [
          dono,
          { naoContatar: { not_equals: true } },
          { semCanalContato: { not_equals: true } },
          {
            or: [
              { status: { in: STATUS_PROSPECCAO } },
              { and: [{ status: { in: STATUS_RETORNO } }, { retornarEm: { less_than_equal: fimDoDia(dia).toISOString() } }] },
            ],
          },
        ],
      },
      depth: 0,
      pagination: false,
      select: { prioridade: true, vendedor: true, canais: true },
      overrideAccess: true, // inclui leads sem vendedor; o filtro de dono está no where acima
      req,
    })
    const ocupadas = await reservadas(req)
    for (const i of doDia) ocupadas.add(idDe(i.empresa))
    const candidatas = docs.filter((e) => !ocupadas.has(e.id) && (e.canais?.length ?? 0) > 0)
    const escolhidas = sortear(candidatas, faltam)

    for (const e of escolhidas) {
      if (!idDe(e.vendedor)) {
        await req.payload.update({
          collection: 'crm-empresas',
          id: e.id,
          data: { vendedor: user.id },
          overrideAccess: true,
          context: { motivoMovimentacao: 'Sorteada no Meu dia' },
          req,
        })
      }
      await req.payload.create({
        collection: 'crm-dia-itens',
        data: { usuario: user.id, dia, empresa: e.id, origem: 'sorteio' },
        overrideAccess: true,
        req,
      })
    }
    return Response.json({ adicionadas: escolhidas.length, total: doDia.length + escolhidas.length, semMais: escolhidas.length < faltam })
  },
}

// POST /api/crm-dias/marcar { empresa, dia? }
// O vendedor coloca uma empresa que ele enxerga no próprio dia (padrão: hoje).
// Empresa sem vendedor (só o crm_admin enxerga) passa a ser de quem marcou.
const marcar: Endpoint = {
  path: '/marcar',
  method: 'post',
  handler: async (req) => {
    const user = req.user
    if (!user || !podeTerMeuDia(user)) return erro(403, 'Você não tem acesso ao Meu dia.')
    await addDataAndFileToRequest(req)
    const { empresa, dia: diaPedido } = (req.data ?? {}) as { empresa?: number | string; dia?: string }
    const dia = diaPedido || hoje()
    if (!diaValido(dia) || dia < hoje()) return erro(400, 'Escolha hoje ou um dia futuro.')

    // Só empresas que o usuário enxerga (access control de verdade)
    const { docs } = await req.payload.find({
      collection: 'crm-empresas',
      where: { id: { equals: Number(empresa) } },
      limit: 1,
      depth: 0,
      select: { vendedor: true, naoContatar: true },
      overrideAccess: false,
      user,
      req,
    })
    const emp = docs[0]
    if (!emp) return erro(404, 'Empresa não encontrada.')
    if (emp.naoContatar) return erro(400, 'Esta empresa está como "Não contatar".')

    const doDia = await itensDoDia(req, user, dia)
    if (doDia.some((i) => idDe(i.empresa) === emp.id)) return Response.json({ jaEstava: true, dia })

    const atual = await garantirDia(req, user, dia)
    if (atual.meta < doDia.length + 1) await garantirDia(req, user, dia, doDia.length + 1)
    if (!idDe(emp.vendedor)) {
      await req.payload.update({
        collection: 'crm-empresas',
        id: emp.id,
        data: { vendedor: user.id },
        overrideAccess: true,
        req,
      })
    }
    await req.payload.create({
      collection: 'crm-dia-itens',
      data: { usuario: user.id, dia, empresa: emp.id, origem: 'manual' },
      overrideAccess: true,
      req,
    })
    return Response.json({ ok: true, dia })
  },
}

export const endpointsMeuDia: Endpoint[] = [planejar, marcar]

// Depois de uma tentativa de contato: a empresa conta como "feita" no dia de quem registrou
// (e em dias anteriores em que ela ainda estava pendente).
export async function marcarFeitoNoDia(req: PayloadRequest, usuario: number, empresa: number, dia: string) {
  const { docs } = await req.payload.find({
    collection: 'crm-dia-itens',
    where: {
      and: [
        { usuario: { equals: usuario } },
        { empresa: { equals: empresa } },
        { feito: { not_equals: true } },
        { dia: { less_than_equal: dia } },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  for (const i of docs) {
    await req.payload.update({
      collection: 'crm-dia-itens',
      id: i.id,
      data: { feito: true, feitoEm: new Date().toISOString() },
      overrideAccess: true,
      req,
    })
  }
}
