/* Cada arquivo de teste sobe a casca contra um banco descartável, zerado e
   migrado do começo — DATABASE_URL_TESTE, que a suíte APAGA. */
import { lerConfig } from '../casca/config.js';
import { criarBanco } from '../casca/banco.js';
import { migrar } from '../casca/migrar.js';
import { criarServidor } from '../casca/servidor.js';

export async function subir() {
  const url = process.env.DATABASE_URL_TESTE;
  if (!url) throw new Error('defina DATABASE_URL_TESTE (veja .env.exemplo) — a suíte apaga esse banco');
  const banco = criarBanco(url);
  await banco.consulta('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrar(banco, () => {});
  const enviados = [];
  const correio = { enviados, async enviar(m) { enviados.push(m); } };
  const app = await criarServidor({ config: lerConfig({ urlBanco: url }), banco, correio, logger: false });
  return { app, banco, enviados, async descer() { await app.close(); await banco.fechar(); } };
}

/* Um navegador de mentira: guarda o cookie de sessão entre as chamadas. */
export function cliente(app, ip = '127.0.0.1') {
  let cookie = '';
  async function pedir(method, url, corpo, extra = {}) {
    const headers = { ...(cookie ? { cookie } : {}), ...(extra.headers || {}) };
    let payload;
    if (corpo !== undefined && extra.json) { payload = JSON.stringify(corpo); headers['content-type'] = 'application/json'; }
    else if (corpo !== undefined) { payload = new URLSearchParams(corpo).toString(); headers['content-type'] = 'application/x-www-form-urlencoded'; }
    const r = await app.inject({ method, url, payload, headers, remoteAddress: extra.ip || ip });
    const c = r.cookies.find(c => c.name === 'sessao');
    if (c) cookie = c.value ? `sessao=${c.value}` : '';
    return r;
  }
  return {
    get: (u, x) => pedir('GET', u, undefined, x),
    post: (u, c, x) => pedir('POST', u, c ?? {}, x),
    put: (u, c) => pedir('PUT', u, c, { json: true }),
    get cookie() { return cookie; },
    set cookie(v) { cookie = v; },
  };
}

export async function cadastrar(app, email, senha = 'senha-bem-longa', nome = 'Pessoa') {
  const c = cliente(app);
  const r = await c.post('/cadastro', { nome, email, senha });
  if (r.statusCode !== 303) throw new Error('cadastro falhou: ' + r.statusCode);
  return c;
}

/* id que vem no Location de um redirect: /pastas/<id> ou /estudos/<id> */
export const idDe = r => r.headers.location.split('/').pop().split('?')[0];
