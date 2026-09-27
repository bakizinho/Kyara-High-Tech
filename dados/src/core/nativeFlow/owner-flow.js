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

function categorySections() {
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
    await getMenuMedia(
      'admin'
    ).catch(
      () => null
    )

  const text = [
    '👑 *KYARA • DONO MODE*',

    `${greeting()}, ${ownerName}! 🌸`,

    '',

    `🌸 *${botName}*`,

    '👤 👑 DONO',

    `⚡ Online: ${metrics.up}s`,

    `🧠 RAM: ${metrics.ram} MB`,

    `⌨️ Prefixo: ${prefix}`,

    '',

    '📚 *CENTRAL KYARA*',

    `Categorias: ${CATS.length}`,

    '',

    'Escolha uma categoria no seletor abaixo.',

    'Cada categoria abre seus comandos organizados.',

    '',

    '📢 Acompanhe os canais oficiais O COMEÇO e BOT-KYARA nos botões abaixo.'
  ].join(
    '\n'
  )

  return sendFlow(
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
          categorySections()
        ),

        channelButton(
          '📢 VER CANAL • O COMEÇO',
          KYARA_OFFICIAL_CHANNELS.oComeco
        ),

        channelButton(
          '🤖 VER CANAL • BOT-KYARA',
          KYARA_OFFICIAL_CHANNELS.botKyara
        )
      ]
    }
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
    await getMenuMedia(
      'admin'
    ).catch(
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

  const text = [
    `👑 ${category.title}`,

    category.desc,

    '',

    `📦 ${commands.length} comandos`,

    `⌨️ Prefixo: ${prefix}`,

    '',

    'Toque em um comando para executar.',

    'O comando interno permanece sem prefixo; a apresentação acompanha o prefixo atual.',

    '',

    `🌸 ${botName}`
  ].join(
    '\n'
  )

  return sendFlow(
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
        ),

        channelButton(
          '📢 O COMEÇO',
          KYARA_OFFICIAL_CHANNELS.oComeco
        ),

        channelButton(
          '🤖 BOT-KYARA',
          KYARA_OFFICIAL_CHANNELS.botKyara
        )
      ]
    }
  )
}
