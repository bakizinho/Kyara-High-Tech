import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const UA =
  'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HISTORY_FILE = path.join(
  __dirname,
  '..',
  '..',
  'database',
  'sticker-history.json'
);

/*
 * ============================================================
 * 🚫 FILTRO ABSOLUTO DE CONTEÚDO ADULTO
 * ============================================================
 */

const BLOCKED_TERMS = [
  'porn',
  'porno',
  'pornographic',
  'hentai',
  'ecchi',
  'nsfw',
  'xxx',
  'nude',
  'nudity',
  'naked',
  'sex',
  'sexual',
  'erotic',
  'erotica',
  'fetish',
  'rule34',
  'booru',
  'doujin',
  'adult',
  '18+',
  '18plus',
  'explicit',
  'genital',
  'breast',
  'boobs',
  'lewd',
  'r18'
];

function normalizeText(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function blocked(value = '') {
  const text = normalizeText(value);

  return BLOCKED_TERMS.some(term =>
    text.includes(normalizeText(term))
  );
}

function validUrl(value) {
  try {
    const u = new URL(String(value));

    return (
      u.protocol === 'http:' ||
      u.protocol === 'https:'
    );
  } catch {
    return false;
  }
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003d/g, '=')
    .replace(/\\u002f/g, '/')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"');
}

/*
 * ============================================================
 * HISTÓRICO
 *
 * Guarda URLs recentemente usadas por tema.
 * Assim:
 *
 * /figurinhas goku 4
 * depois /figurinhas goku 4
 *
 * NÃO pega simplesmente os mesmos 4 links.
 * ============================================================
 */

function loadHistory() {
  try {
    const dir = path.dirname(HISTORY_FILE);

    fs.mkdirSync(dir, {
      recursive: true
    });

    if (!fs.existsSync(HISTORY_FILE)) {
      return {};
    }

    const data =
      JSON.parse(
        fs.readFileSync(
          HISTORY_FILE,
          'utf8'
        )
      );

    return (
      data &&
      typeof data === 'object'
    )
      ? data
      : {};

  } catch {
    return {};
  }
}

