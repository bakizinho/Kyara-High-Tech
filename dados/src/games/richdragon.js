import { createHtmlGameCommand } from "./_htmlGameCommand.js";

const name = "richdragon";
const commands = ["richdragon"];

const HTML = String.raw`
<style>

*{
 box-sizing:border-box;
 margin:0;
 padding:0;
 -webkit-tap-highlight-color:transparent;
 -webkit-user-select:none;
 user-select:none;
}

html,
body{
 width:100%;
 height:100%;
 overflow:hidden;
 background:#02040a;
 color:#fff;
 font-family:Arial,sans-serif;
}

body{
 touch-action:none;
}

#game{
 position:fixed;
 inset:0;
 width:100vw;
 height:100dvh;
 overflow:hidden;
 background:
 radial-gradient(
   circle at 50% 35%,
   #17396b 0%,
   #0b162b 38%,
   #03050b 100%
 );
}

canvas{
 position:absolute;
 inset:0;
 width:100%;
 height:100%;
 display:block;
}

#hud{
 position:absolute;
 inset:0;
 pointer-events:none;
 z-index:3;
}

.top{
 position:absolute;
 top:calc(8px + env(safe-area-inset-top));
 left:10px;
 right:10px;

 display:flex;
 align-items:flex-start;
 justify-content:space-between;
 gap:8px;
}

.fighter{
 width:42%;
}

.fighter.right{
 text-align:right;
}

.fighterName{
 font-size:13px;
 font-weight:900;
 text-shadow:0 2px 5px #000;
 margin-bottom:4px;
}

.level{
 font-size:9px;
 opacity:.65;
 margin-left:5px;
}

.hp{
 width:100%;
 height:18px;
 background:#07090d;
 border:2px solid #fff;
 border-radius:20px;
 overflow:hidden;
 box-shadow:0 0 10px #000;
}

.hpFill{
 width:100%;
 height:100%;
 background:
 linear-gradient(
   90deg,
   #22d65c,
   #a5ffbd
 );
 transition:width .12s linear;
}

.right .hpFill{
 background:
 linear-gradient(
   90deg,
   #ff4c4c,
   #ffaaa0
 );
}

.energy{
 margin-top:4px;
 width:80%;
 height:8px;
 border-radius:10px;
 background:#080b12;
 border:1px solid #789;
 overflow:hidden;
}

.right .energy{
 margin-left:auto;
}

.energyFill{
 height:100%;
 width:0%;
 background:
 linear-gradient(
   90deg,
   #2ca7ff,
   #d8f5ff
 );
}

.center{
 position:absolute;
 left:50%;
 top:5px;
 transform:translateX(-50%);
 text-align:center;
}

.stage{
 font-size:9px;
 letter-spacing:2px;
 opacity:.7;
}

.timer{
 font:bold 23px monospace;
 text-shadow:0 2px 6px #000;
}

#combo{
 position:absolute;
 top:22%;
 right:7%;
 font-size:30px;
 font-weight:1000;
 color:#ffe84e;
 text-shadow:
   0 0 8px #ff7200,
   3px 3px 0 #000;
 transform:rotate(-4deg);
}

#damageLayer{
 position:absolute;
 inset:0;
 pointer-events:none;
 z-index:8;
}

.damage{
 position:absolute;
 font-size:27px;
 font-weight:1000;
 color:#fff;
 text-shadow:
  0 3px 5px #000,
  0 0 8px #ff6a00;
 animation:damage .65s ease-out forwards;
}

@keyframes damage{

 0%{
  opacity:1;
  transform:translateY(0) scale(.6);
 }

 100%{
  opacity:0;
  transform:translateY(-90px) scale(1.3);
 }

}

#controls{
 position:absolute;
 left:0;
 right:0;
 bottom:
 calc(10px + env(safe-area-inset-bottom));

 z-index:6;

 display:grid;
 grid-template-columns:
   repeat(4,1fr);

 gap:7px;

 padding:8px;
}

.control{
 min-height:64px;

 border-radius:17px;

 color:#fff;

 background:
 linear-gradient(
   180deg,
   #172235,
   #080c15
 );

 border:1px solid #ffffff44;

 box-shadow:
   0 7px 18px #000b,
   inset 0 1px #ffffff18;

 font-size:11px;
 font-weight:900;
}

.control:active{
 transform:scale(.93);
}

.attack{
 border-color:#36ed70;
}

.guard{
 border-color:#3ca9ff;
}

.special{
 border-color:#e96cff;
}

.rush{
 border-color:#ff4b4b;
}

#energyText{
 position:absolute;
 left:12px;
 bottom:
 calc(88px + env(safe-area-inset-bottom));

 font-size:9px;
 opacity:.7;
}

#flash{
 position:absolute;
 inset:0;
 background:#fff;
 opacity:0;
 pointer-events:none;
 z-index:9;
}

#menu{
 position:absolute;
 inset:0;
 z-index:20;

 display:flex;
 align-items:center;
 justify-content:center;

 padding:20px;

 background:
 rgba(2,5,12,.88);

 backdrop-filter:blur(9px);
}

.panel{
 width:min(92vw,430px);

 padding:26px 20px;

 border-radius:25px;

 background:
 linear-gradient(
   145deg,
   #111d31f2,
   #060a13f5
 );

 border:1px solid #ffffff28;

 box-shadow:
   0 25px 80px #000;

 text-align:center;
}

.logo{
 font-size:48px;
 margin-bottom:6px;
}

h1{
 font-size:25px;
 margin-bottom:7px;
}

.subtitle{
 font-size:12px;
 line-height:1.5;
 color:#9faec3;
 margin-bottom:18px;
}

.menuButton{
 width:100%;
 min-height:52px;

 margin-top:8px;

 border:1px solid #ffffff30;
 border-radius:14px;

 color:#fff;
 background:#17243a;

 font-weight:bold;
}

.menuButton.primary{
 background:
 linear-gradient(
   135deg,
   #315fff,
   #7b32d9
 );
}

.hidden{
 display:none!important;
}

#fullscreenButton{
 position:absolute;
 right:10px;

 bottom:
 calc(90px + env(safe-area-inset-bottom));

 z-index:7;

 width:45px;
 height:45px;

 border-radius:50%;

 background:#09111eee;
 color:#fff;

 border:1px solid #ffffff40;

 font-size:20px;
}


.dragonCards{
 display:flex;
 gap:7px;
 overflow-x:auto;
 padding:8px 2px 4px;
 scrollbar-width:none;
}

.dragonCards::-webkit-scrollbar{
 display:none;
}

.dragonCard{
 flex:1 0 72px;
 min-width:72px;
 min-height:76px;
 border:1px solid rgba(255,255,255,.12);
 border-radius:11px;
 background:rgba(255,255,255,.055);
 color:#fff;
 padding:7px 4px;
 text-align:center;
 transition:
  transform .12s ease,
  border-color .12s ease,
  background .12s ease;
}

.dragonCard:active{
 transform:scale(.94);
}

.dragonCard.selected{
 border-color:rgba(150,120,255,.95);
 background:rgba(110,80,220,.25);
 box-shadow:
  0 0 14px rgba(120,90,255,.25);
}

.dragonCardIcon{
 font-size:22px;
 line-height:25px;
}

.dragonCardName{
 font-size:8px;
 font-weight:bold;
 letter-spacing:.4px;
 margin-top:3px;
 white-space:nowrap;
}

.dragonCardStats{
 font-size:7px;
 color:rgba(255,255,255,.48);
 margin-top:3px;
 line-height:10px;
}

.cardsTitle{
 font-size:8px;
 letter-spacing:1.2px;
 color:rgba(255,255,255,.4);
 text-align:center;
 margin-top:8px;
 margin-bottom:2px;
}


/* KYARA DRAGON 7D VISUAL */

html,body{
  background:
    radial-gradient(circle at 50% 15%,#174d9b 0%,#07152d 38%,#020611 78%);
  color:#fff;
}

body{
  overflow-x:hidden;
}

.wrap{
  width:100%;
  max-width:1280px;
  margin:auto;
  padding:8px;
}

.card{
  position:relative;
  background:
    linear-gradient(
      180deg,
      rgba(7,22,43,.98),
      rgba(2,8,20,.99)
    );
  border:1px solid rgba(44,145,255,.55);
  border-radius:20px;
  overflow:hidden;
  box-shadow:
    0 0 0 1px rgba(0,100,255,.15),
    0 0 35px rgba(0,80,255,.22),
    0 18px 55px rgba(0,0,0,.75);
}

/* HEADER */

.head{
  min-height:72px;
  padding:10px 16px;
  background:
    linear-gradient(
      90deg,
      rgba(7,23,43,.98),
      rgba(12,31,56,.94)
    );
  border-bottom:1px solid rgba(70,157,255,.28);
  position:relative;
  z-index:50;
}

.brand{
  color:#8fb8e8;
  font-size:9px;
  letter-spacing:2px;
}

.title{
  font-size:20px;
  font-weight:900;
  letter-spacing:.5px;
  text-shadow:
    0 0 12px rgba(80,170,255,.45);
}

.stats{
  gap:20px;
}

.value{
  font-size:17px;
}

/* MAIN */

.main{
  padding:10px;
  background:
    radial-gradient(
      ellipse at 50% 0%,
      rgba(0,110,255,.16),
      transparent 55%
    );
}

/* ARENA */

.board{
  position:relative;
  min-height:520px;
  border-radius:18px;
  overflow:hidden;
  border:1px solid rgba(30,143,255,.65);

  background:
    radial-gradient(
      circle at 50% 25%,
      rgba(56,132,255,.35),
      transparent 22%
    ),
    radial-gradient(
      circle at 76% 32%,
      rgba(112,75,255,.25),
      transparent 25%
    ),
    linear-gradient(
      180deg,
      #071735 0%,
      #0a1d3e 38%,
      #111b36 62%,
      #171a27 78%,
      #080b12 100%
    );

  box-shadow:
    inset 0 0 70px rgba(0,0,0,.72),
    0 0 30px rgba(0,105,255,.22);
}

/* céu */

.board::before{
  content:"";
  position:absolute;
  z-index:0;
  width:180px;
  height:180px;
  left:50%;
  top:48px;
  transform:translateX(-50%);

  border-radius:50%;

  background:
    radial-gradient(
      circle at 35% 30%,
      #9bd4ff 0%,
      #397bd4 24%,
      #142e70 58%,
      #07132e 78%
    );

  box-shadow:
    0 0 35px rgba(69,157,255,.55),
    0 0 90px rgba(36,105,255,.25);
}

/* estrelas */

.board::after{
  content:"";
  position:absolute;
  z-index:0;
  inset:0;

  background-image:
    radial-gradient(circle,rgba(255,255,255,.9) 1px,transparent 2px),
    radial-gradient(circle,rgba(80,170,255,.65) 1px,transparent 2px);

  background-size:
    73px 67px,
    113px 91px;

  opacity:.38;
  pointer-events:none;
}

/* canvas */

.board canvas{
  position:relative;
  z-index:3;
  width:100%;
  min-height:500px;
  display:block;

  background:
    linear-gradient(
      180deg,
      transparent 48%,
      rgba(30,48,65,.22) 49%,
      rgba(9,13,20,.55) 100%
    );

  border-radius:16px;
}

/* PEDRAS DO CENÁRIO */

.board .arena-rocks{
  position:absolute;
  z-index:1;
  left:0;
  right:0;
  bottom:0;
  height:45%;

  background:
    linear-gradient(
      165deg,
      transparent 0 10%,
      rgba(73,81,105,.38) 11% 13%,
      transparent 14% 20%,
      rgba(39,47,65,.8) 21% 28%,
      transparent 29% 35%,
      rgba(60,65,82,.7) 36% 43%,
      transparent 44%
    ),
    linear-gradient(
      180deg,
      rgba(25,31,45,.1),
      rgba(3,6,12,.9)
    );

  pointer-events:none;
}

/* HUD SUPERIOR */

.dragonHUD{
  position:absolute;
  z-index:20;
  top:10px;
  left:10px;
  right:10px;

  display:grid;
  grid-template-columns:minmax(0,1fr) 150px minmax(0,1fr);
  gap:10px;
  align-items:start;
  pointer-events:none;
}

.fighterHUD{
  min-width:0;
  padding:8px 10px;

  background:
    linear-gradient(
      180deg,
      rgba(5,19,39,.92),
      rgba(4,10,23,.84)
    );

  border:1px solid rgba(78,157,255,.48);
  border-radius:12px;

  box-shadow:
    0 7px 20px rgba(0,0,0,.48),
    inset 0 0 15px rgba(0,105,255,.08);
}

.fighterHUD.enemy{
  text-align:right;
  border-color:rgba(255,55,95,.5);
}

.fighterName{
  font-size:15px;
  font-weight:1000;
  letter-spacing:.5px;
  color:#fff;
  text-shadow:0 2px 5px #000;
}

.fighterLevel{
  display:inline-block;
  margin-top:3px;
  padding:2px 8px;

  border-radius:6px;

  background:#071b39;
  border:1px solid #268cff;

  font-size:9px;
  font-weight:900;
  color:#b8dcff;
}

.enemy .fighterLevel{
  border-color:#ff315e;
  color:#ffc0cb;
}

.barLabel{
  display:flex;
  justify-content:space-between;
  margin-top:7px;

  font-size:9px;
  font-weight:900;
}

.powerBar{
  height:13px;
  margin-top:3px;

  overflow:hidden;

  border-radius:8px;
  background:#05080d;

  border:1px solid rgba(255,255,255,.2);

  box-shadow:
    inset 0 2px 5px #000;
}

.powerFill{
  height:100%;
  width:100%;

  border-radius:7px;

  background:
    linear-gradient(
      90deg,
      #16c933,
      #8cff27,
      #24ef41
    );

  box-shadow:
    0 0 10px rgba(54,255,55,.8);
}

.energyFill{
  height:100%;
  width:100%;

  border-radius:7px;

  background:
    linear-gradient(
      90deg,
      #008cff,
      #35d8ff,
      #1474ff
    );

  box-shadow:
    0 0 10px rgba(30,150,255,.75);
}

.enemy .powerFill{
  background:
    linear-gradient(
      90deg,
      #ff7a17,
      #ff3b27,
      #ff174f
    );

  box-shadow:
    0 0 10px rgba(255,45,50,.8);
}

.enemy .energyFill{
  background:
    linear-gradient(
      90deg,
      #4b1cff,
      #a94cff,
      #6930ff
    );

  box-shadow:
    0 0 10px rgba(133,60,255,.8);
}

/* VS */

.dragonVS{
  text-align:center;
  padding-top:15px;

  filter:
    drop-shadow(0 5px 10px rgba(0,0,0,.75));
}

.dragonVS strong{
  display:block;

  font-size:52px;
  line-height:.85;
  font-style:italic;
  font-weight:1000;

  color:#ffef8b;

  -webkit-text-stroke:2px #ff3c12;

  text-shadow:
    3px 3px 0 #8c1705,
    0 0 15px #ff6500,
    0 0 30px rgba(255,100,0,.55);
}

.stageBadge{
  margin-top:8px;
  padding:8px 12px;

  border-radius:9px;

  background:
    linear-gradient(
      180deg,
      #102744,
      #06101e
    );

  border:1px solid #1f78ca;

  font-size:11px;
  font-weight:1000;
  letter-spacing:.7px;

  box-shadow:
    0 5px 15px rgba(0,0,0,.45);
}

.stageBadge span{
  display:block;
  margin-top:2px;
  font-size:9px;
  color:#a8c4df;
}

/* COMBO */

.dragonCombo{
  position:absolute;
  z-index:22;
  right:20px;
  top:180px;

  transform:skew(-8deg);

  text-align:center;

  color:#fff;
  font-weight:1000;

  text-shadow:
    3px 3px 0 #9b1300,
    0 0 15px #ff6500;

  pointer-events:none;
}

.dragonCombo b{
  display:block;
  font-size:58px;
  line-height:.75;
  color:#ffd337;
  -webkit-text-stroke:2px #ff3813;
}

.dragonCombo span{
  display:block;
  font-size:17px;
  color:#fff;
}

/* JOYSTICK */

.dragonJoystick{
  position:absolute;
  z-index:25;
  left:18px;
  bottom:115px;

  width:130px;
  height:130px;

  border-radius:50%;

  background:
    radial-gradient(
      circle,
      rgba(38,111,210,.35),
      rgba(2,18,42,.75) 65%,
      rgba(0,100,255,.28)
    );

  border:2px solid rgba(28,143,255,.8);

  box-shadow:
    0 0 20px rgba(0,125,255,.5),
    inset 0 0 25px rgba(0,100,255,.25);
}

.dragonJoystick::before{
  content:"";
  position:absolute;
  left:50%;
  top:50%;

  width:58px;
  height:58px;

  transform:translate(-50%,-50%);

  border-radius:50%;

  background:
    radial-gradient(
      circle at 35% 30%,
      #e8f5ff,
      #7caeff 38%,
      #2356aa 72%,
      #0a214c
    );

  border:2px solid #72b9ff;

  box-shadow:
    0 0 18px #238dff,
    inset 0 4px 9px rgba(255,255,255,.35);
}

.joyArrow{
  position:absolute;
  color:#8fcaff;
  font-size:17px;
  font-weight:1000;
  text-shadow:0 0 7px #1688ff;
}

.joyUp{top:7px;left:50%;transform:translateX(-50%)}
.joyDown{bottom:7px;left:50%;transform:translateX(-50%)}
.joyLeft{left:8px;top:50%;transform:translateY(-50%)}
.joyRight{right:8px;top:50%;transform:translateY(-50%)}

/* BOTÕES LATERAIS */

.dragonSideControls{
  position:absolute;
  z-index:30;
  right:14px;
  bottom:120px;

  display:flex;
  flex-direction:column;
  gap:8px;
}

.dragonCircleButton{
  width:52px;
  height:52px;

  border-radius:50%;

  border:2px solid #1489ff;

  background:
    radial-gradient(
      circle,
      rgba(18,85,160,.85),
      rgba(3,17,38,.95)
    );

  color:#d9edff;
  font-size:20px;

  box-shadow:
    0 0 12px rgba(0,120,255,.45);

  display:flex;
  align-items:center;
  justify-content:center;
}

/* PAINEL DE ATAQUES */

.dragonActions{
  position:relative;
  z-index:40;

  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:10px;

  margin-top:10px;
  padding:9px;

  border-radius:17px;

  background:
    linear-gradient(
      180deg,
      rgba(4,18,38,.98),
      rgba(2,8,18,.99)
    );

  border:1px solid rgba(38,139,255,.52);

  box-shadow:
    0 8px 30px rgba(0,0,0,.6);
}

.dragonAction{
  min-height:78px;

  border-radius:13px;

  color:#fff;

  font-weight:1000;
  font-size:14px;

  border:2px solid rgba(255,255,255,.22);

  background:#091321;

  box-shadow:
    inset 0 0 18px rgba(255,255,255,.04),
    0 5px 12px rgba(0,0,0,.45);

  transition:
    transform .08s ease,
    filter .08s ease;
}

.dragonAction:active{
  transform:scale(.96);
  filter:brightness(1.35);
}

.dragonAction.attack{
  border-color:#36ef55;
  background:
    linear-gradient(
      180deg,
      rgba(8,120,42,.95),
      rgba(2,43,19,.98)
    );
  box-shadow:
    0 0 14px rgba(42,255,75,.3),
    inset 0 0 20px rgba(40,255,80,.12);
}

.dragonAction.guard{
  border-color:#2297ff;
  background:
    linear-gradient(
      180deg,
      rgba(12,76,171,.95),
      rgba(3,26,65,.98)
    );
}

.dragonAction.special{
  border-color:#d04cff;
  background:
    linear-gradient(
      180deg,
      rgba(112,21,184,.95),
      rgba(37,5,72,.98)
    );
  box-shadow:
    0 0 16px rgba(190,45,255,.35);
}

.dragonAction.rush{
  border-color:#ff304e;
  background:
    linear-gradient(
      180deg,
      rgba(184,20,42,.95),
      rgba(70,5,15,.98)
    );
  box-shadow:
    0 0 16px rgba(255,35,55,.35);
}

.actionIcon{
  display:block;
  font-size:28px;
  line-height:1;
  margin-bottom:5px;
}

.actionText{
  display:block;
  font-size:13px;
  letter-spacing:.5px;
}

/* CARTAS */

.cardsTitle{
  position:relative;
  z-index:41;

  margin-top:8px;

  color:#9bcaff;
  font-size:9px;
  font-weight:1000;
  letter-spacing:1.5px;
}

.dragonCards{
  position:relative;
  z-index:41;

  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:8px;

  padding:7px 0 2px;
}

.dragonCard{
  min-height:68px;

  border-radius:10px;

  background:
    linear-gradient(
      145deg,
      #17283e,
      #050b15
    );

  border:1px solid rgba(87,157,226,.42);

  box-shadow:
    0 5px 12px rgba(0,0,0,.5);

  color:#fff;
}

.dragonCard.selected{
  border:2px solid #22aaff;

  box-shadow:
    0 0 12px rgba(0,153,255,.75),
    inset 0 0 14px rgba(0,130,255,.18);

  transform:translateY(-2px);
}

.dragonCardIcon{
  font-size:22px;
}

.dragonCardName{
  font-size:8px;
  font-weight:1000;
  margin-top:3px;
}

.dragonCardStats{
  font-size:7px;
  color:#82bfff;
  margin-top:3px;
}

/* STATUS */

.status{
  position:relative;
  z-index:45;

  padding:7px 10px;

  border-radius:9px;

  background:rgba(1,8,18,.72);
  border:1px solid rgba(39,130,218,.28);

  color:#8fb0cf;

  font-size:9px;
}

/* OVERLAY */

.overlay{
  z-index:100;

  background:
    radial-gradient(
      circle at 50% 40%,
      rgba(18,84,170,.3),
      rgba(1,6,15,.94)
    );

  backdrop-filter:blur(8px);
}

.overlay .panel{
  width:min(92%,430px);

  border-radius:18px;

  background:
    linear-gradient(
      180deg,
      rgba(9,30,57,.98),
      rgba(2,10,23,.99)
    );

  border:1px solid #258cff;

  box-shadow:
    0 0 35px rgba(0,105,255,.4),
    0 25px 70px rgba(0,0,0,.75);
}

/* MOBILE */

@media(max-width:720px){

  .wrap{
    padding:3px;
  }

  .head{
    min-height:58px;
    padding:7px 10px;
  }

  .title{
    font-size:14px;
  }

  .board{
    min-height:430px;
  }

  .board canvas{
    min-height:410px;
  }

  .dragonHUD{
    grid-template-columns:minmax(0,1fr) 72px minmax(0,1fr);
    gap:4px;
    top:5px;
    left:5px;
    right:5px;
  }

  .fighterHUD{
    padding:5px;
  }

  .fighterName{
    font-size:11px;
  }

  .barLabel{
    font-size:7px;
  }

  .powerBar{
    height:9px;
  }

  .dragonVS strong{
    font-size:32px;
  }

  .stageBadge{
    padding:5px 4px;
    font-size:7px;
  }

  .stageBadge span{
    font-size:6px;
  }

  .dragonCombo{
    right:9px;
    top:145px;
  }

  .dragonCombo b{
    font-size:40px;
  }

  .dragonCombo span{
    font-size:12px;
  }

  .dragonJoystick{
    width:94px;
    height:94px;
    left:8px;
    bottom:100px;
  }

  .dragonJoystick::before{
    width:42px;
    height:42px;
  }

  .dragonSideControls{
    right:7px;
    bottom:100px;
  }

  .dragonCircleButton{
    width:42px;
    height:42px;
    font-size:16px;
  }

  .dragonActions{
    gap:5px;
    padding:5px;
  }

  .dragonAction{
    min-height:64px;
    font-size:9px;
  }

  .actionIcon{
    font-size:21px;
  }

  .actionText{
    font-size:9px;
  }

  .dragonCards{
    gap:4px;
  }

  .dragonCard{
    min-height:56px;
  }

  .dragonCardIcon{
    font-size:17px;
  }

  .dragonCardName{
    font-size:7px;
  }

  .dragonCardStats{
    font-size:6px;
  }
}


/* KYARA DRAGON 7E POLISH */

.dragonHUD,
.dragonCombo,
.dragonJoystick,
.dragonSideControls,
.dragonActions,
.dragonCards,
.cardsTitle{
  animation:dragonUIIn .45s ease both;
}

@keyframes dragonUIIn{
  from{
    opacity:0;
    transform:translateY(8px);
  }
  to{
    opacity:1;
    transform:translateY(0);
  }
}

/* brilho vivo da arena */

.board{
  isolation:isolate;
}

.board::before{
  animation:
    dragonPlanetPulse 5s ease-in-out infinite;
}

@keyframes dragonPlanetPulse{
  0%,100%{
    filter:brightness(.9);
    transform:translateX(-50%) scale(1);
  }
  50%{
    filter:brightness(1.2);
    transform:translateX(-50%) scale(1.035);
  }
}

/* linha de energia sobre a arena */

.board .dragonEnergyLine{
  position:absolute;
  z-index:4;
  left:8%;
  right:8%;
  bottom:27%;
  height:2px;

  background:
    linear-gradient(
      90deg,
      transparent,
      rgba(44,153,255,.7),
      rgba(255,255,255,.9),
      rgba(44,153,255,.7),
      transparent
    );

  box-shadow:
    0 0 10px rgba(40,150,255,.75);

  opacity:.55;
  pointer-events:none;
}

/* aura inferior */

.board .dragonGroundGlow{
  position:absolute;
  z-index:2;

  left:10%;
  right:10%;
  bottom:9%;

  height:100px;

  border-radius:50%;

  background:
    radial-gradient(
      ellipse,
      rgba(35,125,255,.28),
      rgba(80,35,255,.12),
      transparent 70%
    );

  filter:blur(10px);
  pointer-events:none;
}

/* animação dos ataques */

.dragonAction{
  position:relative;
  overflow:hidden;
}

.dragonAction::after{
  content:"";
  position:absolute;

  top:-80%;
  left:-100%;

  width:55%;
  height:260%;

  transform:rotate(25deg);

  background:
    linear-gradient(
      90deg,
      transparent,
      rgba(255,255,255,.25),
      transparent
    );

  transition:left .55s ease;
}

.dragonAction:hover::after{
  left:150%;
}

.dragonAction:active{
  transform:scale(.94);
}

/* energia passando nos botões */

.dragonAction.attack{
  animation:greenPulse 2.6s ease-in-out infinite;
}

.dragonAction.special{
  animation:purplePulse 2.8s ease-in-out infinite;
}

.dragonAction.rush{
  animation:redPulse 2.4s ease-in-out infinite;
}

@keyframes greenPulse{
  0%,100%{
    box-shadow:
      0 0 8px rgba(42,255,75,.18),
      inset 0 0 15px rgba(40,255,80,.08);
  }
  50%{
    box-shadow:
      0 0 20px rgba(42,255,75,.5),
      inset 0 0 25px rgba(40,255,80,.18);
  }
}

@keyframes purplePulse{
  0%,100%{
    box-shadow:
      0 0 8px rgba(190,45,255,.2);
  }
  50%{
    box-shadow:
      0 0 23px rgba(190,45,255,.55);
  }
}

@keyframes redPulse{
  0%,100%{
    box-shadow:
      0 0 8px rgba(255,35,55,.2);
  }
  50%{
    box-shadow:
      0 0 23px rgba(255,35,55,.55);
  }
}

/* combo */

.dragonCombo.comboHit{
  animation:
    dragonComboHit .32s cubic-bezier(.2,.9,.2,1);
}

@keyframes dragonComboHit{
  0%{
    transform:skew(-8deg) scale(.7);
    opacity:.4;
  }
  55%{
    transform:skew(-8deg) scale(1.18);
    opacity:1;
  }
  100%{
    transform:skew(-8deg) scale(1);
    opacity:1;
  }
}

.dragonCombo b{
  filter:
    drop-shadow(0 0 7px rgba(255,105,0,.75));
}

/* joystick */

.dragonJoystick{
  touch-action:none;
  cursor:pointer;
}

.dragonJoystick::after{
  content:"";

  position:absolute;
  inset:5px;

  border-radius:50%;

  border:1px solid rgba(90,180,255,.22);

  box-shadow:
    inset 0 0 20px rgba(0,130,255,.15);

  pointer-events:none;
}

.dragonJoystick.active{
  filter:brightness(1.25);
}

.dragonJoystick.active::before{
  box-shadow:
    0 0 25px #238dff,
    inset 0 4px 9px rgba(255,255,255,.4);
}

/* pausa */

body.dragonPaused .board canvas{
  filter:
    brightness(.45)
    saturate(.65);
}

body.dragonPaused .dragonActions{
  filter:brightness(.55);
}

body.dragonPaused .dragonCombo{
  opacity:.4;
}

body.dragonPaused::after{
  content:"PAUSADO";

  position:fixed;
  z-index:999999;

  left:50%;
  top:50%;

  transform:translate(-50%,-50%);

  padding:14px 28px;

  border-radius:12px;

  color:#fff;

  font-size:22px;
  font-weight:1000;
  letter-spacing:2px;

  background:rgba(3,13,28,.94);

  border:1px solid #2a9cff;

  box-shadow:
    0 0 30px rgba(0,120,255,.5);
}

/* esconder somente controles antigos,
   sem remover os elementos nem suas funções */

#attack,
#guard,
#special,
#rush,
#fullscreenButton{
  position:absolute !important;

  width:1px !important;
  height:1px !important;

  min-width:1px !important;
  min-height:1px !important;

  padding:0 !important;
  margin:0 !important;

  opacity:0 !important;

  pointer-events:none !important;

  overflow:hidden !important;
}

/* tela cheia */

:fullscreen .wrap{
  max-width:none;
  width:100vw;
  height:100vh;
  padding:0;
}

:fullscreen .card{
  width:100vw;
  height:100vh;
  border-radius:0;
}

:fullscreen .main{
  height:calc(100vh - 72px);
}

:fullscreen .board{
  height:100%;
  min-height:0;
}

:fullscreen .board canvas{
  height:100%;
  min-height:0;
  object-fit:cover;
}

/* mobile refinado */

@media(max-width:720px){

  .dragonActions{
    grid-template-columns:repeat(2,1fr);
  }

  .dragonAction{
    min-height:67px;
  }

  .dragonCards{
    overflow-x:auto;
    display:flex;
    padding-bottom:7px;
  }

  .dragonCard{
    flex:0 0 112px;
  }

  .cardsTitle{
    margin-top:6px;
  }
}


/* KYARA DRAGON 7F COMBAT FX */

.dragonFXLayer{
  position:absolute;
  inset:0;
  z-index:35;
  pointer-events:none;
  overflow:hidden;
}

.dragonFlash{
  position:absolute;
  inset:0;

  background:
    radial-gradient(
      circle at 50% 55%,
      rgba(255,255,255,.85),
      rgba(80,170,255,.22) 30%,
      transparent 65%
    );

  opacity:0;
}

.dragonFlash.active{
  animation:dragonFlashFX .18s ease-out;
}

@keyframes dragonFlashFX{
  0%{
    opacity:.95;
  }
  100%{
    opacity:0;
  }
}

.dragonImpact{
  position:absolute;

  width:95px;
  height:95px;

  border-radius:50%;

  border:4px solid rgba(255,235,100,.95);

  box-shadow:
    0 0 8px #fff,
    0 0 18px #ffb000,
    0 0 38px rgba(255,80,0,.8);

  transform:translate(-50%,-50%) scale(.2);
  opacity:0;
}

.dragonImpact.active{
  animation:dragonImpactFX .38s cubic-bezier(.15,.8,.2,1);
}

@keyframes dragonImpactFX{
  0%{
    transform:translate(-50%,-50%) scale(.2);
    opacity:1;
  }
  55%{
    transform:translate(-50%,-50%) scale(1);
    opacity:.9;
  }
  100%{
    transform:translate(-50%,-50%) scale(1.65);
    opacity:0;
  }
}

.dragonSpark{
  position:absolute;

  width:7px;
  height:7px;

  border-radius:50%;

  background:#fff;

  box-shadow:
    0 0 7px #fff,
    0 0 15px #35aaff;

  opacity:0;
}

.dragonSpark.active{
  animation:dragonSparkFX .5s ease-out forwards;
}

@keyframes dragonSparkFX{
  0%{
    opacity:1;
    transform:translate(0,0) scale(1);
  }
  100%{
    opacity:0;
    transform:translate(
      var(--sx),
      var(--sy)
    ) scale(.1);
  }
}

/* energia ao redor da arena */

.dragonAura{
  position:absolute;

  width:220px;
  height:100px;

  border-radius:50%;

  background:
    radial-gradient(
      ellipse,
      rgba(40,150,255,.32),
      rgba(30,80,255,.12),
      transparent 70%
    );

  filter:blur(7px);

  opacity:.45;

  transform:translate(-50%,-50%);

  animation:dragonAuraFX 1.7s ease-in-out infinite;
}

@keyframes dragonAuraFX{
  0%,100%{
    transform:translate(-50%,-50%) scale(.92);
    opacity:.32;
  }
  50%{
    transform:translate(-50%,-50%) scale(1.08);
    opacity:.65;
  }
}

/* ataque */

.board.attackFX{
  animation:dragonAttackShake .16s linear;
}

@keyframes dragonAttackShake{
  0%{
    transform:translate(0);
  }
  25%{
    transform:translate(-5px,2px);
  }
  50%{
    transform:translate(5px,-2px);
  }
  75%{
    transform:translate(-3px,1px);
  }
  100%{
    transform:translate(0);
  }
}

/* golpe crítico */

.board.criticalFX{
  animation:dragonCriticalShake .28s ease;
}

@keyframes dragonCriticalShake{
  0%{
    transform:translate(0) scale(1);
  }
  20%{
    transform:translate(-8px,3px) scale(1.01);
  }
  40%{
    transform:translate(8px,-3px) scale(1.015);
  }
  60%{
    transform:translate(-5px,2px) scale(1.01);
  }
  80%{
    transform:translate(4px,-1px);
  }
  100%{
    transform:translate(0) scale(1);
  }
}

/* botão ativo */

.dragonAction.fxActive{
  filter:
    brightness(1.45)
    saturate(1.35);

  transform:scale(.95);
}

/* HUD piscando */

.fighterHUD.damageFlash{
  animation:dragonHUDDamage .25s ease;
}

@keyframes dragonHUDDamage{
  0%,100%{
    filter:brightness(1);
  }
  50%{
    filter:
      brightness(1.8)
      saturate(1.5);
  }
}

/* indicador de dano */

.dragonDamageText{
  position:absolute;

  z-index:80;

  color:#fff;

  font-size:30px;
  font-weight:1000;

  text-shadow:
    2px 2px 0 #7a1200,
    0 0 12px #ff4b00;

  pointer-events:none;

  transform:translate(-50%,-50%);
}

.dragonDamageText.active{
  animation:dragonDamageFX .65s ease-out forwards;
}

@keyframes dragonDamageFX{
  0%{
    opacity:0;
    transform:translate(-50%,-20%) scale(.6);
  }
  15%{
    opacity:1;
    transform:translate(-50%,-50%) scale(1.15);
  }
  100%{
    opacity:0;
    transform:translate(-50%,-125%) scale(.85);
  }
}

/* modo energia */

.board.energyFX::before{
  filter:
    brightness(1.35)
    saturate(1.5);
}

.board.energyFX{
  box-shadow:
    inset 0 0 80px rgba(50,145,255,.42),
    0 0 35px rgba(0,130,255,.55);
}

@media(max-width:720px){

  .dragonImpact{
    width:70px;
    height:70px;
  }

  .dragonDamageText{
    font-size:23px;
  }

}



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
</style>


<div id="game">

<canvas id="canvas"></canvas>

<div id="hud">

 <div class="top">

  <div class="fighter">

   <div class="fighterName">
    KYARA
    <span class="level">Lv.12</span>
   </div>

   <div class="hp">
    <div
      id="playerHP"
      class="hpFill">
    </div>
   </div>

   <div class="energy">
    <div
      id="playerEnergy"
      class="energyFill">
    </div>
   </div>

  </div>

  <div class="center">

   <div class="stage">
    STAGE 1-1
   </div>

   <div
     id="timer"
     class="timer">
     60
   </div>

  </div>

  <div class="fighter right">

   <div class="fighterName">
    CPU
    <span class="level">Lv.10</span>
   </div>

   <div class="hp">
    <div
      id="enemyHP"
      class="hpFill">
    </div>
   </div>

   <div class="energy">
    <div
      id="enemyEnergy"
      class="energyFill">
    </div>
   </div>

  </div>

 </div>

 <div id="combo"></div>

 <div id="energyText">
  ENERGIA
 </div>

</div>

<div id="damageLayer"></div>

<div id="flash"></div>

<button id="fullscreenButton">
 ⛶
</button>



<!-- KYARA DRAGON 7D HUD -->

<div class="dragonEnergyLine"></div>
<div class="dragonGroundGlow"></div>


<div class="dragonFXLayer" id="dragonFXLayer">
  <div class="dragonFlash" id="dragonFlash"></div>
</div>

<div class="dragonHUD">

  <div class="fighterHUD">
    <div class="fighterName">KYARA</div>
    <div class="fighterLevel">Lv. 12</div>

    <div class="barLabel">
      <span>HP</span>
      <span id="visualPlayerHP">850/850</span>
    </div>

    <div class="powerBar">
      <div class="powerFill" id="visualPlayerHPBar"></div>
    </div>

    <div class="barLabel">
      <span>ENERGIA</span>
      <span id="visualPlayerEnergy">100/100</span>
    </div>

    <div class="powerBar">
      <div class="energyFill" id="visualPlayerEnergyBar"></div>
    </div>
  </div>

  <div class="dragonVS">
    <strong>VS</strong>
    <div class="stageBadge">
      STAGE 1-1
      <span>Batalha</span>
    </div>
  </div>

  <div class="fighterHUD enemy">
    <div class="fighterName">FREEZA</div>
    <div class="fighterLevel">Lv. 10</div>

    <div class="barLabel">
      <span>HP</span>
      <span id="visualEnemyHP">720/720</span>
    </div>

    <div class="powerBar">
      <div class="powerFill" id="visualEnemyHPBar"></div>
    </div>

    <div class="barLabel">
      <span>ENERGIA</span>
      <span>100/100</span>
    </div>

    <div class="powerBar">
      <div class="energyFill"></div>
    </div>
  </div>

</div>

<div class="dragonCombo">
  <b id="visualCombo">0</b>
  <span>HITS!</span>
</div>

<div class="dragonJoystick">
  <span class="joyArrow joyUp">▲</span>
  <span class="joyArrow joyDown">▼</span>
  <span class="joyArrow joyLeft">◀</span>
  <span class="joyArrow joyRight">▶</span>
</div>

<div class="dragonSideControls">
  <button class="dragonCircleButton" id="visualFullscreen">⛶</button>
  <button class="dragonCircleButton" id="visualPause">Ⅱ</button>
  <button class="dragonCircleButton">⚙</button>
</div>

<div class="dragonActions">

  <button class="dragonAction attack" id="visualAttack">
    <span class="actionIcon">👊</span>
    <span class="actionText">ATAQUE</span>
  </button>

  <button class="dragonAction guard" id="visualGuard">
    <span class="actionIcon">🛡️</span>
    <span class="actionText">DEFESA</span>
  </button>

  <button class="dragonAction special" id="visualSpecial">
    <span class="actionIcon">⚡</span>
    <span class="actionText">ESPECIAL</span>
  </button>

  <button class="dragonAction rush" id="visualRush">
    <span class="actionIcon">🔥</span>
    <span class="actionText">RUSH</span>
  </button>

</div>

<div class="cardsTitle">
 CARTAS DE BATALHA
</div>

<div
 id="dragonCards"
 class="dragonCards">

 <button
  class="dragonCard selected"
  data-dragon-card="0">

  <div class="dragonCardIcon">👊</div>

  <div class="dragonCardName">
   GUERREIRO
  </div>

  <div class="dragonCardStats">
   ATK +12
  </div>

 </button>

 <button
  class="dragonCard"
  data-dragon-card="1">

  <div class="dragonCardIcon">🛡️</div>

  <div class="dragonCardName">
   DEFENSOR
  </div>

  <div class="dragonCardStats">
   DEF +15
  </div>

 </button>

 <button
  class="dragonCard"
  data-dragon-card="2">

  <div class="dragonCardIcon">⚡</div>

  <div class="dragonCardName">
   ENERGIA
  </div>

  <div class="dragonCardStats">
   EN +20
  </div>

 </button>

 <button
  class="dragonCard"
  data-dragon-card="3">

  <div class="dragonCardIcon">🔥</div>

  <div class="dragonCardName">
   RUSH
  </div>

  <div class="dragonCardStats">
   RUSH +18
  </div>

 </button>

</div>

<div id="controls">

 <button
   id="attack"
   class="control attack">
   👊<br>
   ATAQUE
 </button>

 <button
   id="guard"
   class="control guard">
   🛡️<br>
   DEFESA
 </button>

 <button
   id="special"
   class="control special">
   ⚡<br>
   ESPECIAL
 </button>

 <button
   id="rush"
   class="control rush">
   🔥<br>
   RUSH
 </button>

</div>

<div id="menu">

 <div class="panel">

  <div class="logo">🐉</div>

  <h1 id="menuTitle">
   KYARA DRAGON BATTLE
  </h1>

  <div
    id="menuText"
    class="subtitle">

   Sistema de batalha por toque.<br>
   Ataque, defenda, acumule energia
   e execute um Rush.

  </div>

  <button
    id="start"
    class="menuButton primary">

   INICIAR BATALHA

  </button>

  <button
    id="menuFullscreen"
    class="menuButton">

   ⛶ TELA CHEIA

  </button>

 </div>

</div>


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

<script>

const canvas =
 document.getElementById("canvas");

const ctx =
 canvas.getContext("2d");

let W=0;
let H=0;
let DPR=1;

function resize(){

 DPR=
 Math.max(
  1,
  Math.min(
   2,
   window.devicePixelRatio||1
  )
 );

 W=
 window.innerWidth;

 H=
 window.innerHeight;

 canvas.width=
 Math.floor(W*DPR);

 canvas.height=
 Math.floor(H*DPR);

 ctx.setTransform(
  DPR,0,0,DPR,0,0
 );

}

resize();

window.addEventListener(
 "resize",
 resize
);

const player={
 hp:850,
 maxHp:850,
 energy:0,
 maxEnergy:100,

 attack:38,
 defense:18,

 x:.30,
 y:.61,

 attacking:false,
 guarding:false
};

const enemy={
 hp:720,
 maxHp:720,
 energy:0,
 maxEnergy:100,

 attack:31,
 defense:15,

 x:.70,
 y:.61,

 attacking:false,
 guarding:false
};

let running=false;

let stage=1;

let stageMax=10;

let mission={
 type:"combo",
 target:5,
 progress:0,
 clear:false
};

let stagePoints=0;

let totalScore=0;

let timer=60;

let combo=0;
let maxCombo=0;

let score=0;

let playerHits=0;

let wins=0;
let losses=0;

let lastAttack=0;
let comboTimer=0;

let enemyClock=0;

let frame=0;

let battleStart=0;

let shakePower=0;

let effects=[];

let best=0;

try{

 best=
 Number(
  localStorage.getItem(
   "kyara_dragon_best"
  )||0
 );

}catch{}

const $=id=>
 document.getElementById(id);

function setupDragonCards(){

 const buttons=
  document.querySelectorAll(
   "[data-dragon-card]"
  );

 buttons.forEach(
  button=>{

   button.addEventListener(
    "click",
    ()=>{

     const index=
      Number(
       button.dataset.dragonCard
      );

     selectDragonCard(index);

    }
   );

  }
 );

}




/* ============================================================
 * KYARA DRAGON — SISTEMA DE CARTAS
 * ============================================================ */

const playerCards = [

 {
  id:0,
  name:"GUERREIRO",
  icon:"👊",
  level:3,
  attack:12,
  defense:0,
  energy:0,
  rush:0
 },

 {
  id:1,
  name:"DEFENSOR",
  icon:"🛡️",
  level:2,
  attack:0,
  defense:15,
  energy:0,
  rush:0
 },

 {
  id:2,
  name:"ENERGIA",
  icon:"⚡",
  level:4,
  attack:0,
  defense:0,
  energy:20,
  rush:0
 },

 {
  id:3,
  name:"RUSH",
  icon:"🔥",
  level:1,
  attack:0,
  defense:0,
  energy:0,
  rush:18
 }

];

let selectedCard = 0;

let playerCardFormation = [
  0,
  1,
  2,
  3
];

function getSelectedCard(){

 return (
  playerCards[selectedCard] ||
  playerCards[0]
 );

}

function getCardAttack(){

 return Number(
  getSelectedCard().attack || 0
 );

}

function getCardDefense(){

 return Number(
  getSelectedCard().defense || 0
 );

}

function getCardEnergy(){

 return Number(
  getSelectedCard().energy || 0
 );

}

function getCardRush(){

 return Number(
  getSelectedCard().rush || 0
 );

}

function selectDragonCard(index){

 if(!Number.isInteger(index)){
  return;
 }

 if(!playerCards[index]){
  return;
 }

 selectedCard=index;

 document
  .querySelectorAll(
   "[data-dragon-card]"
  )
  .forEach(
   button=>{

    button.classList.toggle(
     "selected",
     Number(
      button.dataset.dragonCard
     )===selectedCard
    );

   }
  );

 const card=
  getSelectedCard();

 /*
  * Mantém os atributos originais
  * do personagem e adiciona o
  * bônus da carta.
  */

 player.attack=
  38+
  getCardAttack();

 player.defense=
  18+
  getCardDefense();

 if(getCardEnergy()>0){

  player.energy=
   Math.min(
    100,
    player.energy+
    getCardEnergy()
   );

 }

 const text=
  $("menuText");

 if(text){

  text.textContent=
   card.icon+
   " "+
   card.name+
   " Lv."+
   card.level+
   " | ATK +"+
   card.attack+
   " | DEF +"+
   card.defense+
   " | EN +"+
   card.energy+
   " | RUSH +"+
   card.rush;

 }

 updateHUD();

}

function updateHUD(){

 $("playerHP").style.width=
 Math.max(
  0,
  player.hp/player.maxHp*100
 )+"%";

 $("enemyHP").style.width=
 Math.max(
  0,
  enemy.hp/enemy.maxHp*100
 )+"%";

 $("playerEnergy").style.width=
 player.energy+"%";

 $("enemyEnergy").style.width=
 enemy.energy+"%";

 $("timer").textContent=
 Math.max(
  0,
  Math.ceil(timer)
 );

 $("combo").textContent=
 combo>=2
 ? combo+" HITS!"
 : "";

}

function saveBest(){

 if(score<=best)return;

 best=score;

 try{

  localStorage.setItem(
   "kyara_dragon_best",
   best
 );

 }catch{}

}

function popupDamage(
 value,
 target
){

 const el=
 document.createElement("div");

 el.className="damage";

 el.textContent=
 "-"+value;

 const px=
 target==="enemy"
 ? W*.70
 : W*.30;

 const py=
 H*.50;

 el.style.left=
 px+"px";

 el.style.top=
 py+"px";

 $("damageLayer")
 .appendChild(el);

 setTimeout(
  ()=>el.remove(),
  700
 );

}

function hitFlash(){

 $("flash").animate(
 [
  {opacity:.65},
  {opacity:0}
 ],
 {
  duration:150
 }
 );

 shakePower=7;

}

function addEffect(
 x,
 y,
 type
){

 effects.push({
  x,
  y,
  type,
  life:1,
  size:20
 });

}

function attack(){

 if(!running)return;

 const now=
 performance.now();

 if(
  now-lastAttack>
  900
 ){

  combo=0;

 }

 lastAttack=now;

 combo++;

 maxCombo=
 Math.max(
  maxCombo,
  combo
 );

 comboTimer=1;

 player.attacking=true;

 setTimeout(
  ()=>{
   player.attacking=false;
  },
  180
 );

 let base=
 player.attack+
 getCardAttack();

 let comboBonus=
 Math.min(
  45,
  combo*5
 );

 let damage=
 Math.floor(
  base+
  comboBonus+
  Math.random()*18
 );

 if(enemy.guarding){

  damage=
  Math.max(
   3,
   Math.floor(
    damage*.22
   )
  );

 }else{

  playerHits++;

 }

 enemy.hp-=damage;

 player.energy=
 Math.min(
  100,
  player.energy+
  5+
  damage*.025
 );

 score+=
 Math.max(
  5,
  damage
 );

 popupDamage(
  damage,
  "enemy"
 );

 addEffect(
  enemy.x,
  enemy.y,
  "hit"
 );

 hitFlash();

 updateMission();

 updateHUD();

 if(enemy.hp<=0){

  finish(true);
 }

}

function guard(){

 if(!running)return;

 player.guarding=true;

 addEffect(
  player.x,
  player.y,
  "guard"
 );

 setTimeout(
  ()=>{
   player.guarding=false;
  },
  520
 );

}

function special(){

 if(!running)return;

 if(player.energy<30){

  $("menuText").textContent=
   "Energia insuficiente para o Especial.";

  return;

 }

 player.energy-=30;

 player.attacking=true;

 setTimeout(
  ()=>{
   player.attacking=false;
  },
  280
 );

 let damage=
  Math.floor(
   80+
   Math.random()*45
  );

 if(enemy.guarding){

  damage=
  Math.floor(
   damage*.45
  );

 }

 enemy.hp-=damage;

 combo++;

 maxCombo=
 Math.max(
  maxCombo,
  combo
 );

 score+=damage*2;

 popupDamage(
  damage,
  "enemy"
 );

 addEffect(
  enemy.x,
  enemy.y,
  "special"
 );

 hitFlash();

 updateHUD();

 if(enemy.hp<=0){

  finish(true);
 }

}

function rush(){

 if(!running)return;

 if(player.energy<60){

  $("menuText").textContent=
   "Energia insuficiente para RUSH.";

  return;

 }

 player.energy-=60;

 let hits=0;

 function rushHit(){

  if(!running)return;

  if(hits>=6){

   return;

  }

  hits++;

  player.attacking=true;

  let damage=
   Math.floor(
    28+
    Math.random()*24+
    getCardRush()
   );

  if(enemy.guarding){

   damage=
   Math.max(
    4,
    Math.floor(
     damage*.3
    )
   );

  }

  enemy.hp-=damage;

  combo++;

  maxCombo=
  Math.max(
   maxCombo,
   combo
  );

  score+=damage*2;

  popupDamage(
   damage,
   "enemy"
  );

  addEffect(
   enemy.x,
   enemy.y,
   "rush"
  );

  hitFlash();

  updateHUD();

  if(enemy.hp<=0){

   finish(true);
   return;

  }

  setTimeout(
   rushHit,
   95
  );

 }

 rushHit();

}

function enemyAttack(){

 if(!running)return;

 enemy.attacking=true;

 setTimeout(
  ()=>{
   enemy.attacking=false;
  },
  190
 );

 let damage=
 Math.floor(
  enemy.attack+
  Math.random()*18
 );

 if(player.guarding){

  const cardDefense=
   getCardDefense();

  const reduction=
   Math.min(
    .75,
    .18+
    cardDefense*.01
   );

  damage=
  Math.max(
   1,
   Math.floor(
    damage*(1-reduction)
   )
  );

  player.energy=
   Math.min(
    100,
    player.energy+8
   );

 }else{

  combo=0;

 }

 player.hp-=damage;

 enemy.energy=
 Math.min(
  100,
  enemy.energy+
  5
 );

 popupDamage(
  damage,
  "player"
 );

 addEffect(
  player.x,
  player.y,
  "enemyHit"
 );

 hitFlash();

 updateHUD();

 if(player.hp<=0){

  finish(false);

 }

}

function enemyAI(){

 if(!running)return;

 const r=
 Math.random();

 if(
  player.guarding
 ){

  if(r<.18){

   enemy.guarding=true;

   setTimeout(
    ()=>{
     enemy.guarding=false;
    },
    400
   );

   return;

  }

 }

 if(r<.20){

  enemy.guarding=true;

  setTimeout(
   ()=>{
    enemy.guarding=false;
   },
   420
  );

  return;

 }

 enemyAttack();

}

function createMission(){

 const missions=[
  {
   type:"combo",
   target:5,
   text:"Faça um combo de 5 golpes."
  },
  {
   type:"damage",
   target:250,
   text:"Cause 250 de dano."
  },
  {
   type:"energy",
   target:60,
   text:"Acumule 60 de energia."
  },
  {
   type:"speed",
   target:35,
   text:"Vença com pelo menos 35s restantes."
  }
 ];

 const index=
   (stage-1)%missions.length;

 const m=missions[index];

 mission={
  ...m,
  progress:0,
  clear:false
 };

}

function updateMission(){

 if(!mission)return;

 if(mission.type==="combo"){

  mission.progress=
   Math.max(
    mission.progress,
    combo
   );

 }

 if(mission.type==="damage"){

  mission.progress=
   playerHits;
 }

 if(mission.type==="energy"){

  mission.progress=
   Math.floor(
    player.energy
   );

 }

 if(mission.type==="speed"){

  mission.progress=
   Math.max(
    0,
    60-timer
   );

 }

 if(
  mission.type==="combo" &&
  combo>=mission.target
 ){

  mission.clear=true;

 }

 if(
  mission.type==="damage" &&
  score>=mission.target
 ){

  mission.clear=true;

 }

 if(
  mission.type==="energy" &&
  player.energy>=mission.target
 ){

  mission.clear=true;

 }

 if(
  mission.type==="speed" &&
  timer>=mission.target
 ){

  mission.clear=true;

 }

}

function startBattle(){

 createMission();

 player.hp=
 player.maxHp;

 player.energy=0;

 enemy.hp=
 enemy.maxHp;

 enemy.energy=0;

 combo=0;
 maxCombo=0;
 score=0;
 playerHits=0;

 timer=60;

 enemyClock=0;

 lastAttack=0;

 running=true;

 battleStart=
 performance.now();

 $("menu")
 .classList.add(
  "hidden"
 );

 updateHUD();

 requestAnimationFrame(
  loop
 );

}

function finish(win){

 if(!running)return;

 running=false;

 updateMission();

 if(win){

  wins++;

  stagePoints=
   stage*100;

  const missionBonus=
   mission.clear
   ? stage*150
   : 0;

  const timeBonus=
   Math.max(
    0,
    Math.floor(
     timer*20
    )
   );

  const comboBonus=
   maxCombo*35;

  const finalScore=
   score+
   stagePoints+
   missionBonus+
   timeBonus+
   comboBonus;

  totalScore+=
   finalScore;

  score=
   finalScore;

 }else{

  losses++;

 }

 saveBest();

 $("menu")
 .classList.remove(
  "hidden"
 );

 if(win){

  const timeBonus=
   Math.max(
    0,
    Math.floor(
     timer*20
    )
   );

  const comboBonus=
   maxCombo*35;

  const finalScore=
   score+
   timeBonus+
   comboBonus;

  if(finalScore>best){

   best=finalScore;

   try{

    localStorage.setItem(
     "kyara_dragon_best",
     best
    );

   }catch{}

  }

  $("menuTitle")
  .textContent=
   "🏆 VITÓRIA";

  $("menuText")
  .innerHTML=
   "STAGE "+stage+
   " concluído!<br><br>"+
   "Missão: <b>"+
   (mission.clear
    ? "CONCLUÍDA"
    : "NÃO CONCLUÍDA")+
   "</b><br>"+
   "Combo máximo: <b>"+
   maxCombo+
   "</b><br>"+
   "Pontos do Stage: <b>"+
   stagePoints+
   "</b><br>"+
   "Pontuação: <b>"+
   finalScore+
   "</b><br>"+
   "Recorde: <b>"+
   best+
   "</b>";

 }else{

  $("menuTitle")
  .textContent=
   "💀 DERROTA";

  $("menuText")
  .innerHTML=
   "STAGE "+stage+
   "<br><br>"+
   "Missão: <b>"+
   (mission.clear
    ? "CONCLUÍDA"
    : "NÃO CONCLUÍDA")+
   "</b><br>"+
   "Combo máximo: <b>"+
   maxCombo+
   "</b><br>"+
   "Pontuação: <b>"+
   score+
   "</b><br>"+
   "Recorde: <b>"+
   best+
   "</b>";

 }

}

function loop(t){

 if(!running)return;

 const dt=
 Math.min(
  50,
  t-frame||16
 );

 frame=t;

 timer-=
 dt/1000;

 enemyClock+=dt;

 comboTimer-=
 dt/1000;

 if(
  comboTimer<=0
 ){

  combo=0;

 }

 if(
  enemyClock>=
  900+
  Math.random()*700
 ){

  enemyClock=0;

  enemyAI();

 }

 player.guarding=
 Boolean(
  player.guarding
 );

 updateHUD();

 draw(t);

 updateMission();

 if(timer<=0){

  finish(
   enemy.hp<
   player.hp
  );

  return;

 }

 requestAnimationFrame(
  loop
 );

}

function draw(t){

 ctx.save();

 if(shakePower>0){

  ctx.translate(
   (Math.random()-.5)*
   shakePower,
   (Math.random()-.5)*
   shakePower
  );

  shakePower*=.82;

 }

 drawBackground(t);

 drawEnergyWaves(t);

 drawFighter(
  player,
  false,
  t
 );

 drawFighter(
  enemy,
  true,
  t
 );

 drawEffects();

 ctx.restore();

}

function drawBackground(t){

 const g=
 ctx.createLinearGradient(
  0,
  0,
  0,
  H
 );

 g.addColorStop(
  0,
  "#102a50"
 );

 g.addColorStop(
  .45,
  "#09182c"
 );

 g.addColorStop(
  1,
  "#03050a"
 );

 ctx.fillStyle=g;

 ctx.fillRect(
  0,
  0,
  W,
  H
 );

 // lua

 ctx.beginPath();

 ctx.arc(
  W*.50,
  H*.26,
  Math.min(W,H)*.15,
  0,
  Math.PI*2
 );

 ctx.fillStyle=
  "rgba(120,170,255,.16)";

 ctx.fill();

 // montanhas

 ctx.fillStyle=
  "#08101c";

 ctx.beginPath();

 ctx.moveTo(
  0,
  H*.58
 );

 for(
  let i=0;
  i<12;
  i++
 ){

  const x=
   i*(W/11);

  const y=
   H*.42+
   Math.sin(i*2.3)*H*.12;

  ctx.lineTo(
   x,
   y
  );

 }

 ctx.lineTo(
  W,
  H
 );

 ctx.lineTo(
  0,
  H
 );

 ctx.closePath();

 ctx.fill();

 // chão

 ctx.fillStyle=
  "#111c29";

 ctx.fillRect(
  0,
  H*.64,
  W,
  H*.36
 );

 ctx.strokeStyle=
  "rgba(90,150,210,.18)";

 ctx.lineWidth=1;

 for(
  let i=0;
  i<10;
  i++
 ){

  const y=
   H*.64+
   i*34;

  ctx.beginPath();

  ctx.moveTo(
   0,
   y
  );

  ctx.lineTo(
   W,
   y
  );

  ctx.stroke();

 }

}

function drawEnergyWaves(t){

 for(
  let i=0;
  i<15;
  i++
 ){

  const x=
   (i*91+
   t*.025)%W;

  const y=
   H*.25+
   Math.sin(
    t*.001+i
   )*70;

  ctx.beginPath();

  ctx.arc(
   x,
   y,
   1+i%3,
   0,
   Math.PI*2
  );

  ctx.fillStyle=
   "rgba(90,180,255,.22)";

  ctx.fill();

 }

}

function drawFighter(
 f,
 flip,
 t
){

 const x=
 W*f.x;

 const y=
 H*f.y;

 ctx.save();

 ctx.translate(
  x,
  y
 );

 if(flip){

  ctx.scale(
   -1,
   1
  );

 }

 const bob=
 Math.sin(
  t*.006
 )*4;

 ctx.translate(
  0,
  bob
 );

 // aura

 if(
  f.energy>20||
  f.guarding
 ){

  const radius=
   65+
   Math.sin(
    t*.012
   )*8;

  ctx.beginPath();

  ctx.arc(
   0,
   -50,
   radius,
   0,
   Math.PI*2
  );

  ctx.strokeStyle=
   f.guarding
   ? "rgba(70,170,255,.7)"
   : "rgba(255,220,60,.35)";

  ctx.lineWidth=
   f.guarding
   ? 7
   : 10;

  ctx.stroke();

 }

 // sombra

 ctx.beginPath();

 ctx.ellipse(
  0,
  50,
  65,
  13,
  0,
  0,
  Math.PI*2
 );

 ctx.fillStyle=
  "rgba(0,0,0,.45)";

 ctx.fill();

 // pernas

 ctx.strokeStyle=
  flip
   ? "#721f32"
   : "#253eaa";

 ctx.lineWidth=19;

 ctx.lineCap="round";

 ctx.beginPath();

 ctx.moveTo(
  -18,
  35
 );

 ctx.lineTo(
  -35,
  75
 );

 ctx.moveTo(
  18,
  35
 );

 ctx.lineTo(
  35,
  75
 );

 ctx.stroke();

 // corpo

 ctx.fillStyle=
  flip
   ? "#8e2940"
   : "#315fe8";

 ctx.fillRect(
  -29,
  -25,
  58,
  68
 );

 // cabeça

 ctx.beginPath();

 ctx.arc(
  0,
  -62,
  28,
  0,
  Math.PI*2
 );

 ctx.fillStyle=
  "#dcae8a";

 ctx.fill();

 // cabelo

 ctx.beginPath();

 ctx.moveTo(
  -29,
  -66
 );

 ctx.lineTo(
  -24,
  -102
 );

 ctx.lineTo(
  -8,
  -83
 );

 ctx.lineTo(
  4,
  -112
 );

 ctx.lineTo(
  15,
  -86
 );

 ctx.lineTo(
  30,
  -104
 );

 ctx.lineTo(
  27,
  -62
 );

 ctx.closePath();

 ctx.fillStyle=
  "#10141d";

 ctx.fill();

 // braço

 ctx.strokeStyle=
  "#dcae8a";

 ctx.lineWidth=14;

 ctx.beginPath();

 if(
  f.attacking
 ){

  ctx.moveTo(
   20,
   -10
  );

  ctx.lineTo(
   75,
   -30
  );

 }else{

  ctx.moveTo(
   -22,
   -8
  );

  ctx.lineTo(
   -62,
   -28
  );

 }

 ctx.stroke();

 // defesa

 if(f.guarding){

  ctx.beginPath();

  ctx.arc(
   0,
   -40,
   83,
   0,
   Math.PI*2
  );

  ctx.strokeStyle=
   "rgba(80,190,255,.75)";

  ctx.lineWidth=5;

  ctx.stroke();

 }

 ctx.restore();

}

function drawEffects(){

 for(
  let i=effects.length-1;
  i>=0;
  i--
 ){

  const e=
   effects[i];

  e.life-=.055;

  if(e.life<=0){

   effects.splice(
    i,
    1
   );

   continue;

  }

  const x=
   W*e.x;

  const y=
   H*e.y;

  ctx.save();

  ctx.translate(
   x,
   y
  );

  const size=
   e.size+
   (1-e.life)*70;

  ctx.globalAlpha=
   e.life;

  ctx.strokeStyle=
   e.type==="guard"
   ? "#54b9ff"
   : e.type==="special"
   ? "#d56cff"
   : e.type==="rush"
   ? "#ff7040"
   : "#ffe04b";

  ctx.lineWidth=4;

  ctx.beginPath();

  ctx.arc(
   0,
   -50,
   size,
   0,
   Math.PI*2
  );

  ctx.stroke();

  ctx.restore();

 }

}

async function fullscreen(){

 const el=
  document.getElementById(
   "game"
  );

 try{

  if(
   document.fullscreenElement
  ){

   await document.exitFullscreen();
   return;

  }

  if(
   el.requestFullscreen
  ){

   await el.requestFullscreen({
    navigationUI:"hide"
   });

   return;

  }

 }catch(e){}

 // fallback para WebView

 try{

  await screen.orientation
   ?.lock?.("landscape");

 }catch(e){}

}

$("start")
.onclick=
startBattle;

$("fullscreenButton")
.onclick=
fullscreen;

$("menuFullscreen")
.onclick=
fullscreen;

$("attack")
.onclick=
attack;

$("guard")
.onclick=
guard;

$("special")
.onclick=
special;

$("rush")
.onclick=
rush;

// toque direto na arena

canvas.addEventListener(
 "pointerdown",
 e=>{

  if(!running)return;

  attack();

 }
);

// gesto de arrasto:
// esquerda/direita = ataque
// cima = especial

let touchStartX=0;
let touchStartY=0;

canvas.addEventListener(
 "pointerdown",
 e=>{

  touchStartX=e.clientX;
  touchStartY=e.clientY;

 },
 {
  passive:true
 }
);

canvas.addEventListener(
 "pointerup",
 e=>{

  if(!running)return;

  const dx=
   e.clientX-touchStartX;

  const dy=
   e.clientY-touchStartY;

  if(
   Math.abs(dy)>60 &&
   dy<0
  ){

   special();

  }else if(
   Math.abs(dx)>70
  ){

   rush();

  }

 },
 {
  passive:true
 }
);

setupDragonCards();

selectDragonCard(0);

updateHUD();


/* KYARA DRAGON 7D — ponte visual */

(function(){

  function bindVisualButton(visualId, realId){
    const visual = document.getElementById(visualId);
    const real = document.getElementById(realId);

    if(!visual || !real) return;

    visual.addEventListener("click", function(){
      real.click();
    });
  }

  bindVisualButton("visualAttack","attack");
  bindVisualButton("visualGuard","guard");
  bindVisualButton("visualSpecial","special");
  bindVisualButton("visualRush","rush");

  const visualFullscreen =
    document.getElementById("visualFullscreen");

  const fullscreenButton =
    document.getElementById("fullscreenButton");

  if(visualFullscreen && fullscreenButton){
    visualFullscreen.addEventListener("click",()=>{
      fullscreenButton.click();
    });
  }

  const visualPause =
    document.getElementById("visualPause");

  if(visualPause){
    visualPause.addEventListener("click",()=>{
      document.body.classList.toggle("dragonPaused");
    });
  }

  function updateVisualHUD(){

    const p =
      typeof player !== "undefined"
        ? player
        : null;

    const e =
      typeof enemy !== "undefined"
        ? enemy
        : null;

    const hpPlayer =
      document.getElementById("visualPlayerHP");

    const hpPlayerBar =
      document.getElementById("visualPlayerHPBar");

    const hpEnemy =
      document.getElementById("visualEnemyHP");

    const hpEnemyBar =
      document.getElementById("visualEnemyHPBar");

    const comboEl =
      document.getElementById("visualCombo");

    if(p){

      const max =
        Number(p.maxHp || p.maxLife || 850);

      const hp =
        Math.max(0,Number(p.hp ?? p.life ?? max));

      if(hpPlayer)
        hpPlayer.textContent =
          Math.ceil(hp)+"/"+max;

      if(hpPlayerBar)
        hpPlayerBar.style.width =
          Math.max(0,Math.min(100,hp/max*100))+"%";
    }

    if(e){

      const max =
        Number(e.maxHp || e.maxLife || 720);

      const hp =
        Math.max(0,Number(e.hp ?? e.life ?? max));

      if(hpEnemy)
        hpEnemy.textContent =
          Math.ceil(hp)+"/"+max;

      if(hpEnemyBar)
        hpEnemyBar.style.width =
          Math.max(0,Math.min(100,hp/max*100))+"%";
    }

    if(comboEl &&
       typeof combo !== "undefined"){
      comboEl.textContent =
        Math.max(0,Number(combo));
    }
  }

  setInterval(updateVisualHUD,100);

})();


/* KYARA DRAGON 7E POLISH — INTERAÇÃO */

(function(){

  const joystick =
    document.querySelector(".dragonJoystick");

  if(joystick){

    let active = false;

    function joyStart(e){
      active = true;
      joystick.classList.add("active");

      if(e && e.preventDefault)
        e.preventDefault();
    }

    function joyEnd(e){
      active = false;
      joystick.classList.remove("active");

      if(e && e.preventDefault)
        e.preventDefault();
    }

    joystick.addEventListener(
      "pointerdown",
      joyStart,
      {passive:false}
    );

    joystick.addEventListener(
      "pointerup",
      joyEnd,
      {passive:false}
    );

    joystick.addEventListener(
      "pointercancel",
      joyEnd,
      {passive:false}
    );

    joystick.addEventListener(
      "pointerleave",
      joyEnd,
      {passive:false}
    );
  }

  /* animação do combo */

  let lastVisualCombo = -1;

  function animateVisualCombo(){

    if(typeof combo === "undefined")
      return;

    const value =
      Math.max(0,Number(combo));

    const el =
      document.querySelector(".dragonCombo");

    if(!el)
      return;

    if(value !== lastVisualCombo){

      if(lastVisualCombo >= 0){

        el.classList.remove("comboHit");

        void el.offsetWidth;

        el.classList.add("comboHit");
      }

      lastVisualCombo = value;
    }
  }

  setInterval(
    animateVisualCombo,
    80
  );

})();


/* KYARA DRAGON 7F COMBAT FX */

(function(){

  const board =
    document.querySelector(".board");

  const layer =
    document.getElementById("dragonFXLayer");

  const flash =
    document.getElementById("dragonFlash");

  if(!board || !layer)
    return;

  function flashScreen(){

    if(!flash)
      return;

    flash.classList.remove("active");

    void flash.offsetWidth;

    flash.classList.add("active");
  }

  function shake(critical=false){

    board.classList.remove(
      "attackFX",
      "criticalFX"
    );

    void board.offsetWidth;

    board.classList.add(
      critical
        ? "criticalFX"
        : "attackFX"
    );

    setTimeout(()=>{
      board.classList.remove(
        "attackFX",
        "criticalFX"
      );
    },350);
  }

  function impact(x,y){

    const el =
      document.createElement("div");

    el.className =
      "dragonImpact active";

    el.style.left =
      x + "px";

    el.style.top =
      y + "px";

    layer.appendChild(el);

    setTimeout(()=>{
      el.remove();
    },450);
  }

  function sparks(x,y){

    for(let i=0;i<12;i++){

      const el =
        document.createElement("div");

      el.className =
        "dragonSpark active";

      const angle =
        Math.random()*Math.PI*2;

      const distance =
        35 + Math.random()*100;

      el.style.left =
        x + "px";

      el.style.top =
        y + "px";

      el.style.setProperty(
        "--sx",
        Math.cos(angle)*distance + "px"
      );

      el.style.setProperty(
        "--sy",
        Math.sin(angle)*distance + "px"
      );

      layer.appendChild(el);

      setTimeout(()=>{
        el.remove();
      },600);
    }
  }

  function damageText(value){

    const el =
      document.createElement("div");

    el.className =
      "dragonDamageText active";

    el.textContent =
      "-" + Math.max(1,Math.round(value));

    el.style.left =
      (52 + (Math.random()*18-9)) + "%";

    el.style.top =
      (48 + (Math.random()*12-6)) + "%";

    layer.appendChild(el);

    setTimeout(()=>{
      el.remove();
    },750);
  }

  function aura(){

    const el =
      document.createElement("div");

    el.className =
      "dragonAura";

    el.style.left =
      (35 + Math.random()*30) + "%";

    el.style.top =
      (58 + Math.random()*10) + "%";

    layer.appendChild(el);

    setTimeout(()=>{
      el.remove();
    },1700);
  }

  function actionFX(type){

    flashScreen();

    const critical =
      type === "rush" ||
      type === "special";

    shake(critical);

    const rect =
      board.getBoundingClientRect();

    const x =
      rect.width * (
        .50 + (Math.random()*.18-.09)
      );

    const y =
      rect.height * (
        .50 + (Math.random()*.12-.06)
      );

    impact(x,y);
    sparks(x,y);

    if(type === "rush" ||
       type === "special"){
      aura();
    }
  }

  function bind(id,type){

    const button =
      document.getElementById(id);

    if(!button)
      return;

    button.addEventListener(
      "click",
      ()=>{

        button.classList.remove("fxActive");

        void button.offsetWidth;

        button.classList.add("fxActive");

        setTimeout(()=>{
          button.classList.remove("fxActive");
        },180);

        actionFX(type);
      }
    );
  }

  bind("visualAttack","attack");
  bind("visualGuard","guard");
  bind("visualSpecial","special");
  bind("visualRush","rush");

  /*
   * Aura inicial da arena.
   */

  setTimeout(aura,700);
  setInterval(aura,2600);

})();


</script>

</div>



`

const game = createHtmlGameCommand({

 name,

 commands,

 description:
  "Dragon Battle HTML com batalha por toque, combo, defesa, energia e Rush.",

 usage:
  "/richdragon",

 html:
  HTML,

 submessageText:
  "🐉 KYARA DRAGON BATTLE",

 displayName:
  "Dragon Battle"

});

export default game;
