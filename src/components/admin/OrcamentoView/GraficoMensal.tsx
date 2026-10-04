'use client'

import React, { useEffect, useRef, useState } from 'react'

import { MESES } from '@/collections/Orcamento/meses'

import type { ItemMensal } from './dados'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const compacto = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const pct = (v: number) =>
  `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

// Alturas em px reais — o SVG é desenhado na largura medida, então a fonte não escala
const H_LINHA = 78
const GAP = 18
const H_BARRAS = 190
const PAD = { top: 18, right: 12, bottom: 26, left: 58 }
const H = PAD.top + H_LINHA + GAP + H_BARRAS + PAD.bottom

const barra = (x: number, y: number, w: number, h: number) => {
  if (h <= 0.5) return ''
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

const escalaMax = (max: number) => {
  if (max <= 0) return 1000
  const mag = 10 ** Math.floor(Math.log10(max))
  const passo = [1, 2, 2.5, 5, 10].find((p) => p * mag * 4 >= max) ?? 10
  return passo * mag * 4
}

export function GraficoMensal({
  orcado,
  projecao,
  itens,
  mesRef,
}: {
  orcado: number[]
  /** realizado nos meses fechados, previsão nos seguintes */
  projecao: number[]
  itens: ItemMensal[]
  mesRef: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(720)
  const [ativo, setAtivo] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setLargura(Math.max(320, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const temOrcado = orcado.some((v) => v > 0)
  const plotW = largura - PAD.left - PAD.right
  const grupo = plotW / 12
  const barW = Math.min(22, temOrcado ? (grupo - 12) / 2 : grupo * 0.5)
  const cx = (i: number) => PAD.left + grupo * i + grupo / 2

  // faixa de barras
  const baseY = PAD.top + H_LINHA + GAP + H_BARRAS
  const max = escalaMax(Math.max(...orcado, ...projecao))
  const yBar = (v: number) => baseY - (v / max) * H_BARRAS
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i)

  // faixa da linha: variação % sobre o mês anterior (só onde os dois meses têm valor)
  const variacao = projecao.map((v, i) =>
    i > 0 && v > 0 && projecao[i - 1] > 0 ? ((v - projecao[i - 1]) / projecao[i - 1]) * 100 : null,
  )
  const vals = variacao.filter((v): v is number => v !== null)
  const vMax = Math.max(10, ...vals.map(Math.abs))
  const linhaTop = PAD.top + 14
  const linhaH = H_LINHA - 24
  const yLinha = (v: number) => linhaTop + linhaH / 2 - (v / vMax) * (linhaH / 2)
  const pontos = variacao
    .map((v, i) => (v === null ? null : { i, v, x: cx(i), y: yLinha(v) }))
    .filter((p): p is { i: number; v: number; x: number; y: number } => p !== null)
  const caminho = pontos.map((p, k) => `${k ? 'L' : 'M'}${p.x},${p.y}`).join(' ')

  const itensDoMes = (i: number) =>
    itens
      .filter((it) => it.valores[i] > 0)
      .sort((a, b) => b.valores[i] - a.valores[i])

  const tooltipLeft =
    ativo === null ? 0 : Math.min(Math.max(cx(ativo) + 16, 8), largura - 290)
  const tooltipFlip = ativo !== null && cx(ativo) + 16 + 280 > largura

  return (
    <div className="orc-chart" ref={ref}>
      <div className="orc-chart__legend" aria-hidden>
        {temOrcado && (
          <span>
            <i style={{ background: 'var(--orc-orcado)' }} /> Orçado
          </span>
        )}
        <span>
          <i style={{ background: 'var(--orc-realizado)' }} /> Realizado
        </span>
        <span>
          <i className="orc-swatch-previsto" /> Previsão
        </span>
        <span>
          <i className="orc-swatch-linha" /> Variação sobre o mês anterior
        </span>
      </div>

      <div className="orc-chart__plot">
        <svg
          width={largura}
          height={H}
          viewBox={`0 0 ${largura} ${H}`}
          role="img"
          aria-label="Gasto mensal (realizado e previsão) e variação percentual sobre o mês anterior"
          onMouseLeave={() => setAtivo(null)}
        >
          <defs>
            <pattern
              id="orc-hachura"
              patternUnits="userSpaceOnUse"
              width="6"
              height="6"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" style={{ fill: 'var(--orc-previsto-fundo)' }} />
              <line x1="0" y1="0" x2="0" y2="6" strokeWidth="3" style={{ stroke: 'var(--orc-realizado)' }} />
            </pattern>
          </defs>

          {/* região da previsão: fundo suave em vez de linha pontilhada */}
          {mesRef < 12 && (
            <g>
              <rect
                x={PAD.left + grupo * mesRef}
                y={PAD.top}
                width={grupo * (12 - mesRef)}
                height={baseY - PAD.top}
                className="orc-chart__regiao-previsao"
              />
              <text
                x={largura - PAD.right - 8}
                y={PAD.top + H_LINHA + GAP - 4}
                textAnchor="end"
                className="orc-chart__rotulo"
              >
                Previsão
              </text>
            </g>
          )}

          {/* destaque do mês sob o mouse */}
          {ativo !== null && (
            <rect
              x={PAD.left + grupo * ativo + 2}
              y={PAD.top}
              width={grupo - 4}
              height={baseY - PAD.top}
              rx={6}
              className="orc-chart__destaque"
            />
          )}

          {/* faixa da linha */}
          <text x={PAD.left - 10} y={yLinha(0)} dy="0.32em" textAnchor="end" className="orc-chart__axis">
            0%
          </text>
          <line
            x1={PAD.left}
            x2={largura - PAD.right}
            y1={yLinha(0)}
            y2={yLinha(0)}
            className="orc-chart__grid"
          />
          <path d={caminho} className="orc-chart__linha" />
          {pontos.map((p) => (
            <g key={p.i}>
              <circle cx={p.x} cy={p.y} r={4.5} className="orc-chart__ponto" />
              <text
                x={p.x}
                y={p.v >= 0 ? p.y - 10 : p.y + 18}
                textAnchor="middle"
                className="orc-chart__valor-ponto"
              >
                {pct(p.v)}
              </text>
            </g>
          ))}

          {/* faixa das barras */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={largura - PAD.right}
                y1={yBar(t)}
                y2={yBar(t)}
                className={t === 0 ? 'orc-chart__baseline' : 'orc-chart__grid'}
              />
              <text x={PAD.left - 10} y={yBar(t)} dy="0.32em" textAnchor="end" className="orc-chart__axis">
                {compacto.format(t)}
              </text>
            </g>
          ))}

          {MESES.map((mes, i) => {
            const futuro = i >= mesRef
            const xBar = temOrcado ? cx(i) + 1 : cx(i) - barW / 2
            return (
              <g key={mes.key}>
                {temOrcado && (
                  <path
                    d={barra(cx(i) - barW - 1, yBar(orcado[i]), barW, baseY - yBar(orcado[i]))}
                    style={{ fill: 'var(--orc-orcado)' }}
                  />
                )}
                <path
                  d={barra(xBar, yBar(projecao[i]), barW, baseY - yBar(projecao[i]))}
                  style={{
                    fill: futuro ? 'url(#orc-hachura)' : 'var(--orc-realizado)',
                    stroke: futuro ? 'var(--orc-realizado)' : undefined,
                    strokeWidth: futuro ? 1 : undefined,
                  }}
                />
                <text
                  x={cx(i)}
                  y={H - 8}
                  textAnchor="middle"
                  className={`orc-chart__axis ${ativo === i ? 'orc-chart__axis--ativo' : ''}`}
                >
                  {mes.label}
                </text>
                <rect
                  x={cx(i) - grupo / 2}
                  y={PAD.top}
                  width={grupo}
                  height={baseY - PAD.top}
                  fill="transparent"
                  className="orc-chart__hit"
                  onMouseEnter={() => setAtivo(i)}
                  onFocus={() => setAtivo(i)}
                  onBlur={() => setAtivo(null)}
                  tabIndex={0}
                  aria-label={`${mes.nome}: ${futuro ? 'previsão' : 'realizado'} ${brl.format(projecao[i])}`}
                />
              </g>
            )
          })}
        </svg>

        {ativo !== null && (
          <div
            className="orc-chart__tooltip"
            style={{
              left: tooltipFlip ? undefined : tooltipLeft,
              right: tooltipFlip ? largura - cx(ativo) + 16 : undefined,
              top: PAD.top + H_LINHA,
            }}
          >
            <div className="orc-chart__tooltip-titulo">
              <strong>{MESES[ativo].nome}</strong>
              {ativo >= mesRef && <span className="orc-chart__tag">previsão</span>}
            </div>
            <div className="orc-chart__tooltip-total">
              <span>
                <i
                  className={ativo >= mesRef ? 'orc-swatch-previsto' : undefined}
                  style={ativo >= mesRef ? undefined : { background: 'var(--orc-realizado)' }}
                />
                {ativo >= mesRef ? 'Previsto' : 'Gasto'}
              </span>
              <b>{brl.format(projecao[ativo])}</b>
            </div>
            {temOrcado && (
              <div className="orc-chart__tooltip-linha">
                <span>Orçado</span>
                <b>{brl.format(orcado[ativo])}</b>
              </div>
            )}
            {variacao[ativo] !== null && (
              <div className="orc-chart__tooltip-linha">
                <span>Variação sobre {MESES[ativo - 1].label.toLowerCase()}</span>
                <b>{pct(variacao[ativo] as number)}</b>
              </div>
            )}
            {itensDoMes(ativo).length > 0 ? (
              <ul className="orc-chart__tooltip-itens">
                {itensDoMes(ativo).map((it) => (
                  <li key={it.id}>
                    <span>
                      {it.descricao}
                      {it.fornecedor && it.fornecedor !== it.descricao && (
                        <small>{it.fornecedor}</small>
                      )}
                    </span>
                    <b>{brl.format(it.valores[ativo])}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="orc-chart__tooltip-vazio">Nenhum gasto neste mês.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
