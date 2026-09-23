import { html } from './html.js';
import { MODULOS } from '../modulos.js';

const FONTES = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500' +
  '&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@500;600&display=swap';

function documento({ titulo, config, corpo, classe = '', cabeca = '' }) {
  return html`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo ? `${titulo} · ${config.nome}` : config.nome}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTES}">
<link rel="stylesheet" href="/publico/casca.css">
${cabeca}
</head>
<body class="${classe}">
${corpo}
</body>
</html>`.texto;
}

function barra(config, usuario, meio = '') {
  return html`<header class="barra">
  <a class="marca" href="/pastas">${config.nome}</a>
  ${meio}
  <span class="vazio"></span>
  <span class="quem">${usuario.nome}</span>
  <form method="post" action="/sair"><button class="acao" type="submit">Sair</button></form>
</header>`;
}

const aviso = (texto, tipo = '') => texto ? html`<div class="aviso ${tipo}" role="alert">${texto}</div>` : '';

/* ------------------------------------------------------------------ conta */
function cartao(config, titulo, conteudo) {
  return documento({ titulo, config, corpo: html`<main class="conta"><div class="cartao">
  <div class="marca">${config.nome}</div>
  <h1>${titulo}</h1>
  ${conteudo}
</div></main>` });
}

export function paginaEntrar(config, { email = '', erro = '', ok = '', voltar = '' } = {}) {
  return cartao(config, 'Entrar', html`
  ${aviso(ok)}${aviso(erro, 'erro')}
  <form method="post" action="/entrar">
    <input type="hidden" name="voltar" value="${voltar}">
    <div class="campo"><label for="email">E-mail</label>
      <input id="email" name="email" type="email" autocomplete="email" required autofocus value="${email}"></div>
    <div class="campo"><label for="senha">Senha</label>
      <input id="senha" name="senha" type="password" autocomplete="current-password" required></div>
    <button class="botao largo" type="submit">Entrar</button>
  </form>
  <div class="rodape"><a href="/cadastro">Criar conta</a><a href="/recuperar">Esqueci a senha</a></div>`);
}

export function paginaCadastro(config, { nome = '', email = '', erro = '' } = {}, minimo) {
  return cartao(config, 'Criar conta', html`
  ${aviso(erro, 'erro')}
  <p>Um login é uma pessoa: a conta e as pastas são só suas.</p>
  <form method="post" action="/cadastro">
    <div class="campo"><label for="nome">Nome</label>
      <input id="nome" name="nome" type="text" autocomplete="name" required autofocus maxlength="120" value="${nome}"></div>
    <div class="campo"><label for="email">E-mail</label>
      <input id="email" name="email" type="email" autocomplete="email" required value="${email}"></div>
    <div class="campo"><label for="senha">Senha</label>
      <input id="senha" name="senha" type="password" autocomplete="new-password" required minlength="${minimo}">
      <span class="nota">Pelo menos ${minimo} caracteres.</span></div>
    <button class="botao largo" type="submit">Criar conta</button>
  </form>
  <div class="rodape"><span>Já tem conta? <a href="/entrar">Entrar</a></span></div>`);
}

export function paginaRecuperar(config, { enviado = false, email = '' } = {}) {
  return cartao(config, 'Recuperar a senha', enviado ? html`
  <p>Se houver uma conta para <strong>${email}</strong>, enviamos um link para criar uma senha nova.
     Ele vale por uma hora.</p>
  <div class="rodape"><a href="/entrar">Voltar para entrar</a></div>` : html`
  <p>Informe o e-mail da conta e enviaremos um link para criar uma senha nova.</p>
  <form method="post" action="/recuperar">
    <div class="campo"><label for="email">E-mail</label>
      <input id="email" name="email" type="email" autocomplete="email" required autofocus></div>
    <button class="botao largo" type="submit">Enviar link</button>
  </form>
  <div class="rodape"><a href="/entrar">Voltar para entrar</a></div>`);
}

export function paginaRedefinir(config, { token = '', erro = '', invalido = false } = {}, minimo) {
  if (invalido) return cartao(config, 'Link expirado', html`
  <p>Este link de recuperação não vale mais: já foi usado ou passou de uma hora.</p>
  <div class="rodape"><a href="/recuperar">Pedir outro link</a></div>`);
  return cartao(config, 'Senha nova', html`
  ${aviso(erro, 'erro')}
  <form method="post" action="/redefinir">
    <input type="hidden" name="token" value="${token}">
    <div class="campo"><label for="senha">Senha nova</label>
      <input id="senha" name="senha" type="password" autocomplete="new-password" required autofocus minlength="${minimo}">
      <span class="nota">Pelo menos ${minimo} caracteres. As outras sessões abertas serão encerradas.</span></div>
    <button class="botao largo" type="submit">Salvar senha</button>
  </form>`);
}

/* ----------------------------------------------------------------- pastas */
const dataCurta = d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

function opcoesDestino(destinos, atual, excluir) {
  return html`<option value="" ${atual ? '' : 'selected'}>Início</option>
  ${destinos.filter(d => d.id !== excluir).map(d =>
    html`<option value="${d.id}" ${d.id === atual ? 'selected' : ''}>${'  '.repeat(d.nivel)}${d.nome}</option>`)}`;
}

