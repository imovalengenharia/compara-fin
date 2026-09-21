/* ============================================================================
   PLATAFORMA DE INVOLUTIVO — interface
   Uma aba por planilha, na mesma ordem e com a mesma lógica do arquivo de
   origem. Campo azul = célula digitável. Valor em cinza = fórmula.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------- premissas */
  function premissasPadrao() {
    return {
      identificacao: { nome: 'Gleba Itu — lotes', municipio: 'Itu', uf: 'SP', data: '23/09/2025' },
      /* as três destinações começam no percentual usual de cada modelo — são
         sugestões da plataforma, escritas em letra clara até o avaliador
         informar as suas. APP e faixa vêm do levantamento, não do modelo. */
      areas: { tipo: 'aberto', gleba: 160084,
               aberto:     { circulacao: 0.20, verdeLazer: 0.10, institucional: 0.05 },
               condominio: { circulacao: 0.15, verdeLazer: 0.10, institucional: 0.05 },
               app: 0.1288136228480048, faixa: 14408, restricao: 0 },
      prazos: { preOp: 18, nFases: 1 },
      produtos: [
        { tipo: 'residencial', area: 391.406, precoM2: 1250, pagamento: 'mix', momento: 'Intermediário' },
        { tipo: 'comercial', area: 800, precoM2: 1250, pagamento: 'p1', momento: 'Intermediário' },
        { tipo: 'comercial', area: 85, precoM2: 1250, pagamento: 'p1', momento: 'Início' },
        { tipo: 'comercial', area: 85, precoM2: 1250, pagamento: 'p1', momento: 'Intermediário' },
        { tipo: 'comercial', area: 85, precoM2: 1250, pagamento: 'p1', momento: 'Fim' }],
      quadro: [[164, 0, 0, 0], [1, 0, 0, 0], [4, 0, 0, 0], [4, 0, 0, 0], [2, 0, 0, 0]],
      planos: [{ n: 1, mix: 0.2, entrada: 1, desconto: 0.05, correcao: 0.05, jurosReal: 0 },
               { n: 120, mix: 0.5, entrada: 0.15, desconto: 0, correcao: 0.05, jurosReal: 0.08 },
               { n: 180, mix: 0.3, entrada: 0.15, desconto: 0, correcao: 0.05, jurosReal: 0.08 },
               { n: 0, mix: 0, entrada: 0, desconto: 0, correcao: 0.05, jurosReal: 0 },
               { n: 0, mix: 0, entrada: 0, desconto: 0, correcao: 0.05, jurosReal: 0 }],
      fases: [0, 1, 2, 3].map(function (i) {
        return { janLanc: 6, prazoObra: [18, 24, 18, 18][i], etapa1: .15, etapa2: .25, etapa3: .35,
                 velLanc: .2, velObra: [.6, .5, .5, .5][i], velPos: [.2, .3, .3, .3][i],
                 durPos: 12, gatilho: .7 };
      }),
      custos: { impostos: .0673, comissoes: .045, contrapartidas: .025, outrosTerreno: .02,
                obraM2: 300, obraPctVGV: 0, criterio: 'Critério 1', pctPreOp: .08, cga: .03,
                gerenciamento: .06, manutencao: .01, marketing: .03, stand: .01,
                gestaoComercial: .005, premiacao: .005, admVendas: .015, bancarias: .002 },
      financiamento: { pctFinanciado: 0, juros: 0, prazoAmortizacao: 0 },
      indices: { ipca: .035, incc: .065, cdi: .13, multiplo: 2 },
      janelas: { terrenoIni: 0, terrenoParc: 1, itbiIni: 1, itbiParc: 1, preOpIni: 1,
                 contrapAnteObra: -3, contrapDur: 6, manutT1: 24, manutP1: .7, manutT2: 12, manutP2: .3,
                 mktAntes: -6, mktPctAntes: .6, mktDepois: 36, standAntes: -3, standPctAntes: .3 },
      terreno: { modo: 'resolver', forma: 'permuta', pctDinheiro: .4, valorDinheiro: 0, permutaPct: .42 }
    };
  }

  /* ------------------------------------------------------------- formatos */
  var VAZIO = '—';
  function vazio(v, d) {
    return v === null || v === undefined || !isFinite(v) || Math.abs(v) < 0.5 / Math.pow(10, d || 0);
  }
  /* nz escreve o número como ele é; n troca o zero por travessão, porque uma
     coluna cheia de zeros cansa a leitura e esconde o que de fato existe */
  function nz(v, d) {
    if (v === null || v === undefined || !isFinite(v)) return VAZIO;
    return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function n(v, d) { return vazio(v, d) ? VAZIO : nz(v, d); }
  var R$ = function (v, d) { d = d === undefined ? 0 : d;
    return vazio(v, d) ? VAZIO : 'R$ ' + nz(v, d); };
  var mi = function (v) { return vazio(v / 1e6, 1) ? VAZIO : 'R$ ' + nz(v / 1e6, 1) + ' M'; };
  var pc = function (v, d) { d = d === undefined ? 1 : d;
    return vazio(v * 100, d) ? VAZIO : nz(v * 100, d) + '\u00A0%'; };
  var mes = function (v) { return v === null || v === undefined ? VAZIO : 'mês ' + nz(v, 0); };

  /* Campos numéricos seguem o padrão brasileiro: ponto separa o milhar,
     vírgula separa o decimal — igual aos valores calculados ao lado. A tecla
     "." é convertida em vírgula na digitação, de modo que dentro do campo o
     ponto é sempre separador de milhar e a vírgula sempre decimal. */
  function lerNum(txt) {
    var s = String(txt == null ? '' : txt).trim().replace(/\s/g, '');
    if (!s) return 0;
    var neg = /^-/.test(s);
    s = s.replace(/[+-]/g, '');
    if (s.indexOf(',') >= 0) {
      s = s.replace(/\./g, '');
      s = s.replace(/,/, '\u0001').replace(/,/g, '').replace('\u0001', '.');
    } else if (s.indexOf('.') >= 0) {
      /* texto colado: pontos só são milhar se todos separarem grupos de 3 */
      var g = s.split('.');
      if (g.slice(1).every(function (x) { return x.length === 3; })) s = g.join('');
    }
    var v = parseFloat(s);
    if (!isFinite(v)) return 0;
    return neg ? -v : v;
  }
  /* Formata o que está sendo digitado sem mexer no que ainda falta digitar:
     agrupa o milhar da parte inteira e preserva a vírgula e os decimais. */
  function fmtCampo(txt, inteiro) {
    var s = String(txt == null ? '' : txt);
    var neg = /-/.test(s);
    s = s.replace(/[^\d,]/g, '');
    var i = inteiro ? -1 : s.indexOf(',');
    var int = i >= 0 ? s.slice(0, i) : s;
    var dec = i >= 0 ? s.slice(i + 1).replace(/\D/g, '').slice(0, 6) : null;
    int = int.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    var agrupado = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (!agrupado && dec === null) return neg ? '-' : '';
    return (neg ? '-' : '') + (agrupado || '0') + (dec === null ? '' : ',' + dec);
  }
  function porNum(v, inteiro) {
    if (v === null || v === undefined || !isFinite(v)) return '';
    if (Math.abs(v) < 1e-9) return VAZIO;
    return fmtCampo(String(Math.round(v * 1e6) / 1e6).replace('.', ','), inteiro);
  }
  /* Um campo que ainda mostra o número sugerido pela plataforma é escrito em
     letra mais clara. Assim que o avaliador digita um valor diferente, ele
     passa a ser dado dele e ganha a cor cheia. */
  /* campo sem valor não exibe unidade: "—" já diz tudo */
  function marcarVazio(el) {
    var caixa = el.parentElement;
    if (caixa && caixa.classList.contains('campo')) {
      caixa.classList.toggle('sem-afixo', el.value === VAZIO || el.value === '');
    }
  }

  function marcarSugerido(el, valor) {
    if (el.dataset.sugerido === undefined) return;
    var igual = Math.abs((+valor || 0) - (+el.dataset.sugerido || 0)) < 1e-9;
    el.classList.toggle('sugerido', igual);
  }

  /* Reescreve o campo já formatado mantendo o cursor depois dos mesmos dígitos */
  function reformatar(el) {
    var antes = el.value, pos = el.selectionStart;
    if (pos === null) pos = antes.length;
    var digitos = antes.slice(0, pos).replace(/[^\d,]/g, '').length;
    var depois = fmtCampo(antes, el.dataset.inteiro === '1');
    if (depois === antes) return;
    el.value = depois;
    var i = 0, d = 0;
    while (i < depois.length && d < digitos) { if (/[\d,]/.test(depois[i])) d++; i++; }
    try { el.setSelectionRange(i, i); } catch (err) {}
  }

  function e(tag, attrs, filhos) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] === null || attrs[k] === undefined) continue;
      if (k === 'txt') el.textContent = attrs[k];
      else if (k === 'cls') el.className = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    (filhos || []).forEach(function (f) { if (f) el.appendChild(f); });
    return el;
  }

  var P = premissasPadrao(), R = null, abaAtiva = 'premissas', atualizadores = [];

  function pegar(c) { return c.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, P); }
  function guardar(c, v) {
    var ks = c.split('.'), o = P;
    for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = v;
  }


  /* ------------------------------------------------------- trava da ALV */
  function alvDisponivelP() {
    var a = P.areas, G = +a.gleba || 0, perdas = 0;
    Motor.destinos(P).forEach(function (d) {
      var i = d.chave.indexOf('.'), v;
      if (i < 0) v = +a[d.chave] || 0;
      else { var g = a[d.chave.slice(0, i)]; v = g ? (+g[d.chave.slice(i + 1)] || 0) : 0; }
      perdas += d.modo === 'pct' ? v * G : v;
    });
    return G - perdas;
  }
  function nFasesP() { return Math.max(1, Math.min(4, Math.round(+P.prazos.nFases || 1))); }
  function alvUsadaExcluindo(pEx, fEx) {
    var nF = nFasesP(), t = 0;
    for (var p = 0; p < P.produtos.length; p++) {
      for (var fa = 0; fa < nF; fa++) {
        if (p === pEx && (fEx === null || fa === fEx)) continue;
        t += (+P.quadro[p][fa] || 0) * (+P.produtos[p].area || 0);
      }
    }
    return t;
  }
  /* A ALV é um limite físico do programa, não da gleba. Duas regras separadas:
     · quem ACRESCENTA programa (lotes no quadro de fases, área do lote) é
       travado no máximo que couber — nunca ultrapassa a ALV;
     · quem descreve a GLEBA (área total, perdas, nº de fases) é sempre livre:
       o terreno é um dado do mundo, não uma variável de projeto. Se a nova
       gleba não comportar o programa, a alteração vale, o excesso aparece em
       destaque no topo das premissas e um clique ajusta o programa a ela. */
  function alvUsadaTotal() { return alvUsadaExcluindo(-1, null); }
  function excessoALV() { return Math.max(0, alvUsadaTotal() - alvDisponivelP()); }
  var tempoAviso = null;
  function avisar(titulo, texto) {
    var velho = document.getElementById('aviso-flutuante');
    if (velho) velho.remove();
    var el = e('div', { cls: 'aviso-flutuante', id: 'aviso-flutuante' },
      [e('b', { txt: titulo }), e('span', { txt: texto })]);
    document.body.appendChild(el);
    clearTimeout(tempoAviso);
    tempoAviso = setTimeout(function () { el.remove(); }, 6000);
  }
  function aplicarLimite(el, caminho, valor, msg) {
    guardar(caminho, valor);
    el.value = porNum(valor, el.dataset.inteiro === '1');
    marcarVazio(el);
    el.classList.add('limitado');
    setTimeout(function () { el.classList.remove('limitado'); }, 2200);
    avisar('Limitado pela ALV disponível', msg);
  }
  /* Impede lançar lotes ou ampliar o lote além do que a gleba comporta. */
  function travarALV(el, caminho) {
    var disp = alvDisponivelP(), nF = nFasesP();
    var q = /^quadro\.(\d+)\.(\d+)$/.exec(caminho);
    if (q) {
      var p = +q[1], fa = +q[2];
      if (fa >= nF) return;
      var area = +P.produtos[p].area || 0;
      if (area <= 0) return;
      var livre = disp - alvUsadaExcluindo(p, fa);
      var max = Math.max(0, Math.floor(livre / area + 1e-9));
      if ((+P.quadro[p][fa] || 0) > max) {
        aplicarLimite(el, caminho, max, 'Com ' + n(area, 2) + ' m² por lote, cabem no máximo ' +
          n(max, 0) + ' lotes do Produto ' + (p + 1) + ' na fase ' + (fa + 1) +
          '. Aumente a gleba, reduza as perdas ou diminua outro produto.');
      }
      return;
    }
    var a = /^produtos\.(\d+)\.area$/.exec(caminho);
    if (a) {
      var p2 = +a[1], lotes = 0;
      for (var fb = 0; fb < nF; fb++) lotes += +P.quadro[p2][fb] || 0;
      if (lotes <= 0) return;
      var livre2 = disp - alvUsadaExcluindo(p2, null);
      var maxA = Math.max(0, Math.floor((livre2 / lotes) * 1000) / 1000);
      if ((+P.produtos[p2].area || 0) > maxA) {
        aplicarLimite(el, caminho, maxA, 'Com ' + n(lotes, 0) + ' lotes lançados, o Produto ' + (p2 + 1) +
          ' pode ter no máximo ' + n(maxA, 2) + ' m² por lote dentro da ALV disponível.');
      }
    }
  }

  /* Reduz os lotes de todas as fases ativas na mesma proporção, arredondando
     para baixo, até o programa caber na ALV disponível. */
  function ajustarProgramaALV() {
    var disp = alvDisponivelP(), usada = alvUsadaTotal(), nF = nFasesP();
    if (usada <= disp + 0.5 || usada <= 0) return;
    if (disp <= 0) {
      avisar('A gleba não comporta nenhum lote', 'Com as perdas atuais a ALV disponível é zero ou negativa. ' +
        'Reveja o quadro de áreas antes de ajustar o programa — não há o que distribuir.');
      return;
    }
    var k = Math.max(0, disp / usada);
    for (var p = 0; p < P.produtos.length; p++) {
      for (var fa = 0; fa < nF; fa++) {
        P.quadro[p][fa] = Math.floor((+P.quadro[p][fa] || 0) * k);
      }
    }
    recalcular();
    montarFolha(true);
    avisar('Programa ajustado à ALV', 'Os lotes das fases ativas foram reduzidos na mesma proporção ' +
      'até caberem na área líquida vendável. Redistribua entre as fases como preferir.');
  }

  /* Faixa no topo das premissas: diz por que os indicadores não fecham.
     Dois casos — nenhum lote lançado (tudo zero) ou programa maior que a ALV. */
  function faixaALV() {
    var texto = e('span');
    var botao = e('button', { cls: 'acao-clara', type: 'button', txt: 'Ajustar o programa à ALV' });
    botao.addEventListener('click', ajustarProgramaALV);
    var faixa = e('div', { cls: 'alerta ruim oculto' }, [texto, botao]);
    atualizadores.push(function (r) {
      var falta = -r.ind.alvFolga;
      if (!r.prog.lotes) {
        faixa.classList.remove('oculto');
        botao.style.display = 'none';
        texto.textContent = 'Nenhum lote lançado no quadro de fases. Sem programa não há receita: ' +
          'o valor da gleba, a TIR e o resultado ficam em zero. Lance os lotes de cada produto por ' +
          'fase — ou use "Restaurar padrão" no topo para voltar ao estudo de referência.';
        return;
      }
      botao.style.display = '';
      if (falta <= 0.5) { faixa.classList.add('oculto'); return; }
      faixa.classList.remove('oculto');
      texto.textContent = 'O programa lançado usa ' + n(r.ind.alvUsada, 0) + ' m² e a gleba oferece ' +
        n(r.areas.alvDisponivel, 0) + ' m² de ALV: faltam ' + n(falta, 0) + ' m². ' +
        'Reduza lotes no quadro de fases, aumente a gleba ou ajuste tudo de uma vez.';
    });
    return faixa;
  }

  /* --------------------------------------------------- células e registros */
  var timer = null;
  function aoDigitar(ev) {
    var el = ev.target, c = el.dataset.caminho;
    if (!c) return;
    var t = el.dataset.tipo, v;
    if (t === 'sel' || t === 'txt') v = el.value;
    else {
      reformatar(el);
      v = lerNum(el.value);
      if (t === 'pct') v = v / 100;
      var lim = null;
      if (el.dataset.max !== undefined && v > +el.dataset.max) lim = +el.dataset.max;
      if (ev.type === 'change' && el.dataset.min !== undefined && v < +el.dataset.min) lim = +el.dataset.min;
      if (lim !== null) { v = lim; el.value = porNum(t === 'pct' ? v * 100 : v, el.dataset.inteiro === '1'); }
    }
    var excessoAntes = excessoALV();
    guardar(c, v);
    marcarSugerido(el, v);
    marcarVazio(el);
    travarALV(el, c);
    /* a gleba mudou e o programa não cabe mais: a edição vale, o aviso explica */
    if (excessoALV() > excessoAntes + 0.5) {
      avisar('O programa não cabe mais na gleba', 'Faltam ' + n(excessoALV(), 0) +
        ' m² de ALV para os lotes já lançados. Use “Ajustar o programa à ALV” no topo das premissas ' +
        'ou reduza lotes no quadro de fases.');
    }
    var remonta = el.dataset.remonta === '1';
    clearTimeout(timer);
    timer = setTimeout(function () {
      recalcular();
      if (remonta) { montarAbas(); montarFolha(true); }
    }, 80);
  }

  function inp(caminho, tipo, opts) {
    opts = opts || {};
    var v = pegar(caminho);
    var el;
    if (tipo === 'sel') {
      el = e('select', { id: 'c_' + caminho });
      (opts.opcoes || []).forEach(function (o) {
        var valor = Array.isArray(o) ? o[0] : o, rotulo = Array.isArray(o) ? o[1] : o;
        el.appendChild(e('option', { value: valor, txt: rotulo,
                                     selected: valor === v ? 'selected' : null }));
      });
    } else if (tipo === 'txt') {
      el = e('input', { id: 'c_' + caminho, type: 'text', value: v == null ? '' : v });
    } else {
      if (tipo === 'pct') v = (v || 0) * 100;
      var inteiro = opts.step === 1;
      el = e('input', { id: 'c_' + caminho, type: 'text', cls: 'num',
                        inputmode: inteiro ? 'numeric' : 'decimal',
                        autocomplete: 'off', spellcheck: 'false',
                        value: porNum(v, inteiro) });
      if (inteiro) el.dataset.inteiro = '1';
      if (opts.sugerido !== undefined && opts.sugerido !== null) {
        el.dataset.sugerido = opts.sugerido;
        marcarSugerido(el, pegar(caminho));
      }
      setTimeout(function () { marcarVazio(el); }, 0);
      if (opts.min !== undefined) el.dataset.min = opts.min;
      if (opts.max !== undefined) el.dataset.max = opts.max;
      /* a tecla "." vira vírgula: dentro do campo o ponto é sempre milhar */
      el.addEventListener('beforeinput', function (ev) {
        if (ev.inputType !== 'insertText' || (ev.data !== '.' && ev.data !== ',')) return;
        ev.preventDefault();
        if (inteiro) return;
        var a = el.selectionStart, b = el.selectionEnd;
        if (el.value.slice(0, a).indexOf(',') >= 0) return;   /* já tem decimal */
        el.value = el.value.slice(0, a) + ',' + el.value.slice(b);
        try { el.setSelectionRange(a + 1, a + 1); } catch (err) {}
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      /* ao entrar, o travessão sai da frente para não atrapalhar a digitação */
      el.addEventListener('focus', function () {
        if (el.value === VAZIO) el.value = '';
        marcarVazio(el);
      });
      /* ao sair, mostra o valor que ficou guardado, já normalizado */
      el.addEventListener('blur', function () {
        var g = pegar(caminho);
        el.value = porNum(tipo === 'pct' ? (g || 0) * 100 : g, inteiro);
        marcarVazio(el);
      });
    }
    el.dataset.caminho = caminho; el.dataset.tipo = tipo;
    if (opts.remonta) el.dataset.remonta = '1';
    if (opts.off) el.disabled = true;
    el.addEventListener('input', aoDigitar);
    el.addEventListener('change', aoDigitar);
    return afixar(el, tipo === 'pct' ? '%' : opts.un);
  }

  /* Símbolos curtos moram dentro do campo: % e m² à direita, na folga que
     todos os campos numéricos reservam, e R$ à esquerda, onde não disputa
     espaço com o número. Unidades que são palavras ("meses", "a.a.") ficam
     na coluna de unidade. */
  var AFIXOS = { '%': 'sufixo', 'm²': 'sufixo', 'R$': 'prefixo' };
  function afixar(el, un) {
    var lado = AFIXOS[un];
    if (!lado || !el.classList.contains('num')) return el;
    if (lado === 'prefixo') el.classList.add('com-prefixo');
    var caixa = e('span', { cls: 'campo' }, [el, e('span', { cls: lado, txt: un })]);
    caixa.dataset.un = un;
    return caixa;
  }

  /* valor calculado: registra-se para ser atualizado a cada recálculo */
  function calc(fn, cls) {
    var el = e('span', { cls: 'calc' + (cls ? ' ' + cls : '') });
    atualizadores.push(function (r) {
      var t = fn(r);
      el.textContent = t;
      /* só o que é número guarda a folga do afixo à direita; texto usa a
         célula inteira, senão quebra linha à toa */
      el.classList.toggle('txt', !/^[-\dR—]/.test(String(t).trim()));
    });
    return el;
  }
  function un(t) { return e('span', { cls: 'un', txt: t || '' }); }

  /* rótulo | valor | unidade | complemento | nota — colunas fixas em toda a plataforma */
  function reg(rot, celulas, nota, forte) {
    celulas = (celulas || []).filter(Boolean);
    var temUn = celulas[1] && celulas[1].className === 'un';
    if (temUn && celulas[0]) {
      /* o campo ainda não tem afixo: se a unidade couber lá dentro, vai */
      if (celulas[0].tagName === 'INPUT' && AFIXOS[celulas[1].textContent]) {
        celulas[0] = afixar(celulas[0], celulas[1].textContent);
      }
      var dentro = celulas[0].dataset && celulas[0].dataset.un, u = celulas[1].textContent;
      if (dentro === u) { celulas.splice(1, 1); temUn = false; }
      else if (dentro && u.slice(0, dentro.length + 1) === dentro + ' ') {
        celulas[1].textContent = u.slice(dentro.length + 1);
      }
    }
    var linha = e('div', { cls: 'reg' + (forte ? ' forte' : '') },
      [e('div', { cls: 'rot', txt: rot })]);
    if (celulas.length > 3) {
      linha.appendChild(e('div', { cls: 'livre' }, celulas));
    } else {
      linha.appendChild(e('div', { cls: 'val' }, celulas[0] ? [celulas[0]] : []));
      linha.appendChild(e('div', { cls: 'uni' }, temUn ? [celulas[1]] : []));
      var comp = temUn ? celulas[2] : celulas[1];
      linha.appendChild(e('div', { cls: 'comp' }, comp ? [comp] : []));
    }
    var nd = e('div', { cls: 'nota' });
    if (typeof nota === 'function') atualizadores.push(function (r) { nd.textContent = nota(r); });
    else nd.textContent = nota || '';
    linha.appendChild(nd);
    return linha;
  }

  function quadro(titulo, obs, filhos, nota) {
    var id = 'aberto.' + titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 44);
    var aberto = true;
    try { if (localStorage.getItem('involutivo.' + id) === '0') aberto = false; } catch (err) {}
    var interior = e('div', { cls: 'interior' }, filhos);
    if (nota) interior.appendChild(e('p', { cls: 'nota-bloco', txt: nota }));
    var d = e('details', { cls: 'quadro' }, [
      e('summary', {}, [e('h2', { txt: titulo }), obs ? e('span', { cls: 'obs', txt: obs }) : null,
                        e('span', { cls: 'seta' })]),
      interior
    ]);
    if (aberto) d.setAttribute('open', 'open');
    d.addEventListener('toggle', function () {
      try { localStorage.setItem('involutivo.' + id, d.open ? '1' : '0'); } catch (err) {}
    });
    return d;
  }

  function grade(colunas, linhas, nota) {
    var thead = e('tr', {}, [e('th', { txt: '' })]);
    colunas.forEach(function (c) { thead.appendChild(e('th', { txt: c })); });
    thead.appendChild(e('th', { txt: '' }));          /* folga: mantém a grade fixa */
    var tb = e('tbody');
    linhas.forEach(function (l) {
      var tr = e('tr', { cls: l.forte ? 'forte' : '' }, [e('td', { txt: l.rot })]);
      l.cels.forEach(function (c) { tr.appendChild(e('td', {}, [c])); });
      tr.appendChild(e('td', {}));
      tb.appendChild(tr);
    });
    var tabela = e('table', { cls: 'grade' }, [e('thead', {}, [thead]), tb]);
    var box = e('div', { style: 'overflow-x:auto' }, [tabela]);
    return nota ? e('div', {}, [box, e('p', { cls: 'nota-bloco', txt: nota })]) : box;
  }

  /* ============================================================ PREMISSAS */
  function folhaPremissas() {
    var f = document.createDocumentFragment();
    f.appendChild(faixaALV());

    /* 1 — quadro de áreas, conforme a modalidade de parcelamento */
    var MOD = Motor.MODALIDADES, modal = MOD[P.areas.tipo] || MOD.aberto;
    var areas = [
      reg('Modalidade de parcelamento',
        [inp('areas.tipo', 'sel', { remonta: true,
          opcoes: [['aberto', MOD.aberto.curto], ['condominio', MOD.condominio.curto]] })],
        modal.chave === 'aberto'
          ? 'As áreas públicas são doadas ao município e os lotes têm acesso por via pública.'
          : 'Vias, lazer e apoio permanecem privados, em fração ideal dos condôminos.'),
      reg('1 · Área total da gleba',
        [inp('areas.gleba', 'num'), un('m²'), calc(function (r) { return pc(1); }, 'fraco')],
        'Área da matrícula ou do levantamento planialtimétrico.')
    ];
    Motor.destinos(P).forEach(function (d, i) {
      var caminho = 'areas.' + d.chave;
      if (d.modo === 'pct') {
        areas.push(reg(d.rotuloN, [inp(caminho, 'pct', { sugerido: d.usual }), un('%'),
          calc(function (r) { return n(r.areas.perdas[i].m2, 0) + ' m²'; }, 'fraco')], d.nota));
      } else {
        areas.push(reg(d.rotuloN, [inp(caminho, 'num'), un('m²'),
          calc(function (r) { return pc(r.areas.perdas[i].pct, 2); }, 'fraco')], d.nota));
      }
    });
    areas.push(reg('8 · Total das destinações (2 a 7)',
      [calc(function (r) { return n(r.areas.totalPerdas, 0) + ' m²'; }),
       calc(function (r) { return pc(r.areas.pctPerdas, 2); }, 'fraco')],
      'Soma das seis condições acima.', true));
    areas.push(reg('9 · ALV disponível (1 − 8)',
      [calc(function (r) { return n(r.areas.alvDisponivel, 0) + ' m²'; }),
       calc(function (r) { return pc(r.areas.pctALV, 2); }, 'fraco')],
      'Área líquida vendável: o que sobra para venda. É o teto físico do programa.', true));
    f.appendChild(quadro('Quadro de áreas', modal.rotulo + ' · destinação · área · % sobre a gleba', areas));

    /* 2 — eventos e faseamento */
    f.appendChild(quadro('Eventos e faseamento', 'o mês 0 é a data-base do estudo', [
      reg('Pré-operacionais', [inp('prazos.preOp', 'num', { step: 1, min: 0, max: 120 }), un('meses')],
        function (r) {
          return 'Aprovações, registro, projetos e licenciamento. Terminam no mês ' +
            n(Math.round(+P.prazos.preOp || 0), 0) + ', quando a 1ª fase é lançada.';
        }),
      reg('Nº de fases do projeto',
        [inp('prazos.nFases', 'num', { step: 1, min: 1, max: 4, remonta: true }), un('fases')],
        'Cada fase tem obra, lançamento e curva de vendas próprios. Só as fases habilitadas aparecem.')
    ]));

    /* O residencial vende por curva: quem manda é o rateio do quadro de planos,
       e não há outra forma a escolher — por isso o campo aparece como valor
       fixo, e não como lista. O comercial é negociado lote a lote, então
       aponta um dos planos de venda — o plano 1 é o à vista. */
    function opcoesPagamento() {
      var o = [];
      P.planos.forEach(function (pl, i) {
        var q = Math.round(+pl.n || 0);
        if (q < 1) return;
        o.push(['p' + (i + 1), 'Plano ' + (i + 1) + ' · ' + q + 'x']);
      });
      return o;
    }

    /* 3 — planos de venda: definem como cada produto recebe */
    var colPlanos = ['À vista', 'Plano 2', 'Plano 3', 'Plano 4', 'Plano 5'];
    var idx = [0, 1, 2, 3, 4];
    f.appendChild(quadro('Planos de venda', 'condições de recebimento', [grade(colPlanos, [
      { rot: 'Nº de parcelas', cels: idx.map(function (i) {
          return inp('planos.' + i + '.n', 'num', { step: 1, off: i === 0 }); }) },
      { rot: 'Unidades sob o total (apenas residenciais)',
        cels: idx.map(function (i) { return inp('planos.' + i + '.mix', 'pct'); }) },
      { rot: 'Entrada', cels: idx.map(function (i) {
          return inp('planos.' + i + '.entrada', 'pct', { off: i === 0 }); }) },
      { rot: 'Desconto à vista', cels: idx.map(function (i) { return inp('planos.' + i + '.desconto', 'pct'); }) },
      { rot: 'Correção do preço (a.a.)', cels: idx.map(function (i) { return inp('planos.' + i + '.correcao', 'pct'); }) },
      { rot: 'Juros acima do IPCA (a.a.)', cels: idx.map(function (i) { return inp('planos.' + i + '.jurosReal', 'pct'); }) },
      { rot: 'Juros nominal equivalente', forte: true, cels: idx.map(function (i) {
          return calc(function (r) { return r.planosProduto[0][i].n > 1 ? pc(r.planosProduto[0][i].jurosNominal, 2) : '—'; }); }) }
    ], 'A parcela é fixa em moeda nominal, calculada pela Price sobre o preço-base. Preço corrigido até a data da venda.')]));

    /* 4 — produtos: residenciais e comerciais no mesmo quadro */
    var colProd = [1, 2, 3, 4, 5].map(function (i) { return 'Produto ' + i; });
    var idxP = [0, 1, 2, 3, 4];
    f.appendChild(quadro('Produtos', 'o tipo define como vende; o pagamento define como recebe', [grade(colProd, [
      { rot: 'Tipo', cels: idxP.map(function (i) {
          return inp('produtos.' + i + '.tipo', 'sel', { opcoes: ['residencial', 'comercial'], remonta: true }); }) },
      { rot: 'Área do lote', cels: idxP.map(function (i) {
          return inp('produtos.' + i + '.area', 'num', { un: 'm²' }); }) },
      { rot: 'Preço de venda por m²', cels: idxP.map(function (i) {
          return inp('produtos.' + i + '.precoM2', 'num', { un: 'R$' }); }) },
      { rot: 'Preço do lote', cels: idxP.map(function (i) {
          return calc(function (r) { return r.prog.prods[i].precoLote ? n(r.prog.prods[i].precoLote, 0) : '—'; }); }) },
      { rot: 'Forma de pagamento', cels: idxP.map(function (i) {
          return P.produtos[i].tipo === 'comercial'
            ? inp('produtos.' + i + '.pagamento', 'sel', { opcoes: opcoesPagamento() })
            : calc(function () { return 'Plano de vendas'; }, 'fraco'); }) },
      { rot: 'Mês da venda (comercial)', cels: idxP.map(function (i) {
          return P.produtos[i].tipo === 'comercial'
            ? inp('produtos.' + i + '.momento', 'sel', { opcoes: ['Início', 'Intermediário', 'Fim'] })
            : calc(function () { return 'curva de vendas'; }, 'fraco'); }) },
    ], 'Residencial vende ao longo das três janelas da fase; comercial, em um único mês — Início é o lançamento, Intermediário a entrega da obra e Fim o último mês de vendas.')]));

    /* 4 — quadro de fases */
    var fasesAtivas = [];
    for (var fv = 0; fv < nFasesP(); fv++) fasesAtivas.push(fv);
    var colFases = fasesAtivas.map(function (fa) { return 'Fase ' + (fa + 1); });
    var linhasFase = idxP.map(function (p) {
      return { rot: 'Lotes do Produto ' + (p + 1) + ' · ' + (P.produtos[p].tipo === 'comercial' ? 'com.' : 'resid.'),
               cels: fasesAtivas.map(function (fa) { return inp('quadro.' + p + '.' + fa, 'num', { step: 1 }); }) };
    });
    linhasFase.push({ rot: 'Lotes totais da fase', forte: true, cels: fasesAtivas.map(function (fa) {
      return calc(function (r) { return n(r.prog.fases[fa].totalLotes, 0); }); }) });
    linhasFase.push({ rot: 'VGV da fase', forte: true, cels: fasesAtivas.map(function (fa) {
      return calc(function (r) { return n(r.prog.fases[fa].vgv, 0); }); }) });
    linhasFase.push({ rot: 'ALV da fase', cels: fasesAtivas.map(function (fa) {
      return calc(function (r) { return n(r.prog.fases[fa].alv, 0) + ' m²'; }); }) });
    f.appendChild(quadro('Quadro de fases', 'lotes de cada produto em cada fase',
      [grade(colFases, linhasFase),
       reg('Saldo de ALV', [calc(function (r) { return n(r.ind.alvFolga, 0) + ' m²'; }),
         calc(function (r) { return r.ind.alvFolga >= -0.5 ? 'cabe na gleba' : 'NÃO CABE'; }, 'fraco')],
         'Lotes e área do lote são travados por este saldo.', true)],
      'O quadro mostra as fases habilitadas em Eventos e faseamento. A distribuição não precisa ser igual entre fases — normalmente não é.'));

    /* 5 — resumo do programa (depende de tudo acima) */
    f.appendChild(quadro('Resumo do programa', 'resultado das premissas acima', [
      reg('VGV total de tabela', [calc(function (r) { return R$(r.ind.vgv); })],
        'Todos os produtos, a preço de tabela na data-base.', true),
      reg('ALV disponível', [calc(function (r) { return n(r.areas.alvDisponivel, 0) + ' m²'; })],
        'Vem do quadro de áreas: é o teto físico do programa.'),
      reg('ALV utilizada pelo programa', [calc(function (r) { return n(r.ind.alvUsada, 0) + ' m²'; }),
        calc(function (r) { return pc(r.areas.alvDisponivel ? r.ind.alvUsada / r.areas.alvDisponivel : 0, 1) + ' do disponível'; }, 'fraco')],
        'Soma da área dos lotes lançados nas fases ativas.'),
      reg('Saldo de ALV', [calc(function (r) { return n(r.ind.alvFolga, 0) + ' m²'; }),
        calc(function (r) { return r.ind.alvFolga >= -0.5 ? 'ALV suficiente' : 'ALV INSUFICIENTE'; }, 'fraco')],
        'Disponível menos utilizada.', true),
      reg('Aproveitamento (ALV / gleba)', [calc(function (r) { return pc(r.ind.aproveitamento, 2); })]),
      reg('Lotes no programa', [calc(function (r) { return n(r.prog.lotes, 0); }),
        calc(function (r) { return n(r.prog.lotesRes, 0) + ' resid. · ' + n(r.prog.lotesCom, 0) + ' com.'; }, 'fraco')]),
      reg('Preço médio por lote', [calc(function (r) { return R$(r.ind.precoMedioLote); })]),
      reg('Preço médio por m² de ALV', [calc(function (r) { return R$(r.ind.precoMedioM2, 2); })])
    ]));

    /* 8 — custos */
    var c = [];
    function custo(rot, caminho, tipo, nota, opts) { c.push(reg(rot, [inp(caminho, tipo, opts), un(tipo === 'pct' ? '%' : (opts && opts.un) || '')], nota)); }
    custo('Impostos s/ vendas', 'custos.impostos', 'pct', 'Lucro presumido pelo regime de caixa, sobre a receita recebida.');
    custo('Comissões s/ vendas', 'custos.comissoes', 'pct', 'Corretagem sobre o VGV vendido, reconhecida no mês da venda.');
    custo('Contrapartidas', 'custos.contrapartidas', 'pct', 'Obras de interesse público exigidas na aprovação. % do VGV.');
    custo('Outros custos com terreno', 'custos.outrosTerreno', 'pct', 'Registro, ITBI e diligências sobre o equivalente à vista da aquisição.');
    c.push(reg('Registro, ITBI e diligências', [calc(function (r) { return R$(r.valores.itbiV); })],
      'Incide sobre o pagamento em dinheiro mais o valor presente da permuta.', true));
    custo('(Critério 1) Custo de obra por m² de ALV', 'custos.obraM2', 'num', 'R$ por m² vendável para implantar a infraestrutura.', { un: 'R$' });
    custo('(Critério 2) Custo de obra como % do VGV', 'custos.obraPctVGV', 'pct', 'Alternativa ao critério 1.');
    c.push(reg('Critério adotado', [inp('custos.criterio', 'sel', { opcoes: ['Critério 1', 'Critério 2'] })]));
    c.push(reg('Custo de obra adotado', [calc(function (r) { return R$(r.valores.obraTotal); })], null, true));
    custo('Parcela pré-operacional', 'custos.pctPreOp', 'pct', 'Fatia do custo de implantação destinada a projetos, aprovações e licenciamento.');
    c.push(reg('Despesas pré-operacionais', [calc(function (r) { return R$(r.valores.preOpV); })], null, true));
    c.push(reg('Despesas de obra', [calc(function (r) { return R$(r.valores.obraExec); })],
      'O que sobra do custo de implantação: a execução da infraestrutura.', true));
    custo('CGA', 'custos.cga', 'pct', 'Rateio da estrutura da incorporadora, sobre o VGV bruto.');
    custo('Gerenciamento da obra', 'custos.gerenciamento', 'pct', 'Sobre o custo de obra; segue o mesmo cronograma e o INCC.');
    custo('Manutenção pós-obra', 'custos.manutencao', 'pct', 'Conservação das áreas comuns após a entrega de cada fase.');
    custo('Despesas de marketing', 'custos.marketing', 'pct', 'Sobre o VGV. Dividido entre as fases ativas.');
    custo('Stand de vendas', 'custos.stand', 'pct', 'Sobre o VGV. Concentra parte na pré-abertura da 1ª fase.');
    custo('Taxa de gestão comercial', 'custos.gestaoComercial', 'pct', 'Sobre o VGV vendido.');
    custo('Premiação s/ vendas', 'custos.premiacao', 'pct', 'Campanhas para imobiliárias e corretores, sobre o VGV vendido.');
    custo('Despesas adm. de vendas', 'custos.admVendas', 'pct', 'Sobre o VGV, diluídas do lançamento ao último recebimento.');
    custo('Despesas bancárias', 'custos.bancarias', 'pct', 'Tarifas, custódia e gestão da carteira de recebíveis.');
    f.appendChild(quadro('Custos e despesas', null, c));

    /* 9 — financiamento */
    f.appendChild(quadro('Financiamento à produção', 'não entra no fluxo nesta versão', [
      reg('% do custo de obra financiado', [inp('financiamento.pctFinanciado', 'pct', { off: true }), un('%')]),
      reg('Juros do financiamento', [inp('financiamento.juros', 'pct', { off: true }), un('% a.a.')]),
      reg('Amortização após a entrega', [inp('financiamento.prazoAmortizacao', 'num', { off: true, step: 1 }), un('meses')])
    ], 'O estudo é 100% capital próprio, como na planilha de origem: a TIR apresentada é desalavancada.'));

    /* 10 — indexadores */
    f.appendChild(quadro('Indexadores e taxa de atratividade', null, [
      reg('IPCA', [inp('indices.ipca', 'pct'), un('% a.a.')], 'Deflator: converte qualquer valor futuro em moeda da data-base.'),
      reg('INCC', [inp('indices.incc', 'pct'), un('% a.a.')], 'Reajusta obras, gerenciamento e contrapartidas.'),
      reg('CDI', [inp('indices.cdi', 'pct'), un('% a.a.')], 'Referência do custo de oportunidade do capital.'),
      reg('Múltiplo (fator de risco)', [inp('indices.multiplo', 'num'), un('×')], 'Multiplica o CDI para formar a taxa exigida.'),
      reg('TMA real exigida', [calc(function (r) { return pc(r.ind.tma, 2) + ' a.a.'; })],
        '(1 + CDI × múltiplo) ÷ (1 + IPCA) − 1. Real, comparável diretamente com a TIR do modelo.', true),
      reg('Taxa real do terrenista', [calc(function (r) { return pc(r.ind.taxaTerrenista, 2) + ' a.a.'; })],
        'CDI deflacionado pelo IPCA. É a taxa com que o fluxo de permuta é trazido a valor presente.', true)
    ]));

    /* 11 — terreno: o involutivo */
    var modoResolver = (P.terreno.modo || 'resolver') === 'resolver';
    var forma = P.terreno.forma || 'permuta';
    var linhasTerreno = [
      reg('Modo', [inp('terreno.modo', 'sel', { opcoes: ['resolver', 'informado'], remonta: true })],
        modoResolver
          ? 'Resolver: a TIR fica travada na TMA e o terreno recebe o que resta das receitas e despesas, até zerar o VPL.'
          : 'Informado: você trava o que está sendo pago pela terra e o modelo devolve a TIR que sobra.'),
      reg('Forma de pagamento', [inp('terreno.forma', 'sel',
        { opcoes: ['permuta', 'avista', 'misto'], remonta: true })],
        'Permuta: percentual da receita líquida. À vista: dinheiro no cronograma abaixo. Misto: parte em cada um.')
    ];
    if (forma === 'misto') linhasTerreno.push(reg('Parcela paga em dinheiro',
      [inp('terreno.pctDinheiro', 'pct'), un('%')],
      'Quanto do valor da gleba sai em dinheiro. O restante vira permuta financeira.'));
    if (forma !== 'permuta') {
      linhasTerreno.push(reg('Pagamento em dinheiro — mês inicial',
        [inp('janelas.terrenoIni', 'num', { step: 1 }), un('mês')]));
      linhasTerreno.push(reg('Pagamento em dinheiro — nº de parcelas',
        [inp('janelas.terrenoParc', 'num', { step: 1 }), un('parc.')],
        'Parcelas iguais e sem reajuste contratual — o custo real cai com o tempo.'));
    }
    if (!modoResolver) {
      if (forma !== 'permuta') linhasTerreno.push(reg('Valor pago em dinheiro',
        [inp('terreno.valorDinheiro', 'num'), un('R$')]));
      if (forma !== 'avista') linhasTerreno.push(reg('Permuta financeira',
        [inp('terreno.permutaPct', 'pct'), un('%')], 'Percentual da receita líquida mensal.'));
    }
    linhasTerreno.push(reg('Valor da gleba — equivalente à vista',
      [calc(function (r) { return R$(r.ind.valorTerreno); })],
      modoResolver ? 'É o teto: acima disso o empreendimento deixa de remunerar a TMA.'
                   : 'Soma do dinheiro e do valor presente da permuta.', true));
    linhasTerreno.push(reg('   parte em dinheiro',
      [calc(function (r) { return R$(r.ind.caixaTerreno); }),
       calc(function (r) { return pc(r.ind.pctDinheiroEfetivo, 0) + ' do valor'; }, 'fraco')],
      'Valor nominal, distribuído no cronograma acima.'));
    linhasTerreno.push(reg('   parte em permuta',
      [calc(function (r) { return R$(r.ind.vpPermuta); }),
       calc(function (r) { return pc(r.ind.permutaPct, 2) + ' da receita'; }, 'fraco')],
      'Valor presente do repasse, à taxa real do terrenista.'));
    linhasTerreno.push(reg('Valor por m² de gleba',
      [calc(function (r) { return R$(r.ind.valorM2Gleba, 2); }),
       calc(function (r) { return R$(r.ind.valorM2ALV, 2) + '/m² ALV'; }, 'fraco')], null, true));
    var escala = e('div');
    var btnEscala = e('button', { cls: 'acao-clara', type: 'button',
      txt: 'Calcular a escala de formas de pagamento' });
    btnEscala.addEventListener('click', function () {
      btnEscala.disabled = true; btnEscala.textContent = 'calculando…';
      setTimeout(function () {
        var pontos = [0, 0.25, 0.5, 0.75, 1].map(function (a) {
          var copia = JSON.parse(JSON.stringify(P));
          copia.terreno = { modo: 'resolver', pctDinheiro: a, valorDinheiro: 0, permutaPct: 0,
            forma: a === 0 ? 'permuta' : a === 1 ? 'avista' : 'misto' };
          var x = Motor.calcular(copia).ind;
          return { a: a, valor: x.valorTerreno, caixa: x.caixaTerreno, perm: x.permutaPct,
                   inv: x.investimento, pb: x.payback };
        });
        var th = e('tr', {}, ['Pago em dinheiro', 'Valor da gleba', 'Em dinheiro (R$)',
          'Permuta (% da receita líq.)', 'Investimento requerido', 'Payback'].map(function (t) { return e('th', { txt: t }); }));
        var tb = e('tbody');
        pontos.forEach(function (x) {
          tb.appendChild(e('tr', {}, [e('td', { txt: pc(x.a, 0) }), e('td', { txt: R$(x.valor) }),
            e('td', { txt: R$(x.caixa) }), e('td', { txt: pc(x.perm, 2) }),
            e('td', { txt: R$(x.inv) }), e('td', { txt: n(x.pb, 0) + ' meses' })]));
        });
        escala.textContent = '';
        escala.appendChild(e('div', { style: 'overflow-x:auto;margin-top:8px' },
          [e('table', { cls: 'dados' }, [e('thead', {}, [th]), tb])]));
        escala.appendChild(e('p', { cls: 'nota-bloco', txt: 'Mesma TIR em todas as linhas — o que muda é quanto a terra pode custar conforme o desembolso é antecipado. É a régua da negociação: quanto o terrenista precisa aceitar em permuta para que o preço pedido caiba no estudo.' }));
        btnEscala.disabled = false; btnEscala.textContent = 'Recalcular a escala';
      }, 20);
    });
    linhasTerreno.push(e('div', { style: 'padding:10px 0 2px' }, [btnEscala, escala]));
    f.appendChild(quadro('Terreno — quanto a gleba pode custar',
      modoResolver ? 'TIR travada na TMA' : 'valor informado', linhasTerreno,
      modoResolver
        ? 'O solver busca o valor que zera o VPL na TMA e o reparte entre dinheiro e permuta na proporção escolhida. Antecipar o desembolso reduz o teto: pagar tudo à vista vale menos para o empreendedor do que a mesma quantia diluída em permuta.'
        : null));

    /* 12 — janelas */
    var j = [];
    function jan(rot, caminho, tipo, nota) { j.push(reg(rot, [inp(caminho, tipo, { step: 1 }), un(tipo === 'pct' ? '%' : 'mês')], nota)); }
    jan('Registro e ITBI — mês inicial', 'janelas.itbiIni', 'num');
    jan('Registro e ITBI — nº de parcelas', 'janelas.itbiParc', 'num');
    jan('Contrapartidas — meses antes da obra', 'janelas.contrapAnteObra', 'num', 'Negativo: antecede o início da obra da fase.');
    jan('Contrapartidas — duração', 'janelas.contrapDur', 'num');
    jan('Manutenção — 1ª janela', 'janelas.manutT1', 'num', 'Começa na entrega de cada fase.');
    j.push(reg('Manutenção — % na 1ª janela', [inp('janelas.manutP1', 'pct'), un('%')]));
    jan('Manutenção — 2ª janela', 'janelas.manutT2', 'num');
    jan('Marketing — meses antes do lançamento', 'janelas.mktAntes', 'num');
    j.push(reg('Marketing — % antes do lançamento', [inp('janelas.mktPctAntes', 'pct'), un('%')]));
    jan('Marketing — meses após o lançamento', 'janelas.mktDepois', 'num');
    jan('Stand — meses antes do lançamento', 'janelas.standAntes', 'num');
    j.push(reg('Stand — % antes do lançamento', [inp('janelas.standPctAntes', 'pct'), un('%')]));
    f.appendChild(quadro('Janelas de desembolso', 'quando cada conta sai do caixa', j,
      'Correspondem às linhas 1 a 7 do cabeçalho da aba FLUXO da planilha.'));

    /* identificação, ao final */
    f.appendChild(quadro('Identificação do estudo', null, [
      reg('Nome', [inp('identificacao.nome', 'txt')]),
      reg('Município', [inp('identificacao.municipio', 'txt')]),
      reg('UF', [inp('identificacao.uf', 'txt')])
    ]));
    return f;
  }

  /* =============================================================== VENDAS */
  function folhaVendas(idx) {
    var f = document.createDocumentFragment(), fi = idx;
    var F = function (r) { return r.fases[fi]; };

    f.appendChild(quadro('Eventos', 'início e fim são calculados; só a duração é digitada', [
      reg('Lançamento da fase — duração',
        [inp('fases.' + fi + '.janLanc', 'num', { step: 1, min: 1, max: 120 }), un('meses'),
         calc(function (r) { return 'mês ' + F(r).lanc + ' a ' + F(r).lancFim; })],
        fi === 0 ? 'Começa no mês seguinte ao fim dos pré-operacionais.'
                 : 'O mês de início vem do gatilho da fase anterior — não é digitável.'),
      reg('Obra da fase — prazo',
        [inp('fases.' + fi + '.prazoObra', 'num', { step: 1, min: 1, max: 240 }), un('meses'),
         calc(function (r) { return 'mês ' + F(r).obraIni + ' a ' + F(r).obraUltimoMes; })],
        'A obra começa no mês seguinte ao fim da janela de lançamento.'),
      reg('Entrega da obra', [calc(function (r) { return mes(F(r).obraFim); })],
        'Marco de referência para a manutenção pós-obra e para os lotes comerciais vendidos no "Intermediário".', true),
      reg('Fim das vendas da fase', [calc(function (r) { return mes(F(r).fimVendas); })], null, true)
    ]));

    var linhasEtapa = [
      { rot: 'Início', cels: [0, 1, 2, 3].map(function (i) { return calc(function (r) { return n(F(r).etapas[i].ini, 0); }); }) },
      { rot: 'Fim', cels: [0, 1, 2, 3].map(function (i) { return calc(function (r) { return n(F(r).etapas[i].fim, 0); }); }) },
      { rot: 'Duração (meses)', cels: [0, 1, 2, 3].map(function (i) { return calc(function (r) { return n(F(r).etapas[i].dur, 0); }); }) },
      { rot: '% da obra da fase', cels: [
          inp('fases.' + fi + '.etapa1', 'pct'), inp('fases.' + fi + '.etapa2', 'pct'),
          inp('fases.' + fi + '.etapa3', 'pct'),
          calc(function (r) { return pc(F(r).etapas[3].pct); })] }
    ];
    f.appendChild(quadro('Programa de produção — curva de obra', 'quatro etapas de ¼ do prazo cada',
      [grade(['Etapa 1', 'Etapa 2', 'Etapa 3', 'Etapa 4'], linhasEtapa,
        'A 4ª etapa é o residual: 100% menos as três primeiras. Toda a obra é reajustada pelo INCC.')]));

    f.appendChild(quadro('Velocidade de vendas', '% dos lotes DESTA fase em cada janela', [grade(
      ['Lançamento', 'Durante a obra', 'Pós-obra'], [
        { rot: '% dos lotes', cels: [inp('fases.' + fi + '.velLanc', 'pct'),
            inp('fases.' + fi + '.velObra', 'pct'), inp('fases.' + fi + '.velPos', 'pct')] },
        { rot: 'Duração (meses)', cels: [
            calc(function (r) { return n(F(r).janelas[0].dur, 0); }),
            calc(function (r) { return n(F(r).janelas[1].dur, 0); }),
            inp('fases.' + fi + '.durPos', 'num', { step: 1 })] },
        { rot: 'VSO (% ao mês)', forte: true, cels: [0, 1, 2].map(function (i) {
            return calc(function (r) { return pc(F(r).janelas[i].vso, 2); }); }) }
      ], 'A janela do lançamento dura o que a janela de lançamento dos eventos; a da obra, o prazo de obra. A venda durante a obra absorve a diferença para o total fechar 100% dos lotes da fase.')]));

    f.appendChild(quadro('Gatilho de vendas', null, [
      reg('% vendido para lançar a fase seguinte', [inp('fases.' + fi + '.gatilho', 'pct'), un('%')],
        'Enquanto a fase atual não atinge este percentual, a seguinte não lança — é o mecanismo que protege o caixa.'),
      reg('Gatilho atingido em', [calc(function (r) { return mes(F(r).mesGatilho); })],
        function (r) {
          return fi + 1 < r.fases.length
            ? 'A fase ' + (fi + 2) + ' é lançada no mês ' + n(r.fases[fi + 1].lanc, 0) + '.'
            : 'Não há fase seguinte ativa.';
        }, true)
    ]));

    f.appendChild(quadro('Velocidade por produto', 'lotes por mês em cada janela · comercial vende em mês único', [grade(
      ['Lançamento', 'Durante a obra', 'Pós-obra', 'Mês único'], [0, 1, 2, 3, 4].map(function (p) {
        var com = P.produtos[p].tipo === 'comercial';
        return { rot: 'Produto ' + (p + 1) + ' · ' + (com ? 'com.' : 'resid.'),
          cels: [0, 1, 2].map(function (j) {
            return calc(function (r) { return com ? '—' : n(F(r).lotesMes[p][j], 2); }, com ? 'fraco' : ''); })
            .concat([calc(function (r) {
              return com && F(r).lotesProduto[p] > 0
                ? n(F(r).lotesProduto[p], 0) + ' no mês ' + F(r).mesesCom[p] : '—'; }, 'fraco')]) };
      }))]));

    f.appendChild(quadro('Condições por plano — Produto 1', 'valores a preço da data-base, sem correção', [grade(
      ['À vista', 'Plano 2', 'Plano 3', 'Plano 4', 'Plano 5'], [
        { rot: 'Entrada / valor à vista (R$)', cels: [0, 1, 2, 3, 4].map(function (i) {
            return calc(function (r) { return r.planosProduto[0][i].n > 0 ? n(r.planosProduto[0][i].entrada, 0) : '—'; }); }) },
        { rot: 'Valor financiado (R$)', cels: [0, 1, 2, 3, 4].map(function (i) {
            return calc(function (r) { return r.planosProduto[0][i].n > 1 ? n(r.planosProduto[0][i].financiado, 0) : '—'; }); }) },
        { rot: 'Parcela mensal — PMT (R$)', forte: true, cels: [0, 1, 2, 3, 4].map(function (i) {
            return calc(function (r) { return r.planosProduto[0][i].pmt ? n(r.planosProduto[0][i].pmt, 0) : '—'; }); }) }
      ])]));

    var res = e('div');
    atualizadores.push(function (r) {
      res.textContent = '';
      var d = r.resultadoFase[fi];
      if (!d) return;
      res.appendChild(painel([
        ['Lotes da fase', n(d.lotes, 0), ''],
        ['Receita recebida', mi(d.receita), pc(d.participacao) + ' do total'],
        ['Obras da fase', mi(d.obras), ''],
        ['Resultado da fase', mi(d.resultado), 'margem de ' + pc(d.receita ? d.resultado / d.receita : 0)]
      ]));
    });
    f.appendChild(quadro('Resultado da fase', 'rateio das contas comuns pela participação na receita', [res]));
    return f;
  }

  function painel(cels) {
    return e('div', { cls: 'painel' }, cels.map(function (c) {
      return e('div', { cls: 'cel' }, [e('div', { cls: 'k', txt: c[0] }), e('div', { cls: 'v', txt: c[1] }),
        c[2] ? e('div', { cls: 'n', txt: c[2] }) : null]);
    }));
  }

  /* ================================================================ FLUXO */
  function folhaFluxo() {
    var f = document.createDocumentFragment();
    var box = e('div');
    atualizadores.push(function (r) {
      box.textContent = '';
      var cols = Motor.COLUNAS.concat([['liquida', 'Receita líquida'], ['fluxo', 'Fluxo do mês'], ['acum', 'Caixa acumulado']]);
      var thead = e('tr', {}, [e('th', { txt: 'Mês' })]);
      cols.forEach(function (c) { thead.appendChild(e('th', { txt: c[1] })); });
      var tb = e('tbody');
      var tot = e('tr', { cls: 'total' }, [e('td', { txt: 'Total' })]);
      cols.forEach(function (c) {
        var v = c[0] === 'acum' ? r.meses[r.meses.length - 1].acum : r.totais[c[0]];
        tot.appendChild(e('td', { cls: v < 0 ? 'neg' : '', txt: n(v, 0) }));
      });
      tb.appendChild(tot);
      r.meses.forEach(function (m) {
        var tr = e('tr', {}, [e('td', { txt: n(m.mes, 0) })]);
        cols.forEach(function (c) {
          var v = m[c[0]];
          tr.appendChild(e('td', { cls: v < 0 ? 'neg' : '', txt: Math.abs(v) < 0.5 ? '·' : n(v, 0) }));
        });
        tb.appendChild(tr);
      });
      box.appendChild(e('div', { cls: 'rolagem' }, [e('table', { cls: 'dados compacto' }, [e('thead', {}, [thead]), tb])]));
      box.appendChild(e('p', { cls: 'nota-bloco',
        txt: r.meses.length + ' meses de ciclo · exposição máxima de ' + mi(-r.ind.exposicao) + ' no mês ' +
             r.ind.mesExposicao + ' · payback primário no mês ' + r.ind.payback + '.' }));
    });
    f.appendChild(box);
    return f;
  }

  /* ========================================================= DEMONSTRATIVO */
  function folhaDRF() {
    var f = document.createDocumentFragment();
    var box = e('div');
    atualizadores.push(function (r) {
      box.textContent = '';
      var i = r.ind, T = r.totais;
      var falhas = r.checks.filter(function (c) { return !c.ok; });
      if (falhas.length) box.appendChild(e('div', { cls: 'alerta',
        txt: falhas.length + ' controle(s) falharam — não apresente estes números antes de resolver: ' +
             falhas.map(function (c) { return c.txt; }).join('; ') + '.' }));

      box.appendChild(e('div', { cls: 'destaque-gleba' }, [
        e('div', {}, [
          e('div', { cls: 'k', txt: i.modoTerreno === 'resolver' ? 'Teto de aquisição da gleba' : 'Valor da gleba informado' }),
          e('div', { cls: 'v', txt: R$(i.valorTerreno) }),
          e('div', { cls: 'n', txt: (i.formaTerreno === 'avista' ? 'integralmente à vista, em ' + i.parcelasTerreno +
              (i.parcelasTerreno > 1 ? ' parcelas' : ' parcela') + ' a partir do mês ' + i.mesTerreno
            : i.formaTerreno === 'permuta' ? 'integralmente em permuta: ' + pc(i.permutaPct, 2) + ' da receita líquida mensal'
            : R$(i.caixaTerreno) + ' em dinheiro mais permuta de ' + pc(i.permutaPct, 2) + ' da receita líquida') +
            (i.modoTerreno === 'resolver' ? ' · TIR travada na TMA de ' + pc(i.tma, 2) : '') })
        ]),
        e('div', {}, [e('div', { cls: 'k', txt: 'Por m² de gleba' }),
                      e('div', { cls: 'v', style: 'font-size:26px', txt: R$(i.valorM2Gleba, 2) })])
      ]));

      box.appendChild(painel([
        ['TIR real', i.tir === null ? '—' : pc(i.tir, 2), i.modoTerreno === 'resolver'
          ? 'travada na TMA de ' + pc(i.tma, 2) : 'a.a. acima do IPCA · TMA ' + pc(i.tma, 2)],
        ['VPL à TMA', R$(i.vpl), ''],
        ['Resultado', mi(i.resultado), 'margem de ' + pc(i.margemReceita) + ' sobre a receita'],
        ['Investimento requerido', mi(i.investimento), 'exposição máxima no mês ' + i.mesExposicao],
        ['Retorno ao investidor', mi(i.retorno), 'múltiplo de ' + n(i.multiplo, 2) + '×'],
        ['Payback primário', n(i.payback, 0) + ' meses', 'duration de ' + n(i.duration, 1) + ' meses'],
        ['VGV de tabela', mi(i.vgv), 'margem de ' + pc(i.margemVGV) + ' sobre o VGV'],
        ['Ciclo total', n(i.ciclo, 0) + ' meses', 'último recebimento no mês ' + i.ultimoRecebimento],
        ['Resultado por lote', R$(i.resultadoPorLote), ''],
        ['Resultado por m² de ALV', R$(i.resultadoPorM2, 2), ''],
        ['Registro e ITBI', R$(-r.totais.itbi), pc(P.custos.outrosTerreno, 1) + ' do equivalente à vista']
      ]));

      var linhas = [
        ['Receita de vendas recebida', T.receita, 'soma'],
        ['residencial', T.receitaRes, 'ind'],
        ['comercial', T.receitaCom, 'ind'],
        ['(−) Impostos sobre a receita', T.impostos, 'ind'],
        ['(−) Corretagem', T.corretagem, 'ind'],
        ['(−) Gestão comercial', T.gestao, 'ind'],
        ['(−) Premiação s/ vendas', T.premiacao, 'ind'],
        ['(−) Marketing', T.marketing, 'ind'],
        ['(−) Stand de vendas', T.stand, 'ind'],
        ['(−) Despesas adm. de vendas', T.admvendas, 'ind'],
        ['(−) Despesas bancárias', T.bancarias, 'ind'],
        ['= Receita líquida de vendas', T.liquida, 'soma'],
        ['(−) Permuta financeira ao terrenista', T.permuta, 'ind'],
        ['(−) Pagamento do terreno', T.terreno, 'ind'],
        ['(−) Registro, ITBI e diligências', T.itbi, 'ind'],
        ['(−) Despesas pré-operacionais', T.preop, 'ind'],
        ['(−) Obras de infraestrutura', T.obra, 'ind'],
        ['(−) Contrapartidas ao município', T.contrap, 'ind'],
        ['(−) Gerenciamento de obras', T.ger, 'ind'],
        ['(−) Manutenção pós-obras', T.manut, 'ind'],
        ['= Resultado operacional', i.resultado - T.cga, 'soma'],
        ['(−) CGA — contas gerais da administração', T.cga, 'ind'],
        ['= Resultado do empreendimento', i.resultado, 'soma']
      ];
      var thead = e('tr', {}, [e('th', { txt: 'Conta' }), e('th', { txt: 'R$ (moeda da base)' }),
                               e('th', { txt: '% da receita' }), e('th', { txt: '% do VGV' })]);
      var tb = e('tbody');
      linhas.forEach(function (l) {
        tb.appendChild(e('tr', { cls: l[2] === 'soma' ? 'soma' : '' }, [
          e('td', { cls: l[2] === 'ind' ? 'ind' : '', txt: l[0] }),
          e('td', { cls: l[1] < 0 ? 'neg' : '', txt: n(l[1], 0) }),
          e('td', { txt: pc(l[1] / T.receita) }), e('td', { txt: pc(l[1] / i.vgv) })
        ]));
      });
      box.appendChild(e('div', { style: 'margin-top:14px' }, [
        quadro('Demonstrativo de resultados', 'valores deflacionados pelo IPCA',
          [e('div', { style: 'overflow-x:auto' }, [e('table', { cls: 'dados' }, [e('thead', {}, [thead]), tb])])])
      ]));

      if (r.resultadoFase.length > 1) {
        var th2 = e('tr', {}, [e('th', { txt: 'Fase' })].concat(
          ['Lotes', 'Lançamento', 'Entrega', 'Receita', 'Participação', 'Resultado', 'Margem'].map(function (t) { return e('th', { txt: t }); })));
        var tb2 = e('tbody');
        r.resultadoFase.forEach(function (d) {
          tb2.appendChild(e('tr', {}, [e('td', { txt: 'Fase ' + d.fase }), e('td', { txt: n(d.lotes, 0) }),
            e('td', { txt: 'mês ' + d.lancamento }), e('td', { txt: 'mês ' + d.entrega }),
            e('td', { txt: n(d.receita, 0) }), e('td', { txt: pc(d.participacao) }),
            e('td', { cls: d.resultado < 0 ? 'neg' : '', txt: n(d.resultado, 0) }),
            e('td', { txt: pc(d.receita ? d.resultado / d.receita : 0) })]));
        });
        box.appendChild(quadro('Resultado por fase', null,
          [e('div', { style: 'overflow-x:auto' }, [e('table', { cls: 'dados' }, [e('thead', {}, [th2]), tb2])])]));
      }

      var chips = e('div', { cls: 'chips' });
      r.checks.forEach(function (c) {
        chips.appendChild(e('span', { cls: 'chip' + (c.ok ? '' : ' ruim') },
          [e('span', { cls: 'pt' }), e('span', { txt: c.txt })]));
      });
      box.appendChild(quadro('Controles de consistência',
        r.checks.filter(function (c) { return c.ok; }).length + ' de ' + r.checks.length + ' OK', [chips]));
    });
    f.appendChild(box);
    return f;
  }

  /* ============================================================= MEMORIAL */
  function folhaMemorial() {
    var f = document.createDocumentFragment();
    var box = e('div', { cls: 'memo' });
    atualizadores.push(function (r) {
      box.textContent = '';
      var i = r.ind, F = r.fases;
      function h(t) { box.appendChild(e('h3', { txt: t })); }
      function p(html) { box.appendChild(e('p', { html: html })); }
      var num = function (t) { return '<span class="num">' + t + '</span>'; };
      h('1 · Síntese do negócio');
      p('Estudo na modalidade ' + num(r.areas.modalidadeRotulo.toLowerCase()) + '. ' +
        'Gleba de ' + num(n(r.areas.gleba, 0) + ' m²') + ' com área líquida vendável de ' +
        num(n(r.areas.alvDisponivel, 0) + ' m²') + ' (' + pc(r.areas.pctALV) + ' da gleba). O programa prevê ' +
        num(n(r.prog.lotesRes, 0) + ' lotes residenciais') + ' e ' + num(n(r.prog.lotesCom, 0) + ' comerciais') +
        ' em ' + num(r.prog.nFases + (r.prog.nFases > 1 ? ' fases' : ' fase')) + ', com VGV de tabela de ' +
        num(R$(i.vgv)) + ' na data-base.');
      p('O estudo devolve resultado de ' + num(R$(i.resultado)) + ' (margem de ' + pc(i.margemReceita) +
        ' sobre a receita recebida e ' + pc(i.margemVGV) + ' sobre o VGV), TIR real de ' + num(pc(i.tir, 2) + ' a.a.') +
        ' contra TMA exigida de ' + num(pc(i.tma, 2)) + ', com investimento requerido de ' + num(R$(i.investimento)) +
        ' e payback primário no mês ' + num(n(i.payback, 0)) + '.');
      h('2 · Moeda da análise');
      p('Todo o fluxo está no poder de compra do mês zero. Cada conta é primeiro reajustada pelo seu índice contratual ' +
        '— INCC de ' + num(pc(P.indices.incc, 2)) + ' para obras, gerenciamento e contrapartidas; IPCA de ' +
        num(pc(P.indices.ipca, 2)) + ' para serviços; sem reajuste para terreno e ITBI — e depois dividida pelo IPCA ' +
        'acumulado até aquele mês. Por isso a TIR é real, acima do IPCA, e só pode ser comparada com uma TMA também real.');
      h('3 · Produto e estratégia comercial');
      p('Preço médio de ' + num(R$(i.precoMedioM2, 2) + '/m²') + ' de ALV, equivalente a ' + num(R$(i.precoMedioLote)) +
        ' por lote. As vendas ocorrem em três janelas por fase: ' + pc(F[0].velLanc) + ' no lançamento (' +
        F[0].janLanc + ' meses), ' + pc(F[0].velObra) + ' durante a obra (' + F[0].prazoObra + ' meses) e ' +
        pc(F[0].velPos) + ' no pós-obra (' + F[0].durPos + ' meses). ' +
        (r.prog.nFases > 1 ? 'A fase seguinte só lança quando a anterior atinge ' + pc(F[0].gatilho) +
          ' vendido: a cadeia resultante põe os lançamentos nos meses ' + F.map(function (x) { return x.lanc; }).join(', ') + '.'
          : 'Com uma única fase, o gatilho de ' + pc(F[0].gatilho) + ' não tem efeito prático.'));
      p('O mix de planos distribui as unidades entre ' + P.planos.filter(function (x) { return x.mix > 0; })
        .map(function (x) { return pc(x.mix, 0) + ' em ' + (x.n > 1 ? x.n + 'x' : 'à vista'); }).join(', ') +
        '. A carteira resultante tem duration de ' + num(n(i.duration, 1) + ' meses') + ' e o último recebimento cai no mês ' +
        num(n(i.ultimoRecebimento, 0)) + '.');
      h('4 · Onde o dinheiro é aplicado');
      var contas = [['Permuta ao terrenista', r.totais.permuta], ['Obras de infraestrutura', r.totais.obra],
        ['Tributos sobre a receita', r.totais.impostos], ['Corretagem e comerciais',
          r.totais.corretagem + r.totais.gestao + r.totais.premiacao + r.totais.marketing + r.totais.stand +
          r.totais.admvendas + r.totais.bancarias], ['Contrapartidas ao município', r.totais.contrap],
        ['CGA', r.totais.cga], ['Pré-operacionais', r.totais.preop]];
      contas.sort(function (a, b) { return a[1] - b[1]; });
      p('As maiores aplicações do ciclo, em moeda da base: ' + contas.slice(0, 4).map(function (c) {
        return c[0].toLowerCase() + ' ' + num(R$(-c[1])); }).join(', ') + '.');
      h('5 · Valor da gleba');
      p('O pagamento da gleba está estruturado ' + (i.formaTerreno === 'avista' ? 'integralmente à vista'
          : i.formaTerreno === 'permuta' ? 'integralmente em permuta financeira'
          : 'em regime misto: ' + pc(i.pctDinheiroEfetivo, 0) + ' em dinheiro e o restante em permuta') +
        ', o que equivale a ' + num(R$(i.valorTerreno)) + ' à vista — ou ' +
        num(R$(i.valorM2Gleba, 2) + '/m²') + ' de gleba. A parcela em permuta, de ' +
        num(pc(i.permutaPct, 2)) + ' da receita líquida mensal, vale ' + num(R$(i.vpPermuta)) +
        ' trazida pela taxa real do terrenista de ' + num(pc(i.taxaTerrenista, 2) + ' a.a.') + '. ' +
        (i.modoTerreno === 'resolver'
          ? 'Como o percentual foi resolvido para zerar o VPL na TMA, esse é o teto que o empreendimento suporta pagar pela terra.'
          : 'O percentual está travado no valor informado, e o retorno acima da TMA é o que sobra para o empreendedor.'));
      h('6 · Base metodológica');
      p('Análise da Qualidade do Investimento no padrão NRE-POLI/USP: fluxo em moeda da base, taxa de retorno real, ' +
        'payback primário, duration e reconhecimento pelo regime de caixa. O modelo é 100% capital próprio — a TIR de ' +
        num(pc(i.tir, 2)) + ' é desalavancada. Nenhum número é digitado no fluxo: todos derivam das premissas.');
    });
    f.appendChild(box);
    return f;
  }


  /* ============================================================ AUDITORIA */
  function folhaAuditoria() {
    var f = document.createDocumentFragment();
    var box = e('div');
    atualizadores.push(function (r) {
      box.textContent = '';
      var i = r.ind, T = r.totais;
      var soma = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };

      /* trava da TIR */
      var travada = i.modoTerreno === 'resolver';
      box.appendChild(quadro('Trava da TIR', travada ? 'o valor do terreno zera o fluxo' : 'valor do terreno informado', [
        painel([
          ['TIR real do empreendimento', i.tir === null ? '—' : pc(i.tir, 4), 'a.a. acima do IPCA'],
          ['TMA real exigida', pc(i.tma, 4), '(1 + CDI × múltiplo) ÷ (1 + IPCA) − 1'],
          ['Diferença', i.tir === null ? '—' : n((i.tir - i.tma) * 100, 4) + ' p.p.', travada ? 'deve ser zero' : 'folga sobre a taxa exigida'],
          ['VPL à TMA', R$(i.vpl), travada ? 'deve ser zero' : 'valor criado acima da TMA']
        ])
      ], travada
        ? 'Com a TIR travada, o valor da gleba é a variável de saída: ele absorve tudo o que sobra depois de receitas, custos, despesas e tributos.'
        : 'Com o valor informado, a TIR é a variável de saída: ela mostra o que sobra depois de pagar o preço pedido pela terra.'));

      /* reconciliações */
      var linhas = [];
      function rec(nome, a, b, tol, comentario) {
        var dif = Math.abs(a - b), passou = dif <= (tol === undefined ? 1 : tol);
        linhas.push({ nome: nome, a: a, b: b, dif: dif, ok: passou, obs: comentario });
      }
      var contas = T.receita + T.impostos + T.corretagem + T.gestao + T.premiacao + T.marketing +
        T.stand + T.admvendas + T.bancarias + T.permuta + T.terreno + T.itbi + T.preop + T.obra +
        T.contrap + T.ger + T.manut + T.cga;
      rec('Demonstrativo × fluxo de caixa', contas, i.resultado, 1,
        'O DRF soma conta a conta; o fluxo soma mês a mês.');
      rec('Soma dos meses × resultado', soma(r.meses.map(function (m) { return m.fluxo; })), i.resultado, 1);
      rec('Soma das fases × resultado', soma(r.resultadoFase.map(function (x) { return x.resultado; })), i.resultado, 1,
        'O rateio das contas comuns distribui 100% do valor.');
      rec('Receita líquida × receita menos deduções', T.liquida,
        T.receita + T.impostos + T.corretagem + T.gestao + T.premiacao + T.marketing + T.stand +
        T.admvendas + T.bancarias, 1);
      rec('Investimento × exposição máxima de caixa', i.investimento, -i.exposicao, 1,
        'O capital aportado é exatamente o pior saldo acumulado.');
      rec('Retorno × resultado mais investimento', i.retorno, i.resultado + i.investimento, 1);
      rec('Valor do terreno × dinheiro mais permuta', i.valorTerreno, i.vpCaixa + i.vpPermuta, 1,
        'Ambas as parcelas trazidas à taxa real do terrenista.');
      rec('Mix dos planos de venda', P.planos.reduce(function (a, b) { return a + (+b.mix || 0); }, 0) * 100, 100, 0.01, 'em %');
      r.fases.forEach(function (fa, k) {
        rec('Curva de obra da fase ' + fa.i, soma(fa.etapas.map(function (x) { return x.pct; })) * 100, 100, 0.01, 'em %');
        rec('Janelas de venda da fase ' + fa.i, (fa.velLanc + fa.velObra + fa.velPos) * 100, 100, 0.01, 'em %');
      });
      if (travada) {
        rec('VPL na TMA', i.vpl, 0, 1000, 'precisão do solver');
        rec('TIR menos TMA (p.p.)', (i.tir - i.tma) * 100, 0, 0.01);
      }
      var th = e('tr', {}, ['Reconciliação', 'Apurado', 'Referência', 'Diferença', ''].map(function (t) { return e('th', { txt: t }); }));
      var tb = e('tbody');
      linhas.forEach(function (l) {
        tb.appendChild(e('tr', {}, [
          e('td', {}, [e('span', { txt: l.nome }), l.obs ? e('div', { cls: 'nota-linha', txt: l.obs }) : null]),
          e('td', { txt: n(l.a, 2) }), e('td', { txt: n(l.b, 2) }),
          e('td', { cls: l.ok ? '' : 'neg', txt: n(l.dif, 2) }),
          e('td', {}, [e('span', { cls: 'chip' + (l.ok ? '' : ' ruim') },
            [e('span', { cls: 'pt' }), e('span', { txt: l.ok ? 'confere' : 'DIVERGE' })])])
        ]));
      });
      var falhas = linhas.filter(function (l) { return !l.ok; }).length;
      box.appendChild(quadro('Reconciliações independentes',
        falhas ? falhas + ' divergência(s)' : linhas.length + ' de ' + linhas.length + ' conferem',
        [e('div', { style: 'overflow-x:auto' }, [e('table', { cls: 'dados' }, [e('thead', {}, [th]), tb])])]));

      /* controles de consistência */
      var chips = e('div', { cls: 'chips' });
      r.checks.forEach(function (c) {
        chips.appendChild(e('span', { cls: 'chip' + (c.ok ? '' : ' ruim') },
          [e('span', { cls: 'pt' }), e('span', { txt: c.txt })]));
      });
      box.appendChild(quadro('Controles de consistência',
        r.checks.filter(function (c) { return c.ok; }).length + ' de ' + r.checks.length + ' OK', [chips]));

      /* calibração */
      var cal = [
        ['Receita de vendas recebida', 112451628], ['Obras de infraestrutura', -19684408],
        ['Permuta ao terrenista', -40819883], ['Resultado do empreendimento', 26954366],
        ['TIR real (% a.a.)', 21.7401], ['VPL à TMA (R$)', 350.18],
        ['Investimento requerido', 15112126], ['Retorno ao investidor', 42066493],
        ['Payback (meses)', 79], ['Duration (meses)', 78.38],
        ['Valor presente da permuta', 22784960]
      ];
      var thc = e('tr', {}, ['Grandeza', 'Planilha de origem'].map(function (t) { return e('th', { txt: t }); }));
      var tbc = e('tbody');
      cal.forEach(function (c) {
        tbc.appendChild(e('tr', {}, [e('td', { txt: c[0] }), e('td', { txt: n(c[1], Math.abs(c[1]) < 1000 ? 2 : 0) })]));
      });
      box.appendChild(quadro('Calibração contra a planilha de origem', 'estudo de referência — Itu, 164 lotes, 1 fase',
        [e('div', { style: 'overflow-x:auto' }, [e('table', { cls: 'dados' }, [e('thead', {}, [thc]), tbc])])],
        'O motor foi conferido contra a planilha conta a conta e mês a mês: nenhuma conta diverge mais de 0,001% e nenhuma linha do fluxo mensal diverge mais de R$ 50 em 235 meses. A bateria completa tem 93 verificações e está no repositório em testes/auditoria.js — inclui a trava da TIR nas três formas de pagamento, a monotonicidade do teto e o comportamento com entradas degeneradas.'));
    });
    f.appendChild(box);
    return f;
  }

  /* ================================================================ abas */
  var ABAS = [
    { id: 'premissas', rot: 'Premissas', render: folhaPremissas },
    { id: 'v1', fase: 0, rot: 'Vendas · Fase 1', render: function () { return folhaVendas(0); } },
    { id: 'v2', fase: 1, rot: 'Vendas · Fase 2', render: function () { return folhaVendas(1); } },
    { id: 'v3', fase: 2, rot: 'Vendas · Fase 3', render: function () { return folhaVendas(2); } },
    { id: 'v4', fase: 3, rot: 'Vendas · Fase 4', render: function () { return folhaVendas(3); } },
    { id: 'fluxo', rot: 'Fluxo de caixa', render: folhaFluxo },
    { id: 'drf', rot: 'Demonstrativo', render: folhaDRF },
    { id: 'auditoria', rot: 'Auditoria', render: folhaAuditoria },
    { id: 'memorial', rot: 'Memorial', render: folhaMemorial }
  ];

  /* fase inativa não tem aba: o estudo mostra só o que está em jogo */
  function abasVisiveis() {
    var nF = nFasesP();
    return ABAS.filter(function (a) { return a.fase === undefined || a.fase < nF; });
  }

  function montarAbas() {
    var nav = document.getElementById('abas');
    nav.textContent = '';
    var lista = abasVisiveis();
    if (!lista.some(function (a) { return a.id === abaAtiva; })) abaAtiva = 'premissas';
    lista.forEach(function (a) {
      var b = e('button', { cls: 'aba', role: 'tab', 'aria-selected': a.id === abaAtiva ? 'true' : 'false',
        txt: a.rot });
      b.addEventListener('click', function () { abaAtiva = a.id; montarAbas(); montarFolha(); });
      nav.appendChild(b);
    });
  }

  function montarFolha(manterRolagem) {
    var y = window.scrollY;
    atualizadores = [];
    var alvo = document.getElementById('folha');
    alvo.textContent = '';
    var lista = abasVisiveis();
    var aba = lista.filter(function (a) { return a.id === abaAtiva; })[0];
    if (!aba) { abaAtiva = 'premissas'; aba = lista[0]; }
    alvo.appendChild(aba.render());
    aplicar();
    window.scrollTo(0, manterRolagem ? y : 0);
  }

  function aplicar() {
    if (!R) return;
    atualizadores.forEach(function (fn) { try { fn(R); } catch (err) {} });
    var topo = document.getElementById('resumo-topo');
    topo.textContent = '';
    [['Valor da gleba', R$(R.ind.valorTerreno)],
     ['TIR real', R.ind.tir === null ? '—' : pc(R.ind.tir, 2) + (R.ind.modoTerreno === 'resolver' ? ' = TMA' : '')],
     ['Resultado', mi(R.ind.resultado)], ['Investimento', mi(R.ind.investimento)]].forEach(function (d) {
      topo.appendChild(e('div', {}, [e('span', { cls: 'r', txt: d[0] }), e('span', { cls: 'v', txt: d[1] })]));
    });
  }

  /* Trocar o tipo do produto troca o leque de formas de pagamento; o valor
     guardado acompanha, para não sobrar apontando para uma opção que sumiu. */
  function normalizarPagamentos() {
    (P.produtos || []).forEach(function (p) {
      if (p.tipo === 'comercial') {
        if (!/^p[1-5]$/.test(p.pagamento)) p.pagamento = 'p1';
      } else p.pagamento = 'mix';
    });
  }

  function recalcular() {
    normalizarPagamentos();
    try { R = Motor.calcular(P); } catch (err) { console.error(err); return; }
    aplicar();
    try { localStorage.setItem('involutivo.premissas', JSON.stringify(P)); } catch (err) {}
  }

  /* --------------------------------------------------------------- ações */
  function baixar(nome, txt, tipo) {
    var url = URL.createObjectURL(new Blob([txt], { type: tipo }));
    var a = document.createElement('a'); a.href = url; a.download = nome; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function iniciar() {
    try {
      var salvo = localStorage.getItem('involutivo.premissas');
      if (salvo) {
        var p = JSON.parse(salvo);
        if (p && p.areas && p.planos && (p.areas.tipo || p.areas.viario < 1)) {
          /* formato anterior: um único quadro de perdas, sem modalidade */
          if (!p.areas.tipo) {
            p.areas = { tipo: 'aberto', gleba: p.areas.gleba,
              aberto: { circulacao: p.areas.viario || 0, verdeLazer: p.areas.lazer || 0,
                        institucional: p.areas.doacoes || 0 },
              condominio: { circulacao: .15, verdeLazer: .10, institucional: .05 },
              app: p.areas.verdes || 0, faixa: p.areas.faixa || 0, restricao: p.areas.restricao || 0 };
          }
          /* o plano à vista é definição: uma parcela, 100% de entrada */
          if (p.planos && p.planos[0]) { p.planos[0].n = 1; p.planos[0].entrada = 1; }
          if (!p.areas.aberto) p.areas.aberto = { circulacao: .20, verdeLazer: .10, institucional: .05 };
          if (!p.areas.condominio) p.areas.condominio = { circulacao: .15, verdeLazer: .10, institucional: .05 };
          if (!p.terreno) p.terreno = { modo: (p.permuta && p.permuta.modo === 'fixo') ? 'informado' : 'resolver',
            forma: 'permuta', pctDinheiro: .4, valorDinheiro: p.custos ? (p.custos.aquisicao || 0) : 0,
            permutaPct: p.permuta ? p.permuta.valor : .42 };
          if (!p.produtos && p.residenciais) {          /* formato anterior: dois quadros separados */
            p.produtos = p.residenciais.map(function (x) {
              return { tipo: 'residencial', area: x.area, precoM2: x.precoM2,
                       pagamento: 'planos', momento: 'Intermediário' };
            });
            (p.comerciais || []).forEach(function (c) {
              var vazio = -1;
              for (var i = 0; i < p.produtos.length; i++) if (!p.produtos[i].area && vazio < 0) vazio = i;
              if (vazio < 0 || !c.lotes) return;
              p.produtos[vazio] = { tipo: 'comercial', area: c.area, precoM2: c.precoM2,
                                    pagamento: 'avista', momento: c.momento };
              var fa = Math.max(1, Math.min(4, Math.round(c.fase || 1)));
              p.quadro[vazio][fa - 1] = c.lotes;
            });
            delete p.residenciais; delete p.comerciais;
          }
          (p.produtos || []).forEach(function (x) {
            if (x.pagamento === 'planos') x.pagamento = 'mix';
            if (!/^(mix|avista|p[1-5])$/.test(x.pagamento)) x.pagamento = 'mix';
          });
          if (p.produtos) P = p;
        }
      }
    } catch (err) {}
    normalizarPagamentos();
    R = Motor.calcular(P);
    montarAbas(); montarFolha();
    var btnTema = document.getElementById('btn-tema');
    function aplicarTema(t) {
      if (t === 'claro') document.documentElement.setAttribute('data-tema', 'claro');
      else document.documentElement.removeAttribute('data-tema');
      btnTema.textContent = t === 'claro' ? 'Tema escuro' : 'Tema claro';
      try { localStorage.setItem('involutivo.tema', t); } catch (err) {}
    }
    var temaSalvo = 'escuro';
    try { temaSalvo = localStorage.getItem('involutivo.tema') || 'escuro'; } catch (err) {}
    aplicarTema(temaSalvo);
    btnTema.addEventListener('click', function () {
      aplicarTema(document.documentElement.getAttribute('data-tema') === 'claro' ? 'escuro' : 'claro');
    });
    document.getElementById('btn-restaurar').addEventListener('click', function () {
      P = premissasPadrao(); recalcular(); montarFolha();
    });
    document.getElementById('btn-json').addEventListener('click', function () {
      baixar('premissas-involutivo.json', JSON.stringify(P, null, 2), 'application/json');
    });
    document.getElementById('btn-csv').addEventListener('click', function () {
      var cols = Motor.COLUNAS.concat([['liquida', 'Receita líquida'], ['fluxo', 'Fluxo do mês'], ['acum', 'Caixa acumulado']]);
      var l = [['Mês'].concat(cols.map(function (c) { return c[1]; })).join(';')];
      R.meses.forEach(function (m) {
        l.push([m.mes].concat(cols.map(function (c) {
          return String(Math.round(m[c[0]] * 100) / 100).replace('.', ','); })).join(';'));
      });
      baixar('fluxo-involutivo.csv', '﻿' + l.join('\n'), 'text/csv;charset=utf-8');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
