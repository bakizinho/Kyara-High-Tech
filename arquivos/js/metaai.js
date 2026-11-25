const IGNORAR = [
  'react',
  'delete',
  'forward',
  'disappearingMessagesInMessage',
  'pin',
  'edit'
]

function obterKyaraJid(sock) {
  const id = sock?.user?.id

  if (!id || typeof id !== 'string') {
    return null
  }

  const numero = id
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')

  if (!numero) {
    return null
  }

  return `${numero}@s.whatsapp.net`
}

function obterKyaraNumero(sock) {
  const jid = obterKyaraJid(sock)

  if (!jid) {
    return null
  }

  return jid
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

function criarFakeKyara(sock) {
  const KYARA_JID = obterKyaraJid(sock)
  const numero = obterKyaraNumero(sock)

  if (!KYARA_JID || !numero) {
    return null
  }

  return {
    key: {
      fromMe: false,
      participant: KYARA_JID,
      remoteJid: 'status@broadcast'
    },

    message: {
      contactMessage: {
        displayName: 'BOT-KYARA',
        vcard:
          'BEGIN:VCARD\nVERSION:3.0\nN:;BOT-KYARA;;;\nFN:BOT-KYARA\n' +
          `item1.TEL;waid=${numero}:+${numero}\nitem1.X-ABLabel:Celular\nEND:VCARD`
      }
    }
  }
}

function aplicarKyaraMark(sock) {
  if (!sock || sock.__kyaraMarkAplicado) return

  const original = sock.sendMessage.bind(sock)

  sock.sendMessage = (jid, content, options = {}) => {
    const ligado =
      global.ENABLE_KYARA_MARK !== false

    const ignorar =
      !content ||
      IGNORAR.some(k => k in content) ||
      jid === 'status@broadcast'

    if (!ligado || ignorar) {
      return original(jid, content, options)
    }

    const FAKE_KYARA = criarFakeKyara(sock)

    if (!FAKE_KYARA) {
      return original(jid, content, options)
    }

    return original(jid, content, {
      ...options,
      quoted: FAKE_KYARA
    })
  }

  sock.__kyaraMarkAplicado = true
}

export {
  aplicarKyaraMark,
  criarFakeKyara
}
