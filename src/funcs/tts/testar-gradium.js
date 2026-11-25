import { WebSocket } from 'ws';

const URL = 'wss://api.gradium.ai/api/speech/tts';

const API_KEY =
  process.env.GRADIUM_API_KEY ||
  process.env.GRADIUM_KEY;

const VOICE_ID = 'KgC2Nqnjj48NUiyV';

if (!API_KEY) {
  console.error('❌ GRADIUM_API_KEY não configurada.');
  process.exit(1);
}

console.log('🔊 Testando Gradium');
console.log('🎙️ Voice:', VOICE_ID);
console.log('🌐 Endpoint:', URL);

const ws = new WebSocket(URL, {
  headers: {
    'x-api-key': API_KEY
  }
});

const timeout = setTimeout(() => {
  console.error('❌ Timeout.');
  ws.close();
  process.exit(1);
}, 30000);

ws.on('open', () => {
  console.log('✅ WebSocket conectado.');

  ws.send(JSON.stringify({
    type: 'setup',
    voice_id: VOICE_ID,
    output_format: 'wav'
  }));
});

ws.on('message', data => {
  console.log('📩', data.toString().slice(0, 500));

  try {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'ready') {
      console.log('✅ Gradium aceitou a voz.');

      ws.send(JSON.stringify({
        type: 'text',
        text: 'Olá! Eu sou a Kyara. Esta é a minha voz.'
      }));

      ws.send(JSON.stringify({
        type: 'end_of_stream'
      }));
    }

    if (msg.type === 'error') {
      console.error('❌ ERRO:', msg.message || msg.error);
      clearTimeout(timeout);
      ws.close();
      process.exit(1);
    }

    if (msg.type === 'end_of_stream') {
      console.log('✅ Síntese concluída.');
      clearTimeout(timeout);
      ws.close();
      process.exit(0);
    }
  } catch {}
});

ws.on('error', err => {
  console.error('❌ WebSocket:', err.code || '', err.message);
  clearTimeout(timeout);
  process.exit(1);
});

ws.on('close', () => {
  clearTimeout(timeout);
});
