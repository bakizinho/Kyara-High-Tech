
/* ============================================================
   🌊 KYARA • ÁUDIO GLOBAL COM ONDAS
   ============================================================ */

async function kyaraPrepareVoiceAudio(content) {
  if (!content || typeof content !== 'object' || !content.audio) {
    return content;
  }

  try {
    const fs = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const child = await import('node:child_process');
    const util = await import('node:util');

    const execFileAsync = util.promisify(child.execFile);

    let source = content.audio;

    /* Buffer / Uint8Array */
    if (source instanceof Uint8Array && !Buffer.isBuffer(source)) {
      source = Buffer.from(source);
    }

    /* URL */
    if (
      source &&
      typeof source === 'object' &&
      typeof source.url === 'string'
    ) {
      const response = await fetch(source.url);

      if (!response.ok) {
        throw new Error(`Falha ao baixar áudio: ${response.status}`);
      }

      source = Buffer.from(await response.arrayBuffer());
    }

    if (!Buffer.isBuffer(source)) {
      return {
        ...content,
        ptt: true
      };
    }

    const tmp = path.join(
      os.tmpdir(),
      `kyara-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );

    const input = `${tmp}.input`;
    const output = `${tmp}.ogg`;

    try {
      await fs.writeFile(input, source);

      await execFileAsync(
        'ffmpeg',
        [
          '-y',
          '-hide_banner',
          '-loglevel', 'error',
          '-i', input,
          '-vn',
          '-c:a', 'libopus',
          '-b:a', '48k',
          '-vbr', 'on',
          '-application', 'voip',
          output
        ],
        { timeout: 60000 }
      );

      const opus = await fs.readFile(output);

      /* ==========================================
         🌊 WAVEFORM DO WHATSAPP
         ========================================== */

      const pcm = await new Promise((resolve, reject) => {
        const proc = child.spawn(
          'ffmpeg',
          [
            '-hide_banner',
            '-loglevel', 'error',
            '-i', output,
            '-vn',
            '-f', 's16le',
            '-ac', '1',
            '-ar', '8000',
            'pipe:1'
          ]
        );

        const chunks = [];

        proc.stdout.on('data', chunk => {
          chunks.push(chunk);
        });

        proc.on('error', reject);

        proc.on('close', code => {
          if (code === 0) {
            resolve(Buffer.concat(chunks));
          } else {
            reject(
              new Error(`FFmpeg waveform terminou com código ${code}`)
            );
          }
        });
      });

      const samples = Math.floor(pcm.length / 2);
      const bars = 64;
      const waveform = [];

      for (let i = 0; i < bars; i++) {
        const start = Math.floor(i * samples / bars);
        const end = Math.max(
          start + 1,
          Math.floor((i + 1) * samples / bars)
        );

        let peak = 0;

        for (let j = start; j < end && j < samples; j++) {
          const value =
            Math.abs(pcm.readInt16LE(j * 2)) / 32768;

          if (value > peak) {
            peak = value;
          }
        }

        waveform.push(
          Math.max(
            3,
            Math.min(
              100,
              Math.round(4 + peak * 96)
            )
          )
        );
      }

      return {
        ...content,
        audio: opus,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
        waveform: Buffer.from(waveform)
      };

    } finally {
      await fs.rm(input, { force: true }).catch(() => {});
      await fs.rm(output, { force: true }).catch(() => {});
    }

  } catch (error) {
    console.warn(
      '[KYARA VOICE] Falha ao criar waveform:',
      error?.message || error
    );

    return {
      ...content,
      ptt: true
    };
  }
}

/* ============================================================ */

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
import { isActiveGroupRestriction, applyMenuFont, loadMenuDesign } from "./utils/database.js";

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
    hasActiveSocket,
    waitForActiveSocket
} from './utils/activeSocket.js';
import { boot, core, wa, data, bot, sync, ok, warn } from './utils/logger.js';
import { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, makeWASocket, fetchLatestBaileysVersion, fetchLatestWaWebVersion, isJidBroadcast, isJidNewsletter, isJidStatusBroadcast } from 'baileys';
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
import { sendFlow, singleSelect, row } from './core/nativeFlow/native-flow.js';
import { installGlobalButtons } from './core/nativeFlow/autoButtons.js';
import { getRuntimeConfig, getCurrentPrefix, saveRuntimeConfig, normalizeOutgoingContent, normalizeOutgoingRelayMessage } from './core/runtime/kyara-runtime.js';
import { aplicarKyaraMark } from '../../arquivos/js/metaai.js';

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

// O Ver canal é permanente e independente da marca metaai.js.
if (config && typeof config === 'object') {
    config.kyaraChannel = {
        ...(config.kyaraChannel || {}),
        enabled: true,
        name: 'BOT-KYARA',
        invite: '0029VbCs39EIyPtbsseKIP3r',
        url: 'https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r'
    };
}

globalThis.__KYARA_CHANNEL_ENABLED__ = true;
globalThis.ENABLE_KYARA_SYSTEM_MARK = config?.verificadoMensagens === true;

// Controle persistente utilizado por arquivos/js/metaai.js.
globalThis.ENABLE_KYARA_MARK = config?.kyaraMarkEnabled === true;

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
    if (kyaraChannelShouldSkip(jid, content)) {
        return content;
    }

    // O envio não espera newsletterMetadata().
    // A primeira mensagem sai normalmente; o canal será
    // anexado às próximas depois que o JID for resolvido.
    const channelInfo = kyaraGlobalChannelJid
        ? {
            jid: kyaraGlobalChannelJid,
            name: kyaraGlobalChannelName
          }
        : null;

    if (!channelInfo?.jid) {
        void resolveKyaraGlobalChannel(KyaraSock).catch(error => {
            console.warn(
                '[KYARA CHANNEL] Consulta em segundo plano falhou:',
                error?.message || error
            );
        });

        return content;
    }

    return {
        ...content,
        contextInfo: buildKyaraChannelContext(
            channelInfo,
            content.contextInfo
        )
    };
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
        !globalThis.__KYARA_CHANNEL_ENABLED__ ||
        !jid ||
        jid === 'status@broadcast' ||
        (
            typeof isJidNewsletter === 'function' &&
            isJidNewsletter(jid)
        ) ||
        !message ||
        typeof message !== 'object'
    ) {
        return message;
    }

    const containsNativeFlow = (node, depth = 0) => {
        if (!node || typeof node !== 'object' || depth > 6) {
            return false;
        }

        if (node.interactiveMessage?.nativeFlowMessage) {
            return true;
        }

        for (const key of [
            'viewOnceMessage',
            'viewOnceMessageV2',
            'viewOnceMessageV2Extension',
            'ephemeralMessage',
            'documentWithCaptionMessage'
        ]) {
            const nested = node[key]?.message;

            if (
                nested &&
                containsNativeFlow(nested, depth + 1)
            ) {
                return true;
            }
        }

        return false;
    };

    if (containsNativeFlow(message)) {
        return message;
    }

    const channelInfo = kyaraGlobalChannelJid
        ? {
            jid: kyaraGlobalChannelJid,
            name: kyaraGlobalChannelName
          }
        : null;

    if (!channelInfo?.jid) {
        void resolveKyaraGlobalChannel(KyaraSock).catch(error => {
            console.warn(
                '[KYARA CHANNEL] Consulta de relay falhou:',
                error?.message || error
            );
        });

        return message;
    }

    return applyKyaraChannelToRelayNode(
        message,
        channelInfo
    );
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
            pushName: nomedono || '𝗩Ø𝗫-𝗦𝗬𝗦𝗧Ξ𝗠',
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
let connectionMethod = process.env.KYARA_CONNECTION_METHOD || 'auto';
let authRecoveryPromptActive = false;
let forceFreshAuthForNextConnect = process.env.KYARA_FORCE_NEW_AUTH === '1';

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
        connectionMethod === 'auto' &&
        !authRecoveryPromptActive
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
                '🌸  K Y A R A - S Y S T Ξ M',
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
            '  1  ▣   QR CODE'.padEnd(48)
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.dim,
            '     escaneie pelo WhatsApp'.padEnd(48)
        ) +
        uiColor(KYARA_UI.purple, '│')
    );

    console.log(
        uiColor(KYARA_UI.purple, '│') +
        uiColor(
            KYARA_UI.pink,
            '  2  🔑  CÓDIGO DE PAREAMENTO'.padEnd(48)
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

    let option = '';

    while (!['1', '2', '0'].includes(option)) {
        option = String(
            await ask('  ➜ Método (1, 2 ou 0): ')
        ).trim();

        if (!['1', '2', '0'].includes(option)) {
            console.log('⚠️ Opção inválida. Digite somente 1, 2 ou 0.');
        }
    }

    if (option === '1') {
        return 'qr';
    }

    if (option === '2') {
        return 'pairing';
    }

    console.log('👋 KYARA-SYSTΞM encerrada pelo usuário.');
    process.exit(0);
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

const askValidPairingPhoneNumber = async () => {
    while (true) {
        const entered = await ask(
            '📱 Número com DDI e DDD (somente números): '
        );

        const phoneNumber = String(entered || '').replace(/\D/g, '');

        if (/^\d{10,15}$/.test(phoneNumber)) {
            return phoneNumber;
        }

        console.log(
            '⚠️ Número inválido. Digite de 10 a 15 números, incluindo DDI e DDD.'
        );
    }
};


const waitForPairingReady = (sock, timeoutMs = 30000) =>
    new Promise((resolve, reject) => {

        let settled = false;
        let timer = null;

        const cleanup = () => {
            if (timer) clearTimeout(timer);

            if (typeof sock.ev.off === 'function') {
                sock.ev.off('connection.update', onUpdate);
            } else if (
                typeof sock.ev.removeListener === 'function'
            ) {
                sock.ev.removeListener(
                    'connection.update',
                    onUpdate
                );
            }
        };

        const finish = error => {
            if (settled) return;

            settled = true;
            cleanup();

            if (error) reject(error);
            else resolve();
        };

        const onUpdate = update => {

            if (
                update?.connection === 'connecting' ||
                update?.connection === 'open' ||
                Boolean(update?.qr)
            ) {
                finish();
                return;
            }

            if (update?.connection === 'close') {
                finish(
                    update?.lastDisconnect?.error ||
                    new Error(
                        'O WhatsApp fechou a conexão antes do pareamento.'
                    )
                );
            }
        };

        sock.ev.on('connection.update', onUpdate);

        timer = setTimeout(() => {
            finish(
                new Error(
                    'Tempo esgotado aguardando o WebSocket ficar pronto para pareamento.'
                )
            );
        }, timeoutMs);

        if (sock.ws?.isOpen === true) {
            setTimeout(() => finish(), 250);
        }
    });


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


  const chosenText = settings.textbv || settings.text || defaultText;
  const text = formatMessageText(chosenText, replacements);

  const message = {
    text,
    mentions
  };

  if (settings.photo === false) {

  } else if (settings.photoType === 'api' && (!isWelcome || globalJson.welcomecard?.usarCanvas === true)) {

    let profilePicUrl = null;

    if (participants.length === 1) {
      profilePicUrl = await KyaraSock.profilePictureUrl(participants[0], 'image')
        .catch(() => null);
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
    const storedImage = String(settings.image);

    if (storedImage.startsWith('local:')) {
      try {
        message.image = readFileSync(storedImage.slice(6));
      } catch (error) {
        console.error('[KYARA WELCOME] Foto local:', error.message);
      }
    } else {
      message.image = { url: storedImage };
    }

    if (message.image) {
      message.caption = text;
      delete message.text;
    }
  } else if (isWelcome) {
    try {
      message.image = readFileSync(DATABASE_DIR + '/welcome-default.png');
      message.caption = text;
      delete message.text;
    } catch (error) {
      if (globalJson.welcomecard?.fundo) {
        message.image = { url: globalJson.welcomecard.fundo };
        message.caption = text;
        delete message.text;
      } else {
        console.error('[KYARA WELCOME] Foto padrão global indisponível:', error.message);
      }
    }
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

                    if (
                        welcomeSettings.animation !== false &&
                        !(
                          welcomeSettings.photo !== false &&
                          (
                            welcomeSettings.photoType === 'api' ||
                            (
                              welcomeSettings.photoType === 'custom' &&
                              welcomeSettings.image
                            )
                          )
                        )
                    ) {
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
const MAX_403_ATTEMPTS = 3;
const RECONNECT_DELAY_BASE = 5000;

// Guarda a sessão rejeitada. Não apaga credenciais nem outros dados do bot.
async function archiveAuthBeforeRelink(authDir) {
    const target = path.resolve(authDir);

    if (target !== path.resolve(AUTH_DIR)) {
        throw new Error('Caminho de autenticação inesperado; backup cancelado.');
    }

    let exists = false;

    try {
        const stat = await fs.stat(target);
        if (!stat.isDirectory()) {
            throw new Error('A autenticação não é uma pasta.');
        }
        exists = true;
    } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
    }

    if (exists) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const base = `${target}.backup-relink-${stamp}`;
        let backup = base;
        let n = 1;

        while (true) {
            try {
                await fs.access(backup);
                backup = `${base}-${n++}`;
            } catch (error) {
                if (error?.code === 'ENOENT') break;
                throw error;
            }
        }

        await fs.rename(target, backup);

        console.log(
            `📦 Sessão anterior preservada em: ${path.relative(process.cwd(), backup)}`
        );
    }

    await fs.mkdir(target, { recursive: true });

    console.log('🆕 Nova autenticação preparada. Nenhum backup foi apagado.');
}

let ownerMsgTimer = null;
let subBotInitTimer = null;

let _cachedWAVersion = null;

async function getWAVersion() {
    try {
        const result = await fetchLatestWaWebVersion();

        if (result?.error || result?.isLatest === false) {
            throw result.error || new Error('Versão não confirmada como atual.');
        }

        if (!Array.isArray(result?.version) || result.version.length !== 3) {
            throw new Error('Versão recebida inválida.');
        }

        console.log('[WA VERSION] Versão atual:', result.version.join('.'));
        return result.version;
    } catch (error) {
        console.error('[WA VERSION] Falha ao buscar versão online:', error.message);

        const fallback = await fetchLatestBaileysVersion();

        if (!Array.isArray(fallback?.version) || fallback.version.length !== 3) {
            throw new Error('Não foi possível obter uma versão válida.');
        }

        console.warn('[WA VERSION] Utilizando versão alternativa:', fallback.version.join('.'));
        return fallback.version;
    }
}

async function createBotSocket(authDir) {
    try {
        if (
            forceFreshAuthForNextConnect &&
            connectionMethod === 'auto'
        ) {
            connectionMethod = await chooseAuthenticationMethod();
        }

        let prevalidatedPairingPhoneNumber = null;

        // Valida o telefone antes de mover a sessão antiga.
        if (
            forceFreshAuthForNextConnect &&
            connectionMethod === 'pairing'
        ) {
            console.log(
                '🔐 Novo pareamento solicitado. A sessão anterior só será arquivada após validar o número.'
            );

            prevalidatedPairingPhoneNumber =
                await askValidPairingPhoneNumber();
        }

        if (forceFreshAuthForNextConnect) {
            await archiveAuthBeforeRelink(authDir);
            forceFreshAuthForNextConnect = false;
        }
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
            browser: ['Ubuntu', 'Chrome', '22.04.4'],
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

        // Salvar as credenciais desde a criação do socket.
        // requestPairingCode também emite creds.update.
        KyaraSock.ev.on('creds.update', saveCreds);

        aplicarKyaraMark(KyaraSock);

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

            KyaraSock.__kyaraConnectionMethod = 'qr';
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
                        '🔗 🌸 KYARA-SYSTΞM • QR CODE'
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

            // Observar o socket antes de solicitar o número.
            // Assim não perdemos o primeiro evento connecting.
            const pairingReadyPromise =
                waitForPairingReady(KyaraSock, 120000)
                    .then(
                        () => ({ ok: true }),
                        error => ({ ok: false, error })
                    );

            console.log('');
            console.log(
                '╭────────────────────────────────────────────╮'
            );
            console.log(
                '│        🌸 KYARA-SYSTΞM • PAREAMENTO        │'
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
                prevalidatedPairingPhoneNumber ||
                await askValidPairingPhoneNumber();

            console.log('');
            console.log(
                '⏳ Aguardando o WebSocket do WhatsApp ficar pronto...'
            );

            // Aguardar connecting antes de pedir o código.
            const pairingReadiness = await pairingReadyPromise;

            if (!pairingReadiness.ok) {
                throw pairingReadiness.error;
            }

            // Pequena margem para a conexão estabilizar.
            await new Promise(resolve => setTimeout(resolve, 1500));

            if (KyaraSock.authState.creds.registered) {
                throw new Error(
                    'A sessão foi registrada durante a preparação; não é necessário novo código.'
                );
            }

            console.log('🔄 Solicitando código ao WhatsApp...');

            const pairingCode =
                await KyaraSock.requestPairingCode(phoneNumber);

            if (!pairingCode) {
                throw new Error(
                    'O WhatsApp não retornou um código de pareamento.'
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

        // Fonte global nas respostas comuns; menus mantêm a fonte própria.
        try {
          const __kyaraFontDesign = loadMenuDesign() || {};
          const __kyaraGlobalStyle = String(
            __kyaraFontDesign.globalFontStyle ||
            __kyaraFontDesign.fontStyle ||
            'normal'
          );

          if (__kyaraGlobalStyle !== 'normal') {
            const __kyaraPrefix = String(getCurrentPrefix() || '#').slice(0, 1);

            const __kyaraIsMenuText = value => {
              if (typeof value !== 'string') return false;

              // As amostras de #fontes precisam continuar diferentes.
              if (
                value.toLowerCase().includes('fontes') &&
                value.includes('Kyara Bot 123')
              ) {
                return true;
              }

              const lines = value.split('\n');

              if (lines.length < 5 || !/[╭╰┊┃]/.test(value)) {
                return false;
              }

              // Menus com comandos já estilizados não devem ser transformados de novo.
              return lines.some(line => {
                const position = line.indexOf(__kyaraPrefix);
                return position >= 0 &&
                  /[a-z]/i.test(
                    line.slice(position + __kyaraPrefix.length)
                  );
              });
            };

            const __kyaraStyleCommonText = value => {
              if (
                typeof value !== 'string' ||
                __kyaraIsMenuText(value)
              ) {
                return value;
              }

              return applyMenuFont(
                value,
                __kyaraGlobalStyle,
                __kyaraPrefix
              );
            };

            if (typeof rendered === 'string') {
              rendered = __kyaraStyleCommonText(rendered);
            } else if (
              rendered &&
              typeof rendered === 'object' &&
              !Array.isArray(rendered)
            ) {
              const copy = { ...rendered };

              if (typeof copy.text === 'string') {
                copy.text = __kyaraStyleCommonText(copy.text);
              }

              if (typeof copy.caption === 'string') {
                copy.caption = __kyaraStyleCommonText(copy.caption);
              }

              rendered = copy;
            }
          }
        } catch (fontError) {
          console.error(
            '[KYARA-FONT] Falha ao aplicar fonte global:',
            fontError?.message || fontError
          );
        }


      rendered =
        await applyKyaraGlobalChannelToContent(
          KyaraSock,
          jid,
          rendered
        );

      
      rendered = await kyaraPrepareVoiceAudio(rendered);
/*
       * ========================================================
       * BOT-KYARA • SYSTEM MARK
       * ========================================================
       *
       * Usa somente a identidade do próprio bot.
       *
       * Não altera:
       *   - delete
       *   - reaction
       *   - forward
       *   - edit
       *   - mensagens de status
       *   - quoted já definido
       */

      let finalOptions =
        options || {};

      try {

        const ligado =
          globalThis.ENABLE_KYARA_SYSTEM_MARK !== false;

        const objectContent =
          rendered &&
          typeof rendered === 'object'
            ? rendered
            : null;

        const ignorar =
          !ligado ||
          !objectContent ||
          jid === 'status@broadcast' ||
          Boolean(
            objectContent.react ||
            objectContent.delete ||
            objectContent.forward ||
            objectContent.edit ||
            objectContent.disappearingMessagesInMessage
          ) ||
          Boolean(
            finalOptions?.quoted
          );

        if (!ignorar) {

          const botJid =
            KyaraSock?.user?.id ||
            '';

          const botName =
            getConfiguredBotName() ||
            'KYARA-SYSTΞM';

          if (botJid) {

            finalOptions = {
              ...finalOptions,

              quoted: {

                key: {

                  remoteJid:
                    jid,

                  fromMe:
                    true,

                  id:
                    `KYARA-SYSTEM-${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 8)}`,

                  participant:
                    botJid

                },

                message: {

                  conversation:
                    `${botName} • SISTEMA`

                }

              }

            };

          }

        }

      } catch (
        systemMarkError
      ) {

        console.warn(
          '[KYARA SYSTEM MARK] Ignorado:',
          systemMarkError?.message ||
          systemMarkError
        );
      }

      let result;

      try {
        result = await __kyaraOriginalSendMessage(
          jid,
          rendered,
          finalOptions
        );

        const __kyaraSendDestination =
          result?.key?.remoteJid ||
          jid ||
          'destino-desconhecido';

        const __kyaraSendMessageId =
          result?.key?.id ||
          'id-nao-retornado';

        console.log(
          `[KYARA SEND] ✅ Aceito pelo socket | destino=${__kyaraSendDestination} | id=${__kyaraSendMessageId}`
        );
      } catch (sendError) {
        console.error(
          '[KYARA SEND] ❌ Falha no envio pelo socket:',
          sendError?.stack || sendError
        );

        throw sendError;
      }

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

      // KYARA_NATIVE_FLOW_BYPASS_RUNTIME_NORMALIZER: não modificar mensagens interativas nativas.
      const containsNativeFlowBeforeNormalization = (node, depth = 0) => {
        if (!node || typeof node !== 'object' || depth > 6) return false;

        if (node.interactiveMessage?.nativeFlowMessage) return true;

        for (const key of [
          'viewOnceMessage',
          'viewOnceMessageV2',
          'viewOnceMessageV2Extension',
          'ephemeralMessage',
          'documentWithCaptionMessage'
        ]) {
          const nested = node[key]?.message;
          if (nested && containsNativeFlowBeforeNormalization(nested, depth + 1)) {
            return true;
          }
        }

        return false;
      };

      const isNativeFlowOutgoing =
        containsNativeFlowBeforeNormalization(message);

      let rendered = isNativeFlowOutgoing
        ? message
        : normalizeOutgoingRelayMessage(message, jid);

      if (isNativeFlowOutgoing) {
        console.log(
          '[KYARA RELAY] Native Flow preservado antes da normalização.'
        );
      }

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

                    if (!groupData?.x9 && !(ev.imgUrl || ev.picUrl || ev.pictureUrl || ev.profilePicUrl || ev.picture)) return; 

                    let mensagem = null;


                    if (ev.imgUrl || ev.picUrl || ev.pictureUrl || ev.profilePicUrl || ev.picture) {
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

        let messagesListenerSocket = null;

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

const kyaraSetupSessions = new Map();

const kyaraSetupSteps = ['nomebot', 'prefixo', 'nomedono'];

function kyaraSetupExtractText(message) {
  let current = message;

  for (let depth = 0; depth < 8 && current && typeof current === 'object'; depth++) {
    if (typeof current.conversation === 'string') {
      return current.conversation;
    }

    if (typeof current.extendedTextMessage?.text === 'string') {
      return current.extendedTextMessage.text;
    }

    for (const key of ['imageMessage', 'videoMessage', 'documentMessage']) {
      if (typeof current[key]?.caption === 'string') {
        return current[key].caption;
      }
    }

    let next = null;

    for (const key of [
      'ephemeralMessage',
      'viewOnceMessage',
      'viewOnceMessageV2',
      'viewOnceMessageV2Extension',
      'documentWithCaptionMessage'
    ]) {
      if (current[key]?.message) {
        next = current[key].message;
        break;
      }
    }

    if (!next) return '';
    current = next;
  }

  return '';
}

async function kyaraSetupSend(jid, text, actions = []) {
  const buttons = actions.length
    ? [
        singleSelect('⚙️ Opções', [
          {
            title: 'Assistente Kyara',
            rows: actions
          }
        ])
      ]
    : undefined;

  return sendFlow(KyaraSock, jid, {
    title: 'KYARA • CONFIGURAÇÃO',
    footer: 'KYARA • Assistente guiado',
    text,
    buttons
  });
}

async function kyaraSetupPrompt(jid, session, notice = '') {
  const labels = {
    nomebot: 'Nome do bot',
    prefixo: 'Prefixo dos comandos',
    nomedono: 'Nome do dono'
  };

  const number = kyaraSetupSteps.indexOf(session.step) + 1;
  const current = labels[session.step] || 'Configuração';

  const actions = [];

  if (session.step !== 'nomebot') {
    actions.push(
      row('↩️ Voltar', 'Voltar à etapa anterior', 'owner:setup:back')
    );
  }

  actions.push(
    row('❌ Cancelar', 'Descartar esta configuração', 'owner:setup:cancel')
  );

  const text = [
    '🧭 CONFIGURAÇÃO GUIADA',
    '',
    'Etapa ' + number + ' de 3: ' + current,
    notice,
    '',
    session.step === 'nomebot'
      ? 'Digite o nome que aparecerá como nome do bot. Use de 2 a 32 caracteres.'
      : session.step === 'prefixo'
        ? 'Digite um único caractere para ser o prefixo. Exemplo: . ou !'
        : 'Digite o nome que será exibido para o dono. Use de 2 a 40 caracteres.',
    '',
    'Envie sua resposta como uma mensagem normal.'
  ].filter(Boolean).join('\n');

  return kyaraSetupSend(jid, text, actions);
}

async function kyaraSetupSummary(jid, session) {
  const text = [
    '🧾 REVISÃO DA CONFIGURAÇÃO',
    '',
    'Nome do bot: ' + session.draft.nomebot,
    'Prefixo: ' + session.draft.prefixo,
    'Nome do dono: ' + session.draft.nomedono,
    '',
    'Confira os dados antes de salvar.',
    'Nada será alterado até você confirmar.'
  ].join('\n');

  const actions = [
    row('✅ Salvar', 'Confirmar e aplicar as alterações', 'owner:setup:save'),
    row('✏️ Editar nome', 'Alterar o nome do bot', 'owner:setup:edit:nomebot'),
    row('✏️ Editar prefixo', 'Alterar o prefixo', 'owner:setup:edit:prefixo'),
    row('✏️ Editar dono', 'Alterar o nome exibido do dono', 'owner:setup:edit:nomedono'),
    row('↩️ Voltar', 'Retornar à última etapa', 'owner:setup:back'),
    row('❌ Cancelar', 'Descartar as alterações', 'owner:setup:cancel')
  ];

  return kyaraSetupSend(jid, text, actions);
}

async function kyaraSetupHandle(jid, id, info, liveConfig) {
  let session = kyaraSetupSessions.get(jid);

  if (id === 'owner:setup:start') {
    if (String(jid).endsWith('@g.us')) {
      await kyaraSetupSend(
        jid,
        'Por segurança, abra a conversa privada com a Kyara para configurar o bot.'
      );
      return true;
    }

    const config = liveConfig || getRuntimeConfig() || {};

    session = {
      step: 'nomebot',
      draft: {
        nomebot: String(config.nomebot || 'KYARA'),
        prefixo: String(config.prefixo || '.'),
        nomedono: String(config.nomedono || 'Dono')
      }
    };

    kyaraSetupSessions.set(jid, session);
    await kyaraSetupPrompt(jid, session);
    return true;
  }

  if (id === 'owner:setup:cancel') {
    kyaraSetupSessions.delete(jid);
    await kyaraSetupSend(jid, '❌ Configuração cancelada. Nenhuma alteração foi salva.');
    return true;
  }

  if (!session && id && id.startsWith('owner:setup:')) {
    await kyaraSetupSend(jid, 'Nenhuma configuração está aberta. Abra o assistente novamente pelo painel do dono.');
    return true;
  }

  if (id === 'owner:setup:save') {
    if (!session) return true;

    const { nomebot, prefixo, nomedono } = session.draft;

    if (
      nomebot.length < 2 ||
      nomebot.length > 32 ||
      Array.from(prefixo).length !== 1 ||
      /\s/.test(prefixo) ||
      nomedono.length < 2 ||
      nomedono.length > 40
    ) {
      await kyaraSetupSummary(jid, session);
      return true;
    }

    try {
      saveRuntimeConfig({ nomebot, prefixo, nomedono });
      kyaraSetupSessions.delete(jid);

      await kyaraSetupSend(
        jid,
        '✅ CONFIGURAÇÃO SALVA\n\n' +
        'Nome do bot: ' + nomebot + '\n' +
        'Prefixo: ' + prefixo + '\n' +
        'Nome do dono: ' + nomedono + '\n\n' +
        'As alterações foram gravadas no config.json existente.'
      );
    } catch (error) {
      console.error('[KYARA SETUP] Falha ao salvar:', error);
      await kyaraSetupSend(
        jid,
        '❌ Não foi possível salvar a configuração. A sessão continua aberta; confira o terminal.'
      );
    }

    return true;
  }

  if (id === 'owner:setup:back') {
    if (!session) return true;

    if (session.step === 'nomebot') {
      await kyaraSetupPrompt(jid, session, 'Você já está na primeira etapa.');
      return true;
    }

    const index = kyaraSetupSteps.indexOf(session.step);
    session.step = kyaraSetupSteps[Math.max(0, index - 1)];

    await kyaraSetupPrompt(jid, session);
    return true;
  }

  if (id && id.startsWith('owner:setup:edit:')) {
    if (!session) return true;

    const field = id.slice('owner:setup:edit:'.length);

    if (!kyaraSetupSteps.includes(field)) {
      await kyaraSetupSummary(jid, session);
      return true;
    }

    session.step = field;
    await kyaraSetupPrompt(jid, session);
    return true;
  }

  if (id && id.startsWith('owner:setup:')) {
    if (session) await kyaraSetupSummary(jid, session);
    return true;
  }

  if (!session || id) return false;

  const text = kyaraSetupExtractText(info?.message).trim();

  if (!text) return false;

  if (/^(cancelar|cancel|sair|\.cancelar)$/i.test(text)) {
    kyaraSetupSessions.delete(jid);
    await kyaraSetupSend(jid, '❌ Configuração cancelada. Nenhuma alteração foi salva.');
    return true;
  }

  if (/^voltar$/i.test(text)) {
    if (session.step === 'nomebot') {
      await kyaraSetupPrompt(jid, session, 'Você já está na primeira etapa.');
      return true;
    }

    const index = kyaraSetupSteps.indexOf(session.step);
    session.step = kyaraSetupSteps[Math.max(0, index - 1)];

    await kyaraSetupPrompt(jid, session);
    return true;
  }

  if (/[\u0000-\u001f\u007f]/.test(text)) {
    await kyaraSetupPrompt(jid, session, '⚠️ A resposta contém caracteres inválidos.');
    return true;
  }

  if (session.step === 'nomebot') {
    if (text.length < 2 || text.length > 32) {
      await kyaraSetupPrompt(jid, session, '⚠️ Use de 2 a 32 caracteres.');
      return true;
    }

    session.draft.nomebot = text;
    session.step = 'prefixo';
    await kyaraSetupPrompt(jid, session);
    return true;
  }

  if (session.step === 'prefixo') {
    if (Array.from(text).length !== 1 || /\s/.test(text)) {
      await kyaraSetupPrompt(jid, session, '⚠️ O prefixo deve ser um único caractere, sem espaços.');
      return true;
    }

    session.draft.prefixo = text;
    session.step = 'nomedono';
    await kyaraSetupPrompt(jid, session);
    return true;
  }

  if (session.step === 'nomedono') {
    if (text.length < 2 || text.length > 40) {
      await kyaraSetupPrompt(jid, session, '⚠️ Use de 2 a 40 caracteres.');
      return true;
    }

    session.draft.nomedono = text;
    await kyaraSetupSummary(jid, session);
    return true;
  }

  await kyaraSetupSummary(jid, session);
  return true;
}

const kyaraFlowDebounce = new Map()
const kyaraNativeFlowHandler = async (info) => {
  try {
    if(!info?.message || info.key.fromMe) return false
    const flowId = extractId(info.message)
    const setupJid = info.key.remoteJid
    const isSetupFlow = typeof flowId === 'string' && flowId.startsWith('owner:setup:')
    const hasSetupSession = kyaraSetupSessions.has(setupJid)
    if ((!flowId || (!isOwnerFlowId(flowId) && !isSetupFlow)) && !hasSetupSession) return false
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
    if (isSetupFlow || (hasSetupSession && !flowId)) {
      if (!isOwnerCheck) return true
      const setupHandled = await kyaraSetupHandle(jid, flowId, info, liveOwnerConfig)
      if (setupHandled) return true
      if (!flowId) return false
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
      info?.key?.remoteJid !== 'status@broadcast' &&
      !info?.key?.fromMe
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

                const cacheJids = [...new Set([info.key.remoteJid, info.key.remoteJidAlt].filter(Boolean))];
                for (const cacheJid of cacheJids) {
                    messagesCache.set(`${cacheJid}_${info.key.id}`, info);
                }
            }


            if (typeof indexModule === 'function') {
                await indexModule(KyaraSock, info, null, messagesCache, rentalExpirationManager);
            } else {
                throw new Error('Módulo index.js não é uma função válida. Verifique o arquivo index.js.');
            }
        };

        const attachMessagesListener = () => {

            /*
             * O listener pertence ao socket atual.
             * Cada reconexão recebe um novo KyaraSock.
             */
            if (messagesListenerSocket === KyaraSock) {
                return;
            }

            messagesListenerSocket = KyaraSock;



            KyaraSock.ev.on('messages.upsert', async (m) => {



                if (!m.messages || !Array.isArray(m.messages)) return;


                if (m.type === 'append') {
                    const isJoinRequest = m.messages.some(info => info?.messageStubType === 172);
                    if (!isJoinRequest) return;
                }


                if (m.type !== 'notify' && m.type !== 'append') return;

                try {

                    /*
                     * 🌸 DISPATCH DIRETO
                     *
                     * A fila antiga estava no caminho crítico da
                     * entrada de mensagens. O WhatsApp entrega a
                     * mensagem diretamente ao processMessage.
                     *
                     * Não cria outro listener.
                     * Não cria outro dispatcher.
                     */
                    const messageProcessingPromises = m.messages.map(
                        info =>
                            Promise.resolve()
                                .then(() => processMessage(info))
                                .catch(err => {
                                    console.error(
                                        `❌ [KYARA DISPATCH] Erro ao processar ${info?.key?.id || 'sem-id'}:`,
                                        err?.stack || err
                                    );
                                })
                    );

                    await Promise.allSettled(
                        messageProcessingPromises
                    );

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
            if (connection === 'open') {
                KyaraSock.__kyaraConnectionOpened = true;
            }

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
                        '✅ Terminal KYARA-SYSTΞM ativo.'
                    );

                } catch (terminalStartError) {

                    console.error(
                        '❌ Erro ao iniciar terminal KYARA-SYSTΞM:',
                        terminalStartError?.stack ||
                        terminalStartError
                    );
                }
            }

            if (
                !connection &&
                KyaraSock.__kyaraConnectionOpened !== true &&
                KyaraSock.__kyaraConnectingEventSent !== true
            ) {
                KyaraSock.__kyaraConnectingEventSent = true;

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

                /*
                 * 🌸 PRIORIDADE ABSOLUTA
                 *
                 * O listener precisa ser registrado antes de:
                 * - limpeza de runtime
                 * - cache
                 * - migração
                 * - aluguel
                 * - sub-bots
                 * - terminal
                 */
                try {
                    attachMessagesListener();
                } catch (listenerStartError) {
                    console.error(
                        '❌ [KYARA] Falha ao registrar messages.upsert:',
                        listenerStartError?.stack ||
                        listenerStartError
                    );
                }



                enableKyaraCleanRuntime();


                markSocketOpen(KyaraSock);

                /*
                 * 🌸 PRIORIDADE MÁXIMA:
                 * ouvir mensagens antes dos caches,
                 * migrações, aluguel e sub-bots.
                 */



                startKyaraTerminal();

                /*
                 * 🌸 KYARA — LISTENER DE MENSAGENS
                 *
                 * Deve ser anexado imediatamente após
                 * a conexão abrir.
                 *
                 * A inicialização de caches/rental/subbots
                 * não pode impedir o WhatsApp de entregar
                 * mensagens ao dispatcher.
                 */


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

                    rentalExpirationManager.kya = KyaraSock;
                    await rentalExpirationManager.initialize();

    

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

                    try {
                        const subDeleteModule = await import('./features/subDeleteManager.js');
                        await subDeleteModule.initializeSubDelete({
                            mainSock: KyaraSock,
                            ownerNumber: numerodono,
                            ownerJid: buildUserId(numerodono, config)
                        });
                    } catch (error) {
                        console.error('❌ Erro ao inicializar sub-delete:', error.message);
                    }

                    console.log(`✅ Bot ${nomebot} iniciado com sucesso! Prefixo: ${prefixo} | Dono: ${nomedono}`);
                    data(`MessageQueue • ${messageQueue.batchSize} lotes • ${messageQueue.messagesPerBatch} por lote • ${messageQueue.maxWorkers} paralelas`);
                } catch (initErr) {

                    console.error('❌ Erro crítico na inicialização pós-conexão:', initErr.message);
                    console.error('⚠️ Socket atual preservado; não será criada outra conexão.');
                }
            }
            if (connection === 'close') {

                try {
                    kyaraTerminalEvent('reconnecting', {
                        message: 'Conexão encerrada — verificando reconexão'
                    });
                } catch {}

                markSocketClosed(KyaraSock);
                // Lê o erro original sem fabricar um Boom com código 500.
                const disconnectError = lastDisconnect?.error || null;

                const disconnectErrorText = [
                    disconnectError?.name,
                    disconnectError?.message,
                    disconnectError?.output?.payload?.message,
                    disconnectError?.data?.message,
                    disconnectError?.cause?.message
                ]
                    .filter(Boolean)
                    .map(String)
                    .join(' | ');

                const reasonCandidates = [
                    disconnectError?.output?.statusCode,
                    disconnectError?.statusCode,
                    disconnectError?.data?.statusCode,
                    disconnectError?.cause?.output?.statusCode,
                    disconnectError?.cause?.statusCode
                ];

                const reason = reasonCandidates
                    .map(value => Number(value))
                    .find(value =>
                        Number.isInteger(value) && value > 0
                    ) ?? null;

                // O código 500 só será considerado badSession quando
                // a mensagem original indicar explicitamente isso.
                const isExplicitBadSession =
                    reason === DisconnectReason.badSession &&
                    /bad[\s_-]*session|invalid[\s_-]*session|session.{0,24}(?:invalid|expired|corrupt)/i
                        .test(disconnectErrorText);

                const reasonMessage =
                    reason === DisconnectReason.badSession && !isExplicitBadSession
                        ? 'Erro 500 sem confirmação de sessão inválida'
                        : ({
                            [DisconnectReason.loggedOut]: 'Deslogado do WhatsApp',
                            401: 'Sessão expirada',
                            403: 'Acesso proibido (Forbidden)',
                            [DisconnectReason.connectionClosed]: 'Conexão fechada',
                            [DisconnectReason.connectionLost]: 'Conexão perdida',
                            [DisconnectReason.connectionReplaced]: 'Conexão substituída',
                            [DisconnectReason.timedOut]: 'Tempo de conexão esgotado',
                            [DisconnectReason.badSession]: 'Sessão inválida',
                            [DisconnectReason.restartRequired]: 'Reinício necessário',
                        }[reason] || (
                            reason === null
                                ? 'Código não informado'
                                : 'Motivo desconhecido'
                        ));

                console.log(
                    `❌ Conexão fechada. Código: ${reason ?? 'não informado'} | Motivo: ${reasonMessage}`
                );

                if (
                    reason === DisconnectReason.badSession &&
                    !isExplicitBadSession
                ) {
                    console.error(
                        '⚠️ Código 500 isolado não confirma sessão inválida. ' +
                        'Autenticação preservada; tentando reconectar.'
                    );
                    console.error(
                        `[WHATSAPP] Detalhe original: ${
                            disconnectErrorText || 'mensagem não informada'
                        }`
                    );
                }


                if (cacheCleanupInterval) {
                    clearInterval(cacheCleanupInterval);
                    cacheCleanupInterval = null;
                }



                if (ownerMsgTimer) { clearTimeout(ownerMsgTimer); ownerMsgTimer = null; }
                if (subBotInitTimer) { clearTimeout(subBotInitTimer); subBotInitTimer = null; }


                if (reason === 403) {
                    forbidden403Attempts++;

                    const forbiddenDelay =
                        forbidden403Attempts >= MAX_403_ATTEMPTS
                            ? 60000
                            : 5000;

                    console.log(
                        `⚠️ Erro 403 detectado (tentativa ${forbidden403Attempts}). ` +
                        `Nova verificação em ${Math.round(forbiddenDelay / 1000)}s; sessão preservada.`
                    );

                    if (reconnectTimer) {
                        clearTimeout(reconnectTimer);
                    }

                    reconnectTimer = setTimeout(() => {
                        reconnectTimer = null;
                        startNazu();
                    }, forbiddenDelay);

                    return;
                }


                forbidden403Attempts = 0;

                const isUnregisteredPairingAttempt =
                    KyaraSock.__kyaraConnectionMethod === 'pairing' &&
                    KyaraSock.authState?.creds?.registered !== true;

                if (
                    isUnregisteredPairingAttempt &&
                    (
                        reason === 401 ||
                        reason === DisconnectReason.loggedOut
                    )
                ) {
                    console.error(
                        '⛔ O WhatsApp encerrou a tentativa antes de concluir o novo pareamento (401).'
                    );

                    console.error(
                        '🔒 Isso ainda não é uma sessão autenticada. A pasta atual não será arquivada novamente.'
                    );

                    console.log(
                        '↻ A tentativa será interrompida para evitar um ciclo de novos pareamentos.'
                    );

                    stopKyaraTerminal();

                    await gracefulShutdown('SIGTERM');
                    return;
                }

                const authWasRejected =
                    reason === 401 ||
                    reason === DisconnectReason.loggedOut ||
                    (
                        reason === DisconnectReason.badSession &&
                        isExplicitBadSession
                    );

                if (authWasRejected) {
                    console.error(
                        `⛔ O WhatsApp recusou a autenticação salva. Código: ${reason} | Motivo: ${reasonMessage}.`
                    );
                    console.log('🔐 A sessão antiga será preservada antes do novo pareamento.');
                    console.log('🌸 KYARA-SYSTΞM • CENTRO DE RECUPERAÇÃO');

                    if (authRecoveryPromptActive) return;
                    authRecoveryPromptActive = true;

                    try {
                        stopKyaraTerminal();

                        if (reconnectTimer) {
                            clearTimeout(reconnectTimer);
                            reconnectTimer = null;
                        }

                        connectionMethod = 'auto';

                        const nextMethod = await chooseAuthenticationMethod();

                        if (!['pairing', 'qr'].includes(nextMethod)) {
                            authRecoveryPromptActive = false;
                            console.log('⏸️ Recuperação pausada. A autenticação antiga continua preservada.');
                            return;
                        }

                        connectionMethod = nextMethod;
                        forceFreshAuthForNextConnect = true;
                        reconnectAttempts = 0;
                        forbidden403Attempts = 0;

                        console.log(nextMethod === 'pairing'
                            ? '🔑 Preparando um novo código de pareamento…'
                            : '▣ Preparando um novo QR Code…');

                        console.log('📦 A pasta antiga será arquivada; os demais dados serão mantidos.');

                        reconnectTimer = setTimeout(() => {
                            reconnectTimer = null;
                            authRecoveryPromptActive = false;
                            startNazu();
                        }, 700);

                    } catch (recoveryError) {
                        authRecoveryPromptActive = false;
                        forceFreshAuthForNextConnect = false;

                        console.error(
                            '❌ Falha ao abrir a recuperação:',
                            recoveryError?.stack || recoveryError
                        );

                        console.error('🔒 A autenticação antiga foi mantida sem alterações.');
                    }

                    return;
                }


                if (reason === DisconnectReason.connectionReplaced) {
                    console.log('⚠️ Conexão substituída por outra instância. Não reconectando para evitar conflito.');
                    return;
                }


                // Erros 500 sem confirmação de badSession recebem
                // uma pausa maior antes da próxima tentativa.
                let reconnectDelay =
                    reason === DisconnectReason.badSession &&
                    !isExplicitBadSession
                        ? 10000
                        : 5000;

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
                    reconnectTimer = null;
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

    if (hasActiveSocket()) {
        console.log('⚠️ Já existe um socket ativo ou conectando; nova instância ignorada.');
        return;
    }

    isReconnecting = true;

    try {
        boot('Iniciando KYARA-SYSTΞM...');

        await createBotSocket(AUTH_DIR);

    } catch (err) {
        reconnectAttempts++;

        console.error(
            `❌ Erro ao iniciar o bot (tentativa ${reconnectAttempts}; processo mantido ativo): ${err.message}`
        );

        if (err.message.includes('ENOSPC') || err.message.includes('ENOMEM')) {
            console.log('🧹 Tentando limpeza de emergência...');
            try {
                await performanceOptimizer.emergencyCleanup();
                console.log('✅ Limpeza de emergência concluída');
            } catch (cleanupErr) {
                console.error('❌ Falha na limpeza de emergência:', cleanupErr.message);
            }
        }


        const delay = Math.min(
            RECONNECT_DELAY_BASE *
                Math.pow(1.5, Math.min(reconnectAttempts - 1, 8)),
            60000
        );

        console.log(
            `🔄 Aguardando ${Math.round(delay / 1000)} segundos antes de tentar novamente...`
        );

        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }

        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
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

        try {
            const subDeleteModule = await import('./features/subDeleteManager.js');
            await subDeleteModule.disconnectSubDelete();
            console.log('✅ Sessão sub-delete desconectada sem apagar o pareamento');
        } catch (error) {
            console.error('❌ Erro ao desconectar sub-delete:', error.message);
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
