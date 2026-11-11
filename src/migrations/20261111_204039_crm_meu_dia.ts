import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_crm_empresas_canais" AS ENUM('whatsapp', 'telefone', 'email');
  CREATE TYPE "public"."enum_crm_dia_itens_origem" AS ENUM('sorteio', 'manual');
  CREATE TABLE "crm_empresas_canais" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_crm_empresas_canais",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "crm_dias" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"usuario_id" integer NOT NULL,
  	"dia" varchar NOT NULL,
  	"meta" numeric DEFAULT 5 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "crm_dia_itens" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"usuario_id" integer NOT NULL,
  	"dia" varchar NOT NULL,
  	"empresa_id" integer NOT NULL,
  	"origem" "enum_crm_dia_itens_origem" DEFAULT 'sorteio',
  	"feito" boolean DEFAULT false,
  	"feito_em" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crm_dias_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crm_dia_itens_id" integer;
  ALTER TABLE "crm_configuracao" ADD COLUMN "meu_dia_leads_sem_vendedor" boolean DEFAULT true;
  ALTER TABLE "crm_empresas_canais" ADD CONSTRAINT "crm_empresas_canais_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."crm_empresas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "crm_dias" ADD CONSTRAINT "crm_dias_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "crm_dia_itens" ADD CONSTRAINT "crm_dia_itens_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "crm_dia_itens" ADD CONSTRAINT "crm_dia_itens_empresa_id_crm_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."crm_empresas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "crm_empresas_canais_order_idx" ON "crm_empresas_canais" USING btree ("order");
  CREATE INDEX "crm_empresas_canais_parent_idx" ON "crm_empresas_canais" USING btree ("parent_id");
  CREATE INDEX "crm_dias_usuario_idx" ON "crm_dias" USING btree ("usuario_id");
  CREATE INDEX "crm_dias_dia_idx" ON "crm_dias" USING btree ("dia");
  CREATE INDEX "crm_dias_updated_at_idx" ON "crm_dias" USING btree ("updated_at");
  CREATE INDEX "crm_dias_created_at_idx" ON "crm_dias" USING btree ("created_at");
  CREATE INDEX "crm_dia_itens_usuario_idx" ON "crm_dia_itens" USING btree ("usuario_id");
  CREATE INDEX "crm_dia_itens_dia_idx" ON "crm_dia_itens" USING btree ("dia");
  CREATE INDEX "crm_dia_itens_empresa_idx" ON "crm_dia_itens" USING btree ("empresa_id");
  CREATE INDEX "crm_dia_itens_feito_idx" ON "crm_dia_itens" USING btree ("feito");
  CREATE INDEX "crm_dia_itens_updated_at_idx" ON "crm_dia_itens" USING btree ("updated_at");
  CREATE INDEX "crm_dia_itens_created_at_idx" ON "crm_dia_itens" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crm_dias_fk" FOREIGN KEY ("crm_dias_id") REFERENCES "public"."crm_dias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crm_dia_itens_fk" FOREIGN KEY ("crm_dia_itens_id") REFERENCES "public"."crm_dia_itens"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_crm_dias_id_idx" ON "payload_locked_documents_rels" USING btree ("crm_dias_id");
  CREATE INDEX "payload_locked_documents_rels_crm_dia_itens_id_idx" ON "payload_locked_documents_rels" USING btree ("crm_dia_itens_id");

  -- Canais (ícones da lista) das empresas que já estão no banco: mesma regra de src/crm/canais.ts
  -- (WhatsApp = celular válido; Telefone = qualquer número válido; E-mail = pessoa com e-mail;
  -- pessoas com "Não contatar" não contam)
  WITH tel AS (
    SELECT t._parent_id AS empresa_id, t.tipo::text AS tipo FROM crm_empresas_telefones t WHERE t.valido IS NOT FALSE
    UNION ALL
    SELECT c.empresa_id, t.tipo::text FROM crm_contatos_telefones t JOIN crm_contatos c ON c.id = t._parent_id
     WHERE t.valido IS NOT FALSE AND c.nao_contatar IS NOT TRUE
  ),
  canais AS (
    SELECT DISTINCT empresa_id, 'whatsapp' AS valor, 1 AS ordem FROM tel WHERE tipo = 'celular'
    UNION
    SELECT DISTINCT empresa_id, 'telefone', 2 FROM tel
    UNION
    SELECT DISTINCT c.empresa_id, 'email', 3 FROM crm_contatos c
     WHERE c.nao_contatar IS NOT TRUE AND coalesce(trim(c.email), '') <> ''
  )
  INSERT INTO crm_empresas_canais ("order", parent_id, value)
  SELECT row_number() OVER (PARTITION BY empresa_id ORDER BY ordem), empresa_id, valor::"enum_crm_empresas_canais"
    FROM canais WHERE empresa_id IN (SELECT id FROM crm_empresas);

  -- Novas tabelas do CRM fora da API REST do Supabase (mesma regra da migração do CRM)
  DO $$
  DECLARE t record;
  BEGIN
    FOR t IN SELECT tablename FROM pg_tables
             WHERE schemaname = 'public' AND tableowner = current_user
               AND tablename IN ('crm_empresas_canais', 'crm_dias', 'crm_dia_itens') LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
         AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
      END IF;
    END LOOP;
  END $$;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "crm_empresas_canais" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_dias" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_dia_itens" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "crm_empresas_canais" CASCADE;
  DROP TABLE "crm_dias" CASCADE;
  DROP TABLE "crm_dia_itens" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crm_dias_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crm_dia_itens_fk";
  
  DROP INDEX "payload_locked_documents_rels_crm_dias_id_idx";
  DROP INDEX "payload_locked_documents_rels_crm_dia_itens_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crm_dias_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crm_dia_itens_id";
  ALTER TABLE "crm_configuracao" DROP COLUMN "meu_dia_leads_sem_vendedor";
  DROP TYPE "public"."enum_crm_empresas_canais";
  DROP TYPE "public"."enum_crm_dia_itens_origem";`)
}
