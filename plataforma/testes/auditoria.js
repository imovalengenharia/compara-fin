/* ============================================================================
   AUDITORIA DO MOTOR
   Três blocos: aderência à planilha de origem, coerência interna do modelo e
   comportamento econômico. Roda com:  node testes/auditoria.js
   ========================================================================== */
require('../motor.js');
var Motor = globalThis.Motor;

var ok = 0, falhas = [], bloco = '';
function B(t) { bloco = t; console.log('\n\x1b[1m' + t + '\x1b[0m'); }
function conferir(nome, valor, esperado, tol, unidade) {
  var passou, detalhe;
  if (typeof esperado === 'boolean') { passou = valor === esperado; detalhe = String(valor); }
  else {
    var dif = Math.abs(valor - esperado);
    var rel = esperado !== 0 ? dif / Math.abs(esperado) : dif;
    passou = (tol.abs !== undefined ? dif <= tol.abs : rel <= tol.rel);
    detalhe = fmt(valor) + (esperado !== undefined ? '  esperado ' + fmt(esperado) +
      '  (dif ' + (esperado !== 0 ? (rel * 100).toFixed(4) + '%' : fmt(dif)) + ')' : '');
  }
  if (passou) ok++; else falhas.push(bloco + ' → ' + nome + ': ' + detalhe);
  console.log('  ' + (passou ? '\x1b[32mOK  \x1b[0m' : '\x1b[31mFALHA\x1b[0m') + ' ' +
    nome.padEnd(52) + detalhe + (unidade || ''));
}
function fmt(v) {
  if (typeof v !== 'number') return String(v);
  return Math.abs(v) >= 1000 ? v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
                             : v.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
}

/* ------------------------------------------------ premissas de referência */
function ITU(over) {
  var P = {
    identificacao: { nome: 'Gleba Itu', municipio: 'Itu', uf: 'SP' },
    areas: { tipo: 'aberto', gleba: 160084,
             aberto:     { circulacao: 0.24022388246170762, verdeLazer: 0.10466942355263506,
                           institucional: 0.025 },
             condominio: { circulacao: 0.15, verdeLazer: 0.10, institucional: 0.05 },
             app: 0.1288136228480048, faixa: 14408, restricao: 0 },
    prazos: { preOp: 18, nFases: 1 },
    produtos: [
      { tipo: 'residencial', area: 391.406, precoM2: 1250, pagamento: 'mix', momento: 'Intermediário' },
      { tipo: 'comercial', area: 800, precoM2: 1250, pagamento: 'avista', momento: 'Intermediário' },
      { tipo: 'comercial', area: 85, precoM2: 1250, pagamento: 'avista', momento: 'Início' },
      { tipo: 'comercial', area: 85, precoM2: 1250, pagamento: 'avista', momento: 'Intermediário' },
      { tipo: 'comercial', area: 85, precoM2: 1250, pagamento: 'avista', momento: 'Fim' }],
    quadro: [[164, 0, 0, 0], [1, 0, 0, 0], [4, 0, 0, 0], [4, 0, 0, 0], [2, 0, 0, 0]],
    planos: [{ n: 1, mix: 0.2, entrada: 1, desconto: 0.05, correcao: 0.05, jurosReal: 0 },
             { n: 120, mix: 0.5, entrada: 0.15, desconto: 0, correcao: 0.05, jurosReal: 0.08 },
             { n: 180, mix: 0.3, entrada: 0.15, desconto: 0, correcao: 0.05, jurosReal: 0.08 },
             { n: 0, mix: 0, entrada: 0, desconto: 0, correcao: 0.05, jurosReal: 0 },
             { n: 0, mix: 0, entrada: 0, desconto: 0, correcao: 0.05, jurosReal: 0 }],
    fases: [0, 1, 2, 3].map(function (i) {
      return { janLanc: 6, prazoObra: [18, 24, 18, 18][i], etapa1: .15, etapa2: .25, etapa3: .35,
               velLanc: .2, velObra: [.6, .5, .5, .5][i], velPos: [.2, .3, .3, .3][i], durPos: 12, gatilho: .7 };
    }),
    custos: { impostos: .0673, comissoes: .045, contrapartidas: .025, outrosTerreno: .02,
              obraM2: 300, obraPctVGV: 0, criterio: 'Critério 1', pctPreOp: .08, cga: .03,
              gerenciamento: .06, manutencao: .01, marketing: .03, stand: .01,
              gestaoComercial: .005, premiacao: .005, admVendas: .015, bancarias: .002 },
    indices: { ipca: .035, incc: .065, cdi: .13, multiplo: 2 },
    janelas: { terrenoIni: 0, terrenoParc: 1, itbiIni: 1, itbiParc: 1, preOpIni: 1,
               contrapAnteObra: -3, contrapDur: 6, manutT1: 24, manutP1: .7, manutT2: 12, manutP2: .3,
               mktAntes: -6, mktPctAntes: .6, mktDepois: 36, standAntes: -3, standPctAntes: .3 },
    terreno: { modo: 'resolver', forma: 'permuta', valorDinheiro: 0, sinal: 0, permutaPct: 0.42 }
  };
  if (over) over(P);
  return P;
}
var soma = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };

