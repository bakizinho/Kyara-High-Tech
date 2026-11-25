import { proto } from 'baileys'

const j = value => JSON.stringify(value)

function getGlobalButtons(prefix = '/') {
  return [
    {
      name: 'quick_reply',
      buttonParamsJson: j({
        display_text: '📋 Menu',
        id: `${prefix}menu`
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: j({
        display_text: '👑 Dono',
        id: `${prefix}menudono`
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: j({
        display_text: '👍 Gostei',
        id: 'owner:feedback:like'
      })
    },
    {
      name: 'cta_copy',
      buttonParamsJson: j({
        display_text: '📋 Copiar Prefixo',
        copy_code: prefix
      })
    }
  ]
}

function makeInteractive(text, prefix = '/') {
  const buttons = getGlobalButtons(prefix)

  const nativeButtons =
    buttons.map(button =>
      proto.Message.InteractiveMessage.NativeFlowMessage.NativeFlowButton.create(
        button
      )
    )

  const nativeFlow =
    proto.Message.InteractiveMessage.NativeFlowMessage.create({
      buttons: nativeButtons,
      messageVersion: 1
    })

  return proto.Message.InteractiveMessage.create({
    body: proto.Message.InteractiveMessage.Body.create({
      text
    }),

    footer: proto.Message.InteractiveMessage.Footer.create({
      text: '👑 KYARA • Toque em um botão'
    }),

    header: proto.Message.InteractiveMessage.Header.create({
      title: 'KYARA BOT',
      hasMediaAttachment: false
    }),

    nativeFlowMessage: nativeFlow
  })
}

export function installGlobalButtons(Kyara) {
  if (!Kyara) {
    throw new Error('Socket Kyara não informado')
  }

  if (Kyara._kyaraButtonsInstalled) {
    console.log('[KYARA BUTTONS] Já instalado')
    return
  }

  const originalSendMessage = Kyara.sendMessage.bind(Kyara)

  Kyara.sendMessage = async (jid, content, options = {}) => {
    try {
      /*
       * Não altera:
       * - interactiveMessage
       * - viewOnceMessage
       * - imagens
       * - vídeos
       * - documentos
       * - áudios
       * - contatos
       * - localizações
       *
       * Inicialmente só transformamos mensagens
       * simples de texto.
       */

      if (
        content &&
        typeof content === 'object' &&
        typeof content.text === 'string' &&
        !content.interactiveMessage &&
        !content.viewOnceMessage &&
        !content.image &&
        !content.video &&
        !content.document &&
        !content.audio &&
        !content.sticker &&
        !content.contact &&
        !content.location
      ) {
        const text = content.text

        /*
         * Não usar propriedades inventadas dentro do
         * content. O prefixo padrão é apenas fallback.
         */
        const prefix = '/'

        const interactive = makeInteractive(text, prefix)

        return await originalSendMessage(
          jid,
          {
            interactiveMessage: interactive
          },
          options
        )
      }

      return await originalSendMessage(
        jid,
        content,
        options
      )

    } catch (error) {
      console.error(
        '[KYARA BUTTONS] Falha:',
        error?.stack || error
      )

      /*
       * Segurança: se a transformação falhar,
       * envia a mensagem original.
       */
      return await originalSendMessage(
        jid,
        content,
        options
      )
    }
  }

  Kyara._kyaraButtonsInstalled = true

  console.log(
    '✅ [KYARA V11] Auto Buttons instalado'
  )
}
