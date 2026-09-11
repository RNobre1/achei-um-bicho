# Modelo Entidade-Relacionamento: Achei um Bicho

**Equipe:** Bruna Kellen · Murilo Falcão · Rafael Nobre
**Versão:** 1.0, de 9 de setembro de 2026
**Banco:** PostgreSQL 16 + PostGIS

O diagrama acompanha este documento em imagem e em versão editável para
ferramenta de modelagem.

---

## 1. Diagrama

```mermaid
erDiagram
    PESSOA ||--o{ CASO : "publica"
    PESSOA ||--o{ AVISTAMENTO : "registra"
    PESSOA ||--o{ TENTATIVA_VERIFICACAO : "reivindica"

    CASO ||--|| ANIMAL : "descreve"
    CASO ||--|| LOCAL : "aconteceu em"
    CASO ||--o{ AVISTAMENTO : "recebe"
    CASO ||--|{ PERGUNTA_VERIFICACAO : "define 3"
    CASO ||--o{ TENTATIVA_VERIFICACAO : "recebe"
    CASO ||--o| DESFECHO : "termina com"
    CASO ||--o{ PAREAMENTO : "lado perdido"
    CASO ||--o{ PAREAMENTO : "lado encontrado"

    ANIMAL ||--o{ FOTO : "tem"
    LOCAL ||--o{ AVISTAMENTO : "localiza"

    TENTATIVA_VERIFICACAO ||--|{ RESPOSTA_VERIFICACAO : "contém"
    PERGUNTA_VERIFICACAO ||--o{ RESPOSTA_VERIFICACAO : "é respondida por"

    PESSOA {
        uuid id PK
        text nome
        text telefone "nulo quando sem conta"
        text email UK "nulo quando sem conta"
        text senha_hash "nulo quando sem conta"
        timestamptz criado_em
    }

    CASO {
        uuid id PK
        text tipo "perdido | encontrado"
        text estado "procurando | abrigado_temporariamente | em_contato | resolvido | expirado"
        uuid autor_id FK
        uuid animal_id FK
        uuid local_id FK
        text codigo_edicao "para autor sem conta"
        text relato
        timestamptz ocorrido_em
        timestamptz publicado_em
        timestamptz ultima_interacao_em
    }

    ANIMAL {
        uuid id PK
        text especie "cachorro | gato"
        text porte "pequeno | medio | grande"
        text cor_dominante "caramelo | preto | branco | malhado | cinza"
        text coleira "com | sem | nao_observado"
        text nome "nulo quando desconhecido"
        boolean castrado
    }

    FOTO {
        uuid id PK
        uuid animal_id FK
        text caminho
        integer largura
        integer altura
        timestamptz enviada_em
    }

    LOCAL {
        uuid id PK
        geography ponto "Point 4326"
        text bairro
        integer raio_imprecisao_m
        text referencia
    }

    AVISTAMENTO {
        uuid id PK
        uuid caso_id FK
        uuid pessoa_id FK "nulo quando anonimo"
        uuid local_id FK
        timestamptz visto_em
        text observacao
        timestamptz criado_em
    }

    PERGUNTA_VERIFICACAO {
        uuid id PK
        uuid caso_id FK
        smallint ordem "1 | 2 | 3"
        text enunciado
        text resposta_esperada "nunca sai da API"
    }

    TENTATIVA_VERIFICACAO {
        uuid id PK
        uuid caso_id FK
        uuid pessoa_id FK
        text veredito "pendente | aceita | recusada"
        timestamptz criado_em
        timestamptz decidido_em
    }

    RESPOSTA_VERIFICACAO {
        uuid id PK
        uuid tentativa_id FK
        uuid pergunta_id FK
        text texto
    }

    PAREAMENTO {
        uuid id PK
        uuid caso_perdido_id FK
        uuid caso_encontrado_id FK
        integer distancia_m
        integer dias_diferenca
        jsonb atributos_batem
        jsonb atributos_divergem
        text veredito "pendente | confirmado | descartado"
        timestamptz gerado_em
        timestamptz decidido_em
    }

    DESFECHO {
        uuid id PK
        uuid caso_id FK UK
        text tipo "voltou_para_casa | foi_adotado | nao_encontrado"
        timestamptz ocorrido_em
        timestamptz registrado_em
    }
```

---

## 2. Entidades

### `pessoa`
Quem interage com o sistema. Pode existir sem conta, e nesse caso `email` e
`senha_hash` ficam nulos: o acesso ao caso se dá pelo `codigo_edicao` guardado
em `caso`. O telefone só é revelado depois que o autor do caso libera o contato.

### `caso`
A publicação. `tipo` define o lado: quem perdeu ou quem achou. `estado` guarda o
ciclo de vida. `ultima_interacao_em` é a coluna que as tarefas agendadas de
cobrança e expiração leem; sem ela, o mural acumula anúncio morto.

