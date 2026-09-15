#!/data/data/com.termux/files/usr/bin/bash
set -e

echo
echo "=============================================="
echo " 🌸 BKkyara • CORREÇÃO FINAL DO MENU"
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

echo "[1/5] Fazendo backup do estado atual..."
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$INDEX.backup-menu-final-$STAMP"
cp "$INDEX" "$BACKUP"
echo "✅ Backup: $BACKUP"
echo

echo "[2/5] Removendo qualquer import incorreto do menu..."

node <<'NODE'
const fs = require('fs');

const file = 'dados/src/index.js';
let src = fs.readFileSync(file, 'utf8');

const importRegex =
  /^[ \t]*import\s*\{\s*menuKyaraAdaptativo\s*\}\s*from\s*['"]\.\/core\/menuAdaptativo\/menu-adaptativo\.js['"];\s*\r?\n?/gm;

const before = src;
src = src.replace(importRegex, '');

if (src !== before) {
  console.log('✅ Import incorreto removido.');
} else {
  console.log('ℹ️ Nenhum import incorreto encontrado.');
}

fs.writeFileSync(file, src);
NODE

echo
echo "[3/5] Instalando carregamento dinâmico dentro do /menu..."

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
  throw new Error("Próximo case depois de /menu não encontrado.");
}

const nextCaseStart = afterStart + nextMatch.index + 1;

const newCase = `case 'menu': {
  try {
    console.log('[MENU] Modo atual: adaptativo');
    console.log('[MENU] 🌸 Carregando menu adaptativo...');

    const {
      menuKyaraAdaptativo
    } = await import('./core/menuAdaptativo/menu-adaptativo.js');

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
        isGroup: typeof isGroup !== 'undefined' ? !!isGroup : false,
        isAdmin: typeof isAdmin !== 'undefined' ? !!isAdmin : false,
        sender: typeof sender !== 'undefined' ? sender : null,
        command: 'menu'
      }
    );

    console.log('[MENU] ✅ Menu ADAPTATIVO enviado!');
  } catch (menuAdaptiveError) {
    console.warn(
      '[MENU] ⚠️ Menu adaptativo falhou:',
      menuAdaptiveError?.message || menuAdaptiveError
    );

    try {
      if (typeof reply === 'function') {
        await reply(
          '🌸 *BOT-KYARA*\\n\\n' +
          '⚠️ O menu interativo não pôde ser aberto.\\n' +
          'Use /help para visualizar os comandos.'
        );
      }
    } catch (fallbackError) {
      console.warn(
        '[MENU] ⚠️ Fallback também falhou:',
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

console.log('✅ case /menu substituído.');
NODE

echo
echo "[4/5] Verificando sintaxe..."

node --check "$MENU"
node --check "$INDEX"

echo "✅ menu-adaptativo.js OK"
echo "✅ index.js OK"
echo

echo "[5/5] Testando..."

if [ -f "testar-menu-adaptativo.mjs" ]; then
  node testar-menu-adaptativo.mjs
else
  echo "ℹ️ Teste externo não encontrado."
fi

echo
echo "=============================================="
echo " ✅ CORREÇÃO FINAL CONCLUÍDA"
echo "=============================================="
echo
echo "Agora execute:"
echo
echo "  npm start"
echo
echo "Depois envie:"
echo
echo "  /menu"
echo
echo "O log esperado é:"
echo
echo "  [MENU] Modo atual: adaptativo"
echo "  [MENU] 🌸 Carregando menu adaptativo..."
echo "  [MENU] ✅ Menu ADAPTATIVO enviado!"
echo
echo "Backup desta tentativa:"
echo "  $BACKUP"
echo
echo "=============================================="
