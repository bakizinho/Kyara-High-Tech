const fs = require("fs");

const file = "dados/src/games/richdragon.js";
let s = fs.readFileSync(file, "utf8");

console.log("========================================");
console.log(" KYARA DRAGON — BATTLE UI");
console.log("========================================");

if (!s.includes("const HTML = String.raw`")) {
  console.log("❌ String.raw não encontrado.");
  process.exit(1);
}

if (!s.includes("createHtmlGameCommand")) {
  console.log("❌ createHtmlGameCommand não encontrado.");
  process.exit(1);
}

if (s.includes("KYARA_DRAGON_BATTLE_UI_V2")) {
  console.log("⚠️ Battle UI já instalada.");
  process.exit(0);
}

/* =========================================================
 * 1. CSS
 * ========================================================= */

const css = `
<style id="KYARA_DRAGON_BATTLE_UI_V2">
#dragonBattleShell{
  position:relative;
  width:100%;
  min-height:100vh;
  overflow:hidden;
  background:
    radial-gradient(circle at 50% 18%,rgba(35,110,255,.30),transparent 35%),
    radial-gradient(circle at 18% 65%,rgba(0,145,255,.18),transparent 30%),
    radial-gradient(circle at 82% 65%,rgba(180,0,255,.18),transparent 30%),
    linear-gradient(180deg,#020817 0%,#06152e 48%,#020713 100%);
  color:#fff;
  font-family:Arial,Helvetica,sans-serif;
}

#dragonBattleShell *{
  box-sizing:border-box;
}

.dragonBattleTop{
  position:relative;
  z-index:20;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:10px 12px 4px;
}

.dragonFighterBox{
  width:40%;
  min-width:0;
}

.dragonFighterName{
  display:flex;
  align-items:center;
  gap:6px;
  font-size:14px;
  font-weight:900;
  letter-spacing:1px;
  text-transform:uppercase;
  margin-bottom:4px;
}

.dragonLevel{
  font-size:10px;
  opacity:.8;
  margin-left:4px;
}

.dragonAvatar{
  width:44px;
  height:44px;
  border-radius:50%;
  border:2px solid #168cff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:25px;
  background:
    radial-gradient(circle at 35% 25%,#fff,#55aaff 15%,#083d86 48%,#020817 75%);
  box-shadow:0 0 12px #168cff, inset 0 0 12px rgba(255,255,255,.3);
  overflow:hidden;
}

.dragonFighterBox.enemy .dragonAvatar{
  margin-left:auto;
  border-color:#b52cff;
  background:
    radial-gradient(circle at 65% 25%,#fff,#e37aff 15%,#5d087d 48%,#130018 75%);
  box-shadow:0 0 14px #b52cff,inset 0 0 12px rgba(255,255,255,.25);
}

.dragonBarWrap{
  display:flex;
  align-items:center;
  gap:5px;
}

.dragonBar{
  position:relative;
  height:14px;
  flex:1;
  border:1px solid rgba(0,180,255,.9);
  border-radius:9px;
  background:#03101f;
  overflow:hidden;
  box-shadow:0 0 8px rgba(0,150,255,.5);
}

.dragonBarFill{
  width:100%;
  height:100%;
  border-radius:8px;
  background:linear-gradient(90deg,#19c900,#aaff35,#22d900);
  box-shadow:0 0 9px rgba(70,255,0,.75);
  transition:width .2s ease;
}

.enemy .dragonBar{
  border-color:#ff3d8d;
  box-shadow:0 0 8px rgba(255,0,100,.5);
}

.enemy .dragonBarFill{
  background:linear-gradient(90deg,#ffbb00,#ff5a00,#ff1515);
  box-shadow:0 0 9px rgba(255,40,0,.75);
}

.dragonEnergy{
  margin-top:4px;
  height:7px;
  border-radius:6px;
  background:#061328;
  border:1px solid #168cff;
  overflow:hidden;
}

.dragonEnergyFill{
  width:72%;
  height:100%;
  background:linear-gradient(90deg,#006eff,#20d9ff,#4f8cff);
  box-shadow:0 0 8px #009cff;
}

.enemy .dragonEnergy{
  border-color:#8e28ff;
}

.enemy .dragonEnergyFill{
  background:linear-gradient(90deg,#651cff,#c93cff,#ff52f0);
  box-shadow:0 0 8px #b52cff;
}

.dragonVs{
  flex:0 0 auto;
  text-align:center;
  font-size:28px;
  font-weight:1000;
  font-style:italic;
  color:#fff;
  text-shadow:
    0 0 5px #fff,
    0 0 15px #ff6a00,
    2px 2px 0 #ff2300;
}

.dragonRound{
  font-size:10px;
  font-weight:900;
  color:#d8eaff;
  letter-spacing:1px;
  margin-top:2px;
}

.dragonArena{
  position:relative;
  min-height:430px;
  margin:4px 8px;
  border:1px solid rgba(0,154,255,.9);
  border-radius:18px;
  overflow:hidden;
  background:
    radial-gradient(circle at 50% 35%,rgba(255,255,255,.10),transparent 12%),
    radial-gradient(circle at 50% 0%,rgba(0,130,255,.28),transparent 45%),
    linear-gradient(180deg,#081f45 0%,#102c55 42%,#402e28 43%,#24170f 100%);
  box-shadow:
    inset 0 0 35px rgba(0,120,255,.30),
    0 0 20px rgba(0,130,255,.35);
}

.dragonSky{
  position:absolute;
  inset:0;
  pointer-events:none;
  background:
    radial-gradient(circle at 70% 18%,rgba(100,170,255,.8) 0 2px,transparent 3px),
    radial-gradient(circle at 25% 25%,rgba(150,210,255,.8) 0 2px,transparent 3px),
    radial-gradient(circle at 54% 12%,rgba(255,255,255,.7) 0 1px,transparent 2px);
  opacity:.75;
}

.dragonMoon{
  position:absolute;
  width:125px;
  height:125px;
  border-radius:50%;
  left:50%;
  top:42px;
  transform:translateX(-50%);
  background:radial-gradient(circle,#e7f5ff 0,#87c8ff 35%,#265aa0 68%,transparent 70%);
  opacity:.45;
  filter:blur(.2px);
  box-shadow:0 0 45px rgba(90,170,255,.65);
}

.dragonGround{
  position:absolute;
  left:-5%;
  right:-5%;
  bottom:-18%;
  height:42%;
  border-radius:50% 50% 0 0;
  background:
    radial-gradient(ellipse at center,#9d7654 0,#60432f 35%,#25170f 75%);
  border-top:2px solid rgba(255,196,116,.45);
  box-shadow:inset 0 18px 30px rgba(0,0,0,.35);
}

.dragonFighter{
  position:absolute;
  z-index:8;
  bottom:68px;
  width:38%;
  height:250px;
  display:flex;
  align-items:flex-end;
  justify-content:center;
  transition:transform .18s ease;
}

.dragonFighter.player{
  left:4%;
}

.dragonFighter.cpu{
  right:4%;
}

.dragonCharacter{
  position:relative;
  width:145px;
  height:205px;
  filter:drop-shadow(0 0 14px rgba(0,135,255,.85));
}

.cpu .dragonCharacter{
  filter:drop-shadow(0 0 15px rgba(190,30,255,.9));
  transform:scaleX(-1);
}

.dragonAura{
  position:absolute;
  left:50%;
  bottom:8px;
  width:150px;
  height:180px;
  transform:translateX(-50%);
  border-radius:50%;
  background:
    radial-gradient(ellipse at center bottom,
      rgba(0,160,255,.55),
      rgba(0,90,255,.20) 45%,
      transparent 70%);
  filter:blur(7px);
  animation:dragonAuraPulse 1.25s infinite alternate;
}

.cpu .dragonAura{
  background:
    radial-gradient(ellipse at center bottom,
      rgba(195,0,255,.55),
      rgba(115,0,255,.20) 45%,
      transparent 70%);
}

.dragonBody{
  position:absolute;
  left:50%;
  bottom:15px;
  width:62px;
  height:108px;
  transform:translateX(-50%);
  border-radius:42% 42% 30% 30%;
  background:linear-gradient(90deg,#c84b12,#ff8c24 42%,#d84a12);
  border:2px solid rgba(0,0,0,.7);
  box-shadow:inset 8px 0 12px rgba(255,255,255,.16);
}

.cpu .dragonBody{
  background:linear-gradient(90deg,#dcdde8,#fff 45%,#aaaabc);
}

.dragonHead{
  position:absolute;
  left:50%;
  top:24px;
  width:64px;
  height:66px;
  transform:translateX(-50%);
  border-radius:45% 45% 48% 48%;
  background:#f1bc91;
  border:2px solid #171717;
  z-index:3;
}

.cpu .dragonHead{
  background:#eeeef5;
}

.dragonHair{
  position:absolute;
  z-index:4;
  left:50%;
  top:7px;
  width:76px;
  height:57px;
  transform:translateX(-50%);
  clip-path:polygon(
    50% 0,62% 30%,78% 4%,76% 35%,
    100% 20%,84% 54%,98% 55%,68% 65%,
    58% 100%,47% 65%,25% 93%,30% 60%,
    0 72%,20% 42%,5% 30%,34% 32%
  );
  background:#05070d;
  box-shadow:0 0 9px rgba(0,120,255,.7);
}

.cpu .dragonHair{
  clip-path:polygon(10% 0,35% 15%,50% 0,68% 16%,92% 5%,100% 35%,75% 58%,50% 65%,25% 58%,0 35%);
  background:#8c79a9;
}

.dragonFace{
  position:absolute;
  z-index:5;
  left:50%;
  top:51px;
  transform:translateX(-50%);
  width:46px;
  height:24px;
}

.dragonEye{
  position:absolute;
  width:8px;
  height:5px;
  top:3px;
  border-radius:50%;
  background:#050505;
}

.dragonEye.a{left:5px}
.dragonEye.b{right:5px}

.dragonLeg{
  position:absolute;
  bottom:0;
  width:22px;
  height:76px;
  border-radius:16px;
  background:#151c2a;
  border:2px solid #05070c;
}

.dragonLeg.a{
  left:37px;
  transform:rotate(15deg);
}

.dragonLeg.b{
  right:37px;
  transform:rotate(-15deg);
}

.dragonBoot{
  position:absolute;
  bottom:-2px;
  width:38px;
  height:17px;
  border-radius:50%;
  background:#101522;
  border:2px solid #05070c;
}

.dragonLeg.a .dragonBoot{left:-13px}
.dragonLeg.b .dragonBoot{right:-13px}

.dragonArm{
  position:absolute;
  top:90px;
  width:22px;
  height:82px;
  border-radius:18px;
  background:#e79b6e;
  border:2px solid #111;
  z-index:2;
}

.dragonArm.a{
  left:14px;
  transform:rotate(35deg);
}

.dragonArm.b{
  right:14px;
  transform:rotate(-48deg);
}

.cpu .dragonArm{
  background:#dedee8;
}

.dragonHit{
  position:absolute;
  z-index:30;
  right:8%;
  top:70px;
  font-size:30px;
  font-weight:1000;
  font-style:italic;
  color:#ffb300;
  text-shadow:
    2px 2px 0 #7b1600,
    0 0 8px #ff4000;
  animation:dragonHitPop .65s ease-out;
}

.dragonStage{
  position:absolute;
  z-index:25;
  left:50%;
  top:82px;
  transform:translateX(-50%);
  padding:6px 15px;
  border:1px solid #159aff;
  border-radius:8px;
  background:rgba(0,14,35,.72);
  box-shadow:0 0 12px rgba(0,145,255,.5);
  text-align:center;
  font-size:10px;
  font-weight:900;
  letter-spacing:1px;
}

.dragonTimer{
  font-size:17px;
  color:#fff;
  margin-top:2px;
}

.dragonControls{
  position:relative;
  z-index:40;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  padding:6px 10px 12px;
}

.dragonJoystick{
  position:relative;
  flex:0 0 116px;
  width:116px;
  height:116px;
  border-radius:50%;
  border:2px solid #138dff;
  background:
    radial-gradient(circle,#1e86ff 0 24%,#0b2b5e 26% 43%,rgba(0,50,120,.5) 45% 68%,rgba(0,100,255,.12) 70%);
  box-shadow:0 0 18px rgba(0,125,255,.65),inset 0 0 20px rgba(0,100,255,.45);
}

.dragonJoystick:before,
.dragonJoystick:after{
  content:"";
  position:absolute;
  left:50%;
  top:50%;
  background:#59c7ff;
  box-shadow:0 0 8px #00aaff;
  transform:translate(-50%,-50%);
}

.dragonJoystick:before{
  width:78%;
  height:2px;
}

.dragonJoystick:after{
  width:2px;
  height:78%;
}

.dragonStick{
  position:absolute;
  left:50%;
  top:50%;
  width:45px;
  height:45px;
  border-radius:50%;
  transform:translate(-50%,-50%);
  background:radial-gradient(circle at 35% 30%,#6ad4ff,#187cff 48%,#06265c 75%);
  border:2px solid #67d5ff;
  box-shadow:0 0 15px #007cff;
}

.dragonActionGrid{
  flex:1;
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:7px;
  max-width:300px;
}

.dragonAction{
  min-height:54px;
  border-radius:12px;
  border:2px solid #158eff;
  color:#fff;
  font-weight:1000;
  letter-spacing:.5px;
  background:linear-gradient(180deg,#123a70,#06172e);
  box-shadow:0 0 9px rgba(0,125,255,.45),inset 0 0 12px rgba(0,120,255,.12);
}

.dragonAction.attack{
  border-color:#2dff39;
  box-shadow:0 0 10px rgba(40,255,50,.4);
}

.dragonAction.special{
  border-color:#c42dff;
  box-shadow:0 0 10px rgba(195,30,255,.45);
}

.dragonAction.rush{
  border-color:#ffb000;
  box-shadow:0 0 10px rgba(255,150,0,.45);
}

.dragonSide{
  position:absolute;
  z-index:50;
  right:8px;
  top:110px;
  display:flex;
  flex-direction:column;
  gap:7px;
}

.dragonSide button{
  width:42px;
  height:42px;
  border-radius:50%;
  border:2px solid #159aff;
  color:#fff;
  background:rgba(0,17,40,.82);
  font-size:18px;
  box-shadow:0 0 10px rgba(0,130,255,.5);
}

.dragonCardsTitle{
  text-align:center;
  font-size:10px;
  font-weight:900;
  color:#63caff;
  letter-spacing:1px;
  margin:0 0 4px;
}

.dragonCards{
  position:relative;
  z-index:35;
  display:flex;
  justify-content:center;
  gap:5px;
  padding:2px 7px 7px;
}

.dragonCardMini{
  width:58px;
  height:65px;
  border-radius:8px;
  border:1px solid #148eff;
  background:linear-gradient(145deg,#08172e,#12376d);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  color:#fff;
  font-size:9px;
  font-weight:900;
  box-shadow:0 0 7px rgba(0,130,255,.35);
}

.dragonCardMini.selected{
  transform:translateY(-4px);
  border-color:#ffe100;
  box-shadow:0 0 13px rgba(255,220,0,.7);
}

.dragonCardMini span{
  font-size:22px;
}

.dragonFooter{
  position:relative;
  z-index:30;
  display:flex;
  justify-content:space-between;
  padding:5px 12px;
  border-top:1px solid rgba(0,145,255,.6);
  font-size:11px;
  font-weight:800;
  color:#9bcfff;
}

@keyframes dragonAuraPulse{
  from{transform:translateX(-50%) scale(.92);opacity:.55}
  to{transform:translateX(-50%) scale(1.08);opacity:1}
}

@keyframes dragonHitPop{
  0%{transform:scale(.4);opacity:0}
  35%{transform:scale(1.25);opacity:1}
  100%{transform:scale(1);opacity:.95}
}

@media(max-width:600px){
  .dragonArena{
    min-height:360px;
  }

  .dragonFighter{
    bottom:52px;
    height:210px;
  }

  .dragonCharacter{
    transform:scale(.82);
  }

  .cpu .dragonCharacter{
    transform:scaleX(-1) scale(.82);
  }

  .dragonJoystick{
    width:94px;
    height:94px;
    flex-basis:94px;
  }

  .dragonAction{
    min-height:48px;
    font-size:11px;
  }

  .dragonAvatar{
    width:36px;
    height:36px;
    font-size:20px;
  }

  .dragonVs{
    font-size:22px;
  }
}
</style>
`;

