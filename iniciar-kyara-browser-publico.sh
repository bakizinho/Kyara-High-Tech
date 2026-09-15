#!/data/data/com.termux/files/usr/bin/bash

cd ~/storage/BKkyara- || exit 1

PORT=3000
URL_FILE="dados/.kyara-browser-public-url"
LOG_DIR="dados/logs"
SERVER_LOG="$LOG_DIR/kyara-browser-server.log"
CF_LOG="$LOG_DIR/cloudflared-browser.log"

mkdir -p "$LOG_DIR"

echo "🚀 KYARA BROWSER HTTPS"
echo "📁 $(pwd)"
echo

echo "🧪 Testando API local..."

if curl -sS --connect-timeout 3 \
  "http://127.0.0.1:$PORT/api/browser/search?query=minecraft" \
  >/dev/null 2>&1
then
  echo "✅ API local já está funcionando."
else
  echo "▶️ API não está rodando."
  echo "▶️ Iniciando server.mjs..."

  nohup node dados/api/server.mjs \
    > "$SERVER_LOG" 2>&1 &

  SERVER_PID=$!

  echo "PID do server: $SERVER_PID"

  OK=""

  for n in $(seq 1 20); do
    sleep 1

    if curl -sS --connect-timeout 2 \
      "http://127.0.0.1:$PORT/api/browser/search?query=minecraft" \
      >/dev/null 2>&1
    then
      OK="yes"
      break
    fi
  done

  if [ "$OK" != "yes" ]; then
    echo
    echo "❌ server.mjs não respondeu."
    echo
    tail -50 "$SERVER_LOG" 2>/dev/null || true
    exit 1
  fi

  echo "✅ API local iniciou corretamente."
fi

echo
echo "☁️ Verificando cloudflared..."

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "❌ cloudflared não encontrado."
  exit 1
fi

echo "✅ $(cloudflared --version 2>&1 | head -1)"

echo
echo "☁️ Criando túnel HTTPS..."

rm -f "$URL_FILE"
: > "$CF_LOG"

nohup cloudflared tunnel \
  --url "http://127.0.0.1:$PORT" \
  --protocol http2 \
  --no-autoupdate \
  > "$CF_LOG" 2>&1 &

CF_PID=$!

echo "☁️ PID cloudflared: $CF_PID"
echo "⏳ Aguardando URL..."

PUBLIC_URL=""

for n in $(seq 1 45); do
  sleep 1

  PUBLIC_URL="$(
    grep -oE 'https://[A-Za-z0-9.-]+\.trycloudflare\.com' \
      "$CF_LOG" 2>/dev/null |
    head -1 |
    tr -d '\r'
  )"

  if [ -n "$PUBLIC_URL" ]; then
    echo "✅ URL detectada após ${n}s."
    break
  fi
done

if [ -z "$PUBLIC_URL" ]; then
  echo
  echo "❌ URL do Cloudflare não foi detectada."
  echo
  echo "📄 LOG:"
  tail -100 "$CF_LOG"
  exit 1
fi

if ! kill -0 "$CF_PID" 2>/dev/null; then
  echo
  echo "❌ cloudflared encerrou."
  echo
  tail -100 "$CF_LOG"
  exit 1
fi

printf '%s\n' "$PUBLIC_URL" > "$URL_FILE"

echo
echo "════════════════════════════════════════"
echo "🎉 KYARA BROWSER HTTPS ONLINE"
echo "════════════════════════════════════════"
echo
echo "🌐 URL:"
echo "$PUBLIC_URL"
echo
echo "💾 URL salva:"
echo "$URL_FILE"
echo
echo "☁️ PID:"
echo "$CF_PID"
echo "════════════════════════════════════════"

echo
echo "⏳ Aguardando o endereço ficar acessível..."

HTTP_CODE="000"

for n in $(seq 1 15); do

  HTTP_CODE="$(
    curl -L \
      -sS \
      --connect-timeout 5 \
      --max-time 10 \
      -o /dev/null \
      -w '%{http_code}' \
      "$PUBLIC_URL/api/browser/search?query=minecraft" \
      2>/dev/null || true
  )"

  echo "Tentativa $n/15 → HTTP $HTTP_CODE"

  if [ "$HTTP_CODE" = "200" ]; then
    break
  fi

  sleep 3
done

echo

if [ "$HTTP_CODE" != "200" ]; then
  echo "⚠️ Túnel criado, mas a API pública ainda não respondeu 200."
  echo
  echo "Isso pode ser apenas propagação inicial do Quick Tunnel."
  echo
  echo "🌐 URL:"
  echo "$PUBLIC_URL"
  echo
  echo "📄 Últimas linhas do log:"
  tail -30 "$CF_LOG"
  echo
  echo "☁️ NÃO encerre o processo cloudflared."
  echo
  exit 1
fi

echo "✅ API pública funcionando."
echo
echo "════════════════════════════════════════"
echo "✅ TUDO PRONTO"
echo "════════════════════════════════════════"
echo
echo "🌐 $PUBLIC_URL"
echo
echo "Em outra sessão:"
echo
echo "cd ~/storage/BKkyara- && node ."
echo
echo "Depois no WhatsApp:"
echo
echo "/browser minecraft"
echo

