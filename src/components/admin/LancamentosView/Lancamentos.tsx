'use client'

import { toast } from '@payloadcms/ui'
import { usePathname, useRouter } from 'next/navigation'
import React, { useMemo, useState } from 'react'

import { MESES } from '@/collections/Orcamento/meses'

export type LinhaLancamento = {
  id: number
  descricao: string
  conta: string
  fornecedor: string | null
  orcado: number[]
  previsto: (number | null)[]
  realizado: (number | null)[]
}

type Campo = 'previsto' | 'realizado'
type Edicoes = Record<number, Partial<Record<Campo, string>>>

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// "1.234,56" ou "1234.56" → número; vazio → null
const paraNumero = (texto: string): number | null => {
  const t = texto.trim()
  if (!t) return null
  const normalizado = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : NaN
}
const paraTexto = (n: number | null) =>
  n === null || n === undefined ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function Lancamentos({
  ano,
  anos,
  mesInicial,
  mesFechado,
  linhas,
  podeEditar,
  apiRoute,
  adminRoute,
}: {
  ano: number
  anos: number[]
  mesInicial: number
  mesFechado: number | null
  linhas: LinhaLancamento[]
  podeEditar: boolean
  apiRoute: string
  adminRoute: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [mes, setMes] = useState(mesInicial)
  const [edicoes, setEdicoes] = useState<Edicoes>({})
  const [salvando, setSalvando] = useState(false)
  const i = mes - 1
  const nomeMes = MESES[i].nome

  const valorEm = (ed: Edicoes, l: LinhaLancamento, campo: Campo): string =>
    ed[l.id]?.[campo] ?? paraTexto(l[campo][i])
  const valor = (l: LinhaLancamento, campo: Campo) => valorEm(edicoes, l, campo)

  const alteradasEm = (ed: Edicoes) =>
    linhas.filter((l) =>
      (['previsto', 'realizado'] as Campo[]).some((c) => {
        const e = ed[l.id]?.[c]
        return e !== undefined && paraNumero(e) !== l[c][i]
      }),
    )
  const alteradas = useMemo(() => alteradasEm(edicoes), [edicoes, linhas, i]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = (campo: Campo | 'orcado') =>
    linhas.reduce((s, l) => {
      if (campo === 'orcado') return s + l.orcado[i]
      const n = paraNumero(valor(l, campo))
      return s + (n && Number.isFinite(n) ? n : 0)
    }, 0)

  const editar = (id: number, campo: Campo, texto: string) =>
    setEdicoes((e) => ({ ...e, [id]: { ...e[id], [campo]: texto } }))

  const trocarMes = (novo: number) => {
    if (alteradas.length && !window.confirm('Há valores não salvos neste mês. Trocar de mês e descartar?')) return
    setEdicoes({})
    setMes(novo)
  }

  // Realizado vazio recebe a previsão (ou o orçado, sem previsão) — atalho para fechar o mês
  const comRealizadoPreenchido = (ed: Edicoes): Edicoes => {
    const novas: Edicoes = { ...ed }
    for (const l of linhas) {
      if (paraNumero(valorEm(ed, l, 'realizado')) !== null) continue
      const base = paraNumero(valorEm(ed, l, 'previsto')) ?? l.orcado[i]
      if (base) novas[l.id] = { ...novas[l.id], realizado: paraTexto(base) }
    }
    return novas
  }
  const preencherRealizado = () => setEdicoes(comRealizadoPreenchido(edicoes))

  // Despesas com previsão (ou orçado) no mês e sem realizado lançado
  const semRealizado = (ed: Edicoes) =>
    linhas.filter(
      (l) =>
        paraNumero(valorEm(ed, l, 'realizado')) === null &&
        (paraNumero(valorEm(ed, l, 'previsto')) || l.orcado[i]),
    )

  const salvar = async (ed: Edicoes = edicoes) => {
    const alteradas = alteradasEm(ed)
    const valor = (l: LinhaLancamento, c: Campo) => valorEm(ed, l, c)
    const edicoes = ed
    const invalidas = alteradas.filter((l) =>
      (['previsto', 'realizado'] as Campo[]).some((c) => Number.isNaN(paraNumero(valor(l, c)))),
    )
    if (invalidas.length) {
      toast.error(`Valor inválido em: ${invalidas.map((l) => l.descricao).join(', ')}`)
      return false
    }
    setSalvando(true)
    let erros = 0
    for (const l of alteradas) {
      // Envia o grupo inteiro (os 12 meses) para não apagar os outros meses
      const corpo: Record<string, Record<string, number | null>> = {}
      for (const c of ['previsto', 'realizado'] as Campo[]) {
        if (edicoes[l.id]?.[c] === undefined) continue
        corpo[c] = Object.fromEntries(
          MESES.map((m, k) => [m.key, k === i ? paraNumero(valor(l, c)) : l[c][k]]),
        )
      }
      const r = await fetch(`${apiRoute}/despesas/${l.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      if (!r.ok) erros++
    }
    setSalvando(false)
    if (erros) {
      toast.error(`${erros} despesa(s) não foram salvas. Tente de novo.`)
      return false
    }
    toast.success(`${nomeMes}: ${alteradas.length} despesa(s) salvas.`)
    setEdicoes({})
    router.refresh()
    return true
  }

  const efetivar = async () => {
    let ed = edicoes
    const faltando = semRealizado(ed)
    if (faltando.length) {
      const nomes = faltando.slice(0, 5).map((l) => `• ${l.descricao}`).join('\n')
      const mais = faltando.length > 5 ? `\n… e mais ${faltando.length - 5}` : ''
      if (
        !window.confirm(
          `${faltando.length} despesa(s) estão SEM REALIZADO em ${nomeMes.toLowerCase()}:\n${nomes}${mais}\n\n` +
            `Depois de efetivado, o painel só mostra o realizado — esse valor ficaria zerado no gráfico.\n\n` +
            `OK = usar a previsão como realizado e efetivar\nCancelar = voltar e lançar o realizado`,
        )
      )
        return
      ed = comRealizadoPreenchido(ed)
      setEdicoes(ed)
    } else if (
      !window.confirm(
        `Efetivar ${nomeMes}/${ano}? O realizado até ${nomeMes.toLowerCase()} passa a ser considerado completo e o painel usa a previsão só dos meses seguintes.`,
      )
    )
      return
    if (alteradasEm(ed).length && !(await salvar(ed))) return
    const r = await fetch(`${apiRoute}/globals/configuracao-orcamento`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anoVigente: ano, mesFechado: String(mes) }),
    })
    if (!r.ok) {
      toast.error('Não foi possível efetivar o mês.')
      return
    }
    toast.success(`${nomeMes} efetivado.`)
    const proximo = Math.min(mes + 1, 12)
    setMes(proximo)
    router.refresh()
  }

  // Reabrir um mês efetivado: o último fechado passa a ser o anterior (reabre este e os seguintes)
  const reabrir = async () => {
    const seguintes = mesFechado !== null && mesFechado > mes ? ` e os meses seguintes até ${MESES[mesFechado - 1].nome.toLowerCase()}` : ''
    if (
      !window.confirm(
        `Reabrir ${nomeMes}/${ano}${seguintes}? O painel volta a usar a previsão a partir de ${nomeMes.toLowerCase()} até você efetivar de novo. Nenhum valor lançado é apagado.`,
      )
    )
      return
    setSalvando(true)
    const r = await fetch(`${apiRoute}/globals/configuracao-orcamento`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anoVigente: ano, mesFechado: mes > 1 ? String(mes - 1) : null }),
    })
    setSalvando(false)
    if (!r.ok) {
      toast.error('Não foi possível reabrir o mês.')
      return
    }
    toast.success(`${nomeMes} reaberto.`)
    router.refresh()
  }

  const fechado = mesFechado !== null && mes <= mesFechado

  return (
    <div className="lanc">
      <header className="orc-header">
        <div>
          <h1>Lançamentos do mês</h1>
          <p className="orc-sub">
            Lance a previsão e o realizado de cada despesa. Último mês efetivado:{' '}
            <strong>{mesFechado ? `${MESES[mesFechado - 1].nome}/${ano}` : 'nenhum'}</strong>.
          </p>
        </div>
        <div className="lanc__filtros">
          <label>
            Ano
            <select
              value={ano}
              onChange={(e) => router.push(`${pathname}?ano=${e.target.value}&mes=${mes}`)}
            >
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <nav className="lanc__meses" aria-label="Mês">
        {MESES.map((m, k) => {
          const n = k + 1
          return (
            <button
              key={m.key}
              type="button"
              className={[n === mes && 'is-ativo', mesFechado !== null && n <= mesFechado && 'is-fechado']
                .filter(Boolean)
                .join(' ')}
              onClick={() => trocarMes(n)}
              title={mesFechado !== null && n <= mesFechado ? 'Mês efetivado' : 'Mês em aberto'}
            >
              {m.label}
            </button>
          )
        })}
      </nav>

      <div className="lanc__status">
        <span className={fechado ? 'lanc__tag lanc__tag--fechado' : 'lanc__tag'}>
          {nomeMes}: {fechado ? 'efetivado' : 'em aberto'}
        </span>
        {podeEditar && (
          <div className="lanc__acoes">
            <button type="button" className="lanc__btn" onClick={preencherRealizado} disabled={salvando}>
              Preencher realizado vazio com a previsão
            </button>
            <button
              type="button"
              className="lanc__btn lanc__btn--primario"
              onClick={() => salvar()}
              disabled={salvando || alteradas.length === 0}
            >
              {salvando ? 'Salvando…' : `Salvar${alteradas.length ? ` (${alteradas.length})` : ''}`}
            </button>
            {fechado ? (
              <button type="button" className="lanc__btn lanc__btn--reabrir" onClick={reabrir} disabled={salvando}>
                Reabrir {nomeMes.toLowerCase()}
              </button>
            ) : (
              <button type="button" className="lanc__btn lanc__btn--efetivar" onClick={efetivar} disabled={salvando}>
                Efetivar {nomeMes.toLowerCase()}
              </button>
            )}
          </div>
        )}
      </div>

      {fechado && semRealizado(edicoes).length > 0 && (
        <p className="lanc__alerta" role="alert">
          {nomeMes} está efetivado, mas {semRealizado(edicoes).length} despesa(s) estão sem realizado — no painel elas
          aparecem zeradas. Lance o realizado e salve (ou use “Preencher realizado vazio com a previsão”).
        </p>
      )}

      {linhas.length === 0 ? (
        <p className="orc-sub">
          Nenhuma despesa cadastrada em {ano}.{' '}
          {podeEditar && <a href={`${adminRoute}/collections/despesas/create`}>Cadastrar despesa</a>}
        </p>
      ) : (
        <div className="lanc__tabela-wrap">
          <table className="lanc__tabela">
            <thead>
              <tr>
                <th>Despesa</th>
                <th>Conta</th>
                <th className="num">Orçado</th>
                <th className="num">Previsão</th>
                <th className="num">Realizado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const mudou = alteradas.includes(l)
                return (
                  <tr key={l.id} className={mudou ? 'is-alterada' : undefined}>
                    <td>
                      <a href={`${adminRoute}/collections/despesas/${l.id}`}>{l.descricao}</a>
                      {l.fornecedor && <small>{l.fornecedor}</small>}
                    </td>
                    <td className="lanc__conta">{l.conta}</td>
                    <td className="num">{l.orcado[i] ? brl.format(l.orcado[i]) : '—'}</td>
                    {(['previsto', 'realizado'] as Campo[]).map((c) => (
                      <td key={c} className="num">
                        <input
                          inputMode="decimal"
                          placeholder="0,00"
                          value={valor(l, c)}
                          disabled={!podeEditar || salvando}
                          onChange={(e) => editar(l.id, c, e.target.value)}
                          aria-label={`${c === 'previsto' ? 'Previsão' : 'Realizado'} de ${l.descricao}`}
                        />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total de {nomeMes.toLowerCase()}</td>
                <td className="num">{brl.format(total('orcado'))}</td>
                <td className="num">{brl.format(total('previsto'))}</td>
                <td className="num">{brl.format(total('realizado'))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="orc-sub lanc__dica">
        Para incluir uma despesa nova (ex.: um fornecedor que começou em outubro), use{' '}
        <a href={`${adminRoute}/collections/despesas/create`}>Despesas → Criar nova</a>.
      </p>
    </div>
  )
}
