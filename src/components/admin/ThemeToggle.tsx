'use client'

import { useTheme } from '@payloadcms/ui'
import { Moon, Sun } from 'lucide-react'
import React from 'react'

// Alterna entre modo claro e escuro (a escolha fica salva no navegador)
export function ThemeToggle({ variante = 'nav' }: { variante?: 'nav' | 'login' }) {
  const { theme, setTheme } = useTheme()
  const escuro = theme === 'dark'
  const proximo = escuro ? 'light' : 'dark'
  return (
    <button
      type="button"
      className={`wsoft-tema wsoft-tema--${variante}`}
      onClick={() => setTheme(proximo)}
      title={escuro ? 'Usar modo claro' : 'Usar modo escuro'}
      aria-label={escuro ? 'Usar modo claro' : 'Usar modo escuro'}
    >
      {escuro ? <Sun size={15} /> : <Moon size={15} />}
      <span>{escuro ? 'Modo claro' : 'Modo escuro'}</span>
    </button>
  )
}
