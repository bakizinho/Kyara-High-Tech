/**
 * KYARA V12 — ULTRA GOD MODE
 * Storyboard-accurate cinematic welcome animation
 * 720x720 • 24 FPS • 8.0s • Pipe JPEG → H.264 yuv420p
 *
 * Scenes:
 * 0.00–0.70  CORE      Particles + luminous core
 * 0.70–1.55  PHOTO     Foto zoom + rings + crown
 * 1.55–2.45  NAME      Typewriter + CONECTADO
 * 2.45–3.25  LOGO      Big KYARA reveal
 * 3.25–4.15  HUD       Asas + hex + SISTEMA INICIALIZADO
 * 4.15–5.15  WELCOME   BEM-VINDO À KYARA
 * 5.15–6.20  CARD      Card completo
 * 6.20–7.20  BRAND     Logo final + slogan
 * 7.20–8.00  OUTRO     Fade
 */
const path=require('path'),fs=require('fs'),fsp=require('fs/promises'),crypto=require('crypto'),{spawn}=require('child_process');
const ROOT=path.resolve(__dirname,'../../..'),ASSETS=path.join(ROOT,'assets'),CACHE=path.join(ROOT,'dados/.welcome-cache');
const FALL_W=path.join(ASSETS,'kyara-welcome.mp4'),FALL_E=path.join(ASSETS,'kyara-exit.mp4');
const W=720,H=720,FPS=24,DUR=8.0,TOTAL=Math.floor(FPS*DUR),VER='v13.4-real-crossfade';
let Canvas=null; try{Canvas=require('@napi-rs/canvas');}catch{}
const C={p:'#a855f7',p2:'#7c3aed',p3:'#d8b4fe',b:'#38bdf8',c:'#22d3ee',w:'#ffffff',g:'#4ade80'};

function ensure(){try{fs.mkdirSync(CACHE,{recursive:true})}catch{}}
function hsh(s){return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0,20);}
function lerp(a,b,t){return a+(b-a)*t}
function ease(t){return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
function easeOut(t){return t===1?1:1-Math.pow(2,-10*t)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

class UltraParticles{
  constructor(){
    this.dust=[]; this.orbit=[]; this.nebula=[]; this.sparks=[]; this.streaks=[];
    for(let i=0;i<90;i++) this.dust.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.4+0.2,a:Math.random()*0.38+0.06,vx:(Math.random()-0.5)*0.22,vy:(Math.random()-0.5)*0.22,col:Math.random()>0.5?C.b:C.p3});
    for(let i=0;i<72;i++){const ang=Math.random()*Math.PI*2,d=30+Math.pow(Math.random(),0.6)*380; this.orbit.push({x:W/2+Math.cos(ang)*d,y:H/2+Math.sin(ang)*d,ang,dist:d,r:Math.random()*2.2+0.6,a:Math.random()*0.7+0.28,speed:(Math.random()-0.5)*0.75,col:Math.random()>0.55?C.p:C.b,trail:[],life:Math.random()*100});}
    for(let i=0;i<32;i++) this.nebula.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*3.8+1.8,a:Math.random()*0.42+0.12,vx:(Math.random()-0.5)*1.1,vy:(Math.random()-0.5)*1.1,col:Math.random()>0.45?C.p:C.c,blur:Math.random()*6+4});
    for(let i=0;i<24;i++) this.sparks.push({x:W/2,y:H/2,vx:0,vy:0,r:Math.random()*2+0.7,a:0,life:0,col:C.w});
    for(let i=0;i<12;i++) this.streaks.push({x:Math.random()*W,y:Math.random()*H,len:Math.random()*40+20,a:0,speed:Math.random()*3+1.5,ang:Math.random()*Math.PI*2,life:0});
  }
  upd(dt,t,mode='orbit',tR=0,coreActive=0){
    for(const p of this.dust){p.x+=p.vx*dt*16; p.y+=p.vy*dt*16; if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;}
    for(const p of this.orbit){
      if(mode==='converge'){const dx=W/2-p.x,dy=H/2-p.y; const f=clamp((320-Math.hypot(dx,dy))/320,0,1)*0.09; p.x+=dx*f*dt*32; p.y+=dy*f*dt*32; p.a=lerp(p.a,0.95,0.025);}
      else if(mode==='explode'){const dx=p.x-W/2,dy=p.y-H/2; p.x+=dx*0.025*dt*30; p.y+=dy*0.025*dt*30;}
      else if(mode==='orbit'){p.ang+=p.speed*dt*0.95; const target=tR>0?lerp(p.dist,tR+Math.sin(p.life+t)*14,0.06):p.dist; p.x=W/2+Math.cos(p.ang)*target; p.y=H/2+Math.sin(p.ang)*target*0.70; p.dist=target;}
      p.life+=dt; p.trail.push({x:p.x,y:p.y,a:p.a}); if(p.trail.length>7) p.trail.shift();
    }
    for(const p of this.nebula){p.x+=p.vx*dt*26; p.y+=p.vy*dt*26; if(p.x<0||p.x>W)p.vx*=-0.9; if(p.y<0||p.y>H)p.vy*=-0.9;}
    for(const s of this.sparks){
      if(coreActive>0 && s.life<=0 && Math.random()<0.14*coreActive){s.x=W/2+(Math.random()-0.5)*10; s.y=H/2+(Math.random()-0.5)*10; s.vx=(Math.random()-0.5)*6*coreActive; s.vy=(Math.random()-0.5)*6*coreActive; s.a=1; s.life=0.55+Math.random()*0.7;}
      if(s.life>0){s.x+=s.vx*dt*42; s.y+=s.vy*dt*42; s.vx*=0.982; s.vy*=0.982; s.life-=dt; s.a=clamp(s.life*1.6,0,1);}
    }
    for(const st of this.streaks){
      if(st.life<=0 && Math.random()<0.03){st.x=Math.random()*W; st.y=Math.random()*H; st.ang=Math.random()*Math.PI*2; st.life=0.4+Math.random()*0.5; st.a=0.6;}
      if(st.life>0){st.x+=Math.cos(st.ang)*st.speed*dt*40; st.y+=Math.sin(st.ang)*st.speed*dt*40; st.life-=dt; st.a=clamp(st.life*1.8,0,0.55);}
    }
  }
  draw(ctx,mul=1){
    for(const p of this.dust){ctx.save(); ctx.globalAlpha=p.a*mul*0.88; ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.restore();}
    for(const p of this.orbit){ctx.save(); for(let i=0;i<p.trail.length-1;i++){const pt=p.trail[i]; ctx.globalAlpha=pt.a*mul*0.14*(i/p.trail.length); ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(pt.x,pt.y,p.r*0.5,0,Math.PI*2); ctx.fill();} ctx.globalAlpha=p.a*mul; ctx.fillStyle=p.col; ctx.shadowColor=p.col; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.restore();}
    for(const p of this.nebula){ctx.save(); ctx.globalAlpha=p.a*mul; ctx.fillStyle=p.col; ctx.shadowColor=p.col; ctx.shadowBlur=p.blur; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.restore();}
    for(const s of this.sparks){if(s.a<=0) continue; ctx.save(); ctx.globalAlpha=s.a*mul; ctx.fillStyle=s.col; ctx.shadowColor=s.col; ctx.shadowBlur=14; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); ctx.restore();}
    for(const st of this.streaks){if(st.a<=0) continue; ctx.save(); ctx.globalAlpha=st.a*mul; ctx.strokeStyle=C.p3; ctx.lineWidth=1.2; ctx.shadowColor=C.p; ctx.shadowBlur=8; ctx.beginPath(); ctx.moveTo(st.x,st.y); ctx.lineTo(st.x-Math.cos(st.ang)*st.len,st.y-Math.sin(st.ang)*st.len); ctx.stroke(); ctx.restore();}
  }
}

