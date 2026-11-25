/*
 * ============================================================
 * BOT-KYARA • APAGAR / DELETE SUPREMO
 * ============================================================
 *
 * Suporta:
 *   - mensagens normais
 *   - requestPaymentMessage
 *   - LID + PN
 *   - messagesCache
 *   - paymentRequestStore
 *   - status@broadcast
 *
 * O delete só é considerado concluído quando o evento
 * de remoção/revoke correspondente for observado pelo socket.
 * ============================================================
 */

import { getPaymentRequestKey } from '../utils/paymentRequestStore.js'



/* ============================================================
 * DEDUP
 * ============================================================
 */

const apagarEmAndamento =
  new Set()

const apagarProcessados =
  new Map()

const DEDUP_TTL =
  10000


function chaveDedup(
  remoteJid,
  id
) {
  return `${remoteJid}|${id}`
}


function limparDedup() {

  const agora =
    Date.now()

  for (
    const [
      chave,
      timestamp
    ] of apagarProcessados.entries()
  ) {

    if (
      agora - timestamp >
      DEDUP_TTL
    ) {
      apagarProcessados.delete(
        chave
      )
    }
  }

}


function jaProcessado(
  chave
) {

  limparDedup()

  return apagarProcessados.has(
    chave
  )
}


function marcarProcessado(
  chave
) {

  limparDedup()

  apagarProcessados.set(
    chave,
    Date.now()
  )
}


/* ============================================================
 * UTILIDADES
 * ============================================================
 */

function sleep(
  ms
) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  )

}


function normalizarJid(
  jid
) {

  if (!jid) {
    return ''
  }

  return String(jid)
    .trim()
}


function ehLid(
  jid
) {

  return normalizarJid(jid)
    .endsWith('@lid')
}


function ehPn(
  jid
) {

  return normalizarJid(jid)
    .includes('@s.whatsapp.net')
}


async function resolverLid(
  socket,
  jid
) {

  const normalizado =
    normalizarJid(jid)

  if (
    !normalizado ||
    !ehLid(normalizado)
  ) {
    return null
  }

  try {

    const mapping =
      socket
        ?.signalRepository
        ?.lidMapping

    if (
      mapping &&
      typeof mapping.getPNForLID ===
        'function'
    ) {

      const pn =
        await mapping.getPNForLID(
          normalizado
        )

      if (pn) {
        return normalizarJid(
          pn
        )
      }
    }

  } catch (error) {

    console.warn(
      '[KYARA][APAGAR] ⚠️ Falha LID → PN:',
      error?.message ||
      error
    )
  }

  return null
}


/* ============================================================
 * CONTEXT INFO
 * ============================================================
 */

function acharContextInfo(
  message
) {

  if (
    !message ||
    typeof message !== 'object'
  ) {
    return null
  }

  if (
    message.contextInfo
  ) {
    return message.contextInfo
  }

  for (
    const valor of Object.values(
      message
    )
  ) {

    if (
      valor &&
      typeof valor === 'object'
    ) {

      const encontrado =
        acharContextInfo(
          valor
        )

      if (encontrado) {
        return encontrado
      }
    }
  }

  return null
}


/* ============================================================
 * DETECTOR RECURSIVO
 * ============================================================
 */

function ehPagamento(
  message
) {

  if (
    !message ||
    typeof message !== 'object'
  ) {
    return false
  }

  if (
    message.requestPaymentMessage
  ) {
    return true
  }

  for (
    const valor of Object.values(
      message
    )
  ) {

    if (
      valor &&
      typeof valor === 'object'
    ) {

      if (
        ehPagamento(
          valor
        )
      ) {
        return true
      }
    }
  }

  return false
}


/* ============================================================
 * LOCALIZAR ID NO CACHE
 * ============================================================
 */

function obterCachePorId(
  messagesCache,
  remoteJid,
  id
) {

  if (
    !messagesCache ||
    typeof messagesCache.entries !==
      'function' ||
    !id
  ) {
    return null
  }

  const chaveDireta =
    `${remoteJid}_${id}`

  try {

    const direto =
      messagesCache.get(
        chaveDireta
      )

    if (
      direto?.key?.id === id
    ) {
      return direto
    }

  } catch {}


  try {

    for (
      const [
        chave,
        item
      ] of messagesCache.entries()
    ) {

      if (
        item?.key?.id === id
      ) {

        if (
          !remoteJid ||
          item?.key?.remoteJid ===
            remoteJid ||
          String(chave).endsWith(
            `_${id}`
          )
        ) {
          return item
        }
      }
    }

  } catch {}

  return null
}


