/**
 * ============================================================
 * KYARA — CASES LOCAL
 * ============================================================
 * Adaptadores sem APIs externas.
 *
 * LOCAL:
 *   roleta  -> totalmente local
 *   tomp3   -> ffmpeg local
 *   claude  -> preparado para IA local
 *   grok    -> preparado para IA local
 *
 * DEPENDENTES DE DADOS EXTERNOS:
 *   nano
 *   placar
 *   shazam
 *   instagram
 *   pin
 *
 * Nenhum endpoint systemzone.store / zone.api.br é usado aqui.
 * ============================================================
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function textoSeguro(valor) {
    return String(valor ?? '').trim();
}

function escapeShell(valor) {
    return String(valor ?? '').replace(/["\\$`]/g, '\\$&');
}

/**
 * ------------------------------------------------------------
 * ROleta
 * ------------------------------------------------------------
 * Não precisa de API.
 */
async function roleta({ m, text, systemZR }) {
    const entrada = textoSeguro(text);

    if (!entrada) {
        return m.reply(
            '🎰 *ROLETA LOCAL*\n\n' +
            'Uso:\n' +
            `${prefixoSeguro(m)}roleta Azul, Preto, Verde\n\n` +
            'A roleta agora funciona localmente.'
        );
    }

    const opcoes = entrada
        .split(',')
        .map(x => x.trim())
        .filter(Boolean);

    if (opcoes.length < 2) {
        return m.reply('⚠️ Informe pelo menos 2 opções separadas por vírgula.');
    }

    await systemZR.sendMessage(m.chat, {
        react: { text: '🎰', key: m.key }
    });

    const indice = crypto.randomInt(0, opcoes.length);
    const escolhida = opcoes[indice];

    let resposta =
        `╭━━〔 🎰 ROLETA LOCAL 〕━━╮\n` +
        `┃\n` +
        `┃ 🎯 Opções: ${opcoes.length}\n` +
        `┃\n` +
        `┃ 🏆 *Resultado:*\n` +
        `┃ 👉 ${escolhida}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯`;

    await m.reply(resposta);

    await systemZR.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
    });
}

/**
 * ------------------------------------------------------------
 * TOMMP3
 * ------------------------------------------------------------
 * Conversão totalmente local usando ffmpeg.
 */
async function tomp3({ m, systemZR }) {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || '';

    if (!/video|audio/i.test(mime)) {
        return m.reply(
            '🎵 Responda a um vídeo ou áudio com o comando *tomp3*.'
        );
    }

    await systemZR.sendMessage(m.chat, {
        react: { text: '⏳', key: m.key }
    });

    const id = crypto.randomBytes(8).toString('hex');

    const tempDir = path.join(process.cwd(), 'data', 'tmp');

    fs.mkdirSync(tempDir, { recursive: true });

    const input = path.join(tempDir, `${id}.input`);
    const output = path.join(tempDir, `${id}.mp3`);

    try {
        const buffer = await q.download();

        if (!buffer) {
            throw new Error('Não foi possível baixar a mídia da mensagem.');
        }

        fs.writeFileSync(input, buffer);

        await execFileAsync(
            'ffmpeg',
            [
                '-y',
                '-i',
                input,
                '-vn',
                '-codec:a',
                'libmp3lame',
                '-b:a',
                '192k',
                output
            ],
            {
                timeout: 180000,
                maxBuffer: 10 * 1024 * 1024
            }
        );

        if (!fs.existsSync(output)) {
            throw new Error('O ffmpeg não criou o arquivo MP3.');
        }

        await systemZR.sendMessage(
            m.chat,
            {
                audio: fs.readFileSync(output),
                mimetype: 'audio/mpeg',
                ptt: false,
                fileName: 'audio.mp3'
            },
            { quoted: m }
        );

        await systemZR.sendMessage(m.chat, {
            react: { text: '✅', key: m.key }
        });

    } catch (error) {
        console.error('[LOCAL TOMP3]', error);

        await systemZR.sendMessage(m.chat, {
            react: { text: '❌', key: m.key }
        });

        await m.reply(
            '❌ Não consegui converter a mídia localmente.\n\n' +
            `Detalhe: ${error?.message || 'erro desconhecido'}\n\n` +
            '💡 Verifique se o ffmpeg está instalado.'
        );

    } finally {
        try {
            if (fs.existsSync(input)) fs.unlinkSync(input);
        } catch {}

        try {
            if (fs.existsSync(output)) fs.unlinkSync(output);
        } catch {}
    }
}

