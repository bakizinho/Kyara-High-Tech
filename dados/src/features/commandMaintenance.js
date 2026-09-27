import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INDEX_FILE =
  path.resolve(
    __dirname,
    '../index.js'
  )

const DATA_FILE =
  path.resolve(
    __dirname,
    '../database/commands-maintenance.json'
  )

const SPECIAL_COMMANDS = [
  'baixar',
  'play2',
  'pinterest',
  'pin'
]

const MENU_LABELS = {
  menudown:
    '📥 MENUDOWN • DOWNLOADS',

  menuadm:
    '🛡️ MENUADM • ADMINISTRAÇÃO',

  menudono:
    '👑 MENUDONO • OWNER',

  outros:
    '🧩 OUTROS COMANDOS'
}

const DOWN_MENU_COMMANDS = [
  'menudown',
  'menudownload',
  'menudownloads',
  'downmenu',
  'downloadmenu',

  'letra',
  'play',
  'play2',
  'playvid',
  'baixar',

  'tiktok',
  'instagram',
  'kwai',
  'igstory',
  'facebook',
  'gdrive',
  'mediafire',
  'twitter',
  'pinterest',
  'pin'
]

const ADM_MENU_COMMANDS = [
  'menuadm',
  'menuadmin',
  'menuadmins',
  'admmenu',

  'ban',
  'roletaban',
  'ban2',
  'figban',
  'enquete',
  'bam',
  'setbammsg',
  'promover',
  'rebaixar',
  'mute',
  'desmute',
  'mute2',
  'desmute2',
  'adv',
  'rmadv',
  'listadv',

  'limparrank',
  'resetrank',
  'mantercontador',
  'atividade',
  'checkativo',

  'blockuser',
  'unblockuser',
  'listblocksgp',
  'addblacklist',
  'delblacklist',
  'listblacklist',
  'blockcmd',
  'unblockcmd',

  'del',
  'limpar',
  'marcar',
  'hidetag',
  'sorteio',
  'nomegp',
  'descgrupo',
  'fotogrupo',
  'addregra',
  'delregra',

  'role.criar',
  'role.alterar',
  'role.excluir',

  'linkgp',
  'grupo',
  'opengp',
  'closegp',
  'automsg',
  'banghost',
  'limitmessage',
  'dellimitmessage',

  'solicitacoes',
  'aprovar',
  'recusarsolic',

  'addmod',
  'delmod',
  'listmods',
  'grantmodcmd',
  'revokemodcmd',
  'listmodcmds',

  'wladd',
  'wl.remove',
  'wl.lista',

  'parcerias',
  'addparceria',
  'delparceria',

  'anticategoria',
  'antiflood',
  'x9',
  'antidoc',
  'antiloc',
  'antifig',
  'antibtn',
  'antistickerplus',
  'antilinkgp',
  'antilinkcanal',
  'antilinkhard',
  'antilinksoft',
  'antiporn',
  'antistatus',
  'antitoxic',
  'antipalavra',

  'legendasaiu',
  'legendabv',
  'fotobv',
  'set-fotobv',
  'set-bannerbv',
  'rmfotobv',
  'fotosaiu',
  'rmfotosaiu',
  'setprefix',

  'addautoadm',
  'addautoadmidia',
  'listautoadm',
  'delautoadm',
  'autorespostas',
  'autorepo',

  'autodl',
  'minmessage',
  'assistente',
  'modobn',
  'modoparceria',
  'modorpg',
  'modolite',
  'bemvindo',
  'bemvindo2',
  'saida',
  'autosticker',
  'autotranscrever',
  'soadm',
  'cmdlimit',
  'fotomenugrupo',
  'infoperso'
]

const OWNER_MENU_COMMANDS = [
  'menudono',
  'ownermenu',

  'tutorial',
  'prefixo',
  'numerodono',
  'nomedono',
  'nomebot',
  'configcmdnotfound',
  'setcmdmsg',
  'fotobot',
  'fotomenu',
  'videomenu',
  'audiomenu',
  'lermais',
  'personalizargrupo',

  'setpersonalidade',
  'criarpers',
  'novapers',

  'designmenu',
  'setborda',
  'setbordafim',
  'setbordameio',
  'setitem',
  'setseparador',
  'settitulo',
  'setheader',
  'resetdesign',

  'addauto',
  'addautomidia',
  'listauto',
  'delauto',
  'addreact',
  'listreact',
  'delreact',
  'addnopref',
  'listnopref',
  'delnopref',

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
  'rmblackglobal',

  'cmdlimitar',
  'cmddeslimitar',
  'cmdlimites',

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
  'listbangp',

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
  'divulgar',

  'addsubbot',
  'removesubbot',
  'listarsubbots',
  'conectarsubbot',
  'gerarcodigo',

  'addcmdvip',
  'removecmdvip',
  'listcmdvip',
  'togglecmdvip',
  'statsvip',
  'menuvip',
  'infovip',

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

  'antibanmarcar',

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

  'msgprefix',

  'tm',
  'tm2',
  'statustm',
  'inscrevertm',
  'divdono',

  'figban',

  'menuajustes',
  'cmdajuste',
  'ajuda',

  'caixadeideias',
  'ideia',
  'ideias',
  'listasideias',
  'verideia',
  'votarideia',
  'melhoresideias'
]

