/**
 * ================================================================
 *                        KYARA PAINEL
 *   Terminal web estilo WhatsApp: CMD / Mensagens / Bot / WhatsApp
 * ================================================================
 *
 * Este módulo NÃO cria uma segunda conexão com o WhatsApp.
 * Ele apenas:
 *
 * 1) Assiste os eventos que o kyara-terminal.js já emite
 *    (log, message, command, error, connected...) e transmite
 *    por WebSocket para a página do painel.
 *
 * 2) Quando você executa um comando na aba WhatsApp, ele monta
 *    uma mensagem sintética e manda direto para o dispatcher
 *    de comandos usando o socket ativo.
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

import {
    on as onTerminalEvent,
    event as terminalEvent,
    getState
} from './kyara-terminal.js';

import { getActiveSocket } from './utils/activeSocket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GRUPOS_DIR = path.join(
    __dirname,
    '..',
    'database',
    'grupos'
);

const HOST =
    process.env.KYARA_PAINEL_HOST ||
    '127.0.0.1';

const PORT =
    Number(process.env.KYARA_PAINEL_PORT || 3040);

const TOKEN =
    process.env.KYARA_PAINEL_TOKEN || '';

let ctx = {};
let started = false;

/** @type {Set<import('ws').WebSocket>} */
const clients = new Set();

function broadcast(payload) {
    const raw = JSON.stringify(payload);

    for (const ws of clients) {
        if (ws.readyState === ws.OPEN) {
            try {
                ws.send(raw);
            } catch {}
        }
    }
}

function send(ws, payload) {
    if (ws.readyState === ws.OPEN) {
        try {
            ws.send(JSON.stringify(payload));
        } catch {}
    }
}

/* ================================================================
 * LISTA DE CONVERSAS
 * ================================================================ */

async function listGroupsFromDb() {
    try {
        const files = await fs.readdir(GRUPOS_DIR);
        const out = [];

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const jid = file.replace(/\.json$/, '');

            try {
                const raw = await fs.readFile(
                    path.join(GRUPOS_DIR, file),
                    'utf8'
                );

                const data = JSON.parse(raw);

                out.push({
                    jid,
                    name: data.groupName || jid,
                    type: 'group'
                });
            } catch {
                out.push({
                    jid,
                    name: jid,
                    type: 'group'
                });
            }
        }

        return out;
    } catch {
        return [];
    }
}

async function listGroupsLive(sock) {
    if (!sock) return [];

    try {
        const metadata =
            await sock.groupFetchAllParticipating();

        return Object.values(metadata || {}).map(g => ({
            jid: g.id,
            name: g.subject || g.id,
            type: 'group'
        }));
    } catch {
        return [];
    }
}

async function buildChatList() {
    const sock = getActiveSocket();

    const [fromDb, live] =
        await Promise.all([
            listGroupsFromDb(),
            listGroupsLive(sock)
        ]);

    const byJid = new Map();

    for (const g of fromDb) {
        byJid.set(g.jid, g);
    }

    for (const g of live) {
        byJid.set(g.jid, g);
    }

    const groups = [
        ...byJid.values()
    ].sort((a, b) =>
        a.name.localeCompare(
            b.name,
            'pt-BR'
        )
    );

    const cfg =
        ctx.getConfig?.() || {};

    const ownerNumber =
        String(cfg.numerodono || '')
            .replace(/\D/g, '');

    const contacts = ownerNumber
        ? [{
            jid: `${ownerNumber}@s.whatsapp.net`,
            name:
                `${cfg.nomedono || 'Dono'} (privado)`,
            type: 'contact'
        }]
        : [];

    return {
        groups,
        contacts
    };
}

/* ================================================================
 * EXECUÇÃO DE COMANDO
 * ================================================================ */

