/**
 * KYARA CORE
 *
 * Camada de organização entre WhatsApp e a IA existente.
 *
 * IMPORTANTE:
 * ia.js continua sendo o motor principal.
 * Este Core apenas organiza a mensagem antes da chamada.
 */

import { KYARA_PERSONA } from './persona.js';
import { entenderIntencao } from './orquestrador.js';
import {
  montarContexto,
  extrairTextoMensagem
} from './contexto.js';

export async function kyaraCore({
  mensagem = {},
  ia,
  nazu = null,
  ownerNumber = null,
  personality = 'humana',
  customPrompt = null,
  memoria = null
} = {}) {

  if (!ia || typeof ia.makeAssistentRequest !== 'function') {
    throw new Error(
      '[KYARA CORE] Motor ia.makeAssistentRequest não está disponível'
    );
  }

  const texto = extrairTextoMensagem(mensagem);

  if (!texto) {
    return {
      resposta: null,
      intencao: 'VAZIO',
      persona: KYARA_PERSONA.nome,
      contexto: null
    };
  }

  const intencao = entenderIntencao(texto);

  const contexto = montarContexto({
    mensagem,
    intencao,
    persona: KYARA_PERSONA,
    memoria
  });

  /*
   * O contexto agora acompanha a mensagem enviada ao motor.
   * Assim o Core deixa de ser apenas um "passador de mensagem".
   */
  const mensagemComContexto = {
    ...mensagem,
    kyaraCore: {
      intencao,
      contexto,
      persona: KYARA_PERSONA.nome
    }
  };

  console.log(`[KYARA CORE] 💬 ${texto.substring(0, 80)}`);
  console.log(`[KYARA CORE] 🧠 Intenção: ${intencao}`);
  console.log(`[KYARA CORE] 🎭 Persona: ${KYARA_PERSONA.nome}`);

  const resposta = await ia.makeAssistentRequest(
    {
      mensagens: [mensagemComContexto]
    },
    nazu,
    ownerNumber,
    personality,
    customPrompt
  );

  return {
    resposta,
    intencao,
    persona: KYARA_PERSONA.nome,
    contexto
  };
}

export default kyaraCore;
