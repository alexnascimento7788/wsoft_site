'use client'

import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

type NavLink = { label: string; href: string }

export function NavDropdown({
  label,
  href,
  items,
}: {
  label: string
  href: string
  items: NavLink[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="inline-flex items-center gap-1">
        <Link href={href} className="text-primary hover:text-primary-hover transition-colors">
          {label}
        </Link>
        <button
          type="button"
          aria-label={`Abrir submenu de ${label}`}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="text-primary hover:text-primary-hover transition-colors"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </span>

      {open && (
        <nav className="absolute left-1/2 top-full z-50 min-w-48 -translate-x-1/2 rounded-md border border-border bg-background py-2 shadow-md">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-primary hover:bg-muted transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
