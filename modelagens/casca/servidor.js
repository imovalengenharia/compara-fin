/* A casca: quem entra, onde o estudo fica, e o módulo servido dentro dela. */
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import estatico from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { hashToken } from './senha.js';
import { COOKIE_SESSAO } from './config.js';
import { criarCorreio } from './email.js';
import { paginaErro } from './paginas/paginas.js';
import rotasConta from './rotas/conta.js';
import rotasPastas from './rotas/pastas.js';
import rotasEstudos from './rotas/estudos.js';


const RAIZ = fileURLToPath(new URL('..', import.meta.url));

/* Nenhuma página da casca carrega script de fora nem aceita ser moldurada por outro site. */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'none'",
].join('; ');

export async function criarServidor({ config, banco, correio, logger = true }) {
  const app = Fastify({ logger, trustProxy: config.producao, bodyLimit: 2 * 1024 * 1024 });
  app.decorate('config', config);
  app.decorate('banco', banco);
  app.decorate('correio', correio || criarCorreio(config, app.log));
  app.decorateRequest('usuario', null);

  await app.register(cookie);
  await app.register(formbody);

  app.addHook('onSend', async (req, reply) => {
    reply.header('Content-Security-Policy', CSP);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'same-origin');
    if (config.producao) reply.header('Strict-Transport-Security', 'max-age=31536000');
  });

  /* CSRF: o cookie é SameSite=Lax, e todo POST/PUT/DELETE com Origin de fora é recusado. */
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'GET' || req.method === 'HEAD') return;
    const origem = req.headers.origin;
    if (!origem) return;
    /* a URL já some com a porta padrão; o Host pode trazê-la ou não */
    const semPortaPadrao = h => String(h).replace(/:(80|443)$/, '');
    let host;
    try { host = new URL(origem).host; } catch { host = null; }
    if (host !== semPortaPadrao(req.host)) return reply.code(403).send('origem recusada');
  });

  /* Sessão: o cookie traz o token; no banco só o hash. Expirada é o mesmo que ausente. */
  app.addHook('onRequest', async req => {
    const token = req.cookies[COOKIE_SESSAO];
    if (!token) return;
    req.usuario = await banco.um(
      `SELECT u.id, u.nome, u.email FROM sessao s JOIN usuario u ON u.id = s.usuario_id
        WHERE s.token_hash = $1 AND s.expira_em > now()`, [hashToken(token)]);
  });

  /* Porteiro das rotas que exigem login: página manda para /entrar, API responde 401. */
  app.decorate('exigirLogin', async (req, reply) => {
    if (req.usuario) return;
    if (req.url.startsWith('/api/')) return reply.code(401).send({ erro: 'sessão expirada' });
    return reply.redirect('/entrar?voltar=' + encodeURIComponent(req.url));
  });

  app.decorateReply('pagina', function (texto, codigo = 200) {
    return this.code(codigo).type('text/html; charset=utf-8').send(texto);
  });

  await app.register(estatico, { root: RAIZ + 'casca/publico', prefix: '/publico/' });

  /* Os módulos: arquivos estáticos, só para quem entrou. O módulo segue abrindo
     sozinho fora daqui — a casca só o serve. */
  await app.register(async sub => {
    sub.addHook('onRequest', app.exigirLogin);
    await sub.register(estatico, { root: RAIZ + 'modulos', prefix: '/m/', decorateReply: false,
      allowedPath: p => !/(^|\/)(testes|package\.json|CLAUDE\.md|README\.md)(\/|$)/.test(p) });
  });

  app.get('/saude', async () => {
    await banco.consulta('SELECT 1');
    return { ok: true };
  });

  app.get('/', async (req, reply) => reply.redirect(req.usuario ? '/pastas' : '/entrar'));

  await app.register(rotasConta);
  await app.register(rotasPastas);
  await app.register(rotasEstudos);

  /* Chave estrangeira violada = a pasta de destino sumiu no meio do caminho
     (apagada em outra aba). Para quem pediu, é o mesmo que não existir. */
  app.setErrorHandler((err, req, reply) => {
    if (err.code === '23503') return reply.callNotFound();
    if (err.statusCode && err.statusCode < 500) return reply.send(err);
    req.log.error(err);
    if (req.url.startsWith('/api/')) return reply.code(500).send({ erro: 'erro interno' });
    return reply.pagina(paginaErro(config, req.usuario, 'Algo deu errado',
      'O erro foi registrado. Tente de novo em instantes.'), 500);
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ erro: 'não encontrado' });
    return reply.pagina(paginaErro(config, req.usuario, 'Não encontrado',
      'Esta página não existe, ou não é sua.'), 404);
  });

  return app;
}
