import {
  getConfiguredBotName,
  getKyaraEmoji
} from '../core/identity/kyara-identity.js'



// KYARA PINTEREST CACHE ANTI REPETIÇÃO

globalThis.kyaraPinterestCache ??= new Map();

globalThis.kyaraPinterestHistory ??= new Set();


function kyaraPinterestCacheKey(query){

    return (
      String(query)
      .toLowerCase()
      .trim()
      +
      "-"
      +
      Math.floor(
        Date.now()/60000
      )
    );

}


function kyaraPinterestQuality(url){

    return !(
      /60x60|75x75|100x100|150x|236x/i
      .test(url)
    );

}


globalThis.kyaraPinterestHistory ??= new Map();


function kyaraNormalizeSearch(q){
    return String(q || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g," ");
}

function kyaraRemoveDuplicates(items=[]){

    const seen = new Set();

    return items.filter(x=>{

        const id =
          x?.url ||
          x?.image ||
          x?.src ||
          "";

        if(!id || seen.has(id))
            return false;

        seen.add(id);
        return true;

    });

}

import { proto, generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys';
import axios from "axios";
import sharp from "sharp";
import * as pinterest from "../funcs/downloads/pinterest.js";
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const REQUEST_TIMEOUT = 16000;

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(value) {
  const raw =
    String(
      value || ""
    ).trim();

  if (!raw) {
    return "";
  }

  try {

    const url =
      new URL(raw);

    if(
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ){
      return "";
    }

    return url.href;

  } catch {

    return "";

  }
}

function getDisplayTitle(query) {
  const text =
    String(
      query || ""
    ).trim();

  if(
    /^(?:óbito|obito)$/i.test(
      text
    )
  ){
    return "Obito Uchiha | Naruto";
  }

  return (
    text ||
    "Pinterest"
  );
}

function extractImages(result) {

  const values = [];

  if(
    Array.isArray(
      result?.urls
    )
  ){
    values.push(
      ...result.urls
    );
  }

  if(
    Array.isArray(
      result?.results
    )
  ){

    for(
      const item
      of result.results
    ){

      if(
        typeof item ===
        "string"
      ){

        values.push(
          item
        );

        continue;

      }

      values.push(
        item?.image,
        item?.imageUrl,
        item?.url,
        item?.directLink,
        item?.thumbnail
      );

    }

  }

  const unique = [];
  const seen = new Set();

  for(
    const value
    of values
  ){

    const url =
      safeUrl(value);

    if(
      !url ||
      !/i\.pinimg\.com\//i.test(
        url
      )
    ){
      continue;
    }

    const key =
      url
        .replace(
          /\/(?:236x|474x|564x|736x|originals)\//i,
          "/SIZE/"
        );

    if(
      seen.has(key)
    ){
      continue;
    }

    seen.add(key);
    unique.push(url);

    if(
      unique.length >=
      MAX_IMAGES
    ){
      break;
    }

  }

  return unique;
}

async function downloadImage(url) {

  const source =
    safeUrl(url);

  if(!source){
    throw new Error(
      "URL de imagem inválida."
    );
  }

  const response =
    await axios.get(
      source,
      {
        responseType:
          "arraybuffer",

        timeout:
          REQUEST_TIMEOUT,

        maxContentLength:
          MAX_IMAGE_BYTES,

        maxBodyLength:
          MAX_IMAGE_BYTES,

        headers: {
          "User-Agent":
            USER_AGENT,

          Accept:
            "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",

          Referer:
            "https://www.pinterest.com/"
        },

        validateStatus(status){
          return (
            status >= 200 &&
            status < 300
          );
        }
      }
    );

  const buffer =
    Buffer.from(
      response.data
    );

  if(!buffer.length){
    throw new Error(
      "Imagem vazia."
    );
  }

  return buffer;
}

async function compressImage(
  buffer,
  maxBytes = 900 * 1024
){

  let quality = 90;
  let width = 1600;
  let output = null;

  for(
    let attempt = 0;
    attempt < 8;
    attempt++
  ){

    output =
      await sharp(buffer)
        .rotate()
        .resize({
          width,
          height:1600,
          fit:"inside",
          withoutEnlargement:true
        })
        .jpeg({
          quality,
          progressive:true,
          mozjpeg:true
        })
        .toBuffer();

    if(
      output.length <= maxBytes
    ){
      return output;
    }

    /*
     * Primeiro reduz qualidade.
     * Só depois reduz resolução.
     * Isso preserva muito mais detalhes.
     */
    if(quality > 72){
      quality -= 5;
    } else {
      width =
        Math.max(
          900,
          Math.floor(width * 0.90)
        );

      quality -= 3;
    }
  }

  return output;
}

function toDataUrl(buffer) {

  return (
    "data:image/jpeg;base64," +
    Buffer
      .from(buffer)
      .toString("base64")
  );

}

const KYARA_PIN_RECENTES =
  globalThis.__KYARA_PIN_RECENTES__ ||
  new Map();

globalThis.__KYARA_PIN_RECENTES__ =
  KYARA_PIN_RECENTES;

function kyaraPinShuffle(lista) {
  const copia = [...lista];

  for (
    let i = copia.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      copia[i],
      copia[j]
    ] = [
      copia[j],
      copia[i]
    ];
  }

  return copia;
}

