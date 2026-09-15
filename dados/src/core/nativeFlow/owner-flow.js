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
  {id:'broadcast', title:'📡 Transmissões', desc:'TM, divulgação • 11'},
  {id:'figban', title:'🎴 FIGBAN', desc:'Lista e controle das figurinhas'},
  {id:'maintenance', title:'🧪 Comandos em Ajuste', desc:'Cases que o dono vai corrigir'},
  {id:'helpideas', title:'💡 Ajuda & Ideias', desc:'Ajuda e caixa de ideias'}
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
  broadcast: ['tm','tm2','statustm','inscrevertm','divdono add','divdono rem','divdono list','divdono msg','divdono send','divdono time','divdono status'],

  figban: [
    'figban lista',
    'figban painel'
  ],

  maintenance: [
    'menuajustes',
    'cmdajuste lista',
    'cmdajuste buscar',
    'cmdajuste marcar',
    'cmdajuste desmarcar',
    'cmdajuste limpar'
  ],

  helpideas: [
    'ajuda',
    'caixadeideias'
  ]
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
