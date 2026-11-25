import { applyMenuFont } from '../../../utils/database.js';

export default async function menuSticker(
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
    `╭━━〔 ✦ ${bot} ✦ 〕━━╮
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
  const separator = String(d.separatorIcon || '◇');

  const section = (name, rows) => [
    `${top}${separator} ${name}`,
    middle,
    ...rows.map(
      ([cmd, desc]) => `${middle}${icon}${p}${cmd}  ·  ${desc}`
    ),
    bottom
  ];

  const content = [
    header,
    '',

    ...section('CRIAR FIGURINHAS', [
      ['sticker / s', 'Imagem ou vídeo curto'],
      ['figurante', 'Figurinha grande'],
      ['figurante2', 'Figurinha vertical'],
      ['st2 / stk2 / sticker2 / s2', 'Conversão alternativa'],
      ['brat', 'Figurinha Brat estática'],
      ['bratvid / bratvideo', 'Figurinha Brat animada']
    ]),

    '',

    ...section('ÁUDIO & PACOTES', [
      ['audiosticker', 'Figurinha com som'],
      ['figurinhasom / figsom / st / stk', 'Atalhos do audiosticker'],
      ['sfig <tema>', 'Pacote com até 40 figurinhas'],
      ['sfiganim <tema>', 'Pacote com até 30 animadas']
    ]),

    '',

    ...section('CONVERTER & PERSONALIZAR', [
      ['sbg / sfundo', 'Remover fundo e criar figurinha'],
      ['toimg', 'Figurinha para imagem'],
      ['togif', 'Figurinha animada para GIF/vídeo'],
      ['renomear / rename / mudarpack', 'Alterar autor e pacote'],
      ['rgtake', 'Salvar autor e pacote padrão'],
      ['take', 'Aplicar dados salvos'],
      ['randomsticker / figualeatoria', 'Figurinha aleatória']
    ]),

    '',
    '💡 Responda à mídia ou figurinha com o comando.',
    `🌸 ${bot} · FIGURINHAS`
  ].join('\n').replace(/\n{3,}/g, '\n\n');

  return applyMenuFont(
    content,
    d.fontStyle,
    p
  );
}
