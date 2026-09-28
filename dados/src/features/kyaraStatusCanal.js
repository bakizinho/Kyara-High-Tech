/*
 * ============================================================
 * 🌸 KYARA STATUS CANAL — PUBLICADOR NATIVO
 * ============================================================
 *
 * BAKI / BAKIZINHO
 *
 * Comando:
 *   #statuscanal texto
 *   #statuscanal link
 *
 * Também suporta resposta a:
 *   • foto
 *   • vídeo
 *   • áudio
 *
 * Suporta wrappers:
 *   • viewOnceMessage
 *   • viewOnceMessageV2
 *   • viewOnceMessageV2Extension
 *   • ephemeralMessage
 *   • documentWithCaptionMessage
 *   • editedMessage
 *   • associatedChildMessage
 *
 * REGRAS:
 *   • NÃO usa status@broadcast
 *   • usa o JID real @newsletter resolvido externamente
 *   • publicação independente do Status de grupo
 *
 * ============================================================
 */

import {
  downloadContentFromMessage
} from 'baileys';

import {
  execFile
} from 'node:child_process';

import {
  promisify
} from 'node:util';

import os from 'node:os';
import path from 'node:path';

import {
  mkdtemp,
  writeFile,
  readFile,
  rm
} from 'node:fs/promises';

import {
  existsSync
} from 'node:fs';

const execFileAsync =
  promisify(execFile);



const MAX_CHANNEL_MEDIA_BYTES =
  50 * 1024 * 1024;


function channelLog(...args) {
  console.log('[STATUSCANAL]', ...args);
}


function normalizeText(value) {
  return String(value ?? '').trim();
}


function normalizeMime(mediaMessage) {
  return String(
    mediaMessage?.mimetype ||
    mediaMessage?.mimeType ||
    ''
  ).trim();
}



// ============================================================
// 🌸 KYARA — BOT-KYARA DENTRO DO VÍDEO
//
// O texto é gravado fisicamente no vídeo.
// NÃO vira legenda do WhatsApp.
//
// Posição:
//   canto superior esquerdo
//
// BAKI / BAKIZINHO
// ============================================================

const KYARA_STATUS_WATERMARK =
  'BOT-KYARA';

const KYARA_STATUS_MAX_VIDEO_BYTES =
  50 * 1024 * 1024;


function findKyaraFont() {
  const candidates = [
    '/system/fonts/Roboto-Bold.ttf',
    '/system/fonts/Roboto-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
  ];

  for (const file of candidates) {
    try {
      if (existsSync(file)) {
        return file;
      }
    } catch {}
  }

  return null;
}


function escapeKyaraDrawtext(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}


async function addKyaraVideoWatermark(
  inputBuffer
) {
  if (
    !Buffer.isBuffer(inputBuffer) ||
    !inputBuffer.length
  ) {
    throw new Error(
      'Buffer de vídeo inválido para aplicar BOT-KYARA.'
    );
  }

  const tempDir =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        'kyara-statuscanal-'
      )
    );

  const inputPath =
    path.join(
      tempDir,
      'entrada.mp4'
    );

  const outputPath =
    path.join(
      tempDir,
      'saida.mp4'
    );

  try {
    await writeFile(
      inputPath,
      inputBuffer
    );

    const font =
      findKyaraFont();

    const safeText =
      escapeKyaraDrawtext(
        KYARA_STATUS_WATERMARK
      );

    const parts = [];

    if (font) {
      parts.push(
        `fontfile=${font}`
      );
    } else {
      parts.push(
        'font=Sans'
      );
    }

    parts.push(
      `text='${safeText}'`,
      'fontcolor=white',
      'fontsize=42',
      'bordercolor=black@0.90',
      'borderw=3',
      'box=1',
      'boxcolor=black@0.42',
      'boxborderw=9',
      'x=22',
      'y=22'
    );

    const filter =
      `drawtext=${parts.join(':')}`;

    console.log(
      '[STATUSCANAL] 🎬 Gravando BOT-KYARA no vídeo...'
    );

    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',

        '-i',
        inputPath,

        '-map',
        '0:v:0',

        '-map',
        '0:a?',

        '-vf',
        filter,

        '-c:v',
        'libx264',

        '-preset',
        'veryfast',

        '-crf',
        '22',

        '-pix_fmt',
        'yuv420p',

        '-c:a',
        'aac',

        '-b:a',
        '128k',

        '-movflags',
        '+faststart',

        outputPath
      ],
      {
        maxBuffer:
          16 * 1024 * 1024
      }
    );

    const outputBuffer =
      await readFile(
        outputPath
      );

    if (
      !outputBuffer?.length
    ) {
      throw new Error(
        'FFmpeg gerou um vídeo vazio.'
      );
    }

    if (
      outputBuffer.length >
      KYARA_STATUS_MAX_VIDEO_BYTES
    ) {
      throw new Error(
        'O vídeo com BOT-KYARA ultrapassou 50 MB.'
      );
    }

    console.log(
      '[STATUSCANAL] ✅ BOT-KYARA gravado no vídeo:',
      outputBuffer.length,
      'bytes'
    );

    return outputBuffer;

  } finally {

    try {
      await rm(
        tempDir,
        {
          recursive: true,
          force: true
        }
      );
    } catch {}
  }
}


