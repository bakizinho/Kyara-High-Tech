import {
  getConfiguredBotName
} from '../core/identity/kyara-identity.js'

export default async function menuNormal(
  prefix,
  botName = getConfiguredBotName(),
  userName = 'Usuário'
) {
  const p = String(prefix || '#')
  const bot = String(botName || 'KYARA')
  const user = String(userName || 'Usuário')

  return [
    `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
    `│ 🌸 *${bot} OS*`,
    `│`,
    `│ Olá, ${user}!`,
    `│ ✦ Sistema pronto para uso`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
    ``,

    `╭─〔 📚 MENU PRINCIPAL 〕`,
    `│  ├─ ${p}menudown`,
    `│  ├─ ${p}menulogos`,
    `│  ├─ ${p}menuedits`,
    `│  ├─ ${p}menuadm`,
    `│  ├─ ${p}menubn`,
    `│  ├─ ${p}menumemb`,
    `│  ├─ ${p}ferramentas`,
    `│  ├─ ${p}menufig`,
    `│  ├─ ${p}alteradores`,
    `│  ├─ ${p}menurpg`,
    `│  ├─ ${p}menuvip`,
    `│  └─ ${p}menulevel`,
    `╰─┈┈┈┈┈┈┈┈┈┈┈`,

    ``,

    `╭─〔 🧠 ASSISTENTE 〕`,
    `│  ├─ ${p}assistente`,
    `│  ├─ ${p}ler <texto>`,
    `│  └─ ${p}quiz`,
    `╰─┈┈┈┈┈┈┈┈┈┈┈`,

    ``,

    `╭─〔 💡 COMUNIDADE & LEVEL 〕`,
    `│  ├─ ${p}ideia <sua ideia>`,
    `│  ├─ ${p}caixadeideias`,
    `│  ├─ ${p}melhoresideias`,
    `│  ├─ ${p}votarideia <id>`,
    `│  ├─ ${p}level`,
    `│  └─ ${p}ranklevel`,
    `╰─┈┈┈┈┈┈┈┈┈┈┈`,

    ``,

    `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
    `│ 🌸 ${bot} • ONLINE`,
    `│ ⚡ Use ${p}menu para voltar`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
  ].join('\n')
}
