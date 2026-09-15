#!/data/data/com.termux/files/usr/bin/bash

set -e

cd ~/storage/BKkyara-

echo ""
echo "=========================================="
echo "   🎮 CORRIGINDO KYARA GAME"
echo "=========================================="
echo ""

STAMP=$(date +%Y%m%d-%H%M%S)

BACKUP="dados/backup-kyara-game-$STAMP"

mkdir -p "$BACKUP"

echo "💾 Backup..."

cp -f \
dados/src/features/kyaraBrowser.js \
"$BACKUP/kyaraBrowser.js" \
2>/dev/null || true

cp -f \
dados/src/features/kyaraSpecialCommands.js \
"$BACKUP/kyaraSpecialCommands.js" \
2>/dev/null || true


echo "🔎 Verificando KYARA SITE..."

grep -q "sendBrowserHtml" \
dados/src/features/kyaraBrowser.js \
|| {

    echo "❌ sendBrowserHtml não existe no kyaraBrowser.js"

    exit 1
}


echo "🎮 Criando jogo..."

mkdir -p dados/api


cat > dados/api/kyara-jogo.html <<'HTML_EOF'
<!DOCTYPE html>
<html lang="pt-BR">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
>

<title>KYARA GAME</title>

<style>

*{
box-sizing:border-box;
-webkit-tap-highlight-color:transparent;
}

html,
body{

margin:0;
padding:0;

width:100%;
height:100%;

overflow:hidden;

background:#11191d;

color:#fff;

font-family:
Arial,
Helvetica,
sans-serif;

}

body{

touch-action:none;

display:flex;

align-items:center;

justify-content:center;

}

#app{

width:100%;
height:100%;

max-width:760px;

position:relative;

overflow:hidden;

background:#11191d;

}

#top{

height:68px;

display:flex;

align-items:center;

padding:10px 14px;

gap:10px;

background:#1d282d;

border-bottom:1px solid #39464c;

}

#icon{

width:45px;
height:45px;

border-radius:14px;

display:flex;

align-items:center;
justify-content:center;

font-size:24px;

background:#6656ee;

}

#title{

font-size:17px;

font-weight:900;

}

#subtitle{

font-size:10px;

color:#879398;

margin-top:4px;

}

#content{

position:absolute;

top:68px;
left:0;
right:0;
bottom:0;

padding:10px;

}

#game{

position:absolute;

inset:10px;

overflow:hidden;

border-radius:18px;

border:1px solid #3a484e;

background:
linear-gradient(
180deg,
#1b292f 0%,
#17242a 70%,
#11191d 100%
);

}

#scorebar{

height:65px;

display:flex;

align-items:center;

justify-content:space-between;

padding:10px 15px;

border-bottom:1px solid #334147;

}

.label{

font-size:8px;

letter-spacing:1.5px;

color:#7d8b90;

}

.value{

font-family:monospace;

font-size:18px;

font-weight:900;

}

#arena{

position:absolute;

left:12px;
right:12px;

top:77px;
bottom:82px;

overflow:hidden;

border-radius:14px;

background:
linear-gradient(
180deg,
#1a2930,
#142127
);

border:1px solid #29383e;

}

.cloud{

position:absolute;

height:7px;

border-radius:8px;

background:#68777d;

opacity:.7;

}

.cloud:before,
.cloud:after{

content:"";

position:absolute;

background:#68777d;

border-radius:50%;

}

.cloud:before{

width:16px;
height:10px;

left:6px;
top:-4px;

}

.cloud:after{

width:21px;
height:12px;

left:18px;
top:-6px;

}

.c1{

width:31px;

left:13%;

top:20%;

}

.c2{

width:43px;

left:43%;

top:27%;

}

.c3{

width:30px;

left:77%;

top:18%;

}

#ground{

position:absolute;

left:0;
right:0;

bottom:48px;

height:2px;

background:#718087;

}

#ground:after{

content:"";

position:absolute;

left:0;
right:0;

top:13px;

height:2px;

background:
repeating-linear-gradient(
to right,
#35434a 0 18px,
transparent 18px 38px
);

}

#dino{

position:absolute;

left:45px;

bottom:49px;

width:43px;
height:50px;

z-index:10;

}

.dino-body{

position:absolute;

left:8px;
top:18px;

width:27px;
height:26px;

background:#e3eaec;

}

