import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const HOST = '127.0.0.1';
const PORT = 3210;
const ROOT = process.cwd();
const CONFIG = path.join(ROOT, 'dados/src/config.json');
const UPLOADS = path.join(ROOT, 'dados/api/uploads');

fs.mkdirSync(UPLOADS, { recursive: true });

const html = String.raw`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#100d19">
<title>Kyara OS • Painel do proprietário</title>
<style>
:root{color-scheme:dark;--bg:#0c0a12;--panel:#171320;--line:#30283e;--text:#f8f3ff;--muted:#aaa0bb;--accent:#c39aff;--pink:#ff91cb;--ok:#79e2b0;--danger:#ff8195;--bg-image:none;--bg-opacity:.25}
*{box-sizing:border-box}
body{margin:0;position:relative;isolation:isolate;background:radial-gradient(ellipse at top,#281839 0,#0c0a12 48%);color:var(--text);font:15px system-ui,sans-serif}body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background-image:var(--bg-image,none);background-position:center;background-repeat:no-repeat;background-size:cover;opacity:var(--bg-opacity,.25)}
button,input,textarea,select{font:inherit}
button{cursor:pointer}
.layout{display:grid;grid-template-columns:250px minmax(0,1fr);min-height:100vh}
aside{padding:24px 16px;border-right:1px solid var(--line);background:#100d17;position:sticky;top:0;height:100vh;overflow:auto}
.brand{display:flex;align-items:center;gap:12px;padding:5px 8px 24px}
.logo{width:44px;height:44px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(135deg,#b88aff,#ff8fcb);color:#21132e;font-size:23px}
.brand b{font-size:18px;letter-spacing:1px}.brand small{display:block;color:var(--muted)}
.nav{display:grid;gap:7px}.nav button{border:1px solid transparent;text-align:left;background:transparent;color:#c9bfd7;padding:12px;border-radius:12px}
.nav button.active,.nav button:hover{background:#292037;border-color:#49355e;color:white}
main{min-width:0;padding:28px;max-width:1150px;width:100%;margin:auto}
.top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:25px}
h1{font-size:clamp(25px,4vw,35px);margin:0}h2{font-size:20px;margin:0 0 7px}p{color:var(--muted);line-height:1.55}
.pill{border:1px solid #3c674f;color:var(--ok);background:#13251d;padding:8px 12px;border-radius:30px;font-size:12px}
.hero{padding:25px;border:1px solid #4b365f;border-radius:22px;background:linear-gradient(120deg,#271b37,#17121f 75%);margin-bottom:20px}
.hero p{margin-bottom:0}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0}
.stat,.card{background:var(--panel);border:1px solid var(--line);border-radius:17px;padding:18px;min-width:0}
.stat small{display:block;color:var(--muted);margin-bottom:8px}.stat strong{font-size:17px;overflow-wrap:anywhere}
.section{display:none}.section.active{display:block}
.card{margin-bottom:14px}.cardhead{margin-bottom:16px}.cardhead p{margin:5px 0 0;font-size:13px}
.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
.field{min-width:0}.field.full{grid-column:1/-1}
label{display:block;color:#d8cce8;font-size:13px;margin-bottom:7px;overflow-wrap:anywhere}
input,textarea,select{width:100%;background:#0e0b14;color:var(--text);border:1px solid #40344f;border-radius:10px;padding:12px;outline:none}
input:focus,textarea:focus,select:focus{border-color:var(--accent);box-shadow:0 0 0 2px #bd91ff22}
textarea{min-height:100px;resize:vertical;font-family:ui-monospace,monospace;font-size:13px}
input[type=checkbox]{width:20px;height:20px;accent-color:#bd91ff}
.check{display:flex;align-items:center;gap:10px;min-height:45px}.check label{margin:0}
.hint{font-size:12px;color:var(--muted);margin-top:6px;overflow-wrap:anywhere}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.btn{border:1px solid #49375e;background:#2a2038;color:white;border-radius:11px;padding:11px 15px;font-weight:650}
.btn.primary{background:linear-gradient(100deg,#c29aff,#ff9bce);border:0;color:#24132e}
.btn.danger{border-color:#663344;color:#ffb5c2}
.btn:disabled{opacity:.5;cursor:wait}
.status{margin:14px 0;min-height:24px;color:var(--ok);overflow-wrap:anywhere}
.imagebox{border:1px dashed #59446f;border-radius:15px;padding:16px;margin-top:12px}
.preview{width:100%;max-height:240px;object-fit:contain;background:#0b0910;border-radius:12px;margin-top:12px;display:none}
.notice{padding:12px 14px;border:1px solid #55432b;background:#241c13;border-radius:12px;color:#f5d7a0;font-size:13px;line-height:1.5}
.empty{padding:22px;color:var(--muted);text-align:center}
footer{color:#847a91;font-size:12px;padding:24px 0}
.mobilebar{display:none}
@media(max-width:760px){
 .layout{display:block}aside{height:auto;position:static;padding:12px;border-right:0;border-bottom:1px solid var(--line)}
 .brand{padding:3px 5px 12px}.nav{display:flex;overflow-x:auto;padding-bottom:3px}.nav button{white-space:nowrap;padding:10px}
 main{padding:16px}.top{align-items:flex-start}.cards{grid-template-columns:1fr 1fr}.fields{grid-template-columns:1fr}
 .field.full{grid-column:auto}.hero{padding:19px}.pill{white-space:nowrap}
}

/* KYARA_OWNER_PROFILE_VISUAL */
#ownerProfile .owner-stage{overflow:hidden;border:1px solid #63358a;border-radius:20px;background:linear-gradient(145deg,#1c1029,#0c0912);margin:18px 0}
#ownerProfile .owner-banner{height:145px;position:relative;background:linear-gradient(120deg,#211032,#7139a9,#180d25);background-size:cover;background-position:center}
#ownerProfile .owner-avatar-wrap{position:relative;width:116px;height:116px;margin:-58px auto 0;z-index:2}
#ownerProfile .owner-avatar{width:104px;height:104px;position:absolute;left:6px;top:6px;border:3px solid #d4a2ff;border-radius:50%;object-fit:cover;background:#160b22;box-shadow:0 0 25px #9d4edd77}
#ownerProfile .owner-orbit{position:absolute;inset:0;border:1px solid #dc9dff;border-radius:50%;animation:ownerOrbit 4s linear infinite;pointer-events:none}
#ownerProfile .owner-orbit:after{content:"";position:absolute;top:9px;left:15px;width:9px;height:9px;border-radius:50%;background:#ffe1ff;box-shadow:0 0 14px #d18aff}
@keyframes ownerOrbit{to{transform:rotate(360deg)}}
#ownerProfile .owner-stage-info{text-align:center;padding:8px 18px 22px}
#ownerProfile .owner-stage-info h3{font-size:23px;margin:6px 0}
#ownerProfile .owner-stage-info p{margin:5px 0}
#ownerProfile .owner-tag{display:inline-block;padding:5px 10px;border:1px solid #63358a;border-radius:20px;color:#d9b4ff;font-size:11px;letter-spacing:1px}
#ownerProfile .owner-controls{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}
#ownerProfile .owner-controls .field.full{grid-column:1/-1}
#ownerProfile input[type=range]{padding:0;accent-color:#bd75ff}
@media(max-width:480px){#ownerProfile .owner-controls{grid-template-columns:1fr}}

</style>
</head>
<body>
<div class="layout">
<aside>
 <div class="brand"><div class="logo">✿</div><div><b>KYARA SYSTΞM</b><small>Administração do bot</small></div></div>
 <nav class="nav" id="nav">
  <button class="active" data-page="home">⌂ Visão geral</button>
  <button data-page="identity">✦ Identidade e dono</button>
  <button data-page="config">⚙ Todas as configurações</button>
  <button data-page="appearance">▧ Aparência e imagens</button>
  <button data-page="ownerProfile">◉ Perfil do dono</button>
  <button data-page="system">◈ Sistema e segurança</button>
 </nav>
</aside>
<main>
 <div class="top"><div><h1 id="pageTitle">Visão geral</h1><p id="pageSub">Seu bot, suas configurações.</p></div><span class="pill">● PAINEL LOCAL</span></div>
 <section id="home" class="section active">
  <div class="hero"><h2>Bem-vindo ao KYARA SYSTΞM ✨</h2><p>Gerencie as opções salvas no arquivo de configuração do bot. As alterações são gravadas no dispositivo.</p></div>
  <div class="cards">
   <div class="stat"><small>Nome configurado</small><strong id="statName">Carregando…</strong></div>
   <div class="stat"><small>Prefixo</small><strong id="statPrefix">—</strong></div>
   <div class="stat"><small>Opções encontradas</small><strong id="statCount">—</strong></div>
  </div>
  <div class="card"><h2>Atalhos</h2><p>Edite os dados de identidade, encontre todas as chaves do arquivo ou personalize as imagens.</p><div class="actions"><button class="btn primary" data-go="identity">Editar identidade</button><button class="btn" data-go="config">Abrir configurações</button><button class="btn" data-go="appearance">Personalizar aparência</button></div></div>
  <div class="notice">Este painel é local. Não exponha a porta do painel à internet. Alterar uma opção no arquivo não garante que todos os módulos recarreguem imediatamente; alguns exigem reiniciar o bot.</div>
 </section>
 <section id="identity" class="section">
  <div class="card"><div class="cardhead"><h2>Identidade do bot</h2><p>Altere os campos principais encontrados no arquivo de configuração.</p></div><div id="identityFields" class="fields"></div><div class="actions"><button class="btn primary" id="saveIdentity">Salvar identidade</button></div></div>
 </section>
 <section id="config" class="section">
  <div class="card"><div class="cardhead"><h2>Configurações detectadas</h2><p>Os campos abaixo são gerados diretamente das chaves existentes. Objetos e listas podem ser editados como JSON.</p></div><div class="notice">Campos secretos são ocultados. Deixe um campo secreto vazio para preservar o valor atual. Não compartilhe capturas desta tela.</div><div id="allFields" class="fields" style="margin-top:18px"></div><div class="actions"><button class="btn primary" id="saveAll">Salvar todas as configurações</button><button class="btn" id="reloadConfig">Recarregar do arquivo</button></div></div>
 </section>
 <section id="appearance" class="section">
  <div class="card"><div class="cardhead"><h2>Identidade visual</h2><p>Personalização do painel e armazenamento de imagens no projeto.</p></div>
   <div class="fields">
    <div class="field"><label for="themeColor">Cor principal</label><input type="color" id="themeColor" value="#c39aff"></div>
    <div class="field"><label for="pinkColor">Cor secundária</label><input type="color" id="pinkColor" value="#ff91cb"></div>
<div class="field full"><label for="backgroundImage">Imagem de fundo (URL ou /uploads/...)</label><input id="backgroundImage" maxlength="500" placeholder="/uploads/fundo.png"><p class="hint">Envie uma imagem na área abaixo e use o botão para aplicá-la como fundo.</p></div>
<div class="field full"><label for="backgroundOpacity">Opacidade do fundo: <strong id="backgroundOpacityValue">25%</strong></label><input type="range" id="backgroundOpacity" min="0" max="100" step="1" value="25"></div>
<div class="field full"><div id="backgroundPreview" style="min-height:140px;border:1px solid var(--line);border-radius:12px;display:grid;place-items:center;padding:12px;text-align:center;background-color:#0c0a12">Nenhuma imagem selecionada</div></div>
    <div class="field full"><label for="appearanceName">Nome exibido no painel</label><input id="appearanceName" maxlength="80" placeholder="KYARA SYSTΞM"></div>
    <div class="field full"><label for="appearanceDesc">Descrição do painel</label><input id="appearanceDesc" maxlength="160" placeholder="Administração do bot"></div>
   </div>
   <div class="actions"><button class="btn primary" id="saveAppearance">Salvar aparência</button><button class="btn" id="resetAppearance">Restaurar cores padrão</button></div>
  </div>
  <div class="card"><h2>Fotos, logotipos e imagens</h2><p>Envie imagens para a pasta local do projeto. O painel mostrará o endereço gerado; a integração com foto de perfil ou menu precisa ser configurada no módulo correspondente.</p>
   <div class="imagebox"><label for="imageFile">Selecionar imagem (PNG, JPG, WEBP, GIF)</label><input id="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><img id="imagePreview" class="preview" alt="Prévia da imagem selecionada"><div class="actions"><button class="btn primary" id="uploadImage">Enviar imagem</button></div><div id="uploadResult" class="hint"></div></div>
   <div id="imageList" class="fields" style="margin-top:16px"></div>
  </div>
 </section>
 <section id="ownerProfile" class="section">
  <div class="card">
   <div class="cardhead"><h2>Perfil do proprietário</h2>
   <p>Personalize os dados do cartão do comando #dono.</p></div>
   <div class="owner-stage" id="ownerVisualPreview">
    <div class="owner-banner" id="ownerPreviewBanner"></div>
    <div class="owner-avatar-wrap"><img class="owner-avatar" id="ownerPreviewAvatar" alt="Foto do proprietário"><div class="owner-orbit"></div></div>
    <div class="owner-stage-info"><span class="owner-tag">KYARA SYSTΞM · OWNER</span><h3 id="ownerPreviewName">Baki</h3><p id="ownerPreviewRole">Proprietário / Desenvolvedor</p><p id="ownerPreviewBio">Personalize seu perfil.</p><p id="ownerPreviewContact"></p></div>
   </div>
   <div class="fields">
    <div class="field"><label for="ownerName">Nome exibido</label>
     <input id="ownerName" maxlength="80" placeholder="Nome do proprietário"></div>
    <div class="field"><label for="ownerRole">Título</label>
     <input id="ownerRole" maxlength="80" placeholder="Proprietário / Desenvolvedor"></div>
    <div class="field full"><label for="ownerBio">Descrição</label>
     <textarea id="ownerBio" maxlength="500" rows="3" placeholder="Sobre o proprietário"></textarea></div>
    <div class="field full"><label for="ownerContact">Contato (opcional)</label>
     <input id="ownerContact" maxlength="100" placeholder="Pode deixar vazio"></div>
    <div class="field full"><label for="ownerImage">Foto do proprietário (URL ou /uploads/)</label>
     <input id="ownerImage" maxlength="500" placeholder="/uploads/perfil.png"></div>
    <div class="field full"><label for="ownerPhotoFile">Enviar foto do proprietário</label><input id="ownerPhotoFile" type="file" accept="image/png,image/jpeg,image/webp"></div>
    <div class="field full"><label for="ownerBannerFile">Enviar banner do perfil</label><input id="ownerBannerFile" type="file" accept="image/png,image/jpeg,image/webp"></div>
    <div class="field full"><label for="ownerBannerImage">Banner (URL ou /uploads/)</label><input id="ownerBannerImage" maxlength="500" placeholder="/uploads/banner.png"></div>
    <div class="field"><label for="ownerPhotoX">Foto horizontal</label><input id="ownerPhotoX" type="range" min="0" max="100" value="50"></div>
    <div class="field"><label for="ownerPhotoY">Foto vertical</label><input id="ownerPhotoY" type="range" min="0" max="100" value="50"></div>
    <div class="field full"><label for="ownerBannerY">Posição vertical do banner</label><input id="ownerBannerY" type="range" min="0" max="100" value="50"></div>
   </div>
   <div class="actions">
    <button class="btn primary" id="saveOwnerProfile" type="button">Salvar perfil</button>
    <button class="btn" id="previewOwnerProfile" type="button">Visualizar cartão</button>
   </div>
   <div id="ownerPreview" class="notice" style="display:none;margin-top:14px"></div>
   <p class="hint">O envio pelo WhatsApp será ativado na próxima etapa, depois dos testes.</p>
  </div>
 </section>
 <section id="system" class="section">
  <div class="card"><h2>Sistema</h2><p>Ferramentas de manutenção do arquivo de configuração.</p><div class="actions"><button class="btn" id="checkHealth">Verificar painel</button><button class="btn" id="reloadSystem">Recarregar configuração</button><button class="btn" id="exportConfig">Exportar cópia JSON</button><button class="btn danger" id="restoreBackup">Restaurar último backup automático</button></div><div class="status" id="systemStatus" role="status"></div></div>
  <div class="card"><h2>Segurança</h2><div class="notice">O servidor escuta somente em 127.0.0.1. Mantenha-o assim. Não adicione redirecionamento de porta no roteador e não publique este painel na internet. As chaves de API são ocultadas na interface.</div><p id="systemInfo">Carregando informações…</p></div>
 </section>
 <div id="status" class="status" role="status"></div>
 <footer>KYARA SYSTΞM • Painel local • Configurações são validadas antes de serem gravadas.</footer>
</main>
</div>
<script>
const $=s=>document.querySelector(s);
let original={}, draft={}, appearance={};
const secretKey=k=>/(api.?key|token|secret|password|senha|credential|session|auth)/i.test(k);
const identityKeys=['nomebot','prefixo','nomedono','numerodono','autor','github_ofc','repositorio'];
const reservedAppearance='kyaraAppearance';
function validBackgroundUrl(value){
 const v=(value||'').trim();
 if(/^\/uploads\/[A-Za-z0-9_.-]+$/.test(v))return v;
 try{const u=new URL(v);if(u.protocol==='https:'||u.protocol==='http:')return u.href}catch{}
 return '';
}
function applyAppearanceLive(){
 const image=validBackgroundUrl($('#backgroundImage').value);
 const n=Number($('#backgroundOpacity').value);
 const opacity=Math.max(0,Math.min(100,Number.isFinite(n)?n:25));
 document.documentElement.style.setProperty('--bg-image',image?'url("'+image+'")':'none');
 document.documentElement.style.setProperty('--bg-opacity',String(opacity/100));
 $('#backgroundOpacityValue').textContent=opacity+'%';
 const preview=$('#backgroundPreview');
 preview.style.backgroundColor='#0c0a12';
 preview.style.backgroundPosition='center';
 preview.style.backgroundSize='cover';
 preview.style.backgroundRepeat='no-repeat';
 preview.style.backgroundImage=image
  ?'linear-gradient(rgba(12,10,18,'+(1-opacity/100)+'),rgba(12,10,18,'+(1-opacity/100)+')),url("'+image+'")'
  :'none';
 preview.textContent=image?'Prévia do fundo':'Nenhuma imagem selecionada';
}
const reservedOwnerProfile='kyaraOwnerProfile';
const titles={nomebot:'Nome do bot',prefixo:'Prefixo dos comandos',nomedono:'Nome do proprietário',numerodono:'Número do proprietário',lidowner:'Identificador LID do proprietário',github_ofc:'GitHub oficial',autor:'Autor / créditos',repositorio:'Repositório',WA_WEB_VERSION:'Versão WhatsApp Web',globalMode:'Modo global',channels:'Canais',ownerMenu:'Menu do proprietário',menu:'Configuração do menu',kyaraChannel:'Canal Kyara'};
function safeText(v){return String(v??'')}
function clone(v){return JSON.parse(JSON.stringify(v))}
function setStatus(s,ok=true){$('#status').textContent=s;$('#status').style.color=ok?'var(--ok)':'var(--danger)'}
function page(name){
 document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id===name));
 document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
 const b=document.querySelector('[data-page="'+name+'"]');
 $('#pageTitle').textContent=b?b.textContent.trim():'Kyara OS';
 $('#pageSub').textContent=({home:'Seu bot, suas configurações.',identity:'Nome, prefixo e informações do proprietário.',config:'Todas as chaves presentes no arquivo de configuração.',appearance:'Cores, imagens e identidade visual.',system:'Ferramentas locais de manutenção.'})[name]||'';
}
$('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)page(b.dataset.page)});
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>page(b.dataset.go)));
function field(key,val,full=false){
 const wrap=document.createElement('div');wrap.className='field'+(full?' full':'');
 const label=document.createElement('label');label.textContent=titles[key]||key;wrap.append(label);
 let input;
 if(typeof val==='boolean'){
  const row=document.createElement('div');row.className='check';input=document.createElement('input');input.type='checkbox';input.checked=val;input.dataset.key=key;row.append(input);const l=document.createElement('label');l.textContent=val?'Ativado':'Desativado';input.addEventListener('change',()=>l.textContent=input.checked?'Ativado':'Desativado');row.append(l);wrap.append(row);
 }else if(val!==null&&typeof val==='object'){
  input=document.createElement('textarea');input.value=JSON.stringify(val,null,2);input.dataset.key=key;input.dataset.kind='json';input.spellcheck=false;wrap.append(input);
 }else if(typeof val==='number'){
  input=document.createElement('input');input.type='number';input.value=val;input.dataset.key=key;wrap.append(input);
 }else{
  input=document.createElement('input');input.dataset.key=key;
  if(secretKey(key)){input.type='password';input.placeholder='Valor secreto oculto; vazio mantém o valor atual';input.value='';input.dataset.secret='true'}
  else {input.type='text';input.value=safeText(val);input.maxLength=key==='prefixo'?8:5000}
  wrap.append(input);
 }
 const hint=document.createElement('div');hint.className='hint';hint.textContent=secretKey(key)?'Campo protegido. Digite um novo valor apenas se desejar alterá-lo.':(val!==null&&typeof val==='object'?'JSON válido obrigatório.':'Chave: '+key);wrap.append(hint);
 return wrap;
}
function render(){
 $('#statName').textContent=original.nomebot||'(sem nome)';
 $('#statPrefix').textContent=original.prefixo||'—';
 $('#statCount').textContent=Object.keys(original).length;
 $('#identityFields').replaceChildren();
 for(const k of identityKeys)if(Object.hasOwn(original,k))$('#identityFields').append(field(k,original[k]));
 $('#allFields').replaceChildren();
 for(const k of Object.keys(original).sort((a,b)=>a.localeCompare(b))){
  if(k===reservedAppearance)continue;
  $('#allFields').append(field(k,original[k],original[k]!==null&&typeof original[k]==='object'));
 }
 appearance=original[reservedAppearance]&&typeof original[reservedAppearance]==='object'?clone(original[reservedAppearance]):{};
 const owner=original[reservedOwnerProfile]&&typeof original[reservedOwnerProfile]==='object'?original[reservedOwnerProfile]:{};
 $('#ownerName').value=owner.name||original.nomedono||'';
 $('#ownerRole').value=owner.role||'Proprietário / Desenvolvedor';
 $('#ownerBio').value=owner.bio||'';
 $('#ownerContact').value=owner.contact||'';
 $('#ownerImage').value=owner.image||'';
 $('#ownerBannerImage').value=owner.banner||'';
 $('#ownerPhotoX').value=owner.photoX??50;
 $('#ownerPhotoY').value=owner.photoY??50;
 $('#ownerBannerY').value=owner.bannerY??50;
 updateOwnerPreview();

 $('#themeColor').value=/^#[0-9a-f]{6}$/i.test(appearance.primary||'')?appearance.primary:'#c39aff';
 $('#pinkColor').value=/^#[0-9a-f]{6}$/i.test(appearance.secondary||'')?appearance.secondary:'#ff91cb';
$('#backgroundImage').value=appearance.backgroundImage||'';
$('#backgroundOpacity').value=String(Math.max(0,Math.min(100,Number.isFinite(Number(appearance.backgroundOpacity))?Number(appearance.backgroundOpacity):25)));
applyAppearanceLive();
 $('#appearanceName').value=appearance.name||'KYARA SYSTΞM';
 $('#appearanceDesc').value=appearance.description||'Administração do bot';
 loadImages();
}
function readFields(container,base){
 const out=clone(base);
 for(const el of container.querySelectorAll('[data-key]')){
  const k=el.dataset.key;
  if(el.dataset.secret==='true'){if(el.value.trim())out[k]=el.value;continue}
  if(el.type==='checkbox'){out[k]=el.checked;continue}
  if(el.dataset.kind==='json'){try{out[k]=JSON.parse(el.value)}catch{throw Error('JSON inválido no campo '+k)};continue}
  if(el.type==='number'){if(el.value.trim()==='')throw Error('Número vazio: '+k);out[k]=Number(el.value);if(!Number.isFinite(out[k]))throw Error('Número inválido: '+k);continue}
  out[k]=el.value;
 }
 return out;
}
async function api(url,options){
 const r=await fetch(url,options);const data=await r.json().catch(()=>({error:'Resposta inválida do servidor'}));
 if(!r.ok)throw Error(data.error||'Erro HTTP '+r.status);return data;
}
async function loadConfig(){
 try{const data=await api('/api/config');original=data.config;draft=clone(original);render();setStatus('Configurações carregadas.');$('#systemInfo').textContent='Arquivo: dados/src/config.json • Chaves: '+Object.keys(original).length+' • Painel local ativo.'}
 catch(e){setStatus('Falha ao carregar: '+e.message,false)}
}
async function saveConfig(next){
 try{const result=await api('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config:next})});original=result.config;draft=clone(original);render();setStatus(result.ownerCard === 'updated' ? 'Perfil salvo e cartão animado atualizado!' : result.ownerCard === 'failed' ? 'Perfil salvo, mas a animação falhou; #dono tentará gerar novamente.' : 'Salvo com sucesso. As opções foram gravadas no arquivo.');return true}
 catch(e){setStatus('Não foi possível salvar: '+e.message,false);return false}
}
$('#saveIdentity').onclick=async()=>{try{const next=readFields($('#identityFields'),original);await saveConfig({...original,...next})}catch(e){setStatus(e.message,false)}};
$('#saveAll').onclick=async()=>{try{await saveConfig(readFields($('#allFields'),original))}catch(e){setStatus(e.message,false)}};
$('#reloadConfig').onclick=loadConfig;$('#reloadSystem').onclick=loadConfig;
$('#checkHealth').onclick=async()=>{try{const x=await api('/api/health');$('#systemStatus').textContent='Painel respondendo. '+x.time;$('#systemStatus').style.color='var(--ok)'}catch(e){$('#systemStatus').textContent=e.message}};
$('#saveAppearance').onclick=async()=>{const next=clone(original);next[reservedAppearance]={...(next[reservedAppearance]||{}),primary:$('#themeColor').value,secondary:$('#pinkColor').value,name:$('#appearanceName').value.trim()||'KYARA SYSTΞM',description:$('#appearanceDesc').value.trim()||'Administração do bot',backgroundImage:validBackgroundUrl($('#backgroundImage').value),backgroundOpacity:Number($('#backgroundOpacity').value)};if(await saveConfig(next)){document.documentElement.style.setProperty('--accent',next[reservedAppearance].primary);document.documentElement.style.setProperty('--pink',next[reservedAppearance].secondary);applyAppearanceLive()}};
$('#resetAppearance').onclick=()=>{$('#themeColor').value='#c39aff';$('#pinkColor').value='#ff91cb';$('#appearanceName').value='KYARA SYSTΞM';$('#appearanceDesc').value='Administração do bot'};
$('#backgroundImage').addEventListener('input',applyAppearanceLive);
$('#backgroundOpacity').addEventListener('input',applyAppearanceLive);
$('#exportConfig').onclick=()=>{const blob=new Blob([JSON.stringify(original,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kyara-config-backup.json';a.click();URL.revokeObjectURL(a.href)};
$('#restoreBackup').onclick=async()=>{if(!confirm('Restaurar o backup automático mais recente? As alterações atuais serão substituídas.'))return;try{const x=await api('/api/backup/restore',{method:'POST'});await loadConfig();$('#systemStatus').textContent=x.message}catch(e){$('#systemStatus').textContent=e.message}};
$('#imageFile').onchange=()=>{const f=$('#imageFile').files[0];const img=$('#imagePreview');if(!f){img.style.display='none';return}if(f.size>5*1024*1024){$('#uploadResult').textContent='Arquivo acima de 5 MB.';$('#imageFile').value='';img.style.display='none';return}img.src=URL.createObjectURL(f);img.style.display='block';$('#uploadResult').textContent=f.name};
$('#uploadImage').onclick=async()=>{const f=$('#imageFile').files[0];if(!f){$('#uploadResult').textContent='Escolha uma imagem primeiro.';return}try{const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});const x=await api('/api/images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.name,data})});$('#uploadResult').textContent='Imagem salva: '+x.url+' (arquivo: '+x.file+')';await loadImages()}catch(e){$('#uploadResult').textContent='Erro: '+e.message}};
async function loadImages(){try{const x=await api('/api/images');const list=$('#imageList');list.replaceChildren();if(!x.images.length){list.innerHTML='<div class="empty full">Nenhuma imagem enviada ainda.</div>';return}for(const im of x.images){const d=document.createElement('div');d.className='field';const img=document.createElement('img');img.src=im.url;img.alt=im.name;img.style.cssText='width:100%;height:125px;object-fit:contain;background:#0b0910;border-radius:10px';const p=document.createElement('div');p.className='hint';p.textContent=im.name;const a=document.createElement('a');a.href=im.url;a.textContent='Abrir imagem';a.style.color='var(--accent)';a.target='_blank';a.rel='noopener';const use=document.createElement('button');use.type='button';use.className='btn';use.textContent='Usar como fundo';use.style.marginTop='8px';use.onclick=()=>{$('#backgroundImage').value=im.url;applyAppearanceLive();setStatus('Prévia atualizada. Clique em Salvar aparência para guardar.')};d.append(img,p,a,use);list.append(d)}}catch{}}

function updateOwnerPreview(){
 const q=id=>document.getElementById(id);
 const photo=q('ownerImage').value.trim();
 const banner=q('ownerBannerImage').value.trim();
 const valid=v=>/^https?:\/\//i.test(v)||/^\/uploads\/[\w.-]+$/.test(v);
 q('ownerPreviewName').textContent=q('ownerName').value.trim()||'Baki';
 q('ownerPreviewRole').textContent=q('ownerRole').value.trim()||'Proprietário / Desenvolvedor';
 q('ownerPreviewBio').textContent=q('ownerBio').value.trim()||'Personalize seu perfil.';
 q('ownerPreviewContact').textContent=q('ownerContact').value.trim();
 q('ownerPreviewAvatar').src=valid(photo)?photo:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#29143c"/><text x="50" y="62" font-size="48" text-anchor="middle" fill="#d9b4ff">B</text></svg>');
 q('ownerPreviewAvatar').style.objectPosition=q('ownerPhotoX').value+'% '+q('ownerPhotoY').value+'%';
 q('ownerPreviewBanner').style.backgroundImage=valid(banner)?'url("'+banner+'")':'linear-gradient(120deg,#211032,#7139a9,#180d25)';
 q('ownerPreviewBanner').style.backgroundPosition='center '+q('ownerBannerY').value+'%';
}
['ownerName','ownerRole','ownerBio','ownerContact','ownerImage','ownerBannerImage','ownerPhotoX','ownerPhotoY','ownerBannerY'].forEach(id=>document.getElementById(id).addEventListener('input',updateOwnerPreview));
async function uploadOwnerImage(file){
 if(!file)return '';
 if(file.size>5*1024*1024)throw Error('A imagem deve ter no máximo 5 MB.');
 const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
 const x=await api('/api/images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,data})});
 return x.url;
}
$('#ownerPhotoFile').onchange=async e=>{try{const u=await uploadOwnerImage(e.target.files[0]);if(u){$('#ownerImage').value=u;updateOwnerPreview()}}catch(err){setStatus(err.message,false)}};
$('#ownerBannerFile').onchange=async e=>{try{const u=await uploadOwnerImage(e.target.files[0]);if(u){$('#ownerBannerImage').value=u;updateOwnerPreview()}}catch(err){setStatus(err.message,false)}};

$('#saveOwnerProfile').onclick=async()=>{
 try{
  const profile={
   name:$('#ownerName').value.trim(),
   role:$('#ownerRole').value.trim(),
   bio:$('#ownerBio').value.trim(),
   contact:$('#ownerContact').value.trim(),
   image:$('#ownerImage').value.trim(),
   banner:$('#ownerBannerImage').value.trim(),
   photoX:Number($('#ownerPhotoX').value),
   photoY:Number($('#ownerPhotoY').value),
   bannerY:Number($('#ownerBannerY').value)
  };
  if(!profile.name)throw Error('Informe o nome do proprietário.');
  const next=clone(original);
  next[reservedOwnerProfile]=profile;
  await saveConfig(next);
 }catch(e){setStatus(e.message,false)}
};
$('#previewOwnerProfile').onclick=()=>{
 const p={
  name:$('#ownerName').value.trim(),
  role:$('#ownerRole').value.trim(),
  bio:$('#ownerBio').value.trim(),
  contact:$('#ownerContact').value.trim(),
  image:$('#ownerImage').value.trim()
 };
 const box=$('#ownerPreview');
 box.replaceChildren();
 const card=document.createElement('div');
 card.style.cssText='text-align:center;padding:12px';
 if(p.image&&(/^https?:\/\//i.test(p.image)||/^\/uploads\/[\w.-]+$/.test(p.image))){
  const img=document.createElement('img');
  img.src=p.image;img.alt='Foto do proprietário';
  img.style.cssText='width:90px;height:90px;border-radius:50%;object-fit:cover';
  card.append(img);
 }
 const name=document.createElement('h2');name.textContent=p.name||'Proprietário';
 const role=document.createElement('p');role.textContent=p.role;
 const bio=document.createElement('p');bio.textContent=p.bio;
 card.append(name,role,bio);
 if(p.contact){
  const contact=document.createElement('p');
  contact.textContent='Contato: '+p.contact;card.append(contact);
 }
 box.append(card);box.style.display='block';
};
loadConfig();
</script>

<style>
#kyaraChat{position:fixed;right:16px;bottom:16px;z-index:99999;width:min(370px,calc(100vw - 32px));background:#111827;color:#f8fafc;border:1px solid #374151;border-radius:18px;box-shadow:0 12px 40px #0008;font:14px system-ui;overflow:hidden}
#kyaraChat header{padding:13px 15px;background:linear-gradient(120deg,#271b37,#17121f);font-weight:700;display:flex;justify-content:space-between;position:relative}
#kyaraMessages{height:230px;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:9px}
.kmsg{padding:10px 12px;border-radius:12px;max-width:90%;white-space:pre-wrap;overflow-wrap:anywhere}
.kuser{align-self:flex-end;background:#334155}.kbot{align-self:flex-start;background:#273449}
#kyaraForm{display:flex;gap:7px;padding:10px;border-top:1px solid #374151}
#kyaraInput{min-width:0;flex:1;background:#0b1220;color:white;border:1px solid #475569;border-radius:10px;padding:10px}
#kyaraForm button{background:#7c3aed;color:white;border:0;border-radius:10px;padding:0 14px;font-weight:700}
#kyaraStatus{padding:0 12px 8px;color:#9ca3af;font-size:12px}
</style>
<section id="kyaraChat">
<header><span>⚡ KYARA SYSTΞM</span><span>LOCAL</span></header>
<div id="kyaraMessages"><div class="kmsg kbot">Olá! Sou a Kyara. Pode conversar comigo aqui.</div></div>
<div id="kyaraStatus">Modelo local conectado ao painel</div>
<form id="kyaraForm">
<input id="kyaraInput" maxlength="1500" placeholder="Converse com a Kyara..." autocomplete="off" required>
<button id="kyaraSend" type="submit">Enviar</button>
</form>
</section>
<script>
(()=>{
const form=document.getElementById('kyaraForm');
const input=document.getElementById('kyaraInput');
const box=document.getElementById('kyaraMessages');
const status=document.getElementById('kyaraStatus');
const button=document.getElementById('kyaraSend');
function add(text,who){
const el=document.createElement('div');
el.className='kmsg '+(who==='user'?'kuser':'kbot');
el.textContent=text;box.appendChild(el);box.scrollTop=box.scrollHeight;
}
form.addEventListener('submit',async e=>{
e.preventDefault();
const message=input.value.trim();if(!message)return;
add(message,'user');input.value='';input.disabled=true;button.disabled=true;
status.textContent='Kyara está pensando...';
try{
const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});
const data=await r.json();
if(!r.ok||!data.reply)throw new Error(data.error||'Falha na resposta');
add(data.reply,'bot');status.textContent='Kyara pronta';
}catch(err){add('Não consegui responder: '+err.message,'bot');status.textContent='Verifique se o modelo local está ligado';}
finally{input.disabled=false;button.disabled=false;input.focus();}
});
})();
</script>


<style id="kyaraUpgrade">
#kyaraChat{right:12px;bottom:12px;width:min(390px,calc(100vw - 24px));border:1px solid var(--line,#49355e);background:var(--panel,#171320);border-radius:20px;box-shadow:0 18px 55px #0009;color:var(--text,#f8f3ff)}
#kyaraChat header{background:linear-gradient(120deg,#180c2b,#35105a);align-items:center}
#kyaraChat .khead{display:flex;align-items:center;gap:10px;min-width:0}
#kyaraChat .kavatar{width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #b76cff;background:#21102f}
#kyaraChat .kname{font-size:14px}#kyaraChat .ksub{font-size:11px;color:#c9a6ee;font-weight:400}
#kyaraChat .ktools{display:flex;gap:5px}
#kyaraChat .kicon{background:#ffffff12;color:white;border:1px solid #ffffff22;border-radius:9px;padding:5px 9px;font-size:19px}
#kyaraChat #kyaraMessages{background:radial-gradient(ellipse at top,#211032,#0a0712 75%);height:270px}
#kyaraChat .kmsg{line-height:1.5;border:1px solid #ffffff0c}
#kyaraChat .kbot{background:#21142e;border-radius:4px 14px 14px 14px}
#kyaraChat .kuser{background:#57218a;border-radius:14px 4px 14px 14px}
#kyaraChat #kyaraForm{align-items:center;background:#100b19}
#kyaraChat #kyaraInput{background:#1a1125;border-color:#49305d;border-radius:13px}
#kyaraChat #kyaraSend{background:linear-gradient(135deg,#a855f7,#7025bc);padding:11px 13px;border-radius:12px}
#kyaraChat #kyaraStatus{color:#b99bd2}
#kyaraLauncher{position:fixed;z-index:99998;right:16px;bottom:16px;border:1px solid #b66cff;background:#190c2b;color:white;border-radius:50px;padding:12px 18px;box-shadow:0 0 25px #8b2be655;font:600 14px system-ui}
#kyaraMenu{position:absolute;right:12px;top:56px;z-index:5;background:#191022;border:1px solid #63358a;border-radius:12px;padding:6px;min-width:180px;box-shadow:0 8px 25px #0009}
#kyaraMenu button{display:block;width:100%;text-align:left;padding:11px;border:0;border-radius:8px;color:#f5eaff;background:transparent}
#kyaraMenu button:active{background:#43205f}
#kyaraProfile{position:fixed;z-index:100000;inset:0;background:#05030bea;display:none;overflow:auto;padding:24px 16px;color:white;font:14px system-ui}
#kyaraProfile .kpbox{max-width:420px;margin:25px auto;background:#130b20;border:1px solid #67358e;border-radius:20px;padding:20px}
#kyaraProfile h2{margin-top:0;color:#d6a4ff}
#kyaraProfile input{box-sizing:border-box;width:100%;padding:11px;margin:6px 0 14px;background:#090610;color:white;border:1px solid #56376d;border-radius:10px}
#kyaraProfile button{padding:10px 13px;margin:4px;border:0;border-radius:10px;background:#762bb4;color:white}
#kyaraProfile img{width:100px;height:100px;border-radius:50%;object-fit:cover;border:2px solid #b76cff;display:block;margin:12px auto}

/* KYARA_DONO_CARD_V1 */
.kdono{overflow:hidden;border:1px solid #7139a9;border-radius:18px;background:#100a19;margin:10px 0;color:#fff}
.kdono-banner{height:112px;position:relative;background:linear-gradient(135deg,#170b29,#7427a8,#12091d);background-size:cover;background-position:center 50%;overflow:visible}
.kdono-avatar{width:88px;height:88px;border-radius:50%;object-fit:cover;position:absolute;left:50%;bottom:-43px;transform:translateX(-50%);border:3px solid #bd75ff;background:#160b22;z-index:2}
.kdono-info{padding:49px 16px 18px;text-align:center}
.kdono-info h3{margin:0 0 5px;font-size:20px}
.kdono-info p{margin:5px 0;color:#cdb5e5;overflow-wrap:anywhere}
.kdono-orbit{position:absolute;width:112px;height:112px;left:50%;bottom:-55px;transform:translateX(-50%);border:1px solid #c77bff88;border-radius:50%;animation:kdonoOrbit 4s linear infinite;pointer-events:none;z-index:3}
.kdono-orbit:after{content:'';position:absolute;width:9px;height:9px;left:8px;top:13px;border-radius:50%;background:#e7baff;box-shadow:0 0 10px #bd75ff}
@keyframes kdonoOrbit{to{transform:translateX(-50%) rotate(360deg)}}
#kyaraProfile input[type=range]{padding:0;accent-color:#b76cff}

#kyaraGallery{display:none}
@media(max-width:480px){#kyaraChat{right:8px;bottom:8px;width:calc(100vw - 16px)}#kyaraChat #kyaraMessages{height:35vh;min-height:180px;max-height:300px}}
</style>
<button id="kyaraLauncher" type="button">⚡ Conversar com Kyara</button>
<section id="kyaraProfile">
 <div class="kpbox">
  <h2>Perfil da Kyara</h2>
  <img id="kpAvatar" alt="Avatar da Kyara">
  <label>Foto da Kyara</label>
  <input id="kpPhoto" type="file" accept="image/*">
  <label>Nome do dono</label><input id="kpOwner" placeholder="Ex.: Baki">
  <label>Descrição do perfil</label><input id="kpBio" placeholder="Assistente pessoal de IA">
  <label>Nome do site</label><input id="kpSite" placeholder="KYARA SYSTΞM">
  <button id="kpSave">Salvar perfil</button><button id="kpClose">Fechar</button>
 </div>
</section>
\n
<script id="kyaraUpgradeScript">
(()=>{
const chat=document.getElementById('kyaraChat');
if(!chat)return;
const header=chat.querySelector('header');
const launcher=document.getElementById('kyaraLauncher');
const oldTitle=header.querySelector('span');
header.innerHTML='<div class="khead"><img class="kavatar" id="kyaraAvatar" alt="Kyara"><div><div class="kname" id="kyaraName">KYARA SYSTΞM</div><div class="ksub" id="kyaraOwnerLabel">Assistente local</div></div></div><div class="ktools"><button class="kicon" id="kyaraDots" aria-label="Opções">⋮</button><button class="kicon" id="kyaraMin" aria-label="Recolher">−</button></div>';
const menu=document.createElement('div');
menu.id='kyaraMenu';menu.hidden=true;
menu.innerHTML='<button id="kmProfile">◉ Editar perfil</button><button id="kmPhoto">▧ Escolher foto</button><button id="kmClear">⌫ Limpar conversa</button><button id="kmHide">Fechar chat</button>';
header.appendChild(menu);
const form=document.getElementById('kyaraForm');
const input=document.getElementById('kyaraInput');
const profile=document.getElementById('kyaraProfile');
const photo=document.getElementById('kpPhoto');
const avatar=document.getElementById('kyaraAvatar');
const kpAvatar=document.getElementById('kpAvatar');
const gallery=document.createElement('input');
gallery.type='file';gallery.accept='image/*';gallery.id='kyaraGallery';gallery.hidden=true;
chat.appendChild(gallery);
function get(k,d=''){try{return localStorage.getItem('kyara.'+k)||d}catch{return d}}
function set(k,v){try{localStorage.setItem('kyara.'+k,v)}catch{}}
function apply(){
const name='KYARA SYSTΞM',owner=get('owner','Baki'),bio=get('bio','Assistente local');
document.title=name+' • Painel';
document.getElementById('kyaraName').textContent='⚡ '+name;
document.getElementById('kyaraOwnerLabel').textContent=owner+' • '+bio;
const pic=get('photo');
if(pic){avatar.src=pic;kpAvatar.src=pic}
else{
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="g"><stop stop-color="#a855f7"/><stop offset="1" stop-color="#10071d"/></radialGradient></defs><rect width="100" height="100" rx="50" fill="url(#g)"/><text x="50" y="63" font-size="48" text-anchor="middle" fill="white" font-family="sans-serif">K</text></svg>';
avatar.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);kpAvatar.src=avatar.src;
}
avatar.style.objectPosition=get('photoX','50')+'% '+get('photoY','35')+'%';kpAvatar.style.objectPosition=avatar.style.objectPosition;
document.getElementById('kpOwner').value=owner;
document.getElementById('kpBio').value=bio;
document.getElementById('kpSite').value=name;
}
function openProfile(){
menu.hidden=true;
document.getElementById('kpX').value=get('photoX','50');
document.getElementById('kpY').value=get('photoY','35');
document.getElementById('kpBY').value=get('bannerY','50');
profile.style.display='block';
}
function choosePhoto(){gallery.click()}

function loadPhoto(f){
 if(!f||!f.type.startsWith('image/'))return;
 if(f.size>5*1024*1024){alert('Escolha uma imagem de até 5 MB.');return}
 const reader=new FileReader();
 reader.onload=()=>{
  const im=new Image();
  im.onload=()=>{
   const c=document.createElement('canvas');
   const scale=Math.min(1,800/Math.max(im.width,im.height));
   c.width=Math.max(1,Math.round(im.width*scale));
   c.height=Math.max(1,Math.round(im.height*scale));
   const ctx=c.getContext('2d');
   if(!ctx)return;
   ctx.drawImage(im,0,0,c.width,c.height);
   set('photo',c.toDataURL('image/jpeg',.82));
   apply();
  };
  im.src=reader.result;
 };
 reader.readAsDataURL(f);
}

gallery.addEventListener('change',()=>loadPhoto(gallery.files[0]));
photo.addEventListener('change',()=>loadPhoto(photo.files[0]));
document.getElementById('kyaraDots').onclick=()=>menu.hidden=!menu.hidden;
document.getElementById('kyaraMin').onclick=()=>{chat.style.display='none';launcher.style.display='block';menu.hidden=true};
launcher.onclick=()=>{chat.style.display='block';launcher.style.display='none';input.focus()};
document.getElementById('kmProfile').onclick=openProfile;
document.getElementById('kmPhoto').onclick=choosePhoto;
document.getElementById('kmHide').onclick=()=>{chat.style.display='none';launcher.style.display='block';menu.hidden=true};
document.getElementById('kmClear').onclick=()=>{document.getElementById('kyaraMessages').innerHTML='';menu.hidden=true};
document.getElementById('kpClose').onclick=()=>profile.style.display='none';
document.getElementById('kpSave').onclick=()=>{
set('owner',document.getElementById('kpOwner').value.trim()||'Baki');
set('bio',document.getElementById('kpBio').value.trim()||'Assistente local');
set('site',document.getElementById('kpSite').value.trim()||'KYARA SYSTΞM');
apply();profile.style.display='none';
};

// Editor do banner e do enquadramento
const extra=document.createElement('div');
extra.innerHTML='<label>Banner do perfil</label><input id="kpBanner" type="file" accept="image/*"><label>Foto horizontal</label><input id="kpX" type="range" min="0" max="100" value="50"><label>Foto vertical</label><input id="kpY" type="range" min="0" max="100" value="35"><label>Banner vertical</label><input id="kpBY" type="range" min="0" max="100" value="50">';
profile.querySelector('.kpbox').insertBefore(extra,document.getElementById('kpSave'));
function adjust(k,v){set(k,v);apply();}
document.getElementById('kpX').oninput=e=>adjust('photoX',e.target.value);
document.getElementById('kpY').oninput=e=>adjust('photoY',e.target.value);
document.getElementById('kpBY').oninput=e=>adjust('bannerY',e.target.value);
document.getElementById('kpBanner').onchange=e=>{
const f=e.target.files[0];
if(!f)return;
if(!f.type.startsWith('image/')){alert('Escolha uma imagem.');return;}
if(f.size>5*1024*1024){alert('Escolha uma imagem de até 5 MB.');return;}
const reader=new FileReader();
reader.onload=()=>{
const im=new Image();
im.onload=()=>{
const scale=Math.min(1,1000/Math.max(im.width,im.height));
const c=document.createElement('canvas');
c.width=Math.max(1,Math.round(im.width*scale));
c.height=Math.max(1,Math.round(im.height*scale));
c.getContext('2d').drawImage(im,0,0,c.width,c.height);
set('banner',c.toDataURL('image/jpeg',.82));
};
im.src=reader.result;
};
reader.readAsDataURL(f);
};


// KYARA_DONO_CARD_V1
form.addEventListener('submit',e=>{
if(input.value.trim().toLocaleLowerCase('pt-BR')!=='dono')return;
e.preventDefault();e.stopImmediatePropagation();
const box=document.getElementById('kyaraMessages');
const aviso=document.createElement('div');
aviso.className='kmsg kbot';
aviso.textContent='Perfil do proprietário';
const card=document.createElement('div');card.className='kdono';
const banner=document.createElement('div');banner.className='kdono-banner';
banner.style.backgroundPosition='center '+get('bannerY','50')+'%';
const bg=get('banner');
if(bg)banner.style.backgroundImage='linear-gradient(0deg,#100a1933,#170b2944),url("'+bg+'")';
const pic=document.createElement('img');pic.className='kdono-avatar';pic.alt='Foto do dono';
pic.src=get('photo')||avatar.src;
pic.style.objectPosition=get('photoX','50')+'% '+get('photoY','35')+'%';
const orbit=document.createElement('div');orbit.className='kdono-orbit';
banner.append(pic,orbit);
const info=document.createElement('div');info.className='kdono-info';
const title=document.createElement('h3');title.textContent=get('owner','Baki');
const bioText=document.createElement('p');bioText.textContent=get('bio','Criador e proprietário da Kyara');
const siteText=document.createElement('p');siteText.textContent=get('site','KYARA SYSTΞM');
info.append(title,bioText,siteText);card.append(banner,info);
box.appendChild(card);box.scrollTop=box.scrollHeight;
input.value='';menu.hidden=true;
},true);

apply();launcher.style.display='none';
})();
</script>
\n</body></html>`;

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
}
function writeConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('A configuração precisa ser um objeto JSON.');
  }
  const old = readConfig();
  const next = { ...old, ...value };
  if (typeof next.nomebot !== 'string' || !next.nomebot.trim() || next.nomebot.length > 80) {
    throw new Error('Nome do bot inválido.');
  }
  if (typeof next.prefixo !== 'string' || !next.prefixo.trim() || next.prefixo.length > 8 || /\s/.test(next.prefixo)) {
    throw new Error('Prefixo inválido: use de 1 a 8 caracteres sem espaços.');
  }
  if (typeof next.nomedono !== 'string' || !next.nomedono.trim() || next.nomedono.length > 80) {
    throw new Error('Nome do proprietário inválido.');
  }
  const temp = CONFIG + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
  JSON.parse(fs.readFileSync(temp, 'utf8'));
  fs.renameSync(temp, CONFIG);
  return next;
}
function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self' data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self';"
  });
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}
function safeImageName(name) {
  const ext = path.extname(String(name || '')).toLowerCase();
  const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
  if (!allowed.has(ext)) throw new Error('Formato não permitido. Use PNG, JPG, WEBP ou GIF.');
  return 'kyara-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
}
function listImages() {
  return fs.readdirSync(UPLOADS).filter(n => /^kyara-\d+-[a-z0-9]+\.(png|jpe?g|webp|gif)$/i.test(n))
    .map(name => ({ name, url: '/uploads/' + encodeURIComponent(name) }));
}
let server;
server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (!['GET','POST'].includes(req.method)) return send(res, 405, { error: 'Método não permitido.' });

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/painel.html')) {
      const externalHtml = path.join(process.env.HOME || ROOT, 'storage/shared/KYARA/painel.html');
      const page = fs.existsSync(externalHtml) ? fs.readFileSync(externalHtml, 'utf8') : html;
      return send(res, 200, page, 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, time: new Date().toLocaleString('pt-BR') });


    if (req.method === 'POST' && url.pathname === '/api/chat') {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 10000) return send(res, 413, { error: 'Mensagem muito grande.' });
      }
      let input;
      try { input = JSON.parse(raw || '{}'); }
      catch { return send(res, 400, { error: 'JSON inválido.' }); }

      const message = String(input.message || '').trim().slice(0, 1500);
      if (!message) return send(res, 400, { error: 'Digite uma mensagem.' });

      try {
        const r = await fetch('http://127.0.0.1:8080/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'local',
            messages: [
              { role: 'system', content: 'Você é Kyara, assistente de IA local configurada por Baki. Converse em português brasileiro, naturalmente e de forma direta. Você roda em um modelo local. Nunca invente quem criou você, não diga que foi criada pela Anthropic ou por outra empresa. Se perguntarem, explique honestamente que você é a Kyara, executada localmente.' },
              { role: 'user', content: message }
            ],
            max_tokens: 100,
            temperature: 0.7
          }),
          signal: AbortSignal.timeout(120000)
        });
        const data = await r.json();
        if (!r.ok) return send(res, 502, { error: 'Falha no modelo local.' });
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (!reply) return send(res, 502, { error: 'A IA não retornou texto.' });
        return send(res, 200, { ok: true, reply });
      } catch (e) {
        console.error('[KYARA CHAT]', e.message);
        return send(res, 502, { error: 'Não consegui acessar a IA na porta 8080.' });
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/config') {
      const config = readConfig();
      return send(res, 200, { config });
    }

    if (req.method === 'POST' && url.pathname === '/api/config') {
      if (req.headers.origin && req.headers.origin !== `http://${HOST}:${PORT}`) return send(res, 403, { error: 'Origem não permitida.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 200000) return send(res, 413, { error: 'Configuração muito grande.' });
      }
      const input = JSON.parse(raw || '{}');
      const previous = readConfig();
      const config = writeConfig(input.config);

      let ownerCard = 'unchanged';
      const oldProfileSignature = JSON.stringify({
        profile: previous.kyaraOwnerProfile || {},
        number: String(previous.numerodono || '')
      });
      const newProfileSignature = JSON.stringify({
        profile: config.kyaraOwnerProfile || {},
        number: String(config.numerodono || '')
      });

      if (oldProfileSignature !== newProfileSignature) {
        try {
          const { execFile } = await import('node:child_process');
          const { fileURLToPath } = await import('node:url');
          const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
          const generator = path.resolve(serverDirectory, '../src/kyara-owner-card.cjs');

          await new Promise((resolve, reject) => {
            execFile(process.execPath, [generator], {
              timeout: 180000,
              maxBuffer: 2 * 1024 * 1024
            }, (error, stdout, stderr) => {
              if (error) {
                error.message += stderr ? '\n' + stderr : '';
                reject(error);
              } else {
                resolve();
              }
            });
          });

          ownerCard = 'updated';
        } catch (error) {
          console.error('[OWNER CARD] Perfil salvo, mas a animação não foi gerada:', error);
          ownerCard = 'failed';
        }
      }

      return send(res, 200, { ok: true, config, ownerCard });
    }

    if (req.method === 'GET' && url.pathname === '/api/images') return send(res, 200, { images: listImages() });

    if (req.method === 'POST' && url.pathname === '/api/images') {
      if (req.headers.origin && req.headers.origin !== `http://${HOST}:${PORT}`) return send(res, 403, { error: 'Origem não permitida.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 8 * 1024 * 1024) return send(res, 413, { error: 'Imagem muito grande.' });
      }
      const input = JSON.parse(raw || '{}');
      const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(String(input.data || ''));
      if (!match) return send(res, 400, { error: 'Imagem inválida.' });
      const buffer = Buffer.from(match[2], 'base64');
      if (!buffer.length || buffer.length > 5 * 1024 * 1024) return send(res, 413, { error: 'A imagem deve ter até 5 MB.' });
      const ext = match[1] === 'jpeg' ? '.jpg' : '.' + match[1];
      const name = safeImageName('upload' + ext);
      fs.writeFileSync(path.join(UPLOADS, name), buffer, { flag: 'wx', mode: 0o600 });
      return send(res, 200, { ok: true, file: name, url: '/uploads/' + name });
    }

    if (req.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      const name = path.basename(decodeURIComponent(url.pathname.slice('/uploads/'.length)));
      if (!/^kyara-\d+-[a-z0-9]+\.(png|jpe?g|webp|gif)$/i.test(name)) return send(res, 404, { error: 'Imagem não encontrada.' });
      const file = path.join(UPLOADS, name);
      if (!fs.existsSync(file)) return send(res, 404, { error: 'Imagem não encontrada.' });
      const ext = path.extname(name).toLowerCase();
      const types = { '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif' };
      res.writeHead(200, { 'Content-Type': types[ext], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return fs.createReadStream(file).pipe(res);
    }

    if (req.method === 'POST' && url.pathname === '/api/backup/restore') {
      if (req.headers.origin && req.headers.origin !== `http://${HOST}:${PORT}`) return send(res, 403, { error: 'Origem não permitida.' });
      const backups = fs.readdirSync(path.dirname(CONFIG))
        .filter(n => /^config\.json\.bak-\d+$/.test(n))
        .map(n => ({ name:n, time:Number(n.match(/(\d+)$/)?.[1] || 0) }))
        .sort((a,b) => b.time-a.time);
      if (!backups.length) return send(res, 404, { error: 'Nenhum backup config.json.bak-TIMESTAMP encontrado.' });
      const source = path.join(path.dirname(CONFIG), backups[0].name);
      const value = JSON.parse(fs.readFileSync(source, 'utf8'));
      writeConfig(value);
      return send(res, 200, { ok:true, message:'Backup restaurado: '+backups[0].name });
    }

    return send(res, 404, { error: 'Rota não encontrada.' });
  } catch (error) {
    console.error('[KYARA PAINEL]', error);
    return send(res, 400, { error: error?.message || 'Falha ao processar a solicitação.' });
  }
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.log(`[KYARA PAINEL] A porta ${PORT} já está em uso; o painel existente deve continuar ativo.`);
    process.exitCode = 0;
  } else {
    console.error('[KYARA PAINEL] Erro no servidor:', error);
    process.exitCode = 1;
  }
});
server.listen(PORT, HOST, () => console.log(`[KYARA PAINEL] http://${HOST}:${PORT}`));