function kyaraPinQueryKey(query) {
  return String(query || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}


/*
 * =========================================================
 * PINTEREST — RESOLUÇÃO AVANÇADA
 * =========================================================
 *
 * O Pinterest frequentemente entrega:
 *
 *   236x
 *   474x
 *   564x
 *   736x
 *   originals
 *
 * Tentamos primeiro a melhor versão conhecida.
 * Se ela não existir, voltamos automaticamente.
 */

function pinterestImageCandidates(value) {
  const raw = String(value || "").trim();

  if(!raw){
    return [];
  }

  try {
    const u = new URL(raw);

    if(
      u.hostname.toLowerCase() !==
      "i.pinimg.com"
    ){
      return [raw];
    }

    const pathname = u.pathname;

    const match =
      pathname.match(
        /\/(?:originals|736x|564x|474x|400x|291x|236x|170x)\//i
      );

    if(!match){
      return [raw];
    }

    const sizes = [
      "originals",
      "736x",
      "564x",
      "474x",
      "400x",
      "291x",
      "236x",
      "170x"
    ];

    const out = [];

    for(const size of sizes){

      const candidate =
        new URL(u.toString());

      candidate.pathname =
        pathname.replace(
          /\/(?:originals|736x|564x|474x|400x|291x|236x|170x)\//i,
          `/${size}/`
        );

      const value2 =
        candidate.toString();

      if(!out.includes(value2)){
        out.push(value2);
      }
    }

    /*
     * Mantém a URL original como último fallback.
     */
    if(!out.includes(raw)){
      out.push(raw);
    }

    return out;

  } catch {
    return [raw];
  }
}

async function loadImages(urls, query = "") {
  const chave =
    kyaraPinQueryKey(query);

  const anteriores =
    KYARA_PIN_RECENTES.get(chave) ||
    new Set();

  const embaralhadas =
    kyaraPinShuffle(
      Array.isArray(urls)
        ? urls
        : []
    );

  /*
   * Primeiro tenta URLs que não apareceram
   * recentemente para essa mesma pesquisa.
   */
  const novas =
    embaralhadas.filter(
      url => !anteriores.has(
        String(url)
      )
    );

  /*
   * Se o Pinterest devolveu poucos resultados
   * novos, completa com os antigos.
   */
  const ordem =
    [
      ...novas,
      ...embaralhadas.filter(
        url =>
          anteriores.has(
            String(url)
          )
      )
    ];

  const out = [];
  const usadasNestaBusca =
    new Set();

  for (
    const url of ordem
  ) {
    if (
      out.length >= MAX_IMAGES
    ) {
      break;
    }

    const urlKey =
      String(url);

    if (
      usadasNestaBusca.has(
        urlKey
      )
    ) {
      continue;
    }

    usadasNestaBusca.add(
      urlKey
    );

    try {

      const candidates =
        pinterestImageCandidates(
          url
        );

      let raw = null;
      let finalUrl = null;
      let lastError = null;

      /*
       * Tenta ORIGINAL primeiro.
       * Se retornar 404/erro, tenta 736x,
       * depois 564x e assim por diante.
       */
      for(const candidate of candidates){

        try {

          const candidateBuffer =
            await downloadImage(
              candidate
            );

          if(
            candidateBuffer &&
            candidateBuffer.length
          ){
            raw = candidateBuffer;
            finalUrl = candidate;
            break;
          }

        } catch(error){
          lastError = error;
        }
      }

      if(!raw){
        throw (
          lastError ||
          new Error(
            "Nenhuma versão válida da imagem."
          )
        );
      }

      const compact =
        await compressImage(
          raw
        );

      out.push({
        url: finalUrl || url,
        sourceUrl: url,
        image:
          toDataUrl(
            compact
          )
      });

    } catch (error) {
      console.log(
        "[PINTEREST] ⚠️ Imagem ignorada:",
        error?.message || error
      );
    }
  }

  /*
   * Guarda somente URLs realmente entregues.
   */
  const historico =
    Array.from(
      new Set([
        ...anteriores,
        ...out.map(
          item =>
            String(item.url)
        )
      ])
    );

  /*
   * Mantém histórico limitado.
   */
  KYARA_PIN_RECENTES.set(
    chave,
    new Set(
      historico.slice(
        -MAX_IMAGES * 3
      )
    )
  );

  /*
   * Último embaralhamento para evitar
   * que a posição da imagem principal
   * seja sempre igual.
   */
  return kyaraPinShuffle(out);
}

function makeDocument(body) {

  return `<!doctype html>
<html lang="pt-BR">
<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,
  initial-scale=1,
  maximum-scale=1,
  user-scalable=no"
>

<meta
  name="theme-color"
  content="#0d1825"
>

<style>

*{
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
}

html,
body{
  margin:0;
  padding:0;

  background:transparent;

  color:#f5f7fb;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    "Segoe UI",
    sans-serif;
}

body{
  padding:3px 0;
}

.card{
  width:min(100%,520px);

  margin:0 auto;

  overflow:hidden;

  border-radius:18px;

  border:
    1px solid
    rgba(112,155,195,.20);

  background:
    linear-gradient(
      180deg,
      #1a2b3b,
      #152638
    );

  box-shadow:
    0 11px 28px
    rgba(0,0,0,.30);
}

.hero{
  position:relative;

  overflow:hidden;

  background:#09131f;
}

.hero img{
  width:100%;

  display:block;

  object-fit:cover;
}

.heroMain img{
  aspect-ratio:
    1.56 / 1;
}

.hero:after{
  content:"";

  position:absolute;
  inset:0;

  pointer-events:none;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.02) 35%,
      rgba(7,13,20,.22) 70%,
      rgba(7,13,20,.60) 100%
    );
}

.heroBadge{
  position:absolute;

  z-index:2;

  right:9px;
  bottom:9px;

  padding:4px 7px;

  border-radius:7px;

  background:
    rgba(8,14,21,.72);

  font-size:10px;
  font-weight:800;
}

.info{
  display:flex;

  align-items:center;

  gap:10px;

  padding:
    10px 13px 12px;
}

.pin{
  width:28px;
  height:28px;

  flex:none;

  border-radius:50%;

  display:flex;

  align-items:center;
  justify-content:center;

  background:#e60023;

  color:#fff;

  font-family:Georgia,serif;

  font-size:18px;
  font-weight:700;
}

.info strong{
  display:block;

  font-size:15px;

  line-height:1.14;

  font-weight:900;
}

.info span{
  display:block;

  margin-top:3px;

  color:#bac4cf;

  font-size:11px;
}

.relatedTitle{
  padding:
    10px 12px 8px;

  font-size:13px;

  font-weight:850;
}

.strip{
  display:flex;

  gap:7px;

  padding:
    0 10px 11px;
}

.thumb{
  position:relative;

  flex:1;

  min-width:0;

  overflow:hidden;

  border-radius:10px;

  background:#0b1520;

  border:
    1px solid
    rgba(255,255,255,.08);
}

.thumb img{
  width:100%;

  aspect-ratio:1 / 1;

  display:block;

  object-fit:cover;
}

.more{
  display:flex;

  align-items:center;

  justify-content:center;

  min-width:58px;

  max-width:66px;

  border:
    1px solid
    rgba(152,181,210,.28);

  border-radius:10px;

  background:
    linear-gradient(
      180deg,
      #1a3045,
      #17283a
    );

  font-size:16px;

  font-weight:900;

  color:#eaf0f6;

  text-align:center;
}

.more small{
  display:block;

  margin-top:3px;

  font-size:8px;

  color:#9aa8b7;

  font-weight:700;
}

</style>

</head>

<body>

${body}

</body>
</html>`;

}

function buildMainHtml(
  item,
  title
){

  return makeDocument(
    `
<div class="card">

  <div class="hero heroMain">

    <img
      src="${item.image}"
      alt="${escapeHtml(title)}"
    >

    <div class="heroBadge">
      Pinterest
    </div>

  </div>

  <div class="info">

    <div class="pin">
      P
    </div>

    <div>

      <strong>
        ${escapeHtml(title)}
      </strong>

      <span>
        Pinterest
      </span>

    </div>

  </div>

</div>
`
  );

}

function buildRelatedHtml(
  items
){

  const related =
    items.slice(
      1,
      7
    );

  const visible =
    related.slice(
      0,
      3
    );

  const hidden =
    Math.max(
      0,
      related.length -
      visible.length
    );

  const thumbs =
    visible
      .map(
        item => `
<div class="thumb">

  <img
    src="${item.image}"
    alt="Imagem relacionada"
  >

</div>
`
      )
      .join("");

  const more =
    hidden > 0
      ? `
<div class="more">

  <div>

    +${hidden}

    <small>
      mais
    </small>

  </div>

</div>
`
      : "";

  return makeDocument(
    `
<div class="card">

  <div class="relatedTitle">
    📌 Aqui estão outras imagens relacionadas:
  </div>

  <div class="strip">

    ${thumbs}

    ${more}

  </div>

</div>
`
  );

}



function buildPinterestGalleryHtml(
  items,
  title
) {
  const sources = [
    ...new Set(
      (Array.isArray(items) ? items : [])
        .map(item =>
          String(item?.url || "").trim()
        )
        .filter(Boolean)
    )
  ];

  if (!sources.length) {
    throw new Error(
      "Pinterest não possui URLs de imagens utilizáveis."
    );
  }

  const jsonSources =
    JSON.stringify(sources)
      .replace(/</g, "\\u003c");

  const thumbs =
    sources
      .map(
        (src, index) => `
<button
  class="pin-thumb"
  type="button"
  data-index="${index}"
  onclick="selectPinterestImage(${index})"
>
  <img
    src="${src.replace(/"/g, "&quot;")}"
    alt="Pinterest ${index + 1}"
    loading="lazy"
  >
</button>`
      )
      .join("");

  return makeDocument(`
<style>
*{
  box-sizing:border-box;
}

.pin-gallery{
  width:100%;
  max-width:720px;
  margin:0 auto;
  padding:14px;
}

.pin-header{
  margin-bottom:12px;
}

.pin-brand{
  font-size:11px;
  font-weight:800;
  letter-spacing:1px;
  opacity:.55;
}

.pin-title{
  margin-top:4px;
  font-size:18px;
  font-weight:800;
  color:#fff;
  word-break:break-word;
}

.pin-main{
  width:100%;
  height:min(62vh,560px);
  min-height:260px;
  border-radius:18px;
  overflow:hidden;
  background:#11151c;
  display:flex;
  align-items:center;
  justify-content:center;
}

.pin-main img{
  width:100%;
  height:100%;
  object-fit:contain;
  display:block;
}

.pin-counter{
  padding:9px 0 7px;
  text-align:center;
  font-size:12px;
  opacity:.6;
}

.pin-strip{
  display:flex;
  gap:10px;
  overflow-x:auto;
  overflow-y:hidden;
  padding:3px 2px 12px;
  -webkit-overflow-scrolling:touch;
  scroll-snap-type:x proximity;
  overscroll-behavior-x:contain;
}

.pin-strip::-webkit-scrollbar{
  display:none;
}

.pin-thumb{
  flex:0 0 78px;
  width:78px;
  height:78px;
  padding:0;
  border:2px solid transparent;
  border-radius:13px;
  overflow:hidden;
  background:#171b22;
  scroll-snap-align:start;
}

.pin-thumb.active{
  border-color:#fff;
}

.pin-thumb img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
</style>

<div class="pin-gallery">

  <div class="pin-header">
    <div class="pin-brand">PINTEREST • KYARA</div>
    <div class="pin-title">
      ${escapeHtml(title)}
    </div>
  </div>

  <div class="pin-main">
    <img
      id="pin-main-image"
      alt="Pinterest"
    >
  </div>

  <div
    class="pin-counter"
    id="pin-counter"
  >
    1 / ${sources.length}
  </div>

  <div
    class="pin-strip"
    id="pin-strip"
  >
    ${thumbs}
  </div>

</div>

<script>
const pinterestImages =
  ${jsonSources};

function selectPinterestImage(index){

  if(
    index < 0 ||
    index >= pinterestImages.length
  ){
    return;
  }

  const main =
    document.getElementById(
      "pin-main-image"
    );

  const counter =
    document.getElementById(
      "pin-counter"
    );

  main.src =
    pinterestImages[index];

  counter.textContent =
    (index + 1) +
    " / " +
    pinterestImages.length;

  document
    .querySelectorAll(".pin-thumb")
    .forEach((button, i) => {

      button.classList.toggle(
        "active",
        i === index
      );

      const image =
        document.getElementById(
          "pin-thumb-image-" + i
        );

      if(
        image &&
        !image.src
      ){
        image.src =
          pinterestImages[i];
      }
    });
}

selectPinterestImage(0);
</script>
`);
}


/* === KYARA PINTEREST NATIVE CAROUSEL === */

const KYARA_PIN_SESSIONS =
  globalThis.__KYARA_PIN_SESSIONS__ ||
  new Map();

globalThis.__KYARA_PIN_SESSIONS__ =
  KYARA_PIN_SESSIONS;

const KYARA_PIN_TTL =
  5 * 60 * 1000;

function kyaraPinToken() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

function kyaraPinFlowId(token, numero) {
  return (
    'kyara:pinterest:' +
    token +
    ':select:' +
    numero
  );
}

function kyaraPinBufferFromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return null;
  }

  const pos = dataUrl.indexOf(',');

  if (pos === -1) {
    return null;
  }

  try {
    return Buffer.from(
      dataUrl.slice(pos + 1),
      'base64'
    );
  } catch {
    return null;
  }
}

