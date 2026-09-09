#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$HOME/storage/BKkyara-"
cd "$ROOT"

echo "============================================"
echo "🔧 CORREÇÃO KYARA — LEVEL + FIGURINHAS"
echo "============================================"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="backup-correcao-$STAMP"

echo "📦 Backup: $BACKUP"
mkdir -p "$BACKUP"

cp dados/src/index.js "$BACKUP/index.js"
cp dados/src/features/themeStickers.js "$BACKUP/themeStickers.js"

echo "✅ Backup criado."

python3 - <<'PY'
from pathlib import Path

p = Path("dados/src/index.js")
s = p.read_text()

# ============================================================
# 1. LEVELING: ativação inicial automática por grupo
# ============================================================

old = """      groupData.levelingEnabled = groupData.levelingEnabled || false;"""

new = """      // ⭐ LEVELING: grupos antigos sem configuração recebem
      // uma ativação inicial automática. Depois disso, o comando
      // /leveling continua controlando normalmente.
      if (!Object.prototype.hasOwnProperty.call(groupData, 'levelingConfigured')) {
        groupData.levelingEnabled = true;
        groupData.levelingConfigured = true;
        try {
          writeJsonFile(groupFile, groupData);
        } catch (e) {
          console.error('[LEVELING] Erro ao salvar ativação inicial:', e.message);
        }
      } else {
        groupData.levelingEnabled = !!groupData.levelingEnabled;
      }"""

if old in s:
    s = s.replace(old, new, 1)
    print("✅ Ativação inicial do leveling corrigida.")
else:
    print("ℹ️ Linha antiga do leveling não encontrada; pode já estar corrigida.")

# ============================================================
# 2. /leveling: marcar configuração manual
# ============================================================

old2 = """        groupData.levelingEnabled = !groupData.levelingEnabled;
        writeJsonFile(groupFile, groupData);"""

new2 = """        groupData.levelingEnabled = !groupData.levelingEnabled;
        groupData.levelingConfigured = true;
        writeJsonFile(groupFile, groupData);"""

if old2 in s:
    s = s.replace(old2, new2, 1)
    print("✅ /leveling agora registra configuração manual.")
else:
    print("ℹ️ Bloco /leveling já parece atualizado.")

p.write_text(s)
PY

cat > dados/src/features/themeStickers.js <<'JS'
import axios from 'axios';

const UA =
  'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';

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

function validUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isBadUrl(value) {
  const x = String(value || '').toLowerCase();

  return (
    !validUrl(value) ||
    x.includes('google.com/search') ||
    x.includes('google.com/imgres') ||
    x.includes('bing.com/images/search') ||
    x.includes('bing.com/ck/a') ||
    x.includes('gstatic.com/images') ||
    x.includes('favicon') ||
    x.includes('.svg?') ||
    x.includes('data:image')
  );
}

function pushUnique(list, seen, value, limit) {
  if (isBadUrl(value)) return false;

  const clean = decodeHtml(String(value).trim());

  if (isBadUrl(clean)) return false;
  if (seen.has(clean)) return false;

  seen.add(clean);
  list.push(clean);

  return list.length >= limit;
}

