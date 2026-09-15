#!/data/data/com.termux/files/usr/bin/bash

set -e

ARQ="dados/src/funcs/private/ia.js"

echo "=============================================="
echo "🌙 KYARA — CORREÇÃO DO ESTADO DA CONVERSA"
echo "=============================================="

if [ ! -f "$ARQ" ]; then
    echo "❌ Arquivo não encontrado: $ARQ"
    exit 1
fi

cp "$ARQ" "${ARQ}.pre-conversation-state"

python - "$ARQ" <<'PY'
import sys
from pathlib import Path

p = Path(sys.argv[1])
s = p.read_text(encoding="utf-8")

if "function getConversationState(" in s or "const getConversationState =" in s:
    print("ℹ️ getConversationState já existe.")
    raise SystemExit(0)

marker = "// ============================================================================\n// EXPORTAÇÕES\n// ============================================================================"

pos = s.find(marker)

if pos == -1:
    raise SystemExit("❌ Bloco de exportações não encontrado.")

funcao = r'''
// ============================================================================
// ESTADO DA CONVERSA
// ============================================================================

function getConversationState(id) {
  const key = String(id || '').trim();

  if (!key) {
    return null;
  }

  if (
    typeof userInteractions !== 'undefined' &&
    userInteractions[key]
  ) {
    return userInteractions[key];
  }

  return null;
}

'''

s = s[:pos] + funcao + s[pos:]

p.write_text(s, encoding="utf-8")

print("✅ getConversationState adicionada.")
PY

echo
echo "🔎 Validando ia.js..."

if node --check "$ARQ"; then
    echo
    echo "=============================================="
    echo "✅ SINTAXE E EXPORTAÇÕES OK"
    echo "=============================================="
    echo
    echo "Agora execute:"
    echo
    echo "node ."
else
    echo
    echo "❌ Ainda existe erro no ia.js."
    node --check "$ARQ"
    exit 1
fi
