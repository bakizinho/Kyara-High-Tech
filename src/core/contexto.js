/**
 * CONTEXTO DA KYARA
 *
 * Responsável por organizar as informações que serão
 * entregues ao motor de IA existente.
 *
 * NÃO chama a IA.
 * NÃO executa ferramentas.
 * NÃO altera memória.
 */

export function montarContexto({
  mensagem = {},
  intencao = 'CONVERSA',
  persona = null,
  memoria = null
} = {}) {

  return {
    mensagem,
    intencao,
    persona,
    memoria,
    criadoEm: new Date().toISOString()
  };
}

export function extrairTextoMensagem(mensagem = {}) {
  return (
    mensagem.texto ||
    mensagem.body ||
    mensagem.conteudo ||
    ''
  ).toString().trim();
}
