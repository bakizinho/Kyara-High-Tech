#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo
echo "╭━━━〔 KYARA • TTS LOCAL 〕━━━╮"
echo "┃"
echo "┃ Nenhuma API é necessária."
echo "┃ Nenhum crédito é necessário."
echo "┃"
echo "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"
echo

echo "🔎 Verificando eSpeak..."

if ! command -v espeak-ng >/dev/null 2>&1 &&
   ! command -v espeak >/dev/null 2>&1; then
  echo "📦 Instalando espeak..."
  pkg install -y espeak
fi

echo
echo "🔎 Verificando FFmpeg..."

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "📦 Instalando ffmpeg..."
  pkg install -y ffmpeg
fi

echo
echo "=============================================="
echo "✅ KYARA TTS LOCAL PRONTO"
echo "=============================================="
echo "eSpeak: $(command -v espeak-ng 2>/dev/null || command -v espeak)"
echo "FFmpeg: $(command -v ffmpeg)"
echo "API: nenhuma"
echo
echo "Vozes:"
echo "  kyara"
echo "  sukuna"
echo "  gojo"
echo "  vegeta"
echo "  naruto"
echo "  feminina"
echo "  masculina"
echo "=============================================="
