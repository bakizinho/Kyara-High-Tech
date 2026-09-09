#!/data/data/com.termux/files/usr/bin/bash
set -e

cd ~/storage/BKkyara-

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="backup-level-stickers-final-$STAMP"

mkdir -p "$BACKUP"
cp dados/src/features/themeStickers.js "$BACKUP/themeStickers.js"
cp dados/src/features/kyaraSpecialCommands.js "$BACKUP/kyaraSpecialCommands.js"

echo "📦 Backup criado: $BACKUP"

cat > dados/src/features/themeStickers.js <<'JS'
import axios from 'axios';
import crypto from 'crypto';

const UA =
  'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';

/*
 * 🚫 FILTRO DE SEGURANÇA
 *
 * O comando de figurinhas é somente para conteúdo comum.
 * Termos adultos são rejeitados tanto na pesquisa quanto
 * nas URLs/títulos encontrados.
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
  'xxx',
  'lewd'
];

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

function normalizeText(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function containsBlockedTerm(value = '') {
  const text = normalizeText(value);

  return BLOCKED_TERMS.some(term => {
    const normalized = normalizeText(term);
    return text.includes(normalized);
  });
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

function isBadUrl(value) {
  if (!validUrl(value)) return true;

  const lower = normalizeText(value);

  if (containsBlockedTerm(lower)) {
    return true;
  }

  return (
    lower.includes('google.com/search') ||
    lower.includes('google.com/imgres') ||
    lower.includes('gstatic.com') ||
    lower.includes('bing.com/images/search') ||
    lower.includes('bing.com/ck/a') ||
    lower.includes('favicon') ||
    lower.includes('data:image') ||
    lower.includes('.svg')
  );
}

function pushUnique(list, seen, value, limit) {
  if (!value) return false;

  const clean = decodeHtml(String(value).trim());

  if (isBadUrl(clean)) {
    return false;
  }

  if (seen.has(clean)) {
    return false;
  }

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
 *
 * A busca usa várias consultas diferentes para evitar que um
 * pacote inteiro seja formado pelas mesmas imagens.
 * ============================================================ */

async function searchWikimedia(query, limit) {
  const api = new URL(
    'https://commons.wikimedia.org/w/api.php'
  );

  api.searchParams.set('action', 'query');
  api.searchParams.set('generator', 'search');
  api.searchParams.set(
    'gsrsearch',
    `${query} -porn -hentai -nsfw -nude -sex`
  );
  api.searchParams.set('gsrnamespace', '6');
  api.searchParams.set(
    'gsrlimit',
    String(Math.min(50, Math.max(limit * 2, 20)))
  );
  api.searchParams.set('prop', 'imageinfo');
  api.searchParams.set('iiprop', 'url|mime');
  api.searchParams.set('iiurlwidth', '900');
  api.searchParams.set('format', 'json');
  api.searchParams.set('origin', '*');

  const response = await axios.get(api.toString(), {
    timeout: 20000,
    headers: {
      'User-Agent': 'KyaraBot/10.2.1'
    }
  });

  const pages = response.data?.query?.pages || {};

  const results = [];
  const seen = new Set();

  for (const page of Object.values(pages)) {
    const title = String(page?.title || '');

    /*
     * Também filtramos o título porque a URL da imagem pode
     * não conter nenhuma indicação do conteúdo.
     */
    if (containsBlockedTerm(title)) {
      continue;
    }

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

    if (pushUnique(results, seen, url, limit)) {
      break;
    }
  }

  return results;
}

/* ============================================================
 * PESQUISA COM VÁRIAS CONSULTAS
 * ============================================================ */

export async function searchThemeImages(
  theme,
  limit = 20
) {
  const cleanTheme = normalizeQuery(theme);

  const safeLimit = Math.min(
    60,
    Math.max(1, Number(limit) || 20)
  );

  if (!cleanTheme) {
    return [];
  }

  /*
   * Variações propositalmente diferentes.
   * Isso evita receber sempre o mesmo conjunto.
   */
  const queries = [
    `${cleanTheme} anime character`,
    `${cleanTheme} anime`,
    `${cleanTheme} manga`,
    `${cleanTheme} character`,
    `${cleanTheme} official`,
    `${cleanTheme} drawing`,
    `${cleanTheme} artwork`
  ];

  const results = [];
  const seen = new Set();

  console.log(
    `[THEME STICKER] 🔎 Tema: ${cleanTheme}`
  );

  for (const query of queries) {
    if (results.length >= safeLimit) {
      break;
    }

    try {
      const remaining =
        safeLimit - results.length;

      const found = await searchWikimedia(
        query,
        Math.max(remaining * 2, 10)
      );

      for (const url of found) {
        if (results.length >= safeLimit) {
          break;
        }

        if (!seen.has(url)) {
          seen.add(url);
          results.push(url);
        }
      }

      console.log(
        `[THEME STICKER] 🔎 "${query}" → ${found.length}`
      );

    } catch (error) {
      console.error(
        `[THEME STICKER] ⚠️ Falha em "${query}":`,
        error.message
      );
    }
  }

  console.log(
    `[THEME STICKER] ✅ ${results.length} URLs diferentes encontradas`
  );

  return results;
}

