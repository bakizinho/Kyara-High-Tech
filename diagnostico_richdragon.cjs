const fs = require("fs");

const file = "dados/src/games/richdragon.js";
const s = fs.readFileSync(file, "utf8");

console.log("");
console.log("========================================");
console.log(" 🐉 DIAGNÓSTICO DO RICHDRAGON");
console.log("========================================");

console.log("Arquivo:", file);
console.log("Bytes:", Buffer.byteLength(s, "utf8"));
console.log("Linhas:", s.split("\n").length);

console.log("");
console.log("HTML:");
console.log("String.raw:", (s.match(/String\.raw`/g) || []).length);
console.log("<style>:", (s.match(/<style>/g) || []).length);
console.log("</style>:", (s.match(/<\/style>/g) || []).length);
console.log("<script>:", (s.match(/<script>/g) || []).length);
console.log("</script>:", (s.match(/<\/script>/g) || []).length);

console.log("");
console.log("PERSONAGENS:");
console.log("dragonPlayerCharacter:",
  (s.match(/dragonPlayerCharacter/g) || []).length
);
console.log("dragonEnemyCharacter:",
  (s.match(/dragonEnemyCharacter/g) || []).length
);
console.log("dragonFighter:",
  (s.match(/dragonFighter/g) || []).length
);

console.log("");
console.log("FX:");
console.log("sparks:",
  (s.match(/function sparks/g) || []).length
);
console.log("damageText:",
  (s.match(/function damageText/g) || []).length
);
console.log("aura:",
  (s.match(/function aura/g) || []).length
);
console.log("actionFX:",
  (s.match(/function actionFX/g) || []).length
);

console.log("");
console.log("SINTAXE:");

const { spawnSync } = require("child_process");
const check = spawnSync(
  process.execPath,
  ["--check", file],
  { encoding: "utf8" }
);

if (check.status === 0) {
  console.log("✅ JavaScript válido.");
} else {
  console.log("❌ JavaScript inválido.");
  console.log(check.stderr || check.stdout);
}

console.log("");
console.log("========================================");
