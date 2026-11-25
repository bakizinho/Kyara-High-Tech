/**
 * KYARA EMOJI
 *
 * Catálogo centralizado dos emojis utilizados pela Kyara.
 *
 * IMPORTANTE:
 * Este catálogo NÃO altera o desenho do emoji no WhatsApp.
 * Ele serve para a camada de renderização/interface da Kyara.
 */

export const KYARA_EMOJIS = Object.freeze({
  hug: "🫂",
  heart: "❤️",
  laugh: "😂",
  cry: "😭",
  holdingBackTears: "🥹",
  heartHands: "🫶",
  smile: "😊",
  blush: "🥰",
  sunglasses: "😎",
  thinking: "🤔",
  suspicious: "🤨",
  melting: "🫠",
  pleading: "🥺",
  pleading2: "🥹",
  skull: "💀",
  fire: "🔥",
  sparkles: "✨",
  warning: "⚠️",
  check: "✅",
  cross: "❌",
  star: "⭐",
  eyes: "👀",
  pray: "🙏",
  ok: "👌",
  waving: "👋",
  thumbsUp: "👍",
  thumbsDown: "👎",
  party: "🥳",
  love: "😍",
  kiss: "😘",
  angry: "😡",
  clown: "🤡",
  ghost: "👻",
  robot: "🤖",
  alien: "👽"
});

export const KYARA_EMOJI_ALIASES = Object.freeze({
  ":hug:": KYARA_EMOJIS.hug,
  ":heart:": KYARA_EMOJIS.heart,
  ":laugh:": KYARA_EMOJIS.laugh,
  ":cry:": KYARA_EMOJIS.cry,
  ":tears:": KYARA_EMOJIS.holdingBackTears,
  ":heart_hands:": KYARA_EMOJIS.heartHands,
  ":fire:": KYARA_EMOJIS.fire,
  ":sparkles:": KYARA_EMOJIS.sparkles,
  ":warning:": KYARA_EMOJIS.warning,
  ":check:": KYARA_EMOJIS.check,
  ":cross:": KYARA_EMOJIS.cross,
  ":eyes:": KYARA_EMOJIS.eyes,
  ":pray:": KYARA_EMOJIS.pray,
  ":robot:": KYARA_EMOJIS.robot
});
