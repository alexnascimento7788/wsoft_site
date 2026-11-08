import ExcelJS from 'exceljs'
import { createReadStream, promises as fs } from 'fs'
import readline from 'readline'

import { CAMPOS, mapearCabecalhos, type Registro } from './colunas'

// Valor "cru" de uma célula do exceljs (rich text, hyperlink, fórmula, data…)
export function valorCelula(v: unknown): unknown {
  if (v === null || v === undefined) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((t) => t.text).join('')
    if ('text' in o) return o.text
    if ('result' in o) return o.result
    return null
  }
  return v
}

// Lê a planilha em streaming (não carrega o arquivo inteiro na memória), linha a linha.
// A primeira linha é o cabeçalho; a ordem das colunas não importa.
export async function* lerPlanilha(caminho: string, mapeamento?: Record<string, string>) {
  const leitor = new ExcelJS.stream.xlsx.WorkbookReader(caminho, {
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    styles: 'ignore',
    worksheets: 'emit',
  })
  for await (const planilha of leitor) {
    let indice: ReturnType<typeof mapearCabecalhos>['indice'] | null = null
    for await (const row of planilha) {
      const valores = (row.values as unknown[]).slice(1).map(valorCelula)
      if (!indice) {
        const m = mapearCabecalhos(valores, mapeamento)
        if (m.faltando.length) throw new Error(`Colunas obrigatórias ausentes: ${m.faltando.join(', ')}`)
        indice = m.indice
        yield { tipo: 'cabecalho' as const, modelo: m.modelo, ignorados: m.ignorados }
        continue
      }
      if (valores.every((v) => v === null || v === '')) continue
      const registro: Registro = {}
      for (const campo of CAMPOS) {
        const i = indice[campo]
        if (i !== undefined) registro[campo] = valores[i]
      }
      yield { tipo: 'linha' as const, linha: row.number, registro }
    }
    break // só a primeira aba
  }
}

// Divide uma linha de texto delimitado, respeitando campos entre aspas ("a;b") e aspas duplicadas ("")
export function dividirLinha(linha: string, sep: string): string[] {
  const campos: string[] = []
  let atual = ''
  let aspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (aspas) {
      if (c === '"' && linha[i + 1] === '"') {
        atual += '"'
        i++
      } else if (c === '"') aspas = false
      else atual += c
    } else if (c === '"') aspas = true
    else if (c === sep) {
      campos.push(atual)
      atual = ''
    } else atual += c
  }
  campos.push(atual)
  return campos
}

const aspasAbertas = (s: string) => (s.match(/"/g)?.length ?? 0) % 2 === 1

// UTF-8 ou Latin-1 (arquivos de fornecedores costumam vir em Windows-1252)
async function detectarCodificacao(caminho: string): Promise<BufferEncoding> {
  const fh = await fs.open(caminho, 'r')
  try {
    const buf = Buffer.alloc(65536)
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0)
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buf.subarray(0, bytesRead))
      return 'utf8'
    } catch {
      return 'latin1'
    }
  } finally {
    await fh.close()
  }
}

// Lê um arquivo de texto delimitado (.txt/.csv — ex.: o "Saida.txt" da Boa Vista) em streaming.
// Separador detectado no cabeçalho (; , ou tab). Valores ficam como texto: CNPJ e CEP mantêm os zeros.
export async function* lerTexto(caminho: string, mapeamento?: Record<string, string>) {
  const codificacao = await detectarCodificacao(caminho)
  const rl = readline.createInterface({ input: createReadStream(caminho, { encoding: codificacao }), crlfDelay: Infinity })
  let indice: ReturnType<typeof mapearCabecalhos>['indice'] | null = null
  let sep = ';'
  let numero = 0
  let pendente = ''
  for await (const bruta of rl) {
    numero++
    const texto = pendente ? `${pendente}\n${bruta}` : bruta.replace(/^\uFEFF/, '')
    if (aspasAbertas(texto)) {
      pendente = texto // campo entre aspas com quebra de linha: continua na próxima
      continue
    }
    pendente = ''
    if (!indice) {
      sep = [';', '\t', ','].find((s) => texto.includes(s)) ?? ';'
      const m = mapearCabecalhos(dividirLinha(texto, sep), mapeamento)
      if (m.faltando.length) throw new Error(`Colunas obrigatórias ausentes: ${m.faltando.join(', ')}`)
      indice = m.indice
      yield { tipo: 'cabecalho' as const, modelo: m.modelo, ignorados: m.ignorados }
      continue
    }
    if (!texto.trim()) continue
    const valores = dividirLinha(texto, sep)
    const registro: Registro = {}
    for (const campo of CAMPOS) {
      const i = indice[campo]
      if (i !== undefined) registro[campo] = valores[i] ?? null
    }
    yield { tipo: 'linha' as const, linha: numero, registro }
  }
}

// Escolhe o leitor pela extensão
export const lerArquivo = (caminho: string, mapeamento?: Record<string, string>) =>
  /\.(txt|csv)$/i.test(caminho) ? lerTexto(caminho, mapeamento) : lerPlanilha(caminho, mapeamento)
