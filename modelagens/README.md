# Modelagens

Plataforma de modelagens: a casca autentica, cobra e guarda; cada modelagem é um
aplicativo dentro dela. O **Involutivo de Glebas** é o primeiro.

> Nome provisório — o nome da plataforma vem de `PLATAFORMA_NOME`.

## Rodar

Requer Node 22 e Postgres 16.

```bash
docker compose up -d      # Postgres de desenvolvimento, com o banco de testes
cp .env.exemplo .env
npm install
npm run dev               # http://localhost:3000
```

Sem SMTP configurado, o e-mail de recuperação de senha sai no log do servidor.

## Testar

```bash
npm test                  # casca contra um Postgres real + auditoria do involutivo
npm run test:navegador    # a ponte casca ↔ módulo no Chromium
```

## O que já existe (fatia 1)

- **Conta** — cadastro, entrar, sair, recuperação de senha por e-mail. Um login é uma pessoa.
- **Banco** — `usuario`, `sessao`, `recuperacao_senha`, `assinatura` (vazia até a
  fatia da cobrança), `pasta`, `estudo`. Migrações em `casca/migracoes/`.
- **Pastas de trabalho** — pastas dentro de pastas; criar, renomear, mover, apagar
  (só vazias). Estudos na raiz ou em qualquer pasta.
- **Involutivo dentro** — cada estudo abre o módulo e salva sozinho as premissas no banco.

## Próximas fatias

1. Assinatura — Stripe (cartão recorrente e Pix), página de planos, webhook, cancelamento pelo assinante.
2. Registro de módulos com plano — o plano libera cada modelagem.
3. Deploy.

A arquitetura, a fronteira casca ↔ módulo e as convenções estão no [`CLAUDE.md`](CLAUDE.md).
