# Relatório de Carga e Avaliação do Índice Espacial · Mural de Casos (GET /casos)

Medição de desempenho do endpoint do mural georreferenciado (`GET /casos`) sob carga concorrente, avaliando o comportamento do índice espacial GIST (`idx_local_ponto`) sobre a tabela `local(ponto)` no PostgreSQL 16 + PostGIS 3.5.

## Ambiente de Execução

- **Hardware/SO:** Apple macOS (Apple Silicon), execução local
- **Banco de dados:** PostgreSQL 16 com extensão PostGIS 3.5 em contêiner Docker via OrbStack
- **Banco de carga isolado:** `achei_carga_d` (banco dedicado exclusivamente para testes de carga, recriado deterministicamente a cada teste)
- **API:** NestJS executando localmente na porta 3334 em modo de desenvolvimento (`nest start`), conectada ao banco `achei_carga_d`
- **Configuração de taxa:** limites do throttler elevados para a carga (`LIMITE_LEITURA_POR_MINUTO=100000`, `LIMITE_ESCRITA_POR_MINUTO=100000`) para não mascarar a capacidade real do endpoint
- **Gerador de carga:** Imagem Docker oficial `grafana/k6:latest`

## Limites da Medição

Com honestidade sobre o ambiente e o alcance dos resultados:
1. **Tudo na mesma máquina:** gerador de carga (k6), API NestJS e banco PostgreSQL/PostGIS executaram no mesmo hardware local, sem latência real de rede.
2. **API em modo de desenvolvimento:** executada via `nest start` (Node/TypeScript em modo dev), que adiciona overhead de observabilidade e compilação em relação ao modo de produção compilado.
3. **Limites de requisições desligados:** o limitador de taxa foi elevado durante o teste para que o throttler não bloqueasse as requisições nem deformasse a curva de resposta.
4. **Ambiente de produção real diferente:** a produção roda no Render gratuito + Neon (AWS US East), sujeita a latência de rede interestadual/internacional, conexões SSL seguras, sleep após 15 minutos de inatividade e limites estritos de CPU/memória compartilhada.
5. **Fotos não medidas:** o teste mediu apenas a listagem e filtragem do mural (`GET /casos`); as imagens servidas por `/fotos/:id.jpg` não foram incluídas no tráfego gerado.

---

## 1. Medição sob Carga Típica: 200 Casos Semeados

- **Semeadura determinística:** 200 casos distribuídos por espiral de Fermat ao redor da Praça da Matriz em Santarém (`-2.4432, -54.7123`), com raio máximo de 4.500 m.
- **Casos no raio de 1.600 m:** 26 casos (13,00%).
- **Cenário k6:** 50 VUs ao longo de 30 segundos (5s aquecimento até 20 VUs, 20s estável em 50 VUs, 5s encerramento).

### Resultados Obtidos (200 casos)

| Métrica | Valor Obtido | Meta do Projeto | Status |
|---|---|---|---|
| **Latência p95** | **16,69 ms** | < 300 ms | **Aprovado** |
| **Latência p99** | **22,80 ms** | < 500 ms | **Aprovado** |
| **Latência média (avg)** | **6,68 ms** | — | — |
| **Latência mediana (med)** | **5,06 ms** | — | — |
| **Latência máxima (max)** | **174,02 ms** | — | — |
| **Taxa de erro** | **0,00%** (0 falhas em 14.867 requisições) | < 1,00% | **Aprovado** |
| **Vazão (req/s)** | **495,21 req/s** | — | — |
| **Total de requisições** | **14.867** | — | — |
| **Checagens (checks)** | **29.734 / 29.734 (100%)** | 100% | **Aprovado** |

Arquivo de resumo bruto: `docs/qualidade/resumo-200.json`.

---

## 2. Prova do Uso do Índice Espacial GiST: 20.000 Casos Semeados

- **Semeadura determinística:** 20.000 casos distribuídos por espiral de Fermat ao redor da Praça da Matriz.
- **Casos no raio de 1.600 m:** 2.529 casos (12,65%).
- **Plano de Execução do PostgreSQL (`EXPLAIN (ANALYZE, BUFFERS)`):**
  Versionado integralmente em `docs/qualidade/explain-mural.txt`.