async function runTerminalCommand(
    jid,
    rawText
) {
    const sock = getActiveSocket();

    if (!sock) {
        throw new Error(
            'O bot ainda não está conectado ao WhatsApp.'
        );
    }

    if (
        !jid ||
        !rawText ||
        !rawText.trim()
    ) {
        throw new Error(
            'Escolha uma conversa e digite um comando.'
        );
    }

    const indexModule =
        ctx.getIndexModule?.();

    if (typeof indexModule !== 'function') {
        throw new Error(
            'Dispatcher de comandos (index.js) ainda não está pronto.'
        );
    }

    const cfg =
        ctx.getConfig?.() || {};

    const prefix =
        cfg.prefixo || '#';

    const trimmed =
        rawText.trim();

    const text =
        trimmed.startsWith(prefix)
            ? trimmed
            : `${prefix}${trimmed}`;

    const ownerNumber =
        String(cfg.numerodono || '')
            .replace(/\D/g, '');

    const ownerJid =
        ownerNumber
            ? `${ownerNumber}@s.whatsapp.net`
            : jid;

    const info = {
        key: {
            remoteJid: jid,
            participant: ownerJid,
            fromMe: false,
            id: `PAINEL-${Date.now()}`
        },

        pushName:
            cfg.nomedono || 'Painel',

        message: {
            conversation: text
        },

        messageTimestamp:
            Math.floor(Date.now() / 1000)
    };

    const replies = [];

    const originalSend =
        sock.sendMessage.bind(sock);

    sock.sendMessage =
        async (toJid, content, opts) => {

            if (
                String(toJid) ===
                String(jid)
            ) {
                replies.push(content);
            }

            return originalSend(
                toJid,
                content,
                opts
            );
        };

    const messagesCache =
        ctx.getMessagesCache?.() ||
        new Map();

    const rentalManager =
        ctx.getRentalManager?.();

    try {
        await indexModule(
            sock,
            info,
            null,
            messagesCache,
            rentalManager
        );

        terminalEvent(
            'command',
            {
                command: text,
                group: jid,
                user: 'Painel',
                success: true
            }
        );

        return {
            ok: true,
            jid,
            sent: text,
            replies
        };

    } catch (err) {

        terminalEvent(
            'error',
            {
                message:
                    `[Painel] ${err?.message || err}`
            }
        );

        terminalEvent(
            'command',
            {
                command: text,
                group: jid,
                user: 'Painel',
                success: false
            }
        );

        throw err;

    } finally {
        sock.sendMessage =
            originalSend;
    }
}

/* ================================================================
 * WEBSOCKET
 * ================================================================ */

function authorized(req) {
    if (!TOKEN) {
        return true;
    }

    try {
        const url =
            new URL(
                req.url,
                `http://${req.headers.host}`
            );

        return (
            url.searchParams.get('token') ===
            TOKEN
        );

    } catch {
        return false;
    }
}

function attachWs(server) {
    const wss =
        new WebSocketServer({
            server,
            path: '/ws'
        });

    wss.on(
        'connection',
        (ws, req) => {

            if (!authorized(req)) {
                send(ws, {
                    type: 'auth-error',
                    message: 'Token inválido.'
                });

                ws.close();
                return;
            }

            clients.add(ws);

            send(ws, {
                type: 'state',
                data: getState()
            });

            send(ws, {
                type: 'sockStatus',
                connected:
                    Boolean(getActiveSocket())
            });

            buildChatList()
                .then(list =>
                    send(ws, {
                        type: 'chats',
                        data: list
                    })
                )
                .catch(() => {});

            ws.on(
                'close',
                () => clients.delete(ws)
            );

            ws.on(
                'message',
                async raw => {

                    let msg;

                    try {
                        msg =
                            JSON.parse(
                                raw.toString()
                            );
                    } catch {
                        return;
                    }

                    if (
                        msg.type ===
                        'refreshChats'
                    ) {
                        buildChatList()
                            .then(list =>
                                send(ws, {
                                    type: 'chats',
                                    data: list
                                })
                            )
                            .catch(() => {});

                        return;
                    }

                    if (
                        msg.type ===
                        'run'
                    ) {
                        try {

                            const result =
                                await runTerminalCommand(
                                    msg.jid,
                                    msg.text
                                );

                            send(ws, {
                                type:
                                    'run-result',
                                ok: true,
                                ...result
                            });

                        } catch (err) {

                            send(ws, {
                                type:
                                    'run-result',
                                ok: false,
                                error:
                                    err?.message ||
                                    String(err)
                            });
                        }

                        return;
                    }
                }
            );
        }
    );

    for (
        const type of [
            'log',
            'message',
            'command',
            'error',
            'connected',
            'connecting',
            'reconnecting'
        ]
    ) {

        onTerminalEvent(
            type,
            data =>
                broadcast({
                    type:
                        `event:${type}`,
                    data
                })
        );
    }

    setInterval(
        () =>
            broadcast({
                type: 'state',
                data: getState()
            }),
        1000
    );
}

