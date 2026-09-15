#!/data/data/com.termux/files/usr/bin/bash
set -e

cd ~/storage/BKkyara-

INDEX="dados/src/index.js"

echo "╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮"
echo "┃ 🌸 KYARA • FIX CLIQUE EXATO ┃"
echo "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"

# Backup antes da alteração
STAMP="$(date +%Y%m%d-%H%M%S)"
cp "$INDEX" "$INDEX.backup-clique-exato-$STAMP"

echo "✅ Backup criado:"
echo "   $INDEX.backup-clique-exato-$STAMP"

node <<'NODE'
const fs = require('fs')

const file = 'dados/src/index.js'
let src = fs.readFileSync(file, 'utf8')

const marker = '[KYARA][FIX FINAL]'

if (src.includes(marker)) {
  console.log('ℹ️ Fix já existe. Nenhuma alteração feita.')
  process.exit(0)
}

const oldBlock = `    console.log(
      '[COMMAND] body recebido:',
      JSON.stringify(body)
    );`

const newBlock = `    // ========================================================
    // 🌸 KYARA • NORMALIZAÇÃO EXATA DOS CLIQUES DO MENU
    // ========================================================
    if (typeof body === 'string') {
      const kyaraMenuClickIds = new Set([
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
      ]);

      const rawMenuBody = body.trim();

      const bareMenuId = rawMenuBody
        .replace(/^menu:/i, '')
        .replace(/^menu_/i, '')
        .replace(/^menu\\//i, '')
        .replace(/^[/!#.$%&*?]+/, '')
        .trim()
        .toLowerCase();

      if (kyaraMenuClickIds.has(bareMenuId)) {
        const normalizedMenuBody = prefixo + bareMenuId;

        if (rawMenuBody !== normalizedMenuBody) {
          console.log(
            '[KYARA][MENU CLICK] Original:',
            JSON.stringify(rawMenuBody)
          );

          console.log(
            '[KYARA][MENU CLICK] Normalizado:',
            JSON.stringify(normalizedMenuBody)
          );
        }

        body = normalizedMenuBody;

        console.log(
          '[KYARA][FIX FINAL] Body normalizado para roteador:',
          JSON.stringify(body)
        );
      }
    }

    console.log(
      '[COMMAND] body recebido:',
      JSON.stringify(body)
    );`

if (!src.includes(oldBlock)) {
  console.error('❌ Bloco exato não encontrado.')
  console.error('Nenhuma alteração foi salva.')
  process.exit(1)
}

src = src.replace(oldBlock, newBlock)

fs.writeFileSync(file, src, 'utf8')

console.log('✅ Fix aplicado exatamente antes do roteador.')
NODE

echo ""
echo "🔎 Validando sintaxe..."

node --check "$INDEX"

echo ""
echo "╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮"
echo "┃ ✅ SINTAXE OK                ┃"
echo "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"

echo ""
echo "Teste agora:"
echo "  node ."
echo "  /menu"
echo "  → 📥 Downloads"
echo ""
echo "Esperado:"
echo "  [INTERACTIVE] paramsJson: { id: 'menudown' }"
echo "  [KYARA][MENU CLICK] Original: \"menudown\""
echo "  [KYARA][MENU CLICK] Normalizado: \"/menudown\""
echo "  [KYARA][FIX FINAL] Body normalizado para roteador: \"/menudown\""
echo "  [COMMAND] body recebido: \"/menudown\""
echo "  CMD /menudown"
echo ""

