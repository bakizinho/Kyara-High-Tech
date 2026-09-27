import {
  generateWAMessageFromContent,
  prepareWAMessageMedia
} from 'baileys';

import * as youtube from '../funcs/downloads/youtube.js';
import { baixarHttp } from '../funcs/downloads/httpFallback.js';
import * as tiktok from '../funcs/downloads/tiktok.js';
import * as instagram from '../funcs/downloads/igdl.js';
import * as kwai from '../funcs/downloads/kwai.js';
import facebook from '../funcs/downloads/facebook.js';
import * as pinterest from '../funcs/downloads/pinterest.js';
import {
  executeCosmos,
  cleanupCosmosFiles
} from '../funcs/downloads/cosmos.js';
import * as twitter from '../funcs/utils/twitter.js';
import { isOwner } from '../core/menuDono/menu-dono.js';
import { handlePlay2 } from './kyaraPlay2.js';
import {
  handlePinterest,
  kyaraPinterestNativeCarousel
} from './kyaraPinterest.js';
import { sendHtmlGameFromOptions } from '../utils/htmlGame.js';

const searchCache = new Map();

function buildCosmosGalleryHtml(files, query) {
  const images = files
    .map((item, index) => {
      const url = String(item?.file || '').trim();

      if (!url) return '';

      return `
        <button
          class="cosmos-thumb"
          data-index="${index}"
          onclick="selectCosmosImage(${index})"
          type="button"
        >
          <img
            src="${url}"
            alt="Cosmos ${index + 1}"
            loading="lazy"
          >
        </button>
      `;
    })
    .filter(Boolean)
    .join('');

  const sources = files
    .map(item => String(item?.file || '').trim())
    .filter(Boolean);

  const firstImage = sources[0] || '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta
  name="viewport"
  content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
>

<title>Cosmos • Kyara</title>

<style>
*{
  box-sizing:border-box;
  margin:0;
  padding:0;
}

html,
body{
  width:100%;
  min-height:100%;
  background:#08090d;
  color:#fff;
  font-family:Arial,sans-serif;
}

body{
  padding:14px;
}

.cosmos-header{
  margin-bottom:12px;
}

.cosmos-title{
  font-size:20px;
  font-weight:800;
}

.cosmos-query{
  margin-top:4px;
  font-size:13px;
  opacity:.65;
}

.cosmos-main{
  width:100%;
  height:min(65vh,520px);
  border-radius:18px;
  overflow:hidden;
  background:#11141b;
  display:flex;
  align-items:center;
  justify-content:center;
}

.cosmos-main img{
  width:100%;
  height:100%;
  object-fit:contain;
  display:block;
}

.cosmos-counter{
  text-align:center;
  margin:10px 0;
  font-size:13px;
  opacity:.65;
}

.cosmos-strip{
  display:flex;
  gap:10px;
  overflow-x:auto;
  overflow-y:hidden;
  padding:4px 2px 12px;
  scroll-behavior:smooth;
  -webkit-overflow-scrolling:touch;
  scroll-snap-type:x proximity;
}

.cosmos-strip::-webkit-scrollbar{
  display:none;
}

.cosmos-thumb{
  flex:0 0 82px;
  width:82px;
  height:82px;
  padding:0;
  border:2px solid transparent;
  border-radius:14px;
  overflow:hidden;
  background:#151820;
  scroll-snap-align:start;
}

.cosmos-thumb.active{
  border-color:#fff;
}

.cosmos-thumb img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
</style>
</head>

<body>

<div class="cosmos-header">
  <div class="cosmos-title">🌌 COSMOS</div>
  <div class="cosmos-query">${String(query || '').replace(/</g,'&lt;')}</div>
</div>

<div class="cosmos-main">
  <img
    id="cosmos-main-image"
    src="${firstImage}"
    alt="Cosmos"
  >
</div>

<div class="cosmos-counter" id="cosmos-counter">
  1 / ${sources.length}
</div>

<div class="cosmos-strip" id="cosmos-strip">
  ${images}
</div>

<script>
const cosmosImages = ${JSON.stringify(sources)};

function selectCosmosImage(index){
  if(
    index < 0 ||
    index >= cosmosImages.length
  ){
    return;
  }

  const main =
    document.getElementById(
      'cosmos-main-image'
    );

  const counter =
    document.getElementById(
      'cosmos-counter'
    );

  main.src =
    cosmosImages[index];

  counter.textContent =
    (index + 1) +
    ' / ' +
    cosmosImages.length;

  document
    .querySelectorAll('.cosmos-thumb')
    .forEach((thumb, i) => {
      thumb.classList.toggle(
        'active',
        i === index
      );
    });
}

document.addEventListener(
  'DOMContentLoaded',
  () => {
    selectCosmosImage(0);
  }
);
</script>

</body>
</html>`;
}


/*
 * ============================================================
 * 🌌 KYARA COSMOS
 *
 * Pesquisa imagens públicas, baixa localmente e envia
 * diretamente para o WhatsApp.
 *
 * Usuário normal: até 10
 * Dono: até 30
 * ============================================================
 */

async function handleCosmos({
  nazu,
  from,
  info,
  reply,
  q
}) {
  const rawQuery =
    String(q || '').trim();

  /*
   * Aceita:
   *
   * #cosmos gato
   * #cosmos 5 gato
   * #cosmos 10 carros
   * #cosmos 30 naruto
   */

  const parts =
    rawQuery
      .split(/\s+/)
      .filter(Boolean);

  let requestedLimit = 10;

  if (
    parts.length &&
    /^\d+$/.test(parts[0])
  ) {
    requestedLimit =
      Number(parts.shift());
  }

  const query =
    parts.join(' ').trim();

  /*
   * Em grupo:
   *   info.key.participant = quem executou o comando
   *
   * Em conversa privada:
   *   info.key.remoteJid = quem executou o comando
   */
  const senderJid =
    info?.key?.participant ||
    info?.participant ||
    info?.key?.remoteJid ||
    from;

  const owner =
    isOwner(senderJid);

  const maximum =
    owner
      ? 30
      : 10;

  if (
    !Number.isInteger(requestedLimit) ||
    requestedLimit < 1
  ) {
    await reply(
      '❌ A quantidade precisa ser um número maior que 0.'
    );

    return true;
  }

  const limit =
    Math.min(
      requestedLimit,
      maximum
    );

  if (!query) {
    await reply(
      '❌ Use assim:\n' +
      '*#cosmos 5 gato*\n' +
      '*#cosmos 10 carros*'
    );

    return true;
  }

  let files = [];

  try {
    await reply(
      `🌌 *COSMOS*\n` +
      `🔎 Pesquisando: *${query}*\n` +
      `📸 Quantidade: *${limit} imagens*`
    );

    const result =
      await executeCosmos(
        query,
        owner,
        limit
      );

    files =
      Array.isArray(result?.files)
        ? result.files
        : [];

    if (!files.length) {
      await reply(
        `❌ Nenhuma imagem encontrada para *${query}*.`
      );

      return true;
    }

    const escapeHtml = value =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const uniqueFiles = [];
    const seenFiles = new Set();

    for (const item of files) {
      const url = String(item?.file || '').trim();

      if (!url || seenFiles.has(url)) {
        continue;
      }

      seenFiles.add(url);
      uniqueFiles.push(item);
    }

    if (!uniqueFiles.length) {
      await reply(
        '❌ Não consegui preparar nenhuma das imagens encontradas.'
      );

      return true;
    }

    const galleryItems =
      uniqueFiles.map((item, index) => {
        const url = escapeHtml(item.file);

        return `
          <button
            type="button"
            class="thumb"
            onclick="showImage(${index})"
          >
            <img
              src="${url}"
              alt="Cosmos ${index + 1}"
              loading="lazy"
            >
          </button>
        `;
      }).join('');

    const mainUrl =
      escapeHtml(uniqueFiles[0].file);

    const galleryHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">

<style>
*{
  box-sizing:border-box;
}

html,body{
  margin:0;
  padding:0;
  background:#080808;
  color:#fff;
  font-family:Arial,sans-serif;
}

body{
  padding:14px;
}

.card{
  width:100%;
  max-width:700px;
  margin:auto;
}

.title{
  font-size:20px;
  font-weight:700;
  margin-bottom:5px;
}

.query{
  color:#aaa;
  font-size:14px;
  margin-bottom:12px;
}

.main{
  width:100%;
  height:58vh;
  min-height:280px;
  max-height:620px;
  border-radius:18px;
  overflow:hidden;
  background:#111;
  display:flex;
  align-items:center;
  justify-content:center;
}

.main img{
  width:100%;
  height:100%;
  object-fit:contain;
  display:block;
}

.strip{
  display:flex;
  gap:9px;
  overflow-x:auto;
  padding:12px 2px 5px;
  scroll-snap-type:x mandatory;
  -webkit-overflow-scrolling:touch;
}

.strip::-webkit-scrollbar{
  display:none;
}

.thumb{
  flex:0 0 82px;
  width:82px;
  height:82px;
  padding:0;
  border:2px solid transparent;
  border-radius:12px;
  overflow:hidden;
  background:#161616;
  scroll-snap-align:start;
}

.thumb:first-child{
  border-color:#fff;
}

.thumb img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
</style>
</head>

<body>
<div class="card">

  <div class="title">🌌 COSMOS</div>

  <div class="query">
    🔎 ${escapeHtml(result.query)}
    · ${uniqueFiles.length} imagens
  </div>

  <div class="main">
    <img
      id="mainImage"
      src="${mainUrl}"
      alt="Cosmos"
    >
  </div>

  <div class="strip">
    ${galleryItems}
  </div>

</div>

<script>
const images = ${JSON.stringify(
  uniqueFiles.map(item => item.file)
)};

function showImage(index){
  const url = images[index];

  if(!url){
    return;
  }

  const main =
    document.getElementById('mainImage');

  if(!main){
    return;
  }

  main.setAttribute('src', url);

  document
    .querySelectorAll('.thumb')
    .forEach((button, i) => {
      button.style.borderColor =
        i === index
          ? '#fff'
          : 'transparent';
    });
}
</script>
</body>
</html>`;
    const cosmosImages =
      files.map(
        item => ({
          url:
            String(
              item?.file ||
              item?.imageUrl ||
              item?.originalUrl ||
              ""
            ).trim()
        })
      ).filter(
        item =>
          /^https?:\/\//i.test(
            item.url
          )
      );

    if(!cosmosImages.length){
      throw new Error(
        "Nenhuma imagem válida para o carousel."
      );
    }

    const requesterId =
      info?.participant ||
      info?.key?.participant ||
      from;

    console.log(
      `[COSMOS] 🎠 Enviando carousel nativo: ${cosmosImages.length} imagem(ns)`
    );

    await kyaraPinterestNativeCarousel(
      nazu,
      from,
      requesterId,
      result?.query || query,
      cosmosImages
    );

    console.log(
      `[COSMOS] ✅ Carousel nativo enviado: ${cosmosImages.length} imagem(ns)`
    );

    await reply(
      `✅ *COSMOS concluído!*
` +
      `🖼️ ${cosmosImages.length} imagens encontradas`
    );


    return true;

  } catch (error) {
    console.error(
      '[COSMOS] Erro:',
      error
    );

    await reply(
      `❌ Erro no Cosmos:\n${error?.message || error}`
    );

    return true;

  } finally {
    try {
      await cleanupCosmosFiles(
        files
      );
    } catch (error) {
      console.warn(
        '[COSMOS] Falha limpando temporários:',
        error?.message || error
      );
    }
  }
}



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

