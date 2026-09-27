/* KYARA_GLOBAL_CONSOLE_FILTER_V3 */

if (!globalThis.__KYARA_GLOBAL_CONSOLE_FILTER_V3__) {
  const kyaraOriginalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console)
  }

  const kyaraBlockedConsoleTokens = [
    '[ANTI-PAYMENT ENTRY DEBUG]',
    '[KYARA STATUS DEBUG]',
    '[INTERACTIVE RAW]',
    '[INTERACTIVE] paramsJson:',
    '[GHOST-PAYMENT] INTEGRATED'
  ]

  const kyaraIsRawDiagnosticObject = value => {
    try {
      if (!value || typeof value !== 'object') {
        return false
      }

      if (
        value?.constructor?.name === 'SessionEntry'
      ) {
        return true
      }

      if (
        value.nativeFlowResponseMessage ||
        value.interactiveMessage ||
        value.messageContextInfo ||
        value?.contextInfo?.quotedMessage?.interactiveMessage
      ) {
        return true
      }

      return false
    } catch {
      return false
    }
  }

  const kyaraShouldHideConsole = args => {
    try {
      const text = args
        .map(value =>
          typeof value === 'string'
            ? value
            : ''
        )
        .join(' ')

      if (
        kyaraBlockedConsoleTokens.some(
          token => text.includes(token)
        )
      ) {
        return true
      }

      if (
        /^\s*\[DEBUG(?:\s|\])/i.test(text)
      ) {
        return true
      }

      if (
        text.includes('Closing session:')
      ) {
        return true
      }

      return args.some(
        kyaraIsRawDiagnosticObject
      )
    } catch {
      return false
    }
  }

  for (
    const method of [
      'log',
      'info',
      'warn',
      'error',
      'debug'
    ]
  ) {
    console[method] = (...args) => {
      if (
        kyaraShouldHideConsole(args)
      ) {
        return
      }

      return kyaraOriginalConsole[method](...args)
    }
  }

  globalThis.__KYARA_GLOBAL_CONSOLE_FILTER_V3__ = true
}


import {
  getConfiguredBotName,
  getConfiguredPrefix,
  getKyaraEmoji,
  commandExample,
  kyaraHeader,
  botNeedsAdminMessage,
  formatKyaraText
} from './core/identity/kyara-identity.js'


import * as kyaraTerminal from './kyara-terminal.js';
import { isActiveGroupRestriction } from "./utils/database.js";

const kyaraTerminalEvent =
  kyaraTerminal.event ||
  (() => {});

const configureCommandExecutor =
  kyaraTerminal.configureCommandExecutor ||
  (() => {});

const configureMessageExecutor =
  kyaraTerminal.configureMessageExecutor ||
  (() => {});

const startKyaraTerminal =
  kyaraTerminal.start ||
  (async () => {});

const stopKyaraTerminal =
  kyaraTerminal.stop ||
  (() => {});

const setKyaraTerminalSocket =
  kyaraTerminal.setWhatsAppSocket ||
  (() => {});

import * as kyaraAntiStatus from './features/kyaraAntiStatus.js';
import * as kyaraAntiPayment from './features/antiPayment.js';
import * as kyaraGhostPayment from './features/kyaraGhostPayment.js';
const kyaraMenuHeader = ({
  isOwner = false,
  pushName = "Usuário",
  uptime = "0s",
  ram = "0 MB",
  level = null
} = {}) => {
  const nome = String(pushName || "Usuário").replace(/\n/g, " ").trim();
  const cargo = isOwner ? "👑 DONO" : "👤 MEMBRO";

  const nivel = level !== null && level !== undefined
    ? `┃ ⭐ Nível: ${level}\n`
    : "";

  return [
    kyaraHeader('ONLINE'),
    `┃ ${cargo}: @${nome}`,
    `┃ ⚡ Online: ${uptime}`,
    `┃ 🧠 RAM: ${ram}`,
    nivel ? nivel.trimEnd() : null,
    `╰━━━━━━━━━━━━━━━━━━━━╯`
  ].filter(Boolean).join("\n");
};

import {
    setActiveSocket,
    markSocketOpen,
    markSocketClosed,
    getActiveSocket,
    waitForActiveSocket
} from './utils/activeSocket.js';
import { boot, core, wa, data, bot, sync, ok, warn } from './utils/logger.js';
import { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, makeWASocket, fetchLatestBaileysVersion, isJidBroadcast, isJidNewsletter, isJidStatusBroadcast } from 'baileys';
import { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import readline from 'readline';
import pino from 'pino';
import fs from 'fs/promises';
import path, { dirname, join } from 'path';
import qrcode from 'qrcode-terminal';
import { readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import axios from 'axios';
import util from 'util';
import PerformanceOptimizer from './utils/performanceOptimizer.js';
import RentalExpirationManager from './utils/rentalExpirationManager.js';
import { loadMsgBotOn } from './utils/database.js';
import { buildUserId } from './utils/helpers.js';
import { initCaptchaIndex, loadCaptchaJson, saveCaptchaJson } from './utils/captchaIndex.js';
import CaptchaIndex from './utils/captchaIndex.js';
import { extractId, routeOwnerFlow, isOwnerFlowId } from './core/nativeFlow/owner-flow-router.js';
import { sendOwnerMain } from './core/nativeFlow/owner-flow.js';
import { installGlobalButtons } from './core/nativeFlow/autoButtons.js';
import { getCurrentPrefix, normalizeOutgoingContent, normalizeOutgoingRelayMessage } from './core/runtime/kyara-runtime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const modules = await import('./funcs/exports.js');
const {
    canvas
} = modules.default;


class MessageQueue {
    constructor(maxWorkers = 4, batchSize = 10, messagesPerBatch = 2) {
        this.queue = [];
        this.maxWorkers = maxWorkers;
        this.batchSize = batchSize;
        this.messagesPerBatch = messagesPerBatch;
        this.activeWorkers = 0;
        this.isProcessing = false;
        this.processingInterval = null;
        this.errorHandler = null;
        this.stats = {
            totalProcessed: 0,
            totalErrors: 0,
            currentQueueLength: 0,
            startTime: Date.now(),
            batchesProcessed: 0,
            avgBatchTime: 0
        };
        this.idCounter = 0; 
    }

    setErrorHandler(handler) {
        this.errorHandler = handler;
    }

    async add(message, processor) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                message,
                processor,
                resolve,
                reject,
                timestamp: Date.now(),
                id: `msg_${++this.idCounter}_${Date.now()}`
            });

            this.stats.currentQueueLength = this.queue.length;

            if (!this.isProcessing) {
                this.startProcessing();
            }
        });
    }

    startProcessing() {
        if (this.isProcessing) return;

        this.isProcessing = true;

        this.processQueue();
    }

    stopProcessing() {
        this.isProcessing = false;
    }

    resume() {
        if (!this.isProcessing) {
            console.log('[MessageQueue] Retomando processamento');
            this.startProcessing();
        }
    }

    async processQueue() {

        if (this.isProcessing && this._queueLoopRunning) {
            return;
        }

        this.isProcessing = true;
        this._queueLoopRunning = true;

        try {

            while (
                this.isProcessing &&
                (
                    this.queue.length > 0 ||
                    this.activeWorkers > 0
                )
            ) {

                while (
                    this.isProcessing &&
                    this.queue.length > 0 &&
                    this.activeWorkers < this.maxWorkers
                ) {

                    const item =
                        this.queue.shift();

                    if (!item) {
                        break;
                    }

                    this.stats.currentQueueLength =
                        this.queue.length;

                    this.activeWorkers++;

                    this.processItem(item)
                        .then(() => {
                            this.stats.totalProcessed++;
                        })
                        .catch(() => {
                            /*
                             * processItem já registra o erro.
                             * Não lançar novamente para não derrubar
                             * o loop da fila.
                             */
                        })
                        .finally(() => {

                            this.activeWorkers--;

                            if (
                                this.queue.length > 0 &&
                                this.isProcessing
                            ) {
                                this.processQueue().catch(
                                    error => {
                                        console.error(
                                            '[MessageQueue] Loop:',
                                            error?.message || error
                                        );
                                    }
                                );
                            }
                        });
                }

                if (
                    this.queue.length > 0 &&
                    this.activeWorkers >= this.maxWorkers
                ) {
                    await new Promise(
                        resolve =>
                            setTimeout(resolve, 5)
                    );
                } else if (
                    this.queue.length === 0 &&
                    this.activeWorkers > 0
                ) {
                    await new Promise(
                        resolve =>
                            setTimeout(resolve, 10)
                    );
                } else {
                    break;
                }
            }

        } finally {

            this._queueLoopRunning = false;

            if (
                this.queue.length === 0 &&
                this.activeWorkers === 0
            ) {
                this.stopProcessing();
            }
        }
    }

    async processBatch(batchItems) {

        const batchPromises = batchItems.map(item => this.processItem(item));

        const results = await Promise.allSettled(batchPromises);


        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                this.stats.totalProcessed++;
            } else {
                this.stats.totalErrors++;
            }
        });
    }

    async processItem(item) {
        const { message, processor, resolve } = item;

        try {
            const result = await processor(message);
            resolve(result);
            return result;
        } catch (error) {
                         await this.handleProcessingError(item, error);

        }
    }

    async handleProcessingError(item, error) {
        this.stats.totalErrors++;

        console.error(`❌ Queue processing error for message ${item.id}:`, error.message);

        if (this.errorHandler) {
            try {
                await this.errorHandler(item, error);
            } catch (handlerError) {
                console.error('❌ Error handler failed:', handlerError.message);
            }
        }


        item.reject(error);
    }

    getStatus() {
        const uptime = Date.now() - this.stats.startTime;
        return {
            queueLength: this.queue.length,
            activeWorkers: this.activeWorkers,
            maxWorkers: this.maxWorkers,
            batchSize: this.batchSize,
            messagesPerBatch: this.messagesPerBatch,
            isProcessing: this.isProcessing,
            totalProcessed: this.stats.totalProcessed,
            totalErrors: this.stats.totalErrors,
            currentQueueLength: this.stats.currentQueueLength,
            batchesProcessed: this.stats.batchesProcessed,
            avgBatchTime: Math.round(this.stats.avgBatchTime),
            uptime: uptime,
            uptimeFormatted: this.formatUptime(uptime),
            throughput: this.stats.totalProcessed > 0 ?
                (this.stats.totalProcessed / (uptime / 1000)).toFixed(2) : 0,
            errorRate: this.stats.totalProcessed > 0 ?
                ((this.stats.totalErrors / this.stats.totalProcessed) * 100).toFixed(2) : 0
        };
    }

    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    clear() {

        this.queue.forEach(item => {
            if (item.reject) {
                item.reject(new Error('Queue cleared'));
            }
        });
        this.queue = [];
        this.stats.currentQueueLength = 0;
        this.stopProcessing();
    }

    async shutdown() {
        console.log('🛑 Finalizando MessageQueue...');
        this.stopProcessing();


        const shutdownTimeout = 10000;
        const startTime = Date.now();

        while (this.activeWorkers > 0 && (Date.now() - startTime) < shutdownTimeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.activeWorkers > 0) {
            console.warn(`⚠️ ${this.activeWorkers} workers ainda ativos após timeout de shutdown`);
        }

        this.clear();
        console.log('✅ MessageQueue finalizado');
    }
}

const messageQueue = new MessageQueue(3, 3, 1); 

const configPath = path.join(__dirname, "config.json");
let config;
let DEBUG_MODE = false; 



global.CAPTCHA_LOCK = global.CAPTCHA_LOCK || new Set();


try {
    const configContent = readFileSync(configPath, "utf8");
    config = JSON.parse(configContent);


    if (!config.prefixo || !config.nomebot || !config.numerodono) {
        throw new Error('Configuração inválida: campos obrigatórios ausentes (prefixo, nomebot, numerodono)');
    }


    DEBUG_MODE = config.debug === true || process.env.KYARA_DEBUG === '1';
    if (DEBUG_MODE) {
        console.log('🐛 Modo DEBUG ativado - Logs detalhados habilitados');
    }



} catch (err) {
    console.error(`❌ Erro ao carregar configuração: ${err.message}`);
    process.exit(1);
}

// ============================================================
// 🌸 KYARA — VER CANAL GLOBAL
//
// Injeta o "Ver canal" nativo do WhatsApp em todo conteúdo
// enviado pelos emissores globais da Kyara.
//
// CANAL:
//   BOT-KYARA
//   https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r
//
// O controle pode ser ligado/desligado por #vercanal,
// mas somente o proprietário mestre consegue alterar.
// ============================================================

