/* ============================================================================
   PLATAFORMA DE INVOLUTIVO — interface
   As premissas desta tela são exatamente as células editáveis (azuis) da
   planilha INVOLUTIVO_LOTEAMENTO. Cada alteração recalcula o modelo inteiro.
   ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------------------- padrão */
  function premissasPadrao() {
    return {
      identificacao: { nome: 'Gleba Itu — lotes', municipio: 'Itu', uf: 'SP' },
      areas: { gleba: 160084, viario: 38456, doacoes: 4002.1, verdes: 20621,
               lazer: 16755.9, faixa: 14408, restricao: 0 },
      prazos: { preOp: 18, nFases: 1 },
      residenciais: [{ area: 391.406, precoM2: 1250 }, { area: 0, precoM2: 0 },
                     { area: 0, precoM2: 0 }, { area: 0, precoM2: 0 }, { area: 0, precoM2: 0 }],
      quadro: [[164, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      comerciais: [{ lotes: 1, area: 800, fase: 1, momento: 'Intermediário', precoM2: 1250 },
                   { lotes: 4, area: 85, fase: 1, momento: 'Início', precoM2: 1250 },
                   { lotes: 4, area: 85, fase: 1, momento: 'Intermediário', precoM2: 1250 },
                   { lotes: 2, area: 85, fase: 1, momento: 'Fim', precoM2: 1250 }],
      planos: [{ n: 1, mix: 0.2, entrada: 1, desconto: 0.05, correcao: 0.05, jurosReal: 0 },
               { n: 120, mix: 0.5, entrada: 0.15, desconto: 0, correcao: 0.05, jurosReal: 0.08 },
               { n: 180, mix: 0.3, entrada: 0.15, desconto: 0, correcao: 0.05, jurosReal: 0.08 },
               { n: 0, mix: 0, entrada: 0, desconto: 0, correcao: 0.05, jurosReal: 0 },
               { n: 0, mix: 0, entrada: 0, desconto: 0, correcao: 0.05, jurosReal: 0 }],
      fases: [0, 1, 2, 3].map(function (i) {
        return { janLanc: 6, prazoObra: [18, 24, 18, 18][i], etapa1: .15, etapa2: .25, etapa3: .35,
                 velLanc: .2, velPos: .2, durPos: 12, gatilho: .7 };
      }),
      custos: { impostos: .0673, comissoes: .045, contrapartidas: .025, aquisicao: 0, outrosTerreno: .02,
                obraM2: 300, obraPctVGV: 0, criterio: 'Critério 1', pctPreOp: .08, cga: .03,
                gerenciamento: .06, manutencao: .01, marketing: .03, stand: .01,
                gestaoComercial: .005, premiacao: .005, admVendas: .015, bancarias: .002 },
      financiamento: { pctFinanciado: 0, juros: 0, prazoAmortizacao: 0 },
      indices: { ipca: .035, incc: .065, cdi: .13, multiplo: 2 },
      janelas: { terrenoIni: 0, terrenoParc: 1, itbiIni: 1, itbiParc: 1, preOpIni: 1,
                 contrapAnteObra: -3, contrapDur: 6, manutT1: 24, manutP1: .7, manutT2: 12, manutP2: .3,
                 mktAntes: -6, mktPctAntes: .6, mktDepois: 36, standAntes: -3, standPctAntes: .3 },
      permuta: { modo: 'resolver', valor: .42 }
    };
  }

  /* ------------------------------------------------------------- formatos */
  var nf = function (v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    if (Object.is(v, -0) || Math.abs(v) < 0.5 / Math.pow(10, d || 0)) v = 0;
    return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  var moeda = function (v) { return 'R$ ' + nf(v, 0); };
  var mi = function (v) { return 'R$ ' + nf(v / 1e6, 1) + ' M'; };
  var pc = function (v, d) { return nf(v * 100, d === undefined ? 1 : d) + '%'; };
  var el = function (tag, attrs, filhos) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'txt') e.textContent = attrs[k];
      else if (k === 'cls') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) e.appendChild(f); });
    return e;
  };

  var P = premissasPadrao(), R = null;

  function pegar(caminho) {
    return caminho.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, P);
  }
  function guardar(caminho, valor) {
    var ks = caminho.split('.'), alvo = P;
    for (var i = 0; i < ks.length - 1; i++) alvo = alvo[ks[i]];
    alvo[ks[ks.length - 1]] = valor;
  }

  /* --------------------------------------------------------- formulário */
  var MOMENTOS = ['Início', 'Intermediário', 'Fim'];

  function campo(def) {
    var valor = pegar(def.p);
    if (def.t === 'pct') valor = (valor || 0) * 100;
    var input;
    if (def.t === 'sel') {
      input = el('select', { id: 'f_' + def.p });
      def.opcoes.forEach(function (o) {
        input.appendChild(el('option', { value: o, txt: o, selected: o === valor ? 'selected' : null }));
      });
    } else if (def.t === 'texto') {
      input = el('input', { id: 'f_' + def.p, type: 'text', value: valor == null ? '' : valor });
      input.style.textAlign = 'left';
    } else {
      input = el('input', { id: 'f_' + def.p, type: 'number', step: def.step || 'any',
                            value: valor == null ? '' : Math.round(valor * 1e6) / 1e6 });
    }
    if (def.off) input.disabled = true;
    input.dataset.caminho = def.p;
    input.dataset.tipo = def.t;
    return el('div', { cls: 'campo' }, [
      el('label', { for: 'f_' + def.p, txt: def.l }),
      input,
      el('span', { cls: 'un', txt: def.un || (def.t === 'pct' ? '%' : '') })
    ]);
  }

  function tabela(def) {
    var t = el('table', { cls: 'matriz' });
    var thead = el('tr', {}, [el('th', { txt: '' })]);
    def.cols.forEach(function (c) { thead.appendChild(el('th', { txt: c })); });
    t.appendChild(el('thead', {}, [thead]));
    var tb = el('tbody');
    def.linhas.forEach(function (ln) {
      var tr = el('tr', {}, [el('td', { txt: ln.l })]);
      for (var i = 0; i < def.cols.length; i++) {
        var caminho = ln.p(i), valor = pegar(caminho), inp;
        if (ln.t === 'sel') {
          inp = el('select');
          ln.opcoes.forEach(function (o) {
            inp.appendChild(el('option', { value: o, txt: o, selected: o === valor ? 'selected' : null }));
          });
        } else {
          if (ln.t === 'pct') valor = (valor || 0) * 100;
          inp = el('input', { type: 'number', step: ln.step || 'any',
                              value: valor == null ? '' : Math.round(valor * 1e6) / 1e6 });
        }
        inp.dataset.caminho = caminho; inp.dataset.tipo = ln.t;
        tr.appendChild(el('td', {}, [inp]));
      }
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    return t;
  }

  function grupos() {
    var fasesCols = ['Fase 1', 'Fase 2', 'Fase 3', 'Fase 4'];
    var prodCols = ['Prod. 1', 'Prod. 2', 'Prod. 3', 'Prod. 4', 'Prod. 5'];
    var planoCols = ['À vista', 'Plano 2', 'Plano 3', 'Plano 4', 'Plano 5'];
    return [
      { id: 'ident', t: 'Identificação', aberto: true, campos: [
        { t: 'texto', p: 'identificacao.nome', l: 'Nome do estudo' },
        { t: 'texto', p: 'identificacao.municipio', l: 'Município' },
        { t: 'texto', p: 'identificacao.uf', l: 'UF' }
      ] },
      { id: 'areas', t: 'Quadro de áreas', aberto: true,
        resumo: function (r) { return 'ALV ' + nf(r.areas.alvDisponivel, 0) + ' m²'; },
        campos: [
          { t: 'num', p: 'areas.gleba', l: '1 · Área total da gleba', un: 'm²' },
          { t: 'num', p: 'areas.viario', l: '2 · Sistema viário', un: 'm²' },
          { t: 'num', p: 'areas.doacoes', l: '3 · Doações ao município', un: 'm²' },
          { t: 'num', p: 'areas.verdes', l: '4 · Áreas verdes e APP', un: 'm²' },
          { t: 'num', p: 'areas.lazer', l: '5 · Lazer e áreas comuns', un: 'm²' },
          { t: 'num', p: 'areas.faixa', l: '6 · Faixa não edificante', un: 'm²' },
          { t: 'num', p: 'areas.restricao', l: '7 · Área com possível restrição', un: 'm²' }
        ],
        derivados: function (r) { return [
          ['Perdas totais', nf(r.areas.totalPerdas, 0) + ' m² · ' + pc(r.areas.totalPerdas / r.areas.gleba)],
          ['ALV disponível', nf(r.areas.alvDisponivel, 0) + ' m² · ' + pc(r.areas.alvDisponivel / r.areas.gleba)],
          ['ALV usada pelo programa', nf(r.ind.alvUsada, 0) + ' m²'],
          ['Saldo de ALV', nf(r.ind.alvFolga, 0) + ' m² · ' + (r.ind.alvFolga >= -0.5 ? 'suficiente' : 'INSUFICIENTE')]
        ]; } },
      { id: 'prazos', t: 'Prazos e faseamento', campos: [
        { t: 'int', p: 'prazos.preOp', l: 'Pré-operacionais (até o lançamento)', un: 'm', step: 1 },
        { t: 'int', p: 'prazos.nFases', l: 'Nº de fases do projeto (1 a 4)', un: '', step: 1 }
      ] },
      { id: 'resid', t: 'Produtos residenciais', aberto: true,
        resumo: function (r) { return nf(r.prog.lotesRes, 0) + ' lotes'; },
        tabelas: [{ cols: prodCols, linhas: [
          { l: 'Área do lote (m²)', t: 'num', p: function (i) { return 'residenciais.' + i + '.area'; } },
          { l: 'Preço de venda (R$/m²)', t: 'num', p: function (i) { return 'residenciais.' + i + '.precoM2'; } }
        ] }],
        derivados: function (r) { return [
          ['Preço médio do lote', moeda(r.ind.precoMedioLote)],
          ['VGV residencial', mi(r.ind.vgvRes)]
        ]; } },
      { id: 'quadro', t: 'Quadro de fases — lotes por produto', aberto: true,
        tabelas: [{ cols: fasesCols, linhas: [0, 1, 2, 3, 4].map(function (p) {
          return { l: 'Produto ' + (p + 1), t: 'num', step: 1,
                   p: function (i) { return 'quadro.' + p + '.' + i; } };
        }) }] },
      { id: 'comerc', t: 'Produtos comerciais',
        resumo: function (r) { return nf(r.prog.lotesCom, 0) + ' lotes'; },
        tabelas: [{ cols: ['Prod. 1', 'Prod. 2', 'Prod. 3', 'Prod. 4'], linhas: [
          { l: 'Lotes', t: 'num', step: 1, p: function (i) { return 'comerciais.' + i + '.lotes'; } },
          { l: 'Área do lote (m²)', t: 'num', p: function (i) { return 'comerciais.' + i + '.area'; } },
          { l: 'Preço (R$/m²)', t: 'num', p: function (i) { return 'comerciais.' + i + '.precoM2'; } },
          { l: 'Fase', t: 'num', step: 1, p: function (i) { return 'comerciais.' + i + '.fase'; } },
          { l: 'Momento da venda', t: 'sel', opcoes: MOMENTOS,
            p: function (i) { return 'comerciais.' + i + '.momento'; } }
        ] }],
        derivados: function (r) { return [['VGV comercial', mi(r.ind.vgvCom)]]; } },
      { id: 'planos', t: 'Planos de venda', aberto: true,
        resumo: function () { return 'mix ' + pc(P.planos.reduce(function (s, p) { return s + (+p.mix || 0); }, 0), 0); },
        tabelas: [{ cols: planoCols, linhas: [
          { l: 'Nº de parcelas', t: 'num', step: 1, p: function (i) { return 'planos.' + i + '.n'; } },
          { l: '% das unidades (mix)', t: 'pct', p: function (i) { return 'planos.' + i + '.mix'; } },
          { l: '% de entrada', t: 'pct', p: function (i) { return 'planos.' + i + '.entrada'; } },
          { l: 'Desconto à vista (%)', t: 'pct', p: function (i) { return 'planos.' + i + '.desconto'; } },
          { l: 'Correção do preço (% a.a.)', t: 'pct', p: function (i) { return 'planos.' + i + '.correcao'; } },
          { l: 'Juros acima do IPCA (% a.a.)', t: 'pct', p: function (i) { return 'planos.' + i + '.jurosReal'; } }
        ] }],
        nota: 'O mix precisa somar 100%. O plano à vista tem 100% de entrada — é o que a planilha exige.' },
      { id: 'vendas', t: 'Vendas e obra por fase', aberto: true,
        tabelas: [{ cols: fasesCols, linhas: [
          { l: 'Janela de lançamento (meses)', t: 'num', step: 1, p: function (i) { return 'fases.' + i + '.janLanc'; } },
          { l: 'Prazo de obra (meses)', t: 'num', step: 1, p: function (i) { return 'fases.' + i + '.prazoObra'; } },
          { l: 'Curva de obra — etapa 1', t: 'pct', p: function (i) { return 'fases.' + i + '.etapa1'; } },
          { l: 'Curva de obra — etapa 2', t: 'pct', p: function (i) { return 'fases.' + i + '.etapa2'; } },
          { l: 'Curva de obra — etapa 3', t: 'pct', p: function (i) { return 'fases.' + i + '.etapa3'; } },
          { l: 'Vendas no lançamento (%)', t: 'pct', p: function (i) { return 'fases.' + i + '.velLanc'; } },
          { l: 'Vendas pós-obra (%)', t: 'pct', p: function (i) { return 'fases.' + i + '.velPos'; } },
          { l: 'Duração do pós-obra (meses)', t: 'num', step: 1, p: function (i) { return 'fases.' + i + '.durPos'; } },
          { l: 'Gatilho da próxima fase (%)', t: 'pct', p: function (i) { return 'fases.' + i + '.gatilho'; } }
        ] }],
        nota: 'As vendas durante a obra são o residual: 100% menos lançamento menos pós-obra. A etapa 4 da curva de obra também é residual.' },
      { id: 'custos', t: 'Custos e despesas', aberto: true, campos: [
        { t: 'pct', p: 'custos.impostos', l: 'Impostos s/ vendas (sobre recebimentos)', dec: 2 },
        { t: 'pct', p: 'custos.comissoes', l: 'Comissões s/ vendas (sobre VGV vendido)' },
        { t: 'pct', p: 'custos.contrapartidas', l: 'Contrapartidas (% do VGV)' },
        { t: 'num', p: 'custos.aquisicao', l: 'Aquisição do terreno — pagamento em R$', un: 'R$' },
        { t: 'pct', p: 'custos.outrosTerreno', l: 'Outros custos com terreno (% da aquisição)' },
        { t: 'num', p: 'custos.obraM2', l: '(Critério 1) Custo de obra por m² de ALV', un: 'R$' },
        { t: 'pct', p: 'custos.obraPctVGV', l: '(Critério 2) Custo de obra (% do VGV)' },
        { t: 'sel', p: 'custos.criterio', l: 'Critério de obra adotado', opcoes: ['Critério 1', 'Critério 2'] },
        { t: 'pct', p: 'custos.pctPreOp', l: 'Parcela pré-operacional (% do custo de obra)' },
        { t: 'pct', p: 'custos.cga', l: 'CGA (% do VGV)' },
        { t: 'pct', p: 'custos.gerenciamento', l: 'Gerenciamento da obra (% do custo de obra)' },
        { t: 'pct', p: 'custos.manutencao', l: 'Manutenção pós-obra (% do custo de obra)' },
        { t: 'pct', p: 'custos.marketing', l: 'Marketing (% do VGV)' },
        { t: 'pct', p: 'custos.stand', l: 'Stand de vendas (% do VGV)' },
        { t: 'pct', p: 'custos.gestaoComercial', l: 'Gestão comercial (% do VGV vendido)' },
        { t: 'pct', p: 'custos.premiacao', l: 'Premiação s/ vendas (% do VGV vendido)' },
        { t: 'pct', p: 'custos.admVendas', l: 'Despesas adm. de vendas (% do VGV)' },
        { t: 'pct', p: 'custos.bancarias', l: 'Despesas bancárias (% do VGV)' }
      ],
        derivados: function (r) { return [
          ['Custo de obra adotado', moeda(r.valores.obraTotal)],
          ['Despesas pré-operacionais', moeda(r.valores.preOpV)],
          ['Obra a executar', moeda(r.valores.obraExec)],
          ['Registro, ITBI e diligências', moeda(r.valores.itbiV)]
        ]; } },
      { id: 'indices', t: 'Indexadores e TMA', aberto: true, campos: [
        { t: 'pct', p: 'indices.ipca', l: 'IPCA (% a.a.)', dec: 2 },
        { t: 'pct', p: 'indices.incc', l: 'INCC (% a.a.)', dec: 2 },
        { t: 'pct', p: 'indices.cdi', l: 'CDI (% a.a.)', dec: 2 },
        { t: 'num', p: 'indices.multiplo', l: 'Múltiplo (fator de risco)', un: '×' }
      ],
        derivados: function (r) { return [
          ['TMA real exigida', pc(r.ind.tma, 2) + ' a.a.'],
          ['Taxa real do terrenista (CDI real)', pc(r.ind.taxaTerrenista, 2) + ' a.a.']
        ]; } },
      { id: 'permuta', t: 'Permuta e valor da gleba', aberto: true, campos: [
        { t: 'sel', p: 'permuta.modo', l: 'Modo', opcoes: ['resolver', 'fixo'] },
        { t: 'pct', p: 'permuta.valor', l: 'Permuta financeira (% da receita líquida)' }
      ],
        nota: 'Em "resolver", a plataforma procura a permuta que zera o VPL na TMA — é o involutivo: o teto que o negócio suporta pagar pela terra. Em "fixo", você trava o percentual negociado e lê o retorno que sobra.' },
      { id: 'janelas', t: 'Janelas de desembolso (avançado)', campos: [
        { t: 'int', p: 'janelas.terrenoIni', l: 'Terreno — mês inicial', step: 1 },
        { t: 'int', p: 'janelas.terrenoParc', l: 'Terreno — nº de parcelas', step: 1 },
        { t: 'int', p: 'janelas.itbiIni', l: 'Registro/ITBI — mês inicial', step: 1 },
        { t: 'int', p: 'janelas.itbiParc', l: 'Registro/ITBI — nº de parcelas', step: 1 },
        { t: 'int', p: 'janelas.preOpIni', l: 'Pré-operacionais — mês inicial', step: 1 },
        { t: 'int', p: 'janelas.contrapAnteObra', l: 'Contrapartidas — meses antes da obra', step: 1 },
        { t: 'int', p: 'janelas.contrapDur', l: 'Contrapartidas — duração (meses)', step: 1 },
        { t: 'int', p: 'janelas.manutT1', l: 'Manutenção — 1ª janela (meses)', step: 1 },
        { t: 'pct', p: 'janelas.manutP1', l: 'Manutenção — % na 1ª janela' },
        { t: 'int', p: 'janelas.manutT2', l: 'Manutenção — 2ª janela (meses)', step: 1 },
        { t: 'int', p: 'janelas.mktAntes', l: 'Marketing — meses antes do lançamento', step: 1 },
        { t: 'pct', p: 'janelas.mktPctAntes', l: 'Marketing — % antes do lançamento' },
        { t: 'int', p: 'janelas.mktDepois', l: 'Marketing — meses após o lançamento', step: 1 },
        { t: 'int', p: 'janelas.standAntes', l: 'Stand — meses antes do lançamento', step: 1 },
        { t: 'pct', p: 'janelas.standPctAntes', l: 'Stand — % antes do lançamento' }
      ] },
      { id: 'financ', t: 'Financiamento à produção', campos: [
        { t: 'pct', p: 'financiamento.pctFinanciado', l: '% do custo de obra financiado', off: true },
        { t: 'pct', p: 'financiamento.juros', l: 'Juros do financiamento (% a.a.)', off: true },
        { t: 'int', p: 'financiamento.prazoAmortizacao', l: 'Amortização após a entrega (meses)', off: true, step: 1 }
      ], nota: 'Ainda não entra no fluxo — a planilha-mãe também está com estes campos zerados. Próximo item do motor.' }
    ];
  }

  function montarPainel() {
    var form = document.getElementById('painel');
    form.textContent = '';
    grupos().forEach(function (g) {
      var conteudo = el('div', { cls: 'conteudo' });
      (g.campos || []).forEach(function (c) { conteudo.appendChild(campo(c)); });
      (g.tabelas || []).forEach(function (t) { conteudo.appendChild(tabela(t)); });
      if (g.derivados) conteudo.appendChild(el('div', { id: 'der_' + g.id }));
      if (g.nota) conteudo.appendChild(el('p', { cls: 'nota', txt: g.nota }));
      var d = el('details', { cls: 'grupo', id: 'g_' + g.id }, [
        el('summary', {}, [el('span', { cls: 'seta' }), el('span', { txt: g.t }),
                           el('span', { cls: 'resumo', id: 'res_' + g.id })]),
        conteudo
      ]);
      if (g.aberto) d.setAttribute('open', 'open');
      form.appendChild(d);
    });
    form.addEventListener('input', aoEditar);
    form.addEventListener('change', aoEditar);
  }

  var timer = null;
  function aoEditar(ev) {
    var alvo = ev.target, caminho = alvo.dataset && alvo.dataset.caminho;
    if (!caminho) return;
    var tipo = alvo.dataset.tipo, v;
    if (tipo === 'sel' || tipo === 'texto') v = alvo.value;
    else { v = parseFloat(String(alvo.value).replace(',', '.')); if (!isFinite(v)) v = 0;
           if (tipo === 'pct') v = v / 100; }
    guardar(caminho, v);
    document.getElementById('status').textContent = 'recalculando…';
    clearTimeout(timer);
    timer = setTimeout(function () { calcular(); }, 90);
  }

  /* ------------------------------------------------------------ resultados */
  function chip(ok, txt) {
    return el('span', { cls: 'chip' + (ok ? '' : ' ruim') }, [el('span', { cls: 'pt' }), el('span', { txt: txt })]);
  }
  function kpi(k, v, n) {
    return el('div', { cls: 'kpi' }, [el('div', { cls: 'k', txt: k }), el('div', { cls: 'v', txt: v }),
                                     n ? el('div', { cls: 'n', txt: n }) : null]);
  }

  function painelGrafico(titulo, serie, cor, tipo, W, H, rotulo) {
    var L = 52, Dir = 16, T = 16, B = 26, n = serie.length;
    var vmin = 0, vmax = 0;
    serie.forEach(function (v) { vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); });
    vmin *= 1.15; vmax *= 1.15; if (vmax - vmin < 1) vmax = vmin + 1;
    var X = function (i) { return L + ((i + 0.5) / n) * (W - L - Dir); };
    var Y = function (v) { return H - B - (v - vmin) / (vmax - vmin) * (H - T - B); };
    var y0 = Y(0), svg = '', passo = (vmax - vmin) / 3;
    for (var k = 0; k <= 3; k++) {
      var v = vmin + passo * k, y = Y(v);
      svg += '<line x1="' + L + '" y1="' + y.toFixed(1) + '" x2="' + (W - Dir) + '" y2="' + y.toFixed(1) +
        '" stroke="#F1EDE3" stroke-width="1"></line><text x="' + (L - 8) + '" y="' + (y + 4).toFixed(1) +
        '" text-anchor="end" font-size="10.5" fill="#5F6A64">' + nf(v / 1e6, 0) + '</text>';
    }
    svg += '<line x1="' + L + '" y1="' + y0.toFixed(1) + '" x2="' + (W - Dir) + '" y2="' + y0.toFixed(1) +
           '" stroke="#CFC9BA" stroke-width="1"></line>';
    if (tipo === 'barras') {
      var larg = Math.max(2, (W - L - Dir) / n * 0.64);
      serie.forEach(function (v, i) {
        var y = Y(v);
        svg += '<rect x="' + (X(i) - larg / 2).toFixed(1) + '" y="' + Math.min(y, y0).toFixed(1) +
          '" width="' + larg.toFixed(1) + '" height="' + Math.max(1, Math.abs(y - y0)).toFixed(1) +
          '" fill="' + (v >= 0 ? '#00806A' : '#D65A20') + '" rx="1.5"></rect>';
      });
    } else {
      var d = serie.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
      svg += '<path d="' + d + ' L' + X(n - 1).toFixed(1) + ' ' + y0.toFixed(1) + ' L' + X(0).toFixed(1) + ' ' +
             y0.toFixed(1) + ' Z" fill="' + cor + '" fill-opacity="0.09"></path>' +
             '<path d="' + d + '" fill="none" stroke="' + cor + '" stroke-width="2" stroke-linejoin="round"></path>';
    }
    if (rotulo) {
      svg += '<circle cx="' + X(rotulo.i).toFixed(1) + '" cy="' + Y(rotulo.v).toFixed(1) +
        '" r="5" fill="' + cor + '" stroke="#fff" stroke-width="2"></circle><text x="' +
        (X(rotulo.i) + 12).toFixed(1) + '" y="' + (Y(rotulo.v) - 8).toFixed(1) +
        '" text-anchor="start" font-size="11.5" font-weight="600" fill="#13201A">' + rotulo.txt + '</text>';
    }
    for (var a = 0; a * 4 < n; a += 2) {
      svg += '<text x="' + X(a * 4).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="#5F6A64">ano ' + a + '</text>';
    }
    return '<div style="font-size:12px;color:#48544E;margin:6px 0 2px">' + titulo + '</div>' +
      '<svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + titulo + '">' + svg + '</svg>';
  }

  function grafico(r) {
    var meses = r.meses, n = meses.length, tri = [], acum = [];
    for (var q = 0; q * 3 < n; q++) {
      var s = 0;
      for (var k = 0; k < 3; k++) { var m = meses[q * 3 + k]; if (m) s += m.fluxo; }
      tri.push(s); acum.push(meses[Math.min(n - 1, q * 3 + 2)].acum);
    }
    var iExp = 0; acum.forEach(function (v, i) { if (v < acum[iExp]) iExp = i; });
    return painelGrafico('Caixa acumulado — R$ milhões', acum, '#4353C4', 'linha', 980, 190,
             { i: iExp, v: acum[iExp], txt: 'exposição máxima ' + mi(-r.ind.exposicao) + ' · mês ' + r.ind.mesExposicao }) +
           painelGrafico('Resultado do trimestre — R$ milhões (verde: entra caixa · laranja: sai)', tri, '#00806A', 'barras', 980, 150);
  }

  function verResumo(r) {
    var i = r.ind, alvo = document.getElementById('painel-resumo');
    alvo.textContent = '';
    var falhas = r.checks.filter(function (c) { return !c.ok; });
    if (falhas.length) alvo.appendChild(el('div', { cls: 'aviso',
      txt: falhas.length + ' controle(s) de consistência falharam — os números abaixo não devem ser apresentados antes de resolver: ' +
           falhas.map(function (f) { return f.txt; }).join('; ') + '.' }));

    var heroRotulo = P.permuta.modo === 'resolver' ? 'TETO DE AQUISIÇÃO DA GLEBA (VPL = 0 NA TMA)'
                                                   : 'VALOR DA GLEBA NA PERMUTA INFORMADA';
    var hero = el('div', { cls: 'cartao' }, [
      el('div', { cls: 'destaque' }, [
        el('div', { cls: 'hero' }, [
          el('div', { cls: 'rotulo', txt: heroRotulo }),
          el('div', { cls: 'valor', txt: mi(i.vpPermuta) }),
          el('div', { cls: 'sub', txt: 'valor presente da permuta, descontado à taxa real do terrenista de ' +
                                       pc(i.taxaTerrenista, 2) + ' a.a.' })
        ]),
        el('div', { cls: 'kpis', style: 'flex:1' }, [
          kpi('Por m² de gleba', moeda(i.valorM2Gleba)),
          kpi('Permuta financeira', pc(i.permutaPct, 2), 'da receita líquida mensal'),
          kpi('TIR real', i.tir === null ? '—' : pc(i.tir, 2) + ' a.a.', 'TMA exigida ' + pc(i.tma, 2)),
          kpi('VPL à TMA', moeda(i.vpl))
        ])
      ])
    ]);
    alvo.appendChild(hero);

    alvo.appendChild(el('div', { cls: 'cartao' }, [
      el('div', { cls: 'kpis' }, [
        kpi('VGV de tabela', mi(i.vgv), nf(r.prog.lotesRes, 0) + ' lotes + ' + nf(r.prog.lotesCom, 0) + ' comerciais'),
        kpi('Receita recebida', mi(i.receita), 'em moeda da data-base'),
        kpi('Resultado', mi(i.resultado), 'margem de ' + pc(i.margemReceita) + ' sobre a receita'),
        kpi('Margem sobre o VGV', pc(i.margemVGV)),
        kpi('Investimento requerido', mi(i.investimento), 'exposição máxima no mês ' + i.mesExposicao),
        kpi('Retorno ao investidor', mi(i.retorno), 'múltiplo de ' + nf(i.multiplo, 2) + '×'),
        kpi('Payback primário', i.payback === null ? '—' : i.payback + ' meses',
            'duration de ' + nf(i.duration, 0) + ' meses'),
        kpi('Ciclo total', i.ciclo + ' meses', 'último recebimento no mês ' + i.ultimoRecebimento),
        kpi('Aproveitamento', pc(i.aproveitamento), nf(i.alvUsada, 0) + ' m² de ALV'),
        kpi('Resultado por lote', moeda(i.resultadoPorLote)),
        kpi('Resultado por m² de ALV', moeda(i.resultadoPorM2)),
        kpi('Preço médio', moeda(i.precoMedioM2) + '/m²', moeda(i.precoMedioLote) + ' por lote')
      ])
    ]));

    var g = el('div', { cls: 'cartao' });
    g.appendChild(el('h2', { txt: 'Fluxo de caixa do empreendimento', style: 'font-size:16.5px' }));
    g.appendChild(el('p', { cls: 'legenda',
      txt: 'Duas leituras do mesmo fluxo, cada uma na sua escala: o saldo acumulado e o resultado de cada trimestre.' }));
    var wrap = el('div'); wrap.innerHTML = grafico(r); g.appendChild(wrap);
    alvo.appendChild(g);

    var chips = el('div', { cls: 'chips' });
    r.checks.forEach(function (c) { chips.appendChild(chip(c.ok, c.txt)); });
    alvo.appendChild(el('div', { cls: 'cartao' }, [
      el('h2', { txt: 'Controles de consistência', style: 'font-size:16.5px;margin-bottom:10px' }), chips ]));
  }

  function verFluxo(r) {
    var alvo = document.getElementById('painel-fluxo');
    alvo.textContent = '';
    var cols = Motor.COLUNAS.concat([['liquida', 'Receita líquida'], ['fluxo', 'Fluxo do mês'], ['acum', 'Caixa acumulado']]);
    var thead = el('tr', {}, [el('th', { txt: 'Mês' })]);
    cols.forEach(function (c) { thead.appendChild(el('th', { txt: c[1] })); });
    var tb = el('tbody');
    var tot = el('tr', { cls: 'total' }, [el('td', { txt: 'Total' })]);
    cols.forEach(function (c) {
      var v = c[0] === 'acum' ? r.meses[r.meses.length - 1].acum : r.totais[c[0]];
      tot.appendChild(el('td', { cls: v < 0 ? 'neg' : '', txt: nf(v, 0) }));
    });
    tb.appendChild(tot);
    r.meses.forEach(function (m) {
      var tr = el('tr', {}, [el('td', { txt: String(m.mes) })]);
      cols.forEach(function (c) {
        var v = m[c[0]];
        tr.appendChild(el('td', { cls: v < 0 ? 'neg' : '', txt: Math.abs(v) < 0.5 ? '—' : nf(v, 0) }));
      });
      tb.appendChild(tr);
    });
    var tabela = el('table', { cls: 'dados' }, [el('thead', {}, [thead]), tb]);
    alvo.appendChild(el('div', { cls: 'rolagem' }, [tabela]));
    alvo.appendChild(el('p', { cls: 'legenda',
      txt: 'Fluxo mês a mês em moeda da data-base: cada conta já reajustada pelo seu indexador (IPCA, INCC ou sem reajuste) e deflacionada pelo IPCA acumulado. ' + r.meses.length + ' meses de ciclo.' }));
  }

  function verDRF(r) {
    var alvo = document.getElementById('painel-drf');
    alvo.textContent = '';
    var T = r.totais, rec = T.receita, vgv = r.ind.vgv;
    var linhas = [
      ['Receita de vendas recebida', rec, 'soma'],
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
      ['= Resultado operacional', r.ind.resultado - T.cga, 'soma'],
      ['(−) CGA — contas gerais da administração', T.cga, 'ind'],
      ['= Resultado do empreendimento', r.ind.resultado, 'soma']
    ];
    var thead = el('tr', {}, [el('th', { txt: 'Conta' }), el('th', { txt: 'R$ (moeda da base)' }),
                              el('th', { txt: '% da receita' }), el('th', { txt: '% do VGV' })]);
    var tb = el('tbody');
    linhas.forEach(function (l) {
      var tr = el('tr', { cls: l[2] === 'soma' ? 'soma' : '' }, [
        el('td', { cls: l[2] === 'ind' ? 'ind' : '', txt: l[0] }),
        el('td', { cls: l[1] < 0 ? 'neg' : '', txt: nf(l[1], 0) }),
        el('td', { txt: pc(l[1] / rec) }),
        el('td', { txt: pc(l[1] / vgv) })
      ]);
      tb.appendChild(tr);
    });
    alvo.appendChild(el('div', { cls: 'cartao' }, [
      el('h2', { txt: 'Demonstrativo de resultados do empreendimento', style: 'font-size:17px' }),
      el('p', { cls: 'legenda', txt: 'Valores deflacionados pelo IPCA — poder de compra da data-base.' }),
      el('table', { cls: 'dados drf' }, [el('thead', {}, [thead]), tb])
    ]));
  }

  function verVendas(r) {
    var alvo = document.getElementById('painel-vendas');
    alvo.textContent = '';
    var thead = el('tr', {}, [['Fase', 'Lotes', 'Lançamento', 'Janela de lançamento', 'Início da obra',
      'Prazo de obra', 'Entrega', 'Fim das vendas', 'Vendas no lançamento', 'Durante a obra', 'Pós-obra']
      .map(function (t) { return el('th', { txt: t }); })].reduce(function (a, b) { return a.concat(b); }, []));
    var tb = el('tbody');
    r.fases.forEach(function (f) {
      tb.appendChild(el('tr', {}, [
        el('td', { txt: 'Fase ' + f.i }), el('td', { txt: nf(f.lotes, 0) }), el('td', { txt: 'mês ' + f.lanc }),
        el('td', { txt: f.janLanc + ' meses' }), el('td', { txt: 'mês ' + f.obraIni }),
        el('td', { txt: f.prazoObra + ' meses' }), el('td', { txt: 'mês ' + f.obraFim }),
        el('td', { txt: 'mês ' + f.fimVendas }), el('td', { txt: pc(f.velLanc) }),
        el('td', { txt: pc(f.velObra) }), el('td', { txt: pc(f.velPos) })
      ]));
    });
    alvo.appendChild(el('div', { cls: 'cartao' }, [
      el('h2', { txt: 'Cronograma por fase', style: 'font-size:17px' }),
      el('table', { cls: 'dados' }, [el('thead', {}, [thead]), tb]),
      el('p', { cls: 'legenda', txt: 'A fase seguinte só lança quando a anterior atinge o gatilho de vendas.' })
    ]));

    var th2 = el('tr', {}, [el('th', { txt: 'Mês' }), el('th', { txt: 'Receita do mês' }),
                            el('th', { txt: 'Acumulada' }), el('th', { txt: '% da receita total' })]);
    var tb2 = el('tbody'), ac = 0;
    r.meses.forEach(function (m) {
      if (m.receita < 0.5) return;
      ac += m.receita;
      tb2.appendChild(el('tr', {}, [el('td', { txt: String(m.mes) }), el('td', { txt: nf(m.receita, 0) }),
        el('td', { txt: nf(ac, 0) }), el('td', { txt: pc(ac / r.totais.receita) })]));
    });
    alvo.appendChild(el('div', { cls: 'cartao' }, [
      el('h2', { txt: 'Curva de recebimentos', style: 'font-size:17px' }),
      el('div', { cls: 'rolagem', style: 'max-height:420px' }, [el('table', { cls: 'dados' }, [el('thead', {}, [th2]), tb2])])
    ]));
  }

  /* ------------------------------------------------------------- cálculo */
  function calcular() {
    var t0 = performance.now();
    try { R = Motor.calcular(P); }
    catch (e) { document.getElementById('status').textContent = 'erro no cálculo: ' + e.message; throw e; }
    verResumo(R); verFluxo(R); verDRF(R); verVendas(R);
    grupos().forEach(function (g) {
      var res = document.getElementById('res_' + g.id);
      if (res && g.resumo) res.textContent = g.resumo(R);
      var der = document.getElementById('der_' + g.id);
      if (der && g.derivados) {
        der.textContent = '';
        g.derivados(R).forEach(function (d) {
          der.appendChild(el('div', { cls: 'derivado' }, [el('span', { txt: d[0] }), el('b', { txt: d[1] })]));
        });
      }
    });
    document.getElementById('titulo-estudo').textContent =
      P.identificacao.nome + ' · ' + P.identificacao.municipio + '/' + P.identificacao.uf;
    document.getElementById('status').textContent = 'recalculado em ' + Math.round(performance.now() - t0) + ' ms';
    try { localStorage.setItem('involutivo.premissas', JSON.stringify(P)); } catch (e) {}
  }

  /* --------------------------------------------------------------- ações */
  function baixar(nome, conteudo, tipo) {
    var url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    var a = document.createElement('a'); a.href = url; a.download = nome; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function csv() {
    var cols = Motor.COLUNAS.concat([['liquida', 'Receita líquida'], ['fluxo', 'Fluxo do mês'], ['acum', 'Caixa acumulado']]);
    var linhas = [['Mês'].concat(cols.map(function (c) { return c[1]; })).join(';')];
    R.meses.forEach(function (m) {
      linhas.push([m.mes].concat(cols.map(function (c) {
        return String(Math.round(m[c[0]] * 100) / 100).replace('.', ',');
      })).join(';'));
    });
    baixar('fluxo-involutivo.csv', '﻿' + linhas.join('\n'), 'text/csv;charset=utf-8');
  }

  function iniciar() {
    try {
      var salvo = localStorage.getItem('involutivo.premissas');
      if (salvo) { var p = JSON.parse(salvo); if (p && p.areas && p.planos) P = p; }
    } catch (e) {}
    montarPainel();
    calcular();
    document.querySelectorAll('.aba').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.aba').forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
        b.setAttribute('aria-selected', 'true');
        ['resumo', 'fluxo', 'drf', 'vendas'].forEach(function (id) {
          document.getElementById('painel-' + id).hidden = id !== b.dataset.aba;
        });
      });
    });
    document.getElementById('btn-restaurar').addEventListener('click', function () {
      P = premissasPadrao(); montarPainel(); calcular();
    });
    document.getElementById('btn-csv').addEventListener('click', csv);
    document.getElementById('btn-json').addEventListener('click', function () {
      baixar('premissas-involutivo.json', JSON.stringify(P, null, 2), 'application/json');
    });
    document.getElementById('arquivo-json').addEventListener('change', function (ev) {
      var f = ev.target.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try { var p = JSON.parse(fr.result); if (!p.areas || !p.planos) throw new Error('formato');
              P = p; montarPainel(); calcular(); }
        catch (e) { alert('Arquivo de premissas inválido.'); }
      };
      fr.readAsText(f);
    });
  }
  document.addEventListener('DOMContentLoaded', iniciar);
})();
