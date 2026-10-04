import type { Despesa } from '@/payload-types'

import { MESES } from '@/collections/Orcamento/meses'

export type Status = 'ok' | 'atencao' | 'estourado' | 'sem-orcamento'

export type Linha = {
  id: string
  nome: string
  orcadoAno: number
  orcadoAcum: number
  realizadoAcum: number
  /** previsão (ou orçado, sem previsão) dos meses depois do último mês fechado */
  restante: number
  /** realizado acumulado + restante */
  projecao: number
  desvio: number
  execucao: number | null
  status: Status
}

export type LinhaCentro = Linha & { contas: Linha[] }

/** Uma despesa com o valor de cada mês: realizado nos meses fechados, projeção nos seguintes */
export type ItemMensal = {
  id: string
  descricao: string
  fornecedor: string | null
  valores: number[]
}

export type GrupoConta = { id: string; nome: string; itens: ItemMensal[]; subtotal: number[] }

export type Limites = { alerta: number; limite: number }

export const statusDe = (orcado: number, realizado: number, { alerta, limite }: Limites): Status => {
  if (orcado <= 0) return 'sem-orcamento'
  const pct = (realizado / orcado) * 100
  if (pct > limite) return 'estourado'
  if (pct >= alerta) return 'atencao'
  return 'ok'
}

const nomeDe = (rel: unknown, fallback: string) =>
  rel && typeof rel === 'object' && 'nome' in rel ? String((rel as { nome: string }).nome) : fallback

const idDe = (rel: unknown) =>
  rel && typeof rel === 'object' && 'id' in rel ? String((rel as { id: number }).id) : String(rel ?? '')

const valor = (v: unknown) => Number(v) || 0
const preenchido = (v: unknown) => v !== null && v !== undefined && v !== ''

const novaLinha = (id: string, nome: string): Linha => ({
  id,
  nome,
  orcadoAno: 0,
  orcadoAcum: 0,
  realizadoAcum: 0,
  restante: 0,
  projecao: 0,
  desvio: 0,
  execucao: null,
  status: 'sem-orcamento',
})

const fechar = (linha: Linha, limites: Limites) => {
  linha.projecao = linha.realizadoAcum + linha.restante
  linha.desvio = linha.realizadoAcum - linha.orcadoAcum
  linha.execucao = linha.orcadoAcum > 0 ? (linha.realizadoAcum / linha.orcadoAcum) * 100 : null
  linha.status = statusDe(linha.orcadoAcum, linha.realizadoAcum, limites)
}

export function calcularPainel(despesas: Despesa[], mesRef: number, limites: Limites) {
  const orcadoMes = MESES.map(() => 0)
  const realizadoMes = MESES.map(() => 0)
  const projecaoMes = MESES.map(() => 0)
  const centros = new Map<string, LinhaCentro>()
  const fornecedores = new Map<string, { nome: string; realizado: number; restante: number }>()
  const grupos = new Map<string, GrupoConta>()

  for (const d of despesas) {
    let oAno = 0
    let oAcum = 0
    let rAcum = 0
    let restante = 0
    const valores = MESES.map(() => 0)

    MESES.forEach((mes, i) => {
      const o = valor(d.orcado?.[mes.key])
      const r = valor(d.realizado?.[mes.key])
      const pRaw = d.previsto?.[mes.key]
      const p = valor(pRaw)

      orcadoMes[i] += o
      realizadoMes[i] += r
      oAno += o

      if (i < mesRef) {
        oAcum += o
        rAcum += r
        projecaoMes[i] += r
        valores[i] = r
      } else {
        const futuro = preenchido(pRaw) ? p : o
        restante += futuro
        projecaoMes[i] += futuro
        valores[i] = futuro
      }
    })

    const centroId = idDe(d.centroDeCusto) || 'sem-centro'
    let centro = centros.get(centroId)
    if (!centro) {
      centro = { ...novaLinha(centroId, nomeDe(d.centroDeCusto, 'Sem centro de custo')), contas: [] }
      centros.set(centroId, centro)
    }
    const contaId = idDe(d.conta)
    let conta = centro.contas.find((c) => c.id === contaId)
    if (!conta) {
      conta = novaLinha(contaId, nomeDe(d.conta, 'Conta removida'))
      centro.contas.push(conta)
    }

    for (const linha of [centro, conta]) {
      linha.orcadoAno += oAno
      linha.orcadoAcum += oAcum
      linha.realizadoAcum += rAcum
      linha.restante += restante
    }

    let grupo = grupos.get(contaId)
    if (!grupo) {
      grupo = { id: contaId, nome: conta.nome, itens: [], subtotal: MESES.map(() => 0) }
      grupos.set(contaId, grupo)
    }
    grupo.itens.push({
      id: String(d.id),
      descricao: d.descricao,
      fornecedor: d.fornecedor ? nomeDe(d.fornecedor, '') || null : null,
      valores,
    })
    valores.forEach((v, i) => (grupo.subtotal[i] += v))

    const fornecedorId = idDe(d.fornecedor) || 'sem-fornecedor'
    const f = fornecedores.get(fornecedorId) ?? {
      nome: nomeDe(d.fornecedor, 'Sem fornecedor'),
      realizado: 0,
      restante: 0,
    }
    f.realizado += rAcum
    f.restante += restante
    fornecedores.set(fornecedorId, f)
  }

  const linhasCentros = [...centros.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  for (const centro of linhasCentros) {
    fechar(centro, limites)
    centro.contas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    centro.contas.forEach((conta) => fechar(conta, limites))
  }

  const soma = (arr: number[], de = 0, ate = 12) => arr.slice(de, ate).reduce((a, b) => a + b, 0)
  const orcadoAno = soma(orcadoMes)
  const orcadoAcum = soma(orcadoMes, 0, mesRef)
  const realizadoAcum = soma(realizadoMes, 0, mesRef)
  const restante = soma(projecaoMes, mesRef)
  const projecao = realizadoAcum + restante

  const contas = [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const totalItem = (item: ItemMensal) => item.valores.reduce((a, b) => a + b, 0)
  contas.forEach((g) => g.itens.sort((a, b) => totalItem(b) - totalItem(a)))

  return {
    orcadoMes,
    projecaoMes,
    contas,
    realizadoMes,
    orcadoAno,
    orcadoAcum,
    realizadoAcum,
    restante,
    projecao,
    mediaMensal: mesRef > 0 ? realizadoAcum / mesRef : 0,
    centros: linhasCentros,
    fornecedores: [...fornecedores.values()]
      .filter((f) => f.realizado > 0 || f.restante > 0)
      .sort((a, b) => b.realizado + b.restante - (a.realizado + a.restante))
      .slice(0, 6),
  }
}
