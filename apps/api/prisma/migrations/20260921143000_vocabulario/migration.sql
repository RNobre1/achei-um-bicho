-- Gerado a partir de packages/contratos/src/vocabulario.ts
-- Não edite à mão: rode `pnpm --filter @achei/api gerar:vocabulario`.

ALTER TABLE "animal" DROP CONSTRAINT IF EXISTS "ck_animal_especie";
ALTER TABLE "animal" ADD CONSTRAINT "ck_animal_especie" CHECK ("especie" IN ('cachorro', 'gato'));
ALTER TABLE "animal" DROP CONSTRAINT IF EXISTS "ck_animal_porte";
ALTER TABLE "animal" ADD CONSTRAINT "ck_animal_porte" CHECK ("porte" IN ('pequeno', 'medio', 'grande'));
ALTER TABLE "animal" DROP CONSTRAINT IF EXISTS "ck_animal_cor_dominante";
ALTER TABLE "animal" ADD CONSTRAINT "ck_animal_cor_dominante" CHECK ("cor_dominante" IN ('caramelo', 'preto', 'branco', 'malhado', 'cinza'));
ALTER TABLE "animal" DROP CONSTRAINT IF EXISTS "ck_animal_coleira";
ALTER TABLE "animal" ADD CONSTRAINT "ck_animal_coleira" CHECK ("coleira" IN ('com', 'sem', 'nao_observado'));
ALTER TABLE "caso" DROP CONSTRAINT IF EXISTS "ck_caso_tipo";
ALTER TABLE "caso" ADD CONSTRAINT "ck_caso_tipo" CHECK ("tipo" IN ('perdido', 'encontrado'));
ALTER TABLE "caso" DROP CONSTRAINT IF EXISTS "ck_caso_estado";
ALTER TABLE "caso" ADD CONSTRAINT "ck_caso_estado" CHECK ("estado" IN ('procurando', 'abrigado_temporariamente', 'em_contato', 'resolvido', 'expirado'));
ALTER TABLE "desfecho" DROP CONSTRAINT IF EXISTS "ck_desfecho_tipo";
ALTER TABLE "desfecho" ADD CONSTRAINT "ck_desfecho_tipo" CHECK ("tipo" IN ('voltou_para_casa', 'foi_adotado', 'nao_encontrado'));
ALTER TABLE "tentativa_verificacao" DROP CONSTRAINT IF EXISTS "ck_tentativa_verificacao_veredito";
ALTER TABLE "tentativa_verificacao" ADD CONSTRAINT "ck_tentativa_verificacao_veredito" CHECK ("veredito" IN ('pendente', 'aceita', 'recusada'));
ALTER TABLE "pareamento" DROP CONSTRAINT IF EXISTS "ck_pareamento_veredito";
ALTER TABLE "pareamento" ADD CONSTRAINT "ck_pareamento_veredito" CHECK ("veredito" IN ('pendente', 'confirmado', 'descartado'));

DROP INDEX IF EXISTS "idx_caso_ultima_inter";
CREATE INDEX "idx_caso_ultima_inter" ON "caso" ("ultima_interacao_em") WHERE "estado" IN ('procurando', 'abrigado_temporariamente');
