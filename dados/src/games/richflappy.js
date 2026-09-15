import { sendHtmlGameFromOptions } from "../utils/htmlGame.js";

const name = "richflappy";
const commands = ["richflappy"];

const HTML = `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;background:#08080d;color:#fff;font-family:Arial}
body{min-height:100vh;display:flex;justify-content:center}
.app{width:100%;max-width:1000px;padding:15px;box-sizing:border-box;text-align:center}
canvas{width:100%;max-width:900px;height:auto;border-radius:18px;background:#15151e;touch-action:none}
button{padding:12px 18px;border:0;border-radius:10px;margin:5px}
</style>
</head>
<body>
<div class="app">
<h1>🐦 Rich Flappy</h1>
<canvas id="game" width="900" height="520"></canvas>
<br>
<button onclick="start()">Jogar</button>
<button onclick="full()">⛶ Tela cheia</button>
<p>Pontos: <b id="score">0</b> | Recorde: <b id="best">0</b></p>
</div>
<script>
const c=document.getElementById("game");
const x=c.getContext("2d");

let bird,pipe,score=0,best=0,vy=0,running=false;

try{best=Number(localStorage.getItem("kyara_flappy_best")||0)}catch{}
document.getElementById("best").textContent=best;

function start(){
 bird={x:150,y:260};
 pipe={x:900,y:100,gap:180};
 score=0;vy=0;running=true;
 document.getElementById("score").textContent=0;
 requestAnimationFrame(loop);
}

function flap(){
 if(!running){start();return}
 vy=-8;
}

c.onclick=flap;
document.onkeydown=e=>{if(e.code==="Space")flap()};

function loop(){
 if(!running)return;

 vy+=.42;
 bird.y+=vy;
 pipe.x-=5;

 if(pipe.x<-90){
  pipe.x=900;
  pipe.y=50+Math.random()*280;
  score++;
  document.getElementById("score").textContent=score;
 }

 const hitPipe=
 bird.x+20>pipe.x &&
 bird.x-20<pipe.x+75 &&
 (bird.y-20<pipe.y || bird.y+20>pipe.y+pipe.gap);

 if(bird.y<0||bird.y>520||hitPipe){
  running=false;
  if(score>best){
   best=score;
   document.getElementById("best").textContent=best;
   try{localStorage.setItem("kyara_flappy_best",best)}catch{}
  }
 }

 x.clearRect(0,0,900,520);

 x.fillStyle="#4caf50";
 x.fillRect(pipe.x,0,75,pipe.y);
 x.fillRect(pipe.x,pipe.y+pipe.gap,75,520);

 x.fillStyle="#ffd54a";
 x.beginPath();
 x.arc(bird.x,bird.y,20,0,Math.PI*2);
 x.fill();

 if(running){
  requestAnimationFrame(loop);
 }else{
  x.fillStyle="#fff";
  x.font="42px Arial";
  x.fillText("GAME OVER",330,250);
 }
}

function full(){
 if(document.documentElement.requestFullscreen)
  document.documentElement.requestFullscreen().catch(()=>{});
}
</script>
</body>
</html>`;

export async function handle(options = {}) {
 return sendHtmlGameFromOptions(options, HTML);
}

export const aliases = ["richflappy"];

export default {
  name,
  commands,
  handle
};

