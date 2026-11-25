
/**
 * KYARA GAME SAVE
 *
 * Banco simples persistente por usuário.
 * O HTML usa localStorage imediatamente.
 * Este módulo também permite que os jogos JS
 * salvem dados no servidor posteriormente.
 */

import fs from "fs/promises";
import path from "path";

const SAVE_DIR = path.join(
  process.cwd(),
  "dados",
  "data",
  "kyara-games"
);

function safe(value) {
  return String(value || "unknown")
    .replace(/[^a-zA-Z0-9_.@-]/g, "_")
    .slice(0, 160);
}

async function ensure() {
  await fs.mkdir(SAVE_DIR, {
    recursive: true
  });
}

export async function loadGameSave(
  userId,
  game
) {
  await ensure();

  const file = path.join(
    SAVE_DIR,
    `${safe(userId)}-${safe(game)}.json`
  );

  try {
    return JSON.parse(
      await fs.readFile(
        file,
        "utf8"
      )
    );
  } catch {
    return {};
  }
}

export async function saveGameSave(
  userId,
  game,
  data
) {
  await ensure();

  const file = path.join(
    SAVE_DIR,
    `${safe(userId)}-${safe(game)}.json`
  );

  const temp = `${file}.tmp`;

  await fs.writeFile(
    temp,
    JSON.stringify(
      data || {},
      null,
      2
    ),
    "utf8"
  );

  await fs.rename(
    temp,
    file
  );

  return true;
}
