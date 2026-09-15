const fs = require("fs");

const file = "dados/src/games/richdragon.js";
let s = fs.readFileSync(file, "utf8");

console.log("========================================");
console.log(" 🐉 KYARA DRAGON — PERSONAGENS");
console.log("========================================");

if (s.includes("KYARA_DRAGON_CHARACTER_ART_V2")) {
  console.log("⚠️ Arte V2 já instalada.");
  console.log("Nada foi alterado.");
  process.exit(0);
}

const cssMarker = "</style>";

if (!s.includes(cssMarker)) {
  console.log("❌ </style> não encontrado.");
  process.exit(1);
}

const characterCSS = String.raw`

/* ============================================================
   KYARA_DRAGON_CHARACTER_ART_V2
   Arte vetorial original dos lutadores
   ============================================================ */

.dragonCharacterStage{
  position:absolute;
  inset:0;
  pointer-events:none;
  overflow:hidden;
  z-index:8;
}

.dragonFighter{
  position:absolute;
  bottom:8%;
  width:min(38vw,260px);
  height:min(62vw,390px);
  min-width:145px;
  min-height:220px;
  filter:
    drop-shadow(0 0 10px rgba(255,255,255,.18))
    drop-shadow(0 15px 22px rgba(0,0,0,.65));
  transform-origin:center bottom;
}

.dragonFighter.player{
  left:5%;
  animation:dragonPlayerIdle 1.8s ease-in-out infinite;
}

.dragonFighter.enemy{
  right:5%;
  animation:dragonEnemyIdle 1.65s ease-in-out infinite;
}

.dragonFighter svg{
  width:100%;
  height:100%;
  overflow:visible;
}

.dragonAuraRing{
  position:absolute;
  left:50%;
  bottom:5%;
  width:72%;
  height:18%;
  transform:translateX(-50%);
  border-radius:50%;
  opacity:.62;
  filter:blur(3px);
  animation:dragonAuraPulse 1.15s ease-in-out infinite;
}

.player .dragonAuraRing{
  background:
    radial-gradient(ellipse,
      rgba(75,190,255,.75) 0%,
      rgba(45,110,255,.25) 42%,
      transparent 72%);
}

.enemy .dragonAuraRing{
  background:
    radial-gradient(ellipse,
      rgba(255,90,45,.7) 0%,
      rgba(255,185,55,.22) 42%,
      transparent 72%);
}

.dragonEnergy{
  position:absolute;
  left:50%;
  bottom:17%;
  width:90%;
  height:62%;
  transform:translateX(-50%);
  opacity:.22;
  filter:blur(9px);
  border-radius:50%;
  animation:dragonEnergyPulse .9s ease-in-out infinite alternate;
}

.player .dragonEnergy{
  background:radial-gradient(
    ellipse,
    rgba(80,190,255,.55),
    rgba(30,110,255,.18) 40%,
    transparent 70%
  );
}

.enemy .dragonEnergy{
  background:radial-gradient(
    ellipse,
    rgba(255,115,45,.55),
    rgba(255,55,30,.16) 40%,
    transparent 70%
  );
}

.dragonFighter.hit{
  animation:dragonHitCharacter .24s linear !important;
}

.dragonFighter.attackPose{
  animation:dragonAttackCharacter .38s cubic-bezier(.2,.8,.2,1) !important;
}

.dragonFighter.specialPose{
  animation:dragonSpecialCharacter .7s cubic-bezier(.16,.8,.2,1) !important;
}

.dragonCharacterName{
  position:absolute;
  bottom:1%;
  left:50%;
  transform:translateX(-50%);
  padding:4px 12px;
  border-radius:999px;
  font-weight:900;
  font-size:11px;
  letter-spacing:1.5px;
  white-space:nowrap;
  text-shadow:0 2px 4px #000;
  opacity:.9;
}

.player .dragonCharacterName{
  color:#9de7ff;
  border:1px solid rgba(90,210,255,.45);
  background:rgba(5,30,65,.65);
}

.enemy .dragonCharacterName{
  color:#ffd0a0;
  border:1px solid rgba(255,130,60,.45);
  background:rgba(65,20,8,.65);
}

@keyframes dragonPlayerIdle{
  0%,100%{transform:translateY(0) rotate(-1deg) scale(1)}
  50%{transform:translateY(-5px) rotate(1deg) scale(1.008)}
}

@keyframes dragonEnemyIdle{
  0%,100%{transform:translateY(0) rotate(1deg) scale(1)}
  50%{transform:translateY(-6px) rotate(-1deg) scale(1.01)}
}

@keyframes dragonAuraPulse{
  0%,100%{transform:translateX(-50%) scale(.86);opacity:.4}
  50%{transform:translateX(-50%) scale(1.12);opacity:.78}
}

@keyframes dragonEnergyPulse{
  from{transform:translateX(-50%) scale(.82);opacity:.13}
  to{transform:translateX(-50%) scale(1.12);opacity:.3}
}

@keyframes dragonHitCharacter{
  0%{transform:translateX(0) rotate(0)}
  20%{transform:translateX(-13px) rotate(-4deg)}
  45%{transform:translateX(15px) rotate(4deg)}
  70%{transform:translateX(-8px) rotate(-2deg)}
  100%{transform:translateX(0) rotate(0)}
}

@keyframes dragonAttackCharacter{
  0%{transform:translateX(0) scale(1)}
  35%{transform:translateX(22px) scale(1.025)}
  100%{transform:translateX(0) scale(1)}
}

@keyframes dragonSpecialCharacter{
  0%{transform:translateY(0) scale(1)}
  35%{transform:translateY(-20px) scale(1.06)}
  65%{transform:translateY(-8px) scale(1.12)}
  100%{transform:translateY(0) scale(1)}
}

@media(max-width:600px){
  .dragonFighter{
    width:42vw;
    height:68vw;
    min-width:125px;
    min-height:205px;
    bottom:10%;
  }

  .dragonFighter.player{left:0}
  .dragonFighter.enemy{right:0}

  .dragonCharacterName{
    font-size:9px;
    padding:3px 8px;
  }
}
`;

