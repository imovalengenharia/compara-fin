/* Pastas de trabalho: um dono, pode conter outras pastas e estudos. */
import { criarPastas, lerDestino } from '../pastas.js';
import { paginaPastas } from '../paginas/paginas.js';

/* O recado de uma ação volta pela URL como código, nunca como texto livre. */
export const RECADOS = {
  'pasta-nao-vazia': ['erro', 'A pasta não está vazia. Mova ou apague o que há dentro dela antes.'],
  'ciclo': ['erro', 'Uma pasta não pode ir para dentro dela mesma.'],
  'destino': ['erro', 'Pasta de destino não encontrada.'],
  'nome': ['erro', 'Informe um nome.'],
  'modulo': ['erro', 'Modelagem desconhecida.'],
  'apagada': ['ok', 'Apagado.'],
};

export const voltarPara = (pastaId, recado) =>
  (pastaId ? `/pastas/${pastaId}` : '/pastas') + (recado ? `?r=${recado}` : '');

export const lerNome = (v, max) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

/* Move e cria pastas sob um trava por usuário: dois movimentos simultâneos
   (A para dentro de B e B para dentro de A) não conseguem fechar um ciclo. */
export async function travar(c, uid) {
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [uid]);
}

export default async function rotasPastas(app) {
  const { config, banco } = app;
  const P = criarPastas(banco);
  app.addHook('onRequest', app.exigirLogin);

  async function mostrar(req, reply, pasta) {
    const uid = req.usuario.id;
    const [[pastas, estudos], caminho, destinos] = await Promise.all([
      P.conteudo(uid, pasta ? pasta.id : null),
      P.caminho(uid, pasta ? pasta.pai_id : null),
      P.arvore(uid),
    ]);
    const [tipo, texto] = RECADOS[req.query.r] || [];
    return reply.pagina(paginaPastas(config, req.usuario, {
      pasta, caminho, pastas, estudos, destinos,
      erro: tipo === 'erro' ? texto : '', ok: tipo === 'ok' ? texto : '',
    }));
  }

  app.get('/pastas', (req, reply) => mostrar(req, reply, null));

  app.get('/pastas/:id', async (req, reply) => {
    const pasta = await P.pasta(req.usuario.id, req.params.id);
    if (!pasta) return reply.callNotFound();
    return mostrar(req, reply, pasta);
  });

  app.post('/pastas', async (req, reply) => {
    const uid = req.usuario.id;
    const pai = lerDestino(req.body?.pai);
    const nome = lerNome(req.body?.nome, 120);
    if (pai === undefined || (pai && !(await P.pasta(uid, pai)))) return reply.redirect(voltarPara(null, 'destino'), 303);
    if (!nome) return reply.redirect(voltarPara(pai, 'nome'), 303);
    const nova = await banco.um(
      'INSERT INTO pasta (usuario_id, pai_id, nome) VALUES ($1, $2, $3) RETURNING id', [uid, pai, nome]);
    return reply.redirect(`/pastas/${nova.id}`, 303);
  });

  app.post('/pastas/:id/renomear', async (req, reply) => {
    const pasta = await P.pasta(req.usuario.id, req.params.id);
    if (!pasta) return reply.callNotFound();
    const nome = lerNome(req.body?.nome, 120);
    if (!nome) return reply.redirect(voltarPara(pasta.pai_id, 'nome'), 303);
    await banco.consulta('UPDATE pasta SET nome = $1 WHERE id = $2', [nome, pasta.id]);
    return reply.redirect(voltarPara(pasta.pai_id), 303);
  });

  app.post('/pastas/:id/mover', async (req, reply) => {
    const uid = req.usuario.id;
    const pasta = await P.pasta(uid, req.params.id);
    if (!pasta) return reply.callNotFound();
    const destino = lerDestino(req.body?.destino);
    if (destino === undefined) return reply.redirect(voltarPara(pasta.pai_id, 'destino'), 303);
    const recado = await banco.transacao(async c => {
      await travar(c, uid);
      if (destino) {
        const d = (await c.query('SELECT 1 FROM pasta WHERE usuario_id = $1 AND id = $2', [uid, destino])).rows[0];
        if (!d) return 'destino';
        const ciclo = (await c.query(
          `WITH RECURSIVE sobe AS (
             SELECT id, pai_id FROM pasta WHERE usuario_id = $1 AND id = $3
             UNION ALL
             SELECT p.id, p.pai_id FROM pasta p JOIN sobe s ON p.id = s.pai_id WHERE p.usuario_id = $1)
           SELECT 1 FROM sobe WHERE id = $2 LIMIT 1`, [uid, pasta.id, destino])).rows[0];
        if (ciclo) return 'ciclo';
      }
      await c.query('UPDATE pasta SET pai_id = $1 WHERE id = $2', [destino, pasta.id]);
      return null;
    });
    return reply.redirect(voltarPara(recado ? pasta.pai_id : destino, recado), 303);
  });

  /* Pasta com conteúdo não se apaga: nenhum estudo some por tabela. */
  app.post('/pastas/:id/apagar', async (req, reply) => {
    const uid = req.usuario.id;
    const pasta = await P.pasta(uid, req.params.id);
    if (!pasta) return reply.callNotFound();
    const recado = await banco.transacao(async c => {
      await travar(c, uid);
      const r = await c.query(
        `DELETE FROM pasta p WHERE p.id = $1
            AND NOT EXISTS (SELECT 1 FROM pasta f WHERE f.pai_id = p.id)
            AND NOT EXISTS (SELECT 1 FROM estudo e WHERE e.pasta_id = p.id)`, [pasta.id]);
      return r.rowCount ? 'apagada' : 'pasta-nao-vazia';
    });
    return reply.redirect(voltarPara(recado === 'apagada' ? pasta.pai_id : pasta.id, recado), 303);
  });
}
