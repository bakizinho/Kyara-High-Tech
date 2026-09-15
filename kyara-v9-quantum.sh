#!/data/data/com.termux/files/usr/bin/bash
set -e
ROOT="$HOME/storage/BKkyara-"; SRC="$ROOT/dados/src"; CONNECT="$SRC/connect.js"; INDEX="$SRC/index.js"; FLOW="$SRC/core/nativeFlow"
STAMP=$(date +%Y%m%d-%H%M%S); mkdir -p "$FLOW"
echo "👑 KYARA V9 QUANTUM - BUILD $STAMP"

# BACKUP ATÔMICO
cp "$CONNECT" "$CONNECT.v9-$STAMP" && cp "$INDEX" "$INDEX.v9-$STAMP"

# ====== 1. CORE V9 - NATIVO RC13 COM LID + VIEWONCE + DOC ======
cat > "$FLOW/native-flow.js" <<'JS'
import os from 'os'; import { proto, generateWAMessageFromContent } from 'baileys'
export const j = o => JSON.stringify(o)
export const btn = (name, params) => ({ name, buttonParamsJson: j(params) })
export const quickReply = (t,i) => btn('quick_reply', { display_text: t, id: i })
export const copyBtn = (t,c) => btn('cta_copy', { display_text: t, copy_code: c })
export const urlBtn = (t,u) => btn('cta_url', { display_text: t, url: u })
export const singleSelect = (t,s) => btn('single_select', { title: t, sections: s })
export const row = (title, desc, id) => ({ title, description: desc||'', id })

export function getMetrics() {
  const m = process.memoryUsage(); const cpus = os.cpus()
  return { up: Math.floor(process.uptime()), ram: (m.rss/1024/1024).toFixed(1), heap: (m.heapUsed/1024/1024).toFixed(1), cores: cpus.length, model: cpus[0]?.model.split(' ')[0]||'CPU', load: os.loadavg()[0].toFixed(2) }
}
export function buildInteractive({ text, footer, title, buttons }) {
  return proto.Message.InteractiveMessage.create({
    body: proto.Message.InteractiveMessage.Body.create({ text }),
    footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
    header: proto.Message.InteractiveMessage.Header.create({ title, hasMediaAttachment: false }),
    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons })
  })
}
export async function sendFlow(Kyara, jid, opts) {
  const inter = buildInteractive(opts)
  const waMsg = generateWAMessageFromContent(jid, { viewOnceMessage: { message: { interactiveMessage: inter } } }, { userJid: jid })
  await Kyara.relayMessage(jid, waMsg.message, { messageId: waMsg.key.id })
}
JS