function computeCrop(img,r){
  const iw=img.width,ih=img.height,ar=iw/ih,td=r*2.28;
  let sx,sy,sW,sH,dx,dy,dW,dH;
  if(ar>1.2){sH=ih*0.90; sW=sH*0.98; sx=(iw-sW)/2; sy=clamp(ih*0.03,0,ih-sH); dW=td; dH=td; dx=-r*1.14; dy=-r*1.14-r*0.14;}
  else if(ar<0.80){sW=iw*0.94; sH=sW*1.22; sx=(iw-sW)/2; sy=clamp(ih*0.04,0,ih-sH); dW=td; dH=td*1.22; dx=-r*1.14; dy=-r*1.14*1.22-r*0.13;}
  else{const side=Math.min(iw,ih)*0.88; sx=(iw-side)/2; sy=clamp((ih-side)/2-ih*0.09,0,ih-side); sW=side; sH=side; dW=td; dH=td; dx=-r*1.14; dy=-r*1.14-r*0.11;}
  return {sx,sy,sW,sH,dx,dy,dW,dH};
}

function bgUltra(ctx,t){
  const g=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*1.35); g.addColorStop(0,'#1e1048'); g.addColorStop(0.15,'#140c32'); g.addColorStop(0.42,'#0a061c'); g.addColorStop(0.78,'#03020c'); g.addColorStop(1,'#010106'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  const n1=ctx.createRadialGradient(W/2+Math.sin(t*0.22)*28,H/2+Math.cos(t*0.30)*20,28,W/2,H/2,500); n1.addColorStop(0,'rgba(124,58,237,0.20)'); n1.addColorStop(0.30,'rgba(88,40,180,0.09)'); n1.addColorStop(0.60,'rgba(56,189,248,0.05)'); n1.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=n1; ctx.fillRect(0,0,W,H);
  const n2=ctx.createRadialGradient(W/2-Math.cos(t*0.18)*40,H/2+Math.sin(t*0.25)*30,20,W/2,H/2,380); n2.addColorStop(0,'rgba(56,189,248,0.08)'); n2.addColorStop(0.5,'rgba(168,85,247,0.04)'); n2.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=n2; ctx.fillRect(0,0,W,H);
}