const KYARA_CHANNEL_NAME = 'BOT-KYARA';
const KYARA_CHANNEL_INVITE = '0029VbCs39EIyPtbsseKIP3r';

let kyaraGlobalChannelJid = null;
let kyaraGlobalChannelName = KYARA_CHANNEL_NAME;
let kyaraGlobalChannelLookupPromise = null;

globalThis.__KYARA_CHANNEL_ENABLED__ =
    config?.kyaraChannel?.enabled !== false;

async function resolveKyaraGlobalChannel(KyaraSock) {
    if (kyaraGlobalChannelJid) {
        return {
            jid: kyaraGlobalChannelJid,
            name: kyaraGlobalChannelName
        };
    }

    if (kyaraGlobalChannelLookupPromise) {
        return kyaraGlobalChannelLookupPromise;
    }

    kyaraGlobalChannelLookupPromise = (async () => {
        try {
            if (
                !KyaraSock ||
                typeof KyaraSock.newsletterMetadata !== 'function'
            ) {
                console.warn(
                    '[KYARA CHANNEL] newsletterMetadata() indisponível.'
                );

                return null;
            }

            const metadata =
                await KyaraSock.newsletterMetadata(
                    'invite',
                    KYARA_CHANNEL_INVITE
                );

            const jid =
                metadata?.id ||
                metadata?.jid ||
                metadata?.newsletterJid ||
                null;

            if (
                !jid ||
                !/@newsletter$/i.test(
                    String(jid)
                )
            ) {
                console.warn(
                    '[KYARA CHANNEL] JID do BOT-KYARA não foi resolvido.'
                );

                return null;
            }

            kyaraGlobalChannelJid =
                String(jid);

            kyaraGlobalChannelName =
                String(
                    metadata?.name ||
                    KYARA_CHANNEL_NAME
                );

            console.log(
                '[KYARA CHANNEL] ✅ Canal global resolvido:',
                kyaraGlobalChannelJid,
                '|',
                kyaraGlobalChannelName
            );

            return {
                jid:
                    kyaraGlobalChannelJid,

                name:
                    kyaraGlobalChannelName
            };

        } catch (error) {

            console.warn(
                '[KYARA CHANNEL] ⚠️ Falha ao resolver canal:',
                error?.message ||
                error
            );

            return null;

        } finally {

            kyaraGlobalChannelLookupPromise =
                null;
        }
    })();

    return kyaraGlobalChannelLookupPromise;
}

function kyaraChannelShouldSkip(
    jid,
    content
) {
    if (
        !globalThis.__KYARA_CHANNEL_ENABLED__
    ) {
        return true;
    }

    if (!jid) {
        return true;
    }

    if (
        jid ===
        'status@broadcast'
    ) {
        return true;
    }

    if (
        typeof isJidNewsletter === 'function' &&
        isJidNewsletter(jid)
    ) {
        return true;
    }

    if (
        !content ||
        typeof content !== 'object'
    ) {
        return true;
    }

    const blockedKeys = [
        'delete',
        'reaction',
        'protocolMessage',
        'pollUpdateMessage',
        'senderKeyDistributionMessage',
        'call',
        'forward'
    ];

    return blockedKeys.some(
        key =>
            Object.prototype.hasOwnProperty.call(
                content,
                key
            )
    );
}

function buildKyaraChannelContext(
    channelInfo,
    existingContext
) {
    return {
        ...(existingContext &&
        typeof existingContext === 'object'
            ? existingContext
            : {}),

        forwardingScore:
            Math.max(
                Number(
                    existingContext?.forwardingScore ||
                    0
                ),
                9999
            ),

        isForwarded:
            true,

        forwardedNewsletterMessageInfo: {
            newsletterJid:
                channelInfo.jid,

            newsletterName:
                channelInfo.name ||
                KYARA_CHANNEL_NAME,

            serverMessageId:
                1
        }
    };
}

async function applyKyaraGlobalChannelToContent(
    KyaraSock,
    jid,
    content
) {
    if (
        kyaraChannelShouldSkip(
            jid,
            content
        )
    ) {
        return content;
    }

    try {

        const channelInfo =
            await resolveKyaraGlobalChannel(
                KyaraSock
            );

        if (!channelInfo?.jid) {
            return content;
        }

        return {
            ...content,

            contextInfo:
                buildKyaraChannelContext(
                    channelInfo,
                    content.contextInfo
                )
        };

    } catch (error) {

        console.warn(
            '[KYARA CHANNEL] ⚠️ Erro no contexto:',
            error?.message ||
            error
        );

        return content;
    }
}

const KYARA_RELAY_LEAF_KEYS =
    new Set([
        'extendedTextMessage',
        'imageMessage',
        'videoMessage',
        'audioMessage',
        'documentMessage',
        'stickerMessage',
        'locationMessage',
        'liveLocationMessage',
        'contactMessage',
        'contactsArrayMessage',
        'buttonsMessage',
        'templateMessage',
        'listMessage',
        'interactiveMessage',
        'eventMessage',
        'pollCreationMessage',
        'pollCreationMessageV3',
        'requestPhoneNumberMessage',
        'pinInChatMessage'
    ]);

const KYARA_RELAY_WRAPPERS =
    new Set([
        'viewOnceMessage',
        'viewOnceMessageV2',
        'viewOnceMessageV2Extension',
        'ephemeralMessage',
        'documentWithCaptionMessage'
    ]);

function applyKyaraChannelToRelayNode(
    node,
    channelInfo
) {
    if (
        !node ||
        typeof node !== 'object'
    ) {
        return node;
    }

    if (
        typeof node.conversation ===
        'string'
    ) {
        return {
            ...node,

            extendedTextMessage: {
                text:
                    node.conversation,

                contextInfo:
                    buildKyaraChannelContext(
                        channelInfo,
                        node.contextInfo
                    )
            }
        };
    }

    for (
        const key
        of KYARA_RELAY_LEAF_KEYS
    ) {

        if (
            node[key] &&
            typeof node[key] === 'object'
        ) {
            return {
                ...node,

                [key]: {
                    ...node[key],

                    contextInfo:
                        buildKyaraChannelContext(
                            channelInfo,
                            node[key].contextInfo
                        )
                }
            };
        }
    }

    for (
        const key
        of KYARA_RELAY_WRAPPERS
    ) {

        if (
            node[key]?.message
        ) {
            return {
                ...node,

                [key]: {
                    ...node[key],

                    message:
                        applyKyaraChannelToRelayNode(
                            node[key].message,
                            channelInfo
                        )
                }
            };
        }
    }

    return node;
}

async function applyKyaraGlobalChannelToRelay(
    KyaraSock,
    jid,
    message
) {
    if (
        !globalThis.__KYARA_CHANNEL_ENABLED__
    ) {
        return message;
    }

    if (
        !jid ||
        jid === 'status@broadcast'
    ) {
        return message;
    }

    if (
        typeof isJidNewsletter === 'function' &&
        isJidNewsletter(jid)
    ) {
        return message;
    }

    if (
        !message ||
        typeof message !== 'object'
    ) {
        return message;
    }

    try {

        const channelInfo =
            await resolveKyaraGlobalChannel(
                KyaraSock
            );

        if (!channelInfo?.jid) {
            return message;
        }

        return applyKyaraChannelToRelayNode(
            message,
            channelInfo
        );

    } catch (error) {

        console.warn(
            '[KYARA CHANNEL] ⚠️ Erro no relay:',
            error?.message ||
            error
        );

        return message;
    }
}

const indexModule = (await import('./index.js')).default ?? (await import('./index.js'));



const performanceOptimizer = new PerformanceOptimizer();

const {
    prefixo,
    nomebot,
    nomedono,
    numerodono
} = config;

const rentalExpirationManager = new RentalExpirationManager(null, {
    ownerNumber: numerodono,
    ownerName: nomedono,
    checkInterval: '0 */6 * * *',
    warningDays: 3,
    finalWarningDays: 1,
    cleanupDelayHours: 24,
    enableNotifications: true,
    enableAutoCleanup: true,
    logFile: path.join(__dirname, '../logs/rental_expiration.log')
});


/* KYARA_SESSIONENTRY_GUARD */

const KYARA_ORIGINAL_CONSOLE = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console)
};

function kyaraIsSessionDump(args) {
    try {
        const first = String(args?.[0] ?? '');

        return (
            first.includes('Closing session: SessionEntry') ||
            first.trim() === 'Closing session:' ||
            first.includes('SessionEntry {')
        );
    } catch {
        return false;
    }
}

for (const method of [
    'log',
    'info',
    'warn',
    'error',
    'debug'
]) {
    const original = KYARA_ORIGINAL_CONSOLE[method];

    console[method] = (...args) => {
        if (kyaraIsSessionDump(args)) {
            return;
        }

        return original(...args);
    };
}

const logger = pino({
    level: process.env.KYARA_BAILEYS_LOG_LEVEL || 'silent'
});

const AUTH_DIR = path.join(__dirname, '..', 'database', 'qr-code');
const DATABASE_DIR = path.join(__dirname, '..', 'database');
const GLOBAL_BLACKLIST_PATH = path.join(__dirname, '..', 'database', 'dono', 'globalBlacklist.json');

 let _globalBlacklistCache = null;
let _globalBlacklistCacheTime = 0;
const GLOBAL_BLACKLIST_TTL_MS = 60_000;

let msgRetryCounterCache;
let messagesCache;

configureCommandExecutor({
    prefix:
      getCurrentPrefix(
        buildUserId(
          numerodono,
          config
        )
      ),

    getPrefix:
      (jid) =>
        getCurrentPrefix(jid),

    defaultJid: buildUserId(numerodono, config),
    defaultName: nomedono || 'Dono',
    listChats: async () => {
        const sock = getActiveSocket();
        if (!sock) return [];
        try {
            const metadata = await sock.groupFetchAllParticipating();
            return Object.values(metadata || {})
                .map(g => ({ jid: g.id, name: g.subject || g.id }))
                .sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
        } catch {
            return [];
        }
    },
    execute: async ({ jid, text }) => {
        const sock = await waitForActiveSocket(15000);
        const targetJid = jid || buildUserId(numerodono, config);
        const replies = [];
        const originalSend = sock.sendMessage.bind(sock);

        sock.sendMessage = async (toJid, content, opts) => {
            if (String(toJid) === String(targetJid)) {
                replies.push(content);
            }
            return originalSend(toJid, content, opts);
        };

        const info = {
            key: {
                remoteJid: targetJid,
                participant: buildUserId(numerodono, config),
                fromMe: false,
                id: 'TERMINAL-' + Date.now()
            },
            pushName: nomedono || 'Baki',
            message: { conversation: String(text || "") },
            messageTimestamp: Math.floor(Date.now() / 1000)
        };

        try {
            await indexModule(sock, info, null, messagesCache || new Map(), rentalExpirationManager);

            kyaraTerminalEvent('command', {
                command: String(text || ''),
                group: targetJid,
                user: nomedono || 'Terminal',
                success: true
            });

            return { ok: true, jid: targetJid, replies };

        } catch (err) {

            kyaraTerminalEvent('command', {
                command: String(text || ''),
                group: targetJid,
                user: nomedono || 'Terminal',
                success: false
            });

            kyaraTerminalEvent('error', {
                message: '[Terminal] ' + (err?.message || err)
            });

            throw err;

        } finally {
            sock.sendMessage = originalSend;
        }
    }
});



async function initializeOptimizedCaches(KyaraSock) {
    try {
        await performanceOptimizer.initialize();


        const requestCaptchaMsg = async (dataCaptcha) => {

            await KyaraSock.sendMessage(dataCaptcha.groupId, { text: `⚠️ @${dataCaptcha.idOrigin.split('@')[0]} não resolveu o captcha a tempo e foi removido.` });
            await KyaraSock.groupParticipantsUpdate(dataCaptcha.groupId, [dataCaptcha.idOrigin], 'remove').catch(() => { });
        };
        await initCaptchaIndex(requestCaptchaMsg);

        msgRetryCounterCache = {
            get: (key) => performanceOptimizer.cacheGet('msgRetry', key),
            set: (key, value, ttl) => performanceOptimizer.cacheSet('msgRetry', key, value, ttl),
            del: (key) => performanceOptimizer.modules.cacheManager?.del('msgRetry', key)
        };

        messagesCache = new Map();

    } catch (error) {
        console.error('❌ Erro ao inicializar sistema de otimização:', error.message);

        msgRetryCounterCache = new NodeCache({
            stdTTL: 5 * 60,
            useClones: false
        });
        messagesCache = new Map();

    }
}
const connectionMethod = process.env.KYARA_CONNECTION_METHOD || 'auto';

