#!/data/data/com.termux/files/usr/bin/bash

set -u

MODEL="$HOME/kyara-ai/models/qwen2.5-0.5b-instruct-q4_k_m.gguf"
HOST="127.0.0.1"
PORT="8080"
LOG="$HOME/kyara-llama-server.log"

echo "══════════════════════════════════════════════"
echo "🧠 INICIANDO IA LOCAL DA KYARA"
echo "══════════════════════════════════════════════"

if [ ! -f "$MODEL" ]; then
    echo "❌ Modelo não encontrado:"
    echo "$MODEL"
    exit 1
fi

echo "✅ Modelo encontrado:"
echo "$MODEL"

if pgrep -af "llama-server" >/dev/null 2>&1; then
    echo
    echo "⚠️ llama-server já está rodando:"
    pgrep -af "llama-server"
    exit 0
fi

if ss -ltn 2>/dev/null | grep -q ":$PORT "; then
    echo "⚠️ A porta $PORT já está ocupada:"
    ss -ltn 2>/dev/null | grep ":$PORT "
    exit 1
fi

rm -f "$LOG"

echo
echo "🚀 Iniciando llama-server..."
echo "📍 http://$HOST:$PORT"
echo "🧠 Qwen 2.5 0.5B Instruct Q4_K_M"
echo "⚙️ CPU / 8 threads"
echo "⏳ Tempo máximo de inicialização: 120 segundos"
echo

nohup llama-server \
    -m "$MODEL" \
    --host "$HOST" \
    --port "$PORT" \
    -c 4096 \
    -ngl 0 \
    > "$LOG" 2>&1 &

PID=$!

echo "PID: $PID"
echo "Log: $LOG"
echo
echo "⏳ Carregando modelo..."

OK=0
HEALTH=""

for i in $(seq 1 120); do

    if ! kill -0 "$PID" 2>/dev/null; then
        echo
        echo "❌ llama-server encerrou durante a inicialização."
        echo
        echo "════════ LOG ════════"
        tail -120 "$LOG"
        echo "═════════════════════"
        exit 1
    fi

    HEALTH="$(curl -s --max-time 2 "http://$HOST:$PORT/health" 2>/dev/null || true)"

    if echo "$HEALTH" | grep -q '"status":"ok"'; then
        OK=1
        break
    fi

    if [ $((i % 5)) -eq 0 ]; then
        echo
        echo "⏱️ ${i}s — ainda carregando..."
        tail -3 "$LOG" 2>/dev/null || true
    else
        printf "."
    fi

    sleep 1
done

echo

if [ "$OK" -eq 1 ]; then
    echo
    echo "══════════════════════════════════════════════"
    echo "✅ LLAMA-SERVER ONLINE"
    echo "══════════════════════════════════════════════"
    echo
    echo "PID: $PID"
    echo "URL: http://$HOST:$PORT"
    echo
    echo "Health:"
    echo "$HEALTH"
    echo
    echo "🧠 IA local da Kyara está pronta."
    echo
    echo "📊 Processo:"
    pgrep -af "llama-server" || true
    echo
    echo "📡 Porta:"
    ss -ltn 2>/dev/null | grep ":$PORT " || true
    echo
    echo "📝 Log:"
    echo "$LOG"
    exit 0
fi

echo
echo "❌ Servidor não ficou pronto em 120 segundos."
echo
echo "════════ ÚLTIMAS LINHAS DO LOG ════════"
tail -120 "$LOG"
echo "══════════════════════════════════════"
exit 1
