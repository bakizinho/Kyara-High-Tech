/*
 * =========================================================
 * BOT-KYARA • GHOST PAYMENT
 * =========================================================
 *
 * PAYMENT FANTASMA:
 *
 * requestPaymentMessage
 *        ↓
 * requestFrom
 *        ↓
 * identifica autor
 *        ↓
 * confirma membro real
 *        ↓
 * confirma Kyara ADM
 *        ↓
 * fecha grupo
 *        ↓
 * DELETE + confirmação REVOKE
 *        ↓
 * remove autor
 *        ↓
 * reabre grupo somente se foi fechado por nós
 *
 * NÃO cria mensagem auxiliar.
 * NÃO cria MESSAGE_EDIT.
 * NÃO cria listener próprio.
 * O handler é chamado pelo connect.js já existente.
 * =========================================================
 */

import {
  jidNormalizedUser,
} from "baileys"


/*
 * =========================================================
 * CONFIGURAÇÃO
 * =========================================================
 */

const STRONG_PAYMENT_KEYS =
  new Set([
    "requestPaymentMessage",
    "paymentMessage",
    "paymentInviteMessage",
    "requestPayment",
    "sendPaymentMessage",
    "sendPayment",
    "payment",
  ])


const PROCESSED_TTL =
  60 * 1000


const processedPayments =
  new Map()


/*
 * =========================================================
 * UTILIDADES
 * =========================================================
 */

function isObject(
  value,
) {
  return (
    value !== null &&
    typeof value === "object"
  )
}


function normalize(
  value,
) {
  if (!value) {
    return ""
  }

  try {

    return jidNormalizedUser(
      String(value),
    )

  } catch {

    return String(value)
  }
}


function markProcessed(
  id,
) {
  if (!id) {
    return
  }

  const now =
    Date.now()

  const old =
    processedPayments.get(id)

  if (
    old &&
    now - old < PROCESSED_TTL
  ) {
    return false
  }

  processedPayments.set(
    id,
    now,
  )

  setTimeout(
    () => {
      const current =
        processedPayments.get(id)

      if (
        current === now
      ) {
        processedPayments.delete(
          id,
        )
      }
    },
    PROCESSED_TTL,
  )

  return true
}


/*
 * =========================================================
 * UNWRAP
 * =========================================================
 */

function unwrapMessage(
  value,
  depth = 0,
) {

  if (
    !isObject(value) ||
    depth > 14
  ) {
    return value
  }


  if (
    value.message &&
    isObject(value.message)
  ) {
    return unwrapMessage(
      value.message,
      depth + 1,
    )
  }


  if (
    value.ephemeralMessage?.message
  ) {
    return unwrapMessage(
      value.ephemeralMessage.message,
      depth + 1,
    )
  }


  if (
    value.viewOnceMessage?.message
  ) {
    return unwrapMessage(
      value.viewOnceMessage.message,
      depth + 1,
    )
  }


  if (
    value.viewOnceMessageV2?.message
  ) {
    return unwrapMessage(
      value.viewOnceMessageV2.message,
      depth + 1,
    )
  }


  if (
    value.viewOnceMessageV2Extension?.message
  ) {
    return unwrapMessage(
      value.viewOnceMessageV2Extension.message,
      depth + 1,
    )
  }


  return value
}


/*
 * =========================================================
 * LOCALIZA PAYMENT
 * =========================================================
 *
 * Para BAN automático usamos somente estruturas
 * fortes de payment.
 *
 * Não tratamos qualquer botão "payment" genérico
 * como motivo suficiente para remover alguém.
 * =========================================================
 */

function findPaymentStructure(
  value,
  depth = 0,
  visited = new Set(),
) {

  if (
    !isObject(value) ||
    depth > 18 ||
    visited.has(value)
  ) {
    return null
  }


  if (
    typeof Buffer !== "undefined" &&
    Buffer.isBuffer(value)
  ) {
    return null
  }


  visited.add(value)


  for (
    const [key, child]
    of Object.entries(value)
  ) {

    if (
      STRONG_PAYMENT_KEYS.has(key)
    ) {

      return {
        key,
        value: child,
      }
    }


    if (
      key === "requestPaymentMessage"
    ) {

      return {
        key,
        value: child,
      }
    }


    if (
      isObject(child)
    ) {

      const nested =
        findPaymentStructure(
          child,
          depth + 1,
          visited,
        )

      if (nested) {
        return nested
      }
    }
  }


  return null
}


