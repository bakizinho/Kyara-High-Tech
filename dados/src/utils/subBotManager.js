import { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, makeWASocket, fetchLatestBaileysVersion } from 'baileys';
import { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { getLidFromJidCached } from './helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUBBOTS_FILE = path.join(__dirname, '../../database/subbots.json');
const SUBBOTS_DIR = path.join(__dirname, '../../database/subbots');

/**
 * Busca a versão do Baileys
 */
let _cachedWAVersion = null;
async function getWAVersion() {
    if (_cachedWAVersion) return _cachedWAVersion;
    try {
        const { version } = await fetchLatestBaileysVersion();
        _cachedWAVersion = version;
        return version;
    } catch (error) {
        console.error('❌ Erro ao buscar versão do Baileys:', error.message);
        return [2, 3000, 1015901307]; // Fallback
    }
}

const activeSubBots = new Map();
const generatingCode = new Set();

/**
 * Estado global do ciclo de vida dos sub-bots.
 *
 * Durante o shutdown não permitimos que uma conexão
 * fechada tente iniciar automaticamente novamente.
 */
let shuttingDown = false;
const logger = pino({ level: 'silent' });

function loadSubBots() {
    try {
        if (!fs.existsSync(SUBBOTS_FILE)) {
            fs.writeFileSync(SUBBOTS_FILE, JSON.stringify({ subbots: {} }, null, 2));
            return {};
        }
        const data = JSON.parse(fs.readFileSync(SUBBOTS_FILE, 'utf-8'));
        return data.subbots || {};
    } catch (error) {
        console.error('Erro ao carregar sub-bots:', error);
        return {};
    }
}

function saveSubBots(subbots) {
    try {
        const data = { subbots };
        fs.writeFileSync(SUBBOTS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao salvar sub-bots:', error);
        return false;
    }
}

function createSubBotDirectories(botId) {
    const botDir = path.join(SUBBOTS_DIR, botId);
    const authDir = path.join(botDir, 'auth');
    const databaseDir = path.join(botDir, 'database');
    const dirs = [botDir, authDir, databaseDir, path.join(databaseDir, 'grupos'), path.join(databaseDir, 'users'), path.join(databaseDir, 'dono')];
    dirs.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });
    return { botDir, authDir, databaseDir };
}

function createSubBotConfig(botId, phoneNumber, ownerNumber) {
    const dirs = createSubBotDirectories(botId);
    const mainConfigPath = path.join(__dirname, '../config.json');
    let mainConfig = {};
    try { mainConfig = JSON.parse(fs.readFileSync(mainConfigPath, 'utf-8')); } catch (e) {}

    const config = {
        numerodono: ownerNumber || mainConfig.numerodono || '',
        nomedono: mainConfig.nomedono || 'Dono',
        nomebot: `SubBot ${botId.substring(0, 8)}`,
        prefixo: mainConfig.prefixo || '!',
        apikey: mainConfig.apikey || '',
        debug: false,
        lidowner: ownerNumber && ownerNumber.includes('@lid') ? ownerNumber : '',
        botNumber: phoneNumber
    };

    fs.writeFileSync(path.join(dirs.databaseDir, 'config.json'), JSON.stringify(config, null, 2));
    return { config, dirs };
}

/**
 * Inicializa uma instância de sub-bot
 */
