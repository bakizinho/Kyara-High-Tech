#!/data/data/com.termux/files/usr/bin/bash

MODEL="$HOME/kyara-ai/models/qwen2.5-0.5b-instruct-q4_k_m.gguf"

if ! command -v llama-cli >/dev/null 2>&1; then
    echo "❌ llama-cli não está instalado."
    exit 1
fi

if [ ! -f "$MODEL" ]; then
    echo "❌ Modelo não encontrado:"
    echo "$MODEL"
    exit 1
fi

echo "🌙 Testando Kyara..."

llama-cli \
    -m "$MODEL" \
    -c 4096 \
    -n 256 \
    --temp 0.7 \
    -p "Você é Kyara, uma assistente inteligente. Responda em português de forma natural. Diga apenas uma saudação curta."

