'use client'

import { useConfig, useFormModified } from '@payloadcms/ui'
import { CircleCheck, CircleX, PlugZap } from 'lucide-react'
import React, { useState } from 'react'

import './TestarConexao.css'

type Alvo = 'ia' | 'whatsapp' | 'email'
type Resultado = { ok: boolean; mensagem: string }

const NOMES: Record<Alvo, string> = { ia: 'a IA', whatsapp: 'o WhatsApp', email: 'o e-mail' }

// Botão "Testar conexão" de cada aba da Automação. Sem <form>: fica dentro do formulário do Payload.
export default function TestarConexao({ alvo }: { alvo: Alvo }) {
  const {
    config: { serverURL, routes },
  } = useConfig()
  const modificado = useFormModified()
  const [testando, setTestando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const testar = async () => {
    setTestando(true)
    setResultado(null)
    try {
      const r = await fetch(`${serverURL ?? ''}${routes.api}/globals/crm-automacao/testar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alvo }),
      })
      const dados = (await r.json().catch(() => ({}))) as Partial<Resultado> & { message?: string }
      setResultado({ ok: Boolean(dados.ok), mensagem: dados.mensagem ?? dados.message ?? `Erro ${r.status}.` })
    } catch {
      setResultado({ ok: false, mensagem: 'Sem resposta do servidor.' })
    } finally {
      setTestando(false)
    }
  }

  return (
    <div className="automacao-teste">
      <button type="button" className="automacao-teste__botao" onClick={testar} disabled={testando}>
        <PlugZap size={15} aria-hidden />
        {testando ? 'Testando…' : `Testar conexão com ${NOMES[alvo]}`}
      </button>
      {modificado && !testando && <span className="automacao-teste__aviso">Salve antes de testar: o teste usa o que está salvo.</span>}
      {resultado && (
        <span className={`automacao-teste__resultado automacao-teste__resultado--${resultado.ok ? 'ok' : 'erro'}`}>
          {resultado.ok ? <CircleCheck size={15} aria-hidden /> : <CircleX size={15} aria-hidden />}
          {resultado.mensagem}
        </span>
      )}
    </div>
  )
}
