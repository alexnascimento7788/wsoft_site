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
