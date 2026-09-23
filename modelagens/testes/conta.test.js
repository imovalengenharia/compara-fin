import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subir, cliente, cadastrar } from './ajuda.js';

let T;
before(async () => { T = await subir(); });
after(() => T?.descer());

test('sem sessão, as páginas mandam para /entrar lembrando o destino', async () => {
  const r = await cliente(T.app).get('/pastas/abc');
  assert.equal(r.statusCode, 302);
  assert.equal(r.headers.location, '/entrar?voltar=%2Fpastas%2Fabc');
});

test('sem sessão, a API responde 401 e os módulos não são servidos', async () => {
  const c = cliente(T.app);
  assert.equal((await c.get('/api/estudos/00000000-0000-0000-0000-000000000000')).statusCode, 401);
  assert.equal((await c.get('/m/involutivo/motor.js')).statusCode, 302);
});

test('cadastro abre sessão, normaliza o e-mail e guarda só o hash da senha', async () => {
  const c = await cadastrar(T.app, '  Ana@Exemplo.COM ', 'senha-da-ana-123', 'Ana');
  assert.equal((await c.get('/pastas')).statusCode, 200);
  const u = await T.banco.um("SELECT email, senha_hash FROM usuario WHERE nome = 'Ana'");
  assert.equal(u.email, 'ana@exemplo.com');
  assert.match(u.senha_hash, /^scrypt\$/);
  assert.ok(!u.senha_hash.includes('senha-da-ana-123'));
  const s = await T.banco.um('SELECT token_hash FROM sessao');
  assert.ok(!c.cookie.includes(s.token_hash), 'o cookie não é o que está no banco');
});

test('cadastro recusa e-mail repetido, senha curta e nome vazio', async () => {
  await cadastrar(T.app, 'bia@exemplo.com');
  const c = cliente(T.app);
  const dup = await c.post('/cadastro', { nome: 'Outra Bia', email: 'BIA@exemplo.com', senha: 'outra-senha-longa' });
  assert.equal(dup.statusCode, 400);
  assert.match(dup.body, /Já existe uma conta/);
  assert.equal((await c.post('/cadastro', { nome: 'X', email: 'x@exemplo.com', senha: 'curta' })).statusCode, 400);
  assert.equal((await c.post('/cadastro', { nome: ' ', email: 'y@exemplo.com', senha: 'senha-bem-longa' })).statusCode, 400);
  assert.equal(c.cookie, '');
});

test('entrar, sair: a sessão some do banco ao sair', async () => {
  await cadastrar(T.app, 'caio@exemplo.com', 'senha-do-caio-1');
  const c = cliente(T.app);
  const errada = await c.post('/entrar', { email: 'caio@exemplo.com', senha: 'errada-errada' });
  assert.equal(errada.statusCode, 401);
  assert.match(errada.body, /não conferem/);
  const inexistente = await c.post('/entrar', { email: 'ninguem@exemplo.com', senha: 'qualquer-uma' });
  assert.equal(inexistente.statusCode, 401);
  assert.equal(inexistente.body.includes('não conferem'), true, 'mesma mensagem: não revela quem tem conta');

  const r = await c.post('/entrar', { email: 'CAIO@exemplo.com', senha: 'senha-do-caio-1', voltar: '/pastas?x=1' });
  assert.equal(r.statusCode, 303);
  assert.equal(r.headers.location, '/pastas?x=1');
  assert.equal((await c.get('/pastas')).statusCode, 200);

  const antes = await T.banco.um('SELECT count(*)::int AS n FROM sessao');
  await c.post('/sair');
  const depois = await T.banco.um('SELECT count(*)::int AS n FROM sessao');
  assert.equal(depois.n, antes.n - 1);
  assert.equal((await c.get('/pastas')).statusCode, 302);
});

test('o destino depois de entrar é sempre interno', async () => {
  await cadastrar(T.app, 'davi@exemplo.com', 'senha-do-davi-1');
  for (const voltar of ['//mal.exemplo', 'https://mal.exemplo', '/\\mal.exemplo']) {
    const r = await cliente(T.app).post('/entrar', { email: 'davi@exemplo.com', senha: 'senha-do-davi-1', voltar });
    assert.equal(r.headers.location, '/pastas', voltar);
  }
});

