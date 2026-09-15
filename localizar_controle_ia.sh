#!/data/data/com.termux/files/usr/bin/bash

echo
echo "============================================================"
echo "          KYARA — LOCALIZANDO CONTROLE DA IA"
echo "============================================================"
echo

echo "[1] Arquivos relacionados à IA:"
find dados/src -type f \
    \( -name "*.js" -o -name "*.mjs" -o -name "*.cjs" \) \
    2>/dev/null |
while read -r f; do
    if grep -qiE 'KYARA CORE|LOCAL AI|assistente|assistente.*kyara|kyara.*assistente' "$f" 2>/dev/null; then
        echo "  → $f"
    fi
done

echo
echo "[2] Onde a IA é chamada:"
grep -RniE \
    'KYARA CORE|LOCAL AI|makeLocalAIRequest|makeKyaraChatRequest|ia\.js' \
    dados/src \
    --include='*.js' \
    --include='*.mjs' \
    --include='*.cjs' \
    2>/dev/null |
head -150

echo
echo "[3] Comandos existentes relacionados a assistente:"
grep -RniE \
    'assistente|assistant|/ia|/ai|ligar.*ia|desligar.*ia|ativar.*ia|desativar.*ia' \
    dados/src \
    --include='*.js' \
    --include='*.mjs' \
    --include='*.cjs' \
    2>/dev/null |
head -200

echo
echo "[4] Arquivos de comandos:"
find dados/src -type f \
    \( -iname '*command*' -o -iname '*commands*' \) \
    2>/dev/null |
head -100

echo
echo "============================================================"
echo "                     FIM DO DIAGNÓSTICO"
echo "============================================================"
