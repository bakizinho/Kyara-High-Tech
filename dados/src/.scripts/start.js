#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '../../..');
const CONNECT = path.join(ROOT, 'dados', 'src', 'connect.js');

const VERSION = '11.0.0';
const PROFILE_CONFIG = path.join(ROOT, 'dados', 'src', 'config.json');
let PROFILE = {};
try {
    PROFILE = JSON.parse(fs.readFileSync(PROFILE_CONFIG, 'utf8'));
} catch {}
const NAME = String(PROFILE.nomebot || 'KYARA-SYSTΞM');

const A = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',

    purple: '\x1b[38;2;55;135;255m',
    pink: '\x1b[38;2;55;135;255m',
    cyan: '\x1b[38;2;65;205;255m',
    green: '\x1b[38;5;120m',
    yellow: '\x1b[38;5;221m',
    red: '\x1b[38;5;204m',
    white: '\x1b[38;5;255m',
    gray: '\x1b[38;5;245m',
    magenta: '\x1b[38;2;55;135;255m',

    clear: '\x1b[2J\x1b[H',
    hide: '\x1b[?25l',
    show: '\x1b[?25h'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function c(text, color) {
    return `${color}${text}${A.reset}`;
}

function terminalWidth() {
    return Math.max(
        40,
        Math.min(process.stdout.columns || 60, 68)
    );
}

function safePad(text, width) {
    const visible = String(text).length;
    return ' '.repeat(Math.max(0, width - visible));
}

function clear() {
    process.stdout.write(A.clear);
}

function hideCursor() {
    process.stdout.write(A.hide);
}

function showCursor() {
    process.stdout.write(A.show);
}

/* ================================================================
   KYARA LOGO
================================================================ */

const LOGO = [
    '╭────────────────────────────────────────────────────────────╮',
    '│                                                            │',
    '│                   🌸  K Y A R A - S Y S T Ξ M             │',
    '│                                                            │',
    '│                  WhatsApp Bot • Terminal                  │',
    '│                                                            │',
    '╰────────────────────────────────────────────────────────────╯'
];

/* ================================================================
   LOGO ANIMADO
================================================================ */

async function logoAnimation() {

    clear();
    hideCursor();

    console.log();

    for (let i = 0; i < LOGO.length; i++) {

        const color =
            i === 2
                ? A.pink + A.bold
                : i === 4
                    ? A.cyan
                    : i === 6
                        ? A.purple
                        : A.gray;

        console.log(
            c(
                LOGO[i],
                color
            )
        );

        await sleep(18);
    }

    console.log();

    console.log(
        '  ' +
        c('v' + VERSION, A.white) +
        c('  •  ', A.gray) +
        c(NAME, A.magenta) +
        c('  •  ', A.gray) +
        c(process.platform, A.gray) +
        c('  •  ', A.gray) +
        c('Node ' + process.version, A.gray)
    );

    console.log();

    showCursor();
}

/* ================================================================
   MINI LOADER
================================================================ */

async function loader(text, time = 500) {
    const frames = [
        '·',
        '•',
        '●',
        '•'
    ];

    const start = Date.now();
    let i = 0;

    hideCursor();

    while (Date.now() - start < time) {
        process.stdout.write(
            `\r  ${c(frames[i % frames.length], A.cyan)} ${text}`
        );

        i++;

        await sleep(90);
    }

    process.stdout.write(
        `\r  ${c('✓', A.green)} ${text}\n`
    );

    showCursor();
}

/* ================================================================
   SESSÃO
================================================================ */

function validCreds(dir) {

    const file = path.join(dir, 'creds.json');

    try {

        if (!fs.existsSync(file)) {
            return false;
        }

        const stat = fs.statSync(file);

        if (!stat.isFile() || stat.size < 10) {
            return false;
        }

        const json =
            JSON.parse(
                fs.readFileSync(file, 'utf8')
            );

        return Boolean(json);

    } catch {
        return false;
    }
}

