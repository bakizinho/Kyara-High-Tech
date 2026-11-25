import dino from "./dino.js";
import breakout from "./breakout.js";
import calculadora from "./calculadora.js";
import pianorich from "./pianorich.js";
import pong from "./pong.js";
import rich2048 from "./rich2048.js";
import richslots from "./richslots.js";
import richsnake from "./richsnake.js";
import richxo from "./richxo.js";
import richmemory from "./richmemory.js";
import richmines from "./richmines.js";
import richflappy from "./richflappy.js";
import richtetris from "./richtetris.js";
import richwordle from "./richwordle.js";
import richreaction from "./richreaction.js";
import richdragon from "./richdragon.js";


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

export const KYARA_HTML_GAMES =
  Object.fromEntries(
    GAMES.map(game => [
      game.name,
      game
    ])
  );

export function getKyaraHtmlGame(
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
    GAMES.find(
      game =>
        (game.commands || [])
          .map(
            value =>
              String(value)
                .toLowerCase()
          )
          .includes(key)
    ) ||
    null
  );
}
