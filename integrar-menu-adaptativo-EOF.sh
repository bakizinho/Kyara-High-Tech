#!/data/data/com.termux/files/usr/bin/bash
set -e

echo
echo "=============================================="
echo " 🌸 BKkyara • INTEGRAÇÃO MENU ADAPTATIVO"
echo "=============================================="
echo

ROOT="$(pwd)"
INDEX="$ROOT/dados/src/index.js"
MENU="$ROOT/dados/src/core/menuAdaptativo/menu-adaptativo.js"

if [ ! -f "$INDEX" ]; then
  echo "❌ Não encontrei:"
  echo "$INDEX"
  exit 1
fi

if [ ! -f "$MENU" ]; then
  echo "❌ Não encontrei:"
  echo "$MENU"
  exit 1
fi

echo "✅ Projeto encontrado."
echo "✅ Menu adaptativo encontrado."
echo

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$INDEX.backup-menu-adaptativo-integracao-$STAMP"

echo "[1/5] Criando backup..."
cp "$INDEX" "$BACKUP"
echo "✅ Backup:"
echo "$BACKUP"
echo

echo "[2/5] Verificando menu adaptativo..."
node --check "$MENU"
echo "✅ Sintaxe do menu OK."
echo

echo "[3/5] Integrando no index.js..."

node <<'NODE'
const fs = require('fs');

const file = 'dados/src/index.js';
const menuFile = 'dados/src/core/menuAdaptativo/menu-adaptativo.js';

let src = fs.readFileSync(file, 'utf8');
const menu = fs.readFileSync(menuFile, 'utf8');

if (!/export\s*\{[\s\S]*menuKyaraAdaptativo|export\s+(async\s+)?function\s+menuKyaraAdaptativo|export\s+const\s+menuKyaraAdaptativo/.test(menu)) {
  throw new Error('menuKyaraAdaptativo não foi encontrado/exportado no módulo.');
}

/*
 * 1. Adiciona o import somente se ainda não existir.
 */
const importLine =
  "import { menuKyaraAdaptativo } from './core/menuAdaptativo/menu-adaptativo.js';";

if (!src.includes("from './core/menuAdaptativo/menu-adaptativo.js'")) {
  const lines = src.split('\n');

  let insertAt = 0;

  // Mantém imports juntos: coloca depois do último import existente.
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s+/.test(lines[i])) {
      insertAt = i + 1;
    }
  }

  lines.splice(insertAt, 0, importLine);
  src = lines.join('\n');

  console.log('✅ Import do menu adaptativo adicionado.');
} else {
  console.log('ℹ️ Import do menu adaptativo já existia.');
}

/*
 * 2. Localiza exatamente o case 'menu'.
 */
const menuCaseRegex = /^[ \t]*case\s+['"]menu['"]\s*:/m;
const match = menuCaseRegex.exec(src);

if (!match) {
  throw new Error("case 'menu' não encontrado no index.js.");
}

const caseStart = match.index;

/*
 * 3. Procura o próximo case do mesmo switch.
 *
 * Não usamos regex gigante porque o index.js é enorme
 * e possui muitos blocos internos.
 */
const afterStart = caseStart + match[0].length;
const rest = src.slice(afterStart);

const nextCaseRegex = /\n[ \t]*case\s+['"`][^'"`]+['"`]\s*:/;
const nextMatch = nextCaseRegex.exec(rest);

if (!nextMatch) {
  throw new Error("Não foi possível localizar o próximo case depois de 'menu'.");
}

const nextCaseStart = afterStart + nextMatch.index + 1;

/*
 * 4. Substitui apenas o conteúdo do case 'menu'.
 *
 * O Native Flow continua usando o roteador central existente:
 * getMessageText() -> command -> switch.
 *
 * O menu adaptativo é chamado diretamente quando /menu é executado.
 */
const newCase = `case 'menu': {
  try {
    console.log('[MENU] Modo atual: adaptativo');
    console.log('[MENU] 🌸 Enviando MENU ADAPTATIVO...');

    const menuPushName =
      pushName ||
      pushname ||
      senderName ||
      'usuário';

    await menuKyaraAdaptativo(
      nazu,
      from,
      menuPushName,
      {
        isGroup,
        isAdmin: !!isAdmin,
        isOwner: !!(typeof isOwner === 'boolean' ? isOwner : false),
        sender,
        command: 'menu'
      }
    );

    console.log('[MENU] ✅ Menu ADAPTATIVO enviado!');
  } catch (menuAdaptiveError) {
    console.warn(
      '[MENU] ⚠️ Falha no menu adaptativo:',
      menuAdaptiveError?.message || menuAdaptiveError
    );

    /*
     * Fallback: não derruba o bot se Native Flow falhar.
     * O bloco antigo de menu será preservado pelo backup.
     */
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

console.log('✅ case /menu integrado ao menu adaptativo.');
NODE

echo "✅ Integração concluída."
echo

echo "[4/5] Verificando index.js..."
node --check "$INDEX"
echo "✅ Sintaxe do index.js OK."
echo

echo "[5/5] Executando teste..."
if [ -f "testar-menu-adaptativo.mjs" ]; then
  node testar-menu-adaptativo.mjs
else
  echo "ℹ️ teste externo não encontrado; pulando."
fi

echo
echo "=============================================="
echo " ✅ MENU ADAPTATIVO INTEGRADO"
echo "=============================================="
echo
echo "Agora:"
echo "  /menu"
echo
echo "deve chamar o menu adaptativo."
echo
echo "Backup:"
echo "$BACKUP"
echo
echo "⚠️ Não instale outro messages.upsert."
echo "O processamento dos cliques continua no"
echo "roteador Native Flow já existente."
echo
echo "=============================================="
