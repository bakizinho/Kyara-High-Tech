import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadContentFromMessage } from 'baileys';

const FEATURE_DIR = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_PATH = path.resolve(FEATURE_DIR, '..', '..', 'database', 'antideletepv.json');
const SUBBOTS_PATH = path.resolve(FEATURE_DIR, '..', '..', 'database', 'subbots.json');
const MAIN_CONFIG_PATH = path.resolve(FEATURE_DIR, '..', 'config.json');
const DEFAULT_SETTINGS = Object.freeze({ enabled: false, mode: 'pv', contacts: [], sourceSubBot: '' });
const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
const handledRevocations = new Map();

export function normalizeAntiDeletePvNumber(value = '') {
  return String(value ?? '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

export function loadAntiDeletePvSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return { ...DEFAULT_SETTINGS, contacts: [] };
    const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    const contacts = Array.isArray(data.contacts)
      ? [...new Set(data.contacts.map(normalizeAntiDeletePvNumber).filter(n => n.length >= 8 && n.length <= 15))]
      : [];

    return {
      enabled: data.enabled === true,
      mode: data.mode === 'global' ? 'global' : 'pv',
      contacts,
      sourceSubBot: String(data.sourceSubBot || '').trim()
    };
  } catch (error) {
    console.error('[ANTI-DELETE PV] Falha ao ler configurações:', error?.message || error);
    return { ...DEFAULT_SETTINGS, contacts: [] };
  }
}

export function saveAntiDeletePvSettings(settings = {}) {
  const normalized = {
    enabled: settings.enabled === true,
    mode: settings.mode === 'global' ? 'global' : 'pv',
    contacts: Array.isArray(settings.contacts)
      ? [...new Set(settings.contacts.map(normalizeAntiDeletePvNumber).filter(n => n.length >= 8 && n.length <= 15))]
      : [],
    sourceSubBot: String(settings.sourceSubBot || '').trim()
  };

  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(normalized, null, 2) + '\n', 'utf8');
  return normalized;
}

export function resolveAntiDeletePvSubBot(value = '') {
  const raw = String(value ?? '').trim().replace(/^@/, '');
  if (!raw) return null;
  const digits = normalizeAntiDeletePvNumber(raw);

  try {
    const parsed = JSON.parse(fs.readFileSync(SUBBOTS_PATH, 'utf8'));
    const subbots = parsed?.subbots || parsed || {};

    for (const [id, bot] of Object.entries(subbots)) {
      const candidates = [
        id, bot?.id, bot?.botId, bot?.phoneNumber,
        bot?.number, bot?.subBotLid, bot?.jid
      ].filter(Boolean);

      if (candidates.some(candidate => String(candidate).trim().replace(/^@/, '') === raw)) {
        return { id, bot };
      }

      if (digits && candidates.some(candidate => normalizeAntiDeletePvNumber(candidate) === digits)) {
        return { id, bot };
      }
    }
  } catch (error) {
    console.error('[ANTI-DELETE PV] Falha ao consultar sub-bots:', error?.message || error);
  }

  return null;
}

function resolveOwnerJid(value = '') {
  const raw = String(value ?? '').trim();

  if (raw.endsWith('@s.whatsapp.net')) {
    const number = normalizeAntiDeletePvNumber(raw);
    if (number.length >= 8 && number.length <= 15) return `${number}@s.whatsapp.net`;
  } else if (!raw.includes('@')) {
    const number = normalizeAntiDeletePvNumber(raw);
    if (number.length >= 8 && number.length <= 15) return `${number}@s.whatsapp.net`;
  }

  try {
    const config = JSON.parse(fs.readFileSync(MAIN_CONFIG_PATH, 'utf8'));
    const number = normalizeAntiDeletePvNumber(config?.numerodono || '');
    if (number.length >= 8 && number.length <= 15) return `${number}@s.whatsapp.net`;
  } catch {}

  return '';
}

