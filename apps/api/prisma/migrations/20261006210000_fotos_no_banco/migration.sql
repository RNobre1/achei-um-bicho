-- Conteúdo das fotos guardado no próprio banco. O servidor gratuito apaga o disco
-- a cada reinício; a foto já chega reduzida (cerca de 150 KB), então 0,5 GB de
-- banco cabe milhares delas. A chave é o nome público do arquivo, <id>.jpg.
CREATE TABLE "arquivo_foto" (
    "nome" TEXT NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "guardado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "arquivo_foto_pkey" PRIMARY KEY ("nome")
);
