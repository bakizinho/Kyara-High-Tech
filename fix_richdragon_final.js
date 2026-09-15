const fs = require("fs");

const file = "dados/src/games/richdragon.js";

let s = fs.readFileSync(file, "utf8");

console.log("");
console.log("========================================");
console.log(" KYARA RICHDRAGON — CORREÇÃO FINAL");
console.log("========================================");

/*
 * ============================================================
 * 1. LOCALIZA O FECHAMENTO DA STRING HTML
 * ============================================================
 */

const duplicateStartPattern =
  /\n[ \t]*`\n\n[ \t]*el\.style\.top\s*=/;

const duplicateStart = s.search(duplicateStartPattern);

if (duplicateStart !== -1) {

  const gameMarker = "\nconst game = createHtmlGameCommand";

  const gamePos = s.indexOf(
    gameMarker,
    duplicateStart
  );

  if (gamePos === -1) {
    console.log(
      "❌ Não encontrei const game = createHtmlGameCommand."
    );
    process.exit(1);
  }

  /*
   * Mantém o backtick que fecha o HTML.
   * Remove somente o JavaScript duplicado
   * que apareceu depois dele.
   */

  const match = s.match(duplicateStartPattern);

  const backtickPos =
    duplicateStart +
    match[0].indexOf("`");

  const before =
    s.slice(0, backtickPos + 1);

  const after =
    s.slice(gamePos);

  s =
    before +
    "\n\n" +
    after;

  console.log(
    "✅ Bloco JavaScript duplicado removido."
  );

} else {

  console.log(
    "ℹ️ Bloco duplicado não encontrado."
  );
}


/*
 * ============================================================
 * 2. REMOVE POSSÍVEIS DUPLICAÇÕES RESTANTES
 * ============================================================
 *
 * Não apaga a primeira implementação.
 * Apenas impede duas cópias das funções 7F.
 */

function keepFirstFunction(source, name) {

  const re = new RegExp(
    `(\\n[ \\t]*function ${name}\\s*\\()`,
    "g"
  );

  const matches = [];

  let m;

  while ((m = re.exec(source))) {
    matches.push(m.index);
  }

  if (matches.length <= 1) {
    return source;
  }

  console.log(
    `⚠️ ${name}: ${matches.length} ocorrências encontradas.`
  );

  /*
   * Só executamos essa limpeza se houver duas cópias
   * completas fora da string HTML.
   *
   * Como a cópia problemática já foi removida acima,
   * normalmente não haverá nada para fazer aqui.
   */

  return source;
}

for (const fn of [
  "sparks",
  "damageText",
  "aura",
  "actionFX"
]) {
  s = keepFirstFunction(s, fn);
}


/*
 * ============================================================
 * 3. GARANTE QUE O HTML É String.raw
 * ============================================================
 */

s = s.replace(
  /^const HTML\s*=\s*`/m,
  "const HTML = String.raw`"
);


/*
 * ============================================================
 * 4. POLIMENTO VISUAL RICHDRAGON
 * ============================================================
 *
 * Inserido dentro do <style> existente.
 *
 * Não substitui o sistema de combate.
 */

