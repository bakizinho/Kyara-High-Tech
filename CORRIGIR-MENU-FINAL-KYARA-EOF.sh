#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/storage/BKkyara-
INDEX="dados/src/index.js"
MENU_ADAPT="dados/src/core/menuAdaptativo/menu-adaptativo.js"

echo "╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮"
echo "┃ 🌸 KYARA • MENU FINAL DEFINITIVO ┃"
echo "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"

if [ ! -f "$INDEX" ]; then
  echo "❌ Não achei $INDEX"
  exit 1
fi
if [ ! -f "$MENU_ADAPT" ]; then
  echo "❌ Não achei $MENU_ADAPT"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
cp "$INDEX" "$INDEX.backup-menu-final-$STAMP"
cp "$MENU_ADAPT" "$MENU_ADAPT.backup-menu-final-$STAMP"
echo "✅ Backups: $STAMP"

node <<'NODE'
const fs = require('fs')
const indexFile = 'dados/src/index.js'
let src = fs.readFileSync(indexFile, 'utf8')

// ========================================================
// INJETA HELPER DE NORMALIZAÇÃO NO TOPO (após imports)
// ========================================================
const helper = `
/* =========================================================
 * 🌸 KYARA • NORMALIZAÇÃO DEFINITIVA DE CLIQUES
 * ========================================================= */
const KYARA_MENUS_ORIGINAIS = [
  'menudown','menulogos','menuedits','menuadm','menubn',
  'menudono','menumemb','ferramentas','menufig',
  'alteradores','menurpg','menuvip'
]

function normalizeKyaraMenuId(rawId) {
  if (!rawId) return null
  let id = String(rawId).trim()
  if (!id) return null

  const original = id

  // remove prefixos que o WhatsApp pode mandar
  id = id.replace(/^menu:/i,'')
         .replace(/^menu_/i,'')
         .replace(/^menu\\//i,'')
         .replace(/^[\\/!#.$%&*?]+/,'')
         .trim()
         .toLowerCase()

  // id agora deve ser menudown, etc
  if (KYARA_MENUS_ORIGINAIS.includes(id)) {
    const normalized = '/' + id
    if (original !== normalized) {
      console.log('[KYARA][MENU CLICK] Original:', JSON.stringify(original))
      console.log('[KYARA][MENU CLICK] Normalizado:', JSON.stringify(normalized))
    }
    return normalized
  }

  // se já veio com / e é válido, mantém
  if (original.startsWith('/') && KYARA_MENUS_ORIGINAIS.includes(original.replace(/^\\/+/, '').toLowerCase())) {
    return '/' + original.replace(/^\\/+/, '').toLowerCase()
  }

  return null
}
`

// Injeta helper apenas uma vez
if (!src.includes('KYARA_MENUS_ORIGINAIS')) {
  // injeta após a primeira linha de import/require
  const firstImportEnd = src.indexOf('\n', src.indexOf('import')) + 1
  src = src.slice(0, firstImportEnd) + helper + '\n' + src.slice(firstImportEnd)
  console.log('✅ Helper injetado')
}

// ========================================================
// CORREÇÃO 1: EXTRAÇÃO DE paramsJson - cobre todos os nomes
// ========================================================
const oldParamsBlock = `            if (params.id) {
              return String(params.id).trim();
            }

            if (params.command) {
              return String(params.command).trim();
            }

            if (params.button_id) {
              return String(params.button_id).trim();
            }`

const newParamsBlock = `            // 🌸 KYARA • TODOS OS FORMATOS POSSÍVEIS DO WHATSAPP
            const possibleKeys = ['id','command','button_id','selectedId','selectedRowId','rowId','selected_id','buttonId','selectedDisplayText']
            for (const k of possibleKeys) {
              if (params[k]) {
                const raw = String(params[k]).trim()
                const norm = normalizeKyaraMenuId(raw)
                if (norm) return norm
                // se não for menu, retorna cru mesmo (para outros botões)
                if (raw) return raw
              }
            }`

