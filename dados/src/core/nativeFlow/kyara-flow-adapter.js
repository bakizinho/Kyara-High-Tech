import {
  extractId,
  routeOwnerFlow
} from './owner-flow-router.js'

/*
 * Adapter independente.
 *
 * NÃO força isOwner = true.
 * A autorização deve ser fornecida pelo index.js.
 */

export function createKyaraFlowAdapter({
  Kyara,
  isOwner,
  getPrefix = () => '.',
  getBotName = () => 'KYARA',
  getOwnerId = () => null,
  executeCommand = null
}) {
  if (!Kyara) {
    throw new Error(
      'createKyaraFlowAdapter: Kyara não foi fornecida'
    )
  }

  return async function handleKyaraFlow(update) {
    const messages =
      update?.messages || []

    for (const message of messages) {
      if (!message?.message) continue

      if (message.key?.fromMe) {
        continue
      }

      const jid =
        message.key?.remoteJid

      if (!jid) continue

      const id =
        extractId(message.message)

      if (!id) continue

      if (!id.startsWith('owner:')) {
        continue
      }

      /*
       * Segurança:
       * o clique não concede privilégio.
       */
      let owner = false

      try {
        owner =
          typeof isOwner === 'function'
            ? await isOwner(message, jid)
            : false
      } catch (error) {
        console.error(
          '[KYARA FLOW] erro verificando owner:',
          error
        )
      }

      if (!owner) {
        await Kyara.sendMessage(
          jid,
          {
            text:
              '⛔ *ACESSO NEGADO*\n\n' +
              'Este painel é exclusivo do proprietário.'
          }
        )

        continue
      }

      await routeOwnerFlow({
        Kyara,
        jid,
        id,
        prefix: getPrefix(message),
        botName: getBotName(message),
        userName:
          message.pushName || 'Dono',
        ownerId:
          getOwnerId(message),
        executeCommand
      })
    }
  }
}

export function installKyaraFlowAdapter(options) {
  const handler =
    createKyaraFlowAdapter(options)

  options.Kyara.ev.on(
    'messages.upsert',
    handler
  )

  console.log(
    '✅ KYARA NATIVE FLOW ADAPTER ATIVO'
  )

  return handler
}
