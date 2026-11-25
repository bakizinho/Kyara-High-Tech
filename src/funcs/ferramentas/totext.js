import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';

const WHISPER_BIN =
  process.env.KYARA_WHISPER_BIN ||
  path.join(
    os.homedir(),
    'whisper.cpp',
    'build',
    'bin',
    'whisper-cli'
  );

const WHISPER_MODEL =
  process.env.KYARA_WHISPER_MODEL ||
  path.join(
    os.homedir(),
    'whisper.cpp',
    'models',
    'ggml-small.bin'
  );

const FFMPEG_BIN =
  process.env.KYARA_FFMPEG_BIN || 'ffmpeg';

const CACHE_TTL = 60 * 60 * 1000;

const cache = new Map();

function getCached(key) {
  const item = cache.get(key);

  if (!item) {
    return null;
  }

  if (Date.now() - item.time > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

function setCached(key, value) {
  cache.set(key, {
    time: Date.now(),
    value
  });
}

function executar(comando, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(comando, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => {
      stdout += data.toString();
    });

    proc.stderr.on('data', data => {
      stderr += data.toString();
    });

    proc.on('error', reject);

    proc.on('close', code => {
      if (code === 0) {
        resolve({
          stdout,
          stderr
        });
      } else {
        const erro = new Error(
          `Processo terminou com código ${code}`
        );

        erro.stdout = stdout;
        erro.stderr = stderr;

        reject(erro);
      }
    });
  });
}

async function converterParaWav(inputBuffer, wavPath) {
  const tempInput = `${wavPath}.input`;

  await fs.promises.writeFile(
    tempInput,
    inputBuffer
  );

  try {
    await executar(FFMPEG_BIN, [
      '-y',
      '-i',
      tempInput,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-sample_fmt',
      's16',
      wavPath
    ]);
  } finally {
    try {
      await fs.promises.unlink(tempInput);
    } catch {}
  }
}

async function executarWhisper(wavPath, outputDir) {
  const args = [
    '-m',
    WHISPER_MODEL,

    '-f',
    wavPath,

    '-l',
    'pt',

    '-otxt',

    '-of',
    path.join(outputDir, 'resultado'),

    '-nt',

    '-np'
  ];

  const resultado = await executar(
    WHISPER_BIN,
    args
  );

  const txtPath =
    path.join(outputDir, 'resultado.txt');

  let texto = '';

  try {
    texto = await fs.promises.readFile(
      txtPath,
      'utf8'
    );
  } catch {
    texto = resultado.stdout || '';
  }

  return texto
    .replace(/\r/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function verificarInstalacao() {
  try {
    await fs.promises.access(
      WHISPER_BIN,
      fs.constants.X_OK
    );

    await fs.promises.access(
      WHISPER_MODEL,
      fs.constants.R_OK
    );

    return true;
  } catch {
    return false;
  }
}

async function totext(audioBuffer) {
  if (!Buffer.isBuffer(audioBuffer)) {
    return {
      ok: false,
      msg: '❌ O áudio recebido não é um Buffer válido.'
    };
  }

  if (audioBuffer.length < 100) {
    return {
      ok: false,
      msg: '❌ O áudio está vazio ou inválido.'
    };
  }

  const instalado =
    await verificarInstalacao();

  if (!instalado) {
    return {
      ok: false,
      msg:
        '❌ Whisper local não está instalado corretamente.\n\n' +
        `Binário: ${WHISPER_BIN}\n` +
        `Modelo: ${WHISPER_MODEL}`
    };
  }

  const hash = crypto
    .createHash('sha1')
    .update(audioBuffer)
    .digest('hex');

  const cacheKey = `totext:${hash}`;

  const cached = getCached(cacheKey);

  if (cached) {
    return {
      ok: true,
      ...cached,
      cached: true
    };
  }

  const tempDir =
    await fs.promises.mkdtemp(
      path.join(
        os.tmpdir(),
        'kyara-totext-'
      )
    );

  const inputWav =
    path.join(tempDir, 'audio.wav');

  try {
    console.log(
      '[TOTEXT LOCAL] 🎙️ Áudio recebido:',
      audioBuffer.length,
      'bytes'
    );

    console.log(
      '[TOTEXT LOCAL] 🔄 Convertendo para WAV 16 kHz mono...'
    );

    await converterParaWav(
      audioBuffer,
      inputWav
    );

    console.log(
      '[TOTEXT LOCAL] 🧠 Iniciando Whisper local...'
    );

    const texto =
      await executarWhisper(
        inputWav,
        tempDir
      );

    if (!texto) {
      return {
        ok: false,
        msg:
          '❌ Não foi possível reconhecer nenhuma fala.'
      };
    }

    console.log(
      '[TOTEXT LOCAL] ✅ Transcrição concluída.'
    );

    const resultado = {
      texto,
      codigo: 200,
      message: 'Transcrição local concluída.'
    };

    setCached(
      cacheKey,
      resultado
    );

    return {
      ok: true,
      ...resultado
    };

  } catch (error) {
    console.error(
      '[TOTEXT LOCAL] ❌ Erro:',
      error
    );

    return {
      ok: false,
      msg:
        '❌ Erro na transcrição local: ' +
        (error?.message || error)
    };

  } finally {
    try {
      await fs.promises.rm(
        tempDir,
        {
          recursive: true,
          force: true
        }
      );
    } catch {}
  }
}

export {
  totext
};
