<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
<title>KYARA HIGH-TECH v1 — Official Premium System</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Fragment+Mono&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{
--bg:#05050a;
--bg-elev:#0d0c19;
--panel:#111021;
--panel-b:#191832;
--panel-c:#1e1c36;
--stroke:rgba(255,255,255,.08);
--stroke-2:rgba(139,92,246,.22);
--purple:#9a6cff;
--purple-2:#7a3dff;
--magenta:#ff3b9c;
--cyan:#18f0ff;
--cyan-2:#5cf4ff;
--lime:#b6ff3b;
--text:#f6f4ff;
--text-2:#b1adc8;
--text-3:#6f6d8a;
--r:22px;
--r-lg:32px;
--r-xl:40px;
--shadow:0 20px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07);
--ease:cubic-bezier(.16,1,.3,1);
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:88px}
body{
background:var(--bg);
color:var(--text);
font-family:"Instrument Sans",system-ui,sans-serif;
overflow-x:hidden;
-webkit-font-smoothing:antialiased;
}
::selection{background:var(--purple);color:white}
a{color:inherit;text-decoration:none}
button{font:inherit;cursor:pointer;background:none;border:0;color:inherit}
.mono{font-family:"Fragment Mono",monospace;letter-spacing:-.02em}
.display{font-family:"Bricolage Grotesque",sans-serif;letter-spacing:-.04em;line-height:.9}

