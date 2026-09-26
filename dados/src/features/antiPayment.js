/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║         🛡️ ANTI-PAYMENT SYSTEM - KYARA BOT                    ║
 * ║   Detecta e bloqueia mensagens com caracteres invisíveis       ║
 * ╚════════════════════════════════════════════════════════════════╝
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caracteres invisíveis perigosos (Zero-Width)
const INVISIBLE_CHARACTERS = {
  'U+200B': '\u200B', // Zero-Width Space
  'U+200C': '\u200C', // Zero-Width Non-Joiner
  'U+200D': '\u200D', // Zero-Width Joiner
  'U+2060': '\u2060', // Word Joiner ⚠️ ALVO PRINCIPAL
  'U+FEFF': '\uFEFF', // Zero-Width No-Break Space
  'U+061C': '\u061C', // Arabic Letter Mark
  'U+180E': '\u180E', // Mongolian Vowel Separator
  'U+2061': '\u2061', // Function Application
  'U+2062': '\u2062', // Invisible Times
  'U+2063': '\u2063', // Invisible Separator
};

const INVISIBLE_REGEX = /[\u200B\u200C\u200D\u2060\uFEFF\u061C\u180E\u2061\u2062\u2063]/g;

/**
 * Extrai o texto de diferentes tipos de mensagem do WhatsApp
 */
function extractMessageText(message) {
  if (!message) return null;

  // Conversa comum
  if (message.conversation) {
    return message.conversation;
  }

  // Texto estendido
  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text;
  }

  // Mensagem de imagem com legenda
  if (message.imageMessage?.caption) {
    return message.imageMessage.caption;
  }

  // Mensagem de vídeo com legenda
  if (message.videoMessage?.caption) {
    return message.videoMessage.caption;
  }

  // Mensagem de áudio com legenda
  if (message.audioMessage?.caption) {
    return message.audioMessage.caption;
  }

  // Mensagem de documento com legenda
  if (message.documentMessage?.caption) {
    return message.documentMessage.caption;
  }

  // Mensagem de sticker com legenda (raro)
  if (message.stickerMessage?.caption) {
    return message.stickerMessage.caption;
  }

  // Resposta citada
  if (message.quotedMessage) {
    return extractMessageText(message.quotedMessage);
  }

  return null;
}

/**
 * Analisa o texto e retorna detalhes sobre caracteres invisíveis
 */
function analyzeInvisibleCharacters(text) {
  if (!text || typeof text !== 'string') {
    return { hasInvisible: false, detected: [], codePoints: [] };
  }

  const detected = [];
  const codePoints = [];

  // Itera por cada caractere
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const codePoint = char.codePointAt(0);
    const hex = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;

    codePoints.push({ char, hex, codePoint });

    // Verifica se é invisível
    if (INVISIBLE_REGEX.test(char)) {
      detected.push({
        index: i,
        hex,
        codePoint,
        char: char === '\u2060' ? '(WORD JOINER)' : char,
      });
    }
  }

  return {
    hasInvisible: detected.length > 0,
    detected,
    codePoints,
    totalLength: text.length,
  };
}

/**
 * Remove caracteres invisíveis de um texto
 */
function removeInvisibleCharacters(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(INVISIBLE_REGEX, '');
}

/**
 * Deleta uma mensagem do WhatsApp
 */
async function deleteMessage(socket, key) {
  try {
    if (!socket || !key) {
      console.error('[ANTI-PAYMENT] ❌ Socket ou key inválido');
      return false;
    }

    await socket.sendMessage(key.remoteJid, {
      delete: key,
    });

    return true;
  } catch (error) {
    console.error(
      '[ANTI-PAYMENT] ❌ Erro ao deletar mensagem:',
      error.message
    );
    return false;
  }
}

/**
 * Remove um participante do grupo (ban)
 */
