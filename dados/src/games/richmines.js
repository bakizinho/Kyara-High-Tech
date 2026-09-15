import { sendHtmlGameFromOptions } from "../utils/htmlGame.js";

const name = "richmines";
const commands = ["richmines"];

const HTML = `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;background:#08080d;color:#fff;font-family:Arial}
body{min-height:100vh;display:flex;justify-content:center}
.app{width:100%;max-width:900px;padding:20px;text-align:center;box-sizing:border-box}
.board{display:grid;grid-template-columns:repeat(8,1fr);gap:5px;max-width:620px;margin:25px auto}
.cell{aspect-ratio:1;border:0;border-radius:7px;background:#252530;color:#fff;font-size:20px}
.cell:disabled{opacity:1}
button.ctrl{padding:12px 18px;border:0;border-radius:10px;margin:5px}
</style>
</head>
<body>
<div class="app">
<h1>💣 Rich Mines</h1>
<p>Minas: <b>10</b></p>
<button class="ctrl" onclick="newGame()">Novo jogo</button>
<button class="ctrl" onclick="full()">⛶ Tela cheia</button>
<div id="board" class="board"></div>
<h3 id="msg"></h3>
</div>
<script>
let mines=new Set(),finished=false;

function newGame(){
 mines=new Set();
 finished=false;
 msg.textContent="";
 while(mines.size<10)mines.add(Math.floor(Math.random()*64));

 board.innerHTML="";

 for(let i=0;i<64;i++){
  const b=document.createElement("button");
  b.className="cell";
  b.onclick=()=>openCell(i,b);
  board.appendChild(b);
 }
}

function openCell(i,b){
 if(finished||b.disabled)return;

 b.disabled=true;

 if(mines.has(i)){
  b.textContent="💣";
  msg.textContent="💥 Você perdeu!";
  finished=true;
  return;
 }

 b.textContent="✓";

 const opened=[...document.querySelectorAll(".cell")]
  .filter(x=>x.disabled).length;

 if(opened>=54){
  msg.textContent="🏆 Você venceu!";
  finished=true;
 }
}

function full(){
 if(document.documentElement.requestFullscreen)
  document.documentElement.requestFullscreen().catch(()=>{});
}

newGame();
</script>
</body>
</html>`;

export async function handle(options = {}) {
 return sendHtmlGameFromOptions(options, HTML);
}

export const aliases = ["richmines"];

export default {
  name,
  commands,
  handle
};

