#!/data/data/com.termux/files/usr/bin/bash

set -e

cd ~/storage/BKkyara-

echo ""
echo "=============================================="
echo "     🔧 FIX DEFINITIVO — KYARA GAME"
echo "=============================================="
echo ""

STAMP=$(date +%Y%m%d-%H%M%S)

BACKUP="dados/backup-game-export-$STAMP"

mkdir -p "$BACKUP"

cp dados/src/features/kyaraBrowser.js \
   "$BACKUP/kyaraBrowser.js"

cp dados/src/features/kyaraSpecialCommands.js \
   "$BACKUP/kyaraSpecialCommands.js"

echo "✅ Backup criado em:"
echo "$BACKUP"
echo ""


python3 - <<'PY'
from pathlib import Path
import re

# ============================================================
# KYARA BROWSER
# ============================================================

p = Path("dados/src/features/kyaraBrowser.js")

s = p.read_text()


print("🔎 Analisando kyaraBrowser.js...")


# ------------------------------------------------------------
# Remove as linhas soltas de sendBrowserHtml que foram
# adicionadas pelo patch anterior.
# ------------------------------------------------------------

s = re.sub(
    r'^[ \t]*sendBrowserHtml,[ \t]*\n',
    '',
    s,
    flags=re.MULTILINE
)


s = re.sub(
    r'^[ \t]*sendBrowserHtml[ \t]*\n',
    '',
    s,
    flags=re.MULTILINE
)


# ------------------------------------------------------------
# Verifica se a função realmente existe.
# ------------------------------------------------------------

if not re.search(
    r'(?:async\s+)?function\s+sendBrowserHtml\s*\(',
    s
):

    raise SystemExit(
        "❌ A função sendBrowserHtml não existe no arquivo."
    )


print("✅ Função sendBrowserHtml encontrada.")


# ------------------------------------------------------------
# Procura o bloco export existente.
#
# O arquivo original usa:
#
# export {
#
#   handleBrowserCommand,
#
#   ...
#
# }
# ------------------------------------------------------------

matches = list(
    re.finditer(
        r'\bexport\s*\{',
        s
    )
)


if not matches:

    raise SystemExit(
        "❌ Nenhum bloco export { ... } encontrado."
    )


# Usa o último bloco export do arquivo.
m = matches[-1]

start = m.start()

brace_start = s.find(
    '{',
    start
)

if brace_start == -1:

    raise SystemExit(
        "❌ Não consegui localizar { do export."
    )


# ------------------------------------------------------------
# Encontra o } correspondente.
# ------------------------------------------------------------

depth = 0
end = None

for i in range(
    brace_start,
    len(s)
):

    c = s[i]

    if c == '{':
        depth += 1

    elif c == '}':

        depth -= 1

        if depth == 0:

            end = i

            break


if end is None:

    raise SystemExit(
        "❌ Bloco export incompleto."
    )


export_block = s[
    brace_start:end + 1
]


# ------------------------------------------------------------
# Adiciona sendBrowserHtml dentro do export.
# ------------------------------------------------------------

if re.search(
    r'\bsendBrowserHtml\b',
    export_block
):

    print(
        "✅ sendBrowserHtml já está no export."
    )

else:

    # Preferência: depois de handleBrowserCommand,
    # exatamente como no instalador original.

    if "handleBrowserCommand" in export_block:

        export_block = export_block.replace(
            "handleBrowserCommand,",
            "handleBrowserCommand,\n  sendBrowserHtml,",
            1
        )

    else:

        # Caso o export tenha outra formatação,
        # coloca antes do fechamento.

        export_block = (
            export_block[:-1]
            + "\n  sendBrowserHtml,\n"
            + "}"
        )

    s = (
        s[:brace_start]
        + export_block
        + s[end + 1:]
    )

    print(
        "✅ sendBrowserHtml adicionado ao export correto."
    )


p.write_text(s)


# ============================================================
# KYARA SPECIAL COMMANDS
# ============================================================

p = Path(
    "dados/src/features/kyaraSpecialCommands.js"
)

s = p.read_text()


print("")
print(
    "🔎 Analisando kyaraSpecialCommands.js..."
)


# ------------------------------------------------------------
# Corrige import.
# ------------------------------------------------------------

pattern = re.compile(
    r'import\s*\{\s*'
    r'handleBrowserCommand'
    r'(?:\s*,\s*sendBrowserHtml)?'
    r'\s*\}\s*from\s*[\'"]\.\/kyaraBrowser\.js[\'"]\s*;'
)


replacement = """import {
  handleBrowserCommand,
  sendBrowserHtml
} from './kyaraBrowser.js';"""


if pattern.search(s):

    s = pattern.sub(
        replacement,
        s,
        count=1
    )

    print(
        "✅ Import correto."
    )

else:

    print(
        "⚠️ Import não encontrado no formato esperado."
    )


p.write_text(s)

PY


echo ""
echo "=============================================="
echo "        🔎 TESTE DE SINTAXE"
echo "=============================================="
echo ""


node --check \
dados/src/features/kyaraBrowser.js

echo "✅ kyaraBrowser.js — OK"


node --check \
dados/src/features/kyaraSpecialCommands.js

echo "✅ kyaraSpecialCommands.js — OK"


node --check \
dados/api/server.mjs

echo "✅ server.mjs — OK"


echo ""
echo "=============================================="
echo "        🎮 KYARA GAME CORRIGIDO"
echo "=============================================="
echo ""

echo "Backup:"
echo "$BACKUP"
echo ""

echo "Comandos:"
echo "/jogo"
echo "/game"
echo "/kyarajogo"
echo ""

echo "Agora:"
echo "node ."
echo ""

