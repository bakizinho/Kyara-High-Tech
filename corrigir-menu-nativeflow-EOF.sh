#!/data/data/com.termux/files/usr/bin/bash
set -e

cd "$(dirname "$0")"

FILE="dados/src/core/menuAdaptativo/menu-adaptativo.js"

echo "=============================================="
echo " 🌸 BKkyara • CORREÇÃO DEFINITIVA NATIVE FLOW"
echo "=============================================="
echo

if [ ! -f "$FILE" ]; then
  echo "❌ Arquivo não encontrado: $FILE"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$FILE.backup-nativeflow-$STAMP"

echo "[1/5] Criando backup..."
cp "$FILE" "$BACKUP"
echo "✅ Backup: $BACKUP"
echo

echo "[2/5] Corrigindo helper de envio..."

python - "$FILE" <<'PY'
from pathlib import Path
import sys
import re

p = Path(sys.argv[1])
s = p.read_text(encoding="utf-8")

# ============================================================
# 1. Corrige o helper que ficou recursivo
# ============================================================

pattern = re.compile(
    r"// KYARA_MENU_SEND_SAFE.*?"
    r"\nfunction digits",
    re.S
)

replacement = r"""// KYARA_MENU_SEND_SAFE
async function enviarMenuAdaptativoSeguro(sock, jid, mensagem, opcoes = {}) {
  if (!sock || typeof sock.sendMessage !== 'function') {
    throw new Error('Socket WhatsApp inválido: sendMessage não disponível')
  }

  if (!jid) {
    throw new Error('JID do destinatário não informado')
  }

  try {
    console.log('[MENU] 📤 Enviando fallback de texto para:', jid)

    const resultado = await sock.sendMessage(
      jid,
      mensagem,
      opcoes
    )

    if (!resultado) {
      throw new Error('sendMessage retornou vazio')
    }

    console.log('[MENU] ✅ Fallback de texto enviado')
    return resultado

  } catch (err) {
    console.error(
      '[MENU] ❌ Falha REAL no envio:',
      err?.stack || err?.message || err
    )

    throw err
  }
}

function digits"""

s2, count = pattern.subn(replacement, s, count=1)

if count == 0:
    print("⚠️ Helper antigo não encontrado. Procurando bloco isolado...")
    # Caso já esteja diferente, não destrói o arquivo.
else:
    s = s2

# ============================================================
# 2. Troca a construção do interactiveMessage
# ============================================================

old_pattern = re.compile(
    r"""const interactive =
      proto\.Message\.InteractiveMessage\.create\(\{
.*?
      \}\)

    const msg =
      generateWAMessageFromContent\(""",
    re.S
)

new_block = """const interactive = {
      body: {
        text
      },

      footer: {
        text: CONFIG.footer
      },

      header: {
        title:
          owner
            ? '👑 KYARA • OWNER MODE'
            : admin
              ? '⚙️ KYARA • ADMIN MODE'
              : '🌸 KYARA • USER MODE',

        hasMediaAttachment: false
      },

      nativeFlowMessage: {
        buttons,

        messageParamsJson: '{}',

        messageVersion: 1
      }
    }

    const msg =
      generateWAMessageFromContent("""

s2, count2 = old_pattern.subn(new_block, s, count=1)

if count2 == 0:
    print("⚠️ Construção antiga do interactiveMessage não encontrada.")
else:
    s = s2
    print("✅ Native Flow convertido para formato compatível.")

# ============================================================
# 3. Corrige as opções do generateWAMessageFromContent
# ============================================================

s = re.sub(
    r"""generateWAMessageFromContent\(
        jid,

        \{
          viewOnceMessage:""",
    """generateWAMessageFromContent(
        jid,

        {
          viewOnceMessage:""",
    s
)

# Troca o {} final dessa chamada específica por userJid.
target = """        },

        {}
      )

    await sock.relayMessage("""
replacement = """        },

        {
          userJid: sock?.user?.id
        }
      )

    await sock.relayMessage("""

if target in s:
    s = s.replace(target, replacement, 1)
    print("✅ userJid adicionado ao gerador da mensagem.")

# ============================================================
# 4. Garante messageVersion/messageParamsJson no menu
# ============================================================

if "messageVersion: 1" not in s:
    raise SystemExit(
        "❌ Não consegui inserir messageVersion: 1. Arquivo não alterado."
    )

if "messageParamsJson: '{}'" not in s:
    raise SystemExit(
        "❌ Não consegui inserir messageParamsJson: '{}'. Arquivo não alterado."
    )

p.write_text(s, encoding="utf-8")
print("✅ Arquivo salvo.")
PY

echo
echo "[3/5] Verificando sintaxe..."
node --check "$FILE"
echo "✅ menu-adaptativo.js OK"

echo
echo "[4/5] Verificando index.js..."
node --check "dados/src/index.js"
echo "✅ index.js OK"

echo
echo "[5/5] Conferindo Native Flow..."

grep -n \
  "messageParamsJson\|messageVersion\|userJid\|KYARA_MENU_SEND_SAFE" \
  "$FILE" | head -30

echo
echo "=============================================="
echo " ✅ CORREÇÃO NATIVE FLOW CONCLUÍDA"
echo "=============================================="
echo
echo "Backup:"
echo "  $BACKUP"
echo
echo "Agora execute:"
echo
echo "  npm start"
echo
echo "Depois envie no WhatsApp:"
echo
echo "  /menu"
echo
echo "O esperado é:"
echo
echo "  [MENU] Modo atual: adaptativo"
echo "  [MENU] 🌸 Carregando menu adaptativo..."
echo
echo "Se ainda não aparecer no WhatsApp,"
echo "mande o log completo que aparecer depois disso."
echo
