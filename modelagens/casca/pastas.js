/* Consultas de pastas e estudos. Toda consulta leva o usuario_id: o que não é
   do usuário simplesmente não existe para ele (404, nunca 403). */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuidValido = v => typeof v === 'string' && UUID.test(v);

/* "" ou ausente = raiz (null); id malformado = undefined, que as rotas tratam como inexistente. */
export function lerDestino(v) {
  if (v === undefined || v === null || v === '') return null;
  return uuidValido(v) ? v : undefined;
}

export function criarPastas(banco) {
  return {
    pasta: (uid, id) => uuidValido(id)
      ? banco.um('SELECT id, pai_id, nome FROM pasta WHERE usuario_id = $1 AND id = $2', [uid, id])
      : null,

    /* Da raiz até a pasta, inclusive. */
    async caminho(uid, id) {
      if (!id) return [];
      return banco.todos(
        `WITH RECURSIVE sobe AS (
           SELECT id, pai_id, nome, 0 AS n FROM pasta WHERE usuario_id = $1 AND id = $2
           UNION ALL
           SELECT p.id, p.pai_id, p.nome, s.n + 1 FROM pasta p JOIN sobe s ON p.id = s.pai_id
            WHERE p.usuario_id = $1)
         SELECT id, nome FROM sobe ORDER BY n DESC`, [uid, id]);
    },

    conteudo(uid, id) {
      return Promise.all([
        banco.todos(
          `SELECT p.id, p.pai_id, p.nome,
                  ((SELECT count(*) FROM pasta f WHERE f.pai_id = p.id) +
                   (SELECT count(*) FROM estudo e WHERE e.pasta_id = p.id))::int AS itens
             FROM pasta p WHERE p.usuario_id = $1 AND p.pai_id IS NOT DISTINCT FROM $2
            ORDER BY lower(p.nome)`, [uid, id]),
        banco.todos(
          `SELECT id, pasta_id, nome, modulo, atualizado_em FROM estudo
            WHERE usuario_id = $1 AND pasta_id IS NOT DISTINCT FROM $2
            ORDER BY lower(nome)`, [uid, id]),
      ]);
    },

    /* A árvore inteira, em ordem de leitura, para os menus de "mover para". */
    async arvore(uid) {
      const todas = await banco.todos(
        'SELECT id, pai_id, nome FROM pasta WHERE usuario_id = $1 ORDER BY lower(nome)', [uid]);
      const filhos = new Map();
      todas.forEach(p => {
        if (!filhos.has(p.pai_id)) filhos.set(p.pai_id, []);
        filhos.get(p.pai_id).push(p);
      });
      const saida = [];
      (function descer(pai, nivel) {
        (filhos.get(pai) || []).forEach(p => { saida.push({ ...p, nivel }); descer(p.id, nivel + 1); });
      })(null, 0);
      return saida;
    },
  };
}
