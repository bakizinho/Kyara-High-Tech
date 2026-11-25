import {
  filterMenuCommands
} from '../../../features/commandMaintenance.js';

export default async function menudown(
  prefix = '#',
  botName = 'KYARA-SYSTΞM',
  userName = 'Usuário',
  design = {}
) {
  const p = String(prefix || '#').trim();

  const bot = String(botName || 'KYARA-SYSTΞM')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  const user = String(userName || 'Usuário')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  const d = design && typeof design === 'object' ? design : {};

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? 'Bom dia'
    : hour < 18
      ? 'Boa tarde'
      : 'Boa noite';

  const header = String(
    d.header ||
    `╭━━〔 📥 ${bot} 〕━━╮
┃ ${greeting}, ${user}!
╰━━━━━━━━━━━━━━━━━━╯`
  )
    .replace(/#user#/g, user)
    .replace(/\{userName\}/g, user)
    .replace(/\{botName\}/g, bot)
    .replace(/\{greeting\}/g, greeting);

  const middle = String(d.middleBorder || '┃');
  const top = String(d.menuTopBorder || '╭━━〔 ');
  const bottom = String(
    d.bottomBorder || '╰━━━━━━━━━━━━━━━━━━╯'
  );
  const icon = String(d.menuItemIcon || '✦ ');

  const section = (title, rows) => [
    `${top}◇ ${title}`,
    middle,
    ...rows.map(
      ([cmd, desc]) => `${middle}${icon}${p}${cmd}  ·  ${desc}`
    ),
    bottom
  ];

  const rendered = [
    header,
    '',

    ...section('MÚSICA & VÍDEO', [
      ['play', 'Buscar música'],
      ['playaudio', 'Baixar áudio diretamente'],
      ['play2', 'Player alternativo'],
      ['playvideo', 'Baixar vídeo diretamente'],
      ['playvid', 'Pesquisar e baixar vídeo'],
      ['letra', 'Buscar letra da música']
    ]),

    '',

    ...section('PLATAFORMAS', [
      ['tiktok', 'TikTok'],
      ['instagram', 'Instagram'],
      ['igstory', 'Stories do Instagram'],
      ['kwai', 'Kwai'],
      ['facebook', 'Facebook'],
      ['twitter', 'Twitter / X'],
      ['pinterest', 'Pinterest'],
      ['cosmos', 'Cosmos']
    ]),

    '',

    ...section('ARQUIVOS', [
      ['gdrive', 'Google Drive'],
      ['mediafire', 'MediaFire']
    ]),

    `🌸 ${bot} · DOWNLOADS`
  ].join('\n').replace(/\n{3,}/g, '\n\n');

  return filterMenuCommands(rendered, p, icon);
}
