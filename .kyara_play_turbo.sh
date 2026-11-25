#!/data/data/com.termux/files/usr/bin/bash
set -eu

ROOT="$(pwd)"

PLAY="$ROOT/dados/src/funcs/downloads/youtube.js"
MEDIA="$ROOT/dados/src/features/kyaraMediaCommands.js"
START="$ROOT/dados/src/.scripts/start.js"

BACKUP="$ROOT/dados/database/backups/play-before-turbo"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "        ⚡ KYARA PLAY TURBO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "$PLAY" ]; then
  echo "❌ youtube.js não encontrado."
  echo "Execute na raiz do bot."
  exit 1
fi

if [ ! -f "$MEDIA" ]; then
  echo "❌ kyaraMediaCommands.js não encontrado."
  exit 1
fi

if [ ! -f "$START" ]; then
  echo "❌ start.js não encontrado."
  exit 1
fi

# ============================================================
# BACKUP ÚNICO
# ============================================================

if [ ! -d "$BACKUP" ]; then

  mkdir -p "$BACKUP"

  cp "$PLAY" \
    "$BACKUP/youtube.js"

  cp "$MEDIA" \
    "$BACKUP/kyaraMediaCommands.js"

  date '+%Y-%m-%d %H:%M:%S %z' \
    > "$BACKUP/CREATED_AT.txt"

  echo "✅ Backup único criado."

else

  echo "✅ Backup único já existe."
  echo "ℹ️ Não será criado outro."

fi

# ============================================================
# PATCH
# ============================================================

python3 - "$PLAY" "$MEDIA" <<'PY'
from pathlib import Path
import sys

play = Path(sys.argv[1])
media = Path(sys.argv[2])

yt = play.read_text(
    encoding="utf-8"
)

md = media.read_text(
    encoding="utf-8"
)

# ============================================================
# YOUTUBE — TED MAIS RÁPIDO
# ============================================================

yt = yt.replace(
    "AbortSignal.timeout(10000)",
    "AbortSignal.timeout(6500)",
    1
)

# ============================================================
# YOUTUBE — YT-SEARCH MAIS RÁPIDO
# ============================================================

yt = yt.replace(
    """            ),
            7000
          );""",
    """            ),
            5000
          );""",
    1
)

# ============================================================
# YOUTUBE — FALLBACK YT-DLP MAIS RÁPIDO
# ============================================================

yt = yt.replace(
    """await executarBuscaYtDlpRapida(
        termo,
        12000
      );""",
    """await executarBuscaYtDlpRapida(
        termo,
        9000
      );""",
    1
)

# ============================================================
# CACHE DE PESQUISA YOUTUBE
# ============================================================

if "const KYARA_PLAY_SEARCH_CACHE" not in yt:

    marker = "async function search(query) {"

    if marker not in yt:
        raise SystemExit(
            "❌ search(query) não encontrado."
        )

    yt = yt.replace(
        marker,
        """const KYARA_PLAY_SEARCH_CACHE =
  new Map();

const KYARA_PLAY_SEARCH_INFLIGHT =
  new Map();

const KYARA_PLAY_SEARCH_TTL =
  10 * 60 * 1000;

async function searchLegacy(query) {""",
        1
    )

    marker_info = """

/*
 * Obtém metadados de qualquer URL"""

    if marker_info not in yt:
        raise SystemExit(
            "❌ Ponto de inserção do cache não encontrado."
        )

    wrapper = """
async function search(query) {

  const termo =
    String(query || '').trim();

  if (!termo) {
    return {
      ok: false,
      msg:
        'Digite algo para pesquisar.'
    };
  }

  const key =
    termo
      .toLowerCase()
      .replace(/\\s+/g, ' ')
      .trim();

  const cached =
    KYARA_PLAY_SEARCH_CACHE.get(
      key
    );

  if (
    cached &&
    cached.expires >
      Date.now()
  ) {
    return cached.result;
  }

  const running =
    KYARA_PLAY_SEARCH_INFLIGHT.get(
      key
    );

  if (running) {
    return running;
  }

  const job =
    (async () => {

      const result =
        await searchLegacy(
          termo
        );

      if (result?.ok) {

        KYARA_PLAY_SEARCH_CACHE.set(
          key,
          {
            result,
            expires:
              Date.now() +
              KYARA_PLAY_SEARCH_TTL
          }
        );

      }

      return result;

    })();

  KYARA_PLAY_SEARCH_INFLIGHT.set(
    key,
    job
  );

  try {

    return await job;

  } finally {

    KYARA_PLAY_SEARCH_INFLIGHT.delete(
      key
    );

  }
}

"""

    yt = yt.replace(
        marker_info,
        "\n" +
        wrapper +
        marker_info,
        1
    )

# ============================================================
# PESQUISAS DE TIKTOK / INSTAGRAM / ETC.
# TIMEOUT PARA NÃO PRENDER O BOT
# ============================================================

if "AbortSignal.timeout(8000)" not in md:

    old = """        {
          headers: {
            'user-agent':
              'Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
          }
        }"""

    new = """        {
          signal:
            AbortSignal.timeout(8000),

          headers: {
            'user-agent':
              'Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
          }
        }"""

    if old in md:

        md = md.replace(
            old,
            new,
            1
        )

# ============================================================
# SALVAR
# ============================================================

play.write_text(
    yt,
    encoding="utf-8"
)

media.write_text(
    md,
    encoding="utf-8"
)

print(
    "✅ PATCH_OK"
)
PY

# ============================================================
# VALIDAÇÃO
# ============================================================

echo
echo "🔎 Validando..."

node --check "$PLAY"
node --check "$MEDIA"

if [ -f "$ROOT/dados/src/features/kyaraPlay2.js" ]; then
  node --check \
    "$ROOT/dados/src/features/kyaraPlay2.js"
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PLAY TURBO APLICADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "🎵 .play nome da música"
echo "🎧 .playaudio URL"
echo "🎬 .playvideo URL"
echo
echo "📦 Backup:"
echo "$BACKUP"
echo
echo "🚀 Iniciando Kyara..."
echo

exec node "$START"
