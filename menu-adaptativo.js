'use strict'

const fs = require('fs')
const os = require('os')
const {
  generateWAMessageFromContent,
  proto,
  jidNormalizedUser
} = require('@whiskeysockets/baileys')

/*
 * ╔══════════════════════════════════════════════╗
 * ║          KYARA • MENU ADAPTATIVO             ║
 * ║      Native Flow + permissões + fallback     ║
 * ╚══════════════════════════════════════════════╝
 *
 * Não usa:
 * - forwardingScore falso
 * - verificação falsa
 * - "ping" inventado
 * - campos secretos inexistentes
 *
 * O menu se adapta ao usuário/grupo.
 */

const CONFIG = {
  ownerNumbers: [
    '5584987480834'
  ],

  botNumber: '558498069737',

  channels: {
    bot: 'https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r',
    owner: 'https://whatsapp.com/channel/0029VbCXBCy8fewmEhto8J0w'
  },

  media: {
    video: './media/kyara.mp4',
    image: './media/kyara.jpg'
  },

  footer: 'Kyara OS • Menu Adaptativo'
}

/* =========================================================
 * UTILIDADES
 * ======================================================= */

function digits(value = '') {
  return String(value).replace(/\D/g, '')
}

function sameUser(a, b) {
  if (!a || !b) return false

  try {
    return jidNormalizedUser(a) === jidNormalizedUser(b)
  } catch {
    return digits(a) === digits(b)
  }
}

function getNumberFromJid(jid = '') {
  return digits(String(jid).split('@')[0])
}

function isOwner(jid) {
  const number = getNumberFromJid(jid)

  return CONFIG.ownerNumbers.some(owner => {
    return digits(owner) === number
  })
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getUptime() {
  const seconds = Math.floor(process.uptime())

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

function getMemory() {
  const used = process.memoryUsage().rss / 1024 / 1024
  return `${used.toFixed(0)} MB`
}

/*
 * Não chamamos isso de "ping".
 * É apenas o tempo que a montagem do menu levou.
 */
function createMenuTimer() {
  return process.hrtime.bigint()
}

function finishMenuTimer(start) {
  const diff = process.hrtime.bigint() - start
  return Number(diff / 1000000n)
}

/* =========================================================
 * GRUPO / PERMISSÕES
 * ======================================================= */

async function getGroupState(sock, jid) {
  const state = {
    isGroup: jid.endsWith('@g.us'),
    isAdmin: false,
    botIsAdmin: false,
    groupName: null,
    participants: []
  }

  if (!state.isGroup) {
    return state
  }

  try {
    const metadata = await sock.groupMetadata(jid)

    state.groupName = metadata.subject || null
    state.participants = metadata.participants || []

    const userJid = jidNormalizedUser(jid)

    /*
     * Esta função não sabe quem chamou.
     * O caller será preenchido depois.
     */

    const botJid = jidNormalizedUser(sock.user?.id || '')

    const botParticipant = state.participants.find(p =>
      sameUser(p.id, botJid)
    )

    state.botIsAdmin =
      botParticipant?.admin === 'admin' ||
      botParticipant?.admin === 'superadmin'

  } catch (err) {
    console.error('[KYARA][GROUP]', err.message)
  }

  return state
}

function participantIsAdmin(participants, userJid) {
  const participant = participants.find(p =>
    sameUser(p.id, userJid)
  )

  return (
    participant?.admin === 'admin' ||
    participant?.admin === 'superadmin'
  )
}

/* =========================================================
 * CATEGORIAS
 * ======================================================= */

function buildSections({ owner, admin, botAdmin }) {

  const sections = []

  /*
   * TODOS
   */
  sections.push({
    title: '🌸 PRINCIPAL',
    rows: [
      {
        title: '⬇️ DOWNLOADS',
        description: 'Baixar vídeos e músicas',
        id: '/menudown'
      },
      {
        title: '🎨 LOGOS',
        description: 'Criação de logos',
        id: '/menulogos'
      },
      {
        title: '✏️ EDITS',
        description: 'Edição de imagens e vídeos',
        id: '/menuedits'
      },
      {
        title: '🖼️ FIGURINHAS',
        description: 'Criar e transformar stickers',
        id: '/menufig'
      }
    ]
  })

  /*
   * FERRAMENTAS
   */
  sections.push({
    title: '🛠️ FERRAMENTAS',
    rows: [
      {
        title: '🛠️ FERRAMENTAS',
        description: 'Utilidades da Kyara',
        id: '/ferramentas'
      },
      {
        title: '🎧 ALTERADORES',
        description: 'Áudio, voz e mídia',
        id: '/alteradores'
      },
      {
        title: '🎮 BRINCADEIRAS',
        description: 'Diversão e jogos',
        id: '/menubn'
      },
      {
        title: '🐉 RPG',
        description: 'Sistema RPG',
        id: '/menurpg'
      }
    ]
  })

  /*
   * SOMENTE GRUPO
   */
  if (admin || owner) {
    sections.push({
      title: '⚙️ ADMINISTRAÇÃO',
      rows: [
        {
          title: '⚙️ MENU ADM',
          description: botAdmin
            ? 'Bot possui privilégios de admin'
            : 'Bot não possui privilégios de admin',
          id: '/menuadm'
        },
        {
          title: '👥 MEMBROS',
          description: 'Gerenciamento de membros',
          id: '/menumemb'
        }
      ]
    })
  }

  /*
   * VIP
   */
  sections.push({
    title: '💎 EXTRAS',
    rows: [
      {
        title: '💎 VIP',
        description: 'Área VIP da Kyara',
        id: '/menuvip'
      }
    ]
  })

  /*
   * DONO
   */
  if (owner) {
    sections.push({
      title: '👑 PROPRIETÁRIO',
      rows: [
        {
          title: '👑 MENU DONO',
          description: 'Configurações privadas',
          id: '/menudono'
        }
      ]
    })
  }

  return sections
}

/* =========================================================
 * BOTÕES RÁPIDOS
 * ======================================================= */

function buildQuickButtons({ owner, admin }) {

  const buttons = []

  buttons.push({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: '⬇️ DOWNLOADS',
      id: '/menudown'
    })
  })

  buttons.push({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: '🎨 LOGOS',
      id: '/menulogos'
    })
  })

  /*
   * Admin vê ADM.
   * Membro normal recebe BRINCADEIRAS.
   */
  if (owner || admin) {
    buttons.push({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '⚙️ ADM',
        id: '/menuadm'
      })
    })
  } else {
    buttons.push({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '🎮 DIVERSÃO',
        id: '/menubn'
      })
    })
  }

  return buttons
}

