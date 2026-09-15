#!/data/data/com.termux/files/usr/bin/bash
set -e

cd ~/storage/BKkyara-

echo "🎮 Instalando KYARA GAMES..."

STAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "dados/backup-kyara-games-$STAMP"

cp -f dados/src/features/kyaraBrowser.js \
"dados/backup-kyara-games-$STAMP/kyaraBrowser.js" 2>/dev/null || true

cp -f dados/src/features/kyaraSpecialCommands.js \
"dados/backup-kyara-games-$STAMP/kyaraSpecialCommands.js" 2>/dev/null || true

TMP=$(mktemp -d)

trap 'rm -rf "$TMP"' EXIT

echo "📦 Preparando arquivos dos jogos..."

# O pacote KYARA GAMES deve estar em:
# /mnt/data/KYARA-GAMES-RICH-PATCH.zip
#
# Se você estiver executando no próprio Termux,
# coloque o ZIP nesta pasta antes de continuar.

if [ -f "/mnt/data/KYARA-GAMES-RICH-PATCH.zip" ]; then

    cp "/mnt/data/KYARA-GAMES-RICH-PATCH.zip" \
       "$TMP/kyara-games.zip"

elif [ -f "./KYARA-GAMES-RICH-PATCH.zip" ]; then

    cp "./KYARA-GAMES-RICH-PATCH.zip" \
       "$TMP/kyara-games.zip"

else

    echo ""
    echo "❌ Pacote KYARA-GAMES-RICH-PATCH.zip não encontrado."
    echo ""
    echo "Coloque o ZIP em:"
    echo "~/storage/BKkyara-/KYARA-GAMES-RICH-PATCH.zip"
    echo ""
    exit 1

fi

echo "📂 Extraindo jogos..."

unzip -oq \
  "$TMP/kyara-games.zip" \
  -d .

echo "🔎 Verificando JavaScript..."

node --check \
  dados/src/features/kyaraBrowser.js

node --check \
  dados/src/features/kyaraSpecialCommands.js

node --check \
  dados/src/features/kyaraGames/index.js

for f in dados/src/features/kyaraGames/*.js
do

    node --check "$f"

done

echo ""
echo "=========================================="
echo "       🎮 KYARA GAMES INSTALADO"
echo "=========================================="
echo ""

echo "🦖 /jogo"
echo "🦖 /dino"
echo "🐍 /snake"
echo "❌ /xo"
echo "🏓 /pong"
echo "🧱 /breakout"
echo "🔢 /2048"
echo "🎹 /piano"
echo "🎰 /slots"

echo ""
echo "✅ Todos os arquivos foram instalados."
echo ""
echo "🚀 Agora execute:"
echo ""
echo "node ."
echo ""

