import http from "http";
import { URL } from "url";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { platformOf } from "../src/features/kyaraBrowser.js";
import { mp3 as youtubeMp3, mp4 as youtubeMp4 } from "../src/funcs/downloads/youtube.js";


const execFileAsync = promisify(execFile);

/*
 * PLAY2 AUDIO CACHE
 *
 * O navegador normalmente faz:
 *
 * HEAD
 * GET
 * GET Range
 *
 * Não podemos baixar o YouTube novamente
 * em cada uma dessas requisições.
 */
const PLAY2_AUDIO_CACHE =
  new Map();

const PLAY2_AUDIO_CACHE_TTL =
  10 * 60 * 1000;

const PLAY2_AUDIO_CACHE_MAX =
  30 * 1024 * 1024;



/*
 * ==========================================================
 * KYARA BROWSER
 * ==========================================================
 */

async function readRequestBody(req) {

  return await new Promise((resolve, reject) => {

    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {

      try {

        resolve(
          body
            ? JSON.parse(body)
            : {}
        );

      } catch {

        reject(
          new Error("JSON inválido.")
        );

      }

    });

    req.on("error", reject);

  });

}


function browserSearchDomain(platform) {

  return {
    youtube: "youtube.com",
    tiktok: "tiktok.com",
    instagram: "instagram.com",
    facebook: "facebook.com",
    twitter: "x.com",
    pinterest: "pinterest.com"
  }[platform] || "";

}




const kyaraYoutubeSearchCache = new Map();

async function kyaraYoutubeSearchReal(query, wanted = 100) {

  const q =
    String(query || '')
      .trim()
      .slice(0, 150);

  if (!q) return [];

  const count =
    Math.min(
      100,
      Math.max(
        20,
        Number(wanted) || 100
      )
    );

  const key =
    q.toLowerCase();

  const cached =
    kyaraYoutubeSearchCache.get(key);

  if (
    cached &&
    cached.items.length >= count &&
    Date.now() - cached.time < 10 * 60 * 1000
  ) {
    return cached.items;
  }

  const args = [
    '--no-warnings',
    '--js-runtimes',
    'node:' + process.execPath,
    '--remote-components',
    'ejs:github',
    '--flat-playlist',
    '--dump-single-json',
    '--skip-download',
    'ytsearch' + count + ':' + q
  ];

  const { stdout } =
    await execFileAsync(
      'yt-dlp',
      args,
      {
        timeout: 180000,
        maxBuffer: 60 * 1024 * 1024
      }
    );

  let data;

  try {
    data = JSON.parse(stdout);
  } catch {
    throw new Error(
      'Resposta inválida do yt-dlp.'
    );
  }

  const entries =
    Array.isArray(data?.entries)
      ? data.entries
      : [];

  const seen =
    new Set();

  const items =
    entries
      .map((video) => {

        const id =
          String(
            video?.id || ''
          ).trim();

        if (!id || seen.has(id)) {
          return null;
        }

        seen.add(id);

        const channelId =
          String(
            video?.channel_id ||
            video?.uploader_id ||
            ''
          ).trim();

        const channelUrl =
          String(
            video?.channel_url ||
            video?.uploader_url ||
            (
              channelId
                ? 'https://www.youtube.com/channel/' + channelId
                : ''
            )
          ).trim();

        return {
          type: 'video',
          id,

          title:
            String(
              video?.title ||
              'Vídeo'
            ),

          url:
            'https://www.youtube.com/watch?v=' +
            id,

          thumbnail:
            video?.thumbnail ||
            (
              'https://i.ytimg.com/vi/' +
              id +
              '/hqdefault.jpg'
            ),

          author:
            String(
              video?.channel ||
              video?.uploader ||
              'YouTube'
            ),

          channelUrl,

          channelId,

          platform:
            'youtube',

          duration:
            Number(
              video?.duration
            ) || 0,

          views:
            Number(
              video?.view_count
            ) || 0,

          uploadDate:
            String(
              video?.upload_date ||
              ''
            )
        };

      })
      .filter(Boolean);

  kyaraYoutubeSearchCache.set(
    key,
    {
      time: Date.now(),
      items
    }
  );

  while (
    kyaraYoutubeSearchCache.size > 100
  ) {
    const first =
      kyaraYoutubeSearchCache
        .keys()
        .next()
        .value;

    kyaraYoutubeSearchCache.delete(
      first
    );
  }

  return items;
}