function normalizeQuery(theme) {
  return String(theme || '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

/* ============================================================
 * WIKIMEDIA COMMONS
 * API gratuita e sem chave.
 * ============================================================ */

async function searchWikimedia(theme, limit) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');

  api.searchParams.set('action', 'query');
  api.searchParams.set('generator', 'search');
  api.searchParams.set('gsrsearch', `${theme} anime`);
  api.searchParams.set('gsrnamespace', '6');
  api.searchParams.set('gsrlimit', String(Math.min(50, Math.max(limit * 3, 10))));
  api.searchParams.set('prop', 'imageinfo');
  api.searchParams.set('iiprop', 'url|mime');
  api.searchParams.set('iiurlwidth', '800');
  api.searchParams.set('format', 'json');
  api.searchParams.set('origin', '*');

  const response = await axios.get(api.toString(), {
    timeout: 20000,
    headers: {
      'User-Agent': 'KyaraBot/10.2.1'
    }
  });

  const pages = response.data?.query?.pages || {};
  const urls = [];
  const seen = new Set();

  for (const page of Object.values(pages)) {
    const info = page?.imageinfo?.[0];
    if (!info) continue;

    const mime = String(info.mime || '').toLowerCase();

    if (
      !mime.startsWith('image/') ||
      mime === 'image/svg+xml'
    ) {
      continue;
    }

    const url =
      info.thumburl ||
      info.url;

    if (pushUnique(urls, seen, url, limit)) break;
  }

  return urls;
}

/* ============================================================
 * BING
 * ============================================================ */

async function searchBing(theme, limit) {
  const url = new URL('https://www.bing.com/images/search');

  url.searchParams.set('q', `${theme} anime character`);
  url.searchParams.set('form', 'HDRSC2');
  url.searchParams.set('safeSearch', 'Strict');

  const response = await axios.get(url.toString(), {
    timeout: 20000,
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml'
    }
  });

  const html = String(response.data || '');
  const urls = [];
  const seen = new Set();

  const patterns = [
    /"murl":"(.*?)"/g,
    /murl&quot;:&quot;(.*?)&quot;/g,
    /\\"murl\\":\\"(.*?)\\"/g,
    /"turl":"(.*?)"/g
  ];

  for (const pattern of patterns) {
    let match;

    while ((match = pattern.exec(html))) {
      let value = decodeHtml(match[1]);

      try {
        value = JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
      } catch {}

      if (pushUnique(urls, seen, value, limit)) {
        return urls;
      }
    }
  }

  return urls;
}

/* ============================================================
 * GOOGLE
 * ============================================================ */

async function searchGoogle(theme, limit) {
  const url = new URL('https://www.google.com/search');

  url.searchParams.set('q', `${theme} anime character`);
  url.searchParams.set('tbm', 'isch');
  url.searchParams.set('safe', 'active');

  const response = await axios.get(url.toString(), {
    timeout: 20000,
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
    }
  });

  const html = String(response.data || '');
  const urls = [];
  const seen = new Set();

  /*
   * O Google costuma guardar URLs originais em blocos JSON.
   * Procuramos somente URLs HTTP(S) que aparentem ser arquivos.
   */
  const candidates = html.match(
    /https?:\/\/[^"'\\<>\s]+/g
  ) || [];

  for (let value of candidates) {
    value = decodeHtml(value);

    try {
      value = decodeURIComponent(value);
    } catch {}

    value = value.replace(/\\u003d/g, '=');

    if (
      /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value)
    ) {
      if (pushUnique(urls, seen, value, limit)) {
        break;
      }
    }
  }

  return urls;
}

/* ============================================================
 * PESQUISA PRINCIPAL
 * ============================================================ */

export async function searchThemeImages(theme, limit = 20) {
  const clean = normalizeQuery(theme);

  const safeLimit = Math.min(
    40,
    Math.max(1, Number(limit) || 20)
  );

  if (!clean) return [];

  console.log(
    `[THEME STICKER] 🔎 Pesquisando tema: ${clean}`
  );

  // 1 — Wikimedia
  try {
    const urls = await searchWikimedia(
      clean,
      Math.max(safeLimit * 2, 10)
    );

    if (urls.length) {
      console.log(
        `[THEME STICKER] ✅ Wikimedia: ${urls.length} imagens`
      );
      return urls;
    }
  } catch (e) {
    console.error(
      '[THEME STICKER] Wikimedia falhou:',
      e.message
    );
  }

  // 2 — Bing
  try {
    const urls = await searchBing(
      clean,
      Math.max(safeLimit * 3, 12)
    );

    if (urls.length) {
      console.log(
        `[THEME STICKER] ✅ Bing: ${urls.length} imagens`
      );
      return urls;
    }
  } catch (e) {
    console.error(
      '[THEME STICKER] Bing falhou:',
      e.message
    );
  }

  // 3 — Google
  try {
    const urls = await searchGoogle(
      clean,
      Math.max(safeLimit * 3, 12)
    );

    if (urls.length) {
      console.log(
        `[THEME STICKER] ✅ Google: ${urls.length} imagens`
      );
      return urls;
    }
  } catch (e) {
    console.error(
      '[THEME STICKER] Google falhou:',
      e.message
    );
  }

  console.log(
    `[THEME STICKER] ❌ Nenhuma imagem encontrada para "${clean}"`
  );

  return [];
}

/* ============================================================
 * DOWNLOAD
 * ============================================================ */

