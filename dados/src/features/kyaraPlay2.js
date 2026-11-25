import { getConfiguredBotName, KYARA_CREATOR_NAME } from '../core/identity/kyara-identity.js';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  generateWAMessageFromContent,
  prepareWAMessageMedia
} from 'baileys';

import * as youtube from '../funcs/downloads/youtube.js';

const API_BASE =
  'https://tedzinho.com.br/api';

const SEARCH_TIMEOUT = 9000;
const DOWNLOAD_TIMEOUT = 120000;
const TOKEN_TTL = 15 * 60 * 1000;

const tokens = new Map();

function limparTokenCache() {
  const agora = Date.now();

  for (const [token, item] of tokens) {
    if (
      !item ||
      item.expires <= agora
    ) {
      tokens.delete(token);
    }
  }
}

function gerarToken(data) {
  limparTokenCache();

  const token =
    crypto
      .randomBytes(8)
      .toString('hex');

  tokens.set(token, {
    ...data,
    expires:
      Date.now() + TOKEN_TTL
  });

  return token;
}

function obterToken(token) {
  limparTokenCache();

  const item =
    tokens.get(
      String(token || '').trim()
    );

  if (!item) {
    return null;
  }

  return item;
}

function carregarApiKey() {
  try {
    const arquivo =
      path.join(
        process.cwd(),
        'dados',
        'src',
        'config.json'
      );

    const config =
      JSON.parse(
        fs.readFileSync(
          arquivo,
          'utf8'
        )
      );

    return String(
      process.env.API_KEY_TED ||
      process.env.TED_API_KEY ||
      config.API_KEY_TED ||
      config.APIKEY_SYS ||
      process.env.APIKEY_SYS ||
      ''
    ).trim();

  } catch (error) {
    console.error(
      '[PLAY2] Erro lendo config.json:',
      error?.message || error
    );

    return String(
      process.env.API_KEY_TED ||
      process.env.TED_API_KEY ||
      process.env.APIKEY_SYS ||
      ''
    ).trim();
  }
}

function textoSeguro(value) {
  return String(
    value ?? ''
  )
    .replace(/\r?\n/g, ' ')
    .trim();
}

function escaparTexto(value) {
  return String(
    value ?? ''
  )
    .replace(/[\\]/g, '\\\\')
    .replace(/["]/g, '\\"');
}

function formatarDuracao(seconds) {
  const total =
    Math.max(
      0,
      Math.floor(
        Number(seconds) || 0
      )
    );

  const horas =
    Math.floor(
      total / 3600
    );

  const minutos =
    Math.floor(
      (total % 3600) / 60
    );

  const segundos =
    total % 60;

  if (horas > 0) {
    return `${horas}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  }

  return `${minutos}:${String(segundos).padStart(2, '0')}`;
}

function formatarVisualizacoes(value) {
  const n =
    Number(value) || 0;

  if (!n) {
    return '';
  }

  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(1)} mi`;
  }

  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)} mil`;
  }

  return String(n);
}

function obterVideoId(url) {
  try {
    const value =
      String(url || '').trim();

    if (
      value.includes('youtu.be/')
    ) {
      return value
        .split('youtu.be/')[1]
        .split(/[?&#]/)[0];
    }

    return (
      new URL(value)
        .searchParams
        .get('v') || ''
    );

  } catch {
    return '';
  }
}

function obterThumbnail(item) {
  const direto =
    textoSeguro(
      item?.thumbnail
    );

  if (
    /^https?:\/\//i.test(direto)
  ) {
    return direto;
  }

  const id =
    obterVideoId(
      item?.url
    );

  if (!id) {
    return '';
  }

  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function obterUrlVideo(item) {
  const url =
    textoSeguro(
      item?.url ||
      item?.link
    );

  if (
    /^https?:\/\//i.test(url)
  ) {
    return url;
  }

  const id =
    textoSeguro(
      item?.videoId ||
      item?.id
    );

  if (id) {
    return `https://www.youtube.com/watch?v=${id}`;
  }

  return '';
}

