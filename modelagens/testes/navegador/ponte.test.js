/* A ponte casca ↔ módulo num navegador de verdade: a única fronteira que o
   inject não enxerga. Roda com:  npm run test:navegador  (precisa do Chromium
   do Playwright: npx playwright install chromium). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { subir } from '../ajuda.js';

let T, nav, base;
before(async () => {
  T = await subir();
  await T.app.listen({ port: 0, host: '127.0.0.1' });
  base = `http://127.0.0.1:${T.app.server.address().port}`;
  nav = await chromium.launch();
});
after(async () => { await nav?.close(); await T?.descer(); });

async function entrarNovo(email) {
  const pg = await (await nav.newContext()).newPage();
  /* sem rede para fora: as fontes do Google não atrasam nem sujam o console */
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const erros = [];
  pg.on('pageerror', e => erros.push(String(e)));
  await pg.goto(base + '/cadastro');
  await pg.fill('#nome', 'Pessoa'); await pg.fill('#email', email); await pg.fill('#senha', 'senha-bem-longa');
  await pg.click('button[type=submit]');
  await pg.waitForURL(base + '/pastas');
  return { pg, erros };
}

const primeiroCampo = fr => fr.locator('#folha input:not([type=hidden]):not([readonly])').first();

test('o módulo abre o estudo que a casca entrega e devolve cada mudança para o banco', async () => {
  const { pg, erros } = await entrarNovo('ponte@exemplo.com');
  await pg.fill('input[placeholder="Nome do estudo"]', 'Gleba Itu');
  await pg.click('text=Criar estudo');
  await pg.waitForURL(/\/estudos\//);
  const id = pg.url().split('/').pop();

  const fr = pg.frameLocator('#modulo');
  const campo = primeiroCampo(fr);
  await campo.waitFor();
  assert.equal(await fr.locator('#btn-json').textContent(), 'Baixar premissas');

  await campo.fill('123456'); await campo.press('Tab');
  await pg.waitForFunction(() => document.getElementById('estado').textContent === 'Salvo');
  const salvo = await T.banco.um('SELECT premissas FROM estudo WHERE id = $1', [id]);
  assert.ok(salvo.premissas && salvo.premissas.areas, 'as premissas chegaram ao banco');

  await pg.reload();
  await primeiroCampo(fr).waitFor();
  assert.equal(await primeiroCampo(fr).inputValue(), '123.456', 'reaberto, o estudo volta do banco');
  assert.deepEqual(erros, []);
});

test('dois estudos não se misturam, e nada vai para o localStorage', async () => {
  const { pg } = await entrarNovo('dois@exemplo.com');
  const ids = [];
  for (const nome of ['Um', 'Dois']) {
    await pg.goto(base + '/pastas');
    await pg.fill('input[placeholder="Nome do estudo"]', nome);
    await pg.click('text=Criar estudo');
    await pg.waitForURL(/\/estudos\//);
    ids.push(pg.url().split('/').pop());
  }
  const fr = pg.frameLocator('#modulo');
  await pg.goto(base + '/estudos/' + ids[0]);
  await primeiroCampo(fr).waitFor();
  await primeiroCampo(fr).fill('777'); await primeiroCampo(fr).press('Tab');
  await pg.waitForFunction(() => document.getElementById('estado').textContent === 'Salvo');

  await pg.goto(base + '/estudos/' + ids[1]);
  await primeiroCampo(fr).waitFor();
  assert.notEqual(await primeiroCampo(fr).inputValue(), '777');
  const local = await pg.evaluate(() => localStorage.getItem('involutivo.premissas'));
  assert.equal(local, null);
});
