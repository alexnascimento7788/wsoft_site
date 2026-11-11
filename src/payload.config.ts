import { postgresAdapter } from '@payloadcms/db-postgres'
import { pt } from '@payloadcms/translations/languages/pt'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Auditoria, ModelosImportacao, SolicitacoesTitular } from './collections/Crm/Administracao'
import { Contatos } from './collections/Crm/Contatos'
import { Desfechos } from './collections/Crm/Desfechos'
import { Empresas } from './collections/Crm/Empresas'
import { LotesImportacao } from './collections/Crm/LotesImportacao'
import { DiaItens, Dias } from './collections/Crm/MeuDia'
import { Movimentacoes } from './collections/Crm/Movimentacoes'
import { Qualificacoes } from './collections/Crm/Qualificacoes'
import { RegistrosContato } from './collections/Crm/RegistrosContato'
import { Media } from './collections/Media'
import { CentrosDeCusto } from './collections/Orcamento/CentrosDeCusto'
import { Contas } from './collections/Orcamento/Contas'
import { Despesas } from './collections/Orcamento/Despesas'
import { Fornecedores } from './collections/Orcamento/Fornecedores'
import { Products } from './collections/Products'
import { Users } from './collections/Users'
import { ConfiguracaoOrcamento } from './globals/ConfiguracaoOrcamento'
import { CrmConfiguracao } from './globals/CrmConfiguracao'
import { SiteSettings } from './globals/SiteSettings'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // Login com a identidade Wsoft, diferente para CRM, Orçamento e Administração
      beforeLogin: ['@/components/BeforeLogin'],
      graphics: {
        Logo: '@/components/admin/Login/Logo',
        Icon: '@/components/admin/Login/Icon',
      },
      beforeDashboard: ['@/components/BeforeDashboard'],
      // Menu próprio: cada bloco (Orçamento, CRM, Site) com o painel em cima e os itens embaixo
      Nav: '@/components/admin/Nav',
      views: {
        orcamento: {
          Component: '@/components/admin/OrcamentoView',
          path: '/orcamento',
          exact: true,
          meta: { title: 'Painel do orçamento' },
        },
        lancamentos: {
          Component: '@/components/admin/LancamentosView',
          path: '/orcamento/lancamentos',
          exact: true,
          meta: { title: 'Lançamentos do mês' },
        },
        crm: {
          Component: '@/components/admin/CrmView',
          path: '/crm',
          exact: true,
          meta: { title: 'CRM' },
        },
        meuDia: {
          Component: '@/components/admin/MeuDiaView',
          path: '/crm/meu-dia',
          exact: true,
          meta: { title: 'Meu dia' },
        },
      },
    },
    meta: {
      titleSuffix: ' · Wsoft',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
  },
  editor: defaultLexical,
  // Admin só em português (sem opção de idioma)
  i18n: {
    supportedLanguages: { pt },
    fallbackLanguage: 'pt',
    translations: {
      pt: {
        authentication: { logOut: 'Sair', login: 'Entrar' },
        general: { dashboard: 'Início' },
      },
    },
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI,
    },
    // Schema só muda via migrations (src/migrations) — ver README "Banco de dados".
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  // A ordem define a ordem dos grupos e itens no menu: Orçamento, CRM, Site
  collections: [
    CentrosDeCusto,
    Contas,
    Despesas,
    Fornecedores,
    Empresas,
    Contatos,
    RegistrosContato,
    Qualificacoes,
    Desfechos,
    Movimentacoes,
    Dias,
    DiaItens,
    LotesImportacao,
    ModelosImportacao,
    SolicitacoesTitular,
    Auditoria,
    Products,
    Media,
    Users,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [ConfiguracaoOrcamento, CrmConfiguracao, SiteSettings],
  plugins,
  secret: process.env.PAYLOAD_SECRET || '',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