/**
 * ------------------------------------------------------------
 * IA LOCAL
 * ------------------------------------------------------------
 * A função recebe uma função de IA existente da Kyara.
 *
 * Não chama Claude, Grok ou qualquer API externa.
 */
async function iaLocal({
    m,
    text,
    systemZR,
    obterIA
}) {
    const pergunta = textoSeguro(text);

    if (!pergunta) {
        return m.reply(
            '🤖 Informe o que deseja perguntar.\n\n' +
            'Exemplo:\n' +
            '!claude explique buracos negros'
        );
    }

    await systemZR.sendMessage(m.chat, {
        react: { text: '🤖', key: m.key }
    });

    try {
        if (typeof obterIA !== 'function') {
            throw new Error(
                'Motor de IA local não foi conectado ao módulo.'
            );
        }

        const resposta = await obterIA({
            pergunta,
            chatId: m.isGroup ? m.chat : m.sender,
            mensagem: m
        });

        const textoResposta =
            typeof resposta === 'string'
                ? resposta
                : resposta?.text ||
                  resposta?.resposta ||
                  resposta?.response ||
                  '';

        if (!textoResposta.trim()) {
            throw new Error('A IA local não retornou texto.');
        }

        await m.reply(textoResposta);

        await systemZR.sendMessage(m.chat, {
            react: { text: '✅', key: m.key }
        });

    } catch (error) {
        console.error('[IA LOCAL]', error);

        await systemZR.sendMessage(m.chat, {
            react: { text: '❌', key: m.key }
        });

        await m.reply(
            '❌ O motor de IA local não está disponível neste momento.\n\n' +
            'Verifique se o llama-server/Qwen está funcionando.'
        );
    }
}

/**
 * ------------------------------------------------------------
 * COMANDOS QUE NÃO POSSUEM EQUIVALENTE OFFLINE PURO
 * ------------------------------------------------------------
 */
async function indisponivelOffline({ m, nome }) {
    return m.reply(
        `⚠️ *${nome.toUpperCase()} — MODO LOCAL*\n\n` +
        `O comando foi removido das APIs externas da Kyara.\n\n` +
        `Para funcionar sem API externa, precisamos conectar um ` +
        `motor local específico para esse recurso.`
    );
}

/**
 * ------------------------------------------------------------
 * PREFIXO
 * ------------------------------------------------------------
 */
function prefixoSeguro(m) {
    return globalThis.__KYARA_PREFIX__ || '!';
}

/**
 * ------------------------------------------------------------
 * DISPATCHER
 * ------------------------------------------------------------
 */
export async function executarCaseLocal({
    command,
    m,
    text,
    systemZR,
    obterIA
}) {
    const cmd = textoSeguro(command).toLowerCase();

    switch (cmd) {

        case 'roleta':
            await roleta({
                m,
                text,
                systemZR
            });
            return true;

        case 'tomp3':
            await tomp3({
                m,
                systemZR
            });
            return true;

        /*
         * Claude e Grok deixam de usar APIs externas.
         * Ambos passam pelo mesmo motor local.
         */

        case 'claude':
        case 'grok':
            await iaLocal({
                m,
                text,
                systemZR,
                obterIA
            });
            return true;

        /*
         * Esses comandos ainda não possuem implementação
         * offline completa.
         */

        case 'nano':
            await indisponivelOffline({
                m,
                nome: 'nano'
            });
            return true;

        case 'placar':
            await indisponivelOffline({
                m,
                nome: 'placar'
            });
            return true;

        case 'shazam':
            await indisponivelOffline({
                m,
                nome: 'shazam'
            });
            return true;

        case 'ig':
        case 'instagram':
            await indisponivelOffline({
                m,
                nome: 'instagram'
            });
            return true;

        default:
            return false;
    }
}

/**
 * ------------------------------------------------------------
 * EXPORTAÇÃO
 * ------------------------------------------------------------
 */
export default {
    executarCaseLocal,
    roleta,
    tomp3,
    iaLocal
};
