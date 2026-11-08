import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_crm_empresas_telefones_tipo" AS ENUM('fixo', 'celular');
  CREATE TYPE "public"."enum_crm_empresas_alertas" AS ENUM('situacao_nao_ativa', 'em_liquidacao', 'recuperacao_judicial');
  CREATE TYPE "public"."enum_crm_empresas_tipo" AS ENUM('matriz', 'filial');
  CREATE TYPE "public"."enum_crm_empresas_status" AS ENUM('na_fila', 'em_contato', 'qualificado', 'apresentacao_agendada', 'apresentacao_feita', 'venda_realizada', 'venda_nao_realizada', 'retornar_depois', 'descartado');
  CREATE TYPE "public"."enum_crm_empresas_motivo_descarte" AS ENUM('sem_perfil', 'sem_interesse', 'empresa_inativa', 'sem_canal', 'outro');
  CREATE TYPE "public"."enum_crm_empresas_prioridade" AS ENUM('alta', 'media', 'baixa');
  CREATE TYPE "public"."enum_crm_empresas_prioridade_calculada" AS ENUM('alta', 'media', 'baixa');
  CREATE TYPE "public"."enum_crm_empresas_prioridade_manual" AS ENUM('alta', 'media', 'baixa');
  CREATE TYPE "public"."enum_crm_empresas_origem" AS ENUM('boa_vista', 'instagram', 'indicacao', 'base_wsoft', 'site', 'outra');
  CREATE TYPE "public"."enum_crm_empresas_base_legal" AS ENUM('legitimo_interesse', 'consentimento', 'outra');
  CREATE TYPE "public"."enum_crm_contatos_telefones_tipo" AS ENUM('fixo', 'celular');
  CREATE TYPE "public"."enum_crm_contatos_papel" AS ENUM('decisor', 'influenciador', 'operacional', 'indefinido');
  CREATE TYPE "public"."enum_crm_contatos_origem" AS ENUM('boa_vista', 'instagram', 'indicacao', 'base_wsoft', 'site', 'outra');
  CREATE TYPE "public"."enum_crm_registros_contato_canal" AS ENUM('ligacao', 'whatsapp', 'email', 'outro');
  CREATE TYPE "public"."enum_crm_registros_contato_resultado" AS ENUM('nao_atendeu', 'numero_invalido', 'pessoa_errada', 'falou_decisor', 'pediu_retorno', 'sem_interesse', 'nao_contatar');
  CREATE TYPE "public"."enum_crm_qualificacoes_opera_armazenagem" AS ENUM('sim', 'nao', 'nao_sei');
  CREATE TYPE "public"."enum_crm_qualificacoes_interesse" AS ENUM('alto', 'medio', 'baixo');
  CREATE TYPE "public"."enum_crm_qualificacoes_sistema_gestao" AS ENUM('nenhum', 'planilha', 'outro');
  CREATE TYPE "public"."enum_crm_qualificacoes_resultado" AS ENUM('qualificado', 'retornar_depois', 'descartado');
  CREATE TYPE "public"."enum_crm_qualificacoes_motivo_descarte" AS ENUM('sem_perfil', 'sem_interesse', 'empresa_inativa', 'sem_canal', 'outro');
  CREATE TYPE "public"."enum_crm_desfechos_resultado" AS ENUM('venda_realizada', 'venda_nao_realizada');
  CREATE TYPE "public"."enum_crm_desfechos_motivo" AS ENUM('preco', 'ja_tem_sistema', 'sem_interesse', 'adiou_decisao', 'sem_retorno', 'outro');
  CREATE TYPE "public"."enum_crm_movimentacoes_de" AS ENUM('na_fila', 'em_contato', 'qualificado', 'apresentacao_agendada', 'apresentacao_feita', 'venda_realizada', 'venda_nao_realizada', 'retornar_depois', 'descartado');
  CREATE TYPE "public"."enum_crm_movimentacoes_para" AS ENUM('na_fila', 'em_contato', 'qualificado', 'apresentacao_agendada', 'apresentacao_feita', 'venda_realizada', 'venda_nao_realizada', 'retornar_depois', 'descartado');
  CREATE TYPE "public"."enum_crm_lotes_importacao_origem" AS ENUM('boa_vista', 'instagram', 'indicacao', 'base_wsoft', 'site', 'outra');
  CREATE TYPE "public"."enum_crm_lotes_importacao_status" AS ENUM('rascunho', 'processando', 'concluido', 'concluido_com_erros', 'falhou');
  CREATE TYPE "public"."enum_crm_lotes_importacao_modo_duplicados" AS ENUM('ignorar', 'completar');
  CREATE TYPE "public"."enum_crm_solicitacoes_titular_tipo" AS ENUM('exportacao', 'exclusao', 'correcao', 'outro');
  CREATE TYPE "public"."enum_crm_solicitacoes_titular_status" AS ENUM('aberta', 'concluida', 'recusada');
  CREATE TYPE "public"."enum_crm_auditoria_acao" AS ENUM('login', 'criacao', 'alteracao', 'exclusao', 'exportacao', 'importacao', 'abertura_ficha', 'solicitacao_titular');
  CREATE TYPE "public"."enum_crm_configuracao_base_legal_padrao" AS ENUM('legitimo_interesse', 'consentimento', 'outra');
  CREATE TABLE "crm_empresas_telefones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"numero" varchar NOT NULL,
  	"tipo" "enum_crm_empresas_telefones_tipo",
  	"valido" boolean DEFAULT true
  );
  
  CREATE TABLE "crm_empresas_cnaes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"codigo" varchar NOT NULL,
  	"descricao" varchar,
  	"principal" boolean DEFAULT false
  );
  
  CREATE TABLE "crm_empresas_alertas" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_crm_empresas_alertas",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "crm_empresas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"razao_social" varchar NOT NULL,
  	"nome_fantasia" varchar,
  	"cnpj" varchar NOT NULL,
  	"raiz_cnpj" varchar,
  	"tipo" "enum_crm_empresas_tipo",
  	"situacao_cadastral" varchar,
  	"faixa_fundacao" varchar,
  	"logradouro" varchar,
  	"numero" varchar,
  	"complemento" varchar,
  	"bairro" varchar,
  	"cidade" varchar,
  	"uf" varchar,
  	"cep" varchar,
  	"observacoes" varchar,
  	"status" "enum_crm_empresas_status" DEFAULT 'na_fila' NOT NULL,
  	"retornar_em" timestamp(3) with time zone,
  	"motivo_descarte" "enum_crm_empresas_motivo_descarte",
  	"prioridade" "enum_crm_empresas_prioridade",
  	"prioridade_calculada" "enum_crm_empresas_prioridade_calculada",
  	"prioridade_manual" "enum_crm_empresas_prioridade_manual",
  	"vendedor_id" integer,
  	"apresentador_id" integer,
  	"apresentacao_data" timestamp(3) with time zone,
  	"nao_contatar" boolean DEFAULT false,
  	"nao_contatar_em" timestamp(3) with time zone,
  	"nao_contatar_por_id" integer,
  	"sem_canal_contato" boolean DEFAULT false,
  	"ordem_importacao" numeric,
  	"origem" "enum_crm_empresas_origem",
  	"fornecedor_dado" varchar,
  	"lote_id" integer,
  	"data_importacao" timestamp(3) with time zone,
  	"base_legal" "enum_crm_empresas_base_legal" DEFAULT 'legitimo_interesse',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "crm_contatos_telefones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"numero" varchar NOT NULL,
  	"tipo" "enum_crm_contatos_telefones_tipo",
  	"valido" boolean DEFAULT true
  );
  
  CREATE TABLE "crm_contatos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"empresa_id" integer NOT NULL,
  	"nome" varchar,
  	"email" varchar,
  	"papel" "enum_crm_contatos_papel" DEFAULT 'indefinido',
  	"empresario_individual" boolean DEFAULT false,
  	"nao_contatar" boolean DEFAULT false,
  	"nao_contatar_em" timestamp(3) with time zone,
  	"nao_contatar_por_id" integer,
  	"origem" "enum_crm_contatos_origem",
  	"fornecedor_dado" varchar,
  	"lote_id" integer,
  	"data_importacao" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "crm_registros_contato" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"empresa_id" integer NOT NULL,
  	"contato_id" integer,
  	"data_hora" timestamp(3) with time zone NOT NULL,
  	"canal" "enum_crm_registros_contato_canal" DEFAULT 'ligacao' NOT NULL,
  	"telefone_usado" varchar,
  	"resultado" "enum_crm_registros_contato_resultado" NOT NULL,
  	"observacao" varchar,
  	"proximo_passo" varchar,
  	"proximo_passo_data" timestamp(3) with time zone,
  	"houve_conversa" boolean DEFAULT false,
  	"registrado_por_id" integer,
  	"registrado_por_nome" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "crm_qualificacoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"empresa_id" integer NOT NULL,
  	"opera_armazenagem" "enum_crm_qualificacoes_opera_armazenagem",
  	"interesse" "enum_crm_qualificacoes_interesse",
  	"graos" varchar,
  	"sistema_gestao" "enum_crm_qualificacoes_sistema_gestao",
  	"sistema_nome" varchar,
  	"resultado" "enum_crm_qualificacoes_resultado" NOT NULL,
  	"retornar_em" timestamp(3) with time zone,
  	"motivo_descarte" "enum_crm_qualificacoes_motivo_descarte",
  	"observacao" varchar,
  	"registrado_por_id" integer,
  	"registrado_por_nome" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "crm_desfechos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"empresa_id" integer NOT NULL,
  	"resultado" "enum_crm_desfechos_resultado" NOT NULL,
  	"data" timestamp(3) with time zone NOT NULL,
  	"valor" numeric,
  	"fechado_por_id" integer,
  	"motivo" "enum_crm_desfechos_motivo",
  	"observacao" varchar,
  	"registrado_por_id" integer,
  	"registrado_por_nome" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "crm_movimentacoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"empresa_id" integer NOT NULL,
  	"de" "enum_crm_movimentacoes_de",
  	"para" "enum_crm_movimentacoes_para" NOT NULL,
  	"motivo" varchar,
  	"usuario_id" integer,
  	"usuario_nome" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "crm_lotes_importacao" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"origem" "enum_crm_lotes_importacao_origem" NOT NULL,
  	"fornecedor_dado" varchar,
  	"arquivo_nome" varchar,
  	"status" "enum_crm_lotes_importacao_status" DEFAULT 'rascunho',
  	"modo_duplicados" "enum_crm_lotes_importacao_modo_duplicados" DEFAULT 'ignorar',
  	"origem_licita_confirmada" boolean DEFAULT false,
  	"linhas" numeric DEFAULT 0,
  	"criados" numeric DEFAULT 0,
  	"atualizados" numeric DEFAULT 0,
  	"duplicados" numeric DEFAULT 0,
  	"alertas" numeric DEFAULT 0,
  	"erros" numeric DEFAULT 0,
  	"relatorio_erros" jsonb,
  	"registrado_por_id" integer,
  	"registrado_por_nome" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "crm_modelos_importacao" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"mapeamento" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "crm_solicitacoes_titular" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"protocolo" varchar NOT NULL,
  	"tipo" "enum_crm_solicitacoes_titular_tipo" NOT NULL,
  	"status" "enum_crm_solicitacoes_titular_status" DEFAULT 'aberta',
  	"recebida_em" timestamp(3) with time zone NOT NULL,
  	"canal" varchar,
  	"concluida_em" timestamp(3) with time zone,
  	"empresa_id" integer,
  	"observacao" varchar,
  	"registrado_por_id" integer,
  	"registrado_por_nome" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "crm_auditoria" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"acao" "enum_crm_auditoria_acao" NOT NULL,
  	"colecao" varchar,
  	"documento_id" varchar,
  	"campos" jsonb,
  	"usuario_id" integer,
  	"usuario_nome" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "crm_configuracao_cnaes_alta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"codigo" varchar NOT NULL,
  	"descricao" varchar
  );
  
  CREATE TABLE "crm_configuracao_termos_alta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"termo" varchar NOT NULL
  );
  
  CREATE TABLE "crm_configuracao_cnaes_media_primario" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"codigo" varchar NOT NULL,
  	"descricao" varchar
  );
  
  CREATE TABLE "crm_configuracao" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tentativas_para_descarte" numeric DEFAULT 3 NOT NULL,
  	"base_legal_padrao" "enum_crm_configuracao_base_legal_padrao" DEFAULT 'legitimo_interesse',
  	"encarregado_nome" varchar,
  	"canal_titular" varchar,
  	"aviso_privacidade" varchar DEFAULT 'A Wsoft Informática trata dados de contato profissional de empresas do agronegócio (nome, telefone e e-mail de sócios e contatos), obtidos de fornecedor de dados cadastrais, com base no legítimo interesse (art. 7º, IX, da LGPD), exclusivamente para apresentar soluções de gestão para silos e armazéns. Os dados são acessados apenas pela equipe comercial responsável e não são compartilhados com terceiros. O titular pode, a qualquer momento, pedir para não ser mais contatado, solicitar acesso, correção ou exclusão dos seus dados pelo canal de atendimento informado abaixo.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crm_empresas_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crm_contatos_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crm_registros_contato_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crm_qualificacoes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crm_desfechos_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crm_movimentacoes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crm_lotes_importacao_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crm_modelos_importacao_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crm_solicitacoes_titular_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crm_auditoria_id" integer;
  ALTER TABLE "crm_empresas_telefones" ADD CONSTRAINT "crm_empresas_telefones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."crm_empresas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "crm_empresas_cnaes" ADD CONSTRAINT "crm_empresas_cnaes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."crm_empresas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "crm_empresas_alertas" ADD CONSTRAINT "crm_empresas_alertas_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."crm_empresas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "crm_empresas" ADD CONSTRAINT "crm_empresas_vendedor_id_users_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_empresas" ADD CONSTRAINT "crm_empresas_apresentador_id_users_id_fk" FOREIGN KEY ("apresentador_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_empresas" ADD CONSTRAINT "crm_empresas_nao_contatar_por_id_users_id_fk" FOREIGN KEY ("nao_contatar_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_empresas" ADD CONSTRAINT "crm_empresas_lote_id_crm_lotes_importacao_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."crm_lotes_importacao"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_contatos_telefones" ADD CONSTRAINT "crm_contatos_telefones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."crm_contatos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "crm_contatos" ADD CONSTRAINT "crm_contatos_empresa_id_crm_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."crm_empresas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_contatos" ADD CONSTRAINT "crm_contatos_nao_contatar_por_id_users_id_fk" FOREIGN KEY ("nao_contatar_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_contatos" ADD CONSTRAINT "crm_contatos_lote_id_crm_lotes_importacao_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."crm_lotes_importacao"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_registros_contato" ADD CONSTRAINT "crm_registros_contato_empresa_id_crm_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."crm_empresas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_registros_contato" ADD CONSTRAINT "crm_registros_contato_contato_id_crm_contatos_id_fk" FOREIGN KEY ("contato_id") REFERENCES "public"."crm_contatos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_registros_contato" ADD CONSTRAINT "crm_registros_contato_registrado_por_id_users_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_qualificacoes" ADD CONSTRAINT "crm_qualificacoes_empresa_id_crm_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."crm_empresas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_qualificacoes" ADD CONSTRAINT "crm_qualificacoes_registrado_por_id_users_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_desfechos" ADD CONSTRAINT "crm_desfechos_empresa_id_crm_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."crm_empresas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_desfechos" ADD CONSTRAINT "crm_desfechos_fechado_por_id_users_id_fk" FOREIGN KEY ("fechado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_desfechos" ADD CONSTRAINT "crm_desfechos_registrado_por_id_users_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_movimentacoes" ADD CONSTRAINT "crm_movimentacoes_empresa_id_crm_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."crm_empresas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_movimentacoes" ADD CONSTRAINT "crm_movimentacoes_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_lotes_importacao" ADD CONSTRAINT "crm_lotes_importacao_registrado_por_id_users_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_solicitacoes_titular" ADD CONSTRAINT "crm_solicitacoes_titular_empresa_id_crm_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."crm_empresas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_solicitacoes_titular" ADD CONSTRAINT "crm_solicitacoes_titular_registrado_por_id_users_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_auditoria" ADD CONSTRAINT "crm_auditoria_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crm_configuracao_cnaes_alta" ADD CONSTRAINT "crm_configuracao_cnaes_alta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."crm_configuracao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "crm_configuracao_termos_alta" ADD CONSTRAINT "crm_configuracao_termos_alta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."crm_configuracao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "crm_configuracao_cnaes_media_primario" ADD CONSTRAINT "crm_configuracao_cnaes_media_primario_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."crm_configuracao"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "crm_empresas_telefones_order_idx" ON "crm_empresas_telefones" USING btree ("_order");
  CREATE INDEX "crm_empresas_telefones_parent_id_idx" ON "crm_empresas_telefones" USING btree ("_parent_id");
  CREATE INDEX "crm_empresas_cnaes_order_idx" ON "crm_empresas_cnaes" USING btree ("_order");
  CREATE INDEX "crm_empresas_cnaes_parent_id_idx" ON "crm_empresas_cnaes" USING btree ("_parent_id");
  CREATE INDEX "crm_empresas_cnaes_codigo_idx" ON "crm_empresas_cnaes" USING btree ("codigo");
  CREATE INDEX "crm_empresas_alertas_order_idx" ON "crm_empresas_alertas" USING btree ("order");
  CREATE INDEX "crm_empresas_alertas_parent_idx" ON "crm_empresas_alertas" USING btree ("parent_id");
  CREATE UNIQUE INDEX "crm_empresas_cnpj_idx" ON "crm_empresas" USING btree ("cnpj");
  CREATE INDEX "crm_empresas_raiz_cnpj_idx" ON "crm_empresas" USING btree ("raiz_cnpj");
  CREATE INDEX "crm_empresas_tipo_idx" ON "crm_empresas" USING btree ("tipo");
  CREATE INDEX "crm_empresas_cidade_idx" ON "crm_empresas" USING btree ("cidade");
  CREATE INDEX "crm_empresas_uf_idx" ON "crm_empresas" USING btree ("uf");
  CREATE INDEX "crm_empresas_status_idx" ON "crm_empresas" USING btree ("status");
  CREATE INDEX "crm_empresas_retornar_em_idx" ON "crm_empresas" USING btree ("retornar_em");
  CREATE INDEX "crm_empresas_prioridade_idx" ON "crm_empresas" USING btree ("prioridade");
  CREATE INDEX "crm_empresas_vendedor_idx" ON "crm_empresas" USING btree ("vendedor_id");
  CREATE INDEX "crm_empresas_apresentador_idx" ON "crm_empresas" USING btree ("apresentador_id");
  CREATE INDEX "crm_empresas_apresentacao_data_idx" ON "crm_empresas" USING btree ("apresentacao_data");
  CREATE INDEX "crm_empresas_nao_contatar_idx" ON "crm_empresas" USING btree ("nao_contatar");
  CREATE INDEX "crm_empresas_nao_contatar_por_idx" ON "crm_empresas" USING btree ("nao_contatar_por_id");
  CREATE INDEX "crm_empresas_sem_canal_contato_idx" ON "crm_empresas" USING btree ("sem_canal_contato");
  CREATE INDEX "crm_empresas_ordem_importacao_idx" ON "crm_empresas" USING btree ("ordem_importacao");
  CREATE INDEX "crm_empresas_origem_idx" ON "crm_empresas" USING btree ("origem");
  CREATE INDEX "crm_empresas_lote_idx" ON "crm_empresas" USING btree ("lote_id");
  CREATE INDEX "crm_empresas_updated_at_idx" ON "crm_empresas" USING btree ("updated_at");
  CREATE INDEX "crm_empresas_created_at_idx" ON "crm_empresas" USING btree ("created_at");
  CREATE INDEX "crm_contatos_telefones_order_idx" ON "crm_contatos_telefones" USING btree ("_order");
  CREATE INDEX "crm_contatos_telefones_parent_id_idx" ON "crm_contatos_telefones" USING btree ("_parent_id");
  CREATE INDEX "crm_contatos_empresa_idx" ON "crm_contatos" USING btree ("empresa_id");
  CREATE INDEX "crm_contatos_nao_contatar_idx" ON "crm_contatos" USING btree ("nao_contatar");
  CREATE INDEX "crm_contatos_nao_contatar_por_idx" ON "crm_contatos" USING btree ("nao_contatar_por_id");
  CREATE INDEX "crm_contatos_origem_idx" ON "crm_contatos" USING btree ("origem");
  CREATE INDEX "crm_contatos_lote_idx" ON "crm_contatos" USING btree ("lote_id");
  CREATE INDEX "crm_contatos_updated_at_idx" ON "crm_contatos" USING btree ("updated_at");
  CREATE INDEX "crm_contatos_created_at_idx" ON "crm_contatos" USING btree ("created_at");
  CREATE INDEX "crm_registros_contato_empresa_idx" ON "crm_registros_contato" USING btree ("empresa_id");
  CREATE INDEX "crm_registros_contato_contato_idx" ON "crm_registros_contato" USING btree ("contato_id");
  CREATE INDEX "crm_registros_contato_data_hora_idx" ON "crm_registros_contato" USING btree ("data_hora");
  CREATE INDEX "crm_registros_contato_resultado_idx" ON "crm_registros_contato" USING btree ("resultado");
  CREATE INDEX "crm_registros_contato_houve_conversa_idx" ON "crm_registros_contato" USING btree ("houve_conversa");
  CREATE INDEX "crm_registros_contato_registrado_por_idx" ON "crm_registros_contato" USING btree ("registrado_por_id");
  CREATE INDEX "crm_registros_contato_updated_at_idx" ON "crm_registros_contato" USING btree ("updated_at");
  CREATE INDEX "crm_registros_contato_created_at_idx" ON "crm_registros_contato" USING btree ("created_at");
  CREATE INDEX "crm_qualificacoes_empresa_idx" ON "crm_qualificacoes" USING btree ("empresa_id");
  CREATE INDEX "crm_qualificacoes_registrado_por_idx" ON "crm_qualificacoes" USING btree ("registrado_por_id");
  CREATE INDEX "crm_qualificacoes_updated_at_idx" ON "crm_qualificacoes" USING btree ("updated_at");
  CREATE INDEX "crm_qualificacoes_created_at_idx" ON "crm_qualificacoes" USING btree ("created_at");
  CREATE INDEX "crm_desfechos_empresa_idx" ON "crm_desfechos" USING btree ("empresa_id");
  CREATE INDEX "crm_desfechos_fechado_por_idx" ON "crm_desfechos" USING btree ("fechado_por_id");
  CREATE INDEX "crm_desfechos_registrado_por_idx" ON "crm_desfechos" USING btree ("registrado_por_id");
  CREATE INDEX "crm_desfechos_updated_at_idx" ON "crm_desfechos" USING btree ("updated_at");
  CREATE INDEX "crm_desfechos_created_at_idx" ON "crm_desfechos" USING btree ("created_at");
  CREATE INDEX "crm_movimentacoes_empresa_idx" ON "crm_movimentacoes" USING btree ("empresa_id");
  CREATE INDEX "crm_movimentacoes_usuario_idx" ON "crm_movimentacoes" USING btree ("usuario_id");
  CREATE INDEX "crm_movimentacoes_updated_at_idx" ON "crm_movimentacoes" USING btree ("updated_at");
  CREATE INDEX "crm_movimentacoes_created_at_idx" ON "crm_movimentacoes" USING btree ("created_at");
  CREATE INDEX "crm_lotes_importacao_registrado_por_idx" ON "crm_lotes_importacao" USING btree ("registrado_por_id");
  CREATE INDEX "crm_lotes_importacao_updated_at_idx" ON "crm_lotes_importacao" USING btree ("updated_at");
  CREATE INDEX "crm_lotes_importacao_created_at_idx" ON "crm_lotes_importacao" USING btree ("created_at");
  CREATE UNIQUE INDEX "crm_modelos_importacao_nome_idx" ON "crm_modelos_importacao" USING btree ("nome");
  CREATE INDEX "crm_modelos_importacao_updated_at_idx" ON "crm_modelos_importacao" USING btree ("updated_at");
  CREATE INDEX "crm_modelos_importacao_created_at_idx" ON "crm_modelos_importacao" USING btree ("created_at");
  CREATE UNIQUE INDEX "crm_solicitacoes_titular_protocolo_idx" ON "crm_solicitacoes_titular" USING btree ("protocolo");
  CREATE INDEX "crm_solicitacoes_titular_empresa_idx" ON "crm_solicitacoes_titular" USING btree ("empresa_id");
  CREATE INDEX "crm_solicitacoes_titular_registrado_por_idx" ON "crm_solicitacoes_titular" USING btree ("registrado_por_id");
  CREATE INDEX "crm_solicitacoes_titular_updated_at_idx" ON "crm_solicitacoes_titular" USING btree ("updated_at");
  CREATE INDEX "crm_solicitacoes_titular_created_at_idx" ON "crm_solicitacoes_titular" USING btree ("created_at");
  CREATE INDEX "crm_auditoria_acao_idx" ON "crm_auditoria" USING btree ("acao");
  CREATE INDEX "crm_auditoria_colecao_idx" ON "crm_auditoria" USING btree ("colecao");
  CREATE INDEX "crm_auditoria_documento_id_idx" ON "crm_auditoria" USING btree ("documento_id");
  CREATE INDEX "crm_auditoria_usuario_idx" ON "crm_auditoria" USING btree ("usuario_id");
  CREATE INDEX "crm_auditoria_updated_at_idx" ON "crm_auditoria" USING btree ("updated_at");
  CREATE INDEX "crm_auditoria_created_at_idx" ON "crm_auditoria" USING btree ("created_at");
  CREATE INDEX "crm_configuracao_cnaes_alta_order_idx" ON "crm_configuracao_cnaes_alta" USING btree ("_order");
  CREATE INDEX "crm_configuracao_cnaes_alta_parent_id_idx" ON "crm_configuracao_cnaes_alta" USING btree ("_parent_id");
  CREATE INDEX "crm_configuracao_termos_alta_order_idx" ON "crm_configuracao_termos_alta" USING btree ("_order");
  CREATE INDEX "crm_configuracao_termos_alta_parent_id_idx" ON "crm_configuracao_termos_alta" USING btree ("_parent_id");
  CREATE INDEX "crm_configuracao_cnaes_media_primario_order_idx" ON "crm_configuracao_cnaes_media_primario" USING btree ("_order");
  CREATE INDEX "crm_configuracao_cnaes_media_primario_parent_id_idx" ON "crm_configuracao_cnaes_media_primario" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crm_empresas_fk" FOREIGN KEY ("crm_empresas_id") REFERENCES "public"."crm_empresas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crm_contatos_fk" FOREIGN KEY ("crm_contatos_id") REFERENCES "public"."crm_contatos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crm_registros_contato_fk" FOREIGN KEY ("crm_registros_contato_id") REFERENCES "public"."crm_registros_contato"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crm_qualificacoes_fk" FOREIGN KEY ("crm_qualificacoes_id") REFERENCES "public"."crm_qualificacoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crm_desfechos_fk" FOREIGN KEY ("crm_desfechos_id") REFERENCES "public"."crm_desfechos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crm_movimentacoes_fk" FOREIGN KEY ("crm_movimentacoes_id") REFERENCES "public"."crm_movimentacoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crm_lotes_importacao_fk" FOREIGN KEY ("crm_lotes_importacao_id") REFERENCES "public"."crm_lotes_importacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crm_modelos_importacao_fk" FOREIGN KEY ("crm_modelos_importacao_id") REFERENCES "public"."crm_modelos_importacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crm_solicitacoes_titular_fk" FOREIGN KEY ("crm_solicitacoes_titular_id") REFERENCES "public"."crm_solicitacoes_titular"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crm_auditoria_fk" FOREIGN KEY ("crm_auditoria_id") REFERENCES "public"."crm_auditoria"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_crm_empresas_id_idx" ON "payload_locked_documents_rels" USING btree ("crm_empresas_id");
  CREATE INDEX "payload_locked_documents_rels_crm_contatos_id_idx" ON "payload_locked_documents_rels" USING btree ("crm_contatos_id");
  CREATE INDEX "payload_locked_documents_rels_crm_registros_contato_id_idx" ON "payload_locked_documents_rels" USING btree ("crm_registros_contato_id");
  CREATE INDEX "payload_locked_documents_rels_crm_qualificacoes_id_idx" ON "payload_locked_documents_rels" USING btree ("crm_qualificacoes_id");
  CREATE INDEX "payload_locked_documents_rels_crm_desfechos_id_idx" ON "payload_locked_documents_rels" USING btree ("crm_desfechos_id");
  CREATE INDEX "payload_locked_documents_rels_crm_movimentacoes_id_idx" ON "payload_locked_documents_rels" USING btree ("crm_movimentacoes_id");
  CREATE INDEX "payload_locked_documents_rels_crm_lotes_importacao_id_idx" ON "payload_locked_documents_rels" USING btree ("crm_lotes_importacao_id");
  CREATE INDEX "payload_locked_documents_rels_crm_modelos_importacao_id_idx" ON "payload_locked_documents_rels" USING btree ("crm_modelos_importacao_id");
  CREATE INDEX "payload_locked_documents_rels_crm_solicitacoes_titular_i_idx" ON "payload_locked_documents_rels" USING btree ("crm_solicitacoes_titular_id");
  CREATE INDEX "payload_locked_documents_rels_crm_auditoria_id_idx" ON "payload_locked_documents_rels" USING btree ("crm_auditoria_id");

  -- Tabelas do CRM fora da API REST do Supabase: RLS ligado (sem políticas) e nenhum
  -- privilégio para anon/authenticated. O Payload conecta como dono e não é afetado.
  DO $$
  DECLARE t record;
  BEGIN
    FOR t IN SELECT tablename FROM pg_tables
             WHERE schemaname = 'public' AND tableowner = current_user AND left(tablename, 4) = 'crm_' LOOP
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
   ALTER TABLE "crm_empresas_telefones" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_empresas_cnaes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_empresas_alertas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_empresas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_contatos_telefones" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_contatos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_registros_contato" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_qualificacoes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_desfechos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_movimentacoes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_lotes_importacao" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_modelos_importacao" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_solicitacoes_titular" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_auditoria" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_configuracao_cnaes_alta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_configuracao_termos_alta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_configuracao_cnaes_media_primario" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_configuracao" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "crm_empresas_telefones" CASCADE;
  DROP TABLE "crm_empresas_cnaes" CASCADE;
  DROP TABLE "crm_empresas_alertas" CASCADE;
  DROP TABLE "crm_empresas" CASCADE;
  DROP TABLE "crm_contatos_telefones" CASCADE;
  DROP TABLE "crm_contatos" CASCADE;
  DROP TABLE "crm_registros_contato" CASCADE;
  DROP TABLE "crm_qualificacoes" CASCADE;
  DROP TABLE "crm_desfechos" CASCADE;
  DROP TABLE "crm_movimentacoes" CASCADE;
  DROP TABLE "crm_lotes_importacao" CASCADE;
  DROP TABLE "crm_modelos_importacao" CASCADE;
  DROP TABLE "crm_solicitacoes_titular" CASCADE;
  DROP TABLE "crm_auditoria" CASCADE;
  DROP TABLE "crm_configuracao_cnaes_alta" CASCADE;
  DROP TABLE "crm_configuracao_termos_alta" CASCADE;
  DROP TABLE "crm_configuracao_cnaes_media_primario" CASCADE;
  DROP TABLE "crm_configuracao" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crm_empresas_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crm_contatos_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crm_registros_contato_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crm_qualificacoes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crm_desfechos_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crm_movimentacoes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crm_lotes_importacao_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crm_modelos_importacao_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crm_solicitacoes_titular_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crm_auditoria_fk";
  
  DROP INDEX "payload_locked_documents_rels_crm_empresas_id_idx";
  DROP INDEX "payload_locked_documents_rels_crm_contatos_id_idx";
  DROP INDEX "payload_locked_documents_rels_crm_registros_contato_id_idx";
  DROP INDEX "payload_locked_documents_rels_crm_qualificacoes_id_idx";
  DROP INDEX "payload_locked_documents_rels_crm_desfechos_id_idx";
  DROP INDEX "payload_locked_documents_rels_crm_movimentacoes_id_idx";
  DROP INDEX "payload_locked_documents_rels_crm_lotes_importacao_id_idx";
  DROP INDEX "payload_locked_documents_rels_crm_modelos_importacao_id_idx";
  DROP INDEX "payload_locked_documents_rels_crm_solicitacoes_titular_i_idx";
  DROP INDEX "payload_locked_documents_rels_crm_auditoria_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crm_empresas_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crm_contatos_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crm_registros_contato_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crm_qualificacoes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crm_desfechos_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crm_movimentacoes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crm_lotes_importacao_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crm_modelos_importacao_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crm_solicitacoes_titular_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crm_auditoria_id";
  DROP TYPE "public"."enum_crm_empresas_telefones_tipo";
  DROP TYPE "public"."enum_crm_empresas_alertas";
  DROP TYPE "public"."enum_crm_empresas_tipo";
  DROP TYPE "public"."enum_crm_empresas_status";
  DROP TYPE "public"."enum_crm_empresas_motivo_descarte";
  DROP TYPE "public"."enum_crm_empresas_prioridade";
  DROP TYPE "public"."enum_crm_empresas_prioridade_calculada";
  DROP TYPE "public"."enum_crm_empresas_prioridade_manual";
  DROP TYPE "public"."enum_crm_empresas_origem";
  DROP TYPE "public"."enum_crm_empresas_base_legal";
  DROP TYPE "public"."enum_crm_contatos_telefones_tipo";
  DROP TYPE "public"."enum_crm_contatos_papel";
  DROP TYPE "public"."enum_crm_contatos_origem";
  DROP TYPE "public"."enum_crm_registros_contato_canal";
  DROP TYPE "public"."enum_crm_registros_contato_resultado";
  DROP TYPE "public"."enum_crm_qualificacoes_opera_armazenagem";
  DROP TYPE "public"."enum_crm_qualificacoes_interesse";
  DROP TYPE "public"."enum_crm_qualificacoes_sistema_gestao";
  DROP TYPE "public"."enum_crm_qualificacoes_resultado";
  DROP TYPE "public"."enum_crm_qualificacoes_motivo_descarte";
  DROP TYPE "public"."enum_crm_desfechos_resultado";
  DROP TYPE "public"."enum_crm_desfechos_motivo";
  DROP TYPE "public"."enum_crm_movimentacoes_de";
  DROP TYPE "public"."enum_crm_movimentacoes_para";
  DROP TYPE "public"."enum_crm_lotes_importacao_origem";
  DROP TYPE "public"."enum_crm_lotes_importacao_status";
  DROP TYPE "public"."enum_crm_lotes_importacao_modo_duplicados";
  DROP TYPE "public"."enum_crm_solicitacoes_titular_tipo";
  DROP TYPE "public"."enum_crm_solicitacoes_titular_status";
  DROP TYPE "public"."enum_crm_auditoria_acao";
  DROP TYPE "public"."enum_crm_configuracao_base_legal_padrao";`)
}
