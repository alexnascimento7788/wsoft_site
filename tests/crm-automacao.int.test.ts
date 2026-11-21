// Automação (IA e canais) com o Payload de verdade num Postgres DESCARTÁVEL.
// Só roda com TEST_DATABASE_URI em localhost — apaga o schema public!
import pg from 'pg'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const uri = process.env.TEST_DATABASE_URI
const local = !!uri && /@(127\.0\.0\.1|localhost)[:/]/.test(uri)

type U = { id: number; roles: string[]; collection: 'users'; email: string }

describe.skipIf(!local)('CRM — Automação: segredos criptografados e acesso', () => {
  let payload: Payload
  let pool: pg.Pool
  const u: Record<string, U> = {}
  const como = (user: U) => ({ overrideAccess: false, user }) as const

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: uri })
    await pool.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      END $$;
      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;`)

    process.env.DATABASE_URI = uri!
    process.env.PAYLOAD_SECRET ||= 'segredo-de-teste'
    process.env.CRM_CHAVE_SEGREDOS = 'chave-de-teste-com-mais-de-16'
    const { getPayload } = await import('payload')
    const config = (await import('@/payload.config')).default
    payload = await getPayload({ config })
    const { migrations } = await import('@/migrations')
    await payload.db.migrate({ migrations: migrations as never })

    for (const [k, roles] of Object.entries({ crmAdmin: ['crm_admin'], vend: ['vendedor'], fin: ['financeiro'] })) {
      const doc = await payload.create({
        collection: 'users',
        data: { email: `${k}@teste.local`, password: 'senha-teste-123', name: k, roles } as never,
      })
      u[k] = { ...(doc as unknown as U), collection: 'users' }
    }
  }, 120_000)

  afterAll(async () => {
    await payload?.destroy()
    await pool?.end()
  })

  const bruto = async () =>
    (await pool.query(`SELECT ia_token, evo_api_key, ia_prompt FROM crm_automacao LIMIT 1`)).rows[0] as Record<string, string | null>

  it('só o administrador do CRM lê e altera; vendedor e orçamento não', async () => {
    await expect(payload.findGlobal({ slug: 'crm-automacao', ...como(u.crmAdmin) })).resolves.toBeTruthy()
    for (const k of ['vend', 'fin']) {
      await expect(payload.findGlobal({ slug: 'crm-automacao', ...como(u[k]) })).rejects.toThrow()
      await expect(
        payload.updateGlobal({ slug: 'crm-automacao', data: { evoInstancia: 'x' }, ...como(u[k]) }),
      ).rejects.toThrow()
    }
  })

  it('o token vai criptografado para o banco e volta mascarado para a tela', async () => {
    await payload.updateGlobal({
      slug: 'crm-automacao',
      data: { iaToken: 'sk-ant-api-token-ABCD', evoApiKey: 'evo-chave-9876' },
      ...como(u.crmAdmin),
    })
    const b = await bruto()
    expect(b.ia_token).toMatch(/^enc1:/)
    expect(b.ia_token).not.toContain('ABCD')
    expect(b.ia_prompt).toContain('Wsoft') // prompt padrão gravado no 1º salvar

    const tela = await payload.findGlobal({ slug: 'crm-automacao', ...como(u.crmAdmin) })
    expect(tela.iaToken).toBe('••••••••ABCD')
    expect(tela.evoApiKey).toBe('••••••••9876')
  })

  it('salvar de novo com a máscara (sem mexer) mantém o token; vazio remove', async () => {
    const antes = await bruto()
    const tela = await payload.findGlobal({ slug: 'crm-automacao', ...como(u.crmAdmin) })
    await payload.updateGlobal({
      slug: 'crm-automacao',
      data: { ...tela, evoInstancia: 'wsoft', evoApiKey: '' },
      ...como(u.crmAdmin),
    })
    const depois = await bruto()
    expect(depois.ia_token).toBe(antes.ia_token)
    expect(depois.evo_api_key).toBeNull()

    // Atualização parcial (sem o campo) também mantém
    await payload.updateGlobal({ slug: 'crm-automacao', data: { evoInstancia: 'outra' }, ...como(u.crmAdmin) })
    expect((await bruto()).ia_token).toBe(antes.ia_token)
  })

  it('o servidor lê o token aberto (lerAutomacao)', async () => {
    const { lerAutomacao } = await import('@/crm/automacao/config')
    const cfg = await lerAutomacao(payload)
    expect(cfg.iaToken).toBe('sk-ant-api-token-ABCD')
    expect(cfg.evoApiKey).toBeNull()
    expect(cfg.evoInstancia).toBe('outra')
  })

  it('provedor e modelo: ChatGPT com modelo em texto livre e temperatura', async () => {
    await payload.updateGlobal({
      slug: 'crm-automacao',
      data: { iaProvedor: 'openai', iaModelo: 'gpt-qualquer-modelo', iaTemperatura: 0.3 },
      ...como(u.crmAdmin),
    })
    const { lerAutomacao } = await import('@/crm/automacao/config')
    const cfg = await lerAutomacao(payload)
    expect(cfg).toMatchObject({ iaProvedor: 'openai', iaModelo: 'gpt-qualquer-modelo', iaTemperatura: 0.3 })
    expect(cfg.iaToken).toBe('sk-ant-api-token-ABCD') // trocar o provedor não apaga a chave salva
  })

  it('tabelas da Automação fora da API REST do Supabase', async () => {
    const rows = (
      await pool.query(`SELECT c.relname, c.relrowsecurity AS rls,
        has_table_privilege('anon', c.oid, 'SELECT') AS anon
        FROM pg_class c WHERE c.relname IN ('crm_automacao','crm_automacao_dias_semana') ORDER BY 1`)
    ).rows
    expect(rows).toEqual([
      { relname: 'crm_automacao', rls: true, anon: false },
      { relname: 'crm_automacao_dias_semana', rls: true, anon: false },
    ])
  })
})
