/* Estudos: o registro que a casca guarda por modelagem. A casca não lê as
   premissas — guarda o JSON que o módulo devolve e o entrega de volta ao abrir. */
import { criarPastas, lerDestino, uuidValido } from '../pastas.js';
import { paginaEstudo } from '../paginas/paginas.js';
import { moduloExiste } from '../modulos.js';
import { voltarPara, lerNome } from './pastas.js';

export default async function rotasEstudos(app) {
  const { config, banco } = app;
  const P = criarPastas(banco);
  app.addHook('onRequest', app.exigirLogin);

  const estudo = (uid, id) => uuidValido(id)
    ? banco.um('SELECT id, pasta_id, nome, modulo FROM estudo WHERE usuario_id = $1 AND id = $2', [uid, id])
    : null;

  app.post('/estudos', async (req, reply) => {
    const uid = req.usuario.id;
    const pasta = lerDestino(req.body?.pasta);
    const nome = lerNome(req.body?.nome, 160);
    const modulo = String(req.body?.modulo || '');
    if (pasta === undefined || (pasta && !(await P.pasta(uid, pasta)))) return reply.redirect(voltarPara(null, 'destino'), 303);
    if (!nome) return reply.redirect(voltarPara(pasta, 'nome'), 303);
    if (!moduloExiste(modulo)) return reply.redirect(voltarPara(pasta, 'modulo'), 303);
    const novo = await banco.um(
      `INSERT INTO estudo (usuario_id, pasta_id, modulo, nome) VALUES ($1, $2, $3, $4) RETURNING id`,
      [uid, pasta, modulo, nome]);
    return reply.redirect(`/estudos/${novo.id}`, 303);
  });

  app.get('/estudos/:id', async (req, reply) => {
    const e = await estudo(req.usuario.id, req.params.id);
    if (!e || !moduloExiste(e.modulo)) return reply.callNotFound();
    const caminho = await P.caminho(req.usuario.id, e.pasta_id);
    return reply.pagina(paginaEstudo(config, req.usuario, { estudo: e, caminho }));
  });

  app.post('/estudos/:id/renomear', async (req, reply) => {
    const e = await estudo(req.usuario.id, req.params.id);
    if (!e) return reply.callNotFound();
    const nome = lerNome(req.body?.nome, 160);
    if (!nome) return reply.redirect(voltarPara(e.pasta_id, 'nome'), 303);
    await banco.consulta('UPDATE estudo SET nome = $1 WHERE id = $2', [nome, e.id]);
    return reply.redirect(voltarPara(e.pasta_id), 303);
  });

  app.post('/estudos/:id/mover', async (req, reply) => {
    const uid = req.usuario.id;
    const e = await estudo(uid, req.params.id);
    if (!e) return reply.callNotFound();
    const destino = lerDestino(req.body?.destino);
    if (destino === undefined || (destino && !(await P.pasta(uid, destino)))) {
      return reply.redirect(voltarPara(e.pasta_id, 'destino'), 303);
    }
    await banco.consulta('UPDATE estudo SET pasta_id = $1 WHERE id = $2', [destino, e.id]);
    return reply.redirect(voltarPara(destino), 303);
  });

  app.post('/estudos/:id/apagar', async (req, reply) => {
    const e = await estudo(req.usuario.id, req.params.id);
    if (!e) return reply.callNotFound();
    await banco.consulta('DELETE FROM estudo WHERE id = $1', [e.id]);
    return reply.redirect(voltarPara(e.pasta_id, 'apagada'), 303);
  });

  /* ------------------------------------------------------ a ponte com o módulo */

  /* O que a casca entrega ao módulo: quem é o usuário e qual estudo abrir. */
  app.get('/api/estudos/:id', async (req, reply) => {
    if (!uuidValido(req.params.id)) return reply.callNotFound();
    const e = await banco.um(
      `SELECT id, nome, modulo, premissas, atualizado_em FROM estudo WHERE usuario_id = $1 AND id = $2`,
      [req.usuario.id, req.params.id]);
    if (!e) return reply.callNotFound();
    return {
      usuario: { nome: req.usuario.nome },
      estudo: { id: e.id, nome: e.nome, modulo: e.modulo, premissas: e.premissas, atualizadoEm: e.atualizado_em },
    };
  });

  /* O que o módulo devolve: o estudo em JSON, inteiro, cada vez que muda. */
  app.put('/api/estudos/:id/premissas', async (req, reply) => {
    const premissas = req.body?.premissas;
    if (!premissas || typeof premissas !== 'object' || Array.isArray(premissas)) {
      return reply.code(400).send({ erro: 'premissas deve ser um objeto JSON' });
    }
    if (!uuidValido(req.params.id)) return reply.callNotFound();
    const r = await banco.um(
      `UPDATE estudo SET premissas = $1, atualizado_em = now()
        WHERE usuario_id = $2 AND id = $3 RETURNING atualizado_em`,
      [premissas, req.usuario.id, req.params.id]);
    if (!r) return reply.callNotFound();
    return { atualizadoEm: r.atualizado_em };
  });
}