/*
 * ============================================================
 * KYARA CLEAN TERMINAL
 *
 * Quando iniciado através de:
 *
 *   npm start
 *
 * o launcher define:
 *
 *   KYARA_LAUNCHER=true
 *
 * Os logs técnicos deixam de poluir o terminal DEPOIS
 * que o WhatsApp realmente conecta.
 *
 * QR/pairing continuam normais antes da conexão.
 * ============================================================
 */

const KYARA_LAUNCHER_MODE =
    process.env.KYARA_LAUNCHER === 'true';

let KYARA_CLEAN_RUNTIME = false;

const enableKyaraCleanRuntime = () => {

    if (
        !KYARA_LAUNCHER_MODE ||
        KYARA_CLEAN_RUNTIME
    ) {
        return;
    }

    KYARA_CLEAN_RUNTIME = true;

    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.debug = () => {};
};


/* ============================================================
 * 🌸 KYARA AUTH UI — TEMA PREMIUM TERMUX
 * ============================================================ */

const KYARA_UI = Object.freeze({
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    purple: '\x1b[38;5;141m',
    pink: '\x1b[38;5;213m',
    cyan: '\x1b[38;5;81m',
    green: '\x1b[38;5;120m',
    yellow: '\x1b[38;5;221m',
    white: '\x1b[38;5;255m',
    gray: '\x1b[38;5;245m',
    red: '\x1b[38;5;204m'
});

const uiColor = (
    color,
    text
) =>
    `${color}${text}${KYARA_UI.reset}`;

const uiCenter = (
    text,
    width = 48
) => {
    const value =
        String(text ?? '');

    const gap =
        Math.max(
            0,
            width - value.length
        );

    const left =
        Math.floor(gap / 2);

    const right =
        gap - left;

    return (
        ' '.repeat(left) +
        value +
        ' '.repeat(right)
    );
};

const uiLine = (
    text = '',
    width = 48
) =>
    `│${String(text).padEnd(width, ' ')}│`;

const uiFrameTop = (
    width = 48
) =>
    `╭${'─'.repeat(width)}╮`;

const uiFrameMid = (
    width = 48
) =>
    `├${'─'.repeat(width)}┤`;

const uiFrameBottom = (
    width = 48
) =>
    `╰${'─'.repeat(width)}╯`;

const printKyaraAuthBanner = () => {
    if (
        KYARA_LAUNCHER_MODE &&
        connectionMethod === 'auto'
    ) {
        return;
    }

    const width = 52;

    console.log('');
    console.log(
        uiColor(
            KYARA_UI.purple,
            `╭${'─'.repeat(width)}╮`
        )
    );

    console.log(
        uiColor(
            KYARA_UI.purple,
            '│'
        ) +
        uiColor(
            KYARA_UI.pink + KYARA_UI.bold,
            uiCenter(
                '🌸  K Y A R A',
                width
            )
        ) +
        uiColor(
            KYARA_UI.purple,
            '│'
        )
    );

    console.log(
        uiColor(
            KYARA_UI.purple,
            '│'
        ) +
        uiColor(
            KYARA_UI.cyan,
            uiCenter(
                'WHATSAPP AUTOMATION CORE',
                width
            )
        ) +
        uiColor(
            KYARA_UI.purple,
            '│'
        )
    );

    console.log(
        uiColor(
            KYARA_UI.purple,
            '│'
        ) +
        uiColor(
            KYARA_UI.dim,
            uiCenter(
                'AUTHENTICATION CENTER',
                width
            )
        ) +
        uiColor(
            KYARA_UI.purple,
            '│'
        )
    );

    console.log(
        uiColor(
            KYARA_UI.purple,
            `╰${'─'.repeat(width)}╯`
        )
    );

    console.log('');
};

const printKyaraPairingCard = (
    code
) => {
    const width = 48;
    const value =
        String(code || '');

    console.log('');
    console.log(
        uiColor(
            KYARA_UI.purple,
            uiFrameTop(width)
        )
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.pink + KYARA_UI.bold,
            uiCenter(
                '🌸 CÓDIGO DE PAREAMENTO',
                width
            )
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(
            KYARA_UI.purple,
            uiFrameMid(width)
        )
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.dim,
            uiCenter(
                'SEU CÓDIGO',
                width
            )
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.cyan + KYARA_UI.bold,
            uiCenter(
                value,
                width
            )
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.dim,
            uiCenter(
                'válido para esta tentativa',
                width
            )
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(
            KYARA_UI.purple,
            uiFrameMid(width)
        )
    );

    const steps = [
        '1  Abra o WhatsApp',
        '2  Configurações',
        '3  Dispositivos conectados',
        '4  Conectar com número de telefone',
        '5  Digite o código acima'
    ];

    for (
        const step of steps
    ) {
        console.log(
            uiColor(KYARA_UI.purple, '│') +
            uiColor(
                KYARA_UI.white,
                `  ${step}`.padEnd(
                    width,
                    ' '
                )
            ) +
            uiColor(KYARA_UI.purple, '│')
        );
    }

    console.log(
        uiColor(
            KYARA_UI.purple,
            uiFrameMid(width)
        )
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.yellow,
            uiCenter(
                '◉ AGUARDANDO AUTENTICAÇÃO',
                width
            )
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.dim,
            uiCenter(
                'o terminal visual iniciará após conectar',
                width
            )
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(
            KYARA_UI.purple,
            uiFrameBottom(width)
        )
    );

    console.log('');
};



let codeMode =
    connectionMethod === 'pairing' ||
    process.argv.includes('--code') ||
    process.env.KYARA_CODE_MODE === '1';

let authMethodChosen =
    connectionMethod !== 'auto';


let cacheCleanupInterval = null;
const setupMessagesCacheCleanup = () => {
    if (cacheCleanupInterval) clearInterval(cacheCleanupInterval);

    cacheCleanupInterval = setInterval(() => {
        if (!messagesCache || messagesCache.size <= 3000) return;

        const keysToDelete = Math.floor(messagesCache.size * 0.4); 
        const keys = Array.from(messagesCache.keys()).slice(0, keysToDelete);
        keys.forEach(key => messagesCache.delete(key));

        console.log(`🧹 Cache limpo: ${keysToDelete} mensagens removidas (total: ${messagesCache.size})`);
    }, 300000); // A cada 5 minutos
};


const startCacheCleanup = () => {
    setupMessagesCacheCleanup();
};

const chooseAuthenticationMethod = async () => {

    if (
        connectionMethod === 'pairing' ||
        process.argv.includes('--code') ||
        process.env.KYARA_CODE_MODE === '1'
    ) {
        return 'pairing';
    }

    if (
        connectionMethod === 'qr' ||
        process.argv.includes('--qr') ||
        process.env.KYARA_QR_MODE === '1'
    ) {
        return 'qr';
    }

    printKyaraAuthBanner();

    console.log(
        uiColor(
            KYARA_UI.purple,
            uiFrameTop()
        )
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.white + KYARA_UI.bold,
            uiCenter(
                'ESCOLHA COMO CONECTAR',
                48
            )
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(
            KYARA_UI.purple,
            uiFrameMid()
        )
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.cyan,
            '  1  📱  CÓDIGO DE PAREAMENTO'.padEnd(48)
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.dim,
            '     conexão rápida pelo número'.padEnd(48)
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.pink,
            '  2  ▣   QR CODE'.padEnd(48)
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.dim,
            '     escaneie diretamente pelo WhatsApp'.padEnd(48)
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        ' '.repeat(48) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.gray,
            '  0  ❌  SAIR'.padEnd(48)
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(
            KYARA_UI.purple,
            uiFrameBottom()
        )
    );

    console.log('');

    const option =
        String(
            await ask(
                '  ➜ Método: '
            )
        ).trim();

    if (option === '2') {
        return 'qr';
    }

    if (option === '1') {
        return 'pairing';
    }

    if (option === '0') {
        console.log('👋 Kyara encerrado pelo usuário.');
        process.exit(0);
    }

    console.log('⚠️ Opção inválida. Usando Código de pareamento.');
    return 'pairing';
};

const ask = (question) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
    }));
};


async function clearAuthDir(dirToRemove = AUTH_DIR) {

    try {
        const normalized = path.resolve(dirToRemove);


        const rootPath = path.parse(normalized).root;
        if (normalized === rootPath) {
            console.error(`❌ Abortando limpeza: caminho inválido (${normalized})`);
            return;
        }

        const normalizedParts = normalized.split(path.sep).filter(Boolean);
        const looksLikeAuthDir = normalizedParts.includes('qr-code') || normalizedParts.includes('auth');
        if (!looksLikeAuthDir) {
            console.error(`❌ Abortando limpeza: caminho não parece diretório de auth/qr-code (${normalized})`);
            return;
        }

        if (typeof fs.rm === 'function') {
            await fs.rm(normalized, { recursive: true, force: true });
        } else if (typeof fs.rmdir === 'function') {

            await fs.rmdir(normalized, { recursive: true }).catch(() => { });
        } else {
            throw new Error('API de remoção de diretório não disponível (fs.rm/fs.rmdir)');
        }

        console.log(`🗑️ Pasta de autenticação (${normalized}) excluída com sucesso.`);
    } catch (err) {
        console.error(`❌ Erro ao excluir pasta de autenticação (${dirToRemove}): ${err.message}`);
    }
}

async function loadGroupSettings(groupId) {
    const groupFilePath = path.join(DATABASE_DIR, 'grupos', `${groupId}.json`);
    try {
        const data = await fs.readFile(groupFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`❌ Erro ao ler configurações do grupo ${groupId}: ${e.message}`);
        return {};
    }
}

import { createWelcomeAnimation } from './funcs/kyara-welcome-animation.cjs';

async function loadGlobalBlacklist() {

    const now = Date.now();
    if (_globalBlacklistCache !== null && (now - _globalBlacklistCacheTime) < GLOBAL_BLACKLIST_TTL_MS) {
        return _globalBlacklistCache;
    }
    try {
        const data = await fs.readFile(GLOBAL_BLACKLIST_PATH, 'utf-8');
        _globalBlacklistCache = JSON.parse(data).users || {};
        _globalBlacklistCacheTime = now;
        return _globalBlacklistCache;
    } catch (e) {
        console.error(`❌ Erro ao ler blacklist global: ${e.message}`);

        return _globalBlacklistCache ?? {};
    }
}

function formatMessageText(template, replacements) {
    let text = template;
    for (const [key, value] of Object.entries(replacements)) {
        text = text.replaceAll(key, value);
    }
    return text;
}


async function createGroupMessage(KyaraSock, groupMetadata, participants, settings, isWelcome = true) {
  const globalJson = JSON.parse(
    await fs.readFile(DATABASE_DIR + '/global.json', 'utf-8')
  );

  const mentions = participants.map(p => p);

  const replacements = {
    '#numerodele#': participants.map(p => `@${p.split('@')[0]}`).join(', '),
    '#nomedogp#': groupMetadata.subject,
    '#desc#': groupMetadata.desc || 'Nenhuma',
    '#membros#': groupMetadata.participants.length,
  };

  const defaultText = isWelcome
    ? (globalJson.textbv || "╭━━━⊱ 🌟 *BEM-VINDO(A/S)!* 🌟 ⊱━━━╮\n│\n│ 👤 #numerodele#\n│\n│ 🏠 Grupo: *#nomedogp#*\n│ 👥 Membros: *#membros#*\n│\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n✨ *Seja bem-vindo(a/s) ao grupo!* ✨")
    : (globalJson.exit?.text || "╭━━━⊱ 👋 *ATÉ LOGO!* 👋 ⊱━━━╮\n│\n│ 👤 #numerodele#\n│\n│ 🚪 Saiu do grupo\n│ *#nomedogp#*\n│\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n💫 *Até a próxima!* 💫");


  const chosenText = settings.textbv || defaultText;
  const text = formatMessageText(chosenText, replacements);

  const message = {
    text,
    mentions
  };

  if (settings.photo === false) {

  } else if (settings.photoType === 'api') {

    let profilePicUrl = 'https://raw.githubusercontent.com/nazuninha/uploads/main/outros/1747053564257_bzswae.bin';

    if (participants.length === 1) {
      profilePicUrl = await KyaraSock.profilePictureUrl(participants[0], 'image')
        .catch(() => profilePicUrl);
    }

    const nome = participants.length === 1
      ? participants[0].split('@')[0]
      : `${participants.length} membros`;

    const cardTitle = isWelcome ? 'Bem vindo (a)!' : 'Até logo!';

    const result = await canvas.gerarwelcomecard(
      profilePicUrl,
      nome,
      cardTitle,
      globalJson.welcomecard?.fundo || null,
      globalJson.welcomecard?.corMoldura || null,
      globalJson.welcomecard?.corLinhas || null,
      false
    );

    if (result?.ok) {
      message.image = { url: result.url };
      message.caption = text;
      delete message.text;
    }
  } else if (settings.photoType === 'custom' && settings.image) {
    message.image = { url: settings.image };
    message.caption = text;
    delete message.text;
  } else if (globalJson.welcomecard?.fundo) {
    message.image = { url: globalJson.welcomecard.fundo };
    message.caption = text;
    delete message.text;
  }

  return message;
}