/*
 * =========================================================
 * REQUEST FROM
 * =========================================================
 */

function findRequestPaymentParticipant(
  value,
  depth = 0,
  visited = new Set(),
) {

  if (
    !isObject(value) ||
    depth > 18 ||
    visited.has(value)
  ) {
    return ""
  }


  if (
    typeof Buffer !== "undefined" &&
    Buffer.isBuffer(value)
  ) {
    return ""
  }


  visited.add(value)


  for (
    const [key, child]
    of Object.entries(value)
  ) {

    if (
      key === "requestPaymentMessage" &&
      isObject(child) &&
      child.requestFrom
    ) {

      return normalize(
        child.requestFrom,
      )
    }


    if (
      isObject(child)
    ) {

      const nested =
        findRequestPaymentParticipant(
          child,
          depth + 1,
          visited,
        )

      if (nested) {
        return nested
      }
    }
  }


  return ""
}


/*
 * =========================================================
 * MESSAGE KEY / JID
 * =========================================================
 */

function getMessageKey(
  info,
) {
  return (
    info?.key ||
    null
  )
}


function getRemoteJid(
  info,
) {
  return (
    getMessageKey(info)?.remoteJid ||
    info?.remoteJid ||
    ""
  )
}


/*
 * =========================================================
 * AUTOR
 * =========================================================
 */

function getAuthorCandidates(
  info,
) {

  const key =
    getMessageKey(info)

  const root =
    unwrapMessage(info)

  const requestFrom =
    findRequestPaymentParticipant(
      root,
    )


  return [
    /*
     * PRIORIDADE MÁXIMA:
     * requestPaymentMessage.requestFrom
     */
    requestFrom,

    key?.participant,
    key?.participantAlt,
    key?.participantPn,

    info?.participant,
    info?.participantAlt,
    info?.participantPn,

    root?.contextInfo?.participant,
    root?.contextInfo?.participantAlt,
    root?.contextInfo?.participantPn,
  ]
    .filter(Boolean)
    .map(normalize)
    .filter(Boolean)
}


/*
 * =========================================================
 * PARTICIPANTE DO GRUPO
 * =========================================================
 */

function findParticipant(
  metadata,
  candidates,
) {

  const participants =
    metadata?.participants ||
    []


  for (
    const participant
    of participants
  ) {

    const ids = [
      participant?.id,
      participant?.jid,
      participant?.lid,
      participant?.participant,
      participant?.phoneNumber,
    ]
      .filter(Boolean)
      .map(normalize)


    if (
      ids.some(
        id =>
          candidates.includes(id),
      )
    ) {

      return participant
    }
  }


  return null
}


/*
 * =========================================================
 * LID → PN
 * =========================================================
 */

async function resolveParticipant(
  socket,
  participant,
) {

  if (!participant) {
    return ""
  }


  /*
   * Primeiro:
   * mesmo helper usado pelo apagar.js funcional.
   */
  try {

    const modulo =
      await import(
        "../../arquivos/js/lidHelper.js"
      )


    const resolver =
      modulo.resolverJidReal ||
      modulo.default?.resolverJidReal


    if (
      typeof resolver === "function"
    ) {

      const resolved =
        await resolver(
          socket,
          participant,
        )


      if (resolved) {

        return normalize(
          resolved,
        )
      }
    }

  } catch (error) {

    console.log(
      "[GHOST-PAYMENT] resolverJidReal indisponível:",
      error?.message ||
        String(error),
    )
  }


  /*
   * Fallback nativo.
   */
  try {

    const original =
      normalize(
        participant,
      )


    if (
      !original.endsWith("@lid")
    ) {
      return original
    }


    const mapping =
      socket
        ?.signalRepository
        ?.lidMapping


    if (
      mapping &&
      typeof mapping.getPNForLID ===
        "function"
    ) {

      const pn =
        await mapping.getPNForLID(
          original,
        )


      if (pn) {

        console.log(
          "[GHOST-PAYMENT] LID → PN:",
          original,
          "=>",
          pn,
        )

        return normalize(
          pn,
        )
      }
    }


    return original

  } catch {

    return normalize(
      participant,
    )
  }
}


