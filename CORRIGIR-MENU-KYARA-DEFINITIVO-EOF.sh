#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$(pwd)"
SRC="$ROOT/dados/src"
MENU_DIR="$SRC/core/menuAdaptativo"
MENU="$MENU_DIR/menu-adaptativo.js"
INDEX="$SRC/index.js"
PREVIEW="$ROOT/menu-kyara-preview.html"

echo "========================================"
echo " 🌸 KYARA • MENU ORIGINAL DEFINITIVO"
echo "========================================"

if [ ! -f "$INDEX" ]; then
  echo "❌ index.js não encontrado:"
  echo "$INDEX"
  exit 1
fi

mkdir -p "$MENU_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"

echo "📦 Backup..."

cp "$INDEX" \
  "$SRC/index.js.backup-menu-original-$STAMP"

if [ -f "$MENU" ]; then
  cp "$MENU" \
    "$MENU_DIR/menu-adaptativo.js.backup-original-$STAMP"
fi

echo "🧩 Recriando menu adaptativo..."

cat > "$MENU" <<'MENUEOF'
import fs from 'fs'
import path from 'path'

import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
  jidNormalizedUser
} from 'baileys'


const CONFIG = {

  footer:
    '🌸 BOT-KYARA • Menu Interativo',

  ownerNumbers: [
    '558498445270'
  ],

  channels: [

    {
      name:
        '📢 O COMEÇO • Canal Oficial',

      url:
        'https://whatsapp.com/channel/0029VbCXBCy8fewmEhto8J0w'
    },

    {
      name:
        '🌸 Kyara-bot • Canal do Bot',

      url:
        'https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r'
    }

  ]

}


/* =========================================================
 * UTILIDADES
 * ========================================================= */

function digits(value = '') {

  return String(value || '')
    .replace(/\D/g, '')

}


function numberFromJid(jid = '') {

  return digits(
    String(jid || '')
      .split('@')[0]
      .split(':')[0]
  )

}


function isOwner(jid = '') {

  const number =
    numberFromJid(jid)

  return CONFIG.ownerNumbers.some(
    owner =>
      digits(owner) === number
  )

}


function safeText(
  value,
  fallback = ''
) {

  const text =
    String(value ?? '').trim()

  return text || fallback

}


function greeting() {

  const hour =
    new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return 'Bom dia'
  }

  if (hour >= 12 && hour < 18) {
    return 'Boa tarde'
  }

  return 'Boa noite'

}


function uptime() {

  const total =
    Math.floor(process.uptime())

  const hours =
    Math.floor(total / 3600)

  const minutes =
    Math.floor(
      (total % 3600) / 60
    )

  const seconds =
    total % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }

  return `${seconds}s`

}


function memory() {

  const used =
    process.memoryUsage().rss /
    1024 /
    1024

  return `${used.toFixed(1)} MB`

}


/* =========================================================
 * MENUS ORIGINAIS DA KYARA
 *
 * NÃO INVENTAR NOVAS CATEGORIAS.
 * ESTES SÃO OS MENUS ORIGINAIS.
 * ========================================================= */

const MENUS_ORIGINAIS = [

  {
    title:
      '📥 Downloads',

    description:
      'Baixar músicas, vídeos e mídias',

    command:
      'menudown'
  },

  {
    title:
      '🎨 Logos',

    description:
      'Criar logos e artes',

    command:
      'menulogos'
  },

  {
    title:
      '✏️ Edits',

    description:
      'Efeitos e edições de mídia',

    command:
      'menuedits'
  },

  {
    title:
      '👮 Administração',

    description:
      'Ferramentas para administradores',

    command:
      'menuadm'
  },

  {
    title:
      '🎮 Brincadeiras',

    description:
      'Jogos e brincadeiras',

    command:
      'menubn'
  },

  {
    title:
      '👑 Dono',

    description:
      'Ferramentas exclusivas do dono',

    command:
      'menudono'
  },

  {
    title:
      '👥 Membros',

    description:
      'Ferramentas para membros',

    command:
      'menumemb'
  },

  {
    title:
      '🧰 Ferramentas',

    description:
      'Utilidades do bot',

    command:
      'ferramentas'
  },

  {
    title:
      '🎨 Figurinhas',

    description:
      'Criar e converter figurinhas',

    command:
      'menufig'
  },

  {
    title:
      '✨ Alteradores',

    description:
      'Fontes, textos e efeitos',

    command:
      'alteradores'
  },

  {
    title:
      '⚔️ RPG',

    description:
      'Sistema RPG da Kyara',

    command:
      'menurpg'
  },

  {
    title:
      '⭐ VIP',

    description:
      'Sistema e comandos VIP',

    command:
      'menuvip'
  }

]


