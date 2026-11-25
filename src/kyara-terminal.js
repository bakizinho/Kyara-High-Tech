/**
 * ================================================================
 *                         KYARA TERMINAL
 *                    Console normal / limpo
 * ================================================================
 *
 * Exibe somente:
 *
 *   MSG  = mensagem recebida
 *   BOT  = mensagem enviada pelo bot
 *   CMD  = comando executado
 *   ERR  = erro
 *
 * NÃO possui:
 *   - modo WhatsApp
 *   - lista de conversas
 *   - painel de chats
 *   - wallpaper
 *   - redraw
 *   - seleção de conversa
 *   - interface gráfica
 *
 * O socket Baileys continua sendo responsabilidade do connect.js.
 */

import readline from 'node:readline';
import { format as nodeFormat } from 'node:util';

let started = false;
let connected = false;
let rl = null;

let commandExecutor = null;
let messageExecutor = null;

const commandConfig = {
  prefix: '#',
  defaultJid: null,
  defaultName: 'Dono',
  getPrefix: null
};

const listeners = new Map();

const nativeConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console)
};

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  gray: '\x1b[90m',
  white: '\x1b[97m',
  cyan: '\x1b[96m',
  green: '\x1b[92m',
  yellow: '\x1b[93m',
  red: '\x1b[91m',
  magenta: '\x1b[95m'
};

function paint(value, color = C.white) {
  return `${color}${value}${C.reset}`;
}

function clean(value) {
  return String(value ?? '')
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\r/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

function time() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour12: false
  });
}

function jidNumber(jid) {
  return String(jid || '')
    .split('@')[0]
    .split(':')[0];
}

function unwrap(message) {
  let value = message || {};

  for (let i = 0; i < 8; i++) {
    const keys = [
      'ephemeralMessage',
      'viewOnceMessage',
      'viewOnceMessageV2',
      'viewOnceMessageV2Extension',
      'documentWithCaptionMessage'
    ];

    const key = keys.find(k => value?.[k]?.message);

    if (!key) break;

    value = value[key].message;
  }

  return value || {};
}

function extractMessageText(info) {
  const msg = unwrap(info?.message);

  return String(
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.messageContextInfo?.body?.text ||
    msg.messageContextInfo?.nativeFlowResponseMessage?.name ||
    ''
  ).trim();
}

function extractMessageType(info) {
  const msg = unwrap(info?.message);

  return Object.keys(msg)[0] || 'unknown';
}

function mediaLabel(type) {
  return {
    imageMessage: '📷 Foto',
    videoMessage: '🎥 Vídeo',
    audioMessage: '🎵 Áudio',
    stickerMessage: '🎨 Figurinha',
    documentMessage: '📄 Documento',
    contactMessage: '👤 Contato',
    locationMessage: '📍 Localização',
    messageContextInfo: '🧩 Interativo',
    interactiveMessage: '🧩 Interativo',
    interactiveResponseMessage: '🧩 Interativo'
  }[type] || `[${type}]`;
}

function printLine(type, user, text, color = C.white) {
  let who = clean(user) || 'desconhecido';

  if (who.length > 28) {
    who = `${who.slice(0, 27)}…`;
  }

  let body = clean(text);

  if (!body) return;

  const max = Math.max(
    30,
    (process.stdout.columns || 80) - 30
  );

  if (body.length > max) {
    body = `${body.slice(0, max - 1)}…`;
  }

  nativeConsole.log(
    `  ${paint(time(), C.gray)} ` +
    `${paint(type, color)} ` +
    `${paint(who, C.bold + C.white)} ` +
    `${paint('›', C.gray)} ` +
    `${paint(body, C.white)}`
  );
}

function formatBytes(bytes) {
  const value = Number(bytes || 0)

  if (!value) return '0 MB'

  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function formatUptime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)))

  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  const parts = []

  if (days) parts.push(`${days}d`)
  if (hours || days) parts.push(`${hours}h`)
  if (minutes || hours || days) parts.push(`${minutes}m`)

  parts.push(`${secs}s`)

  return parts.join(' ')
}


function kyaraTerminalOneLine(value, fallback = '') {
  return String(value ?? fallback)
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\t+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}


function kyaraTerminalCompactText(value, maxLength = 70) {
  let text = String(value ?? '')
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\t+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (text.length > maxLength) {
    text = text.slice(0, Math.max(0, maxLength - 1)) + '…'
  }

  return text
}

