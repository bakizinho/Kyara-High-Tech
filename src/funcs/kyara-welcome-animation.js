const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const execFileAsync = promisify(execFile);

async function exists(file) {
    try {
        await fs.access(file);
        return true;
    } catch {
        return false;
    }
}

async function findFont(bold = false) {
    const candidates = bold
        ? [
            '/system/fonts/Roboto-Bold.ttf',
            '/system/fonts/NotoSans-Bold.ttf',
            '/data/data/com.termux/files/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Bold.ttf'
        ]
        : [
            '/system/fonts/Roboto-Regular.ttf',
            '/system/fonts/NotoSans-Regular.ttf',
            '/data/data/com.termux/files/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans.ttf'
        ];

    for (const font of candidates) {
        if (await exists(font)) return font;
    }

    return null;
}

async function ffmpeg(args) {
    return execFileAsync(
        'ffmpeg',
        [
            '-hide_banner',
            '-loglevel',
            'error',
            '-y',
            ...args
        ],
        {
            maxBuffer: 8 * 1024 * 1024
        }
    );
}

async function downloadFile(url, destination) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Kyara/1.0'
        }
    });

    if (!response.ok) {
        throw new Error(`Falha ao baixar imagem: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(destination, buffer);
}

function filterEscape(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:')
        .replace(/%/g, '\\%');
}

async function createWelcomeAnimation(
    KyaraSock,
    groupMetadata,
    participants,
    isWelcome = true
) {
    const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'kyara-neon-')
    );

    const output = path.join(
        tempDir,
        isWelcome ? 'kyara-welcome.mp4' : 'kyara-exit.mp4'
    );

    const profile = path.join(tempDir, 'profile.jpg');

    const titleFile = path.join(tempDir, 'title.txt');
    const nameFile = path.join(tempDir, 'name.txt');
    const groupFile = path.join(tempDir, 'group.txt');
    const footerFile = path.join(tempDir, 'footer.txt');

    try {
        if (!participants?.length) {
            throw new Error('Nenhum participante recebido');
        }

        const participant = participants[0];

        const number =
            String(participant || '')
                .split('@')[0]
                .replace(/\D/g, '') || 'Usuário';

        let displayName = number;

        const metadataParticipant =
            groupMetadata?.participants?.find(
                p =>
                    p?.id === participant ||
                    p?.jid === participant
            );

        displayName =
            metadataParticipant?.notify ||
            metadataParticipant?.name ||
            metadataParticipant?.verifiedName ||
            number;

        try {
            const contact =
                await KyaraSock.onWhatsApp(participant)
                    .catch(() => null);

            if (contact?.[0]?.name) {
                displayName = contact[0].name;
            }
        } catch {}

        // ====================================================
        // FOTO REAL DO USUÁRIO
        // ====================================================

        let profileOk = false;

        try {
            const profileUrl =
                await KyaraSock.profilePictureUrl(
                    participant,
                    'image'
                );

            if (profileUrl) {
                await downloadFile(
                    profileUrl,
                    profile
                );

                profileOk = await exists(profile);
            }
        } catch {}

        // ====================================================
        // AVATAR DE SEGURANÇA
        // ====================================================

        if (!profileOk) {
            await ffmpeg([
                '-f',
                'lavfi',
                '-i',
                'color=c=0x13001f:s=500x500',
                '-frames:v',
                '1',
                profile
            ]);
        }

        const title =
            isWelcome
                ? 'BEM-VINDO'
                : 'ATÉ LOGO';

        const footer =
            isWelcome
                ? 'É um prazer ter você aqui.'
                : 'Esperamos ver você novamente.';

        const groupName =
            String(groupMetadata?.subject || 'Grupo');

        await fs.writeFile(
            titleFile,
            title,
            'utf8'
        );

        await fs.writeFile(
            nameFile,
            displayName,
            'utf8'
        );

        await fs.writeFile(
            groupFile,
            groupName,
            'utf8'
        );

        await fs.writeFile(
            footerFile,
            footer,
            'utf8'
        );

        const regularFont = await findFont(false);
        const boldFont = await findFont(true);

        const fontRegular =
            regularFont
                ? `fontfile='${regularFont}'`
                : '';

        const fontBold =
            boldFont
                ? `fontfile='${boldFont}'`
                : fontRegular;

        const FPS = 30;
        const DURATION = 6;

        /*
         * =====================================================
         * KYARA NEON ENGINE
         *
         * 0.0s → partículas/luz
         * 0.7s → anel começa a aparecer
         * 1.0s → foto entra
         * 1.6s → nome
         * 2.2s → BEM-VINDO / ATÉ LOGO
         * 3.0s → KYARA • IA
         * 4.0s → composição completa
         * 5.2s → fechamento
         * =====================================================
         */

        const filter = [

            // -------------------------------------------------
            // FUNDO ANIMADO
            // -------------------------------------------------

            `[0:v]format=rgba,` +
            `geq=` +
            `r='5+20*sin((X/100)+(T*2.2))':` +
            `g='1+5*sin((Y/80)+(T*1.5))':` +
            `b='25+45*sin(((X+Y)/150)+(T*2.5))'` +
            `[bg]`,

            // -------------------------------------------------
            // GLOW CENTRAL
            // -------------------------------------------------

            `color=c=black@0.0:s=720x720:r=${FPS},` +
            `format=rgba,` +
            `geq=` +
            `r='190':` +
            `g='55':` +
            `b='255':` +
            `a='if(lt(hypot(X-W/2,Y-H/2),` +
            `250+35*sin(T*2)),` +
            `70,0)'` +
            `[glow]`,

            // -------------------------------------------------
            // ANEL NEON INTERNO
            // -------------------------------------------------

            `color=c=black@0.0:s=720x720:r=${FPS},` +
            `format=rgba,` +
            `geq=` +
            `r='210':` +
            `g='70':` +
            `b='255':` +
            `a='if(between(` +
            `hypot(X-W/2,Y-H/2),` +
            `164+10*sin(T*4)-5,` +
            `164+10*sin(T*4)+5` +
            `),` +
            `230,0)'` +
            `[ring1]`,

            // -------------------------------------------------
            // ANEL EXTERNO
            // -------------------------------------------------

            `color=c=black@0.0:s=720x720:r=${FPS},` +
            `format=rgba,` +
            `geq=` +
            `r='120':` +
            `g='30':` +
            `b='255':` +
            `a='if(between(` +
            `hypot(X-W/2,Y-H/2),` +
            `215+16*sin(T*2.7)-3,` +
            `215+16*sin(T*2.7)+3` +
            `),` +
            `160,0)'` +
            `[ring2]`,

            // -------------------------------------------------
            // FOTO DO USUÁRIO
            // Zoom progressivo + círculo
            // -------------------------------------------------

            `[1:v]` +
            `scale=` +
            `w='350+45*min(t/1.2,1)':` +
            `h='350+45*min(t/1.2,1)':` +
            `force_original_aspect_ratio=increase,` +
            `crop=395:395,` +
            `format=rgba,` +
            `geq=` +
            `a='if(` +
            `lte(` +
            `(X-W/2)*(X-W/2)+` +
            `(Y-H/2)*(Y-H/2),` +
            `(W/2-7)*(W/2-7)` +
            `),` +
            `255,0)'` +
            `[avatar]`,

            // -------------------------------------------------
            // COMPOSIÇÃO
            // -------------------------------------------------

            `[bg][glow]overlay=0:0:format=auto[b1]`,

            `[b1][ring2]overlay=0:0:format=auto[b2]`,

            `[b2][ring1]overlay=0:0:format=auto[b3]`,

            `[b3][avatar]` +
            `overlay=` +
            `x='(W-w)/2':` +
            `y='145+(1-min(t/0.8,1))*90':` +
            `enable='gte(t,0.55)':` +
            `format=auto` +
            `[main]`,

            // -------------------------------------------------
            // KYARA • IA
            // -------------------------------------------------

            `[main]` +
            `drawtext=${fontBold}:` +
            `text='KYARA  •  IA':` +
            `fontcolor=0xd58aff:` +
            `fontsize=23:` +
            `x='(w-text_w)/2':` +
            `y=78:` +
            `alpha='if(lt(t,1.0),0,if(lt(t,1.7),(t-1.0)/0.7,1))'` +
            `[t1]`,

            // -------------------------------------------------
            // NOME
            // -------------------------------------------------

            `[t1]` +
            `drawtext=${fontBold}:` +
            `textfile='${nameFile}':` +
            `fontcolor=white:` +
            `fontsize=38:` +
            `x='(w-text_w)/2':` +
            `y=555:` +
            `alpha='if(lt(t,1.0),0,if(lt(t,1.8),(t-1.0)/0.8,1))'` +
            `[t2]`,

            // -------------------------------------------------
            // TÍTULO
            // -------------------------------------------------

            `[t2]` +
            `drawtext=${fontBold}:` +
            `textfile='${titleFile}':` +
            `fontcolor=white:` +
            `fontsize=48:` +
            `x='(w-text_w)/2':` +
            `y=605:` +
            `alpha='if(lt(t,1.7),0,if(lt(t,2.5),(t-1.7)/0.8,1))'` +
            `[t3]`,

            // -------------------------------------------------
            // GRUPO
            // -------------------------------------------------

            `[t3]` +
            `drawtext=${fontRegular}:` +
            `textfile='${groupFile}':` +
            `fontcolor=0xbfa8ff:` +
            `fontsize=20:` +
            `x='(w-text_w)/2':` +
            `y=657:` +
            `alpha='if(lt(t,2.1),0,if(lt(t,2.9),(t-2.1)/0.8,1))'` +
            `[t4]`,

            // -------------------------------------------------
            // FRASE FINAL
            // -------------------------------------------------

            `[t4]` +
            `drawtext=${fontRegular}:` +
            `textfile='${footerFile}':` +
            `fontcolor=0xe5d9ff:` +
            `fontsize=22:` +
            `x='(w-text_w)/2':` +
            `y=690:` +
            `alpha='if(lt(t,2.7),0,if(lt(t,3.5),(t-2.7)/0.8,1))'` +
            `[v]`

        ].join(';');

        await ffmpeg([
            '-f',
            'lavfi',
            '-i',
            `color=c=0x030008:s=720x720:r=${FPS}`,

            '-loop',
            '1',

            '-i',
            profile,

            '-filter_complex',
            filter,

            '-map',
            '[v]',

            '-t',
            String(DURATION),

            '-r',
            String(FPS),

            '-c:v',
            'libx264',

            '-preset',
            'veryfast',

            '-crf',
            '20',

            '-pix_fmt',
            'yuv420p',

            '-movflags',
            '+faststart',

            output
        ]);

        if (!(await exists(output))) {
            throw new Error(
                'FFmpeg terminou sem criar o vídeo'
            );
        }

        return {
            ok: true,
            path: output,

            cleanup: async () => {
                await fs.rm(
                    tempDir,
                    {
                        recursive: true,
                        force: true
                    }
                ).catch(() => {});
            }
        };

    } catch (error) {

        await fs.rm(
            tempDir,
            {
                recursive: true,
                force: true
            }
        ).catch(() => {});

        return {
            ok: false,
            error
        };
    }
}

module.exports = {
    createWelcomeAnimation
};