/*
 * =========================================================
 * PROTEÇÃO
 * =========================================================
 */

function isProtectedAuthor({
  participant,
  authorCandidates,
  metadata,
  botLid,
  ownerLid,
}) {

  /*
   * ADMIN REAL
   */
  if (
    participant?.admin === "admin" ||
    participant?.admin === "superadmin"
  ) {
    return true
  }


  const protectedIds = [
    botLid,
    ownerLid,
    metadata?.owner,
    metadata?.ownerPn,
    metadata?.ownerLid,
  ]
    .filter(Boolean)
    .map(normalize)


  return authorCandidates.some(
    candidate =>
      protectedIds.includes(
        candidate,
      ),
  )
}


/*
 * =========================================================
 * CONFIRMA KYARA COMO ADMIN
 * =========================================================
 */

function botIsAdmin(
  socket,
  metadata,
  botLid,
) {

  const candidates = [
    botLid,
    socket?.user?.lid,
    socket?.user?.id,
  ]
    .filter(Boolean)
    .map(normalize)


  const participant =
    findParticipant(
      metadata,
      candidates,
    )


  if (!participant) {
    return false
  }


  return (
    participant.admin === "admin" ||
    participant.admin === "superadmin"
  )
}


/*
 * =========================================================
 * DELETE CONFIRMADO
 * =========================================================
 *
 * Reutiliza a mesma ideia do apagar.js:
 *
 * listener
 *   ↓
 * DELETE
 *   ↓
 * messages.update
 *   ↓
 * message === null
 *
 * Sem mensagem auxiliar.
 * =========================================================
 */

async function deletePaymentKeyConfirmed(
  socket,
  key,
  timeout = 3000,
) {

  if (
    !key?.remoteJid ||
    !key?.id
  ) {
    return false
  }


  const remoteJid =
    key.remoteJid

  const id =
    String(key.id)


  let timer = null
  let finished = false


  const result =
    await new Promise(
      async resolve => {

        const finish =
          value => {

            if (finished) {
              return
            }

            finished = true

            if (timer) {
              clearTimeout(
                timer,
              )
            }


            try {
              socket?.ev?.off?.(
                "messages.update",
                listener,
              )
            } catch {}


            resolve(
              Boolean(value),
            )
          }


        const listener =
          updates => {

            if (
              !Array.isArray(updates)
            ) {
              return
            }


            for (
              const event
              of updates
            ) {

              const eventRemote =
                event?.key?.remoteJid

              const eventId =
                event?.key?.id

              const message =
                event?.update?.message


              if (
                eventRemote ===
                  remoteJid &&
                String(eventId) ===
                  id &&
                message === null
              ) {

                console.log(
                  "[GHOST-PAYMENT] ✅ REVOKE CONFIRMADO:",
                  id,
                )

                finish(
                  true,
                )

                return
              }
            }
          }


        try {

          socket
            ?.ev
            ?.on?.(
              "messages.update",
              listener,
            )

        } catch {

          finish(false)

          return
        }


        timer =
          setTimeout(
            () => {

              console.log(
                "[GHOST-PAYMENT] ⏱️ REVOKE não confirmado:",
                id,
              )

              finish(
                false,
              )

            },
            timeout,
          )


        try {

          console.log(
            "[GHOST-PAYMENT] 🔑 DELETE:",
            JSON.stringify(
              key,
              null,
              2,
            ),
          )


          await socket.sendMessage(
            remoteJid,
            {
              delete:
                key,
            },
          )

        } catch (error) {

          console.warn(
            "[GHOST-PAYMENT] ❌ DELETE falhou:",
            error?.message ||
              String(error),
          )

          finish(false)
        }
      },
    )


  return result
}


