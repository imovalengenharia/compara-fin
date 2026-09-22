# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dois projetos no mesmo repositório

Não os confunda — cada um tem o seu próprio `motor`:

| | raiz do repositório | `plataforma/` |
|---|---|---|
| produto | **Compara·Fin** — comparativo de demonstrativos de companhias abertas | **Involutivo de glebas** — avaliação de terreno pelo método involutivo |
| linguagem | Python 3.12, FastAPI | JavaScript puro, sem build e sem dependências |
| motor | `motor.py` | `plataforma/motor.js` |
| como roda | `uvicorn app:app --reload` | abrir `plataforma/index.html` no navegador |

Quase todo o trabalho recente é na `plataforma/`. O servidor FastAPI publica a
pasta em `/plataforma`, mas a plataforma não depende dele para nada.

## Comandos

```bash
# involutivo — a suíte inteira, em Node, sem navegador
cd plataforma && node testes/auditoria.js

# Compara·Fin
pip install -r requirements.txt
uvicorn app:app --reload          # http://127.0.0.1:8000 · login demo: anderson / compara2025
```

Não há lint, build nem gerenciador de pacotes na `plataforma/`: o artefato
publicado são exatamente `index.html`, `motor.js` e `app.js`.

`testes/auditoria.js` roda tudo de uma vez e não tem filtro por caso. Para
investigar um cenário só, escreva um script descartável que faça
`require('./motor.js')` e leia `globalThis.Motor` — é como cada defeito desta
base foi reproduzido. A fixture `ITU()` da suíte é independente de
`premissasPadrao()` do `app.js`, de propósito: mudar um padrão da tela não pode
quebrar a aderência à planilha de origem.

## Involutivo — arquitetura

Três arquivos, e a fronteira entre eles é rígida:

- **`motor.js`** — cálculo puro, sem DOM. Exporta `calcular(P)`, `HORIZONTE`,
  `COLUNAS`, `MODALIDADES`, `destinos`, `USUAIS` em `window.Motor` /
  `globalThis.Motor`. Recebe as premissas `P` e devolve fluxo, demonstrativo,
  indicadores, séries por fase e os controles de consistência.
- **`app.js`** — interface. Lê e escreve `P`, chama `Motor.calcular`, redesenha.
  Guarda em `localStorage` sob `involutivo.premissas`, com as migrações de
  formato no `iniciar()`.
- **`index.html`** — a página e **todo** o CSS, em tokens no `:root`.

### O contrato de cálculo

Tudo corre em **moeda da data-base**: cada conta é inflada pelo seu índice
(INCC para obra, gerenciamento e contrapartidas; IPCA para serviços; nenhum
para terreno e ITBI) e depois deflacionada pelo IPCA acumulado. A TIR que sai
daí é real e comparável direto com a TMA.

```
TMA real = (1 + CDI × múltiplo) / (1 + IPCA) − 1
taxa real do terrenista = (1 + CDI) / (1 + IPCA) − 1
```

A TIR fica travada na TMA: o valor da gleba é o que sobra depois de todas as
receitas e despesas. O solver é uma bisseção de 60 iterações sobre a única
incógnita da forma escolhida — a permuta, quando o dinheiro está definido; o
próprio dinheiro, na aquisição à vista. O ITBI itera quatro vezes dentro de
cada avaliação, porque incide sobre o valor que ele mesmo ajuda a formar.

Duas medidas do negócio da terra, e confundi-las já custou caro:

- `valorTerreno` = `caixaBase + permutaBase` — **as duas pernas em moeda da
  data-base**, porque o fluxo inteiro está nela. `caixaTerreno` é o nominal
  contratado e serve só de referência do que o avaliador digitou.
- `equivalenteVista` = `vpPermuta + vpSinal + vpParcelas` — a valor presente
  pela taxa real do terrenista. **É a base do ITBI.**

O fluxo do investidor vai até o **último movimento**, nunca até o último
recebimento: manutenção, CGA e despesas de venda vencem depois da última
parcela, e cortá-las inflava a TIR — sempre a favor do valor da gleba.

## Convenções de interface

Valem na plataforma inteira. Quebrar qualquer uma delas gerou retrabalho:

1. **Sugestivo.** Premissa guardada como `null` significa "por informar": o
   motor resolve o usual (`Motor.USUAIS`) e o campo mostra o número em letra
   clara. Digitar torna o valor do avaliador; apagar devolve a sugestão.
2. **Simetria.** Todo campo digitável de um mesmo contexto tem a mesma largura
   e a mesma borda direita, com sufixo ou sem. Rótulo comprido encurta; campo
   não muda de tamanho.
3. **Afixos dentro do campo.** `%` e `m²` à direita, `R$` à esquerda,
   posicionados sobre o campo — e a mesma regra no valor calculado, para os
   dígitos de uma coluna caírem sempre no mesmo x. Unidade que é palavra
   (mês, a.a., parc.) fica na coluna de unidade.
4. **Zero é traço** (`—`, ou `·` nas células do fluxo), exceto no campo de mês,
   onde zero é a data-base: `{ zero: true }`.
5. **Percentual com uma casa decimal.** Por isso os padrões ficam em números
   representáveis, para tela e motor nunca divergirem.
6. **A nota corre até o fim** do quadro; só o memorial, que é texto corrido,
   tem largura própria.
7. **Sem negrito decorativo.** Nenhum número é negrito.
8. **Casa única.** Cada campo mora em um lugar só. O terreno é a última conta
   do estudo e mora no Demonstrativo; as chaves de desembolso moram sobre a
   coluna do fluxo que cada uma governa.

## Armadilhas já pagas

- **Campo que sai do documento perde o foco.** As guias calculadas se
  redesenham inteiras a cada recálculo (`box.textContent = ''`). Onde houver
  campo digitável dentro de uma guia dessas, o nó tem de viver **fora** do
  redesenho — no Demonstrativo o quadro do terreno fica fixo entre dois
  contêineres; no fluxo, o cabeçalho é montado uma vez e só o `<tbody>` é
  trocado. Reapender o mesmo nó também derruba o foco.
- **Cor fora do token quebra o tema claro.** Papel é o padrão; o escuro é
  escolha em `[data-tema="escuro"]`; sem escolha salva, decide o sistema.
  Toda cor nova se confere nos dois temas.
- **Rótulo longo alarga coluna.** No cabeçalho do fluxo, a tabela tem de caber
  em ~1904 px a 1930 px de janela. Mudou texto de cabeçalho, meça de novo.
- **Altura se mede, não se soma.** A janela do fluxo cresce até o pé da tela
  ajustando, medindo o que transborda e descontando.
- **Nada de dinheiro pode sumir calado.** `espalhar` encosta na borda do
  horizonte em vez de descartar, e `receitas` mede a parcela cortada; os dois
  viram controle em tela. Antes disso o erro era sempre a favor da gleba,
  porque só despesas usam `espalhar`.

## Ao mexer no motor

Todo defeito corrigido tem na suíte o cenário que o expunha — o bloco
`2d · OS DEFEITOS CORRIGIDOS`. Um teste de regressão que não falha antes da
correção não vale nada: para conferir, copie o motor anterior
(`git show HEAD:plataforma/motor.js`) para uma pasta temporária junto com a
suíte nova e rode lá.

Os cenários da suíte cobrem de propósito as faixas de borda — terreno
parcelado longo, venda à vista, pré-operacional curto, obra de menos de quatro
meses, plano com mix zero, quatro fases —, porque é exatamente onde o motor já
errou enquanto o estudo de referência passava limpo.