test('sessão expirada vale o mesmo que nenhuma', async () => {
  const c = await cadastrar(T.app, 'eva@exemplo.com');
  await T.banco.consulta(
    `UPDATE sessao SET expira_em = now() - interval '1 second'
      WHERE usuario_id = (SELECT id FROM usuario WHERE email = 'eva@exemplo.com')`);
  assert.equal((await c.get('/pastas')).statusCode, 302);
});

test('o freio segura a décima primeira tentativa errada', async () => {
  await cadastrar(T.app, 'fred@exemplo.com', 'senha-do-fred-1');
  const c = cliente(T.app, '10.0.0.9');
  for (let i = 0; i < 10; i++) await c.post('/entrar', { email: 'fred@exemplo.com', senha: 'errada-' + i });
  const r = await c.post('/entrar', { email: 'fred@exemplo.com', senha: 'senha-do-fred-1' });
  assert.equal(r.statusCode, 429);
});

test('POST vindo de outro site é recusado', async () => {
  const c = await cadastrar(T.app, 'gil@exemplo.com');
  const r = await c.post('/pastas', { nome: 'x' }, { headers: { origin: 'https://mal.exemplo' } });
  assert.equal(r.statusCode, 403);
  const ok = await c.post('/pastas', { nome: 'x' }, { headers: { origin: 'http://localhost:80' } });
  assert.equal(ok.statusCode, 303);
});

test('recuperação: o link vale uma vez, troca a senha e derruba as sessões', async () => {
  const velha = await cadastrar(T.app, 'hana@exemplo.com', 'senha-antiga-123');
  const c = cliente(T.app);

  const semConta = await c.post('/recuperar', { email: 'ninguem@exemplo.com' });
  const comConta = await c.post('/recuperar', { email: 'Hana@exemplo.com' });
  assert.equal(semConta.statusCode, 200);
  assert.equal(comConta.statusCode, 200);
  assert.equal(T.enviados.length, 1, 'só quem tem conta recebe e-mail');
  const link = T.enviados[0].texto.match(/https?:\/\/\S+\/redefinir\?t=(\S+)/);
  assert.ok(link, 'o e-mail traz o link');
  const token = link[1];
  const guardado = await T.banco.um('SELECT token_hash FROM recuperacao_senha');
  assert.notEqual(guardado.token_hash, token, 'no banco fica só o hash do token');

  assert.equal((await c.get('/redefinir?t=' + token)).statusCode, 200);
  assert.equal((await c.post('/redefinir', { token, senha: 'curta' })).statusCode, 400);
  const r = await c.post('/redefinir', { token, senha: 'senha-nova-da-hana' });
  assert.equal(r.statusCode, 303);
  assert.equal(r.headers.location, '/entrar?senha=nova');

  assert.equal((await velha.get('/pastas')).statusCode, 302, 'a sessão antiga caiu');
  assert.equal((await c.post('/redefinir', { token, senha: 'outra-senha-nova' })).statusCode, 400, 'link usado');
  assert.equal((await c.post('/entrar', { email: 'hana@exemplo.com', senha: 'senha-antiga-123' })).statusCode, 401);
  assert.equal((await c.post('/entrar', { email: 'hana@exemplo.com', senha: 'senha-nova-da-hana' })).statusCode, 303);
});

test('link de recuperação vencido não serve', async () => {
  await cadastrar(T.app, 'ivo@exemplo.com');
  T.enviados.length = 0;
  await cliente(T.app).post('/recuperar', { email: 'ivo@exemplo.com' });
  const token = T.enviados[0].texto.match(/redefinir\?t=(\S+)/)[1];
  await T.banco.consulta("UPDATE recuperacao_senha SET expira_em = now() - interval '1 second'");
  const r = await cliente(T.app).post('/redefinir', { token, senha: 'senha-nova-do-ivo' });
  assert.equal(r.statusCode, 400);
  assert.match(r.body, /não vale mais/);
});

test('cabeçalhos de segurança em toda resposta', async () => {
  const r = await cliente(T.app).get('/entrar');
  assert.match(r.headers['content-security-policy'], /script-src 'self'/);
  assert.match(r.headers['content-security-policy'], /frame-ancestors 'self'/);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['referrer-policy'], 'same-origin');
});
