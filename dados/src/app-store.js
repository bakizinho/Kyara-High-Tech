import os from 'node:os';
import { gerarPixQR } from './pix-qr-free.js';

class KyaraAppStore5 {
  constructor(){
    this.pendentes = new Map();
    this.PIX = { key:'84987595340', name:'Rute Maria', city:'Poco Branco' };
    this.apps = {
      ghost: { name:'Kyara Protection V15', icon:'👻', rating:'5.0', downloads:'12.3k', desc:'Payment + invisível + flood', premium:false },
      youtube: { name:'Kyara Music', icon:'🎵', rating:'4.9', downloads:'21.4k', desc:'Baixa MP3 do YouTube', premium:false },
      loja: { name:'Kyara VIP Store', icon:'🛒', rating:'5.0', downloads:'8.7k', desc:'Seja VIP, libere tudo', premium:true },
      adm: { name:'Admin Toolkit', icon:'👑', rating:'4.8', downloads:'15.1k', desc:'ban, hidetag, onlyadm', premium:false },
      fun: { name:'MuseFun', icon:'😂', rating:'4.8', downloads:'9.1k', desc:'Figurinhas, memes', premium:false },
      ia: { name:'Kyara IA Pro', icon:'🧠', rating:'5.0', downloads:'18k', desc:'IA que cria e responde', premium:false }
    };
  }

  getUserStats(sender, db){
    const u = db?.usuarios?.[sender]||{};
    return { level: u.level||42, xp: u.xp||12840, coins: u.coins||850, vip:!!u.vip, nome: sender.split('@')[0] };
  }

  getMainStore(sender, db, prefix='/'){
    const stats = this.getUserStats(sender, db);
    const uptime = Math.floor(process.uptime()/60);
    return {
      text: `*KYARA APP STORE 5.0* 🌸 God Level\n\n👤 @${stats.nome} | ${stats.vip?'💎 VIP':'🆓 FREE'} | ⭐ Lvl ${stats.level}\n⏱️ ${uptime}m | 🧠 ${(process.memoryUsage().rss/1024/1024).toFixed(0)}MB | ${os.platform()}\n\n*Trending hoje:*`,
      footer: 'Toque em um app para instalar',
      title: '🌸 KYARA APP STORE 5.0',
      buttonText: 'Ver Apps',
      sections: [
        { title: '🔥 MAIS BAIXADOS', rows: [
          { title: '👻 Kyara Protection V15', description: '⭐ 5.0 • Apaga fantasma + link invisível', rowId: '/app install ghost' },
          { title: '🎵 Kyara Music', description: '⭐ 4.9 • YouTube MP3 ilimitado', rowId: '/app install youtube' },
          { title: '🛒 Kyara VIP Store', description: '⭐ 5.0 • Seja VIP R$10', rowId: '/app install loja' }
        ]},
        { title: '🛡️ PROTEÇÃO', rows: [
          { title: '👻 Central Proteção V15', description: 'Payment, invisível, flood, proteção', rowId: '/app protecao' },
          { title: '👑 Painel Dono OS 4.0', description: 'Uptime, RAM, CPU', rowId: '/app dono' },
          { title: '👥 Administração', description: 'ban, kick, hidetag', rowId: '/app adm' }
        ]},
        { title: '🎮 DIVERSÃO', rows: [
          { title: '🧠 Kyara IA Pro', description: 'Pergunte qualquer coisa', rowId: '/app ia' },
          { title: '😂 MuseFun', description: 'Figurinhas e memes', rowId: '/app fun' },
          { title: '📥 Downloads', description: 'YouTube, TikTok', rowId: '/app youtube' }
        ]},
        { title: '💎 CONTA', rows: [
          { title: `👤 Perfil Lvl ${stats.level}`, description: `XP: ${stats.xp} | Coins: ${stats.coins}`, rowId: '/app perfil' },
          { title: '🛒 Comprar VIP', description: 'R$10 via PIX', rowId: '/app loja' }
        ]}
      ]
    };
  }