/* ============================ 1 · ADERÊNCIA À PLANILHA DE ORIGEM ========= */
B('1 · ADERÊNCIA À PLANILHA — referencial Itu, permuta travada em 41,9715%');
var fixo = Motor.calcular(ITU(function (P) {
  P.terreno = { modo: 'informado', forma: 'permuta', valorDinheiro: 0, sinal: 0,
                permutaPct: 0.41971472001994564 };
}));
var T = fixo.totais, rel = { rel: 0.0005 };
[['Receita de vendas recebida', T.receita, 112451627.65],

 ['Impostos sobre a receita', T.impostos, -7567994.54],
 ['Corretagem', T.corretagem, -3821335.01],
 ['Gestão comercial', T.gestao, -424592.78],
 ['Premiação s/ vendas', T.premiacao, -424592.78],
 ['Marketing', T.marketing, -2469021.90],
 ['Stand de vendas', T.stand, -823007.30],
 ['Despesas adm. de vendas', T.admvendas, -1234510.95],
 ['Despesas bancárias', T.bancarias, -164601.46],
 ['Receita líquida de vendas', T.liquida, 95521970.94],
 ['Permuta ao terrenista', T.permuta, -40819883.40],
 ['Registro, ITBI e diligências', T.itbi, -454394.68],
 ['Despesas pré-operacionais', T.preop, -1580174.02],
 ['Obras de infraestrutura', T.obra, -19684407.79],
 ['Contrapartidas ao município', T.contrap, -2181136.55],
 ['Gerenciamento de obras', T.ger, -1181064.47],
 ['Manutenção pós-obras', T.manut, -197521.75],
 ['CGA', T.cga, -2469021.90],
 ['Resultado do empreendimento', fixo.ind.resultado, 26954366.38]
].forEach(function (l) { conferir(l[0], l[1], l[2], rel); });
/* A receita comercial é conferida pelos primeiros princípios: cada lote à vista,
   a preço de tabela corrigido até o mês da venda e deflacionado pelo IPCA. */
var fr = function (m) { return Math.pow(1.05 / 1.035, m / 12); };
var comercialEsperada = 1000000 * fr(43) + 425000 * fr(19) + 425000 * fr(43) + 212500 * fr(54);
conferir('Receita comercial (lotes à vista corrigidos)', T.receitaCom, comercialEsperada, { rel: 0.0005 });
conferir('Receita residencial (total menos comercial)', T.receitaRes, 112451627.65 - T.receitaCom, { rel: 0.0005 });
conferir('TIR real (% a.a.)', fixo.ind.tir * 100, 21.7401, { abs: 0.002 });
conferir('TMA real (% a.a.)', fixo.ind.tma * 100, 21.7391, { abs: 0.002 });
conferir('VPL à TMA (R$)', fixo.ind.vpl, 350.18, { abs: 30 });
conferir('Investimento requerido', fixo.ind.investimento, 15112126.42, rel);
conferir('Retorno ao investidor', fixo.ind.retorno, 42066492.72, rel);
conferir('Múltiplo sobre o capital', fixo.ind.multiplo, 2.783625, { rel: 0.001 });
conferir('Payback primário (meses)', fixo.ind.payback, 79, { abs: 0 });
conferir('Duration (meses)', fixo.ind.duration, 78.3775, { abs: 0.05 });
conferir('VGV de tabela', fixo.ind.vgv, 82300730, rel);
conferir('ALV disponível (m²)', fixo.areas.alvDisponivel, 65841, { abs: 1 });
conferir('Valor presente da permuta', fixo.ind.vpPermuta, 22784959.86, rel);
conferir('Fim das vendas da fase 1 (mês)', fixo.fases[0].fimVendas, 54, { abs: 0 });
conferir('Último recebimento (mês)', fixo.ind.ultimoRecebimento, 234, { abs: 0 });
conferir('Entrega da obra (mês)', fixo.fases[0].obraFim, 43, { abs: 0 });

