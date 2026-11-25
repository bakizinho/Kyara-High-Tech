import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto
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
import {
  handlePlay2,
  handlePlay2Audio,
  handlePlay2Video
} from './kyaraPlay2.js';
import {
  handlePinterest,
  kyaraPinterestNativeCarousel
} from './kyaraPinterest.js';
import { sendHtmlGameFromOptions } from '../utils/htmlGame.js';
import { sendKyaraMediaAlbum } from '../core/mediaAlbum/index.js';

import fs from 'node:fs';
import path from 'node:path';
import { arePlayButtonsEnabled } from '../menus/categorias/sistema/menu-button-state.js';

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
  kya,
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
      kya,
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
          signal:
            AbortSignal.timeout(8000),

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
  let result;

  try {
    result = await youtube.mp4(source);
  } catch (error) {
    result = {
      ok: false,
      msg: error?.message ||
        'yt-dlp não conseguiu baixar a mídia.'
    };
  }

  if (result?.ok) return result;

  /*
   * Fallbacks dos módulos existentes.
   */
  const platform =
    platformOf(source);

  try {

    if (
      platform === 'Instagram'
    ) {
      const r = await instagram.dl(source);

      if (
        r?.ok &&
        Buffer.isBuffer(r.buffer) &&
        r.buffer.length
      ) {
        return {
          ok: true,
          buffer: r.buffer,
          mimetype: r.mime || 'video/mp4',
          filename: 'instagram.mp4'
        };
      }

      const item =
        r?.data?.find(x => x.type === 'video') ||
        r?.data?.[0];

      if (item?.buff || item?.url) {
        return {
          ok: true,
          buffer: item.buff || undefined,
          remoteUrl: item.url || undefined,
          mimetype: item.mime || 'video/mp4',
          filename: 'instagram.mp4'
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
      const r = await tiktok.dl(source);

      if (
        r?.ok &&
        Buffer.isBuffer(r.buffer) &&
        r.buffer.length
      ) {
        return {
          ok: true,
          buffer: r.buffer,
          mimetype: r.mime || 'video/mp4',
          filename: 'tiktok.mp4'
        };
      }

      const media = Array.isArray(r?.urls)
        ? r.urls[0]
        : r?.urls;

      if (media) {
        return {
          ok: true,
          remoteUrl: media,
          mimetype: 'video/mp4',
          filename: 'tiktok.mp4'
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
    platformOf(source) !==
      'YouTube'
  ) {
    return;
  }

  const tarefas = [];

  /*
   * 🎙️ VOZ
   */
  if (
    typeof youtube.prefetchAudioFile ===
    'function'
  ) {

    tarefas.push(

      youtube
        .prefetchAudioFile(
          source
        )

        .then(url => {

          console.log(
            '[PLAY TURBO] 🎵 Áudio pronto:',
            url ? 'SIM' : 'NÃO'
          );

        })

        .catch(error => {

          console.warn(
            '[PLAY TURBO] Áudio:',
            error?.message ||
            error
          );

        })

    );

  }

  /*
   * 🎬 VÍDEO
   */
  if (
    typeof youtube.streamVideo ===
    'function'
  ) {

    tarefas.push(

      youtube
        .streamVideo(
          source
        )

        .then(result => {

          if (
            result?.url
          ) {

            console.log(
              '[PLAY TURBO] 🎬 Vídeo pronto'
            );

          }

        })

        .catch(error => {

          console.warn(
            '[PLAY TURBO] Vídeo:',
            error?.message ||
            error
          );

        })

    );

  }

  if (
    tarefas.length
  ) {

    void Promise.allSettled(
      tarefas
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

/*
 * SANDRO_COMPAT_PLAY_V2
 *
 * Usa o mesmo config do menu.
 */
function readPlayButtonsEnabled() {
  return arePlayButtonsEnabled();
}

function isPublicResultUrl(platform, value) {
  try {
    const u = new URL(String(value || '').trim());

    if (platformOf(u.href) !== platform) return false;

    const p = u.pathname.toLowerCase();

    if (platform === 'TikTok') {
      return /\/@[^/]+\/video\/\d+/.test(p);
    }

    if (platform === 'Instagram') {
      return /^\/(?:reel|reels|p|tv)\//.test(p);
    }

    if (platform === 'Facebook') {
      return /(?:watch|reel|videos?|share\/v|watch\.php)/.test(p);
    }

    if (platform === 'Kwai') {
      return /(?:video|photo|short-video|@)/.test(p);
    }

    if (platform === 'Twitter/X') {
      return /\/status\/\d+/.test(p);
    }

    return false;

  } catch {
    return false;
  }
}

async function searchMany(platform, query, limit = 10) {
  const term = String(query || '').trim();

  if (!term) return [];

  if (platform === 'TikTok') {
    const result = await tiktok.search(term);

    const values = Array.isArray(result?.urls)
      ? result.urls
      : (result?.link ? [result.link] : []);

    return [
      ...new Set(
        values.filter(url =>
          isPublicResultUrl(platform, url)
        )
      )
    ].slice(0, limit);
  }

  const domain = searchDomain(platform);

  if (!domain) return [];

  const key = `multi:${platform}:${term.toLowerCase()}`;
  const cached = searchCache.get(key);

  if (
    cached &&
    Date.now() - cached.time < SEARCH_TTL &&
    Array.isArray(cached.urls)
  ) {
    return cached.urls.slice(0, limit);
  }

  const endpoint =
    `https://html.duckduckgo.com/html/?q=${
      encodeURIComponent(`site:${domain} ${term}`)
    }`;

  const found = new Set();

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'user-agent':
          'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'
      }
    });

    if (response.ok) {
      const html = (await response.text())
        .replace(/&amp;/gi, '&');

      for (const match of html.matchAll(/uddg=([^&"']+)/g)) {
        try {
          const u = new URL(decodeURIComponent(match[1]));

          u.search = '';
          u.hash = '';

          if (isPublicResultUrl(platform, u.href)) {
            found.add(u.href);
          }

        } catch {}

        if (found.size >= limit) break;
      }
    }

  } catch (error) {
    console.warn(
      `[KYARA SEARCH ${platform}]`,
      error?.message || error
    );
  }

  const urls = [...found].slice(0, limit);

  searchCache.set(key, {
    urls,
    time: Date.now()
  });

  return urls;
}

async function mapSocialResults(urls, concurrency = 2) {
  const output = new Array(urls.length);
  let cursor = 0;

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, urls.length) },
      async () => {
        while (true) {
          const i = cursor++;

          if (i >= urls.length) return;

          try {
            const result = await downloadVideo(urls[i]);

            const source =
              result?.buffer ||
              result?.remoteUrl ||
              result?.path;

            if (!result?.ok || !source) {
              output[i] = null;
              continue;
            }

            const size = Buffer.isBuffer(source)
              ? source.length
              : 0;

            if (size > 35 * 1024 * 1024) {
              output[i] = null;
              continue;
            }

            const mime =
              result.mimetype ||
              result.mime ||
              'video/mp4';

            output[i] = {
              type: String(mime).startsWith('image/')
                ? 'image'
                : 'video',
              source,
              mimetype: mime
            };

          } catch (error) {
            console.warn(
              '[KYARA ALBUM ITEM]',
              urls[i],
              error?.message || error
            );

            output[i] = null;
          }
        }
      }
    )
  );

  return output.filter(Boolean).slice(0, 10);
}

async function sendPlatformSearchAlbum({
  kya,
  from,
  info,
  reply,
  platform,
  query,
  urls
}) {
  await reply(
    `╭━━〔 ✦ KYARA DOWNLOADS ✦ 〕━━╮\n` +
    `┃ 🔎 Pesquisa: ${String(query || 'link direto').slice(0, 90)}\n` +
    `┃ 📱 Plataforma: ${platform}\n` +
    `┃ 📦 Links encontrados: ${urls.length}\n` +
    `┃ ⚡ Preparando coleção...\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
  );

  const items = await mapSocialResults(urls, 2);

  if (!items.length) {
    await reply(
      '❌ Não consegui baixar nenhuma mídia pública. ' +
      'O conteúdo pode exigir login, estar indisponível ou ter bloqueado a extração.'
    );

    return true;
  }

  const totalBytes = items.reduce(
    (sum, item) =>
      sum + (
        Buffer.isBuffer(item.source)
          ? item.source.length
          : 0
      ),
    0
  );

  if (totalBytes > 120 * 1024 * 1024) {
    await reply(
      '❌ A coleção ultrapassou o limite seguro de memória para envio.'
    );

    return true;
  }

  const album = items.map((item, index) => ({
    type: item.type,
    source: item.source,
    mimetype: item.mimetype,

    caption: index === 0
      ? `╭━━〔 ✦ KYARA • DOWNLOAD PRIME ✦ 〕━━╮\n` +
        `┃ 🔎 Pesquisa: ${String(query || 'Link direto').slice(0, 90)}\n` +
        `┃ 📱 Origem: ${platform}\n` +
        `┃ 📦 Mídias: ${items.length}/10\n` +
        `┃ ✅ Coleção preparada\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n` +
        `🌸 Kyara • © VØX-SYSTΞM`
      : ''
  }));

  try {
    await sendKyaraMediaAlbum(
      kya,
      from,
      album,
      {
        parentOptions: info
          ? { quoted: info }
          : {}
      }
    );

    console.log(
      `[KYARA DOWNLOAD PRIME] Álbum ${items.length}/${urls.length} • ${platform}`
    );

  } catch (error) {
    console.error(
      '[KYARA DOWNLOAD PRIME] Falha no álbum:',
      error?.stack || error
    );

    await reply(
      `❌ Não consegui enviar o álbum: ${
        error?.message || 'erro no WhatsApp.'
      }`
    );
  }

  if (items.length < urls.length) {
    await reply(
      `ℹ️ ${items.length} de ${urls.length} resultados estavam disponíveis para download.`
    );
  }

  return true;
}

async function sendPlatformDirectDownload({
  kya,
  from,
  info,
  reply,
  platform,
  url
}) {
  return sendPlatformSearchAlbum({
    kya,
    from,
    info,
    reply,
    platform,
    query: 'Link enviado',
    urls: [url]
  });
}

async function sendCard({
  kya,
  from,
  info,
  reply,
  prefix,
  data
}) {
  if (!allowPlayCard(from, data)) {
    return true;
  }

  const mediaUrl = String(
    data?.sourceUrl ||
    data?.url ||
    ''
  ).trim();

  if (!mediaUrl) {
    throw new Error(
      'URL da mídia não encontrada.'
    );
  }

  const platform =
    data?.platform ||
    platformOf(mediaUrl) ||
    'Mídia';

  const title = String(
    data?.title ||
    'Mídia'
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);

  const author = String(
    data?.author?.name ||
    data?.uploader ||
    data?.channel ||
    platform ||
    'Desconhecido'
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

  const duration = String(
    data?.timestamp ||
    'Não informado'
  );

  /*
   * ========================================================
   * TOKENS
   * ========================================================
   */

  const audioToken =
    rememberButton(mediaUrl);

  const videoToken =
    rememberButton(mediaUrl);

  /*
   * ========================================================
   * PREFETCH
   * ========================================================
   *
   * Continua em segundo plano.
   * Não bloqueia o card.
   */

  /*
   * ========================================================
   * TÍTULO
   * ========================================================
   */

  let playTitle =
    title
      .split('|')
      .map(
        item =>
          item.trim()
      )
      .filter(Boolean)
      .slice(0, 2)
      .join(' • ');

  if (
    playTitle.length >
    56
  ) {
    playTitle =
      `${playTitle.slice(
        0,
        55
      ).trimEnd()}…`;
  }

  const caption =
    `╔━᳀『 🎬 𝗬𝗢𝗨𝗧𝗨𝗕𝗘 𝗣𝗟𝗔𝗬 』═᳀\n` +
    `┃\n` +
    `⌬ ✦ 𝗧𝗶́𝘁𝘂𝗹𝗼 : ${playTitle}\n` +
    `┃\n` +
    `⌬ ✦ 𝗖𝗮𝗻𝗮𝗹 : ${author}\n` +
    `┃ ✦ 𝗗𝘂𝗿𝗮𝗰̧𝗮̃𝗼 : ${duration}\n` +
    `┃\n` +
    `⌬ ✦ 𝗘𝘀𝗰𝗼𝗹𝗵𝗮 𝘂𝗺𝗮 𝗼𝗽𝗰̧𝗮̃𝗼 𝗮𝗯𝗮𝗶𝘅𝗼\n` +
    `┃\n` +
    `╚═━═━═━═━═━═━═━═━═᳀\n` +
    `\n💫 𝗖𝗹𝗶𝗾𝘂𝗲 𝗻𝗼 𝗯𝗼𝘁𝗮̃𝗼 𝗱𝗲𝘀𝗲𝗷𝗮𝗱𝗼 💫`;

  /*
   * ========================================================
   * BOTÕES TED
   * ========================================================
   *
   * OS DOIS ficam dentro do mesmo Native Flow.
   */

  const buttons = [
    {
      name:
        'quick_reply',

      buttonParamsJson:
        JSON.stringify({
          display_text:
            '🎵 Áudio (MP3)',

          id:
            `play_mp3|${audioToken}`
        })
    },

    {
      name:
        'quick_reply',

      buttonParamsJson:
        JSON.stringify({
          display_text:
            '🎥 Vídeo (MP4)',

          id:
            `play_mp4|${videoToken}`
        })
    }
  ];

  /*
   * ========================================================
   * THUMBNAIL
   * ========================================================
   *
   * A thumbnail tem timeout.
   * Se falhar, o CARD CONTINUA SEM IMAGEM.
   */

  /*
   * TED STYLE:
   * O card não fica esperando thumbnail.
   * Isso deixa o /play aparecer imediatamente.
   */
  const imageMessage = null;

    /*
   * ========================================================
   * INTERACTIVE MESSAGE
   * ========================================================
   *
   * ESTA É A PARTE CRÍTICA DO TED.
   */

  const interactiveMessage = {

    body: {
      text:
        caption
    },

    footer: {
      text:
        '🌸 Kyara • © 𝗩Ø𝗫-𝗦𝗬𝗦𝗧Ξ𝗠'
    },

    nativeFlowMessage: {

      buttons,

      messageParamsJson:
        '{}',

      messageVersion:
        1

    }

  };

  if (
    imageMessage
  ) {

    interactiveMessage.header = {

      hasMediaAttachment:
        true,

      imageMessage

    };

  }

  /*
   * ========================================================
   * WAMESSAGE
   * ========================================================
   *
   * NÃO enviar interactiveMessage cru.
   */

  const msg =
    generateWAMessageFromContent(

      from,

      {

        viewOnceMessage: {

          message: {

            messageContextInfo: {

              deviceListMetadata:
                {},

              deviceListMetadataVersion:
                2

            },

            interactiveMessage

          }

        }

      },

      {

        quoted:
          info,

        userJid:
          kya?.user?.id

      }

    );

  /*
   * ========================================================
   * NÓ TED / BIZ / NATIVE FLOW
   * ========================================================
   */

  const bizNode = {

    tag:
      'biz',

    attrs: {

      actual_actors:
        '2',

      host_storage:
        '2',

      privacy_mode_ts:
        String(
          Math.floor(
            Date.now() / 1000
          ) - 77980457
        )

    },

    content: [

      {

        tag:
          'interactive',

        attrs: {

          type:
            'native_flow',

          v:
            '1'

        },

        content: [

          {

            tag:
              'native_flow',

            attrs: {

              v:
                '9',

              name:
                'mixed'

            }

          }

        ]

      },

      {

        tag:
          'quality_control',

        attrs: {

          source_type:
            'third_party'

        }

      }

    ]

  };

  const isGroup =
    String(
      from || ''
    ).endsWith(
      '@g.us'
    );

  const additionalNodes =
    isGroup

      ? [
          bizNode
        ]

      : [

          {

            tag:
              'bot',

            attrs: {

              biz_bot:
                '1'

            }

          },

          bizNode

        ];

  console.log(
    `[PLAY] 🚀 Enviando Native Flow TED ${
      isGroup
        ? 'GRUPO'
        : 'PRIVADO'
    }...`
  );

  console.log(
    '[PLAY] Botões:',
    buttons.map(
      button =>
        JSON.parse(
          button.buttonParamsJson
        ).display_text
    )
  );

  /*
   * ========================================================
   * ENVIO REAL
   * ========================================================
   */

  console.log('[PLAY] Enviando Native Flow:', title);
  try {
    await kya.relayMessage(from, msg.message, { messageId: msg.key.id, additionalNodes });
    console.log('[PLAY] Native Flow relay aceito:', title);
  } catch (sendError) {
    console.error('[PLAY] Native Flow falhou:', sendError?.stack || sendError);
    await kya.sendMessage(from, { text: caption + '\n\n🔗 ' + mediaUrl }, { quoted: info });
    console.log('[PLAY] Fallback textual enviado');
    return true;
  }

  console.log(
    `[PLAY] ✅ Card TED enviado: ${title}`
  );

  return true;
}


async function handle(options = {}) {
  const {
    command,
    q,
    prefix = '/',
    from,
    kya,
    info,
    reply
  } = options;

  const cmd =
    String(command || '')
      .toLowerCase()
      .trim();

  const query =
    String(q || '').trim();

  const rawCommand =
    String(cmd || '')
      .trim()
      .toLowerCase();

  const mediaAliases = {

    play1:
      'play',

    play3:
      'play',

    play4:
      'play',

    play5:
      'play',

    playmix:
      'play',

    playvid2:
      'playvideo',

    ytsearch:
      'play',

    ytsearch2:
      'play',

    pesquisaytb:
      'play',

    tiktok2:
      'tiktok',

    tiktok3:
      'tiktok',

    tiktok4:
      'tiktok',

    tiktok5:
      'tiktok',

    instagram2:
      'instagram',

    instagramaudio:
      'instagram',

    facebook2:
      'facebook',

    twitteraudio:
      'twitter',

    twittervideo:
      'twitter'

  };

  const commandName =
    mediaAliases[
      rawCommand
    ] ||
    rawCommand;

  const commands =
    new Set([
      'play2',
      'play2audio',
      'play2video',
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

  const isPinterestCountCommand =
    /^pinterest(?:[1-9]|1\d|20)$/.test(
      String(commandName || '').toLowerCase()
    );

  if (
    !commands.has(commandName) &&
    !isPinterestCountCommand
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
      kya,
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

  if (commandName === 'play2audio') {
    return handlePlay2Audio({
      ...options,
      q: query
    });
  }

  if (commandName === 'play2video') {
    return handlePlay2Video({
      ...options,
      q: query
    });
  }

  if (
    commandName === 'pinterest' ||
    isPinterestCountCommand ||
    commandName === 'pin'
  ) {
    const requestedCount = isPinterestCountCommand
      ? Math.max(
          1,
          Math.min(
            20,
            Number(String(commandName).slice(9)) || 5
          )
        )
      : 5;

    return handlePinterest({
      ...options,
      q: query,
      requestedCount
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

  // PLAY comum usa o mesmo cartão nativo aprimorado do PLAY2.
  // A rota do Pinterest continua acima deste bloco.
  if (commandName === 'play') {
    return handlePlay2({
      ...options,
      q: query,

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

    let url =
      isUrl(resolved)
        ? resolved
        : (
            /^[A-Za-z0-9_-]{11}$/.test(resolved)
              ? `https://www.youtube.com/watch?v=${resolved}`
              : ''
          );

    if (!url) {
      const termo = String(resolved || '').trim();

      console.log(
        '[PLAY AUDIO] 🔎 Pesquisando no YouTube:',
        termo
      );

      await reply(
        '🔎 Pesquisando no YouTube...'
      );

      try {
        const resultado = await youtube.search(termo);

        url =
          resultado?.data?.url ||
          resultado?.data?.sourceUrl ||
          (
            resultado?.data?.videoId
              ? `https://www.youtube.com/watch?v=${resultado.data.videoId}`
              : ''
          );

        if (url) {
          console.log(
            '[PLAY AUDIO] ✅ Encontrado:',
            resultado?.data?.title || url
          );
        }
      } catch (error) {
        console.error(
          '[PLAY AUDIO] ❌ Pesquisa falhou:',
          error?.message || error
        );
      }

      if (!url) {
        await reply(
          '❌ Não encontrei esse vídeo no YouTube. Tente outro nome.'
        );
        return true;
      }
    }

    try {
      const started =
        Date.now();

      console.log(
        '[PLAY AUDIO] 🎵 youtube.mp3()'
      );

      const dlRes =
        await youtube.mp3(
          url,
          null,
          { bitrate: '0', returnFile: true }
        );

      if (!dlRes?.ok) {
        throw new Error(
          dlRes?.msg ||
          'Download de áudio falhou.'
        );
      }

      if (!dlRes.buffer && !dlRes.path) {
        throw new Error(
          'O downloader não retornou o áudio.'
        );
      }

      try {
        await kya.sendMessage(
          from,
          {
            audio: dlRes.path
              ? { url: dlRes.path }
              : dlRes.buffer,
            mimetype: dlRes.mimetype || 'audio/mpeg',
            fileName: dlRes.filename || 'KYARA-PLAY.mp3',
            ptt: false
          },
          { quoted: info }
        );
      } finally {
        if (typeof dlRes.cleanup === 'function') {
          dlRes.cleanup();
        }
      }

      console.log(
        `[PLAY AUDIO] ✅ enviado em ${Date.now() - started}ms`
      );

      return true;

    } catch (error) {

      console.error(
        '[PLAY AUDIO] ❌',
        error?.message ||
        error
      );

      await reply(
        `❌ Não consegui baixar o áudio.\n\n${
          error?.message ||
          'Erro desconhecido.'
        }`
      );

      return true;
    }
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

    let url =
      isUrl(resolved)
        ? resolved
        : (
            /^[A-Za-z0-9_-]{11}$/.test(resolved)
              ? `https://www.youtube.com/watch?v=${resolved}`
              : ''
          );

    if (!url) {
      const termo = String(resolved || '').trim();

      console.log(
        '[PLAY VIDEO] 🔎 Pesquisando no YouTube:',
        termo
      );

      await reply(
        '🔎 Pesquisando no YouTube...'
      );

      try {
        const resultado = await youtube.search(termo);

        url =
          resultado?.data?.url ||
          resultado?.data?.sourceUrl ||
          (
            resultado?.data?.videoId
              ? `https://www.youtube.com/watch?v=${resultado.data.videoId}`
              : ''
          );

        if (url) {
          console.log(
            '[PLAY VIDEO] ✅ Encontrado:',
            resultado?.data?.title || url
          );
        }
      } catch (error) {
        console.error(
          '[PLAY VIDEO] ❌ Pesquisa falhou:',
          error?.message || error
        );
      }

      if (!url) {
        await reply(
          '❌ Não encontrei esse vídeo no YouTube. Tente outro nome.'
        );
        return true;
      }
    }

    try {
      const started =
        Date.now();

      console.log(
        '[PLAY VIDEO] 🎬 youtube.mp4()'
      );

      let streamResult = null;

      if (typeof youtube.streamVideo === 'function') {
        try {
          streamResult = await youtube.streamVideo(url);
        } catch (streamError) {
          console.error(
            '[PLAY VIDEO] ❌ Stream direto:',
            streamError?.message || streamError
          );
        }
      }

      if (!streamResult?.ok || !streamResult.url) {
        const streamReason =
          streamResult?.msg ||
          'O stream direto não está disponível.';

        console.warn(
          '[PLAY VIDEO] Stream falhou; tentando MP4 360p:',
          streamReason
        );

        if (typeof youtube.mp4 !== 'function') {
          throw new Error(streamReason);
        }

        const fallbackDownload = await youtube.mp4(url, 360);

        if (
          !fallbackDownload?.ok ||
          !fallbackDownload?.buffer
        ) {
          throw new Error(
            fallbackDownload?.msg ||
            streamReason ||
            'Não foi possível obter o vídeo em MP4.'
          );
        }

        try {
          await kya.sendMessage(
            from,
            {
              video: fallbackDownload.buffer,
              mimetype: 'video/mp4',
              fileName:
                fallbackDownload.filename ||
                'KYARA-PLAY.mp4'
            },
            { quoted: info }
          );
        } finally {
          if (typeof fallbackDownload.cleanup === 'function') {
            fallbackDownload.cleanup();
          }
        }

        console.log(
          '[PLAY VIDEO] MP4 alternativo enviado em ' +
          (Date.now() - started) + 'ms'
        );

        return true;
      }

      console.log(
        streamResult.local
          ? '[PLAY VIDEO] 📁 Enviando arquivo local.'
          : '[PLAY VIDEO] ⚡ Enviando URL direta.'
      );

      await kya.sendMessage(
        from,
        {
          video: {
            url: streamResult.url
          },

          mimetype:
            streamResult.mimetype ||
            'video/mp4',

          fileName: (() => {
            const ext = String(streamResult.url)
              .split(/[?#]/)[0]
              .split('.')
              .pop()
              .toLowerCase();

            return streamResult.local &&
              ['mp4', 'm4v', 'webm', 'mkv'].includes(ext)
                ? `KYARA-PLAY.${ext}`
                : 'KYARA-PLAY.mp4';
          })()
        },
        {
          quoted:
            info
        }
      );

      console.log(
        `[PLAY VIDEO] ✅ enviado em ${Date.now() - started}ms`
      );

      return true;

    } catch (error) {

      console.error(
        '[PLAY VIDEO] ❌',
        error?.message ||
        error
      );

      await reply(
        `❌ Não consegui preparar o vídeo.\n\n${
          error?.message ||
          'Erro desconhecido.'
        }`
      );

      return true;
    }
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

    const selectedPlatform =
      cmd === 'play'
        ? (platformOf(query) || 'Mídia')
        : platform;

    if (selectedPlatform !== 'YouTube') {
      return sendPlatformDirectDownload({
        kya,
        from,
        info,
        reply,
        platform: selectedPlatform,
        url: query
      });
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
      kya,
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
   *
   * O #play agora sempre mostra imediatamente
   * que recebeu o comando.
   */
  if (cmd !== 'play') {
    if (
      platform !== 'YouTube' &&
      platform !== 'Pinterest'
    ) {
      const urls = await searchMany(
        platform,
        query,
        10
      );

      if (!urls.length) {
        await reply(
          `❌ Não encontrei resultados públicos de ${platform} para *${query}*.`
        );

        return true;
      }

      return sendPlatformSearchAlbum({
        kya,
        from,
        info,
        reply,
        platform,
        query,
        urls
      });
    }

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
    kya,
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
