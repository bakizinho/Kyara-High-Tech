#!/data/data/com.termux/files/usr/bin/bash

set -e

ROOT="$HOME/storage/BKkyara-"
LEGACY="$ROOT/dados/src/features/kyaraSpecialCommandsLegacy.js"
MEDIA="$ROOT/dados/src/features/kyaraMediaCommands.js"
YT="$ROOT/dados/src/funcs/downloads/youtube.js"

echo "============================================================"
echo "        KYARA — PLAY SEM INTERFERÊNCIA"
echo "============================================================"
echo

# ============================================================
# 1. Parar instância atual
# ============================================================

echo "[1/6] Parando instância atual..."

pkill -f 'node .' 2>/dev/null || true
sleep 1

echo "✓ Instância parada"
echo

# ============================================================
# 2. Backup atual
# ============================================================

BACKUP="$ROOT/backup-play-isolamento-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

cp "$LEGACY" "$BACKUP/kyaraSpecialCommandsLegacy.js"
cp "$MEDIA" "$BACKUP/kyaraMediaCommands.js"
cp "$YT" "$BACKUP/youtube.js"

echo "[2/6] Backup criado:"
echo "$BACKUP"
echo

# ============================================================
# 3. Bloquear o Legacy para mídia
# ============================================================

echo "[3/6] Bloqueando interferência do Legacy..."

python3 - "$LEGACY" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

marker = "// KYARA_PLAY_ONLY_NEW_MEDIA"

if marker in s:
    print("✓ Bloqueio já instalado")
    raise SystemExit(0)

# Assinatura REAL encontrada no projeto
needle = """async function handleMediaSpecialCommand(
  options
) {"""

if needle not in s:
    raise SystemExit(
        "ERRO: assinatura real de handleMediaSpecialCommand não encontrada."
    )

guard = """async function handleMediaSpecialCommand(
  options
) {
  // KYARA_PLAY_ONLY_NEW_MEDIA
  // O sistema novo kyaraMediaCommands.js é o único
  // responsável pelos comandos de mídia.

  const __kyaraCentralMediaCommands = new Set([
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
  ]);

  const __kyaraCurrentMediaCommand =
    String(options?.command || '')
      .trim()
      .toLowerCase();

  if (__kyaraCentralMediaCommands.has(__kyaraCurrentMediaCommand)) {
    return false;
  }
"""

s = s.replace(needle, guard, 1)

p.write_text(s)

print("✓ Legacy bloqueado para comandos de mídia")
PY

echo

# ============================================================
# 4. NÃO alterar o Media
# ============================================================

echo "[4/6] Conferindo sistema novo..."

grep -n "async function sendCard" "$MEDIA" || {
    echo "❌ sendCard não encontrado."
    exit 1
}

grep -n "nativeFlowMessage" "$MEDIA" || {
    echo "❌ Native Flow não encontrado."
    exit 1
}

grep -n "quick_reply" "$MEDIA" || {
    echo "❌ Botões quick_reply não encontrados."
    exit 1
}

echo "✓ Sistema novo encontrado"
echo "✓ Native Flow encontrado"
echo "✓ Botões encontrados"
echo

# ============================================================
# 5. Sintaxe
# ============================================================

echo "[5/6] Validando sintaxe..."

node --check "$MEDIA"
echo "✓ kyaraMediaCommands.js"

node --check "$LEGACY"
echo "✓ kyaraSpecialCommandsLegacy.js"

node --check "$YT"
echo "✓ youtube.js"

echo

# ============================================================
# 6. Conferência final
# ============================================================

echo "[6/6] Conferência final..."
echo

echo "--- BLOQUEIO LEGACY ---"
grep -n "KYARA_PLAY_ONLY_NEW_MEDIA" "$LEGACY" || true

echo
echo "--- MEDIA ---"
grep -n "async function sendCard" "$MEDIA" || true
grep -n "nativeFlowMessage" "$MEDIA" || true
grep -n "quick_reply" "$MEDIA" || true

echo
echo "--- YT-DLP ---"
grep -n "concurrent-fragments" "$YT" || true

echo
echo "============================================================"
echo "             PLAY ISOLADO COM SUCESSO"
echo "============================================================"
echo
echo "✓ /play controlado pelo sistema novo"
echo "✓ Legacy NÃO processa /play"
echo "✓ Legacy NÃO processa /playaudio"
echo "✓ Legacy NÃO processa /playvideo"
echo "✓ Legacy NÃO processa /ytmp3"
echo "✓ Legacy NÃO processa /ytmp4"
echo "✓ Legacy NÃO processa TikTok"
echo "✓ Legacy NÃO processa Instagram"
echo "✓ Legacy NÃO processa Facebook"
echo "✓ Legacy NÃO processa Kwai"
echo "✓ Legacy NÃO processa X/Twitter"
echo "✓ Legacy NÃO processa Pinterest"
echo "✓ Media não foi reescrito"
echo "✓ Native Flow preservado"
echo "✓ Dois botões preservados"
echo "✓ Sintaxe OK"
echo
echo "BACKUP:"
echo "$BACKUP"
echo
echo "============================================================"
echo
echo "AGORA INICIE:"
echo
echo "npm start"
echo
echo "TESTE SOMENTE:"
echo
echo "/play eren"
echo
echo "RESULTADO ESPERADO:"
echo
echo "1 único card"
echo "0 mensagens de 'Comando não encontrado'"
echo
echo "NÃO CLIQUE NOS BOTÕES AINDA."
echo
echo "============================================================"
