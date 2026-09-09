#!/data/data/com.termux/files/usr/bin/bash
set -e

cd "$(dirname "$0")"

echo "=========================================="
echo "   🔧 DIAGNÓSTICO DA KYARA"
echo "=========================================="
echo

echo "📁 Projeto:"
pwd
echo

echo "🔎 Verificando arquivos principais..."
echo

FILES=(
  "dados/src/index.js"
  "dados/src/utils/database.js"
  "dados/src/features/weeklyLevel.js"
  "dados/src/features/themeStickers.js"
)

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ $f"
    exit 1
  fi
done

echo
echo "🔎 Verificando Node..."
node --version
echo

echo "🔎 Verificando sintaxe dos arquivos..."
echo

for f in "${FILES[@]}"; do
  node --check "$f"
  echo "  ✅ Sintaxe: $f"
done

echo
echo "=========================================="
echo "✅ DIAGNÓSTICO CONCLUÍDO"
echo "=========================================="
echo
echo "Nenhum arquivo foi alterado."
