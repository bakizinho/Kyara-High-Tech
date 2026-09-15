#!/data/data/com.termux/files/usr/bin/bash

set -e

cd ~/storage/BKkyara-

echo "╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮"
echo "┃ 🌸 KYARA • CORREÇÃO DE CLIQUES ┃"
echo "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"
echo

INDEX="dados/src/index.js"
MENU="dados/src/core/menuAdaptativo/menu-adaptativo.js"

if [ ! -f "$INDEX" ]; then
  echo "❌ Não encontrei $INDEX"
  exit 1
fi

if [ ! -f "$MENU" ]; then
  echo "❌ Não encontrei $MENU"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"

cp "$INDEX" "$INDEX.backup-menu-click-$STAMP"
cp "$MENU" "$MENU.backup-menu-click-$STAMP"

echo "✅ Backups criados."
echo

node <<'NODE'
const fs = require('fs');

const indexFile = 'dados/src/index.js';

let src = fs.readFileSync(indexFile, 'utf8');

const oldBody =
`const body = getMessageText(info.message) || info?.text || '';



    console.log('[COMMAND] body recebido:', JSON.stringify(body));`;

const newBody =
`let body = getMessageText(info.message) || info?.text || '';

    // ============================================================
    // 🌸 KYARA • NORMALIZAÇÃO DE CLIQUES DO NATIVE FLOW
    // ============================================================
    // O WhatsApp pode devolver o ID selecionado em formatos como:
    //   /menudown
    //   menu:/menudown
    //   menu:menudown
    //   menu_menudown
    //   selectedRowId / selectedId / button_id
    //
    // O roteador principal espera o comando normal, com o prefixo.
    // Aqui normalizamos SOMENTE respostas interativas de menu.
    // ============================================================

    if (typeof body === 'string') {
      const originalInteractiveBody = body.trim();

      if (
        originalInteractiveBody.startsWith('menu:') ||
        originalInteractiveBody.startsWith('menu_')
      ) {
        let normalizedInteractiveBody =
          originalInteractiveBody
            .replace(/^menu:/i, '')
            .replace(/^menu_/i, '')
            .trim();

        if (
          normalizedInteractiveBody &&
          !normalizedInteractiveBody.startsWith(prefixo)
        ) {
          normalizedInteractiveBody =
            prefixo + normalizedInteractiveBody.replace(/^[/!#$%&*?]+/, '');
        }

        body = normalizedInteractiveBody;

        console.log(
          '[KYARA][MENU CLICK] Normalizado:',
          JSON.stringify(originalInteractiveBody),
          '=>',
          JSON.stringify(body)
        );
      }
    }

    console.log(
      '[COMMAND] body recebido:',
      JSON.stringify(body)
    );`;

if (!src.includes(oldBody)) {
  console.error('❌ Bloco principal de body não encontrado.');
  process.exit(2);
}

src = src.replace(oldBody, newBody);

const oldParams =
`if (params.id) {
              return String(params.id).trim();
            }

            if (params.command) {
              return String(params.command).trim();
            }

            if (params.button_id) {
              return String(params.button_id).trim();
            }`;

const newParams =
`if (params.id) {
              return String(params.id).trim();
            }

            if (params.command) {
              return String(params.command).trim();
            }

            if (params.button_id) {
              return String(params.button_id).trim();
            }

            // Listas Native Flow podem usar nomes diferentes
            // dependendo da versão do WhatsApp/Baileys.
            if (params.selectedId) {
              return String(params.selectedId).trim();
            }

            if (params.selectedRowId) {
              return String(params.selectedRowId).trim();
            }

            if (params.rowId) {
              return String(params.rowId).trim();
            }

            if (params.selected_id) {
              return String(params.selected_id).trim();
            }

            if (params.buttonId) {
              return String(params.buttonId).trim();
            }`;

if (!src.includes(oldParams)) {
  console.error('❌ Bloco paramsJson não encontrado.');
  process.exit(3);
}

src = src.replace(oldParams, newParams);

const oldInteractive =
`if (interactive.selectedButtonId) {
          return String(interactive.selectedButtonId).trim();
        }

        if (interactive.selectedDisplayText) {
          return String(interactive.selectedDisplayText).trim();
        }`;

const newInteractive =
`if (interactive.selectedButtonId) {
          return String(interactive.selectedButtonId).trim();
        }

        if (interactive.selectedId) {
          return String(interactive.selectedId).trim();
        }

        if (interactive.selectedRowId) {
          return String(interactive.selectedRowId).trim();
        }

        if (interactive.rowId) {
          return String(interactive.rowId).trim();
        }

        if (interactive.selectedDisplayText) {
          return String(interactive.selectedDisplayText).trim();
        }`;

if (!src.includes(oldInteractive)) {
  console.error('❌ Bloco de fallback interativo não encontrado.');
  process.exit(4);
}

src = src.replace(oldInteractive, newInteractive);

fs.writeFileSync(indexFile, src);

console.log('✅ index.js corrigido.');
NODE

echo
echo "🔎 Validando JavaScript..."
node --check dados/src/index.js
node --check dados/src/core/menuAdaptativo/menu-adaptativo.js

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CORREÇÃO INSTALADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Agora o clique passa por esta sequência:"
echo
echo "WhatsApp"
echo "   ↓"
echo "nativeFlowResponseMessage"
echo "   ↓"
echo "paramsJson"
echo "   ↓"
echo "selectedId / selectedRowId / id"
echo "   ↓"
echo "normalização"
echo "   ↓"
echo "/menudown, /menulogos, /menuedits..."
echo "   ↓"
echo "switch(command)"
echo
echo "📌 Backup:"
echo "   $INDEX.backup-menu-click-$STAMP"
echo
echo "🚀 Para iniciar:"
echo "   node ."
echo
echo "Depois teste:"
echo "   /menu"
echo "   → toque em 📥 DOWNLOADS"
echo
echo "No terminal deve aparecer algo parecido com:"
echo
echo "  [INTERACTIVE] paramsJson: { id: 'menu:/menudown' }"
echo "  [KYARA][MENU CLICK] Normalizado: \"menu:/menudown\" => \"/menudown\""
echo "  [COMMAND] body recebido: \"/menudown\""
echo
