import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '../../../..');

const KEY_FILE = path.join(
  ROOT,
  'dados/database/tts/gradium.key'
);

const CONFIG_FILE = path.join(
  ROOT,
  'dados/database/tts/piper.conf'
);

const GRADIUM_URL =
  'https://api.gradium.ai/api/post/speech/tts';

const PIPER_DEFAULT_MODEL =
  path.join(
    process.env.HOME || os.homedir(),
    '.local/share/kyara-piper/pt_BR-cadu-medium.onnx'
  );

const VOZES = {
  kyara: {
    id: 'kyara',
    nome: 'Kyara',
    genero: 'feminina',
    gradiumVoiceId: 'pYcGZz9VOo4n2ynh',
    piperModel: PIPER_DEFAULT_MODEL,
    rate: 0.94,
    pitch: 1.08
  },

  feminina: {
    id: 'feminina',
    nome: 'Feminina',
    genero: 'feminina',
    gradiumVoiceId: '24cfpJbYGXZLE39T',
    piperModel: PIPER_DEFAULT_MODEL,
    rate: 0.96,
    pitch: 1.10
  },

  isadora: {
    id: 'isadora',
    nome: 'Isadora',
    genero: 'feminina',
    gradiumVoiceId: 'CtNvKUUMrx1h56ih',
    piperModel: PIPER_DEFAULT_MODEL,
    rate: 0.94,
    pitch: 1.12
  },

  beatriz: {
    id: 'beatriz',
    nome: 'Beatriz',
    genero: 'feminina',
    gradiumVoiceId: 'E8Zwjozrxupd4iQD',
    piperModel: PIPER_DEFAULT_MODEL,
    rate: 0.97,
    pitch: 1.10
  },

  sukuna: {
    id: 'sukuna',
    nome: 'Sukuna',
    genero: 'masculina',
    gradiumVoiceId: '9c8MGnH1yQ4eN73X',
    piperModel: PIPER_DEFAULT_MODEL,
    rate: 0.88,
    pitch: 0.82
  },

  gojo: {
    id: 'gojo',
    nome: 'Gojo',
    genero: 'masculina',
    gradiumVoiceId: '9c8MGnH1yQ4eN73X',
    piperModel: PIPER_DEFAULT_MODEL,
    rate: 0.96,
    pitch: 1.02
  },

  vegeta: {
    id: 'vegeta',
    nome: 'Vegeta',
    genero: 'masculina',
    gradiumVoiceId: '9c8MGnH1yQ4eN73X',
    piperModel: PIPER_DEFAULT_MODEL,
    rate: 1.02,
    pitch: 0.78
  },

  naruto: {
    id: 'naruto',
    nome: 'Naruto',
    genero: 'masculina',
    gradiumVoiceId: '9c8MGnH1yQ4eN73X',
    piperModel: PIPER_DEFAULT_MODEL,
    rate: 1.04,
    pitch: 1.08
  },

  masculina: {
    id: 'masculina',
    nome: 'Masculina',
    genero: 'masculina',
    gradiumVoiceId: '9c8MGnH1yQ4eN73X',
    piperModel: PIPER_DEFAULT_MODEL,
    rate: 0.94,
    pitch: 0.96
  }
};

const ALIASES = {
  kika: 'kyara',
  mulher: 'feminina',
  fem: 'feminina',
  alice: 'kyara',
  ana: 'feminina',
  bia: 'beatriz',
  satoru: 'gojo',
  homem: 'masculina',
  masc: 'masculina'
};

function normalizarVoz(voz = 'kyara') {
  const key = String(voz || 'kyara')
    .trim()
    .toLowerCase();

  const id = ALIASES[key] || key;

  return VOZES[id] || VOZES.kyara;
}

