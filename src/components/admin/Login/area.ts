// Área da tela de login, pelo destino depois do login (?redirect=...): /crm, /orcamento ou o admin
export type AreaLogin = 'crm' | 'orcamento' | 'admin'

const ORCAMENTO = ['/orcamento', '/collections/centros-de-custo', '/collections/contas', '/collections/despesas', '/collections/fornecedores', '/globals/configuracao-orcamento']

export function areaDoLogin(searchParams?: Record<string, string | string[] | undefined>): AreaLogin {
  const bruto = searchParams?.redirect
  const destino = decodeURIComponent((Array.isArray(bruto) ? bruto[0] : bruto) ?? '')
  const caminho = destino.replace(/^\/admin/, '')
  if (caminho.startsWith('/crm') || caminho.startsWith('/collections/crm-') || caminho.startsWith('/globals/crm-')) {
    return 'crm'
  }
  if (ORCAMENTO.some((p) => caminho.startsWith(p))) return 'orcamento'
  return 'admin'
}

export const AREAS: Record<AreaLogin, { titulo: string; destaque: string; texto: string }> = {
  crm: {
    titulo: 'CRM',
    destaque: 'Wsoft',
    texto: 'Prospecção: entre para ver sua fila de leads, registrar contatos e acompanhar as apresentações.',
  },
  orcamento: {
    titulo: 'Orçamento',
    destaque: 'Wsoft',
    texto: 'Entre para acompanhar o painel, lançar o realizado e a previsão de cada mês.',
  },
  admin: {
    titulo: 'Administração',
    destaque: 'Wsoft',
    texto: 'Entre para gerenciar o site, os usuários e as áreas de Orçamento e CRM.',
  },
}