function kyaraPinExtractClickId(info) {
  const message = info?.message;

  if (!message) {
    return null;
  }

  const candidatos = [
    message?.interactiveResponseMessage
      ?.nativeFlowResponseMessage
      ?.paramsJson,

    message?.interactiveResponseMessage
      ?.paramsJson,

    message?.nativeFlowResponseMessage
      ?.paramsJson
  ];

  for (const paramsJson of candidatos) {
    if (!paramsJson) continue;

    try {
      const obj =
        typeof paramsJson === 'string'
          ? JSON.parse(paramsJson)
          : paramsJson;

      if (obj?.id) {
        return String(obj.id).trim();
      }

      if (obj?.selectedId) {
        return String(obj.selectedId).trim();
      }

      if (obj?.buttonId) {
        return String(obj.buttonId).trim();
      }
    } catch {}
  }

  const outros = [
    message?.templateButtonReplyMessage?.selectedId,
    message?.buttonsResponseMessage?.selectedButtonId,
    message?.listResponseMessage
      ?.singleSelectReply
      ?.selectedRowId,
    info?.buttonId
  ];

  for (const valor of outros) {
    if (valor) {
      return String(valor).trim();
    }
  }

  return null;
}

function kyaraPinAdditionalNodes(jid) {
  const bizNode = {
    tag: 'biz',

    attrs: {
      actual_actors: '2',
      host_storage: '2',
      privacy_mode_ts:
        String(
          Math.floor(Date.now() / 1000) -
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
          source_type: 'third_party'
        }
      }
    ]
  };

  const isGroup =
    String(jid || '').endsWith('@g.us');

  return isGroup
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
}

