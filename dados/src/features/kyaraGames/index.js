import dino from "../../games/dino.js";
import breakout from "../../games/breakout.js";
import calculadora from "../../games/calculadora.js";
import pianorich from "../../games/pianorich.js";
import pong from "../../games/pong.js";
import rich2048 from "../../games/rich2048.js";
import richslots from "../../games/richslots.js";
import richsnake from "../../games/richsnake.js";
import richxo from "../../games/richxo.js";
import richmemory from "../../games/richmemory.js";
import richmines from "../../games/richmines.js";
import richflappy from "../../games/richflappy.js";
import richtetris from "../../games/richtetris.js";
import richwordle from "../../games/richwordle.js";
import richreaction from "../../games/richreaction.js";
import richdragon from "../../games/richdragon.js";


const GAMES = [
  dino,
  breakout,
  calculadora,
  pianorich,
  pong,
  rich2048,
  richslots,
  richsnake,
  richxo,
  richmemory,
  richmines,
  richflappy,
  richtetris,
  richwordle,
  richreaction,
  richdragon
];

const BY_COMMAND = new Map();

for (const game of GAMES) {

  for (const command of game.commands || []) {

    const key =
      String(command)
        .trim()
        .toLowerCase()
        .replace(/^[/!]/, "");

    if (!key) continue;

    if (BY_COMMAND.has(key)) {

      const previous =
        BY_COMMAND.get(key);

      throw new Error(
        `[KYARA GAME] Comando duplicado: ${key} ` +
        `(${previous.name} x ${game.name})`
      );
    }

    BY_COMMAND.set(
      key,
      game
    );
  }
}

export const KYARA_GAME_COMMANDS =
  [...BY_COMMAND.keys()];

export function getKyaraGame(
  command
) {

  const key =
    String(
      command || ""
    )
      .trim()
      .toLowerCase()
      .replace(/^[/!]/, "");

  return (
    BY_COMMAND.get(key) ||
    null
  );
}

export async function handleKyaraGames(
  options = {}
) {

  const command =
    String(
      options.command ||
      options.cmd ||
      options.commandName ||
      ""
    )
      .trim()
      .toLowerCase()
      .replace(/^[/!]/, "");

  const game =
    BY_COMMAND.get(command);

  if (!game) {
    return false;
  }

  const socket =
    options.nazu ||
    options.sock ||
    options.socket;

  const remoteJid =
    options.from ||
    options.remoteJid ||
    options.info?.key?.remoteJid;

  if (
    !socket ||
    typeof socket.relayMessage !==
      "function"
  ) {

    if (
      typeof options.reply ===
      "function"
    ) {
      await options.reply(
        "❌ O socket do WhatsApp não está disponível para abrir o jogo."
      );
    }

    return true;
  }

  try {

    await game.handle({

      socket,

      remoteJid,

      info:
        options.info,

      sendSuccessReact:
        async () => {},

      sendErrorReply:
        async (text) => {

          if (
            typeof options.reply ===
            "function"
          ) {
            await options.reply(
              text
            );
          }
        }
    });

  } catch (error) {

    console.error(
      `[KYARA GAME] ${game.name}:`,
      error?.stack ||
      error
    );

    if (
      typeof options.reply ===
      "function"
    ) {

      await options.reply(
        `❌ Não consegui abrir *${game.displayName || game.name}*.`
      );
    }
  }

  return true;
}

export default handleKyaraGames;