/* BG */
.bg-fixed{position:fixed;inset:0;z-index:-3;pointer-events:none}
.bg-grid{
position:absolute;inset:0;
background-image:
linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
background-size:56px 56px;
mask-image:radial-gradient(70% 60% at 50% 0%, black 40%, transparent 100%);
}
.bg-orbs{position:absolute;inset:0;overflow:hidden}
.orb{position:absolute;border-radius:50%;filter:blur(70px);mix-blend:screen;opacity:.9}
.orb1{width:900px;height:700px;background:radial-gradient(circle at 30% 30%, #8b5cf6, transparent 60%);left:-10%;top:-18%;animation:orb 18s infinite alternate var(--ease)}
.orb2{width:800px;height:800px;background:radial-gradient(circle at 30% 30%, #ff3b9c, transparent 65%);right:-12%;top:-5%;animation:orb 22s infinite alternate-reverse var(--ease)}
.orb3{width:700px;height:600px;background:radial-gradient(circle at 30% 30%, #18f0ff, transparent 65%);left:35%;bottom:-20%;opacity:.5;animation:orb 26s infinite alternate var(--ease)}
@keyframes orb{to{transform:translate3d(40px,-30px,0) scale(1.08)}}

/* PROGRESS */
#progress{position:fixed;top:0;left:0;height:2px;width:0;background:linear-gradient(90deg,var(--purple),var(--magenta),var(--cyan));z-index:9999;transition:width .1s linear}

/* NAV */
.nav-wrap{position:fixed;top:18px;left:0;right:0;z-index:100;display:flex;justify-content:center;padding:0 16px;pointer-events:none}
.nav{
pointer-events:auto;
display:flex;align-items:center;gap:8px;
padding:8px 8px 8px 14px;
background:rgba(13,12,25,.78);
backdrop-filter:blur(24px) saturate(1.4);
border:1px solid var(--stroke);
border-radius:999px;
box-shadow:0 10px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08);
}
.nav-logo{display:flex;align-items:center;gap:10px;padding-right:14px;border-right:1px solid var(--stroke)}
.nav-logo-mark{
width:30px;height:30px;border-radius:10px;
background:conic-gradient(from 0deg, var(--purple), var(--magenta), var(--cyan), var(--purple));
display:grid;place-items:center;
box-shadow:0 0 18px rgba(154,108,255,.5);
}
.nav-logo-mark span{width:18px;height:18px;background:black;border-radius:6px;display:grid;place-items:center;font-size:11px;font-weight:800;color:white}
.nav-logo b{font-family:"Bricolage Grotesque";font-weight:800;letter-spacing:-.03em;font-size:15px}
.nav-links{display:flex;gap:2px;list-style:none}
.nav-links a{
padding:8px 14px;border-radius:999px;font-size:13.5px;font-weight:500;color:var(--text-2);
transition:.25s var(--ease);
}
.nav-links a:hover{color:var(--text);background:rgba(255,255,255,.06)}
.nav-links a.active{background:white;color:black;font-weight:600}
.nav-cta{
margin-left:6px;
padding:9px 16px;border-radius:999px;
background:white;color:black;font-weight:700;font-size:13.5px;
display:flex;align-items:center;gap:6px;transition:.2s var(--ease);
}
.nav-cta:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(255,255,255,.2)}
.burger{display:none;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid var(--stroke);place-items:center}
@media(max-width:980px){
.nav{width:100%;max-width:640px;justify-content:space-between}
.nav-links{position:fixed;top:76px;left:16px;right:16px;background:rgba(13,12,25,.94);backdrop-filter:blur(28px);border:1px solid var(--stroke);border-radius:22px;padding:10px;flex-direction:column;gap:4px;opacity:0;pointer-events:none;transform:translateY(-10px);transition:.35s var(--ease)}
.nav-links.open{opacity:1;pointer-events:auto;transform:translateY(0)}
.burger{display:grid}
.nav-cta{display:none}
}

/* HERO */
.hero{position:relative;padding:132px 0 40px}
.hero-inner{max-width:1280px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:1.15fr .85fr;gap:28px;align-items:start}
@media(max-width:980px){.hero{padding:92px 0 24px}.hero-inner{grid-template-columns:1fr;gap:22px}}

.hero-left{
position:relative;
background:linear-gradient(180deg, rgba(25,24,50,.9), rgba(13,12,25,.9));
border:1px solid var(--stroke);
border-radius:var(--r-xl);
padding:34px 34px 28px;
box-shadow:var(--shadow);
overflow:hidden;
}
.hero-left::before{
content:"";position:absolute;inset:-1px;border-radius:inherit;padding:1px;
background:linear-gradient(115deg, rgba(154,108,255,.5), rgba(255,59,156,.35), rgba(24,240,255,.35));
-webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;
}
.hero-kicker{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.badge{
display:inline-flex;align-items:center;gap:7px;
padding:6px 10px;border-radius:999px;
background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);
font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--text-2);
}
.badge i{width:6px;height:6px;border-radius:50%;background:var(--lime);box-shadow:0 0 10px var(--lime);display:inline-block;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.badge.purple{border-color:rgba(154,108,255,.25);background:rgba(154,108,255,.12);color:#cbb6ff}
.badge.magenta{border-color:rgba(255,59,156,.25);background:rgba(255,59,156,.12);color:#ffb3d6}
.badge.cyan{border-color:rgba(24,240,255,.25);background:rgba(24,240,255,.12);color:#a6f6ff}

.hero h1{font-size:clamp(42px, 7vw, 92px);font-weight:800;line-height:.85;letter-spacing:-.06em;margin-bottom:18px}
.hero h1 .line1{display:block;background:linear-gradient(100deg, white 10%, #d8d0ff 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero h1 .line2{display:block;background:linear-gradient(100deg, var(--purple) 0%, var(--magenta) 45%, var(--cyan) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-top:2px}
.hero-desc{font-size:17px;line-height:1.5;color:var(--text-2);max-width:52ch;margin-bottom:24px}
.hero-desc strong{color:var(--text);font-weight:600}

.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:22px}
.btn{
display:inline-flex;align-items:center;gap:9px;
padding:13px 18px;border-radius:999px;font-weight:600;font-size:14px;
transition:.22s var(--ease);position:relative;overflow:hidden;
}
.btn-primary{background:white;color:black;box-shadow:0 10px 24px rgba(255,255,255,.18)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(255,255,255,.24)}
.btn-ghost{background:rgba(255,255,255,.07);border:1px solid var(--stroke);color:var(--text)}
.btn-ghost:hover{background:rgba(255,255,255,.11);border-color:rgba(255,255,255,.18)}

.hero-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding-top:18px;border-top:1px solid var(--stroke);margin-top:4px}
.metric b{font-family:"Bricolage Grotesque";font-size:22px;font-weight:800;display:block;line-height:1}
.metric span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);font-weight:600}

/* HERO RIGHT VISUAL */
.hero-right{position:relative;display:grid;gap:18px;align-content:start}
.card-visual{
position:relative;border-radius:28px;overflow:hidden;
background:linear-gradient(180deg, #15132a, #0e0d1b);
border:1px solid var(--stroke);box-shadow:var(--shadow);
min-height:420px;
}
.card-visual-top{
height:44px;display:flex;align-items:center;justify-content:space-between;
padding:0 16px;border-bottom:1px solid var(--stroke);
background:rgba(255,255,255,.03);
}
.dots{display:flex;gap:6px}
.dots i{width:9px;height:9px;border-radius:50%;display:block}
.card-visual-body{position:relative;padding:18px}
.media-stack{display:grid;gap:14px}
.media-main{
aspect-ratio:16/10;border-radius:18px;overflow:hidden;position:relative;
background:radial-gradient(120% 120% at 20% 0%, rgba(154,108,255,.4), rgba(255,59,156,.25) 35%, rgba(24,240,255,.18) 70%, #0a0a14);
border:1px solid rgba(255,255,255,.08);
}
.media-main img{width:100%;height:100%;object-fit:cover;mix-blend:screen;opacity:.9}
.media-main .glow{position:absolute;inset:-20%;background:conic-gradient(from 0deg at 50% 50%, transparent, rgba(154,108,255,.6), transparent, rgba(24,240,255,.5), transparent);animation:spin 12s linear infinite;opacity:.6}
@keyframes spin{to{transform:rotate(360deg)}}
.media-main .logo-fallback{
position:absolute;inset:0;display:grid;place-items:center;
font-family:"Bricolage Grotesque";font-weight:800;font-size:54px;letter-spacing:-.06em;
background:linear-gradient(100deg, white, var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;
}
.media-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.media-mini{border-radius:14px;overflow:hidden;aspect-ratio:4/3;background:#0f0e1d;border:1px solid var(--stroke);position:relative}
.media-mini img{width:100%;height:100%;object-fit:cover}
.media-mini .tag{position:absolute;left:8px;bottom:8px;padding:4px 8px;border-radius:999px;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);font-size:10px;font-weight:700;letter-spacing:.06em;color:white;border:1px solid rgba(255,255,255,.12)}

/* FLOATING */
.float-bar{
display:flex;align-items:center;gap:12px;
padding:12px 14px;border-radius:16px;
background:rgba(0,0,0,.6);backdrop-filter:blur(16px);
border:1px solid rgba(255,255,255,.1);
}
.float-bar code{font-family:"Fragment Mono";font-size:12.5px;color:var(--cyan-2)}
.float-bar .copy{margin-left:auto;width:32px;height:32px;border-radius:10px;background:white;color:black;display:grid;place-items:center;transition:.2s}
.float-bar .copy:hover{transform:scale(1.06)}

/* SECTIONS */
.section{max-width:1280px;margin:0 auto;padding:56px 24px}
.section-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:28px;flex-wrap:wrap}
.section-head h2{font-family:"Bricolage Grotesque";font-size:clamp(28px,4vw,46px);font-weight:800;letter-spacing:-.05em;line-height:.9}
.section-head h2 i{font-style:normal;background:linear-gradient(100deg,var(--purple),var(--magenta));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.section-head p{max-width:44ch;color:var(--text-2);font-size:15px;line-height:1.5}

/* SYSTEMS */
.systems-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:14px}
.sys-card{
grid-column:span 4;
position:relative;
padding:20px 18px 18px;
border-radius:22px;
background:linear-gradient(180deg, rgba(25,24,50,.85), rgba(16,15,30,.92));
border:1px solid var(--stroke);
overflow:hidden;
transition:.35s var(--ease);
}
.sys-card::before{
content:"";position:absolute;inset:0;border-radius:inherit;opacity:0;
background:radial-gradient(400px 200px at var(--mx,50%) 0%, rgba(154,108,255,.18), transparent 70%);
transition:.35s var(--ease);pointer-events:none;
}
.sys-card:hover{transform:translateY(-3px);border-color:rgba(154,108,255,.28);box-shadow:0 20px 50px rgba(0,0,0,.45), 0 0 0 1px rgba(154,108,255,.15) inset}
.sys-card:hover::before{opacity:1}
.sys-card.large{grid-column:span 8}
.sys-card.small{grid-column:span 4}
@media(max-width:980px){.sys-card,.sys-card.large,.sys-card.small{grid-column:span 12}}
.sys-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.sys-icon{
width:42px;height:42px;border-radius:12px;
display:grid;place-items:center;
background:linear-gradient(180deg, rgba(255,255,255,.1), rgba(255,255,255,.03));
border:1px solid rgba(255,255,255,.1);
font-size:20px;
}
.sys-tag{font-family:"Fragment Mono";font-size:10px;letter-spacing:.08em;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid var(--stroke);color:var(--text-3)}
.sys-card h3{font-family:"Bricolage Grotesque";font-size:18px;font-weight:700;letter-spacing:-.02em;margin-bottom:6px}
.sys-card p{font-size:13.5px;color:var(--text-2);line-height:1.5}
.sys-list{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px}
.sys-list span{font-size:11px;padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid var(--stroke);color:var(--text-2)}

/* INSTALL */
.install-wrap{display:grid;grid-template-columns:320px 1fr;gap:16px;align-items:start}
@media(max-width:980px){.install-wrap{grid-template-columns:1fr}}
.toc{
position:sticky;top:96px;
padding:16px;border-radius:20px;
background:rgba(17,16,33,.8);border:1px solid var(--stroke);backdrop-filter:blur(16px);
}
.toc h4{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-3);margin-bottom:12px;font-weight:700}
.toc a{display:flex;align-items:center;gap:10px;padding:10px 10px;border-radius:12px;color:var(--text-2);font-size:13.5px;transition:.2s}
.toc a:hover{background:rgba(255,255,255,.06);color:var(--text)}
.toc a.active{background:white;color:black;font-weight:600}
.toc a i{width:26px;height:26px;border-radius:8px;background:rgba(255,255,255,.08);display:grid;place-items:center;font-size:12px;font-style:normal}
.toc a.active i{background:black;color:white}

.steps{display:grid;gap:16px}
.step{
position:relative;
display:grid;grid-template-columns:56px 1fr;
gap:16px;
padding:20px;
border-radius:22px;
background:linear-gradient(180deg, rgba(22,21,40,.95), rgba(14,13,27,.95));
border:1px solid var(--stroke);
box-shadow:var(--shadow);
overflow:hidden;
transition:.3s var(--ease);
}
.step:hover{border-color:rgba(154,108,255,.22)}
@media(max-width:600px){.step{grid-template-columns:1fr;gap:12px}}
.step-num{
width:56px;height:56px;border-radius:16px;
display:grid;place-items:center;
background:radial-gradient(100% 100% at 0% 0%, rgba(154,108,255,.5), rgba(255,59,156,.35));
border:1px solid rgba(255,255,255,.12);
box-shadow:0 0 24px rgba(154,108,255,.25) inset;
font-family:"Bricolage Grotesque";font-weight:800;font-size:20px;
}
.step-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:6px}
.step-head h3{font-family:"Bricolage Grotesque";font-size:18px;font-weight:700;letter-spacing:-.02em}
.step-head .pill{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;padding:4px 8px;border-radius:999px;background:rgba(24,240,255,.12);border:1px solid rgba(24,240,255,.25);color:var(--cyan-2);font-weight:700}
.step p{color:var(--text-2);font-size:13.8px;line-height:1.55;margin-bottom:12px}
.code-block{
position:relative;
display:grid;grid-template-columns:1fr auto;
align-items:center;
gap:10px;
padding:12px 12px 12px 14px;
border-radius:14px;
background:#080815;
border:1px solid rgba(255,255,255,.08);
box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
overflow:hidden;
}
.code-block::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--purple),var(--magenta),var(--cyan))}
.code-block code{
font-family:"Fragment Mono";font-size:13px;white-space:pre-wrap;word-break:break-all;
color:#d9d6f0;
}
.code-actions{display:flex;gap:6px}
.icon-btn{
width:36px;height:36px;border-radius:10px;
display:grid;place-items:center;
background:rgba(255,255,255,.06);border:1px solid var(--stroke);
transition:.2s;
}
.icon-btn:hover{background:white;color:black;transform:translateY(-1px)}
.icon-btn.copied{background:var(--lime);color:black;border-color:var(--lime)}
.ext-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.ext{
display:inline-flex;align-items:center;gap:7px;
padding:8px 12px;border-radius:999px;
background:rgba(255,255,255,.06);border:1px solid var(--stroke);
font-size:12.5px;font-weight:600;color:var(--text-2);transition:.2s;
}
.ext:hover{background:white;color:black}

/* COMMANDS */
.cmd-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
.cmd{
grid-column:span 4;
padding:16px;border-radius:18px;
background:linear-gradient(180deg, rgba(20,19,38,.9), rgba(13,12,25,.9));
border:1px solid var(--stroke);
display:flex;flex-direction:column;gap:10px;
transition:.25s var(--ease);
}
.cmd:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.14)}
@media(max-width:980px){.cmd{grid-column:span 6}}
@media(max-width:600px){.cmd{grid-column:span 12}}
.cmd-top{display:flex;align-items:center;gap:10px}
.cmd-ic{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid var(--stroke);display:grid;place-items:center;font-size:16px}
.cmd h4{font-size:13.5px;font-weight:600;letter-spacing:-.01em}
.cmd p{font-size:12.5px;color:var(--text-3);line-height:1.4}

