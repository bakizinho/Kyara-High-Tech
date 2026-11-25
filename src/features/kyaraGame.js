import {
  handleKyaraGames,
  getKyaraGame,
  KYARA_GAME_COMMANDS
} from "./kyaraGames/index.js";

export async function handleKyaraGameCommand(
  options = {}
) {
  return handleKyaraGames(options);
}

export {
  handleKyaraGames,
  getKyaraGame,
  KYARA_GAME_COMMANDS
};