const html = `
<div id="dragonBattleShell">

  <div class="dragonBattleTop">

    <div class="dragonFighterBox player">
      <div class="dragonFighterName">
        <div class="dragonAvatar">🥋</div>
        <div>
          GOKU
          <div class="dragonLevel">Lv. 15</div>
        </div>
      </div>

      <div class="dragonBarWrap">
        <div class="dragonBar">
          <div id="dragonPlayerHP" class="dragonBarFill"></div>
        </div>
        <b id="dragonPlayerHPText">850</b>
      </div>

      <div class="dragonEnergy">
        <div id="dragonPlayerEnergy" class="dragonEnergyFill"></div>
      </div>
    </div>

    <div class="dragonVs">
      VS
      <div class="dragonRound">
        ROUND <span id="dragonRoundNumber">1</span>
      </div>
    </div>

    <div class="dragonFighterBox enemy">
      <div class="dragonFighterName" style="justify-content:flex-end">
        <div>
          FREEZA
          <div class="dragonLevel">Lv. 14</div>
        </div>
        <div class="dragonAvatar">👽</div>
      </div>

      <div class="dragonBarWrap">
        <b id="dragonEnemyHPText">720</b>
        <div class="dragonBar">
          <div id="dragonEnemyHP" class="dragonBarFill"></div>
        </div>
      </div>

      <div class="dragonEnergy">
        <div id="dragonEnemyEnergy" class="dragonEnergyFill"></div>
      </div>
    </div>

  </div>

  <div class="dragonArena" id="dragonArenaVisual">

    <div class="dragonSky"></div>
    <div class="dragonMoon"></div>
    <div class="dragonGround"></div>

    <div class="dragonStage">
      STAGE 1-1
      <div class="dragonTimer" id="dragonBattleTimer">02:34</div>
    </div>

    <div class="dragonFighter player" id="dragonPlayerCharacter">
      <div class="dragonAura"></div>
      <div class="dragonCharacter">

        <div class="dragonHair"></div>
        <div class="dragonHead"></div>

        <div class="dragonFace">
          <div class="dragonEye a"></div>
          <div class="dragonEye b"></div>
        </div>

        <div class="dragonBody"></div>

        <div class="dragonArm a"></div>
        <div class="dragonArm b"></div>

        <div class="dragonLeg a">
          <div class="dragonBoot"></div>
        </div>

        <div class="dragonLeg b">
          <div class="dragonBoot"></div>
        </div>

      </div>
    </div>

    <div class="dragonFighter cpu" id="dragonEnemyCharacter">
      <div class="dragonAura"></div>
      <div class="dragonCharacter">

        <div class="dragonHair"></div>
        <div class="dragonHead"></div>

        <div class="dragonFace">
          <div class="dragonEye a"></div>
          <div class="dragonEye b"></div>
        </div>

        <div class="dragonBody"></div>

        <div class="dragonArm a"></div>
        <div class="dragonArm b"></div>

        <div class="dragonLeg a">
          <div class="dragonBoot"></div>
        </div>

        <div class="dragonLeg b">
          <div class="dragonBoot"></div>
        </div>

      </div>
    </div>

    <div id="dragonHitVisual" class="dragonHit" style="display:none">
      5 HITS!
    </div>

    <div class="dragonSide">
      <button id="dragonVisualFullscreen">⛶</button>
      <button id="dragonVisualPause">Ⅱ</button>
      <button id="dragonVisualSettings">⚙</button>
    </div>

  </div>

  <div class="dragonCardsTitle">
    SEUS CARDS
  </div>

  <div class="dragonCards">

    <button class="dragonCardMini selected" data-dragon-card="0">
      <span>🥋</span>
      GOKU
      <small>ATK +120</small>
    </button>

    <button class="dragonCardMini" data-dragon-card="1">
      <span>🛡️</span>
      VEGETA
      <small>DEF +100</small>
    </button>

    <button class="dragonCardMini" data-dragon-card="2">
      <span>💚</span>
      GOHAN
      <small>EN +90</small>
    </button>

    <button class="dragonCardMini" data-dragon-card="3">
      <span>👽</span>
      FREEZA
      <small>SP +140</small>
    </button>

    <button class="dragonCardMini" data-dragon-card="4">
      <span>🔥</span>
      BROLY
      <small>RUSH +160</small>
    </button>

  </div>

  <div class="dragonControls">

    <div class="dragonJoystick" id="dragonJoystickVisual">
      <div class="dragonStick"></div>
    </div>

    <div class="dragonActionGrid">

      <button class="dragonAction attack" id="dragonAttackVisual">
        👊 ATAQUE
      </button>

      <button class="dragonAction" id="dragonGuardVisual">
        🛡️ DEFESA
      </button>

      <button class="dragonAction special" id="dragonSpecialVisual">
        ✨ ESPECIAL
      </button>

      <button class="dragonAction rush" id="dragonRushVisual">
        🔥 RUSH
      </button>

    </div>

  </div>

  <div class="dragonFooter">
    <span>Pontos: <b id="dragonPointsVisual">0</b></span>
    <span>Recorde: <b id="dragonRecordVisual">0</b></span>
    <span>🐉 DRAGON BALL BATTLE</span>
  </div>

</div>
`;