/*
 * =========================================================
 * CANDIDATAS DE DELETE
 * =========================================================
 */

async function buildPaymentDeleteKeys(
  socket,
  info,
) {

  const key =
    getMessageKey(info)


  if (
    !key?.remoteJid ||
    !key?.id
  ) {
    return []
  }


  const root =
    unwrapMessage(info)


  const requestFrom =
    findRequestPaymentParticipant(
      root,
    )


  const originalParticipants = [
    requestFrom,

    key.participant,
    key.participantAlt,
    key.participantPn,

    ...getAuthorCandidates(
      info,
    ),
  ]
    .filter(Boolean)


  const resolved = []


  for (
    const participant
    of originalParticipants
  ) {

    const value =
      await resolveParticipant(
        socket,
        participant,
      )

    if (value) {
      resolved.push(value)
    }
  }


  const participants = [
    ...new Set([
      ...originalParticipants,
      ...resolved,
    ].filter(Boolean)),
  ]


  const keys = []


  /*
   * KEY exatamente como recebida.
   */
  keys.push({
    ...key,
    remoteJid:
      key.remoteJid,
    id:
      key.id,
  })


  /*
   * KEY com cada representação de participant.
   */
  for (
    const participant
    of participants
  ) {

    keys.push({
      remoteJid:
        key.remoteJid,

      id:
        key.id,

      fromMe:
        false,

      participant,
    })
  }


  /*
   * Último fallback sem participant.
   */
  keys.push({
    remoteJid:
      key.remoteJid,

    id:
      key.id,

    fromMe:
      false,
  })


  /*
   * Remove duplicatas.
   */
  const uniqueKeys = []
  const seen = new Set()


  for (
    const candidate
    of keys
  ) {

    const signature =
      JSON.stringify(
        candidate,
      )


    if (
      seen.has(signature)
    ) {
      continue
    }


    seen.add(
      signature,
    )

    uniqueKeys.push(
      candidate,
    )
  }


  return uniqueKeys
}


/*
 * =========================================================
 * DELETE PAYMENT
 * =========================================================
 */

async function deleteGhostMessage(
  socket,
  info,
) {

  const keys =
    await buildPaymentDeleteKeys(
      socket,
      info,
    )


  if (!keys.length) {
    return false
  }


  for (
    let index = 0;
    index < keys.length;
    index++
  ) {

    const key =
      keys[index]


    console.log(
      `[GHOST-PAYMENT] 🗑️ Tentativa DELETE ${index + 1}/${keys.length}`,
    )


    const ok =
      await deletePaymentKeyConfirmed(
        socket,
        key,
        3000,
      )


    if (ok) {

      console.log(
        "[GHOST-PAYMENT] ✅ PAYMENT APAGADO:",
        key.id,
      )

      return true
    }
  }


  console.warn(
    "[GHOST-PAYMENT] ❌ Nenhuma KEY confirmou REVOKE.",
  )


  return false
}


/*
 * =========================================================
 * FECHAR GRUPO
 * =========================================================
 */

async function closeGhostGroup(
  socket,
  remoteJid,
  metadata,
) {

  /*
   * Se já estava fechado, não alteramos.
   */
  if (
    metadata?.announce === true
  ) {

    console.log(
      "[GHOST-PAYMENT] GRUPO JÁ ESTAVA FECHADO.",
    )

    return {
      ok: true,
      changed: false,
    }
  }


  if (
    typeof socket?.groupSettingUpdate !==
    "function"
  ) {

    console.warn(
      "[GHOST-PAYMENT] groupSettingUpdate indisponível.",
    )

    return {
      ok: false,
      changed: false,
    }
  }


  try {

    await socket.groupSettingUpdate(
      remoteJid,
      "announcement",
    )


    console.log(
      "[GHOST-PAYMENT] 🔒 GRUPO FECHADO:",
      remoteJid,
    )


    return {
      ok: true,
      changed: true,
    }

  } catch (error) {

    console.error(
      "[GHOST-PAYMENT] ❌ NÃO FOI POSSÍVEL FECHAR:",
      error?.message ||
        String(error),
    )


    return {
      ok: false,
      changed: false,
    }
  }
}


