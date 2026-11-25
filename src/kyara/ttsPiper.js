import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';

const execFileAsync = promisify(execFile);

const HOME =
  process.env.HOME ||
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

const SPEAKER = 'frieren';

const TEMP_DIR = path.join(
  process.env.PREFIX || '/data/data/com.termux/files/usr',
  'tmp'
);

export async function gerarVoz(texto) {
  texto = String(texto || '').trim();

  if (!texto) {
    throw new Error('Texto vazio para TTS.');
  }

  await fs.mkdir(TEMP_DIR, { recursive: true });

  const id = randomUUID();

  const wav = path.join(
    TEMP_DIR,
    `kyara-kitsune-${id}.wav`
  );

  const ogg = path.join(
    TEMP_DIR,
    `kyara-kitsune-${id}.ogg`
  );

  const env = {
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

  try {
    await execFileAsync(
      'python',
      [
        'infer.py',
        '--model', MODEL,
        '--fast-cpu',
        '--speaker', SPEAKER,
        '--text', texto,
        '--output', wav
      ],
      {
        cwd: KITSUNE_DIR,
        env,
        timeout: 180000,
        maxBuffer: 2 * 1024 * 1024
      }
    );

    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-i', wav,
        '-c:a', 'libopus',
        '-b:a', '48k',
        '-vbr', 'on',
        '-compression_level', '10',
        ogg
      ],
      {
        env,
        timeout: 120000,
        maxBuffer: 2 * 1024 * 1024
      }
    );

    await fs.unlink(wav).catch(() => {});

    return ogg;

  } catch (error) {
    await fs.unlink(wav).catch(() => {});
    await fs.unlink(ogg).catch(() => {});

    console.error(
      '[KYARA TTS KITSUNE]',
      error?.stderr ||
      error?.message ||
      error
    );

    throw error;
  }
}

export async function apagarVoz(arquivo) {
  if (!arquivo) return;

  try {
    await fs.unlink(arquivo);
  } catch {}
}
