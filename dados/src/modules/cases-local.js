import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

import {
    search as pinterestSearch,
    dl as pinterestDl
} from '../funcs/downloads/pinterest.js';

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();

const TMP_DIR =
    path.join(ROOT, 'dados', 'tmp');

const DB_DIR =
    path.join(ROOT, 'dados', 'database');

const PLACAR_FILE =
    path.join(DB_DIR, 'placares-local.json');


/* ============================================================
 * UTILIDADES
 * ============================================================ */

function textoSeguro(valor) {
    return String(valor ?? '')
        .replace(/\0/g, '')
        .trim();
}


function prefixoSeguro() {
    const prefixo =
        globalThis.__KYARA_PREFIX__;

    return (
        typeof prefixo === 'string' &&
        prefixo.trim()
            ? prefixo.trim()
            : '/'
    );
}


function ensureDirs() {
    fs.mkdirSync(TMP_DIR, {
        recursive: true
    });

    fs.mkdirSync(DB_DIR, {
        recursive: true
    });
}


function readJson(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(file, 'utf8')
        );

    } catch {
        return fallback;
    }
}


function writeJson(file, data) {
    ensureDirs();

    const temp =
        `${file}.tmp`;

    fs.writeFileSync(
        temp,
        JSON.stringify(
            data,
            null,
            2
        )
    );

    fs.renameSync(
        temp,
        file
    );
}


async function react(
    systemZR,
    chat,
    key,
    text
) {
    try {
        await systemZR.sendMessage(
            chat,
            {
                react: {
                    text,
                    key
                }
            }
        );
    } catch {}
}


function quotedMedia(m) {
    const q =
        m?.quoted ||
        null;

    const msg =
        q?.msg ||
        {};

    return {
        q,
        mime:
            String(
                msg.mimetype || ''
            ).toLowerCase()
    };
}


/* ============================================================
 * NANO
 *
 * EDIÇÃO DE IMAGEM LOCAL.
 *
 * NÃO é geração de imagem por IA.
 * ============================================================ */

function nanoFilter(prompt) {

    const p =
        prompt
            .toLowerCase();

    if (
        /preto.?e.?branco|p.?b|monocrom/.test(p)
    ) {
        return 'format=gray';
    }

    if (
        /negativo|inverter|invert/.test(p)
    ) {
        return 'negate';
    }

    if (
        /sepia|sépia/.test(p)
    ) {
        return (
            'colorchannelmixer=' +
            '.393:.769:.189:0:' +
            '.349:.686:.168:0:' +
            '.272:.534:.131'
        );
    }

    if (
        /desfoque|blur|borrar/.test(p)
    ) {
        return 'gblur=sigma=6';
    }

    if (
        /nitidez|nítido|sharp/.test(p)
    ) {
        return 'unsharp=5:5:1.0:5:5:0';
    }

    if (
        /brilho|clarear|claro/.test(p)
    ) {
        return 'eq=brightness=0.15';
    }

    if (
        /escuro|escurecer/.test(p)
    ) {
        return 'eq=brightness=-0.15';
    }

    if (
        /contraste|contrast/.test(p)
    ) {
        return 'eq=contrast=1.3';
    }

    if (
        /satur|colorido/.test(p)
    ) {
        return 'eq=saturation=1.5';
    }

    if (
        /cinema|cinemático|cinematic/.test(p)
    ) {
        return (
            'eq=' +
            'contrast=1.15:' +
            'saturation=0.85:' +
            'brightness=0.02'
        );
    }

    if (
        /vintage|retrô|retro/.test(p)
    ) {
        return (
            'eq=' +
            'contrast=1.08:' +
            'saturation=0.78:' +
            'brightness=0.03'
        );
    }

    if (
        /desatur|sem cor/.test(p)
    ) {
        return 'eq=saturation=0.25';
    }

    return null;
}


async function nano({
    m,
    text,
    systemZR
}) {

    const prompt =
        textoSeguro(text);

    const {
        q,
        mime
    } =
        quotedMedia(m);

    if (
        !/image\//i.test(mime)
    ) {
        return m.reply(
            `🖼️ Responda a uma imagem com ` +
            `*${prefixoSeguro()}nano*.\n\n` +

            `Efeitos disponíveis:\n` +
            `• preto e branco\n` +
            `• sépia\n` +
            `• negativo\n` +
            `• blur\n` +
            `• nitidez\n` +
            `• brilho\n` +
            `• contraste\n` +
            `• saturação\n` +
            `• cinema\n` +
            `• vintage`
        );
    }


    if (!prompt) {
        return m.reply(
            `Uso:\n` +
            `*${prefixoSeguro()}nano preto e branco*`
        );
    }


    const filter =
        nanoFilter(prompt);

    if (!filter) {
        return m.reply(
            `⚠️ Não encontrei um efeito local ` +
            `para esse prompt.\n\n` +

            `Tente:\n` +
            `preto e branco\n` +
            `sépia\n` +
            `negativo\n` +
            `blur\n` +
            `nitidez\n` +
            `brilho\n` +
            `contraste\n` +
            `saturação\n` +
            `cinema\n` +
            `vintage`
        );
    }


    await react(
        systemZR,
        m.chat,
        m.key,
        '⏳'
    );


    const id =
        crypto.randomBytes(8)
            .toString('hex');


    ensureDirs();


    const input =
        path.join(
            TMP_DIR,
            `${id}.input`
        );


    const output =
        path.join(
            TMP_DIR,
            `${id}.jpg`
        );


    try {

        const buffer =
            await q.download();


        if (
            !buffer ||
            !buffer.length
        ) {
            throw new Error(
                'Não foi possível baixar a imagem.'
            );
        }


        fs.writeFileSync(
            input,
            buffer
        );


        await execFileAsync(
            'ffmpeg',
            [
                '-hide_banner',
                '-loglevel',
                'error',
                '-y',

                '-i',
                input,

                '-vf',
                filter,

                '-frames:v',
                '1',

                '-q:v',
                '2',

                output
            ],
            {
                timeout: 120000,
                maxBuffer:
                    8 * 1024 * 1024
            }
        );


        if (
            !fs.existsSync(output)
        ) {
            throw new Error(
                'O FFmpeg não gerou a imagem.'
            );
        }


        await systemZR.sendMessage(
            m.chat,
            {
                image:
                    fs.readFileSync(output),

                caption:
                    `╭─〔 KYARA • NANO LOCAL 〕─╮\n` +
                    `│ Efeito: ${prompt}\n` +
                    `│ Processamento: local\n` +
                    `╰──────────────────────────╯`
            },
            {
                quoted: m
            }
        );


        await react(
            systemZR,
            m.chat,
            m.key,
            '✅'
        );


    } catch (error) {

        console.error(
            '[NANO LOCAL]',
            error
        );

        await react(
            systemZR,
            m.chat,
            m.key,
            '❌'
        );


        await m.reply(
            `❌ Não consegui editar a imagem.\n\n` +
            `${error?.message || 'Verifique o FFmpeg.'}`
        );


    } finally {

        for (
            const file
            of [input, output]
        ) {

            try {

                if (
                    fs.existsSync(file)
                ) {
                    fs.unlinkSync(file);
                }

            } catch {}

        }

    }
}


/* ============================================================
 * TOMP3
 *
 * FFmpeg LOCAL
 * ============================================================ */

