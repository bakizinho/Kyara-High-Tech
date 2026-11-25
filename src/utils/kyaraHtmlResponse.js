/**
 * ============================================================
 * KYARA HTML RESPONSE
 * ============================================================
 *
 * Envia uma interface HTML Rich Response compatível com
 * o primitive utilizado pelos jogos HTML da Kyara.
 *
 * Não depende de API paga.
 * ============================================================
 */

import { randomUUID } from 'node:crypto';

export const KYARA_HTML_PRIMITIVE =
  'GenAIaeacdsnwHtmlPrimitive';

export const KYARA_HTML_TRUSTED_SOURCES = [
  'nixel.dev'
];

function normalizeHtml(html) {
  if (
    typeof html !== 'string' ||
    !html.trim()
  ) {
    throw new TypeError(
      'O HTML precisa ser uma string não vazia.'
    );
  }

  return html.trim();
}

export function buildKyaraHtmlMessage(
  html,
  {
    submessageText = 'KYARA BROWSER'
  } = {}
) {
  const payload =
    normalizeHtml(html);

  const unifiedResponse = {
    response_id: randomUUID(),

    sections: [
      {
        view_model: {
          primitive: {
            __typename:
              KYARA_HTML_PRIMITIVE,

            payload,

            trusted_sources:
              [
                ...KYARA_HTML_TRUSTED_SOURCES
              ]
          },

          __typename:
            'GenAISingleLayoutViewModel'
        }
      }
    ]
  };

  return {
    botForwardedMessage: {
      message: {
        richResponseMessage: {

          submessages: [
            {
              messageType: 2,

              messageText:
                String(
                  submessageText ||
                  'KYARA BROWSER'
                )
            }
          ],

          messageType: 1,

          unifiedResponse: {
            data:
              Buffer.from(
                JSON.stringify(
                  unifiedResponse
                ),
                'utf8'
              )
          },

          contextInfo: {
            mentionedJid: [],
            groupMentions: [],
            statusAttributions: [],

            forwardingScore: 1,

            isForwarded: true,

            forwardedAiBotMessageInfo: {
              botJid:
                '867051314767696@bot'
            },

            forwardOrigin: 4
          }
        }
      }
    }
  };
}

export async function sendKyaraHtml(
  socket,
  jid,
  html,
  options = {}
) {
  if (
    !socket ||
    typeof socket.relayMessage !== 'function'
  ) {
    throw new Error(
      'Socket da Kyara não possui relayMessage().'
    );
  }

  return socket.relayMessage(
    jid,
    buildKyaraHtmlMessage(
      html,
      options
    )
  );
}
