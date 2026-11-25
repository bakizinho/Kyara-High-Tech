import fs from 'node:fs';

import {
  getMenuMedia
} from '../menuAdaptativo/menu-media.js'

import {
  sendFlow,
  singleSelect,
  row,
  getMetrics
} from './native-flow.js'

import {
  getRuntimeConfig,
  getCurrentPrefix,
  getBotName,
  getOwnerName,
  KYARA_OFFICIAL_CHANNELS,
  formatCommand
} from '../runtime/kyara-runtime.js'

import { isInteractiveMenu } from '../../menus/menu-mode.js'
import { applyMenuFont, loadMenuDesign } from '../../utils/database.js'


function ownerSandStyle(text, botName, prefix) {
  const clean = String(text || '');

  const lines = clean
    .split('\n')
    .filter(line => !/VER CANAL|O COMEÇO|BOT-KYARA/i.test(line));

  return [
    `╭┈⊰ ${botName}-ᴅᴏɴᴏ`,
    `┊ ᴘᴀɪɴᴇʟ ᴅᴏ ᴅᴏɴᴏ`,
    `╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯`,
    '',
    ...lines.map(line => {
      const x = line.trim();

      if (!x) return '┊';

      if (
        /^📚|^👤|^⚡|^🧠|^⌨️|^Categorias/i.test(x)
      ) {
        return `┊ ${x}`;
      }

      return `┊ 亗⃝ ${x}`;
    }),
    '╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯'
  ].join('\n');
}

export const CATS = [
  {
    id: 'home',
    title: '📚 Início',
    desc: 'Tutorial e informações básicas'
  },

  {
    id: 'config',
    title: '🤖 Configurações do Bot',
    desc: 'Prefixo, dono, nome e mídia'
  },

  {
    id: 'personality',
    title: '🧠 Personalidade',
    desc: 'IA e personalidade da Kyara'
  },

  {
    id: 'design',
    title: '🎨 Design & Aparência',
    desc: 'Bordas e aparência'
  },

  {
    id: 'automation',
    title: '⚙️ Sistema & Automação',
    desc: 'Auto, reações e nopref'
  },

  {
    id: 'commands',
    title: '🛠️ Personalização de Comandos',
    desc: 'Comandos, aliases e blacklist'
  },

  {
    id: 'limits',
    title: '🚫 Limitação de Comandos',
    desc: 'Limites de comandos'
  },

  {
    id: 'users',
    title: '👥 Gerenciamento de Usuários',
    desc: 'Subdonos, premium e bloqueios'
  },

  {
    id: 'rental',
    title: '💰 Sistema de Aluguel',
    desc: 'Aluguel, códigos e divulgação'
  },

  {
    id: 'subbots',
    title: '🤖 Gerenciamento de Sub-Bots',
    desc: 'Rede de sub-bots'
  },

  {
    id: 'vip',
    title: '💎 Sistema VIP / Premium',
    desc: 'Comandos VIP'
  },

  {
    id: 'control',
    title: '⚡ Controle & Manutenção',
    desc: 'Controle do bot e dos grupos'
  },

  {
    id: 'monitoring',
    title: '📊 Monitoramento & Análise',
    desc: 'AntiPV, logs e banco de dados'
  },

  {
    id: 'broadcast',
    title: '📡 Transmissões',
    desc: 'TM e divulgação'
  },

  {
    id: 'figban',
    title: '🎴 FIGBAN • Controle',
    desc: 'Lista e painel de figurinhas'
  },

  {
    id: 'maintenance',
    title: '🧪 Comandos em Ajuste',
    desc: 'Ajustes, ajuda e caixa de ideias'
  }
]