async function browserSearch(siteUrl = '', query = '') {
  const q = String(query || '').trim();

  if (!q) {
    return [];
  }

  const site = String(siteUrl || '').trim().toLowerCase();

  /*
   * =========================================================
   * YOUTUBE
   * =========================================================
   */

  if (
    site.includes('youtube.com') ||
    site.includes('youtu.be')
  ) {
    try {
      const yt = await import('yt-search');
      const result = await yt.default(q);

      const videos =
        (result.videos || [])
          .slice(0, 18)
          .map(video => ({
            type: 'video',
            title: video.title || 'YouTube',
            url:
              video.url ||
              `https://www.youtube.com/watch?v=${video.videoId}`,
            thumbnail: video.thumbnail || '',
            author: video.author?.name || 'YouTube',
            platform: 'youtube',
            duration: video.timestamp || '',
            views: Number(video.views) || 0,
            ago: video.ago || ''
          }))
          .filter(item => item.url);

      const channels =
        (result.channels || [])
          .slice(0, 6)
          .map(channel => ({
            type: 'channel',
            title: channel.name || 'Canal',
            url: channel.url || '',
            thumbnail:
              channel.thumbnail ||
              channel.image ||
              channel.thumbnails?.[0]?.url ||
              '',
            author: channel.name || 'YouTube',
            platform: 'youtube',
            subscribers:
              Number(channel.subscribers) || 0
          }))
          .filter(item => item.url);

      return [
        ...videos,
        ...channels
      ];
    } catch (error) {
      console.error('[KYARA BROWSER] YouTube:', error.message);
    }
  }

  /*
   * =========================================================
   * DOMÍNIO PARA PESQUISA
   * =========================================================
   */

  let domain = '';

  if (site.includes('vimeo.com')) {
    domain = 'vimeo.com';
  } else if (site.includes('dailymotion.com')) {
    domain = 'dailymotion.com';
  } else if (site.includes('tiktok.com')) {
    domain = 'tiktok.com';
  } else if (site.includes('instagram.com')) {
    domain = 'instagram.com';
  } else if (site.includes('facebook.com')) {
    domain = 'facebook.com';
  } else if (
    site.includes('twitter.com') ||
    site.includes('x.com')
  ) {
    domain = 'x.com';
  } else if (site.includes('pinterest.com')) {
    domain = 'pinterest.com';
  }

  /*
   * =========================================================
   * DUCKDUCKGO + BING
   * =========================================================
   */

  const searchQuery =
    domain
      ? `site:${domain} ${q}`
      : q;

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language':
      'pt-BR,pt;q=0.9,en;q=0.8'
  };

  function decodeHtml(value = '') {
    return String(value)
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&#x2F;/gi, '/')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseDdg(html) {
    const results = [];
    const seen = new Set();

    const patterns = [
      /<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      /<a[^>]+href=["']([^"']+)["'][^>]+class=["'][^"']*result__a[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
      /<a[^>]+class=["'][^"']*result__url[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    ];

    for (const regex of patterns) {
      let match;

      while ((match = regex.exec(html)) !== null) {
        let url = decodeHtml(match[1]);
        const title = decodeHtml(
          match[2].replace(/<[^>]+>/g, ' ')
        );

        if (url.includes('uddg=')) {
          try {
            const parsed = new URL(url, 'https://duckduckgo.com');
            url =
              decodeURIComponent(
                parsed.searchParams.get('uddg') || url
              );
          } catch {}
        }

        if (
          !/^https?:\/\//i.test(url) ||
          !title ||
          seen.has(url)
        ) {
          continue;
        }

        seen.add(url);

        results.push({
          title,
          url,
          thumbnail: '',
          author: domain || 'Web',
          platform: domain || 'web'
        });

        if (results.length >= 12) {
          return results;
        }
      }
    }

    return results;
  }

  function parseBing(html) {
    const results = [];
    const seen = new Set();

    const regex =
      /<li[^>]+class=["'][^"']*b_algo[^"']*["'][\s\S]*?<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while ((match = regex.exec(html)) !== null) {
      const url = decodeHtml(match[1]);
      const title = decodeHtml(
        match[2].replace(/<[^>]+>/g, ' ')
      );

      if (
        !/^https?:\/\//i.test(url) ||
        !title ||
        seen.has(url)
      ) {
        continue;
      }

      seen.add(url);

      results.push({
        title,
        url,
        thumbnail: '',
        author: domain || 'Web',
        platform: domain || 'web'
      });

      if (results.length >= 12) {
        break;
      }
    }

    return results;
  }

  /*
   * Primeiro DuckDuckGo.
   */

  try {
    const response = await fetch(
      'https://html.duckduckgo.com/html/?q=' +
      encodeURIComponent(searchQuery),
      {
        headers,
        redirect: 'follow'
      }
    );

    if (response.ok) {
      const html = await response.text();
      const results = parseDdg(html);

      if (results.length) {
        return results;
      }
    }
  } catch (error) {
    console.error(
      '[KYARA BROWSER] DuckDuckGo:',
      error.message
    );
  }

  /*
   * Se o DuckDuckGo não responder ou não puder ser
   * interpretado, usa Bing como fallback.
   */

  try {
    const response = await fetch(
      'https://www.bing.com/search?q=' +
      encodeURIComponent(searchQuery),
      {
        headers,
        redirect: 'follow'
      }
    );

    if (response.ok) {
      const html = await response.text();
      const results = parseBing(html);

      if (results.length) {
        return results;
      }
    }
  } catch (error) {
    console.error(
      '[KYARA BROWSER] Bing:',
      error.message
    );
  }

  return [];
}


/* =========================================================
 * KYARA BROWSER — PLAYER / EMBED
 * ========================================================= */

function browserEmbedUrl(value = '') {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  try {
    const url = new URL(raw);
    const host = url.hostname
      .toLowerCase()
      .replace(/^www\./, '');

    /*
     * YouTube
     */

    if (host === 'youtu.be') {
      const id =
        url.pathname
          .replace(/^\/+/, '')
          .split('/')[0];

      if (id) {
        return (
          'https://www.youtube.com/embed/' +
          encodeURIComponent(id) +
          '?autoplay=1&rel=0'
        );
      }
    }

    if (
      host === 'youtube.com' ||
      host.endsWith('.youtube.com')
    ) {
      let id = url.searchParams.get('v') || '';

      if (!id) {
        const parts =
          url.pathname
            .split('/')
            .filter(Boolean);

        if (
          ['shorts', 'embed', 'live'].includes(parts[0])
        ) {
          id = parts[1] || '';
        }
      }

      if (id) {
        return (
          'https://www.youtube.com/embed/' +
          encodeURIComponent(id) +
          '?autoplay=1&rel=0'
        );
      }
    }

    /*
     * Vimeo
     */

    if (host === 'vimeo.com') {
      const match =
        url.pathname.match(/(?:video\/)?(\d+)/);

      if (match) {
        return (
          'https://player.vimeo.com/video/' +
          encodeURIComponent(match[1]) +
          '?autoplay=1'
        );
      }
    }

    /*
     * Dailymotion
     */

    if (
      host === 'dailymotion.com' ||
      host === 'dai.ly'
    ) {
      let id = '';

      if (host === 'dai.ly') {
        id =
          url.pathname
            .replace(/^\/+/, '')
            .split('/')[0];
      } else {
        const match =
          url.pathname.match(
            /\/video\/([a-zA-Z0-9]+)/
          );

        id = match ? match[1] : '';
      }

      if (id) {
        return (
          'https://www.dailymotion.com/embed/video/' +
          encodeURIComponent(id) +
          '?autoplay=1'
        );
      }
    }
  } catch {}

  return '';
}


const HOST = "0.0.0.0";
const PORT = 3000;

const TMP_DIR = path.join(os.tmpdir(), "kyara-api");

fs.mkdirSync(TMP_DIR, { recursive: true });

function json(res, status, data) {
  const body = JSON.stringify(data, null, 2);

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Cache-Control": "no-store"
  });

  res.end(body);
}





