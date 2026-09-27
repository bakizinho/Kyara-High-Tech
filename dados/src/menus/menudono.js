import { filterMenuCommands } from '../features/commandMaintenance.js'
import os from 'os'

const UI = Object.freeze({
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    purple: '\x1b[38;5;141m',
    pink: '\x1b[38;5;213m',
    cyan: '\x1b[38;5;81m',
    green: '\x1b[38;5;120m',
    yellow: '\x1b[38;5;221m',
    white: '\x1b[38;5;255m',
    gray: '\x1b[38;5;245m',
    red: '\x1b[38;5;204m'
})

function clean(value, fallback = '') {
    const result = String(value ?? fallback)
        .replace(/\r/g, '')
        .replace(/\n+/g, ' ')
        .trim()

    return result || fallback
}

function paint(color, text) {
    return `${color}${text}${UI.reset}`
}

function center(text, width = 48) {
    const value = String(text ?? '')
    const gap = Math.max(0, width - value.length)
    const left = Math.floor(gap / 2)
    const right = gap - left

    return (
        ' '.repeat(left) +
        value +
        ' '.repeat(right)
    )
}

function top(width = 48) {
    return `╭${'─'.repeat(width)}╮`
}

function middle(width = 48) {
    return `├${'─'.repeat(width)}┤`
}

function bottom(width = 48) {
    return `╰${'─'.repeat(width)}╯`
}

function line(text = '', width = 48) {
    return `│${String(text).padEnd(width, ' ')}│`
}

function uptimeText() {
    const total = Math.max(
        0,
        Math.floor(process.uptime())
    )

    const days = Math.floor(total / 86400)
    const hours = Math.floor(
        (total % 86400) / 3600
    )
    const minutes = Math.floor(
        (total % 3600) / 60
    )
    const seconds = total % 60

    const parts = []

    if (days) parts.push(`${days}d`)
    if (hours || days) parts.push(`${hours}h`)
    if (minutes || hours || days) {
        parts.push(`${minutes}m`)
    }

    parts.push(`${seconds}s`)

    return parts.join(' ')
}

function memoryText() {
    const mem = process.memoryUsage()

    return `${(
        mem.rss / 1024 / 1024
    ).toFixed(1)} MB`
}

function heapText() {
    const mem = process.memoryUsage()

    return `${(
        mem.heapUsed / 1024 / 1024
    ).toFixed(1)} MB`
}

function cpuText() {
    try {
        return os
            .loadavg()
            .map(value => Number(value).toFixed(2))
            .join(' / ')
    } catch {
        return 'N/D'
    }
}

function greeting() {
    const hour = new Date().getHours()

    if (hour >= 5 && hour < 12) {
        return 'Bom dia'
    }

    if (hour >= 12 && hour < 18) {
        return 'Boa tarde'
    }

    return 'Boa noite'
}

function section(
    title,
    icon,
    commands,
    prefix
) {
    const rendered = [
        `╭─〔 ${icon} ${title} 〕`,
        `│`
    ]

    for (let i = 0; i < commands.length; i++) {
        const last = i === commands.length - 1
        const branch = last ? '└─' : '├─'

        rendered.push(
            `│ ${branch} ${prefix}${commands[i]}`
        )
    }

    rendered.push(
        `╰─┈┈┈┈┈┈┈┈┈┈┈`
    )

    return rendered.join('\n')
}

function authStyleHeader(
    botName,
    userName
) {
    const width = 52

    const safeBot = clean(
        botName,
        'KYARA'
    )

    const safeUser = clean(
        userName,
        'Dono'
    )

    return [
        paint(
            UI.purple,
            `╭${'─'.repeat(width)}╮`
        ),

        paint(UI.purple, '│') +
        paint(
            UI.pink + UI.bold,
            center(
                '🌸  K Y A R A',
                width
            )
        ) +
        paint(UI.purple, '│'),

        paint(UI.purple, '│') +
        paint(
            UI.cyan,
            center(
                'OWNER CONTROL CENTER',
                width
            )
        ) +
        paint(UI.purple, '│'),

        paint(UI.purple, '│') +
        paint(
            UI.dim,
            center(
                'PAINEL ADMINISTRATIVO',
                width
            )
        ) +
        paint(UI.purple, '│'),

        paint(
            UI.purple,
            `├${'─'.repeat(width)}┤`
        ),

        paint(UI.purple, '│') +
        paint(
            UI.white,
            `  👑 Dono: ${safeUser}`.padEnd(width)
        ) +
        paint(UI.purple, '│'),

        paint(UI.purple, '│') +
        paint(
            UI.white,
            `  🤖 Bot: ${safeBot}`.padEnd(width)
        ) +
        paint(UI.purple, '│'),

        paint(UI.purple, '│') +
        paint(
            UI.green,
            `  🟢 Status: ONLINE`.padEnd(width)
        ) +
        paint(UI.purple, '│'),

        paint(UI.purple, '│') +
        paint(
            UI.cyan,
            `  ⏱️ Uptime: ${uptimeText()}`.padEnd(width)
        ) +
        paint(UI.purple, '│'),

        paint(UI.purple, '│') +
        paint(
            UI.cyan,
            `  🧠 RAM: ${memoryText()}`.padEnd(width)
        ) +
        paint(UI.purple, '│'),

        paint(UI.purple, '│') +
        paint(
            UI.gray,
            `  📦 Heap: ${heapText()}`.padEnd(width)
        ) +
        paint(UI.purple, '│'),

        paint(UI.purple, '│') +
        paint(
            UI.gray,
            `  ⚙️ CPU: ${cpuText()}`.padEnd(width)
        ) +
        paint(UI.purple, '│'),

        paint(
            UI.purple,
            `╰${'─'.repeat(width)}╯`
        )
    ].join('\n')
}

