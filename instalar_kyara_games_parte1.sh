#!/data/data/com.termux/files/usr/bin/bash

set -e

cd ~/storage/BKkyara-

echo ""
echo "=============================================="
echo "       🎮 KYARA GAMES — PARTE 1"
echo "=============================================="
echo ""

STAMP=$(date +%Y%m%d-%H%M%S)

BACKUP="dados/backup-kyara-games-$STAMP"

mkdir -p "$BACKUP"

echo "💾 Criando backup..."

cp dados/src/features/kyaraSpecialCommands.js \
"$BACKUP/kyaraSpecialCommands.js" 2>/dev/null || true

echo "📁 Criando diretório..."

mkdir -p dados/src/features/kyaraGames


# ============================================================
# CORE DO KYARA GAME
# ============================================================

cat > dados/src/features/kyaraGames/core.js <<'GAMECORE'
import {
  generateWAMessageFromContent
} from 'baileys';


export const HTML_GAME_PRIMITIVE =
  'GenAIaeacdsnwHtmlPrimitive';


function getJid(options = {}) {

  return (
    options.from ||
    options.remoteJid ||
    options.info?.key?.remoteJid
  );

}


function getSocket(options = {}) {

  return (
    options.nazu ||
    options.sock
  );

}


function buildGameMessage(
  html,
  title = 'KYARA GAME'
) {

  const unified = {

    response_id:
      crypto.randomUUID(),

    sections: [

      {

        view_model: {

          primitive: {

            __typename:
              HTML_GAME_PRIMITIVE,

            payload:
              html,

            trusted_sources: [
              'zone.api.br'
            ]

          },

          __typename:
            'GenAISingleLayoutViewModel'

        }

      }

    ]

  };


  return {

    messageContextInfo: {

      deviceListMetadata: {},

      deviceListMetadataVersion: 2,

      botMetadata: {

        messageDisclaimerText: '',

        botResponseId:
          crypto.randomUUID(),

        verificationMetadata: {

          proofs: []

        }

      }

    },


    botForwardedMessage: {

      message: {

        richResponseMessage: {

          messageType: 1,

          submessages: [

            {

              messageType: 2,

              messageText:
                title

            }

          ],


          unifiedResponse: {

            data:

              Buffer
                .from(
                  JSON.stringify(
                    unified
                  ),
                  'utf8'
                )
                .toString(
                  'base64'
                )

          },


          contextInfo: {

            forwardingScore:
              1,

            isForwarded:
              true,

            forwardedAiBotMessageInfo: {

              botJid:
                '867051314767696@bot'

            },

            forwardOrigin:
              4

          }

        }

      }

    }

  };

}


export async function sendGame(
  options = {},
  html,
  title = 'KYARA GAME'
) {

  const jid =
    getJid(options);


  const socket =
    getSocket(options);


  if (!jid) {

    throw new Error(
      'JID do chat não encontrado.'
    );

  }


  if (
    !socket ||
    typeof socket.relayMessage !==
      'function'
  ) {

    throw new Error(
      'Socket da Kyara não possui relayMessage().'
    );

  }


  const content =
    buildGameMessage(
      html,
      title
    );


  const message =
    generateWAMessageFromContent(

      jid,

      content,

      {

        quoted:
          options.info

      }

    );


  await socket.relayMessage(

    jid,

    message.message,

    {

      messageId:
        message.key.id

    }

  );


  return true;

}


export async function runGame(
  options = {},
  game
) {

  if (
    !game ||
    typeof game.html !==
      'function'
  ) {

    throw new Error(
      'Jogo inválido.'
    );

  }


  const html =
    await game.html(
      options
    );


  return sendGame(

    options,

    html,

    game.title ||
      'KYARA GAME'

  );

}
GAMECORE


# ============================================================
# DINO
# ============================================================

cat > dados/src/features/kyaraGames/dino.js <<'DINOGAME'
import {
  runGame
} from './core.js';


