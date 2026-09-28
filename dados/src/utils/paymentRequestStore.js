/*
 * ============================================================
 * BOT-KYARA • PAYMENT REQUEST KEY STORE
 * ============================================================
 *
 * Guarda somente em memória a KEY original dos
 * requestPaymentMessage criados pelo próprio Kyara.
 *
 * Não grava:
 *   - número de usuário
 *   - conteúdo do pagamento
 *   - mídia
 *   - banco de dados
 *
 * Apenas a MessageKey necessária para cancelar/revogar.
 * ============================================================
 */

const STORE =
  new Map()


const TTL =
  15 * 60 * 1000


const MAX =
  100


function montarStoreKey(
  remoteJid,
  id
) {

  return (
    `${String(remoteJid || '')}|${String(id || '')}`
  )

}


function limparExpirados() {

  const agora =
    Date.now()


  for (
    const [key, item] of STORE.entries()
  ) {

    if (
      !item ||
      item.expiresAt <= agora
    ) {

      STORE.delete(
        key
      )

    }

  }


  while (
    STORE.size > MAX
  ) {

    const first =
      STORE.keys().next()

    if (
      first.done
    ) {
      break
    }

    STORE.delete(
      first.value
    )

  }

}


export function rememberPaymentRequest(
  remoteJid,
  messageKey
) {

  limparExpirados()


  if (
    !remoteJid ||
    !messageKey?.id
  ) {

    return false

  }


  const key =
    {
      ...messageKey,

      remoteJid:
        messageKey.remoteJid ||
        remoteJid,

      id:
        messageKey.id,

      fromMe:
        Boolean(
          messageKey.fromMe
        )

    }


  STORE.set(
    montarStoreKey(
      remoteJid,
      key.id
    ),
    {
      key,
      expiresAt:
        Date.now() + TTL
    }
  )


  console.log(
    '[PAYMENT-STORE] ✅ KEY salva:',
    JSON.stringify(
      {
        remoteJid:
          key.remoteJid,

        id:
          key.id,

        fromMe:
          key.fromMe,

        participant:
          key.participant || null,

        participantAlt:
          key.participantAlt || null,

        participantPn:
          key.participantPn || null

      },
      null,
      2
    )
  )


  return true
}


export function getPaymentRequestKey(
  remoteJid,
  id
) {

  limparExpirados()


  const item =
    STORE.get(
      montarStoreKey(
        remoteJid,
        id
      )
    )


  if (
    !item
  ) {

    return null

  }


  return {
    ...item.key
  }

}


export function forgetPaymentRequest(
  remoteJid,
  id
) {

  STORE.delete(
    montarStoreKey(
      remoteJid,
      id
    )
  )

}


export function clearPaymentRequestStore() {

  STORE.clear()

}
