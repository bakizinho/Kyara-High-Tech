/*
 * KYARA IA GLOBAL
 *
 * DESATIVADO.
 *
 * Este módulo NÃO altera:
 * - sendMessage
 * - relayMessage
 * - contextInfo
 * - mensagens interativas
 * - carrosséis
 * - imagens
 * - legendas
 * - botões
 * - protobuf
 *
 * Mantemos a função exportada apenas para compatibilidade
 * caso algum arquivo antigo ainda faça import dela.
 */

export function ativaIAGratis(sock) {
    return sock;
}