const html = () => `<!doctype html>

<html lang="pt-BR">

<head>

<meta charset="utf-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">

<title>KYARA DINO</title>

<style>

*{
box-sizing:border-box;
-webkit-tap-highlight-color:transparent;
}

html,
body{

margin:0;
width:100%;
height:100%;

overflow:hidden;

background:#11191d;

color:#eef3f4;

font-family:
Arial,
sans-serif;

touch-action:none;

}

body{

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

.top{

height:70px;

padding:11px 17px;

display:flex;

align-items:center;

justify-content:space-between;

background:
linear-gradient(
180deg,
#202c31,
#182227
);

border-bottom:
1px solid #354249;

}

.brand{

display:flex;
align-items:center;
gap:10px;

}

.logo{

width:43px;
height:43px;

border-radius:13px;

display:flex;
align-items:center;
justify-content:center;

font-size:22px;

background:
linear-gradient(
135deg,
#6d5cff,
#5049e8
);

}

.name{

font-size:17px;
font-weight:900;

}

.sub{

font-size:9px;

color:#89969b;

margin-top:4px;

}

.mode{

font-size:9px;
color:#76848a;

}

.card{

position:absolute;

left:16px;
right:16px;

top:86px;
bottom:78px;

padding:12px;

border:
1px solid #39474d;

border-radius:20px;

background:
linear-gradient(
180deg,
#202b30,
#182227
);

}

.header{

height:53px;

display:grid;

grid-template-columns:1fr auto auto;

gap:20px;

align-items:center;

padding:0 10px 9px;

border-bottom:
1px solid #344148;

}

small{

display:block;

font-size:8px;

letter-spacing:1.6px;

color:#7d8b90;

margin-bottom:4px;

}

.value{

font-family:monospace;

font-size:18px;

font-weight:900;

}

.game{

position:absolute;

left:12px;
right:12px;

top:76px;
bottom:50px;

overflow:hidden;

border:
1px solid #2d3b41;

border-radius:16px;

background:
linear-gradient(
180deg,
#18252b,
#142026
);

}

.cloud{

position:absolute;

height:7px;

border-radius:10px;

background:#64747b;

opacity:.75;

}

.cloud:before,
.cloud:after{

content:"";

position:absolute;

background:#64747b;

border-radius:50%;

}

.cloud:before{

width:17px;
height:11px;

left:7px;
top:-5px;

}

.cloud:after{

width:22px;
height:13px;

left:20px;
top:-7px;

}

.c1{

width:32px;
left:13%;
top:20%;

}

.c2{

width:42px;
left:43%;
top:26%;

}

.c3{

width:29px;
left:76%;
top:17%;

}

.ground{

position:absolute;

left:0;
right:0;

bottom:49px;

height:2px;

background:#718087;

}

.ground:after{

content:"";

position:absolute;

left:0;
right:0;

top:13px;

height:2px;

background:
repeating-linear-gradient(
to right,
#34434a 0 18px,
transparent 18px 38px
);

}

#dino{

position:absolute;

left:45px;
bottom:49px;

width:45px;
height:50px;

z-index:8;

image-rendering:pixelated;

}

.body{

position:absolute;

left:8px;
top:16px;

width:25px;
height:28px;

background:#e3eaec;

}

.head{

position:absolute;

left:15px;
top:3px;

width:27px;
height:22px;

background:#e3eaec;

}

.tail{

position:absolute;

left:0;
top:27px;

width:11px;
height:8px;

background:#e3eaec;

}

.leg{

position:absolute;

bottom:0;

width:7px;
height:14px;

background:#e3eaec;

}

.l1{left:9px}
.l2{left:25px}

.eye{

position:absolute;

left:34px;
top:9px;

width:4px;
height:4px;

background:#172126;

}

.cactus{

position:absolute;

bottom:49px;

width:19px;
height:43px;

background:#ba5960;

z-index:6;

}

.cactus:before{

content:"";

position:absolute;

left:-7px;
top:16px;

width:8px;
height:17px;

background:#ba5960;

}

.cactus:after{

content:"";

position:absolute;

right:-6px;
top:6px;

width:8px;
height:17px;

background:#ba5960;

}

.big{

height:52px;

}

.small{

width:14px;
height:31px;

}

.status{

position:absolute;

left:0;
right:0;

bottom:13px;

text-align:center;

font-size:8px;

letter-spacing:1px;

color:#7c898e;

}

.controls{

position:absolute;

bottom:20px;

left:0;
right:0;

display:flex;

justify-content:center;

gap:10px;

z-index:20;

}

.btn{

width:64px;
height:43px;

border:
1px solid #3b4a50;

border-radius:12px;

background:#202d32;

color:white;

font-size:18px;

font-weight:900;

}

.btn:active{

transform:scale(.93);

background:#304047;

}

.overlay{

position:absolute;

inset:0;

z-index:30;

display:flex;

align-items:center;

justify-content:center;

background:
rgba(8,13,15,.84);

backdrop-filter:blur(7px);

}

.modal{

width:min(88%,390px);

padding:26px;

text-align:center;

border:
1px solid #435158;

border-radius:20px;

background:#202b30;

}

.modal h1{

margin:0 0 10px;

font-size:28px;

}

.modal p{

color:#9ba6aa;

font-size:13px;

line-height:1.5;

}

.play{

width:100%;

padding:14px;

border:1px solid #46565d;

border-radius:12px;

background:#2a383e;

color:white;

font-weight:900;

}

.footer{

position:absolute;

bottom:4px;

left:0;
right:0;

text-align:center;

font-size:8px;

color:#59666b;

}

</style>

</head>

<body>

<div id="app">

<div class="top">

<div class="brand">

<div class="logo">🎮</div>

<div>

<div class="name">
KYARA GAME
</div>

<div class="sub">
Dino Runner • Rich HTML
</div>

</div>

</div>

<div class="mode">
KYARA://GAME
</div>

</div>


<div class="card">

<div class="header">

<div>

<small>NÍVEL DINO</small>

<div
class="value"
style="font-family:Arial;font-size:14px"
>
DINO RUNNER
</div>

</div>

<div>

<small>PONTOS</small>

<div
class="value"
id="score"
>
00000
</div>

</div>

<div>

<small>RECORDE</small>

<div
class="value"
id="record"
>
00000
</div>

</div>

</div>


<div
class="game"
id="game"
>

<div class="cloud c1"></div>
<div class="cloud c2"></div>
<div class="cloud c3"></div>

<div class="ground"></div>


<div id="dino">

<div class="tail"></div>
<div class="body"></div>
<div class="head"></div>

<div class="leg l1"></div>
<div class="leg l2"></div>

<div class="eye"></div>

</div>


</div>


<div
class="status"
id="status"
>
TOQUE PARA PULAR
</div>

</div>


<div class="controls">

<button
class="btn"
id="jump"
>
▲
</button>

<button
class="btn"
id="duck"
>
▼
</button>

</div>


<div class="footer">
KYARA • BAKI
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
Pule os obstáculos e tente bater seu recorde.
</p>

<button
class="play"
id="play"
>
▶ COMEÇAR
</button>

</div>

</div>


<div
class="overlay"
id="over"
style="display:none"
>

<div class="modal">

<h1>
GAME OVER
</h1>

<p>
Pontuação:
<strong id="final">
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
id="again"
>
↻ JOGAR NOVAMENTE
</button>

</div>

</div>


</div>


<script>

const game =
document.getElementById("game");

const dino =
document.getElementById("dino");

const scoreEl =
document.getElementById("score");

const recordEl =
document.getElementById("record");

const statusEl =
document.getElementById("status");

const start =
document.getElementById("start");

const over =
document.getElementById("over");

const finalEl =
document.getElementById("final");

const newRecord =
document.getElementById("newRecord");

const play =
document.getElementById("play");

const again =
document.getElementById("again");

const jumpBtn =
document.getElementById("jump");

const duckBtn =
document.getElementById("duck");


let running=false;

let score=0;

let record=
Number(
localStorage.getItem(
"kyara_dino_record"
)||0
);

let speed=280;

let y=0;

let velocity=0;

let jumping=false;

let ducking=false;

let last=0;

let spawn=0;

let next=.9;

let obstacles=[];


function fmt(v){

return String(
Math.floor(v)
).padStart(5,"0");

}


recordEl.textContent=
fmt(record);


function reset(){

score=0;

speed=280;

y=0;

velocity=0;

jumping=false;

ducking=false;

spawn=0;

next=.9;

obstacles.forEach(
o=>o.el.remove()
);

obstacles=[];

dino.style.bottom="49px";

dino.style.transform=
"scaleY(1)";

scoreEl.textContent="00000";

}


function jump(){

if(!running)
return;

if(jumping)
return;

jumping=true;

velocity=720;

}


function duck(v){

if(!running)
return;

ducking=v;

dino.style.transform=
v
?"scaleY(.65)"
:"scaleY(1)";

}


function addCactus(){

const el=
document.createElement(
"div"
);

el.className="cactus";

const r=
Math.random();

if(r<.25)
el.classList.add("small");

if(r>.80)
el.classList.add("big");

const x=
game.clientWidth+30;

el.style.left=
x+"px";

game.appendChild(el);

obstacles.push({
el,
x
});

}


function hit(){

const dl=45;

const dr=83;

const db=49+y;

const dt=
db+
(
ducking
?31
:46
);

for(
const o
of obstacles
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


function gameOver(){

running=false;

const value=
Math.floor(score);

finalEl.textContent=
fmt(value);

if(value>record){

record=value;

localStorage.setItem(
"kyara_dino_record",
record
);

recordEl.textContent=
fmt(record);

newRecord.style.display=
"block";

}else{

newRecord.style.display=
"none";

}

statusEl.textContent=
"FIM DE JOGO";

over.style.display=
"flex";

}


function startGame(){

reset();

start.style.display=
"none";

over.style.display=
"none";

statusEl.textContent=
"TOQUE PARA PULAR";

running=true;

last=
performance.now();

requestAnimationFrame(loop);

}


function loop(t){

if(!running)
return;

const dt=
Math.min(
.035,
(t-last)/1000
);

last=t;

score+=
dt*10;

scoreEl.textContent=
fmt(score);

speed=
280+
Math.min(
300,
score*1.5
);


if(jumping){

velocity-=
1900*dt;

y+=
velocity*dt;

if(y<=0){

y=0;

velocity=0;

jumping=false;

}

}


dino.style.bottom=
(49+y)+"px";


spawn+=dt;

if(spawn>=next){

spawn=0;

next=
.8+
Math.random()*.95;

addCactus();

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

if(o.x<-100){

o.el.remove();

obstacles.splice(i,1);

}

}


if(hit()){

gameOver();

return;

}


requestAnimationFrame(loop);

}


window.addEventListener(
"keydown",
e=>{

if(

e.code==="Space"||
e.code==="ArrowUp"||
e.code==="KeyW"

){

e.preventDefault();

if(!running){

startGame();

}else{

jump();

}

}


if(

e.code==="ArrowDown"||
e.code==="KeyS"

){

e.preventDefault();

duck(true);

}

}
);


window.addEventListener(
"keyup",
e=>{

if(

e.code==="ArrowDown"||
e.code==="KeyS"

){

duck(false);

}

}
);


jumpBtn.addEventListener(
"pointerdown",
e=>{

e.preventDefault();

jump();

}
);


duckBtn.addEventListener(
"pointerdown",
e=>{

e.preventDefault();

duck(true);

}
);


duckBtn.addEventListener(
"pointerup",
()=>duck(false)
);


duckBtn.addEventListener(
"pointercancel",
()=>duck(false)
);


game.addEventListener(
"pointerdown",
e=>{

if(!running)
return;

if(
e.target.closest(
".cactus"
)
)
return;

jump();

}
);


play.addEventListener(
"click",
startGame
);


again.addEventListener(
"click",
startGame
);

</script>

</body>

</html>`;


