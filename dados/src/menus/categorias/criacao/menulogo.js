import { getConfiguredBotName } from '../../../core/identity/kyara-identity.js';
export default async function menuLogos(prefix, botName = getConfiguredBotName(), userName = "Usuário", {
    header = `╭┈⊰ ${botName}-ʟᴏɢᴏs
┊ ᴏʟᴀ́, #user#!
╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯`,
    menuTopBorder = "╭┈",
    bottomBorder = "╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯",
    menuTitleIcon = "❁",
    menuItemIcon = "亗⃝ ",
    separatorIcon = "❁",
    middleBorder = "┊",
    Logos1txtTitle = "🎨 LOGOTIPOS 1TXT",
    Logos2txtTitle = "🖼 LOGOTIPOS 2TXT"
} = {}) {
    const formattedHeader = header.replace(/#user#/g, userName);
    return `${formattedHeader}

${menuTopBorder}${separatorIcon} ${Logos1txtTitle}
${middleBorder}
${middleBorder}${menuItemIcon}${prefix}amongus
${middleBorder}${menuItemIcon}${prefix}anime
${middleBorder}${menuItemIcon}${prefix}anime2
${middleBorder}${menuItemIcon}${prefix}game
${middleBorder}${menuItemIcon}${prefix}pubgvideo
${middleBorder}${menuItemIcon}${prefix}pubgavatar
${middleBorder}${menuItemIcon}${prefix}ffavatar
${middleBorder}${menuItemIcon}${prefix}lolavatar
${middleBorder}${menuItemIcon}${prefix}mascotemetal
${middleBorder}${menuItemIcon}${prefix}mascote
${middleBorder}${menuItemIcon}${prefix}ffrose
${middleBorder}${menuItemIcon}${prefix}ffgren
${middleBorder}${menuItemIcon}${prefix}lava-logo
${middleBorder}${menuItemIcon}${prefix}fire-logo
${middleBorder}${menuItemIcon}${prefix}ice-logo
${middleBorder}${menuItemIcon}${prefix}frozen
${middleBorder}${menuItemIcon}${prefix}snow
${middleBorder}${menuItemIcon}${prefix}dragonfire
${middleBorder}${menuItemIcon}${prefix}fluffy-logo
${middleBorder}${menuItemIcon}${prefix}cool-logo
${middleBorder}${menuItemIcon}${prefix}comic-logo
${middleBorder}${menuItemIcon}${prefix}water-logo
${middleBorder}${menuItemIcon}${prefix}elegant-logo
${middleBorder}${menuItemIcon}${prefix}gold-logo
${middleBorder}${menuItemIcon}${prefix}fortune-logo
${middleBorder}${menuItemIcon}${prefix}blue-logo
${middleBorder}${menuItemIcon}${prefix}silver-logo
${middleBorder}${menuItemIcon}${prefix}neon-logo
${middleBorder}${menuItemIcon}${prefix}skate-name
${middleBorder}${menuItemIcon}${prefix}retro-logo
${middleBorder}${menuItemIcon}${prefix}candy-logo
${middleBorder}${menuItemIcon}${prefix}glossy-logo
${middleBorder}${menuItemIcon}${prefix}newyear
${middleBorder}${menuItemIcon}${prefix}tiger
${middleBorder}${menuItemIcon}${prefix}galaxy-light
${middleBorder}${menuItemIcon}${prefix}galaxy
${middleBorder}${menuItemIcon}${prefix}glitch
${middleBorder}${menuItemIcon}${prefix}graffiti
${middleBorder}${menuItemIcon}${prefix}metallic
${middleBorder}${menuItemIcon}${prefix}goldpink
${middleBorder}${menuItemIcon}${prefix}comics
${middleBorder}${menuItemIcon}${prefix}cemiterio
${middleBorder}${menuItemIcon}${prefix}blood
${middleBorder}${menuItemIcon}${prefix}hallobat
${middleBorder}${menuItemIcon}${prefix}titanium
${middleBorder}${menuItemIcon}${prefix}eraser
${middleBorder}${menuItemIcon}${prefix}halloween
${middleBorder}${menuItemIcon}${prefix}america
${middleBorder}${menuItemIcon}${prefix}mascoteneon
${middleBorder}${menuItemIcon}${prefix}doubleexposure
${middleBorder}${menuItemIcon}${prefix}metal
${middleBorder}${menuItemIcon}${prefix}3dcrack
${middleBorder}${menuItemIcon}${prefix}colorful
${middleBorder}${menuItemIcon}${prefix}ballon
${middleBorder}${menuItemIcon}${prefix}multicolor
${middleBorder}${menuItemIcon}${prefix}graffitipaint
${middleBorder}${menuItemIcon}${prefix}graffitistyle
${middleBorder}${menuItemIcon}${prefix}ligatures
${middleBorder}${menuItemIcon}${prefix}watercolor
${middleBorder}${menuItemIcon}${prefix}summerbeach
${middleBorder}${menuItemIcon}${prefix}cloudsky
${middleBorder}${menuItemIcon}${prefix}techstyle
${middleBorder}${menuItemIcon}${prefix}royal
${middleBorder}${menuItemIcon}${prefix}firework
${middleBorder}${menuItemIcon}${prefix}captain
${middleBorder}${menuItemIcon}${prefix}graffitiwall
${middleBorder}${menuItemIcon}${prefix}blackpink
${middleBorder}${menuItemIcon}${prefix}glitter
${middleBorder}${menuItemIcon}${prefix}vintage3d
${middleBorder}${menuItemIcon}${prefix}retro
${middleBorder}${menuItemIcon}${prefix}balloon
${middleBorder}${menuItemIcon}${prefix}sunset
${middleBorder}${menuItemIcon}${prefix}hollywood
${bottomBorder}

${menuTopBorder}${separatorIcon} ${Logos2txtTitle}
${middleBorder}
${middleBorder}Use: TEXTO1/TEXTO2
${middleBorder}${menuItemIcon}${prefix}phlogo
${middleBorder}${menuItemIcon}${prefix}pornhub
${middleBorder}${menuItemIcon}${prefix}avengers
${middleBorder}${menuItemIcon}${prefix}deadpool
${bottomBorder}`;
}