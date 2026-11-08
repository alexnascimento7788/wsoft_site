import { randomBytes } from 'crypto'
import type { Pool, PoolClient } from 'pg'
import type { Payload } from 'payload'

import { regraPrioridadePadrao } from '@/globals/CrmConfiguracao'
import type { Registro } from './colunas'
import { Relatorio, prepararLinha, type ContatoPreparado, type EmpresaPreparada } from './motor'
import { criarCalculoPrioridade, type RegraPrioridade } from './prioridade'

export type ModoDuplicados = 'ignorar' | 'completar'

export type OpcoesImportacao = {
  dryRun: boolean
  modo: ModoDuplicados
  lote: {
    nome: string
    origem: 'boa_vista' | 'instagram' | 'indicacao' | 'base_wsoft' | 'site' | 'outra'
    fornecedorDado: string
    arquivoNome: string
    origemLicitaConfirmada: boolean
  }
  usuario?: { id: number; name?: string | null; email?: string } | null
  tamanhoLote?: number
  aoProgredir?: (r: Relatorio) => void
}

type Fonte = AsyncIterable<
  { tipo: 'cabecalho'; modelo: string | null; ignorados: string[] } | { tipo: 'linha'; linha: number; registro: Registro }
>

type Preparada = { empresa: EmpresaPreparada; contato: ContatoPreparado | null }

const novoId = () => randomBytes(12).toString('hex')

// Regra de prioridade da configuração do CRM (ou a regra inicial, se ainda não foi salva)
export async function carregarRegra(payload: Payload): Promise<{ regra: RegraPrioridade; salva: boolean }> {
  const cfg = (await payload.findGlobal({ slug: 'crm-configuracao', depth: 0 })) as RegraPrioridade
  const salva = Boolean(cfg?.cnaesAlta?.length)
  return { regra: salva ? cfg : regraPrioridadePadrao(), salva }
}

// INSERT de várias linhas: monta "($1,$2,...),(...)" e a lista de valores
function valoresMultiplos(linhas: unknown[][]) {
  const params: unknown[] = []
  const grupos = linhas.map((l) => `(${l.map((v) => (params.push(v), `$${params.length}`)).join(',')})`)
  return { sql: grupos.join(','), params }
}

async function inserirTelefones(c: PoolClient, tabela: string, itens: { pai: number; telefones: EmpresaPreparada['telefones'] }[]) {
  const linhas = itens.flatMap(({ pai, telefones }) => telefones.map((t, i) => [i + 1, pai, novoId(), t.numero, t.tipo, t.valido]))
  if (!linhas.length) return
  const { sql, params } = valoresMultiplos(linhas)
  await c.query(`INSERT INTO ${tabela} ("_order","_parent_id","id","numero","tipo","valido") VALUES ${sql}`, params)
}

async function inserirCnaes(c: PoolClient, itens: { pai: number; cnaes: EmpresaPreparada['cnaes'] }[]) {
  const linhas = itens.flatMap(({ pai, cnaes }) => cnaes.map((x, i) => [i + 1, pai, novoId(), x.codigo, x.descricao, x.principal]))
  if (!linhas.length) return
  const { sql, params } = valoresMultiplos(linhas)
  await c.query(
    `INSERT INTO crm_empresas_cnaes ("_order","_parent_id","id","codigo","descricao","principal") VALUES ${sql}`,
    params,
  )
}

async function inserirContatos(c: PoolClient, itens: { empresaId: number; contato: ContatoPreparado }[], ctx: Contexto) {
  if (!itens.length) return
  const { sql, params } = valoresMultiplos(
    itens.map(({ empresaId, contato }) => [
      empresaId,
      contato.nome,
      contato.email,
      contato.empresarioIndividual,
      ctx.origem,
      ctx.fornecedorDado,
      ctx.loteId,
      ctx.agora,
    ]),
  )
  const { rows } = await c.query<{ id: number; empresa_id: number }>(
    `INSERT INTO crm_contatos ("empresa_id","nome","email","empresario_individual","origem","fornecedor_dado","lote_id","data_importacao")
     VALUES ${sql} RETURNING id, empresa_id`,
    params,
  )
  const porEmpresa = new Map(itens.map((i) => [i.empresaId, i.contato]))
  await inserirTelefones(
    c,
    'crm_contatos_telefones',
    rows.map((r) => ({ pai: r.id, telefones: porEmpresa.get(r.empresa_id)!.telefones })),
  )
}

type Contexto = { origem: string; fornecedorDado: string; loteId: number | null; agora: string; ordem: number }

