import { sendHtmlGameFromOptions } from "../utils/htmlGame.js";

const name = "richtetris";
const commands = ["richtetris"];

const HTML = `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;background:#08080d;color:#fff;font-family:Arial}
body{min-height:100vh;display:flex;justify-content:center}
.app{text-align:center;padding:15px}
canvas{width:min(90vw,420px);height:auto;border-radius:14px;background:#15151e}
button{padding:12px 18px;border:0;border-radius:10px;margin:4px}
</style>
</head>
<body>
<div class="app">
<h1>🧱 Rich Tetris</h1>
<canvas id="c" width="300" height="600"></canvas>
<br>
<button onclick="newGame()">Novo</button>
<button onclick="left()">⬅</button>
<button onclick="right()">➡</button>
<button onclick="rotate()">↻</button>
<button onclick="drop()">⬇</button>
<button onclick="full()">⛶</button>
<p>Pontos: <b id="score">0</b></p>
</div>
<script>
const c=document.getElementById("c"),x=c.getContext("2d"),S=30;

let board,piece,px,py,score=0,timer;

const shapes=[
 [[1,1,1,1]],
 [[1,1],[1,1]],
 [[1,0,0],[1,1,1]],
 [[0,0,1],[1,1,1]],
 [[1,1,0],[0,1,1]]
];

function newGame(){
 board=Array.from({length:20},()=>Array(10).fill(0));
 score=0;
 document.getElementById("score").textContent=0;
 clearInterval(timer);
 spawn();
 timer=setInterval(tick,500);
 draw();
}

function spawn(){
 piece=shapes[Math.floor(Math.random()*shapes.length)].map(r=>[...r]);
 px=3;py=0;

 if(hit()){
  clearInterval(timer);
  alert("Game Over");
 }
}

function hit(){
 return piece.some((r,y)=>r.some((v,z)=>{
  if(!v)return false;
  const xx=px+z,yy=py+y;
  return xx<0||xx>=10||yy>=20||(yy>=0&&board[yy][xx]);
 }));
}

function merge(){
 piece.forEach((r,y)=>r.forEach((v,z)=>{
  if(v&&py+y>=0)board[py+y][px+z]=1;
 }));

 score+=10;
 document.getElementById("score").textContent=score;

 for(let y=19;y>=0;y--){
  if(board[y].every(Boolean)){
   board.splice(y,1);
   board.unshift(Array(10).fill(0));
   score+=100;
   y++;
  }
 }

 spawn();
}

function tick(){
 py++;
 if(hit()){
  py--;
  merge();
 }
 draw();
}

function left(){
 px--;
 if(hit())px++;
 draw();
}

function right(){
 px++;
 if(hit())px--;
 draw();
}

function drop(){
 while(!hit())py++;
 py--;
 merge();
 draw();
}

function rotate(){
 const old=piece;
 const h=piece.length,w=piece[0].length;
 const r=Array.from({length:w},()=>Array(h).fill(0));

 for(let y=0;y<h;y++)
  for(let z=0;z<w;z++)
   r[z][h-1-y]=piece[y][z];

 piece=r;

 if(hit())piece=old;
 draw();
}

function draw(){
 x.clearRect(0,0,300,600);

 for(let y=0;y<20;y++){
  for(let z=0;z<10;z++){
   if(board[y][z]){
    x.fillStyle="#5555ff";
    x.fillRect(z*S,y*S,S-1,S-1);
   }
  }
 }

 if(piece){
  piece.forEach((r,y)=>r.forEach((v,z)=>{
   if(v){
    x.fillStyle="#22c1dc";
    x.fillRect((px+z)*S,(py+y)*S,S-1,S-1);
   }
  }));
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

export const aliases = ["richtetris"];

export default {
  name,
  commands,
  handle
};

