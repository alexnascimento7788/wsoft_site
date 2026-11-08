import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'financeiro', 'consulta', 'crm_admin', 'vendedor', 'apresentador');
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "telefone" varchar;
  ALTER TABLE "users" ADD COLUMN "ativo" boolean DEFAULT true;
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");

  -- Cada usuário existente recebe, em "roles", o mesmo perfil que tem hoje em "role".
  -- A coluna "role" não é alterada nem apagada (o código anterior continua lendo dela).
  INSERT INTO "users_roles" ("order", "parent_id", "value")
  SELECT 1, "id", "role"::text::"enum_users_roles" FROM "users";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_roles" CASCADE;
  ALTER TABLE "users" DROP COLUMN "telefone";
  ALTER TABLE "users" DROP COLUMN "ativo";
  DROP TYPE "public"."enum_users_roles";`)
}