### `animal`
Os atributos do bicho. Os quatro primeiros (espécie, porte, cor dominante e
coleira) são exatamente o que o pareamento compara, e por isso são vocabulário
fechado, nunca texto livre.

### `foto`
Guardada já em tamanho reduzido, para caber no limite de dados de quem publica
pela rua. Uma foto pode não existir: quem publica sem sinal envia depois.

### `local`
Ponto geográfico com `geography(Point, 4326)` e `raio_imprecisao_m`. O ponto
exato nunca é publicado: a API expõe o centro deslocado e o raio, e o aplicativo
desenha um círculo.

### `avistamento`
Quem viu o animal na rua sem estar com ele. `pessoa_id` pode ser nulo, porque avistar
não exige conta. É o registro que alimenta a linha "3 pessoas disseram ter visto".

### `pergunta_verificacao`
Exatamente três por caso, criadas na publicação. `resposta_esperada` é a coluna
mais sensível do banco: **nunca é serializada em nenhuma resposta da API**, nem
para o autor do caso na listagem pública.

### `tentativa_verificacao`
Uma reivindicação: alguém disse "esse animal é meu" e respondeu as perguntas.
`veredito` guarda a decisão humana do autor do caso. O sistema não decide.

### `resposta_verificacao`
O que a pessoa respondeu. Visível apenas para o autor do caso.

### `pareamento`
Par de casos de lados opostos considerados candidatos. `atributos_batem` e
`atributos_divergem` guardam a explicação, não um score: é o que a tela mostra
quando apresenta uma pista. O `veredito` é sempre de uma pessoa.

### `desfecho`
Como o caso terminou. Um por caso, obrigatório no encerramento. É o dado que
sustenta o artigo: sem desfecho registrado, não há o que medir.

---

## 3. Esquema físico

> Os valores aceitos em cada coluna de vocabulário fechado são declarados uma
> única vez no código da aplicação, e a migração é gerada a partir dessa
> declaração. O SQL abaixo é o resultado esperado dessa geração, e não a fonte a
> ser editada à mão: valor escrito solto dentro de um `CHECK` é exatamente o que
> faz o banco divergir do código.

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE pessoa (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome          text NOT NULL,
    telefone      text,
    email         text UNIQUE,
    senha_hash    text,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT conta_completa CHECK (
        (email IS NULL AND senha_hash IS NULL) OR
        (email IS NOT NULL AND senha_hash IS NOT NULL)
    )
);

CREATE TABLE animal (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    especie        text NOT NULL CHECK (especie IN ('cachorro','gato')),
    porte          text NOT NULL CHECK (porte IN ('pequeno','medio','grande')),
    cor_dominante  text NOT NULL CHECK (cor_dominante IN ('caramelo','preto','branco','malhado','cinza')),
    coleira        text NOT NULL CHECK (coleira IN ('com','sem','nao_observado')),
    nome           text,
    castrado       boolean
);

CREATE TABLE local (
    id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    ponto              geography(Point, 4326) NOT NULL,
    bairro             text,
    raio_imprecisao_m  integer NOT NULL DEFAULT 300 CHECK (raio_imprecisao_m > 0),
    referencia         text
);