async function menuDono(
    prefix = '#',
    botName = 'KYARA',
    userName = 'Dono',
    options = {}
) {
    const safePrefix = clean(
        prefix,
        '#'
    )

    const safeBotName = clean(
        botName,
        'KYARA'
    )

    const safeUserName = clean(
        userName,
        'Dono'
    )

    const menuItemIcon =
        clean(
            options.itemIcon,
            '├─'
        )

    const customHeader =
        clean(
            options.customHeader,
            `${greeting()}, ${safeUserName}!`
        )

    const inicio = section(
        'INÍCIO',
        '📚',
        [
            'tutorial'
        ],
        safePrefix
    )

    const config = section(
        'CONFIGURAÇÕES DO BOT',
        '🤖',
        [
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
            'personalizargrupo'
        ],
        safePrefix
    )

    const personalidade = section(
        'PERSONALIDADE',
        '🧠',
        [
            'setpersonalidade',
            'criarpers',
            'novapers'
        ],
        safePrefix
    )

    const design = section(
        'DESIGN & APARÊNCIA',
        '🎨',
        [
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
        safePrefix
    )

    const automacao = section(
        'SISTEMA & AUTOMAÇÃO',
        '⚙️',
        [
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
        safePrefix
    )

    const comandos = section(
        'PERSONALIZAÇÃO DE COMANDOS',
        '🛠️',
        [
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
        safePrefix
    )

    const limitacao = section(
        'LIMITAÇÃO DE COMANDOS',
        '🚫',
        [
            'cmdlimitar',
            'cmddeslimitar',
            'cmdlimites'
        ],
        safePrefix
    )

    const usuarios = section(
        'GERENCIAMENTO DE USUÁRIOS',
        '👥',
        [
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
        safePrefix
    )

    const aluguel = section(
        'SISTEMA DE ALUGUEL',
        '💰',
        [
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
        safePrefix
    )

    const subbots = section(
        'GERENCIAMENTO DE SUB-BOTS',
        '🤖',
        [
            'addsubbot',
            'removesubbot',
            'listarsubbots',
            'conectarsubbot'
        ],
        safePrefix
    )

    const vip = section(
        'SISTEMA VIP / PREMIUM',
        '💎',
        [
            'addcmdvip',
            'removecmdvip',
            'listcmdvip',
            'togglecmdvip',
            'statsvip',
            'menuvip',
            'infovip'
        ],
        safePrefix
    )

    const controle = section(
        'CONTROLE & MANUTENÇÃO',
        '⚡',
        [
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
        safePrefix
    )

    const monitoramento = section(
        'MONITORAMENTO & ANÁLISE',
        '📊',
        [
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
        safePrefix
    )

    const transmissao = section(
        'TRANSMISSÕES',
        '📡',
        [
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
        safePrefix
    )

    const figban = section(
        'FIGBAN • CONTROLE',
        '🎴',
        [
            'figban lista',
            'figban painel'
        ],
        safePrefix
    )

    const ajustes = section(
        'COMANDOS EM AJUSTE',
        '🧪',
        [
            'menuajustes',
            'cmdajuste lista',
            'cmdajuste buscar <termo>',
            'cmdajuste marcar <comando>',
            'cmdajuste desmarcar <comando>',
            'cmdajuste limpar',
            'ajuda <comando>',
            'caixadeideias'
        ],
        safePrefix
    )

    const blocks = [
        inicio,
        config,
        personalidade,
        design,
        automacao,
        comandos,
        limitacao,
        usuarios,
        aluguel,
        subbots,
        vip,
        controle,
        monitoramento,
        transmissao,
        figban,
        ajustes
    ]

    const text = [
        authStyleHeader(
            safeBotName,
            safeUserName
        ),

        '',

        `╭${'─'.repeat(52)}╮`,
        `│${center('🔐 ACESSO EXCLUSIVO DO PROPRIETÁRIO', 52)}│`,
        `├${'─'.repeat(52)}┤`,
        `│${center(customHeader, 52)}│`,
        `│${center('Use os comandos críticos com cuidado.', 52)}│`,
        `╰${'─'.repeat(52)}╯`,

        '',

        ...blocks.flatMap(
            block => [block, '']
        ),

        `╭${'─'.repeat(52)}╮`,
        `│${center('👑 KYARA • OWNER MODE', 52)}│`,
        `├${'─'.repeat(52)}┤`,
        `│${center('🔒 Painel protegido', 52)}│`,
        `│${center(`⚡ Prefixo: ${safePrefix}`, 52)}│`,
        `│${center(`🟦 Node: ${process.version}`, 52)}│`,
        `╰${'─'.repeat(52)}╯`
    ].join('\n')

    const rendered = filterMenuCommands(
        text,
        safePrefix,
        menuItemIcon
    )

    return rendered
}

export default menuDono