/* =========================================================
 * NATIVE FLOW
 * ======================================================= */

function createNativeButtons({
  owner,
  admin,
  botAdmin
}) {

  const buttons = []

  /*
   * LISTA
   */
  buttons.push({
    name: 'single_select',

    buttonParamsJson: JSON.stringify({
      title: owner
        ? '👑 MENU DO PROPRIETÁRIO'
        : admin
          ? '⚙️ MENU DE ADMIN'
          : '📜 ABRIR MENU',

      sections: buildSections({
        owner,
        admin,
        botAdmin
      })
    })
  })

  /*
   * BOTÕES RÁPIDOS
   */
  buttons.push(
    ...buildQuickButtons({
      owner,
      admin
    })
  )

  /*
   * CANAL
   */
  buttons.push({
    name: 'cta_url',

    buttonParamsJson: JSON.stringify({
      display_text: '📢 CANAL KYARA',
      url: CONFIG.channels.bot,
      merchant_url: CONFIG.channels.bot
    })
  })

  /*
   * COPIAR COMANDOS
   */
  buttons.push({
    name: 'cta_copy',

    buttonParamsJson: JSON.stringify({
      display_text: '📋 COPIAR COMANDOS',
      copy_code:
        '/menu /menudown /menulogos /menuedits /menufig /ferramentas'
    })
  })

  return buttons
}

/* =========================================================
 * CABEÇALHO
 * ======================================================= */

async function createHeader(sock, jid) {

  /*
   * Para reduzir risco de incompatibilidade,
   * o vídeo é enviado separadamente.
   *
   * O menu interativo permanece independente da mídia.
   */

  const videoPath = CONFIG.media.video

  if (!fs.existsSync(videoPath)) {
    return null
  }

  try {
    await sock.sendMessage(jid, {
      video: fs.readFileSync(videoPath),
      mimetype: 'video/mp4',
      gifPlayback: true,
      caption: '🌸 Kyara • Menu Adaptativo 💜'
    })

  } catch (err) {
    console.error('[KYARA][VIDEO]', err.message)
  }

  return null
}

/* =========================================================
 * MENU PRINCIPAL
 * ======================================================= */

