import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

import {
  generateWAMessageFromContent
} from 'baileys';


const BROWSER_FILE =
  path.join(
    process.cwd(),
    'dados',
    'api',
    'kyara-browser.html'
  );



function detectKyaraApiBase() {

  const configuredHost =
    String(
      process.env.KYARA_API_HOST || ""
    ).trim();

  const configuredPort =
    String(
      process.env.KYARA_API_PORT || "3000"
    ).trim();

  if (configuredHost) {
    return `http://${configuredHost}:${configuredPort}`;
  }

  const interfaces =
    os.networkInterfaces();

  const candidates = [];

  for (
    const entries of Object.values(interfaces)
  ) {

    for (const info of entries || []) {

      if (!info) continue;

      const family =
        typeof info.family === "string"
          ? info.family
          : String(info.family);

      if (family !== "IPv4") continue;
      if (info.internal) continue;

      const ip =
        String(info.address || "").trim();

      if (!ip) continue;

      const privateNetwork =
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);

      candidates.push({
        ip,
        privateNetwork
      });
    }
  }

  const selected =
    candidates.find(
      item => item.privateNetwork
    ) ||
    candidates[0];

  return selected
    ? `http://${selected.ip}:${configuredPort}`
    : `http://127.0.0.1:${configuredPort}`;
}

const API_BASE = detectKyaraApiBase();


/*
==============================================================
 KYARA BROWSER
==============================================================

 O /browser NÃO abre mais:

 http://127.0.0.1:3000/browser

 Agora ele carrega o HTML existente e envia o conteúdo pelo
 MESMO mecanismo utilizado pelo /kyarasite:

 GenAIaeacdsnwHtmlPrimitive
        ↓
 richResponseMessage
        ↓
 unifiedResponse
        ↓
 generateWAMessageFromContent
        ↓
 relayMessage
        ↓
 WhatsApp

 Não existe um novo comando /kyarasite.
 Não substituímos o sistema existente.

==============================================================
*/


function normalizeUrl(value = '') {

  let url =
    String(value).trim();

  if (!url)
    return '';

  if (!/^https?:\/\//i.test(url))
    url =
      'https://' + url;

  try {

    const parsed =
      new URL(url);

    if (
      parsed.protocol !== 'http:' &&
      parsed.protocol !== 'https:'
    ) {
      return '';
    }

    return parsed.href;

  } catch {

    return '';

  }
}


function domainOf(url = '') {

  try {

    return new URL(url).hostname;

  } catch {

    return '';

  }
}


function platformOf(url = '') {

  const domain =
    domainOf(url).toLowerCase();

  if (
    domain === 'youtube.com' ||
    domain.endsWith('.youtube.com') ||
    domain === 'youtu.be'
  ) {
    return 'youtube';
  }

  if (
    domain === 'tiktok.com' ||
    domain.endsWith('.tiktok.com')
  ) {
    return 'tiktok';
  }

  if (
    domain === 'instagram.com' ||
    domain.endsWith('.instagram.com')
  ) {
    return 'instagram';
  }

  if (
    domain === 'facebook.com' ||
    domain.endsWith('.facebook.com')
  ) {
    return 'facebook';
  }

  return 'web';
}


/*
==============================================================
 CARREGA O HTML REAL DO BROWSER
==============================================================
*/


function getKyaraBrowserPublicBase() {
  const envUrl =
    String(
      process.env.KYARA_BROWSER_PUBLIC_URL || ""
    ).trim().replace(/\/+$/, "");

  if (envUrl) {
    return envUrl;
  }

  const urlFile =
    path.join(
      process.cwd(),
      "dados",
      ".kyara-browser-public-url"
    );

  try {
    const fileUrl =
      fs.readFileSync(
        urlFile,
        "utf8"
      ).trim().replace(/\/+$/, "");

    if (fileUrl) {
      return fileUrl;
    }
  } catch {}

  return API_BASE;
}

/* KYARA_BROWSER_PUBLIC_TRUSTED_SOURCE_V3 */
function getKyaraBrowserTrustedSource() {

  const base =
    getKyaraBrowserPublicBase();

  try {

    return new URL(base).hostname;

  } catch {

    return '';

  }

}

function loadBrowserHtml(initialQuery = '') {

  if (
    !fs.existsSync(
      BROWSER_FILE
    )
  ) {

    throw new Error(
      'HTML do KYARA BROWSER não encontrado: ' +
      BROWSER_FILE
    );

  }

  const html =
    fs.readFileSync(
      BROWSER_FILE,
      'utf8'
    ).trim();


  if (!html) {

    throw new Error(
      'O HTML do KYARA BROWSER está vazio.'
    );

  }


  return html
    .split('__KYARA_API_BASE__')
    .join(getKyaraBrowserPublicBase())
    .split('__KYARA_BROWSER_INITIAL_QUERY__')
    .join(
      JSON.stringify(
        String(initialQuery || '')
      )
    );
}


/*
==============================================================
 CONSTRÓI O MESMO TIPO DE MENSAGEM DO KYARA SITE
==============================================================
*/

function buildKyaraBrowserMessage(html) {

  const unifiedData = {

    response_id:
      crypto.randomUUID(),

    sections: [

      {

        view_model: {

          primitive: {

            __typename:
              'GenAIaeacdsnwHtmlPrimitive',

            payload:
              html,

            /*
             * O /kyarasite atual usa esta trusted source.
             * Mantemos a mesma arquitetura.
             */
            trusted_sources: [
              'zone.api.br',
              getKyaraBrowserTrustedSource()
            ].filter(Boolean)

          },

          __typename:
            'GenAISingleLayoutViewModel'

        }

      }

    ]

  };


  return {

    messageContextInfo: {

      deviceListMetadata: {},

      deviceListMetadataVersion: 2,

      botMetadata: {

        messageDisclaimerText: '',

        botResponseId:
          crypto.randomUUID(),

        verificationMetadata: {

          proofs: [

            {

              version: 1,

              useCase: 1,

              /*
               * Mantido exatamente como no KYARA SITE atual.
               */
              signature:
                '...',

              certificateChain: [
                '...',
                '...',
                '...'
              ]

            }

          ]

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
                'KYARA BROWSER'

            }

          ],


          unifiedResponse: {

            data:

              Buffer.from(
                JSON.stringify(
                  unifiedData
                ),
                'utf8'
              )

          },


          contextInfo: {

            forwardingScore:
              1,

            isForwarded:
              true,

            forwardedAiBotMessageInfo: {

              botJid:
                '867051314767696@bot'

            },

            forwardOrigin:
              4

          }

        }

      }

    }

  };

}