/* ================================================================
 * HTML
 * ================================================================ */

function renderHtml() {
    return HTML_PAGE;
}

/* ================================================================
 * BOOT
 * ================================================================ */

export function attachSock(sock) {
    broadcast({
        type: 'sockStatus',
        connected: Boolean(sock)
    });
}

export function startPanel(
    initCtx = {}
) {
    if (started) return;

    started = true;
    ctx = initCtx;

    const server =
        http.createServer(
            async (req, res) => {

                const url =
                    new URL(
                        req.url,
                        `http://${req.headers.host}`
                    );

                if (
                    url.pathname === '/' ||
                    url.pathname === '/painel'
                ) {

                    res.writeHead(
                        200,
                        {
                            'Content-Type':
                                'text/html; charset=utf-8'
                        }
                    );

                    res.end(
                        renderHtml()
                    );

                    return;
                }

                res.writeHead(
                    404,
                    {
                        'Content-Type':
                            'text/plain; charset=utf-8'
                    }
                );

                res.end(
                    'Não encontrado.'
                );
            }
        );

    attachWs(server);

    server.listen(
        PORT,
        HOST,
        () => {

            console.log(
                `🖥️  Painel Kyara disponível em http://${HOST}:${PORT}${TOKEN ? `?token=${TOKEN}` : ''}`
            );
        }
    );
}

/* ================================================================
 * HTML COMPLETO
 * ================================================================ */

