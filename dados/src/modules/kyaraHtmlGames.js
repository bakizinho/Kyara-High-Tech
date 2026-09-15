/**
 * ============================================================
 * KYARA HTML GAMES
 * ============================================================
 * Jogos HTML enviados pelo WhatsApp:
 *
 * /memoria
 * /dino
 *
 * Compatível com o sistema atual da Kyara.
 * ============================================================
 */

import {
    generateWAMessageFromContent
} from 'baileys';

/* ============================================================
 * UTILIDADES
 * ============================================================ */

function textoSeguro(valor) {
    return String(valor ?? '');
}

function criarPayloadHTML(html, titulo = 'Kyara') {
    return {
        botForwardedMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadataVersion: 2
                },

                richResponseMessage: {
                    body: {
                        text: titulo
                    },

                    message: {
                        interactiveMessage: {
                            body: {
                                text: ''
                            },

                            nativeFlowMessage: {
                                messageParamsJson: JSON.stringify({
                                    header: titulo,
                                    content: html
                                })
                            }
                        }
                    }
                }
            }
        }
    };
}

/* ============================================================
 * ENVIO DO HTML
 * ============================================================ */

async function enviarHTML({
    systemZR,
    m,
    html,
    titulo
}) {
    if (!systemZR?.relayMessage) {
        throw new Error(
            'O sistema de conexão da Kyara não possui relayMessage.'
        );
    }

    if (!m?.chat) {
        throw new Error(
            'Chat inválido para envio do jogo.'
        );
    }

    const payload = criarPayloadHTML(html, titulo);

    const msg = await generateWAMessageFromContent(
        m.chat,
        payload,
        {
            quoted: m
        }
    );

    await systemZR.relayMessage(
        m.chat,
        msg.message,
        {
            messageId: msg.key.id
        }
    );

    return true;
}

/* ============================================================
 * JOGO DA MEMÓRIA
 * ============================================================ */

function gerarMemoriaHTML() {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width,
      initial-scale=1.0,
      maximum-scale=1.0,
      user-scalable=no">

<title>Memory Match - Kyara</title>

<style>

* {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
}

html,
body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100%;
    font-family: Arial, sans-serif;
    background: #0b0b12;
    color: #fff;
}

body {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 18px;
}

.game {
    width: min(430px, 100%);
    background: #151522;
    border-radius: 24px;
    padding: 20px;
    box-shadow:
        0 15px 50px rgba(0,0,0,.45);
}

.header {
    text-align: center;
    margin-bottom: 16px;
}

.header h1 {
    margin: 0;
    font-size: 28px;
}

.header p {
    margin: 7px 0 0;
    color: #aaaabd;
    font-size: 14px;
}

.stats {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 16px;
}

.stat {
    flex: 1;
    background: #202033;
    border-radius: 14px;
    padding: 11px;
    text-align: center;
}

.stat small {
    display: block;
    color: #9292a8;
    font-size: 11px;
    margin-bottom: 3px;
}

.stat strong {
    font-size: 18px;
}

.grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 9px;
}

.card {
    aspect-ratio: 1;
    perspective: 800px;
    cursor: pointer;
}

.card-inner {
    width: 100%;
    height: 100%;
    position: relative;
    transform-style: preserve-3d;
    transition: transform .35s;
}

.card.flipped .card-inner,
.card.matched .card-inner {
    transform: rotateY(180deg);
}

.face {
    position: absolute;
    inset: 0;
    border-radius: 14px;
    backface-visibility: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}

.back {
    background: #292943;
    border: 2px solid #38385b;
    font-size: 24px;
}

.front {
    background: #35355a;
    transform: rotateY(180deg);
    font-size: 32px;
}

.card.matched .front {
    box-shadow:
        0 0 0 2px #6dff9c,
        0 0 18px rgba(109,255,156,.25);
}

button {
    width: 100%;
    margin-top: 17px;
    border: 0;
    border-radius: 14px;
    padding: 13px;
    background: #292943;
    color: white;
    font-size: 15px;
    font-weight: bold;
    cursor: pointer;
}