/* ============================ 2 · COERÊNCIA INTERNA ===================== */
B('2 · COERÊNCIA INTERNA — o modelo fecha consigo mesmo');
function coerencia(r, etiqueta) {
  var T = r.totais, i = r.ind;
  var somaContas = T.receita + T.impostos + T.corretagem + T.gestao + T.premiacao + T.marketing +
    T.stand + T.admvendas + T.bancarias + T.permuta + T.terreno + T.itbi + T.preop + T.obra +
    T.contrap + T.ger + T.manut + T.cga;
  somaContas = somaContas - T.receita + T.receitaRes + T.receitaCom;
  conferir(etiqueta + ' · demonstrativo concilia com o fluxo', somaContas, i.resultado, { abs: 1 });
  conferir(etiqueta + ' · soma dos meses = resultado', soma(r.meses.map(function (m) { return m.fluxo; })),
    i.resultado, { abs: 1 });
  conferir(etiqueta + ' · soma das fases = resultado',
    soma(r.resultadoFase.map(function (f) { return f.resultado; })), i.resultado, { abs: 1 });
  conferir(etiqueta + ' · investimento = exposição máxima', i.investimento, -i.exposicao, { abs: 1 });
  conferir(etiqueta + ' · retorno = resultado + investimento', i.retorno, i.resultado + i.investimento, { abs: 1 });
  conferir(etiqueta + ' · valor do terreno = caixa (VP) + permuta (VP)', i.valorTerreno,
    i.vpCaixa + i.vpPermuta, { abs: 1 });
  conferir(etiqueta + ' · ITBI = 2% do equivalente à vista', -T.itbi,
    0.02 * (i.caixaTerreno + i.vpPermuta) * Math.pow(1.035, -1 / 12), { rel: 0.001 });
  conferir(etiqueta + ' · receita = residencial + comercial', T.receita,
    T.receitaRes + T.receitaCom, { abs: 1 });
  conferir(etiqueta + ' · receita líquida = receita − deduções', T.liquida,
    T.receita + T.impostos + T.corretagem + T.gestao + T.premiacao + T.marketing + T.stand +
    T.admvendas + T.bancarias, { abs: 1 });
}
coerencia(fixo, 'permuta fixa');

B('2b · TRAVA DA TIR NA TMA — as três formas de pagamento');
var formas = [['permuta', 'permuta', 0], ['avista', 'avista', 0],
              ['misto com R$ 8 M em dinheiro', 'misto', 8e6]];
var resolvidos = {};
formas.forEach(function (f) {
  var r = Motor.calcular(ITU(function (P) {
    P.terreno = { modo: 'resolver', forma: f[1], valorDinheiro: f[2], sinal: 0, permutaPct: 0 };
  }));
  resolvidos[f[0]] = r;
  conferir(f[0] + ' · VPL zerado', r.ind.vpl, 0, { abs: 500 });
  conferir(f[0] + ' · TIR = TMA', (r.ind.tir - r.ind.tma) * 100, 0, { abs: 0.01 });
  conferir(f[0] + ' · dinheiro conforme informado', r.ind.caixaTerreno,
           f[1] === 'avista' ? r.ind.caixaTerreno : f[2], { abs: 1 });
  coerencia(r, f[0]);
});

/* ============================ 3 · COMPORTAMENTO ECONÔMICO =============== */
B('3 · COMPORTAMENTO ECONÔMICO — o modelo responde na direção certa');
var vP = resolvidos['permuta'].ind.valorTerreno;
var vV = resolvidos['avista'].ind.valorTerreno;
var vM = resolvidos['misto com R$ 8 M em dinheiro'].ind.valorTerreno;
console.log('  permuta pura R$ ' + fmt(vP) + '  ·  misto R$ ' + fmt(vM) + '  ·  à vista R$ ' + fmt(vV));
conferir('pagar à vista reduz o teto (antecipa o desembolso)', vV < vP, true);
conferir('o misto fica entre os dois extremos', vM < vP && vM > vV, true);
function teto(over) { return Motor.calcular(ITU(over)).ind.valorTerreno; }
var base = teto(function () {});
conferir('obra +10% reduz o teto', teto(function (P) { P.custos.obraM2 = 330; }) < base, true);
conferir('preço +10% aumenta o teto', teto(function (P) {
  P.produtos.forEach(function (c) { if (c.precoM2) c.precoM2 = 1375; }); }) > base, true);