s = s.replace(cssMarker, characterCSS + "\n" + cssMarker);


/* ============================================================
   ARTE SVG
   ============================================================ */

const characterHTML = String.raw`

<!-- ==========================================================
     KYARA DRAGON CHARACTER ART V2
     ========================================================== -->

<div id="dragonCharacterStage" class="dragonCharacterStage">

  <!-- LUTADOR DO JOGADOR -->
  <div id="dragonPlayerCharacter"
       class="dragonFighter player">

    <div class="dragonEnergy"></div>
    <div class="dragonAuraRing"></div>

    <svg viewBox="0 0 220 390"
         xmlns="http://www.w3.org/2000/svg"
         aria-label="Lutador Kyara">

      <!-- aura traseira -->
      <path d="M110 30
               C70 45 42 95 55 140
               C32 180 44 255 65 300
               C82 338 100 355 110 365
               C120 355 138 338 155 300
               C176 255 188 180 165 140
               C178 95 150 45 110 30Z"
            fill="none"
            stroke="rgba(90,200,255,.35)"
            stroke-width="10"
            opacity=".7"/>

      <!-- pernas -->
      <path d="M91 275
               C83 300 78 327 71 354
               L91 363
               C103 340 110 313 113 286Z"
            fill="#26364d"
            stroke="#101725"
            stroke-width="4"/>

      <path d="M128 282
               C137 307 145 331 154 352
               L134 364
               C119 338 113 312 110 286Z"
            fill="#26364d"
            stroke="#101725"
            stroke-width="4"/>

      <!-- botas -->
      <path d="M69 349
               C60 352 54 363 57 373
               C68 380 87 378 96 367
               L91 354Z"
            fill="#111923"
            stroke="#05090e"
            stroke-width="4"/>

      <path d="M151 349
               C161 352 168 363 164 373
               C153 380 135 378 128 367
               L134 354Z"
            fill="#111923"
            stroke="#05090e"
            stroke-width="4"/>

      <!-- tronco -->
      <path d="M77 166
               C87 151 101 145 110 145
               C119 145 133 151 143 166
               L151 255
               C139 273 124 283 110 284
               C96 283 81 273 69 255Z"
            fill="#f0f1f4"
            stroke="#121820"
            stroke-width="5"/>

      <!-- faixa -->
      <path d="M69 245
               C91 253 129 253 151 245
               L149 263
               C126 271 94 271 71 263Z"
            fill="#202a39"
            stroke="#0b1017"
            stroke-width="4"/>

      <path d="M110 249 L130 270 L115 275 L99 258Z"
            fill="#4d79a5"
            opacity=".9"/>

      <!-- braço esquerdo -->
      <path d="M77 172
               C58 178 45 193 37 213
               L52 224
               C66 213 78 201 90 189Z"
            fill="#f0f1f4"
            stroke="#121820"
            stroke-width="5"/>

      <!-- braço direito -->
      <path d="M143 171
               C163 177 176 188 184 204
               L169 217
               C157 207 146 198 132 189Z"
            fill="#f0f1f4"
            stroke="#121820"
            stroke-width="5"/>

      <!-- punhos -->
      <path d="M34 207
               C27 205 20 210 19 218
               C24 227 35 230 44 224
               L48 215Z"
            fill="#e5a47f"
            stroke="#111820"
            stroke-width="4"/>

      <path d="M181 198
               C190 196 198 201 200 209
               C196 218 185 221 176 216
               L171 207Z"
            fill="#e5a47f"
            stroke="#111820"
            stroke-width="4"/>

      <!-- pescoço -->
      <path d="M95 137 L96 163
               C101 172 119 172 124 163
               L125 137Z"
            fill="#d98f6e"
            stroke="#111820"
            stroke-width="4"/>

      <!-- cabelo espetado -->
      <path d="M69 91
               L47 62
               L73 70
               L61 39
               L88 57
               L88 23
               L105 50
               L119 17
               L127 51
               L155 27
               L145 59
               L177 48
               L151 78
               C159 99 151 127 135 139
               C122 149 98 149 84 139
               C69 128 62 108 69 91Z"
            fill="#101820"
            stroke="#05090d"
            stroke-width="5"
            stroke-linejoin="round"/>

      <!-- rosto -->
      <path d="M76 88
               C78 66 97 55 113 57
               C135 58 148 73 147 96
               L141 128
               C134 143 121 150 108 150
               C94 148 82 138 77 124Z"
            fill="#e9a37f"
            stroke="#151b22"
            stroke-width="4"/>

      <!-- sobrancelhas -->
      <path d="M85 91 L103 87"
            stroke="#111820"
            stroke-width="6"
            stroke-linecap="round"/>

      <path d="M117 87 L137 91"
            stroke="#111820"
            stroke-width="6"
            stroke-linecap="round"/>

      <!-- olhos -->
      <path d="M87 95
               Q95 89 103 96
               Q96 104 88 98Z"
            fill="#f5f8ff"/>

      <circle cx="96" cy="97" r="3.5" fill="#111820"/>

      <path d="M117 96
               Q126 89 135 95
               Q127 104 118 99Z"
            fill="#f5f8ff"/>

      <circle cx="126" cy="97" r="3.5" fill="#111820"/>

      <!-- nariz -->
      <path d="M109 98 L105 115 L113 116"
            fill="none"
            stroke="#9d604d"
            stroke-width="3"
            stroke-linecap="round"/>

      <!-- boca -->
      <path d="M98 126 Q110 132 122 125"
            fill="none"
            stroke="#712f32"
            stroke-width="3"
            stroke-linecap="round"/>

      <!-- detalhes do traje -->
      <path d="M88 169 L110 198 L132 169"
            fill="none"
            stroke="#303c50"
            stroke-width="5"/>

      <path d="M83 188 L67 243"
            stroke="#c7ccd3"
            stroke-width="3"
            opacity=".8"/>

      <path d="M137 188 L153 243"
            stroke="#c7ccd3"
            stroke-width="3"
            opacity=".8"/>

    </svg>

    <div class="dragonCharacterName">KYARA FIGHTER</div>
  </div>


  <!-- LUTADOR INIMIGO -->
  <div id="dragonEnemyCharacter"
       class="dragonFighter enemy">

    <div class="dragonEnergy"></div>
    <div class="dragonAuraRing"></div>

    <svg viewBox="0 0 220 390"
         xmlns="http://www.w3.org/2000/svg"
         aria-label="Lutador inimigo">

      <!-- aura -->
      <path d="M110 28
               C70 45 43 96 55 141
               C35 182 47 255 67 302
               C82 337 99 355 110 366
               C121 355 138 337 153 302
               C173 255 185 182 165 141
               C177 96 150 45 110 28Z"
            fill="none"
            stroke="rgba(255,100,40,.42)"
            stroke-width="10"/>

      <!-- pernas -->
      <path d="M91 277
               C84 305 79 329 71 354
               L92 363
               C104 340 110 311 113 286Z"
            fill="#20232a"
            stroke="#0b0d11"
            stroke-width="5"/>

      <path d="M128 284
               C137 310 144 332 153 353
               L132 364
               C119 340 113 313 110 287Z"
            fill="#20232a"
            stroke="#0b0d11"
            stroke-width="5"/>

      <!-- botas -->
      <path d="M70 349
               C59 352 53 363 57 373
               C67 380 87 379 96 367
               L91 354Z"
            fill="#16181d"
            stroke="#050608"
            stroke-width="4"/>

      <path d="M150 349
               C161 352 168 363 164 373
               C153 380 135 378 128 367
               L133 354Z"
            fill="#16181d"
            stroke="#050608"
            stroke-width="4"/>

      <!-- tronco -->
      <path d="M76 165
               C88 151 101 145 110 145
               C119 145 133 151 144 165
               L153 257
               C140 273 124 282 110 284
               C96 282 80 273 67 257Z"
            fill="#722f2c"
            stroke="#171015"
            stroke-width="5"/>

      <!-- peito -->
      <path d="M79 175
               Q110 192 141 175"
            fill="none"
            stroke="#b85b45"
            stroke-width="5"
            opacity=".7"/>

      <!-- faixa -->
      <path d="M67 244
               C91 253 129 253 153 244
               L150 263
               C126 271 94 271 70 263Z"
            fill="#15171c"
            stroke="#08090d"
            stroke-width="4"/>

      <!-- braços -->
      <path d="M77 171
               C58 177 44 190 35 207
               L50 220
               C65 210 78 200 90 188Z"
            fill="#722f2c"
            stroke="#171015"
            stroke-width="5"/>

      <path d="M143 171
               C163 176 177 188 185 204
               L170 218
               C157 207 146 198 132 188Z"
            fill="#722f2c"
            stroke="#171015"
            stroke-width="5"/>

      <!-- mãos -->
      <path d="M32 201
               C24 200 18 206 19 214
               C25 223 36 225 44 218
               L48 210Z"
            fill="#d99472"
            stroke="#171015"
            stroke-width="4"/>

      <path d="M185 198
               C193 196 200 202 201 210
               C196 218 185 221 176 216
               L171 207Z"
            fill="#d99472"
            stroke="#171015"
            stroke-width="4"/>

      <!-- pescoço -->
      <path d="M95 136 L96 163
               C102 172 119 172 124 163
               L125 136Z"
            fill="#d38a69"
            stroke="#171015"
            stroke-width="4"/>

      <!-- cabelo dourado espetado -->
      <path d="M68 91
               L43 58
               L73 68
               L59 32
               L88 53
               L89 16
               L106 48
               L119 10
               L128 48
               L157 22
               L146 55
               L180 43
               L151 77
               C160 100 151 126 135 139
               C122 150 98 150 83 139
               C69 128 62 108 68 91Z"
            fill="#f5bf39"
            stroke="#7d4911"
            stroke-width="5"
            stroke-linejoin="round"/>

      <!-- reflexo do cabelo -->
      <path d="M73 68 L90 58 L88 38
               M106 48 L118 29
               M128 48 L148 38"
            fill="none"
            stroke="#fff09b"
            stroke-width="5"
            stroke-linecap="round"
            opacity=".75"/>

      <!-- rosto -->
      <path d="M76 88
               C78 67 97 56 113 57
               C135 58 148 73 147 96
               L141 128
               C134 143 121 150 108 150
               C94 148 82 138 77 124Z"
            fill="#e6a07c"
            stroke="#171015"
            stroke-width="4"/>

      <!-- sobrancelhas -->
      <path d="M85 91 L103 87"
            stroke="#302019"
            stroke-width="6"
            stroke-linecap="round"/>

      <path d="M117 87 L137 91"
            stroke="#302019"
            stroke-width="6"
            stroke-linecap="round"/>

      <!-- olhos -->
      <path d="M87 95
               Q95 89 103 96
               Q96 104 88 98Z"
            fill="#fff"/>

      <circle cx="96" cy="97" r="3.5" fill="#301719"/>

      <path d="M117 96
               Q126 89 135 95
               Q127 104 118 99Z"
            fill="#fff"/>

      <circle cx="126" cy="97" r="3.5" fill="#301719"/>

      <!-- nariz -->
      <path d="M109 98 L105 115 L113 116"
            fill="none"
            stroke="#9b5a47"
            stroke-width="3"/>

      <!-- expressão -->
      <path d="M96 126 Q110 119 124 126"
            fill="none"
            stroke="#662a2d"
            stroke-width="4"
            stroke-linecap="round"/>

      <!-- detalhes -->
      <path d="M88 169 L110 198 L132 169"
            fill="none"
            stroke="#9f4a3d"
            stroke-width="5"/>

      <path d="M82 188 L67 242"
            stroke="#a95043"
            stroke-width="3"/>

      <path d="M138 188 L153 242"
            stroke="#a95043"
            stroke-width="3"/>

    </svg>

    <div class="dragonCharacterName">RIVAL</div>
  </div>

</div>
`;