function saveHistory(history) {
  try {
    fs.mkdirSync(
      path.dirname(HISTORY_FILE),
      { recursive: true }
    );

    fs.writeFileSync(
      HISTORY_FILE,
      JSON.stringify(
        history,
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      '[THEME STICKER] Erro salvando histórico:',
      error.message
    );
  }
}

function themeKey(theme) {
  return normalizeText(theme)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

/*
 * ============================================================
 * BING IMAGES
 * ============================================================
 */

async function searchBingImages(
  query,
  limit,
  offset = 0
) {
  const url =
    new URL(
      'https://www.bing.com/images/search'
    );

  url.searchParams.set(
    'q',
    query
  );

  url.searchParams.set(
    'form',
    'HDRSC2'
  );

  url.searchParams.set(
    'safeSearch',
    'Strict'
  );

  url.searchParams.set(
    'first',
    String(Math.max(1, offset))
  );

  const response =
    await axios.get(
      url.toString(),
      {
        timeout: 25000,
        headers: {
          'User-Agent': UA,
          'Accept-Language':
            'pt-BR,pt;q=0.9,en;q=0.8',
          Accept:
            'text/html,application/xhtml+xml'
        }
      }
    );

  const html =
    String(response.data || '');

  const results = [];
  const seen = new Set();

  const patterns = [
    /"murl":"(.*?)"/g,
    /murl&quot;:&quot;(.*?)&quot;/g,
    /\\"murl\\":\\"(.*?)\\"/g,
    /"turl":"(.*?)"/g
  ];

  for (const pattern of patterns) {

    let match;

    while (
      (match = pattern.exec(html))
    ) {
      let value =
        decodeHtml(match[1]);

      try {
        value =
          decodeURIComponent(value);
      } catch {}

      if (!validUrl(value)) {
        continue;
      }

      if (blocked(value)) {
        continue;
      }

      const lower =
        value.toLowerCase();

      if (
        lower.includes(
          'bing.com/images'
        ) ||
        lower.includes(
          'google.com'
        ) ||
        lower.includes(
          'gstatic.com'
        ) ||
        lower.includes(
          'data:image'
        ) ||
        lower.endsWith('.svg')
      ) {
        continue;
      }

      if (!seen.has(value)) {
        seen.add(value);
        results.push(value);
      }

      if (
        results.length >= limit
      ) {
        return results;
      }
    }
  }

  return results;
}

/*
 * ============================================================
 * BUSCA VARIADA
 *
 * Não faz uma única pesquisa estática.
 * Usa várias descrições diferentes + posições diferentes
 * no Bing.
 * ============================================================
 */

export async function searchThemeImages(
  theme,
  limit = 30
) {
  const clean =
    String(theme || '')
      .replace(
        /[^\p{L}\p{N}\s_-]/gu,
        ' '
      )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100);

  if (!clean) {
    return [];
  }

  if (blocked(clean)) {
    console.log(
      `[THEME STICKER] 🚫 Tema bloqueado: ${clean}`
    );

    return [];
  }

  const history =
    loadHistory();

  const key =
    themeKey(clean);

  const used =
    new Set(
      Array.isArray(history[key])
        ? history[key]
        : []
    );

  /*
   * Embaralha os termos.
   */
  const variants = [
    `${clean} anime`,
    `${clean} character`,
    `${clean} anime character`,
    `${clean} manga`,
    `${clean} drawing`,
    `${clean} illustration`,
    `${clean} artwork`,
    `${clean} action`,
    `${clean} funny`,
    `${clean} face expression`,
    `${clean} pose`,
    `${clean} wallpaper`
  ];

  /*
   * Fisher-Yates.
   */
  for (
    let i = variants.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      variants[i],
      variants[j]
    ] = [
      variants[j],
      variants[i]
    ];
  }

  const results = [];
  const seen = new Set();

  /*
   * Começa em posições aleatórias.
   * Isso evita sempre pegar os primeiros resultados.
   */
  const offsets = [];

  for (
    let i = 0;
    i < variants.length;
    i++
  ) {
    offsets.push(
      Math.floor(
        Math.random() * 80
      )
    );
  }

  for (
    let i = 0;
    i < variants.length;
    i++
  ) {
    if (
      results.length >= limit
    ) {
      break;
    }

    const query =
      variants[i];

    try {

      const found =
        await searchBingImages(
          query,
          Math.max(20, limit),
          offsets[i]
        );

      let fresh = 0;

      for (
        const url of found
      ) {

        /*
         * Evita:
         * - repetição na mesma busca
         * - repetição recente do tema
         */
        if (
          seen.has(url) ||
          used.has(url)
        ) {
          continue;
        }

        seen.add(url);
        results.push(url);
        fresh++;

        if (
          results.length >= limit
        ) {
          break;
        }
      }

      console.log(
        `[THEME STICKER] ${query} @${offsets[i]}: ${fresh} novas`
      );

    } catch (error) {

      console.error(
        `[THEME STICKER] Erro Bing: ${error.message}`
      );
    }
  }

  /*
   * Se o histórico ficou grande demais,
   * mantém somente os últimos 120.
   */
  history[key] = [
    ...(Array.isArray(history[key])
      ? history[key]
      : [])
  ];

  saveHistory(history);

  console.log(
    `[THEME STICKER] ${clean}: ${results.length} imagens NOVAS`
  );

  return results;
}

/*
 * ============================================================
 * VALIDAÇÃO DA IMAGEM
 * ============================================================
 */

function looksLikeImage(
  buffer,
  contentType = ''
) {
  const type =
    String(
      contentType || ''
    ).toLowerCase();

  if (
    type.startsWith('image/')
  ) {
    return true;
  }

  if (
    !buffer ||
    buffer.length < 100
  ) {
    return false;
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }

  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8
  ) {
    return true;
  }

  if (
    buffer.slice(0, 4).toString() ===
      'RIFF' &&
    buffer.slice(8, 12).toString() ===
      'WEBP'
  ) {
    return true;
  }

  if (
    buffer.slice(0, 6).toString() ===
      'GIF87a' ||
    buffer.slice(0, 6).toString() ===
      'GIF89a'
  ) {
    return true;
  }

  return false;
}

