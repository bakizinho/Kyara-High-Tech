#!/data/data/com.termux/files/usr/bin/bash

set -e

cd ~/storage/BKkyara-

echo ""
echo "=============================================="
echo "     🔧 CORREÇÃO KYARA GAME / BROWSER"
echo "=============================================="
echo ""

STAMP=$(date +%Y%m%d-%H%M%S)

BACKUP="dados/backup-game-fix-$STAMP"

mkdir -p "$BACKUP"

cp -f \
dados/src/features/kyaraBrowser.js \
"$BACKUP/kyaraBrowser.js" \
2>/dev/null || true

cp -f \
dados/src/features/kyaraSpecialCommands.js \
"$BACKUP/kyaraSpecialCommands.js" \
2>/dev/null || true


echo "🔎 Verificando kyaraBrowser.js..."

python3 - <<'PY'
from pathlib import Path
import re

p = Path("dados/src/features/kyaraBrowser.js")

s = p.read_text()

# ============================================================
# 1. CONFIRMA SE A FUNÇÃO EXISTE
# ============================================================

if not re.search(
    r"(async\s+)?function\s+sendBrowserHtml\s*\(",
    s
):

    raise SystemExit(
        "❌ A função sendBrowserHtml não existe no kyaraBrowser.js."
    )


print("✅ Função sendBrowserHtml encontrada.")


# ============================================================
# 2. REMOVE EXPORT ANTIGO DUPLICADO, SE HOUVER
# ============================================================

s = re.sub(
    r"^\s*export\s*\{\s*sendBrowserHtml\s*\};\s*$",
    "",
    s,
    flags=re.MULTILINE
)


# ============================================================
# 3. PROCURA O BLOCO export EXISTENTE
# ============================================================

export_match = re.search(
    r"export\s*\{[\s\S]*?\};",
    s
)


if export_match:

    block = export_match.group(0)

    if "sendBrowserHtml" not in block:

        # Coloca a função no export existente.
        pos = block.rfind("}")

        block2 = (
            block[:pos]
            + "  sendBrowserHtml,\n"
            + block[pos:]
        )

        s = (
            s[:export_match.start()]
            + block2
            + s[export_match.end():]
        )

        print(
            "✅ sendBrowserHtml adicionado ao export existente."
        )

    else:

        print(
            "✅ sendBrowserHtml já estava no export."
        )

else:

    # ========================================================
    # 4. SE NÃO EXISTIR EXPORT, CRIA NO FINAL
    # ========================================================

    s += """


// ============================================================
// KYARA GAME — EXPORT
// ============================================================

export {
  sendBrowserHtml
};
"""

    print(
        "✅ Export sendBrowserHtml criado."
    )


p.write_text(s)

PY


echo "🔎 Corrigindo import do KYARA GAME..."

python3 - <<'PY'
from pathlib import Path
import re

p = Path(
    "dados/src/features/kyaraSpecialCommands.js"
)

s = p.read_text()


# ============================================================
# IMPORT DO BROWSER
# ============================================================

pattern = re.compile(
    r"import\s*\{\s*"
    r"handleBrowserCommand"
    r"(?:\s*,\s*sendBrowserHtml)?"
    r"\s*\}\s*from\s*['\"]\.\/kyaraBrowser\.js['\"]\s*;"
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
        "✅ Import do sendBrowserHtml corrigido."
    )

else:

    print(
        "⚠️ Import do kyaraBrowser.js não encontrado automaticamente."
    )


# ============================================================
# CONFIRMA O HANDLER DO GAME
# ============================================================

if "handleKyaraGameCommand" not in s:

    marker = (
        "export async function "
        "handleKyaraSpecialCommand"
    )

    if marker not in s:

        raise SystemExit(
            "❌ Não encontrei handleKyaraSpecialCommand."
        )


    game_handler = r'''
// ============================================================
// KYARA GAME
// ============================================================

async function handleKyaraGameCommand(
  options = {}
) {

  const command = String(
    options.command ||
    options.cmd ||
    options.commandName ||
    ""
  )
  .trim()
  .toLowerCase()
  .replace(/^[/!]/, "");


  if (
    ![
      "jogo",
      "game",
      "dino",
      "kyarajogo"
    ].includes(command)
  ) {

    return false;

  }


  try {

    const fs =
      await import("fs/promises");

    const path =
      await import("path");


    const gameFile =
      path.join(
        process.cwd(),
        "dados",
        "api",
        "kyara-jogo.html"
      );


    const html =
      await fs.readFile(
        gameFile,
        "utf8"
      );


    await sendBrowserHtml(
      options,
      html
    );


    console.log(
      "[KYARA GAME] ✅ Dino Rich HTML enviado."
    );


    return true;


  } catch (error) {

    console.error(
      "[KYARA GAME]",
      error
    );


    if (
      typeof options.reply ===
      "function"
    ) {

      await options.reply(
        "❌ Erro ao abrir o KYARA GAME."
      );

    }


    return true;

  }

}


'''

    s = s.replace(
        marker,
        game_handler + marker,
        1
    )

    print(
        "✅ Handler do KYARA GAME criado."
    )

else:

    print(
        "✅ Handler do KYARA GAME já existe."
    )


# ============================================================
# COLOCA O GAME ANTES DO BROWSER
# ============================================================

browser_marker = """  const browserHandled =
    await handleBrowserCommand(
      options
    );"""


if browser_marker in s:

    if "const gameHandled =" not in s:

        game_block = """  const gameHandled =
    await handleKyaraGameCommand(
      options
    );

  if (gameHandled) {
    return true;
  }

"""

        s = s.replace(
            browser_marker,
            game_block + browser_marker,
            1
        )

        print(
            "✅ KYARA GAME conectado ao dispatcher."
        )

    else:

        print(
            "✅ KYARA GAME já está conectado."
        )

else:

    print(
        "⚠️ Dispatcher do browser não encontrado."
    )


p.write_text(s)

PY


echo ""
echo "🔎 VALIDANDO JAVASCRIPT..."
echo ""


node --check \
dados/src/features/kyaraBrowser.js

echo "✅ kyaraBrowser.js OK"


node --check \
dados/src/features/kyaraSpecialCommands.js

echo "✅ kyaraSpecialCommands.js OK"


if [ -f dados/api/kyara-jogo.html ]; then

    echo "✅ kyara-jogo.html encontrado."

else

    echo "⚠️ kyara-jogo.html não encontrado."

fi


echo ""
echo "=============================================="
echo "       ✅ CORREÇÃO FINALIZADA"
echo "=============================================="
echo ""

echo "Agora execute:"
echo ""
echo "node ."
echo ""

echo "Depois teste:"
echo ""
echo "/jogo"
echo ""

