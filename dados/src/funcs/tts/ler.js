import { WebSocket } from 'ws';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

const GRADIUM_URL = process.env.GRADIUM_TTS_URL || 'wss://api.gradium.ai/api/speech/tts';
const VOICE_ID = process.env.GRADIUM_VOICE_ID || 'KgC2Nqnjj48NUiyV';

function obterApiKey() {
  return (
    process.env.GRADIUM_API_KEY ||
    process.env.GRADIUM_KEY ||
    ''
  ).trim();
}

export async function gerarAudioLer(texto) {
  if (!texto?.trim()) {
    throw new Error('Texto vazio.');
  }

  const apiKey = obterApiKey();

  if (!apiKey) {
    throw new Error('GRADIUM_API_KEY não configurada.');
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dir = path.join(os.tmpdir(), 'kyara-tts');

  await fs.mkdir(dir, { recursive: true });

  const wav = path.join(dir, `${id}.wav`);
  const ogg = path.join(dir, `${id}.ogg`);

  try {
    const audioChunks = [];

    await new Promise((resolve, reject) => {
      let finalizado = false;

      const ws = new WebSocket(GRADIUM_URL, {
        headers: {
          'x-api-key': apiKey
        }
      });

      const timeout = setTimeout(() => {
        terminar(new Error('Tempo limite do Gradium excedido.'));
      }, 60000);

      function terminar(erro) {
        if (finalizado) return;

        finalizado = true;
        clearTimeout(timeout);

        try {
          ws.close();
        } catch {}

        if (erro) {
          reject(erro);
        } else {
          resolve();
        }
      }

      ws.on('open', () => {
        console.log('[GRADIUM] WebSocket conectado.');

        ws.send(JSON.stringify({
          type: 'setup',
          voice_id: VOICE_ID,
          output_format: 'wav'
        }));
      });

      ws.on('message', data => {
        try {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'ready') {
            ws.send(JSON.stringify({
              type: 'text',
              text: texto.trim()
            }));

            ws.send(JSON.stringify({
              type: 'end_of_stream'
            }));

            return;
          }

          if (msg.type === 'audio' && msg.audio) {
            audioChunks.push(
              Buffer.from(msg.audio, 'base64')
            );
            return;
          }

          if (msg.type === 'error') {
            terminar(
              new Error(
                msg.message ||
                msg.error ||
                'Erro retornado pelo Gradium.'
              )
            );
            return;
          }

          if (msg.type === 'end_of_stream') {
            if (!audioChunks.length) {
              terminar(
                new Error('Gradium não retornou áudio.')
              );
              return;
            }

            fs.writeFile(
              wav,
              Buffer.concat(audioChunks)
            )
              .then(() => terminar())
              .catch(terminar);
          }

        } catch (err) {
          terminar(err);
        }
      });

      ws.on('error', err => {
        terminar(
          new Error(
            `Gradium WebSocket: ${err.code || ''} ${err.message}`
          )
        );
      });

      ws.on('close', () => {
        if (!finalizado && audioChunks.length) {
          fs.writeFile(
            wav,
            Buffer.concat(audioChunks)
          )
            .then(() => terminar())
            .catch(terminar);
        }
      });
    });

    await fs.access(wav);

    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-i', wav,
        '-c:a', 'libopus',
        '-b:a', '48k',
        '-vbr', 'on',
        '-application', 'voip',
        ogg
      ],
      { timeout: 60000 }
    );

    await fs.access(ogg);

    return {
      buffer: await fs.readFile(ogg),
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true
    };

  } finally {
    await fs.rm(wav, { force: true }).catch(() => {});
    await fs.rm(ogg, { force: true }).catch(() => {});
  }
}

export default gerarAudioLer;
