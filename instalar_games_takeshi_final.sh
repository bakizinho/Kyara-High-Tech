#!/data/data/com.termux/files/usr/bin/bash

set -e

cd ~/storage/BKkyara-

echo ""
echo "======================================================"
echo "        🎮 KYARA GAMES — TAKESHI ENGINE"
echo "======================================================"
echo ""

STAMP="$(date +%Y%m%d-%H%M%S)"

BACKUP="dados/backup-antes-games-final-$STAMP"

mkdir -p "$BACKUP"

echo "💾 Criando backup de segurança..."

cp -f dados/src/features/kyaraBrowser.js \
      "$BACKUP/kyaraBrowser.js" \
      2>/dev/null || true

cp -f dados/src/features/kyaraGame.js \
      "$BACKUP/kyaraGame.js" \
      2>/dev/null || true

cp -f dados/src/features/kyaraSpecialCommands.js \
      "$BACKUP/kyaraSpecialCommands.js" \
      2>/dev/null || true

cp -f dados/src/features/kyaraGames/core.js \
      "$BACKUP/core.js" \
      2>/dev/null || true

echo "✅ Backup criado:"
echo "$BACKUP"
echo ""


# ==========================================================
# 1. CORRIGE KYARA BROWSER
# ==========================================================

echo "🔧 Corrigindo mecanismo Rich HTML do KYARA SITE..."

python3 - <<'PY'
from pathlib import Path
import re

p = Path("dados/src/features/kyaraBrowser.js")

if not p.exists():
    raise SystemExit(
        "❌ kyaraBrowser.js não encontrado."
    )

s = p.read_text()


# ----------------------------------------------------------
# O Takeshi envia:
#
# Buffer.from(JSON.stringify(unifiedResponse), "utf8")
#
# NÃO:
#
# .toString("base64")
# ----------------------------------------------------------

old = '''Buffer.from(
                JSON.stringify(
                  unifiedData
                ),
                'utf8'
              ).toString('base64')'''

new = '''Buffer.from(
                JSON.stringify(
                  unifiedData
                ),
                'utf8'
              )'''


if old in s:

    s = s.replace(
        old,
        new
    )

    print(
        "✅ Base64 removido do KYARA BROWSER."
    )

else:

    # Formatação alternativa.

    s2 = re.sub(
        r'''Buffer\s*\.\s*from\s*\(\s*
            JSON\.stringify\s*\(\s*
            unifiedData\s*
            \)\s*,\s*
            ['"]utf8['"]\s*
            \)\s*
            \.\s*toString\s*\(\s*['"]base64['"]\s*\)''',
        '''Buffer.from(
                JSON.stringify(
                  unifiedData
                ),
                'utf8'
              )''',
        s,
        flags=re.VERBOSE
    )

    if s2 != s:

        s = s2

        print(
            "✅ Base64 removido por correção alternativa."
        )

    else:

        print(
            "ℹ️ Nenhum Base64 antigo encontrado no browser."
        )


p.write_text(s)

PY


# ==========================================================
# 2. CORRIGE KYARA GAME
# ==========================================================

echo "🔧 Corrigindo kyaraGame.js..."

python3 - <<'PY'
from pathlib import Path
import re

p = Path(
    "dados/src/features/kyaraGame.js"
)

if not p.exists():

    raise SystemExit(
        "❌ kyaraGame.js não encontrado."
    )

s = p.read_text()


# ----------------------------------------------------------
# Corrige Buffer Base64.
# ----------------------------------------------------------

s2 = re.sub(
    r'''Buffer
                \.from\s*\(
                  JSON\.stringify\s*\(
                    unifiedData
                  \),
                  "utf8"
                \)
                \.toString\s*\(
                  "base64"
               \)''',
    '''Buffer
                .from(
                  JSON.stringify(
                    unifiedData
                  ),
                  "utf8"
                )''',
    s
)


s2 = re.sub(
    r'''Buffer
                \.from\s*\(
                  JSON\.stringify\s*\(
                    unifiedData
                  \),
                  ['"]utf8['"]
                \)
                \.toString\s*\(
                  ['"]base64['"]
                \)''',
    '''Buffer
                .from(
                  JSON.stringify(
                    unifiedData
                  ),
                  "utf8"
                )''',
    s2
)


