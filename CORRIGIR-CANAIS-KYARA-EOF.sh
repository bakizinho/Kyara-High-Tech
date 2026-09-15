#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$(pwd)"
MENU="$ROOT/dados/src/core/menuAdaptativo/menu-adaptativo.js"

echo "========================================"
echo " 🌸 KYARA • CORREÇÃO DOS CANAIS"
echo "========================================"

if [ ! -f "$MENU" ]; then
  echo "❌ Arquivo não encontrado:"
  echo "$MENU"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$MENU.backup-canais-$STAMP"

cp "$MENU" "$BACKUP"

python3 - "$MENU" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

old = """  channels: [
    {
      name: '📢 Canal Oficial',
      url: 'https://whatsapp.com/channel/0029VbEXEMPLO'
    },
    {
      name: '🌸 Canal Kyara',
      url: 'https://whatsapp.com/channel/0029VbEXEMPLO'
    }
  ]"""

new = """  channels: [
    {
      name: '📢 O COMEÇO • Canal Oficial',
      url: 'https://whatsapp.com/channel/0029VbCXBCy8fewmEhto8J0w'
    },
    {
      name: '🌸 Kyara-bot • Canal do Bot',
      url: 'https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r'
    }
  ]"""

if old not in text:
    # Corrige mesmo que os nomes tenham sido alterados,
    # substituindo somente o bloco channels.
    start = text.find("  channels: [")
    if start == -1:
        raise SystemExit("❌ Bloco channels não encontrado.")

    end = text.find("\n  ]", start)

    if end == -1:
        raise SystemExit("❌ Fim do bloco channels não encontrado.")

    end += len("\n  ]")

    text = text[:start] + new + text[end:]
else:
    text = text.replace(old, new)

path.write_text(text, encoding="utf-8")

print("✅ URLs dos canais atualizadas.")
PY

echo "🔍 Verificando JavaScript..."

node --check "$MENU"

echo "✅ Sintaxe OK."

echo
echo "========================================"
echo " ✅ CANAIS CORRIGIDOS"
echo "========================================"
echo
echo "📢 O COMEÇO:"
echo "https://whatsapp.com/channel/0029VbCXBCy8fewmEhto8J0w"
echo
echo "🌸 Kyara-bot:"
echo "https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r"
echo
echo "Backup:"
echo "$BACKUP"
echo
echo "Agora reinicie o bot:"
echo
echo "  node ."
echo
echo "Depois envie:"
echo
echo "  /menu"
echo
echo "========================================"