async function banParticipant(socket, groupId, participantId) {
  try {
    if (!socket || !groupId || !participantId) {
      console.error('[ANTI-PAYMENT] ❌ Parâmetros inválidos para ban');
      return false;
    }

    await socket.groupParticipantsUpdate(groupId, [participantId], 'remove');

    return true;
  } catch (error) {
    console.error('[ANTI-PAYMENT] ❌ Erro ao banir participante:', error.message);
    return false;
  }
}

/**
 * Envia aviso no grupo sobre a ação tomada
 */
async function sendWarningMessage(socket, groupId, userName, action) {
  try {
    const messages = {
      invisible: `🚫 *ALERTA ANTI-PAYMENT*\n\n@${userName} tentou enviar mensagem com caracteres invisíveis!\n\n💬 Mensagem deletada automaticamente.\n\n${action === 'banned' ? '⛔ Usuário banido.' : '⚠️ Próxima vez será banido!'}`,
      payment: `🚫 *ALERTA ANTI-PAYMENT*\n\n@${userName} tentou detectar pagamento oculto!\n\n💬 Mensagem deletada automaticamente.\n\n${action === 'banned' ? '⛔ Usuário banido.' : '⚠️ Próxima vez será banido!'}`,
      spam: `🚫 *ALERTA ANTI-PAYMENT*\n\n@${userName} enviou conteúdo suspeito!\n\n💬 Mensagem deletada automaticamente.`,
    };

    await socket.sendMessage(groupId, {
      text: messages[action] || messages.invisible,
      mentions: [`${userName}@s.whatsapp.net`],
    });

    return true;
  } catch (error) {
    console.error('[ANTI-PAYMENT] ⚠️ Erro ao enviar aviso:', error.message);
    return false;
  }
}

/**
 * Carrega estado do Anti-Payment por grupo
 */
