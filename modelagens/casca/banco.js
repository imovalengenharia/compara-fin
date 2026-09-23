import pg from 'pg';

export function criarBanco(url) {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  return {
    pool,
    consulta: (sql, params) => pool.query(sql, params),
    async um(sql, params) { return (await pool.query(sql, params)).rows[0] || null; },
    async todos(sql, params) { return (await pool.query(sql, params)).rows; },
    async transacao(fn) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const r = await fn(c);
        await c.query('COMMIT');
        return r;
      } catch (err) {
        await c.query('ROLLBACK');
        throw err;
      } finally { c.release(); }
    },
    fechar: () => pool.end(),
  };
}