// Grava um lote de empresas novas numa transação (tudo ou nada)
async function gravarNovas(pool: Pool, lote: Preparada[], ctx: Contexto): Promise<number> {
  const c = await pool.connect()
  try {
    await c.query('BEGIN')
    const { sql, params } = valoresMultiplos(
      lote.map(({ empresa: e }) => [
        e.razaoSocial, e.nomeFantasia, e.cnpj, e.raizCnpj, e.tipo, e.situacaoCadastral, e.faixaFundacao,
        e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.uf, e.cep, e.observacoes,
        e.prioridade, e.prioridade, e.semCanalContato, ++ctx.ordem,
        ctx.origem, ctx.fornecedorDado, ctx.loteId, ctx.agora,
      ]),
    )
    const { rows } = await c.query<{ id: number; cnpj: string }>(
      `INSERT INTO crm_empresas ("razao_social","nome_fantasia","cnpj","raiz_cnpj","tipo","situacao_cadastral","faixa_fundacao",
        "logradouro","numero","complemento","bairro","cidade","uf","cep","observacoes",
        "prioridade","prioridade_calculada","sem_canal_contato","ordem_importacao",
        "origem","fornecedor_dado","lote_id","data_importacao")
       VALUES ${sql} ON CONFLICT ("cnpj") DO NOTHING RETURNING id, cnpj`,
      params,
    )
    const porCnpj = new Map(lote.map((p) => [p.empresa.cnpj, p]))
    const criadas = rows.map((r) => ({ id: r.id, ...porCnpj.get(r.cnpj)! }))

    await inserirTelefones(c, 'crm_empresas_telefones', criadas.map((x) => ({ pai: x.id, telefones: x.empresa.telefones })))
    await inserirCnaes(c, criadas.map((x) => ({ pai: x.id, cnaes: x.empresa.cnaes })))
    const alertas = criadas.flatMap((x) => x.empresa.alertas.map((a, i) => [i + 1, x.id, a]))
    if (alertas.length) {
      const v = valoresMultiplos(alertas)
      await c.query(`INSERT INTO crm_empresas_alertas ("order","parent_id","value") VALUES ${v.sql}`, v.params)
    }
    await inserirContatos(
      c,
      criadas.filter((x) => x.contato).map((x) => ({ empresaId: x.id, contato: x.contato! })),
      ctx,
    )
    await c.query('COMMIT')
    return criadas.length
  } catch (e) {
    await c.query('ROLLBACK')
    throw e
  } finally {
    c.release()
  }
}

const CAMPOS_COMPLETAR = [
  ['nome_fantasia', 'nomeFantasia'], ['situacao_cadastral', 'situacaoCadastral'], ['faixa_fundacao', 'faixaFundacao'],
  ['logradouro', 'logradouro'], ['numero', 'numero'], ['complemento', 'complemento'], ['bairro', 'bairro'],
  ['cidade', 'cidade'], ['uf', 'uf'], ['cep', 'cep'], ['observacoes', 'observacoes'],
] as const

// Modo "atualizar só campos vazios": preenche o que estiver vazio; telefones, CNAEs e contato só
// entram se a empresa ainda não tiver nenhum. Nunca sobrescreve um valor existente.
async function completarExistentes(pool: Pool, lote: Preparada[], ctx: Contexto): Promise<number> {
  const c = await pool.connect()
  let atualizadas = 0
  try {
    await c.query('BEGIN')
    const { rows } = await c.query(
      `SELECT e.id, e.cnpj, ${CAMPOS_COMPLETAR.map(([col]) => `e."${col}"`).join(', ')},
        (SELECT count(*) FROM crm_empresas_telefones t WHERE t._parent_id = e.id)::int AS n_tel,
        (SELECT count(*) FROM crm_empresas_cnaes x WHERE x._parent_id = e.id)::int AS n_cnae,
        (SELECT count(*) FROM crm_contatos k WHERE k.empresa_id = e.id)::int AS n_contato
       FROM crm_empresas e WHERE e.cnpj = ANY($1)`,
      [lote.map((p) => p.empresa.cnpj)],
    )
    const porCnpj = new Map(lote.map((p) => [p.empresa.cnpj, p]))
    for (const atual of rows) {
      const { empresa: e, contato } = porCnpj.get(atual.cnpj)!
      const sets: string[] = []
      const params: unknown[] = [atual.id]
      for (const [col, campo] of CAMPOS_COMPLETAR) {
        if ((atual[col] === null || atual[col] === '') && e[campo]) {
          params.push(e[campo])
          sets.push(`"${col}" = $${params.length}`)
        }
      }
      let mudou = sets.length > 0
      if (sets.length) await c.query(`UPDATE crm_empresas SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`, params)
      if (!atual.n_tel && e.telefones.length) {
        await inserirTelefones(c, 'crm_empresas_telefones', [{ pai: atual.id, telefones: e.telefones }])
        mudou = true
      }
      if (!atual.n_cnae && e.cnaes.length) {
        await inserirCnaes(c, [{ pai: atual.id, cnaes: e.cnaes }])
        mudou = true
      }
      if (!atual.n_contato && contato) {
        await inserirContatos(c, [{ empresaId: atual.id, contato }], ctx)
        mudou = true
      }
      if (mudou) atualizadas++
    }
    await c.query('COMMIT')
    return atualizadas
  } catch (e) {
    await c.query('ROLLBACK')
    throw e
  } finally {
    c.release()
  }
}