export async function kyaraPinterestNativeCarousel(
  nazu,
  from,
  requesterId,
  query,
  images
) {
  console.log(
    `[PINTEREST] 📦 Preparando carousel nativo: ${images?.length || 0} imagem(ns)`
  );

  if (!Array.isArray(images) || !images.length) {
    throw new Error(
      'Nenhuma imagem disponível para o carousel.'
    );
  }

  const token =
    `${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

  async function bufferFromItem(item) {
    if (!item) return null;

    // 1. Buffer já pronto
    if (
      Buffer.isBuffer(item.buffer) &&
      item.buffer.length
    ) {
      return item.buffer;
    }

    if (
      Buffer.isBuffer(item.data) &&
      item.data.length
    ) {
      return item.data;
    }

    // 2. Data URL
    const dataValues = [
      item.image,
      item.dataUrl,
      item.dataURL,
      item.src
    ];

    for (const value of dataValues) {
      if (
        typeof value === 'string' &&
        value.startsWith('data:')
      ) {
        const comma = value.indexOf(',');

        if (comma >= 0) {
          try {
            const buffer = Buffer.from(
              value.slice(comma + 1),
              'base64'
            );

            if (buffer.length) {
              return buffer;
            }
          } catch {}
        }
      }
    }

    // 3. URL HTTP/HTTPS
    const url =
      item.url ||
      item.imageUrl ||
      item.image_url ||
      item.link ||
      (
        typeof item.image === 'string' &&
        /^https?:\/\//i.test(item.image)
          ? item.image
          : null
      );

    if (
      typeof url === 'string' &&
      /^https?:\/\//i.test(url)
    ) {
      try {
        console.log(
          `[PINTEREST] 🌐 Baixando imagem ${url.slice(0, 100)}`
        );

        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',
            'Accept':
              'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          },
          redirect: 'follow'
        });

        if (!response.ok) {
          console.log(
            `[PINTEREST] ⚠️ HTTP ${response.status}: ${url.slice(0, 100)}`
          );
          return null;
        }

        const arrayBuffer =
          await response.arrayBuffer();

        const buffer =
          Buffer.from(arrayBuffer);

        if (buffer.length) {
          return buffer;
        }
      } catch (err) {
        console.log(
          '[PINTEREST] ⚠️ Falha ao baixar imagem:',
          err?.message || err
        );
      }
    }

    return null;
  }

  const resultados = [];

  for (
    let i = 0;
    i < Math.min(images.length, 10);
    i++
  ) {
    const item = images[i];

    try {
      const buffer =
        await bufferFromItem(item);

      if (
        !Buffer.isBuffer(buffer) ||
        !buffer.length
      ) {
        console.log(
          `[PINTEREST] ⚠️ Imagem ${i + 1} ignorada: sem mídia válida`
        );
        continue;
      }

      resultados.push({
        numero: resultados.length + 1,

        url:
          item.url ||
          item.imageUrl ||
          item.image_url ||
          item.link ||
          null,

        buffer,

        title:
          item.title ||
          item.description ||
          `Imagem ${i + 1}`,

        source:
          item.source ||
          'Pinterest'
      });

      console.log(
        `[PINTEREST] ✅ Imagem ${i + 1} pronta (${buffer.length} bytes)`
      );
    } catch (err) {
      console.log(
        `[PINTEREST] ⚠️ Falha na imagem ${i + 1}:`,
        err?.message || err
      );
    }
  }

  if (!resultados.length) {
    throw new Error(
      'Nenhuma imagem pôde ser convertida para buffer.'
    );
  }

  const session = {
    token,
    query,
    requesterId,
    resultados,
    results: resultados,
    modo: 'select',
    createdAt: Date.now(),
    expiresAt:
      Date.now() + KYARA_PIN_TTL
  };

  KYARA_PIN_SESSIONS.set(
    token,
    session
  );

  const cards = [];

  for (
    let i = 0;
    i < resultados.length;
    i++
  ) {
    const resultado = resultados[i];
    const numero = i + 1;

    try {
      const itemImage =
        await prepareWAMessageMedia(
          {
            image: resultado.buffer
          },
          {
            upload:
              nazu.waUploadToServer
          }
        );

      const selectId =
        kyaraPinFlowId(
          token,
          numero
        );

      const card =
        proto
          .Message
          .InteractiveMessage
          .fromObject({
            header: {
              title:
                `📌 ${String(query || 'Pinterest')}`
                  .slice(0, 180),

              hasMediaAttachment: true,

              imageMessage:
                itemImage.imageMessage
            },

            body: {
              text:
                `🖼️ Imagem ${numero}/${resultados.length}\n` +
                `📍 Pinterest\n` +
                `🔎 ${String(query || '').slice(0, 400)}`
            },

            footer: {
              text:
                `${getKyaraEmoji('brand')} ${getConfiguredBotName()} • PINTEREST • ${numero}/${resultados.length}`
            },

            nativeFlowMessage: {
              buttons: [
                {
                  name: 'quick_reply',

                  buttonParamsJson:
                    JSON.stringify({
                      display_text:
                        '✅ SELECIONAR',

                      id:
                        selectId
                    })
                }
              ],

              messageParamsJson: '{}',

              messageVersion: 1
            }
          });

      cards.push(card);

      console.log(
        `[PINTEREST] ✅ Card ${numero}/${resultados.length} preparado`
      );
    } catch (err) {
      console.log(
        `[PINTEREST] ⚠️ Falha no card ${numero}:`,
        err?.message || err
      );
    }
  }

  if (!cards.length) {
    throw new Error(
      'Não foi possível preparar nenhum card nativo.'
    );
  }

  console.log(
    `[PINTEREST] 🎠 Carousel REAL: ${cards.length} card(s)`
  );

  const carouselMessage =
    proto
      .Message
      .InteractiveMessage
      .CarouselMessage
      .fromObject({
        cards
      });

  const messageContent = {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2
        },

        interactiveMessage:
          proto
            .Message
            .InteractiveMessage
            .fromObject({
              carouselMessage
            })
      }
    }
  };

  const waMessage =
    generateWAMessageFromContent(
      from,
      messageContent,
      {
        userJid:
          nazu?.user?.id || from,
        quoted:
          undefined
      }
    );

  await nazu.relayMessage(
    from,
    waMessage.message,
    {
      messageId:
        waMessage.key.id,

      additionalNodes:
        kyaraPinAdditionalNodes(
          from
        )
    }
  );

  console.log(
    `[PINTEREST] 🚀 Carousel nativo enviado: ${cards.length} card(s)`
  );

  return true;
}

export async function handlePinterestClick(
  options = {}
) {
  const {
    Kyara,
    info,
    jid,
    clickerId
  } = options;

  const id =
    kyaraPinExtractClickId(info);

  if (
    !String(id || '')
      .startsWith(
        'kyara:pinterest:'
      )
  ) {
    return false;
  }

  const match =
    /^kyara:pinterest:([^:]+):select:(\d+)$/
      .exec(String(id));

  if (!match) {
    return true;
  }

  const token =
    match[1];

  const numero =
    Number(match[2]);

  const session =
    KYARA_PIN_SESSIONS.get(token);

  if (!session) {
    await Kyara.sendMessage(
      jid,
      {
        text:
          '📌 *PINTEREST*\n\n' +
          '❌ Este carousel expirou. Faça a pesquisa novamente.'
      }
    );

    return true;
  }

  if (
    Date.now() >
    session.expiresAt
  ) {
    KYARA_PIN_SESSIONS.delete(token);

    await Kyara.sendMessage(
      jid,
      {
        text:
          '📌 *PINTEREST*\n\n' +
          '❌ Este carousel expirou. Faça a pesquisa novamente.'
      }
    );

    return true;
  }

  const resultado =
    session.results?.[
      numero - 1
    ];

  if (
    !resultado?.buffer ||
    !Buffer.isBuffer(
      resultado.buffer
    )
  ) {
    await Kyara.sendMessage(
      jid,
      {
        text:
          '📌 *PINTEREST*\n\n' +
          '❌ Imagem não encontrada.'
      }
    );

    return true;
  }

  await Kyara.sendMessage(
    jid,
    {
      image:
        resultado.buffer,

      mimetype:
        'image/jpeg',

      caption:
        '📌 ' +
        String(
          resultado.title ||
          'Pinterest'
        ).slice(0, 180)
    },
    {
      quoted:
        info
    }
  );

  return true;
}

async function kyaraPinterestVisualCard(
  nazu,
  jid,
  requesterId,
  query,
  images
) {
  if (
    !nazu ||
    !jid ||
    typeof nazu.sendMessage !== "function"
  ) {
    throw new Error(
      "Socket do WhatsApp indisponível."
    );
  }

  const lista =
    (Array.isArray(images) ? images : [])
      .slice(0, 7);

  if (!lista.length) {
    throw new Error(
      "Nenhuma imagem disponível."
    );
  }

  function dataUrlBuffer(value) {
    if (!value) return null;

    const text = String(value);

    const comma = text.indexOf(",");

    if (
      text.startsWith("data:") &&
      comma >= 0
    ) {
      try {
        return Buffer.from(
          text.slice(comma + 1),
          "base64"
        );
      } catch {}
    }

    return null;
  }

  const itens = [];

  for (const item of lista) {
    const buffer =
      Buffer.isBuffer(item?.buffer)
        ? item.buffer
        : dataUrlBuffer(item?.image);

    if (
      !Buffer.isBuffer(buffer) ||
      !buffer.length
    ) {
      continue;
    }

    itens.push({
      ...item,
      buffer
    });
  }

  if (!itens.length) {
    throw new Error(
      "As imagens não possuem buffer válido."
    );
  }

  /*
   * Sessão usada pelos IDs:
   * kyara:pinterest:TOKEN:select:N
   */
  const token =
    typeof kyaraPinToken === "function"
      ? kyaraPinToken()
      : Math.random()
          .toString(36)
          .slice(2, 12);

  if (
    typeof KYARA_PIN_SESSIONS !== "undefined" &&
    KYARA_PIN_SESSIONS
  ) {
    KYARA_PIN_SESSIONS.set(
      token,
      {
        createdAt: Date.now(),

        requesterId:
          String(
            requesterId || ""
          ),

        query:
          String(query || ""),

        results:
          itens.map(item => ({
            buffer:
              item.buffer,

            image:
              item.image || "",

            url:
              item.url || "",

            sourceUrl:
              item.sourceUrl || "",

            title:
              item.title ||
              query ||
              "Pinterest"
          }))
      }
    );
  }

  /*
   * ----------------------------------------------------------
   * CARD VISUAL
   * ----------------------------------------------------------
   */

  const W = 900;
  const PAD = 34;
  const INNER = W - PAD * 2;

  const MAIN_H = 500;
  const THUMB_H = 125;
  const GAP = 12;

  const THUMB_W =
    Math.floor(
      (INNER - GAP * 4) / 5
    );

  const CARD_H = 1370;

  function svg(width, height, content) {
    return Buffer.from(
      `<svg
        width="${width}"
        height="${height}"
        xmlns="http://www.w3.org/2000/svg"
      >${content}</svg>`
    );
  }

  const overlays = [];

  /*
   * Fundo + textos + molduras
   */
  overlays.push({
    input:
      svg(
        W,
        CARD_H,
        `
        <rect
          width="${W}"
          height="${CARD_H}"
          rx="38"
          fill="#090B11"
        />

        <rect
          x="16"
          y="16"
          width="${W - 32}"
          height="${CARD_H - 32}"
          rx="30"
          fill="#11151F"
          stroke="#272D3B"
          stroke-width="2"
        />

        <text
          x="${PAD}"
          y="68"
          fill="#FF63AE"
          font-family="Arial"
          font-size="28"
          font-weight="700"
        >
          BOT-KYARA
        </text>

        <text
          x="${PAD}"
          y="112"
          fill="#F5F7FB"
          font-family="Arial"
          font-size="31"
          font-weight="800"
        >
          PINTEREST • ${String(query || "")
            .replace(/&/g,"&amp;")
            .replace(/</g,"&lt;")
            .replace(/>/g,"&gt;")}
        </text>

        <text
          x="${PAD}"
          y="151"
          fill="#AEB5C5"
          font-family="Arial"
          font-size="23"
        >
          Resultados encontrados: ${itens.length}
        </text>

        <rect
          x="${PAD}"
          y="175"
          width="${INNER}"
          height="2"
          fill="#292F3D"
        />

        <rect
          x="${PAD}"
          y="192"
          width="${INNER}"
          height="${MAIN_H}"
          rx="26"
          fill="#171C27"
        />

        <rect
          x="${PAD}"
          y="713"
          width="${INNER}"
          height="78"
          rx="22"
          fill="#191527"
          stroke="#B75CFF"
          stroke-width="3"
        />

        <text
          x="${W / 2}"
          y="764"
          fill="#FF63AE"
          font-family="Arial"
          font-size="27"
          font-weight="800"
          text-anchor="middle"
        >
          BAIXAR IMAGEM (1/${itens.length})
        </text>

        <rect
          x="${PAD}"
          y="816"
          width="${INNER}"
          height="2"
          fill="#292F3D"
        />

        <text
          x="${PAD}"
          y="856"
          fill="#AEB5C5"
          font-family="Arial"
          font-size="20"
          font-weight="700"
        >
          VISUALIZAÇÃO RÁPIDA
        </text>

        <rect
          x="${PAD}"
          y="1048"
          width="${INNER}"
          height="2"
          fill="#292F3D"
        />

        <text
          x="${PAD}"
          y="1087"
          fill="#AEB5C5"
          font-family="Arial"
          font-size="21"
        >
          Pesquisa: ${String(query || "")
            .replace(/&/g,"&amp;")
            .replace(/</g,"&lt;")
            .replace(/>/g,"&gt;")}
        </text>

        <text
          x="${PAD}"
          y="1125"
          fill="#AEB5C5"
          font-family="Arial"
          font-size="21"
        >
          Total de imagens: ${itens.length}
        </text>

        <text
          x="${PAD}"
          y="1163"
          fill="#AEB5C5"
          font-family="Arial"
          font-size="20"
        >
          Toque no botão para baixar a imagem desejada.
        </text>

        <text
          x="${PAD}"
          y="1218"
          fill="#FF63AE"
          font-family="Arial"
          font-size="23"
          font-weight="700"
        >
          BOT-KYARA
        </text>

        <text
          x="${PAD}"
          y="1260"
          fill="#646C7C"
          font-family="Arial"
          font-size="18"
        >
          PINTEREST MEDIA CARD
        </text>
        `
      )
  });

  /*
   * Imagem principal
   */
  const main =
    await sharp(
      itens[0].buffer
    )
      .resize(
        INNER,
        MAIN_H,
        {
          fit: "cover",
          position: "attention"
        }
      )
      .png()
      .toBuffer();

  overlays.push({
    input: main,
    left: PAD,
    top: 192
  });

  /*
   * 4 miniaturas
   */
  for (
    let i = 0;
    i < Math.min(4, itens.length);
    i++
  ) {
    const x =
      PAD +
      i *
        (THUMB_W + GAP);

    const thumb =
      await sharp(
        itens[i].buffer
      )
        .resize(
          THUMB_W,
          THUMB_H,
          {
            fit: "cover",
            position: "attention"
          }
        )
        .composite([
          {
            input:
              svg(
                THUMB_W,
                THUMB_H,
                `
                <rect
                  x="2"
                  y="2"
                  width="${THUMB_W - 4}"
                  height="${THUMB_H - 4}"
                  rx="18"
                  fill="none"
                  stroke="${
                    i === 0
                      ? "#FF63AE"
                      : "#303746"
                  }"
                  stroke-width="${
                    i === 0
                      ? 5
                      : 2
                  }"
                />

                <rect
                  x="10"
                  y="9"
                  width="38"
                  height="31"
                  rx="13"
                  fill="#000"
                  fill-opacity=".72"
                />

                <text
                  x="29"
                  y="31"
                  fill="#FFFFFF"
                  font-family="Arial"
                  font-size="18"
                  font-weight="800"
                  text-anchor="middle"
                >
                  ${i + 1}
                </text>
                `
              )
          }
        ])
        .png()
        .toBuffer();

    overlays.push({
      input: thumb,
      left: x,
      top: 868
    });
  }

  /*
   * +N mais
   */
  const more =
    Math.max(
      0,
      itens.length - 4
    );

  if (more > 0) {
    overlays.push({
      input:
        svg(
          THUMB_W,
          THUMB_H,
          `
          <rect
            width="${THUMB_W}"
            height="${THUMB_H}"
            rx="18"
            fill="#181D28"
            stroke="#303746"
            stroke-width="2"
          />

          <text
            x="${THUMB_W / 2}"
            y="57"
            fill="#F5F7FB"
            font-family="Arial"
            font-size="29"
            font-weight="800"
            text-anchor="middle"
          >
            +${more}
          </text>

          <text
            x="${THUMB_W / 2}"
            y="91"
            fill="#AEB5C5"
            font-family="Arial"
            font-size="20"
            text-anchor="middle"
          >
            mais
          </text>
          `
        ),
      left:
        PAD +
        4 *
          (THUMB_W + GAP),
      top: 868
    });
  }

  /*
   * 5 botões VISUAIS
   */
  const buttonW =
    Math.floor(
      (INNER - 4 * GAP) / 5
    );

  for (
    let i = 0;
    i < 5;
    i++
  ) {
    overlays.push({
      input:
        svg(
          buttonW,
          56,
          `
          <rect
            x="1"
            y="1"
            width="${buttonW - 2}"
            height="54"
            rx="16"
            fill="${
              i === 0
                ? "#26182D"
                : "#171C27"
            }"
            stroke="${
              i === 0
                ? "#FF63AE"
                : "#303746"
            }"
            stroke-width="2"
          />

          <text
            x="${buttonW / 2}"
            y="36"
            fill="${
              i === 0
                ? "#FF63AE"
                : "#F5F7FB"
            }"
            font-family="Arial"
            font-size="17"
            font-weight="700"
            text-anchor="middle"
          >
            BAIXAR ${i + 1}
          </text>
          `
        ),
      left:
        PAD +
        i *
          (buttonW + GAP),
      top: 978
    });
  }

  const card =
    await sharp({
      create: {
        width: W,
        height: CARD_H,
        channels: 4,
        background: "#090B11"
      }
    })
      .composite(overlays)
      .jpeg({
        quality: 90,
        mozjpeg: true
      })
      .toBuffer();

  /*
   * A imagem é enviada como imagem REAL.
   * Não depende do renderer do interactiveMessage.
   */
  await nazu.sendMessage(
    jid,
    {
      image: card,

      caption:
        "PINTEREST\n" +
        String(query || "") +
        "\n\n" +
        `${itens.length} imagem(ns)`
    },
    {
      quoted: undefined
    }
  );

  /*
   * Botões nativos reais.
   */
  const nativeButtons =
    itens.map(
      (item, index) => ({
        name:
          "quick_reply",

        buttonParamsJson:
          JSON.stringify({
            display_text:
              `⬇️ IMAGEM ${index + 1}`,

            id:
              `kyara:pinterest:${token}:download:${index + 1}`
          })
      })
    );

  const native =
    generateWAMessageFromContent(
      jid,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage:
              proto.Message.InteractiveMessage.fromObject(
                {
                  body:
                    proto.Message.InteractiveMessage.Body.fromObject(
                      {
                        text:
                          `${getKyaraEmoji('brand')} ${getConfiguredBotName()}\n` +
                          `📌 PINTEREST • ${query}\n` +
                          `🖼️ ${itens.length} imagens`
                      }
                    ),

                  footer:
                    proto.Message.InteractiveMessage.Footer.fromObject(
                      {
                        text:
                          "Escolha a imagem para baixar"
                      }
                    ),

                  header:
                    proto.Message.InteractiveMessage.Header.fromObject(
                      {
                        title:
                          "DOWNLOADS",

                        subtitle:
                          "Pinterest",

                        hasMediaAttachment:
                          false
                      }
                    ),

                  nativeFlowMessage:
                    proto.Message.InteractiveMessage.NativeFlowMessage.fromObject(
                      {
                        buttons:
                          nativeButtons
                      }
                    )
                }
              )
          }
        }
      },
      {
        userJid:
          nazu.user?.id ||
          jid
      }
    );

  await nazu.relayMessage(
    jid,
    native.message,
    {
      messageId:
        native.key.id
    }
  );

  console.log(
    "[PINTEREST] ✅ Card visual + 7 downloads enviado"
  );

  return true;
}

export async function handlePinterest(
  options = {}
){

  const query =
    String(
      options.q ||
      options.query ||
      options.text ||
      ""
    ).trim();

  const reply =
    typeof options.reply ===
      "function"
      ? options.reply
      : null;

  if(!query){

    if(reply){

      await reply(
        "❌ Use #pinterest <tema>."
      );

    }

    return true;

  }

  try {

    console.log(
      "[PINTEREST] 🔎 Pesquisa:",
      query
    );

    if(reply){

      await reply(
        "📌 *Pesquisando no Pinterest...*"
      );

    }

    let result;

    if(
      /^https?:\/\//i.test(
        query
      )
    ){

      result =
        await pinterest.dl(
          query
        );

    }else{

      result =
        await pinterest.search(
          query
        );

    }

    const urls =
      extractImages(
        result
      );

    if(
      !urls.length
    ){

      throw new Error(
        "Nenhuma imagem encontrada no Pinterest."
      );

    }

    const images =
      await loadImages(
        urls,
        query
      );

    if(
      !images.length
    ){

      throw new Error(
        "Encontrei Pins, mas não consegui carregar as imagens."
      );

    }

    const title =
      getDisplayTitle(
        query
      );

    if(reply){

      await reply(
        "🎠 *Preparando carousel com as imagens encontradas...*"
      );

    }


    const nazu =
      options.nazu ||
      options.sock ||
      options.socket;

    const from =
      options.from ||
      options.remoteJid ||
      options.jid ||
      options.info?.key?.remoteJid;

    const requesterId =
      options.requesterId ||
      options.senderId ||
      options.participant ||
      options.info?.participant ||
      from;

    if (
      !nazu ||
      typeof nazu.relayMessage !== "function"
    ) {
      throw new Error(
        "Socket do Pinterest não encontrado."
      );
    }

    console.log(
      `[PINTEREST] 🎠 Enviando carousel nativo: ${images.length} imagem(ns)`
    );

    await kyaraPinterestNativeCarousel(
      nazu,
      from,
      requesterId,
      query,
      images
    );

    console.log(
      `[PINTEREST] ✅ Carousel nativo enviado: ${images.length} imagem(ns)`
    );

    if(reply){
      await reply(
        `✅ *Pinterest concluído!*
` +
        `🖼️ ${images.length} imagens diferentes`
      );
    }



    return true;

  } catch(error){

    console.error(
      "[PINTEREST] ❌",
      error?.stack ||
      error?.message ||
      error
    );

    if(reply){

      await reply(
        "❌ Erro no Pinterest.\n\n" +
        String(
          error?.message ||
          error ||
          "Erro desconhecido."
        )
      );

    }

    return true;

  }

}
