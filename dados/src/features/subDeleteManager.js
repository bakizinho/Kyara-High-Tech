import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  makeWASocket,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  DisconnectReason,
  downloadContentFromMessage
} from 'baileys';
import NodeCache from 'node-cache';
import pino from 'pino';
import {
  loadAntiDeletePvSettings,
  normalizeAntiDeletePvNumber
} from './antiDeletePv.js';

const FEATURE_DIR = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(FEATURE_DIR, '../../database/sub-delete/auth');

const MAX_CACHE_ENTRIES = 260;
const MAX_MEDIA_BYTES = 12 * 1024 * 1024;
const MAX_CACHE_BYTES = 22 * 1024 * 1024;

const logger = pino({ level: 'silent' });
const entriesById = new Map();
const handledRevocations = new Map();

let cachedMediaBytes = 0;
let activeSocket = null;
let activeState = null;
let connected = false;
let socketPhase = '';
let shuttingDown = false;
let startPromise = null;
let reconnectTimer = null;
let mainSocket = null;
let ownerTarget = '';

function readCredentialFile() {
  try {
    const file = path.join(AUTH_DIR, 'creds.json');
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function getSubDeleteStatus() {
  const credentials = readCredentialFile();

  return {
    registered: Boolean(
      activeState?.creds?.registered || credentials?.registered
    ),
    connected,
    running: Boolean(activeSocket)
  };
}

function resolveOwnerTarget(jid, number) {
  const raw = String(jid || '').trim();

  if (raw.endsWith('@s.whatsapp.net') || raw.endsWith('@lid')) {
    return raw;
  }

  const digits = normalizeAntiDeletePvNumber(number);
  return digits ? `${digits}@s.whatsapp.net` : '';
}

function isPrivateJid(value) {
  const jid = String(value || '');
  return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid');
}

function containsViewOnce(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 8) return false;

  for (const [key, nested] of Object.entries(value)) {
    if (/^viewOnceMessage/i.test(key)) return true;
    if (nested && typeof nested === 'object') {
      if (containsViewOnce(nested, depth + 1)) return true;
    }
  }

  return false;
}

function unwrapMessage(message) {
  let current = message;

  for (let i = 0; i < 5; i++) {
    const nested =
      current?.ephemeralMessage?.message ||
      current?.documentWithCaptionMessage?.message ||
      current?.deviceSentMessage?.message;

    if (!nested) break;
    current = nested;
  }

  return current || {};
}

function describeMessage(info) {
  if (!info?.message || containsViewOnce(info.message)) return null;

  const message = unwrapMessage(info.message);

  if (typeof message.conversation === 'string') {
    return { kind: 'text', text: message.conversation };
  }

  const extendedText = message.extendedTextMessage?.text;
  if (typeof extendedText === 'string') {
    return { kind: 'text', text: extendedText };
  }

  if (message.imageMessage) {
    return {
      kind: 'image',
      mediaType: 'image',
      mediaMessage: message.imageMessage,
      mimetype: message.imageMessage.mimetype || 'image/jpeg',
      caption: String(message.imageMessage.caption || '')
    };
  }

  if (message.audioMessage) {
    return {
      kind: 'audio',
      mediaType: 'audio',
      mediaMessage: message.audioMessage,
      mimetype: message.audioMessage.mimetype || 'audio/ogg; codecs=opus',
      ptt: message.audioMessage.ptt === true
    };
  }

  return null;
}

function removeEntry(id, entry) {
  if (entriesById.get(id) !== entry) return;

  entriesById.delete(id);
  if (entry.buffer) cachedMediaBytes -= entry.buffer.length;
  if (cachedMediaBytes < 0) cachedMediaBytes = 0;
}

function trimCache() {
  while (
    entriesById.size > MAX_CACHE_ENTRIES ||
    cachedMediaBytes > MAX_CACHE_BYTES
  ) {
    const oldest = entriesById.entries().next().value;
    if (!oldest) break;
    removeEntry(oldest[0], oldest[1]);
  }
}

function cacheIncoming(info) {
  const settings = loadAntiDeletePvSettings();

  if (!settings.enabled || settings.sourceSubBot !== 'sub-delete') {
    if (!settings.enabled) {
      for (const [id, entry] of entriesById) removeEntry(id, entry);
    }
    return;
  }

  if (
    !info?.message ||
    info.key?.fromMe === true ||
    info.message?.protocolMessage?.type === 0 ||
    !info.key?.id
  ) {
    return;
  }

  const rawJids = [
    info.key?.remoteJid,
    info.key?.remoteJidAlt
  ].filter(Boolean);

  if (!rawJids.some(isPrivateJid)) return;

  const contactNumbers = rawJids
    .map(normalizeAntiDeletePvNumber)
    .filter(Boolean);

  if (
    settings.mode !== 'global' &&
    settings.contacts.length &&
    !settings.contacts.some(number => contactNumbers.includes(number))
  ) {
    return;
  }

  const description = describeMessage(info);
  if (!description) return;

  const id = String(info.key.id);
  const existing = entriesById.get(id);
  if (existing) removeEntry(id, existing);

  const entry = {
    id,
    info,
    jids: rawJids.filter(isPrivateJid),
    ...description,
    buffer: null,
    capturePromise: null,
    mediaError: ''
  };

  entriesById.set(id, entry);
  trimCache();

  if (!entry.mediaMessage) return;

  const declaredLength = Number(entry.mediaMessage.fileLength || 0);
  if (declaredLength > MAX_MEDIA_BYTES) {
    entry.mediaError = 'A mídia excede o limite de cache.';
    return;
  }

  entry.capturePromise = (async () => {
    try {
      const stream = await downloadContentFromMessage(
        entry.mediaMessage,
        entry.mediaType
      );

      const chunks = [];
      let total = 0;

      for await (const chunk of stream) {
        const data = Buffer.from(chunk);
        total += data.length;

        if (total > MAX_MEDIA_BYTES) {
          throw new Error('A mídia excede o limite de cache.');
        }

        chunks.push(data);
      }

      const buffer = Buffer.concat(chunks);
      if (!buffer.length || entriesById.get(id) !== entry) return;

      entry.buffer = buffer;
      cachedMediaBytes += buffer.length;
      trimCache();
    } catch (error) {
      entry.mediaError = String(error?.message || 'Falha no cache da mídia');
    }
  })();
}

async function handleRevocation(sock, info) {
  if (
    info?.message?.protocolMessage?.type !== 0 ||
    info.key?.fromMe === true
  ) {
    return;
  }

  const settings = loadAntiDeletePvSettings();
  if (!settings.enabled || settings.sourceSubBot !== 'sub-delete') return;

  const chatJid = String(info.key?.remoteJid || '');
  if (!isPrivateJid(chatJid)) return;

  const deletedKey = info.message.protocolMessage.key || {};
  const deletedId = String(deletedKey.id || '');
  if (!deletedId) return;

  const entry = entriesById.get(deletedId);
  if (!entry || entry.info?.key?.fromMe === true) return;

  if (
    settings.mode !== 'global' &&
    settings.contacts.length &&
    !settings.contacts.some(number =>
      entry.jids.map(normalizeAntiDeletePvNumber).includes(number)
    )
  ) {
    return;
  }

  const eventKey = `${chatJid}:${info.key?.id || deletedId}`;
  if (handledRevocations.has(eventKey)) return;

  const target = ownerTarget;
  if (!target) {
    console.error('[SUB-DELETE] Destino privado do dono não configurado.');
    return;
  }

  handledRevocations.set(eventKey, Date.now());

  try {
    if (entry.capturePromise) {
      await Promise.race([
        entry.capturePromise.catch(() => {}),
        new Promise(resolve => setTimeout(resolve, 7000))
      ]);
    }

    const actorJid = entry.jids.find(jid => jid.endsWith('@s.whatsapp.net'))
      || entry.jids[0]
      || chatJid;

    const actorNumber = normalizeAntiDeletePvNumber(actorJid) || 'não identificado';
    const actorName = String(
      entry.info?.pushName || actorNumber
    ).replace(/[\r\n]+/g, ' ').slice(0, 70);

    const rawTimestamp =
      entry.info?.messageTimestamp?.low ??
      entry.info?.messageTimestamp ??
      0;
    const numericTimestamp = Number(rawTimestamp);
    const date = new Date(
      numericTimestamp > 0 ? numericTimestamp * 1000 : Date.now()
    );
    const when = Number.isNaN(date.getTime())
      ? 'agora'
      : date.toLocaleString('pt-BR');

    await sock.sendMessage(target, {
      text: [
        '🗑️ *SUB-DELETE — MENSAGEM APAGADA*',
        `👤 *Contato:* ${actorName}`,
        `📱 *Número:* ${actorNumber}`,
        `🕒 *Recebida em:* ${when}`
      ].join('\n')
    });

    if (entry.kind === 'text') {
      await sock.sendMessage(target, { text: entry.text });
    } else if (entry.buffer && entry.kind === 'image') {
      await sock.sendMessage(target, {
        image: entry.buffer,
        mimetype: entry.mimetype,
        caption: entry.caption || ''
      });
    } else if (entry.buffer && entry.kind === 'audio') {
      await sock.sendMessage(target, {
        audio: entry.buffer,
        mimetype: entry.mimetype,
        ptt: entry.ptt
      });
    } else {
      const details = entry.caption ? `\nLegenda: ${entry.caption}` : '';
      await sock.sendMessage(target, {
        text: `⚠️ A mensagem foi detectada, mas a mídia não ficou disponível no cache.${details}`
      });
    }

    removeEntry(deletedId, entry);
  } catch (error) {
    handledRevocations.delete(eventKey);
    console.error(
      '[SUB-DELETE] Erro ao encaminhar mensagem:',
      error?.message || error
    );
  }

  if (handledRevocations.size > 700) {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [key, timestamp] of handledRevocations) {
      if (timestamp < cutoff) handledRevocations.delete(key);
    }
  }
}