export const CMDS = {
  home: [
    'tutorial'
  ],

  config: [
    'prefixo',
    'numerodono',
    'nomedono',
    'nomebot',
    'configcmdnotfound',
    'setcmdmsg',
    'fotobot',
    'fotomenu',
    'fotomenuadm',
    'videomenu',
    'audiomenu',
    'lermais',
    'personalizargrupo'
  ],

  personality: [
    'setpersonalidade',
    'criarpers',
    'novapers'
  ],

  design: [
    'designmenu',
    'fontes',
    'setborda',
    'setbordafim',
    'setbordameio',
    'setitem',
    'setseparador',
    'settitulo',
    'setheader',
    'resetdesign'
  ],

  automation: [
    'addauto',
    'addautomidia',
    'listauto',
    'delauto',
    'addreact',
    'listreact',
    'delreact',
    'addnopref',
    'listnopref',
    'delnopref'
  ],

  commands: [
    'addcmd',
    'addcmdmidia',
    'listcmd',
    'delcmd',
    'testcmd',
    'addcmd-subdono',
    'removecmd-subdono',
    'listcmd-subdono',
    'addalias',
    'listalias',
    'delalias',
    'addblackglobal',
    'listblackglobal',
    'rmblackglobal'
  ],

  limits: [
    'cmdlimitar',
    'cmddeslimitar',
    'cmdlimites'
  ],

  users: [
    'addsubdono',
    'delsubdono',
    'listasubdonos',
    'addpremium',
    'delpremium',
    'listprem',
    'resetgold',
    'addindicacao',
    'topindica',
    'delindicacao',
    'bangp',
    'unbangp',
    'listbangp'
  ],

  rental: [
    'modoaluguel',
    'addaluguel',
    'gerarcod',
    'listaraluguel',
    'infoaluguel',
    'estenderaluguel',
    'removeraluguel',
    'listaluguel',
    'limparaluguel',
    'dayfree',
    'setdiv',
    'divulgar'
  ],

  subbots: [
    'addsubbot',
    'removesubbot',
    'listarsubbots',
    'conectarsubbot'
  ],

  vip: [
    'addcmdvip',
    'removecmdvip',
    'listcmdvip',
    'togglecmdvip',
    'statsvip',
    'menuvip',
    'infovip'
  ],

  control: [
    'atualizar',
    'reiniciar',
    'entrar',
    'sairgp',
    'seradm',
    'sermembro',
    'blockcmdg',
    'unblockcmdg',
    'blockuserg',
    'unblockuserg',
    'listblocks',
    'antibanmarcar'
  ],

  monitoring: [
    'listagp',
    'antipv',
    'antipv2',
    'antipv3',
    'antipv4',
    'antipvmsg',
    'antispamcmd',
    'viewmsg',
    'antideletepv',
    'cases',
    'getcase',
    'modoliteglobal',
    'iaclear',
    'limpardb',
    'limparrankg',
    'reviverqr',
    'nuke',
    'msgprefix'
  ],

  broadcast: [
    'tm',
    'tm2',
    'statustm',
    'inscrevertm',
    'divdono add',
    'divdono rem',
    'divdono list',
    'divdono msg',
    'divdono send',
    'divdono time',
    'divdono status'
  ],

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
    'cmdajuste limpar',
    'ajuda',
    'caixadeideias'
  ]
}

const VALID_CATEGORIES =
  new Set(
    CATS.map(
      category =>
        category.id
    )
  )

const VALID_COMMANDS =
  new Set(
    Object.values(
      CMDS
    ).flat()
  )

export function isValidOwnerCategory(
  categoryId
) {
  return VALID_CATEGORIES.has(
    String(
      categoryId || ''
    )
  )
}

export function isValidOwnerCommand(
  command
) {
  return VALID_COMMANDS.has(
    String(
      command || ''
    ).trim()
  )
}

function safe(
  value,
  fallback
) {
  const text =
    String(
      value ?? ''
    )
      .replace(
        /[\r\n]+/g,
        ' '
      )
      .trim()

  return text ||
    fallback
}

function chunk(
  items,
  size
) {
  const result = []

  for (
    let i = 0;
    i < items.length;
    i += size
  ) {
    result.push(
      items.slice(
        i,
        i + size
      )
    )
  }

  return result
}

function commandRow(
  command,
  jid
) {
  const commandName =
    command
      .split(
        /\s+/
      )[0]

  return row(
    formatCommand(
      commandName,
      jid
    ).slice(
      0,
      24
    ),

    `Executar ${formatCommand(
      command,
      jid
    )}`.slice(
      0,
      72
    ),

    `owner:cmd:${command}`
  )
}

function categorySections(botName = 'KYARA') {
  return chunk(
    CATS,
    8
  ).map(
    (
      categories,
      index
    ) => ({
      title:
        index === 0
          ? '📂 PAINEL KYARA'
          : `📂 PAINEL KYARA • ${index + 1}`,

      rows:
        categories.map(
          category =>
            row(
              category.title,
              category.desc,
              `owner:open:${category.id}`
            )
        )
    })
  )
}

function channelButton(
  text,
  url
) {
  return {
    name:
      'cta_url',

    buttonParamsJson:
      JSON.stringify({
        display_text:
          text,

        url
      })
  }
}

