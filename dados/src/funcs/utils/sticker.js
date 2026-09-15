import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import webp from 'node-webpmux';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório temporário
function ensureTmpDir() {
  const tmpDir = path.join(path.dirname(__filename), "../../../database/tmp");
  if (!fsSync.existsSync(tmpDir)) {
    fsSync.mkdirSync(tmpDir, { recursive: true });
  }
  return tmpDir;
}
function generateTempFileName(ext) {
  const dir = ensureTmpDir();
  return path.join(dir, `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`);
}

// Download para buffer
async function getBuffer(url) {
  const { data } = await axios.get(url, { responseType: "arraybuffer" });
  if (!data || data.length === 0) throw new Error("Download vazio");
  return Buffer.from(data);
}

// Detecção mínima só para imagens
function detectImageExtension(buf) {
  if (buf.length >= 12) {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "png";
    if (buf[0] === 0xFF && buf[1] === 0xD8) return "jpg";
    if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "webp";
  }
  return "jpg";
}

// Converter para WebP (sempre .mp4 para vídeo)
async function convertToWebp(mediaBuffer, isVideo = false, forceSquare = false) {

  if (
    !Buffer.isBuffer(mediaBuffer) ||
    mediaBuffer.length < 10
  ) {
    throw new Error(
      'Buffer de mídia inválido.'
    );
  }

  const MAX_SIZE =
    990000;

  /*
   * ========================================================
   * IMAGEM
   * ========================================================
   */

  if (!isVideo) {

    let quality = 95;
    let outBuffer = null;

    for (
      let attempt = 1;
      attempt <= 7;
      attempt++
    ) {

      outBuffer =
        await sharp(
          mediaBuffer
        )
          .rotate()
          .ensureAlpha()
          .resize({
            width: 512,
            height: 512,
            fit: 'contain',
            background: {
              r: 0,
              g: 0,
              b: 0,
              alpha: 0
            },
            kernel:
              sharp.kernel.lanczos3
          })
          .webp({
            quality,
            alphaQuality: 100,
            effort: 6
          })
          .toBuffer();

      if (
        outBuffer.length <=
          MAX_SIZE ||
        quality <= 45
      ) {
        break;
      }

      quality =
        Math.max(
          45,
          quality - 10
        );
    }

    const check =
      await sharp(
        outBuffer
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

    console.log(
      '[STICKER] 🔎 Alpha:',
      transparentPixels,
      'pixels transparentes'
    );

    return outBuffer;
  }

  /*
   * ========================================================
   * VÍDEO
   * ========================================================
   */

  const tmpIn =
    generateTempFileName(
      'mp4'
    );

  await fs.writeFile(
    tmpIn,
    mediaBuffer
  );

  try {

    let quality = 45;
    let outBuffer = null;

    for (
      let attempt = 1;
      attempt <= 8;
      attempt++
    ) {

      const tmpOut =
        generateTempFileName(
          'webp'
        );

      await new Promise(
        (resolve, reject) => {

          ffmpeg(tmpIn)
            .outputOptions([
              '-vf',
              'scale=320:320:force_original_aspect_ratio=decrease,' +
              'pad=320:320:(ow-iw)/2:(oh-ih)/2:' +
              'color=0x00000000,format=rgba,fps=15',

              '-c:v',
              'libwebp',

              '-lossless',
              '0',

              '-compression_level',
              '6',

              '-q:v',
              String(quality),

              '-loop',
              '0',

              '-an',

              '-vsync',
              '0',

              '-t',
              '9.9'
            ])
            .format('webp')
            .on(
              'error',
              reject
            )
            .on(
              'end',
              resolve
            )
            .save(tmpOut);
        }
      );

      outBuffer =
        await fs.readFile(
          tmpOut
        );

      await fs
        .unlink(tmpOut)
        .catch(() => {});

      if (
        outBuffer.length <=
          MAX_SIZE ||
        quality <= 15
      ) {
        break;
      }

      quality =
        Math.max(
          15,
          quality - 7
        );
    }

    return outBuffer;

  } finally {

    await fs
      .unlink(tmpIn)
      .catch(() => {});
  }
}

// Escrever EXIF
async function writeExif(webpBuffer, metadata) {
  try {
    const img = new webp.Image();
    await img.load(webpBuffer);
    const json = {
      "sticker-pack-id": "https://github.com/bakizinho/BKkyara-",
      "sticker-pack-name": metadata.packname || "",
      "sticker-pack-publisher": metadata.author || "",
      "emojis":["KyaraBot"]
    };
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2A, 0x00,
      0x08, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x16, 0x00,
      0x00, 0x00
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    img.exif = exif;
    return await img.save(null);
  } catch (e) {
    return webpBuffer;
  }
}

// Resolver input
async function resolveInputToBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (typeof input === "string") {
    if (/^data:.*?;base64,/i.test(input)) {
      return Buffer.from(input.split(",")[1], "base64");
    }
    if (/^https?:\/\//i.test(input)) {
      return await getBuffer(input);
    }
    return await fs.readFile(input);
  }
  if (input && typeof input === "object" && input.url) {
    return await getBuffer(input.url);
  }
  throw new Error("Entrada de sticker inválida");
}

/**
 * Envia sticker
 */
const sendSticker = async (nazu, jid, {
  sticker: input,
  type = "image",
  packname = "",
  author = "",
  forceSquare = false
}, { quoted } = {}) => {
  if (!["image", "video"].includes(type)) {
    throw new Error('Tipo deve ser "image" ou "video"');
  }
  const buffer = await resolveInputToBuffer(input);
  if (!buffer || buffer.length < 10) {
    throw new Error("Buffer inválido/vazio");
  }

  let webpBuffer = await convertToWebp(buffer, type === "video", forceSquare);

  if (packname || author) {
    webpBuffer = await writeExif(webpBuffer, { packname, author });
  }

  await nazu.sendMessage(jid, { sticker: webpBuffer }, { quoted });
  return webpBuffer;
};

export { sendSticker };
