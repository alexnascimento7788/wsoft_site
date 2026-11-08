import { describe, expect, it } from 'vitest'

import { Despesas } from '@/collections/Orcamento/Despesas'
import { agruparPorEstado, farolDoStatus } from '@/components/admin/CrmView/farol'

describe('farol do lead', () => {
  it('4 etapas a partir do status', () => {
    expect(farolDoStatus('na_fila')).toBe('naoContatado')
    for (const s of ['em_contato', 'qualificado', 'apresentacao_agendada', 'apresentacao_feita', 'retornar_depois']) {
      expect(farolDoStatus(s)).toBe('evoluindo')
    }
    expect(farolDoStatus('venda_realizada')).toBe('sucesso')
    expect(farolDoStatus('venda_nao_realizada')).toBe('naoEfetivado')
    expect(farolDoStatus('descartado')).toBe('naoEfetivado')
  })

  it('agrupa por estado e cidade', () => {
    const r = agruparPorEstado([
      { uf: 'mg', cidade: 'BOA ESPERANCA', status: 'na_fila' },
      { uf: 'MG', cidade: 'BOA ESPERANCA', status: 'venda_realizada' },
      { uf: 'MG', cidade: 'LAVRAS', status: 'descartado' },
      { uf: 'GO', cidade: 'RIO VERDE', status: 'em_contato' },
      { uf: null, cidade: null, status: 'na_fila' },
    ])
    expect(r.MG).toMatchObject({ total: 3, naoContatado: 1, sucesso: 1, naoEfetivado: 1, evoluindo: 0 })
    expect(r.MG.cidades['BOA ESPERANCA']).toMatchObject({ total: 2, naoContatado: 1, sucesso: 1 })
    expect(r.GO.cidades['RIO VERDE'].evoluindo).toBe(1)
    expect(r['—'].cidades['Sem cidade'].total).toBe(1)
  })
})

describe('orçamento — totais da despesa', () => {
  it('atualização só do realizado mantém os totais de orçado e previsão', async () => {
    const hook = Despesas.hooks!.beforeChange![0] as unknown as (a: object) => Promise<Record<string, number>>
    const originalDoc = { orcado: { jan: 100, fev: 100 }, previsto: { out: 50 }, realizado: { jan: 90 } }
    const data = await hook({ data: { realizado: { jan: 90, fev: 80 } }, originalDoc, req: {} })
    expect(data.totalOrcado).toBe(200)
    expect(data.totalPrevisto).toBe(50)
    expect(data.totalRealizado).toBe(170)
  })
})
