/**

 * KYARA MENU SYSTEM

 * Registro de módulos, padrões visuais e aliases centralizados.

 * Definições extraídas da implementação existente.

 */

export const MENU_MODULES = Object.freeze({
  "menu": "./categorias/principal/menu.js",
  "menuAlterador": "./categorias/efeitos/alteradores.js",
  "menudown": "./categorias/downloads/menudown.js",
  "menuadm": "./categorias/administracao/menuadm.js",
  "menubn": "./categorias/jogos/menubn.js",
  "menuLogos": "./categorias/criacao/menulogo.js",
  "menuedits": "./categorias/criacao/menuedits.js",
  "menuDono": "./categorias/administracao/menudono.js",
  "menuMembros": "./categorias/comunidade/menumemb.js",
  "menuFerramentas": "./categorias/ferramentas/ferramentas.js",
  "menuSticker": "./categorias/criacao/menufig.js",
  "menuTopCmd": "./categorias/comunidade/topcmd.js",
  "menuRPG": "./categorias/jogos/menurpg.js",
  "menuVIP": "./categorias/comunidade/menuvip.js"
});

export const MENU_DESIGN_DEFAULTS = Object.freeze({
  fontStyle: "normal",
  header: `╭━━━━━━〔 ✦ {botName} ✦ 〕━━━━━━╮
┃ 👋 {greeting}, {userName}!
╰━━━━━━━━━━━━ ◈ ━━━━━━━━━━━━╯`,
  menuTopBorder: "╭━━〔 ",
  bottomBorder: "╰━━━━━━━━━━━━━━━━━━━━╯",
  menuTitleIcon: "✦",
  menuItemIcon: "✧ ",
  separatorIcon: "◇",
  middleBorder: "┃"
});

export const MENU_FONT_ALIASES = Object.freeze({
  "principal": "menu",
  "menuprincipal": "menu",
  "main": "menu",
  "dono": "dono",
  "owner": "dono",
  "menudono": "dono",
  "down": "menudown",
  "download": "menudown",
  "downloads": "menudown",
  "downloader": "menudown",
  "menudownloads": "menudown",
  "adm": "menuadm",
  "admin": "menuadm",
  "menuadmin": "menuadm",
  "vip": "menuvip"
});

// Nomes antigos preservados para compatibilidade.
export const MENU_FONT_ALIASES_MAIN = MENU_FONT_ALIASES;
export const MENU_FONT_ALIASES_SUB = MENU_FONT_ALIASES;

