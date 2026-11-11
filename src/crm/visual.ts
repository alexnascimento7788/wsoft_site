// Cores dos status do lead (etiquetas na lista, na ficha e no Meu dia). Sem dependências de servidor.

export const COR_STATUS: Record<string, string> = {
  na_fila: '#F4791F',
  em_contato: '#2563EB',
  retornar_depois: '#7C3AED',
  qualificado: '#0D9488',
  apresentacao_agendada: '#CA8A04',
  apresentacao_feita: '#B45309',
  venda_realizada: '#16A34A',
  venda_nao_realizada: '#DC2626',
  descartado: '#6B7280',
}

export const corDoStatus = (status: string | null | undefined) => COR_STATUS[status ?? ''] ?? '#6B7280'

export const iniciais = (nome: string | null | undefined) =>
  (nome ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?'

export const formatarTelefone = (n: string) =>
  n.length === 11
    ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
    : n.length === 10
      ? `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
      : n

// Situação da linha na lista de Empresas (faixa colorida + legenda)
export const SITUACOES = [
  { valor: 'nao_contatado', rotulo: 'Não contatado', cor: '#F4791F' },
  { valor: 'em_contato', rotulo: 'Em contato', cor: '#2563EB' },
  { valor: 'ganho', rotulo: 'Venda realizada', cor: '#16A34A' },
  { valor: 'perdido', rotulo: 'Perdido / descartado', cor: '#6B7280' },
  { valor: 'nao_contatar', rotulo: 'Não contatar', cor: '#DC2626' },
] as const

export type Situacao = (typeof SITUACOES)[number]['valor']

export function situacaoDaEmpresa(status: string | null | undefined, naoContatar?: boolean | null): Situacao {
  if (naoContatar) return 'nao_contatar'
  if (!status || status === 'na_fila') return 'nao_contatado'
  if (status === 'venda_realizada') return 'ganho'
  if (status === 'venda_nao_realizada' || status === 'descartado') return 'perdido'
  return 'em_contato'
}
