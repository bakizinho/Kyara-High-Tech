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

async function dl(url) {
    if (!url || !/instagram\.com/i.test(url)) {
        return {
            ok: false,
            msg: 'Envie um link válido do Instagram.'
        };
    }

    const dir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'kyara-ig-')
    );

    try {
        const output = path.join(
            dir,
            `${crypto.randomUUID()}.%(ext)s`
        );

        console.log('[Instagram LOCAL] 📥 Baixando...');

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
            throw new Error('O yt-dlp não gerou nenhum arquivo.');
        }

        const filePath = path.join(dir, mediaFile);
        const buffer = await fs.readFile(filePath);

        if (!buffer.length) {
            throw new Error('Arquivo do Instagram está vazio.');
        }

        const ext = path.extname(mediaFile).toLowerCase();

        const mime =
            ext === '.mp4'
                ? 'video/mp4'
                : ext === '.webm'
                    ? 'video/webm'
                    : 'image/jpeg';

        console.log(
            `[Instagram LOCAL] ✅ ${buffer.length} bytes`
        );

        return {
            ok: true,
            criador: 'Kyara',
            type: mime.startsWith('video/') ? 'video' : 'image',
            mime,
            buffer,
            title: info.title || '',
            author: info.uploader || info.channel || ''
        };

    } catch (err) {
        console.error(
            '[Instagram LOCAL] ❌',
            err.message
        );

        return {
            ok: false,
            msg: `Não foi possível baixar o Instagram: ${err.message}`
        };

    } finally {
        await fs.rm(dir, {
            recursive: true,
            force: true
        }).catch(() => {});
    }
}

export { dl };
