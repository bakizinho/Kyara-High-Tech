import {
  gerarAudioSupremo,
  listarVozesSupremo,
  statusTtsSupremo
} from './ttsSupremo.js';

export async function gerarAudioKyara(
  texto,
  voz = 'kyara'
) {
  return gerarAudioSupremo(
    texto,
    voz
  );
}

export {
  listarVozesSupremo as listarVozesKyara,
  statusTtsSupremo as statusKyaraVoice
};

export default {
  gerarAudioKyara,
  listarVozesKyara,
  statusKyaraVoice
};
