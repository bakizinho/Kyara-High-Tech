import {
  getConfiguredBotName,
  getConfiguredPrefix
} from '../../../core/identity/kyara-identity.js';

import { applyMenuFont } from '../../../utils/database.js';

function clean(value, fallback = '') {
  return String(value ?? fallback)
    .replace(/[\r\n]+/g, ' ')
    .trim() || fallback;
}

export default async function menu(
  prefix = getConfiguredPrefix(),
  botName = getConfiguredBotName(),
  userName = 'Usuário',
  design = {}
) {
  const p = clean(prefix, '#');
  const name = clean(botName, getConfiguredBotName());
  const user = clean(userName, 'Usuário');
  const d = design && typeof design === 'object' ? design : {};

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? 'Bom dia'
    : hour < 18
      ? 'Boa tarde'
      : 'Boa noite';

  const header = String(
    d.header ||
    `╭━━〔 🌸 ${name} 〕━━╮
┃ ${greeting}, ${user}!
╰━━━━━━━━━━━━━━━━━━╯`
  )
    .replace(/\{botName\}/g, name)
    .replace(/\{userName\}/g, user)
    .replace(/\{greeting\}/g, greeting);

  const sections = [
    ['📥 MÍDIA', ['menudown']],
    ['🖼️ CRIAÇÃO', ['menufig', 'menulogos', 'menuedits']],
    ['🧰 FERRAMENTAS', ['ferramentas', 'alteradores']],
    ['🎮 DIVERSÃO', ['menubn', 'menurpg', 'menumemb']],
    ['🛡️ CONTROLE', ['menuadm', 'menuvip', 'menudono', 'menuartista']],
    ['📋 SISTEMA', ['atualizacoes', 'topcmd']]
  ];

  const middle = String(d.middleBorder || '┃');
  const itemIcon = String(d.menuItemIcon || '✦ ');
  const top = String(d.menuTopBorder || '╭━━〔 ');
  const bottom = String(
    d.bottomBorder || '╰━━━━━━━━━━━━━━━━━━╯'
  );
  const titleIcon = String(d.menuTitleIcon || '✧');

  const lines = [
    header,
    '',
    `${top}${titleIcon} CATEGORIAS`,
    middle
  ];

  for (const [title, commands] of sections) {
    lines.push(`${middle} *${title}*`);

    lines.push(
      `${middle} ${commands.map(
        command => `${itemIcon}${p}${command}`
      ).join('  ·  ')}`
    );
  }

  lines.push(bottom);
  lines.push(`💡 Novidades: ${p}atualizacoes`);

  return applyMenuFont(
    lines.join('\n'),
    d.fontStyle,
    p
  );
}
