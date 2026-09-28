const QRCode = require('qrcode');
const { genPixPayload } = require('./pix-free.js');
async function gerarPixQR({ pixKey, name, city, amount, txid }) {
  const payload = genPixPayload({ pixKey, merchantName: name, merchantCity: city, amount, txid });
  const buffer = await QRCode.toBuffer(payload, { type: 'png', width: 400, margin: 2 });
  return { payload, buffer };
}
module.exports = { gerarPixQR };
