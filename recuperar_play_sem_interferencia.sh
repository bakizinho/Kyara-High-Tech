#!/data/data/com.termux/files/usr/bin/bash

set -e

ROOT="$HOME/storage/BKkyara-"
DATA="$ROOT/dados"
MEDIA="$DATA/src/features/kyaraMediaCommands.js"
LEGACY="$DATA/src/features/kyaraSpecialCommandsLegacy.js"

BACKUP="$ROOT/backup-play-final-20260908-161748"

echo "============================================================"
echo "       KYARA — RECUPERAÇÃO DO PLAY"
echo "============================================================"
echo

# ============================================================
# 1. Restaurar o MEDIA original do backup
# ============================================================

echo "[1/6] Restaurando kyaraMediaCommands.js..."

if [ ! -f "$BACKUP/kyaraMediaCommands.js" ]; then
    echo "❌ Backup não encontrado:"
    echo "$BACKUP/kyaraMediaCommands.js"
    exit 1
fi

cp "$BACKUP/kyaraMediaCommands.js" "$MEDIA"

echo "✓ Media restaurado"
echo

# ============================================================
# 2. Restaurar o LEGACY limpo do backup
# ============================================================

echo "[2/6] Restaurando Legacy..."

if [ -f "$BACKUP/kyaraSpecialCommandsLegacy.js" ]; then
    cp "$BACKUP/kyaraSpecialCommandsLegacy.js" "$LEGACY"
    echo "✓ Legacy restaurado"
else
    echo "❌ Backup do Legacy não encontrado"
    exit 1
fi

echo

# ============================================================
# 3. Bloquear mídia SOMENTE no Legacy
# ============================================================

echo "[3/6] Desativando interferência do Legacy..."

python3 - "$LEGACY" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

if "KYARA CENTRAL MEDIA ONLY" in s:
    print("✓ Bloqueio já existe")
    raise SystemExit(0)

needle = "async function handleMediaSpecialCommand(options) {"

if needle not in s:
    needle = "async function handleMediaSpecialCommand({"

if needle not in s:
    raise SystemExit(
        "❌ Não encontrei o início de handleMediaSpecialCommand."
    )

guard = r'''
  // ==========================================================
  // KYARA CENTRAL MEDIA ONLY
  // ==========================================================
  // Todos os comandos de mídia pertencem exclusivamente ao
  // kyaraMediaCommands.js.
  //
  // O Legacy não pode processar esses comandos.
  // ==========================================================

  const __kyaraCentralMediaOnly = new Set([
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

  if (__kyaraCentralMediaOnly.has(
    String(options?.command || '').toLowerCase()
  )) {
    return false;
  }

'''

pos = s.find(needle)
brace = s.find("{", pos)

if brace == -1:
    raise SystemExit("❌ Não encontrei a abertura da função.")

s = s[:brace + 1] + guard + s[brace + 1:]

p.write_text(s)

print("✓ Legacy bloqueado para comandos de mídia")
PY

echo

# ============================================================
# 4. Verificar que o Media não foi corrompido
# ============================================================

echo "[4/6] Validando Media..."

node --check "$MEDIA"

echo "✓ kyaraMediaCommands.js OK"

echo

# ============================================================
# 5. Validar Legacy
# ============================================================

echo "[5/6] Validando Legacy..."

node --check "$LEGACY"

echo "✓ kyaraSpecialCommandsLegacy.js OK"

echo

# ============================================================
# 6. Verificação
# ============================================================

echo "[6/6] Conferindo centralização..."

echo
echo "--- MEDIA ---"

grep -n "async function sendCard" "$MEDIA" || true
grep -n "nativeFlowMessage" "$MEDIA" || true
grep -n "quick_reply" "$MEDIA" || true

echo
echo "--- LEGACY BLOQUEADO ---"

grep -n "KYARA CENTRAL MEDIA ONLY" "$LEGACY" || true

echo
echo "============================================================"
echo "              PLAY RECUPERADO"
echo "============================================================"
echo
echo "✓ Media restaurado do backup"
echo "✓ Legacy restaurado"
echo "✓ Legacy bloqueado para /play"
echo "✓ Legacy bloqueado para /playaudio"
echo "✓ Legacy bloqueado para /playvideo"
echo "✓ Legacy bloqueado para /playvid"
echo "✓ Legacy bloqueado para /ytmp3"
echo "✓ Legacy bloqueado para /ytmp4"
echo "✓ Legacy bloqueado para outras mídias"
echo "✓ Sintaxe validada"
echo
echo "AGORA:"
echo
echo "pkill -f 'node .' 2>/dev/null || true"
echo "npm start"
echo
echo "TESTE SOMENTE:"
echo
echo "/play eren"
echo
echo "NÃO CLIQUE NOS BOTÕES AINDA."
echo
echo "O resultado esperado é:"
echo
echo "1 único card"
echo "sem 'Comando não encontrado'"
echo
echo "============================================================"
