/* Sem SMTP configurado, o e-mail vai para o log — é o modo de desenvolvimento. */
import nodemailer from 'nodemailer';

export function criarCorreio(config, log) {
  if (!config.smtp) {
    return {
      enviados: [],
      async enviar(m) {
        this.enviados.push(m);
        log.info({ para: m.para, assunto: m.assunto }, `e-mail (sem SMTP):\n${m.texto}`);
      },
    };
  }
  const t = nodemailer.createTransport(config.smtp);
  return {
    async enviar(m) {
      await t.sendMail({ from: config.remetente, to: m.para, subject: m.assunto, text: m.texto });
    },
  };
}