/* ============================================================
 * DOWNLOAD + VALIDAÇÃO
 * ============================================================ */

function looksLikeImage(buffer, contentType = '') {
  const type =
    String(contentType || '').toLowerCase();

  if (type.startsWith('image/')) {
    return true;
  }

  if (!buffer || buffer.length < 100) {
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

  const buffer =
    Buffer.from(response.data || []);

  if (buffer.length < 100) {
    throw new Error(
      'imagem vazia ou pequena demais'
    );
  }

  if (
    !looksLikeImage(
      buffer,
      response.headers?.['content-type']
    )
  ) {
    throw new Error(
      'conteúdo não é uma imagem'
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
    1,
    Math.min(
      20,
      Number(quantidade) || 1
    )
  );

  if (!nazu || !destino) {
    return {
      requested,
      sent: 0,
      failed: requested
    };
  }

  /*
   * Sempre buscamos várias opções.
   */
  let lista = [];

  if (String(tema || '').trim()) {
    try {
      lista = await searchThemeImages(
        tema,
        Math.max(requested * 5, 20)
      );
    } catch (error) {
      console.error(
        '[THEME STICKER] Pesquisa falhou:',
        error.message
      );
    }
  }

  /*
   * Se o caller passou imagens, elas entram como
   * alternativas, mas sem duplicação.
   */
  if (Array.isArray(imagens)) {
    const merged = [
      ...lista,
      ...imagens
    ];

    const seen = new Set();

    lista = merged.filter(url => {
      if (
        !validUrl(url) ||
        isBadUrl(url) ||
        seen.has(url)
      ) {
        return false;
      }

      seen.add(url);
      return true;
    });
  }

  const {
    sendSticker
  } = await import(
    '../funcs/utils/sticker.js'
  );

  let sent = 0;
  let failed = 0;

  /*
   * Hashes dos arquivos já enviados.
   *
   * Assim, mesmo que dois links diferentes apontem
   * para exatamente a mesma imagem, ela só será
   * enviada uma vez no pacote.
   */
  const imageHashes = new Set();

  for (const imageUrl of lista) {
    if (sent >= requested) {
      break;
    }

    try {
      const buffer =
        await downloadImage(imageUrl);

      const hash =
        crypto
          .createHash('sha256')
          .update(buffer)
          .digest('hex');

      if (imageHashes.has(hash)) {
        console.log(
          '[THEME STICKER] ↪️ Duplicada ignorada'
        );
        continue;
      }

      imageHashes.add(hash);

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
        setTimeout(resolve, 650)
      );

    } catch (error) {
      failed++;

      console.error(
        '[THEME STICKER] ⚠️ Imagem recusada:',
        error.message
      );
    }
  }

  /*
   * A quantidade que não conseguiu ser preenchida
   * fica registrada como falha.
   */
  failed = Math.max(
    failed,
    requested - sent
  );

  return {
    requested,
    sent,
    failed
  };
}
JS

python3 - <<'PY'
from pathlib import Path

p = Path("dados/src/features/kyaraSpecialCommands.js")
s = p.read_text()

# ============================================================
# /level — adicionar indicação do comando de informação
# ============================================================

old = """    `│ 🗓️ XP semanal: *${Number(weekly.userXP) || 0}*\\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`"""

new = """    `│ 🗓️ XP semanal: *${Number(weekly.userXP) || 0}*\\n` +
    `│\\n` +
    `│ 💡 Digite *${prefix}levelinfo* para saber\\n` +
    `│    como funciona o sistema de Level.\\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`"""

if old not in s:
    raise SystemExit("❌ Não encontrei o bloco final do /level.")

s = s.replace(old, new, 1)

# ============================================================
# Criar função de informações do Level
# ============================================================

marker = """async function handleRankLevel({"""

if marker not in s:
    raise SystemExit("❌ Não encontrei handleRankLevel.")

level_info = r'''
async function handleLevelInfo({ prefix, reply }) {
  return reply(
    `╭━━━〔 📚 *COMO FUNCIONA O LEVEL* 〕━━━╮\n` +
    `│\n` +
    `│ ⭐ *O que é?*\n` +
    `│ O sistema de Level recompensa sua atividade\n` +
    `│ usando a Kyara.\n` +
    `│\n` +
    `│ ✨ *XP*\n` +
    `│ Mensagens e comandos geram XP.\n` +
    `│ Quanto mais você participa, mais XP acumula.\n` +
    `│\n` +
    `│ 📊 *NÍVEL*\n` +
    `│ Ao alcançar a quantidade necessária de XP,\n` +
    `│ você sobe de nível automaticamente.\n` +
    `│\n` +
    `│ 🎖️ *PATENTES*\n` +
    `│ Seu nível determina sua patente dentro do\n` +
    `│ sistema de progressão da Kyara.\n` +
    `│\n` +
    `│ 🏆 *RANKING*\n` +
    `│ ${prefix}ranklevel\n` +
    `│ Mostra os usuários com maior Level.\n` +
    `│\n` +
    `│ 🗓️ *RANKING SEMANAL*\n` +
    `│ ${prefix}ranksemanal\n` +
    `│ A atividade da semana é contabilizada\n` +
    `│ separadamente.\n` +
    `│\n` +
    `│ 🎁 *PRÊMIO SEMANAL*\n` +
    `│ O 1º colocado no fechamento da semana\n` +
    `│ recebe VIP, conforme as regras do sistema.\n` +
    `│\n` +
    `│ 💡 *Comandos úteis*\n` +
    `│ ${prefix}level\n` +
    `│ ${prefix}ranklevel\n` +
    `│ ${prefix}ranksemanal\n` +
    `│ ${prefix}menulevel\n` +
    `│\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`
  );
}

'''

s = s.replace(
    marker,
    level_info + marker,
    1
)

# ============================================================
# Adicionar comandos de informação
# ============================================================

old_switch = """    case 'level':
    case 'nivel':
      await handleLevel({"""

new_switch = """    case 'levelinfo':
    case 'nivelinfo':
    case 'levelajuda':
    case 'ajudalevel':
    case 'xplevel':
      await handleLevelInfo({
        prefix,
        reply
      });
      return true;

    case 'level':
    case 'nivel':
      await handleLevel({"""

if old_switch not in s:
    raise SystemExit("❌ Não encontrei o bloco de /level.")

s = s.replace(
    old_switch,
    new_switch,
    1
)

# ============================================================
# Melhorar menu
# ============================================================

old_menu = """        `│ 📊 ${prefix}level\\n` +
        `│ 🏆 ${prefix}ranklevel\\n` +"""

new_menu = """        `│ 📊 ${prefix}level\\n` +
        `│ 📚 ${prefix}levelinfo\\n` +
        `│ 🏆 ${prefix}ranklevel\\n` +"""

if old_menu in s:
    s = s.replace(old_menu, new_menu, 1)

p.write_text(s)

print("✅ LevelInfo adicionado.")
print("✅ /level atualizado.")
print("✅ Menu Level atualizado.")
PY

echo
echo "=== VALIDANDO ==="

node --check dados/src/features/themeStickers.js
node --check dados/src/features/kyaraSpecialCommands.js
node --check dados/src/index.js

echo "✅ themeStickers.js"
echo "✅ kyaraSpecialCommands.js"
echo "✅ index.js"

echo
echo "=== CONFERINDO LEVELINFO ==="

grep -n "levelinfo\|handleLevelInfo" \
  dados/src/features/kyaraSpecialCommands.js | head -20

echo
echo "=== CONFERINDO FILTRO +18 ==="

grep -n "BLOCKED_TERMS\|hentai\|nsfw\|nude\|sexual" \
  dados/src/features/themeStickers.js | head -20

echo
echo "============================================"
echo "✅ CORREÇÃO CONCLUÍDA"
echo "============================================"
echo
echo "Agora execute:"
echo
echo "npm start"
echo
echo "Teste:"
echo "/level"
echo
echo "/levelinfo"
echo
echo "/figurinhas goku 4"
echo