/* ============================================================
 * STORE
 * ============================================================
 */

function obterStoreKey(
  remoteJid,
  id
) {

  try {

    const key =
      getPaymentRequestKey(
        remoteJid,
        id
      )

    if (
      key?.id === id
    ) {

      console.log(
        '[KYARA][PAGAMENTO] ✅ KEY encontrada no PAYMENT-STORE:',
        JSON.stringify(
          key,
          null,
          2
        )
      )

      return key
    }

  } catch (error) {

    console.warn(
      '[KYARA][PAGAMENTO] ⚠️ PAYMENT-STORE indisponível:',
      error?.message ||
      error
    )
  }

  return null
}


/* ============================================================
 * CONFIRMAÇÃO DE REVOKE
 * ============================================================
 */

function mesmaMensagem(
  a,
  b
) {

  if (
    !a ||
    !b
  ) {
    return false
  }

  if (
    a.id !==
    b.id
  ) {
    return false
  }

  if (
    a.remoteJid &&
    b.remoteJid &&
    a.remoteJid !== b.remoteJid
  ) {
    return false
  }

  if (
    typeof a.fromMe === 'boolean' &&
    typeof b.fromMe === 'boolean' &&
    a.fromMe !== b.fromMe
  ) {
    return false
  }

  if (
    a.participant &&
    b.participant &&
    a.participant !== b.participant
  ) {
    return false
  }

  return true
}


async function deleteConfirmado(
  socket,
  key,
  timeoutMs = 5000
) {
  if (
    !socket ||
    typeof socket.sendMessage !== 'function' ||
    !key?.remoteJid ||
    !key?.id ||
    typeof key.fromMe !== 'boolean'
  ) {
    return false
  }

  /*
   * Usa a KEY original.
   * Não inventa participant, PN ou LID.
   */
  console.log(
    '[KYARA][APAGAR] 🔑 KEY ORIGINAL DO PAGAMENTO:',
    JSON.stringify(key, null, 2)
  )

  try {
    const enviado = await socket.sendMessage(
      key.remoteJid,
      {
        delete: key
      }
    )

    console.log(
      '[KYARA][APAGAR] 📨 Solicitação de revoke transmitida:',
      JSON.stringify({
        alvo: key.id,
        idDoRevoke: enviado?.key?.id || null
      })
    )

    /*
     * O envio foi transmitido pelo socket.
     * Não tratamos o eco local messages.update
     * como prova de remoção remota.
     */
    return true

  } catch (erro) {
    console.log(
      '[KYARA][APAGAR] ❌ DELETE rejeitado:',
      erro?.message || erro
    )

    return false
  }
}


/* ============================================================
 * CONSTRUIR CANDIDATAS DE PAYMENT
 * ============================================================
 */

async function obterChavesPagamento(
  socket,
  remoteJid,
  id,
  quotedParticipant,
  paymentStoreKey,
  cacheItem
) {
  const original =
    paymentStoreKey?.id === id
      ? paymentStoreKey
      : cacheItem?.key?.id === id
        ? cacheItem.key
        : null

  /*
   * Pagamento enviado pelo bot:
   * usa exatamente a KEY retornada no envio.
   */
  if (original?.fromMe === true) {
    return [
      {
        key: {
          ...original
        },
        rotulo: 'KEY ORIGINAL RETORNADA PELO ENVIO'
      }
    ]
  }

  /*
   * Mantém suporte a pagamentos enviados por terceiros.
   */
  const candidatas = []
  const vistos = new Set()

  function adicionar(key, rotulo) {
    if (!key?.remoteJid || !key?.id) return

    const assinatura = JSON.stringify(key)

    if (vistos.has(assinatura)) return

    vistos.add(assinatura)
    candidatas.push({ key, rotulo })
  }

  const participant =
    normalizarJid(quotedParticipant) ||
    normalizarJid(original?.participant)

  let pn = null

  if (participant && ehLid(participant)) {
    pn = await resolverLid(socket, participant)
  }

  if (!pn && original?.participantAlt) {
    pn = normalizarJid(original.participantAlt)
  }

  if (participant && pn && participant !== pn) {
    adicionar(
      {
        remoteJid,
        id,
        fromMe: false,
        participant,
        participantAlt: pn
      },
      'TERCEIRO • LID + PN'
    )
  }

  if (pn) {
    adicionar(
      {
        remoteJid,
        id,
        fromMe: false,
        participant: pn
      },
      'TERCEIRO • PN'
    )
  }

  if (participant) {
    adicionar(
      {
        remoteJid,
        id,
        fromMe: false,
        participant
      },
      'TERCEIRO • PARTICIPANT'
    )
  }

  adicionar(
    {
      remoteJid,
      id,
      fromMe: false
    },
    'TERCEIRO • SEM PARTICIPANT'
  )

  if (original) {
    adicionar(
      { ...original },
      'KEY ORIGINAL'
    )
  }

  return candidatas
}