function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizarCor(cor, padrao) {
  if (!cor) return padrao;

  const c = String(cor).trim();

  const permitidas = [
    "black",
    "white",
    "red",
    "blue",
    "green",
    "yellow",
    "purple",
    "pink",
    "orange",
    "gray",
    "grey",
    "transparent"
  ];

  if (permitidas.includes(c.toLowerCase())) {
    return c;
  }

  if (/^#[0-9a-fA-F]{6}$/.test(c)) {
    return c;
  }

  if (/^[0-9a-fA-F]{6}$/.test(c)) {
    return `#${c}`;
  }

  return padrao;
}

function gerarSVG(texto, bg, textColor, blur, scale = 1) {
  const width = 1080;
  const height = 512;

  const textoSeguro = escapeXml(texto);

  const blurValor = Math.max(
    0,
    Math.min(20, Number.parseFloat(blur) || 0)
  );

  const filtro = blurValor > 0
    ? `
      <filter id="blur">
        <feGaussianBlur stdDeviation="${blurValor}"/>
      </filter>
    `
    : "";

  const filtroTexto = blurValor > 0
    ? `filter="url(#blur)"`
    : "";

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
>
  <defs>
    ${filtro}
  </defs>

  <rect
    width="100%"
    height="100%"
    fill="${bg}"
  />

  <text
    x="50%"
    y="50%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${82 * scale}"
    font-weight="700"
    fill="${textColor}"
    ${filtroTexto}
  >
    ${textoSeguro}
  </text>
</svg>
`;
}

async function gerarBrat(url) {
  const texto = url.searchParams.get("query");

  if (!texto) {
    return {
      erro: "O parâmetro query é obrigatório"
    };
  }

  const bg = normalizarCor(
    url.searchParams.get("bg"),
    "white"
  );

  const textColor = normalizarCor(
    url.searchParams.get("text_color"),
    "black"
  );

  const blur = url.searchParams.get("blur") || "0";

  const svg = gerarSVG(
    texto,
    bg,
    textColor,
    blur
  );

  return await sharp(Buffer.from(svg))
    .webp({
      quality: 90
    })
    .toBuffer();
}

/*
 * ==========================================================
 * BRAT VIDEO
 * ==========================================================
 */

async function gerarBratVideo(url) {
  const textoOriginal = url.searchParams.get("query");

  if (!textoOriginal) {
    throw new Error("O parâmetro query é obrigatório");
  }

  // Protege caracteres especiais para o SVG.
  const texto = textoOriginal
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  const bg = normalizarCor(
    url.searchParams.get("bg"),
    "white"
  );

  const textColor = normalizarCor(
    url.searchParams.get("text_color"),
    "black"
  );

  const blur = url.searchParams.get("blur") || "0";

  let bpm = Number.parseFloat(
    url.searchParams.get("bpm") || "120"
  );

  if (!Number.isFinite(bpm)) bpm = 120;

  bpm = Math.max(40, Math.min(300, bpm));

  const id =
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const svgPath = path.join(TMP_DIR, `${id}.svg`);
  const pngPath = path.join(TMP_DIR, `${id}.png`);
  const outputPath = path.join(TMP_DIR, `${id}.mp4`);

  const svg = gerarSVG(
    texto,
    bg,
    textColor,
    blur
  );

  fs.writeFileSync(svgPath, svg, "utf8");

  try {
    await sharp(Buffer.from(svg, "utf8"))
      .png()
      .toFile(pngPath);

    if (!fs.existsSync(pngPath)) {
      throw new Error("PNG não foi criado pelo Sharp.");
    }

    const duration = 4;

    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-loop", "1",
        "-framerate", "30",
        "-i", pngPath,
        "-t", String(duration),
        "-vf", "scale=1080:512:force_original_aspect_ratio=decrease,pad=1080:512:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-r", "30",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-an",
        outputPath
      ],
      {
        maxBuffer: 10 * 1024 * 1024
      }
    );

    if (!fs.existsSync(outputPath)) {
      throw new Error("O FFmpeg não gerou o vídeo.");
    }

    const stat = fs.statSync(outputPath);

    if (stat.size < 1000) {
      throw new Error("Vídeo MP4 gerado com tamanho inválido.");
    }

    return {
      file: outputPath,
      bpm,
      duration
    };

  } finally {
    try { fs.unlinkSync(svgPath); } catch {}
    try { fs.unlinkSync(pngPath); } catch {}
  }
}

/*
 * ==========================================================
 * LYRICS / PESQUISA MUSICAL
 * ==========================================================
 */

async function pesquisarMusica(query) {
  if (!query || !query.trim()) {
    throw new Error("Informe o nome da música.");
  }

  const termo = encodeURIComponent(query.trim());

  const apiUrl =
    `https://itunes.apple.com/search?term=${termo}` +
    `&media=music&entity=song&limit=10`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(
      `Serviço de pesquisa respondeu ${response.status}`
    );
  }

  const data = await response.json();

  if (!data?.results?.length) {
    return {
      status: true,
      resultados: []
    };
  }

  const resultados = data.results.map(item => ({
    txt: item.trackName || "Título não disponível",
    art: item.artistName || "Artista desconhecido",
    album: item.collectionName || "",
    img: item.artworkUrl100 || null,
    link: item.trackViewUrl || "",
    preview: item.previewUrl || null
  }));

  return {
    status: true,
    resultados
  };
}

/*
 * ==========================================================
 * SERVIDOR
 * ==========================================================
 */

/* KYARA QUIZCASAL HELPERS BEGIN */

