/**
 * KYARA HTML GAME
 *
 * Único mecanismo de envio dos jogos Rich HTML.
 */

import crypto from "node:crypto";
import {
  generateWAMessageFromContent
} from "baileys";

export const HTML_GAME_PRIMITIVE =
  "GenAIaeacdsnwHtmlPrimitive";

export const HTML_GAME_TRUSTED_SOURCES = [];

function getJid(options = {}) {
  return (
    options.from ||
    options.remoteJid ||
    options.info?.key?.remoteJid
  );
}

function getSocket(options = {}) {
  return (
    options.sock ||
    options.nazu ||
    options.socket
  );
}

function normalizeHtml(html) {
  if (typeof html !== "string") {
    throw new TypeError(
      "O HTML do jogo precisa ser uma string."
    );
  }

  const value = html
    .replace(/^\uFEFF/, "")
    .trim();

  if (!value) {
    throw new TypeError(
      "O HTML do jogo está vazio."
    );
  }

  return value;
}

export function buildHtmlGameMessage(
  html,
  {
    submessageText = "KYARA HTML GAME"
  } = {}
) {

  const payload =
    normalizeHtml(html);

  /*
   * Estrutura Unified Response.
   *
   * IMPORTANTE:
   * data precisa ser a representação Base64
   * do JSON serializado.
   */

  const unifiedResponse = {
    __typename:
      "GenAIUnifiedResponse",

    response_id:
      crypto.randomUUID(),

    sections: [
      {
        __typename:
          "GenAIUnifiedResponseSection",

        view_model: {
          __typename:
            "GenAISingleLayoutViewModel",

          primitive: {
            __typename:
              HTML_GAME_PRIMITIVE,

            payload,

            trusted_sources:
              [
                ...HTML_GAME_TRUSTED_SOURCES
              ]
          }
        }
      }
    ]
  };

  const data =
    Buffer
      .from(
        JSON.stringify(
          unifiedResponse
        ),
        "utf8"
      )
      .toString("base64");

  return {

    messageContextInfo: {

      deviceListMetadata: {},

      deviceListMetadataVersion: 2,

      botMetadata: {

        messageDisclaimerText: "",

        botResponseId:
          crypto.randomUUID(),

        verificationMetadata: {
          proofs: []
        }
      }
    },

    botForwardedMessage: {

      message: {

        richResponseMessage: {

          messageType: 1,

          submessages: [
            {
              messageType: 2,

              messageText:
                String(
                  submessageText ||
                  "KYARA HTML GAME"
                )
            }
          ],

          unifiedResponse: {
            data
          },

          contextInfo: {

            mentionedJid: [],

            groupMentions: [],

            statusAttributions: [],

            forwardingScore: 1,

            isForwarded: true,

            forwardedAiBotMessageInfo: {

              botJid:
                "867051314767696@bot"
            },

            forwardOrigin: 4
          }
        }
      }
    }
  };
}

export async function sendHtmlGame(
  socket,
  jid,
  html,
  options = {}
) {

  if (
    !socket ||
    typeof socket.relayMessage !==
      "function"
  ) {
    throw new Error(
      "Socket da Kyara não possui relayMessage()."
    );
  }

  if (!jid) {
    throw new Error(
      "JID do chat não encontrado."
    );
  }

  const content =
    buildHtmlGameMessage(
      html,
      options
    );

  const message =
    generateWAMessageFromContent(
      jid,
      content,
      {
        quoted:
          options.quoted ||
          options.info
      }
    );

  await socket.relayMessage(
    jid,
    message.message,
    {
      messageId:
        message.key.id
    }
  );

  return true;
}

export async function sendHtmlGameFromOptions(
  options = {},
  html,
  config = {}
) {

  const socket =
    getSocket(options);

  const jid =
    getJid(options);

  return sendHtmlGame(
    socket,
    jid,
    html,
    {
      ...config,

      quoted:
        options.info
    }
  );
}
