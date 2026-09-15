import {
  menuKyaraAdaptativo,
  getInteractiveCommand,
  isOwner
} from './menu-adaptativo.js'

/*
 * Adaptador do Menu Adaptativo da Kyara.
 *
 * IMPORTANTE:
 * O BKkyara já possui um processador central de mensagens.
 * Por isso este módulo NÃO registra outro messages.upsert.
 *
 * Isso evita:
 * - comando duplicado
 * - menu duplicado
 * - processamento duplo de botões
 * - loops entre listeners
 */

async function abrirMenuAdaptativo(
  sock,
  jid,
  pushName = 'usuário',
  options = {}
) {
  return await menuKyaraAdaptativo(
    sock,
    jid,
    pushName,
    options
  )
}

function lerCliqueAdaptativo(message) {
  return getInteractiveCommand(message)
}

function usuarioEhOwner(jid) {
  return isOwner(jid)
}

export {
  abrirMenuAdaptativo,
  lerCliqueAdaptativo,
  usuarioEhOwner
}