.dino-head{

position:absolute;

left:15px;
top:4px;

width:28px;
height:23px;

background:#e3eaec;

}

.dino-tail{

position:absolute;

left:0;
top:28px;

width:12px;
height:8px;

background:#e3eaec;

}

.dino-leg{

position:absolute;

bottom:0;

width:7px;
height:14px;

background:#e3eaec;

}

.leg1{

left:9px;

}

.leg2{

left:25px;

}

.eye{

position:absolute;

left:35px;
top:10px;

width:4px;
height:4px;

background:#152025;

}

.cactus{

position:absolute;

bottom:49px;

width:18px;
height:43px;

background:#bd5961;

z-index:8;

}

.cactus:before{

content:"";

position:absolute;

left:-7px;

top:17px;

width:8px;
height:17px;

background:#bd5961;

}

.cactus:after{

content:"";

position:absolute;

right:-6px;

top:6px;

width:8px;
height:17px;

background:#bd5961;

}

.controls{

position:absolute;

left:0;
right:0;

bottom:20px;

display:flex;

justify-content:center;

gap:10px;

z-index:20;

}

button{

width:68px;
height:44px;

border-radius:12px;

border:1px solid #425158;

background:#26343a;

color:#fff;

font-size:18px;

font-weight:900;

}

button:active{

transform:scale(.94);

background:#34444b;

}

#status{

position:absolute;

left:0;
right:0;

bottom:8px;

text-align:center;

font-size:8px;

letter-spacing:1px;

color:#7c898e;

}

.overlay{

position:absolute;

inset:0;

z-index:100;

display:flex;

align-items:center;

justify-content:center;

background:rgba(8,13,15,.86);

backdrop-filter:blur(6px);

}

.modal{

width:86%;

max-width:380px;

padding:25px;

border-radius:20px;

border:1px solid #46545a;

background:#202b30;

text-align:center;

}

.modal h1{

margin:0 0 12px;

font-size:26px;

}

.modal p{

font-size:13px;

line-height:1.5;

color:#a3adb1;

}

.play{

width:100%;

margin-top:10px;

}

</style>

</head>


<body>

<div id="app">

<div id="top">

<div id="icon">
🎮
</div>

<div>

<div id="title">
KYARA GAME
</div>

<div id="subtitle">
DINO RUNNER
</div>

</div>

</div>


<div id="content">

<div id="game">


<div id="scorebar">

<div>

<div class="label">
NÍVEL DINO
</div>

<div
class="value"
style="font-family:Arial;font-size:13px"
>
DINO RUNNER
</div>

</div>


<div>

<div class="label">
PONTOS
</div>

<div
class="value"
id="score"
>
00000
</div>

</div>


<div>

<div class="label">
RECORDE
</div>

<div
class="value"
id="record"
>
00000
</div>

</div>

</div>


<div id="arena">

<div class="cloud c1"></div>
<div class="cloud c2"></div>
<div class="cloud c3"></div>


<div id="ground"></div>


<div id="dino">

<div class="dino-tail"></div>

<div class="dino-body"></div>

<div class="dino-head"></div>

<div class="dino-leg leg1"></div>

<div class="dino-leg leg2"></div>

<div class="eye"></div>

</div>


</div>


<div id="status">
TOQUE OU ▲ PARA COMEÇAR
</div>


<div class="controls">

<button id="jump">
▲
</button>

<button id="duck">
▼
</button>

</div>


<div
class="overlay"
id="start"
>

<div class="modal">

<h1>
🎮 KYARA GAME
</h1>

<p>
🦖 DINO RUNNER
<br><br>
Pule os obstáculos e tente bater o recorde.
</p>

<button
class="play"
id="startBtn"
>
▶ COMEÇAR
</button>

</div>

</div>


<div
class="overlay"
id="gameover"
style="display:none"
>

<div class="modal">

<h1>
💥 GAME OVER
</h1>

<p>

PONTOS

<br>

<strong id="finalScore">
00000
</strong>

</p>

<p
id="newRecord"
style="display:none"
>
🏆 NOVO RECORDE!
</p>

<button
class="play"
id="restart"
>
↻ JOGAR NOVAMENTE
</button>

</div>

</div>


</div>

</div>

</div>


<script>

const arena =
document.getElementById(
"arena"
);

const dino =
document.getElementById(
"dino"
);