const QUIZ_DB_FILE=path.join(process.cwd(),"dados","database","quizcasal.json");
  
  function quizDB(){
   try{
    if(!fs.existsSync(QUIZ_DB_FILE))return {sessions:{},history:[]};
    const x=JSON.parse(fs.readFileSync(QUIZ_DB_FILE,"utf8"));
    return {sessions:x.sessions||{},history:Array.isArray(x.history)?x.history:[]};
   }catch{return {sessions:{},history:[]}}
  }
  
  function quizSave(x){
   fs.mkdirSync(path.dirname(QUIZ_DB_FILE),{recursive:true});
   const t=QUIZ_DB_FILE+".tmp";
   fs.writeFileSync(t,JSON.stringify(x,null,2));
   fs.renameSync(t,QUIZ_DB_FILE);
  }
  
  function quizAuth(s,role,token){
   if(!s)return false;
   return String(role).toUpperCase()==="A"
    ? String(token)===String(s.tokenA)
    : String(token)===String(s.tokenB);
  }
  
  function quizResult(s){
   const q=s.questions||[];
   const a=s.answersA||[];
   const b=s.answersB||[];
   let score=0,details=[];
  
   for(let i=0;i<q.length;i++){
    const correct=Number(a[i])===Number(b[i]);
    if(correct)score++;
    details.push({
     question:q[i].q,
     correct,
     correctAnswer:q[i].options[a[i]]||"—",
     chosenAnswer:q[i].options[b[i]]||"—"
    });
   }
  
   return {
    score,
    percent:q.length?Math.round(score/q.length*100):0,
    details
   };
  }

/* KYARA QUIZCASAL HELPERS END */

const server = http.createServer(async (req, res) => {

  


  // =========================================================
  // KYARA GAME EXTERNO
  // =========================================================

  try {

    const requestUrl =
      new URL(
        req.url || "/",
        `http://${req.headers.host || "localhost"}`
      );

    if (
      requestUrl.pathname === "/kyarajogo" &&
      req.method === "GET"
    ) {

      const KYARA_GAME_FILE =
        path.join(
          process.cwd(),
          "dados",
          "api",
          "kyara-jogo.html"
        );

      try {

        const html =
          await fs.promises.readFile(
            KYARA_GAME_FILE,
            "utf8"
          );

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/html; charset=utf-8",
            "Cache-Control":
              "no-store",
            "Access-Control-Allow-Origin":
              "*"
          }
        );

        return res.end(html);

      } catch (err) {

        console.error(
          "[KYARA GAME] Erro:",
          err
        );

        res.writeHead(
          500,
          {
            "Content-Type":
              "text/plain; charset=utf-8"
          }
        );

        return res.end(
          "KYARA GAME indisponível."
        );
      }
    }

  } catch (err) {

    console.error(
      "[KYARA GAME] Falha na rota:",
      err
    );
  }


  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host || `${HOST}:${PORT}`}`
    );

  /* KYARA QUIZCASAL ROUTES BEGIN */
    /* KYARA QUIZCASAL HEALTH */
    /* KYARA QUIZ CASAL — HTML */
    if(
      (url.pathname==="/quizcasal"||url.pathname==="/quizcasal/") &&
      req.method==="GET"
    ){
      const file=path.join(
        process.cwd(),
        "dados",
        "api",
        "quiz-casal.html"
      );

      try{
        const html=fs.readFileSync(file,"utf8");

        res.writeHead(200,{
          "Content-Type":"text/html; charset=utf-8",
          "Cache-Control":"no-store",
          "Access-Control-Allow-Origin":"*"
        });

        return res.end(html);
      }catch(err){
        console.error("[QUIZ CASAL] HTML:",err);

        return json(res,500,{
          ok:false,
          error:"Página do Quiz indisponível."
        });
      }
    }

    if(url.pathname==="/api/quizcasal/health"&&req.method==="GET"){
      return json(res,200,{
        ok:true,
        service:"quizcasal",
        version:1,
        timestamp:Date.now()
      });
    }

    

  if(url.pathname==="/api/quizcasal/state"&&req.method==="GET"){
    
     const code=String(url.searchParams.get("code")||"").toUpperCase();
     const role=String(url.searchParams.get("role")||"").toUpperCase();
     const token=String(url.searchParams.get("token")||"");
    
     const d=quizDB();
     const s=d.sessions[code];
    
     if(!s)
      return json(res,404,{ok:false,error:"Este Quiz não existe mais ou expirou."});
    
     if(!quizAuth(s,role,token))
      return json(res,403,{ok:false,error:"Acesso não autorizado."});
    
     if(s.phase==="RESULTS"){
      const r=quizResult(s);
      return json(res,200,{
       ok:true,
       phase:"RESULTS",
       currentIndex:s.questions.length,
       questionsCount:s.questions.length,
       score:r.score,
       percent:r.percent,
       details:r.details
      });
     }
    
     const current=role==="A"?Number(s.aIndex||0):Number(s.bIndex||0);     return json(res,200,{
      ok:true,
      phase:s.phase,
      ready:role==="A"?s.phase==="A":s.phase==="WAIT_B",
      currentIndex:current,
      questionsCount:s.questions.length,
      questions:(s.questions||[]).map(q=>({
       q:q.q,
       options:Array.isArray(q.options)?q.options:[]
      }))
     });
    }
    
    if(url.pathname==="/api/quizcasal/answer"&&req.method==="POST"){
    
     let body={};
    
     try{
      body=await readRequestBody(req);
     }catch{
      return json(res,400,{ok:false,error:"JSON inválido."});
     }
    
     const code=String(body.code||"").toUpperCase();
     const role=String(body.role||"").toUpperCase();
     const token=String(body.token||"");
     const qi=Number(body.questionIndex);
     const oi=Number(body.optionIndex);
    
     const d=quizDB();
     const s=d.sessions[code];
    
     if(!s)
      return json(res,404,{ok:false,error:"Quiz não encontrado."});
    
     if(!quizAuth(s,role,token))
      return json(res,403,{ok:false,error:"Acesso não autorizado."});
    
     const q=s.questions[qi];
    
     if(!q||!Number.isInteger(qi)||!Number.isInteger(oi)||!q.options[oi])
      return json(res,400,{ok:false,error:"Resposta inválida."});
    
     const index=role==="A"?Number(s.aIndex||0):Number(s.bIndex||0);
    
     if(index!==qi)
      return json(res,409,{ok:false,error:"Esta pergunta já foi respondida."});
    
     if(role==="A"){
    
      if(s.phase!=="A")
       return json(res,409,{ok:false,error:"Sua parte já terminou."});
    
      s.answersA[qi]=oi;
      s.aIndex=qi+1;
    
      if(s.aIndex>=s.questions.length)
       s.phase="WAIT_B";
    
     }else if(role==="B"){
    
      if(s.phase!=="WAIT_B")
       return json(res,409,{ok:false,error:"A primeira pessoa ainda não terminou."});
    
      s.answersB[qi]=oi;
      s.bIndex=qi+1;
    
      if(s.bIndex>=s.questions.length){
       s.phase="RESULTS";
    
       const r=quizResult(s);
    
       d.history.push({
        code,
        chatId:s.chatId,
        a:s.a,
        b:s.b,
        score:r.score,
        percent:r.percent,
        details:r.details,
        finishedAt:new Date().toISOString()
       });
    
       d.history=d.history.slice(-100);
      }
    
     }else{
      return json(res,400,{ok:false,error:"Participante inválido."});
     }
    
     s.updatedAt=Date.now();
     d.sessions[code]=s;
     quizSave(d);
    
     if(s.phase==="RESULTS"){
      const r=quizResult(s);
      return json(res,200,{
       ok:true,
       phase:"RESULTS",
       currentIndex:s.questions.length,
       questionsCount:s.questions.length,
       score:r.score,
       percent:r.percent,
       details:r.details
      });
     }
    
     return json(res,200,{
      ok:true,
      phase:s.phase,
      currentIndex:role==="A"?s.aIndex:s.bIndex,
      questionsCount:s.questions.length
     });
    }

  /* KYARA QUIZCASAL ROUTES END */

    /*
     * CORS PREFLIGHT
     */

    if (req.method === "OPTIONS") {

      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
        "Access-Control-Max-Age": "86400"
      });

      return res.end();
    }


    /*
     * ========================================================
     * KYARA TUBE — INTERFACE
     * ========================================================
     */

    if (
      url.pathname === "/kyara-tube" ||
      url.pathname === "/kyara-tube/"
    ) {

      const htmlPath =
        path.join(
          process.cwd(),
          "dados",
          "api",
          "kyara-youtube.html"
        );

      if (!fs.existsSync(htmlPath)) {

        return json(res, 404, {
          status: false,
          error: "kyara-youtube.html não encontrado."
        });

      }

      let html =
        fs.readFileSync(
          htmlPath,
          "utf8"
        );

      /*
       * O mesmo HTML usado pelo KYARA TUBE
       * agora funciona também pela rota /kyara-tube.
       *
       * A origem é calculada pela própria requisição,
       * então não fica presa a um Quick Tunnel antigo.
       */
      const host =
        String(
          req.headers.host || ""
        ).trim();

      const forwardedProto =
        String(
          req.headers["x-forwarded-proto"] ||
          ""
        )
          .split(",")[0]
          .trim();

      const protocol =
        /^https?$/i.test(
          forwardedProto
        )
          ? forwardedProto
          : (
              String(req.socket.encrypted)
                === "true"
                ? "https"
                : "http"
            );

      const apiBase =
        host
          ? protocol + "://" + host
          : "http://127.0.0.1:3000";

      const initialQuery =
        String(
          url.searchParams.get("q") ||
          url.searchParams.get("query") ||
          ""
        ).trim();

      const safeAttr =
        initialQuery
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

      html =
        html
          .replace(
            /__KYARA_API_BASE__/g,
            JSON.stringify(apiBase)
          )
          .replace(
            /__KYARA_INITIAL_QUERY__/g,
            JSON.stringify(initialQuery)
          )
          .replace(
            /__KYARA_INITIAL_QUERY_ATTR__/g,
            safeAttr
          )
          .replace(
            /__KYARA_INITIAL_RESULTS__/g,
            "[]"
          );

      res.writeHead(200, {
        "Content-Type":
          "text/html; charset=utf-8",

        
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
"Cache-Control":
          "no-store"
      });

      return res.end(html);
    }


    /*
     * ========================================================
     * KYARA TUBE — MANIFEST
     * ========================================================
     */

    if (
      url.pathname ===
      "/kyara-tube/manifest.webmanifest"
    ) {

      res.writeHead(200, {
        "Content-Type":
          "application/manifest+json; charset=utf-8",

        "Cache-Control":
          "no-store"
      });

      return res.end(
        JSON.stringify({
          name: "KYARA TUBE",
          short_name: "KYARA TUBE",
          start_url: "/kyara-tube",
          scope: "/kyara-tube",
          display: "standalone",
          background_color: "#07050b",
          theme_color: "#08050d"
        })
      );
    }


    /*
     * ========================================================
     * KYARA TUBE — SERVICE WORKER
     * ========================================================
     */

    if (
      url.pathname ===
      "/kyara-tube/sw.js"
    ) {

      res.writeHead(200, {
        "Content-Type":
          "application/javascript; charset=utf-8",

        "Cache-Control":
          "no-store"
      });

      return res.end(
        `
