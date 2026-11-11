'use client'

import { toast, useConfig } from '@payloadcms/ui'
import { CalendarCheck, CalendarPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import './celulas.css'

const hojeLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const curto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`

// Coloca a empresa no Meu dia (hoje). Já marcada: mostra o dia.
export function MeuDiaBotao({ empresa, diaMarcado, comData = false }: { empresa: number; diaMarcado: string | null; comData?: boolean }) {
  const {
    config: { serverURL, routes },
  } = useConfig()
  const router = useRouter()
  const [dia, setDia] = useState(diaMarcado)
  const [escolhido, setEscolhido] = useState(hojeLocal())
  const [enviando, setEnviando] = useState(false)

  if (dia) {
    return (
      <a
        className="crm-cel-meudia crm-cel-meudia--marcado"
        href={`${routes.admin}/crm/meu-dia?dia=${dia}`}
        title="Abrir o Meu dia"
        onClick={(e) => e.stopPropagation()}
      >
        <CalendarCheck size={13} /> {dia === hojeLocal() ? 'Hoje' : curto(dia)}
      </a>
    )
  }

  const marcar = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEnviando(true)
    const r = await fetch(`${serverURL ?? ''}${routes.api}/crm-dias/marcar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresa, dia: comData ? escolhido : hojeLocal() }),
    })
    setEnviando(false)
    const json = await r.json().catch(() => ({}))
    if (!r.ok) return toast.error(json.message || 'Não foi possível marcar.')
    toast.success(json.jaEstava ? 'Já estava no seu dia.' : 'Empresa no seu dia.')
    setDia(json.dia)
    router.refresh()
  }

  return (
    <span className="crm-cel-meudia-grupo">
      {comData && (
        <input
          type="date"
          className="crm-cel-meudia-data"
          value={escolhido}
          min={hojeLocal()}
          onChange={(e) => setEscolhido(e.target.value)}
          aria-label="Dia"
        />
      )}
      <button type="button" className="crm-cel-meudia" onClick={marcar} disabled={enviando} title="Colocar no Meu dia">
        <CalendarPlus size={13} /> {enviando ? '…' : comData ? 'Pôr no Meu dia' : 'Meu dia'}
      </button>
    </span>
  )
}
