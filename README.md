# Site WSoft

Site institucional da WSoft, construído com Next.js (App Router) + Payload CMS 3, banco Postgres (Supabase) e deploy na Vercel.

## Stack

- Next.js 16 (App Router)
- Payload CMS 3 rodando dentro do próprio Next.js
- `@payloadcms/db-postgres` (Postgres via Supabase)
- `@payloadcms/storage-s3` apontando para o Supabase Storage (bucket público `media`) — necessário porque a Vercel não tem disco persistente para uploads
- Tailwind CSS 4

## Estrutura

- `/` — Home (hero, vitrine de produtos, destaque SiagWeb, suporte, números, sobre nós)
- `/produtos/[slug]` — template único de produto, reaproveitado por todos os produtos cadastrados no admin
- `/admin` — painel administrativo do Payload
- `/admin/orcamento` — painel do orçamento (KPIs, gráfico mensal, centros de custo/contas, fornecedores)

### Collections e Globals

- **`products`** — nome, slug, logo, status (`ativo` | `em-breve`), descrição curta, features (rich text), ordem de exibição
- **`media`** — biblioteca de mídia (logos, ilustrações)
- **`users`** — usuários do admin, com perfil (`admin` = site + orçamento + usuários; `financeiro` = edita o orçamento; `consulta` = só vê o orçamento)
- **Orçamento** (grupo no admin): `centros-de-custo` → `contas` → `despesas` (fornecedor + orçado/realizado/previsão de jan a dez), `fornecedores` e o global `configuracao-orcamento` (ano vigente, último mês fechado, % de alerta/limite)
- **Global `site-settings`** — contato (WhatsApp, e-mail, telefones) e conteúdo da home (headline, subtítulo, números)

## Rodando localmente

1. Copie `.env.example` para `.env` e preencha:
   - `DATABASE_URI`: connection string do Postgres (Supabase → Connect → aba ORMs/Connection string, usar o "Session pooler", porta 5432 — o "Transaction pooler" na 6543 não é confiável para os pushes de schema do Payload em dev)
   - `PAYLOAD_SECRET`: qualquer string aleatória
   - `NEXT_PUBLIC_SERVER_URL`: `http://localhost:3000` em dev
   - `S3_*`: credenciais do Supabase Storage (Storage → S3 Connection). O bucket (`S3_BUCKET`, padrão `media`) precisa existir e ser público.

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Aplique as migrations no banco e rode o servidor de desenvolvimento:

   ```bash
   npm run migrate
   npm run dev
   ```

4. Acesse `http://localhost:3000/admin` para criar o primeiro usuário e cadastrar os produtos e as configurações do site.

### Seed inicial de produtos

`npm run seed:orcamento` lança os gastos de 2026 do centro de custo 1101 (realizado jan–set, previsão de outubro). Também idempotente.

`npm run seed:products` cria/atualiza os produtos (SIAG Café, Cereais, Siscoope, SiagWeb) e o WhatsApp em `site-settings`, subindo as imagens de `scripts/seed-products.ts` (por padrão lê de `C:/Users/lequi/Downloads/Imagens` — ajuste `IMAGES_DIR` no script se os arquivos estiverem em outro lugar). É idempotente, pode rodar de novo sem duplicar.

## Banco de dados (migrations)

O schema **não** é mais criado automaticamente (`push: false`). Toda mudança de collection/campo gera uma migration em `src/migrations`, que vai junto no git:

```bash
npm run payload migrate:create nome-da-mudanca   # gera a migration (não precisa de banco)
npm run migrate                                   # aplica no banco do .env
npm run migrate:status                            # mostra o que já foi aplicado
```

- A migration `baseline` representa o site como era antes das migrations: em banco que já tem as tabelas ela não faz nada; em banco vazio cria tudo.
- Em banco que já foi usado com o push do modo dev, o `migrate` pergunta *"It looks like you've run Payload in dev mode… Would you like to proceed?"* — responda **y**. Não há perda de dados: só rodam as migrations da pasta.
- **Cada ambiente (homologação e produção) precisa rodar `npm run migrate` com o seu próprio `DATABASE_URI`** depois de receber um commit que traga migration nova, antes de usar as telas novas.

## Build de produção

```bash
npm run build
npm run start
```

## Deploy

Projeto pronto para deploy na Vercel — basta conectar o repositório e configurar as mesmas variáveis de ambiente do `.env` (`DATABASE_URI`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL` com o domínio de produção, `S3_*`) no painel do projeto.

Na Vercel, prefira o **Transaction pooler** do Supabase (porta 6543) para `DATABASE_URI` em produção — funciona melhor com o ambiente serverless.
