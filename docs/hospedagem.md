# Hospedagem gratuita

O sistema está no ar desde 08/10/2026, inteiro em planos gratuitos e sem cartão
de crédito. As contas são da equipe, com o mesmo e-mail em todos os serviços.

| Peça | Serviço | Endereço |
|---|---|---|
| Versão web do aplicativo | Render, Static Site | <https://achei-um-bicho.onrender.com> |
| API | Render, Web Service (Docker) | <https://achei-um-bicho-api.onrender.com> |
| Banco (PostgreSQL 16 + PostGIS) | Neon, plano Free, região AWS US East | — |
| APK do Android | EAS Build (Expo), plano Free | ver [guia-apk.md](guia-apk.md) |

As fotos ficam no próprio banco, na tabela `arquivo_foto`: o disco do Render
gratuito se apaga a cada reinício, e a foto já chega reduzida pelo aplicativo.

## Por que estes serviços

| Serviço | Motivo |
|---|---|
| Neon | Tem PostGIS, 0,5 GB, não pede cartão e não expira; suspende sem uso e volta sozinho na próxima conexão |
| Render | Roda a imagem Docker de `apps/api/Dockerfile` e serve a versão web com HTTPS, que o navegador exige para liberar a localização |

Descartados: o Postgres do Render (o gratuito é apagado em 30 dias), o banco do
Supabase (pausa depois de uma semana sem uso) e o Koyeb (exige cartão desde
fevereiro de 2026).

## Limites que afetam a apresentação

- **A API dorme.** No Render gratuito, o serviço desliga depois de 15 minutos sem
  acesso e leva cerca de um minuto para acordar. Antes de apresentar, abrir o
  mural e esperar carregar.
- **Tarefa agendada não existe no gratuito.** As rotinas diárias de cobrança e
  expiração (F8) vão precisar de outro disparo, por exemplo uma ação agendada do
  GitHub chamando um endpoint da API.

## Como atualizar

Os dois serviços do Render publicam sozinhos a cada push na branch `main`: a API
reconstrói a imagem e aplica as migrations pendentes ao subir; a versão web
refaz o export.

## Configuração, para recriar do zero

### Banco no Neon

Projeto na região AWS US East (N. Virginia), a mesma do Render. A connection
string usada é a direta (sem `-pooler` no endereço), com `?sslmode=require`. Não
é preciso criar tabela nem extensão à mão: as migrations criam o PostGIS.

### API no Render

| Campo | Valor |
|---|---|
| Runtime | Docker |
| Dockerfile Path | `./apps/api/Dockerfile` |
| Docker Build Context | `.` (a raiz do repositório) |
| Region | Virginia |
| Instance Type | Free |
| Health Check Path | `/saude` |
| `DATABASE_URL` | a connection string do Neon |
| `CORS_ORIGINS` | `https://achei-um-bicho.onrender.com` |
| `RAIO_PADRAO_METROS` | `1600` |

A porta não precisa ser informada: o Render define `PORT` e a API lê.

### Versão web no Render

| Campo | Valor |
|---|---|
| Build Command | `pnpm --filter @achei/mobile exec expo export --platform web --output-dir dist-web` |
| Publish Directory | `apps/mobile/dist-web` |
| `EXPO_PUBLIC_API_URL` | `https://achei-um-bicho-api.onrender.com` |
| `NODE_VERSION` | `24` |
| Rewrite | de `/*` para `/index.html` |

O Render já instala as dependências com o pnpm antes do build; o comando não
deve chamar `corepack enable`, que falha no ambiente dele por tentar gravar numa
pasta só de leitura. A regra de rewrite é o que faz um link direto para um caso
(`/caso/<id>`) abrir no navegador.

### Dados de demonstração

Num banco vazio, para o mural não abrir vazio:

```bash
API_URL=https://achei-um-bicho-api.onrender.com pnpm --filter @achei/api semear:demo
```

O script imprime o código de edição de cada caso, uma vez só. Guarde-os fora do
repositório.

## Fontes

- Render, plano gratuito: <https://render.com/docs/free>
- Neon, limites do plano Free: <https://neon.com/faqs/free-plan-limits-and-quotas>
- Supabase, limites do plano gratuito: <https://supabase.com/pricing>
- Koyeb, exigência de cartão: <https://www.srvrlss.io/provider/koyeb/>