if s2 != s:

    print(
        "✅ Base64 removido do KYARA GAME."
    )

else:

    print(
        "ℹ️ Nenhum Base64 antigo encontrado no kyaraGame."
    )


p.write_text(s2)

PY


# ==========================================================
# 3. CORRIGE CORE DOS JOGOS
# ==========================================================

echo "🔧 Corrigindo core dos jogos..."

python3 - <<'PY'
from pathlib import Path
import re

p = Path(
    "dados/src/features/kyaraGames/core.js"
)

if not p.exists():

    print(
        "⚠️ core.js não encontrado. Continuando."
    )

else:

    s = p.read_text()


    # O core usa crypto.randomUUID(),
    # portanto garante o import.

    if (
        "import crypto" not in s
        and "from 'crypto'" not in s
        and 'from "crypto"' not in s
    ):

        s = (
            "import crypto from 'node:crypto';\n\n"
            + s
        )

        print(
            "✅ Import crypto corrigido."
        )


    # Remove Base64.

    s2 = re.sub(
        r'''\.toString\s*\(\s*['"]base64['"]\s*\)''',
        '',
        s
    )


    if s2 != s:

        print(
            "✅ Base64 removido do core."
        )

        s = s2


    p.write_text(s)

PY


# ==========================================================
# 4. CRIA UM ADAPTADOR UNIVERSAL
# ==========================================================

echo "🎮 Criando adaptador universal dos jogos..."

mkdir -p dados/src/utils


cat > dados/src/utils/htmlGame.js <<'HTMLGAMEEOF'
/**
 * KYARA HTML GAMES
 *
 * Adaptador do sistema Rich HTML utilizado pelo Takeshi.
 */

import crypto from "node:crypto";
import {
  generateWAMessageFromContent
} from "baileys";


export const HTML_GAME_PRIMITIVE =
  "GenAIaeacdsnwHtmlPrimitive";


export const HTML_GAME_TRUSTED_SOURCES = [
  "nixel.dev",
  "zone.api.br"
];


function getJid(options = {}) {

  return (
    options.from ||
    options.remoteJid ||
    options.info?.key?.remoteJid
  );

}


function getSocket(options = {}) {

  return (
    options.sock ||
    options.nazu ||
    options.socket
  );

}


function normalizeHtml(html) {

  if (
    typeof html !== "string" ||
    !html.trim()
  ) {

    throw new TypeError(
      "O HTML do jogo está vazio."
    );

  }

  return html.trim();

}


export function buildHtmlGameMessage(
  html,
  {
    submessageText =
      "KYARA HTML GAME"
  } = {}
) {

  const payload =
    normalizeHtml(html);


  const unifiedResponse = {

    response_id:
      crypto.randomUUID(),

    sections: [

      {

        view_model: {

          primitive: {

            __typename:
              HTML_GAME_PRIMITIVE,

            payload,

            trusted_sources:
              [
                ...HTML_GAME_TRUSTED_SOURCES
              ]

          },

          __typename:
            "GenAISingleLayoutViewModel"

        }

      }

    ]

  };


  /*
   * IMPORTANTE:
   *
   * O Takeshi envia o JSON em Buffer.
   *
   * Não converter para Base64.
   */

  const data =
    Buffer.from(
      JSON.stringify(
        unifiedResponse
      ),
      "utf8"
    );


  return {

    botForwardedMessage: {

      message: {

        richResponseMessage: {

          submessages: [

            {

              messageType: 2,

              messageText:
                String(
                  submessageText ||
                  "KYARA HTML GAME"
                )

            }

          ],

          messageType: 1,

          unifiedResponse: {

            data

          },

          contextInfo: {

            mentionedJid: [],

            groupMentions: [],

            statusAttributions: [],

            forwardingScore: 1,

            isForwarded: true,

            forwardedAiBotMessageInfo: {

              botJid:
                "867051314767696@bot"

            },

            forwardOrigin: 4

          }

        }

      }

    }

  };

}


