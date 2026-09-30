# Achei um Bicho

Mural georreferenciado de cães e gatos perdidos e encontrados em Santarém-PA. Quem
perdeu e quem achou publicam do mesmo jeito, e o mural mostra primeiro o que está
perto: 70% dos cães recuperados estavam a menos de 1,6 km de casa.

Projeto da disciplina Laboratório de Desenvolvimento de Software da UFOPA,
Desafio 2 (Causa Animal e Cultura, ODS 15). Equipe: Bruna Kellen, Murilo Falcão e
Rafael Nobre.

## O que já funciona

| Funcionalidade | No servidor | No aplicativo |
|---|---|---|
| F1 · Publicar caso de bicho perdido | `POST /casos`, `POST /casos/:id/fotos` | Aba **Publicar**, quatro passos, com até três fotos |
| F2 · Publicar caso de bicho encontrado, sem conta | `POST /casos`, com código de edição | Código mostrado no fim e guardado no aparelho |
| F3 · Mural por proximidade, com raio ajustável | `GET /casos` (PostGIS, índice GIST) | Aba **Perto**, filtros e botão Aumentar |
| F4 · Caso aberto e registro de avistamento | `GET /casos/:id`, `POST` e `GET /casos/:id/avistamentos` | Tela do caso, "Vi esse bicho na rua" e avisos para quem publicou |

Contato, código de edição, respostas de verificação e o ponto exato nunca saem nas
respostas públicas; há testes automatizados que conferem isso a cada rodada. A foto
é reduzida no celular antes de subir, e a API apaga os metadados em que a câmera
grava a coordenada de onde ela foi tirada.

## Estrutura

```
apps/api/            API em NestJS, Prisma e PostgreSQL com PostGIS; fotos em apps/api/fotos/
apps/mobile/         aplicativo em React Native com Expo
packages/contratos/  vocabulário fechado e formato das requisições, usado pelos dois lados
docs/                visão, MVP, modelo ER, cronograma, UML (casos de uso e classes)
prototipo/           protótipo de média fidelidade
```

## Como rodar

Precisa de Node 24 ou mais novo, Docker e do pnpm, que vem com o Node:

```bash
corepack enable
pnpm install
```

### Banco

O Postgres com PostGIS roda sempre em contêiner:

```bash
pnpm banco                  # o mesmo que: docker compose up -d banco
```

### API

```bash
cp apps/api/.env.example apps/api/.env
pnpm --filter @achei/api exec prisma migrate deploy
pnpm --filter @achei/api dev                    # http://localhost:3333
pnpm --filter @achei/api semear:demo            # opcional: seis casos de demonstração
```

Para subir a API também em contêiner, do jeito que vai para o servidor:

```bash
docker compose --profile completo up -d --build
```

### Aplicativo

```bash
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @achei/mobile start
```

No celular, abra o QR code com o Expo Go. O celular não enxerga o `localhost` do
computador: no `.env` do aplicativo, `EXPO_PUBLIC_API_URL` precisa apontar para o
IP da máquina na rede, por exemplo `http://192.168.0.10:3333`.

Para testar no navegador: `pnpm --filter @achei/mobile web`.

### APK instalável e iPhone

O passo a passo do APK (sem loja) e as opções para iPhone estão em
[docs/guia-apk.md](docs/guia-apk.md). Onde hospedar a API, o banco e a versão web
sem pagar: [docs/hospedagem.md](docs/hospedagem.md).

## Testes

```bash
pnpm test
```

Roda tudo: regras do vocabulário, unidade e integração da API e regras do
aplicativo. A integração usa um banco de teste separado dentro do mesmo contêiner,
recriado a cada rodada, então o banco precisa estar de pé.

## Vocabulário fechado

Espécie, porte, cor, coleira, estados do caso e os demais conjuntos de valores
são declarados uma única vez, em `packages/contratos/src/vocabulario.ts`. As
restrições do banco, a validação da API, os chips das telas e a tabela em
`docs/vocabulario.md` saem dali. Para acrescentar um valor, mude o manifesto e
rode:

```bash
pnpm --filter @achei/api gerar:vocabulario      # nova migration com as restrições
pnpm --filter @achei/contratos gerar:docs       # tabela da documentação
```

Os testes acusam qualquer lugar que tenha ficado para trás.

## Documentos

| Documento | Onde |
|---|---|
| O que falta até o pitch | [docs/backlog.md](docs/backlog.md) |
| Visão do produto | [docs/documento-de-visao.md](docs/documento-de-visao.md) |
| Funcionalidades do MVP e critérios de aceite | [docs/mvp-funcionalidades.md](docs/mvp-funcionalidades.md) |
| Modelo entidade-relacionamento | [docs/modelo-er.md](docs/modelo-er.md) |
| Cronograma | [docs/cronograma.md](docs/cronograma.md) |
| Diagramas UML | [docs/uml/](docs/uml/) |
| Protótipo de média fidelidade | [prototipo/](prototipo/) |