  async handle(sock, jid, args, sender, db, config, prefix='/'){
    const cmd = (args[0]||'').toLowerCase();
    const rest = args.slice(1).join(' ');
    if(!cmd){
      const list = this.getMainStore(sender, db, prefix);
      return await sock.sendMessage(jid, {
        text: list.text, footer: list.footer, title: list.title, buttonText: list.buttonText, sections: list.sections
      });
    }
    if(cmd==='install'){
      const appId = (rest||args[1]||'').toLowerCase();
      const app = this.apps[appId];
      if(!app) return sock.sendMessage(jid, { text: 'App não encontrado. /app' });
      return sock.sendMessage(jid, {
        text: `${app.icon} *${app.name}*\n⭐ ${app.rating} • 📥 ${app.downloads}\n\n${app.desc}`,
        footer: app.premium?'💎 Premium R$10':'🆓 Grátis',
        buttons: [
          { buttonId: appId==='ghost'?`${prefix}anti-payment on`: appId==='loja'?'/app loja': `/app ${appId}`, buttonText: { displayText: app.premium?'💳 Comprar':'✅ Instalar' }, type:1 },
          { buttonId: '/app', buttonText: { displayText: '⬅️ Voltar Store' }, type:1 }
        ],
        headerType:1
      });
    }
    if(cmd==='dono'){
      const stats = this.getUserStats(sender, db);
      return sock.sendMessage(jid, {
        text: `╭━━〔 👑 KYARA OS 5.0 〕━━╮\n┃ ${stats.nome} | Lvl ${stats.level} | ${stats.vip?'💎 VIP':'FREE'}\n┃ ⏱️ ${Math.floor(process.uptime()/3600)}h | 🧠 ${(process.memoryUsage().rss/1024/1024).toFixed(1)}MB\n┃ Grupos: ${Object.keys(db?.grupos||{}).length||0}\n╰━━━━━━━━━━━━━━╯`,
        footer: 'Root Access',
        buttons: [
          { buttonId: `${prefix}anti-payment on`, buttonText: { displayText: '🛡️ Ativar Proteção' }, type:1 },
          { buttonId: '/app', buttonText: { displayText: '⬅️ Store' }, type:1 }
        ],
        headerType:1
      });
    }
    if(cmd==='protecao'){
      return sock.sendMessage(jid, {
        text: `🛡️ *PROTEÇÃO KYARA V15*\n💳 Payment + 👻 Invisível + ⚡ Flood`,
        footer: 'Proteção máxima',
        buttons: [
          { buttonId: `${prefix}anti-payment on`, buttonText: { displayText: '✅ Ativar' }, type:1 },
          { buttonId: `${prefix}anti-payment status`, buttonText: { displayText: '📊 Status' }, type:1 },
          { buttonId: '/app', buttonText: { displayText: '⬅️ Store' }, type:1 }
        ],
        headerType:1
      });
    }
    if(cmd==='loja'){
      const { payload, buffer } = await gerarPixQR({ pixKey: this.PIX.key, name: this.PIX.name, city: this.PIX.city, amount: 10.00, txid: 'KYARA'+Date.now().toString().slice(-8) });
      this.pendentes.set(sender, { amount:10, time:Date.now() });
      await sock.sendMessage(jid, { image: buffer, caption: `🛒 *VIP R$10*\n${this.PIX.name}\n\`\`\`${payload}\`\`\`` });
      return sock.sendMessage(jid, { text: 'Confirme:', buttons: [{ buttonId: '/paguei', buttonText: { displayText: '✅ Já Paguei' }, type:1 }, { buttonId: '/app', buttonText: { displayText: '⬅️ Voltar' }, type:1 }], headerType:1 });
    }
    if(cmd==='perfil'){
      const s = this.getUserStats(sender, db);
      return sock.sendMessage(jid, { text: `👤 *PERFIL*\nLvl ${s.level} | XP ${s.xp} | VIP ${s.vip?'✅':'❌'}` });
    }
    return sock.sendMessage(jid, this.getMainStore(sender, db, prefix));
  }
  async handleComprovante(sock,jid,sender,db){
    if(!this.pendentes.has(sender)) return sock.sendMessage(jid, { text: '❌ Sem pagamento. /app loja' });
    if(db?.usuarios){ db.usuarios[sender]=db.usuarios[sender]||{}; db.usuarios[sender].vip=true; }
    this.pendentes.delete(sender);
    return sock.sendMessage(jid, { text: `✅ VIP ATIVADO!` });
  }
}
export default new KyaraAppStore5();
