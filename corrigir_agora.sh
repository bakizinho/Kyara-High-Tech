#!/data/data/com.termux/files/usr/bin/bash

set -e

ARQ="dados/src/index.js"
BACKUP="dados/src/index.js.backup-$(date +%Y%m%d-%H%M%S)"

echo "🔧 Corrigindo $ARQ..."

cp -p "$ARQ" "$BACKUP"
echo "✅ Backup: $BACKUP"

python3 - "$ARQ" <<'PY'
import sys

arquivo = sys.argv[1]

with open(arquivo, "r", encoding="utf-8") as f:
    linhas = f.readlines()

corrigido = False

for i, linha in enumerate(linhas):
    if linha.strip() == "let" and i > 0:
        anterior = linhas[i - 1]

        if "Verificar se é personalidade customizada" in anterior:
            indent = linha[:len(linha) - len(linha.lstrip())]
            linhas[i] = indent + "let customPrompt = null;\n"
            corrigido = True
            print(f"✅ Linha {i + 1}: let corrigido para let customPrompt = null;")
            break

if not corrigido:
    print("❌ Não encontrei o 'let' isolado esperado.")
    sys.exit(1)

with open(arquivo, "w", encoding="utf-8") as f:
    f.writelines(linhas)
PY

echo
echo "🔎 Conferindo trecho corrigido:"
sed -n '5770,5790p' "$ARQ"

echo
echo "🧪 Testando sintaxe do index.js..."

if node --check "$ARQ"; then
    echo
    echo "══════════════════════════════════════════════"
    echo "✅ CORREÇÃO APLICADA COM SUCESSO"
    echo "══════════════════════════════════════════════"
    echo
    echo "index.js: 🟢 SINTAXE OK"
    echo
    echo "Backup preservado em:"
    echo "$BACKUP"
else
    echo
    echo "══════════════════════════════════════════════"
    echo "🔴 AINDA EXISTE ERRO"
    echo "══════════════════════════════════════════════"
    echo
    echo "Restaurando backup..."
    cp -p "$BACKUP" "$ARQ"
    echo "↩️ Arquivo restaurado."
    exit 1
fi
