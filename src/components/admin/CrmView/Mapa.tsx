'use client'

import React, { useMemo, useState } from 'react'

import statesData from '@/components/BrazilMap/brazil-states.json'
import { FAROL, type ContagemFarol, type DadosEstado } from './farol'

const NOMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}

const nf = (n: number) => n.toLocaleString('pt-BR')

// Cor do estado: do creme ao laranja Wsoft, conforme a quantidade de leads
function corEstado(total: number, max: number) {
  if (!total) return '#EEF0F2'
  const t = Math.sqrt(total / Math.max(max, 1))
  const de = [253, 236, 220]
  const ate = [244, 121, 31]
  const c = de.map((v, i) => Math.round(v + (ate[i] - v) * t))
  return `rgb(${c.join(',')})`
}

function BarraFarol({ c }: { c: ContagemFarol }) {
  return (
    <div className="crm-farol__barra" aria-hidden>
      {FAROL.map((f) =>
        c[f.key] ? (
          <span key={f.key} style={{ width: `${(c[f.key] / c.total) * 100}%`, background: f.cor }} />
        ) : null,
      )}
    </div>
  )
}

function Luzes({ c }: { c: ContagemFarol }) {
  return (
    <div className="crm-farol__luzes">
      {FAROL.map((f) => (
        <span key={f.key} className="crm-farol__luz" title={f.label}>
          <i style={{ background: f.cor, opacity: c[f.key] ? 1 : 0.25 }} />
          {nf(c[f.key])}
        </span>
      ))}
    </div>
  )
}

export function Mapa({ porUf, adminRoute }: { porUf: Record<string, DadosEstado>; adminRoute: string }) {
  const ufs = Object.keys(porUf).sort((a, b) => porUf[b].total - porUf[a].total)
  const [selecionada, setSelecionada] = useState<string | null>(ufs[0] ?? null)
  const [hover, setHover] = useState<{ uf: string; x: number; y: number } | null>(null)
  const [todas, setTodas] = useState(false)
  const max = Math.max(0, ...Object.values(porUf).map((e) => e.total))

  const cidades = useMemo(() => {
    const e = selecionada ? porUf[selecionada] : undefined
    if (!e) return []
    return Object.entries(e.cidades).sort((a, b) => b[1].total - a[1].total)
  }, [porUf, selecionada])

  const estadoSel = selecionada ? porUf[selecionada] : undefined
  const visiveis = todas ? cidades : cidades.slice(0, 12)
  const listaEmpresas = (uf: string, cidade?: string) =>
    `${adminRoute}/collections/crm-empresas?where[uf][equals]=${encodeURIComponent(uf)}` +
    (cidade ? `&where[cidade][equals]=${encodeURIComponent(cidade)}` : '')

  return (
    <div className="crm-mapa">
      <div className="crm-mapa__topo">
        <h2>Leads por estado</h2>
        <div className="crm-farol__legenda">
          {FAROL.map((f) => (
            <span key={f.key}>
              <i style={{ background: f.cor }} />
              {f.label}
            </span>
          ))}
        </div>
      </div>

      <div className="crm-mapa__svg" onMouseLeave={() => setHover(null)}>
        <svg viewBox={statesData.viewBox} role="img" aria-label="Mapa do Brasil com a quantidade de leads por estado">
          {statesData.locations.map((s) => {
            const uf = s.id.toUpperCase()
            const total = porUf[uf]?.total ?? 0
            const ativo = uf === selecionada
            return (
              <path
                key={s.id}
                d={s.path}
                fill={corEstado(total, max)}
                stroke={ativo ? '#9A3F05' : '#FFFFFF'}
                strokeWidth={ativo ? 2.2 : 1}
                style={{ cursor: total ? 'pointer' : 'default', transition: 'fill .15s' }}
                onClick={() => total && setSelecionada(uf)}
                onMouseMove={(ev) => {
                  const r = (ev.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                  setHover({ uf, x: ev.clientX - r.left, y: ev.clientY - r.top })
                }}
              />
            )
          })}
        </svg>
        {hover && (
          <div className="crm-mapa__tip" style={{ left: hover.x + 14, top: hover.y + 8 }}>
            <strong>{NOMES[hover.uf] ?? hover.uf}</strong>
            {porUf[hover.uf] ? (
              <>
                <span>{nf(porUf[hover.uf].total)} leads</span>
                {FAROL.map((f) => (
                  <span key={f.key} className="crm-mapa__tip-linha">
                    <i style={{ background: f.cor }} />
                    {f.label}: {nf(porUf[hover.uf][f.key])}
                  </span>
                ))}
              </>
            ) : (
              <span>Sem leads</span>
            )}
          </div>
        )}
      </div>

      {ufs.length > 1 && (
        <div className="crm-mapa__ufs">
          {ufs.map((uf) => (
            <button
              key={uf}
              type="button"
              className={uf === selecionada ? 'is-ativo' : undefined}
              onClick={() => setSelecionada(uf)}
            >
              {uf} <small>{nf(porUf[uf].total)}</small>
            </button>
          ))}
        </div>
      )}

      {estadoSel && selecionada ? (
        <div className="crm-cidades">
          <div className="crm-cidades__topo">
            <a href={listaEmpresas(selecionada)}>
              <strong>{NOMES[selecionada] ?? selecionada}</strong> · {nf(estadoSel.total)} leads em{' '}
              {nf(cidades.length)} {cidades.length === 1 ? 'cidade' : 'cidades'}
            </a>
            <Luzes c={estadoSel} />
          </div>
          <ul>
            {visiveis.map(([cidade, c]) => (
              <li key={cidade}>
                <a href={listaEmpresas(selecionada, cidade)} className="crm-cidades__nome">
                  {cidade}
                </a>
                <BarraFarol c={c} />
                <Luzes c={c} />
              </li>
            ))}
          </ul>
          {cidades.length > 12 && (
            <button type="button" className="crm-cidades__mais" onClick={() => setTodas(!todas)}>
              {todas ? 'Mostrar menos' : `Ver todas as ${nf(cidades.length)} cidades`}
            </button>
          )}
        </div>
      ) : (
        <p className="crm-mapa__vazio">Quando houver leads importados, o mapa mostra cada estado e suas cidades.</p>
      )}
    </div>
  )
}