async function handleGroupParticipantsUpdate(KyaraSock, inf) {
    try {
        const from = inf.id || inf.jid || (inf.participants?.length
            ? inf.participants[0].split('@')[0] + '@s.whatsapp.net'
            : null);

        if (DEBUG_MODE) {
            console.log('🐛 [EVENTO]');
            console.log('📌 Grupo:', from);
            console.log('📌 Ação:', inf.action);
        }

        if (!from) return;
        if (!inf.participants?.length) return;

        const botId = KyaraSock.user.id.split(':')[0];

        inf.participants = inf.participants.map(isValidParticipant).filter(Boolean);
        if (inf.participants.some(p => p.startsWith(botId))) return;

        const groupMetadata = await KyaraSock.groupMetadata(from).catch(() => null);
        if (!groupMetadata) return;

        const groupSettings = await loadGroupSettings(from);
        
        
        const globalBlacklist = await loadGlobalBlacklist();
        const captchaData = await loadCaptchaJson();

        switch (inf.action) {


            case 'add': {
                global.CAPTCHA_LOCK = global.CAPTCHA_LOCK || new Set();

                const membersToWelcome = [];
                const membersToWelcome2 = [];
                const membersToRemove = [];
                const removalReasons = [];

const entradaPorLink = !inf.author || inf.participants.includes(inf.author);


if (groupSettings?.x9 && inf.author && !entradaPorLink) {

    const autor = inf.author.split('@')[0];

    for (const membro of inf.participants) {

        const membroNum = membro.split('@')[0];

        await KyaraSock.sendMessage(from, {
            text: `✅ @${autor} aprovou a entrada de
👤 @${membroNum}`,
            mentions: [inf.author, membro]
        }).catch(() => {});
    }
}

                for (const participant of inf.participants) {

                    const userId = participant.split('@')[0];


                    if (globalBlacklist?.[participant]) {
                        membersToRemove.push(participant);
                        removalReasons.push(`@${userId} (blacklist global)`);
                        continue;
                    }


                    if (groupSettings.blacklist?.[participant]) {
                        membersToRemove.push(participant);
                        removalReasons.push(`@${userId} (blacklist grupo)`);
                        continue;
                    }


                    const participantStripped = participant.replace(/@.*/, '');
                    let participantNumber = participantStripped;

                    let isLid = false;

                    if (participant.endsWith('@lid')) {
                        isLid = true;
                        try {
                            const resolved = await KyaraSock.onWhatsApp(participant);
                            if (resolved?.[0]?.jid) {
                                participantNumber = resolved[0].jid.replace(/@.*/, '');

                            }
                        } catch { }
                    }




                    const hasCaptchaJson = Object.values(captchaData).find(c => {
                        const lid = c.lid?.replace(/@.*/, '');
                        const id = c.id?.replace(/@.*/, '');
                        const idOrigin = c.idOrigin?.replace(/@.*/, '');

                        return (
                            lid === participantStripped ||
                            id === participantStripped ||
                            id === participantNumber ||
                            idOrigin === participantStripped ||
                            idOrigin === participantNumber
                        );
                    });


                    const hasCaptchaLock = [...global.CAPTCHA_LOCK].some(x => {
                        const xStripped = x.replace(/@.*/, '');
                        return xStripped === participantNumber;
                    });

                    if (groupSettings.captchaEnabled) {

                        if (hasCaptchaJson || hasCaptchaLock) {

                            continue;
                        }


                        if (!entradaPorLink) {

                            continue;
                        }

                        if (isLid && participantNumber === participantStripped) {

                            continue;
                        }



                        global.CAPTCHA_LOCK.add(`${participantNumber}@s.whatsapp.net`);

                        const typeIds = {
                            id: `${participantNumber}@s.whatsapp.net`,
                            lid: isLid ? participant : '',
                            participant
                        };

                        const num1 = Math.floor(Math.random() * 10) + 1;
                        const num2 = Math.floor(Math.random() * 10) + 1;

                        const answer = num1 + num2;
                        const expiresAt = Date.now() + 5 * 60 * 1000;

                        CaptchaIndex.add(typeIds, from, answer, expiresAt, participantNumber);

                        await KyaraSock.sendMessage(from, {
                            text: `🔐 *VERIFICAÇÃO*\n\nOlá @${participantNumber}\n\n❓ ${num1} + ${num2} = ?\n\n⏱️ 5 minutos.`,
                            mentions: [`${participantNumber}@s.whatsapp.net`]
                        });

                        continue; 
                    }


                    if (groupSettings.bemvindo) {
                        console.log(`✅ Enviando welcome Kyara para ${participantNumber}`);
                        membersToWelcome.push(participant);
                    } else if (groupSettings.bemvindo2) {
                        console.log(`✅ Enviando welcome2 (sem foto) para ${participantNumber}`);
                        membersToWelcome2.push(participant);
                    }
                }


                if (membersToRemove.length) {
                    await KyaraSock.groupParticipantsUpdate(from, membersToRemove, 'remove');

                    await KyaraSock.sendMessage(from, {
                        text: `🚫 Removidos:\n- ${removalReasons.join('\n- ')}`,
                        mentions: membersToRemove
                    });
                }


                if (membersToWelcome.length) {
                    const welcomeSettings = {
                        ...(groupSettings.welcome || {}),
                        textbv: groupSettings.textbv
                    };

                    /*
                     * KYARA NEON ANIMATION
                     *
                     * Por padrão a animação fica ligada.
                     * Se futuramente:
                     *
                     * welcome.animation = false
                     *
                     * for configurado, o sistema antigo continua sendo usado.
                     */

                    if (welcomeSettings.animation !== false) {
                        const animation = await createWelcomeAnimation(
                            KyaraSock,
                            groupMetadata,
                            membersToWelcome,
                            true
                        );

                        if (animation?.ok) {
                            try {
                                const messageText = await createGroupMessage(
                                    KyaraSock,
                                    groupMetadata,
                                    membersToWelcome,
                                    {
                                        ...welcomeSettings,
                                        photo: false
                                    }
                                );

                                await KyaraSock.sendMessage(from, {
                                    video: {
                                        url: animation.path
                                    },
                                    mimetype: 'video/mp4',
                                    gifPlayback: true,
caption: messageText?.text || '',
                                    mentions: membersToWelcome
                                });

                            } finally {
                                await animation.cleanup?.();
                            }

                        } else {
                            console.error(
                                '⚠️ [KYARA ANIMATION] Falhou, usando Welcome Card:',
                                animation?.error?.message || animation?.error || 'erro desconhecido'
                            );

                            const message = await createGroupMessage(
                                KyaraSock,
                                groupMetadata,
                                membersToWelcome,
                                welcomeSettings
                            );

                            await KyaraSock.sendMessage(from, message);
                        }

                    } else {

                        const message = await createGroupMessage(
                            KyaraSock,
                            groupMetadata,
                            membersToWelcome,
                            welcomeSettings
                        );

                        await KyaraSock.sendMessage(from, message);
                    }
                }

                if (membersToWelcome2.length) {
                    const mentions = membersToWelcome2.map(p => p);
                    const replacements = {
                        '#numerodele#': membersToWelcome2.map(p => `@${p.split('@')[0]}`).join(', '),
                        '#nomedogp#': groupMetadata.subject,
                        '#desc#': groupMetadata.desc || 'Nenhuma',
                        '#membros#': groupMetadata.participants.length,
                    };
                    const defaultText2 = "╭━━━⊱ 🌟 *BEM-VINDO(A/S)!* 🌟 ⊱━━━╮\n│\n│ 👤 #numerodele#\n│\n│ 🏠 Grupo: *#nomedogp#*\n│ 👥 Membros: *#membros#*\n│\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n✨ *Seja bem-vindo(a/s) ao grupo!* ✨";
                    const chosenText2 = groupSettings.textbv2 || defaultText2;
                    const text2 = formatMessageText(chosenText2, replacements);
                    await KyaraSock.sendMessage(from, { text: text2, mentions });
                }

                break;
            }

            case 'remove': {
                if (groupSettings.exit?.enabled) {

                    const exitSettings = {
                        ...(groupSettings.exit || {})
                    };

                    /*
                     * KYARA NEON EXIT
                     *
                     * A mesma identidade visual da entrada,
                     * mas com ATÉ LOGO.
                     */

                    if (exitSettings.animation !== false) {

                        const animation = await createWelcomeAnimation(
                            KyaraSock,
                            groupMetadata,
                            inf.participants,
                            false
                        );

                        if (animation?.ok) {

                            try {

                                const fallbackMessage =
                                    await createGroupMessage(
                                        KyaraSock,
                                        groupMetadata,
                                        inf.participants,
                                        {
                                            ...exitSettings,
                                            photo: false
                                        },
                                        false
                                    );

                                await KyaraSock.sendMessage(from, {
                                    video: {
                                        url: animation.path
                                    },
                                    mimetype: 'video/mp4',
                           gifPlayback: true,

                                    caption: fallbackMessage?.text || '',
                                    mentions: inf.participants
                                });

                            } catch (err) {

                                console.log(
                                    '❌ erro animação saída:',
                                    err.message
                                );

                            } finally {

                                await animation.cleanup?.();

                            }

                        } else {

                            console.error(
                                '⚠️ [KYARA EXIT ANIMATION] Falhou, usando saída antiga:',
                                animation?.error?.message ||
                                animation?.error ||
                                'erro desconhecido'
                            );

                            const message =
                                await createGroupMessage(
                                    KyaraSock,
                                    groupMetadata,
                                    inf.participants,
                                    exitSettings,
                                    false
                                );

                            await KyaraSock.sendMessage(
                                from,
                                message
                            ).catch(err =>
                                console.log(
                                    '❌ erro saída:',
                                    err.message
                                )
                            );
                        }

                    } else {

                        const message =
                            await createGroupMessage(
                                KyaraSock,
                                groupMetadata,
                                inf.participants,
                                exitSettings,
                                false
                            );

                        await KyaraSock.sendMessage(
                            from,
                            message
                        ).catch(err =>
                            console.log(
                                '❌ erro saída:',
                                err.message
                            )
                        );
                    }
                }

                break;
            }

            case 'promote':
            case 'demote': {

                if (!groupSettings?.x9) return;

                const autor = inf.author || '';

                for (const user of inf.participants) {

                    const userNum = user.split('@')[0];
                    const autorNum = autor ? autor.split('@')[0] : 'desconhecido';

                    const texto =
                        inf.action === 'promote'
                            ? `⬆️ @${userNum} virou ADM por @${autorNum}`
                            : `⬇️ @${userNum} deixou de ser ADM por @${autorNum}`;

                    await KyaraSock.sendMessage(from, {
                        text: texto,
                        mentions: autor ? [user, autor] : [user]
                    }).catch(() => { });
                }

                break;
            }
        }

    } catch (error) {
        console.error('❌ ERRO GERAL:', error);
    }
}