const MENU_COMMANDS = {
  menudown:
    new Set(DOWN_MENU_COMMANDS),

  menuadm:
    new Set(ADM_MENU_COMMANDS),

  menudono:
    new Set(OWNER_MENU_COMMANDS)
}

function normalize(value) {
  return String(
    value ?? ''
  )
    .trim()
    .toLowerCase()
    .replace(
      /^[/!#.]+/,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
}

function rootCommand(value) {
  return normalize(
    value
  ).split(' ')[0] || ''
}

function requireDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(
      `Arquivo de manutenção ausente: ${DATA_FILE}`
    )
  }
}

function readData() {
  requireDataFile()

  try {
    const data =
      JSON.parse(
        fs.readFileSync(
          DATA_FILE,
          'utf8'
        )
      )

    return {
      commands:
        Array.isArray(
          data?.commands
        )
          ? data.commands
          : [],

      failures:
        Array.isArray(
          data?.failures
        )
          ? data.failures
          : [],

      updatedAt:
        data?.updatedAt ||
        null
    }
  } catch {
    return {
      commands: [],
      failures: [],
      updatedAt: null
    }
  }
}

function writeData(data) {
  requireDataFile()

  const tmp =
    `${DATA_FILE}.tmp`

  data.updatedAt =
    new Date().toISOString()

  fs.writeFileSync(
    tmp,
    JSON.stringify(
      data,
      null,
      2
    ),
    'utf8'
  )

  fs.renameSync(
    tmp,
    DATA_FILE
  )
}

