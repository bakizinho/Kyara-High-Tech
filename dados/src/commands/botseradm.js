'use strict'

/*
 * ============================================================
 * KYARA • BOT SER ADM
 * ============================================================
 *
 * Comando:
 *
 *   #botseradm a
 *
 * Fluxo:
 *
 *   DONO -> #botseradm a
 *          ↓
 *   Kyara arma "a"
 *          ↓
 *   ADM real -> a
 *          ↓
 *   Kyara verifica o ADM
 *          ↓
 *   Kyara promove o próprio JID
 *          ↓
 *   gatilho é apagado
 *
 * IMPORTANTE:
 * - Somente o DONO pode armar o mecanismo.
 * - A confirmação precisa vir de um ADM REAL.
 * - Não existe falsificação de sender/JID.
 * - O gatilho é de uso único.
 * - Depois da promoção, é apagado.
 * ============================================================
 */

const pending = new Map()

const VALID_TRIGGERS = new Set([
  'a',
  'e',
  'i',
  'o',
  'u'
])

const DEFAULT_TIMEOUT = 5 * 60 * 1000

function normalizeJid(jid) {
  if (!jid) return ''

  return String(jid)
    .trim()
    .replace(/:\d+(?=@)/, '')
}

function normalizeText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
}

function getGroupKey(jid) {
  return normalizeJid(jid)
}

function getBotJid(sock) {
  /*
   * Baileys normalmente disponibiliza:
   *
   * sock.user.id
   *
   * Dependendo da versão, pode existir device:
   *
   * 5511999999999:0@s.whatsapp.net
   *
   * A função normaliza para comparação.
   */

  return normalizeJid(
    sock?.user?.id ||
    sock?.user?.jid ||
    ''
  )
}

function getSenderJid(msg) {
  return normalizeJid(
    msg?.key?.participant ||
    msg?.participant ||
    msg?.sender ||
    ''
  )
}

function getMessageText(msg) {
  const message = msg?.message

  if (!message) return ''

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    ''
  )
}

function getMentionedJids(msg) {
  return (
    msg?.message
      ?.extendedTextMessage
      ?.contextInfo
      ?.mentionedJid ||
    []
  ).map(normalizeJid)
}

async function getGroupMetadata(sock, groupJid) {
  return await sock.groupMetadata(groupJid)
}

function findParticipant(metadata, jid) {
  const target = normalizeJid(jid)

  return (
    metadata?.participants || []
  ).find(
    participant =>
      normalizeJid(participant?.id) === target
  )
}

function isAdminParticipant(participant) {
  if (!participant) return false

  return (
    participant.admin === 'admin' ||
    participant.admin === 'superadmin'
  )
}

function isOwnerJid(jid, ownerJids = []) {
  const target = normalizeJid(jid)

  return ownerJids.some(
    owner =>
      normalizeJid(owner) === target
  )
}

function cleanupExpired() {
  const now = Date.now()

  for (const [groupJid, state] of pending.entries()) {
    if (
      !state ||
      state.expiresAt <= now
    ) {
      pending.delete(groupJid)
    }
  }
}

function arm(groupJid, ownerJid, trigger) {
  pending.set(
    getGroupKey(groupJid),
    {
      ownerJid: normalizeJid(ownerJid),
      trigger: normalizeText(trigger),
      createdAt: Date.now(),
      expiresAt: Date.now() + DEFAULT_TIMEOUT
    }
  )
}

function getPending(groupJid) {
  cleanupExpired()

  return pending.get(
    getGroupKey(groupJid)
  )
}

function disarm(groupJid) {
  pending.delete(
    getGroupKey(groupJid)
  )
}

function isExactTrigger(text, trigger) {
  return (
    normalizeText(text) ===
    normalizeText(trigger)
  )
}

/**
 * ============================================================
 * ARMAÇÃO
 * ============================================================
 *
 * #botseradm a
 */
