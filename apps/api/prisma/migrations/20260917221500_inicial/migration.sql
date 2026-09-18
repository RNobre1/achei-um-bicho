-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateTable
CREATE TABLE "pessoa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "senha_hash" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pessoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "especie" TEXT NOT NULL,
    "porte" TEXT NOT NULL,
    "cor_dominante" TEXT NOT NULL,
    "coleira" TEXT NOT NULL,
    "nome" TEXT,
    "castrado" BOOLEAN,

    CONSTRAINT "animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "animal_id" UUID NOT NULL,
    "caminho" TEXT NOT NULL,
    "largura" INTEGER NOT NULL,
    "altura" INTEGER NOT NULL,
    "enviada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ponto" geography(Point, 4326) NOT NULL,
    "bairro" TEXT,
    "raio_imprecisao_m" INTEGER NOT NULL DEFAULT 300,
    "referencia" TEXT,

    CONSTRAINT "local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caso" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "autor_id" UUID NOT NULL,
    "animal_id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "codigo_edicao" TEXT,
    "relato" TEXT,
    "ocorrido_em" TIMESTAMPTZ(6) NOT NULL,
    "publicado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_interacao_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avistamento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caso_id" UUID NOT NULL,
    "pessoa_id" UUID,
    "local_id" UUID NOT NULL,
    "visto_em" TIMESTAMPTZ(6) NOT NULL,
    "observacao" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avistamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pergunta_verificacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caso_id" UUID NOT NULL,
    "ordem" SMALLINT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "resposta_esperada" TEXT NOT NULL,

    CONSTRAINT "pergunta_verificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tentativa_verificacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caso_id" UUID NOT NULL,
    "pessoa_id" UUID NOT NULL,
    "veredito" TEXT NOT NULL DEFAULT 'pendente',
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidido_em" TIMESTAMPTZ(6),

    CONSTRAINT "tentativa_verificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resposta_verificacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tentativa_id" UUID NOT NULL,
    "pergunta_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "resposta_verificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pareamento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caso_perdido_id" UUID NOT NULL,
    "caso_encontrado_id" UUID NOT NULL,
    "distancia_m" INTEGER NOT NULL,
    "dias_diferenca" INTEGER NOT NULL,
    "atributos_batem" JSONB NOT NULL DEFAULT '[]',
    "atributos_divergem" JSONB NOT NULL DEFAULT '[]',
    "veredito" TEXT NOT NULL DEFAULT 'pendente',
    "gerado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidido_em" TIMESTAMPTZ(6),

    CONSTRAINT "pareamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desfecho" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caso_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "ocorrido_em" TIMESTAMPTZ(6) NOT NULL,
    "registrado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "desfecho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pessoa_email_key" ON "pessoa"("email");

-- CreateIndex
CREATE INDEX "idx_local_ponto" ON "local" USING GIST ("ponto");

-- CreateIndex
CREATE UNIQUE INDEX "caso_animal_id_key" ON "caso"("animal_id");

-- CreateIndex
CREATE UNIQUE INDEX "caso_local_id_key" ON "caso"("local_id");

-- CreateIndex
CREATE UNIQUE INDEX "caso_codigo_edicao_key" ON "caso"("codigo_edicao");

-- CreateIndex
CREATE INDEX "idx_caso_estado_tipo" ON "caso"("estado", "tipo");

-- CreateIndex
CREATE INDEX "idx_avistamento_caso" ON "avistamento"("caso_id", "criado_em" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "pergunta_verificacao_caso_id_ordem_key" ON "pergunta_verificacao"("caso_id", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "resposta_verificacao_tentativa_id_pergunta_id_key" ON "resposta_verificacao"("tentativa_id", "pergunta_id");

-- CreateIndex
CREATE INDEX "idx_pareamento_perdido" ON "pareamento"("caso_perdido_id", "veredito");

-- CreateIndex
CREATE UNIQUE INDEX "pareamento_caso_perdido_id_caso_encontrado_id_key" ON "pareamento"("caso_perdido_id", "caso_encontrado_id");

-- CreateIndex
CREATE UNIQUE INDEX "desfecho_caso_id_key" ON "desfecho"("caso_id");

-- AddForeignKey
ALTER TABLE "foto" ADD CONSTRAINT "foto_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso" ADD CONSTRAINT "caso_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso" ADD CONSTRAINT "caso_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso" ADD CONSTRAINT "caso_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avistamento" ADD CONSTRAINT "avistamento_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avistamento" ADD CONSTRAINT "avistamento_pessoa_id_fkey" FOREIGN KEY ("pessoa_id") REFERENCES "pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avistamento" ADD CONSTRAINT "avistamento_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pergunta_verificacao" ADD CONSTRAINT "pergunta_verificacao_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tentativa_verificacao" ADD CONSTRAINT "tentativa_verificacao_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tentativa_verificacao" ADD CONSTRAINT "tentativa_verificacao_pessoa_id_fkey" FOREIGN KEY ("pessoa_id") REFERENCES "pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta_verificacao" ADD CONSTRAINT "resposta_verificacao_tentativa_id_fkey" FOREIGN KEY ("tentativa_id") REFERENCES "tentativa_verificacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta_verificacao" ADD CONSTRAINT "resposta_verificacao_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "pergunta_verificacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pareamento" ADD CONSTRAINT "pareamento_caso_perdido_id_fkey" FOREIGN KEY ("caso_perdido_id") REFERENCES "caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pareamento" ADD CONSTRAINT "pareamento_caso_encontrado_id_fkey" FOREIGN KEY ("caso_encontrado_id") REFERENCES "caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desfecho" ADD CONSTRAINT "desfecho_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

