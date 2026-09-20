# Plataforma de involutivo — glebas urbanizáveis

Aplicação web que substitui a planilha `INVOLUTIVO_LOTEAMENTO`: o usuário digita as
premissas (as mesmas células azuis da planilha) e recebe o fluxo de caixa mês a mês,
o demonstrativo de resultados e os indicadores da qualidade do investimento.

## Arquivos

| arquivo | o que faz |
|---|---|
| `motor.js` | motor de cálculo — porte fiel da planilha, sem dependências |
| `app.js` | interface: formulário de premissas, abas de resultado, exportação |
| `estilo.css` | estilos |
| `index.html` | página |

## Como rodar

Qualquer servidor estático serve:

```bash
python3 -m http.server 8777     # e abrir http://localhost:8777/plataforma/
```

No servidor FastAPI do repositório a pasta é publicada em `/plataforma`.

## O que o motor faz

1. **Moeda da base.** Cada conta é reajustada pelo seu indexador (IPCA, INCC ou sem
   reajuste) e depois deflacionada pelo IPCA acumulado. A TIR e o resultado saem reais.
2. **Áreas.** Gleba − (viário + doações + verdes/APP + lazer + faixa não edificante +
   restrição) = ALV disponível.
3. **Faseamento.** Até 4 fases; a fase seguinte só lança quando a anterior atinge o
   gatilho de vendas.
4. **Vendas.** Três janelas por fase (lançamento, obra, pós-obra); as vendas durante a
   obra são o residual.
5. **Recebíveis.** Até 5 planos; parcela fixa em moeda nominal calculada pela Price
   sobre o preço-base, corrigida pelo fator do mês da venda e deflacionada no recebimento.
6. **Custos.** Obra por R$/m² de ALV ou % do VGV, curva de obra em 4 etapas,
   contrapartidas, gerenciamento, manutenção pós-obra, CGA e as contas comerciais.
7. **Involutivo.** Resolve a permuta financeira que zera o VPL na TMA real e devolve o
   valor presente dessa permuta — o teto de aquisição da gleba.

## Aderência à planilha

Conferido conta a conta e mês a mês contra o estudo de Itu (164 lotes, 1 fase):

| grandeza | motor | planilha |
|---|---|---|
| Receita recebida | 112.451.628 | 112.451.628 |
| Obras de infraestrutura | 19.684.408 | 19.684.408 |
| Resultado do empreendimento | 26.954.366 | 26.954.366 |
| TIR real | 21,7401% | 21,7401% |
| VPL à TMA | 350,18 | 350,18 |
| Investimento / retorno | 15.112.126 / 42.066.493 | 15.112.126 / 42.066.493 |
| Payback / duration | 79 / 78,4 meses | 79 / 78,4 meses |
| Valor da gleba (VP da permuta) | 22.785.575 | 22.784.960 |

Nenhuma linha do fluxo mensal diverge mais de R$ 50 em 235 meses.

## Ainda não implementado

Financiamento à produção (os campos existem, desligados — a planilha-mãe também está
com eles zerados) e os blocos de estresse por tabela de dados.