const HTML_PAGE = `<!doctype html>
<html lang="pt-BR">

<head>
<meta charset="utf-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1"
>

<title>Painel Kyara</title>

<style>

:root{
    --bg:#0b141a;
    --panel:#111b21;
    --panel2:#202c33;
    --bubble-out:#005c4b;
    --bubble-in:#202c33;
    --accent:#00a884;
    --text:#e9edef;
    --muted:#8696a0;
    --danger:#f15c6d;
    --border:#2a3942;
}

*{
    box-sizing:border-box;
}

body{
    margin:0;
    background:var(--bg);
    color:var(--text);
    font-family:
        Segoe UI,
        Helvetica,
        Arial,
        sans-serif;
    height:100vh;
    overflow:hidden;
}

#app{
    display:flex;
    height:100vh;
}

#sidebar{
    width:300px;
    min-width:220px;
    background:var(--panel);
    border-right:1px solid var(--border);
    display:flex;
    flex-direction:column;
}

#sidebar header{
    padding:14px 16px;
    background:var(--panel2);
    font-weight:600;
    display:flex;
    align-items:center;
    gap:8px;
}

#sidebar header .dot{
    width:9px;
    height:9px;
    border-radius:50%;
    background:var(--danger);
}

#sidebar header .dot.on{
    background:var(--accent);
}

#search{
    padding:8px;
    border-bottom:
        1px solid var(--border);
}

#search input{
    width:100%;
    padding:8px 10px;
    border-radius:8px;
    border:
        1px solid var(--border);
    background:var(--panel2);
    color:var(--text);
}

#chatlist{
    flex:1;
    overflow-y:auto;
}

.chat-item{
    padding:12px 16px;
    border-bottom:
        1px solid var(--border);
    cursor:pointer;
    display:flex;
    flex-direction:column;
    gap:2px;
}

.chat-item:hover{
    background:var(--panel2);
}

.chat-item.active{
    background:var(--panel2);
    border-left:
        3px solid var(--accent);
}

.chat-item .name{
    font-weight:600;
    font-size:14px;
}

.chat-item .jid{
    font-size:11px;
    color:var(--muted);
}

#manual{
    padding:10px;
    border-top:
        1px solid var(--border);
    display:flex;
    gap:6px;
}

#manual input{
    flex:1;
    padding:8px;
    border-radius:8px;
    border:
        1px solid var(--border);
    background:var(--panel2);
    color:var(--text);
    font-size:12px;
}

#manual button{
    padding:8px 10px;
    border:none;
    border-radius:8px;
    background:var(--accent);
    color:#04211b;
    cursor:pointer;
    font-weight:600;
}

#main{
    flex:1;
    display:flex;
    flex-direction:column;
    min-width:0;
}

#tabs{
    display:flex;
    background:var(--panel2);
    border-bottom:
        1px solid var(--border);
}

#tabs button{
    flex:1;
    padding:14px;
    background:transparent;
    border:none;
    color:var(--muted);
    cursor:pointer;
    font-size:13px;
    font-weight:600;
    border-bottom:
        3px solid transparent;
}

#tabs button.active{
    color:var(--text);
    border-bottom-color:
        var(--accent);
}

.view{
    flex:1;
    overflow:hidden;
    display:none;
    flex-direction:column;
}

.view.active{
    display:flex;
}

#cmdlog{
    flex:1;
    overflow-y:auto;
    background:#000;
    padding:10px;
    font-family:
        Consolas,
        Menlo,
        monospace;
    font-size:12.5px;
    white-space:pre-wrap;
}

#cmdlog .l-ERROR{
    color:#ff6b6b;
}

#cmdlog .l-WA{
    color:#4fd1c5;
}

#cmdlog .l-COMMAND{
    color:#f6c945;
}

#cmdlog .l-SYSTEM{
    color:#9aa5b1;
}

#cmdlog .l-time{
    color:#555;
}

#msglog{
    flex:1;
    overflow-y:auto;
    padding:10px;
}

.evt{
    padding:8px 10px;
    margin-bottom:6px;
    border-radius:8px;
    background:var(--panel2);
    font-size:13px;
}

.evt .meta{
    color:var(--muted);
    font-size:11px;
    margin-bottom:2px;
}

.evt.err{
    border-left:
        3px solid var(--danger);
}

.evt.cmd{
    border-left:
        3px solid var(--accent);
}

#botview{
    padding:18px;
    overflow-y:auto;
}

.grid{
    display:grid;
    grid-template-columns:
        repeat(
            auto-fill,
            minmax(160px,1fr)
        );
    gap:12px;
}

.card{
    background:var(--panel2);
    border-radius:10px;
    padding:14px;
}

.card .v{
    font-size:22px;
    font-weight:700;
}

.card .k{
    color:var(--muted);
    font-size:12px;
    margin-top:4px;
}

#wa-empty{
    flex:1;
    display:flex;
    align-items:center;
    justify-content:center;
    color:var(--muted);
}

#wa-chat{
    flex:1;
    display:none;
    flex-direction:column;
    min-height:0;
}

#wa-chat.active{
    display:flex;
}

#wa-header{
    padding:12px 16px;
    background:var(--panel2);
    border-bottom:
        1px solid var(--border);
    font-weight:600;
}

#wa-body{
    flex:1;
    overflow-y:auto;
    padding:16px;
    background:#0a1014;
    display:flex;
    flex-direction:column;
    gap:8px;
}

.bubble{
    max-width:75%;
    padding:8px 12px;
    border-radius:10px;
    font-size:14px;
    line-height:1.4;
}

.bubble.out{
    align-self:flex-end;
    background:var(--bubble-out);
}

.bubble.in{
    align-self:flex-start;
    background:var(--bubble-in);
}

.bubble.error{
    align-self:flex-start;
    background:#3a1c20;
    color:var(--danger);
    border:
        1px solid var(--danger);
}

.bubble small{
    display:block;
    color:var(--muted);
    margin-top:4px;
    font-size:10px;
}

#wa-compose{
    display:flex;
    gap:8px;
    padding:10px;
    background:var(--panel2);
}

#wa-compose input{
    flex:1;
    padding:12px;
    border-radius:20px;
    border:none;
    background:var(--panel);
    color:var(--text);
}

#wa-compose button{
    padding:0 20px;
    border:none;
    border-radius:20px;
    background:var(--accent);
    color:#04211b;
    font-weight:700;
    cursor:pointer;
}

@media(max-width:760px){

    #sidebar{
        width:220px;
        min-width:180px;
    }

    #tabs button{
        font-size:11px;
        padding:11px 4px;
    }

    .bubble{
        max-width:90%;
    }
}

</style>
</head>

<body>

<div id="app">

<div id="sidebar">

<header>
    <span
        class="dot"
        id="connDot"
    ></span>

    <span id="connLabel">
        Conectando…
    </span>
</header>

<div id="search">
    <input
        id="searchInput"
        placeholder="Buscar conversa..."
    >
</div>

<div id="chatlist"></div>

<div id="manual">

<input
    id="manualJid"
    placeholder="Ou digite um número/JID"
>

<button id="manualBtn">
    Usar
</button>

</div>

</div>

<div id="main">

<div id="tabs">

<button
    data-tab="whatsapp"
    class="active"
>
    💬 WhatsApp
</button>

<button data-tab="cmd">
    🖥️ Terminal CMD
</button>

<button data-tab="msg">
    📨 Mensagens
</button>

<button data-tab="bot">
    🤖 Bot
</button>

</div>

<div
    id="view-whatsapp"
    class="view active"
>

<div id="wa-empty">
    Escolha uma conversa na lista ao lado pra testar um comando.
</div>

<div id="wa-chat">

<div id="wa-header"></div>

<div id="wa-body"></div>

<div id="wa-compose">

<input
    id="wa-input"
    placeholder="Digite o comando (com ou sem prefixo)..."
>

<button id="wa-send">
    Executar
</button>

</div>

</div>

</div>

<div
    id="view-cmd"
    class="view"
>
    <div id="cmdlog"></div>
</div>

<div
    id="view-msg"
    class="view"
>
    <div id="msglog"></div>
</div>

<div
    id="view-bot"
    class="view"
>
    <div id="botview">
        <div
            class="grid"
            id="botgrid"
        ></div>
    </div>
</div>

</div>

</div>

<script>

const qs =
    new URLSearchParams(
        location.search
    );

const token =
    qs.get('token') || '';

const ws =
    new WebSocket(
        (
            location.protocol ===
            'https:'
                ? 'wss://'
                : 'ws://'
        )
        +
        location.host
        +
        '/ws'
        +
        (
            token
                ? '?token=' +
                  encodeURIComponent(token)
                : ''
        )
    );

let chats = {
    groups: [],
    contacts: []
};

let activeJid = null;

const el =
    id =>
        document.getElementById(id);

/* ================================================================
 * TABS
 * ================================================================ */

document
    .querySelectorAll(
        '#tabs button'
    )
    .forEach(btn => {

        btn.onclick = () => {

            document
                .querySelectorAll(
                    '#tabs button'
                )
                .forEach(b =>
                    b.classList.remove(
                        'active'
                    )
                );

            document
                .querySelectorAll(
                    '.view'
                )
                .forEach(v =>
                    v.classList.remove(
                        'active'
                    )
                );

            btn.classList.add(
                'active'
            );

            el(
                'view-' +
                btn.dataset.tab
            ).classList.add(
                'active'
            );
        };
    });

/* ================================================================
 * CHAT LIST
 * ================================================================ */

function renderChatList(){

    const q =
        el('searchInput')
            .value
            .trim()
            .toLowerCase();

    const all = [
        ...chats.contacts,
        ...chats.groups
    ];

    const filtered =
        all.filter(c =>
            !q ||
            c.name
                .toLowerCase()
                .includes(q)
        );

    el('chatlist').innerHTML =
        filtered.map(c => {

            const safeName =
                String(c.name)
                    .replace(/&/g,'&amp;')
                    .replace(/</g,'&lt;')
                    .replace(/>/g,'&gt;')
                    .replace(/"/g,'&quot;');

            const safeJid =
                String(c.jid)
                    .replace(/&/g,'&amp;')
                    .replace(/</g,'&lt;')
                    .replace(/>/g,'&gt;')
                    .replace(/"/g,'&quot;');

            return \`
                <div
                    class="chat-item \${c.jid === activeJid ? 'active' : ''}"
                    data-jid="\${safeJid}"
                    data-name="\${safeName}"
                >
                    <div class="name">
                        \${c.type === 'contact'
                            ? '👤'
                            : '👥'}
                        \${safeName}
                    </div>

                    <div class="jid">
                        \${safeJid}
                    </div>
                </div>
            \`;
        }).join('');

    document
        .querySelectorAll(
            '.chat-item'
        )
        .forEach(item => {

            item.onclick = () =>
                openChat(
                    item.dataset.jid,
                    item.dataset.name
                );
        });
}

el(
    'searchInput'
).oninput =
    renderChatList;

/* ================================================================
 * OPEN CHAT
 * ================================================================ */

function openChat(
    jid,
    name
){

    activeJid = jid;

    el(
        'wa-empty'
    ).style.display =
        'none';

    el(
        'wa-chat'
    ).classList.add(
        'active'
    );

    el(
        'wa-header'
    ).textContent =
        name || jid;

    el(
        'wa-body'
    ).innerHTML =
        '';

    renderChatList();
}

/* ================================================================
 * MANUAL JID
 * ================================================================ */

el(
    'manualBtn'
).onclick = () => {

    let v =
        el('manualJid')
            .value
            .trim();

    if(!v) return;

    if(!v.includes('@')){

        v =
            v.replace(
                /\\D/g,
                ''
            )
            +
            '@s.whatsapp.net';
    }

    openChat(
        v,
        v
    );
};

/* ================================================================
 * BUBBLES
 * ================================================================ */

function escapeHtml(text){

    return String(
        text ?? ''
    )
    .replace(
        /&/g,
        '&amp;'
    )
    .replace(
        /</g,
        '&lt;'
    )
    .replace(
        />/g,
        '&gt;'
    )
    .replace(
        /"/g,
        '&quot;'
    );
}

function addBubble(
    kind,
    text,
    meta
){

    const b =
        document.createElement(
            'div'
        );

    b.className =
        'bubble ' +
        kind;

    b.innerHTML =
        escapeHtml(text) +
        (
            meta
                ? '<small>' +
                  escapeHtml(meta) +
                  '</small>'
                : ''
        );

    el(
        'wa-body'
    ).appendChild(b);

    el(
        'wa-body'
    ).scrollTop =
        el(
            'wa-body'
        ).scrollHeight;
}

/* ================================================================
 * SEND COMMAND
 * ================================================================ */

function sendCommand(){

    const text =
        el('wa-input')
            .value
            .trim();

    if(
        !text ||
        !activeJid
    ){
        return;
    }

    addBubble(
        'out',
        text,
        'você (painel)'
    );

    el(
        'wa-input'
    ).value =
        '';

    if(
        ws.readyState !==
        WebSocket.OPEN
    ){

        addBubble(
            'error',
            '⚠️ WebSocket desconectado.',
            'painel'
        );

        return;
    }

    ws.send(
        JSON.stringify({
            type:'run',
            jid:activeJid,
            text
        })
    );
}

el(
    'wa-send'
).onclick =
    sendCommand;

el(
    'wa-input'
).addEventListener(
    'keydown',
    e => {

        if(
            e.key ===
            'Enter'
        ){
            sendCommand();
        }
    }
);

/* ================================================================
 * REPLIES
 * ================================================================ */

function extractReplyText(
    content
){

    if(!content)
        return null;

    if(
        typeof content ===
        'string'
    ){
        return content;
    }

    if(
        content.text
    ){
        return content.text;
    }

    if(
        content.caption
    ){
        return content.caption;
    }

    if(
        content.extendedTextMessage?.text
    ){
        return content
            .extendedTextMessage
            .text;
    }

    return '[mídia/objeto enviado]';
}

/* ================================================================
 * STATE
 * ================================================================ */

function renderState(
    state
){

    state =
        state || {};

    const logEl =
        el('cmdlog');

    logEl.innerHTML =
        (state.logs || [])
            .slice()
            .reverse()
            .map(l => {

                const t =
                    l.time ||
                    '--:--:--';

                const type =
                    l.type ||
                    'SYSTEM';

                return \`
                    <span class="l-time">
                        [\${escapeHtml(t)}]
                    </span>

                    <span class="l-\${escapeHtml(type)}">
                        [\${escapeHtml(type)}]
                    </span>

                    \${escapeHtml(
                        l.message || ''
                    )}
                    \\n
                \`;
            })
            .join('');

    el(
        'connDot'
    ).className =
        'dot' +
        (
            state.connected
                ? ' on'
                : ''
        );

    el(
        'connLabel'
    ).textContent =
        state.connected
            ? 'Conectado'
            : (
                state.status ||
                'Offline'
            );

    const cards = [

        [
            'Status',
            state.connected
                ? 'Online'
                : (
                    state.status ||
                    'Offline'
                )
        ],

        [
            'Uptime',
            state.uptime || '-'
        ],

        [
            'Mensagens',
            state.messages ?? 0
        ],

        [
            'Comandos OK',
            state.commandOk ?? 0
        ],

        [
            'Comandos c/ erro',
            state.commandErrors ?? 0
        ],

        [
            'Erros',
            state.errors ?? 0
        ],

        [
            'Grupos',
            state.groups ?? 0
        ],

        [
            'Fila',
            state.queue ?? 0
        ],

        [
            'RAM',
            (state.ram || 0) +
            ' MB'
        ],

        [
            'CPU',
            (state.cpu || 0) +
            '%'
        ],

        [
            'Último erro',
            state.lastError || '-'
        ]
    ];

    el(
        'botgrid'
    ).innerHTML =
        cards.map(
            ([k,v]) => \`
                <div class="card">

                    <div class="v">
                        \${escapeHtml(v)}
                    </div>

                    <div class="k">
                        \${escapeHtml(k)}
                    </div>

                </div>
            \`
        ).join('');
}

/* ================================================================
 * EVENTS
 * ================================================================ */

function addMsgEvent(
    kind,
    html
){

    const d =
        document.createElement(
            'div'
        );

    d.className =
        'evt ' +
        kind;

    d.innerHTML =
        html;

    el(
        'msglog'
    ).appendChild(d);

    el(
        'msglog'
    ).scrollTop =
        el(
            'msglog'
        ).scrollHeight;
}

ws.onmessage =
    ev => {

        let msg;

        try {
            msg =
                JSON.parse(
                    ev.data
                );
        } catch {
            return;
        }

        if(
            msg.type ===
            'chats'
        ){

            chats =
                msg.data ||
                {
                    groups:[],
                    contacts:[]
                };

            renderChatList();
        }

        if(
            msg.type ===
            'state'
        ){

            renderState(
                msg.data
            );
        }

        if(
            msg.type ===
            'sockStatus'
        ){

            el(
                'connDot'
            ).className =
                'dot' +
                (
                    msg.connected
                        ? ' on'
                        : ''
                );

            el(
                'connLabel'
            ).textContent =
                msg.connected
                    ? 'Conectado'
                    : 'Offline';
        }

        if(
            msg.type ===
            'event:message'
        ){

            addMsgEvent(
                '',
                \`
                    <div class="meta">
                        \${escapeHtml(
                            msg.data?.group || ''
                        )}
                        ·
                        \${escapeHtml(
                            msg.data?.user || ''
                        )}
                    </div>

                    \${escapeHtml(
                        msg.data?.content || ''
                    )}
                \`
            );
        }

        if(
            msg.type ===
            'event:command'
        ){

            addMsgEvent(
                'cmd',
                \`
                    <div class="meta">
                        COMANDO ·
                        \${escapeHtml(
                            msg.data?.group || ''
                        )}
                        ·
                        \${escapeHtml(
                            msg.data?.user || ''
                        )}
                    </div>

                    \${escapeHtml(
                        msg.data?.command || ''
                    )}
                \`
            );
        }

        if(
            msg.type ===
            'event:error'
        ){

            addMsgEvent(
                'err',
                \`
                    <div class="meta">
                        ERRO
                    </div>

                    \${escapeHtml(
                        msg.data?.message || ''
                    )}
                \`
            );
        }

        if(
            msg.type ===
            'run-result'
        ){

            if(msg.ok){

                if(
                    msg.replies &&
                    msg.replies.length
                ){

                    msg.replies
                        .forEach(
                            r =>
                                addBubble(
                                    'in',
                                    extractReplyText(r) ||
                                        '[sem texto]',
                                    'bot'
                                )
                        );

                } else {

                    addBubble(
                        'in',
                        '✅ Comando processado (sem resposta de texto capturada — confira o WhatsApp real).',
                        'painel'
                    );
                }

            } else {

                addBubble(
                    'error',
                    '⚠️ ' +
                    (
                        msg.error ||
                        'Erro desconhecido.'
                    ),
                    'erro'
                );
            }
        }

        if(
            msg.type ===
            'auth-error'
        ){

            document.body.innerHTML =
                \`
                    <div style="
                        padding:40px;
                        color:#fff;
                        font-family:sans-serif
                    ">
                        Token inválido.
                        Acesse com
                        ?token=SEU_TOKEN
                    </div>
                \`;
        }
    };

/* ================================================================
 * WEBSOCKET
 * ================================================================ */

ws.onopen =
    () => {

        el(
            'connLabel'
        ).textContent =
            'Conectado ao painel';

        ws.send(
            JSON.stringify({
                type:
                    'refreshChats'
            })
        );
    };

ws.onclose =
    () => {

        el(
            'connDot'
        ).className =
            'dot';

        el(
            'connLabel'
        ).textContent =
            'Painel desconectado';
    };

ws.onerror =
    () => {

        el(
            'connLabel'
        ).textContent =
            'Erro no painel';
    };

</script>

</body>
</html>`;