/* =========================================================
 * RESOLVER MENÇÃO
 * ========================================================= */

async function resolveMentionJid(
  sock,
  sender
) {

  if (!sender) {
    return null
  }

  const normalized =
    jidNormalizedUser(sender)

  /*
   * Se já for PN, usa diretamente.
   */
  if (
    normalized.endsWith(
      '@s.whatsapp.net'
    )
  ) {
    return normalized
  }

  /*
   * Baileys v7:
   * tenta resolver @lid -> PN.
   */
  if (
    normalized.endsWith('@lid')
  ) {

    try {

      const mapping =
        sock
          ?.signalRepository
          ?.lidMapping

      if (
        mapping &&
        typeof mapping.getPNForLID ===
          'function'
      ) {

        const pn =
          await mapping.getPNForLID(
            normalized
          )

        if (pn) {
          return jidNormalizedUser(pn)
        }

      }

    } catch (error) {

      console.warn(
        '[MENU] Não foi possível resolver LID:',
        error?.message ||
        error
      )

    }

  }

  return normalized

}


/* =========================================================
 * MÍDIA DO MENU
 * ========================================================= */

function encontrarMidiaMenu() {

  /*
   * menu.mp4 tem prioridade.
   * Se não existir, usa menu.jpg.
   */

  const base =
    path.resolve(
      process.cwd(),
      'dados',
      'midias'
    )

  const video =
    path.join(
      base,
      'menu.mp4'
    )

  const image =
    path.join(
      base,
      'menu.jpg'
    )

  const imageJpeg =
    path.join(
      base,
      'menu.jpeg'
    )

  const imagePng =
    path.join(
      base,
      'menu.png'
    )


  if (fs.existsSync(video)) {

    return {
      type: 'video',
      path: video
    }

  }


  if (fs.existsSync(image)) {

    return {
      type: 'image',
      path: image
    }

  }


  if (fs.existsSync(imageJpeg)) {

    return {
      type: 'image',
      path: imageJpeg
    }

  }


  if (fs.existsSync(imagePng)) {

    return {
      type: 'image',
      path: imagePng
    }

  }


  return null

}


/* =========================================================
 * ROWS
 * ========================================================= */

function buildRows() {

  return MENUS_ORIGINAIS.map(
    item => ({

      title:
        item.title,

      description:
        item.description,

      id:
        item.command

    })
  )

}


/* =========================================================
 * NATIVE FLOW
 * ========================================================= */

function buildNativeFlowButtons() {

  const rows =
    buildRows()

  /*
   * Divide os 12 menus em duas seções.
   * Assim o WhatsApp não recebe uma lista gigantesca
   * em uma única seção.
   */

  const first =
    rows.slice(0, 6)

  const second =
    rows.slice(6)

  const sections = [

    {
      title:
        '🌸 MENU PRINCIPAL',

      rows:
        first
    },

    {
      title:
        '🌸 MAIS MENUS',

      rows:
        second
    }

  ]


  return [

    {
      name:
        'single_select',

      buttonParamsJson:
        JSON.stringify({

          title:
            '🌸 CATEGORIAS KYARA',

          sections

        })

    },

    {
      name:
        'cta_url',

      buttonParamsJson:
        JSON.stringify({

          display_text:
            CONFIG.channels[0].name,

          url:
            CONFIG.channels[0].url

        })

    },

    {
      name:
        'cta_url',

      buttonParamsJson:
        JSON.stringify({

          display_text:
            CONFIG.channels[1].name,

          url:
            CONFIG.channels[1].url

        })

    }

  ]

}


/* =========================================================
 * TEXTO
 * ========================================================= */

