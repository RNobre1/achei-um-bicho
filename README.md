# Achei um Bicho

Mural georreferenciado de cães e gatos perdidos e encontrados em Santarém-PA. Quem
perdeu e quem achou publicam do mesmo jeito, e o mural mostra primeiro o que está
perto: 70% dos cães recuperados estavam a menos de 1,6 km de casa.

Projeto da disciplina Laboratório de Desenvolvimento de Software da UFOPA,
Desafio 2 (Causa Animal e Cultura, ODS 15). Equipe: Bruna Kellen, Murilo Falcão e
Rafael Nobre.

**No ar:** <https://achei-um-bicho.onrender.com> (versão web) · API em
<https://achei-um-bicho-api.onrender.com>. Para Android, há um APK instalável
sem loja; ver [docs/guia-apk.md](docs/guia-apk.md).

## O que já funciona

| Funcionalidade | No servidor | No aplicativo |
|---|---|---|
| F1 · Publicar caso de bicho perdido | `POST /casos`, `POST /casos/:id/fotos` | Aba **Publicar**, quatro passos, com até três fotos |
| F2 · Publicar caso de bicho encontrado, sem conta | `POST /casos`, com código de edição | Código mostrado no fim, guardado no aparelho e com botão de compartilhar |
| F3 · Mural por proximidade, com raio ajustável | `GET /casos` (PostGIS, índice GiST) | Aba **Perto**, filtros e botão Aumentar |
| F4 · Caso aberto e registro de avistamento | `GET /casos/:id`, `POST` e `GET /casos/:id/avistamentos` | Tela do caso, "Vi esse bicho na rua" e avisos para quem publicou |
| F5 · Pareamento determinístico | Gerado ao publicar; `GET /casos/:id/pistas` e `POST .../veredito` | Abas **Pistas** e **Meus casos**: o que bateu, o que não bateu, "Pode ser ele" e "Não é" |
| F6 · Reivindicação com verificação | `GET /casos/:id/perguntas`, `POST /casos/:id/reivindicacoes`, `GET` e `POST .../veredito` para o autor | "Acho que esse bicho é meu" ou "Acho que achei esse bicho": responde às três perguntas e recebe um código de acompanhamento; o autor compara as respostas e aceita ou recusa |
| F7 · Contato mediado e denúncia | `GET /reivindicacoes/:id` com o código de acompanhamento; `POST /casos/:id/denuncias` | Nome e telefone só aparecem para os dois lados depois do aceite; denúncia com motivo |
| F8 · Ciclo de vida do caso | `GET /casos/:id/situacao`, `POST .../confirmacao`, `.../reabertura`, `.../desfecho`, `PATCH /casos/:id`; tarefa diária às 08:00 por ação agendada do GitHub | Em **Meus casos**: editar, encerrar com desfecho, "ainda está procurando?", reabrir quando o contato não deu certo |
| F9 · Publicar e ler sem conexão | Publicação idempotente pelo `idCliente` | Fila no celular que sobe sozinha quando a internet volta; mural e caso aberto guardados para ler sem rede |

Contato, códigos, respostas de verificação e o ponto exato nunca saem nas respostas
públicas; há testes automatizados que conferem isso a cada rodada. O mapa mostra uma
área cujo centro é deslocado do ponto real por um cálculo que depende de um segredo
do servidor. A foto é reduzida no celular antes de subir, e a API apaga os metadados
em que a câmera grava a coordenada. Texto público com telefone ou link é recusado.
Casos encerrados há 30 dias perdem os dados pessoais.

Qualidade conferida por teste: limite de requisições por IP, códigos guardados como
HMAC, contraste AA de toda a paleta (RNF5) e a maior publicação com foto abaixo de
1 MB (RNF2). A carga do mural está medida em [docs/qualidade/carga.md](docs/qualidade/carga.md).

A cada push na `main`, o GitHub Actions confere os tipos, roda a suíte inteira contra
um PostgreSQL com PostGIS de verdade, faz a análise de segurança do CodeQL e a
auditoria de dependências.

## Estrutura

```
apps/api/            API em NestJS, Prisma e PostgreSQL com PostGIS; fotos no próprio banco
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
pnpm e2e
```

Roda tudo: regras do vocabulário, unidade e integração da API e regras do
aplicativo. A integração usa um banco de teste separado dentro do mesmo contêiner,
recriado a cada rodada, então o banco precisa estar de pé.

O comando `pnpm e2e` executa os testes de ponta a ponta (E2E) com Playwright sobre a versão web do aplicativo, subindo a API e o servidor estático da web automaticamente contra o banco de teste `achei_e2e`.

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
| O que ficou para depois do pitch | [docs/backlog.md](docs/backlog.md) |
| Carga do mural | [docs/qualidade/carga.md](docs/qualidade/carga.md) |
| Roteiro e slides do alpha | [docs/alpha/roteiro.md](docs/alpha/roteiro.md) · `Achei_um_Bicho_Alpha.pdf` |
| Onde o sistema está hospedado | [docs/hospedagem.md](docs/hospedagem.md) |
| Visão do produto | [docs/documento-de-visao.md](docs/documento-de-visao.md) |
| Funcionalidades do MVP e critérios de aceite | [docs/mvp-funcionalidades.md](docs/mvp-funcionalidades.md) |
| Modelo entidade-relacionamento | [docs/modelo-er.md](docs/modelo-er.md) |
| Cronograma | [docs/cronograma.md](docs/cronograma.md) |
| Diagramas UML: casos de uso, classes, estados e sequência | [docs/uml/](docs/uml/) |
| Protótipo de média fidelidade | [prototipo/](prototipo/) |

