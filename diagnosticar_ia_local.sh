#!/data/data/com.termux/files/usr/bin/bash

echo "================================"
echo "   KYARA — DIAGNÓSTICO IA"
echo "================================"

MODEL="$HOME/kyara-ai/models/qwen2.5-0.5b-instruct-q4_k_m.gguf"

echo
echo "📁 Modelo:"
echo "$MODEL"

if [ -f "$MODEL" ]; then
    echo "✅ Modelo encontrado"
else
    echo "❌ Modelo não encontrado"
    echo
    echo "A Kyara está configurada para IA LOCAL,"
    echo "mas ainda precisa de um modelo GGUF."
fi

echo
echo "🔎 Motor local:"

if command -v llama-cli >/dev/null 2>&1; then
    echo "✅ llama-cli encontrado"
    llama-cli --version 2>/dev/null || true
elif command -v llama-server >/dev/null 2>&1; then
    echo "✅ llama-server encontrado"
    llama-server --version 2>/dev/null || true
else
    echo "❌ llama.cpp não encontrado"
fi

echo
echo "🔎 APIs externas:"

if grep -RniE \
    "openai|gemini|vexapi|vexhost|api_key|apikey|sk-[A-Za-z0-9]" \
    --include="*.js" \
    --include="*.json" \
    . 2>/dev/null | head -20; then
    echo
    echo "⚠️ Foram encontradas referências que precisam ser revisadas."
else
    echo "✅ Nenhuma referência óbvia encontrada."
fi

echo
echo "================================"
