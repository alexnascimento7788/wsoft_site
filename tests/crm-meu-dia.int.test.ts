// Meu dia, canais e efeitos dos registros da ficha — Payload de verdade num Postgres DESCARTÁVEL.
// Só roda com TEST_DATABASE_URI em localhost — apaga o schema public!
import pg from 'pg'
import { createLocalReq, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { hoje, somarDias } from '@/crm/meuDia'
import { cnpjComDv } from '@/crm/importacao/normalizar'

const uri = process.env.TEST_DATABASE_URI
const local = !!uri && /@(127\.0\.0\.1|localhost)[:/]/.test(uri)

type U = { id: number; roles: string[]; collection: 'users'; email: string; name: string }

describe.skipIf(!local)('CRM — Meu dia e ficha da empresa (Payload + banco descartável)', () => {
  let payload: Payload
  const u: Record<string, U> = {}
  const emp: Record<string, number> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const criar = (args: Record<string, unknown>) => payload.create(args as never) as Promise<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const empresa = (id: number) => payload.findByID({ collection: 'crm-empresas', id, depth: 0 }) as Promise<any>
  const como = (user: U) => ({ overrideAccess: false, user }) as const

  // Chama um endpoint de /api/crm-dias como se viesse do navegador do usuário
  const endpoint = async (path: string, user: U, data: Record<string, unknown>) => {
    const ep = payload.collections['crm-dias'].config.endpoints || []
    const handler = (ep as { path: string; handler: (req: unknown) => Promise<Response> }[]).find((e) => e.path === path)!.handler
    const req = await createLocalReq({ user: user as never }, payload)
    req.data = data
    const r = await handler(req)
    return { status: r.status, json: await r.json() }
  }
  const itens = async (user: U, dia = hoje()) =>
    (
      await payload.find({
        collection: 'crm-dia-itens',
        where: { and: [{ usuario: { equals: user.id } }, { dia: { equals: dia } }] },
        depth: 0,
        pagination: false,
      })
    ).docs

  beforeAll(async () => {
    const pool = new pg.Pool({ connectionString: uri })
    await pool.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`)
    await pool.end()

    process.env.DATABASE_URI = uri!
    process.env.PAYLOAD_SECRET ||= 'segredo-de-teste'
    const { getPayload } = await import('payload')
    const config = (await import('@/payload.config')).default
    payload = await getPayload({ config })
    const { migrations } = await import('@/migrations')
    await payload.db.migrate({ migrations: migrations as never })

    for (const [k, roles] of Object.entries({ crmAdmin: ['crm_admin'], vend1: ['vendedor'], vend2: ['vendedor'] })) {
      const doc = await criar({
        collection: 'users',
        data: { email: `${k}@teste.local`, password: 'senha-teste-123', name: k, roles },
      })
      u[k] = { ...doc, collection: 'users' }
    }

    // Empresas fictícias: prioridade, dono e canais variados
    const fixas: Record<string, Record<string, unknown>> = {
      altaV1: { prioridadeCalculada: 'alta', vendedor: u.vend1.id, telefones: [{ numero: '35999990001', tipo: 'celular' }] },
      mediaV1: { prioridadeCalculada: 'media', vendedor: u.vend1.id, telefones: [{ numero: '3533330002', tipo: 'fixo' }] },
      baixaLivre: { prioridadeCalculada: 'baixa' },
      altaV2: { prioridadeCalculada: 'alta', vendedor: u.vend2.id, telefones: [{ numero: '35999990004', tipo: 'celular' }] },
      bloqueadaV1: { prioridadeCalculada: 'alta', vendedor: u.vend1.id, naoContatar: true, telefones: [{ numero: '35999990005', tipo: 'celular' }] },
      semCanalV1: { prioridadeCalculada: 'alta', vendedor: u.vend1.id },
    }
    let n = 0
    for (const [k, extra] of Object.entries(fixas)) {
      n++
      const doc = await criar({
        collection: 'crm-empresas',
        data: { razaoSocial: `EMPRESA FICTICIA ${k}`, cnpj: cnpjComDv(`${String(n).padStart(8, '0')}0001`), ...extra },
      })
      emp[k] = doc.id
    }
    // E-mail chega por uma pessoa de contato
    await criar({ collection: 'crm-contatos', data: { empresa: emp.baixaLivre, nome: 'Pessoa Ficticia', email: 'ficticio@teste.local' } })
  }, 120_000)

  afterAll(async () => {
    await payload?.destroy()
  })

  it('canais da empresa são calculados (telefones da empresa e das pessoas)', async () => {
    expect((await empresa(emp.altaV1)).canais).toEqual(['whatsapp', 'telefone'])
    expect((await empresa(emp.mediaV1)).canais).toEqual(['telefone'])
    expect((await empresa(emp.baixaLivre)).canais).toEqual(['email'])
    expect((await empresa(emp.semCanalV1)).canais).toEqual([])
  })

  it('pessoa com "Não contatar" sai dos canais; pessoa apagada também', async () => {
    const p = await criar({ collection: 'crm-contatos', data: { empresa: emp.semCanalV1, nome: 'Outra', email: 'outra@teste.local' } })
    expect((await empresa(emp.semCanalV1)).canais).toEqual(['email'])
    await payload.update({ collection: 'crm-contatos', id: p.id, data: { naoContatar: true } })
    expect((await empresa(emp.semCanalV1)).canais).toEqual([])
    await payload.update({ collection: 'crm-contatos', id: p.id, data: { naoContatar: false } })
    expect((await empresa(emp.semCanalV1)).canais).toEqual(['email'])
    await payload.delete({ collection: 'crm-contatos', id: p.id })
    expect((await empresa(emp.semCanalV1)).canais).toEqual([])
  })

  it('pessoa de contato não muda de empresa depois de criada (nem pelo crm_admin)', async () => {
    const p = await criar({ collection: 'crm-contatos', data: { empresa: emp.mediaV1, nome: 'Fixa' } })
    const r = await payload.update({ collection: 'crm-contatos', id: p.id, data: { empresa: emp.altaV2 }, ...como(u.crmAdmin) })
    expect(typeof r.empresa === 'object' ? r.empresa.id : r.empresa).toBe(emp.mediaV1)
    await payload.delete({ collection: 'crm-contatos', id: p.id })
  })

  it('sorteio: Alta primeiro, só empresas do vendedor ou sem vendedor, nunca bloqueada ou sem canal', async () => {
    const r1 = await endpoint('/planejar', u.vend1, { dia: hoje(), quantidade: 1 })
    expect(r1).toMatchObject({ status: 200, json: { adicionadas: 1 } })
    expect((await itens(u.vend1)).map((i) => i.empresa)).toEqual([emp.altaV1])

    // Aumentar a quantidade só completa o dia
    const r2 = await endpoint('/planejar', u.vend1, { dia: hoje(), quantidade: 5 })
    expect(r2.json).toMatchObject({ adicionadas: 2, total: 3, semMais: true })
    const ids = (await itens(u.vend1)).map((i) => i.empresa)
    expect(ids.sort()).toEqual([emp.altaV1, emp.mediaV1, emp.baixaLivre].sort())

    // Lead sem vendedor sorteado passa a ser de quem sorteou
    expect((await empresa(emp.baixaLivre)).vendedor).toBe(u.vend1.id)
    const dia = await payload.find({ collection: 'crm-dias', where: { usuario: { equals: u.vend1.id } }, depth: 0 })
    expect(dia.docs[0]?.meta).toBe(5)
  })

  it('outro vendedor não recebe empresas já reservadas', async () => {
    const r = await endpoint('/planejar', u.vend2, { dia: hoje(), quantidade: 5 })
    expect(r.json).toMatchObject({ adicionadas: 1 })
    expect((await itens(u.vend2)).map((i) => i.empresa)).toEqual([emp.altaV2])
  })

  it('não planeja dia que já passou', async () => {
    const r = await endpoint('/planejar', u.vend1, { dia: somarDias(hoje(), -1), quantidade: 5 })
    expect(r.status).toBe(400)
  })

  it('marcar: só empresa que o vendedor enxerga; repetida avisa', async () => {
    expect((await endpoint('/marcar', u.vend2, { empresa: emp.altaV1 })).status).toBe(404)
    const amanha = somarDias(hoje(), 1)
    expect((await endpoint('/marcar', u.vend2, { empresa: emp.altaV2, dia: amanha })).json).toMatchObject({ ok: true, dia: amanha })
    expect((await endpoint('/marcar', u.vend2, { empresa: emp.altaV2, dia: amanha })).json).toMatchObject({ jaEstava: true })
    expect((await endpoint('/marcar', u.vend1, { empresa: emp.bloqueadaV1 })).status).toBe(400)
  })

  it('cada vendedor só vê o próprio Meu dia; crm_admin vê todos', async () => {
    const v2 = await payload.find({ collection: 'crm-dia-itens', ...como(u.vend2), depth: 0, pagination: false })
    expect(v2.docs.every((i) => (typeof i.usuario === 'object' ? i.usuario.id : i.usuario) === u.vend2.id)).toBe(true)
    const adm = await payload.find({ collection: 'crm-dia-itens', ...como(u.crmAdmin), depth: 0, pagination: false })
    expect(adm.totalDocs).toBeGreaterThan(v2.totalDocs)
    await expect(payload.create({ collection: 'crm-dia-itens', data: { usuario: u.vend1.id, dia: hoje(), empresa: emp.altaV1 } as never, ...como(u.vend1) })).rejects.toThrow()
  })

  it('tentativa registrada: empresa vai para Em contato, item do dia fica feito e o histórico de status é gravado', async () => {
    await payload.create({
      collection: 'crm-registros-contato',
      data: { empresa: emp.altaV1, canal: 'whatsapp', resultado: 'nao_atendeu', dataHora: new Date().toISOString() } as never,
      ...como(u.vend1),
    })
    expect((await empresa(emp.altaV1)).status).toBe('em_contato')
    const item = (await itens(u.vend1)).find((i) => i.empresa === emp.altaV1)
    expect(item?.feito).toBe(true)
    const mov = await payload.find({ collection: 'crm-movimentacoes', where: { empresa: { equals: emp.altaV1 } }, depth: 0 })
    expect(mov.docs.map((m) => [m.de, m.para, m.motivo])).toEqual([['na_fila', 'em_contato', 'Primeiro contato registrado']])
  })

  it('qualificação e desfecho atualizam o status da empresa', async () => {
    await payload.create({
      collection: 'crm-qualificacoes',
      data: { empresa: emp.mediaV1, resultado: 'qualificado' } as never,
      ...como(u.vend1),
    })
    expect((await empresa(emp.mediaV1)).status).toBe('qualificado')
    await payload.create({
      collection: 'crm-desfechos',
      data: { empresa: emp.mediaV1, resultado: 'venda_realizada', data: new Date().toISOString() } as never,
      ...como(u.vend1),
    })
    expect((await empresa(emp.mediaV1)).status).toBe('venda_realizada')
    const mov = await payload.find({ collection: 'crm-movimentacoes', where: { empresa: { equals: emp.mediaV1 } }, depth: 0, sort: 'createdAt' })
    expect(mov.docs.map((m) => m.para)).toEqual(['qualificado', 'venda_realizada'])
  })

  it('status alterado à mão pelo crm_admin também vai para o histórico', async () => {
    await payload.update({ collection: 'crm-empresas', id: emp.altaV2, data: { status: 'descartado' }, ...como(u.crmAdmin) })
    const mov = await payload.find({ collection: 'crm-movimentacoes', where: { empresa: { equals: emp.altaV2 } }, depth: 0 })
    expect(mov.docs[0]).toMatchObject({ de: 'na_fila', para: 'descartado', motivo: 'Alterado na ficha da empresa' })
  })

  it('pedido do titular nasce da empresa com protocolo gerado', async () => {
    const s = await payload.create({
      collection: 'crm-solicitacoes-titular',
      data: { empresa: emp.baixaLivre, tipo: 'exportacao', recebidaEm: new Date().toISOString() } as never,
      ...como(u.crmAdmin),
    })
    expect(s.protocolo).toMatch(/^LGPD-\d{8}-[A-Z0-9]{4}$/)
  })

  it('apagar a empresa (LGPD) apaga junto os itens do Meu dia', async () => {
    const e = await criar({ collection: 'crm-empresas', data: { razaoSocial: 'APAGAR', cnpj: cnpjComDv('000000990001'), vendedor: u.vend1.id, telefones: [{ numero: '35999990099', tipo: 'celular' }] } })
    await endpoint('/marcar', u.vend1, { empresa: e.id })
    await payload.delete({ collection: 'crm-empresas', id: e.id })
    const r = await payload.find({ collection: 'crm-dia-itens', where: { empresa: { equals: e.id } }, depth: 0 })
    expect(r.totalDocs).toBe(0)
  })
})