/*
 * Procura credenciais sem assumir um único nome
 * de pasta.
 *
 * Ignora:
 * - node_modules
 * - subbots
 * - backups
 * - git
 */
function findSession() {

    const possible = [
        path.join(ROOT, 'dados', 'database', 'qr-code'),
        path.join(ROOT, 'dados', 'auth'),
        path.join(ROOT, 'dados', 'auth_info'),
        path.join(ROOT, 'dados', 'session'),
        path.join(ROOT, 'dados', 'sessions'),
        path.join(ROOT, 'auth'),
        path.join(ROOT, 'auth_info'),
        path.join(ROOT, 'session'),
        path.join(ROOT, 'sessions'),
        path.join(ROOT, 'database', 'auth')
    ];

    for (const dir of possible) {

        if (validCreds(dir)) {
            return dir;
        }
    }

    /*
     * Busca recursiva limitada.
     */
    const roots = [
        path.join(ROOT, 'dados')
    ];

    const ignored = new Set([
        'node_modules',
        '.git',
        'subbots',
        'backup',
        'backups'
    ]);

    function scan(dir, depth = 0) {

        if (depth > 4) {
            return null;
        }

        let entries;

        try {
            entries = fs.readdirSync(
                dir,
                { withFileTypes: true }
            );
        } catch {
            return null;
        }

        /*
         * Se a própria pasta possui creds.json,
         * encontramos a sessão.
         */
        if (validCreds(dir)) {
            return dir;
        }

        for (const entry of entries) {

            if (!entry.isDirectory()) {
                continue;
            }

            if (
                ignored.has(entry.name) ||
                /(?:backup|backups|relink|old|antigo)/i.test(entry.name)
            ) {
                continue;
            }

            const result =
                scan(
                    path.join(dir, entry.name),
                    depth + 1
                );

            if (result) {
                return result;
            }
        }

        return null;
    }

    for (const root of roots) {

        if (!fs.existsSync(root)) {
            continue;
        }

        const result = scan(root);

        if (result) {
            return result;
        }
    }

    return null;
}

/* ================================================================
   STATUS
================================================================ */

function statusLine(label, value, ok = true) {

    const width = terminalWidth();

    const icon = ok
        ? c('●', A.green)
        : c('○', A.yellow);

    const left =
        `  ${icon} ${label}`;

    const right =
        c(value, ok ? A.green : A.yellow);

    const plainLeft =
        `  ● ${label}`;

    const spaces =
        Math.max(
            2,
            width - plainLeft.length - value.length - 2
        );

    console.log(
        left +
        ' '.repeat(spaces) +
        right
    );
}

/* ================================================================
   PAINEL PRINCIPAL
================================================================ */

function dashboard(session) {

    const width = terminalWidth();
    const inner = width - 4;
    const line = '─'.repeat(inner);

    const title =
        '🌸 KYARA-SYSTΞM';

    const subtitle =
        'SYSTEM STATUS';

    console.log(
        c('╭' + line + '╮', A.cyan)
    );

    console.log(
        c('│', A.cyan) +
        '  ' +
        c(title, A.bold + A.white) +
        '  ' +
        c(subtitle, A.gray) +
        ' '.repeat(
            Math.max(
                1,
                inner -
                title.length -
                subtitle.length -
                4
            )
        ) +
        c('│', A.cyan)
    );

    console.log(
        c('├' + line + '┤', A.gray)
    );

    statusLine(
        'CORE',
        'ONLINE'
    );

    statusLine(
        'NODE',
        process.version
    );

    statusLine(
        'TERMUX',
        'ACTIVE'
    );

    statusLine(
        'SESSION',
        session
            ? 'FOUND'
            : 'NOT FOUND',
        Boolean(session)
    );

    console.log(
        c('╰' + line + '╯', A.cyan)
    );

    console.log();
}

/* ================================================================
   AUTENTICAÇÃO
================================================================ */

