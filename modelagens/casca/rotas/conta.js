/* Autenticação: cadastro, entrar, sair, recuperação de senha por e-mail.
   Um login é uma pessoa — não há convite nem usuário sob a conta de outro. */
import { gerarHash, conferirSenha, conferirContraNada, novoToken, hashToken, SENHA_MINIMO } from '../senha.js';
import { paginaEntrar, paginaCadastro, paginaRecuperar, paginaRedefinir } from '../paginas/paginas.js';
import { COOKIE_SESSAO } from '../config.js';

const normalizarEmail = e => String(e || '').trim().toLowerCase();
const emailValido = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;

/* Só volta para caminho interno: "/pastas/x", nunca "//outro.site" nem URL absoluta. */
const destinoSeguro = v => (typeof v === 'string' && /^\/(?![/\\])/.test(v)) ? v : '/pastas';

/* Freio contra adivinhação de senha, em memória: 10 falhas em 15 minutos por
   e-mail, 50 por IP (um escritório inteiro sai pelo mesmo IP). */
const JANELA = 15 * 60 * 1000;
const limite = k => k.startsWith('ip:') ? 50 : 10;
function criarFreio() {
  const falhas = new Map();
  const vivas = k => (falhas.get(k) || []).filter(t => Date.now() - t < JANELA);
  return {
    bloqueado: (...ks) => ks.some(k => vivas(k).length >= limite(k)),
    falhou(...ks) { ks.forEach(k => falhas.set(k, [...vivas(k), Date.now()])); },
    limpar(...ks) { ks.forEach(k => falhas.delete(k)); },
  };
}