/* WHATSAPP */
.wa-wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:18px}
@media(max-width:980px){.wa-wrap{grid-template-columns:1fr}}
.wa-steps{display:grid;gap:10px}
.wa-step{
display:grid;grid-template-columns:40px 1fr;
gap:12px;align-items:start;
padding:14px 14px;border-radius:16px;
background:rgba(17,16,33,.8);border:1px solid var(--stroke);
}
.wa-step b{width:40px;height:40px;border-radius:12px;background:white;color:black;display:grid;place-items:center;font-family:"Bricolage Grotesque";font-weight:800;font-size:16px}
.wa-step p{font-size:13.5px;color:var(--text-2);line-height:1.5;padding-top:6px}
.wa-phone{
position:relative;
border-radius:30px;
background:linear-gradient(180deg, #1a1930, #0d0c1a);
border:1px solid var(--stroke);
padding:14px;
box-shadow:0 30px 80px rgba(0,0,0,.6);
overflow:hidden;
}
.phone-notch{width:96px;height:22px;background:black;border-radius:0 0 14px 14px;margin:0 auto 14px;display:block}
.phone-screen{
border-radius:20px;overflow:hidden;
background:radial-gradient(120% 80% at 50% 0%, rgba(154,108,255,.35), transparent 50%), #0b0b14;
border:1px solid rgba(255,255,255,.08);
padding:18px;min-height:380px;
}
.phone-screen h5{font-family:"Bricolage Grotesque";font-size:18px;margin-bottom:10px}
.phone-code{
margin:14px 0;padding:14px;border-radius:14px;background:black;border:1px dashed rgba(255,255,255,.18);
display:grid;place-items:center;
font-family:"Fragment Mono";font-size:22px;letter-spacing:.2em;color:var(--cyan-2);
}
.alert{
margin-top:14px;padding:12px 14px;border-radius:14px;
background:linear-gradient(90deg, rgba(255,206,69,.12), rgba(255,59,156,.12));
border:1px solid rgba(255,206,69,.22);
display:flex;gap:10px;align-items:start;
}
.alert i{width:28px;height:28px;border-radius:8px;background:var(--warn);color:black;display:grid;place-items:center;flex:0 0 28px;font-weight:800}
.alert p{font-size:12.5px;color:#ffeeb0;line-height:1.5}

/* SECURITY */
.sec-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
.sec{
grid-column:span 4;
padding:18px;border-radius:18px;
background:linear-gradient(180deg, rgba(22,19,36,.9), rgba(14,12,26,.9));
border:1px solid var(--stroke);
display:flex;gap:12px;align-items:start;
}
@media(max-width:980px){.sec{grid-column:span 6}}
@media(max-width:600px){.sec{grid-column:span 12}}
.sec i{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:rgba(255,59,156,.14);border:1px solid rgba(255,59,156,.22);font-size:18px;flex:0 0 38px}
.sec h4{font-size:13.5px;font-weight:700;margin-bottom:4px}
.sec p{font-size:12.5px;color:var(--text-2);line-height:1.5}

/* GITHUB */
.github{
position:relative;
border-radius:28px;
overflow:hidden;
background:linear-gradient(105deg, #18162e 0%, #131225 45%, #0e0d1d 100%);
border:1px solid var(--stroke);
padding:28px;
display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:center;
box-shadow:var(--shadow);
}
@media(max-width:900px){.github{grid-template-columns:1fr}}
.github::before{content:"";position:absolute;inset:-1px;padding:1px;border-radius:inherit;background:linear-gradient(120deg, rgba(154,108,255,.5), rgba(24,240,255,.4));-webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
.github h3{font-family:"Bricolage Grotesque";font-size:28px;font-weight:800;letter-spacing:-.04em;line-height:.95;margin-bottom:10px}
.github p{color:var(--text-2);font-size:14px;line-height:1.5;max-width:48ch}
.repo{
display:flex;align-items:center;gap:12px;
padding:12px;border-radius:14px;
background:rgba(0,0,0,.35);border:1px solid var(--stroke);
margin-top:16px;
}
.repo code{font-family:"Fragment Mono";font-size:12.5px;color:var(--text-2);word-break:break-all}
.github-visual{
border-radius:18px;overflow:hidden;
background:radial-gradient(100% 100% at 0% 0%, rgba(154,108,255,.35), transparent 60%), #0a0916;
border:1px solid var(--stroke);
aspect-ratio:4/3;display:grid;place-items:center;position:relative;
}
.github-visual .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);background-size:28px 28px;opacity:.5}
.github-visual b{position:relative;z-index:1;font-family:"Bricolage Grotesque";font-size:42px;font-weight:800;letter-spacing:-.05em;background:linear-gradient(100deg, white, var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent}

/* FOOTER */
footer{max-width:1280px;margin:0 auto;padding:30px 24px 50px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;color:var(--text-3);font-size:12.5px;border-top:1px solid var(--stroke);margin-top:20px}
footer .links{display:flex;gap:14px;flex-wrap:wrap}
footer a{color:var(--text-2)} footer a:hover{color:var(--text)}

/* TOAST */
#toast{
position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(20px);
padding:10px 14px;border-radius:999px;
background:white;color:black;font-weight:600;font-size:13px;
display:flex;align-items:center;gap:8px;
box-shadow:0 10px 30px rgba(0,0,0,.4);
opacity:0;pointer-events:none;transition:.35s var(--ease);z-index:9999;
}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
#toast i{width:20px;height:20px;border-radius:50%;background:black;color:white;display:grid;place-items:center;font-size:12px}

/* REVEAL */
.reveal{opacity:0;transform:translateY(18px);transition:.7s var(--ease)}
.reveal.in{opacity:1;transform:translateY(0)}
</style>
</head>
<body>
<div class="bg-fixed"><div class="bg-grid"></div><div class="bg-orbs"><div class="orb orb1"></div><div class="orb orb2"></div><div class="orb orb3"></div></div></div>
<div id="progress"></div>

<div class="nav-wrap">
<nav class="nav" aria-label="principal">
<div class="nav-logo"><div class="nav-logo-mark"><span>K</span></div><b>KYARA</b></div>
<ul class="nav-links" id="navLinks">
<li><a href="#inicio" class="active">Início</a></li>
<li><a href="#sistemas">Sistemas</a></li>
<li><a href="#instalacao">Instalação</a></li>
<li><a href="#whatsapp">WhatsApp</a></li>
<li><a href="#comandos">Comandos</a></li>
<li><a href="#seguranca">Segurança</a></li>
<li><a href="#github">GitHub</a></li>
</ul>
<a class="nav-cta" href="https://github.com/bakizinho/Kyara-High-Tech" target="_blank" rel="noopener">Visitar GitHub →</a>
<button class="burger" id="burger" aria-label="menu">☰</button>
</nav>
</div>

<header class="hero" id="inicio">
<div class="hero-inner">
<div class="hero-left reveal in">
<div class="hero-kicker">
<span class="badge"><i></i> ONLINE • v1.0.0 STABLE</span>
<span class="badge purple">◉ Node.js 20+ • Termux Ready</span>
<span class="badge magenta">WhatsApp • Multi-Device</span>
<span class="badge cyan">AI • MEDIA • RPG • ECONOMY</span>
</div>
<h1 class="display"><span class="line1">KYARA</span><span class="line2">HIGH-TECH v1</span></h1>
<p class="hero-desc">Um <strong>bot premium para WhatsApp</strong> com arquitetura modular, Native Flow, Level System e automação completa. Feito para rodar liso no Termux, com performance real e design de painel futurista.</p>
<div class="hero-actions">
<a class="btn btn-primary" href="#instalacao">⚡ Instalar agora</a>
<a class="btn btn-ghost" href="#sistemas">Ver sistemas</a>
</div>
<div class="hero-metrics">
<div class="metric"><b>10+</b><span>Sistemas core</span></div>
<div class="metric"><b>100%</b><span>Termux compatível</span></div>
<div class="metric"><b>0 lag</b><span>Native flow</span></div>
</div>
</div>

<div class="hero-right reveal in" style="transition-delay:.08s">
<div class="card-visual" id="tilt">
<div class="card-visual-top">
<div class="dots"><i style="background:#ff5f56"></i><i style="background:#ffbd2e"></i><i style="background:#27c93f"></i></div>
<span class="mono" style="font-size:11px;color:var(--text-3)">kyara-high-tech.svg / menu.jpg</span>
</div>
<div class="card-visual-body">
<div class="media-stack">
<div class="media-main">
<div class="glow"></div>
<img src="./assets/kyara-high-tech.svg" alt="Kyara logo" onerror="this.style.display='none'">
<div class="logo-fallback" id="fallbackLogo">KYARA</div>
</div>
<div class="media-row">
<div class="media-mini">
<img src="./dados/midias/menu.jpg" alt="Kyara menu" onerror="this.parentElement.style.display='none'">
<span class="tag">MENU • PREVIEW</span>
</div>
<div class="media-mini" style="display:grid;place-items:center;background:radial-gradient(120% 100% at 0% 0%, rgba(154,108,255,.4), #12112a)">
<div style="text-align:center;padding:14px">
<div style="width:36px;height:36px;border-radius:10px;background:white;color:black;display:grid;place-items:center;margin:0 auto 8px;font-weight:800">K</div>
<div class="mono" style="font-size:11px;color:var(--text-2)">native_flow: active<br>level_system: ready</div>
</div>
</div>
</div>
</div>
</div>
</div>
<div class="float-bar">
<code>git clone https://github.com/bakizinho/Kyara-High-Tech.git</code>
<button class="copy" data-copy="git clone https://github.com/bakizinho/Kyara-High-Tech.git" aria-label="copiar">⎙</button>
</div>
</div>
</div>
</header>

<section class="section" id="sistemas">
<div class="section-head reveal">
<div><h2>Sistemas <i>nativos</i></h2><p>Arquitetura modular pensada para performance. Cada módulo é independente, leve e preparado para grupos.</p></div>
<span class="badge mono">10 CORE MODULES</span>
</div>
<div class="systems-grid">
<div class="sys-card large reveal"><div class="sys-top"><div class="sys-icon">⚙️</div><span class="sys-tag">CORE • 01</span></div><h3>Automação</h3><p>Fluxos automáticos, anti-flood, boas-vindas, auto-respostas e gerenciamento de fila sem travar o processo principal.</p><div class="sys-list"><span>anti-spam</span><span>auto-reply</span><span>queue</span></div></div>
<div class="sys-card small reveal" style="transition-delay:.04s"><div class="sys-top"><div class="sys-icon">🧠</div><span class="sys-tag">AI • 02</span></div><h3>Inteligência Artificial</h3><p>Respostas contextuais, memória curta e integração com APIs de IA para conversas naturais.</p></div>
<div class="sys-card small reveal"><div class="sys-top"><div class="sys-icon">🎬</div><span class="sys-tag">MEDIA • 03</span></div><h3>Mídia</h3><p>Stickers, download, conversão, ffmpeg otimizado e processamento rápido de áudio/vídeo.</p></div>
<div class="sys-card small reveal" style="transition-delay:.04s"><div class="sys-top"><div class="sys-icon">🎮</div><span class="sys-tag">RPG • 04</span></div><h3>RPG</h3><p>Sistema de aventura, batalhas, inventário e progressão com balanceamento próprio.</p></div>
<div class="sys-card small reveal" style="transition-delay:.08s"><div class="sys-top"><div class="sys-icon">💰</div><span class="sys-tag">ECONOMY • 05</span></div><h3>Economia</h3><p>Banco, loja, carteira, daily e ranking com persistência em database local.</p></div>
<div class="sys-card small reveal"><div class="sys-top"><div class="sys-icon">👥</div><span class="sys-tag">GROUPS • 06</span></div><h3>Grupos</h3><p>Gestão completa: admin, antilink, bem-vindo, warn, mute e painel de controle.</p></div>
<div class="sys-card small reveal" style="transition-delay:.04s"><div class="sys-top"><div class="sys-icon">🌊</div><span class="sys-tag">FLOW • 07</span></div><h3>Native Flow</h3><p>Engine própria para respostas instantâneas, sem bloqueios e com consumo mínimo de RAM.</p></div>
<div class="sys-card large reveal" style="transition-delay:.06s"><div class="sys-top"><div class="sys-icon">📈</div><span class="sys-tag">LEVEL • 08</span></div><h3>Level System</h3><p>XP por interação, níveis, recompensas e leaderboard. Otimizado para grupos grandes, sem spam de mensagens.</p><div class="sys-list"><span>xp engine</span><span>leaderboard</span><span>rewards</span></div></div>
<div class="sys-card small reveal"><div class="sys-top"><div class="sys-icon">🗄️</div><span class="sys-tag">DB • 09</span></div><h3>Database</h3><p>Armazenamento leve, backup simples e estrutura pronta para escalar.</p></div>
<div class="sys-card small reveal" style="transition-delay:.04s"><div class="sys-top"><div class="sys-icon">🔌</div><span class="sys-tag">API • 10</span></div><h3>API</h3><p>Integração com serviços externos, webhooks e chaves seguras via .env.</p></div>
</div>
</section>

<section class="section" id="instalacao">
<div class="section-head reveal"><div><h2>Tutorial <i>Termux</i></h2><p>Instalação oficial, passo a passo, com comandos copiáveis e links verificados.</p></div><span class="badge cyan">MAIS IMPORTANTE</span></div>
<div class="install-wrap">
<div class="toc reveal">
<h4>Navegação rápida</h4>
<a href="#et1" class="active"><i>01</i> Baixar Termux</a>
<a href="#et2"><i>02</i> Atualizar</a>
<a href="#et3"><i>03</i> Storage</a>
<a href="#et4"><i>04</i> Requisitos</a>
<a href="#et5"><i>05</i> Baixar Kyara</a>
<a href="#et6"><i>06</i> Entrar na pasta</a>
<a href="#et7"><i>07</i> Dependências</a>
<a href="#et8"><i>08</i> Iniciar bot</a>
<div style="margin-top:14px;padding:10px 12px;border-radius:12px;background:rgba(182,255,59,.1);border:1px solid rgba(182,255,59,.2)"><div class="mono" style="font-size:11px;color:var(--lime);font-weight:700">DICA PRO</div><div style="font-size:12px;color:var(--text-2);margin-top:4px;line-height:1.4">Use F-Droid, não Play Store. A versão da Play Store está desatualizada.</div></div>
</div>
<div class="steps">
<div class="step reveal" id="et1"><div class="step-num">01</div><div><div class="step-head"><h3>Baixar o Termux</h3><span class="pill">obrigatório</span></div><p>Instale apenas pela F-Droid ou GitHub oficial. Evite Play Store — versão descontinuada e com bugs de storage.</p><div class="ext-links"><a class="ext" href="https://f-droid.org/packages/com.termux/" target="_blank" rel="noopener">↗ F-Droid Oficial</a><a class="ext" href="https://github.com/termux/termux-app" target="_blank" rel="noopener">↗ GitHub Termux</a></div></div></div>
<div class="step reveal" id="et2"><div class="step-num">02</div><div><div class="step-head"><h3>Atualizar o Termux</h3></div><p>Atualize pacotes base para evitar erros de node, python e ffmpeg.</p><div class="code-block"><code>pkg update -y && pkg upgrade -y</code><div class="code-actions"><button class="icon-btn" data-copy="pkg update -y && pkg upgrade -y">⎙</button></div></div></div></div>
<div class="step reveal" id="et3"><div class="step-num">03</div><div><div class="step-head"><h3>Liberar armazenamento</h3></div><p>Permite que o Termux acesse arquivos. Confirme a permissão quando o Android solicitar.</p><div class="code-block"><code>termux-setup-storage</code><div class="code-actions"><button class="icon-btn" data-copy="termux-setup-storage">⎙</button></div></div></div></div>
<div class="step reveal" id="et4"><div class="step-num">04</div><div><div class="step-head"><h3>Instalar requisitos</h3></div><p>Git, Node.js, Python e FFmpeg são necessários para mídia e dependências.</p><div class="code-block"><code>pkg install -y git nodejs python ffmpeg</code><div class="code-actions"><button class="icon-btn" data-copy="pkg install -y git nodejs python ffmpeg">⎙</button></div></div></div></div>
<div class="step reveal" id="et5"><div class="step-num">05</div><div><div class="step-head"><h3>Baixar a Kyara</h3><span class="pill">git clone</span></div><p>Clone o repositório oficial direto na home do Termux.</p><div class="code-block"><code>cd ~
git clone https://github.com/bakizinho/Kyara-High-Tech.git</code><div class="code-actions"><button class="icon-btn" data-copy="cd ~
git clone https://github.com/bakizinho/Kyara-High-Tech.git">⎙</button></div></div></div></div>
<div class="step reveal" id="et6"><div class="step-num">06</div><div><div class="step-head"><h3>Entrar na pasta</h3></div><p>Acesse o diretório do projeto antes de instalar dependências.</p><div class="code-block"><code>cd ~/Kyara-High-Tech</code><div class="code-actions"><button class="icon-btn" data-copy="cd ~/Kyara-High-Tech">⎙</button></div></div></div></div>
<div class="step reveal" id="et7"><div class="step-num">07</div><div><div class="step-head"><h3>Instalar dependências</h3></div><p>Instala todas as libs do Node. Aguarde concluir sem fechar o terminal.</p><div class="code-block"><code>npm install</code><div class="code-actions"><button class="icon-btn" data-copy="npm install">⎙</button></div></div></div></div>
<div class="step reveal" id="et8"><div class="step-num" style="background:radial-gradient(100% 100% at 0% 0%, #b6ff3b, #18f0ff)">08</div><div><div class="step-head"><h3>Iniciar o bot</h3><span class="pill" style="background:rgba(182,255,59,.15);border-color:rgba(182,255,59,.3);color:var(--lime)">final</span></div><p>Primeira inicialização. Na próxima vez que parear, use o código exibido no terminal.</p><div class="code-block"><code>npm start</code><div class="code-actions"><button class="icon-btn" data-copy="npm start">⎙</button></div></div><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><div class="code-block" style="flex:1;min-width:160px"><code>node .</code><div class="code-actions"><button class="icon-btn" data-copy="node .">⎙</button></div></div><span class="mono" style="font-size:11px;color:var(--text-3);align-self:center">alternativa</span></div></div></div>
</div>
</div>
</section>

<section class="section" id="comandos">
<div class="section-head reveal"><div><h2>Comandos <i>úteis</i></h2><p>Atalhos essenciais para manter o bot estável no Termux.</p></div></div>
<div class="cmd-grid">
<div class="cmd reveal"><div class="cmd-top"><div class="cmd-ic">▶️</div><h4>Iniciar novamente</h4></div><p>Volta para a pasta e inicia.</p><div class="code-block"><code>cd ~/Kyara-High-Tech && npm start</code><div class="code-actions"><button class="icon-btn" data-copy="cd ~/Kyara-High-Tech && npm start">⎙</button></div></div></div>
<div class="cmd reveal"><div class="cmd-top"><div class="cmd-ic">⏹️</div><h4>Desligar o bot</h4></div><p>No Termux, segure e pressione.</p><div class="code-block"><code>CTRL + C</code><div class="code-actions"><button class="icon-btn" data-copy="">✦</button></div></div></div>
<div class="cmd reveal"><div class="cmd-top"><div class="cmd-ic">👁️</div><h4>Ver processos Node</h4></div><p>Verifica se há bots duplicados rodando.</p><div class="code-block"><code>pgrep -a node</code><div class="code-actions"><button class="icon-btn" data-copy="pgrep -a node">⎙</button></div></div></div>
<div class="cmd reveal"><div class="cmd-top"><div class="cmd-ic">🔄</div><h4>Atualizar projeto</h4></div><p>Puxa a última versão do GitHub.</p><div class="code-block"><code>git pull</code><div class="code-actions"><button class="icon-btn" data-copy="git pull">⎙</button></div></div></div>
<div class="cmd reveal"><div class="cmd-top"><div class="cmd-ic">🧹</div><h4>Corrigir dependências</h4></div><p>Use quando der erro de módulos.</p><div class="code-block"><code>rm -rf node_modules package-lock.json && npm install</code><div class="code-actions"><button class="icon-btn" data-copy="rm -rf node_modules package-lock.json && npm install">⎙</button></div></div></div>
<div class="cmd reveal"><div class="cmd-top"><div class="cmd-ic">🔍</div><h4>Verificar sintaxe</h4></div><p>Confere erros de JS antes de iniciar.</p><div class="code-block"><code>node --check index.js</code><div class="code-actions"><button class="icon-btn" data-copy="node --check index.js">⎙</button></div></div></div>
<div class="cmd reveal"><div class="cmd-top"><div class="cmd-ic">🌿</div><h4>Estado do Git</h4></div><p>Veja arquivos modificados ou conflitos.</p><div class="code-block"><code>git status</code><div class="code-actions"><button class="icon-btn" data-copy="git status">⎙</button></div></div></div>
</div>
</section>

<section class="section" id="whatsapp">
<div class="section-head reveal"><div><h2>Conexão <i>WhatsApp</i></h2><p>Pareamento por código. Rápido, seguro e sem QR code.</p></div><span class="badge magenta">PAIRING CODE</span></div>
<div class="wa-wrap">
<div class="wa-steps">
<div class="wa-step reveal"><b>1</b><p><strong>Aguarde o terminal.</strong> Após <span class="mono">npm start</span>, o bot exibirá as instruções de pareamento e um código de 8 dígitos.</p></div>
<div class="wa-step reveal"><b>2</b><p><strong>Copie o código.</strong> É temporário, expira em poucos minutos. Não compartilhe.</p></div>
<div class="wa-step reveal"><b>3</b><p><strong>Abra o WhatsApp</strong> no celular que será o bot.</p></div>
<div class="wa-step reveal"><b>4</b><p><strong>Configurações → Dispositivos conectados → Conectar dispositivo → Conectar com número de telefone.</strong></p></div>
<div class="wa-step reveal"><b>5</b><p><strong>Digite o código</strong> exibido no Termux. Conexão imediata.</p></div>
<div class="alert reveal"><i>!</i><p><strong>Segurança:</strong> Nunca envie seu código de pareamento para terceiros. Quem tiver o código pode conectar seu WhatsApp.</p></div>
</div>
<div class="wa-phone reveal">
<span class="phone-notch"></span>
<div class="phone-screen">
<h5>WhatsApp • Dispositivos conectados</h5>
<p class="mono" style="font-size:12px;color:var(--text-2);line-height:1.5">Insira o código mostrado no seu terminal para parear a KYARA.</p>
<div class="phone-code">8 4 - 2 9 1 7 X K</div>
<div style="display:grid;gap:8px;margin-top:14px">
<div style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--stroke);display:flex;justify-content:space-between;align-items:center"><span class="mono" style="font-size:12px">Status</span><span style="font-size:11px;padding:4px 8px;border-radius:999px;background:var(--lime);color:black;font-weight:700">PAIRING</span></div>
<div style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--stroke)"><span class="mono" style="font-size:11px;color:var(--text-3)">DEVICE</span><div style="font-size:13px;font-weight:600;margin-top:2px">KYARA HIGH-TECH v1 • Termux</div></div>
</div>
</div>
</div>
</div>
</section>

