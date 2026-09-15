#!/data/data/com.termux/files/usr/bin/bash

set -e

echo "🌙 KYARA — LIMPEZA E CONFIGURAÇÃO LOCAL"
echo "========================================"

cd "$(dirname "$0")"

echo "🧹 Removendo backups inúteis..."

find . -type f \( \
    -name "*.bak" -o \
    -name "*.backup" -o \
    -name "*.broken" -o \
    -name "*.before-*" -o \
    -name "*.pre-*" \
    \) -delete 2>/dev/null || true

find . -type d \( \
    -name "*backup*" -o \
    -name "*BACKUP*" \
    \) -prune -exec rm -rf {} + 2>/dev/null || true

echo "🧹 Limpando temporários..."

rm -rf \
    .tmp-kokoro-inspecao \
    .tmp-kokoro-browser \
    .tmp-tts-termux \
    2>/dev/null || true

echo "🤖 Configurando IA local..."

mkdir -p dados/models
mkdir -p dados/logs
mkdir -p dados/tmp

# Modelo padrão da Kyara
MODEL="$HOME/kyara-ai/models/qwen2.5-0.5b-instruct-q4_k_m.gguf"

cat > config/ia-local.json <<'IAEOF'
{
  "enabled": true,
  "mode": "local",
  "provider": "llama.cpp",
  "api": false,
  "external_api": false,
  "model": "~/kyara-ai/models/qwen2.5-0.5b-instruct-q4_k_m.gguf",
  "temperature": 0.7,
  "max_tokens": 512,
  "context": 4096
}
IAEOF

echo "📝 Criando diagnóstico..."

cat > diagnosticar_ia_local.sh <<'DIAEOF'
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
DIAEOF

chmod +x diagnosticar_ia_local.sh

echo "🧪 Criando teste da IA..."

cat > testar_ia_local.sh <<'TEEOF'
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

TEEOF

chmod +x testar_ia_local.sh

echo
echo "🔍 Verificando JavaScript..."

if command -v node >/dev/null 2>&1; then
    find . -type f -name "*.js" \
        ! -path "./node_modules/*" \
        -print0 |
    while IFS= read -r -d '' file; do
        node --check "$file" >/dev/null 2>&1 || {
            echo "⚠️ Erro de sintaxe: $file"
        }
    done

    echo "✅ Verificação concluída."
fi

echo
echo "================================"
echo "✅ KYARA ORGANIZADA"
echo "================================"
echo
echo "IA: LOCAL"
echo "API externa: DESATIVADA"
echo "Backups: LIMPOS"
echo "Comandos: PRESERVADOS"
echo
echo "Execute:"
echo
echo "./diagnosticar_ia_local.sh"
echo
echo "Para testar a IA:"
echo
echo "./testar_ia_local.sh"
echo
