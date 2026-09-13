import React from 'react'

export function SiagWebLogo({
  variant = 'light',
  className = '',
}: {
  variant?: 'light' | 'dark'
  className?: string
}) {
  return (
    <span className={`font-bold ${className}`}>
      <span className={variant === 'dark' ? 'text-white' : 'text-[#2b2b2b]'}>Siag</span>
      <span className="text-[#6BBF4E]">Web</span>
    </span>
  )
}
