/**
 * KYARA EMOJI — WhatsApp
 *
 * Camada responsável por preparar textos antes de
 * serem enviados pelo WhatsApp.
 *
 * IMPORTANTE:
 * O WhatsApp continuará renderizando o Unicode
 * de acordo com o cliente de quem recebe.
 */

import { normalizeEmojiText } from "./renderer.js";

/**
 * Prepara o texto da Kyara para envio.
 *
 * Exemplos:
 *   :hug:       -> 🫂
 *   :heart:     -> ❤️
 *   :fire:      -> 🔥
 */
export function prepareEmojiMessage(text) {
  if (typeof text !== "string") {
    return text;
  }

  return normalizeEmojiText(text);
}

/**
 * Prepara uma mensagem completa do bot.
 */
export function prepareMessageContent(content) {
  if (!content || typeof content !== "object") {
    return content;
  }

  if (typeof content.text === "string") {
    return {
      ...content,
      text: prepareEmojiMessage(content.text)
    };
  }

  return content;
}

export default {
  prepareEmojiMessage,
  prepareMessageContent
};
