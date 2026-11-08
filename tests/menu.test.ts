import { describe, expect, it } from 'vitest'

import { redirects } from '../redirects'

// Ordem dos grupos no menu do admin: Orçamento, (CRM), Site
describe('menu do admin', () => {
  it('grupos aparecem na ordem Orçamento → CRM → Site, com a configuração do orçamento no grupo Orçamento', async () => {
    const config = await (await import('@/payload.config')).default
    const grupos: string[] = []
    for (const e of [...config.collections, ...config.globals]) {
      const g = e.admin?.group
      if (typeof g === 'string' && !grupos.includes(g)) grupos.push(g)
    }
    expect(grupos).toEqual(['Orçamento', 'CRM', 'Site'])

    const semGrupo = [...config.collections, ...config.globals].filter(
      (e) => !e.admin?.group && !e.slug.startsWith('payload-'),
    )
    expect(semGrupo.map((e) => e.slug)).toEqual([])
  })

  it('/orcamento leva ao painel do orçamento', async () => {
    const lista = await redirects!()
    expect(lista).toContainEqual(
      expect.objectContaining({ source: '/orcamento', destination: '/admin/orcamento' }),
    )
  })
})
