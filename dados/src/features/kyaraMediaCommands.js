import {
  generateWAMessageFromContent,
  prepareWAMessageMedia
} from 'baileys';

import * as youtube from '../funcs/downloads/youtube.js';
import * as tiktok from '../funcs/downloads/tiktok.js';
import * as instagram from '../funcs/downloads/igdl.js';
import * as kwai from '../funcs/downloads/kwai.js';
import facebook from '../funcs/downloads/facebook.js';
import * as pinterest from '../funcs/downloads/pinterest.js';
import * as twitter from '../funcs/utils/twitter.js';

const searchCache = new Map();


/*
 * ============================================================
 * 🔒 PLAY DEDUP
 *
 * Um único card por solicitação.
 * ============================================================
 */
const playDedup = new Map();

const PLAY_DEDUP_TTL = 15000;

function allowPlayCard(from, data) {
  const source =
    String(
      data?.sourceUrl ||
      data?.url ||
      ''
    ).trim();

  const title =
    String(
      data?.title ||
      ''
    ).trim().toLowerCase();

  const key =
    `${String(from || '')}|${source}|${title}`;

  const now =
    Date.now();

  const previous =
    playDedup.get(key);

  if (
    previous &&
    now - previous <
    PLAY_DEDUP_TTL
  ) {
    console.log(
      `[PLAY DEDUP] ⛔ Segundo card bloqueado: ${title || source}`
    );

    return false;
  }

  playDedup.set(
    key,
    now
  );

  setTimeout(
    () => {
      if (
        playDedup.get(key) === now
      ) {
        playDedup.delete(key);
      }
    },
    PLAY_DEDUP_TTL + 1000
  ).unref?.();

  return true;
}

const buttonUrls = new Map();

const SEARCH_TTL = 10 * 60 * 1000;
const BUTTON_TTL = 30 * 60 * 1000;

function cleanUrl(value = '') {
  return String(value)
    .trim()
    .replace(/[)\]}>.,]+$/g, '');
}

function isUrl(value = '') {
  return /^https?:\/\/\S+$/i.test(
    String(value).trim()
  );
}

function platformOf(value = '') {
  if (!isUrl(value)) return '';

  try {
    const host =
      new URL(value)
        .hostname
        .toLowerCase()
        .replace(/^www\./, '');

    if (
      host === 'youtube.com' ||
      host === 'youtu.be' ||
      host.endsWith('.youtube.com')
    ) {
      return 'YouTube';
    }

    if (
      host === 'tiktok.com' ||
      host.endsWith('.tiktok.com')
    ) {
      return 'TikTok';
    }

    if (
      host === 'instagram.com' ||
      host === 'instagr.am' ||
      host.endsWith('.instagram.com')
    ) {
      return 'Instagram';
    }

    if (
      host === 'facebook.com' ||
      host === 'fb.watch' ||
      host.endsWith('.facebook.com')
    ) {
      return 'Facebook';
    }

    if (
      host === 'kwai.com' ||
      host === 'kwai-video.com' ||
      host.endsWith('.kwai.com')
    ) {
      return 'Kwai';
    }

    if (
      host === 'twitter.com' ||
      host === 'x.com' ||
      host.endsWith('.twitter.com') ||
      host.endsWith('.x.com')
    ) {
      return 'Twitter/X';
    }

    if (
      host === 'pinterest.com' ||
      host === 'pin.it' ||
      host.endsWith('.pinterest.com')
    ) {
      return 'Pinterest';
    }

  } catch {}

  return '';
}

function formatViews(value) {
  const n = Number(value);

  return (
    Number.isFinite(n) &&
    n > 0
  )
    ? n.toLocaleString('pt-BR')
    : '0';
}

function searchDomain(platform) {
  return {
    TikTok: 'tiktok.com',
    Instagram: 'instagram.com',
    Facebook: 'facebook.com',
    Kwai: 'kwai.com',
    'Twitter/X': 'x.com',
    Pinterest: 'pinterest.com'
  }[platform] || '';
}

/*
 * Pesquisa gratuita na web para plataformas
 * que não possuem pesquisa local no módulo atual.
 */
