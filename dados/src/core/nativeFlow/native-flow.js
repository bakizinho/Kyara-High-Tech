import fs from 'fs'
import os from 'os'

import {
  proto,
  generateWAMessageFromContent,
  isJidGroup,
  prepareWAMessageMedia
} from 'baileys'

import {
  normalizeOutgoingContent
} from '../runtime/kyara-runtime.js'

const PRIVACY_MODE_TS_OFFSET =
  77980457

const stringify =
  value =>
    JSON.stringify(
      value
    )

function privacyTimestamp() {
  return String(
    Math.floor(
      Date.now() / 1000
    ) -
    PRIVACY_MODE_TS_OFFSET
  )
}

function bizNode() {
  return {
    tag: 'biz',

    attrs: {
      actual_actors: '2',
      host_storage: '2',
      privacy_mode_ts:
        privacyTimestamp()
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
          source_type:
            'third_party'
        }
      }
    ]
  }
}

function additionalNodes(
  jid
) {
  const node =
    bizNode()

  if (
    isJidGroup(
      jid
    )
  ) {
    return [
      node
    ]
  }

  return [
    {
      tag: 'bot',

      attrs: {
        biz_bot: '1'
      }
    },

    node
  ]
}

function nativeButton(
  name,
  params
) {
  return proto
    .Message
    .InteractiveMessage
    .NativeFlowMessage
    .NativeFlowButton
    .create({
      name,
      buttonParamsJson:
        stringify(
          params
        )
    })
}

export function singleSelect(
  displayText,
  sections
) {
  return {
    name:
      'single_select',

    buttonParamsJson:
      stringify({
        title:
          displayText,

        sections
      })
  }
}

export function quickReply(
  displayText,
  id
) {
  return {
    name:
      'quick_reply',

    buttonParamsJson:
      stringify({
        display_text:
          displayText,

        id
      })
  }
}

export function copyBtn(
  displayText,
  copyCode
) {
  return {
    name:
      'cta_copy',

    buttonParamsJson:
      stringify({
        display_text:
          displayText,

        copy_code:
          copyCode
      })
  }
}

export function row(
  title,
  description,
  id
) {
  return {
    title,
    description,
    id
  }
}

export function getMetrics() {
  const memory =
    process.memoryUsage()

  return {
    ram:
      Math.round(
        memory.rss /
        1024 /
        1024
      ),

    heap:
      Math.round(
        memory.heapUsed /
        1024 /
        1024
      ),

    cores:
      os.cpus().length ||
      1,

    up:
      Math.floor(
        process.uptime()
      ),

    load:
      'ONLINE',

    model:
      'Native Flow'
  }
}

export async function sendFlow(
  Kyara,
  jid,
  {
    text = '',
    footer = '',
    title = '',
    buttons = [],
    media = null,
    mentionedJid = []
  } = {}
) {
  if (!Kyara) {
    throw new Error(
      'Socket Kyara não informado'
    )
  }

  if (!jid) {
    throw new Error(
      'JID não informado'
    )
  }

  const prepared =
    normalizeOutgoingContent(
      {
        text,
        footer,
        title,
        buttons
      },
      jid
    )

  const nativeButtons =
    (
      prepared.buttons ||
      []
    ).map(
      button =>
        nativeButton(
          button.name,
          JSON.parse(
            button.buttonParamsJson
          )
        )
    )

  const nativeFlow =
    proto
      .Message
      .InteractiveMessage
      .NativeFlowMessage
      .create({
        buttons:
          nativeButtons,

        messageParamsJson:
          '{}',

        messageVersion:
          1
      })

  let mediaMessage =
    null

  if (
    media?.path &&
    fs.existsSync(
      media.path
    )
  ) {
    try {
      const buffer =
        fs.readFileSync(
          media.path
        )

      if (
        !buffer.length
      ) {
        throw new Error(
          'Arquivo de mídia vazio'
        )
      }

      if (
        media.type ===
        'video'
      ) {
        const preparedMedia =
          await prepareWAMessageMedia(
            {
              video:
                buffer,

              mimetype:
                'video/mp4',

              gifPlayback:
                true
            },

            {
              upload:
                Kyara.waUploadToServer
            }
          )

        mediaMessage = {
          type:
            'video',

          message:
            preparedMedia
              ?.videoMessage ||
            null
        }

      } else {
        const preparedMedia =
          await prepareWAMessageMedia(
            {
              image:
                buffer
            },

            {
              upload:
                Kyara.waUploadToServer
            }
          )

        mediaMessage = {
          type:
            'image',

          message:
            preparedMedia
              ?.imageMessage ||
            null
        }
      }

    } catch (
      mediaError
    ) {
      console.warn(
        '[KYARA FLOW MEDIA]',
        mediaError?.message ||
        mediaError
      )
    }
  }

  const header =
    mediaMessage?.message
      ? {
          title:
            prepared.title,

          hasMediaAttachment:
            true,

          ...(mediaMessage.type ===
          'video'
            ? {
                videoMessage:
                  mediaMessage.message
              }
            : {
                imageMessage:
                  mediaMessage.message
              })
        }
      : {
          title:
            prepared.title,

          hasMediaAttachment:
            false
        }

  const interactive =
    proto
      .Message
      .InteractiveMessage
      .create({
        body:
          proto
            .Message
            .InteractiveMessage
            .Body
            .create({
              text:
                prepared.text
            }),

        footer:
          proto
            .Message
            .InteractiveMessage
            .Footer
            .create({
              text:
                prepared.footer
            }),

        header:
          proto
            .Message
            .InteractiveMessage
            .Header
            .create(
              header
            ),

        nativeFlowMessage:
          nativeFlow
      })

  if (
    Array.isArray(
      mentionedJid
    ) &&
    mentionedJid.length
  ) {
    interactive.contextInfo = {
      mentionedJid
    }
  }

  const message =
    generateWAMessageFromContent(
      jid,

      {
        interactiveMessage:
          interactive
      },

      {
        userJid:
          Kyara.user?.id ||
          jid
      }
    )

  await Kyara.relayMessage(
    jid,
    message.message,

    {
      messageId:
        message.key.id,

      additionalNodes:
        additionalNodes(
          jid
        )
    }
  )

  console.log(
    '[KYARA FLOW] Native Flow enviado:',
    message.key.id
  )

  return message
}
