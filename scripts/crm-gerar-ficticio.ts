import ExcelJS from 'exceljs'
import os from 'os'
import path from 'path'

import { CAMPOS } from '../src/crm/importacao/colunas'

// Gera uma lista FICTÍCIA no layout Boa Vista (44 colunas) para testar a importação.
// Nenhum dado real: nomes, telefones e e-mails são inventados.
//
//   npm run crm:gerar-ficticio -- --linhas 5000 --saida <arquivo.xlsx>
//
// Inclui de propósito: CNPJ como número (sem zeros à esquerda), colunas fora de ordem,
// CNPJs repetidos, linhas sem contato, sem canal, inválidas, em recuperação judicial, etc.

const args = process.argv.slice(2)
const opcao = (n: string) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 ? args[i + 1] : undefined
}

// Gerador determinístico (mesma semente = mesmo arquivo)
let semente = 20261108
const aleatorio = () => {
  // mulberry32
  semente = (semente + 0x6d2b79f5) | 0
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const escolher = <T,>(lista: T[]) => lista[Math.floor(aleatorio() * lista.length)]
const digitos = (n: number) => Array.from({ length: n }, () => Math.floor(aleatorio() * 10)).join('')

function cnpjValido(raiz: string, filial: string) {
  const base = raiz + filial
  const dv = (b: string) => {
    const pesos = b.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const r = [...b].reduce((s, c, i) => s + Number(c) * pesos[i], 0) % 11
    return r < 2 ? 0 : 11 - r
  }
  const d1 = dv(base)
  return base + d1 + dv(base + d1)
}

const CNAES = [
  '5211701 - ARMAZENS GERAIS - EMISSAO DE WARRANT',
  '4622200 - COMERCIO ATACADISTA DE SOJA',
  '0163600 - ATIVIDADES DE POS-COLHEITA',
  '4611700 - REPRESENTANTES COMERCIAIS E AGENTES DO COMERCIO DE MATERIAS-PRIMAS AGRICOLAS',
  '4789004 - COMERCIO VAREJISTA DE ANIMAIS VIVOS E DE ARTIGOS E ALIMENTOS PARA ANIMAIS',
  '4744099 - COMERCIO VAREJISTA DE MATERIAIS DE CONSTRUCAO EM GERAL',
  '4683400 - COMERCIO ATACADISTA DE DEFENSIVOS AGRICOLAS, ADUBOS, FERTILIZANTES',
  '4661300 - COMERCIO ATACADISTA DE MAQUINAS; PARTES E PECAS',
]
const UFS = ['MG', 'SP', 'GO', 'MT', 'PR', 'RS', 'BA', 'MS']
const DDD: Record<string, string> = { MG: '35', SP: '16', GO: '64', MT: '66', PR: '43', RS: '55', BA: '77', MS: '67' }
const CIDADES = ['CIDADE FICTICIA A', 'CIDADE FICTICIA B', 'CIDADE FICTICIA C', 'VILA TESTE']
const NOMES = ['FULANO', 'BELTRANO', 'CICRANO', 'MARIA TESTE', 'JOAO EXEMPLO']
const FAIXAS = ['4 - ACIMA DE 2 ATE 3 ANOS', '6 - ACIMA DE 5 ATE 10 ANOS', '8 - ACIMA DE 20 ATE 50 ANOS']

async function run() {
  const total = Number(opcao('linhas') ?? 5000)
  const saida = path.resolve(opcao('saida') ?? path.join(os.tmpdir(), `crm-ficticio-${total}.xlsx`))

  // Colunas fora da ordem original
  const colunas = [...CAMPOS].sort(() => aleatorio() - 0.5)
  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: saida })
  const ws = wb.addWorksheet('Planilha1')
  ws.addRow(colunas).commit()

  const emitidos: string[] = []
  for (let i = 0; i < total; i++) {
    const uf = escolher(UFS)
    const ddd = DDD[uf]
    // ~25% começam com zero (o Excel corta), ~8% repetem um CNPJ já emitido, ~5% filiais do mesmo grupo
    const sorte = aleatorio()
    let cnpj: string
    if (sorte < 0.08 && emitidos.length) cnpj = escolher(emitidos)
    else if (sorte < 0.13 && emitidos.length) cnpj = cnpjValido(escolher(emitidos).slice(0, 8), '000' + Math.floor(2 + aleatorio() * 7))
    else cnpj = cnpjValido(aleatorio() < 0.25 ? '0' + digitos(7) : String(1 + Math.floor(aleatorio() * 9)) + digitos(7), '0001')
    emitidos.push(cnpj)

    const r: Record<string, unknown> = {}
    const razao = `EMPRESA FICTICIA ${i + 1} ${escolher(['LTDA', 'S/A', 'COOPERATIVA AGRO', 'EM RECUPERACAO JUDICIAL', 'ME'])}`
    r.CNPJ = aleatorio() < 0.01 ? Number(cnpj) + 1 : Number(cnpj) // ~1% com dígito verificador errado
    r.RazaoSocial = razao
    r.NomeFantasia = aleatorio() < 0.6 ? `FANTASIA ${i + 1}` : null
    r.TipoEmpresa = cnpj.slice(8, 12) === '0001' ? 'MATRIZ' : 'FILIAL'
    r.SituacaoCadastral = aleatorio() < 0.03 ? 'BAIXADA' : 'ATIVA'
    r.fxDataFundacao = escolher(FAIXAS)
    r.Logradouro = `RUA TESTE ${i}`
    r.Numero = aleatorio() < 0.2 ? 'S/N' : Math.floor(aleatorio() * 3000)
    r.Bairro = 'CENTRO'
    r.Cidade = escolher(CIDADES)
    r.Estado = uf
    r.CEP = Number((aleatorio() < 0.1 ? '0' : '3') + digitos(7)) // alguns perdem o zero
    r.CNAE_Primario = escolher(CNAES)
    for (let k = 1; k <= 4; k++) if (aleatorio() < 0.5) r[`CNAE_Secundario_${k}`] = escolher(CNAES)

    const semCanal = aleatorio() < 0.04
    if (!semCanal) {
      if (aleatorio() < 0.5) {
        r.DDD1 = ddd
        r.Telefone1 = Number('3' + digitos(7))
      }
      if (aleatorio() < 0.4) {
        r.DDD_Celular1 = ddd
        r.Celular1 = Number('9' + digitos(8))
      }
      if (aleatorio() < 0.03) {
        r.DDD2 = '00' // telefone fora do padrão
        r.Telefone2 = 123
      }
      const semContato = aleatorio() < 0.03
      if (!semContato) {
        r.NomeContato = aleatorio() < 0.05 ? razao : aleatorio() < 0.04 ? null : `${escolher(NOMES)} ${i}`
        r.DDD_CelularContato1 = ddd
        r.CelularContato1 = Number('9' + digitos(8))
        if (aleatorio() < 0.7) r.EmailContato = aleatorio() < 0.03 ? 'email-invalido' : `contato${i}@exemplo.test`
      }
    }
    ws.addRow(colunas.map((c) => r[c] ?? null)).commit()
  }
  ws.commit()
  await wb.commit()
  console.log(`Arquivo fictício com ${total} linhas: ${saida}`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
