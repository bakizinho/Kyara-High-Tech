#!/data/data/com.termux/files/usr/bin/bash
set -e

cd "$(dirname "$0")"

echo "=============================================="
echo " 🌸 BKkyara • CORREÇÃO DO ENVIO DO MENU"
echo "=============================================="
echo

FILE="dados/src/core/menuAdaptativo/menu-adaptativo.js"

if [ ! -f "$FILE" ]; then
  echo "❌ Arquivo não encontrado:"
  echo "   $FILE"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="dados/src/core/menuAdaptativo/menu-adaptativo.js.backup-envio-$STAMP"

echo "[1/5] Criando backup..."
cp "$FILE" "$BACKUP"
echo "✅ Backup: $BACKUP"
echo

echo "[2/5] Procurando função de envio..."

python - "$FILE" <<'PY'
from pathlib import Path
import sys
import re

p = Path(sys.argv[1])
s = p.read_text(encoding="utf-8")

# Evita aplicar a correção duas vezes
if "KYARA_MENU_SEND_SAFE" in s:
    print("ℹ️ Correção de envio já presente. Nenhuma alteração duplicada feita.")
    raise SystemExit(0)

# Insere marcador e substitui apenas a chamada direta ao sendMessage
# quando ela estiver dentro do menu adaptativo.
marker = r'''
// KYARA_MENU_SEND_SAFE
async function enviarMenuAdaptativoSeguro(sock, jid, mensagem, opcoes = {}) {
  if (!sock || typeof sock.sendMessage !== 'function') {
    throw new Error('Socket WhatsApp inválido: sendMessage não disponível')
  }

  if (!jid) {
    throw new Error('JID do destinatário não informado')
  }

  try {
    console.log('[MENU] 📤 Enviando menu adaptativo para:', jid)

    const resultado = await sock.sendMessage(jid, mensagem, opcoes)

    if (!resultado) {
      throw new Error('sendMessage retornou vazio')
    }

    console.log('[MENU] ✅ WhatsApp aceitou o envio do menu adaptativo')
    return resultado
  } catch (err) {
    console.error(
      '[MENU] ❌ Falha REAL no envio adaptativo:',
      err?.stack || err?.message || err
    )
    throw err
  }
}

'''

# Coloca o helper antes da primeira função exportável.
m = re.search(r'\b(?:export\s+)?(?:async\s+)?function\s+', s)
if not m:
    raise SystemExit("Não encontrei uma função válida para inserir o helper.")

s = s[:m.start()] + marker + s[m.start():]

# Substitui chamadas comuns existentes.
s = re.sub(
    r'\bawait\s+sock\.sendMessage\s*\(\s*jid\s*,',
    'await enviarMenuAdaptativoSeguro(sock, jid,',
    s
)

s = re.sub(
    r'\bawait\s+sock\.sendMessage\s*\(\s*toJid\s*,',
    'await enviarMenuAdaptativoSeguro(sock, toJid,',
    s
)

p.write_text(s, encoding="utf-8")
print("✅ Helper de envio seguro instalado.")
PY

echo
echo "[3/5] Verificando sintaxe..."
node --check "$FILE"
echo "✅ menu-adaptativo.js OK"
echo

echo "[4/5] Verificando index.js..."
node --check "dados/src/index.js"
echo "✅ index.js OK"
echo

echo "[5/5] Procurando referências..."
grep -n "KYARA_MENU_SEND_SAFE\|WhatsApp aceitou\|Falha REAL" "$FILE" || true

echo
echo "=============================================="
echo " ✅ CORREÇÃO APLICADA"
echo "=============================================="
echo
echo "Agora reinicie o bot:"
echo
echo "  npm start"
echo
echo "Depois envie:"
echo
echo "  /menu"
echo
echo "Se ainda não aparecer, o terminal deverá mostrar"
echo "o ERRO REAL do sendMessage em vez de falso 'enviado'."
echo