/*
==============================================================
 ENVIA O HTML PELO BAILEYS
==============================================================
*/

async function sendBrowserHtml(options, html) {

  const jid =
    options.from ||
    options.remoteJid ||
    options.info?.key?.remoteJid;


  const socket =
    options.sock ||
    options.nazu;


  if (!jid) {

    throw new Error(
      'JID do chat não encontrado.'
    );

  }


  if (
    !socket ||
    typeof socket.relayMessage !== 'function'
  ) {

    throw new Error(
      'Socket da Kyara não possui relayMessage().'
    );

  }


  const payload =
    buildKyaraBrowserMessage(
      html
    );


  const msg =
    generateWAMessageFromContent(

      jid,

      payload,

      {
        quoted:
          options.info
      }

    );


  await socket.relayMessage(

    jid,

    msg.message,

    {
      messageId:
        msg.key.id
    }

  );

}


/*
==============================================================
 /browser
==============================================================

 IMPORTANTE:

 Não criamos /navegar
 Não criamos /navegador
 Não criamos /web

 O comando continua sendo somente:

 /browser

 O sistema existente de kyaraSpecialCommands.js continua
 responsável por chamar este handler.

==============================================================
*/

async function handleBrowserCommand(options = {}) {

  const command =
    String(

      options.command ||
      options.cmd ||
      options.commandName ||
      ''

    )
    .toLowerCase()
    .replace(/^[/!]/, '');


  if (
    command !== 'browser'
  ) {

    return false;

  }


  try {


    const initialQuery =
      String(
        options.q ||
        options.query ||
        options.args ||
        options.text ||
        ''
      ).trim();


    /*
     * Carrega o site existente.
     *
     * Não recriamos o HTML aqui.
     */
    const html =
      loadBrowserHtml(
        initialQuery
      );


    /*
     * Envia pelo mecanismo do KYARA SITE.
     */
    await sendBrowserHtml(
      options,
      html
    );


    console.log(
      '[KYARA BROWSER] ✅ HTML enviado pelo mecanismo do KYARA SITE.'
    );


  } catch (error) {

    console.error(
      '[KYARA BROWSER HTML]',
      error
    );


    if (
      typeof options.reply === 'function'
    ) {

      await options.reply(

        '❌ Não foi possível abrir o KYARA BROWSER.\\n\\n' +

        String(
          error?.message ||
          error
        )

      );

    }

  }


  return true;

}


export {

  handleBrowserCommand,
  sendBrowserHtml,

  BROWSER_FILE,

  API_BASE,

  platformOf,

  domainOf,

  normalizeUrl

};