button:active {
    transform: scale(.98);
}

.win {
    display: none;
    text-align: center;
    margin-top: 14px;
    padding: 12px;
    background: #1c3927;
    border-radius: 12px;
    color: #a7ffc0;
    font-weight: bold;
}

</style>
</head>

<body>

<div class="game">

    <div class="header">
        <h1>🧠 Memory Match</h1>
        <p>Encontre todos os pares.</p>
    </div>

    <div class="stats">

        <div class="stat">
            <small>MOVIMENTOS</small>
            <strong id="moves">0</strong>
        </div>

        <div class="stat">
            <small>PARES</small>
            <strong id="pairs">0/8</strong>
        </div>

    </div>

    <div id="grid" class="grid"></div>

    <button onclick="resetGame()">
        🔄 Reiniciar
    </button>

    <div id="win" class="win">
        🎉 Você encontrou todos os pares!
    </div>

</div>

<script>

const emojis = [
    '🍎',
    '🚀',
    '🐱',
    '⚡',
    '🎮',
    '🔥',
    '🌙',
    '💎'
];

let cards = [];
let first = null;
let second = null;
let locked = false;
let moves = 0;
let pairs = 0;

const grid = document.getElementById('grid');
const movesEl = document.getElementById('moves');
const pairsEl = document.getElementById('pairs');
const winEl = document.getElementById('win');

function shuffle(array) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {
        const j =
            Math.floor(Math.random() * (i + 1));

        [
            array[i],
            array[j]
        ] = [
            array[j],
            array[i]
        ];
    }

    return array;
}

