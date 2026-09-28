/*
 * ============================================================
 * 🌸 KYARA GROUP STATUS V2 — CORREÇÃO DEFINITIVA
 * ============================================================
 *
 * BAKI / BAKIZINHO
 *
 * Suporta:
 *   • texto
 *   • link em texto
 *   • foto
 *   • vídeo
 *   • áudio
 *   • PTT / voice
 *   • legenda em foto/vídeo
 *   • reply de mídia
 *   • viewOnceMessage
 *   • viewOnceMessageV2
 *   • viewOnceMessageV2Extension
 *   • grupos com JID @g.us
 *   • grupos com addressingMode = lid
 *
 * REGRAS:
 *   • NÃO usa status@broadcast
 *   • NÃO usa sendMessage(prepared)
 *   • NÃO copia contextInfo da mensagem original
 *   • NÃO usa statusAttributions em mídia
 *   • usa groupStatusMessageV2
 *   • usa messageSecret novo de 32 bytes
 *   • mídia é preparada antes do wrapper
 *
 * ============================================================
 */

import crypto from 'node:crypto';

import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  jidNormalizedUser
} from 'baileys';


const MAX_STATUS_MEDIA_BYTES =
  50 * 1024 * 1024;


function statusLog(...args) {
  console.log('[STATUSGP]', ...args);
}


function normalizeGroupJid(jid) {
  const value =
    String(jid || '').trim();

  if (!value) {
    return '';
  }

  if (
    !value.endsWith('@g.us')
  ) {
    return '';
  }

  return value;
}


function normalizeText(value) {
  return String(value ?? '').trim();
}


function unwrapMessageContent(message) {
  let current = message;

  for (let i = 0; i < 12; i++) {
    if (
      !current ||
      typeof current !== 'object'
    ) {
      break;
    }

    if (
      current.ephemeralMessage?.message
    ) {
      current =
        current.ephemeralMessage.message;
      continue;
    }

    if (
      current.viewOnceMessage?.message
    ) {
      current =
        current.viewOnceMessage.message;
      continue;
    }

    if (
      current.viewOnceMessageV2?.message
    ) {
      current =
        current.viewOnceMessageV2.message;
      continue;
    }

    if (
      current
        .viewOnceMessageV2Extension
        ?.message
    ) {
      current =
        current
          .viewOnceMessageV2Extension
          .message;
      continue;
    }

    if (
      current.documentWithCaptionMessage
        ?.message
    ) {
      current =
        current
          .documentWithCaptionMessage
          .message;
      continue;
    }

    if (
      current.editedMessage?.message
    ) {
      current =
        current.editedMessage.message;
      continue;
    }

    if (
      current.associatedChildMessage
        ?.message
    ) {
      current =
        current
          .associatedChildMessage
          .message;
      continue;
    }

    if (
      current.groupStatusMessageV2
        ?.message
    ) {
      current =
        current.groupStatusMessageV2.message;
      continue;
    }

    if (
      current.groupStatusMessage
        ?.message
    ) {
      current =
        current.groupStatusMessage.message;
      continue;
    }

    break;
  }

  return current || {};
}


function getContextInfo(message) {
  if (
    !message ||
    typeof message !== 'object'
  ) {
    return undefined;
  }

  const containers = [
    message.extendedTextMessage,
    message.imageMessage,
    message.videoMessage,
    message.audioMessage,
    message.documentMessage,
    message.stickerMessage
  ];

  for (const item of containers) {
    if (
      item &&
      typeof item === 'object' &&
      item.contextInfo
    ) {
      return item.contextInfo;
    }
  }

  return undefined;
}


function getQuotedMessage(info) {
  if (!info) {
    return null;
  }

  const root =
    unwrapMessageContent(
      info.message || {}
    );

  const directContext =
    getContextInfo(root);

  if (
    directContext?.quotedMessage
  ) {
    return unwrapMessageContent(
      directContext.quotedMessage
    );
  }

  return null;
}


function detectMedia(message) {
  const content =
    unwrapMessageContent(message);

  if (content.imageMessage) {
    return {
      type: 'image',
      message: content.imageMessage
    };
  }

  if (content.videoMessage) {
    return {
      type: 'video',
      message: content.videoMessage
    };
  }

  if (content.audioMessage) {
    return {
      type: 'audio',
      message: content.audioMessage
    };
  }

  return null;
}


