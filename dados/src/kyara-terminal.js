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
let showProcessLogs = false;
let rl = null;
let terminalInputBusy = false;
let lastCommandKey = "";
let lastCommandAt = 0;

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
  blue: '\x1b[38;2;55;135;255m',
  cyan: '\x1b[38;2;65;205;255m',
  green: '\x1b[38;2;80;210;155m',
  yellow: '\x1b[38;2;245;195;85m',
  red: '\x1b[38;2;250;105;115m',
  white: '\x1b[38;2;235;242;255m',
  gray: '\x1b[38;2;135;155;185m',
  magenta: '\x1b[38;2;55;135;255m'
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
    timeZone: 'America/Fortaleza',
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
    interactiveResponseMessage: '🧩 Interativo',
    reactionMessage: '↩️ Reação',
    pollCreationMessage: '📊 Enquete',
    pollUpdateMessage: '📊 Voto'
  }[type] || `[${type}]`;
}

function writeTerminalLine(line) {
  const redrawPrompt = Boolean(
    rl &&
    process.stdin?.isTTY &&
    !terminalInputBusy
  );

  if (redrawPrompt) {
    try {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
    } catch {}
  }

  nativeConsole.log(line);

  if (redrawPrompt && rl) {
    try { rl.prompt(true); } catch {}
  }
}

