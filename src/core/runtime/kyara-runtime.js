import fs from 'fs'
import path from 'path'

const CONFIG_FILE =
  path.resolve(
    process.cwd(),
    'dados',
    'src',
    'config.json'
  )

/*
 * ============================================================
 * 📢 CANAIS OFICIAIS PERMANENTES
 * ============================================================
 *
 * Estes valores NÃO são editáveis pelo usuário.
 */

export const KYARA_OFFICIAL_CHANNELS =
  Object.freeze({
    oComeco:
      'https://whatsapp.com/channel/0029VbCXBCy8fewmEhto8J0w',

    botKyara:
      'https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r'
  })

const prefixByJid =
  globalThis.__KYARA_PREFIX_BY_JID__ ||
  new Map()

globalThis.__KYARA_PREFIX_BY_JID__ =
  prefixByJid

let cache = null
let cacheMtime = 0

export function getRuntimeConfig() {
  try {
    const stat =
      fs.statSync(
        CONFIG_FILE
      )

    if (
      cache &&
      stat.mtimeMs === cacheMtime
    ) {
      return cache
    }

    cache =
      JSON.parse(
        fs.readFileSync(
          CONFIG_FILE,
          'utf8'
        )
      )

    cacheMtime =
      stat.mtimeMs

    return cache

  } catch {
    return cache || {}
  }
}

export function normalizePrefix(
  value
) {
  const prefix =
    String(
      value ?? ''
    )
      .trim()

  if (!prefix) {
    return '/'
  }

  return prefix.slice(
    0,
    8
  )
}

export function setCurrentPrefix(
  jid,
  prefix
) {
  const value =
    normalizePrefix(
      prefix
    )

  if (jid) {
    prefixByJid.set(
      String(jid),
      value
    )
  }

  globalThis.__KYARA_PREFIX__ =
    value

  return value
}

export function getCurrentPrefix(
  jid
) {
  if (jid) {
    const local =
      prefixByJid.get(
        String(jid)
      )

    if (local) {
      return local
    }
  }

  return normalizePrefix(
    getRuntimeConfig()?.prefixo
  )
}

export function getBotName() {
  return (
    String(
      getRuntimeConfig()?.nomebot ||
      'BOT-KYARA'
    )
      .trim() ||
    'BOT-KYARA'
  )
}

export function getOwnerName() {
  return (
    String(
      getRuntimeConfig()?.nomedono ||
      'Dono'
    )
      .trim() ||
    'Dono'
  )
}

export function getOwnerNumber() {
  return String(
    getRuntimeConfig()?.numerodono ||
    ''
  )
    .replace(
      /\D/g,
      ''
    )
}

export function getOwnerLid() {
  return String(
    getRuntimeConfig()?.lidowner ||
    getRuntimeConfig()?.isOwnerCheck ||
    ''
  )
    .trim()
}