# ====== 2. OWNER DATA V9 - 128 CMDS + AUDIT ======
cat > "$FLOW/owner-flow.js" <<'JS'
import { sendFlow, singleSelect, quickReply, copyBtn, row, getMetrics } from './native-flow.js'
export const CATS = [
  {id:'config', title:'🤖 Configurações', desc:'Prefixo, nome, mídia • 12'},
  {id:'personality', title:'🧠 Personalidade', desc:'IA da Kyara • 3'},
  {id:'design', title:'🎨 Design', desc:'Bordas, header • 9'},
  {id:'automation', title:'⚙️ Automação', desc:'Auto, react, nopref • 10'},
  {id:'commands', title:'🛠️ Comandos', desc:'Addcmd, alias, black • 14'},
  {id:'limits', title:'🚫 Limites', desc:'Limitar cmds • 3'},
  {id:'users', title:'👥 Usuários', desc:'Sub-dono, premium, ban • 13'},
  {id:'rental', title:'💰 Aluguel', desc:'Códigos, MRR • 12'},
  {id:'subbots', title:'🤖 Sub-Bots', desc:'Rede sub-bots • 5'},
  {id:'vip', title:'💎 VIP', desc:'Comandos VIP • 7'},
  {id:'control', title:'⚡ Controle', desc:'Reiniciar, grupos • 12'},
  {id:'monitoring', title:'📊 Monitoramento', desc:'AntiPV, logs, DB • 17'},
  {id:'broadcast', title:'📡 Transmissões', desc:'TM, divulgação • 11'}
]
export const CMDS = {
  config: ['prefixo','numerodono','nomedono','nomebot','configcmdnotfound','setcmdmsg','fotobot','fotomenu','videomenu','audiomenu','lermais','personalizargrupo'],
  personality: ['setpersonalidade','criarpers','novapers'],
  design: ['designmenu','setborda','setbordafim','setbordameio','setitem','setseparador','settitulo','setheader','resetdesign'],
  automation: ['addauto','addautomidia','listauto','delauto','addreact','listreact','delreact','addnopref','listnopref','delnopref'],
  commands: ['addcmd','addcmdmidia','listcmd','delcmd','testcmd','addcmd-subdono','removecmd-subdono','listcmd-subdono','addalias','listalias','delalias','addblackglobal','listblackglobal','rmblackglobal'],
  limits: ['cmdlimitar','cmddeslimitar','cmdlimites'],
  users: ['addsubdono','delsubdono','listasubdonos','addpremium','delpremium','listprem','resetgold','addindicacao','topindica','delindicacao','bangp','unbangp','listbangp'],
  rental: ['modoaluguel','addaluguel','gerarcod','listaraluguel','infoaluguel','estenderaluguel','removeraluguel','listaluguel','limparaluguel','dayfree','setdiv','divulgar'],
  subbots: ['addsubbot','removesubbot','listarsubbots','conectarsubbot','gerarcodigo'],
  vip: ['addcmdvip','removecmdvip','listcmdvip','togglecmdvip','statsvip','menuvip','infovip'],
  control: ['atualizar','reiniciar','entrar','sairgp','seradm','sermembro','blockcmdg','unblockcmdg','blockuserg','unblockuserg','listblocks','antibanmarcar'],
  monitoring: ['listagp','antipv','antipv2','antipv3','antipv4','antipvmsg','antispamcmd','viewmsg','cases','getcase','modoliteglobal','iaclear','limpardb','limparrankg','reviverqr','nuke','msgprefix'],
  broadcast: ['tm','tm2','statustm','inscrevertm','divdono add','divdono rem','divdono list','divdono msg','divdono send','divdono time','divdono status']
}
export async function sendOwnerMain(Kyara, jid, { botName='KYARA', userName='Dono', prefix='/' }={}) {
  const m = getMetrics(); const bar = '█'.repeat(Math.min(10, Math.floor(m.ram/80))).padEnd(10,'░')
  const text = `╭━━━〔 👑 ${botName} OWNER OS v9 〕\n┃ 🔐 ${userName} • OWNER\n┃ 🤖 ${botName} • 🟢 ONLINE • ${m.model}\n┃ ⏱️ ${m.up}s • 🧠 ${m.ram}MB [${bar}] ${m.load}\n┃ 💎 Heap ${m.heap}MB • ${m.cores} cores\n╰━━━━━━━━━━━━━━╯\n\n🛡️ Painel restrito - 128 comandos`
  const sec = { title: '📂 PAINEL KYARA V9', rows: CATS.map(c=>row(c.title, c.desc, `owner:open:${c.id}`)) }
  return sendFlow(Kyara, jid, { text, footer: `👑 KYARA V9 • ${m.ram}MB • ${m.up}s • LID OK`, title: `👑 ${botName} OWNER OS v9`, buttons: [singleSelect('📂 ABRIR PAINEL OS v9', [sec]), quickReply('🔄 Reiniciar', 'owner:cmd:reiniciar'), quickReply('📈 Logs', 'owner:cmd:viewmsg'), copyBtn(`📋 Prefixo ${prefix}`, prefix)] })
}
export async function sendOwnerCategory(Kyara, jid, catId) {
  const cmds = CMDS[catId]||[]; const cat = CATS.find(c=>c.id===catId)
  const text = `👑 *${cat.title}*\n${cat.desc}\n\n📦 ${cmds.length} comandos`
  const rows = cmds.map(c=>row(`/${c}`, `Executar /${c}`, `owner:cmd:${c}`))
  return sendFlow(Kyara, jid, { text, footer: `👑 KYARA • ${cat.title}`, title: cat.title, buttons: [singleSelect(`📂 ${cat.title}`, [{ title: cat.title, rows }]), quickReply('⬅️ Voltar', 'owner:back:main')] })
}
JS

# ====== 3. ROUTER V9 - COM LID, ANTI-FLOOD, AUDIT ======
cat > "$FLOW/owner-flow-router.js" <<'JS'
import fs from 'fs'; import path from 'path'
const AUDIT = path.join(process.cwd(), 'dados/src/core/nativeFlow/audit.log')
const FLOOD = new Map() // id -> timestamp

