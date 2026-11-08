import { describe, expect, it } from 'vitest'

import { areaDoLogin } from '@/components/admin/Login/area'

describe('tela de login por área', () => {
  it('identifica a área pelo destino depois do login', () => {
    expect(areaDoLogin({ redirect: '/admin/crm' })).toBe('crm')
    expect(areaDoLogin({ redirect: '%2Fadmin%2Fcollections%2Fcrm-empresas' })).toBe('crm')
    expect(areaDoLogin({ redirect: '/admin/orcamento' })).toBe('orcamento')
    expect(areaDoLogin({ redirect: '/admin/orcamento/lancamentos' })).toBe('orcamento')
    expect(areaDoLogin({ redirect: '/admin/collections/despesas' })).toBe('orcamento')
    expect(areaDoLogin({ redirect: '/admin' })).toBe('admin')
    expect(areaDoLogin({})).toBe('admin')
    expect(areaDoLogin(undefined)).toBe('admin')
  })
})
