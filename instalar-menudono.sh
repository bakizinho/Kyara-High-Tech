#!/data/data/com.termux/files/usr/bin/bash

set -e

ROOT="$HOME/storage/BKkyara-"
INDEX="$ROOT/dados/src/index.js"
CORE="$ROOT/dados/src/core"
OWNER_DIR="$CORE/menuDono"
OWNER="$OWNER_DIR/menu-dono.js"

cd "$ROOT"

TS="$(date +%Y%m%d-%H%M%S)"

echo
echo "╔══════════════════════════════════════════════╗"
echo "║        👑 KYARA • INSTALADOR MENUDONO        ║"
echo "╚══════════════════════════════════════════════╝"
echo

if [ ! -f "$INDEX" ]; then
  echo "❌ Não encontrei:"
  echo "$INDEX"
  exit 1
fi

mkdir -p "$OWNER_DIR"

echo "📦 Criando backup..."

cp "$INDEX" "$INDEX.backup-menudono-$TS"

if [ -f "$OWNER" ]; then
  cp "$OWNER" "$OWNER.backup-menudono-$TS"
fi

echo "✅ Backup criado."
echo

cat > "$OWNER" <<'KYARA_OWNER_JS'
import os from 'os'
import fs from 'fs'
import path from 'path'

/*
 * =========================================================
 * 👑 KYARA • MENU DONO
 * =========================================================
 *
 * Menu exclusivo do proprietário.
 *
 * IMPORTANTE:
 * Este módulo não executa comandos perigosos sozinho.
 * Os IDs abaixo são encaminhados pelo handler principal
 * para o sistema de comandos existente.
 * =========================================================
 */

const OWNER_NUMBERS = [
  '558498445270',
  '5584987480834'
]

const OWNER_COMMANDS = [

  {
    title: '📊 STATUS REAL',
    description: 'RAM, CPU, uptime e informações do processo',
    id: 'donostatus'
  },

  {
    title: '🤖 CONFIGURAÇÕES',
    description: 'Configurações gerais da Kyara',
    id: 'donoconfig'
  },

  {
    title: '🧠 PERSONALIDADE IA',
    description: 'Personalidade, comportamento e respostas',
    id: 'donopersonalidade'
  },

  {
    title: '🎨 DESIGN',
    description: 'Nome, aparência, menus e identidade',
    id: 'donodesign'
  },

  {
    title: '⚙️ AUTOMAÇÃO',
    description: 'Automação e tarefas programadas',
    id: 'donoautomacao'
  },

  {
    title: '🛠️ COMANDOS PERSONALIZADOS',
    description: 'Gerenciar comandos personalizados',
    id: 'donocomandos'
  },

  {
    title: '🚫 LIMITAÇÕES',
    description: 'Limites e regras internas',
    id: 'donolimitacoes'
  },

  {
    title: '👥 USUÁRIOS',
    description: 'Gerenciar usuários',
    id: 'donousuarios'
  },

  {
    title: '💰 ALUGUEL',
    description: 'Sistema de aluguel da Kyara',
    id: 'donoaluguel'
  },

  {
    title: '🤖 SUB-BOTS',
    description: 'Gerenciar sub-bots',
    id: 'donosubbots'
  },

  {
    title: '💎 VIP',
    description: 'Gerenciar sistema VIP',
    id: 'donovip'
  },

  {
    title: '⚡ MANUTENÇÃO',
    description: 'Manutenção e diagnóstico',
    id: 'donomanutencao'
  },

  {
    title: '📡 MONITORAMENTO',
    description: 'Monitoramento do sistema',
    id: 'donomonitoramento'
  },

  {
    title: '📢 TRANSMISSÕES',
    description: 'Gerenciar transmissões',
    id: 'donotransmissoes'
  }

]

function digits(value = '') {
  return String(value || '').replace(/\D/g, '')
}

function numberFromJid(jid = '') {
  return digits(
    String(jid || '')
      .split('@')[0]
      .split(':')[0]
  )
}

export function isOwner(jid = '') {
  const number = numberFromJid(jid)

  return OWNER_NUMBERS.some(
    owner => digits(owner) === number
  )
}

function memoryMB() {
  const rss =
    process.memoryUsage().rss /
    1024 /
    1024

  return `${rss.toFixed(1)} MB`
}

