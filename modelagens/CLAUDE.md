# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

Uma plataforma de modelagens: a **casca** autentica, cobra e guarda; cada
**modelagem** é um aplicativo dentro dela. O Involutivo de Glebas é o primeiro.
A plataforma nasceu do zero — nada de código, modelo de dados ou hábito de
projeto anterior. O nome é provisório: vem de `PLATAFORMA_NOME`.

| | onde | linguagem | como roda |
|---|---|---|---|
| casca | `casca/` | Node 22, Fastify, Postgres 16, ESM | `npm run dev` → http://localhost:3000 |
| involutivo | `modulos/involutivo/` | JavaScript puro, sem build, sem dependências | abrir `index.html` no navegador — ou dentro da casca |

Cada módulo tem o seu `CLAUDE.md`, com o contrato de cálculo e as armadilhas
que são só dele. **Antes de mexer num módulo, leia o dele.**

## Comandos

```bash
docker compose up -d        # Postgres de desenvolvimento (ou um Postgres 16 local)
cp .env.exemplo .env
npm install
npm run dev                 # migra o banco e sobe a casca, recarregando ao salvar
npm test                    # casca (node:test, banco real) + auditoria do involutivo
npm run test:navegador      # a ponte casca ↔ módulo no Chromium (Playwright)
node --env-file=.env --test --test-concurrency=1 --test-name-pattern='recuperação' 'testes/*.test.js'
cd modulos/involutivo && node testes/auditoria.js                  # só o motor
```

A suíte **apaga e recria** o banco de `DATABASE_URL_TESTE` a cada arquivo de
teste. Nunca aponte essa variável para um banco com dados.

## A fronteira casca ↔ módulo

É estreita de propósito, e cabe em três obrigações:

1. A casca entrega ao módulo **quem é o usuário** e **qual estudo abrir**.
2. O módulo devolve o estudo em JSON quando ele muda; a casca salva.
3. O módulo não sabe o que é assinatura, plano, pasta ou cobrança.

Na prática: a página `/estudos/:id` é só a barra da casca e um `<iframe>` com
`/m/<modulo>/index.html?casca`. A conversa é por `postMessage`, sempre no canal
`'modelagens'` e sempre conferindo `origin` e `source` dos dois lados:

```
módulo → casca   { canal, tipo: 'pronto', modulo }            ao carregar
casca  → módulo  { canal, tipo: 'abrir', usuario: { nome },
                   estudo: { id, nome, modulo, premissas } }  premissas null = estudo novo
módulo → casca   { canal, tipo: 'mudou', premissas }          a cada recálculo, o P inteiro
```

A casca agrupa as mudanças (800 ms) e grava com `PUT /api/estudos/:id/premissas`.
Ela **não lê** as premissas: guarda o JSON como veio e o devolve ao abrir. A
migração de formato de premissas antigas é do módulo, não da casca.

Sem `?casca` na URL, o módulo não espera ninguém e volta a guardar no
`localStorage` — é assim que ele continua abrindo sozinho, e é assim que se
desenvolve e audita um módulo. **Não quebre isso**: nenhum módulo importa nada
da casca nem faz `fetch` para ela.

### Módulo novo

Uma pasta em `modulos/` com o mesmo desenho do involutivo — motor puro sem DOM,
interface separada, CSS em tokens, suíte de auditoria própria, `CLAUDE.md`
próprio — e uma entrada em `casca/modulos.js`. O lado módulo da ponte são ~30
linhas: copie o bloco "a casca" de `modulos/involutivo/app.js`. A pasta
`modulos/` é CommonJS (`modulos/package.json`) porque os módulos rodam no
navegador sem build e as suítes fazem `require` do motor; a casca é ESM.

## A casca — arquitetura

- `servidor.js` monta tudo: cabeçalhos de segurança, checagem de `Origin`,
  leitura da sessão, porteiro (`app.exigirLogin`), estáticos, rotas.
- `rotas/conta.js` — cadastro, entrar, sair, recuperação de senha.
- `rotas/pastas.js`, `rotas/estudos.js` — pastas de trabalho e estudos, e a API
  da ponte. `pastas.js` (na raiz da casca) tem as consultas de árvore.
- `paginas/` — HTML por template literal (`html\`\``), que escapa tudo o que é
  interpolado. Não há motor de template. Não há JavaScript de página, exceto
  `publico/estudo.js` (o lado casca da ponte).
