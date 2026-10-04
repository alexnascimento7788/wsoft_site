import React from 'react'

import { MESES } from '@/collections/Orcamento/meses'

import type { GrupoConta } from './dados'

const num = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const soma = (valores: number[]) => valores.reduce((a, b) => a + b, 0)

function Celulas({ valores, mesRef }: { valores: number[]; mesRef: number }) {
  return (
    <>
      {valores.map((v, i) => (
        <td key={i} className={`num ${i >= mesRef ? 'orc-mensal__futuro' : ''} ${v ? '' : 'orc-mensal__zero'}`}>
          {v ? num.format(v) : '—'}
        </td>
      ))}
      <td className="num orc-mensal__total">{brl.format(soma(valores))}</td>
    </>
  )
}

export function TabelaMensal({ contas, mesRef }: { contas: GrupoConta[]; mesRef: number }) {
  const total = MESES.map((_, i) => contas.reduce((t, c) => t + c.subtotal[i], 0))

  return (
    <div className="orc-scroll">
      <table className="orc-tabela orc-mensal">
        <thead>
          <tr>
            <th className="orc-mensal__fixa">Conta / despesa</th>
            {MESES.map((m, i) => (
              <th key={m.key} className={`num ${i >= mesRef ? 'orc-mensal__futuro' : ''}`}>
                {m.label}
                {i >= mesRef && <span className="orc-mensal__prev">prev.</span>}
              </th>
            ))}
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {contas.map((conta) => (
            <React.Fragment key={conta.id}>
              <tr className="orc-tabela__centro">
                <td className="orc-mensal__fixa">{conta.nome}</td>
                <Celulas valores={conta.subtotal} mesRef={mesRef} />
              </tr>
              {conta.itens.map((item) => (
                <tr key={item.id}>
                  <td className="orc-mensal__fixa orc-mensal__item">
                    {item.descricao}
                    {item.fornecedor && item.fornecedor !== item.descricao && (
                      <small>{item.fornecedor}</small>
                    )}
                  </td>
                  <Celulas valores={item.valores} mesRef={mesRef} />
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="orc-mensal__fixa">Total do mês</td>
            <Celulas valores={total} mesRef={mesRef} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
