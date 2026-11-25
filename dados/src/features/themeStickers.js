import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UA =
  'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';

const HISTORY_FILE = path.join(
  __dirname,
  '..',
  '..',
  'database',
  'sticker-history.json'
);

const MAX_PACK = 40;
const MAX_STICKER_SIZE = 1024 * 1024;

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
  'fetish',
  'rule34',
  'booru',
  'adult',
  '18+',
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
    const url = new URL(String(value));

    return (
      url.protocol === 'http:' ||
      url.protocol === 'https:'
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

function themeKey(theme) {
  return normalizeText(theme)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function loadHistory() {
  try {
    fs.mkdirSync(
      path.dirname(HISTORY_FILE),
      { recursive: true }
    );

    if (!fs.existsSync(HISTORY_FILE)) {
      return {};
    }

    const data = JSON.parse(
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
      ),
      'utf8'
    );

  } catch (error) {
    console.error(
      '[PACOTE PRIME] Erro no histórico:',
      error.message
    );
  }
}

function shuffle(array) {
  const lista = [...array];

  for (
    let i = lista.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      lista[i],
      lista[j]
    ] = [
      lista[j],
      lista[i]
    ];
  }

  return lista;
}

async function searchBingImages(
  query,
  limit = 100
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
    String(
      Math.floor(
        Math.random() * 80
      ) + 1
    )
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
    String(
      response.data || ''
    );

  const resultados = [];
  const vistos = new Set();

  const patterns = [
    /"murl":"(.*?)"/g,
    /murl&quot;:&quot;(.*?)&quot;/g,
    /\\"murl\\":\\"(.*?)\\"/g,
    /"turl":"(.*?)"/g
  ];

  for (
    const pattern of patterns
  ) {
    let match;

    while (
      (match =
        pattern.exec(html))
    ) {
      let value =
        decodeHtml(match[1]);

      try {
        value =
          decodeURIComponent(value);
      } catch {}

      if (
        !validUrl(value) ||
        blocked(value)
      ) {
        continue;
      }

      const lower =
        value.toLowerCase();

      if (
        lower.includes('bing.com') ||
        lower.includes('google.com') ||
        lower.includes('gstatic.com') ||
        lower.endsWith('.svg')
      ) {
        continue;
      }

      if (
        vistos.has(value)
      ) {
        continue;
      }

      vistos.add(value);
      resultados.push(value);

      if (
        resultados.length >= limit
      ) {
        return resultados;
      }
    }
  }

  return resultados;
}

async function buscarImagens(tema) {
  const base = String(tema || '').trim();

  const consultas = shuffle([
    base + ' sticker',
    base + ' whatsapp sticker',
    base + ' anime sticker',
    base + ' png',
    base + ' transparent',
    base + ' meme',
    base + ' reaction',
    base + ' chibi',
    base + ' funny',
    base + ' character'
  ]).slice(0, 5);

  const lotes = await Promise.allSettled(
    consultas.map(consulta => searchBingImages(consulta, 80))
  );

  const resultados = [];
  const vistos = new Set();

  for (let i = 0; i < lotes.length; i++) {
    const lote = lotes[i];

    if (lote.status !== 'fulfilled') {
      console.log(
        '[PACOTE PRIME] Busca falhou:',
        lote.reason?.message || lote.reason
      );
      continue;
    }

    for (const url of lote.value || []) {
      if (vistos.has(url)) continue;

      vistos.add(url);
      resultados.push(url);

      if (resultados.length >= 180) break;
    }

    if (resultados.length >= 180) break;
  }

  console.log(
    '[PACOTE PRIME] URLs encontradas: ' + resultados.length
  );

  return shuffle(resultados);
}

async function baixarImagem(url) {
  if (
    !validUrl(url) ||
    blocked(url)
  ) {
    throw new Error(
      'URL inválida'
    );
  }

  const response =
    await axios.get(
      url,
      {
        responseType:
          'arraybuffer',

        timeout: 20000,

        maxContentLength:
          12 * 1024 * 1024,

        maxBodyLength:
          12 * 1024 * 1024,

        headers: {
          'User-Agent': UA,
          Accept:
            'image/avif,image/webp,image/png,image/jpeg,image/*'
        }
      }
    );

  return Buffer.from(
    response.data
  );
}