function printLine(type, user, text, color = C.white) {
  const who = kyaraTerminalCompactText(
    clean(user) || 'sistema',
    22
  );

  const body = kyaraTerminalCompactText(
    text,
    Math.max(28, (process.stdout.columns || 80) - 38)
  );

  if (!body) return;

  const tag = String(type || 'SYS')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, ' ');

  writeTerminalLine(
    `  ${paint(time(), C.gray)}  ` +
    `${paint(tag, color)}  ` +
    `${paint(who, C.bold + C.white)}  ` +
    `${paint('—', C.blue)}  ` +
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
      '🌸 KYARA-SYSTΞM  •  TERMINAL',
      C.bold + C.white
    )
  )

  nativeConsole.log(
    `${paint('│', C.magenta)} ` +
    paint(
      'AUTOMAÇÃO  •  WHATSAPP  •  VØX CORE',
      C.cyan
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
  printLine('ERR', 'SISTEMA', text, C.red);
}

function printCommand(data = {}) {
  const command = clean(data.command) || clean(data.content);
  if (!command) return;

  const user = clean(data.user) || clean(data.group) || 'WhatsApp';
  const key = `${user.toLowerCase()}|${command.toLowerCase()}`;
  const now = Date.now();

  // Evita imprimir duas vezes o mesmo evento recebido pelo Baileys.
  if (key === lastCommandKey && now - lastCommandAt < 2500) return;

  lastCommandKey = key;
  lastCommandAt = now;

  printLine('CMD', user, command, C.cyan);
}

function printIncoming(info) {
  const jid = info?.key?.remoteJid;
  if (!jid || jid === 'status@broadcast') return;

  const type = extractMessageType(info);

  // Eventos internos do protocolo não são mensagens de usuário.
  if ([
    'protocolMessage',
    'senderKeyDistributionMessage',
    'messageContextInfo'
  ].includes(type)) return;

  const text = extractMessageText(info);
  const label = text || mediaLabel(type);

  if (!label || label === '[unknown]' || label === '[protocolMessage]') {
    return;
  }

  const sender = clean(info?.pushName) || jidNumber(
    info?.key?.participantPn || info?.key?.participant || jid
  );

  printLine('MSG', sender, label, C.green);
}

function printOutgoing(data = {}) {
  const jid = String(data?.jid || '');
  const content = data?.content || {};

  const text =
    content?.text ||
    content?.caption ||
    (content?.image ? '📷 Foto' : '') ||
    (content?.video ? '🎥 Vídeo' : '') ||
    (content?.audio ? '🎵 Áudio' : '') ||
    (content?.sticker ? '🎨 Figurinha' : '') ||
    (content?.document ? `📄 Documento ${content?.fileName || ''}` : '') ||
    (content?.contact ? '👤 Contato' : '') ||
    (content?.location ? '📍 Localização' : '') ||
    '';

  if (!text) return;

  const destination = jid.endsWith('@g.us')
    ? 'GRUPO'
    : jid.endsWith('@newsletter')
      ? 'CANAL'
      : jid === 'status@broadcast'
        ? 'STATUS'
        : 'CONTATO';

  // Não exibe IDs longos de WhatsApp no terminal.
  printLine('BOT', 'KYARA', `${destination} · ${text}`, C.blue);
}

function event(type, data = {}) {
  if (type === 'connected') {
    connected = true;
    printLine('SYS', 'WHATSAPP', 'KYARA-SYSTΞM conectada • pronta para receber mensagens', C.green);
    emit(type, data);
    return;
  }

  if (type === 'connecting' || type === 'reconnecting') {
    connected = false;
    printLine(
      'SYS',
      'WHATSAPP',
      type === 'connecting' ? 'Abrindo conexão segura…' : 'Conexão interrompida • verificando recuperação…',
      C.yellow
    );
    emit(type, data);
    return;
  }

  if (type === 'incoming' || type === 'message') {
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

  try {
    terminalInputBusy = true;
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
  } finally {
    terminalInputBusy = false;
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
  if (console.__kyaraCleanTerminalBridge) return;

  let panelLinesRemaining = 0;

  for (const method of ['log', 'info', 'warn', 'debug']) {
    console[method] = (...args) => {
      const message = clean(nodeFormat(...args));

      const startsPanel =
        /💬\s*MENSAGEM(?:\s|$)/u.test(message);

      const isPanelLine =
        /💬\s*MENSAGEM|👤\s*Usuário:|📱\s*Número:|📦\s*Tipo:|🕒\s*Hora:|📎\s*Texto:/u.test(message);

      const expectedMissingImage =
        /imagem ignorada.*status code 404/i.test(message);

      const looksLikeError =
        !expectedMissingImage &&
        /erro|error|falha|failed|exception|rejected|denied|status code [45]\d\d|ECONN|ETIMEDOUT|EPROTO/i.test(message);

      if (
        showProcessLogs ||
        isPanelLine ||
        panelLinesRemaining > 0 ||
        looksLikeError
      ) {
        nativeConsole[method](...args);
      }

      if (startsPanel && !message.includes('\n')) {
        panelLinesRemaining = 12;
      } else if (panelLinesRemaining > 0) {
        panelLinesRemaining--;
      }
    };
  }

  const originalError = nativeConsole.error;

  console.error = (...args) => {
    const message = clean(nodeFormat(...args));
    if (started) printError(message);
    else originalError(...args);
  };

  Object.defineProperty(console, '__kyaraCleanTerminalBridge', {
    value: true,
    configurable: false,
    enumerable: false
  });
}

function printHelp() {
  nativeConsole.log('');
  nativeConsole.log(paint('  KYARA-SYSTΞM • COMANDOS', C.bold + C.magenta));
  nativeConsole.log('  ' + paint('ping', C.cyan) + '       Executa #ping no WhatsApp');
  nativeConsole.log('  ' + paint('#menu', C.cyan) + '       Executa qualquer comando com prefixo');
  nativeConsole.log('  ' + paint('logs on', C.cyan) + '    Mostra logs internos');
  nativeConsole.log('  ' + paint('logs off', C.cyan) + '   Oculta logs internos');
  nativeConsole.log('  ' + paint('logs status', C.cyan) + ' Consulta o estado dos logs');
  nativeConsole.log('  ' + paint('status', C.cyan) + '     Mostra o estado da conexão');
  nativeConsole.log('  ' + paint('clear', C.cyan) + '      Limpa a tela');
  nativeConsole.log('  ' + paint('help', C.cyan) + '       Mostra esta ajuda');
  nativeConsole.log('');
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
      prompt: paint('VØX $ ', C.blue),
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
        if (/^(?:help|ajuda|\?)$/i.test(text)) {
          printHelp();
          rl.prompt();
          return;
        }

        if (/^(?:clear|cls|limpar)$/i.test(text)) {
          nativeConsole.log(A.clear);
          printHeader();
          rl.prompt();
          return;
        }

        if (/^status$/i.test(text)) {
          printLine(
            'SYS',
            'WHATSAPP',
            connected ? 'ONLINE • pronto para comandos' : 'Aguardando conexão',
            connected ? C.green : C.yellow
          );
          rl.prompt();
          return;
        }

        const logControl = text.match(/^logs?\s+(on|off|status)$/i);
        if (logControl) {
          const action = logControl[1].toLowerCase();

          if (action === 'on') showProcessLogs = true;
          if (action === 'off') showProcessLogs = false;

          nativeConsole.log(
            action === 'status'
              ? '🌸 Logs de processamento: ' + (showProcessLogs ? 'ATIVADOS' : 'DESATIVADOS')
              : '🌸 Logs de processamento ' + (showProcessLogs ? 'ATIVADOS' : 'DESATIVADOS')
          );

          rl.prompt();
          return;
        }

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