async function tomp3({
    m,
    systemZR
}) {

    const {
        q,
        mime
    } =
        quotedMedia(m);


    if (
        !/video\/|audio\//i.test(mime)
    ) {

        return m.reply(
            `🎵 Responda a um vídeo ou áudio ` +
            `com *${prefixoSeguro()}tomp3*.`
        );

    }


    await react(
        systemZR,
        m.chat,
        m.key,
        '⏳'
    );


    const id =
        crypto.randomBytes(8)
            .toString('hex');


    ensureDirs();


    const input =
        path.join(
            TMP_DIR,
            `${id}.input`
        );


    const output =
        path.join(
            TMP_DIR,
            `${id}.mp3`
        );


    try {

        const buffer =
            await q.download();


        if (
            !buffer ||
            !buffer.length
        ) {
            throw new Error(
                'Falha ao baixar a mídia.'
            );
        }


        fs.writeFileSync(
            input,
            buffer
        );


        await execFileAsync(
            'ffmpeg',
            [
                '-hide_banner',
                '-loglevel',
                'error',
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
                maxBuffer:
                    8 * 1024 * 1024
            }
        );


        if (
            !fs.existsSync(output)
        ) {
            throw new Error(
                'O FFmpeg não criou o MP3.'
            );
        }


        await systemZR.sendMessage(
            m.chat,
            {
                audio:
                    fs.readFileSync(output),

                mimetype:
                    'audio/mpeg',

                ptt: false,

                fileName:
                    'kyara-audio.mp3'
            },
            {
                quoted: m
            }
        );


        await react(
            systemZR,
            m.chat,
            m.key,
            '✅'
        );


    } catch (error) {

        console.error(
            '[TOMP3 LOCAL]',
            error
        );


        await react(
            systemZR,
            m.chat,
            m.key,
            '❌'
        );


        await m.reply(
            `❌ Falha na conversão.\n\n` +
            `${error?.message || 'Verifique o FFmpeg.'}`
        );


    } finally {

        for (
            const file
            of [input, output]
        ) {

            try {

                if (
                    fs.existsSync(file)
                ) {
                    fs.unlinkSync(file);
                }

            } catch {}

        }

    }
}


/* ============================================================
 * ROLETA
 *
 * 100% LOCAL
 * ============================================================ */

