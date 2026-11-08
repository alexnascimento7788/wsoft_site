import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { regraPrioridadePadrao } from '@/globals/CrmConfiguracao'
import { mapearCabecalhos, MODELO_BOA_VISTA, CAMPOS } from '@/crm/importacao/colunas'
import { dividirLinha, lerTexto } from '@/crm/importacao/ler'
import { prepararLinha, Relatorio } from '@/crm/importacao/motor'
import {
  normalizarCep,
  normalizarCnae,
  normalizarCnpj,
  normalizarEmail,
  normalizarTelefone,
} from '@/crm/importacao/normalizar'
import { criarCalculoPrioridade } from '@/crm/importacao/prioridade'

const prioridade = criarCalculoPrioridade(regraPrioridadePadrao())

describe('normalização', () => {
  it('CNPJ: completa zeros perdidos pelo Excel e valida os dígitos', () => {
    expect(normalizarCnpj(820496000140).cnpj).toBe('00820496000140') // número sem os zeros
    expect(normalizarCnpj('00.820.496/0001-40').cnpj).toBe('00820496000140')
    expect(normalizarCnpj('00820496000141').erro).toBe('cnpj_invalido')
    expect(normalizarCnpj('11111111111111').erro).toBe('cnpj_invalido')
    expect(normalizarCnpj('').erro).toBe('cnpj_ausente')
  })

  it('CEP com 8 dígitos e CNAE separado em código e descrição', () => {
    expect(normalizarCep(2303150)).toBe('02303150')
    expect(normalizarCnae('4622200 - COMERCIO ATACADISTA DE SOJA')).toEqual({
      codigo: '4622200',
      descricao: 'COMERCIO ATACADISTA DE SOJA',
    })
    expect(normalizarCnae('0163600 - ATIVIDADES DE POS-COLHEITA')?.codigo).toBe('0163600')
  })

  it('telefone: 8 dígitos = fixo, 9 = celular; fora do padrão fica guardado como inválido', () => {
    expect(normalizarTelefone('35', '38221234')).toEqual({ numero: '3538221234', tipo: 'fixo', valido: true })
    expect(normalizarTelefone(35, 999998888)).toEqual({ numero: '35999998888', tipo: 'celular', valido: true })
    expect(normalizarTelefone('', '35999998888')?.tipo).toBe('celular')
    expect(normalizarTelefone('00', '123')).toEqual({ numero: '123', tipo: null, valido: false })
    expect(normalizarTelefone('35', '')).toBeNull()
  })

  it('e-mail', () => {
    expect(normalizarEmail('  JOAO@EXEMPLO.COM ')).toBe('joao@exemplo.com')
    expect(normalizarEmail('sem-arroba')).toBeNull()
  })
})

describe('colunas', () => {
  it('reconhece o modelo Boa Vista com as colunas em qualquer ordem', () => {
    const m = mapearCabecalhos([...CAMPOS].reverse())
    expect(m.modelo).toBe(MODELO_BOA_VISTA)
    expect(m.indice.CNPJ).toBe(CAMPOS.length - 1)
  })

  it('aponta colunas obrigatórias ausentes', () => {
    expect(mapearCabecalhos(['RazaoSocial', 'Cidade']).faltando).toEqual(['CNPJ'])
  })

  it('texto delimitado: campos entre aspas com ";" dentro', () => {
    expect(dividirLinha('a;"b; c";;d', ';')).toEqual(['a', 'b; c', '', 'd'])
  })
})

