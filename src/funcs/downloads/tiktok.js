import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);

async function runYtDlp(args) {
    const { stdout, stderr } = await execFileAsync(
        'yt-dlp',
        args,
        {
            timeout: 120000,
            maxBuffer: 20 * 1024 * 1024
        }
    );

    return { stdout, stderr };
}

async function baixar(url) {
    const dir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'kyara-tt-')
    );

    try {
        const output = path.join(
            dir,
            `${crypto.randomUUID()}.%(ext)s`
        );

        console.log('[TikTok LOCAL] 📥 Baixando...');

        const { stdout } = await runYtDlp([
            '--no-playlist',
            '--print-json',
            '--no-warnings',
            '-o',
            output,
            url
        ]);

        const infoLine = stdout
            .split('\n')
            .reverse()
            .find(line => line.trim().startsWith('{'));

        let info = {};

        try {
            info = infoLine ? JSON.parse(infoLine) : {};
        } catch {}

        const files = await fs.readdir(dir);

        const mediaFile = files.find(file =>
            !file.endsWith('.part') &&
            !file.endsWith('.ytdl')
        );

        if (!mediaFile) {
            throw new Error(
                'O yt-dlp não gerou nenhum arquivo.'
            );
        }

        const filePath = path.join(dir, mediaFile);
        const buffer = await fs.readFile(filePath);

        if (!buffer.length) {
            throw new Error('Vídeo do TikTok está vazio.');
        }

        const ext = path.extname(mediaFile).toLowerCase();

        const mime =
            ext === '.webm'
                ? 'video/webm'
                : 'video/mp4';

        console.log(
            `[TikTok LOCAL] ✅ ${buffer.length} bytes`
        );

        return {
            ok: true,
            criador: 'Kyara',
            type: 'video',
            mime,
            buffer,
            title: info.title || info.description || '',
            author:
                info.uploader ||
                info.uploader_id ||
                info.channel ||
                ''
        };

    } catch (err) {
        console.error(
            '[TikTok LOCAL] ❌',
            err.message
        );

        return {
            ok: false,
            msg: `Não foi possível baixar o TikTok: ${err.message}`
        };

    } finally {
        await fs.rm(dir, {
            recursive: true,
            force: true
        }).catch(() => {});
    }
}

async function dl(url) {
    if (!url || !/tiktok\.com/i.test(url)) {
        return {
            ok: false,
            msg: 'Envie um link válido do TikTok.'
        };
    }

    return await baixar(url);
}

async function search(query) {
    if (!query) {
        return {
            ok: false,
            msg: 'Digite o que deseja pesquisar no TikTok.'
        };
    }

    return {
        ok: false,
        msg: 'A pesquisa por palavra-chave do TikTok ainda será migrada para o sistema local. Use um link do TikTok por enquanto.'
    };
}

export { search, dl };
