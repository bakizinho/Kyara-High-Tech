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
    const term = String(query || '').trim();

    if (!term) {
        return {
            ok: false,
            urls: [],
            msg: 'Digite o que deseja pesquisar no TikTok.'
        };
    }

    const found = new Set();

    const normalize = value => String(value || '')
        .replace(/\\u002[fF]/g, '/')
        .replace(/\\u0026/g, '&')
        .replace(/\\\//g, '/')
        .replace(/&amp;/gi, '&');

    const collect = value => {
        const html = normalize(value);

        const matches = html.match(
            /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^\s"'<>\\]+?\/video\/\d+/gi
        ) || [];

        for (const candidate of matches) {
            try {
                const u = new URL(
                    candidate.startsWith('http')
                        ? candidate
                        : `https://${candidate}`
                );

                if (!/(^|\.)tiktok\.com$/i.test(u.hostname)) {
                    continue;
                }

                if (!/^\/@[^/]+\/video\/\d+/.test(u.pathname)) {
                    continue;
                }

                found.add(
                    `https://www.tiktok.com${u.pathname}`
                );

            } catch {}
        }
    };

    // Pesquisa pública do TikTok.
    try {
        const response = await fetch(
            `https://www.tiktok.com/search?q=${encodeURIComponent(term)}`,
            {
                signal: AbortSignal.timeout(12000),
                headers: {
                    'user-agent':
                        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36',
                    'accept-language':
                        'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
                }
            }
        );

        if (response.ok) {
            collect(await response.text());
        }

    } catch (error) {
        console.warn(
            '[TikTok SEARCH]',
            error?.message || error
        );
    }

    // Complemento por índice público.
    if (found.size < 10) {
        try {
            const endpoint =
                `https://html.duckduckgo.com/html/?q=${
                    encodeURIComponent(`site:tiktok.com/@ ${term}`)
                }`;

            const response = await fetch(endpoint, {
                signal: AbortSignal.timeout(12000),
                headers: {
                    'user-agent':
                        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'
                }
            });

            if (response.ok) {
                const html = await response.text();

                for (const m of html.matchAll(/uddg=([^&"']+)/g)) {
                    try {
                        collect(decodeURIComponent(m[1]));
                    } catch {}

                    if (found.size >= 10) break;
                }

                collect(html);
            }

        } catch (error) {
            console.warn(
                '[TikTok SEARCH FALLBACK]',
                error?.message || error
            );
        }
    }

    const urls = [...found].slice(0, 10);

    if (!urls.length) {
        return {
            ok: false,
            urls: [],
            msg: 'Não encontrei vídeos públicos do TikTok para esse termo. Tente outro termo ou envie um link.'
        };
    }

    return {
        ok: true,
        type: 'video',
        title: term,
        link: urls[0],
        urls,
        count: urls.length
    };
}

export { search, dl };