<section class="section" id="seguranca">
<div class="section-head reveal"><div><h2>Segurança <i>primeiro</i></h2><p>Regras não negociáveis para manter seu bot e seu número seguros.</p></div><span class="badge" style="background:rgba(255,59,156,.14);border-color:rgba(255,59,156,.24);color:#ffb3d6">CRITICAL</span></div>
<div class="sec-grid">
<div class="sec reveal"><i>🔑</i><div><h4>Nunca compartilhe códigos</h4><p>Códigos de pareamento dão acesso total ao WhatsApp. São pessoais e temporários.</p></div></div>
<div class="sec reveal"><i>🚫</i><div><h4>Nunca publique tokens</h4><p>Tokens, sessões e credenciais vazadas = bot clonado e banimento.</p></div></div>
<div class="sec reveal"><i>🗝️</i><div><h4>Nunca exponha API keys</h4><p>Use .env e .gitignore. Chaves no GitHub geram custos e abuso.</p></div></div>
<div class="sec reveal"><i>📁</i><div><h4>Não compartilhe auth</h4><p>A pasta de autenticação é sua identidade. Backup local criptografado apenas.</p></div></div>
<div class="sec reveal"><i>💾</i><div><h4>Não apague dados sem backup</h4><p>Database, level e economia são locais. Apagar = perder tudo.</p></div></div>
<div class="sec reveal"><i>⏸️</i><div><h4>Edite com bot desligado</h4><p>Altere configs e plugins com CTRL+C antes, evitando corrupção de arquivos.</p></div></div>
</div>
</section>