function normalizarResultadoYoutube(result) {
  const data =
    result?.data ||
    result?.video ||
    result;

  const url =
    obterUrlVideo(data);

  if (!url) {
    return null;
  }

  return {
    url,

    title:
      textoSeguro(
        data?.title ||
        data?.titulo ||
        'Vídeo do YouTube'
      ),

    artist:
      textoSeguro(
        data?.author?.name ||
        data?.author ||
        data?.channel?.name ||
        data?.channel ||
        'YouTube'
      ),

    seconds:
      Number(
        data?.seconds ||
        data?.duration ||
        data?.durationSeconds ||
        0
      ) || 0,

    views:
      Number(
        data?.views ||
        data?.visualizacoes ||
        0
      ) || 0,

    thumbnail:
      obterThumbnail(data)
  };
}

/*
 * ============================================================
 * PESQUISA
 *
 * Não usamos mais a pesquisa da API TED aqui.
 * O youtube.search() do próprio projeto já possui timeout
 * e fallback yt-dlp.
 * ============================================================
 */
async function pesquisarVideo(query) {
  const termo =
    textoSeguro(query);

  if (!termo) {
    throw new Error(
      'Digite o nome da música.'
    );
  }

  console.log(
    '[PLAY2] 🔎 Pesquisa local:',
    termo
  );

  try {
    const resultado =
      await Promise.race([
        youtube.search(termo),

        new Promise((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  'Pesquisa local excedeu 9 segundos.'
                )
              ),
            SEARCH_TIMEOUT
          );
        })
      ]);

    if (resultado?.ok) {
      const item =
        normalizarResultadoYoutube(
          resultado
        );

      if (item) {
        console.log(
          '[PLAY2] ✅ Resultado:',
          item.title
        );

        return item;
      }
    }

    throw new Error(
      resultado?.msg ||
      'Nenhum resultado encontrado.'
    );

  } catch (error) {
    console.error(
      '[PLAY2] ❌ Pesquisa falhou:',
      error?.message ||
      error
    );

    throw new Error(
      'Não consegui encontrar o vídeo agora.'
    );
  }
}

async function obterInfoUrl(url) {
  const endereco =
    String(url || '').trim();

  try {
    const resultado =
      await Promise.race([
        youtube.info(endereco),

        new Promise((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  'Consulta da URL excedeu o tempo limite.'
                )
              ),
            SEARCH_TIMEOUT
          );
        })
      ]);

    if (resultado?.ok) {
      const item =
        normalizarResultadoYoutube(
          resultado
        );

      if (item) {
        return item;
      }
    }

  } catch (error) {
    console.warn(
      '[PLAY2] Não consegui metadados da URL:',
      error?.message ||
      error
    );
  }

  return {
    url: endereco,
    title: 'Vídeo do YouTube',
    artist: 'YouTube',
    seconds: 0,
    views: 0,
    thumbnail:
      obterThumbnail({
        url: endereco
      })
  };
}

/*
 * ============================================================
 * THUMBNAIL
 * ============================================================
 */