export async function sendHtmlGame(
  socket,
  jid,
  html,
  options = {}
) {

  if (
    !socket ||
    typeof socket.relayMessage !==
      "function"
  ) {

    throw new Error(
      "Socket não possui relayMessage()."
    );

  }


  if (!jid) {

    throw new Error(
      "JID do chat não encontrado."
    );

  }


  const content =
    buildHtmlGameMessage(
      html,
      options
    );


  const message =
    generateWAMessageFromContent(
      jid,
      content,
      {
        quoted:
          options.quoted
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


export async function sendHtmlGameFromOptions(
  options,
  html,
  config = {}
) {

  const socket =
    getSocket(options);

  const jid =
    getJid(options);


  return sendHtmlGame(
    socket,
    jid,
    html,
    {
      ...config,

      quoted:
        options.info
    }
  );

}
HTMLGAMEEOF


echo "✅ utils/htmlGame.js criado."


# ==========================================================
# 5. CRIA FÁBRICA DE COMANDOS HTML
# ==========================================================

cat > dados/src/games/_htmlGameCommand.js <<'HTMLCOMMANDEOF'
/**
 * KYARA HTML GAME COMMAND
 */

import {
  sendHtmlGameFromOptions
} from "../utils/htmlGame.js";


export const ARCADE_BASE_CSS = `
*{
-webkit-tap-highlight-color:transparent;
-webkit-user-select:none;
user-select:none;
-webkit-touch-callout:none;
box-sizing:border-box
}

body{
margin:0;
background:transparent;
font-family:Arial,sans-serif;
color:#e8edf0;
touch-action:manipulation
}

.wrap{
width:100%;
max-width:620px;
margin:auto;
padding:16px
}

.card{
background:rgba(29,40,47,.97);
border:1px solid rgba(255,255,255,.13);
border-radius:16px;
overflow:hidden;
box-shadow:0 8px 32px rgba(0,0,0,.35)
}

.head{
padding:12px 20px;
border-bottom:1px solid rgba(255,255,255,.1);
display:flex;
justify-content:space-between;
align-items:center;
gap:12px
}

.brand{
font-size:9px;
letter-spacing:1.5px;
color:rgba(255,255,255,.42)
}

.title{
font-size:15px;
font-weight:bold;
color:#fff
}

.stats{
display:flex;
gap:15px;
text-align:right
}

.value{
font:700 16px monospace;
color:#fff
}

.label{
font-size:8px;
color:rgba(255,255,255,.38);
letter-spacing:1px
}

.main{
padding:16px
}

.board{
position:relative;
background:rgba(4,9,12,.35);
border:1px solid rgba(255,255,255,.09);
border-radius:12px;
overflow:hidden
}

.board canvas{
display:block;
width:100%;
height:auto
}

.controls{
display:flex;
gap:8px;
margin-top:10px;
justify-content:center
}

.button{
min-height:45px;
border:1px solid rgba(255,255,255,.15);
border-radius:9px;
color:#fff;
font-weight:bold;
font-size:12px;
background:rgba(255,255,255,.07);
padding:0 16px
}

.primary{
background:linear-gradient(
135deg,
rgba(124,84,227,.75),
rgba(58,125,191,.7)
);
border-color:rgba(158,133,255,.65)
}

.status{
text-align:center;
font:10px monospace;
color:rgba(255,255,255,.45);
margin-top:10px;
min-height:12px
}

.overlay{
position:absolute;
inset:0;
background:rgba(8,14,18,.82);
display:flex;
align-items:center;
justify-content:center;
flex-direction:column;
text-align:center;
z-index:5
}

.overlay.hidden{
display:none
}
`;


export function createHtmlGameCommand({
  name,
  commands,
  description,
  usage,
  html,
  submessageText,
  displayName,
}) {

  return {

    name,

    description,

    commands,

    usage,

    html,

    displayName,

    handle:
      async ({
        socket,
        remoteJid,
        info,
        sendSuccessReact,
        sendErrorReply
      }) => {

        try {

          await sendHtmlGameFromOptions(

            {
              sock:
                socket,

              remoteJid,

              info
            },

            typeof html ===
              "function"
              ? await html()
              : html,

            {
              submessageText
            }

          );


          if (
            typeof sendSuccessReact ===
            "function"
          ) {

            await sendSuccessReact();

          }


        } catch (error) {

          console.error(
            `[${name.toUpperCase()}]`,
            error
          );


          if (
            typeof sendErrorReply ===
            "function"
          ) {

            await sendErrorReply(
              `❌ Não consegui abrir *${displayName}*.`
            );

          }

        }

      }

  };

}
HTMLCOMMANDEOF


echo "✅ Fábrica HTML criada."


# ==========================================================
# 6. CONVERTE OS JOGOS DO TAKESHI PARA A KYARA
# ==========================================================

echo "🎮 Procurando jogos existentes..."

if [ -d "dados/src/games" ]; then

    echo "✅ Diretório dados/src/games encontrado."

else

    mkdir -p dados/src/games

fi


# ==========================================================
# 7. CRIA UM DINO INDEPENDENTE E COMPATÍVEL
# ==========================================================

cat > dados/src/games/dino.js <<'DINOEOF'
/**
 * KYARA DINO RUNNER
 */

import {
  createHtmlGameCommand
} from "./_htmlGameCommand.js";


export const DINO_HTML = String.raw`
<style>

*{
-webkit-tap-highlight-color:transparent;
-webkit-user-select:none;
user-select:none;
box-sizing:border-box
}

body{
margin:0;
background:transparent;
font-family:Arial,sans-serif;
color:#d5dde1;
touch-action:manipulation
}

.wrap{
width:100%;
max-width:620px;
margin:auto;
padding:16px
}

.card{
background:rgba(29,40,47,.96);
border:1px solid rgba(255,255,255,.13);
border-radius:16px;
overflow:hidden;
box-shadow:0 8px 32px rgba(0,0,0,.35)
}

.head{
padding:12px 20px;
border-bottom:1px solid rgba(255,255,255,.1);
display:flex;
justify-content:space-between;
align-items:center
}

.brand{
font-size:9px;
letter-spacing:1.5px;
color:rgba(255,255,255,.42)
}

.title{
font-size:15px;
font-weight:bold;
color:#fff
}

.stats{
display:flex;
gap:16px;
text-align:right
}

.score{
font:700 16px monospace;
color:#fff
}

.label{
font-size:8px;
color:rgba(255,255,255,.38);
letter-spacing:1px
}

.main{
padding:16px
}

.board{
position:relative;
background:rgba(4,9,12,.32);
border:1px solid rgba(255,255,255,.09);
border-radius:12px;
overflow:hidden
}

canvas{
display:block;
width:100%;
height:auto
}

.overlay{
position:absolute;
inset:0;
background:rgba(10,16,20,.78);
display:flex;
align-items:center;
justify-content:center;
flex-direction:column;
text-align:center
}

.hidden{
display:none
}

.gameTitle{
font-size:25px;
font-weight:bold;
letter-spacing:1px
}

.gameSub{
font-size:11px;
color:rgba(255,255,255,.5);
margin-top:8px
}

.start{
margin-top:16px;
padding:11px 22px;
border:1px solid rgba(127,163,180,.55);
border-radius:9px;
background:rgba(82,112,126,.45);
color:#fff;
font-weight:bold;
font-size:11px
}

.status{
text-align:center;
font:10px monospace;
color:rgba(255,255,255,.42);
margin-top:10px
}

</style>

<div class="wrap">

<div class="card">

<div class="head">

<div>

<div class="brand">
NÍVEL DINO
</div>

<div class="title">
DINO RUNNER
</div>

</div>

<div class="stats">

<div>

<div class="label">
PONTOS
</div>

<div
class="score"
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
class="score"
id="best"
>
00000
</div>

</div>

</div>

</div>

<div class="main">

<div
class="board"
id="board"
>

<canvas
id="game"
width="560"
height="420"
></canvas>

<div
id="overlay"
class="overlay"
>

<div
id="gameTitle"
class="gameTitle"
>
DINO RUNNER
</div>

<div
id="gameSub"
class="gameSub"
>
TOQUE PARA PULAR • DESVIE DOS CACTOS
</div>

<button
id="start"
class="start"
>
COMEÇAR
</button>

</div>

</div>

<div
id="status"
class="status"
>
BEST 00000 • VELOCIDADE 1.0x
</div>

</div>

</div>

</div>


<script>

const c =
document.getElementById("game");

const x =
c.getContext("2d");

const board =
document.getElementById("board");

const scoreEl =
document.getElementById("score");

const bestEl =
document.getElementById("best");

const statusEl =
document.getElementById("status");

const overlay =
document.getElementById("overlay");

const gameTitle =
document.getElementById("gameTitle");

const gameSub =
document.getElementById("gameSub");

const start =
document.getElementById("start");


let obstacles=[];

let clouds=[];

let particles=[];

let score=0;

let best=0;

let playing=false;

let last=0;

let speed=4.2;

let spawn=70;

const ground=365;


let dino={
x:55,
y:329,
w:28,
h:36,
vy:0,
onGround:true,
step:0
};


try{

best=
parseInt(
localStorage.getItem(
"kyara_dino_best"
)||"0",
10
)||0;

}catch(e){

best=0;

}


function pad(value){

return String(
Math.floor(value)
).padStart(
5,
"0"
);

}


function updateUI(){

scoreEl.textContent=
pad(score);

bestEl.textContent=
pad(best);

statusEl.textContent=
"BEST "+
pad(best)+
" • VELOCIDADE "+
(speed/4.2).toFixed(1)+
"x";

}


function seedClouds(){

clouds=[];

for(
let i=0;
i<5;
i++
){

clouds.push({

x:
50+i*125+
Math.random()*40,

y:
34+
Math.random()*75,

s:
1+
Math.random()*1.5

});

}

}


function reset(){

obstacles=[];

particles=[];

score=0;

speed=4.2;

spawn=65;

playing=true;

last=0;

dino={

x:55,
y:329,
w:28,
h:36,
vy:0,
onGround:true,
step:0

};

seedClouds();

overlay.classList.add(
"hidden"
);

updateUI();

}


function jump(){

if(!playing){

reset();

return;

}

if(
dino.onGround
){

dino.vy=-13;

dino.onGround=false;

}

}


function addObstacle(){

const tall=
Math.random()>.52;

obstacles.push({

x:580,

y:
tall
?316
:331,

w:
tall
?18
:15,

h:
tall
?49
:34,

arms:
Math.random()>.5

});

}


function hit(a,b){

return (

a.x+5<
b.x+b.w&&

a.x+a.w-4>
b.x&&

a.y+4<
b.y+b.h&&

a.y+a.h-2>
b.y

);

}


function gameOver(){

playing=false;

best=
Math.max(
best,
Math.floor(score)
);

try{

localStorage.setItem(
"kyara_dino_best",
String(best)
);

}catch(e){}

gameTitle.textContent=
"GAME OVER";

gameSub.textContent=
"SCORE "+
pad(score)+
" • TOQUE PARA TENTAR DE NOVO";

start.textContent=
"JOGAR NOVAMENTE";

overlay.classList.remove(
"hidden"
);

updateUI();

}


function update(dt){

speed=
Math.min(
12,
4.2+
score/180
);

score+=
.13*
speed*
dt;

spawn-=
speed*
dt;


if(
spawn<=0
){

addObstacle();

spawn=
215+
Math.random()*145-
speed*5;

}


dino.vy+=
.78*
dt;

dino.y+=
dino.vy*
dt;


if(
dino.y>=
ground-dino.h
){

dino.y=
ground-dino.h;

dino.vy=0;

dino.onGround=true;

}


dino.step+=
speed*
.13*
dt;


for(
let i=
obstacles.length-1;
i>=0;
i--
){

obstacles[i].x-=
speed*
dt;


if(
hit(
dino,
obstacles[i]
)
){

gameOver();

return;

}


if(
obstacles[i].x+
obstacles[i].w<
0
){

obstacles.splice(
i,
1
);

}

}


for(
let i=0;
i<clouds.length;
i++
){

clouds[i].x-=
.18*
speed*
dt;


if(
clouds[i].x<
-45
){

clouds[i].x=590;

clouds[i].y=
30+
Math.random()*80;

}

}


updateUI();

}


function drawCloud(cloud){

x.fillStyle=
"rgba(151,168,177,.38)";

x.fillRect(
cloud.x,
cloud.y+6,
28*cloud.s,
4*cloud.s
);

x.beginPath();

x.arc(
cloud.x+8*cloud.s,
cloud.y+6*cloud.s,
7*cloud.s,
Math.PI,
0
);

x.arc(
cloud.x+18*cloud.s,
cloud.y+6*cloud.s,
9*cloud.s,
Math.PI,
0
);

x.fill();

}


function drawDino(){

const px=
Math.floor(dino.x);

const py=
Math.floor(
dino.y+
(
dino.onGround&&playing
?
Math.sin(dino.step)*1.2
:
0
)
);


x.fillStyle=
"#bcc7cc";

x.fillRect(
px+3,
py+9,
16,
20
);

x.fillRect(
px+14,
py,
16,
15
);

x.fillRect(
px+25,
py+10,
7,
5
);

x.fillRect(
px,
py+15,
7,
6
);

x.fillStyle=
"#26343a";

x.fillRect(
px+24,
py+4,
2,
2
);

if(
!dino.onGround
){

x.fillStyle=
"#bcc7cc";

x.fillRect(
px+7,
py+27,
5,
9
);

x.fillRect(
px+16,
py+27,
5,
9
);

}

}


function drawCactus(o){

x.fillStyle=
"#a75c5e";

x.fillRect(
o.x,
o.y,
o.w,
o.h
);

x.fillRect(
o.x-5,
o.y+12,
7,
6
);

if(
o.arms
){

x.fillRect(
o.x+o.w-2,
o.y+21,
7,
6
);

}

}


function draw(){

x.clearRect(
0,
0,
560,
420
);


const bg=
x.createLinearGradient(
0,
0,
0,
420
);

bg.addColorStop(
0,
"#202c32"
);

bg.addColorStop(
1,
"#152027"
);

x.fillStyle=bg;

x.fillRect(
0,
0,
560,
420
);


clouds.forEach(
drawCloud
);


x.strokeStyle=
"rgba(168,184,192,.55)";

x.setLineDash([
7,
6
]);

x.beginPath();

x.moveTo(
0,
ground+.5
);

x.lineTo(
560,
ground+.5
);

x.stroke();

x.setLineDash([]);


obstacles.forEach(
drawCactus
);


drawDino();

}


function loop(t){

if(!last)
last=t;

const dt=
Math.min(
(t-last)/16.67,
2
);

last=t;


if(playing)
update(dt);


draw();

requestAnimationFrame(
loop
);

}


board.addEventListener(
"pointerdown",
function(e){

if(
e.target===start
)
return;

e.preventDefault();

jump();

}
);


start.addEventListener(
"pointerdown",
function(e){

e.preventDefault();

e.stopPropagation();

reset();

}
);


document.addEventListener(
"keydown",
function(e){

if(
e.code==="Space"||
e.code==="ArrowUp"
){

e.preventDefault();

jump();

}

}
);


seedClouds();

updateUI();

requestAnimationFrame(
loop
);

</script>
`;


export default createHtmlGameCommand({

  name:
    "dino",

  commands: [
    "dino",
    "dinorunner",
    "dinossauro"
  ],

  description:
    "Dino Runner jogável dentro do WhatsApp.",

  usage:
    "/dino",

  html:
    DINO_HTML,

  submessageText:
    "KYARA DINO RUNNER",

  displayName:
    "Dino Runner"

});
DINOEOF


echo "✅ Dino Runner instalado."


# ==========================================================
# 8. CRIA ALIASES DOS COMANDOS
# ==========================================================

cat > dados/src/games/index.js <<'GAMEINDEXEOF'
import dino from "./dino.js";

export const KYARA_HTML_GAMES = {
  dino
};

export function getKyaraHtmlGame(
  command
) {

  const key =
    String(
      command || ""
    )
    .trim()
    .toLowerCase()
    .replace(/^[/!]/, "");


  if (
    [
      "jogo",
      "game",
      "kyarajogo",
      "dino",
      "dinorunner",
      "dinossauro"
    ].includes(key)
  ) {

    return dino;

  }


  return KYARA_HTML_GAMES[key] || null;

}
GAMEINDEXEOF


# ==========================================================
# 9. NOVO DISPATCHER
# ==========================================================

cat > dados/src/features/kyaraGame.js <<'GAMEHANDLEREOF'
import fs from "node:fs";
import path from "node:path";

import {
  sendHtmlGameFromOptions
} from "../utils/htmlGame.js";


const GAME_FILE =
  path.join(
    process.cwd(),
    "dados",
    "api",
    "kyara-jogo.html"
  );


function loadKyaraGameHtml(){

  if(
    !fs.existsSync(
      GAME_FILE
    )
  ){

    throw new Error(
      "HTML do KYARA GAME não encontrado."
    );

  }


  const html =
    fs.readFileSync(
      GAME_FILE,
      "utf8"
    )
    .trim();


  if(!html){

    throw new Error(
      "HTML do KYARA GAME está vazio."
    );

  }


  return html;

}


export async function handleKyaraGameCommand(
  options = {}
){

  const command =
    String(
      options.command ||
      options.cmd ||
      options.commandName ||
      ""
    )
    .trim()
    .toLowerCase()
    .replace(
      /^[/!]/,
      ""
    );


  if(
    ![
      "jogo",
      "game",
      "kyarajogo",
      "dino"
    ].includes(command)
  ){

    return false;

  }


  try{

    const html =
      loadKyaraGameHtml();


    await sendHtmlGameFromOptions(

      options,

      html,

      {
        submessageText:
          "KYARA DINO RUNNER"
      }

    );


    console.log(
      "[KYARA GAME] ✅ Rich HTML enviado."
    );


  }catch(error){

    console.error(
      "[KYARA GAME]",
      error
    );


    if(
      typeof options.reply ===
      "function"
    ){

      await options.reply(
        "❌ Não consegui abrir o KYARA GAME.\n\n" +
        String(
          error?.message ||
          error
        )
      );

    }

  }


  return true;

}


export {
  loadKyaraGameHtml
};
GAMEHANDLEREOF


echo "✅ Dispatcher corrigido."


# ==========================================================
# 10. CORRIGE SPECIAL COMMANDS
# ==========================================================

echo "🔧 Ligando o GAME ao dispatcher..."

python3 - <<'PY'
from pathlib import Path
import re

p = Path(
    "dados/src/features/kyaraSpecialCommands.js"
)

if not p.exists():

    raise SystemExit(
        "❌ kyaraSpecialCommands.js não encontrado."
    )

s = p.read_text()


# ----------------------------------------------------------
# Remove import quebrado de sendBrowserHtml.
# O game agora usa o utilitário próprio.
# ----------------------------------------------------------

s = re.sub(
    r'^\s*sendBrowserHtml,\s*\n',
    '',
    s,
    flags=re.MULTILINE
)


# ----------------------------------------------------------
# Garante import do handler.
# ----------------------------------------------------------

if "handleKyaraGameCommand" not in s:

    imports = (
        'import {\n'
        '  handleKyaraGameCommand\n'
        '} from "./kyaraGame.js";\n\n'
    )

    s = imports + s


# ----------------------------------------------------------
# Se houver chamada duplicada do game, limpa.
# ----------------------------------------------------------

s = re.sub(
    r'\s*const gameHandled\s*=\s*'
    r'await handleKyaraGameCommand\(\s*'
    r'options\s*'
    r'\);',
    '',
    s
)


# ----------------------------------------------------------
# Insere uma única chamada antes do browser.
# ----------------------------------------------------------

marker = re.search(
    r'(\s*)const browserHandled\s*=\s*'
    r'await handleBrowserCommand\(\s*'
    r'options\s*'
    r'\);',
    s
)


if marker:

    indent = marker.group(1)

    block = (
        indent +
        'const gameHandled =\n' +
        indent +
        '  await handleKyaraGameCommand(\n' +
        indent +
        '    options\n' +
        indent +
        '  );\n\n' +
        indent +
        'if (gameHandled) {\n' +
        indent +
        '  return true;\n' +
        indent +
        '}\n\n'
    )

    s = (
        s[:marker.start()]
        + block
        + s[marker.start():]
    )

    print(
        "✅ Game conectado antes do browser."
    )

else:

    print(
        "⚠️ browserHandled não encontrado."
    )


p.write_text(s)

PY


# ==========================================================
# 11. CORRIGE HTML GAME EXISTENTE
# ==========================================================

echo "🔧 Atualizando kyara-jogo.html..."

if [ -f dados/api/kyara-jogo.html ]; then

    echo "✅ HTML existente será mantido."

else

    echo "⚠️ HTML não encontrado."

    cat > dados/api/kyara-jogo.html <<'HTML_EOF'
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KYARA GAME</title>
</head>
<body>
<h1>🎮 KYARA GAME</h1>
<p>Use /dino para jogar.</p>
</body>
</html>
HTML_EOF

fi


# ==========================================================
# 12. REMOVE BACKUPS INÚTEIS DOS TESTES
# ==========================================================

echo ""
echo "🧹 Limpando backups antigos dos TESTES DE GAMES..."

find dados \
  -maxdepth 1 \
  -type d \
  \( \
    -name 'backup-kyara-games-*' \
    -o -name 'backup-kyara-game-*' \
    -o -name 'backup-game-fix-*' \
    -o -name 'backup-game-export-*' \
  \) \
  -print \
  -exec rm -rf {} + \
  2>/dev/null || true


find dados/src.backup-sem-vex-20260912-203353 \
  -maxdepth 2 \
  -type f \
  \( \
    -name 'kyaraBrowser.js' \
    -o -name 'kyaraSpecialCommands.js' \
  \) \
  -delete \
  2>/dev/null || true


echo "✅ Backups específicos dos testes removidos."


# ==========================================================
# 13. VALIDAÇÃO
# ==========================================================

echo ""
echo "======================================================"
echo "             🔎 VALIDAÇÃO FINAL"
echo "======================================================"
echo ""


node --check \
dados/src/utils/htmlGame.js

echo "✅ utils/htmlGame.js"


node --check \
dados/src/games/_htmlGameCommand.js

echo "✅ games/_htmlGameCommand.js"


node --check \
dados/src/games/dino.js

echo "✅ games/dino.js"


node --check \
dados/src/games/index.js

echo "✅ games/index.js"


node --check \
dados/src/features/kyaraGame.js

echo "✅ features/kyaraGame.js"


node --check \
dados/src/features/kyaraBrowser.js

echo "✅ features/kyaraBrowser.js"


node --check \
dados/src/features/kyaraSpecialCommands.js

echo "✅ features/kyaraSpecialCommands.js"


node --check \
dados/api/server.mjs

echo "✅ server.mjs"


# ==========================================================
# 14. VERIFICA SE EXISTE BASE64 NO PAYLOAD
# ==========================================================

echo ""
echo "🔎 Procurando conversão Base64 indevida..."

if grep -nE \
'\.toString\s*\(\s*["'\'']base64["'\'']\s*\)' \
dados/src/features/kyaraBrowser.js \
dados/src/features/kyaraGame.js \
dados/src/features/kyaraGames/core.js \
2>/dev/null
then

    echo ""
    echo "❌ Ainda existe Base64 no mecanismo de jogo."
    echo ""

    exit 1

else

    echo "✅ Nenhuma conversão Base64 encontrada."

fi


# ==========================================================
# 15. RESUMO
# ==========================================================

echo ""
echo "======================================================"
echo "       🎮 KYARA GAMES INSTALADO/CORRIGIDO"
echo "======================================================"
echo ""

echo "Engine:"
echo "  GenAIaeacdsnwHtmlPrimitive"
echo ""

echo "Formato:"
echo "  Buffer UTF-8"
echo ""

echo "Comandos principais:"
echo ""
echo "  /jogo"
echo "  /game"
echo "  /kyarajogo"
echo "  /dino"
echo ""

echo "Outros jogos existentes:"
echo ""
echo "  /breakout"
echo "  /calculadora"
echo "  /pianorich"
echo "  /pong"
echo "  /rich2048"
echo "  /richslots"
echo "  /richsnake"
echo "  /richxo"
echo ""

echo "Backup:"
echo "$BACKUP"
echo ""

echo "======================================================"
echo "                 ✅ TUDO OK"
echo "======================================================"
echo ""

echo "Agora execute:"
echo ""
echo "node ."
echo ""

echo "Teste primeiro:"
echo ""
echo "/dino"
echo ""

echo "Depois:"
echo ""
echo "/jogo"
echo ""