function buildMenuText(
  pushName,
  mentionTag,
  {
    owner = false,
    admin = false
  } = {}
) {

  const nome =
    safeText(
      pushName,
      'usuário'
    )


  const nivel =
    owner
      ? '👑 OWNER'
      : admin
        ? '⚙️ ADMIN'
        : '👤 USUÁRIO'


  return (

    `${greeting()}, ${mentionTag || nome}! 🌸\n\n` +

    `╭━━〔 🌸 *BOT-KYARA* 〕━━╮\n` +

    `┃ ${nivel}\n` +

    `┃ ⚡ Online: ${uptime()}\n` +

    `┃ 🧠 RAM: ${memory()}\n` +

    `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +

    `Escolha um dos menus abaixo.\n` +

    `🌸 *12 menus originais da Kyara.*`

  )

}


/* =========================================================
 * ENVIAR MENU
 * ========================================================= */

async function enviarMenuAdaptativo(
  sock,
  jid,
  pushName = 'usuário',
  options = {}
) {

  if (!sock?.relayMessage) {
    throw new Error(
      'Socket sem relayMessage'
    )
  }


  if (!jid) {
    throw new Error(
      'JID vazio'
    )
  }


  const owner =
    options.owner ??
    isOwner(
      options.sender ||
      jid
    )


  const admin =
    !!options.isAdmin ||
    !!options.admin


  /*
   * Resolve a menção.
   */
  const mentionJid =
    await resolveMentionJid(
      sock,
      options.sender || jid
    )


  let mentionNumber =
    numberFromJid(
      mentionJid
    )


  /*
   * Se não houver PN disponível,
   * usa o identificador recebido como fallback.
   */
  if (!mentionNumber) {

    mentionNumber =
      numberFromJid(
        options.sender ||
        jid
      )

  }


  const mentionTag =
    mentionNumber
      ? `@${mentionNumber}`
      : `@${safeText(pushName, 'usuário')}`


  const text =
    buildMenuText(
      pushName,
      mentionTag,
      {
        owner,
        admin
      }
    )


  const buttons =
    buildNativeFlowButtons()


  console.log(
    '[MENU] Menus originais:',
    MENUS_ORIGINAIS.length
  )

  console.log(
    '[MENU] Menção:',
    mentionTag
  )

  console.log(
    '[MENU] JID da menção:',
    mentionJid
  )


  /*
   * Prepara foto ou vídeo.
   */
  const media =
    encontrarMidiaMenu()


  let preparedMedia =
    null


  if (media) {

    console.log(
      '[MENU] Mídia encontrada:',
      media.type,
      media.path
    )


    try {

      const buffer =
        fs.readFileSync(
          media.path
        )


      if (
        media.type === 'video'
      ) {

        const prepared =
          await prepareWAMessageMedia(
            {
              video:
                buffer
            },
            {
              upload:
                sock.waUploadToServer
            }
          )

        preparedMedia =
          {
            type: 'video',
            message:
              prepared?.videoMessage ||
              null
          }

      } else {

        const prepared =
          await prepareWAMessageMedia(
            {
              image:
                buffer
            },
            {
              upload:
                sock.waUploadToServer
            }
          )

        preparedMedia =
          {
            type: 'image',
            message:
              prepared?.imageMessage ||
              null
          }

      }

    } catch (mediaError) {

      console.error(
        '[MENU] Erro preparando mídia:',
        mediaError?.stack ||
        mediaError?.message ||
        mediaError
      )

      preparedMedia =
        null

    }

  } else {

    console.warn(
      '[MENU] Nenhuma mídia encontrada em dados/midias.'
    )

  }


  /*
   * Header.
   */
  const header =
    preparedMedia?.message

      ? {

          title:
            owner
              ? '👑 KYARA • OWNER MODE'
              : admin
                ? '⚙️ KYARA • ADMIN MODE'
                : '🌸 KYARA • USER MODE',

          hasMediaAttachment:
            true,

          ...(preparedMedia.type === 'video'
            ? {
                videoMessage:
                  preparedMedia.message
              }
            : {
                imageMessage:
                  preparedMedia.message
              })

        }

      : {

          title:
            owner
              ? '👑 KYARA • OWNER MODE'
              : admin
                ? '⚙️ KYARA • ADMIN MODE'
                : '🌸 KYARA • USER MODE',

          hasMediaAttachment:
            false

        }


  /*
   * Contexto de menção.
   */
  const contextInfo = {

    mentionedJid:
      mentionJid
        ? [mentionJid]
        : []

  }


  const interactive =
    proto.Message.InteractiveMessage.create({

      header:

        proto.Message.InteractiveMessage
          .Header.create(
            header
          ),

      body:

        proto.Message.InteractiveMessage
          .Body.create({

            text

          }),

      footer:

        proto.Message.InteractiveMessage
          .Footer.create({

            text:
              CONFIG.footer

          }),

      nativeFlowMessage:

        proto.Message.InteractiveMessage
          .NativeFlowMessage.create({

            buttons,

            messageParamsJson:
              '{}',

            messageVersion:
              1

          })

    })


  /*
   * Coloca contextInfo no InteractiveMessage.
   */
  interactive.contextInfo =
    contextInfo


  const normalizedJid =
    jidNormalizedUser(
      jid
    )


  const msg =
    generateWAMessageFromContent(
      normalizedJid,
      {

        viewOnceMessage: {

          message: {

            messageContextInfo: {

              deviceListMetadata: {},

              deviceListMetadataVersion:
                2

            },

            interactiveMessage:
              interactive

          }

        }

      },
      {

        quoted:
          options.info ||
          undefined,

        userJid:
          sock?.user?.id ||
          normalizedJid

      }
    )


  if (
    !msg?.message ||
    !msg?.key?.id
  ) {

    throw new Error(
      'Native Flow inválido'
    )

  }


  /*
   * Mesmo nó que já funcionou
   * no diagnóstico.
   */
  const bizNode = {

    tag:
      'biz',

    attrs: {

      actual_actors:
        '2',

      host_storage:
        '2',

      privacy_mode_ts:
        String(
          Math.floor(
            Date.now() / 1000
          ) - 77980457
        )

    },

    content: [

      {

        tag:
          'interactive',

        attrs: {

          type:
            'native_flow',

          v:
            '1'

        },

        content: [

          {

            tag:
              'native_flow',

            attrs: {

              v:
                '9',

              name:
                'mixed'

            }

          }

        ]

      },

      {

        tag:
          'quality_control',

        attrs: {

          source_type:
            'third_party'

        }

      }

    ]

  }


  const result =
    await sock.relayMessage(
      normalizedJid,
      msg.message,
      {

        messageId:
          msg.key.id,

        additionalNodes:
          [bizNode]

      }
    )


  console.log(
    '[MENU] Native Flow enviado:',
    msg.key.id
  )

  console.log(
    '[MENU] relay:',
    result
  )


  return {

    ok:
      true,

    messageId:
      msg.key.id,

    menus:
      MENUS_ORIGINAIS.length,

    mentionJid,

    mentionTag,

    media:
      preparedMedia?.type ||
      null

  }

}


/* =========================================================
 * FALLBACK
 * ========================================================= */

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
      '[MENU] Native Flow falhou:',
      error?.stack ||
      error?.message ||
      error
    )


    try {

      const mentionJid =
        await resolveMentionJid(
          sock,
          options.sender ||
          jid
        )


      const number =
        numberFromJid(
          mentionJid ||
          options.sender ||
          jid
        )


      const mention =
        number
          ? `@${number}`
          : safeText(
              pushName,
              'usuário'
            )


      const text =
        buildMenuText(
          pushName,
          mention,
          {
            owner:
              options.owner ??
              isOwner(
                options.sender ||
                jid
              ),

            admin:
              !!options.isAdmin ||
              !!options.admin
          }
        )


      if (
        typeof sock.sendMessage ===
        'function'
      ) {

        await sock.sendMessage(
          jid,
          {

            text,

            mentions:
              mentionJid
                ? [mentionJid]
                : []

          },
          {

            quoted:
              options.info ||
              undefined

          }
        )

      }

    } catch (fallbackError) {

      console.error(
        '[MENU] Fallback também falhou:',
        fallbackError?.stack ||
        fallbackError?.message ||
        fallbackError
      )

    }


    return {

      ok:
        false,

      error:
        error?.message ||
        String(error)

    }

  }

}


/* =========================================================
 * LEITOR DE CLIQUES
 * ========================================================= */

function getInteractiveCommand(
  message
) {

  try {

    const native =
      message
        ?.interactiveResponseMessage
        ?.nativeFlowResponseMessage


    if (
      native?.paramsJson
    ) {

      const params =
        JSON.parse(
          native.paramsJson
        )


      return (
        params.id ||
        params.selectedId ||
        params.rowId ||
        null
      )

    }


    const template =
      message
        ?.templateButtonReplyMessage


    if (
      template?.selectedId
    ) {

      return template.selectedId

    }


    const button =
      message
        ?.buttonsResponseMessage


    if (
      button?.selectedButtonId
    ) {

      return button.selectedButtonId

    }


    const list =
      message
        ?.listResponseMessage


    if (
      list
        ?.singleSelectReply
        ?.selectedRowId
    ) {

      return (
        list
          .singleSelectReply
          .selectedRowId
      )

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

  MENUS_ORIGINAIS,

  isOwner,

  buildRows,

  buildNativeFlowButtons,

  buildMenuText,

  encontrarMidiaMenu,

  resolveMentionJid,

  enviarMenuAdaptativo,

  menuKyaraAdaptativo,

  getInteractiveCommand,

  installInteractiveHandler

}
MENUEOF


echo "✅ Menu original recriado."

echo "🔧 Corrigindo /menu..."

node <<'PATCHNODE'
const fs = require('fs')

const file =
  process.argv[1] ||
  './dados/src/index.js'

let text =
  fs.readFileSync(
    file,
    'utf8'
  )

const marker =
  "case 'menu': {"

const start =
  text.indexOf(marker)

if (start < 0) {

  throw new Error(
    "case 'menu' não encontrado."
  )

}


/*
 * Encontra o fechamento do case
 * respeitando chaves dentro do bloco.
 */
let depth = 0
let inString = null
let escaped = false
let end = -1

for (
  let i = start;
  i < text.length;
  i++
) {

  const ch =
    text[i]

  if (inString) {

    if (escaped) {

      escaped = false
      continue

    }

    if (ch === '\\') {

      escaped = true
      continue

    }

    if (ch === inString) {

      inString = null

    }

    continue

  }


  if (
    ch === "'" ||
    ch === '"' ||
    ch === '`'
  ) {

    inString = ch
    continue

  }


  if (ch === '{') {

    depth++

  } else if (ch === '}') {

    depth--

    if (depth === 0) {

      end =
        i + 1

      break

    }

  }

}