// Motor de importação (o mesmo para o script e para a tela do admin):
// leitura → normalização → validação → duplicidade → gravação em lotes → relatório.
// Em dry-run nada é gravado: só lê os CNPJs já existentes e a regra de prioridade.
export async function importar(payload: Payload, fonte: Fonte, opts: OpcoesImportacao) {
  const pool = (payload.db as unknown as { pool: Pool }).pool
  const tamanho = opts.tamanhoLote ?? 200
  const relatorio = new Relatorio()
  const { regra, salva } = await carregarRegra(payload)
  const calcular = criarCalculoPrioridade(regra)

  const existentes = new Set(
    (await pool.query<{ cnpj: string }>('SELECT cnpj FROM crm_empresas')).rows.map((r) => r.cnpj),
  )
  const vistos = new Set<string>()
  const errosDetalhe: { linha: number; erro: string; registro: Registro }[] = []
  let modelo: string | null = null

  let loteId: number | null = null
  const ctx: Contexto = { origem: opts.lote.origem, fornecedorDado: opts.lote.fornecedorDado, loteId: null, agora: new Date().toISOString(), ordem: 0 }

  if (!opts.dryRun) {
    if (!opts.lote.origemLicitaConfirmada) throw new Error('Confirme a origem lícita do arquivo antes de importar.')
    // A regra inicial passa a ficar salva (e editável) na Configuração do CRM
    if (!salva) await payload.updateGlobal({ slug: 'crm-configuracao', data: regraPrioridadePadrao() as never })
    const lote = await payload.create({
      collection: 'crm-lotes-importacao',
      data: { ...opts.lote, status: 'processando', modoDuplicados: opts.modo },
      user: opts.usuario as never,
    })
    loteId = lote.id as number
    ctx.loteId = loteId
    const { rows } = await pool.query<{ max: string | null }>('SELECT max(ordem_importacao) AS max FROM crm_empresas')
    ctx.ordem = Number(rows[0].max ?? 0)
  }

  let novas: Preparada[] = []
  let completar: Preparada[] = []
  const descarregar = async (fim = false) => {
    if (novas.length && (fim || novas.length >= tamanho)) {
      const lote = novas
      novas = []
      if (!opts.dryRun) {
        const criadas = await gravarNovas(pool, lote, ctx)
        relatorio.criados += criadas
        relatorio.jaExistentes += lote.length - criadas // gravadas por outra importação no meio-tempo
      } else relatorio.criados += lote.length
      opts.aoProgredir?.(relatorio)
    }
    if (completar.length && (fim || completar.length >= tamanho)) {
      const lote = completar
      completar = []
      if (!opts.dryRun) relatorio.atualizados += await completarExistentes(pool, lote, ctx)
    }
  }

  try {
    for await (const item of fonte) {
      if (item.tipo === 'cabecalho') {
        modelo = item.modelo
        continue
      }
      const p = prepararLinha(item.registro, item.linha, calcular)
      relatorio.registrar(p)
      if (!p.ok) {
        errosDetalhe.push({ linha: p.linha, erro: p.erro, registro: item.registro })
        continue
      }
      const { cnpj } = p.empresa
      if (vistos.has(cnpj)) {
        relatorio.duplicadosNoArquivo++
        continue
      }
      vistos.add(cnpj)
      if (existentes.has(cnpj)) {
        relatorio.jaExistentes++
        if (opts.modo === 'completar') completar.push(p)
        continue
      }
      novas.push(p)
      await descarregar()
    }
    await descarregar(true)
  } catch (e) {
    if (loteId) {
      await payload.update({ collection: 'crm-lotes-importacao', id: loteId, data: { status: 'falhou' } })
    }
    throw e
  }

  if (loteId) {
    const r = relatorio
    await payload.update({
      collection: 'crm-lotes-importacao',
      id: loteId,
      data: {
        status: r.totalErros ? 'concluido_com_erros' : 'concluido',
        linhas: r.linhas,
        criados: r.criados,
        atualizados: r.atualizados,
        duplicados: r.duplicadosNoArquivo + r.jaExistentes,
        alertas: r.comAlerta,
        erros: r.totalErros,
        relatorioErros: errosDetalhe as never,
      },
    })
    await payload.create({
      collection: 'crm-auditoria',
      data: {
        acao: 'importacao',
        colecao: 'crm-lotes-importacao',
        documentoId: String(loteId),
        campos: { criados: r.criados, atualizados: r.atualizados, erros: r.totalErros } as never,
        usuario: opts.usuario?.id,
        usuarioNome: opts.usuario?.name || opts.usuario?.email || 'script',
      },
    })
  }

  return { relatorio, loteId, modelo, regraSalva: salva }
}