export async function saveGroupSettings(groupId, settings) {
    try {

        const safeId = groupId.replace(/[^a-zA-Z0-9]/g, '_');


        const dirPath = path.join(__dirname, 'database', 'groups');
        const filePath = path.join(dirPath, `${safeId}.json`);


        await fs.mkdir(dirPath, { recursive: true });


        const data = JSON.stringify(settings, null, 2);

        await fs.writeFile(filePath, data, 'utf-8');

        if (global.DEBUG_MODE) {
            console.log(`📝 [Settings] Configurações de ${groupId} atualizadas.`);
        }
    } catch (error) {
        console.error(`❌ Erro ao salvar settings de ${groupId}:`, error);
    }
}
async function handleGroupJoinRequest(KyaraSock, inf) {
    try {
        const typeIds = { id: '', lid: '', participant: '' };
        const from = inf.id;
        let participantJid = inf.participantPn || inf.participant;

        if (!from || !participantJid) return;


        if (typeof participantJid === "object") {
            Object.assign(typeIds, {
                id: participantJid?.pn?.endsWith("s.whatsapp.net") ? participantJid?.pn : '',
                lid: participantJid?.pn?.endsWith("lid") ? participantJid?.pn : participantJid?.lid,
            });
            participantJid = participantJid.pn || participantJid.lid;
        } else {
            typeIds.lid = participantJid.endsWith("lid") ? participantJid : '';
            typeIds.id = participantJid.endsWith("s.whatsapp.net") ? participantJid : '';
        }

        typeIds.participant = participantJid;


        global.CAPTCHA_LOCK.add(participantJid);

        if (typeIds.lid) {
            global.CAPTCHA_LOCK.add(typeIds.lid);

        }
        if (typeIds.id) {
            global.CAPTCHA_LOCK.add(typeIds.id);

        }

        const groupSettings = await loadGroupSettings(from);

if (
    groupSettings?.x9 &&
    (
        inf.action === 'reject' ||
        inf.action === 'rejected'
    )
) {

    const autor = inf.author;

    if (autor) {

        const autorNum = autor.split('@')[0];
        const membroNum = participantJid.split('@')[0];

        await KyaraSock.sendMessage(from, {
            text:
`❌ @${autorNum} recusou a entrada de
👤 @${membroNum}`,
            mentions: [autor, participantJid]
        }).catch(() => {});
    }

    return;
}


        if (groupSettings.autoAcceptRequests) {
            if (DEBUG_MODE) console.log(`[Auto-Accept] Aceitando ${participantJid} no grupo ${from}`);
            await KyaraSock.groupRequestParticipantsUpdate(from, [participantJid], 'approve');
            if (!groupSettings.captchaEnabled) return;
        }


        if (groupSettings.captchaEnabled) {

            const num1 = Math.floor(Math.random() * 10) + 1;
            const num2 = Math.floor(Math.random() * 10) + 1;
            const answer = num1 + num2;
            const timeAt = 5 * 60 * 1000;
            const expiresAt = Date.now() + timeAt;

            const numero = participantJid.split('@')[0];

            const foto = await KyaraSock.profilePictureUrl(participantJid, 'image')
                .catch(() => 'sem foto');

            const waInfo = await KyaraSock.onWhatsApp(participantJid)
                .catch(() => null);

            let nome = inf.participant;
            try {
                nome = await KyaraSock.getName(participantJid);
            } catch { }

            const metadata = await KyaraSock.groupMetadata(from).catch(() => null);
            const participanteMeta = metadata?.participants?.find(p => p.id === participantJid);



            CaptchaIndex.add(typeIds, from, answer, expiresAt, nome);

            await KyaraSock.sendMessage(from, {
                text: `🔐 *VERIFICAÇÃO DE SEGURANÇA*\n\n👋 Olá @${numero}!\n\nPara garantir que você não é um bot, resolva:\n❓ *${num1} + ${num2} = ?*\n\n⏱️ Você tem 5 minutos ou será removido.`,
                mentions: [participantJid]
            });
        }

    } catch (error) {
        console.error(`❌ Erro em handleGroupJoinRequest: ${error.message}`);
    }
}

const isValidJid = (str) => /^\d+@s\.whatsapp\.net$/.test(str);
const isValidLid = (str) => /^[a-zA-Z0-9_]+@lid$/.test(str);
const isValidUserId = (str) => isValidJid(str) || isValidLid(str);

function isValidParticipant(participant) {

    if (typeof participant === 'string') {
        if (participant.trim().length === 0) return false;
        return participant;
    }


    if (participant && typeof participant === 'object' && participant.hasOwnProperty('id')) {
        const id = participant.id;
        if (id === null || id === undefined || id === '') return false;
        if (typeof id === 'string' && id.trim().length === 0) return false;
        if (id === 0) return false;

        return id;
    }

    return false;
}

function collectJidsFromJson(obj, jidsSet = new Set()) {
    if (Array.isArray(obj)) {
        obj.forEach(item => collectJidsFromJson(item, jidsSet));
    } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(value => collectJidsFromJson(value, jidsSet));
    } else if (typeof obj === 'string' && isValidJid(obj)) {
        jidsSet.add(obj);
    }
    return jidsSet;
}

function replaceJidsInJson(obj, jidToLidMap, orphanJidsSet, replacementsCount = { count: 0 }, removalsCount = { count: 0 }) {
    if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            const newItem = replaceJidsInJson(item, jidToLidMap, orphanJidsSet, replacementsCount, removalsCount);
            if (newItem !== item) obj[index] = newItem;
        });
    } else if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (typeof value === 'string' && isValidJid(value)) {
                if (jidToLidMap.has(value)) {
                    obj[key] = jidToLidMap.get(value);
                    replacementsCount.count++;
                } else if (orphanJidsSet.has(value)) {
                    delete obj[key];
                    removalsCount.count++;
                }
            } else {
                const newValue = replaceJidsInJson(value, jidToLidMap, orphanJidsSet, replacementsCount, removalsCount);
                if (newValue !== value) obj[key] = newValue;
            }
        });
    } else if (typeof obj === 'string' && isValidJid(obj)) {
        if (jidToLidMap.has(obj)) {
            replacementsCount.count++;
            return jidToLidMap.get(obj);
        } else if (orphanJidsSet.has(obj)) {
            removalsCount.count++;
            return null;
        }
    }
    return obj;
}

async function scanForJids(directory) {
    const uniqueJids = new Set();
    const affectedFiles = new Map();
    const jidFiles = new Map();

    const scanFileContent = async (filePath) => {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const jsonObj = JSON.parse(content);
            const fileJids = collectJidsFromJson(jsonObj);
            if (fileJids.size > 0) {
                affectedFiles.set(filePath, Array.from(fileJids));
                fileJids.forEach(jid => uniqueJids.add(jid));
            }
        } catch (parseErr) {
            console.warn(`⚠️ Arquivo ${filePath} não é JSON válido. Usando fallback regex.`);
            const jidPattern = /(\d+@s\.whatsapp\.net)/g;
            const content = await fs.readFile(filePath, 'utf-8');
            let match;
            const fileJids = new Set();
            while ((match = jidPattern.exec(content)) !== null) {
                const jid = match[1];
                uniqueJids.add(jid);
                fileJids.add(jid);
            }
            if (fileJids.size > 0) {
                affectedFiles.set(filePath, Array.from(fileJids));
            }
        }
    };

    const checkAndScanFilename = async (fullPath) => {
        try {
            const basename = path.basename(fullPath, '.json');
            const filenameMatch = basename.match(/(\d+@s\.whatsapp\.net)/);
            if (filenameMatch) {
                const jidFromName = filenameMatch[1];
                if (isValidJid(jidFromName)) {
                    uniqueJids.add(jidFromName);
                    jidFiles.set(jidFromName, fullPath);
                }
            }
            await scanFileContent(fullPath);
        } catch (err) {
            console.error(`Erro ao processar ${fullPath}: ${err.message}`);
        }
    };

    const scanDir = async (dirPath) => {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    await scanDir(fullPath);
                } else if (entry.name.endsWith('.json')) {
                    await checkAndScanFilename(fullPath);
                }
            }
        } catch (err) {
            console.error(`Erro ao escanear diretório ${dirPath}: ${err.message}`);
        }
    };

    await scanDir(directory);

    try {
        await scanFileContent(configPath);
        const configBasename = path.basename(configPath, '.json');
        const filenameMatch = configBasename.match(/(\d+@s\.whatsapp\.net)/);
        if (filenameMatch) {
            const jidFromName = filenameMatch[1];
            if (isValidJid(jidFromName)) {
                uniqueJids.add(jidFromName);
                jidFiles.set(jidFromName, configPath);
            }
        }
    } catch (err) {
        console.error(`Erro ao escanear config.json: ${err.message}`);
    }

    return {
        uniqueJids: Array.from(uniqueJids),
        affectedFiles: Array.from(affectedFiles.entries()),
        jidFiles: Array.from(jidFiles.entries())
    };
}

async function replaceJidsInContent(affectedFiles, jidToLidMap, orphanJidsSet) {
    let totalReplacements = 0;
    let totalRemovals = 0;
    const updatedFiles = [];

    for (const [filePath, jids] of affectedFiles) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            let jsonObj = JSON.parse(content);
            const replacementsCount = { count: 0 };
            const removalsCount = { count: 0 };
            replaceJidsInJson(jsonObj, jidToLidMap, orphanJidsSet, replacementsCount, removalsCount);
            if (replacementsCount.count > 0 || removalsCount.count > 0) {
                const updatedContent = JSON.stringify(jsonObj, null, 2);
                await fs.writeFile(filePath, updatedContent, 'utf-8');
                totalReplacements += replacementsCount.count;
                totalRemovals += removalsCount.count;
                updatedFiles.push(path.basename(filePath));
            }
        } catch (err) {
            console.error(`Erro ao substituir em ${filePath}: ${err.message}`);
        }
    }

    return { totalReplacements, totalRemovals, updatedFiles };
}

async function handleJidFiles(jidFiles, jidToLidMap, orphanJidsSet) {
    let totalReplacements = 0;
    let totalRemovals = 0;
    const updatedFiles = [];
    const renamedFiles = [];
    const deletedFiles = [];

    for (const [jid, oldPath] of jidFiles) {
        if (orphanJidsSet.has(jid)) {
            try {
                await fs.unlink(oldPath);
                deletedFiles.push(path.basename(oldPath));
                totalRemovals++;
                continue;
            } catch (err) {
                console.error(`Erro ao excluir arquivo órfão ${oldPath}: ${err.message}`);
            }
        }

        const lid = jidToLidMap.get(jid);
        if (!lid) {
            continue;
        }

        try {
            const content = await fs.readFile(oldPath, 'utf-8');
            let jsonObj = JSON.parse(content);
            const replacementsCount = { count: 0 };
            const removalsCount = { count: 0 };
            replaceJidsInJson(jsonObj, jidToLidMap, orphanJidsSet, replacementsCount, removalsCount);
            totalReplacements += replacementsCount.count;
            totalRemovals += removalsCount.count;

            const dir = path.dirname(oldPath);
            const newPath = join(dir, `${lid}.json`);

            try {
                await fs.access(newPath);
                continue;
            } catch { }

            const updatedContent = JSON.stringify(jsonObj, null, 2);
            await fs.writeFile(newPath, updatedContent, 'utf-8');
            await fs.unlink(oldPath);

            updatedFiles.push(path.basename(newPath));
            renamedFiles.push({ old: path.basename(oldPath), new: path.basename(newPath) });

        } catch (err) {
            console.error(`Erro ao processar renomeação de ${oldPath}: ${err.message}`);
        }
    }

    return { totalReplacements, totalRemovals, updatedFiles, renamedFiles, deletedFiles };
}

async function fetchLidWithRetry(KyaraSock, jid, maxRetries = 3) {
    if (!jid || !isValidJid(jid)) {
        console.warn(`⚠️ JID inválido fornecido: ${jid}`);
        return null;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await KyaraSock.onWhatsApp(jid);
            if (result && result[0] && result[0].lid) {
                return { jid, lid: result[0].lid };
            }
            return null;
        } catch (err) {
            if (attempt === maxRetries) {
                console.warn(`⚠️ Falha ao buscar LID para ${jid} após ${maxRetries} tentativas`);
            }
        }
        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        }
    }
    return null;
}

async function fetchLidsInBatches(KyaraSock, uniqueJids, batchSize = 5) {
    const lidResults = [];
    const jidToLidMap = new Map();
    let successfulFetches = 0;

    for (let i = 0; i < uniqueJids.length; i += batchSize) {
        const batch = uniqueJids.slice(i, i + batchSize);

        const batchPromises = batch.map(jid => fetchLidWithRetry(KyaraSock, jid));
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                const { jid, lid } = result.value;
                lidResults.push({ jid, lid });
                jidToLidMap.set(jid, lid);
                successfulFetches++;
            }
        });

        if (i + batchSize < uniqueJids.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    return { lidResults, jidToLidMap, successfulFetches };
}