function resetGame() {

    cards = shuffle(
        [...emojis, ...emojis]
    );

    first = null;
    second = null;
    locked = false;
    moves = 0;
    pairs = 0;

    movesEl.textContent = '0';
    pairsEl.textContent = '0/8';
    winEl.style.display = 'none';

    grid.innerHTML = '';

    cards.forEach((emoji, index) => {

        const card =
            document.createElement('div');

        card.className = 'card';

        card.dataset.value = emoji;

        card.innerHTML = \`
            <div class="card-inner">

                <div class="face back">
                    ?
                </div>

                <div class="face front">
                    \${emoji}
                </div>

            </div>
        \`;

        card.onclick = () =>
            flipCard(card);

        grid.appendChild(card);
    });
}

function flipCard(card) {

    if (locked) return;

    if (
        card === first ||
        card.classList.contains('matched')
    ) {
        return;
    }

    card.classList.add('flipped');

    if (!first) {

        first = card;
        return;
    }

    second = card;
    moves++;

    movesEl.textContent = moves;

    if (
        first.dataset.value ===
        second.dataset.value
    ) {

        first.classList.add('matched');
        second.classList.add('matched');

        pairs++;

        pairsEl.textContent =
            pairs + '/8';

        first = null;
        second = null;

        if (pairs === 8) {
            winEl.style.display = 'block';
        }

        return;
    }

    locked = true;

    setTimeout(() => {

        first.classList.remove('flipped');
        second.classList.remove('flipped');

        first = null;
        second = null;

        locked = false;

    }, 700);
}

resetGame();

</script>

</body>
</html>`;
}

/* ============================================================
 * JOGO DO DINO
 * ============================================================ */

function gerarDinoHTML() {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width,
      initial-scale=1.0,
      maximum-scale=1.0,
      user-scalable=no">

<title>Kyara Dino</title>

<style>

* {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
}

html,
body {
    margin: 0;
    width: 100%;
    min-height: 100%;
    background: #f7f7f7;
    font-family: Arial, sans-serif;
    overflow: hidden;
}

body {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 12px;
}

.game {
    width: min(650px, 100%);
    text-align: center;
}

.top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding: 0 4px;
}

.title {
    font-size: 18px;
    font-weight: bold;
}

.score {
    font-family: monospace;
    font-size: 18px;
}

canvas {
    display: block;
    width: 100%;
    height: auto;
    background: white;
    border: 2px solid #222;
    border-radius: 10px;
    touch-action: none;
}

.controls {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 12px;
}

.controls button {
    border: 2px solid #222;
    background: white;
    color: #111;
    border-radius: 12px;
    min-width: 120px;
    padding: 12px 18px;
    font-weight: bold;
    font-size: 14px;
}

.controls button:active {
    transform: scale(.96);
}

.help {
    margin-top: 9px;
    font-size: 12px;
    color: #666;
}

.night canvas {
    filter: invert(1);
}

</style>

</head>

<body>

<div class="game">

    <div class="top">

        <div class="title">
            🦖 KYARA DINO
        </div>

        <div class="score">
            <span id="score">00000</span>
            &nbsp;
            HI <span id="high">00000</span>
        </div>

    </div>

    <canvas
        id="game"
        width="600"
        height="150">
    </canvas>

    <div class="controls">

        <button id="jump">
            ⬆️ PULAR
        </button>

        <button id="duck">
            ⬇️ ABAIXAR
        </button>

    </div>

    <div class="help">
        Toque em PULAR ou na tela.
        No teclado: Espaço / ↑ / ↓
    </div>

</div>

<script>

const canvas =
    document.getElementById('game');

const ctx =
    canvas.getContext('2d');

const scoreEl =
    document.getElementById('score');

const highEl =
    document.getElementById('high');

const jumpBtn =
    document.getElementById('jump');

const duckBtn =
    document.getElementById('duck');

let running = true;
let gameOver = false;

let score = 0;

let highScore =
    Number(
        localStorage.getItem(
            'kyara_dino_high'
        ) || 0
    );

highEl.textContent =
    String(highScore).padStart(5, '0');

let speed = 5;

let gravity = 0.65;

let frame = 0;

let spawnTimer = 0;

let night = false;

const dino = {

    x: 55,

    y: 110,

    width: 34,

    height: 38,

    vy: 0,

    jumping: false,

    ducking: false,

    draw() {

        ctx.save();

        ctx.fillStyle = '#222';

        const h =
            this.ducking
                ? 25
                : this.height;

        const y =
            this.ducking
                ? 123
                : this.y;

        /*
         * Corpo
         */
        ctx.fillRect(
            this.x,
            y,
            25,
            h
        );

        /*
         * Cabeça
         */
        ctx.fillRect(
            this.x + 18,
            y - 14,
            18,
            18
        );

        /*
         * Olho
         */
        ctx.fillStyle = '#fff';

        ctx.fillRect(
            this.x + 29,
            y - 10,
            3,
            3
        );

        /*
         * Cauda
         */
        ctx.fillStyle = '#222';

        ctx.fillRect(
            this.x - 10,
            y + 7,
            14,
            6
        );

        /*
         * Pernas
         */
        if (!this.ducking) {

            ctx.fillRect(
                this.x + 4,
                y + h - 2,
                6,
                10
            );

            ctx.fillRect(
                this.x + 19,
                y + h - 2,
                6,
                10
            );
        }

        ctx.restore();
    },

    jump() {

        if (
            !this.jumping &&
            !gameOver
        ) {

            this.vy = -11;

            this.jumping = true;
        }
    }

};

/* ============================================================
 * OBSTÁCULOS
 * ============================================================ */

let obstacles = [];

function criarObstaculo() {

    const tipo =
        Math.random() < 0.75
            ? (
                Math.random() < 0.5
                    ? 'small'
                    : 'large'
            )
            : 'bird';

    let obstacle = {

        x: canvas.width + 20,

        type: tipo,

        width: 20,

        height: 30,

        y: 120

    };

    if (tipo === 'small') {

        obstacle.width = 18;
        obstacle.height = 28;
        obstacle.y = 122;

    }

    if (tipo === 'large') {

        obstacle.width = 28;
        obstacle.height = 40;
        obstacle.y = 110;

    }

    if (tipo === 'bird') {

        obstacle.width = 34;
        obstacle.height = 18;

        obstacle.y =
            Math.random() < .5
                ? 88
                : 105;
    }

    obstacles.push(obstacle);
}

function desenharObstaculo(o) {

    ctx.save();

    ctx.fillStyle = '#222';

    if (o.type === 'bird') {

        /*
         * Corpo
         */
        ctx.fillRect(
            o.x,
            o.y,
            24,
            10
        );

        /*
         * Cabeça
         */
        ctx.fillRect(
            o.x + 20,
            o.y - 5,
            10,
            10
        );

        /*
         * Asa
         */
        ctx.fillRect(
            o.x + 7,
            o.y + 9,
            7,
            12
        );

        ctx.fillRect(
            o.x - 2,
            o.y + 13,
            9,
            5
        );

    } else {

        /*
         * Tronco
         */
        ctx.fillRect(
            o.x,
            o.y,
            o.width,
            o.height
        );

        /*
         * Braços do cacto
         */
        if (o.height >= 35) {

            ctx.fillRect(
                o.x - 7,
                o.y + 13,
                8,
                7
            );

            ctx.fillRect(
                o.x + o.width - 1,
                o.y + 20,
                8,
                7
            );
        }
    }

    ctx.restore();
}

/* ============================================================
 * COLISÃO
 * ============================================================ */

function colisao(a, b) {

    const ax =
        a.x + 5;

    const ay =
        a.ducking
            ? 123
            : a.y - 10;

    const aw =
        a.width - 8;

    const ah =
        a.ducking
            ? 25
            : a.height;

    const bx =
        b.x + 3;

    const by =
        b.y - 3;

    const bw =
        b.width - 6;

    const bh =
        b.height + 3;

    return (
        ax < bx + bw &&
        ax + aw > bx &&
        ay < by + bh &&
        ay + ah > by
    );
}

/* ============================================================
 * RESET
 * ============================================================ */

function resetGame() {

    score = 0;

    speed = 5;

    frame = 0;

    spawnTimer = 0;

    obstacles = [];

    gameOver = false;

    running = true;

    dino.y = 110;

    dino.vy = 0;

    dino.jumping = false;

    dino.ducking = false;

    scoreEl.textContent =
        '00000';
}

/* ============================================================
 * GAME OVER
 * ============================================================ */

function finalizar() {

    if (gameOver) return;

    gameOver = true;

    running = false;

    const finalScore =
        Math.floor(score);

    if (
        finalScore >
        highScore
    ) {

        highScore =
            finalScore;

        localStorage.setItem(
            'kyara_dino_high',
            String(highScore)
        );

        highEl.textContent =
            String(highScore)
                .padStart(5, '0');
    }

    setTimeout(() => {

        ctx.save();

        ctx.fillStyle =
            'rgba(255,255,255,.82)';

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        ctx.fillStyle =
            '#222';

        ctx.textAlign =
            'center';

        ctx.font =
            'bold 22px Arial';

        ctx.fillText(
            'GAME OVER',
            canvas.width / 2,
            65
        );

        ctx.font =
            '14px Arial';

        ctx.fillText(
            'Toque na tela ou pressione Espaço para reiniciar',
            canvas.width / 2,
            92
        );

        ctx.restore();

    }, 20);
}

/* ============================================================
 * UPDATE
 * ============================================================ */

function update() {

    if (!running) return;

    frame++;

    /*
     * Pontuação
     */
    score += 0.12;

    scoreEl.textContent =
        String(
            Math.floor(score)
        ).padStart(5, '0');

    /*
     * Aumenta a velocidade
     * progressivamente.
     */
    speed =
        5 +
        Math.min(
            6,
            score / 180
        );

    /*
     * Gravidade
     */
    dino.vy += gravity;

    dino.y += dino.vy;

    if (dino.y >= 110) {

        dino.y = 110;

        dino.vy = 0;

        dino.jumping = false;
    }

    /*
     * Spawn
     */
    spawnTimer--;

    if (spawnTimer <= 0) {

        criarObstaculo();

        const min =
            Math.max(
                55,
                105 - speed * 4
            );

        const max =
            Math.max(
                90,
                155 - speed * 4
            );

        spawnTimer =
            Math.floor(
                min +
                Math.random() *
                (max - min)
            );
    }

    /*
     * Obstáculos
     */
    for (
        let i = obstacles.length - 1;
        i >= 0;
        i--
    ) {

        const o =
            obstacles[i];

        o.x -= speed;

        if (colisao(dino, o)) {

            finalizar();

            return;
        }

        if (
            o.x +
            o.width <
            -20
        ) {

            obstacles.splice(i, 1);
        }
    }

    /*
     * Dia / noite
     */
    if (
        Math.floor(score) > 0 &&
        Math.floor(score) % 100 === 0
    ) {

        const novoEstado =
            Math.floor(score / 100) % 2 === 1;

        if (
            novoEstado !== night
        ) {

            night = novoEstado;

            document.body.classList.toggle(
                'night',
                night
            );
        }
    }
}

/* ============================================================
 * DRAW
 * ============================================================ */

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    /*
     * chão
     */
    ctx.fillStyle = '#222';

    ctx.fillRect(
        0,
        137,
        canvas.width,
        2
    );

    /*
     * pequenos detalhes do chão
     */
    for (
        let x = -((frame * speed) % 35);
        x < canvas.width;
        x += 35
    ) {

        ctx.fillRect(
            x,
            140,
            17,
            1
        );
    }

    /*
     * obstáculos
     */
    obstacles.forEach(
        desenharObstaculo
    );

    /*
     * dino
     */
    dino.draw();
}

/* ============================================================
 * LOOP
 * ============================================================ */

function loop() {

    update();

    draw();

    requestAnimationFrame(loop);
}

function acaoPulo(event) {

    if (event) {
        event.preventDefault();
    }

    if (gameOver) {

        resetGame();

        return;
    }

    dino.jump();
}

function iniciarDuck(event) {

    if (event) {
        event.preventDefault();
    }

    if (!gameOver) {
        dino.ducking = true;
    }
}

function pararDuck(event) {

    if (event) {
        event.preventDefault();
    }

    dino.ducking = false;
}

/* ============================================================
 * CONTROLES
 * ============================================================ */

jumpBtn.addEventListener(
    'pointerdown',
    acaoPulo
);

duckBtn.addEventListener(
    'pointerdown',
    iniciarDuck
);

duckBtn.addEventListener(
    'pointerup',
    pararDuck
);

duckBtn.addEventListener(
    'pointercancel',
    pararDuck
);

canvas.addEventListener(
    'pointerdown',
    acaoPulo
);

document.addEventListener(
    'keydown',
    event => {

        if (
            event.code === 'Space' ||
            event.code === 'ArrowUp'
        ) {

            event.preventDefault();

            acaoPulo(event);
        }

        if (
            event.code === 'ArrowDown'
        ) {

            event.preventDefault();

            iniciarDuck(event);
        }
    }
);

document.addEventListener(
    'keyup',
    event => {

        if (
            event.code === 'ArrowDown'
        ) {

            pararDuck(event);
        }
    }
);

loop();

</script>

</body>
</html>`;
}

/* ============================================================
 * DISPATCHER
 * ============================================================ */

export async function executarJogoHTML({
    command,
    m,
    systemZR
}) {

    const cmd =
        textoSeguro(command)
            .toLowerCase()
            .trim();

    if (cmd === 'memoria') {

        const html =
            gerarMemoriaHTML();

        await enviarHTML({
            systemZR,
            m,
            html,
            titulo: '🧠 Memory Match'
        });

        return true;
    }

    if (cmd === 'dino') {

        const html =
            gerarDinoHTML();

        await enviarHTML({
            systemZR,
            m,
            html,
            titulo: '🦖 Kyara Dino'
        });

        return true;
    }

    return false;
}

export default executarJogoHTML;
