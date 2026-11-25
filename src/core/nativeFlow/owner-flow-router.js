import {
  getConfiguredBotName,
  getConfiguredPrefix,
  getKyaraEmoji,
  commandExample,
  kyaraHeader,
  botNeedsAdminMessage,
  formatKyaraText
} from '../identity/kyara-identity.js'

import fs from 'fs'
import path from 'path'
import {
  isValidOwnerCategory,
  isValidOwnerCommand,
  sendOwnerMain,
  sendOwnerCategory
} from './owner-flow.js'

const AUDIT = path.join(
  process.cwd(),
  'dados/src/core/nativeFlow/audit.log'
)

const FLOOD = new Map()
const FLOOD_WINDOW_MS = 1500
const MAX_FLOOD_ENTRIES = 500

export function isOwnerFlowId(id) {
  return typeof id === 'string' &&
    id.length <= 300 &&
    id.startsWith('owner:')
}

export function extractId(message) {
  if (!message || typeof message !== 'object') return null

  const layers = [
    message,
    message.viewOnceMessage?.message,
    message.viewOnceMessageV2?.message,
    message.viewOnceMessageV2Extension?.message,
    message.documentWithCaptionMessage?.message,
    message.ephemeralMessage?.message
  ].filter(Boolean)

  for (const layer of layers) {
    const paramsJson =
      layer.nativeFlowResponseMessage?.paramsJson ||
      layer.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson

    if (typeof paramsJson === 'string') {
      try {
        const params = JSON.parse(paramsJson)
        const id = params?.id || params?.selectedId
        if (typeof id === 'string' && id.length <= 300) return id.trim()
      } catch {
        // Resposta malformada: tenta os formatos legados.
      }
    }

    const legacyId =
      layer.listResponseMessage?.singleSelectReply?.selectedRowId ||
      layer.buttonsResponseMessage?.selectedButtonId ||
      layer.templateButtonReplyMessage?.selectedId

    if (typeof legacyId === 'string' && legacyId.length <= 300) {
      return legacyId.trim()
    }
  }

  const text =
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.documentWithCaptionMessage?.caption ||
    ''

  if (typeof text === 'string' && text.startsWith('owner:')) {
    return text.trim().split(/\s+/)[0].slice(0, 300)
  }

  return null
}

function isFlooded(key) {
  const now = Date.now()
  const previous = FLOOD.get(key) || 0

  if (now - previous < FLOOD_WINDOW_MS) return true

  FLOOD.set(key, now)

  if (FLOOD.size > MAX_FLOOD_ENTRIES) {
    for (const [entry, timestamp] of FLOOD) {
      if (now - timestamp >= FLOOD_WINDOW_MS) FLOOD.delete(entry)
      if (FLOOD.size <= MAX_FLOOD_ENTRIES) break
    }
  }

  return false
}

function audit(jid, id, result) {
  try {
    fs.appendFileSync(
      AUDIT,
      `[${new Date().toISOString()}] jid=${jid} id=${JSON.stringify(id)} result=${result}\n`
    )
  } catch (error) {
    console.error('[KYARA FLOW] Falha ao gravar auditoria:', error.message)
  }
}

export async function routeOwnerFlow({
  Kyara,
  jid,
  id,
  prefix = getConfiguredPrefix(),
  userName = 'Dono',
  botName = getConfiguredBotName(),
  ownerId,
  authorized = false,
  executeCommand
}) {
  if (!isOwnerFlowId(id)) return false

  /*
   * Defesa adicional: connect.js precisa passar authorized: true
   * somente depois de validar a identidade do remetente como dono.
   * ownerId, sozinho, não é prova de autorização.
   */
  if (authorized !== true) {
    audit(jid || 'unknown', id, 'DENIED_NOT_AUTHORIZED')
    console.warn('[KYARA FLOW] Ação bloqueada: chamada sem autorização.')
    return true
  }

  if (!Kyara || !jid) {
    audit(jid || 'unknown', id, 'DENIED_MISSING_CONTEXT')
    return true
  }

  const floodKey = `${jid}:${id}`
  if (isFlooded(floodKey)) {
    audit(jid, id, 'BLOCKED_FLOOD')
    return true
  }

  if (id === 'owner:back:main') {
    await sendOwnerMain(Kyara, jid, { botName, userName, prefix })
    audit(jid, id, 'OPEN_MAIN')
    return true
  }

  if (id.startsWith('owner:open:')) {
    const categoryId = id.slice('owner:open:'.length)

    if (!isValidOwnerCategory(categoryId)) {
      audit(jid, id, 'DENIED_INVALID_CATEGORY')
      return true
    }

    await sendOwnerCategory(Kyara, jid, categoryId)
    audit(jid, id, 'OPEN_CATEGORY')
    return true
  }

  if (id.startsWith('owner:cmd:')) {
    const command = id.slice('owner:cmd:'.length).trim()

    if (!isValidOwnerCommand(command)) {
      audit(jid, id, 'DENIED_INVALID_COMMAND')
      console.warn('[KYARA FLOW] Comando fora da lista permitida:', command)
      return true
    }

    if (typeof executeCommand !== 'function') {
      audit(jid, id, 'DENIED_NO_DISPATCHER')
      console.error('[KYARA FLOW] Dispatcher não informado.')
      return true
    }

    audit(jid, id, 'DISPATCH')
    await executeCommand(command, {
      jid,
      prefix,
      ownerId,
      source: 'owner-native-flow'
    })
    return true
  }

  audit(jid, id, 'UNKNOWN_OWNER_ACTION')
  return true
}
