import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- Provedor de IA (Claude, ChatGPT, Gemini, DeepSeek); modelo vira texto livre. Pode rodar de novo.
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_crm_automacao_ia_provedor') THEN
      CREATE TYPE "public"."enum_crm_automacao_ia_provedor" AS ENUM('anthropic', 'openai', 'gemini', 'deepseek');
    END IF;
  END $$;
  ALTER TABLE "crm_automacao" ALTER COLUMN "ia_modelo" DROP DEFAULT;
  ALTER TABLE "crm_automacao" ALTER COLUMN "ia_modelo" SET DATA TYPE varchar USING "ia_modelo"::text;
  ALTER TABLE "crm_automacao" ALTER COLUMN "ia_modelo" SET DEFAULT 'claude-opus-5-5';
  ALTER TABLE "crm_automacao" ADD COLUMN IF NOT EXISTS "ia_provedor" "enum_crm_automacao_ia_provedor" DEFAULT 'anthropic';
  ALTER TABLE "crm_automacao" ADD COLUMN IF NOT EXISTS "ia_temperatura" numeric DEFAULT 0.4;
  DROP TYPE IF EXISTS "public"."enum_crm_automacao_ia_modelo";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_crm_automacao_ia_modelo" AS ENUM('claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5');
  ALTER TABLE "crm_automacao" ALTER COLUMN "ia_modelo" SET DEFAULT 'claude-opus-5-5'::"public"."enum_crm_automacao_ia_modelo";
  ALTER TABLE "crm_automacao" ALTER COLUMN "ia_modelo" SET DATA TYPE "public"."enum_crm_automacao_ia_modelo" USING "ia_modelo"::"public"."enum_crm_automacao_ia_modelo";
  ALTER TABLE "crm_automacao" DROP COLUMN "ia_provedor";
  ALTER TABLE "crm_automacao" DROP COLUMN "ia_temperatura";
  DROP TYPE "public"."enum_crm_automacao_ia_provedor";`)
}