async function armBotPromotion({
  sock,
  msg,
  ownerJids
}) {
  const groupJid = msg?.key?.remoteJid
  const senderJid = getSenderJid(msg)
  const text = normalizeText(
    getMessageText(msg)
  )

  if (!groupJid || !groupJid.endsWith('@g.us')) {
    return {
      handled: false
    }
  }

  /*
   * Formato obrigatório:
   *
   * #botseradm a
   *
   * O prefixo do comando deve ser removido pelo
   * dispatcher antes de chegar aqui.
   *
   * Portanto "text" esperado:
   *
   * a
   */

  if (!isOwnerJid(senderJid, ownerJids)) {
    return {
      handled: true,
      success: false,
      reason: 'NOT_OWNER'
    }
  }

  if (!VALID_TRIGGERS.has(text)) {
    return {
      handled: true,
      success: false,
      reason: 'INVALID_TRIGGER'
    }
  }

  const botJid = getBotJid(sock)

  if (!botJid) {
    return {
      handled: true,
      success: false,
      reason: 'BOT_JID_UNAVAILABLE'
    }
  }

  try {
    const metadata =
      await getGroupMetadata(
        sock,
        groupJid
      )

    const botParticipant =
      findParticipant(
        metadata,
        botJid
      )

    /*
     * Se já é ADM, não precisa armar.
     */
    if (
      isAdminParticipant(
        botParticipant
      )
    ) {
      return {
        handled: true,
        success: false,
        reason: 'BOT_ALREADY_ADMIN'
      }
    }

    arm(
      groupJid,
      senderJid,
      text
    )

    return {
      handled: true,
      success: true,
      reason: 'ARMED',
      trigger: text
    }

  } catch (error) {
    console.error(
      '[BOT-SER-ADM] erro ao armar:',
      error
    )

    return {
      handled: true,
      success: false,
      reason: 'METADATA_ERROR',
      error
    }
  }
}

/**
 * ============================================================
 * CONFIRMAÇÃO
 * ============================================================
 *
 * ADM manda:
 *
 *   a
 *
 * A mensagem precisa ser EXATAMENTE o gatilho.
 */
async function confirmBotPromotion({
  sock,
  msg
}) {
  const groupJid = msg?.key?.remoteJid

  if (
    !groupJid ||
    !groupJid.endsWith('@g.us')
  ) {
    return {
      handled: false
    }
  }

  const state =
    getPending(groupJid)

  if (!state) {
    return {
      handled: false
    }
  }

  const text =
    getMessageText(msg)

  /*
   * O texto precisa ser exatamente:
   *
   * a
   *
   * e não:
   *
   * "a kyara"
   * "a!"
   * "caramba a"
   */

  if (
    !isExactTrigger(
      text,
      state.trigger
    )
  ) {
    return {
      handled: false
    }
  }

  const senderJid =
    getSenderJid(msg)

  if (!senderJid) {
    return {
      handled: true,
      success: false,
      reason: 'SENDER_UNAVAILABLE'
    }
  }

  try {
    /*
     * IMPORTANTE:
     *
     * Buscamos novamente os participantes
     * NO MOMENTO DA CONFIRMAÇÃO.
     *
     * Não confiamos no estado antigo.
     */
    const metadata =
      await getGroupMetadata(
        sock,
        groupJid
      )

    const senderParticipant =
      findParticipant(
        metadata,
        senderJid
      )

    /*
     * Somente ADM REAL pode confirmar.
     */
    if (
      !isAdminParticipant(
        senderParticipant
      )
    ) {
      return {
        handled: true,
        success: false,
        reason: 'CONFIRMATION_SENDER_NOT_ADMIN'
      }
    }

    const botJid =
      getBotJid(sock)

    if (!botJid) {
      disarm(groupJid)

      return {
        handled: true,
        success: false,
        reason: 'BOT_JID_UNAVAILABLE'
      }
    }

    const botParticipant =
      findParticipant(
        metadata,
        botJid
      )

    /*
     * Se já virou ADM por algum motivo,
     * simplesmente limpa o estado.
     */
    if (
      isAdminParticipant(
        botParticipant
      )
    ) {
      disarm(groupJid)

      return {
        handled: true,
        success: true,
        reason: 'ALREADY_ADMIN'
      }
    }

    /*
     * A promoção usa o JID REAL da Kyara.
     *
     * NÃO usamos o JID do ADM como alvo.
     * NÃO alteramos o sender.
     * NÃO falsificamos nenhuma identidade.
     */
    await sock.groupParticipantsUpdate(
      groupJid,
      [botJid],
      'promote'
    )

    /*
     * Uso único.
     */
    disarm(groupJid)

    return {
      handled: true,
      success: true,
      reason: 'PROMOTED',
      botJid,
      confirmedBy: senderJid
    }

  } catch (error) {
    console.error(
      '[BOT-SER-ADM] erro na promoção:',
      error
    )

    /*
     * Não apagamos o gatilho em caso de erro
     * de rede/WhatsApp, permitindo nova confirmação
     * enquanto ainda estiver dentro do prazo.
     */

    return {
      handled: true,
      success: false,
      reason: 'PROMOTION_ERROR',
      error
    }
  }
}

module.exports = {
  VALID_TRIGGERS,
  armBotPromotion,
  confirmBotPromotion,
  getPending,
  disarm,
  normalizeJid
}