self.addEventListener(
  "install",
  () => self.skipWaiting()
);

self.addEventListener(
  "activate",
  event =>
    event.waitUntil(
      self.clients.claim()
    )
);
`
      );
    }


    /*
     * ========================================================
     * KYARA BROWSER — INTERFACE
     * ========================================================
     */

    if (
      url.pathname === "/browser" ||
      url.pathname === "/browser/"
    ) {

      if (!fs.existsSync(
        path.join(
          process.cwd(),
          "dados",
          "api",
          "kyara-browser.html"
        )
      )) {

        return json(res, 404, {
          status: false,
          error: "kyara-browser.html não encontrado."
        });

      }

      const html =
        fs.readFileSync(
          path.join(
            process.cwd(),
            "dados",
            "api",
            "kyara-browser.html"
          ),
          "utf8"
        );

      res.writeHead(200, {
        "Content-Type":
          "text/html; charset=utf-8",

        "Cache-Control":
          "no-store"
      });

      return res.end(html);
    }


    /*
     * ========================================================
     * KYARA BROWSER — PESQUISA
     * ========================================================
     */

    
    /*
     * ========================================================
     * KYARA BROWSER — PESQUISA GET
     * ========================================================
     */

    if (
      url.pathname === "/api/browser/search" &&
      req.method === "GET"
    ) {

      try {

        const query =
          String(
            url.searchParams.get("query") ||
            url.searchParams.get("q") ||
            ""
          ).trim();

        const siteUrl =
          String(
            url.searchParams.get("siteUrl") ||
            "https://www.youtube.com"
          ).trim();

        const offset =
          Math.max(
            0,
            parseInt(
              url.searchParams.get("offset") ||
              "0",
              10
            ) || 0
          );

        const limit =
          Math.min(
            30,
            Math.max(
              1,
              parseInt(
                url.searchParams.get("limit") ||
                "20",
                10
              ) || 20
            )
          );

        if (!query) {

          return json(
            res,
            400,
            {
              status: false,
              error:
                "A pesquisa é obrigatória."
            }
          );

        }

        const isYoutube =
          /youtube\.com|youtu\.be/i.test(
            siteUrl
          );

        let all;

        if (isYoutube) {

          all =
            await kyaraYoutubeSearchReal(
              query,
              100
            );

        } else {

          all =
            await browserSearch(
              siteUrl,
              query
            );

        }

        const videos =
          Array.isArray(all)
            ? all.filter(
                item =>
                  item?.type === 'video'
              )
            : [];

        const page =
          videos.slice(
            offset,
            offset + limit
          );

        return json(
          res,
          200,
          {
            status: true,

            site:
              siteUrl,

            platform:
              isYoutube
                ? "youtube"
                : (
                    siteUrl
                      ? platformOf(siteUrl)
                      : "web"
                  ),

            query,

            offset,

            limit,

            total:
              videos.length,

            hasMore:
              offset + page.length <
              videos.length,

            results:
              page
          }
        );

      } catch (error) {

        console.error(
          "[KYARA BROWSER] Pesquisa GET:",
          error?.stack ||
          error?.message ||
          error
        );

        return json(
          res,
          500,
          {
            status: false,
            error:
              error?.message ||
              "Falha na pesquisa."
          }
        );

      }

    }

if (
      url.pathname ===
      "/api/browser/search" &&
      req.method === "POST"
    ) {

      try {

        const body =
          await readRequestBody(req);

        const siteUrl =
          String(
            body?.url ||
            body?.siteUrl ||
            ""
          ).trim();

        const query =
          String(
            body?.query || ""
          ).trim();

        if (!query) {

          return json(res, 400, {
            status: false,
            error: "A pesquisa é obrigatória."
          });

        }

        const results =
          await browserSearch(
            siteUrl,
            query
          );

        return json(res, 200, {
          status: true,
          site: siteUrl || "web",
          platform:
            siteUrl
              ? platformOf(siteUrl)
              : "web",
          results
        });

      } catch (err) {

        console.error(
          "[KYARA BROWSER SEARCH]",
          err
        );

        return json(res, 500, {
          status: false,
          error:
            err?.message ||
            "Falha na pesquisa."
        });

      }

    }



    /*
     * ========================================================
     * KYARA BROWSER — EMBED
     * ========================================================
     */

    /*
     * ========================================================
     * KYARA TUBE — CANAL
     * ========================================================
     */

    if (
      url.pathname ===
      "/api/browser/channel" &&
      req.method === "GET"
    ) {

      try {

        const source =
          String(
            url.searchParams.get("url") ||
            ""
          ).trim();

        if (!source) {

          return json(
            res,
            400,
            {
              status: false,
              error:
                "URL do canal não informada."
            }
          );

        }

        const yt =
          await import("yt-search");

        const result =
          await yt.default(source);

        const channel =
          result?.channels?.[0];

        const channelName =
          channel?.name ||
          source;

        let videos =
          result?.videos ||
          [];

        if (!videos.length) {

          const fallback =
            await yt.default(
              channelName
            );

          videos =
            fallback?.videos ||
            [];

        }

        videos =
          videos
            .slice(0, 18)
            .map(video => ({
              title:
                video.title ||
                "Vídeo",

              url:
                video.url ||
                `https://www.youtube.com/watch?v=${video.videoId}`,

              thumbnail:
                video.thumbnail ||
                "",

              author:
                video.author?.name ||
                channelName,

              duration:
                video.timestamp ||
                "",

              views:
                Number(video.views) ||
                0,

              published:
                video.ago ||
                ""
            }));

        return json(
          res,
          200,
          {
            status: true,

            channel: {

              id:
                channel?.channelId ||
                channel?.id ||
                "",

              name:
                channelName,

              url:
                channel?.url ||
                source,

              subscribers:
                channel?.subscribers ||
                "",

              description:
                "Canal do YouTube aberto pelo Kyara Tube.",

              thumbnails:
                channel?.image
                  ? [
                      {
                        url:
                          channel.image
                      }
                    ]
                  : [],

              verified:
                Boolean(
                  channel?.verified
                )

            },

            videos

          }
        );

      } catch (err) {

        console.error(
          "[KYARA TUBE CHANNEL]",
          err
        );

        return json(
          res,
          500,
          {
            status: false,
            error:
              err?.message ||
              "Falha ao carregar canal."
          }
        );

      }

    }


    /*
     * ========================================================
     * KYARA TUBE — PESQUISA NO CANAL
     * ========================================================
     */

    if (
      url.pathname ===
      "/api/browser/channel/search" &&
      req.method === "GET"
    ) {

      try {

        const channelName =
          String(
            url.searchParams.get("channelName") ||
            ""
          ).trim();

        const query =
          String(
            url.searchParams.get("query") ||
            ""
          ).trim();

        if (!query) {

          return json(
            res,
            400,
            {
              status: false,
              error:
                "Digite algo para pesquisar."
            }
          );

        }

        const yt =
          await import("yt-search");

        const result =
          await yt.default(
            (
              channelName +
              " " +
              query
            ).trim()
          );

        const videos =
          (result?.videos || [])
            .slice(0, 18)
            .map(video => ({
              title:
                video.title ||
                "Vídeo",

              url:
                video.url ||
                `https://www.youtube.com/watch?v=${video.videoId}`,

              thumbnail:
                video.thumbnail ||
                "",

              author:
                video.author?.name ||
                channelName ||
                "YouTube",

              duration:
                video.timestamp ||
                "",

              views:
                Number(video.views) ||
                0,

              published:
                video.ago ||
                ""
            }));

        return json(
          res,
          200,
          {
            status: true,
            videos
          }
        );

      } catch (err) {

        console.error(
          "[KYARA TUBE CHANNEL SEARCH]",
          err
        );

        return json(
          res,
          500,
          {
            status: false,
            error:
              err?.message ||
              "Falha na pesquisa do canal."
          }
        );

      }

    }


    if (
      url.pathname ===
      "/api/browser/embed" &&
      req.method === "GET"
    ) {

      try {

        const source =
          String(
            url.searchParams.get("url") ||
            ""
          ).trim();

        if (!source) {

          return json(res, 400, {
            status: false,
            error: "URL não informada."
          });

        }

        const embed =
          browserEmbedUrl(source);

        let platform = "web";

        if (
          /youtube\.com|youtu\.be/i.test(source)
        ) {
          platform = "youtube";

        } else if (
          /vimeo\.com/i.test(source)
        ) {
          platform = "vimeo";

        } else if (
          /dailymotion\.com|dai\.ly/i.test(source)
        ) {
          platform = "dailymotion";
        }

        return json(res, 200, {

          status: true,

          source,

          embeddable:
            Boolean(embed),

          embed:
            embed || source,

          platform

        });

      } catch (err) {

        console.error(
          "[KYARA BROWSER EMBED]",
          err
        );

        return json(res, 500, {

          status: false,

          error:
            err?.message ||
            "Falha ao preparar o player."

        });

      }

    }


    /*
     * ========================================================
     * KYARA TUBE — DOWNLOAD REAL
     * ========================================================
     */

    /*
     * ========================================================
     * KYARA PLAY2 — STREAM DE ÁUDIO
     *
     * O player Rich HTML usa esta rota diretamente no
     * elemento <audio>. O servidor baixa/converte o áudio
     * com o mesmo sistema já usado pelo Kyara Tube.
     * ========================================================
     */

    /*
     * ========================================================
     * KYARA PLAY2 — STREAM MP3
     *
     * O Rich HTML recebe MP3/AAC-compatible via <audio>.
     * O YouTube é baixado com yt-dlp e convertido pelo ffmpeg
     * para MP3 antes de ser entregue ao player.
     * ========================================================
     */


    /*
     * ========================================================
     * KYARA PLAY2 — STREAM DE ÁUDIO
     *
     * O Rich HTML usa:
     *
     *   /api/browser/stream?url=YOUTUBE
     *
     * O áudio é obtido pelo youtubeMp3()
     * e mantido em memória temporariamente.
     *
     * Suporta:
     *
     *   OPTIONS
     *   HEAD
     *   GET
     *   Range
     * ========================================================
     */

    if (
      url.pathname ===
      "/api/browser/stream" &&
      (
        req.method === "GET" ||
        req.method === "HEAD" ||
        req.method === "OPTIONS"
      )
    ) {

      const corsHeaders = {

        "Access-Control-Allow-Origin":
          "*",

        "Access-Control-Allow-Methods":
          "GET, HEAD, OPTIONS",

        "Access-Control-Allow-Headers":
          "Range, Content-Type, Accept",

        "Access-Control-Expose-Headers":
          "Accept-Ranges, Content-Length, Content-Range, Content-Type",

        "Accept-Ranges":
          "bytes",

        "Cache-Control":
          "no-store, no-cache, must-revalidate",

        "Content-Disposition":
          "inline"

      };


      /*
       * ------------------------------------------------------
       * CORS
       * ------------------------------------------------------
       */

      if (
        req.method ===
        "OPTIONS"
      ) {

        res.writeHead(
          204,
          corsHeaders
        );

        return res.end();

      }


      /*
       * ------------------------------------------------------
       * URL DO YOUTUBE
       * ------------------------------------------------------
       */

      const source =
        String(
          url.searchParams.get(
            "url"
          ) ||
          ""
        ).trim();


      if (
        !/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//i.test(
          source
        )
      ) {

        return json(
          res,
          400,
          {
            status:
              false,

            error:
              "URL do YouTube inválida."
          }
        );

      }


      /*
       * ------------------------------------------------------
       * CACHE
       * ------------------------------------------------------
       */

      let cached =
        PLAY2_AUDIO_CACHE.get(
          source
        );


      /*
       * Expira cache antigo.
       */

      if (
        cached &&
        cached.time &&
        Date.now() -
          cached.time >
          PLAY2_AUDIO_CACHE_TTL
      ) {

        PLAY2_AUDIO_CACHE.delete(
          source
        );

        cached =
          null;

      }


      /*
       * ------------------------------------------------------
       * DOWNLOAD ÚNICO
       * ------------------------------------------------------
       */

      if (!cached) {

        console.log(
          "[PLAY2 STREAM] 🎧 Obtendo MP3:",
          source
        );


        const promise =
          (async () => {

            const result =
              await youtubeMp3(
                source,
                null,
                {
                  bitrate:
                    "128k"
                }
              );


            if (
              !result ||
              result.ok !== true ||
              !Buffer.isBuffer(
                result.buffer
              ) ||
              result.buffer.length === 0
            ) {

              throw new Error(
                result?.msg ||
                "youtubeMp3() não retornou áudio."
              );

            }


            if (
              result.buffer.length >
              PLAY2_AUDIO_CACHE_MAX
            ) {

              throw new Error(
                "Áudio PLAY2 excede o limite permitido."
              );

            }


            console.log(
              "[PLAY2 STREAM] ✅ MP3:",
              Math.round(
                result.buffer.length /
                1024
              ),
              "KB"
            );


            return {
              buffer:
                result.buffer,

              time:
                Date.now()
            };

          })();


        cached = {
          promise
        };


        PLAY2_AUDIO_CACHE.set(
          source,
          cached
        );


        try {

          cached =
            await promise;

          PLAY2_AUDIO_CACHE.set(
            source,
            cached
          );

        } catch (error) {

          PLAY2_AUDIO_CACHE.delete(
            source
          );

          throw error;

        }

      }


      /*
       * ------------------------------------------------------
       * AGUARDA DOWNLOAD EM ANDAMENTO
       * ------------------------------------------------------
       */

      if (
        cached.promise
      ) {

        cached =
          await cached.promise;

        PLAY2_AUDIO_CACHE.set(
          source,
          cached
        );

      }


      const audio =
        cached.buffer;


      const total =
        audio.length;


      /*
       * ------------------------------------------------------
       * HEAD
       * ------------------------------------------------------
       */

      if (
        req.method ===
        "HEAD"
      ) {

        res.writeHead(
          200,
          {
            ...corsHeaders,

            "Content-Type":
              "audio/mpeg",

            "Content-Length":
              total
          }
        );

        return res.end();

      }


      /*
       * ------------------------------------------------------
       * GET SEM RANGE
       * ------------------------------------------------------
       */

      const range =
        String(
          req.headers.range ||
          ""
        ).trim();


      if (!range) {

        res.writeHead(
          200,
          {
            ...corsHeaders,

            "Content-Type":
              "audio/mpeg",

            "Content-Length":
              total
          }
        );

        return res.end(
          audio
        );

      }


      /*
       * ------------------------------------------------------
       * RANGE
       * ------------------------------------------------------
       */

      const match =
        /^bytes=(\d*)-(\d*)$/i.exec(
          range
        );


      if (!match) {

        res.writeHead(
          416,
          {
            ...corsHeaders,

            "Content-Range":
              `bytes */${total}`
          }
        );

        return res.end();

      }


      let start =
        match[1]
          ? Number(
              match[1]
            )
          : 0;


      let end =
        match[2]
          ? Number(
              match[2]
            )
          : total - 1;


      /*
       * bytes=-50000
       */

      if (
        !match[1] &&
        match[2]
      ) {

        const quantity =
          Number(
            match[2]
          );

        start =
          Math.max(
            0,
            total - quantity
          );

        end =
          total - 1;

      }


      if (
        !Number.isFinite(
          start
        ) ||
        !Number.isFinite(
          end
        ) ||
        start < 0 ||
        start >= total ||
        end < start
      ) {

        res.writeHead(
          416,
          {
            ...corsHeaders,

            "Content-Range":
              `bytes */${total}`
          }
        );

        return res.end();

      }


      end =
        Math.min(
          end,
          total - 1
        );


      const chunk =
        audio.subarray(
          start,
          end + 1
        );


      res.writeHead(
        206,
        {
          ...corsHeaders,

          "Content-Type":
            "audio/mpeg",

          "Content-Length":
            chunk.length,

          "Content-Range":
            `bytes ${start}-${end}/${total}`
        }
      );


      console.log(
        "[PLAY2 STREAM] ▶️ Range:",
        start,
        "-",
        end,
        "/",
        total
      );


      return res.end(
        chunk
      );

    }

    /*
     * STATUS
     */

    if (url.pathname === "/") {
      return json(res, 200, {
        status: true,
        api: "Kyara API",
        version: "1.3.0",
        gratuita: true,
        local: true,

        endpoints: [
          "/",
          "/api/teste",
          "/api/verificarkey",
          "/api/canvas/brat",
          "/api/canvas/bratvideo",
          "/api/pesquisa/letra"
        ]
      });
    }

    /*
     * VERIFICAR API
     */

    if (url.pathname === "/api/verificarkey") {
      return json(res, 200, {
        status: true,
        valid: true,
        message: "API própria funcionando!"
      });
    }

    /*
     * TESTE
     */

    if (url.pathname === "/api/teste") {
      return json(res, 200, {
        status: true,
        message: "Kyara API funcionando perfeitamente 🚀",
        timestamp: new Date().toISOString()
      });
    }

    /*
     * BRAT
     */

    if (url.pathname === "/api/canvas/brat") {
      try {
        const imagem = await gerarBrat(url);

        if (imagem?.erro) {
          return json(res, 400, {
            status: false,
            error: imagem.erro
          });
        }

        res.writeHead(200, {
          "Content-Type": "image/webp",
          "Content-Length": imagem.length,
          "Cache-Control": "public, max-age=1800",
          "Access-Control-Allow-Origin": "*"
        });

        return res.end(imagem);

      } catch (err) {
        console.error("[BRAT] Erro:", err);

        return json(res, 500, {
          status: false,
          error: "Erro ao gerar Brat",
          details: err.message
        });
      }
    }

    /*
     * BRAT VIDEO
     */

    if (url.pathname === "/api/canvas/bratvideo") {
      try {
        const resultado = await gerarBratVideo(url);

        const video = fs.readFileSync(
          resultado.file
        );

        res.writeHead(200, {
          "Content-Type": "video/mp4",
          "Content-Length": video.length,
          "Cache-Control": "public, max-age=1800",
          "Access-Control-Allow-Origin": "*"
        });

        res.end(video);

        /*
         * Limpeza automática depois do envio.
         */

        setTimeout(() => {
          try {
            fs.unlinkSync(resultado.file);
          } catch {}
        }, 5000);

        return;

      } catch (err) {
        console.error("[BRATVID] Erro:", err);

        return json(res, 500, {
          status: false,
          error: "Erro ao gerar Bratvid",
          details: err.message
        });
      }
    }

    /*
     * PESQUISA MUSICAL
     */

    if (url.pathname === "/api/pesquisa/letra") {
      try {
        const query = url.searchParams.get("query");

        if (!query) {
          return json(res, 400, {
            status: false,
            error: "O parâmetro query é obrigatório"
          });
        }

        const resultado = await pesquisarMusica(query);

        return json(res, 200, {
          status: true,
          results: {
            resultados: resultado.resultados
          }
        });

      } catch (err) {
        console.error("[LYRICS] Erro:", err);

        return json(res, 500, {
          status: false,
          error: "Erro ao pesquisar música",
          details: err.message
        });
      }
    }

    /*
     * 404
     */

    return json(res, 404, {
      status: false,
      error: "Endpoint não encontrado"
    });

  } catch (err) {
    console.error("[API] Erro:", err);

    return json(res, 500, {
      status: false,
      error: "Erro interno da API"
    });
  }
});

server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n⚠️ A porta ${PORT} já está em uso.\n` +
      `A API provavelmente já está rodando.\n`
    );
    return;
  }

  console.error(
    "[API] Erro do servidor:",
    err
  );
});


// KYARA GAME EXTERNO
// O server.mjs usa http.createServer(), não Express.
// A rota /kyarajogo foi integrada diretamente ao handler HTTP.

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("================================");
  console.log("🚀 KYARA API");
  console.log("================================");
  console.log(`📡 http://${HOST}:${PORT}`);
  console.log("💰 Gratuita");
  console.log("🔒 Local");
  console.log("🎨 Canvas/Brat: ATIVO");
  console.log("🎬 Bratvid: ATIVO");
  console.log("🎵 Pesquisa musical: ATIVA");
  console.log("================================");
  console.log("");
});
