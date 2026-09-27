export const KYARA_MAIN_BUTTONS = [
  ['📥 DOWNLOADS', 'menudown'],
  ['🎨 LOGOS', 'menulogos'],
  ['✏️ EDITS', 'menuedits'],
  ['🛡️ ADMINISTRAÇÃO', 'menuadm'],
  ['🎭 DIVERSÃO', 'menubn'],
  ['👥 MEMBROS', 'menumemb'],
  ['🧰 FERRAMENTAS', 'ferramentas'],
  ['🖼️ FIGURINHAS', 'menufig'],
  ['✨ ALTERADORES', 'alteradores'],
  ['🎮 RPG', 'menurpg'],
  ['🎨 ARTISTA', 'menuartista'],
  ['💎 VIP / PREMIUM', 'menuvip'],
  ['📈 LEVEL UP', 'menulevel']
]

export function getInteractiveMenu() {
  return {
    title:
      '🌸 *KYARA • CENTRAL*\n\n' +
      '✨ Escolha uma categoria.\n' +
      '📈 Acompanhe seu Level Up.\n' +
      '📢 Use o botão *VER CANAL* para acompanhar a Kyara.',

    buttons:
      KYARA_MAIN_BUTTONS
  }
}
