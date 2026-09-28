function genPixPayload({ pixKey, merchantName, merchantCity, amount, txid }) {
  function fmt(id, val) { return id + String(val.length).padStart(2,'0') + val; }
  const payload =
    fmt('00','01') +
    fmt('26', fmt('00','BR.GOV.BCB.PIX') + fmt('01', pixKey)) +
    fmt('52','0000') + fmt('53','986') +
    fmt('54', amount.toFixed(2)) +
    fmt('58','BR') + fmt('59', merchantName.slice(0,25)) +
    fmt('60', merchantCity.slice(0,15)) +
    fmt('62', fmt('05', txid.slice(0,25)));
  function crc16(str) {
    let crc = 0xFFFF;
    for (let i=0;i<str.length;i++){
      crc ^= str.charCodeAt(i) << 8;
      for(let j=0;j<8;j++) crc = crc & 0x8000? (crc<<1)^0x1021 : crc<<1;
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4,'0');
  }
  const full = payload + '6304';
  return full + crc16(full);
}
module.exports = { genPixPayload };