conferir('TMA maior reduz o teto', teto(function (P) { P.indices.multiplo = 2.4; }) < base, true);
conferir('venda mais rápida aumenta o teto', teto(function (P) {
  P.fases[0].velLanc = 0.35; P.fases[0].velPos = 0.1; }) > base, true);
conferir('prazo de obra maior reduz o teto', teto(function (P) { P.fases[0].prazoObra = 30; }) < base, true);
var escala = [0, 4e6, 8e6, 12e6].map(function (d) {
  return Motor.calcular(ITU(function (P) {
    P.terreno = { modo: 'resolver', forma: d === 0 ? 'permuta' : 'misto',
                  valorDinheiro: d, sinal: 0, permutaPct: 0 };
  })).ind.valorTerreno;
});
var monotona = escala.every(function (v, i) { return i === 0 || v <= escala[i - 1] + 1; });
conferir('teto cai monotonicamente conforme sobe o dinheiro', monotona, true);
console.log('  escala R$ 0 → 12 M em dinheiro: ' + escala.map(function (v) { return fmt(v); }).join('  ·  '));

B('3b · IDA E VOLTA — informar o valor resolvido devolve a mesma TIR');
var res = resolvidos['misto com R$ 8 M em dinheiro'];
var volta = Motor.calcular(ITU(function (P) {
  P.terreno = { modo: 'informado', forma: 'misto', sinal: 0,
                valorDinheiro: res.ind.caixaTerreno, permutaPct: res.ind.permutaPct };
}));
conferir('mesmo valor de terreno', volta.ind.valorTerreno, res.ind.valorTerreno, { rel: 0.001 });
conferir('mesma TIR', volta.ind.tir * 100, res.ind.tir * 100, { abs: 0.01 });
conferir('mesmo resultado', volta.ind.resultado, res.ind.resultado, { rel: 0.001 });

/* ============================ 4 · ROBUSTEZ ============================== */
B('4 · ROBUSTEZ — entradas degeneradas não quebram e são acusadas');
function checar(P, nome, chave) {
  var r = Motor.calcular(P);
  var c = r.checks.filter(function (x) { return x.txt.indexOf(chave) >= 0; })[0];
  conferir(nome, !!c && !c.ok, true);
  return r;
}
checar(ITU(function (P) { P.quadro.forEach(function (l) { l[0] = 0; }); }), 'zero lotes é acusado', 'fase ativa');
checar(ITU(function (P) { P.planos[1].mix = 0.7; }), 'mix diferente de 100% é acusado', 'mix');
checar(ITU(function (P) { P.quadro[0][0] = 400; }), 'ALV insuficiente é acusada', 'cabe na ALV');
var quatro = Motor.calcular(ITU(function (P) {
  P.prazos.nFases = 4;
  P.quadro[0] = [60, 40, 34, 30];
  P.quadro[1] = [1, 0, 0, 0];
}));
conferir('4 fases: lançamentos em cadeia crescente',
  quatro.fases.every(function (f, i) { return i === 0 || f.lanc > quatro.fases[i - 1].lanc; }), true);
console.log('  lançamentos: ' + quatro.fases.map(function (f) { return 'F' + f.i + ' mês ' + f.lanc; }).join('  ·  '));
conferir('4 fases: soma das fases = resultado',
  soma(quatro.resultadoFase.map(function (f) { return f.resultado; })), quatro.ind.resultado, { abs: 1 });
conferir('4 fases: VPL zerado', quatro.ind.vpl, 0, { abs: 500 });
conferir('4 fases: ciclo dentro do horizonte', quatro.ind.ultimoRecebimento < 420, true);
var semReceita = Motor.calcular(ITU(function (P) { P.produtos.forEach(function (c) { c.precoM2 = 0; }); }));
conferir('sem receita: não quebra e o teto é zero', semReceita.ind.valorTerreno <= 1, true);

/* ------------------------------------------------------------- resultado */
console.log('\n' + '─'.repeat(78));
console.log(falhas.length === 0
  ? '\x1b[32m' + ok + ' verificações, todas OK.\x1b[0m'
  : '\x1b[31m' + falhas.length + ' FALHA(S) em ' + (ok + falhas.length) + ' verificações:\x1b[0m\n  ' + falhas.join('\n  '));
process.exit(falhas.length ? 1 : 0);
