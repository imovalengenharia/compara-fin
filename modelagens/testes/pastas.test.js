import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subir, cadastrar, idDe } from './ajuda.js';

let T, ana, beto;
before(async () => {
  T = await subir();
  ana = await cadastrar(T.app, 'ana@exemplo.com');
  beto = await cadastrar(T.app, 'beto@exemplo.com');
});
after(() => T?.descer());

const novaPasta = async (c, nome, pai = '') => idDe(await c.post('/pastas', { nome, pai }));
const novoEstudo = async (c, nome, pasta = '') =>
  idDe(await c.post('/estudos', { nome, pasta, modulo: 'involutivo' }));

test('pastas dentro de pastas, com o caminho de volta até o início', async () => {
  const clientes = await novaPasta(ana, 'Clientes');
  const itu = await novaPasta(ana, 'Itu', clientes);
  const r = await ana.get('/pastas/' + itu);
  assert.equal(r.statusCode, 200);
  assert.match(r.body, new RegExp(`<a href="/pastas/${clientes}">Clientes</a>`));
  const raiz = await ana.get('/pastas');
  assert.match(raiz.body, />Clientes</);
  assert.doesNotMatch(raiz.body, />Itu</, 'a subpasta não aparece na raiz');
});

test('o nome chega escapado na página', async () => {
  const id = await novaPasta(ana, '<script>alert(1)</script>');
  const r = await ana.get('/pastas/' + id);
  assert.doesNotMatch(r.body, /<script>alert/);
  assert.match(r.body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('o que é de um usuário não existe para o outro', async () => {
  const pasta = await novaPasta(ana, 'Particular');
  const estudo = await novoEstudo(ana, 'Estudo da Ana', pasta);
  assert.equal((await beto.get('/pastas/' + pasta)).statusCode, 404);
  assert.equal((await beto.get('/estudos/' + estudo)).statusCode, 404);
  assert.equal((await beto.get('/api/estudos/' + estudo)).statusCode, 404);
  assert.equal((await beto.put(`/api/estudos/${estudo}/premissas`, { premissas: { x: 1 } })).statusCode, 404);
  assert.equal((await beto.post(`/pastas/${pasta}/renomear`, { nome: 'meu' })).statusCode, 404);
  assert.equal((await beto.post(`/estudos/${estudo}/apagar`)).statusCode, 404);
  /* nem como destino: Beto não cria pasta nem estudo dentro da pasta da Ana */
  const intruso = await beto.post('/pastas', { nome: 'intrusa', pai: pasta });
  assert.equal(intruso.headers.location, '/pastas?r=destino');
  const beto1 = await novaPasta(beto, 'Do Beto');
  assert.equal((await beto.post(`/pastas/${beto1}/mover`, { destino: pasta })).headers.location,
    `/pastas?r=destino`);
  const r = await ana.get('/pastas/' + pasta);
  assert.match(r.body, /Estudo da Ana/);
  assert.doesNotMatch(r.body, /intrusa|Do Beto/);
});

test('o banco também recusa pasta pendurada em pasta alheia', async () => {
  const daAna = await novaPasta(ana, 'Só da Ana');
  const beto = await T.banco.um("SELECT id FROM usuario WHERE email = 'beto@exemplo.com'");
  await assert.rejects(
    T.banco.consulta('INSERT INTO pasta (usuario_id, pai_id, nome) VALUES ($1, $2, $3)', [beto.id, daAna, 'x']),
    { code: '23503' });
});

test('id malformado é 404, não erro', async () => {
  assert.equal((await ana.get('/pastas/nao-e-uuid')).statusCode, 404);
  assert.equal((await ana.get('/estudos/1')).statusCode, 404);
  assert.equal((await ana.get('/api/estudos/1')).statusCode, 404);
});

test('mover: não entra em si mesma nem em descendente', async () => {
  const a = await novaPasta(ana, 'A');
  const b = await novaPasta(ana, 'B', a);
  const c = await novaPasta(ana, 'C', b);
  assert.equal((await ana.post(`/pastas/${a}/mover`, { destino: c })).headers.location, `/pastas?r=ciclo`);
  assert.equal((await ana.post(`/pastas/${a}/mover`, { destino: a })).headers.location, `/pastas?r=ciclo`);
  const ok = await ana.post(`/pastas/${c}/mover`, { destino: '' });
  assert.equal(ok.headers.location, '/pastas');
  const pai = await T.banco.um('SELECT pai_id FROM pasta WHERE id = $1', [c]);
  assert.equal(pai.pai_id, null);
});

test('renomear pasta e estudo; nome vazio é recusado', async () => {
  const p = await novaPasta(ana, 'Rascunho');
  const e = await novoEstudo(ana, 'Primeiro', p);
  await ana.post(`/pastas/${p}/renomear`, { nome: '  Definitivo   2026 ' });
  await ana.post(`/estudos/${e}/renomear`, { nome: 'Cenário base' });
  assert.equal((await T.banco.um('SELECT nome FROM pasta WHERE id = $1', [p])).nome, 'Definitivo 2026');
  assert.equal((await T.banco.um('SELECT nome FROM estudo WHERE id = $1', [e])).nome, 'Cenário base');
  assert.match((await ana.post(`/pastas/${p}/renomear`, { nome: '   ' })).headers.location, /r=nome/);
});

test('pasta com conteúdo não se apaga; vazia, sim', async () => {
  const p = await novaPasta(ana, 'Cheia');
  const e = await novoEstudo(ana, 'Dentro', p);
  const r = await ana.post(`/pastas/${p}/apagar`);
  assert.equal(r.headers.location, `/pastas/${p}?r=pasta-nao-vazia`);
  assert.ok(await T.banco.um('SELECT 1 FROM estudo WHERE id = $1', [e]));
  await ana.post(`/estudos/${e}/mover`, { destino: '' });
  assert.equal((await ana.post(`/pastas/${p}/apagar`)).headers.location, '/pastas?r=apagada');
  assert.equal(await T.banco.um('SELECT 1 FROM pasta WHERE id = $1', [p]), null);
});

test('estudo: nasce sem premissas, guarda o JSON que o módulo devolve e o entrega de volta', async () => {
  const e = await novoEstudo(ana, 'Gleba Itu');
  const pagina = await ana.get('/estudos/' + e);
  assert.equal(pagina.statusCode, 200);
  assert.match(pagina.body, /src="\/m\/involutivo\/index.html\?casca"/);
  assert.match(pagina.body, new RegExp(`data-estudo="${e}"`));

  const aberto = (await ana.get('/api/estudos/' + e)).json();
  assert.equal(aberto.estudo.premissas, null);
  assert.equal(aberto.estudo.modulo, 'involutivo');
  assert.equal(aberto.usuario.nome, 'Pessoa');
  assert.equal(aberto.usuario.email, undefined, 'o módulo recebe só o que precisa');

  const premissas = { areas: { gleba: 160084 }, planos: [{ n: 1 }], lista: [1, null, 'x'] };
  const r = await ana.put(`/api/estudos/${e}/premissas`, { premissas });
  assert.equal(r.statusCode, 200);
  assert.deepEqual((await ana.get('/api/estudos/' + e)).json().estudo.premissas, premissas);
});

test('premissas que não são objeto são recusadas', async () => {
  const e = await novoEstudo(ana, 'Teimoso');
  for (const premissas of [null, 3, 'x', [1, 2]]) {
    assert.equal((await ana.put(`/api/estudos/${e}/premissas`, { premissas })).statusCode, 400, JSON.stringify(premissas));
  }
});

test('modelagem desconhecida não vira estudo', async () => {
  const r = await ana.post('/estudos', { nome: 'X', pasta: '', modulo: 'nao-existe' });
  assert.equal(r.headers.location, '/pastas?r=modulo');
});

test('o módulo é servido a quem entrou, sem a suíte nem as notas internas', async () => {
  assert.equal((await ana.get('/m/involutivo/index.html')).statusCode, 200);
  assert.equal((await ana.get('/m/involutivo/motor.js')).statusCode, 200);
  assert.equal((await ana.get('/m/involutivo/testes/auditoria.js')).statusCode, 404);
  assert.equal((await ana.get('/m/involutivo/CLAUDE.md')).statusCode, 404);
  assert.equal((await ana.get('/m/package.json')).statusCode, 404);
  assert.equal((await ana.get('/m/../casca/config.js')).statusCode, 404);
});