function printHeader() {
  const memory = process.memoryUsage()
  const width = Math.min(
    Math.max(process.stdout.columns || 80, 60),
    88
  )

  const line = '━'.repeat(width - 2)

  nativeConsole.log('')
  nativeConsole.log(
    paint(`╭${line}╮`, C.magenta)
  )

  nativeConsole.log(
    `${paint('│', C.magenta)} ` +
    paint(
      '🌸 KYARA OS  •  TERMINAL',
      C.bold + C.white
    )
  )

  nativeConsole.log(
    `${paint('│', C.magenta)} ` +
    paint(
      '────────────────────────────────────────',
      C.gray
    )
  )

  nativeConsole.log(
    `${paint('│', C.magenta)} ` +
    `${paint('🟢 CORE', C.green)} ` +
    `${paint('ONLINE', C.bold + C.green)}   ` +
    `${paint('⚡ NODE', C.cyan)} ` +
    `${paint(process.version, C.white)}   ` +
    `${paint('📱', C.white)} ${paint(process.platform, C.white)}`
  )

  nativeConsole.log(
    `${paint('│', C.magenta)} ` +
    `${paint('📡 SESSION', C.cyan)} ` +
    `${paint(connected ? 'CONNECTED' : 'STARTING', connected ? C.green : C.yellow)}   ` +
    `${paint('💾 RAM', C.cyan)} ` +
    `${paint(formatBytes(memory.rss), C.white)}   ` +
    `${paint('⏱️', C.white)} ` +
    `${paint(formatUptime(process.uptime()), C.white)}`
  )

  nativeConsole.log(
    `${paint('│', C.magenta)} ` +
    `${paint('🧠 HEAP', C.cyan)} ` +
    `${paint(formatBytes(memory.heapUsed), C.white)}   ` +
    `${paint('🆔 PID', C.cyan)} ` +
    `${paint(String(process.pid), C.white)}`
  )

  nativeConsole.log(
    paint(`╰${line}╯`, C.magenta)
  )

  nativeConsole.log('')
}


function printError(message) {
  const text = clean(message);

  if (!text) return;

  nativeConsole.error(
    `  ${paint(time(), C.gray)} ` +
    `${paint('ERR', C.red)} ` +
    `${paint('›', C.gray)} ` +
    `${paint(text, C.red)}`
  );
}

function printCommand(data = {}) {
  const command =
    clean(data.command) ||
    clean(data.content);

  if (!command) return;

  const user =
    clean(data.user) ||
    clean(data.group) ||
    'sistema';

  printLine(
    'CMD',
    user,
    command,
    C.cyan
  );
}

function printIncoming(info) {
  const jid = info?.key?.remoteJid;

  if (!jid || jid === 'status@broadcast') {
    return;
  }

  const type = extractMessageType(info);
  const text = extractMessageText(info);

  const sender =
    clean(info?.pushName) ||
    jidNumber(
      info?.key?.participantPn ||
      info?.key?.participant ||
      jid
    );

  printLine(
    'MSG',
    sender,
    text || mediaLabel(type),
    C.green
  );
}

function printOutgoing(data = {}) {
  const jid = data?.jid || '';
  const content = data?.content || {};

  const text =
    content?.text ||
    content?.caption ||
    (content?.image ? '📷 Foto' : '') ||
    (content?.video ? '🎥 Vídeo' : '') ||
    (content?.audio ? '🎵 Áudio' : '') ||
    (content?.sticker ? '🎨 Figurinha' : '') ||
    '';

  if (!text) return;

  printLine(
    'BOT',
    jidNumber(jid) || 'Kyara',
    text,
    C.magenta
  );
}

function event(type, data = {}) {
  if (type === 'connected') {
    connected = true;
    emit(type, data);
    return;
  }

  if (
    type === 'connecting' ||
    type === 'reconnecting'
  ) {
    connected = false;
    emit(type, data);
    return;
  }

  if (
    type === 'incoming' ||
    type === 'message'
  ) {
    if (data?.info) {
      printIncoming(data.info);
    }

    emit('message', data);
    return;
  }

  if (type === 'outgoing') {
    printOutgoing(data);
    emit(type, data);
    return;
  }

  if (type === 'command') {
    printCommand(data);
    emit(type, data);
    return;
  }

  if (type === 'error') {
    const message =
      data?.message ||
      data?.error?.message ||
      data?.stack ||
      data;

    printError(message);
    emit(type, data);
    return;
  }

  emit(type, data);
}

