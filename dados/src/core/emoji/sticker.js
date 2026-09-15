import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(
  __dirname,
  "cache"
);

const TWEMOJI_BASE =
  "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg";

const SUPPORTED_EMOJIS = new Set([
  "🫂",
  "❤️",
  "😂",
  "🥺",
  "🥹",
  "🫶",
  "🔥",
  "✨",
  "⚠️",
  "✅",
  "❌",
  "👀",
  "🙏",
  "🤖",
  "🍓"
]);

function emojiCodePoints(emoji) {
  return [...emoji]
    .map(char =>
      char
        .codePointAt(0)
        .toString(16)
        .toLowerCase()
    )
    .join("-");
}

function cachePath(emoji) {
  return path.join(
    CACHE_DIR,
    `${emojiCodePoints(emoji)}.webp`
  );
}

async function downloadTwemoji(emoji) {
  const code = emojiCodePoints(emoji);

  const url =
    `${TWEMOJI_BASE}/${code}.svg`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Twemoji não encontrou ${emoji} (${code}) — HTTP ${response.status}`
    );
  }

  return Buffer.from(
    await response.arrayBuffer()
  );
}

async function buildSticker(emoji) {
  await fs.mkdir(
    CACHE_DIR,
    { recursive: true }
  );

  const output = cachePath(emoji);

  try {
    return await fs.readFile(output);
  } catch {
    // ainda não existe no cache
  }

  const svg = await downloadTwemoji(emoji);

  const webp = await sharp(svg)
    .resize(512, 512, {
      fit: "contain",
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0
      }
    })
    .webp({
      quality: 100
    })
    .toBuffer();

  await fs.writeFile(
    output,
    webp
  );

  return webp;
}

export function isSupportedEmoji(emoji) {
  return SUPPORTED_EMOJIS.has(
    String(emoji ?? "").trim()
  );
}

export async function getEmojiSticker(emoji) {
  const value =
    String(emoji ?? "").trim();

  if (!isSupportedEmoji(value)) {
    throw new Error(
      `Emoji não suportado: ${value || "(vazio)"}`
    );
  }

  return buildSticker(value);
}

export async function sendEmojiSticker(
  sock,
  jid,
  emoji,
  options = {}
) {
  if (!sock) {
    throw new Error(
      "sendEmojiSticker: sock não informado"
    );
  }

  if (!jid) {
    throw new Error(
      "sendEmojiSticker: jid não informado"
    );
  }

  const sticker =
    await getEmojiSticker(emoji);

  return sock.sendMessage(
    jid,
    {
      sticker
    },
    options
  );
}

export default {
  isSupportedEmoji,
  getEmojiSticker,
  sendEmojiSticker
};