<section class="section" id="github">
<div class="github reveal">
<div>
<h3>Repositório oficial<br>KYARA HIGH-TECH</h3>
<p>Projeto open, código limpo, atualizações frequentes. Clone, estude, contribua e mantenha sempre atualizado com git pull.</p>
<div class="repo"><code>https://github.com/bakizinho/Kyara-High-Tech</code><button class="icon-btn" data-copy="https://github.com/bakizinho/Kyara-High-Tech" style="margin-left:auto">⎙</button></div>
<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
<a class="btn btn-primary" href="https://github.com/bakizinho/Kyara-High-Tech" target="_blank" rel="noopener">★ Visitar GitHub — Oficial</a>
<a class="btn btn-ghost" href="#instalacao">Ver instalação ↑</a>
</div>
</div>
<div class="github-visual"><div class="grid"></div><b>KYARA<br>HIGH-TECH</b><div style="position:absolute;bottom:12px;left:12px;right:12px;display:flex;gap:8px"><span class="badge purple">MIT</span><span class="badge cyan">Node 20+</span><span class="badge" style="background:white;color:black">v1.0.0</span></div></div>
</div>
</section>

<footer>
<div>© 2026 KYARA HIGH-TECH v1 — Built with Native Flow • Crafted for Termux</div>
<div class="links"><a href="#inicio">Início</a><a href="#sistemas">Sistemas</a><a href="https://github.com/bakizinho/Kyara-High-Tech" target="_blank">GitHub</a><a href="https://f-droid.org/packages/com.termux/" target="_blank">Termux F-Droid</a></div>
</footer>