async function roleta({ m, text, systemZR }) {
    const entrada = String(text || '').trim();

    const enviarTexto = async (texto) => {
        return await systemZR.sendMessage(
            m.chat,
            { text: texto }
        );
    };

    if (!entrada) {
        return enviarTexto(
            '🎰 *ROLETA KYARA*\\n\\n' +
            'Use:\\n' +
            '*!roleta Azul, Preto, Verde*\\n\\n' +
            'Mínimo: 2 opções\\n' +
            'Máximo: 12 opções'
        );
    }

    let opcoes = entrada
        .split(',')
        .map(x => x.trim())
        .filter(Boolean);

    /*
     * Também aceita:
     *
     * !roleta Azul Preto Verde
     */
    if (opcoes.length === 1) {
        const porEspaco = entrada
            .split(/\s+/)
            .map(x => x.trim())
            .filter(Boolean);

        if (porEspaco.length >= 2) {
            opcoes = porEspaco;
        }
    }

    /*
     * Remove duplicadas.
     */
    opcoes = [...new Set(opcoes)];

    if (opcoes.length < 2) {
        return enviarTexto(
            '⚠️ *ROLETA KYARA*\\n\\n' +
            'Você precisa informar pelo menos *2 opções*.'
        );
    }

    if (opcoes.length > 12) {
        return enviarTexto(
            '⚠️ *ROLETA KYARA*\\n\\n' +
            'A roleta aceita no máximo *12 opções*.'
        );
    }

    /*
     * O módulo já usa ES Modules no topo do arquivo.
     * Portanto, não usamos require() dentro da roleta.
     * Reaproveitamos as dependências já importadas.
     */
    const fsLocal = fs;
    const pathLocal = path;

    /* ========================================================
       CONFIGURAÇÃO
       ======================================================== */

    const W = 600;
    const H = 600;

    const CX = Math.floor(W / 2);
    const CY = Math.floor(H / 2);

    const R = 245;

    const FPS = 24;
    const DURACAO = 5;
    const FRAMES = FPS * DURACAO;

    const segmentos = 360 / opcoes.length;

    /*
     * Resultado sorteado.
     */
    const vencedorIndex =
        Math.floor(Math.random() * opcoes.length);

    const vencedor =
        opcoes[vencedorIndex];

    /*
     * 6 voltas completas + posicionamento do vencedor
     * exatamente sob o ponteiro.
     */
    const voltas = 6;

    const centroSetor =
        vencedorIndex * segmentos +
        segmentos / 2;

    const rotacaoFinal =
        360 * voltas -
        centroSetor;

    /* ========================================================
       TEMP
       ======================================================== */

    const tmpBase = pathLocal.join(
        process.cwd(),
        'dados',
        'tmp'
    );

    fsLocal.mkdirSync(
        tmpBase,
        { recursive: true }
    );

    const nomeTemp =
        'roleta-' +
        Date.now() +
        '-' +
        Math.random()
            .toString(16)
            .slice(2, 10);

    const tempDir =
        pathLocal.join(
            tmpBase,
            nomeTemp
        );

    fsLocal.mkdirSync(
        tempDir,
        { recursive: true }
    );

    const output =
        pathLocal.join(
            tempDir,
            'roleta.mp4'
        );

    /* ========================================================
       CORES
       ======================================================== */

    const cores = [
        [33, 150, 243],
        [239, 83, 80],
        [67, 160, 71],
        [255, 193, 7],
        [156, 39, 176],
        [0, 150, 136],
        [255, 112, 67],
        [84, 110, 122],
        [233, 30, 99],
        [63, 81, 181],
        [0, 188, 212],
        [121, 85, 72]
    ];

    /* ========================================================
       FONTE 5x7
       ======================================================== */

    const fonte = {
        A:['01110','10001','10001','11111','10001','10001','10001'],
        B:['11110','10001','10001','11110','10001','10001','11110'],
        C:['01111','10000','10000','10000','10000','10000','01111'],
        D:['11110','10001','10001','10001','10001','10001','11110'],
        E:['11111','10000','10000','11110','10000','10000','11111'],
        F:['11111','10000','10000','11110','10000','10000','10000'],
        G:['01111','10000','10000','10111','10001','10001','01111'],
        H:['10001','10001','10001','11111','10001','10001','10001'],
        I:['11111','00100','00100','00100','00100','00100','11111'],
        J:['00111','00010','00010','00010','10010','10010','01100'],
        K:['10001','10010','10100','11000','10100','10010','10001'],
        L:['10000','10000','10000','10000','10000','10000','11111'],
        M:['10001','11011','10101','10101','10001','10001','10001'],
        N:['10001','11001','10101','10011','10001','10001','10001'],
        O:['01110','10001','10001','10001','10001','10001','01110'],
        P:['11110','10001','10001','11110','10000','10000','10000'],
        Q:['01110','10001','10001','10001','10101','10010','01101'],
        R:['11110','10001','10001','11110','10100','10010','10001'],
        S:['01111','10000','10000','01110','00001','00001','11110'],
        T:['11111','00100','00100','00100','00100','00100','00100'],
        U:['10001','10001','10001','10001','10001','10001','01110'],
        V:['10001','10001','10001','10001','10001','01010','00100'],
        W:['10001','10001','10101','10101','10101','11011','10001'],
        X:['10001','10001','01010','00100','01010','10001','10001'],
        Y:['10001','10001','01010','00100','00100','00100','00100'],
        Z:['11111','00001','00010','00100','01000','10000','11111'],

        0:['01110','10001','10011','10101','11001','10001','01110'],
        1:['00100','01100','00100','00100','00100','00100','01110'],
        2:['01110','10001','00001','00010','00100','01000','11111'],
        3:['11110','00001','00001','01110','00001','00001','11110'],
        4:['00010','00110','01010','10010','11111','00010','00010'],
        5:['11111','10000','10000','11110','00001','00001','11110'],
        6:['01110','10000','10000','11110','10001','10001','01110'],
        7:['11111','00001','00010','00100','01000','01000','01000'],
        8:['01110','10001','10001','01110','10001','10001','01110'],
        9:['01110','10001','10001','01111','00001','00001','01110'],

        ' ':['00000','00000','00000','00000','00000','00000','00000'],
        '-':['00000','00000','00000','11111','00000','00000','00000'],
        '.':['00000','00000','00000','00000','00000','00110','00110']
    };

    function normalizarTexto(valor) {
        return String(valor || '')
            .normalize('NFD')
            .replace(/[\\u0300-\\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9 .-]/g, ' ');
    }

    /* ========================================================
       DESENHAR TEXTO
       ======================================================== */

    function desenharTexto(
        pixels,
        texto,
        centroX,
        centroY,
        escala
    ) {
        texto = normalizarTexto(texto);

        const limite =
            opcoes.length <= 3 ? 10 :
            opcoes.length <= 5 ? 8 :
            opcoes.length <= 8 ? 6 :
            5;

        if (texto.length > limite) {
            texto =
                texto.slice(
                    0,
                    limite - 1
                ) + '.';
        }

        const cw = 5 * escala;
        const gap = escala;

        const largura =
            texto.length *
            (cw + gap) -
            gap;

        const inicioX =
            Math.round(
                centroX -
                largura / 2
            );

        const inicioY =
            Math.round(
                centroY -
                (7 * escala) / 2
            );

        for (
            let i = 0;
            i < texto.length;
            i++
        ) {
            const mapa =
                fonte[texto[i]] ||
                fonte[' '];

            const bx =
                inicioX +
                i * (cw + gap);

            for (
                let yy = 0;
                yy < 7;
                yy++
            ) {
                for (
                    let xx = 0;
                    xx < 5;
                    xx++
                ) {
                    if (
                        mapa[yy][xx] !== '1'
                    ) {
                        continue;
                    }

                    for (
                        let sy = 0;
                        sy < escala;
                        sy++
                    ) {
                        for (
                            let sx = 0;
                            sx < escala;
                            sx++
                        ) {
                            const x =
                                bx +
                                xx * escala +
                                sx;

                            const y =
                                inicioY +
                                yy * escala +
                                sy;

                            if (
                                x < 0 ||
                                y < 0 ||
                                x >= W ||
                                y >= H
                            ) {
                                continue;
                            }

                            const p =
                                (y * W + x) * 3;

                            pixels[p] = 255;
                            pixels[p + 1] = 255;
                            pixels[p + 2] = 255;
                        }
                    }
                }
            }
        }
    }

    /* ========================================================
       RODA BASE
       ======================================================== */

    const base =
        Buffer.alloc(
            W * H * 3
        );

    function setPixel(
        pixels,
        x,
        y,
        r,
        g,
        b
    ) {
        if (
            x < 0 ||
            y < 0 ||
            x >= W ||
            y >= H
        ) {
            return;
        }

        const p =
            (y * W + x) * 3;

        pixels[p] = r;
        pixels[p + 1] = g;
        pixels[p + 2] = b;
    }

    /*
     * Fundo.
     */
    for (
        let y = 0;
        y < H;
        y++
    ) {
        for (
            let x = 0;
            x < W;
            x++
        ) {
            setPixel(
                base,
                x,
                y,
                15,
                15,
                20
            );
        }
    }

    /*
     * Setores.
     *
     * A roda é desenhada com o primeiro setor começando
     * no topo.
     */
    for (
        let y = CY - R;
        y <= CY + R;
        y++
    ) {
        for (
            let x = CX - R;
            x <= CX + R;
            x++
        ) {
            const dx = x - CX;
            const dy = y - CY;

            const dist =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            if (dist > R) {
                continue;
            }

            let ang =
                Math.atan2(
                    dy,
                    dx
                ) *
                180 /
                Math.PI;

            ang =
                (ang + 90 + 360) %
                360;

            const setor =
                Math.floor(
                    ang / segmentos
                ) %
                opcoes.length;

            const cor =
                cores[
                    setor %
                    cores.length
                ];

            setPixel(
                base,
                x,
                y,
                cor[0],
                cor[1],
                cor[2]
            );
        }
    }

    /*
     * Linhas divisórias.
     */
    function linha(
        pixels,
        x1,
        y1,
        x2,
        y2
    ) {
        const dx =
            x2 - x1;

        const dy =
            y2 - y1;

        const passos =
            Math.max(
                Math.abs(dx),
                Math.abs(dy)
            );

        for (
            let i = 0;
            i <= passos;
            i++
        ) {
            const t =
                passos === 0
                    ? 0
                    : i / passos;

            setPixel(
                pixels,
                Math.round(
                    x1 + dx * t
                ),
                Math.round(
                    y1 + dy * t
                ),
                255,
                255,
                255
            );
        }
    }

    for (
        let i = 0;
        i < opcoes.length;
        i++
    ) {
        const ang =
            (
                -90 +
                i * segmentos
            ) *
            Math.PI /
            180;

        linha(
            base,
            CX,
            CY,
            CX +
                Math.cos(ang) * R,
            CY +
                Math.sin(ang) * R
        );
    }

    /*
     * Borda.
     */
    for (
        let a = 0;
        a < 360;
        a += 0.5
    ) {
        const rad =
            a *
            Math.PI /
            180;

        for (
            let esp = 0;
            esp < 7;
            esp++
        ) {
            const rr =
                R - esp;

            setPixel(
                base,
                Math.round(
                    CX +
                    Math.cos(rad) *
                    rr
                ),
                Math.round(
                    CY +
                    Math.sin(rad) *
                    rr
                ),
                255,
                255,
                255
            );
        }
    }

    /*
     * Texto dos setores.
     */
    for (
        let i = 0;
        i < opcoes.length;
        i++
    ) {
        const ang =
            (
                -90 +
                (i + 0.5) *
                segmentos
            ) *
            Math.PI /
            180;

        const distancia =
            opcoes.length <= 4
                ? 165
                : 185;

        const tx =
            CX +
            Math.cos(ang) *
            distancia;

        const ty =
            CY +
            Math.sin(ang) *
            distancia;

        const escala =
            opcoes.length <= 4
                ? 4
                : opcoes.length <= 7
                    ? 3
                    : 2;

        desenharTexto(
            base,
            opcoes[i],
            tx,
            ty,
            escala
        );
    }

    /*
     * Centro.
     */
    const centroRaio = 58;

    for (
        let y = -centroRaio;
        y <= centroRaio;
        y++
    ) {
        for (
            let x = -centroRaio;
            x <= centroRaio;
            x++
        ) {
            if (
                x * x +
                y * y <=
                centroRaio *
                centroRaio
            ) {
                setPixel(
                    base,
                    CX + x,
                    CY + y,
                    20,
                    20,
                    25
                );
            }
        }
    }

    desenharTexto(
        base,
        'KYARA',
        CX,
        CY,
        4
    );

    /* ========================================================
       FUNÇÃO PARA GERAR CADA FRAME
       ======================================================== */

    function gerarFrame(
        pixelsBase,
        rotacao,
        caminho
    ) {
        const frame =
            Buffer.alloc(
                W * H * 3
            );

        /*
         * Fundo.
         */
        for (
            let y = 0;
            y < H;
            y++
        ) {
            for (
                let x = 0;
                x < W;
                x++
            ) {
                setPixel(
                    frame,
                    x,
                    y,
                    15,
                    15,
                    20
                );
            }
        }

        const rad =
            -rotacao *
            Math.PI /
            180;

        const cos =
            Math.cos(rad);

        const sin =
            Math.sin(rad);

        /*
         * Rotação por mapeamento inverso.
         */
        for (
            let y = CY - R;
            y <= CY + R;
            y++
        ) {
            for (
                let x = CX - R;
                x <= CX + R;
                x++
            ) {
                const dx =
                    x - CX;

                const dy =
                    y - CY;

                const sx =
                    dx * cos -
                    dy * sin;

                const sy =
                    dx * sin +
                    dy * cos;

                const ox =
                    Math.round(
                        CX + sx
                    );

                const oy =
                    Math.round(
                        CY + sy
                    );

                if (
                    ox < 0 ||
                    oy < 0 ||
                    ox >= W ||
                    oy >= H
                ) {
                    continue;
                }

                const pOrig =
                    (oy * W + ox) * 3;

                const pDest =
                    (y * W + x) * 3;

                frame[pDest] =
                    pixelsBase[pOrig];

                frame[pDest + 1] =
                    pixelsBase[pOrig + 1];

                frame[pDest + 2] =
                    pixelsBase[pOrig + 2];
            }
        }

        /*
         * Ponteiro FIXO no topo.
         *
         * Triângulo branco.
         */
        const py = 24;

        for (
            let yy = 0;
            yy < 52;
            yy++
        ) {
            const largura =
                Math.floor(
                    yy * 0.55
                );

            for (
                let xx =
                    CX - largura;
                xx <=
                    CX + largura;
                xx++
            ) {
                setPixel(
                    frame,
                    xx,
                    py + yy,
                    255,
                    255,
                    255
                );
            }
        }

        /*
         * Pequeno contorno escuro do ponteiro.
         */
        for (
            let yy = 0;
            yy < 4;
            yy++
        ) {
            for (
                let xx =
                    CX - yy * 2;
                xx <=
                    CX + yy * 2;
                xx++
            ) {
                setPixel(
                    frame,
                    xx,
                    py + yy,
                    10,
                    10,
                    10
                );
            }
        }

        /*
         * Cabeçalho.
         */
        desenharTexto(
            frame,
            'ROLETA',
            CX,
            575,
            3
        );

        const header =
            Buffer.from(
                'P6\\n' +
                W +
                ' ' +
                H +
                '\\n255\\n',
                'ascii'
            );

        fsLocal.writeFileSync(
            caminho,
            Buffer.concat([
                header,
                frame
            ])
        );
    }

    /* ========================================================
       GERAR ANIMAÇÃO
       ======================================================== */

    console.log(
        '[ROLETA LOCAL] Gerando ' +
        FRAMES +
        ' frames...'
    );

    for (
        let i = 0;
        i < FRAMES;
        i++
    ) {
        const t =
            i /
            (FRAMES - 1);

        /*
         * Ease-out cúbico:
         * rápido no começo e desacelera
         * progressivamente no final.
         */
        const ease =
            1 -
            Math.pow(
                1 - t,
                3
            );

        const rotacao =
            rotacaoFinal *
            ease;

        const nome =
            pathLocal.join(
                tempDir,
                'frame-' +
                String(i + 1)
                    .padStart(4, '0') +
                '.ppm'
            );

        gerarFrame(
            base,
            rotacao,
            nome
        );
    }

    /* ========================================================
       FFMPEG
       ======================================================== */

    try {
        console.log(
            '[ROLETA LOCAL] Renderizando MP4...'
        );

        await execFileAsync(
            'ffmpeg',
            [
                '-y',
                '-hide_banner',
                '-loglevel',
                'error',

                '-framerate',
                String(FPS),

                '-i',
                pathLocal.join(
                    tempDir,
                    'frame-%04d.ppm'
                ),

                '-c:v',
                'libx264',

                '-preset',
                'veryfast',

                '-crf',
                '24',

                '-pix_fmt',
                'yuv420p',

                '-movflags',
                '+faststart',

                output
            ],
            {
                timeout: 180000,
                maxBuffer:
                    10 * 1024 * 1024
            }
        );

        if (
            !fsLocal.existsSync(output)
        ) {
            throw new Error(
                'MP4 não foi criado.'
            );
        }

        const tamanho =
            fsLocal.statSync(
                output
            ).size;

        if (tamanho < 10000) {
            throw new Error(
                'MP4 criado com tamanho inválido.'
            );
        }

        console.log(
            '[ROLETA LOCAL] Vídeo pronto: ' +
            Math.round(
                tamanho / 1024
            ) +
            ' KB'
        );

        await systemZR.sendMessage(
            m.chat,
            {
                video:
                    fsLocal.readFileSync(
                        output
                    ),

                mimetype:
                    'video/mp4',

                fileName:
                    'roleta-kyara.mp4',

                caption:
                    '🎰 *ROLETA KYARA*\\n\\n' +
                    '🎯 *Opções:* ' +
                    opcoes.join(', ') +
                    '\\n\\n' +
                    '🏆 *Resultado:*\\n' +
                    '👉 *' +
                    vencedor +
                    '*'
            }
        );

    } catch (erro) {
        console.error(
            '[ROLETA LOCAL] Erro:',
            erro
        );

        await enviarTexto(
            '❌ *Erro ao gerar a roleta.*\\n\\n' +
            '🏆 Resultado sorteado: *' +
            vencedor +
            '*\\n\\n' +
            String(
                erro.message ||
                erro
            ).slice(0, 400)
        );

    } finally {
        /*
         * Remove todos os PPM e o MP4 temporário.
         */
        try {
            fsLocal.rmSync(
                tempDir,
                {
                    recursive: true,
                    force: true
                }
            );
        } catch {}
    }
}

