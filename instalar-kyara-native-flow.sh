#!/bin/bash
set -e

ROOT="$(pwd)"

if [ ! -f "$ROOT/dados/src/index.js" ]; then
  echo "❌ Não encontrei: $ROOT/dados/src/index.js"
  echo "Entre na pasta BKkyara- antes de executar."
  exit 1
fi

SRC="$ROOT/dados/src"
NF="$SRC/core/nativeFlow"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$NF"

echo "╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮"
echo "┃ 👑 KYARA NATIVE FLOW INSTALL ┃"
echo "┃ Baileys 7.0.0-rc13          ┃"
echo "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯"
echo

echo "📦 Fazendo backup..."
cp "$SRC/index.js" "$SRC/index.js.backup-nativeflow-$STAMP"

if [ -f "$NF/native-flow.js" ]; then
  cp "$NF/native-flow.js" "$NF/native-flow.js.backup-$STAMP"
fi

if [ -f "$NF/owner-flow.js" ]; then
  cp "$NF/owner-flow.js" "$NF/owner-flow.js.backup-$STAMP"
fi

if [ -f "$NF/owner-flow-router.js" ]; then
  cp "$NF/owner-flow-router.js" "$NF/owner-flow-router.js.backup-$STAMP"
fi

if [ -f "$NF/kyara-flow-adapter.js" ]; then
  cp "$NF/kyara-flow-adapter.js" "$NF/kyara-flow-adapter.js.backup-$STAMP"
fi

echo "✅ Backup criado"
echo

cat > "$NF/native-flow.js" <<'JS'
import os from 'os'
import {
  proto,
  generateWAMessageFromContent
} from 'baileys'

/*
 * KYARA NATIVE FLOW CORE
 * Baileys 7.0.0-rc13
 */

export const json = value => JSON.stringify(value)

export function quickReply(displayText, id) {
  return {
    name: 'quick_reply',
    buttonParamsJson: json({
      display_text: displayText,
      id
    })
  }
}

export function copyButton(displayText, copyCode) {
  return {
    name: 'cta_copy',
    buttonParamsJson: json({
      display_text: displayText,
      copy_code: copyCode
    })
  }
}

export function urlButton(displayText, url) {
  return {
    name: 'cta_url',
    buttonParamsJson: json({
      display_text: displayText,
      url
    })
  }
}

export function row(title, description, id) {
  return {
    title,
    description,
    id
  }
}

export function singleSelect(title, sections) {
  return {
    name: 'single_select',
    buttonParamsJson: json({
      title,
      sections
    })
  }
}

export function progressBar(percent, size = 10) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0))
  const filled = Math.round((p / 100) * size)

  return (
    '█'.repeat(filled) +
    '░'.repeat(size - filled)
  )
}

export function getMetrics() {
  const memory = process.memoryUsage()
  const cpus = os.cpus()

  const totalMemory = os.totalmem()
  const usedMemory = memory.rss

  const ramPercent = totalMemory > 0
    ? (usedMemory / totalMemory) * 100
    : 0

  const load = os.loadavg?.()[0] ?? 0

  return {
    uptime: Math.floor(process.uptime()),
    rss: (memory.rss / 1024 / 1024).toFixed(1),
    heap: (memory.heapUsed / 1024 / 1024).toFixed(1),
    totalRam: (totalMemory / 1024 / 1024 / 1024).toFixed(1),
    ramPercent: ramPercent.toFixed(1),
    cpuCores: cpus.length,
    load: Number(load).toFixed(2),
    node: process.version,
    pid: process.pid
  }
}

export function buildInteractive({
  text,
  footer = '👑 KYARA OWNER OS',
  headerTitle = '👑 KYARA OWNER OS',
  buttons = []
}) {
  const InteractiveMessage =
    proto.Message.InteractiveMessage

  return InteractiveMessage.create({
    body: InteractiveMessage.Body.create({
      text
    }),

    footer: InteractiveMessage.Footer.create({
      text: footer
    }),

    header: InteractiveMessage.Header.create({
      title: headerTitle,
      hasMediaAttachment: false
    }),

    nativeFlowMessage:
      InteractiveMessage.NativeFlowMessage.create({
        buttons
      })
  })
}

