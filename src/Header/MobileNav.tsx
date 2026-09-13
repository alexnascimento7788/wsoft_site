'use client'

import Link from 'next/link'
import React, { useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'

type NavLink = { label: string; href: string }
type NavItem = NavLink & { children?: NavLink[] }

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center text-primary"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <nav className="absolute inset-x-0 top-full border-b border-border bg-background px-4 py-4 shadow-md">
          <ul className="flex flex-col gap-1">
            {items.map((item) =>
              item.children ? (
                <li key={item.href}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-base font-medium text-primary hover:bg-muted">
                      {item.label}
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <ul className="ml-3 flex flex-col gap-1 border-l border-border pl-3">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className="block rounded-md px-3 py-2 text-sm text-primary hover:bg-muted"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ) : (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-3 py-2 text-base font-medium text-primary hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
      )}
    </div>
  )
}
