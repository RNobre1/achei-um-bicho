-- Reivindicação com verificação (F6), contato mediado e denúncia (F7), ciclo de
-- vida (F8) e fila sem conexão (F9). Escrita à mão: o `migrate dev` do Prisma
-- tentaria apagar as restrições CHECK e o índice parcial que ele não enxerga.

-- caso: pedido de confirmação pendente e id gerado no aparelho
ALTER TABLE "caso" ADD COLUMN "cobrado_em" TIMESTAMPTZ(6);
ALTER TABLE "caso" ADD COLUMN "id_cliente" UUID;
CREATE UNIQUE INDEX "caso_id_cliente_key" ON "caso"("id_cliente");

-- tentativa_verificacao: código de acompanhamento (hash), referência de quem está
-- com o animal, caso próprio de quem reivindica e leitura do contato liberado.
-- A tabela nunca foi usada antes desta versão, então a coluna nasce obrigatória.
ALTER TABLE "tentativa_verificacao" ADD COLUMN "codigo_acompanhamento" TEXT NOT NULL;
ALTER TABLE "tentativa_verificacao" ADD COLUMN "referencia" TEXT;
ALTER TABLE "tentativa_verificacao" ADD COLUMN "caso_proprio_id" UUID;
ALTER TABLE "tentativa_verificacao" ADD COLUMN "contato_visto_em" TIMESTAMPTZ(6);
CREATE UNIQUE INDEX "tentativa_verificacao_codigo_acompanhamento_key" ON "tentativa_verificacao"("codigo_acompanhamento");
ALTER TABLE "tentativa_verificacao" ADD CONSTRAINT "tentativa_verificacao_caso_proprio_id_fkey"
    FOREIGN KEY ("caso_proprio_id") REFERENCES "caso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- denuncia: o CHECK do motivo vem da migração de vocabulário gerada
CREATE TABLE "denuncia" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "caso_id" UUID NOT NULL,
    "tentativa_id" UUID,
    "motivo" TEXT NOT NULL,
    "texto" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "denuncia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_denuncia_caso" ON "denuncia"("caso_id");
ALTER TABLE "denuncia" ADD CONSTRAINT "denuncia_caso_id_fkey"
    FOREIGN KEY ("caso_id") REFERENCES "caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "denuncia" ADD CONSTRAINT "denuncia_tentativa_id_fkey"
    FOREIGN KEY ("tentativa_id") REFERENCES "tentativa_verificacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