CREATE TABLE caso (
    id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo                 text NOT NULL CHECK (tipo IN ('perdido','encontrado')),
    estado               text NOT NULL DEFAULT 'procurando'
                         CHECK (estado IN ('procurando','abrigado_temporariamente',
                                           'em_contato','resolvido','expirado')),
    autor_id             uuid NOT NULL REFERENCES pessoa(id) ON DELETE RESTRICT,
    animal_id            uuid NOT NULL REFERENCES animal(id) ON DELETE CASCADE,
    local_id             uuid NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
    codigo_edicao        text UNIQUE,
    relato               text,
    ocorrido_em          timestamptz NOT NULL,
    publicado_em         timestamptz NOT NULL DEFAULT now(),
    ultima_interacao_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE foto (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    animal_id   uuid NOT NULL REFERENCES animal(id) ON DELETE CASCADE,
    caminho     text NOT NULL,
    largura     integer NOT NULL,
    altura      integer NOT NULL,
    enviada_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE avistamento (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    caso_id      uuid NOT NULL REFERENCES caso(id) ON DELETE CASCADE,
    pessoa_id    uuid REFERENCES pessoa(id) ON DELETE SET NULL,
    local_id     uuid NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
    visto_em     timestamptz NOT NULL,
    observacao   text,
    criado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pergunta_verificacao (
    id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    caso_id           uuid NOT NULL REFERENCES caso(id) ON DELETE CASCADE,
    ordem             smallint NOT NULL CHECK (ordem BETWEEN 1 AND 3),
    enunciado         text NOT NULL,
    resposta_esperada text NOT NULL,
    UNIQUE (caso_id, ordem)
);

CREATE TABLE tentativa_verificacao (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    caso_id      uuid NOT NULL REFERENCES caso(id) ON DELETE CASCADE,
    pessoa_id    uuid NOT NULL REFERENCES pessoa(id) ON DELETE RESTRICT,
    veredito     text NOT NULL DEFAULT 'pendente'
                 CHECK (veredito IN ('pendente','aceita','recusada')),
    criado_em    timestamptz NOT NULL DEFAULT now(),
    decidido_em  timestamptz
);

CREATE TABLE resposta_verificacao (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tentativa_id  uuid NOT NULL REFERENCES tentativa_verificacao(id) ON DELETE CASCADE,
    pergunta_id   uuid NOT NULL REFERENCES pergunta_verificacao(id) ON DELETE CASCADE,
    texto         text NOT NULL,
    UNIQUE (tentativa_id, pergunta_id)
);

CREATE TABLE pareamento (
    id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    caso_perdido_id      uuid NOT NULL REFERENCES caso(id) ON DELETE CASCADE,
    caso_encontrado_id   uuid NOT NULL REFERENCES caso(id) ON DELETE CASCADE,
    distancia_m          integer NOT NULL,
    dias_diferenca       integer NOT NULL,
    atributos_batem      jsonb NOT NULL DEFAULT '[]'::jsonb,
    atributos_divergem   jsonb NOT NULL DEFAULT '[]'::jsonb,
    veredito             text NOT NULL DEFAULT 'pendente'
                         CHECK (veredito IN ('pendente','confirmado','descartado')),
    gerado_em            timestamptz NOT NULL DEFAULT now(),
    decidido_em          timestamptz,
    UNIQUE (caso_perdido_id, caso_encontrado_id),
    CONSTRAINT lados_diferentes CHECK (caso_perdido_id <> caso_encontrado_id)
);

CREATE TABLE desfecho (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    caso_id        uuid NOT NULL UNIQUE REFERENCES caso(id) ON DELETE CASCADE,
    tipo           text NOT NULL CHECK (tipo IN ('voltou_para_casa','foi_adotado','nao_encontrado')),
    ocorrido_em    timestamptz NOT NULL,
    registrado_em  timestamptz NOT NULL DEFAULT now()
);
```

## 4. Índices

```sql
-- Obrigatório. Sem ele a consulta do mural degrada e ninguém percebe
-- até o banco encher.
CREATE INDEX idx_local_ponto ON local USING GIST (ponto);

CREATE INDEX idx_caso_estado_tipo    ON caso (estado, tipo);
CREATE INDEX idx_caso_ultima_inter   ON caso (ultima_interacao_em)
    WHERE estado IN ('procurando','abrigado_temporariamente');
CREATE INDEX idx_pareamento_perdido  ON pareamento (caso_perdido_id, veredito);
CREATE INDEX idx_avistamento_caso    ON avistamento (caso_id, criado_em DESC);
```

## 5. A consulta que sustenta o produto

O mural inteiro depende desta consulta: casos abertos dentro do raio, ordenados
por distância.

```sql
SELECT c.id, c.tipo, a.especie, a.porte, a.cor_dominante,
       ST_Distance(l.ponto, $1::geography)::int AS distancia_m
  FROM caso c
  JOIN local  l ON l.id = c.local_id
  JOIN animal a ON a.id = c.animal_id
 WHERE c.estado IN ('procurando','abrigado_temporariamente')
   AND ST_DWithin(l.ponto, $1::geography, $2)   -- $2 = raio em metros, padrão 1600
 ORDER BY distancia_m
 LIMIT 50;
```

`ST_DWithin` usa o índice GIST; `ST_Distance` no `SELECT` não usaria sozinho.
Trocar a ordem dessas duas chamadas é o erro que transforma a consulta em varredura
completa da tabela.

## 6. O que o banco garante e o que a aplicação garante

Separação deliberada: o que estiver na coluna errada vira defeito silencioso.

| Garantido pelo banco | Garantido pela aplicação |
|---|---|
| Vocabulário fechado, por `CHECK` | Que sejam exatamente 3 perguntas por caso |
| Um desfecho por caso, por `UNIQUE` | Transição válida entre estados do caso |
| Par de casos único, por `UNIQUE` | Que o pareamento só ligue lados opostos |
| Uma resposta por pergunta em cada tentativa | Que `resposta_esperada` nunca seja serializada |
| Integridade referencial | Deslocamento do ponto antes de publicar |

**Ponto de atenção para a revisão:** o banco não impede pareamento entre dois
casos do mesmo tipo. É regra de negócio e vive no serviço `GeradorDePareamentos`,
com teste.

## 7. Dados sensíveis

| Coluna | Por que é sensível | Proteção |
|---|---|---|
| `pergunta_verificacao.resposta_esperada` | É a prova; vazou, acabou a verificação | Nunca sai da API. Teste automatizado sobre o corpo da resposta |
| `pessoa.telefone` | Contato pessoal | Só após liberação (F7) |
| `local.ponto` | Pode revelar residência | Publicado como área aproximada |
| `resposta_verificacao.texto` | Contém detalhe íntimo do animal | Visível só ao autor do caso |