if (end < 0) {

  throw new Error(
    "Não foi possível localizar o fim do case menu."
  )

}


const replacement = String.raw`case 'menu': {
  console.log('[MENU] 🌸 Abrindo MENU ORIGINAL DA KYARA...');

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

    const menuSender =
      typeof sender !== 'undefined'
        ? sender
        : typeof menc_os2 !== 'undefined' && menc_os2
          ? menc_os2
          : from;

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

        sender:
          menuSender,

        info:
          typeof info !== 'undefined'
            ? info
            : null,

        command:
          'menu'
      }
    );

    console.log(
      '[MENU] ✅ MENU ORIGINAL enviado.'
    );

  } catch (menuError) {

    console.error(
      '[MENU] ❌ ERRO:',
      menuError?.stack ||
      menuError?.message ||
      menuError
    );

    try {

      if (
        typeof reply === 'function'
      ) {

        await reply(
          '🌸 *BOT-KYARA*\\n\\n' +
          '❌ Não consegui abrir o menu interativo.\\n' +
          'Use /help.'
        );

      }

    } catch {}

  }

  break;
}`


fs.writeFileSync(
  file,
  text.slice(0, start) +
  replacement +
  text.slice(end),
  'utf8'
)

console.log(
  '✅ case /menu atualizado.'
)
PATCHNODE
"$INDEX"