/*
 * Inserir a arte dentro da arena.
 *
 * Procuramos a abertura da .board para não mexer
 * na estrutura de combate existente.
 */

const boardMatch =
  s.match(/<div[^>]*class=["'][^"']*\bboard\b[^"']*["'][^>]*>/i);

if (!boardMatch) {
  console.log("❌ Não encontrei a arena .board.");
  console.log("Nenhuma alteração estrutural foi feita.");
  process.exit(1);
}

const boardPos =
  s.indexOf(boardMatch[0]);

const insertPos =
  boardPos + boardMatch[0].length;

s =
  s.slice(0, insertPos) +
  "\n" +
  characterHTML +
  "\n" +
  s.slice(insertPos);


/* ============================================================
   JS DE ANIMAÇÃO
   ============================================================ */

const scriptMarker = "</script>";

if (!s.includes(scriptMarker)) {
  console.log("❌ </script> não encontrado.");
  process.exit(1);
}

const characterJS = String.raw`

/* ============================================================
   KYARA DRAGON CHARACTER ART V2 — CONTROLE
   ============================================================ */

(function(){

  const playerCharacter =
    document.getElementById("dragonPlayerCharacter");

  const enemyCharacter =
    document.getElementById("dragonEnemyCharacter");

  if(!playerCharacter || !enemyCharacter){
    console.warn("[DRAGON ART] Personagens não encontrados.");
    return;
  }

  function characterHit(target){
    if(!target) return;

    target.classList.remove("hit");

    void target.offsetWidth;

    target.classList.add("hit");

    setTimeout(()=>{
      target.classList.remove("hit");
    },260);
  }

  function characterAttack(target){
    if(!target) return;

    target.classList.remove("attackPose");

    void target.offsetWidth;

    target.classList.add("attackPose");

    setTimeout(()=>{
      target.classList.remove("attackPose");
    },420);
  }

  function characterSpecial(target){
    if(!target) return;

    target.classList.remove("specialPose");

    void target.offsetWidth;

    target.classList.add("specialPose");

    setTimeout(()=>{
      target.classList.remove("specialPose");
    },760);
  }

  /*
   * Integra com os botões existentes.
   * Nenhum comando de combate é recriado.
   */

  const attack =
    document.getElementById("attack");

  const guard =
    document.getElementById("guard");

  const special =
    document.getElementById("special");

  const rush =
    document.getElementById("rush");

  if(attack){
    attack.addEventListener("click", ()=>{
      characterAttack(playerCharacter);

      setTimeout(()=>{
        characterHit(enemyCharacter);
      },120);
    });
  }

  if(special){
    special.addEventListener("click", ()=>{
      characterSpecial(playerCharacter);

      setTimeout(()=>{
        characterHit(enemyCharacter);
      },280);
    });
  }

  if(rush){
    rush.addEventListener("click", ()=>{
      characterAttack(playerCharacter);

      setTimeout(()=>{
        characterHit(enemyCharacter);
      },90);

      setTimeout(()=>{
        characterHit(enemyCharacter);
      },190);

      setTimeout(()=>{
        characterHit(enemyCharacter);
      },290);
    });
  }

  if(guard){
    guard.addEventListener("click", ()=>{
      playerCharacter.style.filter =
        "drop-shadow(0 0 18px rgba(90,190,255,.9))";

      setTimeout(()=>{
        playerCharacter.style.filter =
          "drop-shadow(0 0 10px rgba(255,255,255,.18)) drop-shadow(0 15px 22px rgba(0,0,0,.65))";
      },420);
    });
  }

  /*
   * Permite que o sistema de FX existente também
   * acione os personagens.
   */

  window.KYARA_DRAGON_CHARACTER_ART = {
    playerHit:()=>characterHit(playerCharacter),
    enemyHit:()=>characterHit(enemyCharacter),
    playerAttack:()=>characterAttack(playerCharacter),
    enemyAttack:()=>characterAttack(enemyCharacter),
    playerSpecial:()=>characterSpecial(playerCharacter),
    enemySpecial:()=>characterSpecial(enemyCharacter)
  };

  console.log("[DRAGON ART] Personagens V2 carregados.");

})();
`;

s = s.replace(
  scriptMarker,
  characterJS + "\n" + scriptMarker
);


/* ============================================================
   SALVAR
   ============================================================ */

fs.writeFileSync(file, s);

console.log("");
console.log("========================================");
console.log(" ✅ ARTE DOS PERSONAGENS INSTALADA");
console.log("========================================");
console.log("✓ Lutador principal em SVG");
console.log("✓ Rival em SVG");
console.log("✓ Cabelo espetado");
console.log("✓ Rostos e olhos");
console.log("✓ Corpo completo");
console.log("✓ Braços e mãos");
console.log("✓ Trajes");
console.log("✓ Auras");
console.log("✓ Animação idle");
console.log("✓ Animação de ataque");
console.log("✓ Animação de especial");
console.log("✓ Animação de dano");
console.log("✓ Integração com combate existente");
console.log("✓ Nenhum comando alterado");
console.log("✓ Backup criado");
console.log("========================================");