/* ============================================================
 * EXTRAIR ALVO
 * ============================================================
 */

function extrairAlvo(
  info,
  from,
  socket
) {

  const contextInfo =
    acharContextInfo(
      info?.message
    )


  const stanzaId =
    contextInfo?.stanzaId ||
    null


  const participant =
    normalizarJid(
      contextInfo?.participant ||
      contextInfo?.participantAlt ||
      ''
    )


  const quotedMessage =
    contextInfo?.quotedMessage ||
    null


  const remoteOriginal =
    normalizarJid(
      info?.key?.remoteJid ||
      from
    )


  const isStatus =
    remoteOriginal ===
      'status@broadcast' ||
    contextInfo?.remoteJid ===
      'status@broadcast'


  let remoteJid =
    isStatus
      ? 'status@broadcast'
      : remoteOriginal


  /*
   * Alguns pacotes de status podem trazer o remoteJid
   * dentro do contexto.
   */
  if (
    contextInfo?.remoteJid
  ) {

    remoteJid =
      normalizarJid(
        contextInfo.remoteJid
      )
  }


  /*
   * Detecta se o próprio comando veio acompanhado
   * de informação suficiente para localizar o alvo.
   */
  if (
    !stanzaId
  ) {

    return {
      contextInfo,
      stanzaId:
        null,
      participant:
        null,
      quotedMessage,
      remoteJid,
      isStatus,
      socket
    }
  }


  return {
    contextInfo,
    stanzaId,
    participant,
    quotedMessage,
    remoteJid,
    isStatus,
    socket
  }
}


/* ============================================================
 * EXECUTE
 * ============================================================
 */

