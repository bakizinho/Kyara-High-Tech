#!/data/data/com.termux/files/usr/bin/bash

set -e

IA="$HOME/storage/BKkyara-/dados/src/funcs/private/ia.js"

echo
echo "============================================================"
echo "             KYARA — OTIMIZAÇÃO DA IA LOCAL"
echo "============================================================"
echo

if [ ! -f "$IA" ]; then
    echo "❌ ia.js não encontrado:"
    echo "$IA"
    exit 1
fi

BACKUP="$HOME/storage/BKkyara-/backup-ia-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

cp "$IA" "$BACKUP/ia.js"

echo "✓ Backup:"
echo "$BACKUP"
echo

python3 - "$IA" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

old = "const AI_TIMEOUT = Number(process.env.KYARA_AI_TIMEOUT || 45000);"
new = "const AI_TIMEOUT = Number(process.env.KYARA_AI_TIMEOUT || 25000);"

if old in s:
    s = s.replace(old, new, 1)
    print("✓ Timeout da IA: 45000ms -> 25000ms")
elif new in s:
    print("✓ Timeout já está em 25000ms")
else:
    raise SystemExit(
        "❌ Não encontrei a configuração AI_TIMEOUT."
    )

p.write_text(s)
PY

echo
echo "[1/4] Sintaxe..."
node --check "$IA"
echo "✓ ia.js OK"

echo
echo "[2/4] Verificando llama-server..."
if ! command -v llama-server >/dev/null 2>&1; then
    echo "❌ llama-server não está instalado."
    exit 2
fi

echo "✓ $(command -v llama-server)"

echo
echo "[3/4] Verificando porta 8080..."

if ! curl -fsS --max-time 3 \
    http://127.0.0.1:8080/health \
    >/tmp/kyara_health 2>/dev/null; then

    echo "❌ llama-server não está respondendo em 127.0.0.1:8080."
    echo
    echo "Inicie o servidor da IA primeiro."
    echo
    exit 3
fi

echo "✓ llama-server respondendo:"
cat /tmp/kyara_health
rm -f /tmp/kyara_health

echo
echo "[4/4] TESTE REAL DA IA..."
echo
echo "Pergunta: Oi Kyara"
echo "Limite: 20 segundos"
echo

START=$(date +%s)

RESULT="$(curl -sS \
    --max-time 20 \
    -H 'Content-Type: application/json' \
    -d '{
        "prompt":"Você é Kyara, uma assistente brasileira. Responda de forma curta, natural e amigável. Usuário: Oi Kyara\nAssistente:",
        "n_predict":32,
        "temperature":0.7,
        "top_k":20,
        "top_p":0.9,
        "repeat_penalty":1.1,
        "stream":false
    }' \
    http://127.0.0.1:8080/completion 2>&1)" || true

END=$(date +%s)
ELAPSED=$((END - START))

echo
echo "Tempo: ${ELAPSED}s"
echo

if echo "$RESULT" | grep -q '"content"'; then

    echo "============================================================"
    echo "                 ✅ IA RESPONDEU"
    echo "============================================================"
    echo
    echo "Resposta recebida:"
    echo "$RESULT"
    echo
    echo "Tempo total: ${ELAPSED}s"
    echo
    echo "A Kyara já consegue conversar com o llama-server."
    echo
    echo "Agora execute:"
    echo
    echo "npm start"
    echo
    echo "E teste:"
    echo "Oi Kyara"
    echo
    echo "============================================================"

else

    echo "============================================================"
    echo "                 ❌ IA NÃO RESPONDEU"
    echo "============================================================"
    echo
    echo "Resposta do servidor:"
    echo "$RESULT"
    echo
    echo "Isso indica problema no llama-server/modelo,"
    echo "não no WhatsApp."
    echo
    echo "Verifique também:"
    echo
    echo "cat ~/kyara-llama-server.log"
    echo
    echo "============================================================"

    exit 4
fi

