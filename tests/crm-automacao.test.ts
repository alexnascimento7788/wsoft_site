import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MASCARA, criptografar, descriptografar, ehMascara, estaCriptografado, mascarar } from '@/crm/automacao/segredos'

describe('segredos da Automação', () => {
  const original = process.env.CRM_CHAVE_SEGREDOS
  beforeEach(() => {
    process.env.CRM_CHAVE_SEGREDOS = 'chave-de-teste-com-mais-de-16'
  })
  afterEach(() => {
    process.env.CRM_CHAVE_SEGREDOS = original
  })

  it('criptografa e abre de volta; cada gravação gera um valor diferente', () => {
    const a = criptografar('sk-ant-token-123456')
    const b = criptografar('sk-ant-token-123456')
    expect(estaCriptografado(a)).toBe(true)
    expect(a).not.toContain('token')
    expect(a).not.toBe(b)
    expect(descriptografar(a)).toBe('sk-ant-token-123456')
  })

  it('a tela mostra só a máscara e os 4 últimos caracteres', () => {
    const m = mascarar(criptografar('sk-ant-token-123456'))
    expect(m).toBe(`${MASCARA}3456`)
    expect(ehMascara(m)).toBe(true)
    expect(mascarar(criptografar('curta'))).toBe(MASCARA)
  })

  it('com outra chave não abre (e a tela avisa em vez de quebrar)', () => {
    const v = criptografar('segredo-qualquer-1')
    process.env.CRM_CHAVE_SEGREDOS = 'outra-chave-com-mais-de-16'
    expect(() => descriptografar(v)).toThrow()
    expect(mascarar(v)).toContain('chave de criptografia diferente')
  })

  it('sem a variável de ambiente, recusa gravar', () => {
    delete process.env.CRM_CHAVE_SEGREDOS
    expect(() => criptografar('x')).toThrow(/CRM_CHAVE_SEGREDOS/)
  })
})