async function webSearch(platform, query) {
  const domain =
    searchDomain(platform);

  if (!domain) {
    return null;
  }

  const key =
    `${platform}:${query.toLowerCase()}`;

  const cached =
    searchCache.get(key);

  if (
    cached &&
    Date.now() - cached.time <
      SEARCH_TTL
  ) {
    return cached.url;
  }

  const endpoint =
    `https://html.duckduckgo.com/html/?q=` +
    encodeURIComponent(
      `site:${domain} ${query}`
    );

  try {
    const response =
      await fetch(
        endpoint,
        {
          headers: {
            'user-agent':
              'Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
          }
        }
      );

    if (!response.ok) {
      return null;
    }

    const html =
      await response.text();

    const matches =
      [
        ...html.matchAll(
          /uddg=([^&"']+)/g
        )
      ];

    for (
      const match of matches
    ) {
      try {
        const url =
          decodeURIComponent(
            match[1]
          );

        if (
          platformOf(url) ===
          platform
        ) {
          searchCache.set(
            key,
            {
              url,
              time: Date.now()
            }
          );

          return url;
        }

      } catch {}
    }

  } catch {}

  return null;
}

async function getInfo(url) {
  const endereco =
    cleanUrl(url);

  const result =
    await youtube.info(
      endereco
    );

  if (!result?.ok) {
    return result;
  }

  return {
    ...result,

    data: {
      ...result.data,

      sourceUrl:
        endereco,

      platform:
        platformOf(endereco) ||
        result.data?.platform ||
        result.data?.extractor ||
        'Mídia'
    }
  };
}

async function downloadVideo(url) {
  const source =
    cleanUrl(url);

  /*
   * Primeira tentativa:
   * yt-dlp + melhor qualidade.
   */
  const result =
    await youtube.mp4(
      source
    );

  if (result?.ok) {
    return result;
  }

  /*
   * Fallbacks dos módulos existentes.
   */
  const platform =
    platformOf(source);

  try {

    if (
      platform === 'Instagram'
    ) {
      const r =
        await instagram.dl(
          source
        );

      const item =
        r?.data?.find(
          x =>
            x.type === 'video'
        ) ||
        r?.data?.[0];

      if (item?.url) {
        return {
          ok: true,
          remoteUrl: item.url,
          mimetype:
            item.mime ||
            'video/mp4',
          filename:
            'instagram.mp4'
        };
      }
    }

    if (
      platform === 'Facebook'
    ) {
      return facebook.downloadHD(
        source
      );
    }

    if (
      platform === 'Kwai'
    ) {
      const r =
        await kwai.dl(
          source
        );

      const item =
        r?.data?.[0];

      if (item?.buff) {
        return {
          ok: true,
          buffer: item.buff,
          mimetype:
            item.mime ||
            'video/mp4',
          filename:
            'kwai.mp4'
        };
      }

      if (item?.url) {
        return {
          ok: true,
          remoteUrl: item.url,
          mimetype:
            item.mime ||
            'video/mp4',
          filename:
            'kwai.mp4'
        };
      }
    }

    if (
      platform === 'TikTok'
    ) {
      const r =
        await tiktok.dl(
          source
        );

      const media =
        Array.isArray(r?.urls)
          ? r.urls[0]
          : r?.urls;

      if (media) {
        return {
          ok: true,
          remoteUrl: media,
          mimetype:
            'video/mp4',
          filename:
            'tiktok.mp4'
        };
      }
    }

    if (
      platform === 'Twitter/X'
    ) {
      const r =
        await twitter.getInfo(
          source
        );

      const media =
        r?.media?.find(
          x =>
            x.type === 'video'
        ) ||
        r?.media?.[0];

      if (media?.url) {
        return {
          ok: true,
          remoteUrl: media.url,
          mimetype:
            'video/mp4',
          filename:
            'twitter.mp4'
        };
      }
    }

  } catch (error) {
    return {
      ok: false,

      msg:
        error?.message ||
        result?.msg ||
        'Falha no download.'
    };
  }

  return result;
}

async function downloadAudio(url) {
  return youtube.mp3(
    cleanUrl(url)
  );
}

async function pinterestImage(url) {
  const result =
    await pinterest.dl(
      cleanUrl(url)
    );

  const imageUrl =
    result?.urls?.[0];

  if (imageUrl) {
    return {
      ok: true,
      remoteUrl:
        imageUrl,
      mimetype:
        result.mime ||
        'image/jpeg'
    };
  }

  return {
    ok: false,
    msg:
      result?.msg ||
      'Imagem não encontrada.'
  };
}

/*
 * Guarda a URL REAL.
 *
 * O botão recebe somente um token curto,
 * evitando problemas com URLs enormes.
 */
function rememberButton(url) {
  const token =
    `m${Date.now().toString(36)}` +
    `${Math.random().toString(36).slice(2, 8)}`;

  buttonUrls.set(
    token,
    {
      url,
      time: Date.now()
    }
  );

  return token;
}

function resolveButton(value) {
  const token =
    String(value || '').trim();

  const item =
    buttonUrls.get(token);

  if (!item) {
    return null;
  }

  if (
    Date.now() - item.time >
    BUTTON_TTL
  ) {
    buttonUrls.delete(token);
    return null;
  }

  return item.url;
}

function cleanupButtons() {
  const now =
    Date.now();

  for (
    const [key, item]
    of buttonUrls
  ) {
    if (
      now - item.time >
      BUTTON_TTL
    ) {
      buttonUrls.delete(key);
    }
  }
}

async function search(platform, query) {
  const q =
    String(query || '').trim();

  if (!q) {
    return {
      ok: false,
      msg:
        'Digite o que deseja pesquisar.'
    };
  }

  /*
   * YouTube.
   */
  if (
    platform === 'YouTube'
  ) {
    return youtube.search(q);
  }

  /*
   * TikTok.
   */
  if (
    platform === 'TikTok'
  ) {
    try {
      const result =
        await tiktok.search(q);

      if (
        result?.ok &&
        result.link
      ) {
        return {
          ok: true,

          data: {
            title:
              result.title ||
              q,

            url:
              result.link,

            sourceUrl:
              result.link,

            thumbnail:
              result.thumbnail ||
              '',

            author: {
              name:
                result.author ||
                result.username ||
                'TikTok'
            },

            seconds:
              Number(
                result.duration
              ) || 0,

            timestamp:
              result.duration ||
              '0:00',

            views:
              Number(
                result.views
              ) || 0,

            platform
          }
        };
      }

    } catch {}
  }

  /*
   * Pinterest.
   */
  if (
    platform === 'Pinterest'
  ) {
    try {
      const result =
        await pinterest.search(q);

      if (
        result?.ok &&
        result.urls?.[0]
      ) {
        return {
          ok: true,

          data: {
            title: q,

            url:
              result.urls[0],

            sourceUrl:
              result.urls[0],

            thumbnail:
              result.urls[0],

            author: {
              name:
                'Pinterest'
            },

            seconds: 0,

            timestamp:
              'imagem',

            views: 0,

            platform
          }
        };
      }

    } catch {}
  }

  /*
   * Pesquisa web gratuita para as demais.
   */
  const found =
    await webSearch(
      platform,
      q
    );

  if (!found) {
    return {
      ok: false,

      msg:
        `Não encontrei um resultado público de ${platform}.`
    };
  }

  return getInfo(found);
}

async function sendCard({
  nazu,
  from,
  info,
  reply,
  prefix,
  data
}) {

  /*
   * 🔒 Apenas um card para a mesma solicitação.
   */
  if (
    !allowPlayCard(
      from,
      data
    )
  ) {
    return true;
  }



  /*
   * 🔒 DEDUPLICAÇÃO
   *
   * Se dois caminhos chamarem sendCard() para o mesmo
   * resultado ao mesmo tempo, somente o primeiro envia.
   */
const mediaUrl =
    data?.sourceUrl ||
    data?.url;

  if (!mediaUrl) {
    throw new Error(
      'URL da mídia não encontrada.'
    );
  }

  const title =
    String(
      data?.title ||
      'Mídia'
    ).slice(0, 180);

  const author =
    String(
      data?.author?.name ||
      data?.uploader ||
      data?.channel ||
      data?.platform ||
      'Desconhecido'
    ).slice(0, 100);

  const duration =
    String(
      data?.timestamp ||
      'Desconhecida'
    );

  const views =
    formatViews(
      data?.views
    );

  const platform =
    data?.platform ||
    platformOf(
      mediaUrl
    ) ||
    'Mídia';

  const thumbnail =
    data?.thumbnail ||
    (
      data?.videoId
        ? `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`
        : ''
    );

  const buttons = [
    {
      name: 'quick_reply',

      buttonParamsJson:
        JSON.stringify({
          display_text:
            '🎵 Baixar Áudio',

          id:
            `${prefix}playaudio ${rememberButton(mediaUrl)}`
        })
    },

    {
      name: 'quick_reply',

      buttonParamsJson:
        JSON.stringify({
          display_text:
            '🎬 Baixar Vídeo',

          id:
            `${prefix}playvideo ${rememberButton(mediaUrl)}`
        })
    }
  ];

  const caption =
    `🎵 *${title}*\n\n` +
    `👤 *Artista/Canal:* ${author}\n` +
    `⏱️ *Duração:* ${duration}\n` +
    `👀 *Visualizações:* ${views}\n` +
    `🌐 *Fonte:* ${platform}\n\n` +
    `🌸 *Kyara*\n` +
    `Selecione o formato desejado:`;

  let imageMessage =
    null;

  if (thumbnail) {
    try {
      const response =
        await fetch(
          thumbnail
        );

      if (response.ok) {
        const buffer =
          Buffer.from(
            await response.arrayBuffer()
          );

        if (buffer.length) {
          const prepared =
            await prepareWAMessageMedia(
              {
                image: buffer
              },
              {
                upload:
                  nazu.waUploadToServer
              }
            );

          imageMessage =
            prepared?.imageMessage ||
            null;
        }
      }

    } catch (error) {
      console.warn(
        `[PLAY KYARA] Thumbnail indisponível: ${error?.message || error}`
      );
    }
  }

  const interactiveMessage = {
    body: {
      text: caption
    },

    footer: {
      text:
        '🌸 Kyara • © Baki'
    },

    nativeFlowMessage: {
      buttons,

      messageParamsJson:
        '{}',

      messageVersion: 1
    }
  };

  if (imageMessage) {
    interactiveMessage.header = {
      hasMediaAttachment: true,
      imageMessage
    };
  }

  const msg =
    generateWAMessageFromContent(
      from,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },

            interactiveMessage
          }
        }
      },
      {
        quoted: info,
        userJid:
          nazu?.user?.id
      }
    );

  const bizNode = {
    tag: 'biz',

    attrs: {
      actual_actors: '2',

      host_storage: '2',

      privacy_mode_ts:
        String(
          Math.floor(
            Date.now() / 1000
          ) -
          77980457
        )
    },

    content: [
      {
        tag: 'interactive',

        attrs: {
          type: 'native_flow',
          v: '1'
        },

        content: [
          {
            tag: 'native_flow',

            attrs: {
              v: '9',
              name: 'mixed'
            }
          }
        ]
      },

      {
        tag: 'quality_control',

        attrs: {
          source_type:
            'third_party'
        }
      }
    ]
  };

  const additionalNodes =
    from.endsWith('@g.us')
      ? [bizNode]
      : [
          {
            tag: 'bot',

            attrs: {
              biz_bot: '1'
            }
          },

          bizNode
        ];

  await nazu.relayMessage(
    from,
    msg.message,
    {
      messageId:
        msg.key.id,

      additionalNodes
    }
  );

  // IMPORTANTE:
  // sendCard tratou o comando com sucesso.
  // O index.js precisa receber true para NÃO
  // continuar até o "Comando não encontrado".
  return true;
}