function unwrapMessageContent(message) {
  let current = message;

  for (let i = 0; i < 16; i++) {
    if (
      !current ||
      typeof current !== 'object'
    ) {
      break;
    }

    if (current.ephemeralMessage?.message) {
      current =
        current.ephemeralMessage.message;
      continue;
    }

    if (current.viewOnceMessage?.message) {
      current =
        current.viewOnceMessage.message;
      continue;
    }

    if (current.viewOnceMessageV2?.message) {
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

    if (current.editedMessage?.message) {
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

    break;
  }

  return current || {};
}


function getMessageRoot(info) {
  return unwrapMessageContent(
    info?.message || {}
  );
}


function findQuotedMessage(info) {
  const root =
    getMessageRoot(info);

  const seen =
    new WeakSet();

  function walk(node, depth = 0) {
    if (
      !node ||
      typeof node !== 'object' ||
      depth > 14
    ) {
      return null;
    }

    if (seen.has(node)) {
      return null;
    }

    seen.add(node);

    const directQuoted =
      node?.contextInfo?.quotedMessage;

    if (
      directQuoted &&
      typeof directQuoted === 'object'
    ) {
      return unwrapMessageContent(
        directQuoted
      );
    }

    for (const [key, value] of Object.entries(node)) {
      if (
        key === 'contextInfo' ||
        key === 'messageContextInfo'
      ) {
        continue;
      }

      if (
        value &&
        typeof value === 'object'
      ) {
        const found =
          walk(value, depth + 1);

        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  return walk(root);
}


function detectMedia(content) {
  const current =
    unwrapMessageContent(content);

  if (current?.imageMessage) {
    return {
      type: 'image',
      message: current.imageMessage
    };
  }

  if (current?.videoMessage) {
    return {
      type: 'video',
      message: current.videoMessage
    };
  }

  if (current?.audioMessage) {
    return {
      type: 'audio',
      message: current.audioMessage
    };
  }

  return null;
}


async function downloadMedia(mediaMessage, type) {
  const stream =
    await downloadContentFromMessage(
      mediaMessage,
      type
    );

  const chunks = [];
  let total = 0;

  for await (const chunk of stream) {
    const part =
      Buffer.from(chunk);

    total += part.length;

    if (
      total >
      MAX_CHANNEL_MEDIA_BYTES
    ) {
      throw new Error(
        'A mídia ultrapassa o limite de 50 MB.'
      );
    }

    chunks.push(part);
  }

  return Buffer.concat(
    chunks,
    total
  );
}


function extractCaptionCommand(
  content
) {
  const current =
    unwrapMessageContent(content);

  const media =
    detectMedia(current);

  if (!media) {
    return '';
  }

  const caption =
    normalizeText(
      media.message?.caption
    );

  const match =
    caption.match(
      /^#statuscanal(?:\s+([\s\S]*))?$/i
    );

  return normalizeText(
    match?.[1] || ''
  );
}


export async function handleKyaraStatusCanal({
  info,
  q,
  reply,
  publishChannel
}) {
  try {
    channelLog(
      '================================='
    );

    channelLog(
      '🌸 KYARA STATUS CANAL'
    );

    const root =
      getMessageRoot(info);

    /*
     * Primeiro tenta mídia diretamente
     * na mensagem que contém o comando.
     */
    let mediaInfo =
      detectMedia(root);

    /*
     * Se não existir mídia direta,
     * procura mídia citada/respondida.
     */
    if (!mediaInfo) {
      const quoted =
        findQuotedMessage(info);

      if (quoted) {
        mediaInfo =
          detectMedia(quoted);
      }
    }

    /*
     * Texto do comando.
     */
    let text =
      normalizeText(q);

    /*
     * Caso o comando esteja na legenda
     * da própria mídia, recupera a legenda.
     */
    if (!text) {
      text =
        extractCaptionCommand(root);
    }

    /*
     * =========================================
     * TEXTO / LINK
     * =========================================
     */
    if (!mediaInfo) {
      if (!text) {
        await reply(
          [
            '❌ Envie um texto ou responda uma foto, vídeo ou áudio com #statuscanal.'
          ].join('\n')
        );

        return true;
      }

      if (
        typeof publishChannel !== 'function'
      ) {
        throw new Error(
          'Publicador do canal não foi conectado.'
        );
      }

      await reply(
        '⏳ Publicando no canal BOT-KYARA...'
      );

      channelLog(
        'Tipo:',
        'text'
      );

      channelLog(
        'Texto:',
        text
      );

      await publishChannel({
        type: 'text',
        text
      });

      channelLog(
        '✅ TEXTO PUBLICADO NO CANAL'
      );

      const hasLink =
        /\bhttps?:\/\/\S+/i.test(
          text
        );

      await reply(
        [
          '✅ *Publicado no canal BOT-KYARA!*',
          '',
          '📌 Tipo: 📝 texto',
          hasLink
            ? '🔗 Link detectado.'
            : '📝 Texto sem link.'
        ].join('\n')
      );

      return true;
    }


    /*
     * =========================================
     * MÍDIA
     * =========================================
     */

    if (
      typeof publishChannel !== 'function'
    ) {
      throw new Error(
        'Publicador do canal não foi conectado.'
      );
    }

    const labelMap = {
      image: '🖼️ foto',
      video: '🎥 vídeo',
      audio: '🎵 áudio'
    };

    const label =
      labelMap[mediaInfo.type] ||
      mediaInfo.type;

    await reply(
      `⏳ Publicando ${label} no canal BOT-KYARA...`
    );

    channelLog(
      'Tipo:',
      mediaInfo.type
    );

    channelLog(
      'Legenda:',
      text || '(sem legenda)'
    );

    channelLog(
      'Baixando mídia...'
    );

    const buffer =
      await downloadMedia(
        mediaInfo.message,
        mediaInfo.type
      );

    const mime =
      normalizeMime(
        mediaInfo.message
      );

    // ========================================================
    // 🌸 BOT-KYARA DENTRO DO VÍDEO
    //
    // Vídeos recebem a marca diretamente no arquivo.
    // A legenda do comando NÃO será enviada no vídeo.
    // ========================================================

    let publishBuffer =
      buffer;

    let caption =
      mediaInfo.type === 'image'
        ? text
        : '';

    if (
      mediaInfo.type === 'video'
    ) {
      publishBuffer =
        await addKyaraVideoWatermark(
          buffer
        );

      caption = '';
    }

    await publishChannel({
      type: mediaInfo.type,
      buffer: publishBuffer,
      caption,
      mime
    });

    channelLog(
      '✅ MÍDIA PUBLICADA NO CANAL'
    );

    const resultLabel = {
      image: '🖼️ foto',
      video: '🎥 vídeo',
      audio: '🎵 áudio'
    }[mediaInfo.type] ||
      mediaInfo.type;

    await reply(
      [
        '✅ *Publicado no canal BOT-KYARA!*',
        '',
        `📌 Tipo: ${resultLabel}`,
        `📦 Tamanho: ${(publishBuffer || buffer).length} bytes`,
        mime
          ? `🎞️ MIME: ${mime}`
          : '',
        caption
          ? '📝 Legenda enviada.'
          : ''
      ]
        .filter(Boolean)
        .join('\n')
    );

    return true;

  } catch (error) {
    console.error(
      '[STATUSCANAL][ERRO]',
      error?.stack ||
      error
    );

    try {
      await reply(
        [
          '❌ Falha ao publicar no canal BOT-KYARA.',
          '',
          `⚠️ ${error?.message || error}`
        ].join('\n')
      );
    } catch {}

    return true;
  }
}