async function updateOwnerLid(KyaraSock) {
    const ownerJid = `${numerodono}@s.whatsapp.net`;
    try {
        const result = await fetchLidWithRetry(KyaraSock, ownerJid);
        if (result) {
            config.isOwnerCheck = result.lid;
            await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
        }
    } catch (err) {
        console.error(`❌ Erro ao atualizar LID do dono: ${err.message}`);
    }
}

async function performMigration(KyaraSock) {
    let scanResult;
    try {
        scanResult = await scanForJids(DATABASE_DIR);
    } catch (err) {
        console.error(`Erro crítico no scan: ${err.message}`);
        return;
    }

    const { uniqueJids, affectedFiles, jidFiles } = scanResult;

    if (uniqueJids.length === 0) {
        return;
    }

    const { jidToLidMap, successfulFetches } = await fetchLidsInBatches(KyaraSock, uniqueJids);
    const orphanJidsSet = new Set(uniqueJids.filter(jid => !jidToLidMap.has(jid)));

    if (jidToLidMap.size === 0) {
        return;
    }

    let totalReplacements = 0;
    let totalRemovals = 0;
    const allUpdatedFiles = [];

    try {
        const renameResult = await handleJidFiles(jidFiles, jidToLidMap, orphanJidsSet);
        totalReplacements += renameResult.totalReplacements;
        totalRemovals += renameResult.totalRemovals;
        allUpdatedFiles.push(...renameResult.updatedFiles);

        const filteredAffected = affectedFiles.filter(([filePath]) => !jidFiles.some(([, jidPath]) => jidPath === filePath));
        const contentResult = await replaceJidsInContent(filteredAffected, jidToLidMap, orphanJidsSet);
        totalReplacements += contentResult.totalReplacements;
        totalRemovals += contentResult.totalRemovals;
        allUpdatedFiles.push(...contentResult.updatedFiles);
    } catch (processErr) {
        console.error(`Erro no processamento de substituições: ${processErr.message}`);
        return;
    }

}


let reconnectAttempts = 0;
let isReconnecting = false; 
let reconnectTimer = null; 
let forbidden403Attempts = 0; 
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_403_ATTEMPTS = 3; 
const RECONNECT_DELAY_BASE = 5000; 

let ownerMsgTimer = null;
let subBotInitTimer = null;

let _cachedWAVersion = null;

async function getWAVersion() {
    if (_cachedWAVersion) return _cachedWAVersion;
    const { version } = await fetchLatestBaileysVersion();
    _cachedWAVersion = version;
    return version;
}

async function createBotSocket(authDir) {
    try {
        await fs.mkdir(path.join(DATABASE_DIR, 'grupos'), { recursive: true });
        await fs.mkdir(authDir, { recursive: true });
        const {
            state,
            saveCreds,
            signalRepository
        } = await useMultiFileAuthState(
            authDir,
            makeCacheableSignalKeyStore
        );

        if (!state.creds.registered) {
            stopKyaraTerminal();
            // auth method já é resolvido pelo fluxo de selectedConnectionMethod
        }

        const version =
            await getWAVersion();
        wa(`WhatsApp ${version.join('.')}`);

        const KyaraSock = makeWASocket({
            version,
            emitOwnEvents: true,
            fireInitQueries: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            markOnlineOnConnect: true,
            connectTimeoutMs: 120000,
            retryRequestDelayMs: 5000,
            qrTimeout: 180000,
            printQRInTerminal: false,
            keepAliveIntervalMs: 30_000,
                 defaultQueryTimeoutMs: 60_000,
            maxMsgRetryCount: 5,
            shouldIgnoreJid: (jid) =>
                isJidBroadcast(jid) || isJidStatusBroadcast(jid) || isJidNewsletter(jid),
            shouldSyncHistoryMessage: () => false,
            msgRetryCounterCache,
            auth: state,
            signalRepository,
            logger
        });

        let selectedConnectionMethod =
            connectionMethod;

        /*
         * Se ainda não existe sessão, o modo "auto"
         * apresenta o seletor QR/Código.
         */
        if (
            !KyaraSock.authState.creds.registered &&
            selectedConnectionMethod === 'auto'
        ) {
            selectedConnectionMethod =
                await chooseAuthenticationMethod();
        }

        /*
         * Força QR/Código quando os argumentos/variáveis
         * de ambiente já definiram o método.
         */
        if (
            !KyaraSock.authState.creds.registered &&
            (
                process.argv.includes('--code') ||
                process.env.KYARA_CODE_MODE === '1'
            )
        ) {
            selectedConnectionMethod =
                'pairing';
        }

        if (
            !KyaraSock.authState.creds.registered &&
            (
                process.argv.includes('--qr') ||
                process.env.KYARA_QR_MODE === '1'
            )
        ) {
            selectedConnectionMethod =
                'qr';
        }

        /*
         * QR:
         * registramos um listener ANTES de a conexão avançar,
         * evitando perder o primeiro QR.
         */
        if (
            !KyaraSock.authState.creds.registered &&
            selectedConnectionMethod === 'qr'
        ) {

            KyaraSock.__kyaraQrShown = false;

            KyaraSock.ev.on(
                'connection.update',
                ({ qr } = {}) => {

                    if (
                        !qr ||
                        KyaraSock.__kyaraQrShown
                    ) {
                        return;
                    }

                    KyaraSock.__kyaraQrShown =
                        true;

                    console.log('');
                    console.log(
                        '🔗 🌸 KYARA • QR CODE'
                    );
                    console.log('');

                    qrcode.generate(
                        qr,
                        {
                            small: true
                        }
                    );

                    console.log('');
                    console.log(
                        '📱 Escaneie pelo WhatsApp.'
                    );
                    console.log(
                        '⏳ Aguardando autenticação...'
                    );
                    console.log('');
                }
            );
        }

        /*
         * PAIRING CODE:
         * pedimos o número ANTES de assumir o stdin
         * pela TUI.
         */
        if (
            !KyaraSock.authState.creds.registered &&
            selectedConnectionMethod === 'pairing'
        ) {

            KyaraSock.__kyaraConnectionMethod =
                'pairing';

            console.log('');
            console.log(
                '╭────────────────────────────────────────────╮'
            );
            console.log(
                '│       🌸 KYARA • CÓDIGO DE PAREAMENTO      │'
            );
            console.log(
                '├────────────────────────────────────────────┤'
            );
            console.log(
                '│ Digite o número completo, somente números. │'
            );
            console.log(
                '│ Exemplo: 5511999999999                     │'
            );
            console.log(
                '╰────────────────────────────────────────────╯'
            );
            console.log('');

            let phoneNumber =
                await ask(
                    '📱 Número: '
                );

            phoneNumber =
                String(
                    phoneNumber || ''
                )
                .replace(
                    /\D/g,
                    ''
                );

            if (
                !/^\d{10,15}$/.test(
                    phoneNumber
                )
            ) {
                throw new Error(
                    'Número inválido para o código de pareamento.'
                );
            }

            console.log('');
            console.log(
                '⏳ Gerando código de pareamento...'
            );

            /*
             * IMPORTANTE:
             *
             * Não esperamos um QR futuro.
             *
             * O socket já existe e o telefone já foi
             * informado, então fazemos o pedido imediatamente.
             *
             * Caso o socket ainda não esteja pronto, fazemos
             * novas tentativas sequenciais. Nunca existem
             * duas requestPairingCode() simultâneas.
             */
            let pairingCode = null;
            let lastPairingError = null;

            for (
                let attempt = 1;
                attempt <= 4;
                attempt++
            ) {

                try {

                    console.log(
                        `🔄 Tentativa ${attempt}/4...`
                    );

                    pairingCode =
                        await KyaraSock.requestPairingCode(
                            phoneNumber
                        );

                    if (
                        pairingCode
                    ) {
                        break;
                    }

                } catch (error) {

                    lastPairingError =
                        error;

                    console.log(
                        `⚠️ Ainda não pronto: ${
                            error?.message ||
                            error
                        }`
                    );
                }

                if (
                    attempt < 4
                ) {
                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                1500
                            )
                    );
                }
            }

            if (
                !pairingCode
            ) {

                console.error('');
                console.error(
                    '❌ Não foi possível gerar o código.'
                );

                if (
                    lastPairingError
                ) {
                    console.error(
                        lastPairingError?.stack ||
                        lastPairingError
                    );
                }

                console.error('');

                throw new Error(
                    'requestPairingCode não conseguiu obter um código após 4 tentativas.'
                );
            }

            const formattedCode =
                String(pairingCode)
                    .replace(
                        /[^A-Z0-9]/gi,
                        ''
                    )
                    .match(
                        /.{1,4}/g
                    )
                    ?.join('-') ||
                String(pairingCode);

            KyaraSock.__kyaraPairingCode =
                formattedCode;

            printKyaraPairingCard(
                formattedCode
            );
            console.log(
                '⏳ Aguardando autenticação...'
            );
            console.log('');

        }

        /*
         * NÃO inicialize a TUI aqui.
         *
         * O terminal visual passa a iniciar somente quando
         * connection === "open", no connection.update principal.
         */
        setActiveSocket(KyaraSock);


/*
 * 🌸 Espelho de mensagens enviadas
 * pelo bot para o WhatsApp Terminal.
 */
if (!KyaraSock.__kyaraTerminalSendWrapped) {

  const __kyaraOriginalSendMessage =
    KyaraSock.sendMessage.bind(
      KyaraSock
    );

  KyaraSock.sendMessage =
    async (
      jid,
      content,
      options
    ) => {

      let rendered =
        normalizeOutgoingContent(
          content,
          jid
        );

      rendered =
        await applyKyaraGlobalChannelToContent(
          KyaraSock,
          jid,
          rendered
        );

      const result =
        await __kyaraOriginalSendMessage(
          jid,
          rendered,
          options
        );

      try {
        if (
          jid &&
          jid !==
            'status@broadcast'
        ) {
          kyaraTerminalEvent(
            'outgoing',
            {
              jid,
              content:
                rendered
            }
          );
        }
      } catch {}

      return result;
    };

  KyaraSock.__kyaraTerminalSendWrapped =
    true;
}

/*
 * Native Flow passa por relayMessage.
 * A renderização dinâmica também precisa existir aqui.
 */

if (
  typeof KyaraSock.relayMessage ===
    'function' &&
  !KyaraSock.__kyaraRelayRenderWrapped
) {

  const __kyaraOriginalRelayMessage =
    KyaraSock.relayMessage.bind(
      KyaraSock
    );

  KyaraSock.relayMessage =
    async (
      jid,
      message,
      options
    ) => {

      let rendered =
        normalizeOutgoingRelayMessage(
          message,
          jid
        );

      rendered =
        await applyKyaraGlobalChannelToRelay(
          KyaraSock,
          jid,
          rendered
        );

      const result =
        await __kyaraOriginalRelayMessage(
          jid,
          rendered,
          options
        );

      try {
        if (
          jid &&
          jid !==
            'status@broadcast'
        ) {
          kyaraTerminalEvent(
            'outgoing',
            {
              jid,
              content:
                rendered
            }
          );
        }
      } catch {}

      return result;
    };

  KyaraSock.__kyaraRelayRenderWrapped =
    true;
}