function greeting() {
  const hour =
    new Date()
      .getHours()

  if (
    hour >= 5 &&
    hour < 12
  ) {
    return 'Bom dia'
  }

  if (
    hour >= 12 &&
    hour < 18
  ) {
    return 'Boa tarde'
  }

  return 'Boa noite'
}

function smallCaps(value) {
  const map = {
    a:'ᴀ', b:'ʙ', c:'ᴄ', d:'ᴅ', e:'ᴇ',
    f:'ꜰ', g:'ɢ', h:'ʜ', i:'ɪ', j:'ᴊ',
    k:'ᴋ', l:'ʟ', m:'ᴍ', n:'ɴ', o:'ᴏ',
    p:'ᴘ', q:'ǫ', r:'ʀ', s:'s', t:'ᴛ',
    u:'ᴜ', v:'ᴠ', w:'ᴡ', x:'x', y:'ʏ', z:'ᴢ'
  }

  return Array.from(
    String(value ?? '').toLowerCase()
  )
    .map(c => map[c] || c)
    .join('')
}

function ownerText(
  botName,
  ownerName,
  prefix,
  categoryId = null
) {
  const design = loadMenuDesign() || {};

  const cats = categoryId
    ? CATS.filter(c => c.id === categoryId)
    : CATS;

  const separatorIcon = String(design.separatorIcon ?? '❁');
  const replaceSeparator = value =>
    String(value ?? '').replace(/❁/g, separatorIcon);

  const topBorder = replaceSeparator(
    design.menuTopBorder ?? '╭┈'
  );
  const bottomBorder = replaceSeparator(
    design.bottomBorder ?? '╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯'
  );
  const titleIcon = replaceSeparator(
    design.menuTitleIcon ?? '❁'
  );
  const itemIcon = String(
    design.menuItemIcon ?? '亗⃝ '
  );
  const middleBorder = replaceSeparator(
    design.middleBorder ?? '┊'
  );

  const defaultHeader = [
    '╭┈⊰ {botName}-ᴍᴅ',
    '┊ ᴏʟᴀ́, {userName}!',
    '╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯'
  ].join('\n');

  let header = String(design.header || defaultHeader)
    .replace(/\{botName\}/g, '__KYARA_OWNER_BOT__')
    .replace(/\{userName\}/g, String(ownerName))
    .replace(/\{greeting\}/g, 'ᴏʟᴀ́, ' + ownerName + '!');

  header = header
    .replace(
      /__KYARA_OWNER_BOT__-ᴍᴅ/g,
      String(botName) + '-ᴅᴏɴᴏ'
    )
    .replace(
      /__KYARA_OWNER_BOT__/g,
      String(botName) + '-ᴅᴏɴᴏ'
    );

  header = replaceSeparator(header);

  const lines = [header, ''];

  for (const category of cats) {
    lines.push(
      topBorder + titleIcon + ' ' + smallCaps(category.title),
      middleBorder
    );

    for (const command of (CMDS[category.id] || [])) {
      lines.push(
        middleBorder + ' ' + itemIcon + prefix + command
      );
    }

    lines.push(bottomBorder, '');
  }

  return applyMenuFont(
    lines.join('\n').trim(),
    String(design.menuFonts?.dono ?? design.globalFontStyle ?? design.fontStyle ?? 'normal'),
    prefix
  );
}

async function sendOwnerTextFallback(Kyara, jid, text, media = null) {
  try {
    if (media?.path && fs.existsSync(media.path)) {
      const buffer = fs.readFileSync(media.path);

      if (buffer.length) {
        const fullText = String(text || '');
        const longCaption = false;
        const caption = longCaption
          ? '👑 KYARA • PAINEL DO DONO\nLista completa enviada abaixo.'
          : fullText;

        const isVideo =
          media.type === 'video' || /\.mp4$/i.test(String(media.path));

        const content = isVideo
          ? {
              video: buffer,
              mimetype: 'video/mp4',
              caption,
              gifPlayback: true
            }
          : {
              image: buffer,
              caption
            };

        const sent = await Kyara.sendMessage(jid, content);

        if (longCaption) {
          await Kyara.sendMessage(jid, { text: fullText });
        }

        return sent;
      }
    }
  } catch (mediaError) {
    console.warn(
      '[MENUDONO] Mídia do fallback não enviada:',
      mediaError?.message || mediaError
    );
  }

  return Kyara.sendMessage(jid, { text });
}