function flareUltra(ctx,x,y,w,a){
  if(a<=0.01) return;
  ctx.save(); ctx.globalAlpha=a;
  ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=28; ctx.fillRect(x-3.5,y-2,7,4);
  ctx.globalAlpha=a*0.95; ctx.shadowColor=C.p3; ctx.shadowBlur=36; ctx.fillStyle=C.p3; ctx.fillRect(x-w*0.13,y-2.6,w*0.26,5.2);
  ctx.globalAlpha=a*0.65; ctx.shadowBlur=50; ctx.fillRect(x-w*0.30,y-5.5,w*0.60,11);
  ctx.globalAlpha=a*0.30; ctx.shadowBlur=78; ctx.fillRect(x-w*0.52,y-13,w*1.04,26);
  ctx.globalAlpha=a*0.14; ctx.shadowBlur=120; ctx.fillRect(x-w*0.72,y-24,w*1.44,48);
  ctx.globalAlpha=a*0.98; ctx.shadowBlur=22; ctx.shadowColor=C.p;
  const grad=ctx.createLinearGradient(x-w/2,y,x+w/2,y); grad.addColorStop(0,'rgba(168,85,247,0)'); grad.addColorStop(0.14,'rgba(168,85,247,0.96)'); grad.addColorStop(0.38,'#e9d5ff'); grad.addColorStop(0.50,'#fff'); grad.addColorStop(0.62,'#bae6fd'); grad.addColorStop(0.86,'rgba(56,189,248,0.92)'); grad.addColorStop(1,'rgba(56,189,248,0)'); ctx.fillStyle=grad; ctx.fillRect(x-w/2,y-1.5,w,3.0);
  ctx.globalAlpha=a*0.50; ctx.fillStyle='rgba(225,210,255,0.85)'; ctx.fillRect(x-w*0.44,y-0.55,w*0.88,1.0);
  ctx.globalAlpha=a*0.35; ctx.fillStyle='rgba(168,85,247,0.65)'; ctx.fillRect(x-w/2,y-6.2,w,1.5); ctx.fillStyle='rgba(56,189,248,0.55)'; ctx.fillRect(x-w/2,y+4.8,w,1.5);
  ctx.globalAlpha=a*0.18; ctx.fillStyle='rgba(255,80,255,0.75)'; ctx.fillRect(x-w/2,y-8.2,w,0.9); ctx.fillStyle='rgba(80,255,255,0.75)'; ctx.fillRect(x-w/2,y+7.2,w,0.9);
  ctx.globalAlpha=a*0.35; ctx.fillStyle='#fff'; for(let i=0;i<6;i++){const ox=(Math.random()-0.5)*w*0.7; ctx.fillRect(x+ox,y-18-Math.random()*10,1.2,5+Math.random()*8);}
  ctx.restore();
}

