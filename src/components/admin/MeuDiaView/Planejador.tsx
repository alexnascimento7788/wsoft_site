'use client'

import { toast, useConfig } from '@payloadcms/ui'
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

export type MarcaDia = { total: number; feitos: number }

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const pad = (n: number) => String(n).padStart(2, '0')

// Calendário do mês + quantidade de empresas + botão que sorteia o dia
export function Planejador({
  dia,
  hoje,
  marcas,
  quantidadePadrao,
  podeEditar,
  usuario,
}: {
  dia: string
  hoje: string
  marcas: Record<string, MarcaDia>
  quantidadePadrao: number
  podeEditar: boolean
  usuario: number | null
}) {
  const {
    config: { serverURL, routes },
  } = useConfig()
  const router = useRouter()
  const [mes, setMes] = useState(dia.slice(0, 7))
  const [quantidade, setQuantidade] = useState(quantidadePadrao)
  const [enviando, setEnviando] = useState(false)

  const [ano, m] = mes.split('-').map(Number) as [number, number]
  const primeiro = new Date(Date.UTC(ano, m - 1, 1)).getUTCDay()
  const diasNoMes = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  const celulas: (string | null)[] = [
    ...Array.from({ length: primeiro }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => `${mes}-${pad(i + 1)}`),
  ]
  const mudarMes = (delta: number) => {
    const d = new Date(Date.UTC(ano, m - 1 + delta, 1))
    setMes(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`)
  }
  const irPara = (d: string) =>
    router.push(`${routes.admin}/crm/meu-dia?dia=${d}${usuario ? `&usuario=${usuario}` : ''}`)

  const passado = dia < hoje
  const montar = async () => {
    setEnviando(true)
    const r = await fetch(`${serverURL ?? ''}${routes.api}/crm-dias/planejar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dia, quantidade }),
    })
    setEnviando(false)
    const json = await r.json().catch(() => ({}))
    if (!r.ok) return toast.error(json.message || 'Não foi possível montar o dia.')
    if (json.adicionadas === 0) toast.info(json.total ? `O dia já tem ${json.total} empresa(s).` : 'Nenhuma empresa disponível para sortear.')
    else
      toast.success(
        `${json.adicionadas} empresa(s) sorteada(s) para o seu dia.${json.semMais ? ' Não há mais empresas disponíveis no momento.' : ''}`,
      )
    router.refresh()
  }

  return (
    <section className="meudia__plan">
      <div className="meudia__cal">
        <div className="meudia__cal-topo">
          <button type="button" className="crm-btn crm-btn--icone" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
            <ChevronLeft size={14} />
          </button>
          <strong>
            {MESES[m - 1]} {ano}
          </strong>
          <button type="button" className="crm-btn crm-btn--icone" onClick={() => mudarMes(1)} aria-label="Próximo mês">
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="meudia__cal-grade" role="grid">
          {SEMANA.map((s, i) => (
            <span key={i} className="meudia__cal-sem">
              {s}
            </span>
          ))}
          {celulas.map((d, i) => {
            if (!d) return <span key={`v${i}`} />
            const marca = marcas[d]
            const classes = [
              'meudia__cal-dia',
              d === dia && 'meudia__cal-dia--escolhido',
              d === hoje && 'meudia__cal-dia--hoje',
              d < hoje && 'meudia__cal-dia--passado',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={d}
                type="button"
                className={classes}
                onClick={() => irPara(d)}
                title={marca ? `${marca.feitos} de ${marca.total} feita(s)` : undefined}
              >
                {Number(d.slice(8))}
                {marca && (
                  <span
                    className={`meudia__cal-marca${marca.feitos >= marca.total ? ' meudia__cal-marca--ok' : ''}`}
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </div>
        <button type="button" className="meudia__hoje" onClick={() => irPara(hoje)}>
          Ir para hoje
        </button>
      </div>

      {podeEditar && (
        <div className="meudia__sorteio">
          <label>
            Empresas a prospectar
            <input
              type="number"
              min={1}
              max={50}
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
          <button type="button" className="crm-btn crm-btn--registrar meudia__montar" onClick={montar} disabled={enviando || passado}>
            <Shuffle size={14} /> {enviando ? 'Sorteando…' : 'Montar meu dia'}
          </button>
          <p className="meudia__dica">
            {passado
              ? 'Dia que já passou: só consulta.'
              : 'O sorteio traz primeiro as empresas mais promissoras (prioridade Alta), depois Média e Baixa. Se o dia já tem empresas, completa até a quantidade.'}
          </p>
        </div>
      )}
    </section>
  )
}
