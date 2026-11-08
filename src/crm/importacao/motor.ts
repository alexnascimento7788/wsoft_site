import { CNAES, TELEFONES_CONTATO, TELEFONES_EMPRESA, type Registro } from './colunas'
import {
  chave,
  normalizarCep,
  normalizarCnae,
  normalizarCnpj,
  normalizarEmail,
  normalizarTelefone,
  normalizarUf,
  texto,
  type Telefone,
} from './normalizar'
import type { Prioridade } from './prioridade'

export type Alerta = 'situacao_nao_ativa' | 'em_liquidacao' | 'recuperacao_judicial'
export type TipoErro = 'cnpj_ausente' | 'cnpj_invalido' | 'razao_social_ausente'

export type EmpresaPreparada = {
  cnpj: string
  raizCnpj: string
  razaoSocial: string
  nomeFantasia: string | null
  tipo: 'matriz' | 'filial'
  situacaoCadastral: string | null
  faixaFundacao: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  telefones: Telefone[]
  cnaes: { codigo: string; descricao: string | null; principal: boolean }[]
  /** valores da planilha que não passaram na validação, guardados para não perder a informação */
  observacoes: string | null
  alertas: Alerta[]
  semCanalContato: boolean
  prioridade: Prioridade
}

export type ContatoPreparado = {
  nome: string | null
  email: string | null
  empresarioIndividual: boolean
  telefones: Telefone[]
}

export type LinhaPreparada =
  | { ok: true; linha: number; empresa: EmpresaPreparada; contato: ContatoPreparado | null; avisos: Aviso[] }
  | { ok: false; linha: number; erro: TipoErro }

// Avisos que não impedem a importação (contados no relatório)
export type Aviso = 'telefone_invalido' | 'email_invalido' | 'cnae_invalido' | 'cep_invalido' | 'uf_invalida'

const telefonesDe = (r: Registro, pares: typeof TELEFONES_EMPRESA, avisos: Aviso[], ja: Set<string>) => {
  const lista: Telefone[] = []
  for (const [ddd, num] of pares) {
    if (!texto(r[num])) continue
    const t = normalizarTelefone(r[ddd], r[num])
    if (!t) continue
    if (ja.has(t.numero)) continue // duplicado (na empresa ou no contato)
    if (!t.valido) avisos.push('telefone_invalido')
    ja.add(t.numero)
    lista.push(t)
  }
  return lista
}

// Uma linha da planilha → empresa + contato normalizados (ou o tipo de erro)
export function prepararLinha(
  r: Registro,
  linha: number,
  calcularPrioridade: (primario: string | null, secundarios: string[], razao: string) => Prioridade,
): LinhaPreparada {
  const { cnpj, erro } = normalizarCnpj(r.CNPJ)
  if (!cnpj) return { ok: false, linha, erro: erro! }
  const razaoSocial = texto(r.RazaoSocial)
  if (!razaoSocial) return { ok: false, linha, erro: 'razao_social_ausente' }

  const avisos: Aviso[] = []
  const vistos = new Set<string>()
  const telefones = telefonesDe(r, TELEFONES_EMPRESA, avisos, vistos)
  const telefonesContato = telefonesDe(r, TELEFONES_CONTATO, avisos, vistos)

  const naoValidados: string[] = []
  const cnaes: EmpresaPreparada['cnaes'] = []
  CNAES.forEach((campo, i) => {
    if (!texto(r[campo])) return
    const c = normalizarCnae(r[campo])
    if (!c) {
      avisos.push('cnae_invalido')
      naoValidados.push(`CNAE ${i === 0 ? 'primário' : 'secundário'}: ${texto(r[campo])}`)
      return
    }
    if (!cnaes.some((x) => x.codigo === c.codigo)) cnaes.push({ ...c, principal: i === 0 })
  })
  const primario = cnaes.find((c) => c.principal)?.codigo ?? null
  const secundarios = cnaes.filter((c) => !c.principal).map((c) => c.codigo)

  const situacao = texto(r.SituacaoCadastral)
  const razaoChave = chave(razaoSocial)
  const alertas: Alerta[] = []
  if (situacao && chave(situacao) !== 'ATIVA') alertas.push('situacao_nao_ativa')
  if (razaoChave.includes('EM LIQUIDACAO')) alertas.push('em_liquidacao')
  if (razaoChave.includes('RECUPERACAO JUDICIAL')) alertas.push('recuperacao_judicial')

  const emailBruto = texto(r.EmailContato)
  const email = normalizarEmail(emailBruto)
  if (emailBruto && !email) {
    avisos.push('email_invalido')
    naoValidados.push(`E-mail do contato: ${emailBruto}`)
  }

  const cep = normalizarCep(r.CEP)
  if (texto(r.CEP) && !cep) {
    avisos.push('cep_invalido')
    naoValidados.push(`CEP: ${texto(r.CEP)}`)
  }
  const uf = normalizarUf(r.Estado)
  if (texto(r.Estado) && !uf) {
    avisos.push('uf_invalida')
    naoValidados.push(`Estado: ${texto(r.Estado)}`)
  }

  const tipoTexto = chave(r.TipoEmpresa)
  const tipo: 'matriz' | 'filial' =
    tipoTexto === 'MATRIZ' ? 'matriz' : tipoTexto === 'FILIAL' ? 'filial' : cnpj.slice(8, 12) === '0001' ? 'matriz' : 'filial'

  const nomeContato = texto(r.NomeContato)
  const temContato = Boolean(nomeContato || email || telefonesContato.length)
  const contato: ContatoPreparado | null = temContato
    ? {
        nome: nomeContato,
        email,
        empresarioIndividual: Boolean(nomeContato && chave(nomeContato) === razaoChave),
        telefones: telefonesContato,
      }
    : null

  return {
    ok: true,
    linha,
    avisos,
    contato,
    empresa: {
      cnpj,
      raizCnpj: cnpj.slice(0, 8),
      razaoSocial,
      nomeFantasia: texto(r.NomeFantasia),
      tipo,
      situacaoCadastral: situacao,
      faixaFundacao: texto(r.fxDataFundacao),
      logradouro: texto(r.Logradouro),
      numero: texto(r.Numero),
      complemento: texto(r.Complemento),
      bairro: texto(r.Bairro),
      cidade: texto(r.Cidade),
      uf,
      cep,
      telefones,
      cnaes,
      observacoes: naoValidados.length
        ? ['Dados da lista que não passaram na validação (conferir):', ...naoValidados.map((x) => `- ${x}`)].join('\n')
        : null,
      alertas,
      semCanalContato: ![...telefones, ...telefonesContato].some((t) => t.valido) && !email,
      prioridade: calcularPrioridade(primario, secundarios, razaoSocial),
    },
  }
}

