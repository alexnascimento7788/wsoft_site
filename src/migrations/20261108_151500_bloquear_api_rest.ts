import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Bloqueia a API REST do Supabase (PostgREST) nas tabelas do projeto: liga RLS sem
// nenhuma política e retira os privilégios dos papéis "anon" e "authenticated".
// O Payload conecta direto no Postgres como dono das tabelas, então não é afetado.
// Também vale para tabelas criadas depois (default privileges), como as do CRM.
// Em Postgres sem esses papéis (ex.: testes locais) só o RLS é aplicado.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$
  DECLARE t record;
  BEGIN
    FOR t IN SELECT tablename FROM pg_tables
             WHERE schemaname = 'public' AND tableowner = current_user LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
      REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    END IF;
  END $$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Volta ao padrão do Supabase (RLS desligado e privilégios concedidos)
  await db.execute(sql`
  DO $$
  DECLARE t record;
  BEGIN
    FOR t IN SELECT tablename FROM pg_tables
             WHERE schemaname = 'public' AND tableowner = current_user LOOP
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
    END IF;
  END $$;`)
}
