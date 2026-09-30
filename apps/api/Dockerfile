# Imagem da API. O contexto de build é a raiz do repositório, porque a API depende
# do pacote de contratos do workspace:
#
#     docker compose --profile completo up -d --build
#
# Na subida, aplica as migrations pendentes e só então abre a porta.

FROM node:24-bookworm-slim AS base
# o Prisma precisa do OpenSSL do sistema para carregar o motor de consultas
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

FROM base AS construcao
# primeiro só os manifestos: a camada de dependências fica em cache enquanto o
# lockfile não muda
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/contratos/package.json packages/contratos/
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
RUN corepack install && pnpm install --frozen-lockfile --filter @achei/api...

COPY packages/contratos packages/contratos
COPY apps/api apps/api
RUN pnpm --filter @achei/api exec prisma generate && pnpm --filter @achei/api build

FROM base AS execucao
ENV NODE_ENV=production
ENV PASTA_FOTOS=/app/apps/api/fotos
COPY --from=construcao /app /app
# a pasta das fotos é um volume; criada aqui para já nascer com dono node
RUN mkdir -p /app/apps/api/fotos && chown node:node /app/apps/api/fotos
WORKDIR /app/apps/api
USER node
EXPOSE 3333
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