async function loadAntiPaymentState(groupId) {
  try {
    const stateDir = path.join(
      __dirname,
      '..',
      '..',
      'database',
      'antipayment'
    );
    const statePath = path.join(stateDir, `${groupId}.json`);

    try {
      const data = await fs.readFile(statePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      // Arquivo não existe, retorna estado padrão
      return {
        enabled: false,
        banUsers: false,
        deleteMessages: true,
        lastUpdated: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('[ANTI-PAYMENT] ❌ Erro ao carregar estado:', error.message);
    return { enabled: false, banUsers: false, deleteMessages: true };
  }
}

/**
 * Salva estado do Anti-Payment por grupo
 */
async function saveAntiPaymentState(groupId, state) {
  try {
    const stateDir = path.join(
      __dirname,
      '..',
      '..',
      'database',
      'antipayment'
    );

    // Cria diretório se não existir
    await fs.mkdir(stateDir, { recursive: true });

    const statePath = path.join(stateDir, `${groupId}.json`);
    await fs.writeFile(
      statePath,
      JSON.stringify(
        {
          ...state,
          lastUpdated: new Date().toISOString(),
        },
        null,
        2
      )
    );

    return true;
  } catch (error) {
    console.error('[ANTI-PAYMENT] ❌ Erro ao salvar estado:', error.message);
    return false;
  }
}

/**
 * Handler principal do Anti-Payment
 * Chamado a cada mensagem em grupo
 */
async function handleAntiPayment(socket, messageInfo, groupSettings = {}) {
  try {
    // Log de entrada
    console.log('[ANTI-PAYMENT TRACE] MESSAGE_RECEIVED');

    // Extrai informações básicas
    const remoteJid = messageInfo.key?.remoteJid;
    const messageId = messageInfo.key?.id;
    const participant =
      messageInfo.key?.participant ||
      messageInfo.message?.participant ||
      messageInfo.key?.participantAlt ||
      messageInfo.key?.participantPn;

    console.log(`[ANTI-PAYMENT TRACE] remoteJid=${remoteJid}`);
    console.log(`[ANTI-PAYMENT TRACE] messageId=${messageId}`);
    console.log(`[ANTI-PAYMENT TRACE] participant=${participant}`);

    // Validações básicas
    if (!remoteJid) {
      console.log('[ANTI-PAYMENT TRACE] ❌ Sem remoteJid, retornando');
      return;
    }

    // Verifica se é grupo
    const isGroup = remoteJid.endsWith('@g.us');
    console.log('[ANTI-PAYMENT TRACE] GROUP_CHECK');
    console.log(`[ANTI-PAYMENT TRACE] isGroup=${isGroup}`);

    if (!isGroup) {
      console.log('[ANTI-PAYMENT TRACE] Não é grupo, retornando');
      return;
    }

    // Ignora mensagens do próprio bot
    if (messageInfo.key?.fromMe) {
      console.log('[ANTI-PAYMENT TRACE] Mensagem do bot, ignorando');
      return;
    }

    // Carrega estado do Anti-Payment
    const state = await loadAntiPaymentState(remoteJid);

    if (!state.enabled) {
      console.log('[ANTI-PAYMENT TRACE] Anti-Payment desativado neste grupo');
      return;
    }

    console.log('[ANTI-PAYMENT TRACE] Anti-Payment está ATIVO');

    // Extrai o texto da mensagem
    const text = extractMessageText(messageInfo.message);
    console.log('[ANTI-PAYMENT TRACE] TEXT_EXTRACTED');
    console.log(`[ANTI-PAYMENT TRACE] text="${text}"`);

    if (!text) {
      console.log('[ANTI-PAYMENT TRACE] Nenhum texto detectado');
      return;
    }

    // Analisa caracteres invisíveis
    console.log('[ANTI-PAYMENT TRACE] INVISIBLE_SCAN');
    const analysis = analyzeInvisibleCharacters(text);

    console.log('[ANTI-PAYMENT TRACE] DETECTION_RESULT');
    console.log(`[ANTI-PAYMENT TRACE] detected=${analysis.hasInvisible}`);
    console.log(
      `[ANTI-PAYMENT TRACE] invisibleChars=${JSON.stringify(analysis.detected)}`
    );

    if (!analysis.hasInvisible) {
      console.log('[ANTI-PAYMENT TRACE] Nenhum caractere invisível encontrado');
      return;
    }

    // Detectou caracteres invisíveis!
    console.log('[ANTI-PAYMENT TRACE] ACTION');
    console.log('[ANTI-PAYMENT TRACE] ⚠️ CARACTERE INVISÍVEL DETECTADO!');

    // Extrai nome do participante
    let userName = participant;
    if (participant?.includes('@')) {
      userName = participant.split('@')[0];
    }

    // Deleta a mensagem
    console.log('[ANTI-PAYMENT TRACE] DELETE');
    const deleteResult = await deleteMessage(socket, messageInfo.key);
    console.log(
      `[ANTI-PAYMENT TRACE] deleteResult=${deleteResult ? 'SUCCESS' : 'FAILED'}`
    );

    // Envia aviso
    await sendWarningMessage(
      socket,
      remoteJid,
      userName,
      state.banUsers ? 'invisible_ban' : 'invisible'
    );

    // Ban do usuário (se configurado)
    if (state.banUsers) {
      console.log('[ANTI-PAYMENT TRACE] BAN');
      const banResult = await banParticipant(socket, remoteJid, participant);
      console.log(
        `[ANTI-PAYMENT TRACE] banResult=${banResult ? 'SUCCESS' : 'FAILED'}`
      );

      if (banResult) {
        await sendWarningMessage(socket, remoteJid, userName, 'banned');
      }
    }

    console.log('[ANTI-PAYMENT TRACE] ✅ AÇÃO CONCLUÍDA\n');
  } catch (error) {
    console.error('[ANTI-PAYMENT] ❌ Erro geral:', error.message);
    console.error(error.stack);
  }
}

// ============================================================
// EXPORTS
// ============================================================

export {
  handleAntiPayment,
  extractMessageText,
  analyzeInvisibleCharacters,
  removeInvisibleCharacters,
  deleteMessage,
  banParticipant,
  sendWarningMessage,
  loadAntiPaymentState,
  saveAntiPaymentState,
  INVISIBLE_CHARACTERS,
  INVISIBLE_REGEX,
};
