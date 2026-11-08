// Importação de um arquivo FICTÍCIO num Postgres DESCARTÁVEL (TEST_DATABASE_URI em localhost).
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import pg from 'pg'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { importar } from '@/crm/importacao/importar'
import { lerArquivo } from '@/crm/importacao/ler'

const uri = process.env.TEST_DATABASE_URI
const local = !!uri && /@(127\.0\.0\.1|localhost)[:/]/.test(uri)

describe.skipIf(!local)('CRM — importação (arquivo fictício, banco descartável)', () => {
  let payload: Payload
  const arquivo = path.join(os.tmpdir(), `crm-ficticio-int-${Date.now()}.xlsx`)
  const opcoes = (dryRun: boolean, modo: 'ignorar' | 'completar' = 'ignorar') => ({
    dryRun,
    modo,
    lote: {
      nome: 'Lote fictício',
      origem: 'boa_vista' as const,
      fornecedorDado: 'Boa Vista',
      arquivoNome: path.basename(arquivo),
      origemLicitaConfirmada: true,
    },
    tamanhoLote: 150,
  })
  const contar = async (tabela: string) =>
    Number((await (payload.db as unknown as { pool: pg.Pool }).pool.query(`SELECT count(*) FROM ${tabela}`)).rows[0].count)

  beforeAll(async () => {
    const pool = new pg.Pool({ connectionString: uri })
    await pool.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`)
    await pool.end()
    process.env.DATABASE_URI = uri!
    process.env.PAYLOAD_SECRET ||= 'segredo-de-teste'
    const { getPayload } = await import('payload')
    payload = await getPayload({ config: (await import('@/payload.config')).default })
    const { migrations } = await import('@/migrations')
    await payload.db.migrate({ migrations: migrations as never })
    execFileSync(process.execPath, [
      path.resolve('node_modules/tsx/dist/cli.mjs'),
      'scripts/crm-gerar-ficticio.ts',
      '--linhas',
      '1200',
      '--saida',
      arquivo,
    ])
  }, 180_000)

  afterAll(async () => {
    fs.rmSync(arquivo, { force: true })
    await payload?.destroy()
  })

  let criadas = 0

  it('dry-run não grava nada', async () => {
    const { relatorio } = await importar(payload, lerArquivo(arquivo), opcoes(true))
    expect(relatorio.linhas).toBe(1200)
    expect(relatorio.criados).toBeGreaterThan(900)
    expect(relatorio.duplicadosNoArquivo).toBeGreaterThan(0)
    expect(await contar('crm_empresas')).toBe(0)
    expect(await contar('crm_lotes_importacao')).toBe(0)
    criadas = relatorio.criados
  }, 120_000)

  it('carga real grava empresas, telefones, CNAEs, contatos, lote e auditoria', async () => {
    const { relatorio, loteId } = await importar(payload, lerArquivo(arquivo), opcoes(false))
    expect(relatorio.criados).toBe(criadas)
    expect(await contar('crm_empresas')).toBe(criadas)
    expect(await contar('crm_empresas_cnaes')).toBeGreaterThan(criadas)
    expect(await contar('crm_contatos')).toBeGreaterThan(criadas * 0.8)

    const lote = await payload.findByID({ collection: 'crm-lotes-importacao', id: loteId! })
    expect(lote).toMatchObject({ criados: criadas, status: relatorio.totalErros ? 'concluido_com_erros' : 'concluido' })
    expect((lote.relatorioErros as unknown[]).length).toBe(relatorio.totalErros)
    expect((await payload.find({ collection: 'crm-auditoria' })).docs[0]).toMatchObject({ acao: 'importacao' })

    // A regra inicial de prioridade ficou salva na Configuração do CRM
    const cfg = await payload.findGlobal({ slug: 'crm-configuracao' })
    expect(cfg.cnaesAlta?.length).toBe(12)

    // O Payload lê o que o motor gravou (arrays, alertas, lote)
    const { docs } = await payload.find({ collection: 'crm-empresas', limit: 50, depth: 0 })
    const comTel = docs.find((d) => d.telefones?.length)!
    expect(comTel.telefones![0]).toMatchObject({ numero: expect.stringMatching(/^\d+$/) })
    expect(docs.every((d) => d.cnpj.length === 14 && d.status === 'na_fila' && d.lote === loteId)).toBe(true)
    expect(docs.some((d) => d.prioridade === 'alta')).toBe(true)
  }, 180_000)

  it('reimportar o mesmo arquivo não duplica nada', async () => {
    const antes = await Promise.all(['crm_empresas', 'crm_contatos', 'crm_empresas_telefones'].map(contar))
    const { relatorio } = await importar(payload, lerArquivo(arquivo), opcoes(false))
    expect(relatorio.criados).toBe(0)
    expect(relatorio.jaExistentes).toBe(criadas)
    expect(await Promise.all(['crm_empresas', 'crm_contatos', 'crm_empresas_telefones'].map(contar))).toEqual(antes)
  }, 180_000)

  it('modo "atualizar só campos vazios" completa sem sobrescrever nem duplicar', async () => {
    const pool = (payload.db as unknown as { pool: pg.Pool }).pool
    const { rows } = await pool.query(`SELECT id, cidade FROM crm_empresas WHERE cidade IS NOT NULL LIMIT 2`)
    await pool.query(`UPDATE crm_empresas SET bairro = NULL WHERE id = $1`, [rows[0].id])
    await pool.query(`UPDATE crm_empresas SET cidade = 'EDITADA PELO VENDEDOR' WHERE id = $1`, [rows[1].id])
    const total = await contar('crm_empresas')

    const { relatorio } = await importar(payload, lerArquivo(arquivo), opcoes(false, 'completar'))
    expect(relatorio.atualizados).toBeGreaterThanOrEqual(1)
    expect(await contar('crm_empresas')).toBe(total)
    const depois = await pool.query(`SELECT id, bairro, cidade FROM crm_empresas WHERE id = ANY($1) ORDER BY id`, [
      rows.map((r) => r.id),
    ])
    const porId = Object.fromEntries(depois.rows.map((r) => [r.id, r]))
    expect(porId[rows[0].id].bairro).toBe('CENTRO')
    expect(porId[rows[1].id].cidade).toBe('EDITADA PELO VENDEDOR')
  }, 180_000)
})
