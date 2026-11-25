import { sendHtmlGameFromOptions } from "../utils/htmlGame.js";

const name = "richreaction";
const commands = ["richreaction"];

const HTML = `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;background:#08080d;color:#fff;font-family:Arial}
body{min-height:100vh;display:flex;justify-content:center}
.app{width:100%;max-width:1000px;padding:20px;box-sizing:border-box;text-align:center}
.target{height:380px;border-radius:25px;background:#252530;display:flex;align-items:center;justify-content:center;font-size:35px;font-weight:bold;user-select:none;touch-action:manipulation}
button{padding:13px 20px;border:0;border-radius:10px;margin:6px}
</style>
</head>
<body>
<div class="app">
<h1>⚡ Rich Reaction</h1>
<p>Espere ficar verde e toque imediatamente.</p>
<div id="target" class="target">COMEÇAR</div>
<p>Tempo: <b id="time">-</b></p>
<button onclick="start()">Novo teste</button>
<button onclick="full()">⛶ Tela cheia</button>
</div>
<script>
let state="idle",timer=null,started=0;

target.onclick=()=>{
 if(state==="wait"){
  clearTimeout(timer);
  state="idle";
  target.textContent="❌ CEDO DEMAIS";
  return;
 }

 if(state==="go"){
  const ms=Date.now()-started;
  document.getElementById("time").textContent=ms+" ms";
  target.textContent="⚡ "+ms+" ms";
  state="idle";
 }
};

function start(){
 clearTimeout(timer);
 state="wait";
 target.textContent="AGUARDE...";

 timer=setTimeout(()=>{
  state="go";
  started=Date.now();
  target.textContent="AGORA!";
 },1000+Math.random()*3000);
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

export const aliases = ["richreaction"];

export default {
  name,
  commands,
  handle
};

