import { prepareMessageContent } from "./whatsapp.js";

/**
 * Envia uma mensagem da Kyara passando pelo
 * sistema central de emojis.
 *
 * Uso:
 *
 * await sendKyaraMessage(sock, jid, {
 *   text: "Oi :hug:"
 * });
 */
export async function sendKyaraMessage(sock, jid, content, options = {}) {
  if (!sock) {
    throw new Error("sendKyaraMessage: sock não informado");
  }

  if (!jid) {
    throw new Error("sendKyaraMessage: jid não informado");
  }

  const prepared = prepareMessageContent(content);

  return sock.sendMessage(
    jid,
    prepared,
    options
  );
}

export default sendKyaraMessage;
