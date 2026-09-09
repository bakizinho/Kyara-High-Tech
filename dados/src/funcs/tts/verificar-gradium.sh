#!/data/data/com.termux/files/usr/bin/bash

echo "=== GRADIUM ==="

if [ -n "$GRADIUM_API_KEY" ]; then
  echo "✅ GRADIUM_API_KEY encontrada no ambiente"
  echo "Tamanho: ${#GRADIUM_API_KEY} caracteres"
else
  echo "❌ GRADIUM_API_KEY NÃO encontrada no ambiente"
fi

if [ -n "$GRADIUM_KEY" ]; then
  echo "✅ GRADIUM_KEY encontrada no ambiente"
  echo "Tamanho: ${#GRADIUM_KEY} caracteres"
fi

echo
echo "=== VOICE ID ==="
echo "KgC2Nqnjj48NUiyV"

echo
echo "=== NODE ==="
node --input-type=module <<'NODE'
console.log(
  process.env.GRADIUM_API_KEY
    ? `✅ Node recebeu GRADIUM_API_KEY (${process.env.GRADIUM_API_KEY.length} caracteres)`
    : '❌ Node NÃO recebeu GRADIUM_API_KEY'
);
NODE