async function handle(options = {}) {
  const {
    command,
    q,
    prefix = '/',
    from,
    nazu,
    info,
    reply
  } = options;

  const cmd =
    String(command || '')
      .toLowerCase()
      .trim();

  const query =
    String(q || '').trim();

  const commands =
    new Set([
      'play',
      'playaudio',
      'playvideo',
      'playvid',
      'ytmp3',
      'ytmp4',
      'tiktok',
      'instagram',
      'facebook',
      'kwai',
      'twitter',
      'x',
      'pinterest',
      'pin'
    ]);

  if (
    !commands.has(cmd)
  ) {
    return false;
  }

  if (!query) {
    await reply(
      `❌ Use ${prefix}${cmd} <pesquisa ou URL>.`
    );

    return true;
  }


  /*
   * ============================================================
   * KYARA_V7_PLUS_PINTEREST_GATE
   * ============================================================
   *
   * Pinterest NÃO deve passar por youtube.info(),
   * youtube.mp3() ou youtube.mp4().
   */

  {
    const pinterestCommand =
      cmd === 'pin' ||
      cmd === 'pinterest';

    const pinterestUrl =
      typeof query === 'string' &&
      query.trim() &&
      platformOf(query) === 'Pinterest';

    const pinterestPlay =
      cmd === 'play' &&
      pinterestUrl;

    if (pinterestCommand || pinterestPlay) {
      console.log('[PINTEREST V7 PLUS] Entrada detectada:', query);

      try {
        let result;

        if (isUrl(query)) {
          console.log('[PINTEREST V7 PLUS] Baixando URL...');
          result = await pinterest.dl(query);
        } else {
          console.log('[PINTEREST V7 PLUS] Pesquisando:', query);
          result = await pinterest.search(query);
        }

        if (!result) {
          await reply(
            '❌ Não encontrei conteúdo público do Pinterest.'
          );
          return true;
        }

        const image =
          result.url ||
          result.directLink ||
          result.image ||
          result.imageUrl ||
          result.thumbnail ||
          result.media;

        if (!image) {
          await reply(
            '❌ Encontrei o Pin, mas não consegui obter a imagem.'
          );
          return true;
        }

        try {
          await nazo.sendMessage(
            from,
            {
              image: {
                url: image
              },
              caption: '📌 *Pinterest V7 PLUS*'
            },
            {
              quoted: options?.msg
            }
          );

          console.log('[PINTEREST V7 PLUS] Enviado por URL.');
          return true;

        } catch (remoteError) {
          console.log(
            '[PINTEREST V7 PLUS] Falha no envio remoto:',
            remoteError?.message || remoteError
          );
        }

        try {
          const response = await fetch(image);

          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status}`
            );
          }

          const buffer = Buffer.from(
            await response.arrayBuffer()
          );

          await nazo.sendMessage(
            from,
            {
              image: buffer,
              caption: '📌 *Pinterest V7 PLUS*'
            },
            {
              quoted: options?.msg
            }
          );

          console.log('[PINTEREST V7 PLUS] Enviado por buffer.');
          return true;

        } catch (bufferError) {
          console.log(
            '[PINTEREST V7 PLUS] Falha no buffer:',
            bufferError?.message || bufferError
          );

          await reply(
            '❌ Não consegui enviar a mídia do Pinterest.'
          );

          return true;
        }

      } catch (error) {
        console.log(
          '[PINTEREST V7 PLUS] Erro:',
          error?.message || error
        );

        await reply(
          '❌ Não foi possível obter esse conteúdo do Pinterest.'
        );

        /*
         * MUITO IMPORTANTE:
         * Mesmo com erro, retorna true.
         * Assim o Pinterest não cai no sistema legado
         * nem no youtube/yt-dlp.
         */
        return true;
      }
    }
  }


  /*
   * AUDIO.
   */
  if (
    cmd === 'playaudio'
  ) {
    const resolved =
      resolveButton(query) ||
      query;

    const url =
      isUrl(resolved)
        ? resolved
        : (
            /^[A-Za-z0-9_-]{6,20}$/
              .test(resolved)
              ? `https://www.youtube.com/watch?v=${resolved}`
              : ''
          );

    if (!url) {
      await reply(
        '❌ Envie uma URL ou ID do YouTube válido.'
      );

      return true;
    }

    await reply(
      '🎵 *Baixando áudio na melhor qualidade disponível...*'
    );

    const result =
      await downloadAudio(
        url
      );

    if (
      !result?.ok
    ) {
      await reply(
        `❌ ${
          result?.msg ||
          'Falha no áudio.'
        }`
      );

      return true;
    }

    await nazu.sendMessage(
      from,
      {
        audio:
          result.buffer,

        mimetype:
          result.mimetype ||
          'audio/mpeg',

        fileName:
          result.filename ||
          'audio.mp3'
      },
      {
        quoted: info
      }
    );

    return true;
  }

  /*
   * VÍDEO.
   */
  if (
    [
      'playvideo',
      'playvid',
      'ytmp4'
    ].includes(cmd)
  ) {
    const resolved =
      resolveButton(query) ||
      query;

    const url =
      isUrl(resolved)
        ? resolved
        : (
            /^[A-Za-z0-9_-]{6,20}$/
              .test(resolved)
              ? `https://www.youtube.com/watch?v=${resolved}`
              : ''
          );

    if (!url) {
      await reply(
        '❌ Envie uma URL ou ID do YouTube válido.'
      );

      return true;
    }

    await reply(
      '🎬 *Baixando vídeo na melhor qualidade disponível...*'
    );

    const result =
      await downloadVideo(
        url
      );

    if (
      !result?.ok
    ) {
      await reply(
        `❌ ${
          result?.msg ||
          'Falha no vídeo.'
        }`
      );

      return true;
    }

    if (
      result.buffer
    ) {
      await nazu.sendMessage(
        from,
        {
          video:
            result.buffer,

          mimetype:
            result.mimetype ||
            'video/mp4',

          fileName:
            result.filename ||
            'video.mp4'
        },
        {
          quoted: info
        }
      );

    } else if (
      result.remoteUrl
    ) {
      await nazu.sendMessage(
        from,
        {
          video: {
            url:
              result.remoteUrl
          },

          mimetype:
            result.mimetype ||
            'video/mp4',

          fileName:
            result.filename ||
            'video.mp4'
        },
        {
          quoted: info
        }
      );
    }

    return true;
  }

  const platform =
    cmd === 'play'
      ? (
          isUrl(query)
            ? (
                platformOf(query) ||
                'Mídia'
              )
            : 'YouTube'
        )
      : (
          {
            tiktok: 'TikTok',
            instagram: 'Instagram',
            facebook: 'Facebook',
            kwai: 'Kwai',
            twitter: 'Twitter/X',
            x: 'Twitter/X',
            pinterest: 'Pinterest',
            pin: 'Pinterest'
          }[cmd]
        );

  /*
   * /play é universal.
   *
   * Com URL, o yt-dlp recebe diretamente o endereço.
   * Assim não dependemos do reconhecimento da plataforma
   * pelo Kyara.
   */
  if (
    !platform &&
    cmd !== 'play'
  ) {
    await reply(
      '❌ Plataforma não reconhecida.'
    );

    return true;
  }

  /*
   * URL:
   * nunca passa por pesquisa.
   */
  if (
    isUrl(query)
  ) {
    if (
      cmd !== 'play' &&
      platformOf(query) !==
      platform
    ) {
      await reply(
        `❌ Esta URL não pertence ao ${platform}.`
      );

      return true;
    }

    const meta =
      await getInfo(query);

    if (!meta?.ok) {
      await reply(
        `❌ ${
          meta?.msg ||
          'Não foi possível processar esta URL.'
        }`
      );

      return true;
    }

    return sendCard({
      nazu,
      from,
      info,
      prefix,

      data: {
        ...meta.data,

        sourceUrl:
          query,

        platform:
          cmd === 'play'
            ? (
                platformOf(query) ||
                'Mídia'
              )
            : platform
      }
    });
  }

  /*
   * TEXTO:
   * pesquisa.
   */
  if (cmd !== 'play') {
    await reply(
      `🔎 *Pesquisando no ${platform}...*`
    );
  }

  const result =
    await search(
      platform,
      query
    );

  if (!result?.ok) {
    await reply(
      `❌ ${
        result?.msg ||
        'Nenhum resultado encontrado.'
      }`
    );

    return true;
  }

  return sendCard({
    nazu,
    from,
    info,
    prefix,

    data: {
      ...result.data,

      platform,

      sourceUrl:
        result.data?.sourceUrl ||
        result.data?.url
    }
  });
}

export {
  handle,
  resolveButton,
  platformOf
};