echo "🔍 Verificando sintaxe..."

node --check "$MENU"
node --check "$INDEX"

echo "✅ JavaScript OK."

echo "🎨 Atualizando prévia HTML..."

cat > "$PREVIEW" <<'HTMLEOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0"
>

<title>BOT-KYARA • Menu Original</title>

<style>

* {
  box-sizing: border-box;
}

body {

  margin: 0;

  min-height: 100vh;

  background: #101010;

  font-family:
    Arial,
    sans-serif;

  display: flex;

  justify-content: center;

  align-items: center;

  padding: 20px;

}

.phone {

  width: 390px;

  max-width: 100%;

  min-height: 720px;

  background: #efe7dd;

  border-radius: 28px;

  overflow: hidden;

  box-shadow:
    0 20px 60px
    rgba(0,0,0,.6);

}

.top {

  background: #075e54;

  color: white;

  padding: 18px;

  font-weight: bold;

}

.chat {

  padding: 20px 14px;

  min-height: 650px;

  background:
    radial-gradient(
      #d8d0c7 1px,
      transparent 1px
    );

  background-size: 12px 12px;

}

.message {

  background: white;

  border-radius: 10px;

  overflow: hidden;

  box-shadow:
    0 1px 3px
    rgba(0,0,0,.18);

}

