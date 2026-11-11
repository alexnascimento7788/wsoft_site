'use client'

import React, { useEffect, useRef, useState } from 'react'

export type PontoGrafico = { dia: string; meta: number; feito: number; empresas: string[] }

const ALTURA = 220
const M = { topo: 14, dir: 12, base: 26, esq: 30 }
const curto = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
const semana = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' })

// Indicador meta x feito por dia: barras = meta do Meu dia, linha = empresas contatadas.
// Mesma unidade (empresas) num eixo só. Dia sem ação: a linha vai a zero.
export function Grafico({ pontos, hoje }: { pontos: PontoGrafico[]; hoje: string }) {
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(720)
  const [foco, setFoco] = useState<number | null>(null)

  useEffect(() => {
    const el = caixa.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(320, Math.floor(e!.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (pontos.length === 0) return null
  const max = Math.max(5, ...pontos.map((p) => Math.max(p.meta, p.feito)))
  const passo = max <= 6 ? 1 : max <= 12 ? 2 : Math.ceil(max / 5)
  const topoEscala = Math.ceil(max / passo) * passo
  const w = largura - M.esq - M.dir
  const h = ALTURA - M.topo - M.base
  const col = w / pontos.length
  const x = (i: number) => M.esq + col * i + col / 2
  const y = (v: number) => M.topo + h - (v / topoEscala) * h
  const larguraBarra = Math.max(4, Math.min(18, col * 0.45))
  const ticks = Array.from({ length: topoEscala / passo + 1 }, (_, i) => i * passo)
  const cadaRotulo = Math.max(1, Math.ceil(pontos.length / Math.max(4, Math.floor(w / 56))))
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.feito).toFixed(1)}`).join(' ')
  const p = foco !== null ? pontos[foco] : null

  return (
    <div className="meudia-graf">
      <div className="meudia-graf__topo">
        <h3>Meta x feito por dia</h3>
        <span className="meudia-graf__legenda">
          <span>
            <i className="meudia-graf__chave meudia-graf__chave--meta" /> Meta do Meu dia
          </span>
          <span>
            <i className="meudia-graf__chave meudia-graf__chave--feito" /> Feito (empresas contatadas)
          </span>
        </span>
      </div>
      <div className="meudia-graf__area" ref={caixa} onMouseLeave={() => setFoco(null)}>
        <svg width={largura} height={ALTURA} role="img" aria-label="Meta e feito por dia nos últimos 30 dias">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.esq} x2={largura - M.dir} y1={y(t)} y2={y(t)} className="meudia-graf__grade" />
              <text x={M.esq - 8} y={y(t) + 4} textAnchor="end" className="meudia-graf__eixo">
                {t}
              </text>
            </g>
          ))}
          {foco !== null && (
            <rect x={M.esq + col * foco} y={M.topo} width={col} height={h} className="meudia-graf__foco" rx={4} />
          )}
          {pontos.map((pt, i) =>
            pt.meta > 0 ? (
              <path
                key={`b${pt.dia}`}
                className="meudia-graf__barra"
                d={(() => {
                  const bx = x(i) - larguraBarra / 2
                  const by = y(pt.meta)
                  const bh = y(0) - by
                  const r = Math.min(4, bh, larguraBarra / 2)
                  return `M${bx},${y(0)} V${by + r} Q${bx},${by} ${bx + r},${by} H${bx + larguraBarra - r} Q${bx + larguraBarra},${by} ${bx + larguraBarra},${by + r} V${y(0)} Z`
                })()}
              />
            ) : null,
          )}
          <path d={linha} className="meudia-graf__linha" />
          {pontos.map((pt, i) => (
            <circle
              key={`c${pt.dia}`}
              cx={x(i)}
              cy={y(pt.feito)}
              r={foco === i ? 5 : 4}
              className={`meudia-graf__ponto${pt.feito === 0 && pt.dia < hoje ? ' meudia-graf__ponto--zero' : ''}`}
            />
          ))}
          {pontos.map((pt, i) =>
            i % cadaRotulo === 0 || i === pontos.length - 1 ? (
              <text key={`x${pt.dia}`} x={x(i)} y={ALTURA - 8} textAnchor="middle" className="meudia-graf__eixo">
                {pt.dia === hoje ? 'hoje' : curto(pt.dia)}
              </text>
            ) : null,
          )}
          {pontos.map((pt, i) => (
            <rect
              key={`h${pt.dia}`}
              x={M.esq + col * i}
              y={M.topo}
              width={col}
              height={h}
              fill="transparent"
              onMouseEnter={() => setFoco(i)}
            />
          ))}
        </svg>
        {p && foco !== null && (
          <div
            className="meudia-graf__dica"
            style={{ left: Math.min(Math.max(x(foco) - 110, 0), largura - 230), top: 4 }}
            role="status"
          >
            <strong>
              {semana(p.dia)} {curto(p.dia)}
            </strong>
            <span>
              <i className="meudia-graf__chave meudia-graf__chave--meta" /> Meta: {p.meta}
            </span>
            <span>
              <i className="meudia-graf__chave meudia-graf__chave--feito" /> Feito: {p.feito}
            </span>
            {p.empresas.length > 0 ? (
              <ul>
                {p.empresas.slice(0, 8).map((e) => (
                  <li key={e}>{e}</li>
                ))}
                {p.empresas.length > 8 && <li>+ {p.empresas.length - 8} outra(s)</li>}
              </ul>
            ) : (
              <em>{p.dia < hoje ? 'Nenhuma ação neste dia' : 'Ainda sem ação hoje'}</em>
            )}
          </div>
        )}
      </div>
      <details className="meudia-graf__tabela">
        <summary>Ver em tabela</summary>
        <table>
          <thead>
            <tr>
              <th>Dia</th>
              <th>Meta</th>
              <th>Feito</th>
              <th>Empresas</th>
            </tr>
          </thead>
          <tbody>
            {pontos.map((pt) => (
              <tr key={pt.dia}>
                <td>
                  {semana(pt.dia)} {curto(pt.dia)}
                </td>
                <td>{pt.meta}</td>
                <td>{pt.feito}</td>
                <td>{pt.empresas.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
