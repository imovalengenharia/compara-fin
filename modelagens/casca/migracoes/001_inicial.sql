-- Fatia 1: quem entra e onde o estudo fica.
-- Um login é uma pessoa: tudo pendura direto no usuário, sem tabela de organização.

CREATE TABLE usuario (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  nome        text NOT NULL,
  senha_hash  text NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usuario_email_formato CHECK (email = lower(email) AND position('@' IN email) > 1)
);
CREATE UNIQUE INDEX usuario_email ON usuario (email);

-- O token vai no cookie; no banco fica só o hash, para um vazamento da tabela
-- não virar sessão aberta.
CREATE TABLE sessao (
  token_hash  text PRIMARY KEY,
  usuario_id  uuid NOT NULL REFERENCES usuario ON DELETE CASCADE,
  criada_em   timestamptz NOT NULL DEFAULT now(),
  expira_em   timestamptz NOT NULL
);
CREATE INDEX sessao_usuario ON sessao (usuario_id);

CREATE TABLE recuperacao_senha (
  token_hash  text PRIMARY KEY,
  usuario_id  uuid NOT NULL REFERENCES usuario ON DELETE CASCADE,
  criada_em   timestamptz NOT NULL DEFAULT now(),
  expira_em   timestamptz NOT NULL,
  usada_em    timestamptz
);
CREATE INDEX recuperacao_usuario ON recuperacao_senha (usuario_id);

-- Criada agora porque o gancho da cobrança é do usuário desde a primeira linha;
-- preenchida na fatia da assinatura (Stripe). Uma por usuário.
CREATE TABLE assinatura (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   uuid NOT NULL UNIQUE REFERENCES usuario ON DELETE CASCADE,
  plano        text NOT NULL,
  status       text NOT NULL CHECK (status IN ('ativa', 'pendente', 'vencida', 'cancelada')),
  vence_em     timestamptz,
  provedor_id  text,
  criada_em    timestamptz NOT NULL DEFAULT now(),
  atualizada_em timestamptz NOT NULL DEFAULT now()
);

-- Pasta de trabalho: um dono, pode conter outras pastas. A chave composta
-- (usuario_id, id) deixa o próprio banco recusar pasta pendurada em pasta alheia.
CREATE TABLE pasta (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid NOT NULL REFERENCES usuario ON DELETE CASCADE,
  pai_id      uuid,
  nome        text NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 120),
  criada_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, id),
  FOREIGN KEY (usuario_id, pai_id) REFERENCES pasta (usuario_id, id),
  CHECK (pai_id IS DISTINCT FROM id)
);
CREATE INDEX pasta_pai ON pasta (usuario_id, pai_id);

-- O estudo guarda o JSON das premissas e a modelagem a que pertence.
-- pasta_id nulo = na raiz. Pasta com conteúdo não se apaga (sem CASCADE).
CREATE TABLE estudo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid NOT NULL REFERENCES usuario ON DELETE CASCADE,
  pasta_id      uuid,
  modulo        text NOT NULL,
  nome          text NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 160),
  premissas     jsonb,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (usuario_id, pasta_id) REFERENCES pasta (usuario_id, id)
);
CREATE INDEX estudo_pasta ON estudo (usuario_id, pasta_id);
