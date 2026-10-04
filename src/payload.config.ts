import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Media } from './collections/Media'
import { CentrosDeCusto } from './collections/Orcamento/CentrosDeCusto'
import { Contas } from './collections/Orcamento/Contas'
import { Despesas } from './collections/Orcamento/Despesas'
import { Fornecedores } from './collections/Orcamento/Fornecedores'
import { Products } from './collections/Products'
import { Users } from './collections/Users'
import { ConfiguracaoOrcamento } from './globals/ConfiguracaoOrcamento'
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
      beforeNavLinks: ['@/components/admin/OrcamentoNavLink'],
      views: {
        orcamento: {
          Component: '@/components/admin/OrcamentoView',
          path: '/orcamento',
          exact: true,
          meta: { title: 'Painel do orçamento' },
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
  collections: [Products, Media, Users, CentrosDeCusto, Contas, Fornecedores, Despesas],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [SiteSettings, ConfiguracaoOrcamento],
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
