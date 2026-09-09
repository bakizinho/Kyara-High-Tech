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

const VERSION = '10.2.1';
const NAME = 'KYARA';

const A = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',

    cyan: '\x1b[96m',
    magenta: '\x1b[95m',
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    red: '\x1b[91m',
    white: '\x1b[97m',
    gray: '\x1b[90m',

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
    '██╗  ██╗██╗   ██╗ █████╗ ██████╗  █████╗',
    '██║ ██╔╝╚██╗ ██╔╝██╔══██╗██╔══██╗██╔══██╗',
    '█████╔╝  ╚████╔╝ ███████║██████╔╝███████║',
    '██╔═██╗   ╚██╔╝  ██╔══██║██╔══██╗██╔══██║',
    '██║  ██╗   ██║   ██║  ██║██║  ██║██║  ██║',
    '╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝'
];

/* ================================================================
   LOGO ANIMADO
================================================================ */

async function logoAnimation() {
    clear();
    hideCursor();

    console.log();

    for (let i = 0; i < LOGO.length; i++) {
        const shade =
            i % 2 === 0
                ? A.cyan
                : A.magenta;

        console.log(c(LOGO[i], shade));

        await sleep(35);
    }

    console.log();

    console.log(
        c(
            '                 ⚡ WHATSAPP AUTOMATION CORE',
            A.white
        )
    );

    console.log(
        c(
            `                 v${VERSION}  •  ${os.platform()}  •  Node ${process.version}`,
            A.gray
        )
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

            if (ignored.has(entry.name)) {
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

    console.log(
        c(
            `╭${'─'.repeat(width - 2)}╮`,
            A.cyan
        )
    );

    console.log(
        c('│ ', A.cyan) +
        c('KYARA', A.white) +
        c(`  v${VERSION}`, A.gray) +
        safePad(
            `KYARA  v${VERSION}`,
            width - 4
        ) +
        c('│', A.cyan)
    );

    console.log(
        c(
            `├${'─'.repeat(width - 2)}┤`,
            A.gray
        )
    );

    statusLine(
        'CORE ENGINE',
        'ONLINE'
    );

    statusLine(
        'NODE RUNTIME',
        process.version
    );

    statusLine(
        'TERMUX',
        'ACTIVE'
    );

    statusLine(
        'SESSION',
        session ? 'FOUND' : 'NOT FOUND',
        Boolean(session)
    );

    console.log(
        c(
            `╰${'─'.repeat(width - 2)}╯`,
            A.cyan
        )
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
        c('AUTHENTICATION', A.white) +
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
        c('3', A.red) +
        '  🚪  SAIR' +
        safePad(
            '│  3  🚪  SAIR',
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
   START CONNECT
================================================================ */

function startConnect(method = 'auto') {

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
                    `✖ Falha ao iniciar Kyara: ${error.message}`,
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

    await loader(
        'Validando sessão',
        450
    );

    await loader(
        'Inicializando Core',
        450
    );

    console.log();

    console.log(
        `  ${c('●', A.green)} ` +
        c(
            'SESSION FOUND',
            A.green
        )
    );

    console.log(
        `  ${c('⚡', A.cyan)} ` +
        c(
            'AUTO CONNECT',
            A.white
        ) +
        c(
            '  •  conexão automática',
            A.gray
        )
    );

    console.log();

    await sleep(450);

    startConnect('auto');
}

/* ================================================================
   PRIMEIRO ACESSO
================================================================ */

async function firstBoot() {

    clear();

    await logoAnimation();

    dashboard(null);

    console.log(
        c(
            '  Nenhuma sessão foi encontrada.',
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
                'Método: '
            );

        console.log();

        if (option === '1') {

            await loader(
                'Preparando QR Code',
                700
            );

            console.log();

            console.log(
                c(
                    '  📷 QR CODE MODE',
                    A.cyan
                )
            );

            console.log(
                c(
                    '  O código será exibido pelo sistema.',
                    A.gray
                )
            );

            console.log();

            await sleep(400);

            startConnect('qr');

            return;
        }

        if (option === '2') {

            await loader(
                'Preparando pareamento',
                700
            );

            console.log();

            console.log(
                c(
                    '  🔑 PHONE PAIRING MODE',
                    A.magenta
                )
            );

            console.log();

            await sleep(400);

            startConnect('pairing');

            return;
        }

        if (option === '3') {

            console.log(
                c(
                    '  ✓ Kyara encerrado.',
                    A.green
                )
            );

            console.log();

            process.exit(0);
        }

        console.log(
            c(
                '  ⚠ Escolha 1, 2 ou 3.',
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
                '│           KYARA BOOT ERROR            │',
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

