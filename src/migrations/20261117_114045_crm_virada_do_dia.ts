import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Virada do dia do Meu dia, rodando no próprio banco:
// - coluna "não atendida" nas empresas do dia;
// - função crm_virada_do_dia(): o que ficou pendente em dias que já passaram (fuso de São Paulo)
//   vira "não atendida" (sai da agenda, fica o registro para as métricas do vendedor);
// - roda uma vez agora (limpa as agendas vencidas que já existem);
// - agenda no pg_cron todo dia às 00:05 de Brasília (03:05 UTC). Se o pg_cron não puder ser
//   ativado (ex.: banco de teste local), a migração segue: a tela já trata dia passado como não atendido.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "crm_dia_itens" ADD COLUMN IF NOT EXISTS "nao_atendido" boolean DEFAULT false;
  ALTER TABLE "crm_dia_itens" ADD COLUMN IF NOT EXISTS "nao_atendido_em" timestamp(3) with time zone;
  CREATE INDEX IF NOT EXISTS "crm_dia_itens_nao_atendido_idx" ON "crm_dia_itens" USING btree ("nao_atendido");

  CREATE OR REPLACE FUNCTION public.crm_virada_do_dia() RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $fn$
  DECLARE
    n integer;
  BEGIN
    UPDATE crm_dia_itens
       SET nao_atendido = true,
           nao_atendido_em = now(),
           updated_at = now()
     WHERE feito IS NOT TRUE
       AND nao_atendido IS NOT TRUE
       AND dia < to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD');
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
  END
  $fn$;

  REVOKE ALL ON FUNCTION public.crm_virada_do_dia() FROM PUBLIC;
  DO $do$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      REVOKE ALL ON FUNCTION public.crm_virada_do_dia() FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE ALL ON FUNCTION public.crm_virada_do_dia() FROM authenticated;
    END IF;
  END
  $do$;

  SELECT public.crm_virada_do_dia();

  DO $do$
  BEGIN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron indisponível (%): a virada do dia não foi agendada.', SQLERRM;
    END;
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
      PERFORM cron.schedule('crm-virada-do-dia', '5 3 * * *', 'SELECT public.crm_virada_do_dia()');
    END IF;
  END
  $do$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $do$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crm-virada-do-dia') THEN
        PERFORM cron.unschedule('crm-virada-do-dia');
      END IF;
    END IF;
  END
  $do$;
  DROP FUNCTION IF EXISTS public.crm_virada_do_dia();
  DROP INDEX IF EXISTS "crm_dia_itens_nao_atendido_idx";
  ALTER TABLE "crm_dia_itens" DROP COLUMN IF EXISTS "nao_atendido";
  ALTER TABLE "crm_dia_itens" DROP COLUMN IF EXISTS "nao_atendido_em";`)
}