<div id="toast"><i>✓</i><span>Copiado!</span></div>

<script>
// progress + active nav + reveal
const progress=document.getElementById('progress');
const navLinks=[...document.querySelectorAll('.nav-links a')];
const sections=[...document.querySelectorAll('section, header')];
const tocLinks=[...document.querySelectorAll('.toc a')];

function onScroll(){
const sc=window.scrollY;
const h=document.documentElement.scrollHeight - window.innerHeight;
progress.style.width=(sc/h*100)+'%';
let cur='';
sections.forEach(s=>{ if(window.scrollY >= s.offsetTop-120) cur=s.id });
navLinks.forEach(a=>{ a.classList.toggle('active', a.getAttribute('href')==='#'+cur) });
tocLinks.forEach(a=>{ a.classList.toggle('active', a.getAttribute('href')==='#'+cur) });
}
window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

// burger
const burger=document.getElementById('burger'), nav=document.getElementById('navLinks');
burger.addEventListener('click',()=>nav.classList.toggle('open'));
document.addEventListener('click',e=>{ if(!e.target.closest('.nav')) nav.classList.remove('open') });

// tilt
const tilt=document.getElementById('tilt');
if(tilt && window.matchMedia('(hover:hover)').matches){
tilt.addEventListener('mousemove', e=>{
const r=tilt.getBoundingClientRect();
const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
tilt.style.transform=`perspective(900px) rotateY(${x*8}deg) rotateX(${-y*8}deg) translateZ(0)`;
tilt.style.setProperty('--mx', (e.clientX-r.left)+'px');
});
tilt.addEventListener('mouseleave',()=>{
tilt.style.transform='perspective(900px) rotateY(0) rotateX(0)';
});
}
document.querySelectorAll('.sys-card').forEach(c=>{
c.addEventListener('mousemove', e=>{
const r=c.getBoundingClientRect();
c.style.setProperty('--mx', (e.clientX-r.left)+'px');
});
});

