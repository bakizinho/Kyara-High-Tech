/**
 * KYARA HTML GAME
 */

import crypto from "node:crypto";

import {
  generateWAMessageFromContent
} from "baileys";


export const HTML_GAME_PRIMITIVE =
  "GenAIaeacdsnwHtmlPrimitive";


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

  if (
    typeof html !==
    "string"
  ) {

    throw new TypeError(
      "HTML inválido"
    );

  }

  const value =
    html
      .replace(
        /^\uFEFF/,
        ""
      )
      .trim();


  if (!value) {

    throw new TypeError(
      "HTML vazio"
    );

  }


  return value;

}


export function buildHtmlGameMessage(
  html,
  {
    submessageText =
      "KYARA HTML GAME",

    url = "",

    trustedSources = []

  } = {}
) {

  const payload =
    normalizeHtml(
      html
    );


  const trusted =
    Array.isArray(
      trustedSources
    )

      ? trustedSources
          .map(
            value =>
              String(
                value || ""
              ).trim()
          )
          .filter(Boolean)

      : [];


  const unifiedData = {

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

            ...(url
              ? {
                  url:
                    String(url)
                }
              : {}),

            trusted_sources:
              trusted

          }

        }

      }

    ]

  };


  return {

    messageContextInfo: {

      deviceListMetadata: {},

      deviceListMetadataVersion:
        2,

      botMetadata: {

        messageDisclaimerText:
          "",

        botResponseId:
          crypto.randomUUID(),

        verificationMetadata: {

          proofs: [

            {

              version:
                1,

              useCase:
                1,

              signature:
                "...",

              certificateChain: [
                "...",
                "...",
                "..."
              ]

            }

          ]

        }

      }

    },


    botForwardedMessage: {

      message: {

        richResponseMessage: {

          messageType:
            1,

          submessages: [

            {

              messageType:
                2,

              messageText:
                submessageText

            }

          ],


          unifiedResponse: {

            data:

              Buffer.from(

                JSON.stringify(
                  unifiedData
                ),

                "utf8"

              )

          },


          contextInfo: {

            forwardingScore:
              1,

            isForwarded:
              true,

            forwardedAiBotMessageInfo: {

              botJid:
                "867051314767696@bot"

            },

            forwardOrigin:
              4

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


  const msg =
    generateWAMessageFromContent(
      jid,
      content,
      {
        quoted:
          options.quoted ||
          options.info,

        messageId:
          options.messageId
      }
    );


  if (
    !msg ||
    !msg.message ||
    !msg.message.botForwardedMessage ||
    !msg.message.botForwardedMessage.message ||
    !msg.message.botForwardedMessage.message.richResponseMessage
  ) {
    throw new Error(
      "Rich HTML inválido após gerar a mensagem."
    );
  }

  const rich =
    msg.message
      .botForwardedMessage
      .message
      .richResponseMessage;

  if (
    !rich.unifiedResponse ||
    !rich.unifiedResponse.data
  ) {
    throw new Error(
      "unifiedResponse.data não foi gerado."
    );
  }

  console.log(
    "[HTML] payload Rich HTML:",
    rich.unifiedResponse.data.length,
    "bytes"
  );


  await socket.relayMessage(
    jid,
    msg.message,
    {
      messageId:
        msg.key.id
    }
  );


  console.log(
    "[HTML] ✅ Rich HTML relay enviado"
  );


  return true;

}


export async function sendHtmlGameFromOptions(
  options = {},
  html,
  config = {}
) {

  return sendHtmlGame(

    getSocket(
      options
    ),

    getJid(
      options
    ),

    html,

    {

      ...config,

      info:
        options.info

    }

  );

}
