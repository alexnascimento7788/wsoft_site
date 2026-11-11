import { Mail, MessageCircle, Phone } from 'lucide-react'
import React from 'react'

import './celulas.css'

const CANAIS = [
  { valor: 'whatsapp', nome: 'WhatsApp', Icone: MessageCircle, cor: '#16A34A' },
  { valor: 'telefone', nome: 'Telefone', Icone: Phone, cor: '#2563EB' },
  { valor: 'email', nome: 'E-mail', Icone: Mail, cor: '#F4791F' },
]

// Coluna "Canais": os três ícones, acesos só nos canais que a empresa tem
export default function CanaisCell({ cellData }: { cellData?: string[] | null }) {
  const tem = new Set(cellData ?? [])
  return (
    <span className="crm-cel-canais">
      {CANAIS.map(({ valor, nome, Icone, cor }) => {
        const ativo = tem.has(valor)
        return (
          <span
            key={valor}
            className={`crm-cel-canal${ativo ? ' crm-cel-canal--ativo' : ''}`}
            style={{ '--cor': cor } as React.CSSProperties}
            title={ativo ? `Tem ${nome}` : `Sem ${nome}`}
            aria-label={ativo ? `Tem ${nome}` : `Sem ${nome}`}
          >
            <Icone size={13} strokeWidth={2.2} />
          </span>
        )
      })}
    </span>
  )
}
