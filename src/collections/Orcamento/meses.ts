export const MESES = [
  { key: 'jan', label: 'Jan', nome: 'Janeiro' },
  { key: 'fev', label: 'Fev', nome: 'Fevereiro' },
  { key: 'mar', label: 'Mar', nome: 'Março' },
  { key: 'abr', label: 'Abr', nome: 'Abril' },
  { key: 'mai', label: 'Mai', nome: 'Maio' },
  { key: 'jun', label: 'Jun', nome: 'Junho' },
  { key: 'jul', label: 'Jul', nome: 'Julho' },
  { key: 'ago', label: 'Ago', nome: 'Agosto' },
  { key: 'set', label: 'Set', nome: 'Setembro' },
  { key: 'out', label: 'Out', nome: 'Outubro' },
  { key: 'nov', label: 'Nov', nome: 'Novembro' },
  { key: 'dez', label: 'Dez', nome: 'Dezembro' },
] as const

export type MesKey = (typeof MESES)[number]['key']

export type ValoresMensais = Partial<Record<MesKey, number | null>>

export const somaMeses = (valores: ValoresMensais | null | undefined, ate = 12) =>
  MESES.slice(0, ate).reduce((total, mes) => total + (Number(valores?.[mes.key]) || 0), 0)