export function extractId(msg) {
  if(!msg) return null
  const layers = [
    msg, msg.viewOnceMessage?.message, msg.documentWithCaptionMessage, msg.viewOnceMessageV2?.message,
    msg.viewOnceMessage?.message?.interactiveResponseMessage, msg.viewOnceMessage?.message?.listResponseMessage
  ].filter(Boolean)
  for(const m of layers) {
    try { const p = JSON.parse(m.nativeFlowResponseMessage?.paramsJson || ''); if(p?.id) return p.id.trim(); if(p?.selectedId) return p.selectedId.trim() } catch{}
    try { const p = JSON.parse(m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || ''); if(p?.id) return p.id.trim() } catch{}
    if(m.listResponseMessage?.singleSelectReply?.selectedRowId) return m.listResponseMessage.singleSelectReply.selectedRowId.trim()
    if(m.buttonsResponseMessage?.selectedButtonId) return m.buttonsResponseMessage.selectedButtonId.trim()
    if(m.templateButtonReplyMessage?.selectedId) return m.templateButtonReplyMessage.selectedId.trim()
  }
  const txt = msg.conversation || msg.extendedTextMessage?.text || msg.documentWithCaptionMessage?.caption || ''
  if(txt.startsWith('owner:')) return txt.trim().split(' ')[0]
  return null
}
export const isOwnerFlowId = id => typeof id==='string' && id.startsWith('owner:')

function logAudit(jid, id) {
  try { fs.appendFileSync(AUDIT, `[${new Date().toISOString()}] ${jid} -> ${id}\n`) } catch{}
}
function isFlood(id) {
  const now = Date.now(); const last = FLOOD.get(id) || 0
  if(now - last < 1500) return true
  FLOOD.set(id, now); return false
}

export async function routeOwnerFlow({ Kyara, jid, id, prefix='/', userName='Dono', botName='KYARA', ownerId, executeCommand }) {
  if(!isOwnerFlowId(id)) return false
  if(isFlood(jid+id)) { console.log(`[KYARA FLOW] FLOOD BLOCK ${id}`); return true }
  logAudit(jid, id); console.log(`[KYARA FLOW V9] ${jid} -> ${id}`)

  if(id==='owner:back:main') {
    const { sendOwnerMain } = await import('./owner-flow.js')
    await sendOwnerMain(Kyara, jid, { botName, userName, prefix, ownerId }); return true
  }
  if(id.startsWith('owner:open:')) {
    const { sendOwnerCategory } = await import('./owner-flow.js')
    const cat = id.split(':')[2]; await sendOwnerCategory(Kyara, jid, cat); return true
  }
  if(id.startsWith('owner:cmd:')) {
    const cmd = id.slice(10)
    if(typeof executeCommand==='function') await executeCommand(cmd, { jid, prefix })
    return true
  }
  return false
}
JS

# ====== 4. PATCH PYTHON V9 - INTEGRAÇÃO ATÔMICA NO CONNECT + INDEX ======
python3 <<'PY'
from pathlib import Path
import re
connect = Path("dados/src/connect.js"); index = Path("dados/src/index.js")
c = connect.read_text(encoding='utf-8'); i = index.read_text(encoding='utf-8')

# IMPORT
if "owner-flow-router.js" not in c:
    c = c.replace("import CaptchaIndex from './utils/captchaIndex.js';", "import CaptchaIndex from './utils/captchaIndex.js';\nimport { extractId, routeOwnerFlow, isOwnerFlowId } from './core/nativeFlow/owner-flow-router.js';\nimport { sendOwnerMain } from './core/nativeFlow/owner-flow.js';\n")

