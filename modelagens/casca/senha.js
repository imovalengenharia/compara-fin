/* Hash de senha com scrypt, do próprio Node: nenhuma dependência nativa.
   Formato guardado: scrypt$N$r$p$sal$hash (base64url), para poder subir o custo depois. */
import { scrypt as scryptCb, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const N = 2 ** 15, R = 8, P = 1, TAM = 64;
const MAXMEM = 64 * 1024 * 1024;

export const SENHA_MINIMO = 10;

export async function gerarHash(senha) {
  const sal = randomBytes(16);
  const h = await scrypt(senha.normalize('NFKC'), sal, TAM, { N, r: R, p: P, maxmem: MAXMEM });
  return ['scrypt', N, R, P, sal.toString('base64url'), h.toString('base64url')].join('$');
}

export async function conferirSenha(senha, guardado) {
  const [alg, n, r, p, sal, hash] = String(guardado).split('$');
  if (alg !== 'scrypt') return false;
  const esperado = Buffer.from(hash, 'base64url');
  const h = await scrypt(senha.normalize('NFKC'), Buffer.from(sal, 'base64url'), esperado.length,
    { N: +n, r: +r, p: +p, maxmem: MAXMEM });
  return timingSafeEqual(h, esperado);
}

/* Para quando o e-mail não existe: gasta o mesmo tempo, e o tempo de resposta
   não revela quem tem conta. */
let hashFalso;
export async function conferirContraNada(senha) {
  hashFalso ??= await gerarHash('senha-que-ninguem-tem');
  await conferirSenha(senha, hashFalso);
  return false;
}

/* Tokens de sessão e de recuperação: aleatórios no cliente, só o sha256 no banco. */
export function novoToken() { return randomBytes(32).toString('base64url'); }
export function hashToken(t) { return createHash('sha256').update(String(t)).digest('hex'); }
