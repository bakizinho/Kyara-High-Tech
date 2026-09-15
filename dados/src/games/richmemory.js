import { sendHtmlGameFromOptions } from "../utils/htmlGame.js";

const name = "richmemory";
const commands = ["richmemory"];

const HTML = `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
html,body{margin:0;background:#08080d;color:#fff;font-family:Arial,sans-serif}
body{min-height:100vh;display:flex;justify-content:center}
.app{width:100%;max-width:1000px;padding:20px;box-sizing:border-box;text-align:center}
.board{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:650px;margin:25px auto}
.card{aspect-ratio:1;border:0;border-radius:16px;background:#20202a;color:transparent;font-size:38px}
.card.open,.card.done{color:#fff;background:#393945}
button.ctrl{padding:12px 18px;border:0;border-radius:10px;margin:5px;font-weight:bold}
</style>
</head>
<body>
<div class="app">
<h1>🧠 Rich Memory</h1>
<p>Movimentos: <b id="moves">0</b></p>
<button class="ctrl" onclick="newGame()">Novo jogo</button>
<button class="ctrl" onclick="full()">⛶ Tela cheia</button>
<div id="board" class="board"></div>
</div>
<script>
const icons=["🐶","🐱","🦊","🐼","🐸","🐵","🦁","🐯"];
let values=[],opened=[],moves=0,lock=false;

function newGame(){
 values=[...icons,...icons].sort(()=>Math.random()-.5);
 opened=[];moves=0;lock=false;
 render();
}

function render(){
 board.innerHTML="";
 values.forEach((v,i)=>{
  const b=document.createElement("button");
  b.className="card";
  b.textContent=v;
  b.onclick=()=>flip(i,b);
  board.appendChild(b);
 });
 movesEl();
}

function movesEl(){
 document.getElementById("moves").textContent=moves;
}

function flip(i,b){
 if(lock||opened.includes(i)||b.classList.contains("done"))return;

 b.classList.add("open");
 opened.push(i);

 if(opened.length!==2)return;

 moves++;
 movesEl();

 const [a,c]=opened;
 const bs=[...document.querySelectorAll(".card")];

 if(values[a]===values[c]){
  bs[a].classList.add("done");
  bs[c].classList.add("done");
  opened=[];
 }else{
  lock=true;
  setTimeout(()=>{
   bs[a].classList.remove("open");
   bs[c].classList.remove("open");
   opened=[];
   lock=false;
  },650);
 }
}

function full(){
 if(document.documentElement.requestFullscreen){
  document.documentElement.requestFullscreen().catch(()=>{});
 }
 document.body.classList.toggle("fullscreen");
}

newGame();
</script>
</body>
</html>`;

export async function handle(options = {}) {
 return sendHtmlGameFromOptions(options, HTML);
}

export const aliases = ["richmemory"];

export default {
  name,
  commands,
  handle
};