function ringsUltra(ctx,cx,cy,baseR,t,alpha,layer){
  if(alpha<=0.01) return;
  const rings=[
    {r:baseR,w:6.2,col:C.p,a:0.98,tilt:0.70,rot:t*0.95,glow:24,inner:2.6},
    {r:baseR+32,w:4.2,col:C.b,a:0.82,tilt:0.65,rot:-t*0.74,glow:18,inner:1.5},
    {r:baseR+60,w:2.8,col:C.p3,a:0.58,tilt:0.74,rot:t*0.44,glow:13,inner:1.1},
    {r:baseR+90,w:1.8,col:C.c,a:0.40,tilt:0.68,rot:-t*0.32,glow:10,inner:0.75}
  ];
  for(const rg of rings){
    const angNorm=((rg.rot%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
    const isFront=angNorm<Math.PI;
    if(layer==='back' && isFront && rg.r>baseR+14) continue;
    if(layer==='front' && !isFront && rg.r>baseR+14) continue;
    ctx.save(); ctx.globalAlpha=alpha*rg.a; ctx.translate(cx,cy); ctx.rotate(rg.rot); ctx.scale(1,rg.tilt);
    for(let seg=0;seg<2;seg++){
      const start=seg*Math.PI, end=start+Math.PI*0.86;
      ctx.strokeStyle=rg.col; ctx.lineWidth=rg.w+rg.glow; ctx.globalAlpha=alpha*rg.a*0.20; ctx.shadowColor=rg.col; ctx.shadowBlur=rg.glow*1.8; ctx.beginPath(); ctx.arc(0,0,rg.r,start,end); ctx.stroke();
      ctx.globalAlpha=alpha*rg.a; ctx.lineWidth=rg.w; ctx.shadowBlur=15; ctx.beginPath(); ctx.arc(0,0,rg.r,start,end); ctx.stroke();
      ctx.globalAlpha=alpha*rg.a*0.90; ctx.strokeStyle='#fff'; ctx.lineWidth=rg.inner; ctx.shadowBlur=0; ctx.beginPath(); ctx.arc(0,0,rg.r,start+0.18,end-0.18); ctx.stroke();
    }
    ctx.fillStyle=C.w; ctx.shadowColor=C.w; ctx.shadowBlur=16; ctx.beginPath(); ctx.arc(rg.r,0,3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=rg.col; ctx.beginPath(); ctx.arc(-rg.r,0,2.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

function logoUltra(ctx,cx,cy,sz,alpha,glow=2.0){
  if(alpha<=0.01) return;
  ctx.save(); ctx.globalAlpha=alpha; ctx.translate(cx,cy); ctx.scale(sz/50,sz/50);
  ctx.shadowColor=C.p; ctx.shadowBlur=42*glow; ctx.fillStyle=C.p+'35'; ctx.beginPath(); ctx.arc(0,4,26,0,Math.PI*2); ctx.fill();
  const drawCrown=(strokeCol,lw,blur,aMul)=>{
    ctx.globalAlpha=alpha*aMul; ctx.shadowColor=C.p; ctx.shadowBlur=blur*glow; ctx.strokeStyle=strokeCol; ctx.lineWidth=lw; ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-22,16); ctx.quadraticCurveTo(-18,2,-12,-18); ctx.quadraticCurveTo(-6,-6,0,4); ctx.quadraticCurveTo(6,-6,12,-18); ctx.quadraticCurveTo(18,2,22,16); ctx.moveTo(-20,18); ctx.lineTo(20,18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,4); ctx.lineTo(0,-22); ctx.stroke();
  };
  drawCrown('rgba(168,85,247,0.35)',8.0,32,0.5);
  drawCrown('rgba(255,255,255,0.55)',5.5,22,0.7);
  drawCrown('rgba(255,255,255,0.95)',3.2,12,0.95);
  drawCrown(C.p3,1.4,6,0.85);
  ctx.globalAlpha=alpha; ctx.shadowColor=C.w; ctx.shadowBlur=18*glow; ctx.fillStyle=C.w;
  ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(4,-20); ctx.lineTo(0,-14); ctx.lineTo(-4,-20); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function photoUltra(ctx,img,cx,cy,r,t,alpha){
  if(alpha<=0.01) return;
  ctx.save(); ctx.globalAlpha=alpha;
  for(let i=6;i>=1;i--){const g=ctx.createRadialGradient(cx,cy,r-2,cx,cy,r+16+i*12); g.addColorStop(0,'rgba(168,85,247,'+(0.28/i)+')'); g.addColorStop(0.4,'rgba(56,189,248,'+(0.10/i)+')'); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r+16+i*12,0,Math.PI*2); ctx.fill();}
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
  if(img){
    try{
      const cr=computeCrop(img,r);
      const pulse=1+Math.sin(t*2.1)*0.012;
      ctx.translate(cx,cy); ctx.scale(pulse,pulse); ctx.translate(-cx,-cy);
      ctx.drawImage(img,cr.sx,cr.sy,cr.sW,cr.sH,cx+cr.dx,cy+cr.dy,cr.dW,cr.dH);
      ctx.setTransform(1,0,0,1,0,0);
      const rim=ctx.createRadialGradient(cx,cy,r*0.28,cx,cy,r); rim.addColorStop(0,'rgba(0,0,0,0)'); rim.addColorStop(0.85,'rgba(168,85,247,0.16)'); rim.addColorStop(1,'rgba(56,189,248,0.24)'); ctx.fillStyle=rim; ctx.fillRect(cx-r,cy-r,r*2,r*2);
    }catch{}
  }else{
    const g=ctx.createLinearGradient(cx-r,cy-r,cx+r,cy+r); g.addColorStop(0,C.p2); g.addColorStop(1,C.b); ctx.fillStyle=g; ctx.fillRect(cx-r,cy-r,r*2,r*2); logoUltra(ctx,cx,cy,38,0.95,1.0);
  }
  ctx.restore();
  ctx.shadowColor=C.p; ctx.shadowBlur=22; ctx.strokeStyle=C.p; ctx.lineWidth=3.2; ctx.beginPath(); ctx.arc(cx,cy,r+6.5,0,Math.PI*2); ctx.stroke();
  ctx.shadowBlur=0; ctx.strokeStyle='rgba(255,255,255,0.97)'; ctx.lineWidth=1.3; ctx.beginPath(); ctx.arc(cx,cy,r+2.2,0,Math.PI*2); ctx.stroke();
  ctx.shadowColor=C.b; ctx.shadowBlur=14; ctx.strokeStyle=C.b+'aa'; ctx.lineWidth=1.1; ctx.beginPath(); ctx.arc(cx,cy,r+15,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}

function textUltra(ctx,txt,x,y,sz,col,alpha,weight=800,glow=16){
  if(alpha<=0.01||!txt) return;
  ctx.save(); ctx.globalAlpha=alpha; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=weight+' '+sz+'px sans-serif';
  ctx.shadowColor=col; ctx.shadowBlur=glow; ctx.fillStyle=col; ctx.fillText(txt,x,y);
  ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.globalAlpha=alpha*0.96; ctx.fillText(txt,x,y); ctx.restore();
}

function hexFrame(ctx,cx,cy,w,h,alpha,t){
  if(alpha<=0.01) return;
  ctx.save(); ctx.globalAlpha=alpha;
  const hw=w/2,hh=h/2,cut=18;
  ctx.beginPath(); ctx.moveTo(cx-hw+cut,cy-hh); ctx.lineTo(cx+hw-cut,cy-hh); ctx.lineTo(cx+hw,cy-hh+cut); ctx.lineTo(cx+hw,cy+hh-cut); ctx.lineTo(cx+hw-cut,cy+hh); ctx.lineTo(cx-hw+cut,cy+hh); ctx.lineTo(cx-hw,cy+hh-cut); ctx.lineTo(cx-hw,cy-hh+cut); ctx.closePath();
  ctx.fillStyle='rgba(168,85,247,0.07)'; ctx.fill();
  ctx.strokeStyle=C.p+'cc'; ctx.lineWidth=1.6; ctx.shadowColor=C.p; ctx.shadowBlur=18; ctx.stroke();
  ctx.shadowBlur=0; ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=0.9; ctx.stroke();
  const perim=2*(w+h)-4*cut; const dist=((t*0.55)%1)*perim;
  let sx=cx,sy=cy-hh;
  if(dist<w-2*cut) sx=cx-hw+cut+dist;
  else if(dist<w-2*cut+h-2*cut){sx=cx+hw; sy=cy-hh+cut+(dist-(w-2*cut));}
  ctx.shadowColor=C.c; ctx.shadowBlur=14; ctx.fillStyle=C.c; ctx.beginPath(); ctx.arc(sx,sy,2.8,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function wingsUltra(ctx,cx,cy,scale,alpha,t){
  if(alpha<=0.01) return;
  ctx.save(); ctx.globalAlpha=alpha; ctx.translate(cx,cy); ctx.scale(scale,scale);
  const drawWing=(side)=>{
    const s=side; ctx.save();
    ctx.shadowColor=C.p; ctx.shadowBlur=20; ctx.strokeStyle=C.p; ctx.lineWidth=2.2;
    ctx.beginPath(); ctx.moveTo(s*95,-10); ctx.quadraticCurveTo(s*160,-40,s*200,-15); ctx.quadraticCurveTo(s*175,5,s*140,12); ctx.quadraticCurveTo(s*110,8,s*95,-10); ctx.stroke();
    ctx.strokeStyle=C.b+'99'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(s*105,-5); ctx.quadraticCurveTo(s*150,-28,s*185,-8); ctx.stroke();
    ctx.fillStyle=C.w; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(s*200,-15,3,0,Math.PI*2); ctx.fill();
    ctx.restore();
  };
  drawWing(1); drawWing(-1); ctx.restore();
}

function cardUltra(ctx,x,y,w,h,alpha,t){
  if(alpha<=0.01) return;
  ctx.save(); ctx.globalAlpha=alpha;
  const g=ctx.createLinearGradient(x,y,x,y+h); g.addColorStop(0,'rgba(36,26,72,0.97)'); g.addColorStop(0.45,'rgba(28,20,54,0.98)'); g.addColorStop(1,'rgba(14,10,30,1)'); ctx.fillStyle=g; ctx.shadowColor=C.p; ctx.shadowBlur=40; ctx.beginPath(); ctx.roundRect(x,y,w,h,22); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.roundRect(x,y,w,h*0.48,[22,22,0,0]); ctx.fill();
  ctx.strokeStyle=C.p+'bb'; ctx.lineWidth=1.7; ctx.shadowColor=C.p; ctx.shadowBlur=12; ctx.beginPath(); ctx.roundRect(x,y,w,h,22); ctx.stroke();
  ctx.shadowBlur=0; ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(x+1.5,y+1.5,w-3,h-3,21); ctx.stroke();
  ctx.fillStyle=C.p; ctx.shadowBlur=16; ctx.fillRect(x+36,y,w-72,2.2);
  const perim=2*(w+h); const dist=((t*0.7)%1)*perim;
  let sx=x,sy=y;
  if(dist<w){sx=x+dist; sy=y;} else if(dist<w+h){sx=x+w; sy=y+dist-w;} else if(dist<2*w+h){sx=x+w-(dist-w-h); sy=y+h;} else {sx=x; sy=y+h-(dist-2*w-h);}
  ctx.shadowColor=C.c; ctx.shadowBlur=16; ctx.fillStyle=C.c; ctx.beginPath(); ctx.arc(sx,sy,2.6,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

const CINEMATIC_SCENES=[
  ['core',0.00,0.70],
  ['photo',0.55,1.55],
  ['name',1.40,2.45],
  ['logo',2.30,3.25],
  ['hud',3.10,4.15],
  ['welcome',4.00,5.15],
  ['card',5.00,6.20],
  ['brand',6.05,7.25],
  ['outro',7.05,8.00]
];

function getScene(t){
  for(const [id,start,end] of CINEMATIC_SCENES){
    if(t>=start && t<end){
      return {
        id,
        start,
        end,
        p:clamp((t-start)/(end-start),0,1),
        alpha:sceneAlpha(t,start,end)
      };
    }
  }

  return {
    id:'outro',
    start:7.05,
    end:8.00,
    p:clamp((t-7.05)/0.95,0,1),
    alpha:sceneAlpha(t,7.05,8.00)
  };
}

function getCinematicLayers(t){
  const layers=[];

  for(const [id,start,end] of CINEMATIC_SCENES){
    if(t>=start && t<end){
      layers.push({
        id,
        start,
        end,
        p:clamp((t-start)/(end-start),0,1),
        alpha:sceneAlpha(t,start,end)
      });
    }
  }

  if(!layers.length){
    layers.push({
      id:'outro',
      start:7.05,
      end:8.00,
      p:clamp((t-7.05)/0.95,0,1),
      alpha:sceneAlpha(t,7.05,8.00)
    });
  }

  return layers;
}

function sceneAlpha(t,start,end,fade=0.22){
  const fi=clamp((t-start)/fade,0,1);
  const fo=clamp((end-t)/fade,0,1);
  return Math.min(fi,fo);
}

function cinematicCamera(t,scene){
  const slow=t*0.55;
  const pulse=Math.sin(t*1.7)*0.006;
  const driftX=Math.sin(slow)*8;
  const driftY=Math.cos(slow*0.83)*6;

  let zoom=1+pulse;

  if(scene.id==='core'){
    zoom+=0.035*ease(scene.p);
  }else if(scene.id==='photo'){
    zoom+=0.025*ease(scene.p);
  }else if(scene.id==='logo'){
    zoom+=0.018*easeOut(scene.p);
  }else if(scene.id==='card'){
    zoom+=0.012*easeOut(scene.p);
  }

  return {
    zoom,
    x:driftX,
    y:driftY
  };
}

function renderScene(ctx,scene,t,ps,img,name){
  const displayName=(name||'Amigo').toUpperCase().slice(0,18);
  const cam=cinematicCamera(t,scene);
  ctx.save();
  ctx.translate(W/2,H/2);
  ctx.scale(cam.zoom,cam.zoom);
  ctx.translate(-W/2+cam.x,-H/2+cam.y);
  bgUltra(ctx,t); ps.draw(ctx,1);

  if(scene.id==='core'){
    ps.upd(1/FPS,t,'converge',0,ease(scene.p)*2.4);
    const e=ease(scene.p);
    ctx.save(); ctx.globalAlpha=e; ctx.translate(W/2,H/2); ctx.shadowColor=C.p; ctx.shadowBlur=55; ctx.fillStyle=C.w; ctx.beginPath(); ctx.arc(0,0,lerp(1.5,18,e),0,Math.PI*2); ctx.fill(); ctx.restore();
    for(let i=0;i<4;i++){ctx.save(); ctx.globalAlpha=e*(1-i*0.22); ctx.translate(W/2,H/2); ctx.strokeStyle=i%2===0?C.p:C.b; ctx.lineWidth=3.2-i*0.55; ctx.shadowColor=ctx.strokeStyle; ctx.shadowBlur=28; ctx.beginPath(); ctx.arc(0,0,55+i*28,-Math.PI/2,-Math.PI/2+Math.PI*2*e*0.95); ctx.stroke(); ctx.restore();}
    flareUltra(ctx,W/2,H/2,620*e,e*1.25);
  }
  else if(scene.id==='photo'){
    ps.upd(1/FPS,t,'orbit',105,0); const e=easeOut(scene.p), r=lerp(28,108,e);
    ringsUltra(ctx,W/2,H/2,r,t,clamp(scene.p*1.25,0,1),'back'); photoUltra(ctx,img,W/2,H/2,r,t,clamp(scene.p*1.35,0,1)); ringsUltra(ctx,W/2,H/2,r,t,clamp(scene.p*1.25,0,1),'front');
    if(scene.p>0.55) logoUltra(ctx,W/2,H/2-r-48,26,clamp((scene.p-0.55)/0.45,0,1),1.6);
    flareUltra(ctx,W/2,H/2,500,0.55*e);
  }
  else if(scene.id==='name'){
    ps.upd(1/FPS,t,'orbit',95,0); const r=96, cy=290;
    ringsUltra(ctx,W/2,cy,r,t,1,'back'); photoUltra(ctx,img,W/2,cy,r,t,1); ringsUltra(ctx,W/2,cy,r,t,1,'front'); logoUltra(ctx,W/2,cy-r-48,26,1,1.5);
    const typeP=clamp((t-1.70)/0.55,0,1); const rev=Math.floor(displayName.length*easeOut(typeP)); const typed=displayName.slice(0,rev);
    textUltra(ctx,typed,W/2,455,36,C.w,1,800,20);
    if(typeP<1 && Math.floor(t*6)%2===0){ctx.save(); ctx.globalAlpha=0.9; ctx.fillStyle=C.p3; ctx.fillRect(W/2+typed.length*11,440,3,28); ctx.restore();}
    if(scene.p>0.50){const ca=clamp((scene.p-0.50)/0.40,0,1); ctx.save(); ctx.globalAlpha=ca; ctx.fillStyle=C.g; ctx.shadowColor=C.g; ctx.shadowBlur=16; ctx.beginPath(); ctx.arc(W/2-72,498,6.5,0,Math.PI*2); ctx.fill(); ctx.restore(); textUltra(ctx,'CONECTADO',W/2+12,500,14,C.g,ca,700,10);}
  }
  else if(scene.id==='logo'){
    ps.upd(1/FPS,t,'orbit',140,0); const sc=lerp(0.45,1,easeOut(scene.p));
    ctx.save(); ctx.translate(W/2,H/2-30); ctx.scale(sc,sc); logoUltra(ctx,0,-100,72,1,2.5); ctx.restore();
    textUltra(ctx,'KYARA',W/2,H/2+48,Math.floor(78*sc),C.w,scene.p,800,24); textUltra(ctx,'• IA •',W/2,H/2+92,28,C.p3,clamp((scene.p-0.28)/0.72,0,1),600,14);
    ringsUltra(ctx,W/2,H/2-30,148,t,0.95,'back'); ringsUltra(ctx,W/2,H/2-30,148,t,0.95,'front'); flareUltra(ctx,W/2,H/2-30,600*scene.p,0.80);
  }
  else if(scene.id==='hud'){
    ps.upd(1/FPS,t,'orbit',90,0); const r=82, cy=268;
    ringsUltra(ctx,W/2,cy,r,t,0.95,'back'); photoUltra(ctx,img,W/2,cy,r,t,1); ringsUltra(ctx,W/2,cy,r,t,0.95,'front');
    wingsUltra(ctx,W/2,cy,1,clamp(scene.p*1.3,0,1),t);
    textUltra(ctx,displayName.slice(0,16),W/2,388,26,C.w,1,700,15); textUltra(ctx,'KYARA • IA',W/2,416,14,C.b,0.95,600,10);
    const boxA=clamp((scene.p-0.30)/0.55,0,1); hexFrame(ctx,W/2,470,280,52,boxA,t); textUltra(ctx,'SISTEMA INICIALIZADO',W/2,472,13,C.g,boxA,700,9);
  }
  else if(scene.id==='welcome'){
    ps.upd(1/FPS,t,'orbit',0,0); const e=easeOut(scene.p); const y1=lerp(H/2+80,H/2-100,e);
    if(scene.p>0.15){const la=clamp((scene.p-0.15)/0.3,0,1); ctx.save(); ctx.globalAlpha=la*0.7; ctx.strokeStyle=C.p; ctx.lineWidth=1.5; ctx.shadowColor=C.p; ctx.shadowBlur=12; ctx.beginPath(); ctx.moveTo(W/2-160,y1+28); ctx.lineTo(W/2-40,y1+28); ctx.moveTo(W/2+40,y1+28); ctx.lineTo(W/2+160,y1+28); ctx.stroke(); ctx.restore();}
    textUltra(ctx,'BEM-VINDO',W/2,y1,48,C.w,1,800,22); textUltra(ctx,'À KYARA',W/2,y1+56,34,C.p3,clamp((scene.p-0.22)/0.55,0,1),700,16); textUltra(ctx,displayName,W/2,y1+108,24,C.b,clamp((scene.p-0.42)/0.45,0,1),700,12);
    if(scene.p>0.65){const pa=clamp((scene.p-0.65)/0.30,0,1); ctx.save(); ctx.globalAlpha=pa; ctx.textAlign='center'; ctx.font='600 15px sans-serif'; ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fillText('É UM PRAZER TER VOCÊ AQUI.',W/2,y1+148); ctx.restore();}
    flareUltra(ctx,W/2,y1+20,520*scene.p,0.70);
  }
  else if(scene.id==='card'){
    ps.upd(1/FPS,t,'orbit',0,0); const e=easeOut(scene.p); const cw=470,ch=340,cx=W/2-cw/2,cy=lerp(H+50,H/2-ch/2-10,e);
    cardUltra(ctx,cx,cy,cw,ch,1,t); photoUltra(ctx,img,cx+105,cy+110,64,t,1);
    ctx.save(); ctx.globalAlpha=1; ctx.textAlign='left'; ctx.font='800 22px sans-serif'; ctx.fillStyle=C.w; ctx.shadowColor=C.p; ctx.shadowBlur=10; ctx.fillText(displayName.slice(0,14),cx+185,cy+88);
    ctx.shadowBlur=0; ctx.font='600 13px sans-serif'; ctx.fillStyle=C.g; ctx.fillText('●  Online',cx+185,cy+112);
    ctx.font='500 14px sans-serif'; ctx.fillStyle='rgba(255,255,255,0.78)'; ctx.fillText('"Juntos por um',cx+185,cy+148); ctx.fillText('mundo mais conectado."',cx+185,cy+168);
    ctx.font='700 12px sans-serif'; ctx.fillStyle=C.p3; ctx.textAlign='center'; ctx.fillText('KYARA  •  IA',cx+cw/2,cy+ch-28); ctx.restore();
    logoUltra(ctx,cx+42,cy+ch-36,18,0.9,1.0);
  }
  else if(scene.id==='brand'){
    ps.upd(1/FPS,t,'orbit',150,0); const a=scene.p; const sc=lerp(0.60,1,easeOut(a));
    ctx.save(); ctx.translate(W/2,H/2-20); ctx.scale(sc,sc); logoUltra(ctx,0,-85,70,a,2.6); ctx.restore();
    textUltra(ctx,'KYARA • IA',W/2,H/2+82,20,C.b,a,700,14); textUltra(ctx,'SEMPRE COM VOCÊ',W/2,H/2+118,15,C.g,clamp((a-0.35)/0.55,0,1),600,10);
    ringsUltra(ctx,W/2,H/2-20,155,t,a*0.96,'back'); ringsUltra(ctx,W/2,H/2-20,155,t,a*0.96,'front'); flareUltra(ctx,W/2,H/2-20,600*a,a*0.92);
  }
  else if(scene.id==='outro'){
    ps.upd(1/FPS,t,'explode',0,0); const fade=clamp(1-(t-7.35)/0.65,0,1); const sc=easeOut(scene.p);
    ctx.save(); ctx.globalAlpha=fade; ctx.translate(W/2,H/2-30); ctx.scale(sc,sc); logoUltra(ctx,0,-72,68,fade,2.6); ctx.restore();
    textUltra(ctx,'KYARA',W/2,H/2+55,Math.floor(56*sc),C.w,fade,800,24); textUltra(ctx,'• IA •',W/2,H/2+90,20,C.p3,fade*0.95,600,12);
    ctx.save(); ctx.globalAlpha=fade*0.88; ctx.textAlign='center'; ctx.font='600 13px sans-serif'; ctx.fillStyle='rgba(255,255,255,0.70)'; ctx.fillText('MAIS QUE UM BOT,',W/2,H/2+128); ctx.fillText('UMA COMPANHIA.',W/2,H/2+148); ctx.font='700 13px sans-serif'; ctx.fillStyle=C.g; ctx.fillText('SEMPRE COM VOCÊ',W/2,H/2+180); ctx.restore();
    flareUltra(ctx,W/2,H/2-30,640*fade,fade*0.95);
    if(t>7.45){const fo=clamp((t-7.45)/0.55,0,1); ctx.fillStyle='rgba(0,0,0,'+fo+')'; ctx.fillRect(0,0,W,H);}
  }

  /*
   * V13 CINEMATIC TRANSITION LAYER
   * Cria uma passagem luminosa curta no limite de cada cena.
   * Não altera a lógica de conteúdo das cenas.
   */
  const trans=0.16;
  const local=t%0.95;

  if(local<trans){
    const q=1-local/trans;
    ctx.save();
    ctx.globalAlpha=q*0.10;
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,W,H);
    ctx.restore();
  }

  ctx.restore();
  ctx.save();
  ctx.strokeStyle='rgba(168,85,247,0.32)'; ctx.lineWidth=2.0; ctx.strokeRect(10,10,W-20,H-20);
  ctx.strokeStyle='rgba(56,189,248,0.15)'; ctx.lineWidth=1; ctx.strokeRect(24,24,W-48,H-48);
  ctx.fillStyle=C.c;
  ctx.fillRect(10,10,24,2.2); ctx.fillRect(10,10,2.2,24); ctx.fillRect(W-34,10,24,2.2); ctx.fillRect(W-12.2,10,2.2,24);
  ctx.fillRect(10,H-12.2,24,2.2); ctx.fillRect(10,H-34,2.2,24); ctx.fillRect(W-34,H-12.2,24,2.2); ctx.fillRect(W-12.2,H-34,2.2,24);
  const vig=ctx.createRadialGradient(W/2,H/2,W*0.28,W/2,H/2,W*0.96); vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,0.60)'); ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
  ctx.restore();
}

async function renderFrames({name,photoBuffer}){
  if(!Canvas) throw new Error('Canvas missing');
  const {createCanvas,loadImage}=Canvas; ensure();
  let photoImg=null; if(photoBuffer){try{photoImg=await loadImage(photoBuffer);}catch{}}
  const canvas=createCanvas(W,H),ctx=canvas.getContext('2d'),ps=new UltraParticles();
  const id='kyara-v13.4-'+Date.now()+'-'+Math.random().toString(36).slice(2,5),outPath=path.join(CACHE,id+'.mp4');
  console.log('[KYARA V13.4] → Render ULTRA CINEMATIC '+name+' '+(photoImg?'foto OK':'fallback'));
  const ff=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-r',String(FPS),'-i','pipe:0','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-r',String(FPS),outPath],{stdio:['pipe','pipe','pipe']});
  let err=''; ff.stderr.on('data',d=>err+=d.toString());
  const prom=new Promise((res,rej)=>{ff.on('close',c=>c===0?res():rej(new Error('FFmpeg '+c+': '+err.slice(-700)))); ff.on('error',rej);});
  try{
    for(let f=0;f<TOTAL;f++){const t=f/FPS; const sc=getScene(t); ctx.clearRect(0,0,W,H); renderScene(ctx,sc,t,ps,photoImg,name); const jpeg=canvas.toBuffer('image/jpeg',{quality:93}); if(!ff.stdin.write(jpeg)) await new Promise(r=>ff.stdin.once('drain',r)); if(f%24===0) console.log('[KYARA V13.4] '+f+'/'+TOTAL+' '+(f/TOTAL*100).toFixed(0)+'%');}
    ff.stdin.end(); await prom; const st=await fsp.stat(outPath); console.log('[KYARA V13.4] Pronto '+(st.size/1024).toFixed(1)+'KB | '+DUR+'s | '+W+'x'+H+' | '+FPS+'fps'); return {outPath};
  }catch(e){try{ff.stdin.destroy();}catch{} try{ff.kill('SIGKILL');}catch{} throw e;}
}

async function tryPhoto(Sock,jid){
  if(!jid) return null;
  const tries=new Set([jid,jid.split('@')[0]+'@s.whatsapp.net']);
  if(jid.includes('@lid')) tries.add(jid.replace('@lid','@s.whatsapp.net'));
  if(jid.includes(':')) tries.add(jid.split(':')[0]+'@s.whatsapp.net');
  for(const tj of tries){
    try{
      const url=await Promise.race([Sock.profilePictureUrl(tj,'image'),new Promise((_,r)=>setTimeout(()=>r('timeout'),1200))]);
      if(!url) continue;
      const res=await fetch(url,{signal:AbortSignal.timeout(2600)});
      if(!res.ok) continue;
      const buf=Buffer.from(await res.arrayBuffer());
      if(buf.length>1000) return buf;
    }catch{}
  }
  return null;
}
async function exists(f){try{await fsp.access(f); return true;}catch{return false;}}
function cacheKey(jid,name,ph){return hsh(jid+'|'+name+'|'+(ph||'no')+'|'+VER);}

async function createWelcomeAnimation(KyaraSock,groupMetadata,participants,isWelcome=true){
  ensure();
  console.log('[KYARA ANIMATION] → V13.3 isWelcome='+isWelcome);
  try{
    if(!isWelcome){
      if(await exists(FALL_E)){ console.log('[KYARA V13.4] Exit fallback'); return {ok:true,path:FALL_E,cleanup:async()=>{}}; }
    }
    let jid=null,name='Amigo';
    if(Array.isArray(participants)&&participants.length){
      const p=participants[0];
      if(typeof p==='string') jid=p;
      else if(p && p.id){jid=p.id; name=p.notify||p.name||name;}
      else if(p && p.jid) jid=p.jid;
    }
    if(!jid && groupMetadata && groupMetadata.participants && groupMetadata.participants.length) jid=groupMetadata.participants[0].id;
    if(!jid){
      const fb=isWelcome?FALL_W:FALL_E;
      if(await exists(fb)){ console.log('[KYARA V13.4] Sem jid fallback'); return {ok:true,path:fb,cleanup:async()=>{}}; }
      return {ok:false,error:new Error('sem jid')};
    }
    try{const cn=KyaraSock && (KyaraSock.getName?KyaraSock.getName(jid):null) || (KyaraSock.store && KyaraSock.store.contacts && KyaraSock.store.contacts[jid] && KyaraSock.store.contacts[jid].name); if(cn) name=cn;}catch{}
    console.log('[KYARA V13.4] Alvo '+jid+' Nome '+name);
    let photo=null;
    try{photo=await tryPhoto(KyaraSock,jid); console.log('[KYARA V13.4] Foto '+(photo?'encontrada '+photo.length+'b':'fallback'));}catch{}
    const ph=photo?hsh(photo.slice(0,2048)):'no-photo';
    const key=cacheKey(jid,name,ph);
    const cached=path.join(CACHE,key+'.mp4');
    if(await exists(cached)){console.log('[KYARA V13.4] Cache HIT '+key+'.mp4'); return {ok:true,path:cached,cleanup:async()=>{}};}
    console.log('[KYARA V13.4] Cache MISS '+key+' → Render ULTRA CINEMATIC');
    if(!Canvas){
      if(await exists(FALL_W)) return {ok:true,path:FALL_W,cleanup:async()=>{}};
      return {ok:false,error:new Error('canvas missing')};
    }
    const out=await renderFrames({name:name,photoBuffer:photo});
    try{await fsp.rename(out.outPath,cached);}catch{try{await fsp.copyFile(out.outPath,cached); await fsp.unlink(out.outPath).catch(function(){});}catch{}}
    console.log('[KYARA V13.4] Cache salvo '+cached+' | Enviando');
    try{
      const files=await fsp.readdir(CACHE);
      if(files.length>100){
        const stats=await Promise.all(files.map(async function(f){const p=path.join(CACHE,f); try{const s=await fsp.stat(p); return {p:p,t:s.mtimeMs};}catch{return null;}}));
        const valid=stats.filter(Boolean).sort(function(a,b){return a.t-b.t;});
        for(let i=0;i<valid.length-85;i++) await fsp.unlink(valid[i].p).catch(function(){});
      }
    }catch{}
    return {ok:true,path:cached,cleanup:async()=>{}};
  }catch(err){
    console.error('[KYARA V13.4] Erro',err.message);
    const fb=isWelcome?FALL_W:FALL_E;
    if(await exists(fb)){console.log('[KYARA V13.4] Fallback por erro'); return {ok:true,path:fb,cleanup:async()=>{}};}
    return {ok:false,error:err};
  }
}
module.exports={createWelcomeAnimation};
