import { chave, soDigitos } from './normalizar'

type ListaCnae = { codigo?: string | null }[] | null | undefined

export type RegraPrioridade = {
  cnaesAlta?: ListaCnae
  termosAlta?: { termo?: string | null }[] | null
  cnaesMediaPrimario?: ListaCnae
}

export type Prioridade = 'alta' | 'media' | 'baixa'

// Prioridade de contato (só ordena a fila; não é a classificação do lead).
// Alta: CNAE primário na lista Alta, ou termo na razão social (ex.: COOPERATIV).
// Média: não é Alta, mas algum CNAE secundário está na lista Alta, ou o primário está na lista Média.
export function criarCalculoPrioridade(regra: RegraPrioridade) {
  const codigos = (l: ListaCnae) => new Set((l ?? []).map((c) => soDigitos(c.codigo).padStart(7, '0')))
  const alta = codigos(regra.cnaesAlta)
  const mediaPrimario = codigos(regra.cnaesMediaPrimario)
  const termos = (regra.termosAlta ?? []).map((t) => chave(t.termo)).filter(Boolean)

  return (cnaePrimario: string | null, cnaesSecundarios: string[], razaoSocial: string): Prioridade => {
    const razao = chave(razaoSocial)
    if ((cnaePrimario && alta.has(cnaePrimario)) || termos.some((t) => razao.includes(t))) return 'alta'
    if (cnaesSecundarios.some((c) => alta.has(c)) || (cnaePrimario && mediaPrimario.has(cnaePrimario))) return 'media'
    return 'baixa'
  }
}
