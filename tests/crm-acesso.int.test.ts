// Testes cruzados de acesso com o Payload de verdade (Local API, overrideAccess: false)
// num Postgres DESCARTÁVEL. Só roda com TEST_DATABASE_URI em localhost — apaga o schema public!
import pg from 'pg'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cnpjComDv } from '@/crm/importacao/normalizar'

const uri = process.env.TEST_DATABASE_URI
const local = !!uri && /@(127\.0\.0\.1|localhost)[:/]/.test(uri)

const CRM = [
  'crm-empresas',
  'crm-contatos',
  'crm-registros-contato',
  'crm-qualificacoes',
  'crm-desfechos',
  'crm-movimentacoes',
  'crm-lotes-importacao',
  'crm-modelos-importacao',
  'crm-solicitacoes-titular',
  'crm-auditoria',
] as const
const ORCAMENTO = ['centros-de-custo', 'contas', 'despesas', 'fornecedores'] as const

type U = { id: number; roles: string[]; collection: 'users'; email: string; name: string }

describe.skipIf(!local)('CRM — acesso por perfil (Payload + banco descartável)', () => {
  let payload: Payload
  const u: Record<string, U> = {}
  const emp: Record<string, number> = {}

  const como = (user: U) => ({ overrideAccess: false, user }) as const
  // Dados parciais de propósito (campos com valor padrão ficam de fora)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const criar = (args: Record<string, unknown>) => payload.create(args as never) as Promise<any>
  const ids = async (collection: (typeof CRM)[number], user: U) =>
    (await payload.find({ collection, ...como(user), depth: 0, pagination: false })).docs.map((d) => d.id)

  beforeAll(async () => {
    const pool = new pg.Pool({ connectionString: uri })
    await pool.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      END $$;
      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;`)
    await pool.end()

    process.env.DATABASE_URI = uri!
    process.env.PAYLOAD_SECRET ||= 'segredo-de-teste'
    const { getPayload } = await import('payload')
    const config = (await import('@/payload.config')).default
    payload = await getPayload({ config })
    const { migrations } = await import('@/migrations')
    await payload.db.migrate({ migrations: migrations as never })

    const perfis: Record<string, string[]> = {
      admin: ['admin'],
      financeiro: ['financeiro'],
      consulta: ['consulta'],
      crmAdmin: ['crm_admin'],
      vend1: ['vendedor'],
      vend2: ['vendedor'],
      apres1: ['apresentador'],
      ambos: ['vendedor', 'apresentador'],
      finEVend: ['financeiro', 'vendedor'],
    }
    for (const [k, roles] of Object.entries(perfis)) {
      const doc = await criar({
        collection: 'users',
        data: { email: `${k}@teste.local`, password: 'senha-teste-123', name: k, roles } as never,
      })
      u[k] = { ...(doc as unknown as U), collection: 'users' }
    }

    // Empresas fictícias e seus responsáveis
    const empresas: Record<string, { vendedor?: string; apresentador?: string }> = {
      A: { vendedor: 'vend1' },
      B: { vendedor: 'vend2' },
      C: { vendedor: 'vend1', apresentador: 'apres1' },
      D: { vendedor: 'ambos' },
      E: { vendedor: 'vend2', apresentador: 'ambos' },
      F: { vendedor: 'finEVend' },
    }
    let n = 0
    for (const [k, r] of Object.entries(empresas)) {
      n++
      const doc = await criar({
        collection: 'crm-empresas',
        data: {
          razaoSocial: `EMPRESA FICTICIA ${k} LTDA`,
          cnpj: cnpjComDv(`${String(n).padStart(8, '0')}0001`),
          vendedor: r.vendedor ? u[r.vendedor].id : undefined,
          apresentador: r.apresentador ? u[r.apresentador].id : undefined,
        },
      })
      emp[k] = doc.id as number
      await criar({ collection: 'crm-contatos', data: { empresa: doc.id, nome: `Contato ${k}` } })
    }
    await criar({ collection: 'centros-de-custo', data: { codigo: 'T1', nome: 'Teste' } })
  }, 120_000)

  afterAll(async () => {
    await payload?.destroy()
  })

  it('perfis do orçamento não leem nenhuma coleção do CRM', async () => {
    for (const k of ['financeiro', 'consulta']) {
      for (const col of CRM) {
        await expect(payload.find({ collection: col, ...como(u[k]) })).rejects.toThrow()
      }
      await expect(payload.findGlobal({ slug: 'crm-configuracao', ...como(u[k]) })).rejects.toThrow()
    }
  })

  it('perfis do CRM não leem o orçamento', async () => {
    for (const k of ['crmAdmin', 'vend1', 'apres1', 'ambos']) {
      for (const col of ORCAMENTO) {
        await expect(payload.find({ collection: col, ...como(u[k]) })).rejects.toThrow()
      }
      await expect(payload.findGlobal({ slug: 'configuracao-orcamento', ...como(u[k]) })).rejects.toThrow()
    }
  })

  it('quem tem orçamento e CRM vê os dois (só os próprios leads)', async () => {
    const r = await payload.find({ collection: 'centros-de-custo', ...como(u.finEVend) })
    expect(r.totalDocs).toBe(1)
    expect(await ids('crm-empresas', u.finEVend)).toEqual([emp.F])
  })

  it('vendedor vê só os leads atribuídos a ele (empresas e contatos)', async () => {
    expect((await ids('crm-empresas', u.vend1)).sort()).toEqual([emp.A, emp.C].sort())
    expect((await ids('crm-empresas', u.vend2)).sort()).toEqual([emp.B, emp.E].sort())
    const contatos = await payload.find({ collection: 'crm-contatos', ...como(u.vend1), depth: 0 })
    expect(contatos.docs.map((c) => c.empresa).sort()).toEqual([emp.A, emp.C].sort())
    await expect(payload.findByID({ collection: 'crm-empresas', id: emp.B, ...como(u.vend1) })).rejects.toThrow()
  })

  it('apresentador vê só os encaminhados a ele; quem tem os dois perfis vê os dois conjuntos', async () => {
    expect(await ids('crm-empresas', u.apres1)).toEqual([emp.C])
    expect((await ids('crm-empresas', u.ambos)).sort()).toEqual([emp.D, emp.E].sort())
  })

  it('crm_admin e admin veem tudo; vendedor não vê lotes, auditoria nem solicitações', async () => {
    expect((await ids('crm-empresas', u.crmAdmin)).length).toBe(6)
    expect((await ids('crm-empresas', u.admin)).length).toBe(6)
    const restritas = [
      'crm-lotes-importacao',
      'crm-auditoria',
      'crm-solicitacoes-titular',
      'crm-modelos-importacao',
    ] as const
    for (const col of restritas) {
      await expect(payload.find({ collection: col, ...como(u.vend1) })).rejects.toThrow()
      expect((await payload.find({ collection: col, ...como(u.crmAdmin) })).totalDocs).toBe(0)
    }
  })

  it('vendedor não registra contato em empresa de outro vendedor', async () => {
    await expect(
      criar({
        collection: 'crm-registros-contato',
        data: { empresa: emp.B, canal: 'ligacao', resultado: 'nao_atendeu' },
        ...como(u.vend1),
      }),
    ).rejects.toThrow()
    const ok = await criar({
      collection: 'crm-registros-contato',
      data: { empresa: emp.A, canal: 'ligacao', resultado: 'falou_decisor' },
      ...como(u.vend1),
    })
    expect(ok.registradoPorNome).toBe('vend1')
    expect(ok.houveConversa).toBe(true)
  })

  it('vendedor não troca o responsável do lead', async () => {
    const r = await payload.update({
      collection: 'crm-empresas',
      id: emp.A,
      data: { vendedor: u.vend2.id, observacoes: 'ok' },
      ...como(u.vend1),
    })
    expect(r.observacoes).toBe('ok')
    expect(typeof r.vendedor === 'object' ? r.vendedor?.id : r.vendedor).toBe(u.vend1.id)
  })

  it('vendedor cadastra lead à mão: fica responsável, CNPJ conferido e normalizado, prioridade pelo CNAE', async () => {
    const cnpj = cnpjComDv('900000010002')
    const doc = await criar({
      collection: 'crm-empresas',
      data: {
        razaoSocial: 'LEAD DO SITE FICTICIO LTDA',
        cnpj: `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`,
        origem: 'site',
        vendedor: u.vend2.id, // ignorado: quem cadastra é o responsável
        prioridadeManual: 'alta', // ignorado: só crm_admin corrige
        telefones: [{ numero: '(35) 91234-5678' }],
        cnaes: [{ codigo: '5211-7/01', principal: true }],
      },
      ...como(u.vend1),
    })
    expect(doc.cnpj).toBe(cnpj)
    expect(doc.raizCnpj).toBe('90000001')
    expect(doc.tipo).toBe('filial')
    expect(doc.status).toBe('na_fila')
    expect(doc.origem).toBe('site')
    expect(typeof doc.vendedor === 'object' ? doc.vendedor?.id : doc.vendedor).toBe(u.vend1.id)
    expect(doc.prioridadeManual ?? null).toBeNull()
    expect(doc.prioridade).toBe('alta') // 5211701 está na lista Alta
    expect(doc.telefones[0]).toMatchObject({ numero: '35912345678', tipo: 'celular', valido: true })
    expect(await ids('crm-empresas', u.vend1)).toContain(doc.id)
    expect(await ids('crm-empresas', u.vend2)).not.toContain(doc.id)

    // CNPJ inválido, repetido ou telefone fora do padrão: recusa com a mensagem certa
    const base = { razaoSocial: 'OUTRO FICTICIO' }
    const motivo = (p: Promise<unknown>) =>
      p.then(
        () => 'gravou',
        (e: { data?: { errors?: { message: string }[] }; message: string }) => e.data?.errors?.[0]?.message ?? e.message,
      )
    expect(await motivo(criar({ collection: 'crm-empresas', data: { ...base, cnpj: '11222333000100' }, ...como(u.vend1) }))).toMatch(/CNPJ inválido/)
    expect(await motivo(criar({ collection: 'crm-empresas', data: { ...base, cnpj }, ...como(u.vend2) }))).toMatch(/já está no CRM/)
    expect(
      await motivo(
        criar({ collection: 'crm-empresas', data: { ...base, cnpj: cnpjComDv('900000020001'), telefones: [{ numero: '123' }] }, ...como(u.vend1) }),
      ),
    ).toMatch(/Telefone fora do padrão/)
    // apresentador e perfis do orçamento não cadastram
    for (const k of ['apres1', 'financeiro']) {
      await expect(criar({ collection: 'crm-empresas', data: { ...base, cnpj: cnpjComDv('900000030001') }, ...como(u[k]) })).rejects.toThrow()
    }
  })

  it('registrar tentativa: lead vai para "Em contato", número inválido sai da fila, "Não contatar" e retorno', async () => {
    const e = await criar({
      collection: 'crm-empresas',
      data: {
        razaoSocial: 'EMPRESA FICTICIA EFEITOS LTDA',
        cnpj: cnpjComDv('000009990001'),
        vendedor: u.vend1.id,
        telefones: [{ numero: '3538221234', tipo: 'fixo' }, { numero: '35999998888', tipo: 'celular' }],
      },
    })
    const pessoa = await criar({ collection: 'crm-contatos', data: { empresa: e.id, nome: 'Pessoa Ficticia' } })

    const retorno = new Date(Date.now() + 86400000).toISOString()
    await criar({
      collection: 'crm-registros-contato',
      data: { empresa: e.id, canal: 'ligacao', resultado: 'numero_invalido', telefoneUsado: '3538221234', proximoPassoData: retorno },
      ...como(u.vend1),
    })
    let atual = await payload.findByID({ collection: 'crm-empresas', id: e.id, depth: 0 })
    expect(atual.status).toBe('em_contato')
    expect(atual.retornarEm).toBe(retorno)
    expect(atual.telefones!.map((t) => [t.numero, t.valido])).toEqual([['3538221234', false], ['35999998888', true]])
    const mov = await payload.find({ collection: 'crm-movimentacoes', where: { empresa: { equals: e.id } } })
    expect(mov.docs[0]).toMatchObject({ de: 'na_fila', para: 'em_contato', usuarioNome: 'vend1' })

    await criar({
      collection: 'crm-registros-contato',
      data: { empresa: e.id, contato: pessoa.id, canal: 'whatsapp', resultado: 'nao_contatar' },
      ...como(u.vend1),
    })
    const p = await payload.findByID({ collection: 'crm-contatos', id: pessoa.id, depth: 0 })
    expect(p.naoContatar).toBe(true)
    expect(p.naoContatarEm).toBeTruthy()
    expect(p.naoContatarPor).toBe(u.vend1.id)

    await criar({
      collection: 'crm-registros-contato',
      data: { empresa: e.id, canal: 'email', resultado: 'nao_contatar' },
      ...como(u.vend1),
    })
    atual = await payload.findByID({ collection: 'crm-empresas', id: e.id, depth: 0 })
    expect(atual.naoContatar).toBe(true)
    expect(atual.status).toBe('em_contato') // não volta nem avança sozinho
  })

  it('tabelas do CRM: RLS ligado e anon/authenticated sem acesso', async () => {
    const pool = new pg.Pool({ connectionString: uri })
    const { rows } = await pool.query(`SELECT tablename, rowsecurity,
        has_table_privilege('anon', 'public.' || tablename, 'SELECT') AS anon,
        has_table_privilege('authenticated', 'public.' || tablename, 'SELECT') AS auth
      FROM pg_tables WHERE schemaname='public' AND left(tablename,4)='crm_'`)
    await pool.end()
    expect(rows.length).toBe(21) // + crm_empresas_canais, crm_dias, crm_dia_itens (Meu dia)
    for (const r of rows) {
      expect({ t: r.tablename, rls: r.rowsecurity, anon: r.anon, auth: r.auth }).toEqual({
        t: r.tablename,
        rls: true,
        anon: false,
        auth: false,
      })
    }
  })
})