const scoreEl =
document.getElementById(
"score"
);

const recordEl =
document.getElementById(
"record"
);

const statusEl =
document.getElementById(
"status"
);

const start =
document.getElementById(
"start"
);

const gameover =
document.getElementById(
"gameover"
);

const startBtn =
document.getElementById(
"startBtn"
);

const restart =
document.getElementById(
"restart"
);

const jumpBtn =
document.getElementById(
"jump"
);

const duckBtn =
document.getElementById(
"duck"
);

const finalScore =
document.getElementById(
"finalScore"
);

const newRecord =
document.getElementById(
"newRecord"
);


let running=false;

let jumping=false;

let ducking=false;

let y=0;

let vy=0;

let score=0;

let record=
Number(
localStorage.getItem(
"kyara_dino_record"
)||0
);

let last=0;

let spawnTimer=0;

let spawnNext=.9;

let obstacles=[];


recordEl.textContent=
String(record).padStart(5,"0");


function format(n){

return String(
Math.floor(n)
).padStart(5,"0");

}


function reset(){

for(
const o of obstacles
){

o.el.remove();

}

obstacles=[];

score=0;

y=0;

vy=0;

jumping=false;

ducking=false;

spawnTimer=0;

spawnNext=.8;

dino.style.bottom=
"49px";

dino.style.transform=
"scaleY(1)";

scoreEl.textContent=
"00000";

}


function jump(){

if(!running){

startGame();

return;

}

if(jumping)
return;

jumping=true;

vy=720;

}


function setDuck(value){

if(!running)
return;

ducking=value;

dino.style.transform=
value
?"scaleY(.65)"
:"scaleY(1)";

}


function spawnCactus(){

const el=
document.createElement(
"div"
);

el.className="cactus";

const h=
Math.random();

if(h>.8){

el.style.height=
"54px";

}

if(h<.25){

el.style.height=
"31px";

el.style.width=
"14px";

}

let x=
arena.clientWidth+30;

el.style.left=
x+"px";

arena.appendChild(el);

obstacles.push({

el,

x

});

}


function collision(){

const dl=45;

const dr=82;

const db=49+y;

const dt=
db+
(
ducking
?31
:47
);

for(
const o of obstacles
){

const ol=o.x;

const or=
ol+
o.el.offsetWidth;

const ob=49;

const ot=
ob+
o.el.offsetHeight;

if(

dr-7>ol&&
dl+7<or&&
db<ot&&
dt>ob

){

return true;

}

}

return false;

}


function endGame(){

running=false;

const value=
Math.floor(score);

finalScore.textContent=
format(value);

if(value>record){

record=value;

localStorage.setItem(
"kyara_dino_record",
record
);

recordEl.textContent=
format(record);

newRecord.style.display=
"block";

}else{

newRecord.style.display=
"none";

}

statusEl.textContent=
"GAME OVER";

gameover.style.display=
"flex";

}


function startGame(){

reset();

start.style.display=
"none";

gameover.style.display=
"none";

statusEl.textContent=
"TOQUE PARA PULAR";

running=true;

last=
performance.now();

requestAnimationFrame(loop);

}


function loop(time){

if(!running)
return;

const dt=
Math.min(
.035,
(time-last)/1000
);

last=time;

score+=
dt*10;

scoreEl.textContent=
format(score);


const speed=
280+
Math.min(
300,
score*1.5
);


if(jumping){

vy-=
1900*dt;

y+=
vy*dt;

if(y<=0){

y=0;

vy=0;

jumping=false;

}

}


dino.style.bottom=
(49+y)+"px";


spawnTimer+=dt;

if(
spawnTimer>=spawnNext
){

spawnTimer=0;

spawnNext=
.75+
Math.random()*.9;

spawnCactus();

}


for(
let i=
obstacles.length-1;

i>=0;

i--
){

const o=
obstacles[i];

o.x-=
speed*dt;

o.el.style.left=
o.x+"px";


if(
o.x<-100
){

o.el.remove();

obstacles.splice(
i,
1
);

}

}


if(
collision()
){

endGame();

return;

}


requestAnimationFrame(
loop
);

}


window.addEventListener(
"keydown",
event=>{

if(

event.code==="Space"||
event.code==="ArrowUp"||
event.code==="KeyW"

){

event.preventDefault();

jump();

}


if(

event.code==="ArrowDown"||
event.code==="KeyS"

){

event.preventDefault();

setDuck(true);

}

}
);