function authMenu() {

    const width = terminalWidth();

    console.log(
        c(
            `╭${'─'.repeat(width - 2)}╮`,
            A.magenta
        )
    );

    console.log(
        c('│ ', A.magenta) +
        c('CENTRO DE CONEXÃO', A.white) +
        safePad(
            'AUTHENTICATION',
            width - 5
        ) +
        c('│', A.magenta)
    );

    console.log(
        c(
            `├${'─'.repeat(width - 2)}┤`,
            A.gray
        )
    );

    console.log(
        c('│  ', A.magenta) +
        c('1', A.cyan) +
        '  📷  QR CODE' +
        safePad(
            '│  1  📷  QR CODE',
            width - 2
        ) +
        c('│', A.magenta)
    );

    console.log(
        c('│  ', A.magenta) +
        c('2', A.magenta) +
        '  🔑  CÓDIGO DE PAREAMENTO' +
        safePad(
            '│  2  🔑  CÓDIGO DE PAREAMENTO',
            width - 2
        ) +
        c('│', A.magenta)
    );

    console.log(
        c('│  ', A.magenta) +
        c('3', A.green) +
        '  👤  CONFIGURAR DONO DO BOT' +
        safePad(
            '│  3  👤  CONFIGURAR DONO DO BOT',
            width - 2
        ) +
        c('│', A.magenta)
    );

    console.log(
        c('│  ', A.magenta) +
        c('0', A.red) +
        '  🚪  SAIR' +
        safePad(
            '│  0  🚪  SAIR',
            width - 2
        ) +
        c('│', A.magenta)
    );

    console.log(
        c(
            `╰${'─'.repeat(width - 2)}╯`,
            A.magenta
        )
    );

    console.log();
}

/* ================================================================
   INPUT
================================================================ */

function ask(text) {

    return new Promise(resolve => {

        const rl =
            readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

        rl.question(text, answer => {

            rl.close();

            resolve(
                answer
                    .trim()
                    .toLowerCase()
            );
        });
    });
}


/* ================================================================
   KYARA • CONFIGURAÇÃO DO PROPRIETÁRIO
================================================================ */

function askRaw(question) {
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(question, answer => {
            rl.close();
            resolve(String(answer || '').trim());
        });
    });
}

async function configureOwner() {
    let config;

    try {
        config = JSON.parse(
            fs.readFileSync(PROFILE_CONFIG, 'utf8')
        );
    } catch (error) {
        throw new Error(
            `Não foi possível ler config.json: ${error.message}`
        );
    }

    const oldName = String(config.nomedono || 'Dono');
    const oldPhone = String(config.numerodono || '')
        .replace(/\D/g, '');

    console.log('');
    console.log('╭────────────────────────────────────────────╮');
    console.log('│       🌸 KYARA-SYSTΞM • DONO DO BOT        │');
    console.log('├────────────────────────────────────────────┤');
    console.log('│ Informe o nome e o número do proprietário. │');
    console.log('│ O número deve incluir DDI e DDD.            │');
    console.log('╰────────────────────────────────────────────╯');

    const enteredName = await askRaw(
        `👤 Nome do dono [${oldName}]: `
    );

    const ownerName = enteredName || oldName;

    if (ownerName.length < 2 || ownerName.length > 40) {
        throw new Error(
            'O nome do dono deve ter entre 2 e 40 caracteres.'
        );
    }

    const enteredPhone = await askRaw(
        `📱 Número com DDI e DDD [${oldPhone || 'obrigatório'}]: `
    );

    const ownerPhone = (enteredPhone || oldPhone)
        .replace(/\D/g, '');

    if (!/^\d{10,15}$/.test(ownerPhone)) {
        throw new Error(
            'Número inválido. Use de 10 a 15 dígitos, incluindo DDI e DDD.'
        );
    }

    const stamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-');

    const backup =
        `${PROFILE_CONFIG}.BACKUP_OWNER_${stamp}`;

    fs.copyFileSync(PROFILE_CONFIG, backup);

    config.nomedono = ownerName;
    config.numerodono = ownerPhone;

    if (oldPhone && oldPhone !== ownerPhone) {
        delete config.lidowner;

        console.log(
            '🪪 Número alterado: LID antigo removido para evitar vínculo com o dono anterior.'
        );
    }

    if (
        config.kyaraOwnerProfile &&
        typeof config.kyaraOwnerProfile === 'object'
    ) {
        config.kyaraOwnerProfile.name = ownerName;
        config.kyaraOwnerProfile.contact = ownerPhone;
    }

    const temp =
        `${PROFILE_CONFIG}.tmp-${process.pid}`;

    fs.writeFileSync(
        temp,
        JSON.stringify(config, null, 2) + '\n',
        'utf8'
    );

    fs.renameSync(temp, PROFILE_CONFIG);

    console.log('');
    console.log('✅ PROPRIETÁRIO CONFIGURADO');
    console.log(`👤 Nome: ${ownerName}`);
    console.log(`📱 Número: ${ownerPhone}`);
    console.log(`📦 Backup: ${path.basename(backup)}`);
    console.log('');
}