/*
 * ============================================================
 * ⚡ PLAY ULTRA FAST — CACHE DE STREAM
 * ============================================================
 *
 * O /play não espera o usuário clicar para começar
 * a descobrir o stream.
 *
 * Enquanto o card é preparado/enviado, o stream do
 * YouTube já pode ser resolvido em paralelo.
 *
 * A URL do YouTube é temporária, portanto o cache é
 * deliberadamente curto.
 */

const audioStreamCache = new Map();

const AUDIO_STREAM_TTL = 45 * 1000;



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
      const r =
        await facebook.downloadHD(
          source
        );

      if (r?.ok) {
        return r;
      }
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

  /*
   * FALLBACK UNIVERSAL
   *
   * Se yt-dlp e os módulos específicos não
   * conseguirem reconhecer a página, tenta:
   *
   * página HTML -> descobrir MP4/WebM -> baixar
   */
  if (!result?.ok) {
    try {
      const http =
        await baixarHttp(
          source
        );

      if (http?.ok) {
        return {
          ...http,
          sourceUrl: source
        };
      }

      console.log(
        '[KYARA UNIVERSAL] Fallback HTTP:',
        http?.msg || 'falhou'
      );
    } catch (error) {
      console.error(
        '[KYARA UNIVERSAL] Erro:',
        error?.message || error
      );
    }
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


/*
 * ============================================================
 * ⚡ PLAY ULTRA — PREFETCH CENTRALIZADO
 * ============================================================
 *
 * Existe UMA única entrada para preparar uma mídia.
 *
 * O botão e o /play nunca fazem uma segunda extração:
 *
 *     prefetch
 *        ↓
 *     youtube.stream()
 *        ↓
 *     cache / inflight
 *
 * ou:
 *
 *     prefetch
 *        ↓
 *     youtube.streamVideo()
 *        ↓
 *     cache / inflight
 */

function prefetchPlayMedia(url) {
  const source =
    cleanUrl(url);

  if (
    !source ||
    platformOf(source) !== 'YouTube'
  ) {
    return;
  }

  /*
   * IMPORTANTE:
   *
   * Não fazemos mais streamVideo().
   *
   * O /play prepara somente o áudio REAL.
   *
   * O download acontece em segundo plano enquanto
   * o usuário ainda está vendo o card.
   */

  if (
    typeof youtube.prefetchVoiceFile === 'function'
  ) {
    void youtube.prefetchVoiceFile(source)
      .then(file => {
        console.log(
          '[PLAY VOICE] 🚀 OGG/OPUS PRONTO:',
          file
        );
      })
      .catch(error => {
        console.warn(
          '[PLAY VOICE] Prefetch de voz falhou:',
          error?.message || error
        );
      });
  } else {
    console.warn(
      '[PLAY VOICE] prefetchVoiceFile não está disponível.'
    );
  }
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


  /*
   * ⚡ PRIMEIRA COISA DEPOIS DE CONHECER A URL
   *
   * Não aguardamos.
   * Enquanto o card, thumbnail e mensagem são preparados,
   * áudio e vídeo já estão sendo resolvidos.
   */
  prefetchPlayMedia(mediaUrl);

  /*
   * ⚡ Começa a resolver o stream imediatamente.
   *
   * Não usamos await aqui.
   * Assim a pesquisa/card não fica mais lento.
   * O stream é preparado em paralelo enquanto a
   * mensagem é montada/enviada.
   */
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

  const commandName =
    String(cmd || '')
      .trim()
      .toLowerCase();

  const commands =
    new Set([
      'play2',
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
      'pin',
      'cosmos'
    ]);

  if (
    !commands.has(commandName)
  ) {
    return false;
  }

  if (!query) {
    await reply(
      `❌ Use ${prefix}${commandName} <pesquisa ou URL>.`
    );

    return true;
  }


  /*
   * ============================================================
   * 🌌 COSMOS — pesquisa e envio direto de imagens
   * ============================================================
   */

  if (commandName === 'cosmos') {
    return handleCosmos({
      nazu,
      from,
      info,
      reply,
      q: query
    });
  }

  /*
   * ============================================================
   * PLAY2 + PINTEREST — fluxo direto
   * ============================================================
   */

  if (commandName === 'play2') {
    return handlePlay2({
      ...options,
      q: query
    });
  }

  if (
    commandName === 'pinterest' ||
    commandName === 'pin'
  ) {
    return handlePinterest({
      ...options,
      q: query
    });
  }

  if (
    commandName === 'play' &&
    platformOf(query) === 'Pinterest'
  ) {
    return handlePinterest({
      ...options,
      q: query
    });
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

    /*
     * ========================================================
     * ⚡ PLAY ULTRA FAST
     * ========================================================
     *
     * YouTube:
     *   NÃO baixa MP3.
     *   NÃO usa FFmpeg.
     *   NÃO cria Buffer gigante.
     *   NÃO grava arquivo temporário.
     *
     * O Baileys recebe diretamente a URL do melhor
     * stream de áudio disponível.
     */

          if (
        platformOf(url) === 'YouTube'
      ) {
        try {
          const started = Date.now();

          console.log(
            '[PLAY VOICE] 📩 Clique recebido'
          );

          try {
            await nazu.sendMessage(
              from,
              {
                text:
                  '🎙️ Preparando áudio, aguarde...'
              },
              {
                quoted: info
              }
            );
          } catch {}

          if (
            typeof youtube.prefetchVoiceFile !==
            'function'
          ) {
            throw new Error(
              'prefetchVoiceFile não está disponível no youtube.js.'
            );
          }

          const voiceFile =
            await youtube.prefetchVoiceFile(url);

          console.log(
            `[PLAY VOICE] ⚡ Arquivo pronto em ${Date.now() - started}ms`
          );

          console.log(
            '[PLAY VOICE] 📤 Enviando mensagem de voz...'
          );

          await nazu.sendMessage(
            from,
            {
              audio: {
                url: voiceFile
              },
              mimetype:
                'audio/ogg; codecs=opus',
              ptt: true
            },
            {
              quoted: info
            }
          );

          console.log(
            `[PLAY VOICE] ✅ Voz enviada em ${Date.now() - started}ms`
          );

          return true;

        } catch (error) {
          console.warn(
            '[PLAY VOICE] ❌ Falha:',
            error?.message || error
          );

          throw error;
        }
      }

    /*
     * FALLBACK UNIVERSAL
     *
     * Usado para plataformas que não sejam YouTube
     * ou caso o stream direto falhe.
     */

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

    /*
     * ========================================================
     * ⚡ PLAY VIDEO ULTRA FAST
     * ========================================================
     *
     * Não usamos downloadVideo().
     *
     * O vídeo já pode estar sendo preparado pelo prefetch
     * iniciado quando o card foi criado.
     *
     * Fluxo:
     *
     * YouTube
     *   ↓
     * URL MP4 muxada
     *   ↓
     * Baileys
     *   ↓
     * WhatsApp
     *
     * Sem:
     *   - download completo
     *   - Buffer gigante
     *   - arquivo temporário
     *   - FFmpeg
     */

    if (
      platformOf(url) === 'YouTube' &&
      typeof youtube.streamVideo === 'function'
    ) {
      try {
        console.log(
          '[PLAY VIDEO ULTRA] ⚡ Obtendo stream direto...'
        );

        const stream =
          await youtube.streamVideo(url);

        if (
          !stream?.url ||
          !/^https?:\/\//i.test(stream.url)
        ) {
          throw new Error(
            stream?.msg ||
            'Stream de vídeo não encontrado.'
          );
        }

        console.log(
          '[PLAY VIDEO ULTRA] ⚡ Stream pronto'
        );

        await nazu.sendMessage(
          from,
          {
            video: {
              url:
                stream.url
            },

            mimetype:
              stream.mimetype ||
              'video/mp4',

            fileName:
              'video.mp4'
          },
          {
            quoted: info
          }
        );

        console.log(
          '[PLAY VIDEO ULTRA] ✅ Vídeo enviado diretamente'
        );

        return true;

      } catch (error) {
        console.warn(
          '[PLAY VIDEO ULTRA] Stream direto falhou:',
          error?.message ||
          error
        );

        /*
         * Só cai no método antigo se a URL direta realmente
         * falhar. O caminho normal não passa por downloadVideo.
         */
      }
    }

    await reply(
      '🎬 *Preparando vídeo...*'
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


/*
 * Limpa entradas antigas do cache de stream.
 */
function cleanupAudioStreamCache() {
  const now = Date.now();

  for (
    const [key, value]
    of audioStreamCache
  ) {
    if (
      now - value.time >
      AUDIO_STREAM_TTL
    ) {
      audioStreamCache.delete(key);
    }
  }
}

setInterval(
  cleanupAudioStreamCache,
  AUDIO_STREAM_TTL
).unref?.();
