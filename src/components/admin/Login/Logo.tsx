import type { ServerProps } from 'payload'
import React from 'react'

// Logo das telas de login / senha: marca Wsoft
export default function Logo(_props: ServerProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/wsoft-logo.png" alt="Wsoft" className="wsoft-login__logo" />
}
