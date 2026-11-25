import {
  getPaymentMessage
} from '../../features/antiPayment.js'

/*
 * ============================================================
 * KYARA • APAGAR / PAYMENT ORIGINAL ADAPTADO
 * ============================================================
 *
 * Adaptado do código original enviado.
 *
 * FUNCIONALIDADES:
 * - Apagar mensagens normais.
 * - Apagar mensagens de pagamento.
 * - Procurar contextInfo em qualquer subtipo.
 * - Resolver JID/LID.
 * - Criar mensagem auxiliar.
 * - Editar a mensagem auxiliar usando o ID auxiliar.
 * - Tentar remover a mensagem de pagamento.
 * - Limpar a mensagem auxiliar.
 *
 * ============================================================
 */

/* ============================================================
 * UTILITÁRIOS
 * ============================================================
 */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}


/*
 * Normaliza JID removendo sufixos de dispositivo.
 */
function normalizarJid(jid) {
  if (!jid) return ''

  return String(jid)
    .trim()
    .replace(/:\d+(?=@)/, '')
}


/*
 * Resolve LID para PN utilizando o próprio Baileys.
 */
async function resolverJidReal(socket, jid) {
  const participante = normalizarJid(jid)

  if (!participante) return ''

  if (!participante.endsWith('@lid')) {
    return participante
  }

  try {
    const mapping =
      socket?.signalRepository?.lidMapping

    if (
      mapping &&
      typeof mapping.getPNForLID === 'function'
    ) {
      const pn = await mapping.getPNForLID(participante)

      if (pn) {
        return normalizarJid(pn)
      }
    }
  } catch (error) {
    console.log(
      '[APAGAR] ⚠️ Falha ao resolver LID:',
      error?.message || error
    )
  }

  /*
   * Se não conseguir resolver, preserva o LID original.
   */
  return participante
}


/* ============================================================
 * LOCALIZAR CONTEXTINFO
 * ============================================================
 */

function acharContextInfo(message, visited = new Set()) {
  if (
    !message ||
    typeof message !== 'object' ||
    visited.has(message)
  ) {
    return null
  }

  visited.add(message)

  if (message.contextInfo?.stanzaId) {
    return message.contextInfo
  }

  for (const valor of Object.values(message)) {
    if (valor && typeof valor === 'object') {
      const encontrado = acharContextInfo(valor, visited)

      if (encontrado?.stanzaId) {
        return encontrado
      }
    }
  }

  return null
}


/* ============================================================
 * DETECÇÃO DE PAGAMENTO
 * ============================================================
 */

function ehMensagemPagamento(message) {
  if (!message || typeof message !== 'object') {
    return false
  }

  try {
    return Boolean(getPaymentMessage(message))
  } catch (error) {
    console.log(
      '[APAGAR] ⚠️ Erro na detecção de Payment:',
      error?.message || error
    )

    return false
  }
}


/* ============================================================
 * EXECUTE
 * ============================================================
 */

