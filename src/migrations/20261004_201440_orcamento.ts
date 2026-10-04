import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  // Em homologação/produção estas tabelas acabaram criadas pelo push do modo dev antes
  // desta migration existir — nesse caso só corrige o perfil dos usuários antigos.
  const existing = await db.execute(sql`SELECT to_regclass('public.despesas') AS t`)
  if (existing.rows[0]?.t) {
    // O push criou "role" com default 'financeiro'; quem já existia antes dos perfis volta a admin.
    await db.execute(sql`
      UPDATE "users" SET "role" = 'admin'
      WHERE "role" = 'financeiro' AND "created_at" < '2026-10-04T20:00:00Z';
      ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'financeiro';`)
    payload.logger.info({ msg: 'orcamento: tabelas já existem; perfis antigos ajustados para admin.' })
    return
  }

  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'financeiro', 'consulta');
  CREATE TYPE "public"."enum_despesas_periodicidade" AS ENUM('mensal', 'anual', 'eventual');
  CREATE TYPE "public"."enum_configuracao_orcamento_mes_fechado" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  CREATE TABLE "centros_de_custo" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"codigo" varchar NOT NULL,
  	"nome" varchar NOT NULL,
  	"responsavel_id" integer,
  	"descricao" varchar,
  	"ativo" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"centro_de_custo_id" integer NOT NULL,
  	"codigo" varchar NOT NULL,
  	"nome" varchar NOT NULL,
  	"descricao" varchar,
  	"ativo" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "fornecedores" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"documento" varchar,
  	"email" varchar,
  	"telefone" varchar,
  	"observacoes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "despesas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"descricao" varchar NOT NULL,
  	"ano" numeric NOT NULL,
  	"conta_id" integer NOT NULL,
  	"fornecedor_id" integer,
  	"periodicidade" "enum_despesas_periodicidade" DEFAULT 'mensal' NOT NULL,
  	"valor_mensal" numeric,
  	"orcado_jan" numeric,
  	"orcado_fev" numeric,
  	"orcado_mar" numeric,
  	"orcado_abr" numeric,
  	"orcado_mai" numeric,
  	"orcado_jun" numeric,
  	"orcado_jul" numeric,
  	"orcado_ago" numeric,
  	"orcado_set" numeric,
  	"orcado_out" numeric,
  	"orcado_nov" numeric,
  	"orcado_dez" numeric,
  	"realizado_jan" numeric,
  	"realizado_fev" numeric,
  	"realizado_mar" numeric,
  	"realizado_abr" numeric,
  	"realizado_mai" numeric,
  	"realizado_jun" numeric,
  	"realizado_jul" numeric,
  	"realizado_ago" numeric,
  	"realizado_set" numeric,
  	"realizado_out" numeric,
  	"realizado_nov" numeric,
  	"realizado_dez" numeric,
  	"observacoes" varchar,
  	"centro_de_custo_id" integer,
  	"total_orcado" numeric,
  	"total_realizado" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "configuracao_orcamento" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ano_vigente" numeric NOT NULL,
  	"mes_fechado" "enum_configuracao_orcamento_mes_fechado",
  	"alerta_percentual" numeric DEFAULT 90 NOT NULL,
  	"limite_percentual" numeric DEFAULT 100 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  -- Usuários que já existem continuam administradores; só os novos nascem como "financeiro".
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'admin' NOT NULL;
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'financeiro';
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "centros_de_custo_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "contas_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "fornecedores_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "despesas_id" integer;
  ALTER TABLE "centros_de_custo" ADD CONSTRAINT "centros_de_custo_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contas" ADD CONSTRAINT "contas_centro_de_custo_id_centros_de_custo_id_fk" FOREIGN KEY ("centro_de_custo_id") REFERENCES "public"."centros_de_custo"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "despesas" ADD CONSTRAINT "despesas_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "despesas" ADD CONSTRAINT "despesas_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "despesas" ADD CONSTRAINT "despesas_centro_de_custo_id_centros_de_custo_id_fk" FOREIGN KEY ("centro_de_custo_id") REFERENCES "public"."centros_de_custo"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "centros_de_custo_codigo_idx" ON "centros_de_custo" USING btree ("codigo");
  CREATE INDEX "centros_de_custo_responsavel_idx" ON "centros_de_custo" USING btree ("responsavel_id");
  CREATE INDEX "centros_de_custo_updated_at_idx" ON "centros_de_custo" USING btree ("updated_at");
  CREATE INDEX "centros_de_custo_created_at_idx" ON "centros_de_custo" USING btree ("created_at");
  CREATE INDEX "contas_centro_de_custo_idx" ON "contas" USING btree ("centro_de_custo_id");
  CREATE INDEX "contas_updated_at_idx" ON "contas" USING btree ("updated_at");
  CREATE INDEX "contas_created_at_idx" ON "contas" USING btree ("created_at");
  CREATE INDEX "fornecedores_updated_at_idx" ON "fornecedores" USING btree ("updated_at");
  CREATE INDEX "fornecedores_created_at_idx" ON "fornecedores" USING btree ("created_at");
  CREATE INDEX "despesas_ano_idx" ON "despesas" USING btree ("ano");
  CREATE INDEX "despesas_conta_idx" ON "despesas" USING btree ("conta_id");
  CREATE INDEX "despesas_fornecedor_idx" ON "despesas" USING btree ("fornecedor_id");
  CREATE INDEX "despesas_centro_de_custo_idx" ON "despesas" USING btree ("centro_de_custo_id");
  CREATE INDEX "despesas_updated_at_idx" ON "despesas" USING btree ("updated_at");
  CREATE INDEX "despesas_created_at_idx" ON "despesas" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_centros_de_custo_fk" FOREIGN KEY ("centros_de_custo_id") REFERENCES "public"."centros_de_custo"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contas_fk" FOREIGN KEY ("contas_id") REFERENCES "public"."contas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fornecedores_fk" FOREIGN KEY ("fornecedores_id") REFERENCES "public"."fornecedores"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_despesas_fk" FOREIGN KEY ("despesas_id") REFERENCES "public"."despesas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_centros_de_custo_id_idx" ON "payload_locked_documents_rels" USING btree ("centros_de_custo_id");
  CREATE INDEX "payload_locked_documents_rels_contas_id_idx" ON "payload_locked_documents_rels" USING btree ("contas_id");
  CREATE INDEX "payload_locked_documents_rels_fornecedores_id_idx" ON "payload_locked_documents_rels" USING btree ("fornecedores_id");
  CREATE INDEX "payload_locked_documents_rels_despesas_id_idx" ON "payload_locked_documents_rels" USING btree ("despesas_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "centros_de_custo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "fornecedores" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "despesas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "configuracao_orcamento" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "centros_de_custo" CASCADE;
  DROP TABLE "contas" CASCADE;
  DROP TABLE "fornecedores" CASCADE;
  DROP TABLE "despesas" CASCADE;
  DROP TABLE "configuracao_orcamento" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_centros_de_custo_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contas_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_fornecedores_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_despesas_fk";
  
  DROP INDEX "payload_locked_documents_rels_centros_de_custo_id_idx";
  DROP INDEX "payload_locked_documents_rels_contas_id_idx";
  DROP INDEX "payload_locked_documents_rels_fornecedores_id_idx";
  DROP INDEX "payload_locked_documents_rels_despesas_id_idx";
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "centros_de_custo_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "contas_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "fornecedores_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "despesas_id";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_despesas_periodicidade";
  DROP TYPE "public"."enum_configuracao_orcamento_mes_fechado";`)
}