try {
  setKyaraTerminalSocket(
    KyaraSock
  );

  configureMessageExecutor(
    async (
      jid,
      message
    ) => {
      await KyaraSock.sendMessage(
        jid,
        {
          text:
            String(
              message || ''
            )
        }
      );
    }
  );

} catch (
  terminalSocketError
) {
  console.error(
    '❌ Terminal WhatsApp:',
    terminalSocketError?.message ||
    terminalSocketError
  );
}

        KyaraSock.ev.on('creds.update', saveCreds);

        KyaraSock.ev.on('groups.update', async (updates) => {
            if (!Array.isArray(updates) || updates.length === 0) return;

            if (DEBUG_MODE) {
                console.log('\n🐛 ========== GROUPS UPDATE ==========');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('📊 Number of updates:', updates.length);

                updates.forEach((update, index) => {
                    console.log(`\n--- Update ${index + 1} ---`);
                    console.log('📦 Update data:', JSON.stringify(update, null, 2));
                });

                console.log('🐛 ====================================\n');
            }

            const updatePromises = updates.map(async (ev) => {
                if (!ev || !ev.id) return;

                try {
                    const groupId = ev.id;


                    const groupData = await getGroupData(groupId).catch(() => null);

                    if (!groupData?.x9) return; 

                    let mensagem = null;


                    if (ev.imgUrl || ev.picUrl) {
                        mensagem = `📸 *X9 Report:* A foto do grupo foi alterada!`;
                        console.log('[DEBUG] Foto alterada detectada');
                    }


                    else if (ev.subject) {
                        mensagem = `📝 *X9 Report:* Nome do grupo alterado para:\n*${ev.subject}*`;
                        console.log('[DEBUG] Nome alterado:', ev.subject);
                    }


                    else if (ev.desc) {
                        mensagem = `📜 *X9 Report:* Descrição do grupo foi alterada!`;
                        console.log('[DEBUG] Descrição alterada');
                    }

                    if (mensagem) {
                        await KyaraSock.sendMessage(groupId, {
                            text: mensagem
                        }).catch(err => {
                            console.error(`❌ Erro ao enviar X9: ${err.message}`);
                        });
                    }


                    if (DEBUG_MODE) {
                        const meta = await KyaraSock.groupMetadata(groupId).catch(() => null);
                        if (meta) {
                            console.log('🐛 Metadata atualizado para:', groupId);
                        }
                    }

                } catch (e) {
                   
                }
            });

            await Promise.allSettled(updatePromises);
        });



        KyaraSock.ev.on('group.join-request', async (inf) => {
            if (DEBUG_MODE) {
                console.log('\n🐛 ========== GROUP JOIN REQUEST ==========');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('🆔 Group ID:', inf.id);
                console.log('⚡ Action:', inf.action);
                console.log('👤 Participant:', inf.participant);
                console.log('📱 Participant Phone:', inf.participantPn);
                console.log('👮 Author:', inf.author);
                console.log('📝 Method:', inf.method);
                console.log('📦 Full event data:', JSON.stringify(inf, null, 2));
                console.log('🐛 ===========================================\n');
            }
            await handleGroupJoinRequest(KyaraSock, inf);
        });



        KyaraSock.ev.on('group-participants.update', async (inf) => {
            if (DEBUG_MODE) {
                console.log('\n🐛 ========== GROUP PARTICIPANTS UPDATE ==========');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('🆔 Group ID:', inf.id || inf.jid || 'unknown');
                console.log('⚡ Action:', inf.action);
                console.log('👥 Participants:', inf.participants);
                console.log('� Author:', inf.author || 'N/A');
                console.log('�📦 Full event data:', JSON.stringify(inf, null, 2));
                console.log('🐛 ================================================\n');
            }
            await handleGroupParticipantsUpdate(KyaraSock, inf);
        });

        let messagesListenerAttached = false;

        const queueErrorHandler = async (item, error) => {
            console.error(`❌ Critical error processing message ${item.id}:`, error);

            if (error.message.includes('ENOSPC') || error.message.includes('ENOMEM')) {
                console.error('🚨 Critical system error detected, triggering emergency cleanup...');
                try {
                    await performanceOptimizer.emergencyCleanup();
                } catch (cleanupErr) {
                    console.error('❌ Emergency cleanup failed:', cleanupErr.message);
                }
            }

            console.error({
                messageId: item.id,
                errorType: error.constructor.name,
                errorMessage: error.message,
                stack: error.stack,
                messageTimestamp: item.timestamp,
                queueStatus: messageQueue.getStatus()
            });
        };

        messageQueue.setErrorHandler(queueErrorHandler);

        
// === KYARA V9 HANDLER - QUANTUM ===
const kyaraFlowDebounce = new Map()
const kyaraNativeFlowHandler = async (info) => {
  try {
    if(!info?.message || info.key.fromMe) return false
    const flowId = extractId(info.message)
    if(!flowId ||!isOwnerFlowId(flowId)) return false
    const liveOwnerConfig = getRuntimeConfig()
    const jid = info.key.remoteJid
    const senderRaw =
      info.key.participant ||
      info.message?.participant ||
      info.key.participantAlt ||
      info.key.participantPn ||
      info.message?.participantPn ||
      info.message?.extendedTextMessage?.contextInfo?.participant ||
      info.key.remoteJid ||
      ''

    const senderBase = String(senderRaw).split('@')[0].split(':')[0]
    const ownerBase = String(liveOwnerConfig?.numerodono || numerodono || '').replace(/\D/g, '')

    let resolvedSender = senderRaw
    let resolvedSenderBase = senderBase
    let resolvedFrom = 'raw'

    // WhatsApp/Baileys pode entregar o participante do grupo como @lid.
    // Primeiro tenta resolver LID -> PN pelo mapping da sessão.
    if (String(senderRaw).endsWith('@lid')) {
      try {
        const mapping =
          KyaraSock?.signalRepository?.lidMapping

        if (mapping?.getPNForLID) {
          const pn =
            await mapping.getPNForLID(senderRaw)

          if (pn) {
            resolvedSender = pn
            resolvedSenderBase = String(pn)
              .split('@')[0]
              .split(':')[0]

            resolvedFrom =
              'signalRepository.lidMapping'
          }
        }
      } catch (e) {
        console.log(
          '[KYARA FLOW AUTH] Falha LID -> PN:',
          e?.message || e
        )
      }
    }

    // Alguns eventos já carregam o PN diretamente.
    const participantPn =
      info.key.participantPn ||
      info.message?.participantPn ||
      info.key.senderPn ||
      info.message?.senderPn ||
      ''

    if (participantPn && String(participantPn).endsWith('@s.whatsapp.net')) {
      resolvedSender = participantPn
      resolvedSenderBase = String(participantPn)
        .split('@')[0]
        .split(':')[0]

      resolvedFrom = 'participantPn'
    }

    const ownerBaseClean = ownerBase.replace(/\D/g, '')
    const senderBaseClean = resolvedSenderBase.replace(/\D/g, '')

    const configuredLidOwner =
      String(
        liveOwnerConfig?.lidowner ||
        liveOwnerConfig?.isOwnerCheck ||
        config?.isOwnerCheck ||
        ''
      ).trim()

    const senderIsOwnerByLid =
      Boolean(configuredLidOwner) &&
      String(senderRaw).trim() === configuredLidOwner

    const senderIsOwnerByNumber =
      Boolean(ownerBaseClean) &&
      Boolean(senderBaseClean) &&
      senderBaseClean === ownerBaseClean

    const senderIsBot =
      info.key.fromMe === true ||
      String(senderRaw) === String(KyaraSock.user?.id || '') ||
      senderBase === String(KyaraSock.user?.id || '')
        .split(':')[0]
        .split('@')[0]

    const isOwnerCheck =
      senderIsOwnerByNumber ||
      senderIsOwnerByLid ||
      senderIsBot

    console.log('[KYARA FLOW AUTH]', JSON.stringify({
      sender: senderRaw,
      resolvedSender,
      resolvedFrom,
      senderBase,
      resolvedSenderBase,
      ownerBase: ownerBaseClean,
      byNumber: senderIsOwnerByNumber,
      byLid: senderIsOwnerByLid,
      byBot: senderIsBot,
      isOwner: isOwnerCheck
    }))

    if(!isOwnerCheck) {
      await KyaraSock.sendMessage(jid, { text: '⛔ *ACESSO NEGADO*\nPainel exclusivo do proprietário.' })
      return true
    }
    if(kyaraFlowDebounce.get(jid+flowId) && Date.now()-kyaraFlowDebounce.get(jid+flowId)<1200) return true
    kyaraFlowDebounce.set(jid+flowId, Date.now())
    await routeOwnerFlow({
      Kyara: KyaraSock, jid, id: flowId,
      prefix: liveOwnerConfig?.prefixo || getCurrentPrefix(jid) || prefixo || '/', botName: liveOwnerConfig?.nomebot || nomebot || 'KYARA',
      userName: liveOwnerConfig?.nomedono || nomedono || 'Dono', ownerId: liveOwnerConfig?.numerodono || numerodono,
      authorized: isOwnerCheck,
      executeCommand: async (cmd, ctx={}) => {
        const text =
          `${getCurrentPrefix(
            ctx.jid || jid
          )}${String(cmd || '').replace(
            /^[.#\/!]+/,
            ''
          )}`
        const internal = { key: { remoteJid: ctx.jid||jid, participant: info.key.participant||ctx.jid||jid, fromMe: false, id: `FLOW-${Date.now()}` }, pushName: info.pushName||'Dono', message: { conversation: text }, messageTimestamp: Math.floor(Date.now()/1000) }
        await indexModule(KyaraSock, internal, null, messagesCache, rentalExpirationManager)
      }
    })
    return true
  } catch(e){ console.error('[KYARA V9]', e.stack||e); return false }
}