async function menuKyaraAdaptativo(
  sock,
  jid,
  pushName = 'usuário',
  options = {}
) {

  const timer = createMenuTimer()

  const owner = isOwner(jid)

  const group = await getGroupState(sock, jid)

  const admin =
    owner ||
    participantIsAdmin(group.participants, jid)

  /*
   * Mídia opcional.
   *
   * Se não quiser vídeo toda vez:
   *
   * menuKyaraAdaptativo(sock, jid, pushName, {
   *   sendVideo: false
   * })
   */

  if (options.sendVideo !== false) {
    await createHeader(sock, jid)
  }

  const elapsed = finishMenuTimer(timer)

  const greeting = getGreeting()
  const uptime = getUptime()
  const memory = getMemory()

  const role = owner
    ? '👑 PROPRIETÁRIO'
    : admin
      ? '⚙️ ADMINISTRADOR'
      : '👤 MEMBRO'

  const groupLine = group.isGroup
    ? `\n🏠 Grupo: ${group.groupName || 'Grupo'}`
    : ''

  const botStatus = group.isGroup
    ? (
      group.botIsAdmin
        ? '🟢 Bot é administrador'
        : '🟡 Bot sem administrador'
    )
    : '🟢 Conversa privada'

  const text = [
    '╭━━━〔 🌸 *BOT-KYARA* 〕━━━╮',
    `│ ${greeting}, *${pushName}*! 💜`,
    `│`,
    `│ ${role}`,
    `│ ${botStatus}`,
    groupLine ? `│${groupLine}` : '│',
    '│',
    `│ ⏱️ Uptime: ${uptime}`,
    `│ 🧠 RAM: ${memory}`,
    `│ ⚡ Menu: ${elapsed}ms`,
    '│',
    '│ ✨ O menu muda conforme',
    '│ suas permissões.',
    '╰━━━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n')

  const buttons = createNativeButtons({
    owner,
    admin,
    botAdmin: group.botIsAdmin
  })

  /*
   * Monta a InteractiveMessage de maneira compatível
   * com o formato Native Flow.
   */

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
          title: owner
            ? '👑 KYARA • OWNER MODE'
            : admin
              ? '⚙️ KYARA • ADMIN MODE'
              : '🌸 KYARA • USER MODE',

          hasMediaAttachment: false
        }),

      nativeFlowMessage:
        proto.Message.InteractiveMessage
          .NativeFlowMessage.create({

            buttons,

            messageParamsJson: ''
          })
    })

  const msg = generateWAMessageFromContent(
    jid,

    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },

          interactiveMessage: interactive
        }
      }
    },

    {}
  )

  try {

    await sock.relayMessage(
      jid,
      msg.message,
      {
        messageId: msg.key.id
      }
    )

    return {
      ok: true,
      key: msg.key,
      role,
      owner,
      admin,
      botAdmin: group.botIsAdmin
    }

  } catch (error) {

    console.error(
      '[KYARA][MENU]',
      error
    )

    /*
     * FALLBACK:
     * se o Native Flow da versão instalada
     * não for compatível, o bot não morre.
     */

    try {

      await sock.sendMessage(
        jid,
        {
          text:
            `${text}\n\n` +
            `📜 *Comandos:*\n` +
            `/menudown\n` +
            `/menulogos\n` +
            `/menuedits\n` +
            `/menufig\n` +
            `/ferramentas\n` +
            `/alteradores\n` +
            `/menubn\n` +
            `/menurpg\n` +
            (admin ? '/menuadm\n' : '') +
            '/menuvip\n' +
            (owner ? '/menudono\n' : '')
        }
      )

      return {
        ok: true,
        fallback: true,
        error
      }

    } catch (fallbackError) {

      console.error(
        '[KYARA][FALLBACK]',
        fallbackError
      )

      return {
        ok: false,
        error: fallbackError
      }
    }
  }
}

/* =========================================================
 * LEITOR DE CLIQUES
 * ======================================================= */

function getInteractiveCommand(message) {

  const response =
    message?.interactiveResponseMessage

  if (!response) {
    return null
  }

  const raw =
    response.nativeFlowResponseMessage?.paramsJson

  if (!raw) {
    return null
  }

  try {

    const params = JSON.parse(raw)

    /*
     * Quick reply:
     * { id: "/menudown" }
     *
     * Single select:
     * normalmente também retorna o id da linha.
     */

    if (params.id) {
      return params.id
    }

    if (params.selectedId) {
      return params.selectedId
    }

    if (params.paramsJson) {

      try {

        const nested =
          JSON.parse(params.paramsJson)

        return (
          nested.id ||
          nested.selectedId ||
          null
        )

      } catch {
        return null
      }
    }

  } catch (error) {

    console.error(
      '[KYARA][BUTTON]',
      error.message
    )
  }

  return null
}

/* =========================================================
 * HANDLER DE CLIQUE
 * ======================================================= */

function installInteractiveHandler(
  sock,
  commandHandler
) {

  sock.ev.on(
    'messages.upsert',
    async ({ messages }) => {

      for (const message of messages) {

        if (!message?.message) {
          continue
        }

        const command =
          getInteractiveCommand(
            message.message
          )

        if (!command) {
          continue
        }

        console.log(
          `[KYARA][CLICK] ${command}`
        )

        try {

          /*
           * Aqui NÃO executamos comandos diretamente.
           *
           * Entregamos para o seu router existente.
           *
           * Isso evita quebrar seu index.js.
           */

          if (typeof commandHandler === 'function') {

            await commandHandler(
              command,
              message
            )
          }

        } catch (error) {

          console.error(
            '[KYARA][COMMAND]',
            error
          )
        }
      }
    }
  )
}

/* =========================================================
 * EXPORTS
 * ======================================================= */

module.exports = {

  menuKyaraAdaptativo,

  getInteractiveCommand,

  installInteractiveHandler,

  isOwner
}
