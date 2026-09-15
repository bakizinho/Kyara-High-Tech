#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$(pwd)"
SRC="$ROOT/dados/src"
MENU_DIR="$SRC/core/menuAdaptativo"
MENU="$MENU_DIR/menu-adaptativo.js"
INDEX="$SRC/index.js"
PREVIEW="$ROOT/menu-kyara-preview.html"

echo "========================================"
echo " KYARA • MENU ADAPTATIVO FINAL"
echo "========================================"

if [ ! -f "$INDEX" ]; then
  echo "❌ Não encontrei:"
  echo "$INDEX"
  echo
  echo "Entre primeiro na pasta do projeto."
  exit 1
fi

mkdir -p "$MENU_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"

echo "📦 Criando backup..."
cp "$INDEX" "$SRC/index.js.backup-menu-final-$STAMP"

if [ -f "$MENU" ]; then
  cp "$MENU" "$MENU_DIR/menu-adaptativo.js.backup-$STAMP"
fi

echo "🧩 Recriando menu-adaptativo.js..."

cat > "$MENU" <<'MENUEOF'
import {
  generateWAMessageFromContent,
  proto,
  jidNormalizedUser
} from 'baileys'

const CONFIG = {
  footer: '🌸 BOT-KYARA • Menu Interativo',
  maxButtons: 9,

  ownerNumbers: [
    '558498445270'
  ],

  channels: [
    {
      name: '📢 Canal Oficial',
      url: 'https://whatsapp.com/channel/0029VbEXEMPLO'
    },
    {
      name: '🌸 Canal Kyara',
      url: 'https://whatsapp.com/channel/0029VbEXEMPLO'
    }
  ]
}

function digits(value = '') {
  return String(value || '').replace(/\D/g, '')
}

function numberFromJid(jid = '') {
  return digits(String(jid).split('@')[0])
}

function isOwner(jid = '') {
  const n = numberFromJid(jid)
  return CONFIG.ownerNumbers.some(x => digits(x) === n)
}

function greeting() {
  const h = new Date().getHours()

  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function uptime() {
  const sec = Math.floor(process.uptime())

  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60

  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function memory() {
  const used = process.memoryUsage().rss / 1024 / 1024
  return `${used.toFixed(1)} MB`
}

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

/*
 * IMPORTANTE:
 * Cada botão precisa ter buttonParamsJson como STRING.
 */
function quickReply(displayText, id) {
  return {
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: displayText,
      id
    })
  }
}

function singleSelect(displayText, title, sections) {
  return {
    name: 'single_select',
    buttonParamsJson: JSON.stringify({
      title,
      sections
    })
  }
}

function ctaUrl(displayText, url) {
  return {
    name: 'cta_url',
    buttonParamsJson: JSON.stringify({
      display_text: displayText,
      url
    })
  }
}

function ctaCopy(displayText, copyCode) {
  return {
    name: 'cta_copy',
    buttonParamsJson: JSON.stringify({
      display_text: displayText,
      copy_code: copyCode
    })
  }
}

function categoria(title, rows) {
  return {
    title,
    rows
  }
}

function row(title, description, id) {
  return {
    title,
    description,
    id
  }
}