export async function sendFlow(
  Kyara,
  jid,
  {
    text,
    footer,
    headerTitle,
    buttons = []
  }
) {
  const interactive = buildInteractive({
    text,
    footer,
    headerTitle,
    buttons
  })

  const msg = generateWAMessageFromContent(
    jid,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: interactive
        }
      }
    },
    {
      userJid: jid
    }
  )

  await Kyara.relayMessage(
    jid,
    msg.message,
    {
      messageId: msg.key.id
    }
  )

  return msg
}
JS

cat > "$NF/owner-flow.js" <<'JS'
import {
  sendFlow,
  singleSelect,
  quickReply,
  copyButton,
  row,
  progressBar,
  getMetrics
} from './native-flow.js'

export const OWNER_CATEGORIES = [
  ['config', '🤖 Configurações do Bot', 'Prefixo, nome, mídia e configurações'],
  ['personality', '🧠 Personalidade da Assistente', 'Personalidade e perfis'],
  ['design', '🎨 Design & Aparência', 'Bordas, títulos e aparência'],
  ['automation', '⚙️ Sistema & Automação', 'Automação, reações e preferências'],
  ['commands', '🛠️ Personalização de Comandos', 'Comandos, aliases e blacklist'],
  ['limits', '🚫 Limitação de Comandos', 'Limites de utilização'],
  ['users', '👥 Gerenciamento de Usuários', 'Sub-donos, premium e bloqueios'],
  ['rental', '💰 Sistema de Aluguel', 'Aluguel, códigos e divulgação'],
  ['subbots', '🤖 Gerenciamento de Sub-Bots', 'Sub-bots da Kyara'],
  ['vip', '💎 Sistema VIP / Premium', 'Comandos e recursos VIP'],
  ['control', '⚡ Controle & Manutenção', 'Controle operacional'],
  ['monitoring', '📊 Monitoramento & Análise', 'AntiPV, logs e manutenção'],
  ['broadcast', '📡 Transmissões', 'TM e divulgação']
]

export const OWNER_COMMANDS = {
  config: [
    'prefixo',
    'numerodono',
    'nomedono',
    'nomebot',
    'configcmdnotfound',
    'setcmdmsg',
    'fotobot',
    'fotomenu',
    'videomenu',
    'audiomenu',
    'lermais',
    'personalizargrupo'
  ],

  personality: [
    'setpersonalidade',
    'criarpers',
    'novapers'
  ],

  design: [
    'designmenu',
    'setborda',
    'setbordafim',
    'setbordameio',
    'setitem',
    'setseparador',
    'settitulo',
    'setheader',
    'resetdesign'
  ],

  automation: [
    'addauto',
    'addautomidia',
    'listauto',
    'delauto',
    'addreact',
    'listreact',
    'delreact',
    'addnopref',
    'listnopref',
    'delnopref'
  ],

  commands: [
    'addcmd',
    'addcmdmidia',
    'listcmd',
    'delcmd',
    'testcmd',
    'addcmd-subdono',
    'removecmd-subdono',
    'listcmd-subdono',
    'addalias',
    'listalias',
    'delalias',
    'addblackglobal',
    'listblackglobal',
    'rmblackglobal'
  ],

  limits: [
    'cmdlimitar',
    'cmddeslimitar',
    'cmdlimites'
  ],

  users: [
    'addsubdono',
    'delsubdono',
    'listasubdonos',
    'addpremium',
    'delpremium',
    'listprem',
    'resetgold',
    'addindicacao',
    'topindica',
    'delindicacao',
    'bangp',
    'unbangp',
    'listbangp'
  ],

  rental: [
    'modoaluguel',
    'addaluguel',
    'gerarcod',
    'listaraluguel',
    'infoaluguel',
    'estenderaluguel',
    'removeraluguel',
    'listaluguel',
    'limparaluguel',
    'dayfree',
    'setdiv',
    'divulgar'
  ],

  subbots: [
    'addsubbot',
    'removesubbot',
    'listarsubbots',
    'conectarsubbot',
    'gerarcodigo'
  ],

  vip: [
    'addcmdvip',
    'removecmdvip',
    'listcmdvip',
    'togglecmdvip',
    'statsvip',
    'menuvip',
    'infovip'
  ],

  control: [
    'atualizar',
    'reiniciar',
    'entrar',
    'sairgp',
    'seradm',
    'sermembro',
    'blockcmdg',
    'unblockcmdg',
    'blockuserg',
    'unblockuserg',
    'listblocks',
    'antibanmarcar'
  ],

  monitoring: [
    'listagp',
    'antipv',
    'antipv2',
    'antipv3',
    'antipv4',
    'antipvmsg',
    'antispamcmd',
    'viewmsg',
    'cases',
    'getcase',
    'modoliteglobal',
    'iaclear',
    'limpardb',
    'limparrankg',
    'reviverqr',
    'nuke',
    'msgprefix'
  ],

  broadcast: [
    'tm',
    'tm2',
    'statustm',
    'inscrevertm',
    'divdono add',
    'divdono rem',
    'divdono list',
    'divdono msg',
    'divdono send',
    'divdono time',
    'divdono status'
  ]
}