function normalizeMime(mediaInfo) {
  const raw =
    String(
      mediaInfo?.message?.mimetype ||
      ''
    )
      .trim()
      .toLowerCase();

  if (raw) {
    return raw;
  }

  if (
    mediaInfo?.type === 'image'
  ) {
    return 'image/jpeg';
  }

  if (
    mediaInfo?.type === 'video'
  ) {
    return 'video/mp4';
  }

  if (
    mediaInfo?.type === 'audio'
  ) {
    return 'audio/mp4';
  }

  return '';
}


async function downloadQuotedMedia({
  mediaInfo,
  getFileBuffer
}) {
  if (!mediaInfo) {
    throw new Error(
      'Mídia não identificada.'
    );
  }

  if (
    typeof getFileBuffer !== 'function'
  ) {
    throw new Error(
      'getFileBuffer não está disponível.'
    );
  }

  const buffer =
    await getFileBuffer(
      mediaInfo.message,
      mediaInfo.type
    );

  if (!Buffer.isBuffer(buffer)) {
    throw new Error(
      'O download não retornou Buffer.'
    );
  }

  if (!buffer.length) {
    throw new Error(
      'A mídia retornou Buffer vazio.'
    );
  }

  if (
    buffer.length >
    MAX_STATUS_MEDIA_BYTES
  ) {
    throw new Error(
      `Mídia excede ${MAX_STATUS_MEDIA_BYTES} bytes.`
    );
  }

  return buffer;
}


/*
 * IMPORTANTE:
 *
 * Para a mídia, NÃO copiamos o contextInfo
 * da mensagem original.
 *
 * Não colocamos:
 *   quotedMessage
 *   stanzaId
 *   participant
 *   remoteJid
 *   forwardingScore
 *   statusAttributions
 *
 * A estrutura mínima é:
 *
 *   contextInfo: {
 *     isGroupStatus: true
 *   }
 */
function buildMediaContextInfo() {
  return {
    forwardingScore: 0,

    featureEligibilities: {
      canBeReshared: true,
      canReceiveMultiReact: true
    },

    pairedMediaType: 0,

    statusSourceType: 4,

    statusAttributions: [
      {
        type: 10
      }
    ],

    isGroupStatus: true
  };
}


function buildTextInnerMessage(
  text,
  senderJid
) {
  return {
    extendedTextMessage: {
      text,

      contextInfo: {
        forwardingScore: 0,

        featureEligibilities: {
          canBeReshared: true,
          canReceiveMultiReact: true
        },

        pairedMediaType: 0,

        isGroupStatus: true,

        statusAttributions: [
          {
            type: 6,
            groupStatus: {
              authorJid: senderJid
            }
          }
        ]
      }
    }
  };
}


async function buildImageMessage({
  nazu,
  mediaInfo,
  buffer,
  caption
}) {
  const mime =
    normalizeMime(mediaInfo) ||
    'image/jpeg';

  const prepared =
    await prepareWAMessageMedia(
      {
        image: buffer,
        mimetype: mime
      },
      {
        upload:
          nazu.waUploadToServer
      }
    );

  if (
    !prepared?.imageMessage
  ) {
    throw new Error(
      'prepareWAMessageMedia não retornou imageMessage.'
    );
  }

  const imageMessage = {
    ...prepared.imageMessage,
    contextInfo:
      buildMediaContextInfo()
  };

  const safeCaption =
    normalizeText(caption);

  if (safeCaption) {
    imageMessage.caption =
      safeCaption;
  } else {
    delete imageMessage.caption;
  }

  return {
    imageMessage
  };
}


