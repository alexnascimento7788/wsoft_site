import { CalendarClock, Target, TrendingUp, Wallet } from 'lucide-react'
import React from 'react'

import { MESES } from '@/collections/Orcamento/meses'

const brl0 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})
const pct = (v: number, sinal = false) =>
  `${sinal && v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

// Mini barras (sem eixos) para dar contexto ao número do card
function MiniBarras({
  valores,
  rotulos,
  previsao = false,
}: {
  valores: number[]
  rotulos: string[]
  previsao?: boolean
}) {
  const max = Math.max(...valores, 1)
  const w = 100 / Math.max(valores.length, 1)
  return (
    <div className="orc-mini" aria-hidden>
      {valores.map((v, i) => (
        <div key={i} className="orc-mini__col" style={{ width: `${w}%` }} title={`${rotulos[i]}: ${brl0.format(v)}`}>
          <div
            className={`orc-mini__barra ${previsao ? 'orc-mini__barra--previsao' : ''} ${
              i === valores.length - 1 && !previsao ? 'orc-mini__barra--ultima' : ''
            }`}
            style={{ height: `${Math.max((v / max) * 100, v > 0 ? 6 : 2)}%` }}
          />
          <span>{rotulos[i]}</span>
        </div>
      ))}
    </div>
  )
}

function Card({
  icone: Icone,
  tom,
  rotulo,
  valor,
  valorClasse = '',
  children,
}: {
  icone: React.ComponentType<{ className?: string }>
  tom: 'laranja' | 'azul' | 'verde' | 'cinza'
  rotulo: string
  valor: React.ReactNode
  valorClasse?: string
  children?: React.ReactNode
}) {
  return (
    <div className={`orc-kpi orc-kpi--${tom}`}>
      <div className="orc-kpi__topo">
        <span className="orc-kpi__icone">
          <Icone className="orc-kpi__svg" />
        </span>
        <span className="orc-kpi__label">{rotulo}</span>
      </div>
      <strong className={`orc-kpi__valor ${valorClasse}`}>{valor}</strong>
      {children}
    </div>
  )
}

export function Kpis({
  ano,
  mesRef,
  realizadoMes,
  projecaoMes,
  realizadoAcum,
  restante,
  projecao,
  orcadoAno,
  mediaMensal,
  linkDespesas,
}: {
  ano: number
  mesRef: number
  realizadoMes: number[]
  projecaoMes: number[]
  realizadoAcum: number
  restante: number
  projecao: number
  orcadoAno: number
  mediaMensal: number
  linkDespesas: string
}) {
  const fechados = realizadoMes.slice(0, mesRef)
  const ultimo = mesRef > 0 ? fechados[mesRef - 1] : 0
  const penultimo = mesRef > 1 ? fechados[mesRef - 2] : 0
  const variacao = penultimo > 0 ? ((ultimo - penultimo) / penultimo) * 100 : null
  const futuros = projecaoMes.slice(mesRef)
  const pctRealizado = projecao > 0 ? (realizadoAcum / projecao) * 100 : 0
  const usoOrcado = orcadoAno > 0 ? (projecao / orcadoAno) * 100 : 0

  return (
    <section className="orc-kpis">
      <Card icone={Wallet} tom="laranja" rotulo="Realizado acumulado" valor={brl0.format(realizadoAcum)}>
        <span className="orc-kpi__info">
          {mesRef > 0 ? (
            <>
              {MESES[mesRef - 1].label}: {brl0.format(ultimo)}
              {variacao !== null && (
                <span className={`orc-chip ${variacao > 0 ? 'orc-chip--alta' : 'orc-chip--baixa'}`}>
                  {variacao > 0 ? '▲' : '▼'} {pct(Math.abs(variacao))}
                </span>
              )}
              <span>média {brl0.format(mediaMensal)}/mês</span>
            </>
          ) : (
            'Nenhum mês fechado ainda'
          )}
        </span>
        {mesRef > 0 && (
          <MiniBarras valores={fechados} rotulos={MESES.slice(0, mesRef).map((m) => m.label[0])} />
        )}
      </Card>

      <Card icone={CalendarClock} tom="azul" rotulo="Previsão até dezembro" valor={brl0.format(restante)}>
        <span className="orc-kpi__info">
          {mesRef < 12
            ? `${MESES[mesRef].nome}: ${brl0.format(projecaoMes[mesRef])}`
            : 'Ano encerrado'}
        </span>
        {mesRef < 12 && (
          <MiniBarras
            valores={futuros}
            rotulos={MESES.slice(mesRef).map((m) => m.label)}
            previsao
          />
        )}
      </Card>

      <Card icone={TrendingUp} tom="verde" rotulo="Projeção do ano" valor={brl0.format(projecao)}>
        <span className="orc-kpi__info">Realizado + previsão</span>
        <div className="orc-progresso" aria-hidden>
          <span className="orc-progresso__realizado" style={{ width: `${pctRealizado}%` }} />
          <span className="orc-progresso__previsto" style={{ width: `${100 - pctRealizado}%` }} />
        </div>
        <span className="orc-kpi__legenda">
          <b>{pct(pctRealizado)}</b> já realizado · {pct(100 - pctRealizado)} previsto
        </span>
      </Card>

      {orcadoAno > 0 ? (
        <Card
          icone={Target}
          tom={usoOrcado > 100 ? 'laranja' : 'verde'}
          rotulo="Orçado x projeção"
          valor={brl0.format(orcadoAno - projecao)}
          valorClasse={orcadoAno - projecao < 0 ? 'orc-negativo' : ''}
        >
          <span className="orc-kpi__info">
            {orcadoAno - projecao < 0 ? 'Acima' : 'Abaixo'} do orçado de {brl0.format(orcadoAno)}
          </span>
          <div className="orc-progresso" aria-hidden>
            <span
              className={usoOrcado > 100 ? 'orc-progresso__estouro' : 'orc-progresso__realizado'}
              style={{ width: `${Math.min(usoOrcado, 100)}%` }}
            />
          </div>
          <span className="orc-kpi__legenda">
            Projeção usa <b>{pct(usoOrcado)}</b> do orçado
          </span>
        </Card>
      ) : (
        <Card
          icone={Target}
          tom="cinza"
          rotulo="Orçado x projeção"
          valor="Sem orçamento"
          valorClasse="orc-kpi__valor--vazio"
        >
          <span className="orc-kpi__info">Nenhum valor orçado para {ano}.</span>
          <a className="orc-kpi__acao" href={linkDespesas}>
            Definir orçamento nas despesas →
          </a>
        </Card>
      )}
    </section>
  )
}
