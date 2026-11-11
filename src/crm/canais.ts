// Canais de contato que uma empresa tem (ícones na lista de Empresas).
// Gravados na própria empresa (campo `canais`) e recalculados quando a empresa ou um contato muda.

export type CanalEmpresa = 'whatsapp' | 'telefone' | 'email'

type Telefone = { numero?: string | null; tipo?: string | null; valido?: boolean | null }
type Pessoa = { email?: string | null; naoContatar?: boolean | null; telefones?: Telefone[] | null }

export const ORDEM_CANAIS: CanalEmpresa[] = ['whatsapp', 'telefone', 'email']

// - WhatsApp: algum celular válido (da empresa ou de uma pessoa que pode ser contatada);
// - Telefone: algum número válido (fixo ou celular);
// - E-mail: alguma pessoa com e-mail.
// Quem está como "Não contatar" não conta.
export function calcularCanais(telefonesEmpresa: Telefone[] | null | undefined, pessoas: Pessoa[]): CanalEmpresa[] {
  const ativas = pessoas.filter((p) => !p.naoContatar)
  const telefones = [...(telefonesEmpresa ?? []), ...ativas.flatMap((p) => p.telefones ?? [])].filter(
    (t) => t.numero && t.valido !== false,
  )
  const tem = {
    whatsapp: telefones.some((t) => t.tipo === 'celular'),
    telefone: telefones.length > 0,
    email: ativas.some((p) => Boolean(p.email?.trim())),
  }
  return ORDEM_CANAIS.filter((c) => tem[c])
}