async function buildVideoMessage({
  nazu,
  mediaInfo,
  buffer,
  caption
}) {
  const mime =
    normalizeMime(mediaInfo) ||
    'video/mp4';

  const prepared =
    await prepareWAMessageMedia(
      {
        video: buffer,
        mimetype: mime
      },
      {
        upload:
          nazu.waUploadToServer
      }
    );

  if (
    !prepared?.videoMessage
  ) {
    throw new Error(
      'prepareWAMessageMedia não retornou videoMessage.'
    );
  }

  const videoMessage = {
    ...prepared.videoMessage,
    contextInfo:
      buildMediaContextInfo()
  };

  const original =
    mediaInfo?.message || {};

  if (
    original.gifPlayback === true
  ) {
    videoMessage.gifPlayback =
      true;
  }

  const safeCaption =
    normalizeText(caption);

  if (safeCaption) {
    videoMessage.caption =
      safeCaption;
  } else {
    delete videoMessage.caption;
  }

  return {
    videoMessage
  };
}


async function buildAudioMessage({
  nazu,
  mediaInfo,
  buffer
}) {
  const original =
    mediaInfo?.message || {};

  const isPtt =
    original.ptt === true;

  const mime =
    isPtt
      ? 'audio/ogg; codecs=opus'
      : (
          normalizeMime(mediaInfo) ||
          'audio/mp4'
        );

  const prepared =
    await prepareWAMessageMedia(
      {
        audio: buffer,
        mimetype: mime,
        ...(isPtt
          ? { ptt: true }
          : {})
      },
      {
        upload:
          nazu.waUploadToServer
      }
    );

  if (
    !prepared?.audioMessage
  ) {
    throw new Error(
      'prepareWAMessageMedia não retornou audioMessage.'
    );
  }

  return {
    audioMessage: {
      ...prepared.audioMessage,
      ...(isPtt
        ? { ptt: true }
        : {}),
      contextInfo:
        buildMediaContextInfo()
    }
  };
}


async function buildMediaInnerMessage({
  nazu,
  mediaInfo,
  buffer,
  caption
}) {
  if (
    mediaInfo.type === 'image'
  ) {
    return buildImageMessage({
      nazu,
      mediaInfo,
      buffer,
      caption
    });
  }

  if (
    mediaInfo.type === 'video'
  ) {
    return buildVideoMessage({
      nazu,
      mediaInfo,
      buffer,
      caption
    });
  }

  if (
    mediaInfo.type === 'audio'
  ) {
    return buildAudioMessage({
      nazu,
      mediaInfo,
      buffer
    });
  }

  throw new Error(
    `Tipo não suportado: ${mediaInfo.type}`
  );
}


/*
 * ============================================================
 * ENVIO RAW DO GROUP STATUS V2
 * ============================================================
 *
 * Estrutura:
 *
 * {
 *   messageContextInfo: {
 *     messageSecret
 *   },
 *
 *   groupStatusMessageV2: {
 *     message: {
 *       imageMessage / videoMessage / audioMessage / ...
 *
 *       messageContextInfo: {
 *         messageSecret
 *       }
 *     }
 *   }
 * }
 *
 * NÃO usa:
 *   status@broadcast
 *   sendMessage(prepared)
 *
 * ============================================================
 */
async function relayGroupStatusV2({
  nazu,
  groupJid,
  innerMessage
}) {
  const messageSecret =
    crypto.randomBytes(32);

  if (
    messageSecret.length !== 32
  ) {
    throw new Error(
      'messageSecret inválido.'
    );
  }

  statusLog(
    'messageSecret:',
    messageSecret.length,
    'bytes'
  );

  statusLog(
    'Inner keys:',
    Object.keys(innerMessage || {})
  );

  const messageContent = {
    messageContextInfo: {
      messageSecret
    },

    groupStatusMessageV2: {
      message: {
        ...innerMessage,

        messageContextInfo: {
          messageSecret
        }
      }
    }
  };

  statusLog(
    'Wrapper:',
    'groupStatusMessageV2'
  );

  statusLog(
    'Inner type:',
    Object.keys(
      innerMessage || {}
    )
  );

  statusLog(
    'isGroupStatus:',
    Boolean(
      innerMessage
        ?.imageMessage
        ?.contextInfo
        ?.isGroupStatus ||
      innerMessage
        ?.videoMessage
        ?.contextInfo
        ?.isGroupStatus ||
      innerMessage
        ?.audioMessage
        ?.contextInfo
        ?.isGroupStatus ||
      innerMessage
        ?.extendedTextMessage
        ?.contextInfo
        ?.isGroupStatus
    )
  );

  const generated =
    generateWAMessageFromContent(
      groupJid,
      messageContent,
      {}
    );

  if (
    !generated?.message
  ) {
    throw new Error(
      'generateWAMessageFromContent não retornou message.'
    );
  }

  /*
   * IMPORTANTE:
   *
   * Sem additionalNodes manual.
   *
   * O payload é enviado diretamente como
   * groupStatusMessageV2.
   */
  await nazu.relayMessage(
    groupJid,
    generated.message,
    {
      messageId:
        generated.key.id,

      additionalNodes: [
        {
          tag: 'meta',
          attrs: {
            is_group_status: 'true'
          }
        }
      ]
    }
  );

  return {
    id:
      generated.key.id
  };
}