.media {

  height: 190px;

  background:
    linear-gradient(
      135deg,
      #2c1a4d,
      #111
    );

  display: flex;

  align-items: center;

  justify-content: center;

  color: white;

  font-size: 52px;

}

.body {

  padding: 15px;

}

.title {

  font-size: 18px;

  font-weight: bold;

  margin-bottom: 8px;

}

.info {

  line-height: 1.55;

}

.mention {

  color: #7c4dff;

  font-weight: bold;

}

.select {

  border-top: 1px solid #ddd;

  padding: 16px;

  text-align: center;

  color: #7250d8;

  font-weight: bold;

}

.channels {

  border-top: 1px solid #ddd;

}

.channel {

  padding: 15px;

  text-align: center;

  border-bottom: 1px solid #ddd;

  color: #7250d8;

  font-weight: bold;

}

.footer {

  padding: 10px 15px;

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

      <div class="media">
        🌸
      </div>

      <div class="body">

        <div class="title">
          🌸 KYARA • USER MODE
        </div>

        <div class="info">

          Bom dia,
          <span class="mention">
            @usuário
          </span>! 🌸

          <br><br>

          ╭━━〔 🌸 <b>BOT-KYARA</b> 〕━━╮
          <br>
          ┃ 👤 USUÁRIO
          <br>
          ┃ ⚡ Online: 32s
          <br>
          ┃ 🧠 RAM: 95.4 MB
          <br>
          ╰━━━━━━━━━━━━━━━━━━━━╯

          <br><br>

          Escolha um dos menus abaixo.
          <br>
          🌸 <b>12 menus originais da Kyara.</b>

        </div>

      </div>

      <div class="select">
        ☷ 🌸 CATEGORIAS KYARA
      </div>

      <div class="channels">

        <div class="channel">
          📢 O COMEÇO • Canal Oficial
        </div>

        <div class="channel">
          🌸 Kyara-bot • Canal do Bot
        </div>

      </div>

      <div class="footer">
        🌸 BOT-KYARA • Menu Interativo
      </div>

    </div>

  </div>

</div>

</body>
</html>
HTMLEOF

echo "✅ Prévia atualizada."

echo
echo "========================================"
echo " ✅ MENU ORIGINAL CORRIGIDO"
echo "========================================"
echo
echo "Agora:"
echo
echo "  node ."
echo
echo "Depois:"
echo
echo "  /menu"
echo
echo "O Native Flow terá SOMENTE:"
echo
echo "  📥 Downloads"
echo "  🎨 Logos"
echo "  ✏️ Edits"
echo "  👮 Administração"
echo "  🎮 Brincadeiras"
echo "  👑 Dono"
echo "  👥 Membros"
echo "  🧰 Ferramentas"
echo "  🎨 Figurinhas"
echo "  ✨ Alteradores"
echo "  ⚔️ RPG"
echo "  ⭐ VIP"
echo
echo "Sem botão Início."
echo "Sem Status."
echo "Sem Comandos inventados."
echo
echo "Canais:"
echo "  📢 O COMEÇO"
echo "  🌸 Kyara-bot"
echo
echo "Mídia:"
echo "  menu.mp4 → prioridade"
echo "  menu.jpg → fallback"
echo
echo "Prévia:"
echo "  $PREVIEW"
echo
echo "========================================"
