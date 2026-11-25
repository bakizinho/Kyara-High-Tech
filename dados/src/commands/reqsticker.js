import { rememberPaymentRequest } from '../utils/paymentRequestStore.js'
import {
  getConfiguredBotName,
  getKyaraEmoji
} from '../core/identity/kyara-identity.js'

import {
  prepareWAMessageMedia,
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
      typeof kyara.sendMessage !==
      'function'
    ) {

      throw new Error(
        'BOT-KYARA está sem sendMessage().'
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



    /*
     * Envio pelo próprio socket do @c4bal/baileys.
     * O conteúdo do RequestPayment é preservado em modo raw.
     * A KEY retornada será a referência usada pelo #d.
     */

    const msgEnviada = await kyara.sendMessage(
      from,
      {
        ...conteudo,
        raw: true
      }
    )

    if (!msgEnviada?.key?.id) {
      throw new Error(
        'sendMessage não retornou a KEY do RequestPaymentMessage.'
      )
    }

    const paymentKeyOriginal = {
      ...msgEnviada.key,

      remoteJid:
        msgEnviada.key.remoteJid ||
        from,

      id:
        msgEnviada.key.id,

      fromMe:
        true
    }

    if (
      messagesCache &&
      typeof messagesCache.set === 'function'
    ) {
      const cacheKey =
        `${paymentKeyOriginal.remoteJid}_${paymentKeyOriginal.id}`

      messagesCache.set(
        cacheKey,
        {
          ...msgEnviada,

          key: {
            ...paymentKeyOriginal
          },

          message:
            msgEnviada.message ||
            conteudo,

          messageTimestamp:
            msgEnviada.messageTimestamp ||
            Math.floor(Date.now() / 1000)
        }
      )

      console.log(
        '[REQSTICKER][CACHE] ✅ KEY retornada pelo sendMessage:',
        JSON.stringify(
          {
            cacheKey,
            remoteJid: paymentKeyOriginal.remoteJid,
            id: paymentKeyOriginal.id,
            fromMe: paymentKeyOriginal.fromMe,
            participant: paymentKeyOriginal.participant || null,
            participantAlt: paymentKeyOriginal.participantAlt || null
          },
          null,
          2
        )
      )
    }

    rememberPaymentRequest(
      from,
      paymentKeyOriginal
    )

    console.log(
      '[REQSTICKER][STORE] ✅ KEY original guardada:',
      JSON.stringify(
        {
          remoteJid: paymentKeyOriginal.remoteJid,
          id: paymentKeyOriginal.id,
          fromMe: paymentKeyOriginal.fromMe,
          participant: paymentKeyOriginal.participant || null
        },
        null,
        2
      )
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
