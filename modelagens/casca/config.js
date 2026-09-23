/* Tudo o que muda entre máquinas vem do ambiente. */
const producao = process.env.NODE_ENV === 'production';

function exigir(nome, padraoDev) {
  const v = process.env[nome];
  if (v) return v;
  if (producao) throw new Error(`variável de ambiente ${nome} não definida`);
  return padraoDev;
}

export function lerConfig(sobrepor = {}) {
  const c = {
    producao,
    nome: process.env.PLATAFORMA_NOME || 'Modelagens',
    urlBanco: exigir('DATABASE_URL', 'postgres://modelagens:modelagens@localhost:5432/modelagens'),
    urlPublica: (process.env.URL_PUBLICA || 'http://localhost:3000').replace(/\/$/, ''),
    porta: Number(process.env.PORTA || process.env.PORT || 3000),
    smtp: process.env.SMTP_URL || null,
    remetente: process.env.EMAIL_REMETENTE || 'Modelagens <nao-responda@localhost>',
    sessaoDias: 30,
    recuperacaoMinutos: 60,
    ...sobrepor,
  };
  return c;
}

export const COOKIE_SESSAO = 'sessao';