async function shazam({
    m,
    systemZR
}) {

    const {
        q,
        mime
    } =
        quotedMedia(m);


    if (
        !/audio\/|video\//i.test(mime)
    ) {

        return m.reply(
            `🎵 Responda a um áudio/vídeo ` +
            `com *${prefixoSeguro()}shazam*.`
        );

    }


    await react(
        systemZR,
        m.chat,
        m.key,
        '🔎'
    );


    const id =
        crypto.randomBytes(8)
            .toString('hex');


    ensureDirs();


    const input =
        path.join(
            TMP_DIR,
            `${id}.media`
        );


    try {

        const buffer =
            await q.download();


        if (
            !buffer ||
            !buffer.length
        ) {
            throw new Error(
                'Não foi possível baixar a mídia.'
            );
        }


        fs.writeFileSync(
            input,
            buffer
        );


        const {
            stdout
        } =
            await execFileAsync(
                'ffprobe',
                [
                    '-v',
                    'quiet',

                    '-print_format',
                    'json',

                    '-show_entries',
                    'format_tags=title,artist,album,album_artist,date,genre',

                    input
                ],
                {
                    timeout: 60000,
                    maxBuffer:
                        2 * 1024 * 1024
                }
            );


        const tags =
            JSON.parse(
                stdout || '{}'
            )
            ?.format
            ?.tags || {};


        const title =
            tags.title ||
            'Não informado';


        const artist =
            tags.artist ||
            tags.album_artist ||
            'Não informado';


        const album =
            tags.album ||
            'Não informado';


        const date =
            tags.date ||
            'Não informado';


        const genre =
            tags.genre ||
            'Não informado';


        if (
            title === 'Não informado' &&
            artist === 'Não informado' &&
            album === 'Não informado'
        ) {

            await react(
                systemZR,
                m.chat,
                m.key,
                '❌'
            );


            return m.reply(
                `❌ O arquivo não possui ` +
                `metadados suficientes.\n\n` +

                `O modo local não consegue ` +
                `identificar uma música pela ` +
                `impressão digital como o Shazam online.`
            );

        }


        await m.reply(
            `╭━━〔 🎵 KYARA • IDENTIFICAÇÃO LOCAL 〕━━╮\n` +
            `│ Título: *${title}*\n` +
            `│ Artista: *${artist}*\n` +
            `│ Álbum: *${album}*\n` +
            `│ Lançamento: ${date}\n` +
            `│ Gênero: ${genre}\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
        );


        await react(
            systemZR,
            m.chat,
            m.key,
            '✅'
        );


    } catch (error) {

        console.error(
            '[SHAZAM LOCAL]',
            error
        );


        await react(
            systemZR,
            m.chat,
            m.key,
            '❌'
        );


        await m.reply(
            `❌ Não consegui ler os metadados.\n\n` +
            `${error?.message || 'Verifique o ffprobe.'}`
        );


    } finally {

        try {

            if (
                fs.existsSync(input)
            ) {
                fs.unlinkSync(input);
            }

        } catch {}

    }
}


/* ============================================================
 * INSTAGRAM
 *
 * Extração direta da página pública.
 *
 * Não utiliza SystemZone.
 * Não utiliza zone.api.br.
 * ============================================================ */

function cleanUrl(value) {

    return String(value || '')
        .replace(
            /\\u0026/g,
            '&'
        )
        .replace(
            /\\u002F/g,
            '/'
        )
        .replace(
            /\\\//g,
            '/'
        )
        .replace(
            /&amp;/g,
            '&'
        )
        .trim();
}


function extractMeta(
    html,
    name
) {

    const patterns = [

        new RegExp(
            `<meta[^>]+` +
            `(?:property|name)=["']` +
            `${name}` +
            `["'][^>]+` +
            `content=["']([^"']+)["']`,
            'i'
        ),

        new RegExp(
            `<meta[^>]+` +
            `content=["']([^"']+)["']` +
            `[^>]+` +
            `(?:property|name)=["']` +
            `${name}` +
            `["']`,
            'i'
        )

    ];


    for (
        const regex
        of patterns
    ) {

        const match =
            html.match(regex);


        if (
            match?.[1]
        ) {

            return cleanUrl(
                match[1]
            );

        }

    }


    return null;
}


function isInstagramUrl(
    url
) {

    try {

        const u =
            new URL(url);


        return (
            /(^|\.)instagram\.com$/i
                .test(
                    u.hostname
                )
        );

    } catch {

        return false;

    }
}


async function fetchInstagramPage(
    url
) {

    const response =
        await fetch(
            url,
            {
                redirect:
                    'follow',

                headers: {

                    'User-Agent':
                        'Mozilla/5.0 ' +
                        '(Linux; Android 13) ' +
                        'AppleWebKit/537.36 ' +
                        '(KHTML, like Gecko) ' +
                        'Chrome/140 Mobile Safari/537.36',

                    'Accept-Language':
                        'pt-BR,pt;q=0.9,' +
                        'en-US;q=0.8,en;q=0.7'

                }
            }
        );


    if (
        !response.ok
    ) {

        throw new Error(
            `Instagram respondeu HTTP ${response.status}`
        );

    }


    return {
        url:
            response.url,

        html:
            await response.text()
    };
}


async function fetchMedia(
    url
) {

    const response =
        await fetch(
            url,
            {
                redirect:
                    'follow',

                headers: {

                    'User-Agent':
                        'Mozilla/5.0 ' +
                        '(Linux; Android 13) ' +
                        'AppleWebKit/537.36 ' +
                        'Chrome/140 Mobile Safari/537.36',

                    'Referer':
                        'https://www.instagram.com/'

                }
            }
        );


    if (
        !response.ok
    ) {

        throw new Error(
            `Mídia respondeu HTTP ${response.status}`
        );

    }


    return Buffer.from(
        await response.arrayBuffer()
    );
}


function extractInstagramMedia(
    html
) {

    const results = [];


    const video =
        extractMeta(
            html,
            'og:video'
        );


    const image =
        extractMeta(
            html,
            'og:image'
        );


    if (video) {

        results.push({
            type: 'video',
            url: video
        });

    }


    if (image) {

        results.push({
            type: 'image',
            url: image
        });

    }


    const videoRegex =
        /https?:\\?\/\\?\/[^"'\\\s<>]+(?:instagram|cdninstagram)[^"'\\\s<>]+\.(?:mp4|m4v)(?:\?[^"'\\\s<>]*)?/gi;


    for (
        const match
        of html.matchAll(videoRegex)
    ) {

        results.push({

            type:
                'video',

            url:
                cleanUrl(
                    match[0]
                )

        });

    }


    return [
        ...new Map(
            results.map(
                item => [
                    item.url,
                    item
                ]
            )
        ).values()
    ];

}