async function openSocket() {
  if (activeSocket) return activeSocket;
  if (startPromise) return startPromise;

  shuttingDown = false;

  startPromise = (async () => {
    fs.mkdirSync(AUTH_DIR, { recursive: true });

    const auth = await useMultiFileAuthState(
      AUTH_DIR,
      makeCacheableSignalKeyStore
    );

    let version;
    try {
      const latest = await fetchLatestWaWebVersion();
      version = latest.version;
    } catch {
      try {
        const latest = await fetchLatestBaileysVersion();
        version = latest.version;
      } catch {
        version = [2, 3000, 1015901307];
      }
    }

    const sock = makeWASocket({
      version,
      logger,
      browser: ['Ubuntu', 'Chrome', '110.0.5481.177'],
      printQRInTerminal: false,
      auth: auth.state,
      signalRepository: auth.signalRepository,
      msgRetryCounterCache: new NodeCache(),
      shouldSyncHistoryMessage: () => false,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000
    });

    activeSocket = sock;
    activeState = auth.state;
    connected = false;
    socketPhase = '';

    sock.ev.on('creds.update', auth.saveCreds);

    sock.ev.on('messages.upsert', async event => {
      if (
        !Array.isArray(event.messages) ||
        !['notify', 'append'].includes(event.type)
      ) {
        return;
      }

      for (const info of event.messages) {
        try {
          if (info?.message?.protocolMessage?.type === 0) {
            await handleRevocation(sock, info);
          } else {
            cacheIncoming(info);
          }
        } catch (error) {
          console.error(
            '[SUB-DELETE] Erro ao analisar mensagem:',
            error?.message || error
          );
        }
      }
    });

    sock.ev.on('connection.update', update => {
      if (activeSocket === sock && update.connection) {
        socketPhase = update.connection;
      }

      if (update.connection === 'open' && activeSocket === sock) {
        connected = true;
        console.log('[SUB-DELETE] Sessão independente conectada.');
      }

      if (update.connection === 'close') {
        const closeError = update.lastDisconnect?.error;
        console.error('[SUB-DELETE] SOCKET FECHADO:', JSON.stringify({
          message: closeError?.message || String(closeError || 'sem detalhe'),
          statusCode: closeError?.output?.statusCode ?? null,
          activeSocketIsThis: activeSocket === sock,
          registered: Boolean(auth.state.creds.registered)
        }));
        const wasCurrent = activeSocket === sock;
        const wasRegistered = Boolean(auth.state.creds.registered);
        const statusCode =
          update.lastDisconnect?.error?.output?.statusCode;

        if (wasCurrent) {
          activeSocket = null;
          activeState = null;
          connected = false;
        }

        if (
          wasCurrent &&
          !shuttingDown &&
          wasRegistered &&
          statusCode !== DisconnectReason.loggedOut
        ) {
          if (reconnectTimer) clearTimeout(reconnectTimer);

          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            initializeSubDelete().catch(error => {
              console.error(
                '[SUB-DELETE] Falha na reconexão:',
                error?.message || error
              );
            });
          }, 5000);
        }
      }
    });

    return sock;
  })();

  try {
    return await startPromise;
  } finally {
    startPromise = null;
  }
}

