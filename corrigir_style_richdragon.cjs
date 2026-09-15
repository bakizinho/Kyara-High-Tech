const fs = require("fs");
const { spawnSync } = require("child_process");

const file = "dados/src/games/richdragon.js";

console.log("");
console.log("========================================");
console.log(" 🐉 KYARA — REPARO CIRÚRGICO");
console.log("========================================");

let s = fs.readFileSync(file, "utf8");

/*
 * ============================================================
 * BACKUP
 * ============================================================
 */

const backup =
  file +
  ".bak-style-" +
  Date.now();

fs.copyFileSync(file, backup);

console.log("✅ Backup criado:");
console.log(backup);

/*
 * ============================================================
 * LOCALIZAR O ÚNICO <style>
 * ============================================================
 */

const styleOpen =
  (s.match(/<style>/g) || []).length;

const styleClose =
  (s.match(/<\/style>/g) || []).length;

console.log("");
console.log("STYLE antes:");
console.log("<style>  =", styleOpen);
console.log("</style> =", styleClose);

if (styleOpen !== 1) {
  console.error("");
  console.error("❌ Quantidade inesperada de <style>.");
  console.error("Nenhuma alteração feita.");
  process.exit(1);
}

if (styleClose !== 2) {
  console.error("");
  console.error("❌ Esperava exatamente 2 </style>.");
  console.error("Nenhuma alteração feita.");
  process.exit(1);
}

/*
 * ============================================================
 * REMOVER SOMENTE O SEGUNDO </style>
 * ============================================================
 */

const firstStyle =
  s.indexOf("</style>");

const secondStyle =
  s.indexOf(
    "</style>",
    firstStyle + "</style>".length
  );

if (firstStyle < 0 || secondStyle < 0) {
  console.error("❌ Não consegui localizar os fechamentos.");
  process.exit(1);
}

s =
  s.slice(0, secondStyle) +
  s.slice(
    secondStyle + "</style>".length
  );

console.log("");
console.log("✅ Segundo </style> removido.");

/*
 * ============================================================
 * NÃO MEXER NOS SCRIPTS
 * ============================================================
 */

const scriptOpen =
  (s.match(/<script>/g) || []).length;

const scriptClose =
  (s.match(/<\/script>/g) || []).length;

console.log("");
console.log("SCRIPT preservado:");
console.log("<script>  =", scriptOpen);
console.log("</script> =", scriptClose);

if (scriptOpen !== scriptClose) {
  console.error("");
  console.error("❌ Os scripts ficaram desequilibrados.");
  console.error("Restaurando backup.");

  fs.copyFileSync(backup, file);

  process.exit(1);
}

/*
 * ============================================================
 * PRESERVAR FX
 * ============================================================
 */

const expectedFunctions = [
  "sparks",
  "damageText",
  "aura",
  "actionFX"
];

for (const fn of expectedFunctions) {
  const count =
    (
      s.match(
        new RegExp(
          "function " + fn + "\\b",
          "g"
        )
      ) || []
    ).length;

  console.log(
    fn + ":",
    count
  );

  if (count !== 1) {
    console.error(
      "❌ Função alterada inesperadamente:",
      fn
    );

    fs.copyFileSync(backup, file);

    console.error(
      "↩️ Backup restaurado."
    );

    process.exit(1);
  }
}

/*
 * ============================================================
 * PRESERVAR PERSONAGENS
 * ============================================================
 */

const playerCount =
  (s.match(/dragonPlayerCharacter/g) || []).length;

const enemyCount =
  (s.match(/dragonEnemyCharacter/g) || []).length;

console.log("");
console.log(
  "dragonPlayerCharacter:",
  playerCount
);

console.log(
  "dragonEnemyCharacter:",
  enemyCount
);

if (playerCount < 1 || enemyCount < 1) {
  console.error(
    "❌ Personagens desapareceram da estrutura."
  );

  fs.copyFileSync(backup, file);

  console.error(
    "↩️ Backup restaurado."
  );

  process.exit(1);
}

/*
 * ============================================================
 * SALVAR
 * ============================================================
 */

fs.writeFileSync(
  file,
  s,
  "utf8"
);

/*
 * ============================================================
 * VALIDAR NODE
 * ============================================================
 */

const check =
  spawnSync(
    process.execPath,
    ["--check", file],
    {
      encoding: "utf8"
    }
  );

if (check.status !== 0) {
  console.error("");
  console.error("❌ node --check FALHOU.");
  console.error(
    check.stderr ||
    check.stdout ||
    ""
  );

  fs.copyFileSync(
    backup,
    file
  );

  console.error(
    "↩️ Backup restaurado."
  );

  process.exit(1);
}

/*
 * ============================================================
 * VALIDAÇÃO FINAL
 * ============================================================
 */

const finalStyleOpen =
  (s.match(/<style>/g) || []).length;

const finalStyleClose =
  (s.match(/<\/style>/g) || []).length;

const finalScriptOpen =
  (s.match(/<script>/g) || []).length;

const finalScriptClose =
  (s.match(/<\/script>/g) || []).length;

console.log("");
console.log("========================================");
console.log(" 🔎 VALIDAÇÃO FINAL");
console.log("========================================");

console.log(
  "STYLE:",
  finalStyleOpen,
  "/",
  finalStyleClose
);

console.log(
  "SCRIPT:",
  finalScriptOpen,
  "/",
  finalScriptClose
);

console.log(
  "PLAYER:",
  playerCount
);

console.log(
  "ENEMY:",
  enemyCount
);

console.log("");
console.log("========================================");
console.log(" ✅ REPARO CONCLUÍDO");
console.log("========================================");
console.log("✓ Apenas </style> duplicado removido");
console.log("✓ Scripts preservados");
console.log("✓ Combate preservado");
console.log("✓ FX preservados");
console.log("✓ Personagens preservados");
console.log("✓ Cards preservados");
console.log("✓ Comandos não alterados");
console.log("✓ node --check passou");
console.log("✓ Backup disponível");
console.log("========================================");
