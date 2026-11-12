import { describe, expect, it } from 'vitest'

import {
  abordagemSugerida,
  assuntoEmail,
  htmlEmail,
  numeroInternacional,
  ramoDaEmpresa,
  roteiroLigacao,
  textoFormulario,
  textoRoteiro,
  textoWhatsApp,
} from '@/components/admin/crm/mensagens/modelos'
import { calcularCanais } from '@/crm/canais'
import { diaDe, limitarQuantidade, serieIndicador, sortear } from '@/crm/meuDia'

describe('canais da empresa (ícones da lista)', () => {
  it('celular válido = WhatsApp + telefone; fixo = só telefone; e-mail vem das pessoas', () => {
    expect(calcularCanais([{ numero: '35999990000', tipo: 'celular' }], [])).toEqual(['whatsapp', 'telefone'])
    expect(calcularCanais([{ numero: '3533330000', tipo: 'fixo' }], [])).toEqual(['telefone'])
    expect(calcularCanais([], [{ email: 'a@b.com' }])).toEqual(['email'])
  })

  it('número inválido e pessoa com "Não contatar" não contam', () => {
    expect(calcularCanais([{ numero: '35999990000', tipo: 'celular', valido: false }], [])).toEqual([])
    expect(
      calcularCanais([], [{ email: 'a@b.com', naoContatar: true, telefones: [{ numero: '35999990000', tipo: 'celular' }] }]),
    ).toEqual([])
  })
})

describe('sorteio do Meu dia', () => {
  const cands = [
    { id: 1, prioridade: 'baixa' },
    { id: 2, prioridade: 'alta' },
    { id: 3, prioridade: 'media' },
    { id: 4, prioridade: 'alta' },
    { id: 5, prioridade: null },
  ]

  it('traz primeiro Alta, depois Média, depois Baixa', () => {
    const r = sortear(cands, 5, () => 0.5).map((c) => c.prioridade)
    expect(r).toEqual(['alta', 'alta', 'media', 'baixa', null])
  })

  it('respeita a quantidade e sorteia dentro da faixa', () => {
    const seq = [0.9, 0.1, 0.5, 0.2, 0.3]
    let i = 0
    const r = sortear(cands, 2, () => seq[i++]!)
    expect(r.map((c) => c.id).sort()).toEqual([2, 4])
    expect(sortear(cands, 0)).toEqual([])
  })

  it('quantidade inválida vira 5; acima de 50 fica em 50', () => {
    expect(limitarQuantidade(undefined)).toBe(5)
    expect(limitarQuantidade(0)).toBe(5)
    expect(limitarQuantidade(80)).toBe(50)
    expect(limitarQuantidade('7')).toBe(7)
  })

  it('o dia é contado no horário de Brasília', () => {
    expect(diaDe('2026-11-12T02:30:00Z')).toBe('2026-11-11') // 23h30 em Brasília
    expect(diaDe('2026-11-12T03:30:00Z')).toBe('2026-11-12')
  })
})

describe('indicador meta x feito', () => {
  it('dias úteis aparecem mesmo sem nada (linha no chão); fim de semana só com meta ou ação', () => {
    // 2026-11-06 sexta, 07 sábado, 08 domingo, 09 segunda
    const s = serieIndicador('2026-11-06', '2026-11-09', { '2026-11-06': 5 }, { '2026-11-08': 2 })
    expect(s).toEqual([
      { dia: '2026-11-06', meta: 5, feito: 0 },
      { dia: '2026-11-08', meta: 0, feito: 2 },
      { dia: '2026-11-09', meta: 0, feito: 0 },
    ])
  })
})

describe('mensagem pronta (Prospecção SiagWeb)', () => {
  const dados = { nome: 'Carlos', empresa: 'Armazéns Exemplo', cidade: 'Passos', uf: 'mg', remetente: 'Alex', cargo: 'Comercial Wsoft', ramo: '' }

  it('assunto, e-mail e WhatsApp usam os dados da empresa', () => {
    expect(assuntoEmail('safra', dados)).toBe('Armazéns Exemplo: a safra 2026/27 já tem sistema?')
    const html = htmlEmail('safra', dados)
    expect(html).toContain('Olá, Carlos')
    expect(html).toContain('região de Passos/MG')
    expect(textoWhatsApp('retorno', dados)).toContain('Olá, *Carlos*!')
  })

  it('escapa HTML dos dados digitados', () => {
    expect(htmlEmail('safra', { ...dados, nome: '<script>' })).not.toContain('<script>')
  })

  it('abordagem pelo ramo: sugerida quando o nome não fala de grãos e o CNAE fala', () => {
    const cnaes = [{ codigo: '4930202', principal: true }, { codigo: '5211701', principal: false }]
    expect(abordagemSugerida(['TRANSPORTES SILVA LTDA'], cnaes)).toBe('cnae')
    expect(abordagemSugerida(['SILVA ARMAZENS LTDA'], cnaes)).toBe('safra')
    expect(abordagemSugerida(['TRANSPORTES SILVA LTDA'], [{ codigo: '4930202', descricao: 'Transporte', principal: true }])).toBe('safra')
    expect(ramoDaEmpresa(cnaes).texto).toBe('armazém geral')
    const d = { ...dados, empresa: 'Transportes Silva', ramo: 'armazém geral' }
    expect(htmlEmail('cnae', d)).toContain('<b>armazém geral</b>')
    expect(textoWhatsApp('cnae', d)).toContain('vocês recebem ou armazenam grãos hoje?')
  })

  it('formulário do site sai em texto puro; roteiro de ligação existe para todas as abordagens', () => {
    for (const a of ['safra', 'reforma', 'retorno', 'cnae'] as const) {
      const t = textoFormulario(a, dados)
      expect(t).not.toMatch(/<[a-z]/i)
      expect(t).toContain('Alex')
      const r = roteiroLigacao(a, dados)
      expect(r.abertura[0]).toContain('Carlos')
      expect(r.gancho.length).toBeGreaterThan(0)
      expect(textoRoteiro(r)).toContain('FECHAMENTO')
    }
  })

  it('número com DDD 55 (RS) não perde o código do país', () => {
    expect(numeroInternacional('55912345678')).toBe('5555912345678')
    expect(numeroInternacional('35999990000')).toBe('5535999990000')
    expect(numeroInternacional('5535999990000')).toBe('5535999990000')
  })
})
