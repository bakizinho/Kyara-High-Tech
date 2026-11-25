#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT="$PWD"
INDEX="$ROOT/dados/src/index.js"
MENU="$ROOT/dados/src/core/menuAdaptativo/menu-adaptativo.js"

echo
echo "========== KYARA: DIAGNOSTICO SEGURO =========="
echo "Projeto: $ROOT"
echo

for f in "$INDEX" "$MENU" \
  "$ROOT/dados/src/config.json" \
  "$ROOT/config/menu-adaptativo.json"; do
  if [ -f "$f" ]; then
    echo "[OK] ${f#"$ROOT"/}"
  else
    echo "[AUSENTE] ${f#"$ROOT"/}"
  fi
done

echo
echo "========== 1. COMANDOS E PERMISSOES =========="
grep -RniE \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude='*.bak*' \
  --include='*.js' --include='*.mjs' --include='*.cjs' \
  'verificadoMensagens|VERIFICADO ·|botoesmenu|menudono|menuadm|assistente' \
  "$ROOT/dados/src" "$ROOT/config" 2>/dev/null | head -n 100

echo
echo "========== 2. ENVIO E NORMALIZACAO =========="
grep -RniE \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude='*.bak*' \
  --include='*.js' --include='*.mjs' --include='*.cjs' \
  'Native Flow|sendFlow|interactiveMessage|buttonsEnabled|isInteractiveMenu|newsletter|sendMessage' \
  "$ROOT/dados/src/core" "$ROOT/dados/src" 2>/dev/null | head -n 140

echo
echo "========== 3. IA E ASSISTENTE =========="
grep -RniE \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude='*.bak*' \
  --include='*.js' --include='*.mjs' --include='*.cjs' \
  'A IA local não retornou|assistente virtual|127\.0\.0\.1:8080|/health|chat/completions' \
  "$ROOT/dados/src" 2>/dev/null | head -n 80

echo
echo "========== 4. CONFIGURACAO ATUAL =========="
node --input-type=module -e '
import fs from "node:fs";
for (const f of [
  "dados/src/config.json",
  "config/menu-adaptativo.json"
]) {
  try {
    const c = JSON.parse(fs.readFileSync(f, "utf8"));
    console.log("\n" + f);
    for (const k of [
      "enabled", "nativeFlow", "buttonsEnabled",
      "verificadoMensagens", "nomebot"
    ]) {
      if (Object.hasOwn(c, k)) console.log("  " + k + " =", c[k]);
    }
  } catch (e) {
    console.log(f + ": " + e.message);
  }
}'

echo
echo "========== 5. BACKUPS RELACIONADOS =========="
find "$ROOT/dados/src" -type f \
  \( -name '*.bak-menu-fix-*' \
     -o -name '*.bak-menu-verificado-v2-*' \
     -o -name '*.bak-kyara_menu_native_patch_v1-*' \) \
  -print 2>/dev/null | head -n 60

echo
echo "Diagnostico concluido. Nenhum arquivo foi alterado."