async function instagram({
    m,
    text,
    systemZR
}) {

    const url =
        textoSeguro(text);


    if (
        !isInstagramUrl(url)
    ) {

        return m.reply(
            `📷 Uso:\n` +
            `*${prefixoSeguro()}ig ` +
            `<link do Instagram>*`
        );

    }


    await react(
        systemZR,
        m.chat,
        m.key,
        '🔎'
    );


    try {

        const page =
            await fetchInstagramPage(
                url
            );


        const media =
            extractInstagramMedia(
                page.html
            );


        if (
            !media.length
        ) {

            throw new Error(
                'A página não expôs mídia pública. ' +
                'O Instagram pode exigir login ou bloquear a extração.'
            );

        }


        let sent = 0;


        for (
            const item
            of media.slice(0, 10)
        ) {

            const buffer =
                await fetchMedia(
                    item.url
                );


            if (
                !buffer.length
            ) {
                continue;
            }


            if (
                item.type === 'video'
            ) {

                await systemZR.sendMessage(
                    m.chat,
                    {

                        video:
                            buffer,

                        mimetype:
                            'video/mp4',

                        caption:
                            sent === 0
                                ? (
                                    `╭─〔 KYARA • INSTAGRAM LOCAL 〕─╮\n` +
                                    `│ Download direto\n` +
                                    `│ Sem API externa\n` +
                                    `╰──────────────────────────────╯`
                                )
                                : undefined

                    },
                    {
                        quoted: m
                    }
                );

            } else {

                await systemZR.sendMessage(
                    m.chat,
                    {

                        image:
                            buffer,

                        mimetype:
                            'image/jpeg',

                        caption:
                            sent === 0
                                ? (
                                    `╭─〔 KYARA • INSTAGRAM LOCAL 〕─╮\n` +
                                    `│ Download direto\n` +
                                    `│ Sem API externa\n` +
                                    `╰──────────────────────────────╯`
                                )
                                : undefined

                    },
                    {
                        quoted: m
                    }
                );

            }


            sent++;

        }


        if (
            !sent
        ) {

            throw new Error(
                'Nenhuma mídia pôde ser baixada.'
            );

        }


        await react(
            systemZR,
            m.chat,
            m.key,
            '✅'
        );


    } catch (error) {

        console.error(
            '[INSTAGRAM LOCAL]',
            error
        );


        await react(
            systemZR,
            m.chat,
            m.key,
            '❌'
        );


        await m.reply(
            `❌ Não consegui extrair esse post diretamente.\n\n` +
            `${error?.message || 'O Instagram bloqueou o acesso.'}`
        );

    }

}


