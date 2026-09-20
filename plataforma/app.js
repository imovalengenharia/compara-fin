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
      areas: { gleba: 160084, viario: 0.24022388246170762, doacoes: 0.025,
               verdes: 0.1288136228480048, lazer: 0.10466942355263506, faixa: 14408, restricao: 0 },
      prazos: { preOp: 18, nFases: 1 },
      residenciais: [{ area: 391.406, precoM2: 1250 }, { area: 0, precoM2: 0 }, { area: 0, precoM2: 0 },
                     { area: 0, precoM2: 0 }, { area: 0, precoM2: 0 }],
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
                 velLanc: .2, velObra: [.6, .5, .5, .5][i], velPos: [.2, .3, .3, .3][i],
                 durPos: 12, gatilho: .7 };
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
  function n(v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    if (Math.abs(v) < 0.5 / Math.pow(10, d || 0)) v = 0;
    return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  var R$ = function (v, d) { return 'R$ ' + n(v, d === undefined ? 0 : d); };
  var mi = function (v) { return 'R$ ' + n(v / 1e6, 1) + ' M'; };
  var pc = function (v, d) { return n(v * 100, d === undefined ? 1 : d) + '%'; };
  var mes = function (v) { return v === null || v === undefined ? '—' : 'mês ' + n(v, 0); };

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

  /* --------------------------------------------------- células e registros */
  var timer = null;
  function aoDigitar(ev) {
    var el = ev.target, c = el.dataset.caminho;
    if (!c) return;
    var t = el.dataset.tipo, v;
    if (t === 'sel' || t === 'txt') v = el.value;
    else {
      v = parseFloat(String(el.value).replace(',', '.'));
      if (!isFinite(v)) v = 0;
      if (t === 'pct') v = v / 100;
    }
    guardar(c, v);
    clearTimeout(timer);
    timer = setTimeout(recalcular, 80);
  }

  function inp(caminho, tipo, opts) {
    opts = opts || {};
    var v = pegar(caminho);
    var el;
    if (tipo === 'sel') {
      el = e('select', { id: 'c_' + caminho });
      (opts.opcoes || []).forEach(function (o) {
        el.appendChild(e('option', { value: o, txt: o, selected: o === v ? 'selected' : null }));
      });
    } else if (tipo === 'txt') {
      el = e('input', { id: 'c_' + caminho, type: 'text', value: v == null ? '' : v });
    } else {
      if (tipo === 'pct') v = (v || 0) * 100;
      el = e('input', { id: 'c_' + caminho, type: 'number', step: opts.step || 'any',
                        value: v == null ? '' : Math.round(v * 1e6) / 1e6 });
    }
    el.dataset.caminho = caminho; el.dataset.tipo = tipo;
    if (opts.off) el.disabled = true;
    el.addEventListener('input', aoDigitar);
    el.addEventListener('change', aoDigitar);
    return el;
  }

  /* valor calculado: registra-se para ser atualizado a cada recálculo */
  function calc(fn, cls) {
    var el = e('span', { cls: 'calc' + (cls ? ' ' + cls : '') });
    atualizadores.push(function (r) { el.textContent = fn(r); });
    return el;
  }
  function un(t) { return e('span', { cls: 'un', txt: t || '' }); }

  function reg(rot, celulas, nota, forte) {
    var linha = e('div', { cls: 'reg' + (forte ? ' forte' : '') }, [e('div', { cls: 'rot', txt: rot })]);
    var caixa = e('div', { style: 'display:flex;gap:8px;align-items:center;justify-content:flex-end' }, celulas);
    linha.appendChild(caixa);
    linha.appendChild(e('div'));
    linha.appendChild(e('div', { cls: 'nota', txt: nota || '' }));
    return linha;
  }

  function quadro(titulo, obs, filhos, nota) {
    var interior = e('div', { cls: 'interior' }, filhos);
    if (nota) interior.appendChild(e('p', { cls: 'nota-bloco', txt: nota }));
    return e('section', { cls: 'quadro' }, [
      e('header', {}, [e('h2', { txt: titulo }), obs ? e('span', { cls: 'obs', txt: obs }) : null]),
      interior
    ]);
  }

  function grade(colunas, linhas, nota) {
    var thead = e('tr', {}, [e('th', { txt: '' })]);
    colunas.forEach(function (c) { thead.appendChild(e('th', { txt: c })); });
    var tb = e('tbody');
    linhas.forEach(function (l) {
      var tr = e('tr', { cls: l.forte ? 'forte' : '' }, [e('td', { txt: l.rot })]);
      l.cels.forEach(function (c) { tr.appendChild(e('td', { cls: c && c.className === 'calc' ? 'calc' : '' }, [c])); });
      tb.appendChild(tr);
    });
    var tabela = e('table', { cls: 'grade' }, [e('thead', {}, [thead]), tb]);
    var box = e('div', { style: 'overflow-x:auto' }, [tabela]);
    return nota ? e('div', {}, [box, e('p', { cls: 'nota-bloco', txt: nota })]) : box;
  }

  /* ============================================================ PREMISSAS */
  function folhaPremissas() {
    var f = document.createDocumentFragment();
    f.appendChild(e('div', { cls: 'folha-topo' }, [
      e('h1', { txt: 'Premissas' }),
      e('p', { txt: 'A ordem é a da planilha: primeiro o que a gleba oferece, depois o produto que cabe nela, depois o que ele custa. Cada resultado aparece só depois das premissas que o produzem.' })
    ]));

    /* 1 — quadro de áreas */
    var areas = [reg('1 · Área total da gleba',
      [inp('areas.gleba', 'num'), un('m²'), calc(function (r) { return pc(1); }, 'fraco')],
      'Área da matrícula ou do levantamento planialtimétrico.')];
    [['viario', '2 · Sistema viário', 'pct', 'Ruas e calçadas — entre 18% e 22% da gleba é o usual.'],
     ['doacoes', '3 · Doações ao município', 'pct', 'Equipamentos públicos e lazer — mínimo usual de 5%.'],
     ['verdes', '4 · Áreas verdes e APP', 'pct', 'Exigidas pelo licenciamento ambiental.'],
     ['lazer', '5 · Lazer e áreas comuns', 'pct', 'Lazer, portaria, apoio técnico, paisagismo e acesso.'],
     ['faixa', '6 · Faixa não edificante', 'm2', 'Servidões e faixas de domínio: rodovia, linhão, dutos.'],
     ['restricao', '7 · Área com possível restrição', 'm2', 'Reserva para restrições do licenciamento.']
    ].forEach(function (d, i) {
      var chave = d[0];
      if (d[2] === 'pct') {
        areas.push(reg(d[1], [
          calc(function (r) { return n(r.areas.perdas[i].m2, 0) + ' m²'; }, 'fraco'),
          inp('areas.' + chave, 'pct'), un('%')], d[3]));
      } else {
        areas.push(reg(d[1], [inp('areas.' + chave, 'num'), un('m²'),
          calc(function (r) { return pc(r.areas.perdas[i].pct, 2); }, 'fraco')], d[3]));
      }
    });
    areas.push(reg('8 · Perdas totais (2 a 7)',
      [calc(function (r) { return n(r.areas.totalPerdas, 0) + ' m²'; }),
       calc(function (r) { return pc(r.areas.pctPerdas, 2); }, 'fraco')], 'Soma das seis condições acima.', true));
    areas.push(reg('9 · ALV disponível (1 − 8)',
      [calc(function (r) { return n(r.areas.alvDisponivel, 0) + ' m²'; }),
       calc(function (r) { return pc(r.areas.pctALV, 2); }, 'fraco')],
      'Área líquida vendável: o que sobra para venda. É o teto físico do programa.', true));
    f.appendChild(quadro('Quadro de áreas', 'condição · área · % sobre a gleba', areas));

    /* 2 — eventos e faseamento */
    f.appendChild(quadro('Eventos e faseamento', null, [
      reg('Mês base do estudo', [e('span', { cls: 'calc fraco', txt: 'mês 0' })],
        'Data-base da análise: a decisão de compra do terreno.'),
      reg('Pré-operacionais — duração', [inp('prazos.preOp', 'num', { step: 1 }), un('meses'),
        calc(function (r) { return 'termina no mês ' + n(P.prazos.preOp, 0); }, 'fraco')],
        'Meses até o lançamento da 1ª fase: aprovações, registro e projetos.'),
      reg('Nº de fases do projeto', [inp('prazos.nFases', 'num', { step: 1 }), un('1 a 4')],
        'Cada fase tem obra, lançamento e curva de vendas próprios. As fases inativas não entram em nada.')
    ]));

    /* 3 — produtos residenciais */
    var colProd = ['Produto 1', 'Produto 2', 'Produto 3', 'Produto 4', 'Produto 5'];
    f.appendChild(quadro('Produtos residenciais', 'tipologias de lote', [grade(colProd, [
      { rot: 'Área do lote (m²)', cels: [0, 1, 2, 3, 4].map(function (i) { return inp('residenciais.' + i + '.area', 'num'); }) },
      { rot: 'Preço de venda (R$/m²)', cels: [0, 1, 2, 3, 4].map(function (i) { return inp('residenciais.' + i + '.precoM2', 'num'); }) },
      { rot: 'Preço do lote (R$)', forte: true, cels: [0, 1, 2, 3, 4].map(function (i) {
          return calc(function (r) { return r.prog.res[i].precoLote ? n(r.prog.res[i].precoLote, 0) : '—'; }); }) }
    ], 'Preço na data-base, sem correção. A correção até o mês da venda é aplicada por plano, no quadro de planos.')]));

    /* 4 — quadro de fases */
    var colFases = ['Fase 1', 'Fase 2', 'Fase 3', 'Fase 4'];
    var linhasFase = [0, 1, 2, 3, 4].map(function (p) {
      return { rot: 'Lotes do Produto ' + (p + 1), cels: [0, 1, 2, 3].map(function (fa) {
        return inp('quadro.' + p + '.' + fa, 'num', { step: 1 }); }) };
    });
    linhasFase.push({ rot: 'Fase ativa?', cels: [0, 1, 2, 3].map(function (fa) {
      return calc(function (r) { return fa < r.prog.nFases ? 'Sim' : 'Não'; }, 'fraco'); }) });
    linhasFase.push({ rot: 'Lotes totais da fase', forte: true, cels: [0, 1, 2, 3].map(function (fa) {
      return calc(function (r) { return n(r.prog.fases[fa].totalLotes, 0); }); }) });
    linhasFase.push({ rot: 'VGV da fase (R$)', forte: true, cels: [0, 1, 2, 3].map(function (fa) {
      return calc(function (r) { return n(r.prog.fases[fa].vgv, 0); }); }) });
    linhasFase.push({ rot: 'ALV da fase (m²)', cels: [0, 1, 2, 3].map(function (fa) {
      return calc(function (r) { return n(r.prog.fases[fa].alv, 0); }); }) });
    f.appendChild(quadro('Quadro de fases', 'lotes de cada produto em cada fase', [grade(colFases, linhasFase,
      'Só as fases ativas entram no cálculo. A distribuição não precisa ser igual entre fases — normalmente não é.')]));

    /* 5 — produtos comerciais */
    var colCom = ['Produto 1', 'Produto 2', 'Produto 3', 'Produto 4'];
    f.appendChild(quadro('Produtos comerciais', 'vendidos à vista, em um único mês', [grade(colCom, [
      { rot: 'Lotes', cels: [0, 1, 2, 3].map(function (i) { return inp('comerciais.' + i + '.lotes', 'num', { step: 1 }); }) },
      { rot: 'Área do lote (m²)', cels: [0, 1, 2, 3].map(function (i) { return inp('comerciais.' + i + '.area', 'num'); }) },
      { rot: 'Preço de venda (R$/m²)', cels: [0, 1, 2, 3].map(function (i) { return inp('comerciais.' + i + '.precoM2', 'num'); }) },
      { rot: 'Fase comercializada', cels: [0, 1, 2, 3].map(function (i) { return inp('comerciais.' + i + '.fase', 'num', { step: 1 }); }) },
      { rot: 'Momento da venda', cels: [0, 1, 2, 3].map(function (i) {
          return inp('comerciais.' + i + '.momento', 'sel', { opcoes: ['Início', 'Intermediário', 'Fim'] }); }) },
      { rot: 'Mês da comercialização', forte: true, cels: [0, 1, 2, 3].map(function (i) {
          return calc(function (r) { return r.comerciais[i].mes === null ? '—' : n(r.comerciais[i].mes, 0); }); }) },
      { rot: 'VGV do produto (R$)', cels: [0, 1, 2, 3].map(function (i) {
          return calc(function (r) { return n(r.comerciais[i].vgv, 0); }); }) }
    ], 'Início = mês do lançamento da fase · Intermediário = entrega da obra da fase · Fim = último mês de vendas da fase.')]));

    /* 6 — resumo do programa (só agora, porque depende de tudo acima) */
    f.appendChild(quadro('Resumo do programa', 'resultado das premissas acima', [
      reg('VGV total de tabela', [calc(function (r) { return R$(r.ind.vgv); })],
        'Residencial mais comercial, a preço de tabela na data-base.', true),
      reg('ALV utilizada pelo programa', [calc(function (r) { return n(r.ind.alvUsada, 0) + ' m²'; })],
        'Soma da área dos lotes lançados, residenciais e comerciais.'),
      reg('Saldo de ALV', [calc(function (r) { return n(r.ind.alvFolga, 0) + ' m²'; }),
        calc(function (r) { return r.ind.alvFolga >= -0.5 ? 'ALV suficiente' : 'ALV INSUFICIENTE'; }, 'fraco')],
        'Disponível menos utilizada. Negativo significa que o programa não cabe na gleba.'),
      reg('Aproveitamento (ALV / gleba)', [calc(function (r) { return pc(r.ind.aproveitamento, 2); })]),
      reg('Preço médio por lote', [calc(function (r) { return R$(r.ind.precoMedioLote); })]),
      reg('Preço médio por m² de ALV', [calc(function (r) { return R$(r.ind.precoMedioM2, 2); })])
    ]));

    /* 7 — planos de venda */
    var colPlanos = ['À vista', 'Plano 2', 'Plano 3', 'Plano 4', 'Plano 5'];
    var idx = [0, 1, 2, 3, 4];
    f.appendChild(quadro('Planos de venda', 'mix precisa somar 100%', [grade(colPlanos, [
      { rot: 'Nº de parcelas', cels: idx.map(function (i) { return inp('planos.' + i + '.n', 'num', { step: 1 }); }) },
      { rot: '% das unidades (mix)', cels: idx.map(function (i) { return inp('planos.' + i + '.mix', 'pct'); }) },
      { rot: '% de entrada', cels: idx.map(function (i) { return inp('planos.' + i + '.entrada', 'pct'); }) },
      { rot: 'Desconto à vista (%)', cels: idx.map(function (i) { return inp('planos.' + i + '.desconto', 'pct'); }) },
      { rot: 'Correção do preço (% a.a.)', cels: idx.map(function (i) { return inp('planos.' + i + '.correcao', 'pct'); }) },
      { rot: 'Juros acima do IPCA (% a.a.)', cels: idx.map(function (i) { return inp('planos.' + i + '.jurosReal', 'pct'); }) },
      { rot: 'Juros nominal equivalente', forte: true, cels: idx.map(function (i) {
          return calc(function (r) { return r.planosProduto[0][i].n > 1 ? pc(r.planosProduto[0][i].jurosNominal, 2) : '—'; }); }) }
    ], 'O plano à vista precisa ter 100% de entrada: não existe linha de recebimento de parcelas para ele. A parcela é fixa em moeda nominal, calculada pela Price sobre o preço-base e corrigida pelo fator do mês da venda.')]));

    /* 8 — custos */
    var c = [];
    function custo(rot, caminho, tipo, nota, opts) { c.push(reg(rot, [inp(caminho, tipo, opts), un(tipo === 'pct' ? '%' : (opts && opts.un) || '')], nota)); }
    custo('Impostos s/ vendas', 'custos.impostos', 'pct', 'Lucro presumido pelo regime de caixa, sobre a receita recebida.');
    custo('Comissões s/ vendas', 'custos.comissoes', 'pct', 'Corretagem sobre o VGV vendido, reconhecida no mês da venda.');
    custo('Contrapartidas', 'custos.contrapartidas', 'pct', 'Obras de interesse público exigidas na aprovação. % do VGV.');
    custo('Aquisição do terreno — em dinheiro', 'custos.aquisicao', 'num', 'Parcela paga em espécie ao proprietário. A permuta física reduz os lotes do quadro de fases.', { un: 'R$' });
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

    /* 11 — permuta */
    f.appendChild(quadro('Permuta financeira e valor da gleba', null, [
      reg('Modo de cálculo', [inp('permuta.modo', 'sel', { opcoes: ['resolver', 'fixo'] })],
        '"Resolver" procura a permuta que zera o VPL na TMA — é o involutivo. "Fixo" trava o percentual negociado.'),
      reg('Permuta financeira', [inp('permuta.valor', 'pct'), un('%'),
        calc(function (r) { return P.permuta.modo === 'resolver' ? '→ ' + pc(r.ind.permutaPct, 2) + ' resolvido' : ''; }, 'fraco')],
        'Percentual da receita líquida mensal repassado ao proprietário do terreno.'),
      reg('Valor presente da permuta', [calc(function (r) { return R$(r.ind.vpPermuta); })],
        'O que a gleba vale neste estudo: o fluxo de permuta trazido à taxa real do terrenista.', true),
      reg('Valor por m² de gleba', [calc(function (r) { return R$(r.ind.valorM2Gleba, 2); })], null, true)
    ]));

    /* 12 — janelas */
    var j = [];
    function jan(rot, caminho, tipo, nota) { j.push(reg(rot, [inp(caminho, tipo, { step: 1 }), un(tipo === 'pct' ? '%' : 'mês')], nota)); }
    jan('Terreno — mês inicial', 'janelas.terrenoIni', 'num');
    jan('Terreno — nº de parcelas', 'janelas.terrenoParc', 'num');
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
    var ativa = function () { return fi < Math.round(P.prazos.nFases); };
    var topo = e('div', { cls: 'folha-topo' }, [
      e('h1', { txt: 'Vendas — Fase ' + (fi + 1) }),
      e('span', { cls: 'selo' + (ativa() ? '' : ' off'), txt: ativa() ? 'fase ativa' : 'fase inativa' })
    ]);
    topo.appendChild(e('p', { txt: fi === 0
      ? 'A 1ª fase lança no mês seguinte ao fim dos pré-operacionais. Todo o resto do cronograma é consequência.'
      : 'Esta fase não tem mês de lançamento próprio: ela lança quando a fase ' + fi + ' atinge o gatilho de vendas. Início de obra, etapas e fim das vendas são consequência.' }));
    f.appendChild(topo);
    if (!ativa()) {
      f.appendChild(quadro('Fase inativa', null, [
        e('p', { cls: 'nota-bloco', txt: 'Aumente o número de fases em Premissas › Eventos e faseamento para ativar esta fase. Enquanto inativa, ela não gera obra, vendas nem receita.' })
      ]));
      return f;
    }
    var F = function (r) { return r.fases[fi]; };

    f.appendChild(quadro('Eventos', 'início e fim são calculados; só a duração é digitada', [
      reg('Lançamento da fase',
        [calc(function (r) { return mes(F(r).lanc); }, 'fraco'), un('a'),
         calc(function (r) { return mes(F(r).lancFim); }, 'fraco'), un('·'),
         inp('fases.' + fi + '.janLanc', 'num', { step: 1 }), un('meses')],
        fi === 0 ? 'Começa no mês seguinte ao fim dos pré-operacionais.'
                 : 'O mês de início vem do gatilho da fase anterior — não é digitável.'),
      reg('Obra da fase',
        [calc(function (r) { return mes(F(r).obraIni); }, 'fraco'), un('a'),
         calc(function (r) { return mes(F(r).obraUltimoMes); }, 'fraco'), un('·'),
         inp('fases.' + fi + '.prazoObra', 'num', { step: 1 }), un('meses')],
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
      reg('Gatilho atingido em', [calc(function (r) { return mes(F(r).mesGatilho); }),
        calc(function (r) { return fi + 1 < r.fases.length ? '→ fase ' + (fi + 2) + ' lança no mês ' + n(r.fases[fi + 1].lanc, 0) : 'não há fase seguinte ativa'; }, 'fraco')], null, true)
    ]));

    f.appendChild(quadro('Velocidade por produto', 'lotes vendidos por mês em cada janela', [grade(
      ['Lançamento', 'Durante a obra', 'Pós-obra'], [0, 1, 2, 3, 4].map(function (p) {
        return { rot: 'Produto ' + (p + 1), cels: [0, 1, 2].map(function (j) {
          return calc(function (r) { return n(F(r).lotesMes[p][j], 2); }); }) };
      }))]));

    f.appendChild(quadro('Condições por plano — Produto 1', 'valores a preço da data-base', [grade(
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
    f.appendChild(e('div', { cls: 'folha-topo' }, [
      e('h1', { txt: 'Fluxo de caixa' }),
      e('p', { txt: 'Mês a mês, em moeda da data-base: cada conta é reajustada pelo seu indexador e depois deflacionada pelo IPCA acumulado.' })
    ]));
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
      box.appendChild(e('div', { cls: 'rolagem' }, [e('table', { cls: 'dados' }, [e('thead', {}, [thead]), tb])]));
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
    f.appendChild(e('div', { cls: 'folha-topo' }, [
      e('h1', { txt: 'Demonstrativo e indicadores' }),
      e('p', { txt: 'Resultado do empreendimento em moeda da data-base e os indicadores da qualidade do investimento.' })
    ]));
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
          e('div', { cls: 'k', txt: P.permuta.modo === 'resolver' ? 'Teto de aquisição da gleba' : 'Valor da gleba na permuta informada' }),
          e('div', { cls: 'v', txt: R$(i.vpPermuta) }),
          e('div', { cls: 'n', txt: 'valor presente da permuta de ' + pc(i.permutaPct, 2) +
            ' da receita líquida, à taxa real do terrenista de ' + pc(i.taxaTerrenista, 2) + ' a.a.' })
        ]),
        e('div', {}, [e('div', { cls: 'k', txt: 'Por m² de gleba' }),
                      e('div', { cls: 'v', style: 'font-size:26px', txt: R$(i.valorM2Gleba, 2) })])
      ]));

      box.appendChild(painel([
        ['TIR real', i.tir === null ? '—' : pc(i.tir, 2), 'a.a. acima do IPCA · TMA ' + pc(i.tma, 2)],
        ['VPL à TMA', R$(i.vpl), ''],
        ['Resultado', mi(i.resultado), 'margem de ' + pc(i.margemReceita) + ' sobre a receita'],
        ['Investimento requerido', mi(i.investimento), 'exposição máxima no mês ' + i.mesExposicao],
        ['Retorno ao investidor', mi(i.retorno), 'múltiplo de ' + n(i.multiplo, 2) + '×'],
        ['Payback primário', n(i.payback, 0) + ' meses', 'duration de ' + n(i.duration, 1) + ' meses'],
        ['VGV de tabela', mi(i.vgv), 'margem de ' + pc(i.margemVGV) + ' sobre o VGV'],
        ['Ciclo total', n(i.ciclo, 0) + ' meses', 'último recebimento no mês ' + i.ultimoRecebimento],
        ['Resultado por lote', R$(i.resultadoPorLote), ''],
        ['Resultado por m² de ALV', R$(i.resultadoPorM2, 2), '']
      ]));

      var linhas = [
        ['Receita de vendas recebida', T.receita, 'soma'],
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
    f.appendChild(e('div', { cls: 'folha-topo' }, [
      e('h1', { txt: 'Memorial de premissas' }),
      e('p', { txt: 'O texto que sustenta os números em due diligence. Tudo aqui é lido do modelo — nada é digitado.' })
    ]));
    var box = e('div', { cls: 'memo' });
    atualizadores.push(function (r) {
      box.textContent = '';
      var i = r.ind, F = r.fases;
      function h(t) { box.appendChild(e('h3', { txt: t })); }
      function p(html) { box.appendChild(e('p', { html: html })); }
      var num = function (t) { return '<span class="num">' + t + '</span>'; };
      h('1 · Síntese do negócio');
      p('Gleba de ' + num(n(r.areas.gleba, 0) + ' m²') + ' com área líquida vendável de ' +
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
      p('A permuta financeira de ' + num(pc(i.permutaPct, 2)) + ' da receita líquida mensal, trazida a valor presente ' +
        'pela taxa real do terrenista de ' + num(pc(i.taxaTerrenista, 2) + ' a.a.') + ', equivale a ' +
        num(R$(i.vpPermuta)) + ' — ou ' + num(R$(i.valorM2Gleba, 2) + '/m²') + ' de gleba. ' +
        (P.permuta.modo === 'resolver'
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

  /* ================================================================ abas */
  var ABAS = [
    { id: 'premissas', rot: 'Premissas', n: '1', render: folhaPremissas },
    { id: 'v1', rot: 'Vendas F1', n: '2', render: function () { return folhaVendas(0); } },
    { id: 'v2', rot: 'Vendas F2', n: '3', render: function () { return folhaVendas(1); } },
    { id: 'v3', rot: 'Vendas F3', n: '4', render: function () { return folhaVendas(2); } },
    { id: 'v4', rot: 'Vendas F4', n: '5', render: function () { return folhaVendas(3); } },
    { id: 'fluxo', rot: 'Fluxo de caixa', n: '6', render: folhaFluxo },
    { id: 'drf', rot: 'Demonstrativo', n: '7', render: folhaDRF },
    { id: 'memorial', rot: 'Memorial', n: '8', render: folhaMemorial }
  ];

  function montarAbas() {
    var nav = document.getElementById('abas');
    nav.textContent = '';
    ABAS.forEach(function (a) {
      var b = e('button', { cls: 'aba', role: 'tab', 'aria-selected': a.id === abaAtiva ? 'true' : 'false' },
        [e('span', { cls: 'n', txt: a.n }), e('span', { txt: a.rot })]);
      b.addEventListener('click', function () { abaAtiva = a.id; montarAbas(); montarFolha(); });
      nav.appendChild(b);
    });
  }

  function montarFolha() {
    atualizadores = [];
    var alvo = document.getElementById('folha');
    alvo.textContent = '';
    var aba = ABAS.filter(function (a) { return a.id === abaAtiva; })[0];
    alvo.appendChild(aba.render());
    aplicar();
    window.scrollTo(0, 0);
  }

  function aplicar() {
    if (!R) return;
    atualizadores.forEach(function (fn) { try { fn(R); } catch (err) {} });
    var topo = document.getElementById('resumo-topo');
    topo.textContent = '';
    [['Valor da gleba', R$(R.ind.vpPermuta)], ['TIR real', R.ind.tir === null ? '—' : pc(R.ind.tir, 2)],
     ['Resultado', mi(R.ind.resultado)], ['Investimento', mi(R.ind.investimento)]].forEach(function (d) {
      topo.appendChild(e('div', {}, [e('span', { cls: 'r', txt: d[0] }), e('span', { cls: 'v', txt: d[1] })]));
    });
    document.getElementById('sub-estudo').textContent =
      P.identificacao.nome + ' · ' + P.identificacao.municipio + '/' + P.identificacao.uf;
  }

  function recalcular() {
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
      if (salvo) { var p = JSON.parse(salvo); if (p && p.areas && p.planos && p.areas.viario < 1) P = p; }
    } catch (err) {}
    R = Motor.calcular(P);
    montarAbas(); montarFolha();
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