async function execute(
  {
    kyara: socket,
    from,
    info,
    reply,
    reagir,
    isGroup = false,
    isAdm = false,
    isBotAdm = false,
    isDono = false,
    isMonitor = false,
    messagesCache
  } = {}
) {

  if (
    !socket
  ) {

    try {
      await reply?.(
        '❌ Socket da Kyara indisponível.'
      )
    } catch {}

    return false
  }


  /*
   * Mantém as permissões do comando #d ativo.
   * Pagamentos também passam por estas verificações.
   */
  const dono = Boolean(isDono)

  if (!isGroup) {
    try {
      await reply?.('❌ Este comando só pode ser usado em grupos!')
    } catch {}
    return false
  }

  if (!isAdm && !dono && !isMonitor) {
    try {
      await reply?.('❌ Apenas administradores podem usar este comando!')
    } catch {}
    return false
  }

  if (!isBotAdm) {
    try {
      await reply?.('❌ O bot precisa ser administrador para isso!')
    } catch {}
    return false
  }

  const alvo =
    extrairAlvo(
      info,
      from,
      socket
    )


  const id =
    alvo.stanzaId


  if (
    !id
  ) {

    try {

      await reply?.(
        '❌ Responda diretamente à mensagem que deseja apagar.'
      )

    } catch {}

    return false
  }


  const remoteJid =
    alvo.remoteJid ||
    from


  const chave =
    chaveDedup(
      remoteJid,
      id
    )


  if (
    apagarEmAndamento.has(
      chave
    ) ||
    jaProcessado(
      chave
    )
  ) {

    console.log(
      '[KYARA][APAGAR] ↩️ Duplicata ignorada:',
      chave
    )

    return true
  }


  apagarEmAndamento.add(
    chave
  )


  try {

    const paymentNoQuoted =
      ehPagamento(
        alvo.quotedMessage
      )


    const cacheItem =
      obterCachePorId(
        messagesCache,
        remoteJid,
        id
      )


    const paymentNoCache =
      ehPagamento(
        cacheItem?.message
      ) ||
      ehPagamento(
        cacheItem
      )


    const paymentStoreKey =
      obterStoreKey(
        remoteJid,
        id
      )


    const paymentDetectado =
      paymentNoQuoted ||
      paymentNoCache ||
      !!paymentStoreKey


    console.log(
      '[KYARA][APAGAR] 🎯 alvo:',
      JSON.stringify(
        {
          remoteJid,
          id,
          participant:
            alvo.participant || null,
          isStatus:
            alvo.isStatus,
          paymentDetectado
        },
        null,
        2
      )
    )


    /* ========================================================
     * PAYMENT
     * ========================================================
     */

    if (
      paymentDetectado
    ) {

      console.log(
        '[KYARA][PAGAMENTO] 💳 RequestPaymentMessage detectada:',
        id
      )


      const candidatas =
        await obterChavesPagamento(
          socket,
          remoteJid,
          id,
          alvo.participant,
          paymentStoreKey,
          cacheItem
        )


      console.log(
        '[KYARA][PAGAMENTO] 🔎 Candidatas:',
        candidatas.length
      )


      let apagou =
        false


      for (
        let i = 0;
        i < candidatas.length;
        i++
      ) {

        const item =
          candidatas[i]


        console.log(
          `[KYARA][PAGAMENTO] 🗑️ Tentativa ${i + 1}/${candidatas.length} — ${item.rotulo}`
        )


        const sucesso =
          await deleteConfirmado(
            socket,
            item.key,
            4500
          )


        if (
          sucesso
        ) {

          apagou =
            true

          break
        }
      }


      if (
        apagou
      ) {

        marcarProcessado(
          chave
        )

        console.log(
          '[BOT-KYARA][PAGAMENTO] 📨 SOLICITAÇÃO DE EXCLUSÃO TRANSMITIDA:',
          id
        )




        if (
          typeof reagir ===
          'function'
        ) {

          try {
            await reagir(
              '🗑️'
            )
          } catch {}
        }

        return true
      }


      console.log(
        '[BOT-KYARA][PAGAMENTO] ❌ Nenhuma KEY conseguiu confirmar o REVOKE:',
        id
      )


      try {

        await reply?.(
          '❌ Não consegui remover essa mensagem de pagamento.'
        )

      } catch {}

      return false
    }


    /* ========================================================
     * PERMISSÕES PARA MENSAGEM NORMAL
     * ========================================================
     */

    /*
     * Mensagem própria do bot:
     * pode apagar sem exigir admin do grupo.
     */
    const botJid =
      normalizarJid(
        socket?.user?.id
      )


    const participant =
      normalizarJid(
        alvo.participant
      )


    const participantPN =
      participant &&
      ehLid(participant)
        ? await resolverLid(
            socket,
            participant
          )
        : null


    const alvoEhBot =
      participant ===
        botJid ||
      participantPN ===
        botJid


    if (
      isGroup &&
      !alvoEhBot
    ) {

      if (
        !isAdm &&
        !isDono &&
        !isMonitor
      ) {

        try {

          await reply?.(
            '❌ Apenas administrador pode apagar mensagens de outros membros.'
          )

        } catch {}

        return false
      }


      if (
        !isBotAdm &&
        !isDono
      ) {

        try {

          await reply?.(
            '❌ Preciso ser administrador do grupo para apagar essa mensagem.'
          )

        } catch {}

        return false
      }
    }


    /* ========================================================
     * DELETE NORMAL
     * ========================================================
     */

    const normalKey =
      {
        remoteJid,
        id,
        fromMe:
          alvoEhBot
      }


    if (
      participant
    ) {
      normalKey.participant =
        participant
    }


    if (
      participantPN
    ) {
      normalKey.participantAlt =
        participantPN
    }


    console.log(
      '[KYARA][APAGAR] 🔑 DELETE NORMAL:',
      JSON.stringify(
        normalKey,
        null,
        2
      )
    )


    try {

      await socket.sendMessage(
        remoteJid,
        {
          delete:
            normalKey
        }
      )

    } catch (erro) {

      console.log(
        '[KYARA][APAGAR] ❌ DELETE normal rejeitado:',
        erro?.message ||
        erro
      )

      return false
    }


    marcarProcessado(
      chave
    )


    if (
      typeof reagir ===
      'function'
    ) {

      try {
        await reagir(
          '🗑️'
        )
      } catch {}
    }


    console.log(
      '[KYARA][APAGAR] ✅ Mensagem normal removida:',
      id
    )


    return true

  } finally {

    apagarEmAndamento.delete(
      chave
    )

  }
}


/* ============================================================
 * EXPORT
 * ============================================================
 */

export default {
  execute
}

export {
  execute
}
