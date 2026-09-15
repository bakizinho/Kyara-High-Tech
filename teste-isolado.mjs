import { generateWAMessageFromContent, proto } from 'baileys'

export async function testeQuickReplyUnico(nazu, from) {
  const logs = {
    serializado: false,
    waMessageValido: false,
    relayChamado: false,
    erro: null,
    messageId: null
  }

  try {
    const content = {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.create({
            body: proto.Message.InteractiveMessage.Body.create({
              text: 'TESTE CONTROLE - apenas quick_reply'
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
              text: 'controle kyara'
            }),
            header: proto.Message.InteractiveMessage.Header.create({
              hasMediaAttachment: false
            }),
            nativeFlowMessage:
              proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: 'TESTE OK',
                      id: 'teste_controle'
                    })
                  }
                ]
              })
          })
        }
      }
    }

    logs.serializado = true
    console.log('[1] Mensagem foi construída?', true)

    const waMsg = generateWAMessageFromContent(
      from,
      content,
      {
        userJid: nazu?.user?.id
      }
    )

    logs.waMessageValido =
      !!(waMsg?.message && waMsg?.key?.id)

    logs.messageId = waMsg?.key?.id || null

    console.log(
      '[2] WAMessage válido?',
      logs.waMessageValido
    )

    console.log(
      '[3] messageId:',
      logs.messageId
    )

    logs.relayChamado = true

    console.log(
      '[4] Chamando relayMessage...'
    )

    const relayResult = await nazu.relayMessage(
      from,
      waMsg.message,
      {
        messageId: waMsg.key.id
      }
    )

    console.log('[5] relayMessage terminou sem exceção')
    console.log('[RELAY RESULT]', relayResult)

    console.log('[RESULTADO FINAL]', logs)

    return logs

  } catch (e) {
    logs.erro = e?.stack || e?.message || String(e)

    console.error(
      '[TESTE FLOW] ERRO:',
      logs.erro
    )

    console.log(
      '[RESULTADO FINAL]',
      logs
    )

    return logs
  }
}