# HANDLER V9
if "KYARA V9 HANDLER" not in c:
    handler = """
// === KYARA V9 HANDLER - QUANTUM ===
const kyaraFlowDebounce = new Map()
const kyaraNativeFlowHandler = async (info) => {
  try {
    if(!info?.message || info.key.fromMe) return false
    const flowId = extractId(info.message)
    if(!flowId ||!isOwnerFlowId(flowId)) return false
    const jid = info.key.remoteJid
    const senderRaw = info.key.participant || info.key.remoteJid || ''
    const sender = senderRaw.includes('@lid')? senderRaw : senderRaw.replace(/@s.whatsapp.net/g,'')
    const ownerRaw = String(numerodono||'')
    const owner = ownerRaw.includes('@')? ownerRaw : ownerRaw.replace(/\\D/g,'')
    const isOwnerCheck = sender.includes(owner) || owner.includes(sender.replace(/\\D/g,''))
    if(!isOwnerCheck) {
      await KyaraSock.sendMessage(jid, { text: '⛔ *ACESSO NEGADO*\\nPainel exclusivo do proprietário.' })
      return true
    }
    if(kyaraFlowDebounce.get(jid+flowId) && Date.now()-kyaraFlowDebounce.get(jid+flowId)<1200) return true
    kyaraFlowDebounce.set(jid+flowId, Date.now())
    await routeOwnerFlow({
      Kyara: KyaraSock, jid, id: flowId,
      prefix: config?.prefixo||prefixo||'/', botName: config?.nomebot||nomebot||'KYARA',
      userName: info.pushName||nomedono||'Dono', ownerId: numerodono,
      executeCommand: async (cmd, ctx={}) => {
        const text = `${ctx.prefix||prefixo||'/'}${cmd}`
        const internal = { key: { remoteJid: ctx.jid||jid, participant: info.key.participant||ctx.jid||jid, fromMe: false, id: `FLOW-${Date.now()}` }, pushName: info.pushName||'Dono', message: { conversation: text }, messageTimestamp: Math.floor(Date.now()/1000) }
        await indexModule(KyaraSock, internal, null, messagesCache, rentalExpirationManager)
      }
    })
    return true
  } catch(e){ console.error('[KYARA V9]', e.stack||e); return false }
}
"""
    c = c.replace("const processMessage = async (info) => {", handler+"\nconst processMessage = async (info) => {")

if "kyaraNativeFlowHandler(info)" not in c:
    c = c.replace("const isJoinRequest = info?.messageStubType === 172;", "const isJoinRequest = info?.messageStubType === 172;\n if(await kyaraNativeFlowHandler(info)) return;\n")

# INDEX.JS PATCH - COM FALLBACK TEXTUAL
old = """ case 'menudono':
      case 'ownermenu':
        try {
          if (!isOwner) {
            await reply("⚠️ Este menu é exclusivo para o dono do bot.");
            return;
          }
          await sendMenuWithMedia('dono', menuDono);
        } catch (error) {
          console.error('Erro ao enviar menu do dono:', error);
          await reply("❌ Ocorreu um erro ao carregar o menu do dono");
        }
        break;"""

new = """ case 'menudono':
      case 'ownermenu':
        try {
          if (!isOwner) { await reply("⚠️ Este menu é exclusivo para o dono do bot."); return; }
          try {
            const { sendOwnerMain } = await import('./core/nativeFlow/owner-flow.js');
            await sendOwnerMain(nazu, from, { botName: nomebot||'KYARA', userName: info?.pushName||pushname||nomedono||'Dono', prefix: prefix||config?.prefixo||'/', ownerId: numerodono||null });
          } catch(flowErr) {
            console.error('Flow falhou, usando fallback textual:', flowErr.message);
            await sendMenuWithMedia('dono', menuDono);
          }
        } catch (error) {
          console.error('Erro ao enviar menu do dono:', error);
          await reply("❌ Ocorreu um erro ao carregar o menu do dono");
        }
        break;"""

if old in i: i = i.replace(old, new)
elif "sendOwnerMain" not in i:
    # fallback se seu index já foi alterado
    i = i.replace("case 'menudono':", "case 'menudono':\n case 'ownermenu':\n try {\n if (!isOwner) { await reply(\"⚠️ Este menu é exclusivo para o dono do bot.\"); return; }\n const { sendOwnerMain } = await import('./core/nativeFlow/owner-flow.js');\n await sendOwnerMain(nazu, from, { botName: nomebot||'KYARA', userName: info?.pushName||pushname||'Dono', prefix: prefix||config?.prefixo||'/', ownerId: numerodono||null });\n } catch(e){ console.error(e); await sendMenuWithMedia('dono', menuDono); }\n break;\n case 'menudono_old':")

connect.write_text(c, encoding='utf-8'); index.write_text(i, encoding='utf-8')
print("PATCH V9 OK")
PY

echo "🧪 Validando..."
node --check "$SRC/connect.js" && echo "✅ connect.js"
node --check "$SRC/index.js" && echo "✅ index.js"
node --check "$FLOW/native-flow.js" && echo "✅ native-flow.js"
node --check "$FLOW/owner-flow.js" && echo "✅ owner-flow.js"
node --check "$FLOW/owner-flow-router.js" && echo "✅ router v9"

echo ""
echo "╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮"
echo "┃ ✅ KYARA V9 QUANTUM OK ┃"
echo "┃ LID: ON | FLOOD: ON | LOG ┃"
echo "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"
echo "Backup: $CONNECT.v9-$STAMP"
echo "Teste:.menudono -> deve abrir OS v9"
