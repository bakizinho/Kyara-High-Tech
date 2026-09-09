#!/data/data/com.termux/files/usr/bin/bash

set +e

echo "══════════════════════════════════════════════"
echo "🧠 DIAGNÓSTICO DA IA LOCAL — BKkyara"
echo "══════════════════════════════════════════════"

echo
echo "=== 1. LLAMA-SERVER ==="

command -v llama-server
llama-server --version 2>&1 | head -5

echo
echo "=== 2. MODELOS GGUF NO HOME DO TERMUX ==="

find "$HOME" \
  -type f \
  \( -iname "*.gguf" -o -iname "*.ggml" -o -iname "*.bin" \) \
  ! -path "$HOME/storage/BKkyara-/dados/backup-*/*" \
  2>/dev/null | head -100

echo
echo "=== 3. MODELOS NO STORAGE ==="

find "$HOME/storage" \
  -type f \
  \( -iname "*.gguf" -o -iname "*.ggml" -o -iname "*.bin" \) \
  2>/dev/null | head -100

echo
echo "=== 4. CONFIGURAÇÕES DO LLAMA NO PROJETO ==="

grep -RniE \
  "llama-server|llama-server|127\.0\.0\.1:8080|localhost:8080|completion|MODEL_PATH|MODEL_FILE|LLAMA" \
  . \
  --include="*.js" \
  --include="*.json" \
  --include="*.env*" \
  --include="*.sh" \
  --exclude-dir=node_modules \
  --exclude-dir=".git" \
  --exclude-dir="backup-"* \
  2>/dev/null \
  | head -250

echo
echo "=== 5. VARIÁVEIS DE AMBIENTE RELACIONADAS À IA ==="

env | grep -Ei \
  '^(LLAMA|MODEL|AI_|LOCAL_AI|OLLAMA)' \
  | sed -E 's/=.*/=<configurado>/'

echo
echo "=== 6. PROCESSOS ==="

pgrep -af "llama|llama-server" || echo "❌ Nenhum llama-server rodando"

echo
echo "=== 7. PORTA 8080 ==="

if command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | grep ':8080' \
      || echo "❌ Porta 8080 livre"
else
    echo "ℹ️ ss não disponível"
fi

echo
echo "=== 8. ESTRUTURA DE POSSÍVEIS MODELOS ==="

for DIR in \
    "$HOME/models" \
    "$HOME/model" \
    "$HOME/llama" \
    "$HOME/.cache" \
    "$HOME/storage/downloads" \
    "$HOME/storage/shared" \
    "/sdcard/Download"
do
    if [ -d "$DIR" ]; then
        echo
        echo "📂 $DIR"
        find "$DIR" \
          -maxdepth 3 \
          -type f \
          \( -iname "*.gguf" -o -iname "*.ggml" -o -iname "*.bin" \) \
          2>/dev/null | head -30
    fi
done

echo
echo "══════════════════════════════════════════════"
echo "🏁 DIAGNÓSTICO CONCLUÍDO"
echo "══════════════════════════════════════════════"