// copy
const toast=document.getElementById('toast');
let toastT;
function showToast(msg='Copiado!'){
toast.querySelector('span').textContent=msg;
toast.classList.add('show');
clearTimeout(toastT);
toastT=setTimeout(()=>toast.classList.remove('show'), 2200);
}
async function copyText(t, btn){
try{
await navigator.clipboard.writeText(t);
if(btn){ btn.classList.add('copied'); btn.textContent='✓'; setTimeout(()=>{btn.classList.remove('copied'); btn.textContent='⎙';},1400); }
showToast();
}catch{
const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); showToast();
}
}
document.querySelectorAll('[data-copy]').forEach(b=>{
b.addEventListener('click',()=>copyText(b.getAttribute('data-copy')||'', b));
});

// reveal on scroll
const io=new IntersectionObserver((ents)=>{
ents.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

// external links new tab safety (already in html)
document.querySelectorAll('a[href^="http"]').forEach(a=>{ a.target='_blank'; a.rel='noopener'; });

// prevent broken images from breaking layout
document.querySelectorAll('img').forEach(img=>{
img.addEventListener('error',()=>{ img.style.display='none'; if(img.id!=='fallbackLogo'){ const fb=document.getElementById('fallbackLogo'); if(fb) fb.style.display='grid'; } });
});
</script>
</body>
</html>