export async function handleDino(
  options = {}
) {

  const command =
    String(
      options.command ||
      options.cmd ||
      options.commandName ||
      ""
    )
    .trim()
    .toLowerCase()
    .replace(/^[/!]/,"");


  if(
    ![
      "jogo",
      "game",
      "dino",
      "kyarajogo"
    ].includes(command)
  ){

    return false;

  }


  try{

    await runGame(

      options,

      {
        title:
          "KYARA GAME",

        html

      }

    );

    console.log(
      "[KYARA GAME] 🦖 Dino enviado como Rich HTML."
    );

  }catch(error){

    console.error(
      "[KYARA GAME]",
      error
    );

    if(
      typeof options.reply===
      "function"
    ){

      await options.reply(
        "❌ Não consegui abrir o KYARA GAME."
      );

    }

  }

  return true;

}
DINOGAME


# ============================================================
# INDEX
# ============================================================

cat > dados/src/features/kyaraGames/index.js <<'INDEX'
import {
  handleDino
} from './dino.js';


export async function handleKyaraGame(
  options = {}
) {

  return handleDino(
    options
  );

}
INDEX


# ============================================================
# PATCH SPECIAL COMMANDS
# ============================================================

python3 - <<'PY'
from pathlib import Path

p = Path(
    "dados/src/features/kyaraSpecialCommands.js"
)

