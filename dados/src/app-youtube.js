const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
class AppYoutube {
  async search(query) { const r = await yts(query); return r.videos.slice(0, 5); }
  async getMenu(query) {
    if (!query) return { text: `🎵 *APP YOUTUBE*\n\nDigite:\n/app youtube <nome>\nEx: /app youtube djavan oceano`, footer: 'YouTube Free' };
    const videos = await this.search(query);
    if (!videos.length) return { text: `❌ Nenhum resultado para *${query}*` };
    const lista = videos.map((v,i)=> `${i+1}. *${v.title.slice(0,45)}*\n ⏱ ${v.timestamp} | /ytmp3 ${v.videoId}`).join('\n\n');
    return {
      text: `🎵 *RESULTADOS: ${query}*\n\n${lista}`,
      footer: 'Escolha uma música',
      buttons: videos.slice(0,3).map(v=> ({ buttonId: `/ytmp3 ${v.videoId}`, buttonText: { displayText: `🎧 ${v.title.slice(0,20)}` }, type: 1 })),
      headerType: 1
    };
  }
  async downloadMP3(sock, jid, videoId) {
    try {
      await sock.sendMessage(jid, { text: `⏳ Baixando ${videoId}...` });
      const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
      const title = info.videoDetails.title.slice(0,40);
      const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1<<25 });
      const chunks = []; for await (const c of stream){ chunks.push(c); if (Buffer.concat(chunks).length > 15*1024*1024) break; }
      const buffer = Buffer.concat(chunks);
      await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', fileName: `${title}.mp3` });
    } catch(e){ await sock.sendMessage(jid, { text: `❌ Erro: ${e.message.slice(0,100)}` }); }
  }
}
module.exports = new AppYoutube();