/* ============================================================
 * PINTEREST
 *
 * Usa o scraper local existente.
 * Não utiliza SystemZone.
 * ============================================================ */

function isPinterestUrl(
    value
) {

    try {

        const u =
            new URL(value);


        const host =
            u.hostname.toLowerCase();


        return (
            host === 'pin.it' ||
            host === 'pinterest.com' ||
            host === 'www.pinterest.com' ||
            host.endsWith('.pinterest.com')
        );

    } catch {

        return false;

    }

}


async function pin({
    m,
    text,
    systemZR
}) {

    const raw =
        textoSeguro(text);


    if (!raw) {

        return m.reply(
            `📌 *PINTEREST LOCAL*\n\n` +

            `Uso:\n` +
            `${prefixoSeguro()}pin <termo>\n\n` +

            `Exemplo:\n` +
            `${prefixoSeguro()}pin gatos`
        );

    }


    await react(
        systemZR,
        m.chat,
        m.key,
        '🔎'
    );


    try {

        const partes =
            raw
                .split('|')
                .map(
                    v => v.trim()
                )
                .filter(Boolean);


        const query =
            partes.shift();


        let limit = 6;


        for (
            const parte
            of partes
        ) {

            if (
                /^\d+$/.test(parte)
            ) {

                limit =
                    Math.max(
                        1,
                        Math.min(
                            10,
                            Number(parte)
                        )
                    );

            }

        }


        let result;


        if (
            isPinterestUrl(query)
        ) {

            result =
                await pinterestDl(
                    query
                );

        } else {

            result =
                await pinterestSearch(
                    query
                );

        }


        if (
            !result?.ok
        ) {

            throw new Error(
                result?.msg ||
                'Nenhum resultado encontrado.'
            );

        }


        const urls =
            Array.isArray(
                result.urls
            )
                ? result.urls
                    .slice(
                        0,
                        limit
                    )
                : result.url
                    ? [result.url]
                    : [];


        if (
            !urls.length
        ) {

            throw new Error(
                'Nenhuma mídia encontrada.'
            );

        }


        let sent = 0;


        for (
            const url
            of urls
        ) {

            const buffer =
                await fetchMedia(
                    url
                );


            if (
                !buffer.length
            ) {
                continue;
            }


            await systemZR.sendMessage(
                m.chat,
                {

                    image:
                        buffer,

                    mimetype:
                        'image/jpeg',

                    caption:
                        sent === 0
                            ? (
                                `╭─〔 KYARA • PINTEREST LOCAL 〕─╮\n` +
                                `│ Busca: ${query}\n` +
                                `│ Resultados: ${urls.length}\n` +
                                `╰───────────────────────────────╯`
                            )
                            : undefined

                },
                {
                    quoted: m
                }
            );


            sent++;

        }


        if (
            !sent
        ) {

            throw new Error(
                'Não foi possível baixar as imagens.'
            );

        }


        await react(
            systemZR,
            m.chat,
            m.key,
            '✅'
        );


    } catch (error) {

        console.error(
            '[PINTEREST LOCAL]',
            error
        );


        await react(
            systemZR,
            m.chat,
            m.key,
            '❌'
        );


        await m.reply(
            `❌ Erro no Pinterest local.\n\n` +
            `${error?.message || 'Falha na extração.'}`
        );

    }

}


/* ============================================================
 * IA LOCAL
 *
 * Claude e Grok passam pelo MESMO motor local.
 *
 * Não existe API externa aqui.
 * ============================================================ */

async function iaLocal({
    m,
    text,
    systemZR,
    obterIA
}) {

    const pergunta =
        textoSeguro(text);


    if (!pergunta) {

        return m.reply(
            `🤖 Uso:\n` +
            `${prefixoSeguro()}claude <pergunta>\n\n` +
            `ou\n\n` +
            `${prefixoSeguro()}grok <pergunta>`
        );

    }


    await react(
        systemZR,
        m.chat,
        m.key,
        '🤖'
    );


    try {

        if (
            typeof obterIA !==
            'function'
        ) {

            throw new Error(
                'Motor local não conectado.'
            );

        }


        const resposta =
            await obterIA({

                pergunta,

                chatId:
                    m.isGroup
                        ? m.chat
                        : m.sender,

                mensagem:
                    m

            });


        let output =
            typeof resposta === 'string'
                ? resposta
                : (
                    resposta?.text ||
                    resposta?.resposta ||
                    resposta?.response ||
                    resposta?.content ||
                    resposta?.resp?.[0]?.resp ||
                    resposta?.data?.choices?.[0]?.message?.content ||
                    ''
                );


        output =
            textoSeguro(output);


        if (!output) {

            throw new Error(
                'A IA local não retornou resposta.'
            );

        }


        await m.reply(
            output
        );


        await react(
            systemZR,
            m.chat,
            m.key,
            '✅'
        );


    } catch (error) {

        console.error(
            '[IA LOCAL]',
            error
        );


        await react(
            systemZR,
            m.chat,
            m.key,
            '❌'
        );


        await m.reply(
            `❌ O motor de IA local não está disponível.\n\n` +
            `Verifique o llama-server da Kyara.`
        );

    }

}



/* ============================================================
 * PLACAR LOCAL
 * ============================================================ */

function parsePlacar(text) {

    const raw = textoSeguro(text);

    const match = raw.match(
        /^(.+?)\s+x\s+(.+?)(?:\s+(\d+)\s*[-:x]\s*(\d+))?$/i
    );

    if (!match) {
        return null;
    }

    return {
        casa: match[1].trim(),
        fora: match[2].trim(),
        golsCasa: Number(match[3] ?? 0),
        golsFora: Number(match[4] ?? 0)
    };
}

async function placar({ m, text, systemZR }) {

    const chatId =
        m?.chat ||
        m?.key?.remoteJid;

    if (!chatId || !systemZR) {
        console.warn(
            "[PLACAR] Chat ou conexão não disponível."
        );
        return false;
    }

    const raw = textoSeguro(text);

    ensureDirs();

    if (/^limpar$/i.test(raw)) {
        writeJson(PLACAR_FILE, {});

        await systemZR.sendMessage(chatId, {
            text: "🧹 *PLACAR*\n\nTodos os placares locais foram apagados."
        });

        return true;
    }

    const p = parsePlacar(raw);

    if (!p) {
        await systemZR.sendMessage(chatId, {
            text:
                "⚽ *PLACAR LOCAL*\n\n" +
                "Use:\n" +
                prefixoSeguro() + "placar Brasil x Japão\n" +
                prefixoSeguro() + "placar Brasil x Japão 2x1\n\n" +
                "Este sistema funciona localmente e não consulta jogos ao vivo."
        });

        return true;
    }

    const data = readJson(PLACAR_FILE, {});

    const key =
        (chatId + ":" + p.casa + ":" + p.fora).toLowerCase();

    data[key] = {
        ...p,
        atualizadoEm: new Date().toISOString()
    };

    writeJson(PLACAR_FILE, data);

    await systemZR.sendMessage(chatId, {
        text:
            "╭━━〔 ⚽ PLACAR KYARA 〕━━╮\n" +
            "│ ${p.casa}\n" +
            "│       *${p.golsCasa} x ${p.golsFora}*\n" +
            "│ ${p.fora}\n" +
            "│\n" +
            "│ Atualizado localmente.\n" +
            "╰━━━━━━━━━━━━━━━━━━━━━━╯"
    });

    return true;
}

