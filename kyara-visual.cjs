const fs = require('fs');
const cp = require('child_process');
const file = 'dados/api/server.mjs';
let s = fs.readFileSync(file, 'utf8');

if (!s.includes('id="kyaraChat"')) {
  console.log('ERRO: chat atual não encontrado. Arquivo preservado.');
  process.exit(1);
}
if (s.includes('id="kyaraUpgrade"')) {
  console.log('Visual já instalado.');
  process.exit(0);
}

const addon = `
<style id="kyaraUpgrade">
#kyaraChat{right:12px;bottom:12px;width:min(390px,calc(100vw - 24px));border:1px solid #7139a9;background:#0a0712;border-radius:20px;box-shadow:0 0 35px #8500ff30;color:#f5edff}
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
  <label>Nome do site</label><input id="kpSite" placeholder="KYARA OS">
  <button id="kpSave">Salvar perfil</button><button id="kpClose">Fechar</button>
 </div>
</section>
`;

s = s.replace('</body></html>', addon + '\\n</body></html>');

const script = `
<script id="kyaraUpgradeScript">
(()=>{
const chat=document.getElementById('kyaraChat');
if(!chat)return;
const header=chat.querySelector('header');
const launcher=document.getElementById('kyaraLauncher');
const oldTitle=header.querySelector('span');
header.innerHTML='<div class="khead"><img class="kavatar" id="kyaraAvatar" alt="Kyara"><div><div class="kname" id="kyaraName">KYARA IA</div><div class="ksub" id="kyaraOwnerLabel">Assistente local</div></div></div><div class="ktools"><button class="kicon" id="kyaraDots" aria-label="Opções">⋮</button><button class="kicon" id="kyaraMin" aria-label="Recolher">−</button></div>';
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
const name=get('site','KYARA OS'),owner=get('owner','Baki'),bio=get('bio','Assistente local');
document.title=name+' • Painel';
document.getElementById('kyaraName').textContent='⚡ '+name;
document.getElementById('kyaraOwnerLabel').textContent=owner+' • '+bio;
const pic=get('photo');
if(pic){avatar.src=pic;kpAvatar.src=pic}
else{
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="g"><stop stop-color="#a855f7"/><stop offset="1" stop-color="#10071d"/></radialGradient></defs><rect width="100" height="100" rx="50" fill="url(#g)"/><text x="50" y="63" font-size="48" text-anchor="middle" fill="white" font-family="sans-serif">K</text></svg>';
avatar.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);kpAvatar.src=avatar.src;
}
document.getElementById('kpOwner').value=owner;
document.getElementById('kpBio').value=bio;
document.getElementById('kpSite').value=name;
}
function openProfile(){menu.hidden=true;profile.style.display='block'}
function choosePhoto(){gallery.click()}
function loadPhoto(f){
if(!f||!f.type.startsWith('image/'))return;
if(f.size>5*1024*1024){alert('Escolha uma imagem de até 5 MB.');return}
const reader=new FileReader();
reader.onload=()=>{const im=new Image();im.onload=()=>{
const c=document.createElement('canvas');c.width=320;c.height=320;
const x=c.getContext('2d');const side=Math.min(im.width,im.height);
x.drawImage(im,(im.width-side)/2,(im.height-side)/2,side,side,0,0,320,320);
set('photo',c.toDataURL('image/jpeg',.82));apply();
};im.src=reader.result};
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
set('site',document.getElementById('kpSite').value.trim()||'KYARA OS');
apply();profile.style.display='none';
};
apply();launcher.style.display='none';
})();
</script>
`;
s = s.replace('</body></html>', script + '\\n</body></html>');

const tmp = file + '.check.mjs';
fs.writeFileSync(tmp, s);
const check = cp.spawnSync(process.execPath, ['--check', tmp], {encoding:'utf8'});
fs.unlinkSync(tmp);
if(check.status!==0){console.error(check.stderr);process.exit(1)}
fs.copyFileSync(file,file+'.bak-visual');
fs.writeFileSync(file,s);
console.log('OK: visual atualizado; backup e validação concluídos.');
