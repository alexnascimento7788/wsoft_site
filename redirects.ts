import type { NextConfig } from 'next'

export const redirects: NextConfig['redirects'] = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header' as const,
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  // Atalhos: wsoftinfo.com.br/orcamento e /crm (sem login, o painel manda para o login e volta)
  const atalhos = [
    { source: '/orcamento', destination: '/admin/orcamento', permanent: false },
    { source: '/crm', destination: '/admin/crm', permanent: false },
  ]

  return [internetExplorerRedirect, ...atalhos]
}
