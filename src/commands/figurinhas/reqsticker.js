import { rememberPaymentRequest } from '../utils/paymentRequestStore.js'
import {
  getConfiguredBotName,
  getKyaraEmoji
} from '../core/identity/kyara-identity.js'

import {
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  generateMessageIDV2,
  downloadContentFromMessage
} from 'baileys'


async function streamToBuffer(stream) {

  const chunks = []

  for await (const chunk of stream) {

    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    )

  }

  return Buffer.concat(chunks)

}


async function obterStickerBuffer(
  stickerMsg,
  getFileBuffer
) {

  if (typeof getFileBuffer === 'function') {

    const buffer =
      await getFileBuffer(
        stickerMsg,
        'sticker'
      )

    if (Buffer.isBuffer(buffer)) {
      return buffer
    }

    if (buffer) {
      return Buffer.from(buffer)
    }

  }


  const stream =
    await downloadContentFromMessage(
      stickerMsg,
      'sticker'
    )

  return await streamToBuffer(stream)

}


function obterQuotedSticker(info) {

  return (
    info
      ?.message
      ?.extendedTextMessage
      ?.contextInfo
      ?.quotedMessage
      ?.stickerMessage
    || null
  )

}


const comandoReqsticker = {

  name: 'reqsticker',

  description:
    '💳 Manda texto ou figurinha em uma mensagem de pagamento',

  category:
    'premium',

  aliases: [
    'pagamentofake',
    'reqfig',
    'reqpayment'
  ],


  async execute({

    kyara,
    from,
    info,
    reply,
    reagir,
    q,
    args,
    sender,
    prefix,
    isPremium = null,
    getFileBuffer,
    messagesCache

  }) {

    if (isPremium === false) {

      return reply(
        '⭐ Este comando é exclusivo para usuários VIP/Premium.'
      )

    }


    const stickerMsg =
      obterQuotedSticker(info)
      ||
      info
        ?.message
        ?.stickerMessage
      ||
      null


    const texto =
      String(
        q
        ||
        (
          Array.isArray(args)
            ? args.join(' ')
            : ''
        )
      ).trim()


    if (!stickerMsg && !texto) {

      return reply(
`💳 *REQSTICKER*

Use assim:

${prefix}reqsticker texto

Ou responda uma figurinha com:

${prefix}reqsticker`
      )

    }


    let noteMessage


    if (stickerMsg) {

      const buffer =
        await obterStickerBuffer(
          stickerMsg,
          getFileBuffer
        )


      if (
        !buffer ||
        !Buffer.isBuffer(buffer) ||
        buffer.length === 0
      ) {

        throw new Error(
          'Buffer da figurinha vazio.'
        )

      }


      if (
        typeof kyara?.waUploadToServer !==
        'function'
      ) {

        throw new Error(
          'BOT-KYARA não possui waUploadToServer().'
        )

      }


      const media =
        await prepareWAMessageMedia(
          {
            sticker: buffer
          },
          {
            upload:
              kyara.waUploadToServer
          }
        )


      if (!media?.stickerMessage) {

        throw new Error(
          'Baileys não retornou stickerMessage.'
        )

      }


      noteMessage = {

        stickerMessage:
          media.stickerMessage

      }


    } else {

      noteMessage = {

        conversation:
          texto

      }

    }


    if (!kyara?.user?.id) {

      throw new Error(
        `${getConfiguredBotName()} está sem user.id.`
      )

    }


    if (
      typeof kyara.relayMessage !==
      'function'
    ) {

      throw new Error(
        'BOT-KYARA está sem relayMessage().'
      )

    }


    const conteudo = {

      requestPaymentMessage: {

        noteMessage,

        currencyCodeIso4217:
          '',

        amount1000:
          0,

        requestFrom:
          sender,

        expiryTimestamp:
          0

      }

    }


    const msgGerada =
      await generateWAMessageFromContent(
        from,
        conteudo,
        {
          userJid:
            kyara.user.id,

          messageId:
            generateMessageIDV2(
              kyara.user.id
            )
        }
      )


    if (
      !msgGerada?.message ||
      !msgGerada?.key?.id
    ) {

      throw new Error(
        'generateWAMessageFromContent não gerou uma mensagem válida.'
      )

    }


    /*
     * ========================================================
     * CACHE DA KEY ORIGINAL DO REQUEST PAYMENT
     * ========================================================
     *
     * requestPaymentMessage é criado localmente pelo Kyara.
     *
     * Por isso ele pode não passar novamente por
     * messages.upsert -> connect.js.
     *
     * Guardamos a mensagem gerada aqui para o #apagar
     * poder utilizar a KEY REAL posteriormente.
     */

    if (
      messagesCache &&
      typeof messagesCache.set === 'function' &&
      msgGerada?.key?.id
    ) {

      const cacheKey =
        `${msgGerada.key.remoteJid || from}_${msgGerada.key.id}`


      messagesCache.set(
        cacheKey,
        {
          ...msgGerada,

          key: {
            ...msgGerada.key
          },

          message:
            msgGerada.message,

          messageTimestamp:
            Math.floor(
              Date.now() / 1000
            )

        }
      )


      console.log(
        '[REQSTICKER][CACHE] ✅ KEY original armazenada:',
        JSON.stringify(
          {
            cacheKey,
            remoteJid:
              msgGerada.key.remoteJid,
            id:
              msgGerada.key.id,
            fromMe:
              msgGerada.key.fromMe,
            participant:
              msgGerada.key.participant,
            participantAlt:
              msgGerada.key.participantAlt,
            participantPn:
              msgGerada.key.participantPn
          },
          null,
          2
        )
      )

    } else {

      console.warn(
        '[REQSTICKER][CACHE] ⚠️ Não foi possível armazenar a KEY original.'
      )

    }


    /*
     * ========================================================
     * GUARDA A KEY ORIGINAL DO REQUEST PAYMENT
     * ========================================================
     *
     * Esse payment foi criado pelo próprio Kyara.
     * Ele não precisa passar novamente por messages.upsert
     * para poder ser cancelado depois.
     */

    const paymentKeyOriginal = {
      ...msgGerada.key,

      remoteJid:
        msgGerada.key.remoteJid ||
        from,

      id:
        msgGerada.key.id,

      fromMe:
        true
    }

    rememberPaymentRequest(
      from,
      paymentKeyOriginal
    )


    await kyara.relayMessage(
      from,
      msgGerada.message,
      {
        messageId:
          msgGerada.key.id
      }
    )


    if (typeof reagir === 'function') {

      try {

        await reagir('💳')

      } catch {}

    }


    return true

  }

}


export default comandoReqsticker