describe('preparação da linha', () => {
  const base = {
    CNPJ: 4787397000164,
    RazaoSocial: 'ARMAZEM FICTICIO LTDA',
    TipoEmpresa: 'MATRIZ',
    SituacaoCadastral: 'ATIVA',
    Estado: 'ms',
    CNAE_Primario: '5211701 - ARMAZENS GERAIS - EMISSAO DE WARRANT',
    DDD1: '67',
    Telefone1: '34218462',
    NomeContato: 'CONTATO FICTICIO',
    DDD_CelularContato1: '67',
    CelularContato1: '981380715',
  }

  it('empresa completa, prioridade Alta pelo CNAE primário', () => {
    const p = prepararLinha(base, 2, prioridade)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.empresa).toMatchObject({ cnpj: '04787397000164', raizCnpj: '04787397', uf: 'MS', prioridade: 'alta', semCanalContato: false })
    expect(p.empresa.telefones).toEqual([{ numero: '6734218462', tipo: 'fixo', valido: true }])
    expect(p.contato?.telefones[0]).toEqual({ numero: '67981380715', tipo: 'celular', valido: true })
  })

  it('Média: CNAE secundário da lista Alta, ou primário 4611-7/00', () => {
    const p1 = prepararLinha({ ...base, CNAE_Primario: '4789004 - PET', CNAE_Secundario_2: '4622200 - SOJA' }, 2, prioridade)
    const p2 = prepararLinha({ ...base, CNAE_Primario: '4611700 - REPRESENTANTES' }, 2, prioridade)
    const p3 = prepararLinha({ ...base, CNAE_Primario: '4789004 - PET' }, 2, prioridade)
    const p4 = prepararLinha({ ...base, CNAE_Primario: '4789004 - PET', RazaoSocial: 'COOPERATIVA FICTICIA' }, 2, prioridade)
    expect([p1, p2, p3, p4].map((p) => (p.ok ? p.empresa.prioridade : null))).toEqual(['media', 'media', 'baixa', 'alta'])
  })

  it('empresário individual, alertas, sem canal e valores não validados guardados', () => {
    const p = prepararLinha(
      {
        CNPJ: '04787397000164',
        RazaoSocial: 'FULANO DE TAL EM RECUPERACAO JUDICIAL',
        NomeContato: 'Fulano de Tal em Recuperação Judicial',
        SituacaoCadastral: 'BAIXADA',
        EmailContato: 'invalido',
        CEP: '123456789',
      },
      7,
      prioridade,
    )
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.contato?.empresarioIndividual).toBe(true)
    expect(p.empresa.alertas).toEqual(['situacao_nao_ativa', 'recuperacao_judicial'])
    expect(p.empresa.semCanalContato).toBe(true)
    expect(p.empresa.observacoes).toContain('E-mail do contato: invalido')
    expect(p.empresa.observacoes).toContain('CEP: 123456789')
  })

  it('telefone repetido entre empresa e contato entra uma vez só', () => {
    const p = prepararLinha({ ...base, DDDContato1: '67', TelefoneContato1: '34218462' }, 2, prioridade)
    if (!p.ok) throw new Error()
    expect(p.empresa.telefones.length + p.contato!.telefones.length).toBe(2)
  })

  it('relatório só tem contagens', () => {
    const r = new Relatorio()
    r.registrar(prepararLinha(base, 2, prioridade))
    r.registrar(prepararLinha({ ...base, CNPJ: '123' }, 3, prioridade))
    const texto = JSON.stringify(r.resumo())
    expect(texto).not.toContain('FICTICIO')
    expect(texto).not.toContain('981380715')
    expect(r.resumo()).toMatchObject({ linhas: 2, validas: 1, erros: { total: 1, cnpj_invalido: 1 } })
  })
})

describe('leitura de texto (layout do Saida.txt)', () => {
  it('lê o .txt com ";" e aspas, mantendo zeros do CNPJ e do CEP', async () => {
    const arq = path.join(os.tmpdir(), `crm-teste-${Date.now()}.txt`)
    const linha = Object.fromEntries(CAMPOS.map((c) => [c, ''])) as Record<string, string>
    Object.assign(linha, {
      CNPJ: '00820496000140',
      RazaoSocial: 'EMPRESA TESTE LTDA',
      CEP: '02303150',
      CNAE_Primario: '"4661300 - COMERCIO ATACADISTA DE MAQUINAS; PARTES E PECAS"',
    })
    fs.writeFileSync(arq, `${CAMPOS.join(';')}\n${CAMPOS.map((c) => linha[c]).join(';')}\n`, 'latin1')
    const itens = []
    for await (const i of lerTexto(arq)) itens.push(i)
    fs.unlinkSync(arq)
    expect(itens[0]).toMatchObject({ tipo: 'cabecalho', modelo: MODELO_BOA_VISTA })
    const r = (itens[1] as { registro: Record<string, unknown> }).registro
    expect(r).toMatchObject({ CNPJ: '00820496000140', CEP: '02303150' })
    expect(r.CNAE_Primario).toBe('4661300 - COMERCIO ATACADISTA DE MAQUINAS; PARTES E PECAS')
  })
})