async function prepararThumbnail(kya, thumbnails) {
  if (typeof kya?.waUploadToServer !== 'function') return null;

  const candidatos = [...new Set(
    (Array.isArray(thumbnails) ? thumbnails : [thumbnails])
      .filter(url => typeof url === 'string' && /^https?:\/\//i.test(url))
  )];

  for (const url of candidatos) {
    try {
      console.log('[PLAY2] Tentando preparar capa:', url);

      const preparado = await Promise.race([
        prepareWAMessageMedia(
          { image: { url } },
          { upload: kya.waUploadToServer }
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tempo limite da capa')), 9000)
        )
      ]);

      if (preparado?.imageMessage) {
        console.log('[PLAY2] Capa preparada com sucesso.');
        return preparado.imageMessage;
      }
    } catch (error) {
      console.warn('[PLAY2] Tentativa de capa falhou:', error?.message || error);
    }
  }

  console.warn('[PLAY2] Nenhuma miniatura pôde ser preparada.');
  return null;
}

/*
 * ============================================================
 * CARD NATIVO
 * ============================================================
 */
async function enviarCard(options, item) {
  const {
    kya,
    from,
    info,
    title,
    searchTerm = '',
    prefix = '#'
  } = options;

  const nomeBotVisual = getConfiguredBotName() || '𝗞𝗬𝗔𝗥𝗔-𝗦𝗬𝗦𝗧Ξ𝗠';

  const limparTextoVisual = (valor) =>
    String(valor ?? '')
      .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const safeTitle = limparTextoVisual(item.title) || 'Vídeo do YouTube';
  const safeAuthor = limparTextoVisual(item.artist) || 'YouTube';
  const duracao = formatarDuracao(item.seconds);
  const views = formatarVisualizacoes(item.views);

  const urlDoVideo = String(item.url || '');
  const idYouTube = (() => {
    const resultado = urlDoVideo.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/i
    );
    return resultado?.[1] || null;
  })();

  const fontesDaCapa = [
    item.thumbnail,
    obterThumbnail({ url: item.url }),
    idYouTube ? 'https://i.ytimg.com/vi/' + idYouTube + '/hqdefault.jpg' : null,
    idYouTube ? 'https://i.ytimg.com/vi/' + idYouTube + '/mqdefault.jpg' : null
  ].filter(Boolean);

  const imageMessage = await prepararThumbnail(kya, fontesDaCapa);

  const linhas =
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '             ' + nomeBotVisual + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '『 𝗧𝗜́𝗧𝗨𝗟𝗢 』\n╰➤ ' + safeTitle + '\n\n' +
    '『 𝗖𝗔𝗡𝗔𝗟 』\n╰➤ ' + safeAuthor + '\n\n' +
    '『 𝗗𝗨𝗥𝗔ÇÃ𝗢 』\n╰➤ ' + (duracao || '?') + '\n\n' +
    (views ? '『 𝗩𝗜𝗦𝗨𝗔𝗟𝗜𝗭𝗔ÇÕ𝗘𝗦 』\n╰➤ ' + views + '\n\n' : '') +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '𝗦𝗘𝗟𝗘𝗖𝗜𝗢𝗡𝗘 𝗨𝗠𝗔 𝗢𝗣ÇÃ𝗢 𝗔𝗕𝗔𝗜𝗫𝗢';
  const audioToken = gerarToken({
    type: 'audio',
    url: item.url,
    title: item.title
  });

  const videoToken = gerarToken({
    type: 'video',
    url: item.url,
    title: item.title
  });

  const buttons = [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '𝗕𝗔𝗜𝗫𝗔𝗥 Á𝗨𝗗𝗜𝗢',
        id: 'play2audio ' + audioToken
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '𝗕𝗔𝗜𝗫𝗔𝗥 𝗩Í𝗗𝗘𝗢',
        id: 'play2video ' + videoToken
      })
    }
  ];

  // Busca rápida; o seletor continua disponível mesmo sem resultados.
  let searchTimer;
  let rows = [];

  try {
    const ytModule = await import('yt-search');
    const ytSearch = ytModule.default || ytModule;

    const resultadoBusca = await Promise.race([
      ytSearch(searchTerm || safeTitle),
      new Promise(resolve => {
        searchTimer = setTimeout(() => resolve(null), 1400);
      })
    ]);

    rows = (Array.isArray(resultadoBusca?.videos)
      ? resultadoBusca.videos
      : [])
      .filter(v => v?.url && v.url !== item.url)
      .slice(0, 5)
      .map(v => ({
        title: String(v.title || 'Vídeo').slice(0, 60),
        description: (
          'Duração: ' + String(v.timestamp || '?') +
          ' | Canal: ' + String(v.author?.name || 'YouTube')
        ).slice(0, 72),
        id: prefix + 'play ' + v.url
      }));
  } catch (error) {
    console.warn('[PLAY2] Busca de similares falhou:', error?.message || error);
  } finally {
    clearTimeout(searchTimer);
  }

  buttons.push({
    name: 'single_select',
    buttonParamsJson: JSON.stringify({
      title: '𝗩𝗜́𝗗𝗘𝗢𝗦 𝗦𝗜𝗠𝗜𝗟𝗔𝗥𝗘𝗦',
      sections: [{
        title: 'Escolha um vídeo',
        rows: rows.length ? rows : [{
          title: 'Pesquisar novamente',
          description: String(searchTerm || safeTitle).slice(0, 72),
          id: prefix + 'play ' + String(searchTerm || safeTitle)
        }]
      }]
    })
  });

  buttons.push(
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: '𝗩Ø𝗫-𝗦𝗬𝗦𝗧Ξ𝗠',
        url: 'https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r'
      })
    },
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: '𝗢 𝗖𝗢𝗠𝗘Ç𝗢',
        url: 'https://whatsapp.com/channel/0029VbCXBCy8fewmEhto8J0w'
      })
    },
    {
      name: 'cta_copy',
      buttonParamsJson: JSON.stringify({
        display_text: '𝗖𝗢𝗣𝗜𝗔𝗥 𝗟𝗜𝗡𝗞',
        copy_code: item.url
      })
    }
  );

  const interactiveMessage = {
    body: { text: linhas },
    footer: { text: nomeBotVisual + ' • ' + KYARA_CREATOR_NAME + ' • CENTRAL DE DOWNLOADS' },

    ...(imageMessage
      ? {
          header: {
            hasMediaAttachment: true,
            imageMessage
          }
        }
      : {}),

    nativeFlowMessage: {
      buttons,
      messageParamsJson: JSON.stringify({
        limited_time_offer: {
          text: getConfiguredBotName(),
          url: 'https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r',
          copy_code: getConfiguredBotName(),
          expiration_time: Date.now() + (86400000 * 30)
        },
        bottom_sheet: {
          in_thread_buttons_limit: 3,
          divider_indices: [1, 2, 3, 999],
          list_title: 'OPÇÕES DE DOWNLOAD',
          button_title: 'SELECIONAR'
        },
        tap_target_configuration: {
          title: getConfiguredBotName(),
          description: 'CENTRAL DE DOWNLOADS',
          canonical_url: 'https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r',
          domain: 'whatsapp.com',
          button_index: 0
        }
      }),
      messageVersion: 1
    }
  };

  const msg = generateWAMessageFromContent(
    from,
    {
      viewOnceMessage: {
        message: { interactiveMessage }
      }
    },
    {
      quoted: info,
      userJid: kya?.user?.id
    }
  );

  console.log('[PLAY2] Enviando cartão Kyara:', {
    title: safeTitle,
    thumbnail: Boolean(imageMessage),
    buttons: buttons.length
  });

  let relayTimer;

  try {
    await Promise.race([
      kya.relayMessage(
        from,
        msg.message,
        { messageId: msg.key.id }
      ),
      new Promise((_, reject) => {
        relayTimer = setTimeout(
          () => reject(new Error('Timeout no envio Native Flow (8s)')),
          8000
        );
      })
    ]);

    console.log('[PLAY2] Relay do cartão concluído:', msg.key.id);
  } catch (error) {
    console.error(
      '[PLAY2] Cartão interativo falhou:',
      error?.stack || error
    );

    await kya.sendMessage(
      from,
      {
        text:
          linhas +
          '\n\n🎵 Áudio: ' + prefix + 'play2audio ' + audioToken +
          '\n🎬 Vídeo: ' + prefix + 'play2video ' + videoToken +
          '\n📢 𝗩Ø𝗫-𝗦𝗬𝗦𝗧Ξ𝗠: https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r' +
          '\n👤 Canal do 𝗩Ø𝗫-𝗦𝗬𝗦𝗧Ξ𝗠: https://whatsapp.com/channel/0029VbCXBCy8fewmEhto8J0w' +
          '\n🔗 ' + item.url
      },
      { quoted: info }
    );

    console.log('[PLAY2] Fallback textual enviado.');
    return;
  } finally {
    clearTimeout(relayTimer);
  }

  // O pré-carregamento fica fora do caminho crítico de envio.
  void youtube.streamVideo(item.url)
    .then(() => {
      console.log('[PLAY2] Vídeo pré-carregado');
    })
    .catch(error => {
      console.warn('[PLAY2] Prefetch falhou:', error?.message || error);
    });
}

