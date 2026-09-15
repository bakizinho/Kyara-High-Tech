import fs from 'fs'
import path from 'path'
import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
  jidNormalizedUser
} from 'baileys'

const CONFIG = {
  footer: '',

  ownerNumbers: [
    '558498445270',
    '5584987480834',
    '558487480834'
  ],

  channels: [
    {
      name: '📢 O COMEÇO • Canal Oficial',
      url: 'https://whatsapp.com/channel/0029VbCXBCy8fewmEhto8J0w'
    },
    {
      name: '🌸 Kyara-bot • Canal do Bot',
      url: 'https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r'
    }
  ]
}

const MENUS_ORIGINAIS = [
  {
    title: '📥 Downloads',
    description: 'Baixar músicas, vídeos e mídias',
    id: 'menudown'
  },
  {
    title: '🎨 Logos',
    description: 'Criar logos e artes',
    id: 'menulogos'
  },
  {
    title: '✏️ Edits',
    description: 'Efeitos e edições de mídia',
    id: 'menuedits'
  },
  {
    title: '👮 Administração',
    description: 'Ferramentas para administradores',
    id: 'menuadm'
  },
  {
    title: '🎮 Brincadeiras',
    description: 'Jogos e brincadeiras',
    id: 'menubn'
  },
  {
    title: '👑 Dono',
    description: 'Ferramentas exclusivas do dono',
    id: 'menudono'
  },
  {
    title: '👥 Membros',
    description: 'Ferramentas para membros',
    id: 'menumemb'
  },
  {
    title: '🧰 Ferramentas',
    description: 'Utilidades do bot',
    id: 'ferramentas'
  },
  {
    title: '🎨 Figurinhas',
    description: 'Criar e converter figurinhas',
    id: 'menufig'
  },
  {
    title: '✨ Alteradores',
    description: 'Fontes, textos e efeitos',
    id: 'alteradores'
  },
  {
    title: '⚔️ RPG',
    description: 'Sistema RPG da Kyara',
    id: 'menurpg'
  },
  {
    title: '⭐ VIP',
    description: 'Sistema e comandos VIP',
    id: 'menuvip'
  }
]

function digits(v) {
  return String(v || '').replace(/\D/g, '')
}

function numberFromJid(jid = '') {
  return digits(
    String(jid || '')
      .split('@')[0]
      .split(':')[0]
  )
}

function isOwner(jid = '') {
  const number = numberFromJid(jid)

  if (!number) {
    return false
  }

  return CONFIG.ownerNumbers.some(
    owner =>
      digits(owner) === number
  )
}

function greeting() {
  const h = new Date().getHours()

  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'

  return 'Boa noite'
}