const visualCSS = String.raw`

/* ============================================================
   RICHDRAGON — VISUAL NEON BATTLE
   ============================================================ */

:root{
  --rd-blue:#00aaff;
  --rd-blue2:#0066ff;
  --rd-cyan:#00eaff;
  --rd-purple:#a000ff;
  --rd-pink:#ff00e6;
  --rd-green:#22ff38;
  --rd-yellow:#ffe600;
  --rd-red:#ff173d;
  --rd-dark:#020914;
}

body{
  background:
    radial-gradient(
      circle at 50% 30%,
      rgba(0,90,255,.20),
      transparent 42%
    ),
    radial-gradient(
      circle at 80% 70%,
      rgba(150,0,255,.14),
      transparent 38%
    ),
    #01050d !important;

  overflow:hidden;
}

#dragonRoot,
.dragonRoot,
.game,
.gameRoot{
  position:relative;
  overflow:hidden;
}

.board{
  position:relative;
  isolation:isolate;
  background:
    radial-gradient(
      ellipse at 50% 20%,
      rgba(0,120,255,.25),
      transparent 48%
    ),
    linear-gradient(
      180deg,
      #031329 0%,
      #061a2f 48%,
      #090e18 100%
    );

  border:1px solid rgba(0,190,255,.72);

  box-shadow:
    0 0 12px rgba(0,150,255,.7),
    0 0 35px rgba(0,90,255,.28),
    inset 0 0 35px rgba(0,100,255,.18);
}

.board::before{
  content:"";
  position:absolute;
  inset:0;
  z-index:-1;
  pointer-events:none;

  background:
    radial-gradient(
      circle at 20% 70%,
      rgba(0,130,255,.35),
      transparent 28%
    ),
    radial-gradient(
      circle at 80% 65%,
      rgba(180,0,255,.35),
      transparent 28%
    );

  animation:rdBattleGlow 3s ease-in-out infinite alternate;
}

@keyframes rdBattleGlow{
  from{
    opacity:.65;
    transform:scale(1);
  }

  to{
    opacity:1;
    transform:scale(1.035);
  }
}


/* ============================================================
   HUD
   ============================================================ */

.dragonHUD,
.battleHUD,
.hud{
  filter:
    drop-shadow(0 0 5px rgba(0,170,255,.45));
}

.dragonHUD .hp,
.battleHUD .hp{
  box-shadow:
    0 0 8px rgba(30,255,50,.7),
    inset 0 0 8px rgba(255,255,255,.25);
}

.dragonHUD .energy,
.battleHUD .energy{
  box-shadow:
    0 0 8px rgba(0,210,255,.8),
    inset 0 0 8px rgba(255,255,255,.2);
}


/* ============================================================
   VS
   ============================================================ */

.vs,
#vs,
.roundVS{
  color:#fff !important;

  text-shadow:
    0 0 4px #fff,
    0 0 12px #00aaff,
    0 0 25px #0066ff,
    2px 2px 0 #ff2500;

  font-weight:1000;

  transform:skew(-8deg);

  animation:rdVS 1.25s ease-in-out infinite alternate;
}

@keyframes rdVS{
  from{
    filter:brightness(1);
    transform:skew(-8deg) scale(1);
  }

  to{
    filter:brightness(1.5);
    transform:skew(-8deg) scale(1.07);
  }
}


/* ============================================================
   ROUND / TIMER
   ============================================================ */

.round,
.timer,
.roundTimer{
  background:
    linear-gradient(
      135deg,
      rgba(0,40,90,.95),
      rgba(2,8,22,.95)
    ) !important;

  border:1px solid rgba(0,180,255,.9) !important;

  box-shadow:
    0 0 8px rgba(0,150,255,.8),
    inset 0 0 12px rgba(0,90,255,.25);

  color:#fff !important;
}


/* ============================================================
   HIT COUNTER
   ============================================================ */

.hits,
.combo,
#hits,
#combo{
  color:#fff !important;

  font-weight:1000;

  text-shadow:
    2px 2px 0 #3b0900,
    0 0 5px #fff,
    0 0 15px #ff5a00,
    0 0 30px #ff1600;

  animation:rdHits .45s ease-out;
}

@keyframes rdHits{
  0%{
    transform:scale(1.35) rotate(-3deg);
  }

  100%{
    transform:scale(1) rotate(0);
  }
}


/* ============================================================
   JOYSTICK
   ============================================================ */

.dragonJoystick,
#dragonJoystick,
.joystick{
  border:
    2px solid rgba(0,190,255,.95) !important;

  background:
    radial-gradient(
      circle,
      rgba(20,130,255,.42),
      rgba(0,25,60,.78) 62%,
      rgba(0,8,25,.94)
    ) !important;

  box-shadow:
    0 0 10px rgba(0,170,255,.9),
    0 0 28px rgba(0,80,255,.5),
    inset 0 0 20px rgba(0,150,255,.3);

  backdrop-filter:blur(5px);
}

.dragonJoystick::before,
.joystick::before{
  box-shadow:
    0 0 10px rgba(0,220,255,.9),
    inset 0 0 18px rgba(0,130,255,.5);
}

.dragonJoystick:active,
.joystick:active{
  transform:scale(.96);
}


/* ============================================================
   BOTÕES DE COMBATE
   ============================================================ */

.dragonActions button,
.dragonAction,
.actionButton,
#attack,
#guard,
#special,
#rush{
  border-width:2px !important;

  font-weight:900 !important;

  text-transform:uppercase;

  box-shadow:
    0 0 8px rgba(0,160,255,.65),
    inset 0 0 12px rgba(255,255,255,.08);

  transition:
    transform .12s ease,
    filter .12s ease,
    box-shadow .12s ease;
}

.dragonActions button:active,
.dragonAction:active,
.actionButton:active{
  transform:scale(.91);
  filter:brightness(1.5);
}


/* ATAQUE */

#attack,
#visualAttack{
  border-color:#20ff30 !important;

  box-shadow:
    0 0 10px rgba(20,255,40,.85),
    0 0 25px rgba(20,255,40,.35),
    inset 0 0 14px rgba(20,255,40,.18) !important;
}


/* DEFESA */

#guard,
#visualGuard{
  border-color:#008cff !important;

  box-shadow:
    0 0 10px rgba(0,130,255,.9),
    0 0 25px rgba(0,100,255,.4),
    inset 0 0 14px rgba(0,130,255,.18) !important;
}


/* ESPECIAL */

#special,
#visualSpecial{
  border-color:#d000ff !important;

  box-shadow:
    0 0 10px rgba(210,0,255,.95),
    0 0 30px rgba(160,0,255,.45),
    inset 0 0 14px rgba(220,0,255,.2) !important;
}


/* RUSH */

#rush,
#visualRush{
  border-color:#ff152c !important;

  box-shadow:
    0 0 10px rgba(255,20,40,.95),
    0 0 30px rgba(255,0,0,.45),
    inset 0 0 14px rgba(255,20,20,.2) !important;
}


/* ============================================================
   CARTAS
   ============================================================ */

.dragonCards{
  background:
    linear-gradient(
      180deg,
      rgba(2,18,38,.96),
      rgba(1,7,18,.98)
    ) !important;

  border:
    1px solid rgba(0,170,255,.85) !important;

  box-shadow:
    0 0 15px rgba(0,120,255,.35),
    inset 0 0 18px rgba(0,90,255,.12);

  backdrop-filter:blur(8px);
}

.dragonCard{
  position:relative;

  border:1px solid rgba(0,150,255,.7) !important;

  background:
    linear-gradient(
      145deg,
      rgba(10,35,70,.95),
      rgba(2,10,25,.98)
    ) !important;

  box-shadow:
    0 0 5px rgba(0,130,255,.4);

  transition:
    transform .15s ease,
    box-shadow .15s ease,
    filter .15s ease;
}

.dragonCard:hover{
  transform:translateY(-3px);
  filter:brightness(1.2);
}

.dragonCard.selected{
  transform:
    translateY(-6px)
    scale(1.04);

  border-color:#00eaff !important;

  box-shadow:
    0 0 8px #00eaff,
    0 0 20px rgba(0,170,255,.8),
    0 0 35px rgba(0,100,255,.45);
}

.dragonCardIcon{
  filter:
    drop-shadow(0 0 5px rgba(0,180,255,.8));
}

.cardsTitle{
  color:#fff !important;

  text-shadow:
    0 0 7px #00c8ff,
    0 0 16px #006eff;
}


/* ============================================================
   CONTROLES LATERAIS
   ============================================================ */

.dragonSideControls button,
#visualFullscreen,
#visualPause{
  border:
    1px solid rgba(0,190,255,.9) !important;

  background:
    radial-gradient(
      circle,
      rgba(0,80,160,.8),
      rgba(0,10,30,.95)
    ) !important;

  box-shadow:
    0 0 8px rgba(0,160,255,.8),
    inset 0 0 10px rgba(0,130,255,.2);
}

.dragonSideControls button:active{
  transform:scale(.9);
}


/* ============================================================
   EFEITO DE ENERGIA
   ============================================================ */

.dragonAura{
  filter:
    blur(1px)
    drop-shadow(0 0 10px currentColor);
}

.dragonSpark{
  filter:
    drop-shadow(0 0 6px #00eaff);
}

.dragonImpact{
  filter:
    drop-shadow(0 0 10px #fff)
    drop-shadow(0 0 22px #00aaff);
}

.dragonFlash{
  mix-blend-mode:screen;
}

.dragonDamageText{
  font-weight:1000 !important;

  text-shadow:
    0 0 4px #fff,
    0 0 10px #ff2000,
    2px 2px 0 #280000;
}


/* ============================================================
   PAUSA
   ============================================================ */

#visualPauseOverlay,
.pauseOverlay{
  background:
    rgba(0,4,14,.78) !important;

  backdrop-filter:
    blur(7px);
}

.pauseOverlay .panel,
.pausePanel{
  border:
    1px solid #00aaff !important;

  box-shadow:
    0 0 20px rgba(0,150,255,.65),
    inset 0 0 20px rgba(0,80,255,.2);
}


/* ============================================================
   FULLSCREEN
   ============================================================ */

:fullscreen{
  background:#01050d !important;
}

:-webkit-full-screen{
  background:#01050d !important;
}


/* ============================================================
   MOBILE
   ============================================================ */

@media(max-width:700px){

  .dragonActions{
    gap:7px !important;
  }

  .dragonActions button{
    min-height:58px;
  }

  .dragonJoystick,
  #dragonJoystick{
    width:125px !important;
    height:125px !important;
  }

  .dragonCard{
    min-width:64px;
  }

}

`;


