import { gerarAudioLer } from './ler.js';
import fs from 'fs/promises';

try {
  console.log('🎙️ Testando voz da Kyara...');
  console.log('🆔 KgC2Nqnjj48NUiyV');

  const audio = await gerarAudioLer(
    'Olá! Eu sou a Kyara. Agora estou usando a minha voz original.'
  );

  await fs.writeFile(
    'kyara-teste.wav',
    audio.buffer
  );

  console.log('✅ Áudio gerado.');
  console.log(`📦 ${audio.buffer.length} bytes`);
  console.log('📁 ~/kyara/kyara-teste.wav');
} catch (err) {
  console.error('❌ ERRO:', err.message);
  process.exit(1);
}