async function initializeSubDelete(options = {}) {
  if (options.mainSock) mainSocket = options.mainSock;

  ownerTarget = resolveOwnerTarget(
    options.ownerJid || ownerTarget,
    options.ownerNumber
  ) || ownerTarget;

  shuttingDown = false;

  if (!getSubDeleteStatus().registered) {
    return {
      ok: false,
      message: 'A sessão ainda não está pareada.'
    };
  }

  await openSocket();
  return { ok: true };
}

async function pairSubDelete({
  mainSock,
  ownerJid,
  ownerNumber
} = {}) {
  if (mainSock) mainSocket = mainSock;

  ownerTarget = resolveOwnerTarget(ownerJid || ownerTarget, ownerNumber);
  const phone = normalizeAntiDeletePvNumber(ownerNumber);

  if (!mainSocket || !ownerTarget) {
    return {
      ok: false,
      message: 'Não consegui identificar o privado do dono para enviar o código.'
    };
  }

  if (phone.length < 8 || phone.length > 15) {
    return {
      ok: false,
      message: 'O número principal do dono não está configurado corretamente.'
    };
  }

  if (getSubDeleteStatus().registered) {
    await initializeSubDelete({ mainSock, ownerJid, ownerNumber });
    return { ok: true, alreadyPaired: true };
  }

  try {
    const sock = await openSocket();

    if (activeSocket !== sock) {
      return {
        ok: false,
        message: 'A conexão independente foi substituída antes do pareamento.'
      };
    }

    // Aguarda o estado do socket sem registrar listeners temporários.
    const deadline = Date.now() + 8000;

    while (socketPhase !== 'connecting') {
      if (activeSocket !== sock || socketPhase === 'close') {
        throw new Error('Socket fechado antes de solicitar o código.');
      }

      if (Date.now() >= deadline) {
        throw new Error('Tempo esgotado aguardando a conexão inicial.');
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (activeSocket !== sock || socketPhase === 'close') {
      return {
        ok: false,
        message: 'O WhatsApp encerrou a conexão antes de gerar o código. Confira o log SUB-DELETE.'
      };
    }

    if (getSubDeleteStatus().registered) {
      return { ok: true, alreadyPaired: true };
    }

    const code = await sock.requestPairingCode(phone);

    // O código é enviado sozinho, sem legenda ou explicação junto.
    await mainSocket.sendMessage(ownerTarget, {
      text: String(code)
    });

    return { ok: true, codeSent: true };
  } catch (error) {
    console.error(
      '[SUB-DELETE] Falha ao gerar/enviar pareamento:',
      error?.message || error
    );

    return {
      ok: false,
      message: 'Não consegui gerar ou enviar o código. Confira a conexão e tente novamente.'
    };
  }
}

async function disconnectSubDelete() {
  shuttingDown = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const sock = activeSocket;
  activeSocket = null;
  activeState = null;
  connected = false;

  if (!sock) return;

  try {
    sock.ev?.removeAllListeners();
  } catch {}

  try {
    sock.ws?.close?.();
  } catch {}

  try {
    if (typeof sock.end === 'function') sock.end(undefined);
  } catch {}
}

export {
  getSubDeleteStatus,
  initializeSubDelete,
  pairSubDelete,
  disconnectSubDelete
};