async function execute({
  kyara: columbina,
  from,
  info,
  reply,
  reagir,
  isGroup,
  isAdm,
  isBotAdm,
  isDono,
  isMonitor
} = {}) {

  const dono =
    typeof isDono === 'function'
      ? Boolean(isDono())
      : Boolean(isDono)

  /*
   * PERMISSÕES
   */

  if (!isGroup) {
    return reply(
      '❌ Este comando só pode ser usado em grupos!'
    )
  }

  if (!isAdm && !dono && !isMonitor) {
    return reply(
      '❌ Apenas administradores podem usar este comando!'
    )
  }

  if (!isBotAdm) {
    return reply(
      '❌ O bot precisa ser administrador para isso!'
    )
  }

  if (!columbina || typeof columbina.sendMessage !== 'function') {
    return reply(
      '❌ Socket da Kyara indisponível!'
    )
  }

  /*
   * LOCALIZA A MENSAGEM RESPONDIDA
   */

  const quoted = acharContextInfo(info?.message)

  if (!quoted?.stanzaId) {
    return reply(
      '❌ Responda a mensagem que deseja apagar!'
    )
  }

  /*
   * NORMALIZA PARTICIPANTE
   */

  const participantReal = await resolverJidReal(
    columbina,
    quoted.participant
  )

  /*
   * ========================================================
   * PAYMENT
   * ========================================================
   *
   * Utiliza a identificação de pagamento já existente
   * no Anti-Payment do BKkyara.
   *
   * ========================================================
   */

  if (ehMensagemPagamento(quoted.quotedMessage)) {
    try {
      console.log(
        '[APAGAR][PAYMENT] 💳 Mensagem de pagamento detectada:',
        quoted.stanzaId
      )

      /*
       * Gera uma mensagem auxiliar para obter um ID nosso.
       */
      const msgVazia = await columbina.sendMessage(
        from,
        {
          text: ''
        }
      )

      const idEditada = msgVazia?.key?.id

      if (!idEditada) {
        throw new Error(
          'falha ao gerar ID auxiliar'
        )
      }

      console.log(
        '[APAGAR][PAYMENT] 🆔 ID auxiliar:',
        idEditada
      )

      /*
       * Tenta editar a mensagem auxiliar utilizando
       * o ID da própria mensagem de pagamento.
       */
      await columbina.sendMessage(
        from,
        {
          text: '🗑️ Mensagem de pagamento removida',
          edit: {
            id: idEditada
          }
        },
        {
          messageId: quoted.stanzaId
        }
      )

      await sleep(500)

      /*
       * Tenta apagar a mensagem de pagamento.
       */
      await columbina.sendMessage(
        from,
        {
          delete: {
            remoteJid: from,
            id: quoted.stanzaId,
            fromMe: false,
            participant: participantReal
          }
        }
      )

      await sleep(500)

      /*
       * LIMPEZA DA MENSAGEM AUXILIAR.
       */
      try {
        await columbina.sendMessage(
          from,
          {
            delete: {
              remoteJid: from,
              id: idEditada,
              fromMe: true
            }
          }
        )

      } catch (_e1) {

        try {
          await columbina.sendMessage(
            from,
            {
              delete: {
                remoteJid: from,
                id: idEditada,
                fromMe: false,
                participant: columbina.user?.id
              }
            }
          )

        } catch (eLimpeza) {
          console.log(
            '⚠️ Não consegui limpar a mensagem auxiliar do apagar:',
            eLimpeza?.message
          )
        }
      }

      if (typeof reagir === 'function') {
        await reagir('🗑️')
      }

      console.log(
        '[APAGAR][PAYMENT] ✅ Processo de exclusão concluído:',
        quoted.stanzaId
      )

    } catch (error) {
      console.log(
        '❌ ERRO !apagar (mensagem de pagamento):',
        error?.message || error
      )

      await reply(
        `❌ Não foi possível apagar a mensagem de pagamento! (${error?.message || 'erro desconhecido'})`
      )
    }

    return
  }


  /*
   * ========================================================
   * MENSAGEM NORMAL
   * ========================================================
   */

  try {
    const deleteKey = {
      remoteJid: from,
      fromMe: false,
      id: quoted.stanzaId
    }

    if (participantReal) {
      deleteKey.participant = participantReal
    }

    await columbina.sendMessage(
      from,
      {
        delete: deleteKey
      }
    )

    if (typeof reagir === 'function') {
      await reagir('🗑️')
    }

    console.log(
      '[APAGAR] ✅ Mensagem removida:',
      quoted.stanzaId
    )

  } catch (error) {
    console.log(
      '❌ ERRO !apagar:',
      error?.message || error
    )

    await reply(
      `❌ Não foi possível apagar a mensagem! (${error?.message || 'erro desconhecido'})`
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
