import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';

const execFileAsync = promisify(execFile);

const HOME =
  process.env.HOME ||
  os.homedir() ||
  '/data/data/com.termux/files/home';

const KITSUNE_DIR = path.join(
  HOME,
  'tts',
  'kitsune',
  'Kitsune-TTS'
);

const MODEL = path.join(
  HOME,
  'tts',
  'kitsune',
  'model',
  'latest_model_fp16.pth'
);

const VOZES = {
  kyara: {
    id: 'kyara',
    nome: 'Kyara',
    speaker: 'violet',
    descricao: 'feminina suave'
  },

  homem: {
    id: 'homem',
    nome: 'Homem',
    speaker: 'hiro',
    descricao: 'masculina'
  },

  sukuna: {
    id: 'sukuna',
    nome: 'Sukuna',
    speaker: 'hiro',
    pitch: 0.84,
    descricao: 'grave'
  },

  frieren: {
    id: 'frieren',
    nome: 'Frieren',
    speaker: 'frieren',
    descricao: 'feminina suave'
  },

  mulher: {
    id: 'mulher',
    nome: 'Mulher',
    speaker: 'emilia',
    descricao: 'feminina'
  },

  zerotwo: {
    id: 'zerotwo',
    nome: 'Zero Two',
    speaker: 'zero_two',
    descricao: 'feminina'
  }
};

const ALIASES = {
  feminina: 'mulher',
  fem: 'mulher',
  masc: 'homem',
  masculino: 'homem',
  masculina: 'homem',
  zero2: 'zerotwo',
  'zero-two': 'zerotwo',
  'zero_two': 'zerotwo'
};

function normalizarVoz(voz = 'kyara') {
  const key = String(voz || 'kyara')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  const id = ALIASES[key] || key;

  return VOZES[id] || VOZES.kyara;
}

function limparTexto(texto) {
  const mapa = {
    vcs: 'vocês',
    vc: 'você',
    tbm: 'também',
    pq: 'porque',
    q: 'que',
    mds: 'meu Deus',
    obg: 'obrigado',
    vlw: 'valeu'
  };

  let s = String(texto ?? '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.\S+/gi, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_~`>|]/g, ' ')
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  s = s.replace(
    /\b(vcs|vc|tbm|pq|q|mds|obg|vlw)\b/gi,
    x => mapa[x.toLowerCase()] || x
  );

  return s.slice(0, 1800).trim();
}

function ambiente() {
  return {
    ...process.env,
    PHONEMIZER_ESPEAK_LIBRARY:
      process.env.PHONEMIZER_ESPEAK_LIBRARY ||
      path.join(
        process.env.PREFIX ||
          '/data/data/com.termux/files/usr',
        'lib',
        'libespeak-ng.so'
      )
  };
}

function filtroVoz(perfil) {
  const pitch = Number(
    perfil.pitch || 1
  );

  if (
    !Number.isFinite(pitch) ||
    pitch === 1
  ) {
    return 'aresample=48000';
  }

  if (
    pitch <= 0.5 ||
    pitch >= 1.5
  ) {
    return 'aresample=48000';
  }

  return [
    'aresample=48000',
    `asetrate=48000*${pitch}`,
    'aresample=48000',
    `atempo=${1 / pitch}`
  ].join(',');
}

export async function gerarAudioSupremo(
  texto,
  voz = 'kyara'
) {
  const fala =
    limparTexto(texto);

  if (!fala) {
    throw new Error(
      'Texto vazio.'
    );
  }

  if (!fssync.existsSync(KITSUNE_DIR)) {
    throw new Error(
      `Kitsune-TTS não encontrado em: ${KITSUNE_DIR}`
    );
  }

  if (!fssync.existsSync(MODEL)) {
    throw new Error(
      `Modelo Kitsune não encontrado em: ${MODEL}`
    );
  }

  const perfil =
    normalizarVoz(voz);

  const id =
    crypto.randomBytes(8).toString('hex');

  const wav =
    path.join(
      os.tmpdir(),
      `kyara-tts-${id}.wav`
    );

  const env =
    ambiente();

  try {

    console.log(
      `[TTS SUPREMO] Gerando ${perfil.nome} → speaker=${perfil.speaker}`
    );

    await execFileAsync(
      'python',
      [
        'infer.py',
        '--model',
        MODEL,
        '--fast-cpu',
        '--speaker',
        perfil.speaker,
        '--text',
        fala,
        '--output',
        wav
      ],
      {
        cwd: KITSUNE_DIR,
        env,
        timeout: 180000,
        maxBuffer:
          4 * 1024 * 1024
      }
    );

    const result =
      await execFileAsync(
        'ffmpeg',
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          wav,
          '-af',
          filtroVoz(perfil),
          '-ac',
          '1',
          '-ar',
          '48000',
          '-c:a',
          'libopus',
          '-b:a',
          '48k',
          '-application',
          'voip',
          'pipe:1'
        ],
        {
          env,
          timeout: 120000,
          maxBuffer:
            32 * 1024 * 1024
        }
      );

    const buffer =
      Buffer.from(
        result.stdout
      );

    if (!buffer.length) {
      throw new Error(
        'FFmpeg não retornou áudio.'
      );
    }

    return {
      buffer,
      mimetype:
        'audio/ogg; codecs=opus',
      ptt: true,
      voice: perfil.id,
      voiceName: perfil.nome,
      speaker: perfil.speaker,
      text: fala
    };

  } catch (error) {

    console.error(
      '[TTS SUPREMO]',
      error?.stderr ||
      error?.message ||
      error
    );

    throw error;

  } finally {

    await fs
      .unlink(wav)
      .catch(() => {});
  }
}

export function listarVozesSupremo() {
  return Object.values(
    VOZES
  ).map(v => ({
    id: v.id,
    nome: v.nome,
    speaker: v.speaker,
    descricao: v.descricao
  }));
}

export async function statusTtsSupremo() {
  return {
    engine:
      'Kitsune-TTS',

    local:
      true,

    modelo:
      MODEL,

    modeloDisponivel:
      fssync.existsSync(MODEL),

    kitDisponivel:
      fssync.existsSync(KITSUNE_DIR),

    vozes:
      listarVozesSupremo()
  };
}

export default {
  gerarAudioSupremo,
  listarVozesSupremo,
  statusTtsSupremo
};
