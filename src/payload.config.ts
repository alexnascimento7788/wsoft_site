import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Auditoria, ModelosImportacao, SolicitacoesTitular } from './collections/Crm/Administracao'
import { Contatos } from './collections/Crm/Contatos'
import { Desfechos } from './collections/Crm/Desfechos'
import { Empresas } from './collections/Crm/Empresas'
import { LotesImportacao } from './collections/Crm/LotesImportacao'
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
      beforeLogin: ['@/components/BeforeLogin'],
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
        crm: {
          Component: '@/components/admin/CrmView',
          path: '/crm',
          exact: true,
          meta: { title: 'CRM' },
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
  },
  editor: defaultLexical,
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