function categoryObject(id) {
  const found = OWNER_CATEGORIES.find(
    item => item[0] === id
  )

  if (!found) return null

  return {
    id: found[0],
    title: found[1],
    description: found[2]
  }
}

export async function sendOwnerMain(
  Kyara,
  jid,
  {
    botName = 'KYARA',
    userName = 'Dono',
    prefix = '.',
    ownerId = null
  } = {}
) {
  const m = getMetrics()

  const text =
`╭━━━〔 👑 ${botName} OWNER OS 〕
┃
┃ 👤 ${userName}
┃ 🔐 Acesso: OWNER
┃ 🤖 Bot: ${botName}
┃ 🟢 Estado: ONLINE
┃
┃ 📊 *LIVE METRICS*
┃ 💻 CPU: ${m.cpuCores} cores
┃ ⚙️ Load: ${m.load}
┃ 🧠 RAM: ${m.rss} MB
┃ 📦 Heap: ${m.heap} MB
┃ 📈 RAM: [${progressBar(m.ramPercent)}] ${m.ramPercent}%
┃ ⏱️ Uptime: ${m.uptime}s
┃ 🟦 Node: ${m.node}
┃ 🆔 PID: ${m.pid}
┃
┃ 🛡️ *PAINEL RESTRITO AO DONO*
╰━━━━━━━━━━━━━━━━━━━━━━╯

Escolha uma categoria abaixo.`

  const sections = [
    {
      title: '📂 PAINEL KYARA',
      rows: OWNER_CATEGORIES.map(
        ([id, title, description]) =>
          row(
            title,
            description,
            `owner:open:${id}`
          )
      )
    }
  ]

  const buttons = [
    singleSelect(
      '📂 ABRIR PAINEL OS',
      sections
    ),

    quickReply(
      '🔄 Reiniciar Sistema',
      'owner:cmd:reiniciar'
    ),

    quickReply(
      '📈 Ver Logs',
      'owner:cmd:viewmsg'
    )
  ]

  if (ownerId) {
    buttons.push(
      copyButton(
        '📋 Copiar ID do Dono',
        ownerId
      )
    )
  }

  return sendFlow(
    Kyara,
    jid,
    {
      text,
      footer: `👑 ${botName} OWNER OS • Native Flow`,
      headerTitle: `👑 ${botName} OWNER OS`,
      buttons
    }
  )
}

export async function sendOwnerCategory(
  Kyara,
  jid,
  category,
  {
    botName = 'KYARA',
    prefix = '.'
  } = {}
) {
  const cat = categoryObject(category)

  if (!cat) {
    return false
  }

  const commands =
    OWNER_COMMANDS[category] || []

  const rows = commands.map(
    command =>
      row(
        `/${command}`,
        `Executar ${prefix}${command}`,
        `owner:cmd:${command}`
      )
  )

  const text =
`╭━━━〔 👑 ${botName} OWNER OS 〕
┃
┃ ${cat.title}
┃ ${cat.description}
┃
┃ 📦 ${commands.length} comandos
╰━━━━━━━━━━━━━━━━━━━━━━╯

Selecione um comando:`

  return sendFlow(
    Kyara,
    jid,
    {
      text,
      footer: `👑 ${botName} • ${cat.title}`,
      headerTitle: cat.title,
      buttons: [
        singleSelect(
          `📂 ${cat.title}`,
          [
            {
              title: cat.title,
              rows
            }
          ]
        ),

        quickReply(
          '⬅️ Voltar',
          'owner:back:main'
        )
      ]
    }
  )
}
JS

