// Teste das migrações num Postgres DESCARTÁVEL (ex.: Docker local).
// Só roda com TEST_DATABASE_URI apontando para localhost — apaga o schema public!
//   TEST_DATABASE_URI=postgres://postgres:teste@127.0.0.1:55432/postgres npm test
import { drizzle } from '@payloadcms/db-postgres/drizzle/node-postgres'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'

const uri = process.env.TEST_DATABASE_URI
const local = !!uri && /@(127\.0\.0\.1|localhost)[:/]/.test(uri)

const porNome = (nome: string) => {
  const m = migrations.find((x) => x.name === nome)
  if (!m) throw new Error(`migração ${nome} não encontrada`)
  return m
}

describe.skipIf(!local)('migrações de perfis e bloqueio da API (banco descartável)', () => {
  const pool = new pg.Pool({ connectionString: uri })
  const db = drizzle(pool) as never
  const args = { db, payload: undefined, req: undefined } as never
  const q = async (text: string) => (await pool.query(text)).rows

  beforeAll(async () => {
    await q(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`)
    // Papéis que o Supabase usa na API REST
    await q(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    END $$;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;`)

    for (const nome of ['20261004_200902_baseline', '20261004_201440_orcamento', '20261004_204710_previsao']) {
      await porNome(nome).up(args)
    }
    // Situação de hoje: um admin (e, para cobrir os demais casos, um financeiro e um consulta)
    await q(`INSERT INTO users (email, role) VALUES
      ('admin@teste.local','admin'), ('fin@teste.local','financeiro'), ('cons@teste.local','consulta')`)
  })

  afterAll(async () => {
    await pool.end()
  })

  it('antes do bloqueio, anon lê users (reproduz a falha encontrada)', async () => {
    const [r] = await q(`SELECT has_table_privilege('anon','public.users','SELECT') AS pode`)
    expect(r.pode).toBe(true)
  })

  it('perfis: cada usuário recebe em "roles" o perfil que já tinha', async () => {
    await porNome('20261108_151454_perfis').up(args)
    const rows = await q(`SELECT u.email, u.role::text AS antigo, r.value::text AS novo, u.ativo
      FROM users u JOIN users_roles r ON r.parent_id = u.id ORDER BY u.id`)
    expect(rows).toEqual([
      { email: 'admin@teste.local', antigo: 'admin', novo: 'admin', ativo: true },
      { email: 'fin@teste.local', antigo: 'financeiro', novo: 'financeiro', ativo: true },
      { email: 'cons@teste.local', antigo: 'consulta', novo: 'consulta', ativo: true },
    ])
  })

  it('bloqueio: RLS ligado em todas as tabelas e anon sem acesso', async () => {
    await porNome('20261108_151500_bloquear_api_rest').up(args)
    const semRls = await q(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity`)
    expect(semRls).toEqual([])
    const [r] = await q(`SELECT has_table_privilege('anon','public.users','SELECT') AS anon,
      has_table_privilege('authenticated','public.despesas','SELECT') AS auth`)
    expect(r).toEqual({ anon: false, auth: false })

    // Tabela criada depois (como as do CRM) já nasce sem acesso para anon
    await q(`CREATE TABLE crm_teste (id serial PRIMARY KEY)`)
    const [n] = await q(`SELECT has_table_privilege('anon','public.crm_teste','SELECT') AS anon`)
    expect(n.anon).toBe(false)
    await q(`DROP TABLE crm_teste`)

    // O dono das tabelas (como o Payload conecta) continua lendo normalmente
    const [c] = await q(`SELECT count(*)::int AS n FROM users`)
    expect(c.n).toBe(3)
  })

  it('as duas migrações são reversíveis sem perder usuários', async () => {
    await porNome('20261108_151500_bloquear_api_rest').down(args)
    await porNome('20261108_151454_perfis').down(args)
    const [t] = await q(`SELECT to_regclass('public.users_roles') AS tabela`)
    expect(t.tabela).toBeNull()
    const rows = await q(`SELECT email, role::text AS role FROM users ORDER BY id`)
    expect(rows.map((r) => r.role)).toEqual(['admin', 'financeiro', 'consulta'])

    // E podem ser aplicadas de novo
    await porNome('20261108_151454_perfis').up(args)
    await porNome('20261108_151500_bloquear_api_rest').up(args)
    const [r] = await q(`SELECT count(*)::int AS n FROM users_roles`)
    expect(r.n).toBe(3)
  })
})
