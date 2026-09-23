/* HTML por template literal: tudo o que é interpolado sai escapado, exceto o
   que já veio de outro html`` (marcado como seguro). Nada de motor de template. */
const SEGURO = Symbol('html');

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapar = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

function valor(v) {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(valor).join('');
  if (v[SEGURO]) return v.texto;
  return escapar(v);
}

export function html(partes, ...vals) {
  let texto = partes[0];
  vals.forEach((v, i) => { texto += valor(v) + partes[i + 1]; });
  return { [SEGURO]: true, texto, toString() { return texto; } };
}

export const cru = texto => ({ [SEGURO]: true, texto, toString() { return texto; } });
