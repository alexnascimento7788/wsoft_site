import { chave } from './normalizar'

// Campos que o motor entende. O modelo "Boa Vista — 44 colunas" usa exatamente estes nomes.
export const CAMPOS = [
  'CNPJ', 'RazaoSocial', 'NomeFantasia', 'TipoEmpresa', 'SituacaoCadastral', 'fxDataFundacao',
  'Logradouro', 'Numero', 'Complemento', 'Bairro', 'Cidade', 'Estado', 'CEP',
  'DDD1', 'Telefone1', 'DDD2', 'Telefone2', 'DDD3', 'Telefone3',
  'DDD_Celular1', 'Celular1', 'DDD_Celular2', 'Celular2', 'DDD_Celular3', 'Celular3',
  'NomeContato',
  'DDDContato1', 'TelefoneContato1', 'DDDContato2', 'TelefoneContato2', 'DDDContato3', 'TelefoneContato3',
  'DDD_CelularContato1', 'CelularContato1', 'DDD_CelularContato2', 'CelularContato2', 'DDD_CelularContato3', 'CelularContato3',
  'EmailContato',
  'CNAE_Primario', 'CNAE_Secundario_1', 'CNAE_Secundario_2', 'CNAE_Secundario_3', 'CNAE_Secundario_4',
] as const

export type Campo = (typeof CAMPOS)[number]
export type Registro = Partial<Record<Campo, unknown>>

export const OBRIGATORIOS: Campo[] = ['CNPJ', 'RazaoSocial']

// Pares DDD/número, na ordem em que viram telefones
export const TELEFONES_EMPRESA: [Campo, Campo][] = [
  ['DDD1', 'Telefone1'], ['DDD2', 'Telefone2'], ['DDD3', 'Telefone3'],
  ['DDD_Celular1', 'Celular1'], ['DDD_Celular2', 'Celular2'], ['DDD_Celular3', 'Celular3'],
]
export const TELEFONES_CONTATO: [Campo, Campo][] = [
  ['DDDContato1', 'TelefoneContato1'], ['DDDContato2', 'TelefoneContato2'], ['DDDContato3', 'TelefoneContato3'],
  ['DDD_CelularContato1', 'CelularContato1'], ['DDD_CelularContato2', 'CelularContato2'], ['DDD_CelularContato3', 'CelularContato3'],
]
export const CNAES: Campo[] = ['CNAE_Primario', 'CNAE_Secundario_1', 'CNAE_Secundario_2', 'CNAE_Secundario_3', 'CNAE_Secundario_4']

export const MODELO_BOA_VISTA = 'Boa Vista — 44 colunas'

const porChave = new Map(CAMPOS.map((c) => [chave(c).replace(/ /g, ''), c]))

// Cabeçalhos da planilha → campos (a ordem das colunas não importa).
// `mapeamento` manual (cabeçalho → campo) tem prioridade sobre o reconhecimento automático.
export function mapearCabecalhos(cabecalhos: unknown[], mapeamento?: Record<string, string>) {
  const indice: Partial<Record<Campo, number>> = {}
  const ignorados: string[] = []
  cabecalhos.forEach((h, i) => {
    const nome = String(h ?? '').trim()
    if (!nome) return
    const manual = mapeamento?.[nome] as Campo | undefined
    const campo = manual && (CAMPOS as readonly string[]).includes(manual) ? manual : porChave.get(chave(nome).replace(/ /g, ''))
    if (campo && indice[campo] === undefined) indice[campo] = i
    else ignorados.push(nome)
  })
  const faltando = OBRIGATORIOS.filter((c) => indice[c] === undefined)
  const modelo = CAMPOS.every((c) => indice[c] !== undefined) ? MODELO_BOA_VISTA : null
  return { indice, faltando, ignorados, modelo }
}