export function getCaseCommands() {
  try {
    const source =
      fs.readFileSync(
        INDEX_FILE,
        'utf8'
      )

    const found =
      new Set(
        SPECIAL_COMMANDS
      )

    const regex =
      /case\s+['"`]([^'"`]+)['"`]\s*:/g

    let match

    while (
      (match =
        regex.exec(source))
    ) {
      const command =
        normalize(
          match[1]
        )

      if (
        !command ||
        command.includes(':') ||
        command.length > 80
      ) {
        continue
      }

      found.add(
        command
      )
    }

    return [
      ...found
    ].sort()

  } catch (error) {
    console.error(
      '[COMMAND-MAINTENANCE] Erro ao ler cases:',
      error?.message ||
      error
    )

    return []
  }
}

export function getKnownCommands() {
  return new Set(
    getCaseCommands()
  )
}

export function isKnownCommand(
  command
) {
  return getKnownCommands()
    .has(
      rootCommand(command)
    )
}

export function getCommandMenu(
  command
) {
  const root =
    rootCommand(command)

  if (
    MENU_COMMANDS
      .menudown
      .has(root)
  ) {
    return 'menudown'
  }

  if (
    MENU_COMMANDS
      .menuadm
      .has(root)
  ) {
    return 'menuadm'
  }

  if (
    MENU_COMMANDS
      .menudono
      .has(root)
  ) {
    return 'menudono'
  }

  return 'outros'
}

function pruneData(data) {
  const known =
    getKnownCommands()

  const beforeCommands =
    JSON.stringify(
      data.commands
    )

  const beforeFailures =
    JSON.stringify(
      data.failures
    )

  data.commands =
    data.commands
      .map(normalize)
      .filter(Boolean)
      .filter(
        command =>
          known.has(
            rootCommand(
              command
            )
          )
      )
      .filter(
        (item, index, arr) =>
          arr.indexOf(
            item
          ) === index
      )
      .sort()

  data.failures =
    data.failures
      .filter(
        item =>
          item &&
          known.has(
            rootCommand(
              item.command
            )
          )
      )
      .map(
        item => ({
          command:
            rootCommand(
              item.command
            ),

          menu:
            MENU_COMMANDS[
              item.menu
            ]?.has(
              rootCommand(
                item.command
              )
            )
              ? item.menu
              : getCommandMenu(
                  item.command
                ),

          count:
            Math.max(
              1,
              Number(
                item.count
              ) || 1
            ),

          firstAt:
            item.firstAt ||
            item.lastAt ||
            new Date()
              .toISOString(),

          lastAt:
            item.lastAt ||
            item.firstAt ||
            new Date()
              .toISOString(),

          lastError:
            String(
              item.lastError ||
              'Erro não informado'
            ).slice(
              0,
              600
            ),

          stage:
            String(
              item.stage ||
              'runtime'
            )
        })
      )
      .filter(
        (item, index, arr) =>
          arr.findIndex(
            x =>
              x.command ===
              item.command
          ) === index
      )
      .sort(
        (a, b) =>
          new Date(
            b.lastAt
          ).getTime() -
          new Date(
            a.lastAt
          ).getTime()
      )

  return (
    beforeCommands !==
      JSON.stringify(
        data.commands
      ) ||
    beforeFailures !==
      JSON.stringify(
        data.failures
      )
  )
}

export function getMaintenanceCommands() {
  const data =
    readData()

  if (
    pruneData(
      data
    )
  ) {
    writeData(
      data
    )
  }

  return [
    ...data.commands
  ]
}

export function getMaintenanceFailures() {
  const data =
    readData()

  if (
    pruneData(
      data
    )
  ) {
    writeData(
      data
    )
  }

  return [
    ...data.failures
  ]
}

export function addMaintenanceCommand(
  command
) {
  const normalized =
    normalize(command)

  if (
    !normalized ||
    !isKnownCommand(
      normalized
    )
  ) {
    return false
  }

  const data =
    readData()

  if (
    pruneData(
      data
    )
  ) {
    writeData(
      data
    )
  }

  if (
    !data.commands.includes(
      normalized
    )
  ) {
    data.commands.push(
      normalized
    )

    data.commands.sort()

    writeData(
      data
    )
  }

  return true
}

export function removeMaintenanceCommand(
  command
) {
  const normalized =
    normalize(command)

  const data =
    readData()

  const beforeCommands =
    data.commands.length

  const beforeFailures =
    data.failures.length

  data.commands =
    data.commands.filter(
      item =>
        item !== normalized
    )

  data.failures =
    data.failures.filter(
      item =>
        rootCommand(
          item.command
        ) !==
        rootCommand(
          normalized
        )
    )

  if (
    data.commands.length !==
      beforeCommands ||
    data.failures.length !==
      beforeFailures
  ) {
    writeData(
      data
    )

    return true
  }

  return false
}

export function clearMaintenanceCommands() {
  const data =
    readData()

  data.commands = []
  data.failures = []

  writeData(
    data
  )

  return true
}

export function recordCommandFailure(
  command,
  {
    error = '',
    message = '',
    menu = null,
    stage = 'runtime'
  } = {}
) {
  const root =
    rootCommand(
      command
    )

  if (
    !root ||
    !isKnownCommand(
      root
    )
  ) {
    return false
  }

  const data =
    readData()

  if (
    pruneData(
      data
    )
  ) {
    writeData(
      data
    )
  }

  const now =
    new Date().toISOString()

  const text =
    String(
      error?.message ||
      error ||
      message ||
      'Erro não informado'
    )
      .replace(
        /[\r\n]+/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim()
      .slice(
        0,
        600
      )

  const menuId =
    MENU_COMMANDS[
      menu
    ]?.has(root)
      ? menu
      : getCommandMenu(
          root
        )

  const existing =
    data.failures.find(
      item =>
        rootCommand(
          item.command
        ) === root
    )

  if (existing) {
    existing.menu =
      menuId

    existing.count =
      (
        Number(
          existing.count
        ) || 0
      ) + 1

    existing.lastAt =
      now

    existing.lastError =
      text ||
      existing.lastError

    existing.stage =
      String(
        stage ||
        existing.stage ||
        'runtime'
      )

  } else {
    data.failures.push({
      command: root,
      menu: menuId,
      count: 1,
      firstAt: now,
      lastAt: now,
      lastError:
        text ||
        'Erro não informado',
      stage:
        String(
          stage ||
          'runtime'
        )
    })
  }

  if (
    !data.commands.includes(
      root
    )
  ) {
    data.commands.push(
      root
    )
  }

  data.commands.sort()

  writeData(
    data
  )

  return true
}

export function searchCaseCommands(
  term = ''
) {
  const query =
    normalize(
      term
    )

  const results =
    getCaseCommands()

  return query
    ? results.filter(
        command =>
          command.includes(
            query
          )
      )
    : results
}

export function filterMenuCommands(
  text,
  prefix = '#',
  itemIcon = ''
) {
  const known =
    getKnownCommands()

  const marker =
    String(
      itemIcon || ''
    )

  if (!marker) {
    return text
  }

  return String(
    text || ''
  )
    .split('\n')
    .filter(
      line => {
        const itemPos =
          line.indexOf(
            marker
          )

        if (
          itemPos < 0
        ) {
          return true
        }

        const afterIcon =
          line.slice(
            itemPos +
            marker.length
          )

        const prefixPos =
          afterIcon.indexOf(
            String(prefix)
          )

        if (
          prefixPos < 0
        ) {
          return true
        }

        const afterPrefix =
          afterIcon
            .slice(
              prefixPos +
              String(prefix).length
            )
            .trim()

        const match =
          afterPrefix.match(
            /^([A-Za-z0-9_.-]+)/
          )

        if (!match) {
          return true
        }

        return known.has(
          match[1]
            .toLowerCase()
        )
      }
    )
    .join('\n')
}

function groupedAdjustments(
  data
) {
  const grouped = {
    menudown: [],
    menuadm: [],
    menudono: [],
    outros: []
  }

  const failures =
    new Map(
      data.failures.map(
        item => [
          rootCommand(
            item.command
          ),
          item
        ]
      )
    )

  for (
    const command of
    data.commands
  ) {
    const menu =
      getCommandMenu(
        command
      )

    grouped[
      menu
    ].push({
      command,
      failure:
        failures.get(
          rootCommand(
            command
          )
        ) || null
    })
  }

  return grouped
}

export function buildMaintenanceMenu(
  prefix = '/'
) {
  const data =
    readData()

  if (
    pruneData(
      data
    )
  ) {
    writeData(
      data
    )
  }

  const grouped =
    groupedAdjustments(
      data
    )

  const marked =
    data.commands.length

  const failures =
    data.failures.length

  const lines = [
    '╭━━━〔 🧪 KYARA • CENTRAL DE AJUSTES 〕━━━╮',
    '┃',
    `┃ 📦 Cases reais : ${getCaseCommands().length}`,
    `┃ 🔧 Em ajuste   : ${marked}`,
    `┃ ⚠️ Com erro    : ${failures}`,
    '┃',
    '┃ ✅ Comandos inexistentes ficam fora.',
    '┃ ⚠️ Falhas técnicas entram no menu de origem.',
    '┃ 🧹 Dados antigos são limpos automaticamente.',
    '┃'
  ]

  for (
    const menu of
    [
      'menudown',
      'menuadm',
      'menudono'
    ]
  ) {
    const entries =
      grouped[menu]

    if (
      !entries.length
    ) {
      continue
    }

    lines.push(
      `┃ ${MENU_LABELS[menu]}`
    )

    entries
      .slice(0, 8)
      .forEach(
        entry => {
          lines.push(
            entry.failure
              ? `┃   ⚠️ ${prefix}${entry.command} • ${entry.failure.count}x`
              : `┃   🔧 ${prefix}${entry.command}`
          )
        }
      )

    if (
      entries.length > 8
    ) {
      lines.push(
        `┃   … +${entries.length - 8} ajuste(s)`
      )
    }

    lines.push(
      '┃'
    )
  }

  lines.push(
    `┃ ${prefix}cmdajuste lista`,
    `┃ ${prefix}cmdajuste erros`,
    `┃ ${prefix}cmdajuste menu <menudown|menuadm|menudono>`,
    `┃ ${prefix}cmdajuste marcar <comando>`,
    `┃ ${prefix}cmdajuste desmarcar <comando>`,
    `┃ ${prefix}cmdajuste buscar <termo>`,
    `┃ ${prefix}cmdajuste limpar`,
    '┃',
    `┃ 💡 ${prefix}caixadeideias`,
    `┃ 💡 ${prefix}verideia <id>`,
    `┃ 👍 ${prefix}votarideia <id>`,
    `┃ 👎 ${prefix}votarideia <id> contra`,
    `┃ 🏆 ${prefix}melhoresideias`,
    '┃',
    `┃ 📚 ${prefix}ajuda <comando>`,
    '┃',
    '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
  )

  return lines.join(
    '\n'
  )
}

export function buildMaintenanceList(
  prefix = '/',
  menuFilter = ''
) {
  const data =
    readData()

  if (
    pruneData(
      data
    )
  ) {
    writeData(
      data
    )
  }

  const grouped =
    groupedAdjustments(
      data
    )

  const filter =
    normalize(
      menuFilter
    )

  const menus =
    filter &&
    grouped[filter]
      ? [filter]
      : [
          'menudown',
          'menuadm',
          'menudono',
          'outros'
        ]

  const sections = []
  let total = 0

  for (
    const menu of
    menus
  ) {
    const entries =
      grouped[menu]

    if (
      !entries.length
    ) {
      continue
    }

    total +=
      entries.length

    sections.push(
      [
        `╭━━━〔 ${
          MENU_LABELS[menu] ||
          menu
        } 〕━━━╮`,
        '┃',

        ...entries.map(
          (
            entry,
            index
          ) =>
            entry.failure
              ? `┃ ${
                  String(
                    index + 1
                  ).padStart(
                    2,
                    '0'
                  )
                }. ⚠️ ${prefix}${
                  entry.command
                } • ${
                  entry.failure.count
                }x`
              : `┃ ${
                  String(
                    index + 1
                  ).padStart(
                    2,
                    '0'
                  )
                }. 🔧 ${prefix}${
                  entry.command
                }`
        ),

        '┃',
        `┃ Total: ${
          entries.length
        }`,
        '┃',
        '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
      ].join('\n')
    )
  }

  if (
    !sections.length
  ) {
    return [
      '╭━━━〔 🧪 EM AJUSTE 〕━━━╮',
      '┃',
      '┃ ✅ Nenhum comando está em ajuste.',
      '┃',
      `┃ ${prefix}cmdajuste marcar <comando>`,
      '┃',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯'
    ].join('\n')
  }

  return (
    sections.join(
      '\n\n'
    ) +
    `\n\n📊 Total geral: *${total}*`
  )
}

export function buildMaintenanceErrors(
  prefix = '/',
  menuFilter = ''
) {
  const data =
    readData()

  if (
    pruneData(
      data
    )
  ) {
    writeData(
      data
    )
  }

  const filter =
    normalize(
      menuFilter
    )

  const failures =
    data.failures.filter(
      item =>
        !filter ||
        item.menu ===
          filter
    )

  if (
    !failures.length
  ) {
    return [
      '╭━━━〔 ⚠️ ERROS DETECTADOS 〕━━━╮',
      '┃',
      '┃ ✅ Nenhum erro técnico registrado.',
      '┃',
      '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
    ].join('\n')
  }

  const lines = [
    '╭━━━〔 ⚠️ ERROS DETECTADOS 〕━━━╮',
    '┃'
  ]

  failures
    .slice(
      0,
      40
    )
    .forEach(
      (
        failure,
        index
      ) => {
        lines.push(
          `┃ ${
            String(
              index + 1
            ).padStart(
              2,
              '0'
            )
          }. ${
            prefix
          }${
            failure.command
          }`,

          `┃    📂 ${
            MENU_LABELS[
              failure.menu
            ] ||
            failure.menu
          }`,

          `┃    🔁 ${
            failure.count
          } ocorrência(s)`,

          `┃    🧩 ${
            failure.stage
          }`,

          `┃    ❌ ${
            failure.lastError
          }`,

          '┃'
        )
      }
    )

  lines.push(
    `┃ ${
      Math.min(
        failures.length,
        40
      )
    } de ${
      failures.length
    } erro(s)`,

    '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
  )

  return lines.join(
    '\n'
  )
}

export function buildCaseSearch(
  term = '',
  prefix = '/'
) {
  const results =
    searchCaseCommands(
      term
    )

  if (
    !results.length
  ) {
    return [
      '╭━━━〔 🔎 COMANDOS REAIS 〕━━━╮',
      '┃',
      `┃ Nenhum comando real encontrado para: ${term || '(vazio)'}`,
      '┃',
      '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
    ].join('\n')
  }

  const shown =
    results.slice(
      0,
      100
    )

  return [
    '╭━━━〔 🔎 COMANDOS REAIS 〕━━━╮',
    '┃',

    ...shown.map(
      (
        command,
        index
      ) =>
        `┃ ${
          String(
            index + 1
          ).padStart(
            2,
            '0'
          )
        }. ${
          prefix
        }${command}`
    ),

    '┃',
    `┃ ${
      shown.length
    } de ${
      results.length
    }`,

    '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n')
}

export function shouldRecordReplyError(
  text
) {
  const value = String(text || '').trim()

  if (!/^❌/u.test(value)) {
    return false
  }

  if (
    /comando não encontrado|comando nao encontrado|apenas .*administrador|apenas .* dono|somente .* dono|uso correto|^❌\s*use:/i.test(value)
  ) {
    return false
  }

  return /^❌\s*(ocorreu|erro|falha|não consegui|nao consegui|não foi possível|nao foi possivel|falha ao|erro ao)/i.test(value)
}