- `migracoes/NNN_nome.sql` rodam em ordem na subida (`migrar.js`), cada uma numa
  transação. **Migração aplicada nunca se edita: cria-se a próxima.**

### Decisões que moldam o banco

- **Um login é uma pessoa.** Não há organização, convite nem usuário sob a
  conta de outro. Tudo pendura direto em `usuario`. Se um dia pedirem, vem
  compartilhamento de pasta entre contas — acréscimo, não migração.
- **O que não é do usuário não existe para ele**: toda consulta leva
  `usuario_id`, e o que é de outro responde 404, nunca 403. As chaves
  compostas `(usuario_id, pai_id)` e `(usuario_id, pasta_id)` fazem o próprio
  banco recusar pasta ou estudo pendurado em pasta alheia.
- **Pasta com conteúdo não se apaga.** Nenhum estudo some por cascata.
- Mover e apagar pasta correm sob `pg_advisory_xact_lock` por usuário: dois
  movimentos simultâneos não fecham um ciclo.
- `assinatura` existe desde a primeira migração, vazia: a cobrança é a
  próxima fatia (Stripe, cartão e Pix; o plano libera módulos).

### Segurança — o que já está resolvido e não se desfaz

- Senha com scrypt do próprio Node (`senha.js`), formato
  `scrypt$N$r$p$sal$hash` para poder subir o custo depois. E-mail inexistente
  gasta o mesmo tempo que senha errada.
- Sessão e recuperação: token aleatório no cliente, **só o sha256 no banco**.
  Sessão de 30 dias, cookie `HttpOnly; SameSite=Lax` (e `Secure` em produção).
  Trocar a senha pelo link derruba todas as sessões; o link vale uma vez e uma hora.
- CSRF: `SameSite=Lax` mais recusa de todo POST/PUT com `Origin` de outro host.
  `Referrer-Policy` é `same-origin` — **não** `no-referrer`, que faz o Chrome
  mandar `Origin: null` nos formulários e trava o login inteiro.
- CSP com `script-src 'self'`: nenhum `onclick=` nem `<script>` embutido, na
  casca ou nos módulos.
- `/m/` só serve a quem entrou, e nunca `testes/`, `CLAUDE.md`, `README.md`.
- O destino depois de entrar (`voltar`) só aceita caminho interno.
- Freio de senha em memória (10 falhas por e-mail, 50 por IP, em 15 min). Com
  mais de uma instância do servidor, isso precisa ir para o banco.

## Convenções de interface

Valem na plataforma inteira — casca e todos os módulos. Quebrar qualquer uma
delas gerou retrabalho:

1. **Sugestivo.** Premissa guardada como `null` significa "por informar": o
   motor resolve o usual e o campo mostra o número em letra clara. Digitar
   torna o valor do avaliador; apagar devolve a sugestão.
2. **Simetria.** Todo campo digitável de um mesmo contexto tem a mesma largura
   e a mesma borda direita, com sufixo ou sem. Rótulo comprido encurta; campo
   não muda de tamanho.
3. **Afixos dentro do campo.** `%` e `m²` à direita, `R$` à esquerda,
   posicionados sobre o campo — e a mesma regra no valor calculado, para os
   dígitos de uma coluna caírem sempre no mesmo x. Unidade que é palavra
   (mês, a.a., parc.) fica na coluna de unidade.
4. **Zero é traço** (`—`, ou `·` nas células de tabela densa), exceto onde zero
   é um valor com sentido próprio (o mês zero é a data-base).
5. **Percentual com uma casa decimal.** Por isso os padrões ficam em números
   representáveis, para tela e motor nunca divergirem.
6. **A nota corre até o fim** do quadro; só texto corrido tem largura própria.
7. **Sem negrito decorativo.** Nenhum número é negrito.
8. **Casa única.** Cada campo mora em um lugar só.

E duas armadilhas que valem para qualquer tela:

- **Cor fora do token quebra um dos temas.** Papel é o padrão; o escuro é o
  mesmo papel à noite. Toda cor nova se define nos tokens do `:root` e se
  confere nos dois temas. A casca e o involutivo usam a mesma paleta.
- **Campo que sai do documento perde o foco.** Onde uma área se redesenha
  inteira a cada recálculo, campo digitável tem de viver fora do redesenho.

## Memória entre conversas

Cada frente — a casca, e cada modelagem — tem a sua conversa. O que for
decidido e custar caro esquecer **volta para este arquivo** (ou para o
`CLAUDE.md` do módulo). Ele envelhece mal se ninguém o atualizar.