function buildSections({ owner = false, admin = false } = {}) {
  const sections = [
    categoria('🌸 PRINCIPAL', [
      row(
        '🏠 Início',
        'Voltar para o menu principal',
        'menu'
      ),
      row(
        '📜 Comandos',
        'Lista completa de comandos',
        'help'
      ),
      row(
        '🤖 Status do bot',
        'Veja informações do Kyara',
        'status'
      )
    ]),

    categoria('📥 DOWNLOADS', [
      row(
        '🎵 Áudio',
        'Baixar áudio de mídia',
        'menu_download_audio'
      ),
      row(
        '🎬 Vídeo',
        'Baixar vídeos',
        'menu_download_video'
      ),
      row(
        '📸 Instagram',
        'Ferramentas para Instagram',
        'menu_instagram'
      ),
      row(
        '▶️ YouTube',
        'Ferramentas para YouTube',
        'menu_youtube'
      )
    ]),

    categoria('🎨 EDIÇÃO', [
      row(
        '🖼️ Imagem',
        'Ferramentas de imagem',
        'menu_imagem'
      ),
      row(
        '✏️ Editar mídia',
        'Efeitos e transformações',
        'menu_edicao'
      ),
      row(
        '😂 Figurinhas',
        'Criar e converter stickers',
        'menu_sticker'
      ),
      row(
        '🪄 Logos',
        'Criar logos e artes',
        'menu_logos'
      )
    ]),

    categoria('🛠️ FERRAMENTAS', [
      row(
        '🔧 Utilidades',
        'Ferramentas gerais',
        'menu_ferramentas'
      ),
      row(
        '🔎 Pesquisas',
        'Pesquisar informações',
        'menu_pesquisa'
      ),
      row(
        '🧰 Alteradores',
        'Conversores e modificadores',
        'menu_alteradores'
      )
    ]),

    categoria('🎮 DIVERSÃO', [
      row(
        '🎮 Jogos',
        'Jogos disponíveis',
        'menu_jogos'
      ),
      row(
        '🎲 RPG',
        'Sistema RPG do Kyara',
        'menu_rpg'
      ),
      row(
        '🏆 Ranking',
        'Ranking e pontuação',
        'menu_ranking'
      )
    ])
  ]

  if (admin) {
    sections.push(
      categoria('👮 ADMINISTRAÇÃO', [
        row(
          '👥 Grupo',
          'Configurações do grupo',
          'menu_admin_grupo'
        ),
        row(
          '🛡️ Moderação',
          'Ferramentas de moderação',
          'menu_admin_moderacao'
        ),
        row(
          '🚫 Anti-spam',
          'Proteção contra spam',
          'kyarasafe'
        )
      ])
    )
  }

  if (owner) {
    sections.push(
      categoria('👑 OWNER', [
        row(
          '⚙️ Painel Owner',
          'Configurações exclusivas',
          'menu_owner'
        ),
        row(
          '🧪 Diagnóstico',
          'Diagnóstico do sistema',
          'menu_diagnostico'
        ),
        row(
          '📊 Sistema',
          'Informações internas',
          'menu_sistema'
        )
      ])
    )
  }

  return sections
}

