import {
  gerarAudioSupremo
} from './ttsSupremo.js';

export async function gerarAudioLer(
  texto
) {
  return gerarAudioSupremo(
    texto,
    'kyara'
  );
}

export default gerarAudioLer;
