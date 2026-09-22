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
    ['receitaRes','Receita de vendas — residencial'],
    ['receitaCom','Receita de vendas — comercial'],
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
  /* O estudo atende a duas modalidades de parcelamento. As três primeiras
     destinações mudam de nome e de percentual usual conforme a modalidade; a
     APP, a faixa não edificante e a área com restrição valem para as duas.
     Cada modalidade guarda os próprios percentuais, então alternar entre elas
     não apaga o que foi digitado na outra. */
  var MODALIDADES = {
    aberto: {
      chave: 'aberto', rotulo: 'Loteamento aberto', curto: 'Loteamento',
      destinos: [
        { chave: 'circulacao', rotulo: 'Sistema viário', usual: 0.20,
          nota: 'Ruas e calçadas do loteamento, doadas ao município. Usual de 20% da gleba.' },
        { chave: 'verdeLazer', rotulo: 'Área verde/lazer', usual: 0.10,
          nota: 'Áreas verdes e de lazer de uso público. Usual de 10% da gleba.' },
        { chave: 'institucional', rotulo: 'Área institucional', usual: 0.05,
          nota: 'Doação ao município para equipamentos públicos. Usual de 5% da gleba.' }
      ]
    },
    condominio: {
      chave: 'condominio', rotulo: 'Condomínio de lotes', curto: 'Condomínio',
      destinos: [
        { chave: 'circulacao', rotulo: 'Circulação interna', usual: 0.15,
          nota: 'Vias internas do condomínio, que permanecem privadas. Usual de 15% da gleba.' },
        { chave: 'verdeLazer', rotulo: 'Lazer e áreas verdes', usual: 0.10,
          nota: 'Lazer e áreas verdes de uso comum dos condôminos. Usual de 10% da gleba.' },
        { chave: 'institucional', rotulo: 'Portaria, apoio e drenagem', usual: 0.05,
          nota: 'Portaria, apoio técnico, reservatórios e drenagem. Usual de 5% da gleba.' }
      ]
    }
  };
  var COMUNS = [
    { chave: 'app', rotulo: 'APP', modo: 'pct',
      nota: 'Área de preservação permanente reconhecida no licenciamento ambiental.' },
    { chave: 'faixa', rotulo: 'Faixa não edificante', modo: 'm2',
      nota: 'Faixas de servidão e domínio: rodovias, linhas de transmissão, dutos.' },
    { chave: 'restricao', rotulo: 'Área com possível restrição', modo: 'm2',
      nota: 'Reserva para eventuais restrições identificadas no licenciamento.' }
  ];
  function modalidade(P) {
    var t = P && P.areas && P.areas.tipo;
    return MODALIDADES[t] || MODALIDADES.aberto;
  }
  /* Lista as seis deduções da modalidade escolhida, já numeradas de 2 a 7. */
  function destinos(P) {
    var m = modalidade(P);
    var lista = m.destinos.map(function (d) {
      return { chave: m.chave + '.' + d.chave, campo: d.chave, rotulo: d.rotulo,
               modo: 'pct', nota: d.nota, usual: d.usual };
    });
    COMUNS.forEach(function (d) {
      lista.push({ chave: d.chave, campo: d.chave, rotulo: d.rotulo, modo: d.modo, nota: d.nota });
    });
    return lista.map(function (d, i) { d.n = i + 2; d.rotuloN = (i + 2) + ' · ' + d.rotulo; return d; });
  }
  /* Premissa não informada vale o percentual usual da modalidade: a sugestão
     não é enfeite de tela, entra na conta como qualquer outra premissa. */
  function valorDestino(a, d) {
    var i = d.chave.indexOf('.'), v;
    if (i < 0) v = a[d.chave];
    else { var grupo = a[d.chave.slice(0, i)]; v = grupo ? grupo[d.chave.slice(i + 1)] : undefined; }
    if (v === null || v === undefined || v === '') return d.usual === undefined ? 0 : d.usual;
    return num(v);
  }
  function quadroAreas(P) {
    var a = P.areas, G = num(a.gleba);
    var perdas = destinos(P).map(function (d) {
      var entrada = valorDestino(a, d);
      var m2 = d.modo === 'pct' ? entrada * G : entrada;
      return { chave: d.chave, campo: d.campo, n: d.n, rotulo: d.rotuloN, modo: d.modo,
               nota: d.nota, usual: d.usual, entrada: entrada, m2: m2,
               pct: G > 0 ? m2 / G : 0 };
    });
    var totalPerdas = perdas.reduce(function (s, x) { return s + x.m2; }, 0);
    var m = modalidade(P);
    return { gleba: G, perdas: perdas, totalPerdas: totalPerdas, modalidade: m.chave,
             modalidadeRotulo: m.rotulo,
             pctPerdas: G > 0 ? totalPerdas / G : 0, alvDisponivel: G - totalPerdas,
             pctALV: G > 0 ? (G - totalPerdas) / G : 0 };
  }

  /* ------------------------------------------------- produto e faseamento */
  /* Os cinco produtos convivem no mesmo quadro. O tipo define COMO o produto é
     vendido: o residencial segue a curva de vendas da fase; o comercial é
     negociado em um único mês. A forma de pagamento é independente do tipo —
     qualquer produto pode ser vendido à vista ou pelos planos de venda. */
  function programa(P) {
    var nF = Math.max(1, Math.min(4, Math.round(num(P.prazos.nFases, 1))));
    var prods = P.produtos.map(function (p, i) {
      var tipo = p.tipo === 'comercial' ? 'comercial' : 'residencial';
      return { n: i + 1, tipo: tipo, area: num(p.area), precoM2: num(p.precoM2),
               pagamento: /^(mix|avista|p[1-5])$/.test(p.pagamento) ? p.pagamento
                          : (p.pagamento === 'avista' ? 'avista' : 'mix'),
               momento: p.momento || 'Intermediário',
               precoLote: num(p.area) * num(p.precoM2) };
    });
    var fases = [];
    for (var f = 0; f < 4; f++) {
      var ativa = f < nF, lotes = [], vgv = 0, alv = 0, tot = 0, totRes = 0, totCom = 0;
      for (var p = 0; p < prods.length; p++) {
        var q = ativa ? num(P.quadro[p][f]) : 0;
        lotes.push(q); tot += q; vgv += q * prods[p].precoLote; alv += q * prods[p].area;
        if (prods[p].tipo === 'comercial') totCom += q; else totRes += q;
      }
      fases.push({ ativa: ativa, lotes: lotes, totalLotes: tot, totalRes: totRes,
                   totalCom: totCom, vgv: vgv, alv: alv });
    }
    var som = function (chave) { return fases.reduce(function (a, x) { return a + x[chave]; }, 0); };
    var vgvRes = 0, vgvCom = 0, alvRes = 0, alvCom = 0;
    fases.forEach(function (fa) {
      prods.forEach(function (pr, i) {
        if (pr.tipo === 'comercial') { vgvCom += fa.lotes[i] * pr.precoLote; alvCom += fa.lotes[i] * pr.area; }
        else { vgvRes += fa.lotes[i] * pr.precoLote; alvRes += fa.lotes[i] * pr.area; }
      });
    });
    return { nFases: nF, prods: prods, res: prods, fases: fases, vgvRes: vgvRes, vgvCom: vgvCom,
             vgv: vgvRes + vgvCom, alv: alvRes + alvCom, alvRes: alvRes, alvCom: alvCom,
             lotes: som('totalLotes'), lotesRes: som('totalRes'), lotesCom: som('totalCom') };
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
      var lotesFase = prog.fases[f].lotes, prods = prog.prods;
      var vend = [], restante = lotesFase.slice(), acum = [];
      for (var p = 0; p < prods.length; p++) vend.push(z());
      var totalRes = prog.fases[f].totalRes, vendidos = 0, gat = 1;
      var achouGatilho = false;
      var duracaoFase = janLanc + prazoObra + durPos;
      for (var j = 1; j <= duracaoFase; j++) {
        var m = lanc + j - 1;
        for (var p2 = 0; p2 < prods.length; p2++) {
          if (prods[p2].tipo === 'comercial') continue;   // vendido em mês único, fora da curva
          var taxa = j <= janLanc ? lotesFase[p2] * velLanc / janLanc
                   : j <= janLanc + prazoObra ? lotesFase[p2] * velObra / prazoObra
                   : lotesFase[p2] * velPos / durPos;
          var v = Math.max(0, Math.min(taxa, restante[p2]));
          restante[p2] -= v;
          if (m < HORIZONTE) vend[p2][m] = v;
          vendidos += v;
        }
        var pct = totalRes > 0 ? vendidos / totalRes : 0;
        acum.push(pct);
        if (!achouGatilho && pct > num(cfg.gatilho, 0.7)) { gat = j; achouGatilho = true; }
      }
      if (!achouGatilho) gat = duracaoFase;
      /* produtos comerciais: todo o lote da fase negociado no mês escolhido */
      var mesesCom = [];
      prods.forEach(function (pr, p3) {
        if (pr.tipo !== 'comercial') { mesesCom.push(null); return; }
        var mCom = pr.momento === 'Início' ? lanc : pr.momento === 'Fim' ? fimVendas : obraFim;
        mesesCom.push(mCom);
        if (lotesFase[p3] > 0 && mCom < HORIZONTE) vend[p3][mCom] += lotesFase[p3];
      });
      var dEt = Math.trunc(prazoObra / 4), durs = [dEt, dEt, dEt, prazoObra - 3 * dEt];
      var pcts = [num(cfg.etapa1), num(cfg.etapa2), num(cfg.etapa3)];
      pcts.push(1 - pcts[0] - pcts[1] - pcts[2]);
      var cursor = obraIni, etapas = [];
      for (var e = 0; e < 4; e++) {
        etapas.push({ n: e + 1, ini: cursor, fim: cursor + Math.max(1, durs[e]) - 1,
                      dur: Math.max(1, durs[e]), pct: pcts[e], residual: e === 3 });
        cursor += Math.max(1, durs[e]);
      }
      var janelas = [
        { nome: 'Lançamento',    pct: velLanc, dur: janLanc,   vso: janLanc ? velLanc / janLanc : 0 },
        { nome: 'Durante a obra', pct: velObra, dur: prazoObra, vso: prazoObra ? velObra / prazoObra : 0,
          residual: true },
        { nome: 'Pós-obra',      pct: velPos,  dur: durPos,    vso: durPos ? velPos / durPos : 0 }
      ];
      var lotesMes = lotesFase.map(function (q, p4) {
        if (prods[p4].tipo === 'comercial') return [0, 0, 0];
        return janelas.map(function (j) { return j.dur ? q * j.pct / j.dur : 0; });
      });
      fases.push({ i: f + 1, lanc: lanc, lancFim: lanc + janLanc - 1, janLanc: janLanc,
                   obraIni: obraIni, prazoObra: prazoObra, obraFim: obraFim,
                   obraUltimoMes: obraIni + prazoObra - 1, durPos: durPos, fimVendas: fimVendas,
                   velLanc: velLanc, velObra: velObra, velPos: velPos, lotes: prog.fases[f].totalLotes,
                   lotesProduto: lotesFase.slice(), etapas: etapas, janelas: janelas,
                   lotesMes: lotesMes, mesesCom: mesesCom, lotesRes: prog.fases[f].totalRes,
                   lotesCom: prog.fases[f].totalCom,
                   gatilho: num(cfg.gatilho, 0.7), mesGatilho: lanc + gat - 1,
                   pctAcum: acum });
      vendas.push(vend);
      lancAnterior = lanc; gatilhoAnterior = gat;
    }
    return { fases: fases, vendas: vendas };
  }

  /* ----------------------------------------------------------- receitas */
  function receitas(P, prog, cron) {
    var ipca = num(P.indices.ipca), N = HORIZONTE;
    var rec = z(), recRes = z(), recCom = z(), vgvVendido = z(), entradas = z(), parcelas = z();
    var recFase = [z(), z(), z(), z()];
    /* a receita da fase, aberta nas peças que a formam: o que é contratado no
       mês, o que entra de sinal e o que chega das parcelas de meses anteriores */
    var entFase = [z(), z(), z(), z()], parcFase = [z(), z(), z(), z()],
        vgvFase = [z(), z(), z(), z()], lotesFase = [z(), z(), z(), z()];
    /* a safra é o mês da venda: o que se vendeu ali recebe ao longo do tempo,
       e é assim que a aba de vendas da planilha enxerga a receita */
    var safras = [{}, {}, {}, {}];
    function safra(fase, mv) {
      var mapa = safras[fase];
      if (!mapa[mv]) mapa[mv] = { mes: mv, lotes: 0, vgv: 0, entrada: 0, parcela: 0,
                                  parcelas: 0, serie: z() };
      return mapa[mv];
    }
    var planos = P.planos.map(function (pl) {
      var n = Math.max(0, Math.round(num(pl.n)));
      var jrReal = num(pl.jurosReal);
      var jn = Math.pow((1 + jrReal) * (1 + ipca), 1 / 12) - 1;   // nominal equivalente
      return { n: n, mix: num(pl.mix), entrada: num(pl.entrada), desconto: num(pl.desconto),
               correcao: num(pl.correcao), fator: n > 1 ? pmtFator(jn, n) : 0 };
    });
    function def(m) { return Math.pow(1 + ipca, -m / 12); }

    /* modo: 'mix' distribui pelo mix dos planos; 'avista' vende tudo no ato a
       preço de tabela, sem desconto; 'p1'..'p5' põem 100% das unidades em um
       plano específico, com as condições daquele plano. */
    function vender(qtd, precoLote, m, fase, modo, comercial) {
      if (qtd <= 0 || m < 0 || m >= N) return;
      var porTipo = comercial ? recCom : recRes;
      var fixo = /^p[1-5]$/.test(modo) ? parseInt(modo.slice(1), 10) - 1 : -1;
      for (var k = 0; k < planos.length; k++) {
        var pl = planos[k];
        var mix = modo === 'mix' ? pl.mix : (fixo >= 0 ? (k === fixo ? 1 : 0) : (k === 0 ? 1 : 0));
        if (mix <= 0 || pl.n < 1) continue;
        var desconto = modo === 'avista' ? 0 : pl.desconto;
        var corr = Math.pow(1 + pl.correcao, m / 12);
        var valor = qtd * mix * precoLote * (1 - desconto) * corr;
        vgvVendido[m] += valor * def(m);
        var ent = valor * pl.entrada;
        rec[m] += ent * def(m); porTipo[m] += ent * def(m); entradas[m] += ent * def(m);
        if (fase >= 0) {
          recFase[fase][m] += ent * def(m);
          entFase[fase][m] += ent * def(m);
          vgvFase[fase][m] += valor * def(m);
          var sf = safra(fase, m);
          sf.vgv += valor * def(m); sf.entrada += ent * def(m);
          sf.serie[m] += ent * def(m);
        }
        var fin = valor * (1 - pl.entrada);
        if (fin <= 0 || pl.n <= 1) continue;
        var pmt = fin * pl.fator;                      // parcela FIXA em moeda nominal
        for (var t = 1; t <= pl.n && m + t < N; t++) {
          var v = pmt * def(m + t);
          rec[m + t] += v; porTipo[m + t] += v; parcelas[m + t] += v;
          if (fase >= 0) {
            recFase[fase][m + t] += v; parcFase[fase][m + t] += v;
            var sp = safra(fase, m);
            sp.serie[m + t] += v;
            if (t === 1) { sp.parcela += pmt * def(m + 1); sp.parcelas = Math.max(sp.parcelas, pl.n); }
          }
        }
      }
    }
    for (var f = 0; f < cron.fases.length; f++) {
      for (var p = 0; p < prog.prods.length; p++) {
        var pr = prog.prods[p], serie = cron.vendas[f][p];
        for (var m = 0; m < N; m++) if (serie[m] > 0) {
          lotesFase[f][m] += serie[m];
          safra(f, m).lotes += serie[m];
          vender(serie[m], pr.precoLote, m, f, pr.pagamento, pr.tipo === 'comercial');
        }
      }
    }
    var ultimo = 0;
    for (var q = 0; q < N; q++) if (rec[q] > 0.5) ultimo = q;
    return { rec: rec, recRes: recRes, recCom: recCom, vgvVendido: vgvVendido,
             entradas: entradas, parcelas: parcelas,
             recFase: recFase, entFase: entFase, parcFase: parcFase,
             vgvFase: vgvFase, lotesFase: lotesFase, safras: safras,
             ultimoRecebimento: ultimo, planos: planos };
  }

  /* --------------------------------------------------- contas e fluxo */
  function montar(P, prog, cron, R, permPct, caixaTerreno, vpPermuta) {
    var N = HORIZONTE, C = P.custos, J = P.janelas, idx = P.indices;
    var ipca = num(idx.ipca), incc = num(idx.incc);
    var fINCC = function (m) { return Math.pow((1 + incc) / (1 + ipca), m / 12); };
    var fIPCA = function () { return 1; };
    var fSEM = function (m) { return Math.pow(1 + ipca, -m / 12); };
    var col = {}; COLUNAS.forEach(function (c) { col[c[0]] = z(); });

    var obraTotal = C.criterio === 'Critério 2' ? num(C.obraPctVGV) * prog.vgv : num(C.obraM2) * prog.alv;
    var preOpV = num(C.pctPreOp) * obraTotal;
    var obraExec = obraTotal - preOpV;
    var aquisicao = num(caixaTerreno);
    var itbiV = 0;   /* depende do valor presente do caixa: calculado abaixo */
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
    /* O pagamento em dinheiro sai em duas peças: o sinal na assinatura, no
       mês 0, e o saldo em parcelas iguais a partir do mês informado. */
    var Tp = P.terreno || {};
    var sinal = Math.max(0, Math.min(aquisicao, num(Tp.sinal)));
    if (sinal > 0) col.terreno[0] += sinal;
    espalhar(col.terreno, aquisicao - sinal, num(J.terrenoIni), Math.max(1, num(J.terrenoParc, 1)), fSEM);
    /* O ITBI incide sobre o equivalente à vista — o valor presente do que o
       terrenista recebe, dinheiro e permuta. O caixa só vale o seu nominal
       quando é pago à vista; parcelado, vale menos, e a base acompanha. */
    var taxaTerr = (1 + num(idx.cdi)) / (1 + num(idx.ipca)) - 1;
    var iTerr = Math.pow(1 + taxaTerr, 1 / 12) - 1, vpCx = 0, dCx = 1;
    for (var mc = 0; mc < N; mc++) { vpCx += col.terreno[mc] / dCx; dCx *= (1 + iTerr); }
    itbiV = num(C.outrosTerreno) * (vpCx + vpPermuta);
    espalhar(col.itbi, itbiV, num(J.itbiIni, 1), Math.max(1, num(J.itbiParc, 1)), fSEM);
    espalhar(col.preop, preOpV, num(J.preOpIni, 1), Math.max(1, Math.round(num(P.prazos.preOp))), fIPCA);

    var pesoFase = cron.fases.map(function (fa) {
      return prog.fases[fa.i - 1].totalLotes / Math.max(1, prog.lotes);
    });
    var obraFase = [0, 0, 0, 0];
    cron.fases.forEach(function (fa, i) {
      var peso = prog.fases[i].totalLotes / Math.max(1, prog.lotes);
      obraFase[i] = obraExec * peso;
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
      col.receitaRes[m] = R.recRes[m];
      col.receitaCom[m] = R.recCom[m];
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
      liquida[t] = col.receitaRes[t] + col.receitaCom[t] + col.impostos[t] + col.marketing[t] + col.stand[t] +
                   col.corretagem[t] + col.gestao[t] + col.premiacao[t] + col.admvendas[t] +
                   col.bancarias[t];
      col.permuta[t] = -permPct * Math.max(0, liquida[t]);
      fluxo[t] = liquida[t] + col.permuta[t] + col.cga[t] + col.terreno[t] + col.itbi[t] +
                 col.preop[t] + col.contrap[t] + col.obra[t] + col.manut[t] + col.ger[t];
      a += fluxo[t]; acum[t] = a;
    }
    return { col: col, liquida: liquida, fluxo: fluxo, acum: acum, obraFase: obraFase,
             valores: { obraTotal: obraTotal, preOpV: preOpV, obraExec: obraExec, itbiV: itbiV,
                        contrapV: contrapV, manutV: manutV, mktV: mktV, standV: standV,
                        admV: admV, bancV: bancV, cgaV: cgaV, aquisicao: aquisicao,
                        sinalPago: sinal } };
  }

  /* Fluxo do investidor, na mesma construção das colunas AR..AW da planilha:
     AS = aporte que mantém o caixa em zero, AV = saldo acumulado já com aportes,
     AT = devolução ao investidor, AW = AS + AT (série de onde saem TIR e VPL). */
  function fluxoInvestidor(fluxo) {
    /* O fluxo do investidor termina no último MOVIMENTO, não no último
       recebimento: manutenção, CGA e despesas de venda vencem depois da última
       parcela, e cortá-las inflava a TIR — sempre a favor do valor da gleba. */
    var N = fluxo.length, AS = z(), AV = z(), AT = z(), AW = z(), AR = z(), somaAS = 0, somaAT = 0;
    var fim = 0;
    for (var f0 = 0; f0 < N; f0++) if (Math.abs(fluxo[f0]) > 0.5) fim = f0;
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
  /* Premissas de custo não informadas valem o percentual usual de mercado.
     Como nas destinações da gleba, a sugestão entra na conta de verdade —
     o que o avaliador não informou o modelo assume, e a tela diz qual é. */
  var USUAIS = {
    'custos.impostos': 0.067, 'custos.comissoes': 0.045, 'custos.contrapartidas': 0.025,
    'custos.outrosTerreno': 0.02, 'custos.obraM2': 300, 'custos.obraPctVGV': 0.20,
    'custos.pctPreOp': 0.08,
    'custos.cga': 0.03, 'custos.gerenciamento': 0.06, 'custos.manutencao': 0.01,
    'custos.marketing': 0.03, 'custos.stand': 0.01, 'custos.gestaoComercial': 0.005,
    'custos.premiacao': 0.005, 'custos.admVendas': 0.015, 'custos.bancarias': 0.002
  };
  function comUsuais(P) {
    var Q = null;
    Object.keys(USUAIS).forEach(function (k) {
      var i = k.indexOf('.'), g = k.slice(0, i), c = k.slice(i + 1);
      var grupo = (Q || P)[g];
      if (!grupo) return;
      var v = grupo[c];
      if (v !== null && v !== undefined && v !== '') return;
      if (!Q) { Q = {}; for (var x in P) Q[x] = P[x]; }
      if (Q[g] === P[g]) { var novo = {}; for (var y in P[g]) novo[y] = P[g][y]; Q[g] = novo; }
      Q[g][c] = USUAIS[k];
    });
    return Q || P;
  }

  function calcular(P) {
    P = comUsuais(P);
    var areas = quadroAreas(P), prog = programa(P), cron = cronogramaEVendas(P, prog);
    var R = receitas(P, prog, cron);
    var idx = P.indices;
    var tma = (1 + num(idx.cdi) * num(idx.multiplo)) / (1 + num(idx.ipca)) - 1;
    var taxaTerrenista = (1 + num(idx.cdi)) / (1 + num(idx.ipca)) - 1;

    /* ---------------------------------------------------------------------
       VALOR DO TERRENO — o involutivo propriamente dito.
       A TIR fica travada na TMA: o valor da gleba é o que resta depois de
       todas as receitas e despesas, e entra no fluxo até zerar o VPL.
       O usuário escolhe COMO esse valor é pago: à vista, por permuta
       financeira (% da receita líquida) ou misto.
       O ITBI incide sobre o equivalente à vista, e ele próprio depende do
       valor — por isso cada avaliação itera até fechar.
       ------------------------------------------------------------------- */
    var T = P.terreno || { modo: 'resolver', forma: 'permuta', valorDinheiro: 0,
                           sinal: 0, permutaPct: 0.42 };

    function rodar(caixa, permPct) {
      var vp = 0, M = null;
      for (var it = 0; it < 4; it++) {
        M = montar(P, prog, cron, R, permPct, caixa, vp);
        vp = Math.abs(vpl(M.col.permuta, taxaTerrenista));
      }
      M.vpPermuta = vp; M.caixaTerreno = caixa; M.permPct = permPct;
      /* o valor presente do dinheiro sai do próprio fluxo, que já está em
         moeda da base — não depende de o desembolso ser linear no valor */
      M.vpCaixa = Math.abs(vpl(M.col.terreno, taxaTerrenista));
      /* o sinal está no mês 0: já é valor presente. O resto do dinheiro são as
         parcelas, e o que sobra do valor presente do caixa é o que elas valem hoje */
      M.vpSinal = M.valores.sinalPago;
      M.vpParcelas = Math.max(0, M.vpCaixa - M.vpSinal);
      /* duas medidas do mesmo negócio: o que o terrenista recebe ao longo do
         tempo, em moeda da base, e o que isso vale hoje à taxa dele */
      M.permutaNominal = M.col.permuta.reduce(function (a, x) { return a + Math.abs(x); }, 0);
      M.valorTerreno = caixa + M.permutaNominal;
      M.equivalenteVista = M.vpCaixa + vp;
      return M;
    }
    function vplDo(M) {
      return vplInvestidor(fluxoInvestidor(M.fluxo).AW, tma);
    }
    /* Bisseção na única incógnita da forma escolhida: o dinheiro, quando a
       aquisição é à vista, ou a permuta, quando há dinheiro definido. */
    function resolver(min, max, avaliar) {
      var lo = min, hi = max;
      for (var k3 = 0; k3 < 60; k3++) {
        var mid = (lo + hi) / 2;
        if (vplDo(avaliar(mid)) > 0) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }

    var permPct, caixaTerreno, M, excedePermuta = false;
    var dinheiro = T.forma === 'permuta' ? 0 : num(T.valorDinheiro);
    if (T.modo === 'informado') {
      caixaTerreno = dinheiro;
      permPct = T.forma === 'avista' ? 0 : num(T.permutaPct);
      M = rodar(caixaTerreno, permPct);
    } else if (T.forma === 'avista') {
      caixaTerreno = resolver(0, Math.max(1e6, prog.vgv * 2), function (v) { return rodar(v, 0); });
      permPct = 0;
      M = rodar(caixaTerreno, 0);
    } else {
      /* o dinheiro está definido; a permuta absorve o que a TMA ainda permite */
      caixaTerreno = dinheiro;
      excedePermuta = vplDo(rodar(caixaTerreno, 1)) > 0;
      permPct = excedePermuta ? 1
              : resolver(0, 1, function (p) { return rodar(caixaTerreno, p); });
      M = rodar(caixaTerreno, permPct);
    }

    var N = HORIZONTE, fluxo = M.fluxo, acum = M.acum;

    var INV = fluxoInvestidor(fluxo);

    var expo = Math.min.apply(null, acum), mExpo = acum.indexOf(expo);
    var pb = null; for (var m = 1; m < N; m++) if (acum[m] >= 0 && pb === null) pb = m;
    var resultado = soma(fluxo), receitaTot = soma(M.col.receitaRes) + soma(M.col.receitaCom);
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
      linha.receita = M.col.receitaRes[i] + M.col.receitaCom[i];
      linha.liquida = M.liquida[i]; linha.fluxo = fluxo[i]; linha.acum = acum[i];
      meses.push(linha);
    }
    var totais = { liquida: soma(M.liquida), fluxo: resultado, acum: acum[ciclo] };
    COLUNAS.forEach(function (cc) { totais[cc[0]] = soma(M.col[cc[0]]); });
    totais.receita = totais.receitaRes + totais.receitaCom;

    var alvFolga = areas.alvDisponivel - prog.alv;
    var checks = [
      { ok: prog.nFases >= 1 && prog.lotes > 0, txt: 'Há ao menos uma fase ativa e um lote no programa' },
      { ok: Math.abs(P.planos.reduce(function (s, p) { return s + num(p.mix); }, 0) - 1) < 0.0001,
        txt: 'O mix dos planos de venda soma 100%' },
      { ok: num(P.planos[0].entrada) === 1, txt: 'O plano à vista tem 100% de entrada' },
      { ok: !prog.prods.some(function (p, i) {
              return p.pagamento === 'mix' && P.quadro[i].some(function (q) { return num(q) > 0; });
            }) || Math.abs(P.planos.reduce(function (s2, p2) { return s2 + num(p2.mix); }, 0) - 1) < 0.0001,
        txt: 'Há produtos no mix e o mix está fechado' },
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
      { ok: prog.prods.every(function (r, i) {
          var usado = P.quadro[i].reduce(function (s, q) { return s + num(q); }, 0);
          return usado === 0 || (r.area > 0 && r.precoM2 > 0); }),
        txt: 'Todo produto com lotes lançados tem área e preço' },
      { ok: Math.abs(resultado - (soma(M.liquida) + totais.permuta + totais.cga + totais.terreno +
            totais.itbi + totais.preop + totais.contrap + totais.obra + totais.manut + totais.ger)) < 1,
        txt: 'O demonstrativo concilia com o fluxo de caixa' },
      { ok: areas.gleba > 0 && areas.totalPerdas < areas.gleba, txt: 'O quadro de áreas fecha' }
    ];

    /* Resumo por produto, com o mês de venda dos comerciais em cada fase ativa */
    var produtos = prog.prods.map(function (pr, i) {
      var lotes = 0, vgv = 0, alv = 0, meses = [];
      cron.fases.forEach(function (fa, f) {
        var q = prog.fases[f].lotes[i];
        lotes += q; vgv += q * pr.precoLote; alv += q * pr.area;
        if (pr.tipo === 'comercial' && q > 0) meses.push({ fase: fa.i, mes: fa.mesesCom[i] });
      });
      return { n: pr.n, tipo: pr.tipo, area: pr.area, precoM2: pr.precoM2, precoLote: pr.precoLote,
               pagamento: pr.pagamento, momento: pr.momento, lotes: lotes, vgv: vgv, alv: alv,
               meses: meses };
    });

    /* Condições de cada plano sobre cada produto residencial (VENDAS linhas 29 a 31) */
    var ipcaN = num(P.indices.ipca);
    var planosProduto = prog.prods.map(function (r) {
      return P.planos.map(function (pl) {
        var n = Math.round(num(pl.n)), liquido = r.precoLote * (1 - num(pl.desconto));
        var entrada = liquido * num(pl.entrada), fin = liquido - entrada;
        var jn = Math.pow((1 + num(pl.jurosReal)) * (1 + ipcaN), 1 / 12) - 1;
        return { n: n, mix: num(pl.mix), entrada: entrada, financiado: fin,
                 pmt: (fin > 0 && n > 1) ? fin * (jn / (1 - Math.pow(1 + jn, -n))) : 0,
                 jurosNominal: (1 + num(pl.jurosReal)) * (1 + ipcaN) - 1,
                 correcaoMes: Math.pow(1 + num(pl.correcao), 1 / 12) - 1 };
      });
    });

    /* Resultado por fase, com o mesmo rateio do DRF (linhas 47 a 59) */
    var recTotais = cron.fases.map(function (f, i) { return soma(R.recFase[i]); });
    var recGeral = recTotais.reduce(function (a, b) { return a + b; }, 0) || 1;
    var proporcionais = totais.impostos + totais.corretagem + totais.gestao + totais.premiacao +
                        totais.marketing + totais.stand + totais.admvendas + totais.bancarias + totais.permuta;
    var rateadas = totais.terreno + totais.itbi + totais.preop + totais.contrap + totais.manut + totais.cga;
    var resultadoFase = cron.fases.map(function (f, i) {
      var part = recTotais[i] / recGeral;
      var obra = -M.obraFase[i] * (totais.obra / (-(M.obraFase.reduce(function (a, b) { return a + b; }, 0)) || 1));
      var ger = num(P.custos.gerenciamento) * obra;
      return { fase: f.i, lotes: f.lotes, lancamento: f.lanc, inicioObra: f.obraIni,
               entrega: f.obraFim, fimVendas: f.fimVendas, receita: recTotais[i], participacao: part,
               obras: obra, gerenciamento: ger, proporcionais: part * proporcionais,
               rateadas: part * rateadas,
               resultado: recTotais[i] + obra + ger + part * proporcionais + part * rateadas };
    });

    /* A receita da fase, mês a mês: só os meses em que algo acontece, do
       primeiro lote vendido ao último recebimento. Cada linha fecha em
       contratado, entrada, parcelas e carteira que resta a receber. */
    var receitaFase = cron.fases.map(function (f, i) {
      var ini = -1, fim = -1;
      for (var m = 0; m < HORIZONTE; m++) {
        var houve = R.lotesFase[i][m] > 0 || R.recFase[i][m] > 0.5;
        if (houve && ini < 0) ini = m;
        if (houve) fim = m;
      }
      /* o que falta entrar não é contratado menos recebido: a parcela carrega
         juro real, então a carteira vale mais que o preço contratado. O saldo
         honesto é o próprio recebimento futuro. */
      var total = soma(R.recFase[i]), linhas = [], accRec = 0;
      for (var k = Math.max(0, ini); ini >= 0 && k <= fim; k++) {
        accRec += R.recFase[i][k];
        linhas.push({ mes: k, lotes: R.lotesFase[i][k], vgv: R.vgvFase[i][k],
                      entrada: R.entFase[i][k], parcelas: R.parcFase[i][k],
                      receita: R.recFase[i][k], acumulada: accRec,
                      aReceber: Math.max(0, total - accRec) });
      }
      /* as safras, em ordem, com a janela de venda a que cada uma pertence —
         é o agrupamento que a planilha faz em blocos de colunas */
      var lista = Object.keys(R.safras[i]).map(Number).sort(function (a, b) { return a - b; });
      var colunas = lista.map(function (mv) {
        var sf = R.safras[i][mv];
        return { mes: mv, lotes: sf.lotes, vgv: sf.vgv, entrada: sf.entrada,
                 parcela: sf.parcela, parcelas: sf.parcelas, serie: sf.serie,
                 janela: mv <= f.lancFim ? 0 : mv < f.obraIni + f.prazoObra ? 1 : 2 };
      });
      return { fase: f.i, meses: linhas, safras: colunas,
               janelas: ['Vendas no lan\u00e7amento', 'Vendas durante a obra', 'Vendas do estoque'],
               totais: { lotes: soma(R.lotesFase[i]), vgv: soma(R.vgvFase[i]),
                         entrada: soma(R.entFase[i]), parcelas: soma(R.parcFase[i]),
                         receita: soma(R.recFase[i]) } };
    });

    return {
      colunas: COLUNAS, meses: meses, totais: totais, areas: areas, prog: prog,
      fases: cron.fases, valores: M.valores, checks: checks, produtos: produtos,
      planosProduto: planosProduto, resultadoFase: resultadoFase, receitaFase: receitaFase,
      permutaSerie: M.col.permuta,
      ind: {
        vgv: prog.vgv, vgvRes: prog.vgvRes, vgvCom: prog.vgvCom, alvUsada: prog.alv,
        alvFolga: alvFolga, aproveitamento: areas.gleba > 0 ? prog.alv / areas.gleba : 0,
        precoMedioLote: prog.lotes > 0 ? prog.vgv / prog.lotes : 0,
        precoMedioM2: prog.alv > 0 ? prog.vgv / prog.alv : 0,
        permutaPct: permPct, vpPermuta: M.vpPermuta, taxaTerrenista: taxaTerrenista,
        valorTerreno: M.valorTerreno, equivalenteVista: M.equivalenteVista,
        permutaNominal: M.permutaNominal,
        caixaTerreno: M.caixaTerreno, vpCaixa: M.vpCaixa,
        vpSinal: M.vpSinal, vpParcelas: M.vpParcelas,
        formaTerreno: T.forma, modoTerreno: T.modo,
        pctDinheiroEfetivo: M.equivalenteVista > 0 ? M.vpCaixa / M.equivalenteVista : 0,
        excedePermuta: excedePermuta,
        parcelasTerreno: Math.max(1, Math.round(num(P.janelas.terrenoParc, 1))),
        /* o sinal que vale é o que o negócio comporta: na permuta pura não há
           dinheiro, e o valor guardado no campo não entra em lugar nenhum */
        mesTerreno: num(P.janelas.terrenoIni, 0), sinalTerreno: M.valores.sinalPago,
        valorM2Gleba: areas.gleba > 0 ? M.valorTerreno / areas.gleba : 0,
        valorM2ALV: prog.alv > 0 ? M.valorTerreno / prog.alv : 0,
        itbi: M.valores.itbiV,
        tma: tma, tir: tirReal, vpl: vplInvestidor(INV.AW, tma), resultado: resultado,
        receita: receitaTot, margemReceita: receitaTot > 0 ? resultado / receitaTot : 0,
        margemVGV: prog.vgv > 0 ? resultado / prog.vgv : 0,
        exposicao: expo, mesExposicao: mExpo, payback: pb, duration: duration,
        investimento: investimento, retorno: retorno,
        multiplo: investimento > 0 ? retorno / investimento : 0,
        ciclo: ciclo, ultimoRecebimento: R.ultimoRecebimento, aporte: INV.aporte,
        resultadoPorLote: prog.lotes > 0 ? resultado / prog.lotes : 0,
        resultadoPorM2: prog.alv > 0 ? resultado / prog.alv : 0
      }
    };
  }

  root.Motor = { calcular: calcular, HORIZONTE: HORIZONTE, COLUNAS: COLUNAS,
                 MODALIDADES: MODALIDADES, destinos: destinos, USUAIS: USUAIS };
})(typeof window !== 'undefined' ? window : globalThis);
