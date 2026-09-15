#!/data/data/com.termux/files/usr/bin/bash

set +e

MODEL="$HOME/kyara-ai/models/qwen2.5-0.5b-instruct-q4_k_m.gguf"
LOG="$HOME/kyara-llama-server.log"
IA="$HOME/storage/BKkyara-/dados/src/funcs/private/ia.js"

echo
echo "============================================================"
echo "             KYARA — CORREÇÃO DO SERVIDOR IA"
echo "============================================================"
echo

echo "[1/6] Parando llama-server antigo..."

pkill -f llama-server 2>/dev/null
sleep 2

echo "✓ Servidor antigo encerrado."
echo

echo "[2/6] Verificando modelo..."

if [ ! -f "$MODEL" ]; then
    echo "❌ Modelo não encontrado:"
    echo "$MODEL"
    exit 1
fi

echo "✓ Modelo encontrado:"
ls -lh "$MODEL"
echo

echo "[3/6] Restaurando timeout da Kyara..."

if [ -f "$IA" ]; then

python3 - "$IA" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

s = s.replace(
    "const AI_TIMEOUT = Number(process.env.KYARA_AI_TIMEOUT || 25000);",
    "const AI_TIMEOUT = Number(process.env.KYARA_AI_TIMEOUT || 45000);"
)

s = s.replace(
    "const AI_TIMEOUT = Number(process.env.KYARA_AI_TIMEOUT || 20000);",
    "const AI_TIMEOUT = Number(process.env.KYARA_AI_TIMEOUT || 45000);"
)

p.write_text(s)

print("✓ Timeout restaurado para 45000ms")
PY

else
    echo "⚠️ ia.js não encontrado. Continuando..."
fi

echo
echo "[4/6] Verificando sintaxe..."

if [ -f "$IA" ]; then
    node --check "$IA"

    if [ $? -eq 0 ]; then
        echo "✓ ia.js OK"
    else
        echo "❌ Erro de sintaxe no ia.js"
        exit 1
    fi
fi

echo
echo "[5/6] Iniciando llama-server otimizado..."
echo

rm -f "$LOG"

nohup llama-server \
    -m "$MODEL" \
    --host 127.0.0.1 \
    --port 8080 \
    -c 2048 \
    --threads 4 \
    --threads-batch 4 \
    -np 1 \
    --no-warmup \
    > "$LOG" 2>&1 &

PID=$!

echo "PID: $PID"
echo "Log: $LOG"
echo

echo "Aguardando servidor..."

READY=0

for i in $(seq 1 60); do

    if curl -fsS --max-time 1 \
        http://127.0.0.1:8080/health \
        >/dev/null 2>&1; then

        READY=1
        echo
        echo "✓ llama-server está ONLINE."
        break
    fi

    if ! kill -0 "$PID" 2>/dev/null; then
        echo
        echo "❌ llama-server encerrou durante a inicialização."
        echo
        tail -80 "$LOG"
        exit 2
    fi

    printf "."
    sleep 1
done

echo

if [ "$READY" -ne 1 ]; then
    echo
    echo "❌ Servidor não ficou pronto."
    echo
    echo "===== LOG ====="
    tail -100 "$LOG"
    exit 3
fi

echo
echo "[6/6] TESTE DE INFERÊNCIA"
echo
echo "Pergunta: Oi"
echo "Máximo: 20 segundos"
echo

START=$(date +%s)

RESULT=$(curl -sS \
    --max-time 20 \
    -H 'Content-Type: application/json' \
    -d '{
        "prompt":"Responda somente: Oi!",
        "n_predict":4,
        "temperature":0.2,
        "top_k":20,
        "top_p":0.9,
        "repeat_penalty":1.1,
        "stream":false
    }' \
    http://127.0.0.1:8080/completion 2>&1)

STATUS=$?

END=$(date +%s)
ELAPSED=$((END - START))

echo
echo "Tempo: ${ELAPSED}s"
echo "Código: $STATUS"
echo
echo "Resposta:"
echo "$RESULT"

echo
echo "============================================================"

if [ "$STATUS" -eq 0 ] && echo "$RESULT" | grep -q '"content"'; then

    echo "              ✅ IA LOCAL FUNCIONANDO"
    echo "============================================================"
    echo
    echo "O llama-server conseguiu gerar uma resposta."
    echo
    echo "Configuração:"
    echo "  Modelo: Qwen 0.5B"
    echo "  Threads: 4"
    echo "  Contexto: 2048"
    echo "  Slots: 1"
    echo
    echo "Agora mantenha este terminal aberto"
    echo "e, em OUTRO terminal do Termux, rode:"
    echo
    echo "cd ~/storage/BKkyara-"
    echo "npm start"
    echo
    echo "Depois teste:"
    echo "Oi Kyara"
    echo

else

    echo "              ❌ INFERÊNCIA AINDA TRAVADA"
    echo "============================================================"
    echo
    echo "O servidor sobe, mas o modelo não está"
    echo "conseguindo gerar tokens."
    echo
    echo "Últimas linhas do log:"
    tail -100 "$LOG"
    echo

fi

echo "============================================================"

