// Canais de contato que uma empresa tem (ícones na lista de Empresas).
// Gravados na própria empresa (campo `canais`) e recalculados quando a empresa ou um contato muda.

export type CanalEmpresa = 'whatsapp' | 'telefone' | 'email'

type Telefone = { numero?: string | null; tipo?: string | null; valido?: boolean | null; semWhatsapp?: boolean | null }
type Pessoa = { email?: string | null; emailInvalido?: boolean | null; naoContatar?: boolean | null; telefones?: Telefone[] | null }

export const ORDEM_CANAIS: CanalEmpresa[] = ['whatsapp', 'telefone', 'email']

// - WhatsApp: algum celular válido que não foi marcado "não tem WhatsApp" (da empresa ou de uma pessoa que pode ser contatada);
// - Telefone: algum número válido (fixo ou celular);
// - E-mail: alguma pessoa com e-mail que não foi marcado "não existe".
// Quem está como "Não contatar" não conta.
export function calcularCanais(telefonesEmpresa: Telefone[] | null | undefined, pessoas: Pessoa[]): CanalEmpresa[] {
  const ativas = pessoas.filter((p) => !p.naoContatar)
  const telefones = [...(telefonesEmpresa ?? []), ...ativas.flatMap((p) => p.telefones ?? [])].filter(
    (t) => t.numero && t.valido !== false,
  )
  const tem = {
    whatsapp: telefones.some((t) => t.tipo === 'celular' && !t.semWhatsapp),
    telefone: telefones.length > 0,
    email: ativas.some((p) => Boolean(p.email?.trim()) && !p.emailInvalido),
  }
  return ORDEM_CANAIS.filter((c) => tem[c])
}