function buildMenuText(pushName, { owner, admin } = {}) {
  const nome = safeText(pushName, 'usuário')

  const nivel =
    owner
      ? '👑 OWNER'
      : admin
        ? '⚙️ ADMIN'
        : '👤 USUÁRIO'

  return (
    `${greeting()}, *${nome}*! 🌸\n\n` +
    `╭━━〔 🌸 *BOT-KYARA* 〕━━╮\n` +
    `┃ ${nivel}\n` +
    `┃ ⚡ Online: ${uptime()}\n` +
    `┃ 🧠 RAM: ${memory()}\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
    `Escolha uma categoria abaixo para continuar.\n` +
    `O menu muda conforme suas permissões.`
  )
}

function buildButtons({ owner = false, admin = false } = {}) {
  const sections = buildSections({ owner, admin })

  const buttons = [
    singleSelect(
      '📂 ABRIR TODOS OS MENUS',
      '🌸 CATEGORIAS KYARA',
      sections
    ),

    quickReply(
      '🏠 INÍCIO',
      'menu'
    ),

    quickReply(
      '📜 COMANDOS',
      'help'
    )
  ]

  for (const channel of CONFIG.channels) {
    if (buttons.length >= CONFIG.maxButtons) break

    buttons.push(
      ctaUrl(
        channel.name,
        channel.url
      )
    )
  }

  return buttons.slice(0, CONFIG.maxButtons)
}

/*
 * Estrutura adicional usada pelo WhatsApp para Native Flow.
 * Mantemos separada para facilitar diagnóstico.
 */
function buildAdditionalNodes() {
  return [
    {
      tag: 'biz',
      attrs: {
        actual_actors: '2',
        host_storage: '2',
        privacy_mode_ts: String(
          Math.floor(Date.now() / 1000) - 77980457
        )
      },
      content: [
        {
          tag: 'interactive',
          attrs: {
            type: 'native_flow',
            v: '1'
          },
          content: [
            {
              tag: 'native_flow',
              attrs: {
                v: '9',
                name: 'mixed'
              }
            }
          ]
        },
        {
          tag: 'quality_control',
          attrs: {
            source_type: 'third_party'
          }
        }
      ]
    }
  ]
}

async function enviarMenuAdaptativo(
  sock,
  jid,
  pushName = 'usuário',
  options = {}
) {
  if (!sock?.relayMessage) {
    throw new Error('Socket sem relayMessage')
  }

  if (!jid) {
    throw new Error('JID vazio')
  }

  const owner =
    options.owner ??
    isOwner(jid)

  const admin =
    !!options.admin

  const text =
    buildMenuText(
      pushName,
      {
        owner,
        admin
      }
    )

  const buttons =
    buildButtons({
      owner,
      admin
    })

  console.log(
    '[MENU ADAPTATIVO] Botões:',
    buttons.map(x => x.name)
  )

  const interactive =
    proto.Message.InteractiveMessage.create({
      body:
        proto.Message.InteractiveMessage.Body.create({
          text
        }),

      footer:
        proto.Message.InteractiveMessage.Footer.create({
          text: CONFIG.footer
        }),

      header:
        proto.Message.InteractiveMessage.Header.create({
          title:
            owner
              ? '👑 KYARA • OWNER MODE'
              : admin
                ? '⚙️ KYARA • ADMIN MODE'
                : '🌸 KYARA • USER MODE',
          hasMediaAttachment: false
        }),

      nativeFlowMessage:
        proto.Message.InteractiveMessage.NativeFlowMessage.create({
          buttons,
          messageParamsJson: '{}',
          messageVersion: 1
        })
    })

  const normalizedJid =
    jidNormalizedUser(jid)

  const msg =
    generateWAMessageFromContent(
      normalizedJid,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },

            interactiveMessage:
              interactive
          }
        }
      },
      {
        userJid:
          sock?.user?.id ||
          normalizedJid
      }
    )

  if (!msg?.message || !msg?.key?.id) {
    throw new Error(
      'generateWAMessageFromContent não produziu WAMessage válido'
    )
  }

  console.log(
    '[MENU ADAPTATIVO] messageId:',
    msg.key.id
  )

  const result =
    await sock.relayMessage(
      normalizedJid,
      msg.message,
      {
        messageId: msg.key.id,
        additionalNodes:
          buildAdditionalNodes()
      }
    )

  console.log(
    '[MENU ADAPTATIVO] relayMessage:',
    result
  )

  return {
    ok: true,
    messageId: msg.key.id,
    relayResult: result,
    buttons
  }
}

async function menuKyaraAdaptativo(
  sock,
  jid,
  pushName = 'usuário',
  options = {}
) {
  try {
    return await enviarMenuAdaptativo(
      sock,
      jid,
      pushName,
      options
    )
  } catch (error) {
    console.error(
      '[MENU ADAPTATIVO] Native Flow falhou:',
      error?.stack ||
      error?.message ||
      error
    )

    /*
     * Fallback simples.
     * Não tenta reenviar outro Native Flow.
     */
    if (typeof sock.sendMessage === 'function') {
      const owner =
        options.owner ??
        isOwner(jid)

      const admin =
        !!options.admin

      const text =
        buildMenuText(
          pushName,
          {
            owner,
            admin
          }
        ) +
        '\n\n' +
        '⚠️ O menu interativo não pôde ser renderizado neste cliente.\n' +
        'Use /help para acessar os comandos.'

      await sock.sendMessage(
        jid,
        {
          text
        }
      )
    }

    return {
      ok: false,
      error:
        error?.message ||
        String(error)
    }
  }
}

function getInteractiveCommand(message) {
  try {
    const native =
      message?.interactiveResponseMessage

    if (native?.nativeFlowResponseMessage?.paramsJson) {
      const params =
        JSON.parse(
          native.nativeFlowResponseMessage.paramsJson
        )

      return (
        params.id ||
        params.selectedId ||
        params.rowId ||
        null
      )
    }

    const template =
      message?.templateButtonReplyMessage

    if (template?.selectedId) {
      return template.selectedId
    }

    const buttons =
      message?.buttonsResponseMessage

    if (buttons?.selectedButtonId) {
      return buttons.selectedButtonId
    }

    const list =
      message?.listResponseMessage

    if (list?.singleSelectReply?.selectedRowId) {
      return list.singleSelectReply.selectedRowId
    }

    return null
  } catch {
    return null
  }
}

function installInteractiveHandler() {
  return {
    getInteractiveCommand
  }
}

export {
  CONFIG,
  isOwner,
  buildSections,
  buildButtons,
  buildMenuText,
  enviarMenuAdaptativo,
  menuKyaraAdaptativo,
  getInteractiveCommand,
  installInteractiveHandler
}
MENUEOF

echo "✅ Menu adaptativo recriado."

echo "🔧 Ajustando case /menu..."

python3 - "$INDEX" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

marker = "case 'menu': {"
start = text.find(marker)

if start == -1:
    raise SystemExit("❌ case 'menu' não encontrado.")

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

new_case = r"""case 'menu': {
  console.log('[MENU] 🌸 Abrindo MENU ADAPTATIVO FINAL...');

  try {
    const {
      menuKyaraAdaptativo
    } = await import('./core/menuAdaptativo/menu-adaptativo.js');

    const menuPushName =
      typeof pushName !== 'undefined' && pushName
        ? pushName
        : typeof pushname !== 'undefined' && pushname
          ? pushname
          : typeof senderName !== 'undefined' && senderName
            ? senderName
            : 'usuário';

    await menuKyaraAdaptativo(
      nazu,
      from,
      menuPushName,
      {
        isGroup:
          typeof isGroup !== 'undefined'
            ? !!isGroup
            : false,

        isAdmin:
          typeof isAdmin !== 'undefined'
            ? !!isAdmin
            : false,

        owner:
          typeof sender !== 'undefined'
            ? undefined
            : undefined,

        sender:
          typeof sender !== 'undefined'
            ? sender
            : null,

        command: 'menu'
      }
    );

    console.log('[MENU] ✅ Menu adaptativo enviado.');
  } catch (menuError) {
    console.error(
      '[MENU] ❌ ERRO:',
      menuError?.stack ||
      menuError?.message ||
      menuError
    );

    try {
      if (typeof reply === 'function') {
        await reply(
          '🌸 *BOT-KYARA*\n\n' +
          '❌ Não consegui abrir o menu interativo.\n' +
          'Use /help.'
        );
      }
    } catch {}
  }

  break;
}"""

path.write_text(
    text[:start] +
    new_case +
    text[end:],
    encoding="utf-8"
)

print("✅ case /menu atualizado.")
PY

echo "🔍 Verificando sintaxe..."

node --check "$MENU"
node --check "$INDEX"

echo "✅ JavaScript OK."

echo "🎨 Criando prévia HTML..."

cat > "$PREVIEW" <<'HTMLEOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BOT-KYARA — Prévia do Menu</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: Arial, sans-serif;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.phone {
  width: 390px;
  max-width: 100%;
  min-height: 700px;
  background: #efe7dd;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.55);
}

.top {
  background: #075e54;
  color: white;
  padding: 18px;
  font-weight: bold;
}

.chat {
  padding: 20px 14px;
  min-height: 620px;
  background:
    radial-gradient(#ddd 1px, transparent 1px);
  background-size: 12px 12px;
}

.message {
  background: white;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 2px rgba(0,0,0,.15);
}

.title {
  font-size: 19px;
  font-weight: bold;
  margin-bottom: 8px;
}

.small {
  color: #777;
  font-size: 12px;
  margin-top: 10px;
}

.button {
  margin-top: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  font-weight: bold;
  background: #fff;
}

.primary {
  background: #e7f8ee;
}

.section {
  margin-top: 16px;
  font-size: 12px;
  font-weight: bold;
  color: #777;
}

.row {
  padding: 9px 0;
  border-bottom: 1px solid #eee;
}

.footer {
  margin-top: 12px;
  color: #888;
  font-size: 11px;
}
</style>
</head>

<body>

<div class="phone">

  <div class="top">
    🌸 BOT-KYARA
  </div>

  <div class="chat">

    <div class="message">

      <div class="title">
        Bom dia, Baki! 🌸
      </div>

      <div>
        ╭━━〔 🌸 <b>BOT-KYARA</b> 〕━━╮<br>
        ┃ 👑 OWNER<br>
        ┃ ⚡ Online: 12m 31s<br>
        ┃ 🧠 RAM: 142.4 MB<br>
        ╰━━━━━━━━━━━━━━━━━━━━╯
      </div>

      <br>

      Escolha uma categoria abaixo para continuar.<br>
      O menu muda conforme suas permissões.

      <div class="button primary">
        📂 ABRIR TODOS OS MENUS
      </div>

      <div class="button">
        🏠 INÍCIO
      </div>

      <div class="button">
        📜 COMANDOS
      </div>

      <div class="button">
        📢 CANAL OFICIAL
      </div>

      <div class="section">
        🌸 CATEGORIAS
      </div>

      <div class="row">📥 Downloads</div>
      <div class="row">🎨 Edição</div>
      <div class="row">🛠️ Ferramentas</div>
      <div class="row">🎮 Diversão</div>
      <div class="row">👮 Administração</div>
      <div class="row">👑 Owner</div>

      <div class="footer">
        🌸 BOT-KYARA • Menu Interativo
      </div>

    </div>

  </div>

</div>

</body>
</html>
HTMLEOF

echo "✅ Prévia criada:"
echo "$PREVIEW"

echo
echo "========================================"
echo " ✅ KYARA ARRUMADO"
echo "========================================"
echo
echo "Arquivos:"
echo "  • $MENU"
echo "  • $PREVIEW"
echo
echo "Backup:"
echo "  • $SRC/index.js.backup-menu-final-$STAMP"
echo
echo "Agora execute:"
echo
echo "  node ."
echo
echo "E no WhatsApp:"
echo
echo "  /menu"
echo
echo "Para abrir a prévia HTML no Android:"
echo
echo "  termux-open '$PREVIEW'"
echo
echo "========================================"