function looksLikeImage(buffer, contentType = '') {
  const type = String(contentType || '').toLowerCase();

  if (type.startsWith('image/')) {
    return true;
  }

  if (!buffer || buffer.length < 12) {
    return false;
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }

  // JPEG
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8
  ) {
    return true;
  }

  // WEBP
  if (
    buffer.slice(0, 4).toString() === 'RIFF' &&
    buffer.slice(8, 12).toString() === 'WEBP'
  ) {
    return true;
  }

  // GIF
  if (
    buffer.slice(0, 6).toString() === 'GIF87a' ||
    buffer.slice(0, 6).toString() === 'GIF89a'
  ) {
    return true;
  }

  // BMP
  if (
    buffer[0] === 0x42 &&
    buffer[1] === 0x4d
  ) {
    return true;
  }

  return false;
}

async function downloadImage(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    maxContentLength: 12 * 1024 * 1024,
    maxBodyLength: 12 * 1024 * 1024,
    validateStatus: status =>
      status >= 200 && status < 400,
    headers: {
      'User-Agent': UA,
      Accept:
        'image/avif,image/webp,image/apng,image/png,image/jpeg,image/gif,image/*;q=0.8,*/*;q=0.2'
    }
  });

  const buffer = Buffer.from(response.data || []);

  if (buffer.length < 100) {
    throw new Error('arquivo vazio');
  }

  if (
    !looksLikeImage(
      buffer,
      response.headers?.['content-type']
    )
  ) {
    throw new Error(
      `conteúdo não é imagem (${response.headers?.['content-type'] || 'tipo desconhecido'})`
    );
  }

  return buffer;
}

/* ============================================================
 * ENVIO
 * ============================================================ */

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
  const requested = Math.max(
    0,
    Math.min(20, Number(quantidade) || 0)
  );

  if (!nazu || !destino || requested < 1) {
    return {
      requested,
      sent: 0,
      failed: requested
    };
  }

  let lista = Array.isArray(imagens)
    ? imagens.filter(validUrl)
    : [];

  if (String(tema || '').trim()) {
    const needed = Math.max(
      requested * 3,
      requested
    );

    try {
      const found = await searchThemeImages(
        tema,
        needed
      );

      /*
       * Mesmo que o caller tenha mandado imagens,
       * acrescentamos resultados novos para substituir
       * links quebrados.
       */
      const merged = [
        ...lista,
        ...found
      ];

      const seen = new Set();
      lista = merged.filter(url => {
        if (!validUrl(url) || seen.has(url)) {
          return false;
        }

        seen.add(url);
        return true;
      });
    } catch (e) {
      console.error(
        '[THEME STICKER] Erro na pesquisa:',
        e.message
      );
    }
  }

  const { sendSticker } =
    await import('../funcs/utils/sticker.js');

  let sent = 0;
  let failed = 0;

  /*
   * Tentamos mais URLs que o necessário porque algumas
   * imagens da internet podem estar bloqueadas.
   */
  for (const imageUrl of lista) {
    if (sent >= requested) break;

    try {
      const buffer =
        await downloadImage(imageUrl);

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

      console.log(
        `[THEME STICKER] ✅ Figurinha ${sent}/${requested}`
      );

      await new Promise(resolve =>
        setTimeout(resolve, 500)
      );

    } catch (error) {
      failed++;

      console.error(
        `[THEME STICKER] ⚠️ Imagem recusada: ${error.message}`
      );
    }
  }

  const remaining = Math.max(
    0,
    requested - sent
  );

  return {
    requested,
    sent,
    failed: remaining
  };
}
JS

echo
echo "=== VALIDAÇÃO ==="

node --check dados/src/index.js
node --check dados/src/features/themeStickers.js
node --check dados/src/features/kyaraSpecialCommands.js

echo "✅ index.js OK"
echo "✅ themeStickers.js OK"
echo "✅ kyaraSpecialCommands.js OK"

echo
echo "=== LEVELING ==="
grep -n "levelingConfigured" dados/src/index.js | head -10

echo
echo "=== HANDLER ==="
grep -n "handleKyaraSpecialCommand" dados/src/index.js | head -5

echo
echo "============================================"
echo "✅ CORREÇÃO APLICADA"
echo "============================================"
echo
echo "Agora execute:"
echo "npm start"
echo
echo "Depois teste nesta ordem:"
echo "/level"
echo "/ranklevel"
echo "/figurinhas goku 4"
echo