cat > "$NF/owner-flow-router.js" <<'JS'
import {
  sendOwnerMain,
  sendOwnerCategory,
  OWNER_COMMANDS
} from './owner-flow.js'

function parseParams(paramsJson) {
  if (!paramsJson) return null

  try {
    const parsed = JSON.parse(paramsJson)

    return {
      ...parsed,
      id:
        parsed.id ??
        parsed.selectedId ??
        parsed.rowId ??
        null
    }
  } catch {
    return null
  }
}

export function extractId(message) {
  if (!message) return null

  /*
   * Native Flow novo
   */
  const native =
    message.nativeFlowResponseMessage

  if (native) {
    const params =
      parseParams(native.paramsJson)

    if (params?.id) {
      return params.id
    }
  }

  /*
   * Interactive Response
   */
  const interactive =
    message.interactiveResponseMessage

  if (interactive) {
    const nested =
      interactive.nativeFlowResponseMessage

    if (nested) {
      const params =
        parseParams(nested.paramsJson)

      if (params?.id) {
        return params.id
      }
    }

    const params =
      parseParams(interactive.body)

    if (params?.id) {
      return params.id
    }
  }

  /*
   * Lista antiga / compatibilidade
   */
  const list =
    message.listResponseMessage

  if (
    list?.singleSelectReply?.selectedRowId
  ) {
    return list.singleSelectReply.selectedRowId
  }

  /*
   * Botões antigos / compatibilidade
   */
  const buttons =
    message.buttonsResponseMessage

  if (buttons?.selectedButtonId) {
    return buttons.selectedButtonId
  }

  /*
   * Texto de teste
   */
  const text =
    message.conversation ??
    message.extendedTextMessage?.text ??
    ''

  if (
    typeof text === 'string' &&
    text.trim().startsWith('owner:')
  ) {
    return text.trim()
  }

  return null
}

export function isOwnerFlowId(id) {
  return (
    typeof id === 'string' &&
    id.startsWith('owner:')
  )
}

export async function routeOwnerFlow({
  Kyara,
  jid,
  id,
  prefix = '.',
  botName = 'KYARA',
  userName = 'Dono',
  ownerId = null,
  executeCommand
}) {
  if (!isOwnerFlowId(id)) {
    return false
  }

  console.log(
    `[KYARA NATIVE FLOW] ${id}`
  )

  /*
   * VOLTAR
   */
  if (id === 'owner:back:main') {
    await sendOwnerMain(
      Kyara,
      jid,
      {
        botName,
        userName,
        prefix,
        ownerId
      }
    )

    return true
  }

  /*
   * ABRIR CATEGORIA
   */
  if (id.startsWith('owner:open:')) {
    const category =
      id.slice('owner:open:'.length)

    if (!OWNER_COMMANDS[category]) {
      console.warn(
        `[KYARA FLOW] Categoria inválida: ${category}`
      )

      return false
    }

    await sendOwnerCategory(
      Kyara,
      jid,
      category,
      {
        botName,
        prefix
      }
    )

    return true
  }

  /*
   * COMANDO
   */
  if (id.startsWith('owner:cmd:')) {
    const command =
      id.slice('owner:cmd:'.length)

    if (!command) {
      return false
    }

    if (typeof executeCommand === 'function') {
      await executeCommand(
        command,
        {
          Kyara,
          jid,
          prefix,
          userName
        }
      )

      return true
    }

    /*
     * Sem ponte de execução ainda:
     * apenas informa o comando.
     */
    await Kyara.sendMessage(
      jid,
      {
        text:
          `⚙️ Comando selecionado:\n\n` +
          `${prefix}${command}\n\n` +
          `O Native Flow recebeu o clique corretamente.`
      }
    )

    return true
  }

  return false
}
JS

cat > "$NF/kyara-flow-adapter.js" <<'JS'
import {
  extractId,
  routeOwnerFlow
} from './owner-flow-router.js'

