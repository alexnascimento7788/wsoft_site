'use client'

import { useConfig, useDocumentInfo, useFormModified } from '@payloadcms/ui'
import { CircleCheck, CircleX, PlugZap } from 'lucide-react'
import React, { useState } from 'react'

import './TestarConexao.css'

type Alvo = 'ia' | 'whatsapp' | 'email'
type Resultado = { ok: boolean; mensagem: string }

const NOMES: Record<Alvo, string> = { ia: 'a IA', whatsapp: 'o WhatsApp', email: 'este e-mail' }

// Botão "Testar conexão": abas da Automação (IA, WhatsApp) e caixa de e-mail do usuário.
// Sem <form>: fica dentro do formulário do Payload.
export default function TestarConexao({ alvo }: { alvo: Alvo }) {
  const {
    config: { serverURL, routes },
  } = useConfig()
  const { id } = useDocumentInfo()
  const modificado = useFormModified()
  const [testando, setTestando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const testar = async () => {
    setTestando(true)
    setResultado(null)
    try {
      const caminho = alvo === 'email' ? `/users/${id}/testar-email` : '/globals/crm-automacao/testar'
      const r = await fetch(`${serverURL ?? ''}${routes.api}${caminho}`, {
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

  if (alvo === 'email' && !id) {
    return <p className="automacao-teste__aviso">Salve o usuário para poder testar o e-mail.</p>
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
