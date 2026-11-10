# Resultado do Teste de Carga · Mural de Casos (GET /casos)

Medição de desempenho do endpoint principal do mural georreferenciado (`GET /casos`), avaliando a eficácia do índice espacial GIST sobre a tabela `local(ponto)` no PostgreSQL 16 + PostGIS.

## Ambiente de Execução

- **Hardware/SO:** Apple macOS (Apple Silicon), execução local
- **Banco de dados:** PostgreSQL 16 com extensão PostGIS 3.5 em contêiner Docker via OrbStack
- **Banco utilizado:** `achei_carga_d` (banco dedicado para carga, isolado de desenvolvimento e testes)
- **Base semeada:** 200 casos com animais, coordenadas geográficas, perguntas e pessoas ao redor da Praça da Matriz em Santarém-PA (`-2.4432, -54.7123`)
- **API:** NestJS executando localmente na porta 3334 em modo de desenvolvimento (`nest start`), conectada ao banco `achei_carga_d`
- **Configuração de taxa:** limites do throttler elevados para a carga (`LIMITE_LEITURA_POR_MINUTO=100000`, `LIMITE_ESCRITA_POR_MINUTO=100000`) para não mascarar a capacidade real do endpoint
- **Gerador de carga:** Imagem Docker oficial `grafana/k6:latest`

## Parâmetros do Teste

- **Endpoint:** `GET /casos?latitude=-2.4432&longitude=-54.7123&raio=1600`
- **Usuários Virtuais (VUs):** até 50 VUs simultâneos
- **Duração total:** 30 segundos
  - 5 segundos de aquecimento (ramp-up para 20 VUs)
  - 20 segundos em carga estável (50 VUs)
  - 5 segundos de encerramento (ramp-down para 0 VUs)

## Métricas Obtidas

| Métrica | Valor Obtido | Meta do Projeto | Status |
|---|---|---|---|
| **Latência p95** | **14,20 ms** | < 300 ms | **Aprovado** |
| **Latência p99** | **19,55 ms** | < 500 ms | **Aprovado** |
| **Latência média (avg)** | **6,15 ms** | — | — |
| **Latência mediana (med)** | **4,89 ms** | — | — |
| **Latência máxima (max)** | **239,74 ms** | — | — |
| **Taxa de erro** | **0,00%** (0 erros em 15.000 requisições) | < 1,00% | **Aprovado** |
| **Requisições por segundo (RPS)** | **499,48 req/s** | — | — |
| **Total de requisições executadas** | **15.000** | — | — |
| **Total de checagens (checks)** | **30.000 / 30.000 (100%)** | 100% | **Aprovado** |

## Análise

Com o índice espacial GIST (`idx_local_ponto`) na coluna geográfica `local(ponto)`, o cálculo de proximidade (`ST_DWithin`) e distância (`ST_Distance`) manteve a latência de 95% das requisições em 14,2 ms sob concorrência de 50 usuários virtuais e 500 requisições por segundo, muito abaixo do teto de 300 ms fixado para o requisito. Não houve falhas nem respostas fora do status 200.

## Como Repetir o Teste

1. Semear o banco de carga `achei_carga_d`:
   ```bash
   cd apps/api
   npx tsx carga/semear-carga.ts
   ```

2. Iniciar a API com banco de carga e limites elevados:
   ```bash
   PORT=3334 DATABASE_URL=postgresql://bicho:bicho@localhost:5432/achei_carga_d \
   LIMITE_LEITURA_POR_MINUTO=100000 LIMITE_ESCRITA_POR_MINUTO=100000 \
   CODIGO_SEGREDO=segredo-carga npx nest start
   ```

3. Executar o k6 pelo Docker:
   ```bash
   docker run --rm -i -e API_URL=http://host.docker.internal:3334 \
     -e LATITUDE=-2.4432 -e LONGITUDE=-54.7123 -e RAIO=1600 \
     grafana/k6 run - < apps/api/carga/mural.js
   ```

4. Finalizar a API (Ctrl+C no terminal da porta 3334).
