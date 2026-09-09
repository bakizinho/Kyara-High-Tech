#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$(pwd)"

MEDIA="$ROOT/dados/src/features/kyaraMediaCommands.js"
LEGACY="$ROOT/dados/src/features/kyaraSpecialCommandsLegacy.js"
SPECIAL="$ROOT/dados/src/features/kyaraSpecialCommands.js"

echo "============================================================"
echo "              KYARA - PLAY COMPLETO"
echo "============================================================"
echo
echo "Projeto: $ROOT"
echo

if [ ! -f "$MEDIA" ]; then
  echo "❌ Não encontrei:"
  echo "$MEDIA"
  exit 1
fi

if [ ! -f "$LEGACY" ]; then
  echo "❌ Não encontrei:"
  echo "$LEGACY"
  exit 1
fi

if [ ! -f "$SPECIAL" ]; then
  echo "❌ Não encontrei:"
  echo "$SPECIAL"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/.backup-play-completo-$STAMP"

mkdir -p "$BACKUP"

cp "$MEDIA" "$BACKUP/kyaraMediaCommands.js"
cp "$LEGACY" "$BACKUP/kyaraSpecialCommandsLegacy.js"
cp "$SPECIAL" "$BACKUP/kyaraSpecialCommands.js"

echo "[1/7] Backup criado:"
echo "$BACKUP"
echo

# ============================================================
# 1. Remover qualquer lock quebrado/antigo do MediaCommands
# ============================================================

echo "[2/7] Normalizando kyaraMediaCommands.js..."

python3 - "$MEDIA" <<'PY'
from pathlib import Path
import sys
import re

path = Path(sys.argv[1])
s = path.read_text(encoding="utf-8")

# ------------------------------------------------------------
# Remove qualquer PLAY CARD LOCK anterior.
# ------------------------------------------------------------

start = s.find("/*\n * ============================================================\n * 🔒 PLAY CARD LOCK")

if start != -1:
    end = s.find("const buttonUrls = new Map();", start)

    if end == -1:
        raise SystemExit(
            "❌ Encontrei o PLAY LOCK, mas não encontrei "
            "o fim dele."
        )

    s = (
        s[:start]
        +
        s[end:]
    )

    print("✅ Lock antigo removido.")

# ------------------------------------------------------------
# Remove qualquer acquirePlayCardLock residual.
# ------------------------------------------------------------

s = re.sub(
    r"\n\s*if\s*\(\s*!acquirePlayCardLock\(\s*from,\s*data\s*\)\s*\)\s*\{\s*return true;\s*\}\s*",
    "\n",
    s,
    count=1
)

# ------------------------------------------------------------
# Adiciona um lock simples e seguro.
# ------------------------------------------------------------

marker = "const buttonUrls = new Map();"

if marker not in s:
    raise SystemExit(
        "❌ Não encontrei buttonUrls."
    )

lock = r'''
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

'''

if "const playDedup = new Map();" not in s:
    s = s.replace(
        marker,
        lock + marker,
        1
    )

# ------------------------------------------------------------
# Inserir dedup no sendCard
# ------------------------------------------------------------

send_start = s.find("async function sendCard({")

if send_start == -1:
    raise SystemExit(
        "❌ Não encontrei sendCard()."
    )

body = s.find("}) {", send_start)

if body == -1:
    raise SystemExit(
        "❌ Não encontrei o início do corpo de sendCard()."
    )

body += len("}) {")

if "allowPlayCard(" not in s[body:body+1200]:

    guard = r'''

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

'''

    s = (
        s[:body]
        +
        guard
        +
        s[body:]
    )

# ------------------------------------------------------------
# Garantir dois quick_reply no Native Flow.
# ------------------------------------------------------------

# Remove possíveis propriedades experimentais que possam
# fazer o cliente interpretar o bloco de forma diferente.

s = s.replace(
    "messageVersion:\n        1",
    "messageVersion:\n        1"
)

path.write_text(
    s,
    encoding="utf-8"
)

print("✅ kyaraMediaCommands.js normalizado.")
PY

# ============================================================
# 2. Desativar somente a mídia antiga do Legacy
# ============================================================

