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

import {
  getPaymentRequestKey,
  forgetPaymentRequest
} from '../utils/paymentRequestStore.js'


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
    a.remoteJid !==
      b.remoteJid
  ) {
    return false
  }

  return true
}


function esperarRevoke(
  socket,
  key,
  timeoutMs = 5000
) {

  return new Promise(
    resolve => {

      let finalizado =
        false

      let timer =
        null

      const limpar =
        () => {

          if (timer) {
            clearTimeout(
              timer
            )
          }

          try {

            socket
              ?.ev
              ?.off(
                'messages.update',
                onUpdate
              )

          } catch {}

          try {

            socket
              ?.ev
              ?.off(
                'messages.delete',
                onDelete
              )

          } catch {}

        }


      const concluir =
        valor => {

          if (
            finalizado
          ) {
            return
          }

          finalizado =
            true

          limpar()

          resolve(
            valor
          )
        }


      const onUpdate =
        updates => {

          for (
            const item of
              Array.isArray(updates)
                ? updates
                : []
          ) {

            if (
              !mesmaMensagem(
                item?.key,
                key
              )
            ) {
              continue
            }

            /*
             * Revoke processado pelo Baileys:
             * update.message === null
             */
            if (
              item?.update?.message ===
              null
            ) {

              console.log(
                '[KYARA][APAGAR] ✅ REVOKE CONFIRMADO pelo Baileys:',
                key.id
              )

              concluir(
                true
              )

              return
            }
          }
        }


      const onDelete =
        data => {

          for (
            const item of
              Array.isArray(
                data?.keys
              )
                ? data.keys
                : []
          ) {

            if (
              mesmaMensagem(
                item,
                key
              )
            ) {

              console.log(
                '[KYARA][APAGAR] ✅ messages.delete CONFIRMADO:',
                key.id
              )

              concluir(
                true
              )

              return
            }
          }
        }


      try {

        socket
          ?.ev
          ?.on(
            'messages.update',
            onUpdate
          )

        socket
          ?.ev
          ?.on(
            'messages.delete',
            onDelete
          )

      } catch {

        concluir(
          false
        )

        return
      }


      timer =
        setTimeout(
          () => {

            if (
              !finalizado
            ) {

              console.log(
                '[KYARA][APAGAR] ⏱️ Sem confirmação de revoke:',
                key.id
              )

              concluir(
                false
              )
            }

          },
          timeoutMs
        )

    }
  )
}


/* ============================================================
 * DELETE CONFIRMADO
 * ============================================================
 */

async function deleteConfirmado(
  socket,
  key,
  timeoutMs = 5000
) {

  if (
    !socket ||
    typeof socket.sendMessage !==
      'function' ||
    !key?.remoteJid ||
    !key?.id
  ) {

    return false
  }


  console.log(
    '[KYARA][APAGAR] 🔑 KEY ENVIADA:',
    JSON.stringify(
      key,
      null,
      2
    )
  )


  /*
   * Listener fica pronto ANTES do envio.
   */
  const espera =
    esperarRevoke(
      socket,
      key,
      timeoutMs
    )


  try {

    await socket.sendMessage(
      key.remoteJid,
      {
        delete:
          key
      }
    )

  } catch (erro) {

    console.log(
      '[KYARA][APAGAR] ❌ DELETE rejeitado:',
      erro?.message ||
      erro
    )

    return false
  }


  return await espera
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

  const candidatas =
    []


  const vistos =
    new Set()


  function adicionar(
    key,
    rotulo
  ) {

    if (
      !key?.remoteJid ||
      !key?.id
    ) {
      return
    }

    const assinatura =
      JSON.stringify(
        key
      )

    if (
      vistos.has(
        assinatura
      )
    ) {
      return
    }

    vistos.add(
      assinatura
    )

    candidatas.push(
      {
        key,
        rotulo
      }
    )
  }


  let participant =
    normalizarJid(
      quotedParticipant
    )


  if (
    !participant
  ) {
    participant =
      normalizarJid(
        paymentStoreKey?.participant
      )
  }


  if (
    !participant
  ) {
    participant =
      normalizarJid(
        cacheItem?.key?.participant
      )
  }


  /*
   * Em requestPaymentMessage criado pelo próprio Kyara,
   * o participante usado no revoke pode ser o LID da própria
   * conta do bot.
   */
  if (
    !participant
  ) {

    participant =
      normalizarJid(
        socket?.user?.id
      )
  }


  let pn =
    null


  if (
    participant &&
    ehLid(participant)
  ) {

    pn =
      await resolverLid(
        socket,
        participant
      )
  }


  if (
    paymentStoreKey?.participant &&
    ehLid(
      normalizarJid(
        paymentStoreKey.participant
      )
    )
  ) {

    const storeLid =
      normalizarJid(
        paymentStoreKey.participant
      )

    if (
      !participant
    ) {
      participant =
        storeLid
    }

    if (
      !pn
    ) {
      pn =
        await resolverLid(
          socket,
          storeLid
        )
    }
  }


  console.log(
    '[KYARA][PAGAMENTO] 👤 Participant:',
    participant || null
  )

  console.log(
    '[KYARA][PAGAMENTO] 📱 ParticipantAlt:',
    pn || null
  )


  /*
   * CANDIDATA 1
   *
   * É a que já funcionou no teste real:
   * fromMe=false + LID + PN
   */
  if (
    participant &&
    ehLid(participant) &&
    pn
  ) {

    adicionar(
      {
        remoteJid,
        id,
        fromMe:
          false,
        participant,
        participantAlt:
          pn
      },
      'LID + PN'
    )
  }


  /*
   * CANDIDATA 2
   */
  if (
    pn
  ) {

    adicionar(
      {
        remoteJid,
        id,
        fromMe:
          false,
        participant:
          pn
      },
      'PN'
    )
  }


  /*
   * CANDIDATA 3
   */
  if (
    participant
  ) {

    adicionar(
      {
        remoteJid,
        id,
        fromMe:
          false,
        participant
      },
      'LID/participant'
    )
  }


  /*
   * CANDIDATA 4
   *
   * Sem participante.
   */
  adicionar(
    {
      remoteJid,
      id,
      fromMe:
        false
    },
    'SEM PARTICIPANT'
  )


  /*
   * CANDIDATA 5
   *
   * Somente depois das chaves especiais,
   * tentamos a chave original salva.
   */
  if (
    paymentStoreKey?.id === id
  ) {

    adicionar(
      {
        ...paymentStoreKey,
        remoteJid
      },
      'STORE ORIGINAL'
    )
  }


  /*
   * CANDIDATA 6
   */
  if (
    cacheItem?.key?.id === id
  ) {

    adicionar(
      {
        ...cacheItem.key,
        remoteJid
      },
      'CACHE ORIGINAL'
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
          isStatus,
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
          '[BOT-KYARA][PAGAMENTO] ✅ APAGADO DE VERDADE:',
          id
        )


        try {
          forgetPaymentRequest(
            remoteJid,
            id
          )
        } catch {}


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
