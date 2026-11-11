// "Meu dia" do vendedor: regras puras (sem banco), usadas pelo servidor e pelos testes.

export const FUSO = 'America/Sao_Paulo'
export const QUANTIDADE_PADRAO = 5
export const QUANTIDADE_MAXIMA = 50

const formatoDia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })

// Dia (AAAA-MM-DD) no horário de Brasília
export const diaDe = (data: Date | string) => formatoDia.format(typeof data === 'string' ? new Date(data) : data)
export const hoje = () => diaDe(new Date())

export const diaValido = (dia: unknown): dia is string =>
  typeof dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dia) && !Number.isNaN(Date.parse(`${dia}T12:00:00Z`))

// Fim do dia em Brasília (UTC-3, sem horário de verão desde 2019), para "retornar em" vencido
export const fimDoDia = (dia: string) => new Date(`${dia}T23:59:59.999-03:00`)
export const inicioDoDia = (dia: string) => new Date(`${dia}T00:00:00.000-03:00`)

export const somarDias = (dia: string, n: number) => {
  const d = new Date(`${dia}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const diaDaSemana = (dia: string) => new Date(`${dia}T12:00:00Z`).getUTCDay() // 0 = domingo

export const limitarQuantidade = (q: unknown) => {
  const n = Math.round(Number(q))
  if (!Number.isFinite(n) || n < 1) return QUANTIDADE_PADRAO
  return Math.min(n, QUANTIDADE_MAXIMA)
}

const PESO: Record<string, number> = { alta: 0, media: 1, baixa: 2 }

export type Candidata = { id: number; prioridade?: string | null }

// Sorteio: das mais promissoras para as menos (prioridade Alta → Média → Baixa),
// em ordem aleatória dentro de cada faixa.
export function sortear<T extends Candidata>(candidatas: T[], quantidade: number, aleatorio = Math.random): T[] {
  return candidatas
    .map((c) => ({ c, peso: PESO[c.prioridade ?? ''] ?? 3, sorte: aleatorio() }))
    .sort((a, b) => a.peso - b.peso || a.sorte - b.sorte)
    .slice(0, Math.max(0, quantidade))
    .map((x) => x.c)
}

// Status que entram no sorteio: lead ainda não trabalhado, ou retorno já vencido
export const STATUS_PROSPECCAO = ['na_fila']
export const STATUS_RETORNO = ['retornar_depois', 'em_contato']

export type PontoIndicador = { dia: string; meta: number; feito: number }

// Série do indicador meta x feito. Mostra os dias úteis do período e também fins de semana
// em que houve meta ou ação. Dia sem ação = 0 ("a linha cai no chão").
export function serieIndicador(
  inicio: string,
  fim: string,
  metas: Record<string, number>,
  feitos: Record<string, number>,
): PontoIndicador[] {
  const pontos: PontoIndicador[] = []
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) {
    const meta = metas[d] ?? 0
    const feito = feitos[d] ?? 0
    const util = diaDaSemana(d) !== 0 && diaDaSemana(d) !== 6
    if (util || meta || feito) pontos.push({ dia: d, meta, feito })
  }
  return pontos
}
