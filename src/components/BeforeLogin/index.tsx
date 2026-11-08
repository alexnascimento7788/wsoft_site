import type { ServerProps } from 'payload'
import React from 'react'

import { AREAS, areaDoLogin } from '@/components/admin/Login/area'

// Cabeçalho da tela de login, conforme a área de destino (CRM, Orçamento ou Administração).
// A classe wsoft-login--<área> define as cores da página (ver custom.css).
const BeforeLogin: React.FC<ServerProps> = ({ searchParams }) => {
  const area = areaDoLogin(searchParams as Record<string, string | string[] | undefined>)
  const { titulo, destaque, texto } = AREAS[area]
  return (
    <div className={`wsoft-login wsoft-login--${area}`}>
      <h1>
        {titulo} <span>{destaque}</span>
      </h1>
      <p>{texto}</p>
    </div>
  )
}

export default BeforeLogin
