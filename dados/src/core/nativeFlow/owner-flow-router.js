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
