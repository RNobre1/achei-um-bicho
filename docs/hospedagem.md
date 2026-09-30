# Hospedagem gratuita

Onde colocar o sistema no ar sem pagar, para o alpha (09/10) e o pitch (21/11).
Planos conferidos em 30/09/2026; plano gratuito muda sem aviso, então vale
reconferir antes de criar as contas.

## A combinação escolhida

| Peça | Serviço | Por quê |
|---|---|---|
| Banco (PostgreSQL + PostGIS) | **Neon**, plano Free | Tem PostGIS, 0,5 GB, não pede cartão e não expira; suspende sem uso e volta sozinho na próxima conexão |
| API (NestJS) | **Render**, Web Service Free | Roda a imagem Docker que já existe em `apps/api/Dockerfile`, sem cartão |
| Versão web do aplicativo | **Render**, Static Site | Grátis, com HTTPS, que o navegador exige para liberar a localização |
| Fotos | **Supabase Storage**, plano Free | 1 GB grátis e compatível com S3; depende de um item do backlog (abaixo) |

### O que foi descartado

| Serviço | Motivo |
|---|---|
| Postgres do Render | O gratuito é apagado 30 dias depois de criado |
| Banco do Supabase | Projeto gratuito pausa depois de uma semana sem uso e só volta à mão |
| Koyeb | Desde fevereiro de 2026 exige cartão de crédito no cadastro |

## Limites que afetam a apresentação

- **A API dorme.** No Render gratuito, o serviço desliga depois de 15 minutos sem
  acesso e leva cerca de um minuto para acordar. Antes de apresentar, abrir o
  mural e esperar carregar.
- **O disco do Render some.** O serviço gratuito não tem disco permanente: foto
  guardada em disco se perde a cada deploy ou reinício. Por isso as fotos
  precisam ir para o Supabase Storage antes do deploy público (item do backlog).
- **Tarefa agendada não existe no gratuito.** As rotinas diárias de cobrança e
  expiração (F8) vão precisar de outro disparo, por exemplo uma ação agendada do
  GitHub chamando um endpoint da API.

## Passo a passo

### 1. Banco no Neon

1. Criar conta em neon.com e um projeto na região **AWS US East (N. Virginia)**,
   a mesma do Render, para a API e o banco ficarem perto um do outro.
2. Copiar a *connection string* direta (sem o sufixo `-pooler` no endereço) e
   garantir `?sslmode=require` no final.
3. Não é preciso criar tabela nem extensão à mão: a API aplica as migrations ao
   subir, e a primeira delas cria o PostGIS.

### 2. API no Render

1. Criar conta em render.com com o GitHub e escolher **New › Web Service**, a
   partir do repositório.
2. Configuração:

   | Campo | Valor |
   |---|---|
   | Runtime | Docker |
   | Dockerfile Path | `apps/api/Dockerfile` |
   | Docker Build Context | `.` (a raiz do repositório) |
   | Region | Virginia |
   | Instance Type | Free |
   | Health Check Path | `/saude` |

3. Variáveis de ambiente:

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | a connection string do Neon |
   | `CORS_ORIGINS` | o endereço da versão web, por exemplo `https://achei-um-bicho.onrender.com` |
   | `RAIO_PADRAO_METROS` | `1600` |

   A porta não precisa ser informada: o Render define `PORT` e a API lê.
4. Depois do primeiro deploy, conferir `https://<nome-da-api>.onrender.com/saude`.
5. Para o mural não abrir vazio na demonstração:

   ```bash
   API_URL=https://<nome-da-api>.onrender.com pnpm --filter @achei/api semear:demo
   ```

### 3. Versão web no Render

**New › Static Site**, a partir do mesmo repositório:

| Campo | Valor |
|---|---|
| Build Command | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @achei/mobile exec expo export --platform web --output-dir dist-web` |
| Publish Directory | `apps/mobile/dist-web` |
| Variável `EXPO_PUBLIC_API_URL` | `https://<nome-da-api>.onrender.com` |
| Redirects/Rewrites | Rewrite de `/*` para `/index.html` |

A regra de rewrite é o que faz um link direto para um caso (`/caso/<id>`) abrir
no navegador em vez de dar página não encontrada.

A versão web é também o caminho para quem tem iPhone: ver
[guia-apk.md](guia-apk.md#iphone).

## Fontes

- Render, plano gratuito: <https://render.com/docs/free>
- Neon, limites do plano Free: <https://neon.com/faqs/free-plan-limits-and-quotas>
- Supabase, limites do plano gratuito: <https://supabase.com/pricing>
- Koyeb, exigência de cartão: <https://www.srvrlss.io/provider/koyeb/>