/* ============================================================
 * DISPATCHER
 *
 * UM ÚNICO DONO PARA CADA COMANDO.
 * ============================================================ */

export /* ============================================================
 * KYARA_EDITOR_LOCAL_V2
 *
 * Editor de imagem local.
 *
 * IMPORTANTE:
 * - Não substitui sticker.
 * - Não substitui Pinterest.
 * - Não utiliza API externa.
 * - Aproveita o FFmpeg já utilizado pelo projeto.
 * - Fica integrado ao cases-local existente.
 * ============================================================ */

function editorNumero(texto, padrao, minimo, maximo) {

    const encontrado =
        String(texto || '')
            .match(/(?:^|\s)(-?\d+(?:[.,]\d+)?)(?:\s|$)/);

    if (!encontrado) {
        return padrao;
    }

    const numero =
        Number(
            encontrado[1]
                .replace(',', '.')
        );

    if (!Number.isFinite(numero)) {
        return padrao;
    }

    return Math.max(
        minimo,
        Math.min(
            maximo,
            numero
        )
    );
}


function editorFiltroLocal(texto) {

    const p =
        textoSeguro(texto)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

    if (!p) {
        return null;
    }

    /* --------------------------------------------------------
     * PRETO E BRANCO
     * -------------------------------------------------------- */

    if (
        /preto.?e.?branco|pb|monocrom|monocromatico|cinza/.test(p)
    ) {
        return {
            filter: 'format=gray',
            nome: 'Preto e branco'
        };
    }


    /* --------------------------------------------------------
     * NEGATIVO
     * -------------------------------------------------------- */

    if (
        /negativo|inverter|invert/.test(p)
    ) {
        return {
            filter: 'negate',
            nome: 'Negativo'
        };
    }


    /* --------------------------------------------------------
     * SEPIA
     * -------------------------------------------------------- */

    if (
        /sepia/.test(p)
    ) {
        return {
            filter:
                'colorchannelmixer=' +
                '.393:.769:.189:0:' +
                '.349:.686:.168:0:' +
                '.272:.534:.131',
            nome: 'Sépia'
        };
    }


    /* --------------------------------------------------------
     * BLUR
     * -------------------------------------------------------- */

    if (
        /blur|desfoque|borrar/.test(p)
    ) {

        const sigma =
            editorNumero(
                p,
                4,
                1,
                20
            );

        return {
            filter:
                `gblur=sigma=${sigma}`,
            nome:
                `Blur ${sigma}`
        };
    }


    /* --------------------------------------------------------
     * NITIDEZ
     * -------------------------------------------------------- */

    if (
        /nitidez|nitido|sharp|sharpen/.test(p)
    ) {

        const intensidade =
            editorNumero(
                p,
                1,
                0.1,
                5
            );

        return {
            filter:
                `unsharp=5:5:${intensidade}:5:5:0`,
            nome:
                `Nitidez ${intensidade}`
        };
    }


    /* --------------------------------------------------------
     * BRILHO
     *
     * Aceita:
     * !editar brilho
     * !editar brilho 1.5
     * !editar brilho -1
     * -------------------------------------------------------- */

    if (
        /brilho|clarear|clareamento|brightness/.test(p)
    ) {

        let valor =
            editorNumero(
                p,
                0.15,
                -1,
                1
            );

        /*
         * Se o usuário escrever 1.5,
         * interpretamos como intensidade e limitamos
         * ao intervalo seguro do FFmpeg.
         */
        if (Math.abs(valor) > 1) {
            valor =
                valor > 0
                    ? 1
                    : -1;
        }

        return {
            filter:
                `eq=brightness=${valor}`,
            nome:
                `Brilho ${valor}`
        };
    }


    /* --------------------------------------------------------
     * ESCURECER
     * -------------------------------------------------------- */

    if (
        /escuro|escurecer|dark/.test(p)
    ) {

        return {
            filter:
                'eq=brightness=-0.15',
            nome:
                'Escurecer'
        };
    }


    /* --------------------------------------------------------
     * CONTRASTE
     * -------------------------------------------------------- */

    if (
        /contraste|contrast/.test(p)
    ) {

        const valor =
            editorNumero(
                p,
                1.30,
                0.2,
                3
            );

        return {
            filter:
                `eq=contrast=${valor}`,
            nome:
                `Contraste ${valor}`
        };
    }


    /* --------------------------------------------------------
     * SATURAÇÃO
     * -------------------------------------------------------- */

    if (
        /saturacao|saturar|colorido|saturation/.test(p)
    ) {

        const valor =
            editorNumero(
                p,
                1.50,
                0,
                3
            );

        return {
            filter:
                `eq=saturation=${valor}`,
            nome:
                `Saturação ${valor}`
        };
    }


    /* --------------------------------------------------------
     * CINEMA
     * -------------------------------------------------------- */

    if (
        /cinema|cinematic|cinematico/.test(p)
    ) {

        return {
            filter:
                'eq=' +
                'contrast=1.15:' +
                'saturation=0.85:' +
                'brightness=0.02',
            nome:
                'Cinema'
        };
    }


    /* --------------------------------------------------------
     * VINTAGE
     * -------------------------------------------------------- */

    if (
        /vintage|retro/.test(p)
    ) {

        return {
            filter:
                'eq=' +
                'contrast=1.08:' +
                'saturation=0.78:' +
                'brightness=0.03',
            nome:
                'Vintage'
        };
    }


    /* --------------------------------------------------------
     * AUTO
     *
     * Melhoria conservadora:
     * reduz ruído + aumenta levemente contraste/nitidez.
     * -------------------------------------------------------- */

    if (
        /^auto$|melhorar|melhoria|enhance|automatico/.test(p)
    ) {

        return {
            filter:
                'hqdn3d=1.2:1.2:3:3,' +
                'eq=contrast=1.08:saturation=1.04:brightness=0.01,' +
                'unsharp=5:5:0.55:5:5:0',
            nome:
                'Melhoria automática'
        };
    }


    /* --------------------------------------------------------
     * ESPELHAR
     * -------------------------------------------------------- */

    if (
        /espelhar|espelho|mirror|flip/.test(p)
    ) {

        return {
            filter:
                'hflip',
            nome:
                'Espelhado'
        };
    }


    /* --------------------------------------------------------
     * GIRAR
     * -------------------------------------------------------- */

    if (
        /girar|giro|rotacionar|rotate/.test(p)
    ) {

        const valor =
            editorNumero(
                p,
                90,
                -360,
                360
            );

        const normalizado =
            ((valor % 360) + 360) % 360;

        if (normalizado === 90) {
            return {
                filter: 'transpose=1',
                nome: 'Rotação 90°'
            };
        }

        if (normalizado === 180) {
            return {
                filter: 'transpose=1,transpose=1',
                nome: 'Rotação 180°'
            };
        }

        if (normalizado === 270) {
            return {
                filter: 'transpose=2',
                nome: 'Rotação 270°'
            };
        }

        return {
            filter:
                `rotate=${valor}*PI/180:fillcolor=black@0`,
            nome:
                `Rotação ${valor}°`
        };
    }


    /* --------------------------------------------------------
     * QUADRADO
     *
     * Recorta a imagem no maior quadrado possível.
     * -------------------------------------------------------- */

    if (
        /quadrado|square|1x1/.test(p)
    ) {

        return {
            filter:
                'crop=min(iw\\,ih):min(iw\\,ih)',
            nome:
                'Corte quadrado 1:1'
        };
    }


    /* --------------------------------------------------------
     * REMOVE BORDAS
     * -------------------------------------------------------- */

    if (
        /sem borda|remover borda|cortar borda/.test(p)
    ) {

        return {
            filter:
                'crop=iw*0.94:ih*0.94',
            nome:
                'Corte de bordas'
        };
    }


    return null;
}


