import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- Caixa de e-mail de cada vendedor (users) e catálogo na Automação; o e-mail sai da Automação.
  -- Colunas novas em users são opcionais: o código antigo (produção) continua funcionando. Pode rodar de novo.
   ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_remetente_nome" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_remetente" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "smtp_host" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "smtp_porta" numeric DEFAULT 587;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "smtp_seguro" boolean;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "smtp_usuario" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "smtp_senha" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "imap_host" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "imap_porta" numeric DEFAULT 993;
  ALTER TABLE "crm_automacao" ADD COLUMN IF NOT EXISTS "catalogo_id" integer;
  ALTER TABLE "crm_automacao" ADD COLUMN IF NOT EXISTS "catalogo_mensagem" varchar;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_automacao_catalogo_id_media_id_fk') THEN
      ALTER TABLE "crm_automacao" ADD CONSTRAINT "crm_automacao_catalogo_id_media_id_fk" FOREIGN KEY ("catalogo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    END IF;
  END $$;
  CREATE INDEX IF NOT EXISTS "crm_automacao_catalogo_idx" ON "crm_automacao" USING btree ("catalogo_id");
  ALTER TABLE "crm_automacao" DROP COLUMN IF EXISTS "email_remetente_nome";
  ALTER TABLE "crm_automacao" DROP COLUMN IF EXISTS "email_remetente";
  ALTER TABLE "crm_automacao" DROP COLUMN IF EXISTS "smtp_host";
  ALTER TABLE "crm_automacao" DROP COLUMN IF EXISTS "smtp_porta";
  ALTER TABLE "crm_automacao" DROP COLUMN IF EXISTS "smtp_seguro";
  ALTER TABLE "crm_automacao" DROP COLUMN IF EXISTS "smtp_usuario";
  ALTER TABLE "crm_automacao" DROP COLUMN IF EXISTS "smtp_senha";
  ALTER TABLE "crm_automacao" DROP COLUMN IF EXISTS "imap_host";
  ALTER TABLE "crm_automacao" DROP COLUMN IF EXISTS "imap_porta";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "crm_automacao" DROP CONSTRAINT "crm_automacao_catalogo_id_media_id_fk";
  
  DROP INDEX "crm_automacao_catalogo_idx";
  ALTER TABLE "crm_automacao" ADD COLUMN "email_remetente_nome" varchar;
  ALTER TABLE "crm_automacao" ADD COLUMN "email_remetente" varchar;
  ALTER TABLE "crm_automacao" ADD COLUMN "smtp_host" varchar;
  ALTER TABLE "crm_automacao" ADD COLUMN "smtp_porta" numeric DEFAULT 587;
  ALTER TABLE "crm_automacao" ADD COLUMN "smtp_seguro" boolean;
  ALTER TABLE "crm_automacao" ADD COLUMN "smtp_usuario" varchar;
  ALTER TABLE "crm_automacao" ADD COLUMN "smtp_senha" varchar;
  ALTER TABLE "crm_automacao" ADD COLUMN "imap_host" varchar;
  ALTER TABLE "crm_automacao" ADD COLUMN "imap_porta" numeric DEFAULT 993;
  ALTER TABLE "users" DROP COLUMN "email_remetente_nome";
  ALTER TABLE "users" DROP COLUMN "email_remetente";
  ALTER TABLE "users" DROP COLUMN "smtp_host";
  ALTER TABLE "users" DROP COLUMN "smtp_porta";
  ALTER TABLE "users" DROP COLUMN "smtp_seguro";
  ALTER TABLE "users" DROP COLUMN "smtp_usuario";
  ALTER TABLE "users" DROP COLUMN "smtp_senha";
  ALTER TABLE "users" DROP COLUMN "imap_host";
  ALTER TABLE "users" DROP COLUMN "imap_porta";
  ALTER TABLE "crm_automacao" DROP COLUMN "catalogo_id";
  ALTER TABLE "crm_automacao" DROP COLUMN "catalogo_mensagem";`)
}
