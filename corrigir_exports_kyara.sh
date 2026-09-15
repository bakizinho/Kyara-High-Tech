#!/data/data/com.termux/files/usr/bin/bash

set -e

ARQ="dados/src/funcs/private/ia.js"

echo "=============================================="
echo "🌙 KYARA — LIMPEZA DAS EXPORTAÇÕES"
echo "=============================================="

cp "$ARQ" "${ARQ}.antes-exports"

python - "$ARQ" <<'PY'
import sys
from pathlib import Path

p = Path(sys.argv[1])
s = p.read_text(encoding="utf-8")

marcador = "// ============================================================================\n// EXPORTAÇÕES\n// ============================================================================"

inicio = s.find(marcador)

if inicio == -1:
    raise SystemExit("❌ Bloco de exportações não encontrado.")

# O arquivo atualmente possui dois blocos export no final.
# Mantemos somente as funções que realmente existem no módulo.
novo = r'''// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export {
  processUserMessages as makeAssistentRequest,

  makeCognimaRequest,
  makeLocalAIRequest,

  getHistoricoStats,
  clearOldHistorico,
  updateHistorico,

  getApiKeyStatus,
  updateApiKeyStatus,

  updateConversationState,
  getConversationState,

  updateUserPreferences,
  getUserPreferences,

  trackUserInteraction,
  getUserInteractionStats,

  userContextDB,
  processLearning,

  cleanWhatsAppFormatting,
  extractJSON,
  validateMessage,

  clearConversationData,

  LOCAL_AI_URL,
  LOCAL_AI_MODEL,
  LOCAL_AI_ENDPOINT,

  makeKyaraChatRequest
};
'''

s = s[:inicio] + novo + "\n"

p.write_text(s, encoding="utf-8")

print("✅ Bloco de exportações reconstruído.")
PY

echo
echo "🔎 Validando JavaScript..."

node --check "$ARQ"

echo
echo "=============================================="
echo "✅ EXPORTAÇÕES CORRIGIDAS"
echo "=============================================="
echo
echo "Agora rode:"
echo
echo "node ."
