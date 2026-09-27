import {
  getConfiguredBotName
} from '../core/identity/kyara-identity.js'

function hora() {
  const h = new Date().getHours()

  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function clean(value, fallback = '') {
  return String(value ?? fallback)
    .replace(/\n+/g, ' ')
    .trim()
}

function roleInfo(design = {}) {
  if (
    design.isOwner ||
    design.owner ||
    design.cargo === 'dono'
  ) {
    return {
      label: '👑 DONO',
      mode: 'OWNER MODE'
    }
  }

  if (
    design.isAdmin ||
    design.admin ||
    design.cargo === 'adm'
  ) {
    return {
      label: '🛡️ ADM',
      mode: 'ADM MODE'
    }
  }

  return {
    label: '👤 MEMBRO',
    mode: 'USER MODE'
  }
}

function category(title, icon, commands, prefix) {
  return [
    `╭─〔 ${icon} ${title} 〕`,
    ...commands.map(
      command => `│  ├─ ${prefix}${command}`
    ),
    `╰─┈┈┈┈┈┈┈┈┈┈┈`
  ].join('\n')
}

export default async function menu(
  prefix,
  botName = getConfiguredBotName(),
  userName = 'Usuário',
  design = {}
) {
  const safePrefix = clean(prefix, '#')
  const safeBotName = clean(botName, 'KYARA')
  const safeUserName = clean(userName, 'Usuário')
  const role = roleInfo(design)

  const online =
    clean(
      design.online ||
      design.uptime,
      'ONLINE'
    )

  const ram =
    clean(
      design.ram ||
      design.memory,
      'N/D'
    )

  const categorias = [
    category(
      'CENTRAL',
      '🌸',
      [
        'menudown',
        'menulogos',
        'menuedits',
        'menuadm',
        'menubn',
        'menumemb'
      ],
      safePrefix
    ),

    category(
      'FERRAMENTAS',
      '🧰',
      [
        'ferramentas',
        'menufig',
        'alteradores'
      ],
      safePrefix
    ),

    category(
      'ENTRETENIMENTO',
      '🎮',
      [
        'menurpg',
        'menuartista',
        'menuvip',
        'menulevel'
      ],
      safePrefix
    )
  ]

  return [
    `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
    `│ 🌸 *${safeBotName} OS*`,
    `│`,
    `│ ${hora()}, @${safeUserName}!`,
    `│`,
    `│ ${role.label}`,
    `│ ⚡ ${role.mode}`,
    `│ 🟢 Status: ${online}`,
    `│ 🧠 RAM: ${ram}`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
    ``,
    `╭─〔 📚 CENTRAL KYARA 〕`,
    `│ Escolha uma categoria:`,
    `╰─┈┈┈┈┈┈┈┈┈┈┈`,
    ``,
    ...categorias,
    ``,
    `╭─〔 💡 COMUNIDADE 〕`,
    `│  ├─ ${safePrefix}ideia <sua ideia>`,
    `│  ├─ ${safePrefix}caixadeideias`,
    `│  ├─ ${safePrefix}melhoresideias`,
    `│  ├─ ${safePrefix}votarideia <id>`,
    `│  ├─ ${safePrefix}level`,
    `│  └─ ${safePrefix}ranklevel`,
    `╰─┈┈┈┈┈┈┈┈┈┈┈`,
    ``,
    `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
    `│ ✦ KYARA • ${role.mode}`,
    `│ ⚡ ${safePrefix}menu`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
  ].join('\n')
}