/*
 * =========================================================
 * REABRIR GRUPO
 * =========================================================
 */

async function openGhostGroup(
  socket,
  remoteJid,
  shouldOpen,
) {

  if (!shouldOpen) {
    return false
  }


  if (
    typeof socket?.groupSettingUpdate !==
    "function"
  ) {
    return false
  }


  try {

    await socket.groupSettingUpdate(
      remoteJid,
      "not_announcement",
    )


    console.log(
      "[GHOST-PAYMENT] 🔓 GRUPO REABERTO:",
      remoteJid,
    )


    return true

  } catch (error) {

    console.error(
      "[GHOST-PAYMENT] ❌ FALHA AO REABRIR:",
      error?.message ||
        String(error),
    )


    return false
  }
}


/*
 * =========================================================
 * REMOVER AUTOR
 * =========================================================
 */

async function removeGhostAuthor(
  socket,
  remoteJid,
  author,
) {

  if (
    !remoteJid ||
    !author
  ) {
    return false
  }


  const participant =
    await resolveParticipant(
      socket,
      author,
    )


  if (!participant) {
    return false
  }


  try {

    await socket.groupParticipantsUpdate(
      remoteJid,
      [participant],
      "remove",
    )


    console.log(
      "[GHOST-PAYMENT] 🚫 AUTOR REMOVIDO:",
      JSON.stringify({
        remoteJid,
        author,
        participant,
      }),
    )


    return true

  } catch (error) {

    console.error(
      "[GHOST-PAYMENT] ❌ FALHA AO REMOVER AUTOR:",
      JSON.stringify({
        remoteJid,
        author,
        participant,
        error:
          error?.message ||
          String(error),
      }),
    )


    return false
  }
}


/*
 * =========================================================
 * API PRINCIPAL
 * =========================================================
 */