/* ================================================================
   START CONNECT
================================================================ */

function startConnect(method = 'auto', freshAuth = false) {

    if (!fs.existsSync(CONNECT)) {

        console.error();
        console.error(
            c(
                '✖ connect.js não encontrado.',
                A.red
            )
        );

        console.error(CONNECT);

        process.exit(1);
    }

    const env = {
        ...process.env,

        KYARA_CONNECTION_METHOD: method,
        KYARA_FORCE_NEW_AUTH: freshAuth ? '1' : '0',

        KYARA_LAUNCHER: 'true',

        KYARA_VERSION: VERSION
    };

    const child =
        spawn(
            process.execPath,
            [CONNECT],
            {
                cwd: ROOT,
                env,
                stdio: 'inherit'
            }
        );

    let stopping = false;

    const stop = signal => {

        if (stopping) {
            return;
        }

        stopping = true;

        try {
            child.kill(signal);
        } catch {}
    };

    process.on(
        'SIGINT',
        () => stop('SIGINT')
    );

    process.on(
        'SIGTERM',
        () => stop('SIGTERM')
    );

    child.on(
        'error',
        error => {

            console.error();

            console.error(
                c(
                    `✖ Falha ao iniciar KYARA-SYSTΞM: ${error.message}`,
                    A.red
                )
            );
        }
    );

    child.on(
        'exit',
        (code, signal) => {

            showCursor();

            if (signal) {
                return;
            }

            process.exitCode =
                typeof code === 'number'
                    ? code
                    : 0;
        }
    );
}

/* ================================================================
   BOOT AUTOMÁTICO
================================================================ */

async function autoBoot(session) {

    clear();
    await logoAnimation();
    dashboard(session);

    await loader('Validando sessão', 250);
    await loader('Inicializando Core', 250);

    while (true) {

        console.log('╭────────────────────────────────────────────────╮');
        console.log('│             🌸 CENTRAL DE INICIALIZAÇÃO         │');
        console.log('├────────────────────────────────────────────────┤');
        console.log('│ ENTER / 1  Conectar usando a sessão salva      │');
        console.log('│ 2          Novo pareamento por código          │');
        console.log('│ 3          Novo pareamento por QR Code         │');
        console.log('│ 4          Configurar nome e número do dono    │');
        console.log('│ 0          Sair                                 │');
        console.log('╰────────────────────────────────────────────────╯');

        const option = await ask('  ➜ Escolha: ');

        if (option === '' || option === '1') {
            console.log('→ Conectando com a sessão salva...');
            startConnect('auto');
            return;
        }

        if (option === '2') {
            console.log('🔑 Preparando novo pareamento por código...');
            startConnect('pairing', true);
            return;
        }

        if (option === '3') {
            console.log('▣ Preparando novo pareamento por QR Code...');
            startConnect('qr', true);
            return;
        }

        if (option === '4') {
            try {
                await configureOwner();
            } catch (error) {
                console.error(
                    '❌ Não foi possível salvar o dono:',
                    error.message
                );
            }

            dashboard(session);
            continue;
        }

        if (option === '0') {
            console.log('👋 KYARA-SYSTΞM encerrada.');
            process.exit(0);
        }

        console.log(
            '⚠️ Opção inválida. Escolha 1, 2, 3, 4 ou 0.'
        );
    }
}

