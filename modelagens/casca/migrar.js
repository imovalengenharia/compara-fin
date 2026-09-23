/* Aplica em ordem os .sql de migracoes/ que ainda não rodaram.
   Cada arquivo roda numa transação; migração aplicada nunca se edita — cria-se outra. */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { criarBanco } from './banco.js';
import { lerConfig } from './config.js';

const PASTA = fileURLToPath(new URL('./migracoes/', import.meta.url));

export async function migrar(banco, log = console.log) {
  await banco.consulta(`CREATE TABLE IF NOT EXISTS migracao (
    nome text PRIMARY KEY, aplicada_em timestamptz NOT NULL DEFAULT now())`);
  const feitas = new Set((await banco.todos('SELECT nome FROM migracao')).map(r => r.nome));
  const arquivos = (await readdir(PASTA)).filter(f => f.endsWith('.sql')).sort();
  for (const f of arquivos) {
    if (feitas.has(f)) continue;
    const sql = await readFile(PASTA + f, 'utf8');
    await banco.transacao(async c => {
      await c.query(sql);
      await c.query('INSERT INTO migracao (nome) VALUES ($1)', [f]);
    });
    log(`migração aplicada: ${f}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const banco = criarBanco(lerConfig().urlBanco);
  migrar(banco).then(() => banco.fechar(), err => { console.error(err); process.exit(1); });
}
