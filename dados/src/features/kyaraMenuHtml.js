/**
 * KYARA — MENUHTML
 *
 * Menu normal de texto dos jogos HTML.
 *
 * A lista de jogos NÃO é mantida aqui.
 * Ela vem diretamente do registry:
 *
 *   dados/src/games/index.js
 *
 * Dessa forma, novos jogos registrados no sistema
 * aparecem automaticamente no /menuhtml.
 */

import {
  KYARA_HTML_GAMES
} from "../games/index.js";


/* ============================================================
 * COMANDO
 * ========================================================== */

export const KYARA_MENUHTML_COMMANDS = [
  "menuhtml"
];


export function isKyaraMenuHtmlCommand(command) {
  return String(command || "")
    .trim()
    .toLowerCase()
    .replace(/^[/!]/, "") === "menuhtml";
}


/* ============================================================
 * INFORMAÇÕES VISUAIS
 *
 * IMPORTANTE:
 * Isto NÃO é uma lista de jogos.
 *
 * Serve somente para escolher o ícone de cada jogo.
 *
 * Se um jogo novo não estiver aqui, ele recebe 🎮
 * automaticamente.
 * ========================================================== */

const GAME_ICONS = {
  dino: "🦖",
  breakout: "🧱",
  calculadora: "🧮",
  pianorich: "🎹",
  richpong: "🏓",
  rich2048: "🔢",
  richslots: "🎰",
  richsnake: "🐍",
  richxo: "❌",
  richmemory: "🧠",
  richmines: "💣",
  richflappy: "🐦",
  richtetris: "🧩",
  richwordle: "🟩",
  richreaction: "⚡"
};


/* ============================================================
 * LEITURA DINÂMICA DO REGISTRY
 * ========================================================== */

function getRegisteredGames() {
  const registry = Object.values(
    KYARA_HTML_GAMES || {}
  );

  return registry
    .filter(Boolean)
    .map(game => {
      const name = String(
        game.name || ""
      )
        .trim()
        .toLowerCase();

      if (!name) {
        return null;
      }

      return {
        name,
        command: `/${name}`,
        icon: GAME_ICONS[name] || "🎮",
        game
      };
    })
    .filter(Boolean);
}


/* ============================================================
 * MENU DE TEXTO
 * ========================================================== */

export function buildTextMenu() {
  const games = getRegisteredGames();

  const rows = games
    .map((game, index) => {
      const number = String(index + 1).padStart(2, "0");

      return `┃ ${number}. ${game.icon} ${game.command}`;
    })
    .join("\n");

  return [
    "╭━━━〔 🎮 KYARA GAMES 〕━━━╮",
    "┃",
    `┃ 🎮 JOGOS HTML: ${games.length}`,
    "┃",
    "┃ Escolha um jogo:",
    "┃",
    rows,
    "┃",
    "╰━━━━━━━━━━━━━━━━━━━━━━╯"
  ].join("\n");
}


/* ============================================================
 * COMPATIBILIDADE
 *
 * Algumas partes antigas podem importar buildKyaraMenuHtml().
 *
 * Mantemos a função, mas agora ela devolve o menu NORMAL
 * de texto.
 * ========================================================== */

export function buildKyaraMenuHtml() {
  return buildTextMenu();
}


/* ============================================================
 * HANDLER
 * ========================================================== */

export async function handleKyaraMenuHtml({
  command,
  sendText,
  reply,
  sendMessage
} = {}) {

  if (!isKyaraMenuHtmlCommand(command)) {
    return false;
  }

  const menu = buildTextMenu();

  if (typeof sendText === "function") {
    await sendText(menu);
    return true;
  }

  if (typeof reply === "function") {
    await reply(menu);
    return true;
  }

  if (typeof sendMessage === "function") {
    await sendMessage(menu);
    return true;
  }

  return false;
}


/* ============================================================
 * EXPORT DEFAULT
 * ========================================================== */

export default {
  commands: KYARA_MENUHTML_COMMANDS,
  isKyaraMenuHtmlCommand,
  buildKyaraMenuHtml,
  buildTextMenu,
  handleKyaraMenuHtml
};
