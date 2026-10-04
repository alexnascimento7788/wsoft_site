'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React from 'react'

export function Filtros({
  anos,
  ano,
  centros,
  centro,
}: {
  anos: number[]
  ano: number
  centros: { id: number; nome: string }[]
  centro?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const atualizar = (chave: string, valor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor) params.set(chave, valor)
    else params.delete(chave)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="orc-filtros">
      <label>
        <span>Ano</span>
        <select value={ano} onChange={(e) => atualizar('ano', e.target.value)}>
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Centro de custo</span>
        <select value={centro ?? ''} onChange={(e) => atualizar('centro', e.target.value)}>
          <option value="">Todos</option>
          {centros.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