const processMessage = async (info) => {

        // [KYARA_ANTI_PAYMENT_AUTO_V1]
        try {
            
      /*
       * =====================================================
       * 👻 GHOST PAYMENT — INTEGRAÇÃO
       * =====================================================
       *
       * Usa a MESMA chave:
       *   anti-payment
       *
       * Só atua quando:
       *   #anti-payment on
       *
       * Não cria listener.
       * Não cria banco paralelo.
       * Não substitui o Anti-Payment principal.
       * =====================================================
       */

      const ghostPaymentActive =
        isActiveGroupRestriction(
          info?.key?.remoteJid,
          "anti-payment",
        );

      if (ghostPaymentActive) {

        const ghostPaymentResult =
          await kyaraGhostPayment.handleGhostPayment({
            socket: KyaraSock,
            info,
            metadata: null,

            botLid:
              KyaraSock?.user?.lid ||
              KyaraSock?.user?.id ||
              "",

            ownerLid:
              config?.lidowner ||
              config?.isOwnerCheck ||
              "",

            /*
             * Anti-Payment ligado = enforcement real.
             *
             * O próprio Ghost Payment ainda protege:
             * - bot
             * - dono
             * - admin
             * - superadmin
             * - participante não verificado
             */
            enforce: true,
          });


/*
         * Se o Ghost Payment realmente tratou a mensagem,
         * não deixamos o restante do fluxo duplicar a ação.
         */
        if (
          ghostPaymentResult?.deleted ||
          ghostPaymentResult?.removed
        ) {
          return;
        }
      }

      const antiPaymentHandled =
                await kyaraAntiPayment.handleAntiPayment({
                    socket: KyaraSock,
                    remoteJid: info?.key?.remoteJid,
                    webMessage: info,
                    isGroup: info?.key?.remoteJid?.endsWith('@g.us'),

                    // Identidade real da Kyara
                    botLid:
                        KyaraSock?.user?.lid ||
                        KyaraSock?.user?.id ||
                        '',

                    // LID real do dono, mantido pelo config.json
                    ownerLid:
                        config?.lidowner ||
                        config?.isOwnerCheck ||
                        '',
                });

            if (antiPaymentHandled) return;

        } catch (antiPaymentError) {
            console.error(
                '[ANTI-PAYMENT] Erro no detector:',
                antiPaymentError?.message || antiPaymentError
            );
        }


  /*
   * 🌸 WhatsApp Terminal
   * Guarda a mensagem antes do dispatcher.
   */
  try {
    if (
      info?.key?.remoteJid &&
      info?.key?.remoteJid !==
        'status@broadcast'
    ) {
      kyaraTerminalEvent(
        'incoming',
        {
          info
        }
      );
    }
  } catch (
    terminalMessageError
  ) {
    console.error(
      '[TERMINAL MESSAGE]',
      terminalMessageError?.message ||
      terminalMessageError
    );
  }

        try {
            const antiStatusHandled = await kyaraAntiStatus.handleMessage(KyaraSock, info);
            if (antiStatusHandled) return;
        } catch (antiStatusError) {
            console.error('[ANTISTATUS] Erro no detector:', antiStatusError?.message || antiStatusError);
        }

            const isJoinRequest = info?.messageStubType === 172;
 if(await kyaraNativeFlowHandler(info)) return;



            if (isJoinRequest) {

                info.message = {
                    messageStubType: info.messageStubType,
                    messageStubParameters: info.messageStubParameters
                };
            }

            if (!info || !info.message || !info.key?.remoteJid) {
                return;
            }


            if (messagesCache && info.key?.id && info.key?.remoteJid) {

                const cacheKey = `${info.key.remoteJid}_${info.key.id}`;
                messagesCache.set(cacheKey, info);
            }


            if (typeof indexModule === 'function') {
                await indexModule(KyaraSock, info, null, messagesCache, rentalExpirationManager);
            } else {
                throw new Error('Módulo index.js não é uma função válida. Verifique o arquivo index.js.');
            }
        };

        const attachMessagesListener = () => {
            if (messagesListenerAttached) return;
            messagesListenerAttached = true;

            KyaraSock.ev.on('messages.upsert', async (m) => {
                if (!m.messages || !Array.isArray(m.messages)) return;


                if (m.type === 'append') {
                    const isJoinRequest = m.messages.some(info => info?.messageStubType === 172);
                    if (!isJoinRequest) return;
                }


                if (m.type !== 'notify' && m.type !== 'append') return;

                try {

                    const messageProcessingPromises = m.messages.map(info =>
                        messageQueue.add(info, processMessage).catch(err => {
                            console.error(`❌ Failed to queue message ${info.key?.id}: ${err.message}`);
                        })
                    );

                    await Promise.allSettled(messageProcessingPromises);

                } catch (err) {
                    console.error(`❌ Error in message upsert handler: ${err.message}`);

                    if (err.message.includes('ENOSPC') || err.message.includes('ENOMEM')) {
                        console.error('🚨 Critical system error detected, triggering emergency cleanup...');
                        try {
                            await performanceOptimizer.emergencyCleanup();
                        } catch (cleanupErr) {
                            console.error('❌ Emergency cleanup failed:', cleanupErr.message);
                        }
                    }
                }
            });
        };

        KyaraSock.ev.on('connection.update', async (update) => {
            const {
                connection,
                lastDisconnect,
                qr
            } = update;

            /*
             * 🌸 KYARA TERMINAL
             *
             * A TUI só assume stdin depois que o WhatsApp
             * realmente chegou em connection === "open".
             *
             * Isso mantém QR/pairing fora do modo raw.
             */
            if (
                connection === 'open' &&
                !KyaraSock.__kyaraTerminalStarted
            ) {

                KyaraSock.__kyaraTerminalStarted =
                    true;

                try {

                    setKyaraTerminalSocket(
                        KyaraSock
                    );

                    startKyaraTerminal();

                    console.log(
                        '✅ Kyara Terminal iniciado após conexão.'
                    );

                } catch (terminalStartError) {

                    console.error(
                        '❌ Erro ao iniciar terminal BKkyara:',
                        terminalStartError?.stack ||
                        terminalStartError
                    );
                }
            }

            if (!connection) {
                try {
                    kyaraTerminalEvent('connecting', {
                        message: 'Aguardando conexão com o WhatsApp'
                    });
                } catch {}
            }
            if (
                qr &&
                !KyaraSock.authState.creds.registered &&
                KyaraSock.__kyaraConnectionMethod !== 'pairing' &&
                KyaraSock.__kyaraQrShown !== true
            ) {
                console.log('🔗 QR Code gerado para autenticação:');
                qrcode.generate(qr, {
                    small: true
                }, (qrcodeText) => {
                    console.log(qrcodeText);
                });
                console.log('📱 Escaneie o QR code acima com o WhatsApp para autenticar o bot.');
            }
            if (connection === 'open') {


                enableKyaraCleanRuntime();


                markSocketOpen(KyaraSock);

                startKyaraTerminal();

    try {
      kyaraTerminalEvent(
        'connected',
        {
          message: 'WhatsApp conectado',
          sock: KyaraSock
        }
      );
    } catch {}
                                 try {
                 
                reconnectAttempts = 0;
                forbidden403Attempts = 0;
                wa('Conexão estabelecida');
core('Inicializando sistema de otimização...');

                    await initializeOptimizedCaches(KyaraSock);

                    await updateOwnerLid(KyaraSock);

                     setTimeout(() => {
                        performMigration(KyaraSock).catch(err => {
                            console.error('❌ Erro na migração (não-bloqueante):', err.message);
                        });
                    }, 10_000);

                    rentalExpirationManager.nazu = KyaraSock;
                    await rentalExpirationManager.initialize();

                    attachMessagesListener();

try {
  attachKyaraPanelSock(KyaraSock);
} catch {}

                    startCacheCleanup(); 
                    try {
                        const msgBotOnConfig = loadMsgBotOn();

                        if (msgBotOnConfig.enabled) {
                            if (ownerMsgTimer) clearTimeout(ownerMsgTimer);
                            ownerMsgTimer = setTimeout(async () => {
                                ownerMsgTimer = null;
                                try {
                                    const ownerJid = buildUserId(numerodono, config);
                                    await KyaraSock.sendMessage(ownerJid, {
                                        text: msgBotOnConfig.message
                                    });
                                    console.log('✅ Mensagem de inicialização enviada para o dono');
                                } catch (sendError) {
                                    console.error('❌ Erro ao enviar mensagem de inicialização:', sendError.message);
                                }
                            }, 3000);
                        } else {
                            console.log('ℹ️ Mensagem de inicialização desativada');
                        }
                    } catch (msgError) {
                        console.error('❌ Erro ao processar mensagem de inicialização:', msgError.message);
                    }


                    try {
                        const subBotManagerModule = await import('./utils/subBotManager.js');
                        const subBotManager = subBotManagerModule.default ?? subBotManagerModule;
                        bot('Verificando sub-bots...');

                        if (subBotInitTimer) clearTimeout(subBotInitTimer);
                        subBotInitTimer = setTimeout(async () => {
                            subBotInitTimer = null;
                            await subBotManager.initializeAllSubBots();
                        }, 5000);
                    } catch (error) {
                        console.error('❌ Erro ao inicializar sub-bots:', error.message);
                    }

                    console.log(`✅ Bot ${nomebot} iniciado com sucesso! Prefixo: ${prefixo} | Dono: ${nomedono}`);
                    data(`MessageQueue • ${messageQueue.batchSize} lotes • ${messageQueue.messagesPerBatch} por lote • ${messageQueue.maxWorkers} paralelas`);
                } catch (initErr) {

                    console.error('❌ Erro crítico na inicialização pós-conexão:', initErr.message);
                    setTimeout(() => startNazu(), 5000);
                }
            }
            if (connection === 'close') {

                try {
                    kyaraTerminalEvent('reconnecting', {
                        message: 'Conexão encerrada — verificando reconexão'
                    });
                } catch {}

                markSocketClosed(KyaraSock);
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                const reasonMessage = {
                    [DisconnectReason.loggedOut]: 'Deslogado do WhatsApp',
                    401: 'Sessão expirada',
                    403: 'Acesso proibido (Forbidden)',
                    [DisconnectReason.connectionClosed]: 'Conexão fechada',
                    [DisconnectReason.connectionLost]: 'Conexão perdida',
                    [DisconnectReason.connectionReplaced]: 'Conexão substituída',
                    [DisconnectReason.timedOut]: 'Tempo de conexão esgotado',
                    [DisconnectReason.badSession]: 'Sessão inválida',
                    [DisconnectReason.restartRequired]: 'Reinício necessário',
                }[reason] || 'Motivo desconhecido';

                console.log(`❌ Conexão fechada. Código: ${reason} | Motivo: ${reasonMessage}`);


                if (cacheCleanupInterval) {
                    clearInterval(cacheCleanupInterval);
                    cacheCleanupInterval = null;
                }



                if (ownerMsgTimer) { clearTimeout(ownerMsgTimer); ownerMsgTimer = null; }
                if (subBotInitTimer) { clearTimeout(subBotInitTimer); subBotInitTimer = null; }


                if (reason === 403) {
                    forbidden403Attempts++;
                    console.log(`⚠️ Erro 403 detectado. Tentativa ${forbidden403Attempts}/${MAX_403_ATTEMPTS}`);

                    if (forbidden403Attempts >= MAX_403_ATTEMPTS) {
                        console.log('❌ Máximo de tentativas para erro 403 atingido. Apagando QR code e parando...');
                        await clearAuthDir(authDir);
                        console.log('🗑️ Autenticação removida. Reinicie o bot para gerar um novo QR code.');
                        process.exit(1);
                    }


                    console.log('🔄 Tentando reconectar em 5 segundos...');
                    if (reconnectTimer) {
                        clearTimeout(reconnectTimer);
                    }
                    reconnectTimer = setTimeout(() => {
                        startNazu();
                    }, 5000);
                    return;
                }


                forbidden403Attempts = 0;

                if (reason === DisconnectReason.badSession || reason === DisconnectReason.loggedOut) {
                    await clearAuthDir(authDir);
                    console.log('🔄 Nova autenticação será necessária na próxima inicialização.');
                }


                if (reason === DisconnectReason.connectionReplaced) {
                    console.log('⚠️ Conexão substituída por outra instância. Não reconectando para evitar conflito.');
                    return;
                }


                let reconnectDelay = 5000;
                if (reason === DisconnectReason.timedOut) {
                    reconnectDelay = 3000; 
                } else if (reason === DisconnectReason.connectionLost) {
                    reconnectDelay = 2000; 
                } else if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
                    reconnectDelay = 10000; 
                }

                console.log(`🔄 Aguardando ${reconnectDelay / 1000} segundos antes de reconectar...`);


                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                }

                reconnectTimer = setTimeout(() => {
                    reconnectAttempts = 0; 
                    forbidden403Attempts = 0; 
                    startNazu();
                }, reconnectDelay);
            }
        });
        return KyaraSock;
    } catch (err) {
        console.error(`❌ Erro ao criar socket do bot: ${err.message}`);
        throw err;
    }
}

async function startNazu() {

    if (isReconnecting) {
        console.log('⚠️ Reconexão já em andamento, ignorando chamada duplicada...');
        return;
    }

    isReconnecting = true;

    try {
        boot('Iniciando Kyara...');

        await createBotSocket(AUTH_DIR);

    } catch (err) {
        reconnectAttempts++;
        console.error(`❌ Erro ao iniciar o bot (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}): ${err.message}`);


        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error(`❌ Máximo de tentativas de reconexão alcançado (${MAX_RECONNECT_ATTEMPTS}). Parando...`);
            process.exit(1);
        }

        if (err.message.includes('ENOSPC') || err.message.includes('ENOMEM')) {
            console.log('🧹 Tentando limpeza de emergência...');
            try {
                await performanceOptimizer.emergencyCleanup();
                console.log('✅ Limpeza de emergência concluída');
            } catch (cleanupErr) {
                console.error('❌ Falha na limpeza de emergência:', cleanupErr.message);
            }
        }


        const delay = Math.min(RECONNECT_DELAY_BASE * Math.pow(1.5, reconnectAttempts - 1), 60000);
        console.log(`🔄 Aguardando ${Math.round(delay / 1000)} segundos antes de tentar novamente...`);


        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }

        reconnectTimer = setTimeout(() => {
            startNazu();
        }, delay);
    } finally {

        isReconnecting = false;
    }
}

async function gracefulShutdown(signal) {
    const signalName = signal === 'SIGTERM' ? 'SIGTERM' : 'SIGINT';
    console.log(`📡 ${signalName} recebido, parando bot graciosamente...`);


    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    isReconnecting = false;

    let shutdownTimeout;


    shutdownTimeout = setTimeout(() => {
        console.error('⚠️ Timeout de shutdown, forçando saída...');
        process.exit(1);
    }, 15000);

    try {

        try {
            const subBotManagerModule = await import('./utils/subBotManager.js');
            const subBotManager = subBotManagerModule.default ?? subBotManagerModule;
            await subBotManager.disconnectAllSubBots();
            console.log('✅ Sub-bots desconectados');
        } catch (error) {
            console.error('❌ Erro ao desconectar sub-bots:', error.message);
        }


        if (cacheCleanupInterval) {
            clearInterval(cacheCleanupInterval);
            cacheCleanupInterval = null;
        }


        await messageQueue.shutdown();
        console.log('✅ MessageQueue finalizado');


        await performanceOptimizer.shutdown();
        console.log('✅ Performance optimizer finalizado');

        clearTimeout(shutdownTimeout);
        console.log('✅ Desligamento concluído');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro durante desligamento:', error.message);
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', async (error) => {
    console.error('🚨 Erro não capturado — reiniciando processo:', error.message);
    console.error(error.stack);

    if (error.message.includes('ENOSPC') || error.message.includes('ENOMEM')) {
        try {
            await performanceOptimizer.emergencyCleanup();
        } catch (cleanupErr) {
            console.error('❌ Falha na limpeza de emergência:', cleanupErr.message);
        }
    }

    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Promise rejeitada sem tratamento:', reason);

});

export { rentalExpirationManager, messageQueue };

startNazu();