async function initializeSubBot(botId, phoneNumber, ownerNumber, generatePairingCode = false) {
    try {
        console.log(`🤖 Inicializando sub-bot ${botId}...`);
        const { dirs } = createSubBotConfig(botId, phoneNumber, ownerNumber);
        
        const { state, saveCreds, signalRepository } = await useMultiFileAuthState(dirs.authDir, makeCacheableSignalKeyStore);
        const version = await getWAVersion();

        const sock = makeWASocket({
            version,
            logger,
            browser: ['Ubuntu', 'Chrome', '110.0.5481.177'],
            printQRInTerminal: false,
            auth: state,
            signalRepository,
            msgRetryCounterCache: new NodeCache(),
            shouldSyncHistoryMessage: () => false,
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            generateHighQualityLinkPreview: true
        });

        let pairingCode = null;
if (
generatePairingCode &&
!state.creds.registered
) {

console.log(
'[PAIRING] Número recebido:',
phoneNumber
)

await new Promise(
r => setTimeout(r, 8000)
)

pairingCode =
await sock.requestPairingCode(
phoneNumber
)

console.log(
'[PAIRING] Código:',
pairingCode
)
}
        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log(`✅ Sub-bot ${botId} online!`);
                const subbots = loadSubBots();
                if (subbots[botId]) {
                    subbots[botId].status = 'conectado';
                    subbots[botId].lastConnection = new Date().toISOString();
                    let botNum = sock.user?.id?.split(':')[0] || phoneNumber;
                    try { botNum = await getLidFromJidCached(sock, botNum); } catch (e) {}
                    subbots[botId].number = botNum;
                    saveSubBots(subbots);
                }
                activeSubBots.set(botId, sock);
            }

            if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.log(`❌ Sub-bot ${botId} offline. Código: ${reason}`);
                activeSubBots.delete(botId);

                const subbots = loadSubBots();
                if (subbots[botId]) {
                    subbots[botId].status = 'desconectado';
                    saveSubBots(subbots);
                }

                if (shuttingDown) {
                    console.log(`🛑 Sub-bot ${botId}: desligamento global ativo, sem reconexão.`);
                    return;
                }

                if (reason === DisconnectReason.loggedOut || reason === 401) {
                    await removeSubBot(botId);
                } else if (
                    sock.authState?.creds?.registered &&
                    reason !== DisconnectReason.connectionReplaced
                ) {
                    console.log(`🔄 Sub-bot ${botId}: reconexão agendada em 10s...`);

                    setTimeout(() => {
                        if (!shuttingDown && !activeSubBots.has(botId)) {
                            initializeSubBot(
                                botId,
                                phoneNumber,
                                ownerNumber
                            ).catch((error) => {
                                console.error(
                                    `❌ Falha na reconexão do sub-bot ${botId}:`,
                                    error.message
                                );
                            });
                        }
                    }, 10000);
                }
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            if (!m.messages || m.type !== 'notify') return;
            for (const info of m.messages) {
                if (!info.message || info.key.fromMe) continue;
                
                const envs = {
                    CONFIG_PATH: path.join(dirs.databaseDir, 'config.json'),
                    DATABASE_PATH: dirs.databaseDir,
                    IS_SUBBOT: 'true',
                    SUBBOT_ID: botId
                };

                const oldEnvs = {};
                Object.keys(envs).forEach(k => { oldEnvs[k] = process.env[k]; process.env[k] = envs[k]; });

                try {
                    const indexModule = await import('../index.js');
                    const NazuninhaBotExec = indexModule.default || indexModule;
                    if (typeof NazuninhaBotExec === 'function') {
                        await NazuninhaBotExec(sock, info, null, new Map(), null);
                    }
                } catch (e) {
                    console.error(`❌ Erro no sub-bot ${botId}:`, e.message);
                } finally {
                    Object.keys(oldEnvs).forEach(k => process.env[k] = oldEnvs[k]);
                }
            }
        });

        return { sock, pairingCode };
    } catch (error) {
        console.error(`❌ Erro no sub-bot ${botId}:`, error);
        throw error;
    }
}