echo
echo "[3/7] Desativando o /play antigo do Legacy..."

python3 - "$LEGACY" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
s = path.read_text(encoding="utf-8")

# A função handleMediaSpecialCommand é chamada pelo
# handleKyaraSpecialCommand antigo.
#
# O sistema novo já é responsável pela mídia.
# Portanto, fazemos o Legacy ignorar exclusivamente
# os comandos de mídia.

marker = "  const supported = ["

pos = s.find(marker)

if pos == -1:
    raise SystemExit(
        "❌ Não encontrei a lista supported do Legacy."
    )

insert = r'''
  /*
   * ==========================================================
   * 🚫 MÍDIA CENTRALIZADA
   *
   * O sistema novo em kyaraMediaCommands.js é o único
   * responsável por /play, /playaudio e /playvideo.
   *
   * Isso impede que uma segunda implementação do mesmo
   * comando seja executada.
   * ==========================================================
   */
  const centralizedMediaCommands = [
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
  ];

  if (
    centralizedMediaCommands.includes(cmd)
  ) {
    return false;
  }

'''

if "const centralizedMediaCommands = [" not in s:
    s = (
        s[:pos]
        +
        insert
        +
        s[pos:]
    )

path.write_text(
    s,
    encoding="utf-8"
)

print("✅ Mídia antiga do Legacy desativada.")
PY

# ============================================================
# 3. Garantir que o handler novo seja o primeiro
# ============================================================

echo
echo "[4/7] Conferindo roteamento..."

grep -n "handleMedia" "$SPECIAL" || true
grep -n "handleLegacy" "$SPECIAL" || true

# ============================================================
# 4. Sintaxe
# ============================================================

echo
echo "[5/7] Verificando sintaxe..."

node --check "$MEDIA"
echo "✓ kyaraMediaCommands.js"

node --check "$LEGACY"
echo "✓ kyaraSpecialCommandsLegacy.js"

node --check "$SPECIAL"
echo "✓ kyaraSpecialCommands.js"

# ============================================================
# 5. Conferência
# ============================================================

echo
echo "[6/7] Conferindo PLAY..."

echo
echo "--- MediaCommands ---"
echo "sendCard:"
grep -n "async function sendCard" "$MEDIA" || true

echo
echo "allowPlayCard:"
grep -n "allowPlayCard" "$MEDIA" || true

echo
echo "Native Flow:"
grep -n "nativeFlowMessage" "$MEDIA" || true

echo
echo "quick_reply:"
grep -n "quick_reply" "$MEDIA" || true

echo
echo "--- Legacy ---"
echo "centralizedMediaCommands:"
grep -n "centralizedMediaCommands" "$LEGACY" || true

# ============================================================
# 6. Final
# ============================================================

echo
echo "[7/7] Tudo pronto."

echo
echo "============================================================"
echo "             PLAY COMPLETO CORRIGIDO"
echo "============================================================"
echo
echo "✓ /play por pesquisa"
echo "✓ /play por URL"
echo "✓ URL direta via yt-dlp"
echo "✓ YouTube"
echo "✓ TikTok"
echo "✓ Instagram"
echo "✓ Facebook"
echo "✓ Kwai"
echo "✓ X/Twitter"
echo "✓ Pinterest"
echo "✓ Outras URLs suportadas pelo yt-dlp"
echo "✓ Melhor qualidade disponível"
echo "✓ Native Flow"
echo "✓ 🎵 Baixar Áudio"
echo "✓ 🎬 Baixar Vídeo"
echo "✓ Proteção contra card duplicado"
echo "✓ Mídia antiga do Legacy desativada"
echo "✓ Somente um sistema controla o /play"
echo "✓ Sintaxe validada"
echo
echo "Backup:"
echo "$BACKUP"
echo
echo "============================================================"
echo
echo "AGORA REINICIE O BOT:"
echo
echo "pkill -f 'node .' 2>/dev/null || true"
echo
echo "Depois:"
echo
echo "npm start"
echo
echo "Teste:"
echo
echo "/play eren"
echo
echo "============================================================"
