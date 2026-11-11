import type { CollectionConfig } from 'payload'
import { Building2 } from 'lucide-react'
import React from 'react'

import './Aviso.css'

// Texto de cada lista que nasce da empresa (o botão "Criar novo" some nelas, via CSS)
const TEXTOS: Record<string, string> = {
  'crm-contatos': 'As pessoas de contato nascem dentro da empresa: abra a empresa e use a aba “Pessoas de contato”.',
  'crm-registros-contato':
    'Cada tentativa nasce na ficha da empresa (Ligar, WhatsApp, E-mail ou “Registrar tentativa”). Aqui você consulta e corrige.',
  'crm-qualificacoes': 'A qualificação é registrada na ficha da empresa, no botão “Qualificar”. Aqui você consulta e corrige.',
  'crm-desfechos': 'O desfecho da venda é registrado na ficha da empresa, no botão “Desfecho da venda”. Aqui você consulta e corrige.',
  'crm-movimentacoes': 'O histórico de status é gravado sozinho a cada mudança de status da empresa.',
  'crm-solicitacoes-titular': 'Pedidos do titular (LGPD) são abertos na ficha da empresa, no botão “Pedido LGPD”. Aqui você dá sequência.',
  'crm-lotes-importacao': 'Os lotes são criados pela importação da planilha (npm run crm:importar).',
}

export default function AvisoNasceDaEmpresa(props: { collectionSlug?: string; collectionConfig?: CollectionConfig }) {
  const slug = props.collectionSlug ?? props.collectionConfig?.slug ?? ''
  const texto = TEXTOS[slug]
  if (!texto) return null
  return (
    <p className="crm-aviso">
      <Building2 size={15} aria-hidden />
      <span>{texto}</span>
    </p>
  )
}
