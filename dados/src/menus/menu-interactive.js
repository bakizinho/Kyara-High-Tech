export const KYARA_MAIN_BUTTONS = [
  ['📥 DOWNLOADS', 'menudown'],
  ['🎨 LOGOS', 'menulogos'],
  ['🛠️ EDITS', 'menuedits'],
  ['🛡️ ADMINISTRAÇÃO', 'menuadm'],
  ['🎭 DIVERSÃO', 'menubn'],
  ['👤 MEMBROS', 'menumemb'],
  ['🧰 FERRAMENTAS', 'ferramentas'],
  ['🎨 FIGURINHAS', 'menufig'],
  ['✨ ALTERADORES', 'alteradores'],
  ['🎮 RPG', 'menurpg'],
  ['💎 VIP / PREMIUM', 'menuvip']
];

export function getInteractiveMenu() {
  return {
    title:
      '🌸 *BKkyara*\\n\\nEscolha uma categoria abaixo.',
    buttons: KYARA_MAIN_BUTTONS
  };
}