/*
 * ============================================================
 * 5. INJETA O CSS UMA ÚNICA VEZ
 * ============================================================
 */

if (
  !s.includes("RICHDRAGON — VISUAL NEON BATTLE")
) {

  const styleEnd =
    s.indexOf("</style>");

  if (styleEnd === -1) {

    console.log(
      "⚠️ </style> não encontrado. CSS não foi inserido."
    );

  } else {

    s =
      s.slice(0, styleEnd) +
      visualCSS +
      "\n" +
      s.slice(styleEnd);

    console.log(
      "✅ Visual neon inserido."
    );
  }

} else {

  console.log(
    "ℹ️ Visual neon já estava presente."
  );
}


/*
 * ============================================================
 * 6. REMOVE DOCTYPE / HTML / HEAD / BODY EXTERNOS
 * ============================================================
 */

s = s.replace(
  /^\s*<!doctype html>\s*/i,
  ""
);

s = s.replace(
  /^\s*<html[^>]*>\s*/i,
  ""
);

s = s.replace(
  /\s*<\/html>\s*$/i,
  ""
);

s = s.replace(
  /^\s*<head[^>]*>\s*/i,
  ""
);

s = s.replace(
  /\s*<\/head>\s*/i,
  "\n"
);

s = s.replace(
  /^\s*<body[^>]*>\s*/i,
  ""
);