export default async function rotasConta(app) {
  const { config, banco } = app;
  const freio = criarFreio();

  async function abrirSessao(reply, usuarioId) {
    const token = novoToken();
    await banco.consulta(
      `INSERT INTO sessao (token_hash, usuario_id, expira_em)
       VALUES ($1, $2, now() + make_interval(days => $3))`,
      [hashToken(token), usuarioId, config.sessaoDias]);
    reply.setCookie(COOKIE_SESSAO, token, {
      path: '/', httpOnly: true, sameSite: 'lax', secure: config.producao,
      maxAge: config.sessaoDias * 86400,
    });
  }

  /* ------------------------------------------------------------ entrar */
  app.get('/entrar', async (req, reply) => {
    if (req.usuario) return reply.redirect('/pastas');
    const ok = req.query.senha === 'nova' ? 'Senha alterada. Entre com a senha nova.' : '';
    return reply.pagina(paginaEntrar(config, { ok, voltar: destinoSeguro(req.query.voltar) }));
  });

  app.post('/entrar', async (req, reply) => {
    const email = normalizarEmail(req.body?.email);
    const senha = String(req.body?.senha || '');
    const voltar = destinoSeguro(req.body?.voltar);
    const chaves = ['e:' + email, 'ip:' + req.ip];
    if (freio.bloqueado(...chaves)) {
      return reply.pagina(paginaEntrar(config, { email, voltar,
        erro: 'Muitas tentativas. Aguarde alguns minutos ou recupere a senha.' }), 429);
    }
    const u = await banco.um('SELECT id, senha_hash FROM usuario WHERE email = $1', [email]);
    const certo = u ? await conferirSenha(senha, u.senha_hash) : await conferirContraNada(senha);
    if (!certo) {
      freio.falhou(...chaves);
      return reply.pagina(paginaEntrar(config, { email, voltar, erro: 'E-mail ou senha não conferem.' }), 401);
    }
    freio.limpar(chaves[0]);
    await abrirSessao(reply, u.id);
    return reply.redirect(voltar, 303);
  });

  /* ---------------------------------------------------------- cadastro */
  app.get('/cadastro', async (req, reply) => {
    if (req.usuario) return reply.redirect('/pastas');
    return reply.pagina(paginaCadastro(config, {}, SENHA_MINIMO));
  });

  app.post('/cadastro', async (req, reply) => {
    const nome = String(req.body?.nome || '').trim().slice(0, 120);
    const email = normalizarEmail(req.body?.email);
    const senha = String(req.body?.senha || '');
    const falha = erro => reply.pagina(paginaCadastro(config, { nome, email, erro }, SENHA_MINIMO), 400);

    if (!nome) return falha('Informe o nome.');
    if (!emailValido(email)) return falha('E-mail inválido.');
    if (senha.length < SENHA_MINIMO) return falha(`A senha precisa de pelo menos ${SENHA_MINIMO} caracteres.`);
    if (senha.length > 200) return falha('Senha longa demais.');

    const hash = await gerarHash(senha);
    const u = await banco.um(
      `INSERT INTO usuario (email, nome, senha_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING RETURNING id`, [email, nome, hash]);
    if (!u) return falha('Já existe uma conta com este e-mail. Entre, ou recupere a senha.');
    await abrirSessao(reply, u.id);
    return reply.redirect('/pastas', 303);
  });

  /* -------------------------------------------------------------- sair */
  app.post('/sair', async (req, reply) => {
    const token = req.cookies[COOKIE_SESSAO];
    if (token) await banco.consulta('DELETE FROM sessao WHERE token_hash = $1', [hashToken(token)]);
    reply.clearCookie(COOKIE_SESSAO, { path: '/' });
    return reply.redirect('/entrar', 303);
  });

  /* ------------------------------------------------------- recuperação */
  app.get('/recuperar', async (req, reply) => reply.pagina(paginaRecuperar(config)));

  /* A resposta é a mesma exista ou não a conta: a tela não confirma quem é cliente. */
  app.post('/recuperar', async (req, reply) => {
    const email = normalizarEmail(req.body?.email);
    const u = emailValido(email) && !freio.bloqueado('r:' + req.ip, 'r:' + email)
      ? await banco.um('SELECT id, nome FROM usuario WHERE email = $1', [email]) : null;
    freio.falhou('r:' + req.ip, 'r:' + email);
    if (u) {
      const token = novoToken();
      await banco.consulta(
        `INSERT INTO recuperacao_senha (token_hash, usuario_id, expira_em)
         VALUES ($1, $2, now() + make_interval(mins => $3))`,
        [hashToken(token), u.id, config.recuperacaoMinutos]);
      const link = `${config.urlPublica}/redefinir?t=${token}`;
      try {
        await app.correio.enviar({ para: email, assunto: `${config.nome}: criar uma senha nova`,
          texto: `Olá, ${u.nome}.\n\nPara criar uma senha nova, abra o link abaixo. ` +
                 `Ele vale por uma hora e só pode ser usado uma vez.\n\n${link}\n\n` +
                 `Se não foi você quem pediu, ignore esta mensagem: a senha atual continua valendo.\n` });
      } catch (err) { req.log.error(err, 'falha ao enviar e-mail de recuperação'); }
    }
    return reply.pagina(paginaRecuperar(config, { enviado: true, email }));
  });

  const tokenValido = t => banco.um(
    `SELECT token_hash, usuario_id FROM recuperacao_senha
      WHERE token_hash = $1 AND usada_em IS NULL AND expira_em > now()`, [hashToken(t)]);

  app.get('/redefinir', async (req, reply) => {
    const t = String(req.query.t || '');
    const r = t && await tokenValido(t);
    return reply.pagina(paginaRedefinir(config, { token: t, invalido: !r }, SENHA_MINIMO), r ? 200 : 400);
  });

  app.post('/redefinir', async (req, reply) => {
    const t = String(req.body?.token || '');
    const senha = String(req.body?.senha || '');
    if (senha.length < SENHA_MINIMO || senha.length > 200) {
      return reply.pagina(paginaRedefinir(config, { token: t,
        erro: `A senha precisa de pelo menos ${SENHA_MINIMO} caracteres.` }, SENHA_MINIMO), 400);
    }
    const hash = await gerarHash(senha);
    /* Marca o token como usado na mesma transação que troca a senha: dois
       envios simultâneos do mesmo link não trocam a senha duas vezes. */
    const feito = await banco.transacao(async c => {
      const r = (await c.query(
        `UPDATE recuperacao_senha SET usada_em = now()
          WHERE token_hash = $1 AND usada_em IS NULL AND expira_em > now()
          RETURNING usuario_id`, [hashToken(t)])).rows[0];
      if (!r) return false;
      await c.query('UPDATE usuario SET senha_hash = $1 WHERE id = $2', [hash, r.usuario_id]);
      await c.query('DELETE FROM sessao WHERE usuario_id = $1', [r.usuario_id]);
      await c.query('UPDATE recuperacao_senha SET usada_em = now() WHERE usuario_id = $1 AND usada_em IS NULL',
        [r.usuario_id]);
      return true;
    });
    if (!feito) return reply.pagina(paginaRedefinir(config, { invalido: true }, SENHA_MINIMO), 400);
    reply.clearCookie(COOKIE_SESSAO, { path: '/' });
    return reply.redirect('/entrar?senha=nova', 303);
  });
}
