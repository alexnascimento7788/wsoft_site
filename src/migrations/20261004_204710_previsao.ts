import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "previsto_jan" numeric;
  ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "previsto_fev" numeric;
  ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "previsto_mar" numeric;
  ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "previsto_abr" numeric;
  ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "previsto_mai" numeric;
  ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "previsto_jun" numeric;
  ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "previsto_jul" numeric;
  ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "previsto_ago" numeric;
  ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "previsto_set" numeric;
  ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "previsto_out" numeric;
  ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "previsto_nov" numeric;
  ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "previsto_dez" numeric;
  ALTER TABLE "despesas" ADD COLUMN IF NOT EXISTS "total_previsto" numeric;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "despesas" DROP COLUMN IF EXISTS "previsto_jan";
  ALTER TABLE "despesas" DROP COLUMN IF EXISTS "previsto_fev";
  ALTER TABLE "despesas" DROP COLUMN IF EXISTS "previsto_mar";
  ALTER TABLE "despesas" DROP COLUMN IF EXISTS "previsto_abr";
  ALTER TABLE "despesas" DROP COLUMN IF EXISTS "previsto_mai";
  ALTER TABLE "despesas" DROP COLUMN IF EXISTS "previsto_jun";
  ALTER TABLE "despesas" DROP COLUMN IF EXISTS "previsto_jul";
  ALTER TABLE "despesas" DROP COLUMN IF EXISTS "previsto_ago";
  ALTER TABLE "despesas" DROP COLUMN IF EXISTS "previsto_set";
  ALTER TABLE "despesas" DROP COLUMN IF EXISTS "previsto_out";
  ALTER TABLE "despesas" DROP COLUMN IF EXISTS "previsto_nov";
  ALTER TABLE "despesas" DROP COLUMN IF EXISTS "previsto_dez";
  ALTER TABLE "despesas" DROP COLUMN IF EXISTS "total_previsto";`)
}
