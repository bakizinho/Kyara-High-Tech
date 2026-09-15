#!/data/data/com.termux/files/usr/bin/bash

echo
echo "============================================================"
echo "          KYARA — DIAGNÓSTICO REAL DA IA LOCAL"
echo "============================================================"
echo

IA="$HOME/storage/BKkyara-/dados/src/funcs/private/ia.js"
TMP="$HOME/kyara_health_test"

echo "[1/7] VERIFICANDO llama-server"
echo

if command -v llama-server >/dev/null 2>&1; then
    echo "✓ llama-server encontrado:"
    command -v llama-server
else
    echo "❌ llama-server não encontrado."
    exit 1
fi

echo
echo "[2/7] PROCESSO DO LLAMA"
echo

pgrep -af llama-server || echo "⚠️ Nenhum processo llama-server encontrado."

echo
echo "[3/7] PORTA 8080 / HEALTH"
echo

rm -f "$TMP"

HEALTH=$(curl -sS --max-time 5 \
    http://127.0.0.1:8080/health 2>&1)

STATUS=$?

if [ "$STATUS" -eq 0 ]; then
    echo "✓ Servidor respondeu:"
    echo "$HEALTH"
else
    echo "❌ Falha ao consultar /health"
    echo "$HEALTH"
fi

echo
echo "[4/7] LOG DO LLAMA"
echo

if [ -f "$HOME/kyara-llama-server.log" ]; then
    echo "===== ÚLTIMAS 100 LINHAS ====="
    tail -100 "$HOME/kyara-llama-server.log"
else
    echo "⚠️ Log não encontrado:"
    echo "$HOME/kyara-llama-server.log"
fi

echo
echo "[5/7] MODELO"
echo

MODEL="$HOME/kyara-ai/models/qwen2.5-0.5b-instruct-q4_k_m.gguf"

if [ -f "$MODEL" ]; then
    echo "✓ Modelo encontrado:"
    echo "$MODEL"
    ls -lh "$MODEL"
else
    echo "❌ MODELO NÃO ENCONTRADO:"
    echo "$MODEL"
    echo
    echo "Modelos existentes em ~/kyara-ai:"
    find "$HOME/kyara-ai" -type f \
        \( -iname "*.gguf" -o -iname "*.bin" \) \
        -exec ls -lh {} \; 2>/dev/null
fi

echo
echo "[6/7] ARGUMENTOS DO LLAMA-SERVER"
echo

PID=$(pgrep -o -f 'llama-server')

if [ -n "$PID" ] && [ -r "/proc/$PID/cmdline" ]; then
    echo "PID: $PID"
    tr '\0' ' ' < "/proc/$PID/cmdline"
    echo
else
    echo "⚠️ Não foi possível obter os argumentos do processo."
fi

echo
echo "[7/7] TESTE MÍNIMO DE INFERÊNCIA"
echo
echo "Pergunta: Responda apenas Oi"
echo "Limite: 30 segundos"
echo

START=$(date +%s)

RESULT=$(curl -sS \
    --max-time 30 \
    -H 'Content-Type: application/json' \
    -d '{
        "prompt":"Responda apenas: Oi",
        "n_predict":8,
        "temperature":0.2,
        "stream":false
    }' \
    http://127.0.0.1:8080/completion 2>&1)

STATUS=$?

END=$(date +%s)
ELAPSED=$((END - START))

echo
echo "Tempo: ${ELAPSED}s"
echo "Código curl: $STATUS"
echo
echo "Resposta:"
echo "$RESULT"

echo
echo "============================================================"
echo "                    DIAGNÓSTICO FINAL"
echo "============================================================"
echo

if echo "$RESULT" | grep -q '"content"'; then
    echo "✅ O LLAMA ESTÁ GERANDO RESPOSTAS."
    echo
    echo "O problema provavelmente está na configuração/prompt da Kyara."
else
    echo "❌ O LLAMA NÃO CONSEGUIU GERAR UMA RESPOSTA."
    echo
    echo "O problema está no servidor, modelo ou desempenho."
    echo
    echo "O LOG ACIMA É A PARTE MAIS IMPORTANTE."
fi

echo
echo "============================================================"