/*
 * Adapter independente.
 *
 * NÃO força isOwner = true.
 * A autorização deve ser fornecida pelo index.js.
 */

export function createKyaraFlowAdapter({
  Kyara,
  isOwner,
  getPrefix = () => '.',
  getBotName = () => 'KYARA',
  getOwnerId = () => null,
  executeCommand = null
}) {
  if (!Kyara) {
    throw new Error(
      'createKyaraFlowAdapter: Kyara não foi fornecida'
    )
  }

  return async function handleKyaraFlow(update) {
    const messages =
      update?.messages || []

    for (const message of messages) {
      if (!message?.message) continue

      if (message.key?.fromMe) {
        continue
      }

      const jid =
        message.key?.remoteJid

      if (!jid) continue

      const id =
        extractId(message.message)

      if (!id) continue

      if (!id.startsWith('owner:')) {
        continue
      }

      /*
       * Segurança:
       * o clique não concede privilégio.
       */
      let owner = false

      try {
        owner =
          typeof isOwner === 'function'
            ? await isOwner(message, jid)
            : false
      } catch (error) {
        console.error(
          '[KYARA FLOW] erro verificando owner:',
          error
        )
      }

      if (!owner) {
        await Kyara.sendMessage(
          jid,
          {
            text:
              '⛔ *ACESSO NEGADO*\n\n' +
              'Este painel é exclusivo do proprietário.'
          }
        )

        continue
      }

      await routeOwnerFlow({
        Kyara,
        jid,
        id,
        prefix: getPrefix(message),
        botName: getBotName(message),
        userName:
          message.pushName || 'Dono',
        ownerId:
          getOwnerId(message),
        executeCommand
      })
    }
  }
}

export function installKyaraFlowAdapter(options) {
  const handler =
    createKyaraFlowAdapter(options)

  options.Kyara.ev.on(
    'messages.upsert',
    handler
  )

  console.log(
    '✅ KYARA NATIVE FLOW ADAPTER ATIVO'
  )

  return handler
}
JS

echo "🧪 Validando módulos..."

node --check "$NF/native-flow.js"
echo "  ✅ native-flow.js"

node --check "$NF/owner-flow.js"
echo "  ✅ owner-flow.js"

node --check "$NF/owner-flow-router.js"
echo "  ✅ owner-flow-router.js"

node --check "$NF/kyara-flow-adapter.js"
echo "  ✅ kyara-flow-adapter.js"

echo
echo "🧪 Testando importação..."

node --input-type=module <<'TEST'
const native = await import(
  './dados/src/core/nativeFlow/native-flow.js'
)

const owner = await import(
  './dados/src/core/nativeFlow/owner-flow.js'
)

const router = await import(
  './dados/src/core/nativeFlow/owner-flow-router.js'
)

console.log('===== KYARA NATIVE FLOW TEST =====')

console.log(
  'progressBar:',
  native.progressBar(54)
)

console.log(
  'categorias:',
  owner.OWNER_CATEGORIES.length
)

console.log(
  'comandos:',
  Object.values(owner.OWNER_COMMANDS)
    .reduce((a, b) => a + b.length, 0)
)

const ids = [
  'owner:open:config',
  'owner:open:monitoring',
  'owner:cmd:antispamcmd',
  'owner:cmd:reiniciar',
  'owner:back:main'
]

for (const id of ids) {
  console.log(
    id,
    '=>',
    router.isOwnerFlowId(id)
  )
}

console.log(
  'extract texto:',
  router.extractId({
    conversation: 'owner:cmd:antispamcmd'
  })
)

console.log('=================================')
TEST

echo
echo "============================================"
echo "👑 KYARA NATIVE FLOW PREPARADO"
echo "============================================"
echo
echo "Arquivos:"
echo "  $NF/native-flow.js"
echo "  $NF/owner-flow.js"
echo "  $NF/owner-flow-router.js"
echo "  $NF/kyara-flow-adapter.js"
echo
echo "Backup:"
echo "  $SRC/index.js.backup-nativeflow-$STAMP"
echo
echo "⚠️ O index.js NÃO foi sobrescrito."
echo "Isso evita quebrar o dispatcher atual da Kyara."
echo
echo "Próximo passo:"
echo "integrar o adapter no dispatcher existente."
echo
