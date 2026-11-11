// Estrutura do menu lateral: áreas (Orçamento, CRM, Site) → seções → itens.
// Itens apontam para painéis (views) ou coleções/globais; quem enxerga cada um é decidido
// pelo access control (o menu só mostra o que o usuário pode abrir).

export type ItemMenu =
  | { tipo: 'painel'; path: string; label: string; icone: string; contador?: string }
  | { tipo: 'colecao' | 'global'; slug: string; label?: string; icone: string; contador?: string }

export type SecaoMenu = { id: string; titulo?: string; fechadaPorPadrao?: boolean; itens: ItemMenu[] }
export type AreaMenu = { id: string; grupo: string; titulo: string; cor: string; secoes: SecaoMenu[] }

export const AREAS: AreaMenu[] = [
  {
    id: 'orcamento',
    grupo: 'Orçamento',
    titulo: 'Orçamento',
    cor: '#2f8a35',
    secoes: [
      {
        id: 'orc-paineis',
        itens: [
          { tipo: 'painel', path: '/orcamento', label: 'Painel do orçamento', icone: 'chart' },
          { tipo: 'painel', path: '/orcamento/lancamentos', label: 'Lançamentos do mês', icone: 'notebook' },
        ],
      },
      {
        id: 'orc-cadastros',
        titulo: 'Cadastros',
        itens: [
          { tipo: 'colecao', slug: 'despesas', icone: 'receipt' },
          { tipo: 'colecao', slug: 'contas', icone: 'list' },
          { tipo: 'colecao', slug: 'centros-de-custo', icone: 'layers' },
          { tipo: 'colecao', slug: 'fornecedores', icone: 'truck' },
          { tipo: 'global', slug: 'configuracao-orcamento', icone: 'settings' },
        ],
      },
    ],
  },
  {
    id: 'crm',
    grupo: 'CRM',
    titulo: 'CRM',
    cor: '#f4791f',
    secoes: [
      {
        id: 'crm-trabalho',
        titulo: 'Meu trabalho',
        itens: [
          { tipo: 'painel', path: '/crm', label: 'Painel do CRM', icone: 'target' },
          { tipo: 'painel', path: '/crm/meu-dia', label: 'Meu dia', icone: 'calendar', contador: 'meuDia' },
          { tipo: 'colecao', slug: 'crm-empresas', icone: 'building', contador: 'retornos' },
        ],
      },
      {
        id: 'crm-registros',
        titulo: 'Registros (nascem da empresa)',
        itens: [
          { tipo: 'colecao', slug: 'crm-contatos', icone: 'users' },
          { tipo: 'colecao', slug: 'crm-registros-contato', icone: 'phone', contador: 'tentativasHoje' },
          { tipo: 'colecao', slug: 'crm-qualificacoes', icone: 'badge' },
          { tipo: 'colecao', slug: 'crm-desfechos', icone: 'trophy' },
          { tipo: 'colecao', slug: 'crm-movimentacoes', icone: 'history' },
        ],
      },
      {
        id: 'crm-admin',
        titulo: 'Administração',
        fechadaPorPadrao: true,
        itens: [
          { tipo: 'colecao', slug: 'crm-solicitacoes-titular', icone: 'shield', contador: 'titularAbertas' },
          { tipo: 'colecao', slug: 'crm-lotes-importacao', icone: 'upload' },
          { tipo: 'colecao', slug: 'crm-modelos-importacao', icone: 'columns' },
          { tipo: 'colecao', slug: 'crm-auditoria', icone: 'eye' },
          { tipo: 'global', slug: 'crm-configuracao', icone: 'settings' },
        ],
      },
    ],
  },
  {
    id: 'site',
    grupo: 'Site',
    titulo: 'Site',
    cor: '#64748b',
    secoes: [
      {
        id: 'site-conteudo',
        itens: [
          { tipo: 'colecao', slug: 'products', icone: 'package' },
          { tipo: 'colecao', slug: 'media', icone: 'image' },
          { tipo: 'global', slug: 'site-settings', icone: 'settings' },
          { tipo: 'colecao', slug: 'users', icone: 'user' },
        ],
      },
    ],
  },
]

// Item já pronto para a tela (rótulo resolvido, link, contador)
export type ItemPronto = { id: string; href: string; label: string; icone: string; exato: boolean; contador?: number; alerta?: boolean }
export type SecaoPronta = { id: string; titulo?: string; fechadaPorPadrao?: boolean; itens: ItemPronto[] }
export type AreaPronta = { id: string; titulo: string; cor: string; secoes: SecaoPronta[] }
