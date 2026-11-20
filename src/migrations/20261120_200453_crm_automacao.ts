import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$
  BEGIN
    IF to_regclass('public.crm_automacao') IS NULL THEN
      CREATE TYPE "public"."enum_crm_automacao_dias_semana" AS ENUM('seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom');
      CREATE TYPE "public"."enum_crm_automacao_ia_modelo" AS ENUM('claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5');
      CREATE TYPE "public"."enum_crm_automacao_ia_esforco" AS ENUM('low', 'medium', 'high');
      CREATE TYPE "public"."enum_crm_automacao_wa_provedor" AS ENUM('evolution', 'meta');
      CREATE TABLE "crm_automacao_dias_semana" (
      	"order" integer NOT NULL,
      	"parent_id" integer NOT NULL,
      	"value" "enum_crm_automacao_dias_semana",
      	"id" serial PRIMARY KEY NOT NULL
      );
      
      CREATE TABLE "crm_automacao" (
      	"id" serial PRIMARY KEY NOT NULL,
      	"ia_token" varchar,
      	"ia_modelo" "enum_crm_automacao_ia_modelo" DEFAULT 'claude-opus-5-5',
      	"ia_esforco" "enum_crm_automacao_ia_esforco" DEFAULT 'low',
      	"ia_prompt" varchar,
      	"wa_provedor" "enum_crm_automacao_wa_provedor" DEFAULT 'evolution',
      	"evo_url" varchar,
      	"evo_instancia" varchar,
      	"evo_api_key" varchar,
      	"meta_phone_number_id" varchar,
      	"meta_waba_id" varchar,
      	"meta_token" varchar,
      	"meta_app_secret" varchar,
      	"email_remetente_nome" varchar,
      	"email_remetente" varchar,
      	"smtp_host" varchar,
      	"smtp_porta" numeric DEFAULT 587,
      	"smtp_seguro" boolean,
      	"smtp_usuario" varchar,
      	"smtp_senha" varchar,
      	"imap_host" varchar,
      	"imap_porta" numeric DEFAULT 993,
      	"automacao_liberada" boolean DEFAULT false,
      	"wa_limite_inicial" numeric DEFAULT 15,
      	"wa_aumento_diario" numeric DEFAULT 5,
      	"wa_limite_maximo" numeric DEFAULT 80,
      	"email_limite_dia" numeric DEFAULT 40,
      	"intervalo_min_seg" numeric DEFAULT 120,
      	"intervalo_max_seg" numeric DEFAULT 420,
      	"hora_inicio" varchar DEFAULT '08:30',
      	"hora_fim" varchar DEFAULT '17:30',
      	"updated_at" timestamp(3) with time zone,
      	"created_at" timestamp(3) with time zone
      );
      
      ALTER TABLE "crm_automacao_dias_semana" ADD CONSTRAINT "crm_automacao_dias_semana_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."crm_automacao"("id") ON DELETE cascade ON UPDATE no action;
      CREATE INDEX "crm_automacao_dias_semana_order_idx" ON "crm_automacao_dias_semana" USING btree ("order");
      CREATE INDEX "crm_automacao_dias_semana_parent_idx" ON "crm_automacao_dias_semana" USING btree ("parent_id");
    END IF;
  END $$;

  -- Tokens e senhas da Automação: tabelas fora da API REST do Supabase (RLS sem políticas + revoke)
  DO $$
  DECLARE t record;
  BEGIN
    FOR t IN SELECT tablename FROM pg_tables
             WHERE schemaname = 'public' AND tableowner = current_user
               AND tablename IN ('crm_automacao', 'crm_automacao_dias_semana') LOOP
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
   DROP TABLE "crm_automacao_dias_semana" CASCADE;
  DROP TABLE "crm_automacao" CASCADE;
  DROP TYPE "public"."enum_crm_automacao_dias_semana";
  DROP TYPE "public"."enum_crm_automacao_ia_modelo";
  DROP TYPE "public"."enum_crm_automacao_ia_esforco";
  DROP TYPE "public"."enum_crm_automacao_wa_provedor";`)
}