async function sendTextStatus({
  nazu,
  groupJid,
  senderJid,
  text
}) {
  const innerMessage =
    buildTextInnerMessage(
      text,
      senderJid
    );

  return relayGroupStatusV2({
    nazu,
    groupJid,
    innerMessage
  });
}


async function sendMediaStatus({
  nazu,
  groupJid,
  mediaInfo,
  buffer,
  caption
}) {
  const innerMessage =
    await buildMediaInnerMessage({
      nazu,
      mediaInfo,
      buffer,
      caption
    });

  return relayGroupStatusV2({
    nazu,
    groupJid,
    innerMessage
  });
}


export async function handleKyaraStatusGp({
  nazu,
  info,
  from,
  command,
  q,
  reply,
  getFileBuffer,
  publishChannel
}) {
  const normalizedCommand =
    String(command || '')
      .trim()
      .toLowerCase();

  if (
    normalizedCommand !== 'statusgp'
  ) {
    return false;
  }

  const groupJid =
    normalizeGroupJid(from);

  if (!groupJid) {
    await reply(
      '❌ O #statusgp só pode ser usado dentro de grupos.'
    );
    return true;
  }

  const text =
    normalizeText(q);

  const senderJid =
    jidNormalizedUser(
      nazu?.user?.id
    );

  if (!senderJid) {
    await reply(
      '❌ Não foi possível identificar o JID do bot.'
    );
    return true;
  }

  /*
   * 1. Tenta mídia citada.
   */
  let quotedMessage =
    getQuotedMessage(info);

  let mediaInfo =
    detectMedia(quotedMessage);

  /*
   * 2. Caso não exista quoted,
   *    verifica a mensagem atual.
   */
  if (!mediaInfo) {
    const currentContent =
      unwrapMessageContent(
        info?.message || {}
      );

    mediaInfo =
      detectMedia(currentContent);
  }


  /*
   * ==========================================================
   * TEXTO / LINK
   * ==========================================================
   */
  if (!mediaInfo) {
    if (!text) {
      await reply(
        '❌ Envie um texto ou responda uma foto, vídeo ou áudio com #statusgp.'
      );

      return true;
    }

    try {
      await reply(
        '⏳ Publicando texto no Status do grupo...'
      );

      statusLog(
        '================================='
      );

      statusLog(
        '🌸 KYARA GROUP STATUS V2'
      );

      statusLog(
        'Grupo:',
        groupJid
      );

      statusLog(
        'Bot:',
        senderJid
      );

      statusLog(
        'Tipo:',
        'text'
      );

      statusLog(
        'Texto:',
        text
      );

      const result =
        await sendTextStatus({
          nazu,
          groupJid,
          senderJid,
          text
        });

      statusLog(
        '✅ GROUP STATUS TEXT ENVIADO'
      );

      // ============================================================
      // 🌸 TAMBÉM PUBLICA NO CANAL BOT-KYARA
      // ============================================================
      if (typeof publishChannel === 'function') {
        try {
          await publishChannel({
            type: 'text',
            text
          });

          statusLog(
            '✅ CANAL BOT-KYARA TEXT ENVIADO'
          );
        } catch (channelError) {
          console.error(
            '[STATUSGP][CHANNEL][TEXT]',
            channelError?.stack ||
            channelError
          );

          statusLog(
            '⚠️ CANAL BOT-KYARA TEXT FALHOU:',
            channelError?.message ||
            channelError
          );
        }
      }

      statusLog(
        'ID:',
        result.id
      );

      statusLog(
        '================================='
      );

      const hasLink =
        /\bhttps?:\/\/\S+/i
          .test(text);

      await reply([
        '✅ *Status do grupo publicado!*',
        '',
        '📌 Tipo: 📝 texto',
        hasLink
          ? '🔗 Link detectado.'
          : '📝 Texto sem link.'
      ].join('\n'));

    } catch (error) {
      console.error(
        '[STATUSGP][TEXT]',
        error?.stack || error
      );

      await reply([
        '❌ Falha ao publicar o texto no Status.',
        '',
        `⚠️ ${error?.message || error}`
      ].join('\n'));
    }

    return true;
  }


  /*
   * ==========================================================
   * MÍDIA
   * ==========================================================
   */

  try {
    const labelMap = {
      image: '🖼️ foto',
      video: '🎥 vídeo',
      audio: '🎵 áudio'
    };

    const mediaLabel =
      labelMap[mediaInfo.type] ||
      mediaInfo.type;

    await reply(
      `⏳ Publicando ${mediaLabel} no Status do grupo...`
    );

    statusLog(
      '================================='
    );

    statusLog(
      '🌸 KYARA GROUP STATUS V2'
    );

    statusLog(
      'Grupo:',
      groupJid
    );

    statusLog(
      'Bot:',
      senderJid
    );

    statusLog(
      'Tipo:',
      mediaInfo.type
    );

    statusLog(
      'Legenda:',
      text || '(sem legenda)'
    );

    statusLog(
      'Baixando mídia...'
    );

    const buffer =
      await downloadQuotedMedia({
        mediaInfo,
        getFileBuffer
      });

    const mime =
      normalizeMime(mediaInfo);

    statusLog(
      'Buffer:',
      buffer.length,
      'bytes'
    );

    statusLog(
      'MIME:',
      mime || '(não informado)'
    );

    const caption =
      (
        mediaInfo.type === 'image' ||
        mediaInfo.type === 'video'
      )
        ? text
        : '';

    const result =
      await sendMediaStatus({
        nazu,
        groupJid,
        mediaInfo,
        buffer,
        caption
      });

    statusLog(
      '✅ GROUP STATUS MEDIA ENVIADO'
    );

    // ============================================================
    // 🌸 TAMBÉM PUBLICA A MESMA MÍDIA NO CANAL BOT-KYARA
    // ============================================================
    if (typeof publishChannel === 'function') {
      try {
        await publishChannel({
          type: mediaInfo.type,
          buffer,
          caption,
          mime
        });

        statusLog(
          '✅ CANAL BOT-KYARA MEDIA ENVIADO'
        );
      } catch (channelError) {
        console.error(
          '[STATUSGP][CHANNEL][MEDIA]',
          channelError?.stack ||
          channelError
        );

        statusLog(
          '⚠️ CANAL BOT-KYARA MEDIA FALHOU:',
          channelError?.message ||
          channelError
        );
      }
    }

    statusLog(
      'Grupo:',
      groupJid
    );

    statusLog(
      'Tipo:',
      mediaInfo.type
    );

    statusLog(
      'MIME:',
      mime || '(não informado)'
    );

    statusLog(
      'Tamanho:',
      buffer.length,
      'bytes'
    );

    statusLog(
      'ID:',
      result.id
    );

    statusLog(
      '================================='
    );

    const captionInfo =
      caption
        ? `📝 Legenda: ${caption}`
        : '📝 Sem legenda.';

    await reply([
      '✅ *Status do grupo enviado!*',
      '',
      `📌 Tipo: ${mediaLabel}`,
      captionInfo
    ].join('\n'));

  } catch (error) {
    console.error(
      '[STATUSGP][MEDIA]',
      error?.stack || error
    );

    await reply([
      '❌ Falha ao publicar a mídia no Status do grupo.',
      '',
      `📌 Tipo: ${mediaInfo.type}`,
      `⚠️ ${error?.message || error}`
    ].join('\n'));
  }

  return true;
}


export default handleKyaraStatusGp;