window.addEventListener(
"keyup",
event=>{

if(

event.code==="ArrowDown"||
event.code==="KeyS"

){

setDuck(false);

}

}
);


jumpBtn.addEventListener(
"pointerdown",
event=>{

event.preventDefault();

jump();

}
);


duckBtn.addEventListener(
"pointerdown",
event=>{

event.preventDefault();

setDuck(true);

}
);


duckBtn.addEventListener(
"pointerup",
()=>setDuck(false)
);


duckBtn.addEventListener(
"pointercancel",
()=>setDuck(false)
);


arena.addEventListener(
"pointerdown",
event=>{

if(
event.target.closest(
"button"
)
){

return;

}

if(!running){

startGame();

}else{

jump();

}

}
);


startBtn.addEventListener(
"click",
startGame
);


restart.addEventListener(
"click",
startGame
);

</script>

</body>

</html>
HTML_EOF


echo "🔧 Corrigindo integração..."

python3 - <<'PY'
from pathlib import Path
import re

p = Path(
    "dados/src/features/kyaraSpecialCommands.js"
)

s = p.read_text()


# Importa sendBrowserHtml se ainda não estiver importado.

if "sendBrowserHtml" not in s:

    old = """import {
  handleBrowserCommand
} from './kyaraBrowser.js';"""

    new = """import {
  handleBrowserCommand,
  sendBrowserHtml
} from './kyaraBrowser.js';"""

    if old not in s:

        raise SystemExit(
            "❌ Não encontrei o import do kyaraBrowser.js"
        )

    s = s.replace(
        old,
        new,
        1
    )


# Remove somente o handler antigo do KYARA GAME.

pattern = re.compile(
    r"//\s*KYARA GAME.*?"
    r"(?=export\s+async\s+function\s+handleKyaraSpecialCommand)",
    re.S
)

replacement = r'''// ============================================================
// KYARA GAME
// Usa EXATAMENTE o mesmo mecanismo Rich HTML do KYARA SITE.
// ============================================================

async function handleKyaraGameCommand(
  options = {}
) {

  const command = String(
    options.command ||
    options.cmd ||
    options.commandName ||
    ""
  )
  .trim()
  .toLowerCase()
  .replace(/^[/!]/, "");


  if (
    ![
      "jogo",
      "game",
      "kyarajogo"
    ].includes(command)
  ) {

    return false;

  }


  try {

    const fs =
      await import("fs/promises");

    const html =
      await fs.readFile(
        "dados/api/kyara-jogo.html",
        "utf8"
      );


    await sendBrowserHtml(
      options,
      html
    );


    console.log(
      "[KYARA GAME] ✅ Rich HTML enviado."
    );


    return true;

  } catch (error) {

    console.error(
      "[KYARA GAME]",
      error
    );


    if (
      typeof options.reply ===
      "function"
    ) {

      await options.reply(
        "❌ Erro ao abrir o KYARA GAME."
      );

    }


    return true;

  }

}


'''

if pattern.search(s):

    s = pattern.sub(
        replacement,
        s,
        count=1
    )

else:

    print(
        "⚠️ Handler antigo não encontrado; não será duplicado."
    )


# Coloca o game antes do browser.

marker = """  const browserHandled =
    await handleBrowserCommand(
      options
    );"""

if marker in s:

    if "const gameHandled =" not in s:

        s = s.replace(
            marker,
            """  const gameHandled =
    await handleKyaraGameCommand(
      options
    );

  if (gameHandled) {
    return true;
  }

""" + marker,
            1
        )

else:

    print(
        "⚠️ Não encontrei o ponto de entrada do browser."
    )


p.write_text(s)

print(
    "✅ Integração corrigida."
)

PY


echo ""
echo "🔎 Validando..."

node --check \
dados/src/features/kyaraSpecialCommands.js

node --check \
dados/api/server.mjs

echo ""
echo "=========================================="
echo "       ✅ CORREÇÃO CONCLUÍDA"
echo "=========================================="
echo ""

echo "🎮 Comandos:"
echo ""
echo "/jogo"
echo "/game"
echo "/kyarajogo"
echo ""

echo "🚀 Agora execute:"
echo ""
echo "node ."
echo ""