function menuItem(tipo, item, destinos) {
  const base = `/${tipo}/${item.id}`;
  const excluir = tipo === 'pastas' ? item.id : null;
  const paiAtual = tipo === 'pastas' ? item.pai_id : item.pasta_id;
  return html`<details><summary aria-label="Ações">⋯</summary><div class="menu">
    <form method="post" action="${base}/renomear">
      <input type="text" name="nome" value="${item.nome}" required aria-label="Nome">
      <button class="botao leve" type="submit">Renomear</button></form>
    <form method="post" action="${base}/mover">
      <select name="destino" aria-label="Mover para">${opcoesDestino(destinos, paiAtual, excluir)}</select>
      <button class="botao leve" type="submit">Mover</button></form>
    <form method="post" action="${base}/apagar">
      <button class="link-botao perigo" type="submit">Apagar ${tipo === 'pastas' ? 'pasta' : 'estudo'}</button></form>
  </div></details>`;
}

export function paginaPastas(config, usuario, { pasta, caminho, pastas, estudos, destinos, erro, ok }) {
  const aqui = pasta ? pasta.id : '';
  const trilha = html`<div class="caminho">${pasta
    ? html`<a href="/pastas">Início</a>${caminho.map(c => html` / <a href="/pastas/${c.id}">${c.nome}</a>`)}`
    : html`&nbsp;`}</div>`;
  const vazio = !pastas.length && !estudos.length;
  const modulos = Object.values(MODULOS);

  return documento({ titulo: pasta ? pasta.nome : 'Início', config, corpo: html`
${barra(config, usuario)}
<main class="pagina">
  <div class="cabeca"><div>${trilha}<h1>${pasta ? pasta.nome : 'Início'}</h1></div></div>
  ${aviso(ok)}${aviso(erro, 'erro')}
  <div class="quadro">
    ${vazio ? html`<div class="vazia">Pasta vazia. Crie uma pasta ou um estudo abaixo.</div>` : html`
    <ul class="lista">
      ${pastas.map(p => html`<li>
        <span class="icone">▸</span>
        <span class="nome"><a href="/pastas/${p.id}">${p.nome}</a></span>
        <span class="meta">${p.itens} ${p.itens === 1 ? 'item' : 'itens'}</span>
        ${menuItem('pastas', p, destinos)}</li>`)}
      ${estudos.map(e => html`<li>
        <span class="icone">≡</span>
        <span class="nome"><a href="/estudos/${e.id}">${e.nome}</a></span>
        <span class="meta">${MODULOS[e.modulo]?.nome || e.modulo} · ${dataCurta(e.atualizado_em)}</span>
        ${menuItem('estudos', e, destinos)}</li>`)}
    </ul>`}
  </div>
  <div class="novos">
    <section class="quadro"><h2>Novo estudo</h2>
      <form method="post" action="/estudos">
        <input type="hidden" name="pasta" value="${aqui}">
        <input type="text" name="nome" placeholder="Nome do estudo" required maxlength="160" aria-label="Nome do estudo">
        ${modulos.length > 1 ? html`<select name="modulo" aria-label="Modelagem">
          ${modulos.map(m => html`<option value="${m.id}">${m.nome}</option>`)}</select>`
        : html`<input type="hidden" name="modulo" value="${modulos[0].id}">`}
        ${modulos.length > 1 ? '' : html`<span class="nota">${modulos[0].nome}</span>`}
        <button class="botao" type="submit">Criar estudo</button>
      </form></section>
    <section class="quadro"><h2>Nova pasta</h2>
      <form method="post" action="/pastas">
        <input type="hidden" name="pai" value="${aqui}">
        <input type="text" name="nome" placeholder="Nome da pasta" required maxlength="120" aria-label="Nome da pasta">
        <button class="botao leve" type="submit">Criar pasta</button>
      </form></section>
  </div>
</main>` });
}

/* ----------------------------------------------------------------- estudo */
export function paginaEstudo(config, usuario, { estudo, caminho }) {
  const modulo = MODULOS[estudo.modulo];
  const trilha = html`<nav class="trilha" aria-label="Local do estudo">
    <a href="/pastas">Início</a>
    ${caminho.map(c => html`<span>/</span><a href="/pastas/${c.id}">${c.nome}</a>`)}
    <span>/</span><span class="atual">${estudo.nome}</span>
  </nav><span class="estado" id="estado" aria-live="polite"></span>`;
  return documento({
    titulo: estudo.nome, config, classe: 'estudo',
    cabeca: html`<script src="/publico/estudo.js" defer></script>`,
    corpo: html`
${barra(config, usuario, trilha)}
<iframe id="modulo" title="${modulo.nome}" data-estudo="${estudo.id}"
  src="/m/${modulo.pasta}/index.html?casca"></iframe>`,
  });
}

export function paginaErro(config, usuario, titulo, texto) {
  return documento({ titulo, config, corpo: html`
${usuario ? barra(config, usuario) : ''}
<main class="pagina"><h1>${titulo}</h1><p>${texto}</p><p><a href="/pastas">Voltar às pastas</a></p></main>` });
}
