#!/data/data/com.termux/files/usr/bin/bash

set -u

echo
echo "============================================================"
echo "              KYARA — ATIVAR IA LOCAL"
echo "============================================================"
echo

MODEL_NAME="qwen2.5-0.5b-instruct-q4_k_m.gguf"
HOST="127.0.0.1"
PORT="8080"
URL="http://${HOST}:${PORT}"
LOG="$HOME/kyara-llama-server.log"

echo "[1/7] Verificando comandos..."
echo

if ! command -v curl >/dev/null 2>&1; then
    echo "⚠️ curl não encontrado."
    echo "Instalando..."
    pkg install curl -y || {
        echo "❌ Não foi possível instalar curl."
        exit 1
    }
fi

if ! command -v llama-server >/dev/null 2>&1; then
    echo "❌ llama-server NÃO está instalado."
    echo
    echo "A IA da Kyara usa llama-server."
    echo "O código da IA já está preparado para ele."
    echo
    echo "Primeiro precisamos instalar/preparar o llama.cpp."
    echo
    echo "Não vou alterar o código da Kyara automaticamente."
    echo
    exit 2
fi

echo "✓ llama-server encontrado:"
command -v llama-server

echo
echo "Versão:"
llama-server --version 2>&1 | head -5 || true

echo
echo "[2/7] Procurando o modelo:"
echo "$MODEL_NAME"
echo

MODEL=""

CANDIDATES="
$HOME/kyara-ai/models/$MODEL_NAME
$HOME/kyara-ai/$MODEL_NAME
$HOME/models/$MODEL_NAME
$HOME/model/$MODEL_NAME
$HOME/llama/models/$MODEL_NAME
$HOME/storage/shared/$MODEL_NAME
$HOME/storage/downloads/$MODEL_NAME
/sdcard/Download/$MODEL_NAME
"

for FILE in $CANDIDATES; do
    if [ -f "$FILE" ]; then
        MODEL="$FILE"
        break
    fi
done

if [ -z "$MODEL" ]; then
    echo "🔎 Busca adicional..."
    MODEL="$(find "$HOME" "$HOME/storage" /sdcard/Download \
        -type f \
        -name "$MODEL_NAME" \
        2>/dev/null | head -1)"
fi

if [ -z "$MODEL" ]; then
    echo
    echo "❌ MODELO NÃO ENCONTRADO."
    echo
    echo "A Kyara espera:"
    echo "$MODEL_NAME"
    echo
    echo "Sem o arquivo GGUF o llama-server não consegue iniciar."
    echo
    echo "IMPORTANTE:"
    echo "Não vou baixar um modelo aleatório nem substituir"
    echo "o modelo configurado automaticamente."
    echo
    echo "Coloque o GGUF em:"
    echo "$HOME/kyara-ai/models/"
    echo
    echo "Depois execute novamente:"
    echo
    echo "bash ativar_ia_kyara.sh"
    echo
    exit 3
fi

echo "✓ Modelo encontrado:"
echo "$MODEL"

echo
echo "Tamanho:"
du -h "$MODEL" 2>/dev/null || true

echo
echo "[3/7] Verificando servidor existente..."
echo

if curl -fsS --max-time 3 "$URL/health" >/tmp/kyara_ai_health 2>/dev/null; then
    echo "✓ llama-server já está respondendo."
    echo
    cat /tmp/kyara_ai_health
    rm -f /tmp/kyara_ai_health
    exit 0
fi

rm -f /tmp/kyara_ai_health

if pgrep -af "llama-server" >/dev/null 2>&1; then
    echo "⚠️ Existe um llama-server, mas ele não responde em $URL"
    echo
    pgrep -af "llama-server"
    echo
    echo "Não vou matar o processo automaticamente."
    echo "Verifique o log:"
    echo "$LOG"
    exit 4
fi

echo "✓ Nenhum servidor conflitante encontrado."

echo
echo "[4/7] Verificando porta $PORT..."
echo

if command -v ss >/dev/null 2>&1; then
    if ss -ltn 2>/dev/null | grep -q ":$PORT "; then
        echo "❌ A porta $PORT já está ocupada."
        ss -ltn 2>/dev/null | grep ":$PORT " || true
        exit 5
    fi
fi

echo "✓ Porta disponível."

echo
echo "[5/7] Iniciando llama-server..."
echo

mkdir -p "$HOME/kyara-ai/models"

rm -f "$LOG"

echo "Modelo : $MODEL"
echo "Host   : $HOST"
echo "Porta  : $PORT"
echo "Log    : $LOG"
echo

nohup llama-server \
    -m "$MODEL" \
    --host "$HOST" \
    --port "$PORT" \
    -c 4096 \
    -ngl 0 \
    --threads "$(nproc 2>/dev/null || echo 4)" \
    --threads-batch "$(nproc 2>/dev/null || echo 4)" \
    >"$LOG" 2>&1 &

PID=$!

echo "PID: $PID"

echo
echo "[6/7] Aguardando o modelo carregar..."
echo

READY=0

for i in $(seq 1 120); do

    if ! kill -0 "$PID" 2>/dev/null; then
        echo
        echo "❌ llama-server encerrou."
        echo
        echo "================ LOG ================"
        tail -100 "$LOG" 2>/dev/null || true
        echo "======================================"
        exit 6
    fi

    HEALTH="$(curl -s --max-time 2 "$URL/health" 2>/dev/null || true)"

    if echo "$HEALTH" | grep -q '"status":"ok"'; then
        READY=1
        break
    fi

    if [ $((i % 5)) -eq 0 ]; then
        echo
        echo "⏳ ${i}s — carregando modelo..."
    else
        printf "."
    fi

    sleep 1
done

echo

if [ "$READY" -ne 1 ]; then
    echo
    echo "❌ O servidor não ficou pronto."
    echo
    echo "================ LOG ================"
    tail -120 "$LOG" 2>/dev/null || true
    echo "======================================"
    exit 7
fi

echo
echo "[7/7] Teste final..."
echo

HEALTH="$(curl -s --max-time 5 "$URL/health" 2>/dev/null || true)"

if echo "$HEALTH" | grep -q '"status":"ok"'; then

    echo "============================================================"
    echo "              ✅ IA DA KYARA ONLINE"
    echo "============================================================"
    echo
    echo "Servidor : llama-server"
    echo "Modelo   : $MODEL_NAME"
    echo "URL      : $URL"
    echo "PID      : $PID"
    echo
    echo "Health:"
    echo "$HEALTH"
    echo
    echo "Log:"
    echo "$LOG"
    echo
    echo "Agora deixe este processo rodando."
    echo "Em outro terminal, entre no bot e execute:"
    echo
    echo "cd ~/storage/BKkyara-"
    echo "npm start"
    echo
    echo "Depois teste no WhatsApp:"
    echo
    echo "Oi Kyara"
    echo
    echo "============================================================"

else

    echo "❌ Healthcheck falhou."
    echo
    tail -100 "$LOG" 2>/dev/null || true
    exit 8

fi

