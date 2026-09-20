/* ============================================================================
   MOTOR DO INVOLUTIVO — porte fiel da planilha INVOLUTIVO_LOTEAMENTO
   ----------------------------------------------------------------------------
   Toda a análise é feita em MOEDA DA BASE: cada conta é reajustada pelo seu
   próprio indexador (IPCA, INCC ou nenhum) e depois deflacionada pelo IPCA
   acumulado até o mês. A TIR e o resultado saem, portanto, REAIS.

   Entrada:  objeto de premissas (ver premissasPadrao() em app.js)
   Saída:    { meses[], totais, ind, areas, quadro, checks }
   ========================================================================== */
(function (root) {
  'use strict';

  var HORIZONTE = 421;            // meses 0..420, como a grade da planilha
  var COLUNAS = [
    ['terreno',   'Pgto. do Terreno'],
    ['itbi',      'Registro, ITBI e diligências'],
    ['preop',     'Despesas pré-operacionais'],
    ['contrap',   'Contrapartidas'],
    ['obra',      'Obras de infraestrutura'],
    ['manut',     'Manutenção pós-obras'],
    ['ger',       'Gerenciamento de obras'],
    ['receita',   'Receita de vendas'],
    ['impostos',  'Impostos sobre a receita'],
    ['marketing', 'Marketing'],
    ['stand',     'Stand de vendas'],
    ['corretagem','Corretagem'],
    ['gestao',    'Gestão comercial'],
    ['premiacao', 'Premiação s/ vendas'],
    ['admvendas', 'Despesas adm. de vendas'],
    ['bancarias', 'Despesas bancárias'],
    ['permuta',   'Permuta ao terrenista'],
    ['cga',       'CGA']
  ];

  function z() { var a = new Array(HORIZONTE); for (var i = 0; i < HORIZONTE; i++) a[i] = 0; return a; }
  function soma(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function num(v, d) { v = parseFloat(v); return isFinite(v) ? v : (d || 0); }
  function pmtFator(i, n) { return i > 0 ? i / (1 - Math.pow(1 + i, -n)) : (n > 0 ? 1 / n : 0); }

  /* ---------------------------------------------------------------- áreas */
  function quadroAreas(P) {
    var a = P.areas, G = num(a.gleba);
    var perdas = ['viario', 'doacoes', 'verdes', 'lazer', 'faixa', 'restricao']
      .map(function (k) { return { chave: k, m2: num(a[k]) }; });
    var totalPerdas = perdas.reduce(function (s, x) { return s + x.m2; }, 0);
    return { gleba: G, perdas: perdas, totalPerdas: totalPerdas, alvDisponivel: G - totalPerdas };
  }

  /* ------------------------------------------------- produto e faseamento */
  function programa(P) {
    var nF = Math.max(1, Math.min(4, Math.round(num(P.prazos.nFases, 1))));
    var res = P.residenciais.map(function (r) {
      return { area: num(r.area), precoM2: num(r.precoM2), precoLote: num(r.area) * num(r.precoM2) };
    });
    var com = P.comerciais.map(function (c) {
      var precoLote = num(c.area) * num(c.precoM2);
      return { lotes: num(c.lotes), area: num(c.area), fase: Math.round(num(c.fase, 1)),
               momento: c.momento || 'Início', precoM2: num(c.precoM2), precoLote: precoLote,
               vgv: num(c.lotes) * precoLote, alv: num(c.lotes) * num(c.area) };
    });
    var fases = [];
    for (var f = 0; f < 4; f++) {
      var ativa = f < nF, lotes = [], vgv = 0, alv = 0, tot = 0;
      for (var p = 0; p < 5; p++) {
        var q = ativa ? num(P.quadro[p][f]) : 0;
        lotes.push(q); tot += q; vgv += q * res[p].precoLote; alv += q * res[p].area;
      }
      fases.push({ ativa: ativa, lotes: lotes, totalLotes: tot, vgv: vgv, alv: alv });
    }
    var vgvRes = fases.reduce(function (s, x) { return s + x.vgv; }, 0);
    var vgvCom = com.reduce(function (s, x) { return s + (x.fase <= nF ? x.vgv : 0); }, 0);
    var alvRes = fases.reduce(function (s, x) { return s + x.alv; }, 0);
    var alvCom = com.reduce(function (s, x) { return s + (x.fase <= nF ? x.alv : 0); }, 0);
    var lotesRes = fases.reduce(function (s, x) { return s + x.totalLotes; }, 0);
    var lotesCom = com.reduce(function (s, x) { return s + (x.fase <= nF ? x.lotes : 0); }, 0);
    return { nFases: nF, res: res, com: com, fases: fases, vgvRes: vgvRes, vgvCom: vgvCom,
             vgv: vgvRes + vgvCom, alv: alvRes + alvCom, lotesRes: lotesRes, lotesCom: lotesCom };
  }

  /* ------------------------------------------------------------ vendas */
  /* Simula fase a fase. A fase seguinte só lança quando a anterior atinge
     o gatilho de vendas — exatamente como 'VENDAS Fn'!C5 faz na planilha. */
  function cronogramaEVendas(P, prog) {
    var fases = [], vendas = [];   // vendas[f][produto][mês do projeto]
    var lancAnterior = null, gatilhoAnterior = null;
    for (var f = 0; f < prog.nFases; f++) {
      var cfg = P.fases[f];
      var janLanc = Math.max(1, Math.round(num(cfg.janLanc, 6)));
      var prazoObra = Math.max(1, Math.round(num(cfg.prazoObra, 18)));
      var durPos = Math.max(1, Math.round(num(cfg.durPos, 12)));
      var lanc = f === 0 ? Math.round(num(P.prazos.preOp)) + 1 : lancAnterior + gatilhoAnterior;
      var obraIni = lanc + janLanc;
      var obraFim = obraIni + prazoObra;              // mês da entrega (DRF 'Entrega da Obra')
      var fimVendas = lanc + janLanc + prazoObra + durPos - 1;
      var velLanc = num(cfg.velLanc), velPos = num(cfg.velPos);
      var velObra = Math.max(0, 1 - velLanc - velPos);   // residual, como L16 da planilha
      var lotesFase = prog.fases[f].lotes;
      var vend = [], restante = lotesFase.slice(), acum = [];
      for (var p = 0; p < 5; p++) vend.push(z());
      var totalFase = prog.fases[f].totalLotes, vendidos = 0, gat = 1;
      var achouGatilho = false;
      var duracaoFase = janLanc + prazoObra + durPos;
      for (var j = 1; j <= duracaoFase; j++) {
        var m = lanc + j - 1;
        for (var p2 = 0; p2 < 5; p2++) {
          var taxa = j <= janLanc ? lotesFase[p2] * velLanc / janLanc
                   : j <= janLanc + prazoObra ? lotesFase[p2] * velObra / prazoObra
                   : lotesFase[p2] * velPos / durPos;
          var v = Math.max(0, Math.min(taxa, restante[p2]));
          restante[p2] -= v;
          if (m < HORIZONTE) vend[p2][m] = v;
          vendidos += v;
        }
        var pct = totalFase > 0 ? vendidos / totalFase : 0;
        acum.push(pct);
        if (!achouGatilho && pct > num(cfg.gatilho, 0.7)) { gat = j; achouGatilho = true; }
      }
      if (!achouGatilho) gat = duracaoFase;
      fases.push({ i: f + 1, lanc: lanc, janLanc: janLanc, obraIni: obraIni, prazoObra: prazoObra,
                   obraFim: obraFim, durPos: durPos, fimVendas: fimVendas, velLanc: velLanc,
                   velObra: velObra, velPos: velPos, lotes: totalFase, pctAcum: acum });
      vendas.push(vend);
      lancAnterior = lanc; gatilhoAnterior = gat;
    }
    return { fases: fases, vendas: vendas };
  }

  /* ----------------------------------------------------------- receitas */
  function receitas(P, prog, cron) {
    var ipca = num(P.indices.ipca), N = HORIZONTE;
    var rec = z(), vgvVendido = z(), entradas = z(), parcelas = z();
    var recFase = [z(), z(), z(), z()];
    var planos = P.planos.map(function (pl) {
      var n = Math.max(0, Math.round(num(pl.n)));
      var jrReal = num(pl.jurosReal);
      var jn = Math.pow((1 + jrReal) * (1 + ipca), 1 / 12) - 1;   // nominal equivalente
      return { n: n, mix: num(pl.mix), entrada: num(pl.entrada), desconto: num(pl.desconto),
               correcao: num(pl.correcao), fator: n > 1 ? pmtFator(jn, n) : 0 };
    });
    function def(m) { return Math.pow(1 + ipca, -m / 12); }

    function vender(qtd, precoLote, m, fase, soVista) {
      if (qtd <= 0 || m < 0 || m >= N) return;
      for (var k = 0; k < planos.length; k++) {
        var pl = planos[k];
        var mix = soVista ? (k === 0 ? 1 : 0) : pl.mix;
        if (mix <= 0 || pl.n < 1) continue;
        var desconto = soVista ? 0 : pl.desconto;   // lote comercial sai a preço de tabela
        var corr = Math.pow(1 + pl.correcao, m / 12);
        var valor = qtd * mix * precoLote * (1 - desconto) * corr;
        vgvVendido[m] += valor * def(m);
        var ent = valor * pl.entrada;
        rec[m] += ent * def(m); entradas[m] += ent * def(m);
        if (fase >= 0) recFase[fase][m] += ent * def(m);
        var fin = valor * (1 - pl.entrada);
        if (fin <= 0 || pl.n <= 1) continue;
        var pmt = fin * pl.fator;                      // parcela FIXA em moeda nominal
        for (var t = 1; t <= pl.n && m + t < N; t++) {
          var v = pmt * def(m + t);
          rec[m + t] += v; parcelas[m + t] += v;
          if (fase >= 0) recFase[fase][m + t] += v;
        }
      }
    }
    for (var f = 0; f < cron.fases.length; f++) {
      for (var p = 0; p < 5; p++) {
        var serie = cron.vendas[f][p], preco = prog.res[p].precoLote;
        for (var m = 0; m < N; m++) if (serie[m] > 0) vender(serie[m], preco, m, f, false);
      }
    }
    prog.com.forEach(function (c) {
      if (c.lotes <= 0 || c.fase > cron.fases.length) return;
      var fa = cron.fases[c.fase - 1];
      var m = c.momento === 'Início' ? fa.lanc : c.momento === 'Fim' ? fa.fimVendas : fa.obraFim;
      vender(c.lotes, c.precoLote, m, c.fase - 1, true);
    });
    var ultimo = 0;
    for (var q = 0; q < N; q++) if (rec[q] > 0.5) ultimo = q;
    return { rec: rec, vgvVendido: vgvVendido, entradas: entradas, parcelas: parcelas,
             recFase: recFase, ultimoRecebimento: ultimo, planos: planos };
  }

  /* --------------------------------------------------- contas e fluxo */
  function montar(P, prog, cron, R, permPct, vpPermuta) {
    var N = HORIZONTE, C = P.custos, J = P.janelas, idx = P.indices;
    var ipca = num(idx.ipca), incc = num(idx.incc);
    var fINCC = function (m) { return Math.pow((1 + incc) / (1 + ipca), m / 12); };
    var fIPCA = function () { return 1; };
    var fSEM = function (m) { return Math.pow(1 + ipca, -m / 12); };
    var col = {}; COLUNAS.forEach(function (c) { col[c[0]] = z(); });

    var obraTotal = C.criterio === 'Critério 2' ? num(C.obraPctVGV) * prog.vgv : num(C.obraM2) * prog.alv;
    var preOpV = num(C.pctPreOp) * obraTotal;
    var obraExec = obraTotal - preOpV;
    var aquisicao = num(C.aquisicao);
    var itbiV = num(C.outrosTerreno) * (aquisicao + vpPermuta);
    var contrapV = num(C.contrapartidas) * prog.vgv;
    var manutV = num(C.manutencao) * obraTotal;
    var mktV = num(C.marketing) * prog.vgv;
    var standV = num(C.stand) * prog.vgv;
    var admV = num(C.admVendas) * prog.vgv;
    var bancV = num(C.bancarias) * prog.vgv;
    var cgaV = num(C.cga) * prog.vgv;

    function espalhar(alvo, valor, ini, dur, inflator) {
      if (valor === 0 || dur <= 0) return;
      for (var k = 0; k < dur; k++) {
        var m = Math.round(ini + k);
        if (m >= 0 && m < N) alvo[m] += (valor / dur) * inflator(m);
      }
    }
    espalhar(col.terreno, aquisicao, num(J.terrenoIni), Math.max(1, num(J.terrenoParc, 1)), fSEM);
    espalhar(col.itbi, itbiV, num(J.itbiIni, 1), Math.max(1, num(J.itbiParc, 1)), fSEM);
    espalhar(col.preop, preOpV, num(J.preOpIni, 1), Math.max(1, Math.round(num(P.prazos.preOp))), fIPCA);

    var pesoFase = cron.fases.map(function (fa) {
      return prog.fases[fa.i - 1].totalLotes / Math.max(1, prog.lotesRes);
    });
    cron.fases.forEach(function (fa, i) {
      var peso = prog.fases[i].totalLotes / Math.max(1, prog.lotesRes);
      var etapas = [num(P.fases[i].etapa1), num(P.fases[i].etapa2), num(P.fases[i].etapa3)];
      etapas.push(1 - etapas[0] - etapas[1] - etapas[2]);
      var dur = Math.trunc(fa.prazoObra / 4), durs = [dur, dur, dur, fa.prazoObra - 3 * dur];
      var cursor = fa.obraIni;
      for (var e = 0; e < 4; e++) {
        espalhar(col.obra, obraExec * peso * etapas[e], cursor, Math.max(1, durs[e]), fINCC);
        cursor += durs[e];
      }
      espalhar(col.contrap, contrapV * peso, fa.obraIni + num(J.contrapAnteObra, -3),
               Math.max(1, num(J.contrapDur, 6)), fINCC);
      espalhar(col.manut, manutV * peso * num(J.manutP1, 0.7), fa.obraFim,
               Math.max(1, num(J.manutT1, 24)), fIPCA);
      espalhar(col.manut, manutV * peso * num(J.manutP2, 0.3), fa.obraFim + num(J.manutT1, 24),
               Math.max(1, num(J.manutT2, 12)), fIPCA);
      var antes = Math.abs(num(J.mktAntes, -6));
      espalhar(col.marketing, (mktV / cron.fases.length) * num(J.mktPctAntes, 0.6), fa.lanc - antes,
               Math.max(1, antes), fIPCA);
      espalhar(col.marketing, (mktV / cron.fases.length) * (1 - num(J.mktPctAntes, 0.6)), fa.lanc,
               Math.max(1, num(J.mktDepois, 36)), fIPCA);
    });
    var f1 = cron.fases[0], antesStand = Math.abs(num(J.standAntes, -3));
    var fimStand = cron.fases[cron.fases.length - 1].fimVendas;
    espalhar(col.stand, standV * num(J.standPctAntes, 0.3), f1.lanc - antesStand,
             Math.max(1, antesStand), fIPCA);
    espalhar(col.stand, standV * (1 - num(J.standPctAntes, 0.3)), f1.lanc,
             Math.max(1, fimStand - f1.lanc + 1), fIPCA);
    var maxParc = Math.max.apply(null, P.planos.map(function (p) { return num(p.n); }));
    var fimAdm = fimStand + maxParc;
    espalhar(col.admvendas, admV, f1.lanc, Math.max(1, fimAdm - f1.lanc + 1), fIPCA);
    espalhar(col.bancarias, bancV, f1.lanc, Math.max(1, fimAdm - f1.lanc + 1), fIPCA);
    espalhar(col.cga, cgaV, 0, R.ultimoRecebimento + 1, fIPCA);

    for (var m = 0; m < N; m++) {
      col.receita[m] = R.rec[m];
      col.impostos[m] = -num(C.impostos) * R.rec[m];
      col.corretagem[m] = -num(C.comissoes) * R.vgvVendido[m];
      col.gestao[m] = -num(C.gestaoComercial) * R.vgvVendido[m];
      col.premiacao[m] = -num(C.premiacao) * R.vgvVendido[m];
      col.ger[m] = -num(C.gerenciamento) * col.obra[m];
    }
    ['terreno', 'itbi', 'preop', 'contrap', 'obra', 'manut', 'marketing', 'stand',
     'admvendas', 'bancarias', 'cga'].forEach(function (k) {
      for (var i = 0; i < N; i++) col[k][i] = -col[k][i];
    });

    var liquida = z(), fluxo = z(), acum = z(), a = 0;
    for (var t = 0; t < N; t++) {
      liquida[t] = col.receita[t] + col.impostos[t] + col.marketing[t] + col.stand[t] +
                   col.corretagem[t] + col.gestao[t] + col.premiacao[t] + col.admvendas[t] +
                   col.bancarias[t];
      col.permuta[t] = -permPct * Math.max(0, liquida[t]);
      fluxo[t] = liquida[t] + col.permuta[t] + col.cga[t] + col.terreno[t] + col.itbi[t] +
                 col.preop[t] + col.contrap[t] + col.obra[t] + col.manut[t] + col.ger[t];
      a += fluxo[t]; acum[t] = a;
    }
    return { col: col, liquida: liquida, fluxo: fluxo, acum: acum,
             valores: { obraTotal: obraTotal, preOpV: preOpV, obraExec: obraExec, itbiV: itbiV,
                        contrapV: contrapV, manutV: manutV, mktV: mktV, standV: standV,
                        admV: admV, bancV: bancV, cgaV: cgaV, aquisicao: aquisicao } };
  }

  /* Fluxo do investidor, na mesma construção das colunas AR..AW da planilha:
     AS = aporte que mantém o caixa em zero, AV = saldo acumulado já com aportes,
     AT = devolução ao investidor, AW = AS + AT (série de onde saem TIR e VPL). */
  function fluxoInvestidor(fluxo, fim) {
    var N = fluxo.length, AS = z(), AV = z(), AT = z(), AW = z(), AR = z(), somaAS = 0, somaAT = 0;
    for (var t = 0; t < N; t++) AR[t] = t > fim ? 0 : Math.round(fluxo[t] * 100) / 100;
    var saldo = 0;
    for (var i = 0; i < N; i++) {
      saldo += AR[i];
      AS[i] = Math.round(Math.max(0, -(saldo + somaAS)) * 100) / 100;
      somaAS += AS[i];
      AV[i] = saldo + somaAS;
    }
    var minFuturo = z(), menor = Infinity;
    for (var k = N - 1; k >= 0; k--) { menor = Math.min(menor, AV[k]); minFuturo[k] = menor; }
    for (var j = 0; j < N; j++) {
      AT[j] = Math.round((-minFuturo[j] - somaAT) * 100) / 100;
      somaAT += AT[j];
      AW[j] = AS[j] + AT[j];
    }
    return { AS: AS, AV: AV, AT: AT, AW: AW, aporte: somaAS, retorno: -somaAT };
  }

  function vplInvestidor(AW, taxaAnual) {
    var i = Math.pow(1 + taxaAnual, 1 / 12) - 1, s = 0, d = 1;
    for (var m = 0; m < AW.length; m++) { s += AW[m] / d; d *= (1 + i); }
    return -s;
  }

  function vpl(serie, taxaAnual) {
    var i = Math.pow(1 + taxaAnual, 1 / 12) - 1, s = 0, d = 1;
    for (var m = 0; m < serie.length; m++) { s += serie[m] / d; d *= (1 + i); }
    return s;
  }
  function tir(serie) {
    var fim = 0;
    for (var i = 0; i < serie.length; i++) if (Math.abs(serie[i]) > 0.5) fim = i;
    function f(r) {
      var s = 0, d = 1;
      for (var m = 0; m <= fim; m++) { s += serie[m] / d; d *= (1 + r); if (!isFinite(d) || d <= 1e-280) return s; }
      return s;
    }
    /* Varre a faixa e fica com a ÚLTIMA troca de sinal (+ para -): é a raiz
       economicamente relevante de um fluxo que inverte de sinal mais de uma vez. */
    var p = [-0.4, -0.2, -0.1, -0.05, -0.02, -0.01, -0.003, 0.0005, 0.002, 0.004, 0.006, 0.008,
             0.01, 0.0125, 0.015, 0.0175, 0.02, 0.025, 0.03, 0.04, 0.05, 0.07, 0.1, 0.15, 0.25, 0.4, 0.7, 1.0];
    var lo = null, hi = null;
    for (var k = 0; k < p.length - 1; k++) {
      var a = f(p[k]), b = f(p[k + 1]);
      if (isFinite(a) && isFinite(b) && a > 0 && b < 0) { lo = p[k]; hi = p[k + 1]; }
    }
    if (lo === null) return null;
    for (var t = 0; t < 90; t++) { var mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
    var r = (lo + hi) / 2;
    return isFinite(r) ? Math.pow(1 + r, 12) - 1 : null;
  }

  /* ------------------------------------------------------------ cálculo */
  function calcular(P) {
    var areas = quadroAreas(P), prog = programa(P), cron = cronogramaEVendas(P, prog);
    var R = receitas(P, prog, cron);
    var idx = P.indices;
    var tma = (1 + num(idx.cdi) * num(idx.multiplo)) / (1 + num(idx.ipca)) - 1;
    var taxaTerrenista = (1 + num(idx.cdi)) / (1 + num(idx.ipca)) - 1;

    /* O ITBI depende do valor da gleba, que depende do fluxo: itera até fechar. */
    function rodar(permPct) {
      var vp = 0, M = null;
      for (var it = 0; it < 4; it++) {
        M = montar(P, prog, cron, R, permPct, vp);
        vp = Math.abs(vpl(M.col.permuta, taxaTerrenista));
      }
      M.vpPermuta = vp;
      return M;
    }
    var permPct, M;
    if (P.permuta.modo === 'resolver') {
      var lo = 0, hi = 0.98;
      for (var k = 0; k < 40; k++) {
        permPct = (lo + hi) / 2;
        var teste = rodar(permPct);
        var vplTeste = vplInvestidor(fluxoInvestidor(teste.fluxo, R.ultimoRecebimento).AW, tma);
        if (vplTeste > 0) lo = permPct; else hi = permPct;
      }
      permPct = (lo + hi) / 2;
    } else {
      permPct = num(P.permuta.valor);
    }
    M = rodar(permPct);

    var N = HORIZONTE, fluxo = M.fluxo, acum = M.acum;

    var INV = fluxoInvestidor(fluxo, R.ultimoRecebimento);

    var expo = Math.min.apply(null, acum), mExpo = acum.indexOf(expo);
    var pb = null; for (var m = 1; m < N; m++) if (acum[m] >= 0 && pb === null) pb = m;
    var resultado = soma(fluxo), receitaTot = soma(M.col.receita);
    var tirReal = tir(INV.AW.map(function (v) { return -v; }));
    var investimento = INV.aporte;            // capital próprio que sustenta o caixa até a virada
    var retorno = INV.retorno;                // tudo que volta ao investidor no ciclo
    var duration = 0, somaVP = 0;
    if (tirReal !== null) {
      var im = Math.pow(1 + tirReal, 1 / 12) - 1;
      for (var d = 0; d < N; d++) if (INV.AT[d] < 0) {
        var vpd = -INV.AT[d] / Math.pow(1 + tirReal, d / 12); duration += vpd * d; somaVP += vpd;
      }
      duration = somaVP > 0 ? duration / somaVP : 0;
    }
    var ciclo = 0; for (var c = 0; c < N; c++) if (Math.abs(fluxo[c]) > 0.5) ciclo = c;

    var meses = [];
    for (var i = 0; i <= ciclo; i++) {
      var linha = { mes: i };
      COLUNAS.forEach(function (cc) { linha[cc[0]] = M.col[cc[0]][i]; });
      linha.liquida = M.liquida[i]; linha.fluxo = fluxo[i]; linha.acum = acum[i];
      meses.push(linha);
    }
    var totais = { liquida: soma(M.liquida), fluxo: resultado, acum: acum[ciclo] };
    COLUNAS.forEach(function (cc) { totais[cc[0]] = soma(M.col[cc[0]]); });

    var alvFolga = areas.alvDisponivel - prog.alv;
    var checks = [
      { ok: prog.nFases >= 1 && prog.lotesRes > 0, txt: 'Há ao menos uma fase ativa e um lote no programa' },
      { ok: Math.abs(P.planos.reduce(function (s, p) { return s + num(p.mix); }, 0) - 1) < 0.0001,
        txt: 'O mix dos planos de venda soma 100%' },
      { ok: num(P.planos[0].entrada) === 1, txt: 'O plano à vista tem 100% de entrada' },
      { ok: P.fases.slice(0, prog.nFases).every(function (f) {
          return num(f.etapa1) + num(f.etapa2) + num(f.etapa3) <= 1; }),
        txt: 'As etapas 1 a 3 da curva de obra não passam de 100%' },
      { ok: P.fases.slice(0, prog.nFases).every(function (f) {
          return num(f.velLanc) + num(f.velPos) <= 1; }),
        txt: 'Lançamento + pós-obra não passam de 100% das vendas' },
      { ok: alvFolga >= -0.5, txt: 'O programa de vendas cabe na ALV disponível' },
      { ok: R.ultimoRecebimento <= HORIZONTE - 1, txt: 'O ciclo de recebimentos cabe no horizonte' },
      { ok: tirReal !== null, txt: 'A TIR converge' },
      { ok: tma < num(idx.cdi) * num(idx.multiplo) + 1e-9, txt: 'A TMA está em termos reais, comparável com a TIR' },
      { ok: prog.res.every(function (r, i) {
          var usado = P.quadro[i].reduce(function (s, q) { return s + num(q); }, 0);
          return usado === 0 || (r.area > 0 && r.precoM2 > 0); }),
        txt: 'Todo produto com lotes lançados tem área e preço' },
      { ok: Math.abs(resultado - (soma(M.liquida) + totais.permuta + totais.cga + totais.terreno +
            totais.itbi + totais.preop + totais.contrap + totais.obra + totais.manut + totais.ger)) < 1,
        txt: 'O demonstrativo concilia com o fluxo de caixa' },
      { ok: areas.gleba > 0 && areas.totalPerdas < areas.gleba, txt: 'O quadro de áreas fecha' }
    ];

    return {
      colunas: COLUNAS, meses: meses, totais: totais, areas: areas, prog: prog,
      fases: cron.fases, valores: M.valores, checks: checks,
      ind: {
        vgv: prog.vgv, vgvRes: prog.vgvRes, vgvCom: prog.vgvCom, alvUsada: prog.alv,
        alvFolga: alvFolga, aproveitamento: areas.gleba > 0 ? prog.alv / areas.gleba : 0,
        precoMedioLote: prog.lotesRes > 0 ? prog.vgvRes / prog.lotesRes : 0,
        precoMedioM2: prog.alv > 0 ? prog.vgvRes / prog.alv : 0,
        permutaPct: permPct, vpPermuta: M.vpPermuta, taxaTerrenista: taxaTerrenista,
        valorM2Gleba: areas.gleba > 0 ? M.vpPermuta / areas.gleba : 0,
        tma: tma, tir: tirReal, vpl: vplInvestidor(INV.AW, tma), resultado: resultado,
        receita: receitaTot, margemReceita: receitaTot > 0 ? resultado / receitaTot : 0,
        margemVGV: prog.vgv > 0 ? resultado / prog.vgv : 0,
        exposicao: expo, mesExposicao: mExpo, payback: pb, duration: duration,
        investimento: investimento, retorno: retorno,
        multiplo: investimento > 0 ? retorno / investimento : 0,
        ciclo: ciclo, ultimoRecebimento: R.ultimoRecebimento, aporte: INV.aporte,
        resultadoPorLote: (prog.lotesRes + prog.lotesCom) > 0 ? resultado / (prog.lotesRes + prog.lotesCom) : 0,
        resultadoPorM2: prog.alv > 0 ? resultado / prog.alv : 0
      }
    };
  }

  root.Motor = { calcular: calcular, HORIZONTE: HORIZONTE, COLUNAS: COLUNAS };
})(typeof window !== 'undefined' ? window : globalThis);