function on(type, fn) {
  if (typeof fn === 'function') {
    listeners.set(type, fn);
  }
}

function emit(type, data) {
  const fn = listeners.get(type);

  if (typeof fn !== 'function') {
    return;
  }

  try {
    fn(data);
  } catch (error) {
    nativeConsole.error(
      `[KYARA TERMINAL LISTENER] ${
        error?.message || error
      }`
    );
  }
}

function configureCommandExecutor(config = {}) {
  commandExecutor =
    typeof config.execute === 'function'
      ? config.execute
      : null;

  Object.assign(
    commandConfig,
    config,
    {
      prefix: String(
        config.prefix ||
        commandConfig.prefix ||
        '#'
      )
    }
  );
}

function configureMessageExecutor(fn) {
  messageExecutor =
    typeof fn === 'function'
      ? fn
      : null;
}

function effectivePrefix(jid) {
  try {
    if (
      typeof commandConfig.getPrefix === 'function'
    ) {
      return String(
        commandConfig.getPrefix(jid) ||
        commandConfig.prefix ||
        '#'
      );
    }

    return String(
      commandConfig.prefix ||
      '#'
    );
  } catch {
    return '#';
  }
}

async function executeBotCommand(text) {
  if (!commandExecutor) {
    throw new Error(
      'Executor de comandos ainda não foi conectado ao terminal.'
    );
  }

  let command = String(text || '').trim();

  if (!command) {
    return null;
  }

  const prefix = effectivePrefix(
    commandConfig.defaultJid
  );

  if (
    !command.startsWith(prefix) &&
    !command.startsWith(':')
  ) {
    command =
      prefix +
      command.replace(/^[.#/!]+/, '');
  }

  event('command', {
    command,
    user: commandConfig.defaultName,
    group: commandConfig.defaultJid
  });

  try {
    return await commandExecutor({
      jid: commandConfig.defaultJid,
      text: command
    });
  } catch (error) {
    event('error', {
      message:
        `[${command}] ${
          error?.message || error
        }`
    });

    throw error;
  }
}

/*
 * Compatibilidade interna.
 *
 * O projeto ainda pode chamar setWhatsAppSocket().
 * Isso NÃO ativa interface, chat ou modo WhatsApp.
 */
function setWhatsAppSocket(newSock) {
  if (newSock) {
    connected = true;
  }
}

function attachWhatsAppSocket(newSock) {
  setWhatsAppSocket(newSock);
}

function installConsoleErrorBridge() {
  if (console.__kyaraCleanTerminalBridge) {
    return;
  }

  const originalError =
    nativeConsole.error;

  console.error = (...args) => {
    const message = clean(
      nodeFormat(...args)
    );

    if (started) {
      printError(message);
    } else {
      originalError(...args);
    }
  };

  Object.defineProperty(
    console,
    '__kyaraCleanTerminalBridge',
    {
      value: true,
      configurable: false,
      enumerable: false
    }
  );
}

function start() {
  if (started) {
    return;
  }

  started = true;

  installConsoleErrorBridge();

  printHeader();

  if (
    process.stdin?.isTTY &&
    !rl
  ) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: paint(
        '🌸 kyara › ',
        C.magenta
      ),
      terminal: true
    });

    rl.on('line', async line => {
      const text =
        String(line || '').trim();

      if (!text) {
        rl.prompt();
        return;
      }

      try {
        await executeBotCommand(text);
      } catch {
        /*
         * O erro já foi mostrado pelo
         * event('error').
         */
      }

      rl.prompt();
    });

    rl.on('close', () => {
      rl = null;
    });

    rl.prompt();
  }
}

function stop() {
  started = false;

  if (rl) {
    try {
      rl.close();
    } catch {}

    rl = null;
  }
}

function render() {
  /*
   * Compatibilidade.
   *
   * Não redesenha a tela.
   * Não limpa o terminal.
   * Não abre interface.
   */
}

function incomingMessage(info) {
  event('incoming', { info });
}

export {
  event,
  on,
  render,
  start,
  stop,
  incomingMessage,
  configureCommandExecutor,
  configureMessageExecutor,
  setWhatsAppSocket,
  attachWhatsAppSocket
};

export default {
  event,
  on,
  render,
  start,
  stop,
  incomingMessage,
  configureCommandExecutor,
  configureMessageExecutor,
  setWhatsAppSocket,
  attachWhatsAppSocket
};
