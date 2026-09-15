
export default async function menu(
  prefix,
  botName = 'BOT-KYARA',
  userName = 'Usuário',
  design = {}
) {
  const cargo =
    design.cargo ||
    design.nivel ||
    design.role ||
    'membro';

  const nivel =
    cargo === 'dono'
      ? '👑 DONO'
      : cargo === 'adm'
        ? '👤 ADM'
        : '👤 MEMBRO';

  const online =
    design.online ||
    design.uptime ||
    'Online: 0s';

  const ram =
    design.ram ||
    design.memory ||
    'N/D';

  const canais = [
    '📢 O COMEÇO • Canal Oficial',
    '🌸 Kyara-bot • Canal do Bot'
  ];

  const canaisTexto = canais
    .map(function(item) {
      return '┃ ' + item;
    })
    .join('\\n');

  return (
    '🌸 KYARA • USER MODE\\n' +
    'Bom dia, ' + userName + '! 🌸\\n' +
    '\\n' +

    '╭━━〔 🌸 *BOT-KYARA* 〕━━╮\\n' +
    '┃ ' + nivel + '\\n' +
    '┃ ⚡ ' + online + '\\n' +
    '┃ 🧠 RAM: ' + ram + '\\n' +
    '╰━━━━━━━━━━━━━━━━━━━━╯\\n' +
    '\\n' +

    '╭━━〔 📚 *CENTRAL KYARA* 〕━━╮\\n' +
    '┃ 📥 ' + prefix + 'menudown\\n' +
    '┃ 🎨 ' + prefix + 'menulogos\\n' +
    '┃ ✏️ ' + prefix + 'menuedits\\n' +
    '┃ 🛡️ ' + prefix + 'menuadm\\n' +
    '┃ 🎉 ' + prefix + 'menubn\\n' +
    '┃ 👑 ' + prefix + 'menudono\\n' +
    '┃ 👥 ' + prefix + 'menumemb\\n' +
    '┃ 🛠️ ' + prefix + 'ferramentas\\n' +
    '┃ 🖼️ ' + prefix + 'menufig\\n' +
    '┃ ⚙️ ' + prefix + 'alteradores\\n' +
    '┃ 🎮 ' + prefix + 'menurpg\\n' +
    '┃ 💎 ' + prefix + 'menuvip\\n' +
    '╰━━━━━━━━━━━━━━━━━━━━╯\\n' +
    '\\n' +

    'Escolha um dos menus abaixo.\\n' +
    '🌸 *12 menus originais da Kyara.*\\n' +
    '🌸 BOT-KYARA • Menu Interativo\\n' +
    '\\n' +

    '╭━━〔 📢 *CANAIS OFICIAIS* 〕━━╮\\n' +
    canaisTexto + '\\n' +
    '╰━━━━━━━━━━━━━━━━━━━━╯'
  );
}
