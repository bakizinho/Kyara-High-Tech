const META_JID = '13135550002@s.whatsapp.net'
const FAKE_META = {
  key: { fromMe: false, participant: META_JID, remoteJid: 'status@broadcast' },
  message: {
    contactMessage: {
      displayName: 'Meta AI',
      vcard:
        'BEGIN:VCARD\nVERSION:3.0\nN:;Meta AI;;;\nFN:Meta AI\n' +
        'item1.TEL;waid=13135550002:+1 313 555 0002\nitem1.X-ABLabel:Celular\nEND:VCARD'
    }
  }
}
const IGNORAR = ['react', 'delete', 'forward', 'disappearingMessagesInMessage', 'pin', 'edit']
function aplicarMetaMark(sock) {
  if (!sock || sock.__metaMarkAplicado) return
  const original = sock.sendMessage.bind(sock)
  sock.sendMessage = (jid, content, options = {}) => {
    const ligado = global.ENABLE_META_MARK !== false
    const ignorar = !content || IGNORAR.some(k => k in content) || jid === 'status@broadcast'
    if (!ligado || ignorar) return original(jid, content, options)
    return original(jid, content, { ...options, quoted: FAKE_META })
  }
  sock.__metaMarkAplicado = true
}
module.exports = { aplicarMetaMark, FAKE_META }