function uptimeText() {
  const total = Math.floor(process.uptime())

  const hours = Math.floor(total / 3600)

  const minutes =
    Math.floor((total % 3600) / 60)

  const seconds =
    total % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }

  return `${seconds}s`
}

function loadText() {
  try {
    const load = os.loadavg()

    return load
      .map(value => Number(value).toFixed(2))
      .join(' / ')
  } catch {
    return 'indisponível'
  }
}

function processInfo() {
  const mem = process.memoryUsage()

  return [
    `PID: ${process.pid}`,
    `Node: ${process.version}`,
    `RAM RSS: ${memoryMB()}`,
    `Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`,
    `CPU load: ${loadText()}`,
    `Uptime: ${uptimeText()}`
  ].join('\n')
}

function greeting() {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return 'Bom dia'
  }

  if (hour >= 12 && hour < 18) {
    return 'Boa tarde'
  }

  return 'Boa noite'
}

export function buildOwnerText(pushName = 'Dono') {

  return (
    `${greeting()}, ${pushName}! 👑\n\n` +

    `╭━━〔 👑 *KYARA OWNER OS* 〕━━╮\n` +
    `┃ 🔐 Acesso: OWNER\n` +
    `┃ ⚡ Online: ${uptimeText()}\n` +
    `┃ 🧠 RAM: ${memoryMB()}\n` +
    `┃ 💻 CPU: ${loadText()}\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +

    `Escolha uma categoria abaixo.\n\n` +

    `📊 *STATUS*\n` +
    `Sistema: ${process.version}\n` +
    `PID: ${process.pid}\n\n` +

    `🛡️ *PAINEL RESTRITO AO DONO*`
  )
}

export function buildOwnerRows() {

  return OWNER_COMMANDS.map(item => ({
    title: item.title,
    description: item.description,
    id: item.id
  }))

}

export function buildOwnerSections() {

  const rows = buildOwnerRows()

  return [
    {
      title: '👑 OWNER',
      rows: rows.slice(0, 7)
    },

    {
      title: '⚙️ SISTEMA',
      rows: rows.slice(7)
    }
  ]

}

export function buildOwnerButtons() {

  const sections =
    buildOwnerSections()

  return [
    {
      name: 'single_select',

      buttonParamsJson:
        JSON.stringify({
          title: '👑 PAINEL DO DONO',
          sections
        })
    }
  ]

}

export function getOwnerCommand(message) {

  try {

    const native =
      message
        ?.interactiveResponseMessage
        ?.nativeFlowResponseMessage

    if (native?.paramsJson) {

      const params =
        JSON.parse(native.paramsJson)

      return (
        params.id ||
        params.selectedId ||
        params.rowId ||
        null
      )

    }

    const list =
      message
        ?.listResponseMessage

    if (
      list
        ?.singleSelectReply
        ?.selectedRowId
    ) {

      return (
        list
          .singleSelectReply
          .selectedRowId
      )

    }

    const button =
      message
        ?.buttonsResponseMessage

    if (button?.selectedButtonId) {
      return button.selectedButtonId
    }

  } catch {}

  return null
}

export function getOwnerStatus() {

  return {
    owner: true,
    pid: process.pid,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    load: os.loadavg()
  }

}

export {
  OWNER_COMMANDS,
  OWNER_NUMBERS,
  processInfo
}
KYARA_OWNER_JS

echo "✅ menu-dono.js criado."
echo

echo "🔎 Validando módulo..."

if ! node --check "$OWNER"; then

  echo
  echo "❌ ERRO DE SINTAXE NO MENUDONO."
  echo "🔄 Restaurando backup..."

  rm -f "$OWNER"

  if [ -f "$OWNER.backup-menudono-$TS" ]; then
    mv "$OWNER.backup-menudono-$TS" "$OWNER"
  fi

  exit 1
fi

echo "✅ menu-dono.js está válido."
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️ O módulo foi instalado."
echo
echo "ℹ️ O index.js NÃO será sobrescrito automaticamente."
echo "ℹ️ Primeiro vamos localizar o handler /menudono."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

grep -nE "menudono|menuDono|menu-dono|case 'menu'" "$INDEX" | head -40 || true

echo
echo "📌 Instalação da base concluída."
echo
echo "Backup:"
echo "$INDEX.backup-menudono-$TS"
echo
echo "Módulo:"
echo "$OWNER"
echo

chmod +x instalar-menudono.sh

echo "✅ instalador-menudono.sh criado."
