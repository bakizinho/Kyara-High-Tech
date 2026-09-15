#!/data/data/com.termux/files/usr/bin/bash
set -e

cd ~/storage/BKkyara-

INDEX="dados/src/index.js"

echo "╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮"
echo "┃ 🌸 KYARA • RESTAURAÇÃO SEGURA ┃"
echo "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"

if [ ! -f "$INDEX" ]; then
  echo "❌ Arquivo não encontrado: $INDEX"
  exit 1
fi

# =========================================================
# 1. LOCALIZA O BACKUP CRIADO ANTES DA CORREÇÃO QUEBROU
# =========================================================
LAST=$(ls -t "$INDEX".backup-menu-final-* 2>/dev/null | head -n1 || true)

if [ -z "$LAST" ] || [ ! -f "$LAST" ]; then
  echo "❌ Nenhum backup menu-final encontrado."
  exit 1
fi

cp "$LAST" "$INDEX"

echo "✅ Restaurado:"
echo "   $LAST"

# =========================================================
# 2. BACKUP DA RESTAURAÇÃO
# =========================================================
STAMP="$(date +%Y%m%d-%H%M%S)"
cp "$INDEX" "$INDEX.backup-fix-seguro-$STAMP"

echo "✅ Backup de segurança criado:"
echo "   $INDEX.backup-fix-seguro-$STAMP"

# =========================================================
# 3. PATCH CIRÚRGICO
# =========================================================
node <<'NODE'
const fs = require('fs')

const file = 'dados/src/index.js'
let src = fs.readFileSync(file, 'utf8')

/*
 * IMPORTANTE:
 * O helper entra ANTES do primeiro import.
 * Assim não existe código no meio da declaração dos imports.
 */

const helper = `
/* =========================================================
 * 🌸 KYARA • NORMALIZAÇÃO DOS CLIQUES DO MENU
 * ========================================================= */

const KYARA_MENUS_ORIGINAIS = new Set([
  'menudown',
  'menulogos',
  'menuedits',
  'menuadm',
  'menubn',
  'menudono',
  'menumemb',
  'ferramentas',
  'menufig',
  'alteradores',
  'menurpg',
  'menuvip'
])

function normalizeKyaraMenuId(rawId) {
  if (!rawId) return null

  const original = String(rawId).trim()

  if (!original) return null

  let id = original
    .replace(/^menu:/i, '')
    .replace(/^menu_/i, '')
    .replace(/^menu\\//i, '')
    .replace(/^[/!#.$%&*?]+/, '')
    .trim()
    .toLowerCase()

  if (!KYARA_MENUS_ORIGINAIS.has(id)) {
    return null
  }

  const normalized = '/' + id

  if (original !== normalized) {
    console.log(
      '[KYARA][MENU CLICK] Original:',
      JSON.stringify(original)
    )

    console.log(
      '[KYARA][MENU CLICK] Normalizado:',
      JSON.stringify(normalized)
    )
  }

  return normalized
}

`

if (!src.includes('const KYARA_MENUS_ORIGINAIS = new Set([')) {
  src = helper + src
  console.log('✅ Helper inserido antes dos imports')
} else {
  console.log('ℹ️ Helper já existe; não duplicado')
}

/*
 * =========================================================
 * 4. NORMALIZAÇÃO NO GETMESSAGE
 * =========================================================
 */

const oldParams = `            if (params.id) {
              return String(params.id).trim();
            }

            if (params.command) {
              return String(params.command).trim();
            }

            if (params.button_id) {
              return String(params.button_id).trim();
            }`

const newParams = `            const possibleKeys = [
              'id',
              'command',
              'button_id',
              'selectedId',
              'selectedRowId',
              'rowId',
              'selected_id',
              'buttonId',
              'selectedDisplayText'
            ];

            for (const key of possibleKeys) {
              if (params[key]) {
                const raw = String(params[key]).trim();
                const normalized = normalizeKyaraMenuId(raw);

                if (normalized) {
                  return normalized;
                }

                return raw;
              }
            }`