async function handleGhostPayment({
  socket,
  info,
  metadata = null,
  botLid = "",
  ownerLid = "",
  enforce = true,
} = {}) {

  if (
    !socket ||
    !info
  ) {
    return {
      handled: false,
      reason:
        "invalid-input",
    }
  }


  const key =
    getMessageKey(info)


  const remoteJid =
    getRemoteJid(info)


  if (
    !remoteJid.endsWith("@g.us")
  ) {
    return {
      handled: false,
      reason:
        "not-group",
    }
  }


  /*
   * Nunca processa mensagem da própria Kyara.
   */
  if (
    key?.fromMe
  ) {
    return {
      handled: false,
      reason:
        "from-me",
    }
  }


  const messageId =
    key?.id


  const root =
    unwrapMessage(info)


  const payment =
    findPaymentStructure(
      root,
    )


  /*
   * Não é payment forte.
   */
  if (!payment) {
    return {
      handled: false,
      reason:
        "no-payment",
    }
  }


  /*
   * Evita duplicação do mesmo evento.
   */
  if (
    messageId &&
    !markProcessed(
      `${remoteJid}:${messageId}`,
    )
  ) {

    return {
      handled: true,
      duplicate: true,
      paymentKey:
        payment.key,
    }
  }


  /*
   * Busca metadata SOMENTE depois da detecção.
   */
  if (
    !metadata &&
    typeof socket.groupMetadata ===
      "function"
  ) {

    try {

      metadata =
        await socket.groupMetadata(
          remoteJid,
        )

    } catch (error) {

      console.warn(
        "[GHOST-PAYMENT] ❌ Metadata indisponível:",
        error?.message ||
          String(error),
      )


      return {
        handled: true,
        reason:
          "metadata-unavailable",
        deleted: false,
        removed: false,
      }
    }
  }


  if (!metadata) {

    console.warn(
      "[GHOST-PAYMENT] ❌ Sem metadata — nenhuma punição.",
    )


    return {
      handled: true,
      reason:
        "metadata-unavailable",
      deleted: false,
      removed: false,
    }
  }


  /*
   * Confirma que a Kyara é ADM.
   */
  if (
    !botIsAdmin(
      socket,
      metadata,
      botLid,
    )
  ) {

    console.warn(
      "[GHOST-PAYMENT] ❌ KYARA NÃO É ADMIN — nenhuma punição.",
    )


    return {
      handled: true,
      reason:
        "bot-not-admin",
      deleted: false,
      removed: false,
    }
  }


  const authors =
    getAuthorCandidates(
      info,
    )


  if (!authors.length) {

    console.warn(
      "[GHOST-PAYMENT] ❌ Autor não identificado.",
    )


    return {
      handled: true,
      reason:
        "author-not-found",
      deleted: false,
      removed: false,
    }
  }


  const participant =
    findParticipant(
      metadata,
      authors,
    )


  if (!participant) {

    console.warn(
      "[GHOST-PAYMENT] ❌ Autor não encontrado no grupo:",
      JSON.stringify(
        authors,
      ),
    )


    return {
      handled: true,
      reason:
        "participant-not-found",
      deleted: false,
      removed: false,
    }
  }


  /*
   * IMPORTANTE:
   * usa o identificador encontrado no metadata.
   */
  const author =
    participant.id ||
    participant.jid ||
    participant.lid ||
    authors[0]


  console.log(
    "[GHOST-PAYMENT] 💳 PAYMENT FANTASMA DETECTADO:",
    JSON.stringify({
      remoteJid,
      messageId:
        messageId ||
        null,
      paymentKey:
        payment.key,
      author,
      participantAdmin:
        participant.admin ||
        null,
      requestFrom:
        findRequestPaymentParticipant(
          root,
        ) ||
        null,
      enforce,
    }),
  )


  /*
   * Nunca pune bot/dono/admin.
   */
  if (
    isProtectedAuthor({
      participant,
      authorCandidates:
        authors,
      metadata,
      botLid,
      ownerLid,
    })
  ) {

    console.warn(
      "[GHOST-PAYMENT] 🛡️ AUTOR PROTEGIDO — NADA SERÁ REMOVIDO.",
    )


    return {
      handled: true,
      protected: true,
      deleted: false,
      removed: false,
      paymentKey:
        payment.key,
    }
  }


  /*
   * Dry-run opcional.
   */
  if (!enforce) {

    console.log(
      "[GHOST-PAYMENT] DRY-RUN — nenhuma punição executada.",
    )


    return {
      handled: true,
      dryRun: true,
      deleted: false,
      removed: false,
      paymentKey:
        payment.key,
    }
  }


  /*
   * =======================================================
   * 1. FECHA
   * =======================================================
   */

  const closed =
    await closeGhostGroup(
      socket,
      remoteJid,
      metadata,
    )


  let deleted = false
  let removed = false
  let reopened = false


  try {

    /*
     * =====================================================
     * 2. APAGA PAYMENT
     * =====================================================
     */

    deleted =
      await deleteGhostMessage(
        socket,
        info,
      )


    /*
     * =====================================================
     * 3. REMOVE AUTOR
     * =====================================================
     */

    removed =
      await removeGhostAuthor(
        socket,
        remoteJid,
        author,
      )

  } finally {

    /*
     * =====================================================
     * 4. REABRE SOMENTE SE NÓS FECHAMOS
     * =====================================================
     */

    reopened =
      await openGhostGroup(
        socket,
        remoteJid,
        closed.changed,
      )
  }


  const result = {
    handled: true,

    dryRun: false,

    closed:
      Boolean(
        closed.ok,
      ),

    deleted,

    removed,

    reopened,

    paymentKey:
      payment.key,

    messageId:
      messageId ||
      null,

    author,
  }


  console.log(
    "[GHOST-PAYMENT] ✅ RESULTADO FINAL:",
    JSON.stringify(
      result,
      null,
      2,
    ),
  )


  return result
}


/*
 * =========================================================
 * EXPORTS
 * =========================================================
 */

export {
  handleGhostPayment,
  findPaymentStructure,
  deleteGhostMessage,
  removeGhostAuthor,
  closeGhostGroup,
  openGhostGroup,
}