Trecho do plano gerado pelo PostgreSQL 16:
```text
->  Bitmap Heap Scan on local l  (cost=178.48..50616.09 rows=2 width=57) (actual time=47.953..50.992 rows=2531 loops=1)
      Filter: st_dwithin(ponto, '...'::geography, '1600'::double precision, true)
      Rows Removed by Filter: 1478
      Heap Blocks: exact=84
      Buffers: shared hit=230
      ->  Bitmap Index Scan on idx_local_ponto  (cost=0.00..178.48 rows=4011 width=0) (actual time=1.678..1.679 rows=4009 loops=1)
            Index Cond: (ponto && _st_expand('...'::geography, '1600'::double precision))
            Buffers: shared hit=74
```

### O que foi comprovado pelo EXPLAIN:
1. O PostgreSQL utiliza ativamente o índice espacial **GiST** `idx_local_ponto` através de `Bitmap Index Scan`.
2. A pré-filtragem via bounding box (`_st_expand`) reduziu 20.000 registros para 4.009 candidatos em apenas **1,68 ms** (`actual time=1.678..1.679`).
3. O refinamento geodésico exato com `ST_DWithin` filtrou os candidatos finais para os 2.531 casos reais no raio.
4. Tempo total de execução da consulta no banco: **63,95 ms** para uma base com 20.000 casos e junção de 3 tabelas (`caso`, `local`, `animal`).

---

## 3. Medição sob Carga Extrema: 20.000 Casos Semeados

- **Cenário k6 curto:** 20 VUs simultâneos contínuos durante 10 segundos contra a base de 20.000 casos.

### Resultados Obtidos (20.000 casos)

| Métrica | Valor Obtido |
|---|---|
| **Latência p95** | **20,58 s** |
| **Latência p99** | **20,64 s** |
| **Latência média (avg)** | **19,49 s** |
| **Latência mediana (med)** | **19,57 s** |
| **Taxa de erro** | **0,00%** (20 de 20 requisições retornaram 200 com payload válido) |
| **Vazão (req/s)** | **0,97 req/s** |
| **Total de requisições** | **20** |

Arquivo de resumo bruto: `docs/qualidade/resumo-20k.json`.

### Análise da Carga Extrema
Embora o índice GiST filtre os candidatos em ~1,7 ms e a consulta isolada leve ~64 ms, submeter 20 VUs simultâneos com 20.000 casos causa enfileiramento de CPU no cálculo de distância trigonométrica e ordenação no Node.js/PostgreSQL sob concorrência direta no mesmo núcleo. Todas as requisições completaram com sucesso (0% de erro), mas a latência sob 20 requisições simultâneas acumulou fila.

---

## Como Reproduzir as Medições

1. **Semear 200 casos:**
   ```bash
   TOTAL_CASOS=200 pnpm --filter @achei/api exec tsx carga/semear-carga.ts
   ```

2. **Iniciar a API em porta dedicada:**
   ```bash
   PORT=3334 DATABASE_URL=postgresql://bicho:bicho@localhost:5432/achei_carga_d \
   LIMITE_LEITURA_POR_MINUTO=100000 LIMITE_ESCRITA_POR_MINUTO=100000 \
   CODIGO_SEGREDO=segredo-carga npx nest start
   ```

3. **Executar o k6:**
   ```bash
   docker run --rm -i -v "$PWD/docs/qualidade:/out" \
     -e API_URL=http://host.docker.internal:3334 -e LATITUDE=-2.4432 -e LONGITUDE=-54.7123 -e RAIO=1600 \
     grafana/k6 run --summary-export=/out/resumo-200.json - < apps/api/carga/mural.js
   ```

4. **Semear 20.000 casos e rodar EXPLAIN:**
   ```bash
   TOTAL_CASOS=20000 pnpm --filter @achei/api exec tsx carga/semear-carga.ts
   docker exec -i achei-um-bicho-banco psql -U bicho -d achei_carga_d -c "EXPLAIN (ANALYZE, BUFFERS) ..."
   ```