function stripPrefix(
  command
) {
  return String(
    command || ''
  )
    .trim()
    .replace(
      /^[.#\/!]+/,
      ''
    )
}

export function formatCommand(
  command,
  jid
) {
  const clean =
    stripPrefix(
      command
    )

  return (
    getCurrentPrefix(jid) +
    clean
  )
}

/*
 * Converte:
 *
 * {prefix}
 * {prefixo}
 * <prefix>
 *
 * e comandos hardcoded:
 *
 * /menu
 * #menu
 * !menu
 * .menu
 *
 * URLs não são alteradas.
 */

export function renderKyaraText(
  text,
  jid
) {
  if (
    typeof text !==
    'string'
  ) {
    return text
  }

  const prefix =
    getCurrentPrefix(
      jid
    )

  let output =
    text

  output =
    output
      .replace(
        /\{prefixo\}/gi,
        prefix
      )
      .replace(
        /\{prefix\}/gi,
        prefix
      )
      .replace(
        /<prefix>/gi,
        prefix
      )

  output =
    output.replace(
      /(^|[\s>•·|([{*"'])([.#\/!])([A-Za-z][A-Za-z0-9_-]*(?:-[A-Za-z0-9_-]+)*)/g,
      (
        _match,
        before,
        _marker,
        command
      ) =>
        `${before}${prefix}${command}`
    )

  return output
}

function normalizeButtonParams(
  raw,
  jid
) {
  if (
    typeof raw !==
    'string'
  ) {
    return raw
  }

  try {
    const data =
      JSON.parse(
        raw
      )

    if (
      typeof data.id ===
      'string'
    ) {
      data.id =
        renderKyaraText(
          data.id,
          jid
        )
    }

    for (
      const key of [
        'display_text',
        'description',
        'title',
        'text'
      ]
    ) {
      if (
        typeof data[key] ===
        'string'
      ) {
        data[key] =
          renderKyaraText(
            data[key],
            jid
          )
      }
    }

    return JSON.stringify(
      data
    )

  } catch {
    return raw
  }
}

export function normalizeOutgoingContent(
  content,
  jid
) {
  if (
    !content ||
    typeof content !==
    'object'
  ) {
    return content
  }

  if (
    Buffer.isBuffer(
      content
    ) ||
    content instanceof
    Uint8Array
  ) {
    return content
  }

  if (
    Array.isArray(
      content
    )
  ) {
    return content.map(
      value =>
        normalizeOutgoingContent(
          value,
          jid
        )
    )
  }

  const output = {}

  for (
    const [
      key,
      value
    ] of Object.entries(
      content
    )
  ) {
    if (
      key ===
      'buttonParamsJson'
    ) {
      output[key] =
        normalizeButtonParams(
          value,
          jid
        )

      continue
    }

    if (
      typeof value ===
      'string'
    ) {
      if (
        [
          'text',
          'caption',
          'title',
          'description',
          'displayText',
          'footerText'
        ].includes(
          key
        )
      ) {
        output[key] =
          renderKyaraText(
            value,
            jid
          )
      } else {
        output[key] =
          value
      }

      continue
    }

    if (
      value &&
      typeof value ===
      'object'
    ) {
      output[key] =
        normalizeOutgoingContent(
          value,
          jid
        )
    } else {
      output[key] =
        value
    }
  }

  return output
}

export function normalizeOutgoingRelayMessage(
  message,
  jid
) {
  if (
    !message ||
    typeof message !==
    'object'
  ) {
    return message
  }

  const output = {
    ...message
  }

  if (
    typeof output.conversation ===
    'string'
  ) {
    output.conversation =
      renderKyaraText(
        output.conversation,
        jid
      )
  }

  for (
    const key of [
      'imageMessage',
      'videoMessage',
      'audioMessage',
      'documentMessage',
      'extendedTextMessage'
    ]
  ) {
    if (
      output[key]
    ) {
      output[key] =
        normalizeOutgoingContent(
          output[key],
          jid
        )
    }
  }

  for (
    const key of [
      'viewOnceMessage',
      'viewOnceMessageV2',
      'viewOnceMessageV2Extension',
      'ephemeralMessage',
      'documentWithCaptionMessage'
    ]
  ) {
    if (
      output[key]?.message
    ) {
      output[key] = {
        ...output[key],

        message:
          normalizeOutgoingRelayMessage(
            output[key].message,
            jid
          )
      }
    }
  }

  if (
    output.interactiveMessage
  ) {
    const interactive = {
      ...output.interactiveMessage
    }

    if (
      interactive.body?.text
    ) {
      interactive.body = {
        ...interactive.body,

        text:
          renderKyaraText(
            interactive.body.text,
            jid
          )
      }
    }

    if (
      interactive.footer?.text
    ) {
      interactive.footer = {
        ...interactive.footer,

        text:
          renderKyaraText(
            interactive.footer.text,
            jid
          )
      }
    }

    if (
      interactive.header?.title
    ) {
      interactive.header = {
        ...interactive.header,

        title:
          renderKyaraText(
            interactive.header.title,
            jid
          )
      }
    }

    if (
      Array.isArray(
        interactive
          .nativeFlowMessage
          ?.buttons
      )
    ) {
      interactive.nativeFlowMessage = {
        ...interactive.nativeFlowMessage,

        buttons:
          interactive.nativeFlowMessage.buttons.map(
            button => ({
              ...button,

              buttonParamsJson:
                normalizeButtonParams(
                  button.buttonParamsJson,
                  jid
                )
            })
          )
      }
    }

    output.interactiveMessage =
      interactive
  }

  return output
}
