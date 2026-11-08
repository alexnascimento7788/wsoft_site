// Farol do lead (4 etapas), a partir do status
export const FAROL = [
  { key: 'naoContatado', label: 'Não contatado', cor: '#F4791F' },
  { key: 'evoluindo', label: 'Contato evoluindo', cor: '#EAB308' },
  { key: 'sucesso', label: 'Contato com sucesso', cor: '#16A34A' },
  { key: 'naoEfetivado', label: 'Contato não efetivado', cor: '#DC2626' },
] as const

export type FarolKey = (typeof FAROL)[number]['key']
export type ContagemFarol = Record<FarolKey, number> & { total: number }

const POR_STATUS: Record<string, FarolKey> = {
  na_fila: 'naoContatado',
  em_contato: 'evoluindo',
  qualificado: 'evoluindo',
  apresentacao_agendada: 'evoluindo',
  apresentacao_feita: 'evoluindo',
  retornar_depois: 'evoluindo',
  venda_realizada: 'sucesso',
  venda_nao_realizada: 'naoEfetivado',
  descartado: 'naoEfetivado',
}

export const farolDoStatus = (status: string | null | undefined): FarolKey =>
  POR_STATUS[status ?? ''] ?? 'naoContatado'

export const contagemVazia = (): ContagemFarol => ({
  naoContatado: 0,
  evoluindo: 0,
  sucesso: 0,
  naoEfetivado: 0,
  total: 0,
})

export type DadosEstado = ContagemFarol & { cidades: Record<string, ContagemFarol> }

// Agrupa as empresas por UF e cidade, contando cada etapa do farol
export function agruparPorEstado(
  empresas: { uf?: string | null; cidade?: string | null; status?: string | null }[],
) {
  const porUf: Record<string, DadosEstado> = {}
  for (const e of empresas) {
    const uf = (e.uf || '').trim().toUpperCase() || '—'
    const cidade = (e.cidade || '').trim() || 'Sem cidade'
    const f = farolDoStatus(e.status)
    const estado = (porUf[uf] ??= { ...contagemVazia(), cidades: {} })
    const c = (estado.cidades[cidade] ??= contagemVazia())
    estado[f]++
    estado.total++
    c[f]++
    c.total++
  }
  return porUf
}
