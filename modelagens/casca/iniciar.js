import { lerConfig } from './config.js';
import { criarBanco } from './banco.js';
import { migrar } from './migrar.js';
import { criarServidor } from './servidor.js';

const config = lerConfig();
const banco = criarBanco(config.urlBanco);
await migrar(banco);
const app = await criarServidor({ config, banco });
await app.listen({ port: config.porta, host: '0.0.0.0' });

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.once(sinal, async () => { await app.close(); await banco.fechar(); process.exit(0); });
}
