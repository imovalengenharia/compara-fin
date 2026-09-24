/* A ponte do lado da casca. O módulo, dentro do iframe, avisa que está pronto;
   a casca busca o estudo e o entrega; a cada mudança o módulo devolve as
   premissas e a casca salva — agrupando as mudanças em rajada numa só gravação. */
(function () {
  'use strict';
  var CANAL = 'imovaluation', ESPERA = 800;
  var quadro = document.getElementById('modulo');
  var estado = document.getElementById('estado');
  var id = quadro.getAttribute('data-estudo');
  var url = '/api/estudos/' + encodeURIComponent(id);
  var pendente = null, timer = null, gravando = false, parado = false;

  function mostrar(texto, erro) {
    estado.textContent = texto;
    estado.classList.toggle('erro', !!erro);
  }

  function enviar(msg) { quadro.contentWindow.postMessage(msg, location.origin); }

  function gravar(finalizando) {
    clearTimeout(timer); timer = null;
    if (!pendente || gravando || parado) return;
    var corpo = JSON.stringify({ premissas: pendente });
    pendente = null; gravando = true;
    mostrar('Salvando…');
    fetch(url + '/premissas', {
      method: 'PUT', body: corpo, keepalive: !!finalizando, credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    }).then(function (r) {
      gravando = false;
      if (r.status === 401) {
        parado = true;
        mostrar('Sessão expirada — entre de novo; as últimas mudanças não foram salvas', true);
        return;
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      if (pendente) gravar(); else mostrar('Salvo');
    }).catch(function () {
      gravando = false;
      /* devolve à fila o que não foi, sem passar por cima de mudança mais nova */
      if (!pendente) pendente = JSON.parse(corpo).premissas;
      mostrar('Não salvo — tentando de novo', true);
      timer = setTimeout(gravar, 5000);
    });
  }

  window.addEventListener('message', function (ev) {
    if (ev.source !== quadro.contentWindow || ev.origin !== location.origin) return;
    var m = ev.data;
    if (!m || m.canal !== CANAL) return;
    if (m.tipo === 'pronto') {
      fetch(url, { credentials: 'same-origin' }).then(function (r) {
        if (r.status === 401) { location.href = '/entrar?voltar=' + encodeURIComponent(location.pathname); return null; }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (d) {
        if (d) enviar({ canal: CANAL, tipo: 'abrir', usuario: d.usuario, estudo: d.estudo });
      }).catch(function () { mostrar('Não foi possível abrir o estudo', true); });
    } else if (m.tipo === 'mudou' && m.premissas) {
      pendente = m.premissas;
      mostrar('Alterado');
      clearTimeout(timer);
      timer = setTimeout(gravar, ESPERA);
    }
  });

  /* Saindo com mudança na fila: grava já, e o navegador pergunta antes de fechar. */
  window.addEventListener('pagehide', function () { if (pendente) gravar(true); });
  window.addEventListener('beforeunload', function (ev) {
    if (pendente || gravando) { gravar(true); ev.preventDefault(); ev.returnValue = ''; }
  });
})();