if (src.includes(oldParams)) {
  src = src.replace(oldParams, newParams)
  console.log('✅ paramsJson corrigido')
} else {
  console.log('ℹ️ Bloco paramsJson já foi alterado ou não encontrado')
}

/*
 * =========================================================
 * 5. FALLBACK DOS CAMPOS INTERATIVOS
 * =========================================================
 */

const oldInteractive = `        if (interactive.selectedButtonId) {
          return String(interactive.selectedButtonId).trim();
        }

        if (interactive.selectedDisplayText) {
          return String(interactive.selectedDisplayText).trim();
        }`

const newInteractive = `        const interactiveKeys = [
          'selectedButtonId',
          'selectedId',
          'selectedRowId',
          'rowId',
          'selectedDisplayText',
          'buttonId'
        ];

        for (const key of interactiveKeys) {
          if (interactive[key]) {
            const raw = String(interactive[key]).trim();
            const normalized = normalizeKyaraMenuId(raw);

            if (normalized) {
              return normalized;
            }

            return raw;
          }
        }`

if (src.includes(oldInteractive)) {
  src = src.replace(oldInteractive, newInteractive)
  console.log('✅ Fallback interativo corrigido')
} else {
  console.log('ℹ️ Fallback já alterado ou não encontrado')
}

/*
 * =========================================================
 * 6. NORMALIZAÇÃO FINAL ANTES DO ROTEADOR
 * =========================================================
 *
 * O ponto importante é:
 *
 * paramsJson -> "menudown"
 *                 ↓
 *             getMessageText
 *                 ↓
 *             "/menudown"
 *                 ↓
 *             isCmd = true
 *                 ↓
 *             command = "menudown"
 *                 ↓
 *             switch(command)
 */

const marker = "[KYARA][FIX FINAL]"

if (!src.includes(marker)) {

  const target = `console.log('[COMMAND] body recebido:', JSON.stringify(body));`

  if (!src.includes(target)) {
    throw new Error(
      'Não encontrei o ponto exato de [COMMAND] body recebido. Nenhuma alteração final foi feita.'
    )
  }

  const replacement = `// 🌸 KYARA • NORMALIZAÇÃO FINAL DO CLIQUE
    if (typeof body === 'string') {
      const normalizedMenu = normalizeKyaraMenuId(body);

      if (normalizedMenu) {
        if (body.trim() !== normalizedMenu) {
          console.log(
            '[KYARA][MENU CLICK] Body original:',
            JSON.stringify(body)
          )

          console.log(
            '[KYARA][MENU CLICK] Body normalizado:',
            JSON.stringify(normalizedMenu)
          )
        }

        body = normalizedMenu;

        console.log(
          '[KYARA][FIX FINAL] Body normalizado para roteador:',
          JSON.stringify(body)
        )
      }
    }

    ${target}`

  src = src.replace(target, replacement)

  console.log('✅ Normalização final inserida antes do roteador')
} else {
  console.log('ℹ️ Normalização final já existe')
}

fs.writeFileSync(file, src, 'utf8')

console.log('✅ Patch cirúrgico concluído')
NODE

# =========================================================
# 7. VALIDAÇÃO
# =========================================================
echo ""
echo "🔎 Validando index.js..."

node --check "$INDEX"

echo ""
echo "╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮"
echo "┃ ✅ KYARA • SINTAXE OK        ┃"
echo "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"

echo ""
echo "Agora:"
echo "  node ."
echo ""
echo "Teste:"
echo "  /menu"
echo "  → 📥 Downloads"
echo ""
echo "Log esperado:"
echo "  [INTERACTIVE] paramsJson: { id: 'menudown' }"
echo "  [KYARA][MENU CLICK] Original: \"menudown\""
echo "  [KYARA][MENU CLICK] Normalizado: \"/menudown\""
echo "  [KYARA][FIX FINAL] Body normalizado para roteador: \"/menudown\""
echo "  [COMMAND] body recebido: \"/menudown\""
echo "  CMD /menudown"
echo ""
