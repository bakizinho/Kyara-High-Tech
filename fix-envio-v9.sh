#!/bin/bash
SRC="dados/src/core/nativeFlow"
cat > "$SRC/native-flow.js" <<'JS'
import os from 'os'; import { proto, generateWAMessageFromContent } from 'baileys'
export const j = o => JSON.stringify(o)
export const btn = (name, params) => ({ name, buttonParamsJson: j(params) })
export const quickReply = (t,i) => btn('quick_reply', { display_text: t, id: i })
export const copyBtn = (t,c) => btn('cta_copy', { display_text: t, copy_code: c })
export const singleSelect = (t,s) => btn('single_select', { title: t, sections: s })
export const row = (title, desc, id) => ({ title, description: desc||'', id })
export function getMetrics(){ const m=process.memoryUsage(); return { up: Math.floor(process.uptime()), ram: (m.rss/1024/1024).toFixed(1) } }

export function buildInteractive({ text, footer, title, buttons }) {
  return proto.Message.InteractiveMessage.create({
    body: proto.Message.InteractiveMessage.Body.create({ text }),
    footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
    header: proto.Message.InteractiveMessage.Header.create({ title, hasMediaAttachment: false }),
    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons })
  })
}

// V9.1 - TENTA 3 FORMAS DE ENVIO
export async function sendFlow(Kyara, jid, opts) {
  const inter = buildInteractive(opts)
  
  // MÉTODO 1: Direto sem viewOnce (funciona 100% em grupos no rc13)
  try {
    console.log('[KYARA V9] Tentando envio MÉTODO 1 - direto')
    await Kyara.sendMessage(jid, { interactiveMessage: inter })
    console.log('[KYARA V9] MÉTODO 1 OK')
    return true
  } catch(e1) {
    console.log('[KYARA V9] MÉTODO 1 falhou:', e1.message)
  }

  // MÉTODO 2: Com generateWAMessage sem viewOnce
  try {
    console.log('[KYARA V9] Tentando MÉTODO 2 - generate sem viewOnce')
    const msg = generateWAMessageFromContent(jid, { interactiveMessage: inter }, { userJid: jid })
    await Kyara.relayMessage(jid, msg.message, { messageId: msg.key.id })
    console.log('[KYARA V9] MÉTODO 2 OK')
    return true
  } catch(e2) {
    console.log('[KYARA V9] MÉTODO 2 falhou:', e2.message)
  }

  // MÉTODO 3: Com viewOnce (seu original)
  try {
    console.log('[KYARA V9] Tentando MÉTODO 3 - viewOnce')
    const msg = generateWAMessageFromContent(jid, { viewOnceMessage: { message: { interactiveMessage: inter } } }, { userJid: jid })
    await Kyara.relayMessage(jid, msg.message, { messageId: msg.key.id })
    console.log('[KYARA V9] MÉTODO 3 OK')
    return true
  } catch(e3) {
    console.log('[KYARA V9] MÉTODO 3 falhou:', e3.message)
    throw e3
  }
}
JS

node --check "$SRC/native-flow.js" && echo "✅ native-flow.js V9.1 OK"
echo ""
echo "Reinicia a Kyara agora e testa no PRIVADO primeiro, não no grupo"