s = p.read_text()

# ------------------------------------------------------------
# IMPORT
# ------------------------------------------------------------

if "kyaraGames/index.js" not in s:

    marker = """import {
  handleBrowserCommand
} from './kyaraBrowser.js';
"""

    if marker not in s:

        raise SystemExit(
            "❌ Import do kyaraBrowser.js não encontrado."
        )

    replacement = marker + """
import {
  handleKyaraGame
} from './kyaraGames/index.js';
"""

    s = s.replace(
        marker,
        replacement,
        1
    )


# ------------------------------------------------------------
# REMOVE HANDLER ANTIGO DO JOGO
# ------------------------------------------------------------

start =
s.find(
    "// KYARA GAME — página externa"
)

if start != -1:

    end =
    s.find(
        "export async function handleKyaraSpecialCommand",
        start
    )

    if end == -1:

        raise SystemExit(
            "❌ Final do handler antigo não encontrado."
        )

    s =
    s[:start] +
    s[end:]


# ------------------------------------------------------------
# ADICIONA NOVO HANDLER
# ------------------------------------------------------------

marker = """  const browserHandled =
    await handleBrowserCommand(
      options
    );
"""

if marker not in s:

    raise SystemExit(
        "❌ Bloco do KYARA BROWSER não encontrado."
    )


replacement = """  /*
   * ============================================================
   * KYARA GAMES
   * ============================================================
   */

  const gameHandled =
    await handleKyaraGame(
      options
    );

  if (gameHandled) {
    return true;
  }

  /*
   * ============================================================
   * KYARA BROWSER
   * ============================================================
   */

""" + marker


s = s.replace(
    marker,
    replacement,
    1
)


p.write_text(s)

print(
    "✅ KYARA GAMES conectado ao sistema principal."
)

PY


# ============================================================
# VALIDAÇÃO
# ============================================================

echo ""
echo "🔎 Verificando arquivos..."

node --check \
dados/src/features/kyaraGames/core.js

node --check \
dados/src/features/kyaraGames/dino.js

node --check \
dados/src/features/kyaraGames/index.js

node --check \
dados/src/features/kyaraSpecialCommands.js


echo ""
echo "=============================================="
echo "       ✅ PARTE 1 CONCLUÍDA"
echo "=============================================="
echo ""

echo "🦖 /jogo"
echo "🦖 /game"
echo "🦖 /dino"
echo "🦖 /kyarajogo"

echo ""
echo "Agora reinicie o bot:"
echo ""
echo "node ."
echo ""