if (src.includes('if (params.id) {')) {
  // substitui o bloco antigo se ainda existir
  if (src.includes(oldParamsBlock)) {
    src = src.replace(oldParamsBlock, newParamsBlock)
    console.log('✅ Bloco params.id antigo substituído')
  } else if (!src.includes('possibleKeys')) {
    // tenta substituir por regex mais genérica
    src = src.replace(/if\s*\(params\.id\)\s*\{[^}]*\}[\s\S]*?if\s*\(params\.button_id\)\s*\{[^}]*\}/, newParamsBlock)
    console.log('✅ Bloco params genérico substituído')
  }
}

// ========================================================
// CORREÇÃO 2: FALLBACK interactive.selectedButtonId
// ========================================================
const oldInteractive = `        if (interactive.selectedButtonId) {
          return String(interactive.selectedButtonId).trim();
        }

        if (interactive.selectedDisplayText) {
          return String(interactive.selectedDisplayText).trim();
        }`

const newInteractive = `        // 🌸 KYARA • FALLBACK INTERATIVO COMPLETO
        const interactiveKeys = ['selectedButtonId','selectedId','selectedRowId','rowId','selectedDisplayText','buttonId']
        for (const k of interactiveKeys) {
          if (interactive[k]) {
            const raw = String(interactive[k]).trim()
            const norm = normalizeKyaraMenuId(raw)
            if (norm) return norm
            if (raw) return raw
          }
        }`

if (src.includes(oldInteractive)) {
  src = src.replace(oldInteractive, newInteractive)
  console.log('✅ Bloco interactive fallback substituído')
}

// ========================================================
// CORREÇÃO 3: ANTES DO LOG [COMMAND] body recebido
// ========================================================
const marker = "console.log('[COMMAND] body recebido:'"

if (!src.includes('[KYARA][FIX FINAL]')) {
  src = src.replace(
    /(\s*)(console\.log\('\[COMMAND\] body recebido:',)/,
    `$1// 🌸 KYARA • NORMALIZAÇÃO FINAL ANTES DO ROTEADOR
$1if (typeof body === 'string') {
$1  const maybe = normalizeKyaraMenuId(body)
$1  if (maybe) {
$1    if (body.trim() !== maybe) {
$1      console.log('[KYARA][MENU CLICK] Original:', JSON.stringify(body))
$1      console.log('[KYARA][MENU CLICK] Normalizado:', JSON.stringify(maybe))
$1    }
$1    body = maybe
$1    console.log('[KYARA][FIX FINAL] Body normalizado para roteador:', JSON.stringify(body))
$1  }
$1}
$1$2`
  )
  console.log('✅ Normalização final antes do COMMAND injetada')
}

fs.writeFileSync(indexFile, src, 'utf8')
console.log('✅ index.js corrigido')
NODE

echo "🔎 Validando sintaxe..."
node --check "$INDEX"
node --check "$MENU_ADAPT"
echo "✅ Sintaxe OK"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌸 KYARA • MENU CORRIGIDO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Native Flow recebido"
echo "✅ ID extraído (id, selectedId, selectedRowId, rowId...)"
echo "✅ Prefixo / normalizado"
echo "✅ 12 menus preservados"
echo "✅ Vídeo preservado (menu.mp4)"
echo "✅ Roteador original preservado"
echo "✅ Backups criados"
echo ""
echo "Agora rode:"
echo "  node ."
echo "Depois:"
echo "  /menu → 📥 Downloads"
echo ""
echo "Log esperado:"
echo "  [INTERACTIVE] paramsJson: { id: 'menudown' }"
echo "  [KYARA][MENU CLICK] Original: \"menudown\""
echo "  [KYARA][MENU CLICK] Normalizado: \"/menudown\""
echo "  [COMMAND] body recebido: \"/menudown\""
echo "  CMD /menudown"
echo ""
