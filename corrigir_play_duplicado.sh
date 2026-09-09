#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$(pwd)"
IDX="$ROOT/dados/src/index.js"

echo "=============================================="
echo "       KYARA - REMOVER PLAY DUPLICADO"
echo "=============================================="
echo

if [ ! -f "$IDX" ]; then
  echo "❌ Arquivo não encontrado:"
  echo "$IDX"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/.backup-play-duplicado-$STAMP"

mkdir -p "$BACKUP"
cp -a "$IDX" "$BACKUP/index.js"

echo "[1/4] Backup criado:"
echo "$BACKUP"
echo

python3 - "$IDX" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
s = path.read_text(encoding='utf-8')

old = """      case 'play':
      case 'ytmp3':"""

new = """      case 'ytmp3':"""

count = s.count(old)

print(f"Ocorrências encontradas: {count}")

if count == 0:
    print("⚠️ O bloco case 'play' + case 'ytmp3' não foi encontrado.")
    print("Isso pode significar que ele já foi removido.")
else:
    s = s.replace(old, new, 1)
    path.write_text(s, encoding='utf-8')
    print("✅ case 'play' antigo removido do index.js.")

PY

echo
echo "[2/4] Verificando sintaxe..."

node --check "$IDX"

echo "✅ index.js válido."

echo
echo "[3/4] Conferindo os pontos do PLAY..."

echo
echo "--- case play restante no index.js ---"
grep -nE "case ['\"]play['\"]" "$IDX" || true

echo
echo "--- kyaraSpecialHandler ---"
grep -n "handleKyaraSpecialCommand" "$IDX" || true

echo
echo "--- kyaraMediaCommands ---"
grep -n "kyaraMediaCommands" "$ROOT/dados/src/features/kyaraSpecialCommands.js" || true

echo
echo "[4/4] Concluído."

echo
echo "=============================================="
echo "       PLAY DUPLICADO CORRIGIDO"
echo "=============================================="
echo
echo "IMPORTANTE:"
echo "Se houver outro npm/node rodando em outra sessão,"
echo "ele também pode causar mensagens duplicadas."
echo
echo "Confira com:"
echo
echo "pgrep -af 'node|npm'"
echo
echo "Depois reinicie SOMENTE uma instância:"
echo
echo "npm start"
echo
