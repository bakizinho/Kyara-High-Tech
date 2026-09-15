import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INDEX_FILE = path.resolve(__dirname, '../index.js')
const DATA_DIR = path.resolve(__dirname, '../database')
const DATA_FILE = path.join(DATA_DIR, 'commands-maintenance.json')

function ensureData() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({
        commands: [],
        updatedAt: null
      }, null, 2)
    )
  }
}

function readData() {
  ensureData()

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return {
      commands: [],
      updatedAt: null
    }
  }
}

function writeData(data) {
  ensureData()

  data.updatedAt = new Date().toISOString()

  const tmp = `${DATA_FILE}.tmp`

  fs.writeFileSync(
    tmp,
    JSON.stringify(data, null, 2)
  )

  fs.renameSync(tmp, DATA_FILE)
}

export function getCaseCommands() {
  try {
    const source = fs.readFileSync(INDEX_FILE, 'utf8')

    const found = new Set()

    const regex =
      /case\s+['"`]([^'"`]+)['"`]\s*:/g

    let match

    while ((match = regex.exec(source))) {
      const command = String(match[1])
        .trim()
        .toLowerCase()

      if (!command) continue
      if (command.includes(':')) continue
      if (command.length > 60) continue

      found.add(command)
    }

    return [...found].sort()
  } catch (error) {
    console.error(
      '[COMMAND-MAINTENANCE] Erro ao ler cases:',
      error.message
    )

    return []
  }
}

export function getMaintenanceCommands() {
  const data = readData()

  return Array.isArray(data.commands)
    ? data.commands
    : []
}

export function addMaintenanceCommand(command) {
  const normalized = String(command || '')
    .trim()
    .toLowerCase()
    .replace(/^[/!#.]+/, '')

  if (!normalized) {
    return false
  }

  const available = getCaseCommands()

  if (
    available.length &&
    !available.includes(normalized)
  ) {
    return false
  }

  const data = readData()

  if (!data.commands.includes(normalized)) {
    data.commands.push(normalized)
    data.commands.sort()
    writeData(data)
  }

  return true
}

export function removeMaintenanceCommand(command) {
  const normalized = String(command || '')
    .trim()
    .toLowerCase()
    .replace(/^[/!#.]+/, '')

  const data = readData()

  const before = data.commands.length

  data.commands =
    data.commands.filter(
      item => item !== normalized
    )

  if (data.commands.length !== before) {
    writeData(data)
    return true
  }

  return false
}

export function clearMaintenanceCommands() {
  const data = readData()

  data.commands = []

  writeData(data)

  return true
}

export function buildMaintenanceMenu(
  prefix = '/'
) {
  const cases = getCaseCommands()
  const maintenance =
    getMaintenanceCommands()

  return [
    '╭━━━〔 🧪 KYARA • AJUSTES 〕━━━╮',
    '┃',
    `┃ 📦 Cases encontrados: ${cases.length}`,
    `┃ 🔧 Em manutenção: ${maintenance.length}`,
    '┃',
    '┃ 👑 Área exclusiva do dono',
    '┃',
    '┃ Comandos:',
    `┃ ${prefix}cmdajuste lista`,
    `┃ ${prefix}cmdajuste marcar <comando>`,
    `┃ ${prefix}cmdajuste desmarcar <comando>`,
    `┃ ${prefix}cmdajuste buscar <termo>`,
    `┃ ${prefix}cmdajuste limpar`,
    '┃',
    '┃ 💡 CAIXA DE IDEIAS',
    `┃ ${prefix}caixadeideias`,
    '┃',
    '┃ 📚 AJUDA',
    `┃ ${prefix}ajuda <comando>`,
    '┃',
    '╰━━━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n')
}

export function buildMaintenanceList(
  prefix = '/'
) {
  const commands =
    getMaintenanceCommands()

  if (!commands.length) {
    return [
      '╭━━━〔 🧪 EM AJUSTE 〕━━━╮',
      '┃',
      '┃ ✅ Nenhum comando marcado.',
      '┃',
      '┃ Para marcar:',
      `┃ ${prefix}cmdajuste marcar <comando>`,
      '┃',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯'
    ].join('\n')
  }

  return [
    '╭━━━〔 🧪 COMANDOS EM AJUSTE 〕━━━╮',
    '┃',
    ...commands.map(
      (command, index) =>
        `┃ ${String(index + 1).padStart(2, '0')}. ${prefix}${command}`
    ),
    '┃',
    `┃ Total: ${commands.length}`,
    '┃',
    '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n')
}

export function searchCaseCommands(
  term = ''
) {
  const query = String(term || '')
    .trim()
    .toLowerCase()

  if (!query) {
    return getCaseCommands()
  }

  return getCaseCommands()
    .filter(command =>
      command.includes(query)
    )
}

export function buildCaseSearch(
  term = '',
  prefix = '/'
) {
  const results =
    searchCaseCommands(term)

  if (!results.length) {
    return [
      '╭━━━〔 🔎 BUSCA DE CASE 〕━━━╮',
      '┃',
      `┃ Nenhum case encontrado para: ${term}`,
      '┃',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯'
    ].join('\n')
  }

  const shown = results.slice(0, 80)

  return [
    '╭━━━〔 🔎 CASES ENCONTRADOS 〕━━━╮',
    '┃',
    ...shown.map(
      (command, index) =>
        `┃ ${String(index + 1).padStart(2, '0')}. ${prefix}${command}`
    ),
    '┃',
    `┃ Mostrando ${shown.length} de ${results.length}`,
    '┃',
    '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n')
}