async function sendOwnerFlowWithFallback(Kyara, jid, payload, label) {
  try {
    const result = await sendFlow(Kyara, jid, { ...payload, viewOnce: false });

    if (!result?.message || !result?.key?.id) {
      throw new Error('Native Flow não gerou uma mensagem válida.');
    }

    return result;
  } catch (error) {
    console.error(
      '[MENUDONO] Falha no Native Flow (' + label + '):',
      error?.stack || error
    );

    try {
      const fallback = await sendOwnerTextFallback(
        Kyara,
        jid,
        String(payload?.text || 'Painel do dono da Kyara.'),
        payload?.media
      );

      console.warn(
        '[MENUDONO] Fallback normal enviado (' + label + ').'
      );

      return fallback;
    } catch (fallbackError) {
      console.error(
        '[MENUDONO] Falha também no fallback normal (' + label + '):',
        fallbackError?.stack || fallbackError
      );

      throw fallbackError;
    }
  }
}

export async function sendOwnerMain(
  Kyara,
  jid,
  options = {}
) {
  const config =
    getRuntimeConfig()

  const metrics =
    getMetrics()

  const prefix =
    getCurrentPrefix(
      jid
    )

  const botName =
    safe(
      config.nomebot,
      getBotName()
    )

  const ownerName =
    safe(
      config.nomedono,
      options.userName ||
      getOwnerName()
    )

  const media =
    await getMenuMedia('global').catch(
      () => null
    )

  const text =
    ownerText(
      botName,
      ownerName,
      prefix
    )

  const wizardButton = singleSelect(
    '🧭 CONFIGURAÇÃO GUIADA',
    [
      {
        title: 'Assistente',
        rows: [
          row(
            'Iniciar assistente',
            'Nome, prefixo e nome do dono',
            'owner:setup:start'
          )
        ]
      }
    ]
  )

  if (!isInteractiveMenu()) {
    console.log('[MENUDONO] Modo NORMAL — enviando painel com capa, sem botões.');
    return sendOwnerTextFallback(Kyara, jid, text, media);
  }

  return sendOwnerFlowWithFallback(
    Kyara,
    jid,
    {
      text,

      footer:
        `👑 ${botName} • DONO MODE`,

      title:
        `👑 ${botName} • DONO MODE`,

      media,

      buttons: [
        singleSelect(
          '📂 ABRIR PAINEL',
          categorySections(botName)
        ),
        wizardButton
      ]
    },
    'painel principal'
  )
}

export async function sendOwnerCategory(
  Kyara,
  jid,
  categoryId
) {
  if (
    !isValidOwnerCategory(
      categoryId
    )
  ) {
    throw new Error(
      `Categoria do painel inválida: ${categoryId}`
    )
  }

  const config =
    getRuntimeConfig()

  const category =
    CATS.find(
      item =>
        item.id ===
        categoryId
    )

  const commands =
    CMDS[
      categoryId
    ] ||
    []

  const prefix =
    getCurrentPrefix(
      jid
    )

  const botName =
    safe(
      config.nomebot,
      getBotName()
    )

  const media =
    await getMenuMedia('global').catch(
      () => null
    )

  const commandRows =
    commands.map(
      command =>
        commandRow(
          command,
          jid
        )
    )

  const sections = [
    {
      title:
        category.title.slice(
          0,
          24
        ),

      rows: [
        row(
          '↩️ Voltar',
          'Voltar ao painel principal',
          'owner:back:main'
        ),

        ...commandRows.slice(
          0,
          7
        )
      ]
    },

    ...chunk(
      commandRows.slice(
        7
      ),
      8
    ).map(
      (
        rows,
        index
      ) => ({
        title:
          `${category.title} • ${index + 2}`
            .slice(
              0,
              24
            ),

        rows
      })
    )
  ]

  const text =
    ownerText(
      botName,
      safe(
        config.nomedono,
        getOwnerName()
      ),
      prefix,
      categoryId
    )

  if (!isInteractiveMenu()) {
    console.log('[MENUDONO] Categoria em modo NORMAL — enviando texto puro.');
    return Kyara.sendMessage(jid, { text });
  }

  return sendOwnerFlowWithFallback(
    Kyara,
    jid,
    {
      text,

      footer:
        `👑 ${botName} • ${category.title}`,

      title:
        category.title,

      media,

      buttons: [
        singleSelect(
          '🛠️ COMANDOS',
          sections
        )
      ]
    },
    'categoria ' + category.title
  )
}