// Relatório da importação: SÓ contagens e tipos de problema (nunca nomes, telefones ou e-mails)
export class Relatorio {
  linhas = 0
  validas = 0
  criados = 0
  atualizados = 0
  duplicadosNoArquivo = 0
  jaExistentes = 0
  erros: Record<TipoErro, number> = { cnpj_ausente: 0, cnpj_invalido: 0, razao_social_ausente: 0 }
  alertas: Record<Alerta, number> = { situacao_nao_ativa: 0, em_liquidacao: 0, recuperacao_judicial: 0 }
  comAlerta = 0
  avisos: Record<Aviso, number> = {
    telefone_invalido: 0,
    email_invalido: 0,
    cnae_invalido: 0,
    cep_invalido: 0,
    uf_invalida: 0,
  }
  prioridade: Record<Prioridade, number> = { alta: 0, media: 0, baixa: 0 }
  semCanalContato = 0
  semContato = 0
  contatoSemNome = 0
  empresarioIndividual = 0
  telefonesEmpresa = 0
  telefonesContato = 0
  matrizes = 0
  filiais = 0
  private raizes = new Map<string, number>()
  /** linhas com erro (número da linha + tipo) — para o arquivo de erros; não vai para o console */
  linhasComErro: { linha: number; erro: TipoErro }[] = []

  registrar(p: LinhaPreparada) {
    this.linhas++
    if (!p.ok) {
      this.erros[p.erro]++
      this.linhasComErro.push({ linha: p.linha, erro: p.erro })
      return
    }
    this.validas++
    const { empresa: e, contato: c } = p
    this.prioridade[e.prioridade]++
    for (const a of e.alertas) this.alertas[a]++
    if (e.alertas.length) this.comAlerta++
    for (const a of p.avisos) this.avisos[a]++
    if (e.semCanalContato) this.semCanalContato++
    if (!c) this.semContato++
    else {
      if (!c.nome) this.contatoSemNome++
      if (c.empresarioIndividual) this.empresarioIndividual++
      this.telefonesContato += c.telefones.length
    }
    this.telefonesEmpresa += e.telefones.length
    if (e.tipo === 'matriz') this.matrizes++
    else this.filiais++
    this.raizes.set(e.raizCnpj, (this.raizes.get(e.raizCnpj) ?? 0) + 1)
  }

  get gruposMatrizFilial() {
    return [...this.raizes.values()].filter((n) => n > 1).length
  }

  get totalErros() {
    return Object.values(this.erros).reduce((a, b) => a + b, 0)
  }

  resumo() {
    return {
      linhas: this.linhas,
      validas: this.validas,
      criados: this.criados,
      atualizados: this.atualizados,
      duplicadosNoArquivo: this.duplicadosNoArquivo,
      jaExistentes: this.jaExistentes,
      erros: { total: this.totalErros, ...this.erros },
      comAlerta: this.comAlerta,
      alertas: this.alertas,
      avisos: this.avisos,
      prioridade: this.prioridade,
      semCanalContato: this.semCanalContato,
      semContato: this.semContato,
      contatoSemNome: this.contatoSemNome,
      empresarioIndividual: this.empresarioIndividual,
      telefones: { empresa: this.telefonesEmpresa, contato: this.telefonesContato },
      matrizes: this.matrizes,
      filiais: this.filiais,
      gruposMatrizFilial: this.gruposMatrizFilial,
    }
  }
}
