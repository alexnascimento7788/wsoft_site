import { Mail, MessageCircle, MoreHorizontal, Phone } from 'lucide-react'
import React from 'react'

import './celulas.css'

const CANAL: Record<string, { nome: string; Icone: typeof Phone; cor: string }> = {
  ligacao: { nome: 'Ligação', Icone: Phone, cor: '#2563EB' },
  whatsapp: { nome: 'WhatsApp', Icone: MessageCircle, cor: '#16A34A' },
  email: { nome: 'E-mail', Icone: Mail, cor: '#F4791F' },
  outro: { nome: 'Outro', Icone: MoreHorizontal, cor: '#6B7280' },
}

// Coluna "Canal" das tentativas: ícone colorido + nome
export default function CanalCell({ cellData }: { cellData?: string | null }) {
  const c = CANAL[cellData ?? '']
  if (!c) return <span>—</span>
  return (
    <span className="crm-cel-canal-nome">
      <span className="crm-cel-canal crm-cel-canal--ativo" style={{ '--cor': c.cor } as React.CSSProperties} aria-hidden>
        <c.Icone size={13} strokeWidth={2.2} />
      </span>
      {c.nome}
    </span>
  )
}