async function converterWebp(
  buffer
) {
  let qualidade = 84;

  for (
    let tentativa = 0;
    tentativa < 6;
    tentativa++
  ) {
    const webp =
      await sharp(buffer)
        .rotate()
        .ensureAlpha()
        .resize({
          width: 512,
          height: 512,
          fit: 'contain',
          background: {
            r: 0,
            g: 0,
            b: 0,
            alpha: 0
          }
        })
        .webp({
          quality: qualidade,
          alphaQuality: 100,
          effort: 3
        })
        .toBuffer();

    if (
      webp.length <=
      MAX_STICKER_SIZE
    ) {
      return webp;
    }

    qualidade -= 10;
  }

  throw new Error(
    'figurinha maior que 1 MB'
  );
}

const STICKER_BUFFER_CACHE = new Map();

async function converterWebpAnimado(buffer) {
  const metadata = await sharp(buffer, {
    animated: true
  }).metadata();

  const totalFrames = Number(metadata.pages) || 1;

  if (totalFrames < 2) {
    throw new Error('A imagem encontrada não tem animação');
  }

  const sourceDelays = Array.isArray(metadata.delay)
    ? metadata.delay
    : [];

  const delays = [];
  let duration = 0;

  for (let i = 0; i < totalFrames; i++) {
    const delay = Math.max(
      20,
      Math.min(500, Number(sourceDelays[i]) || 100)
    );

    if (duration + delay > 10000) break;

    delays.push(delay);
    duration += delay;
  }

  if (delays.length < 2) {
    delays.length = 0;
    delays.push(100, 100);
  }

  const frameCount = Math.min(totalFrames, delays.length);
  const outputDelays = delays.slice(0, frameCount);
  const maximumBytes = 500 * 1024;

  for (const quality of [68, 58, 48, 38, 28]) {
    const webp = await sharp(buffer, {
      pages: frameCount
    })
      .rotate()
      .ensureAlpha()
      .resize({
        width: 512,
        height: 512,
        fit: 'contain',
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0
        }
      })
      .webp({
        quality,
        alphaQuality: 70,
        effort: 3,
        loop: 0,
        delay: outputDelays,
        mixed: true
      })
      .toBuffer();

    if (webp.length <= maximumBytes) {
      const check = await sharp(webp, {
        animated: true
      }).metadata();

      if ((Number(check.pages) || 1) >= 2) {
        return webp;
      }
    }
  }

  throw new Error('Não foi possível gerar WebP animado de até 500 KB');
}

