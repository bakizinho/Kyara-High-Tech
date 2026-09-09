import * as IA from './dados/src/funcs/private/ia.js';

console.log('==============================================');
console.log('🌸 KYARA — TESTE DA FUNÇÃO');
console.log('==============================================');

console.log('makeKyaraChatRequest:', typeof IA.makeKyaraChatRequest);
console.log('processUserMessages:', typeof IA.processUserMessages);
console.log('makeCognimaRequest:', typeof IA.makeCognimaRequest);
console.log('makeLocalAIRequest:', typeof IA.makeLocalAIRequest);

if (typeof IA.makeKyaraChatRequest !== 'function') {
  throw new Error('makeKyaraChatRequest não está disponível.');
}

const resultado = await IA.makeKyaraChatRequest({
  mensagem: 'Oi Kyara, tudo bem?',
  historico: [],
  personalidade: '',
  intencao: 'CONVERSA',
  memoria: {},
  contexto: {
    usuario: 'teste',
    grupo: null,
    horario: new Date().getHours(),
    mensagem: 'Oi Kyara, tudo bem?'
  }
});

console.log();
console.log('===== RESULTADO =====');
console.log(JSON.stringify(resultado, null, 2));