async function downloadImage(url) {
  if (
    !validUrl(url) ||
    blocked(url)
  ) {
    throw new Error(
      'URL bloqueada pelo filtro'
    );
  }

  const response =
    await axios.get(
      url,
      {
        responseType:
          'arraybuffer',

        timeout:
          20000,

        maxContentLength:
          12 * 1024 * 1024,

        maxBodyLength:
          12 * 1024 * 1024,

        validateStatus:
          status =>
            status >= 200 &&
            status < 400,

        headers: {
          'User-Agent': UA,
          Accept:
            'image/avif,image/webp,image/apng,image/png,image/jpeg,image/gif,image/*;q=0.8,*/*;q=0.2'
        }
      }
    );

  const buffer =
    Buffer.from(
      response.data || []
    );

  if (
    !looksLikeImage(
      buffer,
      response.headers?.[
        'content-type'
      ]
    )
  ) {
    throw new Error(
      'conteúdo recebido não é imagem'
    );
  }

  return buffer;
}

/*
 * ============================================================
 * ENVIO
 * ============================================================
 */

export async function sendThemeStickers({
  nazu,
  destino,
  imagens,
  tema = '',
  quantidade,
  author = 'Baki',
  packname = 'Kyara',
  quoted
}) {
  const requested =
    Math.max(
      1,
      Math.min(
        20,
        Number(quantidade) || 1
      )
    );

  if (
    !nazu ||
    !destino
  ) {
    return {
      requested,
      sent: 0,
      failed: requested
    };
  }

  /*
   * Busca MUITO mais do que precisa.
   */
  let urls =
    await searchThemeImages(
      tema,
      Math.max(
        requested * 6,
        30
      )
    );

  if (
    Array.isArray(imagens)
  ) {
    urls = [
      ...urls,
      ...imagens
    ];
  }

  /*
   * Embaralha novamente.
   */
  for (
    let i = urls.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      urls[i],
      urls[j]
    ] = [
      urls[j],
      urls[i]
    ];
  }

  const {
    sendSticker
  } = await import(
    '../funcs/utils/sticker.js'
  );

  const hashes =
    new Set();

  const history =
    loadHistory();

  const key =
    themeKey(tema);

  const recent =
    Array.isArray(history[key])
      ? history[key]
      : [];

  let sent = 0;
  let failed = 0;

  for (
    const url of urls
  ) {
    if (
      sent >= requested
    ) {
      break;
    }

    try {

      const buffer =
        await downloadImage(
          url
        );

      const hash =
        crypto
          .createHash('sha256')
          .update(buffer)
          .digest('hex');

      /*
       * Mesmo arquivo = mesma figurinha.
       */
      if (
        hashes.has(hash)
      ) {
        continue;
      }

      hashes.add(hash);

      await sendSticker(
        nazu,
        destino,
        {
          sticker: buffer,
          type: 'image',
          author,
          packname
        },
        { quoted }
      );

      sent++;

      /*
       * Guarda a URL usada.
       */
      if (
        !recent.includes(url)
      ) {
        recent.push(url);
      }

      /*
       * Últimas 120 por tema.
       */
      if (
        recent.length > 120
      ) {
        recent.splice(
          0,
          recent.length - 120
        );
      }

      history[key] =
        recent;

      saveHistory(
        history
      );

      console.log(
        `[THEME STICKER] ✅ ${sent}/${requested}`
      );

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            500
          )
      );

    } catch (error) {

      failed++;

      console.error(
        `[THEME STICKER] ⚠️ ${error.message}`
      );
    }
  }

  return {
    requested,
    sent,
    failed:
      Math.max(
        failed,
        requested - sent
      )
  };
}