async function processThemeStickerPack({
  kya,
  destino,
  tema,
  quantidade = 12,
  author = '𝗩Ø𝗫-𝗦𝗬𝗦𝗧Ξ𝗠',
  packname = 'Kyara',
  quoted,
  animado = false
}) {

  const limitePacote = animado ? Math.min(MAX_PACK, 30) : MAX_PACK;
  const requested = Math.min(
    limitePacote,
    Math.max(1, Number(quantidade) || 12)
  );

  tema =
    String(tema || '')
      .trim();

  if (!tema) {
    return {
      requested,
      sent: 0,
      failed: requested
    };
  }

  if (blocked(tema)) {
    return {
      requested,
      sent: 0,
      failed: requested
    };
  }

  console.log(
    `[PACOTE PRIME] Criando pacote: ${tema} (${requested})`
  );

  /*
   * =========================================================
   * HISTÓRICO
   * =========================================================
   */

  const history =
    loadHistory();

  const key = themeKey(animado ? `${tema} animado` : tema);

  const usados =
    new Set(
      Array.isArray(history[key])
        ? history[key]
        : []
    );

  /*
   * =========================================================
   * BUSCA
   * =========================================================
   */

  const urls = await buscarImagens(animado ? `${tema} animated GIF` : tema);

  if (!urls.length) {
    return {
      requested,
      sent: 0,
      failed: requested
    };
  }

  /*
   * =========================================================
   * CONVERTE TUDO PRIMEIRO
   *
   * IMPORTANTE:
   * NENHUM sendSticker AQUI.
   *
   * Primeiro montamos o pacote inteiro.
   * =========================================================
   */

  const stickers = [];
  const hashes = new Set();
  const novasURLs = [];

  const pendentes = urls.filter(url => !usados.has(url));
  let cursor = 0;
  const concorrencia = Math.min(animado ? 2 : 6, pendentes.length);

  async function prepararWorker() {
    while (stickers.length < requested) {
      const posicao = cursor++;

      if (posicao >= pendentes.length) return;

      const url = pendentes[posicao];

      try {
        const cacheKey = `${animado ? 'a' : 's'}:${url}`;
        let webp = STICKER_BUFFER_CACHE.get(cacheKey);

        if (!webp) {
          const original = await baixarImagem(url);
          if (stickers.length >= requested) return;

          webp = animado
            ? await converterWebpAnimado(original)
            : await converterWebp(original);

          if (stickers.length >= requested) return;

          if (webp.length <= 160 * 1024) {
            if (STICKER_BUFFER_CACHE.size >= 16) {
              STICKER_BUFFER_CACHE.delete(
                STICKER_BUFFER_CACHE.keys().next().value
              );
            }
            STICKER_BUFFER_CACHE.set(cacheKey, webp);
          }
        }

        if (stickers.length >= requested) return;
        const hash = crypto
          .createHash('sha256')
          .update(webp)
          .digest('hex');

        if (hashes.has(hash)) continue;

        hashes.add(hash);

        stickers.push({
          data: webp,
          emojis: ['😎']
        });

        novasURLs.push(url);

        console.log(
          '[PACOTE PRIME] Preparada ' +
          stickers.length + '/' + requested
        );

      } catch (error) {
        console.log(
          '[PACOTE PRIME] Imagem ignorada:',
          error.message
        );
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: concorrencia },
      () => prepararWorker()
    )
  );

  if (stickers.length < (animado ? 3 : 1)) {
    return {
      requested,
      sent: 0,
      failed: requested
    };
  }

  /*
   * =========================================================
   * ENVIO
   *
   * UMA ÚNICA MENSAGEM.
   *
   * destino DEVE ser o grupo recebido pelo comando.
   * =========================================================
   */

  console.log(
    `[PACOTE PRIME] Enviando UM pacote com ${stickers.length} figurinhas para ${destino}`
  );

  await kya.sendMessage(
    destino,
    {
      cover: stickers[0].data,

      stickers,

      name: `📦 ${animado ? 'ANIMADO • ' : ''}${tema}`.slice(0, 60),

      publisher:
        String(author)
          .slice(0, 60),

      description: `Kyara • ${stickers.length} figurinhas${animado ? ' animadas' : ''}`
    },
    {
      quoted
    }
  );

  /*
   * =========================================================
   * SALVA HISTÓRICO SOMENTE DEPOIS DO ENVIO
   * =========================================================
   */

  const historicoAtual =
    Array.isArray(history[key])
      ? history[key]
      : [];

  history[key] =
    [
      ...historicoAtual,
      ...novasURLs
    ].slice(-180);

  saveHistory(
    history
  );

  console.log(
    `[PACOTE PRIME] ✅ PACOTE ENVIADO: ${stickers.length}/${requested}`
  );

  return {
    requested,
    sent: stickers.length,
    failed:
      requested -
      stickers.length
  };
}


export async function sendThemeStickers(options = {}) {
  return processThemeStickerPack({
    ...options,
    animado: false
  });
}

export async function sendAnimatedThemeStickers(options = {}) {
  const quantidade = Math.min(
    30,
    Math.max(3, Number(options.quantidade) || 30)
  );

  return processThemeStickerPack({
    ...options,
    quantidade,
    animado: true
  });
}