function limparTexto(texto) {
  let s = String(texto ?? '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.\S+/gi, '')
    .replace(/@\d{5,}/g, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_~`>|]/g, ' ')
    .replace(
      /[😀-🙏🌀-🫿🚀-🫶❤️-🩷🩵🩶💔💯🔥⭐✨🎵🎶🎙️🤖]/gu,
      ' '
    );

  const mapa = {
    vcs: 'vocês',
    vc: 'você',
    cmg: 'comigo',
    ctg: 'contigo',
    tbm: 'também',
    tb: 'também',
    pq: 'porque',
    porq: 'porque',
    q: 'que',
    ms: 'mas',
    nmrl: 'na moral',
    slk: 'cê é louco',
    tmj: 'tamo junto',
    blz: 'beleza',
    obgda: 'obrigada',
    obg: 'obrigado',
    vlw: 'valeu',
    flw: 'falou',
    mds: 'meu Deus'
  };

  s = s.replace(
    /\b(vcs|vc|cmg|ctg|tbm|tb|pq|porq|q|ms|nmrl|slk|tmj|blz|obgda|obg|vlw|flw|mds)\b/gi,
    x => mapa[x.toLowerCase()] || x
  );

  s = s
    .replace(/\b(ha){3,}\b/gi, 'haha')
    .replace(/\b(kk){3,}\b/gi, 'kk')
    .replace(/\s+/g, ' ')
    .trim();

  return s.slice(0, 3500) || 'Olá. Eu sou a Kyara.';
}

function getKey() {
  if (process.env.GRADIUM_API_KEY?.trim()) {
    return process.env.GRADIUM_API_KEY.trim();
  }

  try {
    if (fs.existsSync(KEY_FILE)) {
      const key = fs.readFileSync(KEY_FILE, 'utf8').trim();

      if (key) {
        return key;
      }
    }
  } catch {}

  return '';
}

function getPiperModel() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = fs.readFileSync(
        CONFIG_FILE,
        'utf8'
      );

      const match = config.match(
        /^PIPER_MODEL=(.+)$/m
      );

      if (match?.[1]) {
        return match[1].trim();
      }
    }
  } catch {}

  return PIPER_DEFAULT_MODEL;
}

async function commandExists(command) {
  try {
    await execFileAsync(
      command,
      ['--help'],
      {
        timeout: 8000
      }
    );

    return true;
  } catch {
    return false;
  }
}

async function gradium(texto, perfil) {
  const key = getKey();

  if (!key) {
    throw new Error(
      'GRADIUM_API_KEY ausente'
    );
  }

  const response = await fetch(
    GRADIUM_URL,
    {
      method: 'POST',

      headers: {
        'x-api-key': key,
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        model_name: 'default',
        text: texto,
        voice_id: perfil.gradiumVoiceId,
        output_format: 'opus',
        only_audio: true
      }),

      signal: AbortSignal.timeout(18000)
    }
  );

  if (!response.ok) {
    const detalhe = (
      await response.text()
    )
      .replace(/\s+/g, ' ')
      .slice(0, 400);

    throw new Error(
      `Gradium HTTP ${response.status}${detalhe ? ` — ${detalhe}` : ''}`
    );
  }

  const buffer = Buffer.from(
    await response.arrayBuffer()
  );

  if (!buffer.length) {
    throw new Error(
      'Gradium retornou áudio vazio.'
    );
  }

  return buffer;
}

async function piper(texto, perfil) {
  const model = perfil.piperModel ||
    getPiperModel();

  if (!fs.existsSync(model)) {
    throw new Error(
      `Modelo Piper não encontrado: ${model}`
    );
  }

  const piperCommand =
    process.env.KYARA_PIPER_BIN ||
    'piper';

  const temp = crypto
    .randomBytes(8)
    .toString('hex');

  const wav = path.join(
    os.tmpdir(),
    `kyara-piper-${temp}.wav`
  );

  try {
    const args = [
      '--model',
      model,
      '--output_file',
      wav,
      '--length_scale',
      String(
        Math.max(
          0.75,
          Math.min(
            1.25,
            1 / perfil.rate
          )
        )
      ),
      '--noise_scale',
      '0.667',
      '--noise_w',
      '0.8'
    ];

    await new Promise(
      (resolve, reject) => {
        const child = requireChild(
          piperCommand,
          args,
          texto
        );

        child.on(
          'error',
          reject
        );

        child.on(
          'close',
          code => {
            if (code === 0) {
              resolve();
            } else {
              reject(
                new Error(
                  `Piper terminou com código ${code}`
                )
              );
            }
          }
        );
      }
    );

    if (!fs.existsSync(wav)) {
      throw new Error(
        'Piper não produziu WAV.'
      );
    }

    const output = await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        wav,
        '-af',
        `asetrate=22050*${perfil.pitch},aresample=48000,atempo=${Math.max(0.5, Math.min(2, 1 / perfil.pitch))}`,
        '-ac',
        '1',
        '-ar',
        '48000',
        '-c:a',
        'libopus',
        '-b:a',
        '40k',
        '-vbr',
        'on',
        '-application',
        'voip',
        'pipe:1'
      ],
      {
        timeout: 120000,
        maxBuffer: 64 * 1024 * 1024
      }
    );

    return Buffer.from(
      output.stdout
    );
  } finally {
    try {
      fs.rmSync(
        wav,
        {
          force: true
        }
      );
    } catch {}
  }
}

function requireChild(command, args, texto) {

  const child = spawn(
    command,
    args,
    {
      stdio: [
        'pipe',
        'ignore',
        'pipe'
      ]
    }
  );

  child.stdin.write(texto);
  child.stdin.end();

  return child;
}

async function localEspeak(texto, perfil) {
  const id = crypto
    .randomBytes(8)
    .toString('hex');

  const wav = path.join(
    os.tmpdir(),
    `kyara-espeak-${id}.wav`
  );

  try {
    await execFileAsync(
      'espeak',
      [
        '-v',
        'pt-br',
        '-p',
        String(
          perfil.genero === 'feminina'
            ? 65
            : 42
        ),
        '-s',
        String(
          perfil.genero === 'feminina'
            ? 170
            : 165
        ),
        '-w',
        wav,
        texto
      ],
      {
        timeout: 90000
      }
    );

    const result = await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        wav,
        '-ac',
        '1',
        '-ar',
        '48000',
        '-c:a',
        'libopus',
        '-b:a',
        '40k',
        '-application',
        'voip',
        'pipe:1'
      ],
      {
        timeout: 90000,
        maxBuffer: 64 * 1024 * 1024
      }
    );

    return Buffer.from(
      result.stdout
    );
  } finally {
    try {
      fs.rmSync(
        wav,
        {
          force: true
        }
      );
    } catch {}
  }
}

async function waveform(audio) {
  try {
    const pcm = await new Promise(
      (resolve, reject) => {
        const child = requireChild(
          'ffmpeg',
          [
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            'pipe:0',
            '-vn',
            '-f',
            's16le',
            '-ac',
            '1',
            '-ar',
            '16000',
            'pipe:1'
          ],
          audio
        );

        const chunks = [];

        child.stdout?.on(
          'data',
          x => chunks.push(x)
        );

        child.on(
          'error',
          reject
        );

        child.on(
          'close',
          code => {
            if (code === 0) {
              resolve(Buffer.concat(chunks));
            } else {
              reject(
                new Error(`waveform ffmpeg ${code}`)
              );
            }
          }
        );
      }
    );

    const total = Math.floor(pcm.length / 2);

    if (total < 32) {
      return {
        seconds: 1,
        waveform: new Array(64).fill(6)
      };
    }

    const seconds = Math.max(
      1,
      Math.round(total / 16000)
    );

    /*
     * WhatsApp trabalha muito melhor com uma
     * envelope de energia do áudio do que com
     * um simples pico máximo.
     *
     * Primeiro calculamos 128 pontos:
     * - RMS = energia média da fala
     * - peak = pico instantâneo
     *
     * Depois reduzimos para 64 barras.
     */

    const raw = [];

    for (let i = 0; i < 128; i++) {
      const a = Math.floor(i * total / 128);
      const b = Math.max(
        a + 1,
        Math.floor((i + 1) * total / 128)
      );

      let sum = 0;
      let peak = 0;
      let count = 0;

      for (let p = a; p < b; p++) {
        const off = p * 2;

        if (off + 1 >= pcm.length) break;

        const sample = pcm.readInt16LE(off);
        const abs = Math.abs(sample);

        sum += sample * sample;

        if (abs > peak) {
          peak = abs;
        }

        count++;
      }

      const rms = count
        ? Math.sqrt(sum / count)
        : 0;

      /*
       * Mistura RMS com pico.
       * RMS dá corpo à voz.
       * Pico preserva ataques e sílabas fortes.
       */
      const energy =
        (rms * 0.78) +
        (peak * 0.22);

      raw.push(energy);
    }

    /*
     * Normalização dinâmica.
     *
     * Não usamos simplesmente o maior pico,
     * porque uma única sílaba muito forte faria
     * todo o restante parecer pequeno.
     */
    const sorted = [...raw].sort((a, b) => a - b);

    const p95 =
      sorted[
        Math.min(
          sorted.length - 1,
          Math.floor(sorted.length * 0.95)
        )
      ] || 1;

    const floor =
      p95 * 0.035;

    const normalized = raw.map(value => {
      if (value <= floor) return 0;

      const x =
        (value - floor) /
        Math.max(1, p95 - floor);

      /*
       * Curva perceptual.
       * Faz diferenças de volume aparecerem
       * visualmente sem deixar a waveform exagerada.
       */
      return Math.pow(
        Math.max(0, Math.min(1, x)),
        0.72
      );
    });

    /*
     * Redução 128 -> 64.
     *
     * Cada barra representa dois pequenos
     * intervalos do áudio.
     */
    const values = [];

    for (let i = 0; i < 64; i++) {
      const a = normalized[i * 2] || 0;
      const b = normalized[i * 2 + 1] || 0;

      /*
       * Mantém ataques fortes sem perder
       * a energia média da fala.
       */
      const value =
        (a * 0.42) +
        (b * 0.42) +
        (Math.max(a, b) * 0.16);

      values.push(value);
    }

    /*
     * Suavização mínima.
     * Evita barras com saltos artificiais,
     * mas preserva as mudanças naturais da voz.
     */
    const smooth = values.map((value, i) => {
      const prev = values[i - 1] ?? value;
      const next = values[i + 1] ?? value;

      return (
        value * 0.62 +
        prev * 0.19 +
        next * 0.19
      );
    });

    /*
     * Converte para o intervalo usado pelo
     * waveform PTT.
     *
     * Silêncio = pequeno
     * fala fraca = baixa
     * fala normal = média
     * fala forte = alta
     */
    const waveformValues = smooth.map(value => {
      const n = Math.round(
        4 + (value * 96)
      );

      return Math.max(
        3,
        Math.min(100, n)
      );
    });

    return {
      seconds,
      waveform: waveformValues
    };

  } catch (error) {
    console.log(
      `[KYARA-VOICE] waveform: ${error?.message || error}`
    );

    return {
      seconds: 1,
      waveform: new Array(64).fill(6)
    };
  }
}
export async function gerarAudioKyara(
  texto,
  voz = 'kyara'
) {
  const perfil =
    normalizarVoz(voz);

  const fala =
    limparTexto(texto);

  let buffer;
  let provider;

  /*
   * 1 — Gradium
   * Continua sendo a voz principal.
   */
  if (getKey()) {
    try {
      console.log(
        `[KYARA-VOICE] Gradium → ${perfil.nome}`
      );

      buffer =
        await gradium(
          fala,
          perfil
        );

      provider =
        'gradium-neural';

      console.log(
        '[KYARA-VOICE] ✅ Gradium.'
      );
    } catch (error) {
      console.log(
        `[KYARA-VOICE] Gradium indisponível: ${error?.message || error}`
      );
    }
  }

  /*
   * 2 — Piper local
   */
  if (!buffer) {
    try {
      console.log(
        `[KYARA-VOICE] Piper local → ${perfil.nome}`
      );

      buffer =
        await piper(
          fala,
          perfil
        );

      provider =
        'piper-local-neural';

      console.log(
        '[KYARA-VOICE] ✅ Piper local.'
      );
    } catch (error) {
      console.log(
        `[KYARA-VOICE] Piper indisponível: ${error?.message || error}`
      );
    }
  }

  /*
   * 3 — Último fallback.
   */
  if (!buffer) {
    console.log(
      '[KYARA-VOICE] ⚠️ Último fallback: eSpeak.'
    );

    buffer =
      await localEspeak(
        fala,
        perfil
      );

    provider =
      'espeak-local-fallback';
  }

  const meta =
    await waveform(buffer);

  return {
    buffer,

    mimetype:
      'audio/ogg; codecs=opus',

    ptt: true,

    seconds:
      meta.seconds,

    waveform:
      meta.waveform,

    voice:
      perfil.id,

    provider,

    text:
      fala
  };
}

export function listarVozesKyara() {
  return Object.values(
    VOZES
  ).map(v => ({
    id: v.id,
    nome: v.nome,
    label: v.nome,
    genero: v.genero,
    provider: 'gradium + piper'
  }));
}

export async function statusKyaraVoice() {
  const [
    piperOK,
    ffmpegOK,
    espeakOK
  ] = await Promise.all([
    commandExists('piper'),
    commandExists('ffmpeg'),
    commandExists('espeak')
  ]);

  const model =
    getPiperModel();

  return {
    configurada:
      Boolean(getKey()) ||
      (
        piperOK &&
        fs.existsSync(model)
      ),

    modelo:
      'Gradium → Piper neural → eSpeak',

    gradium: {
      configurada:
        Boolean(getKey()),
      prioridade:
        'principal'
    },

    piper: {
      instalado:
        piperOK,
      modelo:
        fs.existsSync(model),
      caminho:
        model,
      prioridade:
        'fallback neural'
    },

    local: {
      ffmpeg:
        ffmpegOK,
      espeak:
        espeakOK
    },

    vozes:
      listarVozesKyara()
  };
}

export default {
  gerarAudioKyara,
  listarVozesKyara,
  statusKyaraVoice
};
