#!/data/data/com.termux/files/usr/bin/bash
set -e

echo
echo "=============================================="
echo " 🌸 BKkyara • CORREÇÃO MENU ADAPTATIVO"
echo "=============================================="
echo

INDEX="dados/src/index.js"
MENU="dados/src/core/menuAdaptativo/menu-adaptativo.js"

if [ ! -f "$INDEX" ]; then
  echo "❌ index.js não encontrado."
  exit 1
fi

if [ ! -f "$MENU" ]; then
  echo "❌ menu-adaptativo.js não encontrado."
  exit 1
fi

echo "[1/6] Localizando backup da integração quebrada..."

BACKUP="$(ls -1t "$INDEX".backup-menu-adaptativo-integracao-* 2>/dev/null | head -n 1 || true)"

if [ -z "$BACKUP" ]; then
  echo "❌ Backup da integração não encontrado."
  exit 1
fi

echo "✅ Backup encontrado:"
echo "$BACKUP"
echo

echo "[2/6] Restaurando index.js original..."

cp "$BACKUP" "$INDEX"

echo "✅ index.js restaurado."
echo

echo "[3/6] Corrigindo o import no nível superior..."

node <<'NODE'
const fs = require('fs');

const file = 'dados/src/index.js';
let src = fs.readFileSync(file, 'utf8');

const importLine =
  "import { menuKyaraAdaptativo } from './core/menuAdaptativo/menu-adaptativo.js';";

if (!src.includes(importLine)) {
  const lines = src.split('\n');

  let insertAt = 0;

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s+/.test(lines[i])) {
      insertAt = i + 1;
    }
  }

  lines.splice(insertAt, 0, importLine);
  src = lines.join('\n');

  console.log('✅ Import inserido no topo do módulo.');
} else {
  console.log('ℹ️ Import já existe.');
}

fs.writeFileSync(file, src);
NODE

echo
echo "[4/6] Substituindo somente o case /menu..."

node <<'NODE'
const fs = require('fs');

const file = 'dados/src/index.js';
let src = fs.readFileSync(file, 'utf8');

const menuCaseRegex = /^[ \t]*case\s+['"]menu['"]\s*:/m;
const match = menuCaseRegex.exec(src);

if (!match) {
  throw new Error("case 'menu' não encontrado.");
}

const caseStart = match.index;
const afterStart = caseStart + match[0].length;
const rest = src.slice(afterStart);

const nextCaseRegex = /\n[ \t]*case\s+['"`][^'"`]+['"`]\s*:/;
const nextMatch = nextCaseRegex.exec(rest);

if (!nextMatch) {
  throw new Error("Próximo case não encontrado.");
}

const nextCaseStart = afterStart + nextMatch.index + 1;

const newCase = `case 'menu': {
  try {
    console.log('[MENU] Modo atual: adaptativo');
    console.log('[MENU] 🌸 Enviando MENU ADAPTATIVO...');

    const menuPushName =
      typeof pushName !== 'undefined' && pushName
        ? pushName
        : typeof pushname !== 'undefined' && pushname
          ? pushname
          : typeof senderName !== 'undefined' && senderName
            ? senderName
            : 'usuário';

    await menuKyaraAdaptativo(
      nazu,
      from,
      menuPushName,
      {
        isGroup: typeof isGroup !== 'undefined' ? isGroup : false,
        isAdmin: typeof isAdmin !== 'undefined' ? !!isAdmin : false,
        sender: typeof sender !== 'undefined' ? sender : null,
        command: 'menu'
      }
    );

    console.log('[MENU] ✅ Menu ADAPTATIVO enviado!');
  } catch (menuAdaptiveError) {
    console.warn(
      '[MENU] ⚠️ Falha no menu adaptativo:',
      menuAdaptiveError?.message || menuAdaptiveError
    );

    try {
      if (typeof reply === 'function') {
        await reply(
          '🌸 *BOT-KYARA*\\n\\n' +
          '⚠️ Não foi possível abrir o menu interativo agora.\\n' +
          'Use /help para visualizar os comandos.'
        );
      }
    } catch (fallbackError) {
      console.warn(
        '[MENU] fallback também falhou:',
        fallbackError?.message || fallbackError
      );
    }
  }
  break;
}

`;

src =
  src.slice(0, caseStart) +
  newCase +
  src.slice(nextCaseStart);

fs.writeFileSync(file, src);

console.log('✅ case /menu corrigido.');
NODE

echo
echo "[5/6] Verificando sintaxe..."

node --check "$MENU"
node --check "$INDEX"

echo "✅ Sintaxe do menu OK."
echo "✅ Sintaxe do index.js OK."
echo

echo "[6/6] Rodando teste..."

if [ -f "testar-menu-adaptativo.mjs" ]; then
  node testar-menu-adaptativo.mjs
else
  echo "ℹ️ testar-menu-adaptativo.mjs não encontrado."
fi

echo
echo "=============================================="
echo " ✅ CORREÇÃO CONCLUÍDA"
echo "=============================================="
echo
echo "Agora pode iniciar:"
echo
echo "  npm start"
echo
echo "Depois teste:"
echo
echo "  /menu"
echo
echo "Log esperado:"
echo
echo "  [MENU] Modo atual: adaptativo"
echo "  [MENU] 🌸 Enviando MENU ADAPTATIVO..."
echo "  [MENU] ✅ Menu ADAPTATIVO enviado!"
echo
echo "=============================================="
