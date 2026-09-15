#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$(pwd)"
INDEX="$ROOT/dados/src/index.js"
TEST="$ROOT/dados/src/teste-isolado.mjs"

echo "========================================"
echo " KYARA - DIAGNÓSTICO NATIVE FLOW"
echo "========================================"

if [ ! -f "$INDEX" ]; then
  echo "❌ index.js não encontrado:"
  echo "$INDEX"
  exit 1
fi

cp "$INDEX" "$ROOT/dados/src/index.js.backup-flow"

cat > "$TEST" <<'TESTEOF'
import { generateWAMessageFromContent, proto } from 'baileys'

export async function testeQuickReplyUnico(nazu, from) {
  const logs = {
    serializado: false,
    waMessageValido: false,
    relayChamado: false,
    erro: null,
    messageId: null
  }

  try {
    const content = {
      viewOnceMessage: {
        message: {
          interactiveMessage:
            proto.Message.InteractiveMessage.create({
              body:
                proto.Message.InteractiveMessage.Body.create({
                  text: 'TESTE CONTROLE - apenas quick_reply'
                }),
              footer:
                proto.Message.InteractiveMessage.Footer.create({
                  text: 'controle kyara'
                }),
              header:
                proto.Message.InteractiveMessage.Header.create({
                  hasMediaAttachment: false
                }),
              nativeFlowMessage:
                proto.Message.InteractiveMessage.NativeFlowMessage.create({
                  buttons: [
                    {
                      name: 'quick_reply',
                      buttonParamsJson: JSON.stringify({
                        display_text: 'TESTE OK',
                        id: 'teste_controle'
                      })
                    }
                  ]
                })
            })
        }
      }
    }

    logs.serializado = true
    console.log('[1] Mensagem construída:', true)

    const waMsg = generateWAMessageFromContent(
      from,
      content,
      {
        userJid: nazu?.user?.id
      }
    )

    logs.waMessageValido =
      !!(waMsg?.message && waMsg?.key?.id)

    logs.messageId = waMsg?.key?.id || null

    console.log('[2] WAMessage válido:', logs.waMessageValido)
    console.log('[3] messageId:', logs.messageId)

    logs.relayChamado = true
    console.log('[4] Chamando relayMessage...')

    const result = await nazu.relayMessage(
      from,
      waMsg.message,
      {
        messageId: waMsg.key.id
      }
    )

    console.log('[5] relayMessage terminou sem exceção')
    console.log('[RELAY RESULT]', result)
    console.log('[RESULTADO FINAL]', logs)

    return logs

  } catch (e) {
    logs.erro =
      e?.stack ||
      e?.message ||
      String(e)

    console.error('[TESTE FLOW] ERRO:', logs.erro)
    console.log('[RESULTADO FINAL]', logs)

    return logs
  }
}
TESTEOF

node --check "$TEST"

python3 - "$INDEX" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

marker = "case 'menu': {"
start = text.find(marker)

if start == -1:
    raise SystemExit("❌ case 'menu' não encontrado.")

# Localiza o primeiro break; seguido pelo fechamento do case.
pos = start
end = None

while True:
    br = text.find("break;", pos)

    if br == -1:
        break

    i = br + len("break;")

    while i < len(text) and text[i].isspace():
        i += 1

    if i < len(text) and text[i] == "}":
        end = i + 1
        break

    pos = br + len("break;")

if end is None:
    raise SystemExit("❌ Não consegui localizar o fim do case menu.")

new_case = """case 'menu': {
  console.log('[MENU TESTE] Executando Native Flow mínimo...');

  try {
    const {
      testeQuickReplyUnico
    } = await import('./teste-isolado.mjs');

    await testeQuickReplyUnico(
      nazu,
      from
    );

  } catch (e) {
    console.error(
      '[MENU TESTE] ERRO:',
      e?.stack || e?.message || e
    );
  }

  break;
}"""

path.write_text(
    text[:start] + new_case + text[end:],
    encoding="utf-8"
)

print("✅ case menu alterado.")
PY

node --check "$INDEX"

echo
echo "========================================"
echo " ✅ TESTE INSTALADO"
echo "========================================"
echo
echo "Agora inicie o bot e envie:"
echo
echo "/menu"
echo
echo "Quando terminar, mande o log."
echo
echo "Backup:"
echo "$ROOT/dados/src/index.js.backup-flow"
echo
