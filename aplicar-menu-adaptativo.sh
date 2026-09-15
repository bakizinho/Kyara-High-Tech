#!/data/data/com.termux/files/usr/bin/bash

set -e

ROOT="$(pwd)"
INDEX="$ROOT/dados/src/index.js"
MENU="$ROOT/dados/src/core/menuAdaptativo/menu-adaptativo.js"
CONFIG="$ROOT/config/menu-adaptativo.json"
BACKUP="$ROOT/dados/src/index.js.backup-menu-adaptativo-$(date +%Y%m%d-%H%M%S)"

echo
echo "=============================================="
echo " 🌸 BKkyara • APLICADOR MENU ADAPTATIVO"
echo " =============================================="
echo

if [ ! -f "$INDEX" ]; then
  echo "❌ index.js não encontrado:"
  echo "$INDEX"
  exit 1
fi

if [ ! -f "$MENU" ]; then
  echo "❌ menu-adaptativo.js não encontrado:"
  echo "$MENU"
  exit 1
fi

echo "✅ Projeto encontrado."
echo "✅ Menu adaptativo encontrado."

echo
echo "[1/6] Criando backup..."

cp "$INDEX" "$BACKUP"

echo "✅ Backup:"
echo "$BACKUP"

echo
echo "[2/6] Verificando módulo..."

node --check "$MENU"

echo "✅ Sintaxe do menu OK."

echo
echo "[3/6] Verificando index.js..."

node --check "$INDEX"

echo "✅ Sintaxe do index.js OK."

echo
echo "[4/6] Verificando integração existente..."

if grep -q "menuKyaraAdaptativo" "$INDEX"; then
  echo "✅ menuKyaraAdaptativo já está integrado."
else
  echo "ℹ️ menuKyaraAdaptativo ainda não aparece no index.js."
  echo "ℹ️ O projeto será preparado sem substituir o roteador existente."
fi

if grep -q "interactiveResponseMessage" "$INDEX"; then
  echo "✅ index.js já possui tratamento Native Flow."
else
  echo "⚠️ Tratamento Native Flow não encontrado."
fi

if grep -q "getMessageText" "$INDEX"; then
  echo "✅ getMessageText encontrado."
else
  echo "⚠️ getMessageText não encontrado."
fi

echo
echo "[5/6] Criando adaptador seguro..."

cat > "$ROOT/dados/src/core/menuAdaptativo/index.js" <<'EOF2'
import {
  menuKyaraAdaptativo,
  getInteractiveCommand,
  isOwner
} from './menu-adaptativo.js'

/*
 * Adaptador do Menu Adaptativo da Kyara.
 *
 * IMPORTANTE:
 * O BKkyara já possui um processador central de mensagens.
 * Por isso este módulo NÃO registra outro messages.upsert.
 *
 * Isso evita:
 * - comando duplicado
 * - menu duplicado
 * - processamento duplo de botões
 * - loops entre listeners
 */

async function abrirMenuAdaptativo(
  sock,
  jid,
  pushName = 'usuário',
  options = {}
) {
  return await menuKyaraAdaptativo(
    sock,
    jid,
    pushName,
    options
  )
}

function lerCliqueAdaptativo(message) {
  return getInteractiveCommand(message)
}

function usuarioEhOwner(jid) {
  return isOwner(jid)
}

export {
  abrirMenuAdaptativo,
  lerCliqueAdaptativo,
  usuarioEhOwner
}
EOF2

echo "✅ Adaptador criado."

echo
echo "[6/6] Executando testes..."

node --check \
  "$ROOT/dados/src/core/menuAdaptativo/index.js"

node --check \
  "$ROOT/dados/src/core/menuAdaptativo/menu-adaptativo.js"

if [ -f "$ROOT/testar-menu-adaptativo.mjs" ]; then
  node "$ROOT/testar-menu-adaptativo.mjs"
else
  echo "⚠️ Arquivo de teste não encontrado."
fi

node --check "$INDEX"

echo
echo "=============================================="
echo " ✅ APLICAÇÃO CONCLUÍDA"
echo "=============================================="
echo
echo "📂 Menu:"
echo "dados/src/core/menuAdaptativo/menu-adaptativo.js"
echo
echo "📂 Adaptador:"
echo "dados/src/core/menuAdaptativo/index.js"
echo
echo "📂 Config:"
echo "config/menu-adaptativo.json"
echo
echo "📦 Backup:"
echo "$BACKUP"
echo
echo "=============================================="
echo " IMPORTANTE"
echo "=============================================="
echo
echo "O index.js já possui processamento de"
echo "interactiveResponseMessage."
echo
echo "Por isso NÃO foi instalado um segundo"
echo "messages.upsert para evitar duplicação."
echo
echo "O clique Native Flow deve cair no seu"
echo "roteador existente como comando."
echo
echo "Teste:"
echo "node testar-menu-adaptativo.mjs"
echo
echo "=============================================="