/* ================================================================
   PRIMEIRO ACESSO
================================================================ */

async function firstBoot() {

    clear();

    await logoAnimation();

    dashboard(null);

    console.log(
        '  ' +
        c('⚠', A.yellow) +
        ' ' +
        c(
            'Nenhuma sessão encontrada.',
            A.yellow
        )
    );

    console.log();

    authMenu();

    while (true) {

        const option =
            await ask(
                c(
                    '  ➜ ',
                    A.cyan
                ) +
                c(
                    'Escolha (1, 2, 3 ou 0): ',
                    A.white
                )
            );

        console.log();

        if (option === '1') {

            await loader(
                'Preparando QR Code',
                450
            );

            console.log();

            console.log(
                '  ' +
                c('📷', A.cyan) +
                ' ' +
                c(
                    'QR Code será exibido pelo sistema.',
                    A.white
                )
            );

            console.log();

            await sleep(250);

            startConnect('qr');

            return;
        }

        if (option === '2') {

            await loader(
                'Preparando pareamento',
                450
            );

            console.log();

            console.log(
                '  ' +
                c('🔑', A.magenta) +
                ' ' +
                c(
                    'Código de pareamento será solicitado.',
                    A.white
                )
            );

            console.log();

            await sleep(250);

            startConnect('pairing');

            return;
        }

        if (option === '3') {
            try {
                await configureOwner();
            } catch (error) {
                console.error(
                    '❌ Não foi possível salvar o dono:',
                    error.message
                );
            }

            authMenu();
            continue;
        }

        if (option === '0') {

            console.log(
                '  ' +
                c('✓', A.green) +
                ' ' +
                c(
                    'KYARA-SYSTΞM encerrada.',
                    A.white
                )
            );

            console.log();

            process.exit(0);
        }

        console.log(
            '  ' +
            c('⚠', A.yellow) +
            ' ' +
            c(
                'Escolha 1, 2, 3 ou 0.',
                A.yellow
            )
        );

        console.log();
    }
}

/* ================================================================
   BOOT
================================================================ */

async function boot() {

    try {

        showCursor();

        const session = findSession();

        if (process.argv.includes('--owner')) {
            clear();
            await logoAnimation();
            await configureOwner();
            return;
        }

        const forcedMethod =
            (process.argv.includes('--code') || process.argv.includes('--pairing'))
                ? 'pairing'
                : process.argv.includes('--qr')
                    ? 'qr'
                    : null;

        if (forcedMethod) {
            clear();
            await logoAnimation();
            dashboard(session);

            console.log('  🔐 Novo pareamento solicitado pelo terminal.');
            console.log('  📦 A autenticação anterior será arquivada, nunca apagada.');
            console.log();

            await loader(
                forcedMethod === 'pairing'
                    ? 'Preparando código de pareamento'
                    : 'Preparando QR Code',
                350
            );

            startConnect(forcedMethod, true);
            return;
        }

        /*
         * REGRA:
         *
         * encontrou creds.json
         *      ↓
         * conexão automática
         *
         * não encontrou
         *      ↓
         * menu de autenticação
         */

        if (session) {

            await autoBoot(session);

        } else {

            await firstBoot();

        }

    } catch (error) {

        showCursor();

        clear();

        console.log(
            c(
                '╭──────────────────────────────────────╮',
                A.red
            )
        );

        console.log(
            c(
                '│        KYARA-SYSTΞM BOOT ERROR         │',
                A.red
            )
        );

        console.log(
            c(
                '╰──────────────────────────────────────╯',
                A.red
            )
        );

        console.log();

        console.error(
            error?.stack ||
            error?.message ||
            String(error)
        );

        console.log();
    }
}

process.on(
    'exit',
    showCursor
);

boot();