function unwrapMessage(rawMessage) {
  let message = rawMessage || {};

  for (let i = 0; i < 8; i++) {
    const inner = message.ephemeralMessage?.message
      || message.viewOnceMessage?.message
      || message.viewOnceMessageV2?.message
      || message.viewOnceMessageV2Extension?.message
      || message.documentWithCaptionMessage?.message;

    if (!inner) break;
    message = inner;
  }

  return message;
}

async function downloadMedia(media, type) {
  const declaredLength = Number(media?.fileLength?.low ?? media?.fileLength ?? 0);
  if (declaredLength > MAX_MEDIA_BYTES) throw new Error('Mídia acima do limite de 20 MB');

  const stream = await downloadContentFromMessage(media, type);
  const chunks = [];
  let total = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.from(chunk);
    total += buffer.length;

    if (total > MAX_MEDIA_BYTES) throw new Error('Mídia acima do limite de 20 MB');
    chunks.push(buffer);
  }

  return Buffer.concat(chunks, total);
}

export async function buildAntiDeletePvPayload(rawMessage) {
  const message = unwrapMessage(rawMessage);
  const text = String(
    message.conversation
      ?? message.extendedTextMessage?.text
      ?? message.buttonsResponseMessage?.selectedDisplayText
      ?? message.listResponseMessage?.title
      ?? ''
  );

  const mediaCases = [
    ['imageMessage', 'image'],
    ['videoMessage', 'video'],
    ['audioMessage', 'audio'],
    ['documentMessage', 'document'],
    ['stickerMessage', 'sticker']
  ];

  for (const [key, type] of mediaCases) {
    const media = message[key];
    if (!media) continue;

    try {
      const buffer = await downloadMedia(media, type);

      if (type === 'image') return { image: buffer, ...(media.caption ? { caption: media.caption } : {}) };
      if (type === 'video') return { video: buffer, ...(media.caption ? { caption: media.caption } : {}) };
      if (type === 'audio') return {
        audio: buffer,
        mimetype: media.mimetype || 'audio/ogg; codecs=opus',
        ptt: Boolean(media.ptt)
      };
      if (type === 'document') return {
        document: buffer,
        mimetype: media.mimetype || 'application/octet-stream',
        fileName: media.fileName || 'arquivo',
        ...(media.caption ? { caption: media.caption } : {})
      };
      if (type === 'sticker') return { sticker: buffer };
    } catch (error) {
      const caption = String(media.caption || text || '').trim();

      return {
        text: `⚠️ A mensagem foi detectada, mas não consegui recuperar a mídia (${type}; limite de 20 MB ou mídia indisponível).${caption ? `\nLegenda/texto: ${caption}` : ''}`
      };
    }
  }

  const contact = message.contactMessage;
  if (contact) {
    return { text: `👤 Contato recebido: ${contact.displayName || 'sem nome'}${contact.vcard ? `\n${contact.vcard}` : ''}` };
  }

  const location = message.locationMessage || message.liveLocationMessage;
  if (location && Number.isFinite(Number(location.degreesLatitude)) && Number.isFinite(Number(location.degreesLongitude))) {
    return {
      location: {
        degreesLatitude: Number(location.degreesLatitude),
        degreesLongitude: Number(location.degreesLongitude),
        ...(location.name ? { name: location.name } : {}),
        ...(location.address ? { address: location.address } : {})
      }
    };
  }

  const poll = message.pollCreationMessage || message.pollCreationMessageV2 || message.pollCreationMessageV3;
  if (poll) {
    const options = Array.isArray(poll.options) ? poll.options.map(option => option.optionName).filter(Boolean) : [];

    return {
      text: `📊 Enquete apagada: ${poll.name || 'sem título'}${options.length ? `\n${options.map(option => `• ${option}`).join('\n')}` : ''}`
    };
  }

  if (text) return { text };

  const knownType = Object.keys(message).find(key => !['messageContextInfo', 'senderKeyDistributionMessage'].includes(key));
  return { text: `⚠️ Mensagem apagada detectada. Tipo não suportado para reenvio: ${knownType || 'desconhecido'}.` };
}