/*
 * ============================================================
 * PLAY2
 * ============================================================
 */
export async function handlePlay2(
  options = {}
) {
  const {
    kya,
    from,
    info
  } = options;

  const query =
    textoSeguro(
      options.q ||
      options.query
    );

  if (!query) {
    return options.reply?.(
      '❌ Digite o nome da música ou envie um link do YouTube.'
    );
  }

  try {
    if (
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(
        query
      )
    ) {
      console.log(
        '[PLAY2] 🔗 URL recebida'
      );

      const item =
        await obterInfoUrl(
          query
        );

      await enviarCard(
        {
          kya,
          from,
          info,
          title:
            options.botName ||
            '⚡ KYARA DL',
          searchTerm: query,
          prefix: options.prefix || '#'
        },
        item
      );

      console.log(
        '[PLAY2] ✅ Card enviado'
      );

      return;
    }

    const item =
      await pesquisarVideo(
        query
      );

    await enviarCard(
      {
        kya,
        from,
        info,
        title:
            options.botName ||
            '⚡ KYARA DL',
          searchTerm: query,
          prefix: options.prefix || '#'
      },
      item
    );

    console.log(
      '[PLAY2] ✅ Card enviado'
    );

  } catch (error) {
    console.error(
      '[PLAY2] ❌ ERRO PRINCIPAL:',
      error?.stack ||
      error
    );

    await kya.sendMessage(
      from,
      {
        text:
          `❌ ${error?.message || 'Não foi possível pesquisar agora.'}`
      },
      {
        quoted: info
      }
    );
  }
}

