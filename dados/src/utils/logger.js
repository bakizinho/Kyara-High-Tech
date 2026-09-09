/**
 * ================================================================
 *                         KYARA LOGGER
 *                    CONSOLE UI v10.2.1
 * ================================================================
 */

const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',

    cyan: '\x1b[96m',
    blue: '\x1b[94m',
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    red: '\x1b[91m',
    magenta: '\x1b[95m',
    white: '\x1b[97m',
    gray: '\x1b[90m'
};

const WIDTH = 60;

function paint(text, color = C.white) {
    return `${color}${text}${C.reset}`;
}

function clean(value) {
    return String(value ?? '')
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replace(/\r/g, '')
        .replace(/\n+/g, ' ')
        .trim();
}

function clock() {
    return new Date().toLocaleTimeString('pt-BR', {
        hour12: false
    });
}

function line(char = '─', width = WIDTH) {
    return char.repeat(width);
}

/* ================================================================
   LOG PRINCIPAL
================================================================ */

function log(type, message, color = C.white) {

    const t = String(type || 'INFO')
        .toUpperCase()
        .padEnd(5);

    console.log(
        `  ${paint(clock(), C.gray)} ` +
        `${paint(t, color)} ` +
        `${paint(clean(message), C.white)}`
    );
}

/* ================================================================
   TIPOS
================================================================ */

function boot(message) {
    log('BOOT', message, C.cyan);
}

function core(message) {
    log('CORE', message, C.magenta);
}

function wa(message) {
    log('WA', message, C.green);
}

function data(message) {
    log('DATA', message, C.blue);
}

function cmd(message) {
    log('CMD', message, C.cyan);
}

function msg(message) {
    log('MSG', message, C.white);
}

function bot(message) {
    log('BOT', message, C.magenta);
}

function sync(message) {
    log('SYNC', message, C.green);
}

function info(message) {
    log('INFO', message, C.white);
}

function ok(message) {
    log('OK', message, C.green);
}

function warn(message) {
    log('WARN', message, C.yellow);
}

function error(message) {
    log('ERR', message, C.red);
}

/* ================================================================
   COMANDO
================================================================ */

function command({
    command = '',
    group = '',
    user = '',
    content = ''
} = {}) {

    const cmdName = clean(command);
    const grp = clean(group);
    const usr = clean(user);
    const body = clean(content);

    let preview = body;

    if (preview.length > 42) {
        preview = preview.slice(0, 39) + '...';
    }

    console.log();

    console.log(
        `  ${paint(clock(), C.gray)} ` +
        `${paint('CMD', C.cyan)} ` +
        `${paint(cmdName || 'UNKNOWN', C.bold + C.white)}`
    );

    console.log(
        `             ${paint('›', C.cyan)} ` +
        `${paint(grp || 'PRIVADO', C.white)} ` +
        `${paint('›', C.gray)} ` +
        `${paint(usr || 'UNKNOWN', C.white)}`
    );

    if (preview) {
        console.log(
            `             ${paint('↳', C.cyan)} ` +
            `${paint(preview, C.gray)}`
        );
    }

    console.log();
}

/* ================================================================
   MENSAGEM DE USUÁRIO
================================================================ */

function message({
    group = '',
    user = '',
    content = ''
} = {}) {

    const grp = clean(group) || 'PRIVADO';
    const usr = clean(user) || 'UNKNOWN';

    let body = clean(content);

    if (body.length > 55) {
        body = body.slice(0, 52) + '...';
    }

    console.log();

    console.log(
        `  ${paint(clock(), C.gray)} ` +
        `${paint('MSG', C.blue)} ` +
        `${paint(usr, C.bold + C.white)} ` +
        `${paint('›', C.blue)} ` +
        `${paint(`"${body}"`, C.white)}`
    );

    console.log(
        `             ${paint('↳', C.blue)} ` +
        `${paint(grp, C.gray)}`
    );

    console.log();
}

/* ================================================================
   STATUS
================================================================ */

function status(label, value, color = C.green) {

    const l = clean(label).toUpperCase();
    const v = clean(value);

    console.log(
        `  ${paint('●', color)} ` +
        `${paint(l.padEnd(16), C.gray)} ` +
        `${paint(v, color)}`
    );
}

/* ================================================================
   CHECK
================================================================ */

function check(label, value = 'OK') {

    console.log(
        `  ${paint('✓', C.green)} ` +
        `${paint(label.padEnd(16), C.white)} ` +
        `${paint(value, C.gray)}`
    );
}

/* ================================================================
   HEADER
================================================================ */

function header(title = 'KYARA') {

    console.log();

    console.log(
        `  ${paint(`╭─ ${title.toUpperCase()} `, C.cyan)}` +
        paint(line('─', Math.max(5, WIDTH - title.length - 5)), C.cyan) +
        paint('╮', C.cyan)
    );
}

/* ================================================================
   FOOTER
================================================================ */

function footer() {

    console.log(
        `  ${paint('╰' + line('─', WIDTH) + '╯', C.cyan)}`
    );

    console.log();
}

/* ================================================================
   SISTEMA ONLINE
================================================================ */

function online({
    version = '10.2.1',
    prefix = '/',
    owner = 'baki'
} = {}) {

    console.log();

    console.log(
        `  ${paint('◆', C.green)} ` +
        `${paint('KYARA ONLINE', C.bold + C.green)}`
    );

    console.log(
        `    ${paint(`v${version}`, C.gray)} ` +
        `${paint('•', C.gray)} ` +
        `${paint(`PREFIX ${prefix}`, C.white)} ` +
        `${paint('•', C.gray)} ` +
        `${paint(`OWNER ${owner}`, C.white)}`
    );

    console.log();
}

/* ================================================================
   EXPORT
================================================================ */

export {
    log,
    boot,
    core,
    wa,
    data,
    cmd,
    msg,
    bot,
    sync,
    info,
    ok,
    warn,
    error,
    command,
    message,
    status,
    check,
    header,
    footer,
    online
};

export default {
    log,
    boot,
    core,
    wa,
    data,
    cmd,
    msg,
    bot,
    sync,
    info,
    ok,
    warn,
    error,
    command,
    message,
    status,
    check,
    header,
    footer,
    online
};

