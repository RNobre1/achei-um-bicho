# Carga do mural (`GET /casos`)

Quanto o mural aguenta, medido com k6 contra a API compilada, em duas densidades:
200 casos, que é mais do que Santarém deve ter aberto ao mesmo tempo, e 20.000, para
ver onde a consulta começa a doer. Os resumos brutos do k6 estão nesta pasta
(`resumo-200.json`, `resumo-20k.json`) e o plano da listagem em `explain-mural.txt`.

## Ambiente

- Notebook Apple Silicon (macOS). k6, API e banco na mesma máquina.
- PostgreSQL 16 + PostGIS 3.5 em contêiner (OrbStack), banco `achei_carga_d`, recriado a
  cada semeadura.
- API compilada (`node dist/main.js`, `NODE_ENV=production`), porta 3334.
- Limite de requisições levantado só para a medição (1.000.000 por minuto), para medir a
  consulta e não o limitador. O limitador tem teste próprio
  (`apps/api/src/seguranca/limite-requisicoes.int.spec.ts`).
- Casos semeados numa espiral de Fermat em volta da Praça da Matriz (`-2.4432, -54.7123`),
  até 4.500 m; a mesma semeadura dá sempre os mesmos pontos.
- Cenário k6 (`apps/api/carga/mural.js`): sobe a 20 usuários virtuais em 5 s, fica em 50 por
  20 s e desce em 5 s; cada usuário pede o mural de 1.600 m e espera 50 ms.

## Resultados

| Medida | 200 casos | 20.000 casos |
|---|---|---|
| Casos dentro de 1.600 m | 26 | 2.529 |
| Requisições | 14.859 | 2.018 |
| Requisições por segundo | 495 | 67 |
| Latência mediana | 5,5 ms | 384 ms |
| Latência p95 | **16,3 ms** | **669 ms** |
| Latência p99 | 21,3 ms | 748 ms |
| Taxa de erro | 0% | 0% |
| Meta p95 < 300 ms | cumprida | **não cumprida** |

Com 200 casos a meta sobra. Com 20.000 ela não é cumprida: a resposta lista no máximo 50
casos, mas o mural também informa quantos casos abertos existem até 5 km
(`contarAbertosNoRaio`), e com essa densidade a contagem percorre os 20.000 pontos a cada
requisição. É a parte cara da resposta.

## O defeito que a medição achou

A primeira medição com 20.000 casos deu p95 de 20 s. A causa não era a listagem, que
usa o índice espacial (veja abaixo), e sim a contagem. O planejador estima poucas linhas
para `ST_DWithin` em `geography` e, com `JOIN` comum entre `local` e `caso`, escolhia um
laço aninhado com filtro de junção: comparava cada local com cada caso.

| Contagem até 5 km, 20.000 casos | Plano | Tempo no banco |
|---|---|---|
| Antes (`JOIN`) | Nested Loop com `Join Filter`, 199.990.000 linhas descartadas | 8,8 s |
| Depois (`CROSS JOIN LATERAL … OFFSET 0`) | cada local busca o seu caso por `caso_local_id_key` | 0,54 s |

O teste `apps/api/src/casos/contagem-no-raio.int.spec.ts` reprova qualquer plano da
contagem com `Join Filter`.

## A listagem usa o índice espacial

Com 20.000 casos, `EXPLAIN (ANALYZE, BUFFERS)` da listagem (`explain-mural.txt`) mostra
`Bitmap Index Scan on idx_local_ponto`: o índice GiST reduz os 20.000 locais a 4.009
candidatos em 1,3 ms, `ST_DWithin` confirma os 2.531 dentro do raio e a consulta inteira,
com as junções e a ordenação dos 50 mais próximos, leva cerca de 60 ms.

## Limites da medição

1. Tudo na mesma máquina: não há latência de rede entre aparelho, API e banco.
2. A produção é diferente: Render gratuito (CPU compartilhada, a API dorme depois de 15 min
   sem uso e leva até ~50 s para acordar) e Neon na AWS. Estes números medem a consulta,
   não o serviço hospedado.
3. Fotos (`GET /fotos/:id.jpg`) não entraram no tráfego.
4. O limite de requisições estava levantado.

## Como reproduzir

```bash
# 1. semear (o nome do banco precisa começar com achei_carga)
TOTAL_CASOS=200 pnpm --filter @achei/api exec tsx carga/semear-carga.ts

# 2. API compilada contra o banco de carga
pnpm --filter @achei/api build
cd apps/api && NODE_ENV=production PORT=3334 \
  DATABASE_URL=postgresql://bicho:<senha>@localhost:5432/achei_carga_d \
  CODIGO_SEGREDO=segredo-carga LIMITE_LEITURA_POR_MINUTO=1000000 \
  LIMITE_ESCRITA_POR_MINUTO=1000000 LIMITE_FOTOS_POR_MINUTO=1000000 node dist/main.js

# 3. k6 (na raiz do repositório)
docker run --rm -i -v "$PWD/docs/qualidade:/out" \
  -e API_URL=http://host.docker.internal:3334 -e LATITUDE=-2.4432 -e LONGITUDE=-54.7123 -e RAIO=1600 \
  grafana/k6 run --summary-export=/out/resumo-200.json - < apps/api/carga/mural.js
```

Para 20.000 casos, repita com `TOTAL_CASOS=20000` e `resumo-20k.json`.