const js = `
<script id="KYARA_DRAGON_BATTLE_JS_V2">
(function(){

  if(window.__KYARA_DRAGON_BATTLE_V2__) return;
  window.__KYARA_DRAGON_BATTLE_V2__ = true;

  var playerHp = 850;
  var enemyHp = 720;
  var maxPlayerHp = 850;
  var maxEnemyHp = 720;
  var playerEnergy = 72;
  var enemyEnergy = 68;
  var combo = 0;
  var points = 0;
  var record = 0;
  var seconds = 154;
  var paused = false;

  function byId(id){
    return document.getElementById(id);
  }

  function clamp(v,min,max){
    return Math.max(min,Math.min(max,v));
  }

  function updateBars(){

    var p = clamp(playerHp / maxPlayerHp * 100,0,100);
    var e = clamp(enemyHp / maxEnemyHp * 100,0,100);

    if(byId("dragonPlayerHP"))
      byId("dragonPlayerHP").style.width = p + "%";

    if(byId("dragonEnemyHP"))
      byId("dragonEnemyHP").style.width = e + "%";

    if(byId("dragonPlayerHPText"))
      byId("dragonPlayerHPText").textContent =
        Math.max(0,Math.round(playerHp));

    if(byId("dragonEnemyHPText"))
      byId("dragonEnemyHPText").textContent =
        Math.max(0,Math.round(enemyHp));

    if(byId("dragonPlayerEnergy"))
      byId("dragonPlayerEnergy").style.width =
        clamp(playerEnergy,0,100) + "%";

    if(byId("dragonEnemyEnergy"))
      byId("dragonEnemyEnergy").style.width =
        clamp(enemyEnergy,0,100) + "%";

    if(byId("dragonPointsVisual"))
      byId("dragonPointsVisual").textContent = points;

    if(byId("dragonRecordVisual"))
      byId("dragonRecordVisual").textContent = record;
  }

  function attackVisual(){

    if(paused) return;

    var damage = 20 + Math.floor(Math.random() * 22);

    combo++;
    points += damage + combo * 3;

    enemyHp -= damage;
    enemyEnergy -= 3;

    var fighter = byId("dragonPlayerCharacter");

    if(fighter){
      fighter.style.transform = "translateX(24px) scale(1.04)";

      setTimeout(function(){
        fighter.style.transform = "";
      },140);
    }

    var hit = byId("dragonHitVisual");

    if(hit){
      hit.textContent = combo + " HITS!";
      hit.style.display = "block";

      setTimeout(function(){
        hit.style.display = "none";
      },600);
    }

    if(enemyHp <= 0){
      enemyHp = maxEnemyHp;
      points += 500;
      combo = 0;
    }

    if(points > record)
      record = points;

    updateBars();
  }

  function guardVisual(){

    if(paused) return;

    playerEnergy = clamp(playerEnergy + 8,0,100);

    var fighter = byId("dragonPlayerCharacter");

    if(fighter){
      fighter.style.filter =
        "drop-shadow(0 0 22px rgba(0,220,255,1))";

      setTimeout(function(){
        fighter.style.filter = "";
      },260);
    }

    updateBars();
  }

  function specialVisual(){

    if(paused || playerEnergy < 20) return;

    playerEnergy -= 20;

    var damage = 55 + Math.floor(Math.random() * 40);

    enemyHp -= damage;
    points += damage * 2;

    var arena = byId("dragonArenaVisual");

    if(arena){
      arena.animate(
        [
          {filter:"brightness(1) saturate(1)"},
          {filter:"brightness(2.1) saturate(1.8)"},
          {filter:"brightness(1) saturate(1)"}
        ],
        {duration:420}
      );
    }

    if(enemyHp <= 0){
      enemyHp = maxEnemyHp;
      points += 800;
      combo = 0;
    }

    if(points > record)
      record = points;

    updateBars();
  }

  function rushVisual(){

    if(paused || playerEnergy < 35) return;

    playerEnergy -= 35;

    var damage =
      90 +
      Math.floor(Math.random() * 70) +
      combo * 4;

    enemyHp -= damage;

    combo += 3;
    points += damage * 3;

    var fighter = byId("dragonPlayerCharacter");

    if(fighter){

      fighter.style.transform =
        "translateX(55px) scale(1.08)";

      setTimeout(function(){
        fighter.style.transform = "";
      },260);
    }

    if(enemyHp <= 0){
      enemyHp = maxEnemyHp;
      points += 1200;
      combo = 0;
    }

    if(points > record)
      record = points;

    updateBars();
  }

  function togglePause(){

    paused = !paused;

    var btn = byId("dragonVisualPause");

    if(btn)
      btn.textContent = paused ? "▶" : "Ⅱ";
  }

  function fullscreen(){

    var target = byId("dragonBattleShell");

    if(!target) return;

    try{

      if(document.fullscreenElement){
        document.exitFullscreen();
        return;
      }

      if(target.requestFullscreen){
        target.requestFullscreen();
        return;
      }

      target.classList.toggle("dragonForceFullscreen");

    }catch(e){

      target.classList.toggle("dragonForceFullscreen");

    }
  }

  function timerLoop(){

    if(paused) return;

    seconds--;

    if(seconds < 0)
      seconds = 0;

    var min = Math.floor(seconds / 60);
    var sec = seconds % 60;

    var timer = byId("dragonBattleTimer");

    if(timer){
      timer.textContent =
        String(min).padStart(2,"0") +
        ":" +
        String(sec).padStart(2,"0");
    }
  }

  function cardSelect(){

    var cards =
      document.querySelectorAll(
        "[data-dragon-card]"
      );

    cards.forEach(function(card){

      card.addEventListener(
        "click",
        function(){

          cards.forEach(function(x){
            x.classList.remove("selected");
          });

          card.classList.add("selected");

          var index =
            Number(
              card.getAttribute(
                "data-dragon-card"
              )
            );

          if(index === 0)
            playerEnergy = clamp(playerEnergy + 10,0,100);

          if(index === 1)
            playerHp = clamp(playerHp + 45,0,maxPlayerHp);

          if(index === 2)
            playerEnergy = 100;

          if(index === 3)
            points += 100;

          if(index === 4)
            combo += 2;

          updateBars();
        }
      );

    });
  }

  var attack = byId("dragonAttackVisual");
  var guard = byId("dragonGuardVisual");
  var special = byId("dragonSpecialVisual");
  var rush = byId("dragonRushVisual");
  var pause = byId("dragonVisualPause");
  var full = byId("dragonVisualFullscreen");

  if(attack)
    attack.addEventListener("click",attackVisual);

  if(guard)
    guard.addEventListener("click",guardVisual);

  if(special)
    special.addEventListener("click",specialVisual);

  if(rush)
    rush.addEventListener("click",rushVisual);

  if(pause)
    pause.addEventListener("click",togglePause);

  if(full)
    full.addEventListener("click",fullscreen);

  cardSelect();
  updateBars();

  setInterval(timerLoop,1000);

})();
</script>
`;

