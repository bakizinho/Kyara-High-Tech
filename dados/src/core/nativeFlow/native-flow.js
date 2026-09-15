import {
  proto,
  generateWAMessageFromContent,
  isJidGroup
} from 'baileys'

const PRIVACY_MODE_TS_OFFSET = 77980457

const j = value => JSON.stringify(value)

function getPrivacyModeTs() {
  return String(
    Math.floor(Date.now() / 1000) - PRIVACY_MODE_TS_OFFSET
  )
}

function createBaseBizAttrs() {
  return {
    actual_actors: '2',
    host_storage: '2',
    privacy_mode_ts: getPrivacyModeTs()
  }
}

function buildMixedNativeFlowBizNode() {
  return {
    tag: 'biz',
    attrs: createBaseBizAttrs(),
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
}

function buildAdditionalNodes(jid) {
  const bizNode = buildMixedNativeFlowBizNode()

  if (isJidGroup(jid)) {
    return [bizNode]
  }

  return [
    {
      tag: 'bot',
      attrs: {
        biz_bot: '1'
      }
    },
    bizNode
  ]
}

function nativeButton(name, params) {
  return proto.Message.InteractiveMessage.NativeFlowMessage.NativeFlowButton.create({
    name,
    buttonParamsJson: j(params)
  })
}

export function singleSelect(displayText, sections) {
  return {
    name: 'single_select',
    buttonParamsJson: j({
      title: displayText,
      sections
    })
  }
}

export function quickReply(displayText, id) {
  return {
    name: 'quick_reply',
    buttonParamsJson: j({
      display_text: displayText,
      id
    })
  }
}

export function copyBtn(displayText, copyCode) {
  return {
    name: 'cta_copy',
    buttonParamsJson: j({
      display_text: displayText,
      copy_code: copyCode
    })
  }
}

export function row(title, description, id) {
  return {
    title,
    description,
    id
  }
}

export function getMetrics() {
  const mem = process.memoryUsage()

  return {
    ram: Math.round(mem.rss / 1024 / 1024),
    heap: Math.round(mem.heapUsed / 1024 / 1024),
    cores: typeof navigator !== 'undefined'
      ? navigator.hardwareConcurrency || 1
      : 1,
    up: Math.floor(process.uptime()),
    load: 'ONLINE',
    model: 'Native Flow'
  }
}

export async function sendFlow(
  Kyara,
  jid,
  {
    text = '',
    footer = '',
    title = '',
    buttons = []
  } = {}
) {
  if (!Kyara) {
    throw new Error('Socket Kyara não informado')
  }

  if (!jid) {
    throw new Error('JID não informado')
  }

  const nativeButtons = buttons.map(button =>
    nativeButton(
      button.name,
      JSON.parse(button.buttonParamsJson)
    )
  )

  const nativeFlow =
    proto.Message.InteractiveMessage.NativeFlowMessage.create({
      buttons: nativeButtons,
      messageParamsJson: '{}',
      messageVersion: 1
    })

  const interactive =
    proto.Message.InteractiveMessage.create({
      body:
        proto.Message.InteractiveMessage.Body.create({
          text
        }),

      footer:
        proto.Message.InteractiveMessage.Footer.create({
          text: footer
        }),

      header:
        proto.Message.InteractiveMessage.Header.create({
          title,
          hasMediaAttachment: false
        }),

      nativeFlowMessage: nativeFlow
    })

  const waMessage =
    generateWAMessageFromContent(
      jid,
      {
        interactiveMessage: interactive
      },
      {
        userJid: Kyara.user?.id || jid
      }
    )

  const additionalNodes =
    buildAdditionalNodes(jid)

  console.log(
    '[KYARA FLOW] Enviando Native Flow',
    JSON.stringify({
      jid,
      buttons: nativeButtons.length,
      private: !isJidGroup(jid),
      additionalNodes: additionalNodes.map(
        node => node.tag
      ),
      messageId: waMessage.key?.id
    })
  )

  await Kyara.relayMessage(
    jid,
    waMessage.message,
    {
      messageId: waMessage.key.id,
      additionalNodes
    }
  )

  console.log(
    '[KYARA FLOW] Relay Native Flow concluído:',
    waMessage.key.id
  )

  return waMessage
}