export async function handleAntiDeletePvRevocation({ sock, info, messagesCache, ownerJid = '' } = {}) {
  if (info?.message?.protocolMessage?.type !== 0 || info?.key?.fromMe === true) return false;

  const settings = loadAntiDeletePvSettings();
  if (!settings.enabled) return false;

  const currentSubBotId = String(info.__kyaraSubBotId || '').trim();

  if (settings.sourceSubBot) {
    if (currentSubBotId !== settings.sourceSubBot) return false;
  } else if (currentSubBotId) {
    return false;
  }

  const from = String(info.key?.remoteJid || '');
  const isGroup = from.endsWith('@g.us');

  if (isGroup) return false;

  const owner = resolveOwnerJid(ownerJid);
  const deletedKey = info.message.protocolMessage.key || {};
  const deletedId = String(deletedKey.id || '');

  if (!owner || !deletedId) return false;

  const cacheJids = [
    deletedKey.remoteJid,
    deletedKey.remoteJidAlt,
    from,
    info.key?.remoteJidAlt
  ].filter(Boolean);

  let cachedOriginal = null;

  for (const jid of cacheJids) {
    cachedOriginal = messagesCache?.get?.(`${jid}_${deletedId}`);
    if (cachedOriginal?.message) break;
  }

  if (!cachedOriginal?.message) return false;

  const actorJids = isGroup
    ? [info.key?.participantAlt, info.key?.participant, info.message?.participantAlt, info.message?.participant]
    : [info.key?.remoteJidAlt, info.key?.remoteJid, from, deletedKey.remoteJidAlt, deletedKey.remoteJid];

  const actorAliases = new Set(actorJids.map(normalizeAntiDeletePvNumber).filter(Boolean));

  if (settings.mode !== 'global' && settings.contacts.length && !settings.contacts.some(number => actorAliases.has(number))) return false;

  const eventKey = `${from}:${info.key?.id || deletedId}`;
  if (handledRevocations.has(eventKey)) return false;

  handledRevocations.set(eventKey, Date.now());

  if (handledRevocations.size > 1500) {
    for (const oldKey of handledRevocations.keys()) {
      handledRevocations.delete(oldKey);
      if (handledRevocations.size <= 1100) break;
    }
  }

  try {
    const actorJid = actorJids.find(jid => String(jid || '').includes('@s.whatsapp.net'))
      || actorJids.find(Boolean)
      || '';

    const actorNumber = normalizeAntiDeletePvNumber(actorJid) || 'não identificado';
    const actorName = String(info.pushName || actorNumber || 'Contato').replace(/[\r\n]+/g, ' ').slice(0, 70);
    const rawTimestamp = info.messageTimestamp?.low ?? info.messageTimestamp ?? 0;
    const timestamp = Number(rawTimestamp);
    const date = new Date(timestamp > 0 ? timestamp * 1000 : Date.now());
    const when = Number.isNaN(date.getTime()) ? 'agora' : date.toLocaleString('pt-BR');

    const header = [
      '🗑️ *ANTI-DELETE PV — MENSAGEM APAGADA*',
      `👤 *Excluída por:* ${actorName}`,
      `📱 *Número:* ${actorNumber}`,
      `💬 *Conversa:* ${isGroup ? `grupo ${from}` : 'privado'}`,
      `🕒 *Detectada em:* ${when}`
    ].join('\n');

    await sock.sendMessage(owner, { text: header });
    await sock.sendMessage(owner, await buildAntiDeletePvPayload(cachedOriginal.message));

    return true;
  } catch (error) {
    handledRevocations.delete(eventKey);
    console.error('[ANTI-DELETE PV] Falha ao enviar conteúdo ao dono:', error?.stack || error);
    return false;
  }
}
