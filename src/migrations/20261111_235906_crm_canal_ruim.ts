import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_crm_registros_contato_resultado" ADD VALUE IF NOT EXISTS 'sem_whatsapp' BEFORE 'pessoa_errada';
  ALTER TYPE "public"."enum_crm_registros_contato_resultado" ADD VALUE IF NOT EXISTS 'email_invalido' BEFORE 'pessoa_errada';
  ALTER TABLE "crm_empresas_telefones" ADD COLUMN IF NOT EXISTS "sem_whatsapp" boolean DEFAULT false;
  ALTER TABLE "crm_contatos_telefones" ADD COLUMN IF NOT EXISTS "sem_whatsapp" boolean DEFAULT false;
  ALTER TABLE "crm_contatos" ADD COLUMN IF NOT EXISTS "email_invalido" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "crm_registros_contato" ALTER COLUMN "resultado" SET DATA TYPE text;
  DROP TYPE "public"."enum_crm_registros_contato_resultado";
  CREATE TYPE "public"."enum_crm_registros_contato_resultado" AS ENUM('aguardando_retorno', 'nao_atendeu', 'numero_invalido', 'pessoa_errada', 'falou_decisor', 'pediu_retorno', 'sem_interesse', 'nao_contatar');
  ALTER TABLE "crm_registros_contato" ALTER COLUMN "resultado" SET DATA TYPE "public"."enum_crm_registros_contato_resultado" USING "resultado"::"public"."enum_crm_registros_contato_resultado";
  ALTER TABLE "crm_empresas_telefones" DROP COLUMN "sem_whatsapp";
  ALTER TABLE "crm_contatos_telefones" DROP COLUMN "sem_whatsapp";
  ALTER TABLE "crm_contatos" DROP COLUMN "email_invalido";`)
}
