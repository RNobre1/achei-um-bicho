-- Alinha o banco ao esquema físico do documento "Modelo Entidade-Relacionamento".

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE "pessoa" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "animal" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "foto" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "local" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "caso" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "avistamento" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "pergunta_verificacao" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "tentativa_verificacao" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "resposta_verificacao" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "pareamento" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "desfecho" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

ALTER TABLE "caso" ALTER COLUMN "estado" SET DEFAULT 'procurando';

-- conta de verdade tem e-mail e senha; pessoa sem conta não tem nenhum dos dois
ALTER TABLE "pessoa" ADD CONSTRAINT "conta_completa" CHECK (
    ("email" IS NULL AND "senha_hash" IS NULL) OR
    ("email" IS NOT NULL AND "senha_hash" IS NOT NULL)
);

ALTER TABLE "local" ADD CONSTRAINT "ck_local_raio_imprecisao_m" CHECK ("raio_imprecisao_m" > 0);

ALTER TABLE "pergunta_verificacao"
    ADD CONSTRAINT "ck_pergunta_verificacao_ordem" CHECK ("ordem" BETWEEN 1 AND 3);

ALTER TABLE "pareamento"
    ADD CONSTRAINT "lados_diferentes" CHECK ("caso_perdido_id" <> "caso_encontrado_id");