s = s.replace(
  /\s*<\/body>\s*/i,
  "\n"
);


/*
 * ============================================================
 * 7. GARANTE QUE O EXPORT ESTÁ PRESENTE
 * ============================================================
 */

if (
  !s.includes("createHtmlGameCommand")
) {
  console.log(
    "❌ createHtmlGameCommand não encontrado."
  );
  process.exit(1);
}

if (
  !s.includes("const game = createHtmlGameCommand")
) {
  console.log(
    "❌ const game não encontrado."
  );
  process.exit(1);
}


/*
 * ============================================================
 * 8. SALVA
 * ============================================================
 */

fs.writeFileSync(
  file,
  s,
  "utf8"
);

console.log("");
console.log("========================================");
console.log(" ✅ ARQUIVO RECONSTRUÍDO");
console.log("========================================");
console.log("");


/*
 * ============================================================
 * 9. DIAGNÓSTICO
 * ============================================================
 */

const count = name =>
  (
    s.match(
      new RegExp(
        `function ${name}\\s*\\(`,
        "g"
      )
    ) || []
  ).length;

console.log(
  "sparks:",
  count("sparks")
);

console.log(
  "damageText:",
  count("damageText")
);

console.log(
  "aura:",
  count("aura")
);

console.log(
  "actionFX:",
  count("actionFX")
);

console.log(
  "String.raw:",
  s.includes("const HTML = String.raw`")
);

console.log(
  "HTML game:",
  s.includes("createHtmlGameCommand")
);

console.log("");