function uptime() {
  const t = Math.floor(process.uptime())

  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60

  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`

  return `${s}s`
}

function memory() {
  return `${(
    process.memoryUsage().rss /
    1024 /
    1024
  ).toFixed(1)} MB`
}

async function resolveMentionJid(sock, sender) {
  if (!sender) return null

  const normalized =
    jidNormalizedUser(sender)

  if (
    normalized.endsWith('@s.whatsapp.net')
  ) {
    return normalized
  }

  if (
    normalized.endsWith('@lid')
  ) {
    try {
      const mapping =
        sock?.signalRepository?.lidMapping

      if (mapping?.getPNForLID) {
        const pn =
          await mapping.getPNForLID(normalized)

        if (pn) {
          return jidNormalizedUser(pn)
        }
      }
    } catch {}
  }

  return normalized
}

function encontrarMidiaMenu() {
  const base =
    path.resolve(
      process.cwd(),
      'dados',
      'midias'
    )

  for (
    const name of [
      'menu.mp4',
      'menu.jpg',
      'menu.jpeg',
      'menu.png'
    ]
  ) {
    const p =
      path.join(base, name)

    if (fs.existsSync(p)) {
      return {
        type:
          p.endsWith('.mp4')
            ? 'video'
            : 'image',

        path: p
      }
    }
  }

  return null
}

function buildNativeFlowButtons() {
  const rows =
    MENUS_ORIGINAIS.map(m => ({
      title: m.title,
      description: m.description,
      id: m.id
    }))

  return [
    {
      name: 'single_select',

      buttonParamsJson:
        JSON.stringify({
          title:
            '🌸 CATEGORIAS KYARA',

          sections: [
            {
              title:
                '🌸 MENU PRINCIPAL',

              rows:
                rows.slice(0, 6)
            },

            {
              title:
                '🌸 MAIS MENUS',

              rows:
                rows.slice(6)
            }
          ]
        })
    },

    {
      name: 'cta_url',

      buttonParamsJson:
        JSON.stringify({
          display_text:
            CONFIG.channels[0].name,

          url:
            CONFIG.channels[0].url
        })
    },

    {
      name: 'cta_url',

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

function buildMenuText(
  pushName,
  mentionTag,
  {
    owner,
    admin
  } = {}
) {
  const nivel =
    owner
      ? '👑 DONO'
      : admin
        ? '👤 ADM'
        : '👤 MEMBRO'

  return `${greeting()}, ${mentionTag || pushName}! 🌸

╭━━〔 🌸 *BOT-KYARA* 〕━━╮
┃ ${nivel}
┃ ⚡ Online: ${uptime()}
┃ 🧠 RAM: ${memory()}
╰━━━━━━━━━━━━━━━━━━━━╯

Escolha um dos menus abaixo.
🌸 *12 menus originais da Kyara.*
🌸 BOT-KYARA • Menu Interativo`
}

export async function menuKyaraAdaptativo(
  sock,
  jid,
  pushName = 'usuário',
  options = {}
) {
  const owner =
    options.owner ??
    isOwner(
      options.sender || jid
    )

  const admin =
    !!options.isAdmin ||
    !!options.admin

  const mentionJid =
    await resolveMentionJid(
      sock,
      options.sender || jid
    )

  const mentionNumber =
    numberFromJid(mentionJid) ||
    numberFromJid(
      options.sender || jid
    )

  const mentionTag =
    mentionNumber
      ? `@${mentionNumber}`
      : `@${pushName}`

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

  const media =
    encontrarMidiaMenu()

  let preparedMedia = null

  if (media) {
    try {
      const buffer =
        fs.readFileSync(
          media.path
        )

      if (media.type === 'video') {
        const p =
          await prepareWAMessageMedia(
            {
              video: buffer
            },
            {
              upload:
                sock.waUploadToServer
            }
          )

        preparedMedia = {
          type: 'video',
          message:
            p.videoMessage
        }
      } else {
        const p =
          await prepareWAMessageMedia(
            {
              image: buffer
            },
            {
              upload:
                sock.waUploadToServer
            }
          )

        preparedMedia = {
          type: 'image',
          message:
            p.imageMessage
        }
      }
    } catch (e) {
      console.log(
        '[MENU] Erro mídia:',
        e.message
      )
    }
  }

  const modeTitle =
    owner
      ? '👑 KYARA • DONO MODE'
      : admin
        ? '👤 KYARA • ADM MODE'
        : '🌸 KYARA • USER MODE'

  const header =
    preparedMedia?.message
      ? {
          title: modeTitle,

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
          title: modeTitle,
          hasMediaAttachment:
            false
        }

  const interactive =
    proto.Message.InteractiveMessage.create({
      header:
        proto.Message.InteractiveMessage.Header.create(
          header
        ),

      body:
        proto.Message.InteractiveMessage.Body.create({
          text
        }),

      footer: proto.Message.InteractiveMessage.Footer.create({ text: CONFIG.footer }),

      nativeFlowMessage:
        proto.Message.InteractiveMessage.NativeFlowMessage.create({
          buttons
        })
    })

  interactive.contextInfo = {
    mentionedJid:
      mentionJid
        ? [mentionJid]
        : []
  }

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
        quoted:
          options.info ||
          undefined,

        userJid:
          sock?.user?.id ||
          normalizedJid
      }
    )

  const bizNode = {
    tag: 'biz',

    attrs: {
      actual_actors: '2',
      host_storage: '2',

      privacy_mode_ts:
        String(
          Math.floor(
            Date.now() / 1000
          ) - 77980457
        )
    },

    content: [
      {
        tag: 'interactive',

        attrs: {
          type:
            'native_flow',

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
      }
    ]
  }

  await sock.relayMessage(
    normalizedJid,
    msg.message,
    {
      messageId:
        msg.key.id,

      additionalNodes: [
        bizNode
      ]
    }
  )

  return true
}

export const enviarMenuAdaptativo =
  menuKyaraAdaptativo

export {
  MENUS_ORIGINAIS,
  CONFIG
}
