import { sendHtmlGameFromOptions } from "../utils/htmlGame.js";

const name = "richwordle";
const commands = ["richwordle"];

const HTML = `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;background:#08080d;color:#fff;font-family:Arial}
body{min-height:100vh;display:flex;justify-content:center}
.app{width:100%;max-width:800px;padding:20px;box-sizing:border-box;text-align:center}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;max-width:450px;margin:25px auto}
.cell{aspect-ratio:1;border:2px solid #444;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:27px;font-weight:bold}
input{font-size:22px;text-transform:uppercase;padding:12px;width:220px;border-radius:8px}
button{padding:12px 18px;border:0;border-radius:10px;margin:5px}
</style>
</head>
<body>
<div class="app">
<h1>🟩 Rich Wordle</h1>
<p>Descubra a palavra de 5 letras.</p>
<div id="grid" class="grid"></div>
<input id="guess" maxlength="5" autocomplete="off">
<br>
<button onclick="tryWord()">Tentar</button>
<button onclick="newGame()">Novo</button>
<button onclick="full()">⛶ Tela cheia</button>
<h3 id="msg"></h3>
</div>
<script>
const words=["KYARA","JOGOS","BOTAO","MUNDO","CASAS","FICAR","NIVEL","GAMES","VIDEO","PANDA"];
let answer="",row=0;

function newGame(){
 answer=words[Math.floor(Math.random()*words.length)];
 row=0;
 msg.textContent="";
 grid.innerHTML="";

 for(let i=0;i<25;i++){
  const c=document.createElement("div");
  c.className="cell";
  grid.appendChild(c);
 }

 guess.value="";
 guess.focus();
}

function tryWord(){
 if(row>=5)return;

 const w=guess.value.toUpperCase();

 if(w.length!==5){
  msg.textContent="Digite 5 letras.";
  return;
 }

 const cells=[...document.querySelectorAll(".cell")];

 for(let i=0;i<5;i++){
  cells[row*5+i].textContent=w[i];

  if(w[i]===answer[i]){
   cells[row*5+i].style.borderColor="green";
  }else if(answer.includes(w[i])){
   cells[row*5+i].style.borderColor="orange";
  }
 }

 row++;
 guess.value="";

 if(w===answer){
  msg.textContent="🎉 Acertou!";
  row=5;
 }else if(row===5){
  msg.textContent="A palavra era "+answer;
 }
}

guess.addEventListener("keydown",e=>{
 if(e.key==="Enter")tryWord();
});

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

export const aliases = ["richwordle"];

export default {
  name,
  commands,
  handle
};

