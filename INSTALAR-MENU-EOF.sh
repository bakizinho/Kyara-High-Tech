#!/data/data/com.termux/files/usr/bin/bash

set -e

echo "=========================================="
echo " KYARA • MENU ADAPTATIVO"
echo " INSTALAÇÃO EOF"
echo "=========================================="

cd "$(dirname "$0")"

mkdir -p dados/src/core/menuAdaptativo
mkdir -p config

echo "[1/4] Arquivos criados."

if [ ! -f package.json ]; then
  echo "[ERRO] package.json não encontrado."
  exit 1
fi

echo "[2/4] Verificando Node..."

if ! command -v node >/dev/null 2>&1; then
  echo "[ERRO] Node.js não encontrado."
  exit 1
fi

echo "[3/4] Node: $(node --version)"

node --check \
  dados/src/core/menuAdaptativo/menu-adaptativo.js

node --check \
  testar-menu-adaptativo.mjs

echo "[4/4] Executando testes..."

node testar-menu-adaptativo.mjs

echo
echo "=========================================="
echo " INSTALAÇÃO CONCLUÍDA"
echo "=========================================="
echo
echo "Arquivo:"
echo "dados/src/core/menuAdaptativo/menu-adaptativo.js"
echo
echo "Configuração:"
echo "config/menu-adaptativo.json"
echo
echo "Teste:"
echo "node testar-menu-adaptativo.mjs"
echo
echo "=========================================="
