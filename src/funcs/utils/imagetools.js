import sharp from 'sharp';
import https from 'https';
import fs from 'fs';
import verificarAPI from '../API.js';

const CONFIG_FILE = JSON.parse(
  fs.readFileSync(new URL('../../config.json', import.meta.url), 'utf8')
);

const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

function getCached(key) {
  const item = cache.get(key);

  if (!item) return null;

  if (Date.now() - item.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return item.val;
}

function setCache(key, val) {
  if (cache.size >= 1000) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  cache.set(key, {
    val,
    ts: Date.now()
  });
}




async function removeBg(imageBuffer) {
  if (
    !Buffer.isBuffer(imageBuffer) ||
    imageBuffer.length < 10
  ) {
    return {
      ok: false,
      status: false,
      msg: '❌ Imagem inválida ou vazia.'
    };
  }

  try {

    console.log(
      '[RemoveBG LOCAL] 🧠 RMBG-1.4 iniciando...'
    );

    const ortModule =
      await import('onnxruntime-web');

    const sharpModule =
      await import('sharp');

    const fsModule =
      await import('fs/promises');

    const pathModule =
      await import('path');

    const {
      pathToFileURL
    } =
      await import('url');

    const ort =
      ortModule.default ||
      ortModule;

    const sharp =
      sharpModule.default ||
      sharpModule;

    const fsp =
      fsModule.default ||
      fsModule;

    const pathApi =
      pathModule.default ||
      pathModule;

    /*
     * ========================================================
     * ONNX WASM
     * ========================================================
     */

    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;

    const wasmDir =
      pathApi.resolve(
        process.cwd(),
        'node_modules',
        'onnxruntime-web',
        'dist'
      );

    ort.env.wasm.wasmPaths =
      pathToFileURL(
        wasmDir + pathApi.sep
      ).href;

    /*
     * ========================================================
     * MODELO
     * ========================================================
     */

    const modelPath =
      pathApi.resolve(
        process.cwd(),
        'dados',
        'models',
        'rmbg',
        'model_quantized.onnx'
      );

    const model =
      await fsp.readFile(modelPath);

    if (!removeBg._session) {

      console.log(
        '[RemoveBG LOCAL] ⏳ Carregando modelo...'
      );

      removeBg._session =
        await ort.InferenceSession.create(
          model,
          {
            executionProviders: [
              'wasm'
            ],
            graphOptimizationLevel:
              'all'
          }
        );

      console.log(
        '[RemoveBG LOCAL] ✅ Modelo carregado!'
      );
    }

    const session =
      removeBg._session;

    /*
     * ========================================================
     * IMAGEM ORIGINAL
     * ========================================================
     */

    const base =
      sharp(imageBuffer)
        .rotate();

    const original =
      await base
        .ensureAlpha()
        .raw()
        .toBuffer({
          resolveWithObject: true
        });

    const width =
      original.info.width;

    const height =
      original.info.height;

    if (!width || !height) {
      throw new Error(
        'Não foi possível identificar o tamanho da imagem.'
      );
    }

    /*
     * ========================================================
     * PREPARAR RMBG
     * ========================================================
     */

    const resized =
      await base
        .removeAlpha()
        .resize(
          1024,
          1024,
          {
            fit: 'fill',
            kernel:
              sharp.kernel.lanczos3
          }
        )
        .raw()
        .toBuffer();

    const area =
      1024 * 1024;

    const input =
      new Float32Array(
        area * 3
      );

    for (
      let i = 0;
      i < area;
      i++
    ) {

      input[i] =
        resized[i * 3] / 255 - 0.5;

      input[area + i] =
        resized[i * 3 + 1] / 255 - 0.5;

      input[(area * 2) + i] =
        resized[i * 3 + 2] / 255 - 0.5;
    }

    const tensor =
      new ort.Tensor(
        'float32',
        input,
        [1, 3, 1024, 1024]
      );

    const outputs =
      await session.run({
        [session.inputNames[0]]:
          tensor
      });

    const output =
      outputs[
        session.outputNames[0]
      ];

    if (
      !output ||
      !output.data
    ) {
      throw new Error(
        'O RMBG-1.4 não retornou uma máscara.'
      );
    }

    /*
     * ========================================================
     * NORMALIZAR MÁSCARA
     * ========================================================
     */

    let min = Infinity;
    let max = -Infinity;

    for (
      const value of output.data
    ) {

      const n =
        Number(value);

      if (n < min) min = n;
      if (n > max) max = n;
    }

    const range =
      max - min || 1;

    const mask =
      Buffer.alloc(area);

    for (
      let i = 0;
      i < area;
      i++
    ) {

      const value =
        Math.max(
          0,
          Math.min(
            1,
            (
              Number(
                output.data[i]
              ) - min
            ) / range
          )
        );

      mask[i] =
        Math.round(
          value * 255
        );
    }

    /*
     * ========================================================
     * VOLTAR PARA O TAMANHO ORIGINAL
     * ========================================================
     */

    const maskOriginal =
      await sharp(
        mask,
        {
          raw: {
            width: 1024,
            height: 1024,
            channels: 1
          }
        }
      )
        .resize(
          width,
          height,
          {
            fit: 'fill',
            kernel:
              sharp.kernel.lanczos3
          }
        )
        .raw()
        .toBuffer();

    /*
     * ========================================================
     * APLICAR ALPHA
     * ========================================================
     */

    const rgba =
      Buffer.from(
        original.data
      );

    for (
      let i = 0;
      i < width * height;
      i++
    ) {

      rgba[
        (i * 4) + 3
      ] =
        maskOriginal[i];
    }

    /*
     * ========================================================
     * REMOÇÃO DO QUADRICULADO
     *
     * O problema da imagem que você mostrou é que o
     * quadriculado já estava gravado dentro do JPG.
     *
     * Portanto o RMBG sozinho não consegue "desgravar"
     * esses pixels.
     *
     * Aqui removemos apenas pixels neutros claros
     * conectados às bordas.
     *
     * Isso evita remover pele, cabelo ou roupa no centro.
     * ========================================================
     */

    const visited =
      new Uint8Array(
        width * height
      );

    const queue =
      new Int32Array(
        width * height
      );

    let head = 0;
    let tail = 0;

    const isCheckerLike =
      p => {

        const r =
          rgba[p * 4];

        const g =
          rgba[p * 4 + 1];

        const b =
          rgba[p * 4 + 2];

        const a =
          rgba[p * 4 + 3];

        const mx =
          Math.max(
            r,
            g,
            b
          );

        const mn =
          Math.min(
            r,
            g,
            b
          );

        return (
          a > 8 &&
          mx - mn <= 14 &&
          mx >= 185
        );
      };

    const push =
      (x, y) => {

        if (
          x < 0 ||
          y < 0 ||
          x >= width ||
          y >= height
        ) {
          return;
        }

        const p =
          y * width + x;

        if (
          visited[p] ||
          !isCheckerLike(p)
        ) {
          return;
        }

        visited[p] = 1;

        queue[tail++] =
          p;
      };

    /*
     * Começar somente pelas bordas.
     */

    for (
      let x = 0;
      x < width;
      x++
    ) {

      push(x, 0);

      push(
        x,
        height - 1
      );
    }

    for (
      let y = 0;
      y < height;
      y++
    ) {

      push(0, y);

      push(
        width - 1,
        y
      );
    }

    let removed = 0;

    while (
      head < tail
    ) {

      const p =
        queue[head++];

      rgba[
        p * 4 + 3
      ] = 0;

      removed++;

      const x =
        p % width;

      const y =
        Math.floor(
          p / width
        );

      push(
        x + 1,
        y
      );

      push(
        x - 1,
        y
      );

      push(
        x,
        y + 1
      );

      push(
        x,
        y - 1
      );
    }

    console.log(
      '[RemoveBG LOCAL] 🧩 Flood-fill removeu',
      removed,
      'pixels.'
    );

    /*
     * ========================================================
     * PNG RGBA
     * ========================================================
     */

    const transparent =
      await sharp(
        rgba,
        {
          raw: {
            width,
            height,
            channels: 4
          }
        }
      )
        .png({
          compressionLevel: 9
        })
        .toBuffer();

    /*
     * ========================================================
     * VALIDAÇÃO ALPHA
     * ========================================================
     */

    const check =
      await sharp(
        transparent
      )
        .ensureAlpha()
        .raw()
        .toBuffer({
          resolveWithObject:
            true
        });

    let transparentPixels = 0;

    for (
      let i = 3;
      i < check.data.length;
      i += 4
    ) {

      if (
        check.data[i] <= 8
      ) {
        transparentPixels++;
      }
    }

    if (!transparentPixels) {
      throw new Error(
        'O PNG final não possui transparência real.'
      );
    }

    console.log(
      '[RemoveBG LOCAL] ✅ PNG RGBA validado:',
      transparent.length,
      'bytes |',
      transparentPixels,
      'transparentes'
    );

    return {
      ok: true,
      status: true,
      type: 'image',
      mime: 'image/png',
      buffer: transparent
    };

  } catch (error) {

    console.error(
      '[RemoveBG LOCAL] ❌',
      error?.stack ||
      error
    );

    return {
      ok: false,
      status: false,
      msg:
        error?.message ||
        'Erro no removedor local.'
    };
  }
}

async function upscale(input, scale = 2) {
  try {
    if (!input) {
      return {
        ok: false,
        msg: 'Imagem não informada.'
      };
    }

    scale = Number(scale) || 2;

    if (scale < 1) scale = 1;
    if (scale > 4) scale = 4;

    console.log(`[Upscale LOCAL] 🧠 Processando imagem em ${scale}x...`);

    let buffer;

    // Buffer recebido diretamente
    if (Buffer.isBuffer(input)) {
      buffer = input;
    }

    // Uint8Array / ArrayBuffer
    else if (input instanceof Uint8Array) {
      buffer = Buffer.from(input);
    }

    else if (input instanceof ArrayBuffer) {
      buffer = Buffer.from(input);
    }

    // Compatibilidade com caminho/URL
    else if (typeof input === 'string') {
      if (/^https?:\/\//i.test(input)) {
        const response = await fetch(input);

        if (!response.ok) {
          throw new Error(
            `Falha ao baixar imagem: HTTP ${response.status}`
          );
        }

        buffer = Buffer.from(await response.arrayBuffer());
      } else {
        buffer = await fs.promises.readFile(input);
      }
    }

    else {
      throw new Error('Formato de imagem não suportado.');
    }

    if (!buffer || buffer.length < 100) {
      throw new Error('Buffer da imagem inválido ou vazio.');
    }

    console.log(
      `[Upscale LOCAL] 📦 Entrada: ${buffer.length} bytes`
    );

    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Não foi possível identificar as dimensões da imagem.');
    }

    const newWidth = Math.round(metadata.width * scale);
    const newHeight = Math.round(metadata.height * scale);

    console.log(
      `[Upscale LOCAL] 📐 ${metadata.width}x${metadata.height} -> ${newWidth}x${newHeight}`
    );

    const resultBuffer = await sharp(buffer)
      .resize({
        width: newWidth,
        height: newHeight,
        fit: 'fill',
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false
      })
      .sharpen({
        sigma: 1,
        m1: 0.8,
        m2: 1.5
      })
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      .toBuffer();

    console.log(
      `[Upscale LOCAL] ✅ Concluído: ${resultBuffer.length} bytes`
    );

    return {
      ok: true,
      status: true,
      criador: 'Kyara',
      type: 'image',
      mime: 'image/png',
      scale,
      width: newWidth,
      height: newHeight,
      buffer: resultBuffer
    };

  } catch (error) {
    console.error('[Upscale LOCAL] ❌ Erro:', error);

    return {
      ok: false,
      status: false,
      msg: error?.message || 'Erro ao melhorar imagem.'
    };
  }
}

export default {
  removeBg,
  upscale
};

export {
  removeBg,
  upscale
};