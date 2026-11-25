import fs from 'node:fs';
import path from 'node:path';
import { InferenceClient } from '@huggingface/inference';
import { fileURLToPath } from 'node:url';

const MODEL =
  'black-forest-labs/FLUX.1-schnell';

const MODULE_DIR =
  path.dirname(
    fileURLToPath(import.meta.url)
  );

const TOKEN_FILES = [
  path.resolve(
    MODULE_DIR,
    '../../database/VOX-MD-hf-token.txt'
  ),
  path.resolve(
    MODULE_DIR,
    '../../database/kyara-hf-token.txt'
  ),
  path.resolve(
    process.cwd(),
    'dados',
    'database',
    'VOX-MD-hf-token.txt'
  ),
  path.resolve(
    process.cwd(),
    'dados',
    'database',
    'kyara-hf-token.txt'
  )
];

const MAX_PROMPT = 1200;

const RUNNING =
  new Map();

function readToken() {

  const envToken =
    String(
      process.env.HF_TOKEN ||
      process.env.HUGGINGFACE_TOKEN ||
      ''
    )
      .replace(/^\uFEFF/, '')
      .trim();

  if (
    envToken &&
    !envToken.includes('SEU_TOKEN') &&
    !envToken.includes('COLE_SEU') &&
    envToken.startsWith('hf_')
  ) {
    return envToken;
  }

  for (
    const tokenFile of TOKEN_FILES
  ) {

    try {

      const fileToken =
        fs.readFileSync(
          tokenFile,
          'utf8'
        )
          .replace(/^\uFEFF/, '')
          .trim();

      if (
        fileToken &&
        !fileToken.includes('SEU_TOKEN') &&
        !fileToken.includes('COLE_SEU') &&
        fileToken.startsWith('hf_')
      ) {
        return fileToken;
      }

    } catch {}

  }

  return '';
}

function normalizePrompt(value) {

  return String(
    value || ''
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(
      0,
      MAX_PROMPT
    );
}

function isImageBuffer(buffer) {

  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 16
  ) {
    return false;
  }

  const png =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;

  const jpeg =
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  const webp =
    buffer.toString(
      'ascii',
      0,
      4
    ) === 'RIFF' &&
    buffer.toString(
      'ascii',
      8,
      12
    ) === 'WEBP';

  return (
    png ||
    jpeg ||
    webp
  );
}

function friendlyError(error) {

  const text =
    String(
      error?.message ||
      error ||
      ''
    ).toLowerCase();

  if (
    text.includes('unauthorized') ||
    text.includes('invalid token') ||
    text.includes('401') ||
    text.includes('403')
  ) {
    return (
      '🔐 *KYARA IMAGE AI*\n\n' +
      'O token do Hugging Face não está válido ou não possui permissão para Inference Providers.'
    );
  }

  if (
    text.includes('credit') ||
    text.includes('402') ||
    text.includes('payment required')
  ) {
    return (
      '🪙 *KYARA IMAGE AI*\n\n' +
      'O crédito gratuito disponível acabou por enquanto.\n\n' +
      'O Kyara não compra créditos automaticamente.'
    );
  }

  if (
    text.includes('429') ||
    text.includes('rate limit') ||
    text.includes('too many requests')
  ) {
    return (
      '⏳ *KYARA IMAGE AI*\n\n' +
      'O serviço está limitando temporariamente as gerações. Tente novamente em alguns minutos.'
    );
  }

  if (
    text.includes('timeout') ||
    text.includes('timed out')
  ) {
    return (
      '⏱️ *KYARA IMAGE AI*\n\n' +
      'A geração demorou demais. Tente novamente.'
    );
  }

  if (
    text.includes(
      'image_provider_did_not_return_image'
    )
  ) {
    return (
      '❌ *KYARA IMAGE AI*\n\n' +
      'O provedor não devolveu uma imagem válida.'
    );
  }

  return (
    '❌ *KYARA IMAGE AI*\n\n' +
    'Não consegui gerar a imagem agora.'
  );
}

export async function
handleKyaraImageCommand(
  options = {}
) {

  const command =
    String(
      options.command || ''
    )
      .trim()
      .toLowerCase();

  const q =
    normalizePrompt(
      options.q
    );

  const aliases =
    new Set([
      'imagem',
      'image',
      'imgia',
      'iaimg'
    ]);

  if (
    !aliases.has(command)
  ) {
    return false;
  }

  const reply =
    options.reply;

  const kya =
    options.kya;

  const from =
    options.from;

  const info =
    options.info;

  const prefix =
    options.prefix || '#';

  if (!q) {

    await reply(
      '🖼️ *KYARA • IA DE IMAGEM*\n\n' +
      `Use: ${prefix}imagem <descrição>\n\n` +
      'Exemplo:\n' +
      `${prefix}imagem personagem anime masculino, cabelo preto, olhos violetas, roupa preta techwear, cidade neon roxa, arte cinematográfica`
    );

    return true;
  }

  const token =
    readToken();

  if (!token) {

    await reply(
      '🔐 *KYARA • IA DE IMAGEM*\n\n' +
      'O token do Hugging Face ainda não foi configurado.\n\n' +
      'Arquivo usado pelo Kyara:\n' +
      'dados/database/VOX-MD-hf-token.txt'
    );

    return true;
  }

  const runningKey =
    String(
      from || 'global'
    );

  if (
    RUNNING.has(
      runningKey
    )
  ) {

    await reply(
      '⏳ Já existe uma geração de imagem em andamento neste chat.'
    );

    return true;
  }

  RUNNING.set(
    runningKey,
    Date.now()
  );

  try {

    await reply(
      '🎨 *KYARA • IMAGE AI*\n\n' +
      '⏳ Gerando sua imagem...'
    );

    const client =
      new InferenceClient(
        token
      );

    const finalPrompt =
      [
        q,
        'high quality',
        'detailed composition',
        'cinematic lighting',
        'coherent anatomy',
        'polished digital artwork'
      ].join(', ');

    const imageBlob =
      await client.textToImage({
        model:
          MODEL,

        inputs:
          finalPrompt,

        parameters: {
          num_inference_steps: 4
        }
      });

    const buffer =
      Buffer.from(
        await imageBlob.arrayBuffer()
      );

    if (
      !isImageBuffer(
        buffer
      )
    ) {
      throw new Error(
        'IMAGE_PROVIDER_DID_NOT_RETURN_IMAGE'
      );
    }

    await kya.sendMessage(
      from,
      {
        image:
          buffer,

        mimetype:
          'image/png',

        fileName:
          'kyara-imagem.png',

        caption:
          '🖼️ *KYARA • IMAGE AI*\n\n' +
          `🤖 Modelo: ${MODEL}\n` +
          `📝 ${q}`
      },
      {
        quoted:
          info
      }
    );

    return true;

  } catch (error) {

    console.error(
      '[KYARA IMAGE AI]',
      error?.stack ||
      error?.message ||
      error
    );

    try {

      if (
        typeof globalThis
          .kyaraRegisterCommandFailure ===
        'function'
      ) {

        globalThis
          .kyaraRegisterCommandFailure(
            command,
            error,
            'image'
          );
      }

    } catch {}

    await reply(
      friendlyError(
        error
      )
    );

    return true;

  } finally {

    RUNNING.delete(
      runningKey
    );
  }
}
