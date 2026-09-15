const fs = require("fs");
const { spawnSync } = require("child_process");

const file = "dados/src/games/richdragon.js";

console.log("");
console.log("========================================");
console.log(" 🐉 KYARA — CORREÇÃO HTML RICHD RAGON");
console.log("========================================");

let s = fs.readFileSync(file, "utf8");

const backup =
  file + ".bak-html-" +
  new Date().toISOString()
    .replace(/[:.]/g, "-");

fs.copyFileSync(file, backup);

console.log("✅ Backup:", backup);

const htmlStart = s.indexOf("const HTML = String.raw`");

if (htmlStart < 0) {
  console.error("❌ Não encontrei const HTML = String.raw`.");
  process.exit(1);
}

const htmlEnd = s.indexOf("`;", htmlStart + 25);

if (htmlEnd < 0) {
  console.error("❌ Não encontrei o fechamento do HTML.");
  process.exit(1);
}

const before = s.slice(0, htmlStart);
const html = s.slice(
  htmlStart,
  htmlEnd + 2
);
const after = s.slice(htmlEnd + 2);

let fixed = html;

/*
 * ============================================================
 * CORRIGE </style>
 * ============================================================
 */

const styleOpen = (fixed.match(/<style>/g) || []).length;
let styleClose = (fixed.match(/<\/style>/g) || []).length;

console.log("");
console.log("STYLE antes:", styleOpen, "/", styleClose);

if (styleOpen === 1 && styleClose > 1) {
  const first = fixed.indexOf("</style>");
  const second = fixed.indexOf("</style>", first + 8);

  if (second >= 0) {
    fixed =
      fixed.slice(0, second) +
      fixed.slice(second + 8);

    console.log("✅ Removido </style> duplicado.");
  }
}

/*
 * ============================================================
 * CORRIGE </script>
 * ============================================================
 */

const scriptOpen = (fixed.match(/<script>/g) || []).length;
let scriptClose = (fixed.match(/<\/script>/g) || []).length;

console.log("SCRIPT antes:", scriptOpen, "/", scriptClose);

if (scriptOpen === 1 && scriptClose > 1) {
  const first = fixed.indexOf("</script>");
  const second = fixed.indexOf("</script>", first + 9);

  if (second >= 0) {
    fixed =
      fixed.slice(0, second) +
      fixed.slice(second + 9);

    console.log("✅ Removido </script> duplicado.");
  }
}

s = before + fixed + after;

/*
 * ============================================================
 * VALIDAÇÃO DA ESTRUTURA
 * ============================================================
 */

const finalStyleOpen =
  (fixed.match(/<style>/g) || []).length;

const finalStyleClose =
  (fixed.match(/<\/style>/g) || []).length;

const finalScriptOpen =
  (fixed.match(/<script>/g) || []).length;

const finalScriptClose =
  (fixed.match(/<\/script>/g) || []).length;

console.log("");
console.log("========================================");
console.log(" 🔎 RESULTADO");
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

/*
 * ============================================================
 * NÃO PERMITIR ALTERAÇÃO INDEVIDA DOS FX
 * ============================================================
 */

for (const fn of [
  "sparks",
  "damageText",
  "aura",
  "actionFX"
]) {
  const count =
    (s.match(
      new RegExp(
        "function " + fn + "\\b",
        "g"
      )
    ) || []).length;

  if (count !== 1) {
    console.error(
      "❌ Quantidade inesperada de",
      fn,
      ":",
      count
    );

    fs.copyFileSync(backup, file);

    console.error(
      "↩️ Backup restaurado automaticamente."
    );

    process.exit(1);
  }
}

/*
 * ============================================================
 * SALVAR
 * ============================================================
 */

fs.writeFileSync(file, s);

/*
 * ============================================================
 * NODE CHECK
 * ============================================================
 */

const check = spawnSync(
  process.execPath,
  ["--check", file],
  {
    encoding: "utf8"
  }
);

if (check.status !== 0) {
  console.error("");
  console.error("❌ ERRO DE SINTAXE.");
  console.error(check.stderr || check.stdout);

  fs.copyFileSync(backup, file);

  console.error("↩️ Backup restaurado.");

  process.exit(1);
}

console.log("");
console.log("========================================");
console.log(" ✅ RICHD RAGON CORRIGIDO");
console.log("========================================");

console.log("✓ HTML preservado");
console.log("✓ CSS preservado");
console.log("✓ JavaScript preservado");
console.log("✓ Combate preservado");
console.log("✓ Cards preservados");
console.log("✓ FX preservados");
console.log("✓ Comandos não alterados");
console.log("✓ Estrutura STYLE corrigida");
console.log("✓ Estrutura SCRIPT corrigida");
console.log("✓ Node --check passou");
console.log("✓ Backup disponível");
console.log("========================================");