/* =========================================================
 * 2. Inserir CSS dentro do HTML
 * ========================================================= */

const styleEnd = s.indexOf("</style>");

if(styleEnd === -1){
  console.log("❌ </style> não encontrado.");
  process.exit(1);
}

s =
  s.slice(0,styleEnd) +
  css +
  s.slice(styleEnd);

/* =========================================================
 * 3. Inserir interface antes do primeiro script
 * ========================================================= */

const scriptStart = s.indexOf("<script>");

if(scriptStart === -1){
  console.log("❌ <script> não encontrado.");
  process.exit(1);
}

s =
  s.slice(0,scriptStart) +
  html +
  "\n" +
  s.slice(scriptStart);

/* =========================================================
 * 4. Inserir JS da nova UI antes do script existente
 * ========================================================= */

const secondScriptStart =
  s.indexOf("<script>",scriptStart + html.length);

if(secondScriptStart === -1){
  console.log("❌ Segundo <script> não encontrado.");
  process.exit(1);
}

s =
  s.slice(0,secondScriptStart) +
  js +
  "\n" +
  s.slice(secondScriptStart);

fs.writeFileSync(file,s);

console.log("");
console.log("========================================");
console.log(" ✅ BATTLE UI INSTALADA");
console.log("========================================");
console.log("✅ HUD Goku");
console.log("✅ HUD Freeza");
console.log("✅ VS");
console.log("✅ ROUND");
console.log("✅ HP");
console.log("✅ Energia");
console.log("✅ Timer");
console.log("✅ Arena");
console.log("✅ Personagens");
console.log("✅ Joystick");
console.log("✅ Ataque");
console.log("✅ Defesa");
console.log("✅ Especial");
console.log("✅ Rush");
console.log("✅ Cards");
console.log("✅ Pause");
console.log("✅ Fullscreen");
console.log("========================================");
