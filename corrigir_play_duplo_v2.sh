#!/data/data/com.termux/files/usr/bin/bash
set -e

FILE="dados/src/features/kyaraMediaCommands.js"
BACKUP=".backup-play-lock-20260908-150258"

echo "=============================================="
echo "       KYARA - PLAY DUPLO V2"
echo "=============================================="
echo

if [ ! -f "$FILE" ]; then
  echo "❌ Arquivo não encontrado:"
  echo "$FILE"
  exit 1
fi

if [ ! -f "$BACKUP/kyaraMediaCommands.js" ]; then
  echo "❌ Backup não encontrado:"
  echo "$BACKUP/kyaraMediaCommands.js"
  exit 1
fi

echo "[1/5] Restaurando versão anterior ao patch quebrado..."

cp "$BACKUP/kyaraMediaCommands.js" "$FILE"

echo "✅ Versão anterior restaurada."

echo
echo "[2/5] Criando proteção contra card duplicado..."

python3 - "$FILE" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
s = path.read_text(encoding="utf-8")

# ------------------------------------------------------------
# BLOCO DE LOCK
# ------------------------------------------------------------

marker = "const buttonUrls = new Map();"

if marker not in s:
    raise SystemExit(
        "❌ Não encontrei 'const buttonUrls = new Map();'"
    )

lock = r'''
/*
 * ============================================================
 * 🔒 PLAY CARD LOCK
 *
 * Impede que o mesmo card seja enviado duas vezes
 * quase simultaneamente.
 * ============================================================
 */
const playCardLocks = new Map();

const PLAY_CARD_LOCK_TTL = 15000;

function acquirePlayCardLock(from, data) {
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
    playCardLocks.get(key);

  if (
    previous &&
    now - previous <
    PLAY_CARD_LOCK_TTL
  ) {
    console.log(
      `[PLAY LOCK] ⛔ Card duplicado bloqueado: ${title || source}`
    );

    return false;
  }

  playCardLocks.set(
    key,
    now
  );

  setTimeout(
    () => {
      if (
        playCardLocks.get(key) === now
      ) {
        playCardLocks.delete(key);
      }
    },
    PLAY_CARD_LOCK_TTL + 1000
  ).unref?.();

  return true;
}

'''

if "const playCardLocks = new Map();" not in s:
    s = s.replace(
        marker,
        lock + marker,
        1
    )
    print("✅ Lock criado.")
else:
    print("⚠️ Lock já existia.")

# ------------------------------------------------------------
# INSERIR LOCK NO SENDCARD
# ------------------------------------------------------------

start = s.find("async function sendCard({")

if start == -1:
    raise SystemExit(
        "❌ Não encontrei 'async function sendCard({'"
    )

# Procuramos o fechamento da assinatura.
signature_end = s.find(
    "}) {",
    start
)

if signature_end == -1:
    raise SystemExit(
        "❌ Não encontrei o início do corpo de sendCard()."
    )

body_start = signature_end + len("}) {")

if "[PLAY CARD LOCK]" in s:
    print("⚠️ Proteção já estava dentro de sendCard().")
else:
    guard = r'''

  /*
   * 🔒 DEDUPLICAÇÃO
   *
   * Se dois caminhos chamarem sendCard() para o mesmo
   * resultado ao mesmo tempo, somente o primeiro envia.
   */
  if (
    !acquirePlayCardLock(
      from,
      data
    )
  ) {
    return true;
  }

'''

    s = (
        s[:body_start]
        +
        guard
        +
        s[body_start:]
    )

    print("✅ Lock inserido diretamente no sendCard().")

path.write_text(
    s,
    encoding="utf-8"
)

PY

echo
echo "[3/5] Verificando sintaxe..."

node --check "$FILE"

echo "✅ Sintaxe válida."

echo
echo "[4/5] Conferindo o lock..."

grep -n "PLAY CARD LOCK" "$FILE" || true
grep -n "acquirePlayCardLock" "$FILE" || true

echo
echo "[5/5] Concluído."

echo
echo "=============================================="
echo "       PLAY DUPLO V2 APLICADO"
echo "=============================================="
echo
echo "Agora reinicie o bot:"
echo
echo "pkill -f 'node .' 2>/dev/null || true"
echo
echo "npm start"
echo
echo "Depois teste:"
echo
echo "/play eren"
echo
echo "Esperado:"
echo "✓ somente 1 card"
echo "✓ somente 1 resultado"
echo
echo "Se houver uma segunda chamada:"
echo "[PLAY LOCK] ⛔ Card duplicado bloqueado"
echo
echo "=============================================="
