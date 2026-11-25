import { getConfiguredBotName } from '../../../core/identity/kyara-identity.js';
export default async function menuedits(prefix, botName = getConfiguredBotName(), userName = "Usuário", {
    header = `╭┈⊰ ${botName}-ᴇᴅɪᴛs
┊ ᴏʟᴀ́, #user#!
╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯`,
    menuTopBorder = "╭┈",
    bottomBorder = "╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯",
    menuTitleIcon = "❁",
    menuItemIcon = "亗⃝ ",
    separatorIcon = "❁",
    middleBorder = "┊"
} = {}) {
    const formattedHeader = header.replace(/#user#/g, userName);
    return `${formattedHeader}

${menuTopBorder}${separatorIcon} *MENU EDITS*
${middleBorder}
${middleBorder}${menuItemIcon}${prefix}jornal
${middleBorder}${menuItemIcon}${prefix}cinema
${middleBorder}${menuItemIcon}${prefix}blackwhite
${middleBorder}${menuItemIcon}${prefix}desfoque
${middleBorder}${menuItemIcon}${prefix}wojakreaction
${bottomBorder}`;
}