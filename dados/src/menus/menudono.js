import os from 'os'

function uptimeText() {
    const total = Math.floor(process.uptime())

    const days = Math.floor(total / 86400)
    const hours = Math.floor((total % 86400) / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60

    const parts = []

    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)

    parts.push(`${seconds}s`)

    return parts.join(' ')
}

function memoryText() {
    const mem = process.memoryUsage()

    return `${(mem.rss / 1024 / 1024).toFixed(1)} MB`
}

function heapText() {
    const mem = process.memoryUsage()

    return `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`
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

function section(title, lines, {
    prefix,
    itemIcon = '╰─›',
    bottom = '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
} = {}) {
    return [
        `╭━━━〔 ${title} 〕`,
        ...lines.map(line => `┃ ${itemIcon} ${prefix}${line}`),
        `┃`,
        bottom
    ].join('\n')
}

async function menuDono(
    prefix,
    botName = 'MeuBot',
    userName = 'Usuário',
    {
        header,
        menuTopBorder = '╭━━━〔',
        bottomBorder = '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯',
        menuItemIcon = '╰─›',
        separatorIcon = '👑',
        middleBorder = '┃'
    } = {}
) {

    const safePrefix = prefix || '.'
    const safeBotName = botName || 'MeuBot'
    const safeUserName = userName || 'Dono'

    const customHeader = header
        ? header.replace(/#user#/g, safeUserName)
        : `${greeting()}, ${safeUserName}! 👑`

    const status = [
        `┃ 🔐 Acesso: OWNER`,
        `┃ 🤖 Bot: ${safeBotName}`,
        `┃ 🟢 Estado: ONLINE`,
        `┃ ⏱️ Uptime: ${uptimeText()}`,
        `┃ 🧠 RAM: ${memoryText()}`,
        `┃ 📦 Heap: ${heapText()}`,
        `┃ ⚙️ CPU: ${cpuText()}`,
        `┃ 🟦 Node: ${process.version}`,
        `┃ 🆔 PID: ${process.pid}`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
    ].join('\n')

    const inicio = section(
        '📚 INÍCIO',
        [
            'tutorial'
        ],
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const config = section(
        '🤖 CONFIGURAÇÕES DO BOT',
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
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const personalidade = section(
        '🧠 PERSONALIDADE DA ASSISTENTE',
        [
            'setpersonalidade',
            'criarpers',
            'novapers'
        ],
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const design = section(
        '🎨 DESIGN & APARÊNCIA',
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
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const automacao = section(
        '⚙️ SISTEMA & AUTOMAÇÃO',
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
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const comandos = section(
        '🛠️ PERSONALIZAÇÃO DE COMANDOS',
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
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const limitacao = section(
        '🚫 LIMITAÇÃO DE COMANDOS',
        [
            'cmdlimitar',
            'cmddeslimitar',
            'cmdlimites'
        ],
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const usuarios = section(
        '👥 GERENCIAMENTO DE USUÁRIOS',
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
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const aluguel = section(
        '💰 SISTEMA DE ALUGUEL',
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
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const subbots = section(
        '🤖 GERENCIAMENTO DE SUB-BOTS',
        [
            'addsubbot',
            'removesubbot',
            'listarsubbots',
            'conectarsubbot'
        ],
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const vip = section(
        '💎 SISTEMA VIP / PREMIUM',
        [
            'addcmdvip',
            'removecmdvip',
            'listcmdvip',
            'togglecmdvip',
            'statsvip',
            'menuvip',
            'infovip'
        ],
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )


    const figban = section(
        '🎴 FIGBAN • CONTROLE',
        [
            'figban lista',
            'figban painel'
        ],
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const ajustes = section(
        '🧪 COMANDOS EM AJUSTE',
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
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const controle = section(
        '⚡ CONTROLE & MANUTENÇÃO',
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
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const monitoramento = section(
        '📊 MONITORAMENTO & ANÁLISE',
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
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    const transmissao = section(
        '📡 TRANSMISSÕES',
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
        {
            prefix: safePrefix,
            itemIcon: menuItemIcon,
            bottom: bottomBorder
        }
    )

    return [
        `${menuTopBorder} ${separatorIcon} *KYARA OWNER OS* 〕`,
        `┃`,
        `┃ ${customHeader}`,
        `┃`,
        status,
        `┃`,
        `┃ 🛡️ *PAINEL RESTRITO AO DONO*`,
        `┃`,
        `┃ Escolha uma categoria abaixo.`,
        bottomBorder,
        ``,
        inicio,
        ``,
        config,
        ``,
        personalidade,
        ``,
        design,
        ``,
        automacao,
        ``,
        comandos,
        ``,
        limitacao,
        ``,
        usuarios,
        ``,
        aluguel,
        ``,
        subbots,
        ``,
        vip,
        ``,
        controle,
        ``,
        monitoramento,
        ``,
        transmissao,
        ``,
        figban,
        ``,
        ajustes,
        ``,
        `╭━━━〔 👑 KYARA OWNER 〕`,
        `┃ 🔒 Área exclusiva do proprietário`,
        `┃ ⚠️ Execute os comandos somente quando necessário.`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
    ].join('\n')
}

export default menuDono