async function editorLocal({
    m,
    text,
    systemZR
}) {

    const prompt =
        textoSeguro(text);

    const {
        q,
        mime
    } =
        quotedMedia(m);

    if (
        !/image\//i.test(mime)
    ) {

        return m.reply(
            `🖼️ Responda a uma imagem com ` +
            `*${prefixoSeguro()}editar*.\n\n` +

            `Exemplos:\n` +
            `• ${prefixoSeguro()}editar brilho\n` +
            `• ${prefixoSeguro()}editar contraste 1.4\n` +
            `• ${prefixoSeguro()}editar saturacao 1.7\n` +
            `• ${prefixoSeguro()}editar blur 5\n` +
            `• ${prefixoSeguro()}editar nitidez\n` +
            `• ${prefixoSeguro()}editar preto e branco\n` +
            `• ${prefixoSeguro()}editar sepia\n` +
            `• ${prefixoSeguro()}editar negativo\n` +
            `• ${prefixoSeguro()}editar cinema\n` +
            `• ${prefixoSeguro()}editar vintage\n` +
            `• ${prefixoSeguro()}editar espelhar\n` +
            `• ${prefixoSeguro()}editar girar 90\n` +
            `• ${prefixoSeguro()}editar quadrado\n` +
            `• ${prefixoSeguro()}editar auto`
        );
    }


    if (
        !prompt ||
        /^(ajuda|help|menu)$/i.test(prompt)
    ) {

        return m.reply(
            `╭─〔 KYARA • EDITOR LOCAL 〕─╮\n` +
            `│\n` +
            `│ 🖼️ Edição sem API\n` +
            `│ ⚙️ Processamento por FFmpeg\n` +
            `│\n` +
            `│ ${prefixoSeguro()}editar brilho\n` +
            `│ ${prefixoSeguro()}editar contraste 1.4\n` +
            `│ ${prefixoSeguro()}editar saturacao 1.7\n` +
            `│ ${prefixoSeguro()}editar blur 5\n` +
            `│ ${prefixoSeguro()}editar nitidez\n` +
            `│ ${prefixoSeguro()}editar preto e branco\n` +
            `│ ${prefixoSeguro()}editar sepia\n` +
            `│ ${prefixoSeguro()}editar negativo\n` +
            `│ ${prefixoSeguro()}editar cinema\n` +
            `│ ${prefixoSeguro()}editar vintage\n` +
            `│ ${prefixoSeguro()}editar espelhar\n` +
            `│ ${prefixoSeguro()}editar girar 90\n` +
            `│ ${prefixoSeguro()}editar quadrado\n` +
            `│ ${prefixoSeguro()}editar auto\n` +
            `│\n` +
            `╰────────────────────────────╯`
        );
    }


    const config =
        editorFiltroLocal(prompt);

    if (!config) {

        return m.reply(
            `⚠️ Não reconheci essa edição.\n\n` +
            `Use:\n` +
            `*${prefixoSeguro()}editar ajuda*`
        );
    }


    await react(
        systemZR,
        m.chat,
        m.key,
        '⏳'
    );


    ensureDirs();


    const id =
        crypto.randomBytes(8)
            .toString('hex');


    const input =
        path.join(
            TMP_DIR,
            `${id}.editor.input`
        );


    const output =
        path.join(
            TMP_DIR,
            `${id}.editor.jpg`
        );


    try {

        const buffer =
            await q.download();

        if (
            !buffer ||
            !buffer.length
        ) {
            throw new Error(
                'Não foi possível baixar a imagem.'
            );
        }


        fs.writeFileSync(
            input,
            buffer
        );


        await execFileAsync(
            'ffmpeg',
            [
                '-hide_banner',
                '-loglevel',
                'error',
                '-y',

                '-i',
                input,

                '-vf',
                config.filter,

                '-frames:v',
                '1',

                '-q:v',
                '2',

                '-pix_fmt',
                'yuvj420p',

                output
            ],
            {
                timeout: 120000,
                maxBuffer:
                    8 * 1024 * 1024
            }
        );


        if (
            !fs.existsSync(output) ||
            fs.statSync(output).size < 100
        ) {
            throw new Error(
                'O FFmpeg não produziu uma imagem válida.'
            );
        }


        await systemZR.sendMessage(
            m.chat,
            {
                image:
                    fs.readFileSync(output),

                mimetype:
                    'image/jpeg',

                caption:
                    `╭─〔 KYARA • EDITOR LOCAL 〕─╮\n` +
                    `│ Efeito: ${config.nome}\n` +
                    `│ Motor: FFmpeg local\n` +
                    `│ API externa: não utilizada\n` +
                    `╰───────────────────────────╯`
            },
            {
                quoted: m
            }
        );


        await react(
            systemZR,
            m.chat,
            m.key,
            '✅'
        );


    } catch (error) {

        console.error(
            '[KYARA EDITOR LOCAL V2]',
            error
        );


        await react(
            systemZR,
            m.chat,
            m.key,
            '❌'
        );


        await m.reply(
            `❌ Falha na edição local.\n\n` +
            `${error?.message || 'Erro desconhecido.'}`
        );


    } finally {

        for (
            const file
            of [input, output]
        ) {

            try {

                if (
                    fs.existsSync(file)
                ) {
                    fs.unlinkSync(file);
                }

            } catch {}

        }

    }

}


/* ============================================================
 * FIM KYARA_EDITOR_LOCAL_V2
 * ============================================================ */



async function executarCaseLocal({
    command,
    m,
    text,
    systemZR,
    obterIA
}) {

    const cmd =
        textoSeguro(command)
            .toLowerCase();


    switch (cmd) {

        case 'nano':

            await nano({
                m,
                text,
                systemZR
            });

            return true;

        /*
         * ========================================================
         * EDITOR LOCAL V2
         *
         * Não duplica sticker.
         * Não duplica Pinterest.
         * Usa o motor local dedicado acima.
         * ========================================================
         */

        case 'editar':
        case 'editfoto':
        case 'efeito':

            await editorLocal({
                m,
                text,
                systemZR
            });

            return true;



        case 'placar':

            await placar({
                m,
                text,
                systemZR
            });

            return true;


        case 'shazam':

            await shazam({
                m,
                systemZR
            });

            return true;


        case 'ig':
        case 'instagram':
        case 'igdl':

            await instagram({
                m,
                text,
                systemZR
            });

            return true;


        case 'pin':

            await pin({
                m,
                text,
                systemZR
            });

            return true;


        case 'claude':
        case 'grok':

            await iaLocal({
                m,
                text,
                systemZR,
                obterIA
            });

            return true;


        case 'tomp3':

            await tomp3({
                m,
                systemZR
            });

            return true;


        case 'roleta':
        case 'roulette':

            await roleta({
                m,
                text,
                systemZR
            });

            return true;


        default:

            return false;

    }

}


export default {

    executarCaseLocal,

    nano,

    placar,

    shazam,

    instagram,

    pin,

    iaLocal,

    tomp3,

    roleta

};
