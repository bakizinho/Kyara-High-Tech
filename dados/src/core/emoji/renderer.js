import {
  KYARA_EMOJIS,
  KYARA_EMOJI_ALIASES
} from "./catalog.js";

const ALIAS_REGEX = /:[a-z0-9_+-]+:/gi;

export function emoji(name) {
  if (!name) return "";

  const key = String(name)
    .trim()
    .replace(/^:/, "")
    .replace(/:$/, "");

  return KYARA_EMOJIS[key] ?? "";
}

export function replaceEmojiAliases(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  return text.replace(ALIAS_REGEX, (alias) => {
    return KYARA_EMOJI_ALIASES[alias.toLowerCase()] ?? alias;
  });
}

export function normalizeEmojiText(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  return replaceEmojiAliases(text);
}

export function tokenizeEmojiText(text) {
  if (!text || typeof text !== "string") {
    return [];
  }

  const normalized = normalizeEmojiText(text);
  const tokens = [];

  const emojiValues = new Set(
    Object.values(KYARA_EMOJIS)
  );

  const segmenter = new Intl.Segmenter(undefined, {
    granularity: "grapheme"
  });

  let buffer = "";

  for (const { segment } of segmenter.segment(normalized)) {
    if (emojiValues.has(segment)) {
      if (buffer) {
        tokens.push({
          type: "text",
          value: buffer
        });

        buffer = "";
      }

      tokens.push({
        type: "emoji",
        value: segment
      });
    } else {
      buffer += segment;
    }
  }

  if (buffer) {
    tokens.push({
      type: "text",
      value: buffer
    });
  }

  return tokens;
}

export default {
  emoji,
  replaceEmojiAliases,
  normalizeEmojiText,
  tokenizeEmojiText
};
