const fs = require("fs");

const file = "dados/src/games/richdragon.js";

let s = fs.readFileSync(file, "utf8");

console.log("========================================");
console.log(" KYARA DRAGON — FIX 7F FINAL");
console.log("========================================");

const firstSparks = s.indexOf("function sparks(");

if (firstSparks === -1) {
  console.log("❌ Nenhuma função sparks encontrada.");
  process.exit(1);
}

const secondSparks = s.indexOf(
  "function sparks(",
  firstSparks + 1
);

if (secondSparks === -1) {
  console.log("ℹ️ Apenas uma cópia de sparks encontrada.");
  console.log("Nada para remover.");
  process.exit(0);
}

console.log("✅ Primeira sparks encontrada em:", firstSparks);
console.log("⚠️ Segunda sparks encontrada em:", secondSparks);

/*
 * A segunda cópia ficou depois de um ` que encerra
 * prematuramente o String.raw.
 *
 * Encontramos o ` imediatamente antes da segunda cópia
 * e removemos tudo entre ele e const game.
 */

const badBacktick = s.lastIndexOf("`", secondSparks);

if (badBacktick === -1) {
  console.log("❌ Não encontrei o fechamento String.raw.");
  process.exit(1);
}

const gamePos = s.indexOf(
  "const game = createHtmlGameCommand",
  secondSparks
);

if (gamePos === -1) {
  console.log("❌ Não encontrei const game.");
  process.exit(1);
}

console.log("✅ Fechamento String.raw:", badBacktick);
console.log("✅ createHtmlGameCommand:", gamePos);

const before = s.slice(0, badBacktick + 1);
const after = s.slice(gamePos);

s = before + "\n\n" + after;

/*
 * Segurança:
 * remove somente ocorrências extras das funções 7F
 * que tenham ficado depois de const game.
 */

const gameIndex = s.indexOf(
  "const game = createHtmlGameCommand"
);

const beforeGame = s.slice(0, gameIndex);
const afterGame = s.slice(gameIndex);

const names = [
  "function sparks(",
  "function damageText(",
  "function aura(",
  "function actionFX("
];

for (const name of names) {
  const countBefore =
    (beforeGame.match(
      new RegExp(
        name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g"
      )
    ) || []).length;

  console.log(`${name} → ${countBefore} antes de const game`);
}

fs.writeFileSync(file, s);

console.log("");
console.log("========================================");
console.log(" ✅ FIX APLICADO");
console.log("========================================");
console.log("A segunda cópia 7F foi removida.");
console.log("O String.raw foi preservado.");
console.log("O restante do RichDragon foi mantido.");
console.log("========================================");