async function addSubBot(phoneNumber, ownerNumber, subBotLid) {
    try {
        const subbots = loadSubBots();
        const botId = `subbot_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        subbots[botId] = { id: botId, phoneNumber, ownerNumber, subBotLid, status: 'registrado', createdAt: new Date().toISOString() };
        saveSubBots(subbots);
        return { success: true, message: '✅ Sub-bot registrado!', botId };
    } catch (e) { return { success: false, message: e.message }; }
}

async function removeSubBot(botId) {
    try {
        const subbots = loadSubBots();
        if (!subbots[botId]) return { success: false, message: 'Não encontrado' };
        const sock = activeSubBots.get(botId);
        if (sock) { try { await sock.logout(); } catch (e) {} activeSubBots.delete(botId); }
        delete subbots[botId];
        saveSubBots(subbots);
        const botDir = path.join(SUBBOTS_DIR, botId);
        if (fs.existsSync(botDir)) fs.rmSync(botDir, { recursive: true, force: true });
        return { success: true, message: 'Removido' };
    } catch (e) { return { success: false, message: e.message }; }
}

async function initializeAllSubBots() {
    const subbots = loadSubBots();
    const keys = Object.keys(subbots);
    console.log(`🤖 Iniciando ${keys.length} sub-bots...`);
    for (const botId of keys) {
        const bot = subbots[botId];
        const credsFile = path.join(SUBBOTS_DIR, botId, 'auth', 'creds.json');
        if (fs.existsSync(credsFile) && !activeSubBots.has(botId)) {
            await initializeSubBot(botId, bot.phoneNumber, bot.ownerNumber, false);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

async function generatePairingCodeForSubBot(userLid) {
    let botId = null;
    try {
        const subbots = loadSubBots();
        const botEntry = Object.entries(subbots).find(([_, bot]) => bot.subBotLid === userLid);
        if (!botEntry) return { success: false, message: '❌ Sub-bot não cadastrado!' };

        botId = botEntry[0];
        const bot = botEntry[1];

        if (generatingCode.has(botId)) return { success: false, message: '⏳ Geração em andamento...' };
        generatingCode.add(botId);

        const activeSock = activeSubBots.get(botId);
        if (activeSock) { try { await activeSock.logout(); } catch (e) {} activeSubBots.delete(botId); }

        const authDir = path.join(SUBBOTS_DIR, botId, 'auth');
        if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });
        fs.mkdirSync(authDir, { recursive: true });

        const result = await initializeSubBot(botId, bot.phoneNumber, bot.ownerNumber, true);
        if (!result.pairingCode) return { success: false, message: '❌ Falha ao gerar código.' };

        let message = `🔑 *CÓDIGO DE PAREAMENTO*\n\n`;
        message += `📱 *Número:* ${bot.phoneNumber}\n\n`;
        message += `🔢 *CÓDIGO:*\n`;
        message += `\`\`\`${result.pairingCode}\`\`\`\n\n`;
        message += `📲 *Instruções:*\n`;
        message += `1. No WhatsApp, vá em Aparelhos Conectados\n`;
        message += `2. Clique em Conectar com número de telefone\n`;
        message += `3. Digite o código acima\n\n`;
        message += `🔄 Conexão automática após o pareamento!`;

        return { success: true, message, pairingCode: result.pairingCode, botId };
    } catch (e) {
        console.error(e);
        return { success: false, message: `❌ Erro: ${e.message}` };
    } finally {
        setTimeout(() => { if (botId) generatingCode.delete(botId); }, 20000);
    }
}


/**
 * Desconecta todos os sub-bots ativos.
 *
 * IMPORTANTE:
 * Não utiliza logout().
 *
 * Logout removeria a autenticação da conta.
 * No shutdown normal queremos apenas fechar a conexão
 * e preservar as credenciais para a próxima inicialização.
 */
async function disconnectAllSubBots() {
    shuttingDown = true;

    const entries = Array.from(activeSubBots.entries());

    console.log(`🛑 Encerrando ${entries.length} sub-bot(s)...`);

    if (entries.length === 0) {
        activeSubBots.clear();
        console.log('✅ Nenhum sub-bot ativo para desconectar.');
        return;
    }

    const results = await Promise.allSettled(
        entries.map(async ([botId, sock]) => {
            try {
                console.log(`🔌 Fechando sub-bot ${botId}...`);

                /*
                 * Primeiro removemos os listeners do nosso gerenciador
                 * para evitar processamento durante o shutdown.
                 */
                try {
                    sock.ev?.removeAllListeners();
                } catch {}

                /*
                 * Fecha o WebSocket sem apagar a autenticação.
                 */
                try {
                    if (sock.ws?.close) {
                        sock.ws.close();
                    }
                } catch {}

                /*
                 * Algumas versões do Baileys expõem end().
                 * Usamos apenas se existir.
                 */
                try {
                    if (typeof sock.end === 'function') {
                        sock.end(undefined);
                    }
                } catch {}

                activeSubBots.delete(botId);

                console.log(`✅ Sub-bot ${botId} desconectado.`);
            } catch (error) {
                activeSubBots.delete(botId);

                console.error(
                    `❌ Erro ao fechar sub-bot ${botId}:`,
                    error.message
                );

                throw error;
            }
        })
    );

    const failed = results.filter(
        result => result.status === 'rejected'
    );

    activeSubBots.clear();

    if (failed.length > 0) {
        console.warn(
            `⚠️ ${failed.length} sub-bot(s) apresentaram erro durante o shutdown.`
        );
    } else {
        console.log(
            `✅ ${entries.length} sub-bot(s) finalizado(s) corretamente.`
        );
    }
}

export {
    addSubBot,
    removeSubBot,
    initializeSubBot,
    initializeAllSubBots,
    generatePairingCodeForSubBot,
    disconnectAllSubBots,
    activeSubBots
};