/*
 * ============================================================
 * ÁUDIO - TED play_audio/v9
 * ============================================================
 */
export async function handlePlay2Audio(
  options = {}
) {
  const {
    kya,
    from,
    info
  } = options;

  const token =
    textoSeguro(
      options.token ||
      options.args?.[0] ||
      options.q
    );

  const data =
    obterToken(token);

  if (
    !data ||
    data.type !== 'audio'
  ) {
    return kya.sendMessage(
      from,
      {
        text:
          '❌ Este botão expirou. Pesquise novamente com #play2.'
      },
      {
        quoted: info
      }
    );
  }

  const apiKey =
    carregarApiKey();

  if (!apiKey) {
    throw new Error(
      'API_KEY_TED não configurada.'
    );
  }

  console.log(
    '[PLAY2 AUDIO] 🎵 Baixando:',
    data.url
  );

  try {
    const response =
      await axios.get(
        `${API_BASE}/download/play_audio/v9`,
        {
          params: {
            apikey:
              apiKey,

            nome_url:
              data.url
          },

          responseType:
            'arraybuffer',

          timeout:
            DOWNLOAD_TIMEOUT,

          maxRedirects:
            5,

          headers: {
            'User-Agent':
              'Mozilla/5.0',
            Accept:
              'audio/mpeg,audio/*,*/*'
          }
        }
      );

    const buffer =
      Buffer.from(
        response.data
      );

    if (!buffer.length) {
      throw new Error(
        'A API retornou um áudio vazio.'
      );
    }

    console.log(
      '[PLAY2 AUDIO] ✅ Áudio recebido:',
      buffer.length,
      'bytes'
    );

    const nome =
      textoSeguro(
        data.title ||
        'audio'
      )
        .replace(
          /[<>:"/\\|?*\x00-\x1F]/g,
          ''
        )
        .slice(0, 120) ||
      'audio';

    await kya.sendMessage(
      from,
      {
        audio:
          buffer,

        mimetype:
          'audio/mpeg',

        ptt:
          false,

        fileName:
          `${nome}.mp3`
      },
      {
        quoted: info
      }
    );

    console.log(
      '[PLAY2 AUDIO] ✅ Enviado'
    );

  } catch (error) {
    console.error(
      '[PLAY2 AUDIO] ❌ TED falhou:',
      error?.response?.status ||
      error?.message ||
      error
    );

    /*
     * FALLBACK KYARA
     */
    try {
      console.log(
        '[PLAY2 AUDIO] 🔄 Usando fallback youtube.mp3()'
      );

      const resultado =
        await youtube.mp3(
          data.url,
          128
        );

      if (
        !resultado?.ok ||
        !resultado?.buffer
      ) {
        throw new Error(
          resultado?.msg ||
          'Fallback não retornou áudio.'
        );
      }

      await kya.sendMessage(
        from,
        {
          audio:
            resultado.buffer,

          mimetype:
            'audio/mpeg',

          ptt:
            false,

          fileName:
            resultado.filename ||
            'audio.mp3'
        },
        {
          quoted: info
        }
      );

      console.log(
        '[PLAY2 AUDIO] ✅ Fallback enviado'
      );

    } catch (fallbackError) {
      console.error(
        '[PLAY2 AUDIO] ❌ Fallback também falhou:',
        fallbackError?.stack ||
        fallbackError
      );

      await kya.sendMessage(
        from,
        {
          text:
            '❌ Não consegui baixar o áudio agora.'
        },
        {
          quoted: info
        }
      );
    }
  }
}

/*
 * ============================================================
 * VÍDEO - TED play_video/v5
 * ============================================================
 */
function extrairVideoUrl(data) {
  if (!data) {
    return '';
  }

  if (
    typeof data === 'string' &&
    /^https?:\/\//i.test(data)
  ) {
    return data;
  }

  const candidatos = [
    data?.url,
    data?.download,
    data?.download_url,
    data?.downloadUrl,
    data?.video,
    data?.video_url,
    data?.videoUrl,
    data?.result?.url,
    data?.result?.download,
    data?.data?.url,
    data?.data?.download,
    data?.data?.video
  ];

  for (const item of candidatos) {
    if (
      typeof item === 'string' &&
      /^https?:\/\//i.test(item)
    ) {
      return item;
    }
  }

  return '';
}


export async function handlePlay2Video(
  options = {}
) {
  const {
    kya,
    from,
    info
  } = options;

  const token =
    textoSeguro(
      options.token ||
      options.args?.[0] ||
      options.q
    );

  const data =
    obterToken(token);

  if (
    !data ||
    data.type !== 'video'
  ) {
    return kya.sendMessage(
      from,
      {
        text:
          '❌ Este botão expirou. Pesquise novamente com #play2.'
      },
      {
        quoted: info
      }
    );
  }

  const nome =
    textoSeguro(
      data.title ||
      'video'
    )
      .replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        ''
      )
      .slice(0, 120) ||
    'video';

  console.log(
    '[PLAY2 VIDEO] ⚡ Iniciando:',
    data.url
  );

  /*
   * 1. STREAM RÁPIDO
   *
   * O streamVideo() já possui:
   * - TED direto
   * - cache
   * - yt-dlp
   * - inflight
   *
   * Não chamamos a TED novamente aqui.
   */
  try {
    const resultado =
      await youtube.streamVideo(
        data.url
      );

    if (
      resultado?.ok &&
      resultado?.url
    ) {
      await kya.sendMessage(
        from,
        {
          video: {
            url:
              resultado.url
          },

          mimetype:
            resultado.mimetype ||
            'video/mp4',

          fileName:
            `${nome}.mp4`
        },
        {
          quoted: info
        }
      );

      console.log(
        '[PLAY2 VIDEO] ✅ Stream enviado'
      );

      return;
    }

    throw new Error(
      resultado?.msg ||
      'Stream não retornou URL.'
    );

  } catch (error) {
    console.warn(
      '[PLAY2 VIDEO] ⚠️ Stream falhou:',
      error?.message ||
      error
    );
  }

  /*
   * 2. FALLBACK MP4 REAL
   */
  try {
    console.log(
      '[PLAY2 VIDEO] ⬇️ Gerando MP4...'
    );

    const resultado =
      await youtube.mp4(
        data.url
      );

    if (
      !resultado?.ok ||
      !resultado?.buffer
    ) {
      throw new Error(
        resultado?.msg ||
        'yt-dlp não gerou o MP4.'
      );
    }

    await kya.sendMessage(
      from,
      {
        video:
          resultado.buffer,

        mimetype:
          resultado.mimetype ||
          'video/mp4',

        fileName:
          `${nome}.mp4`
      },
      {
        quoted: info
      }
    );

    console.log(
      '[PLAY2 VIDEO] ✅ MP4 enviado'
    );

  } catch (error) {
    console.error(
      '[PLAY2 VIDEO] ❌ Falhou:',
      error?.stack ||
      error
    );

    await kya.sendMessage(
      from,
      {
        text:
          '❌ Não consegui baixar este vídeo agora.'
      },
      {
        quoted: info
      }
    );
  }
}

