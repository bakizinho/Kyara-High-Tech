import verificarAPI from '../API.js';

const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

function getCached(key) {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() - item.ts > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return item.val;
}

function setCache(key, val) {
    if (cache.size >= 1000) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
    cache.set(key, { val, ts: Date.now() });
}

/**
 * Gera imagem estática Brat (Retorna a URL direta)
 */
async function gerarbrat(query, bg, text_color, blur) {
    const checkAPI = await verificarAPI();
    if (checkAPI !== true) return { ok: false, msg: checkAPI };

    try {
        if (!query) {
            return { ok: false, msg: 'O texto (query) é obrigatório' };
        }

        const cacheKey = `brat:${query.toLowerCase()}:${bg}:${text_color}:${blur}`;
        const cached = getCached(cacheKey);

        if (cached) {
            return { ok: true, ...cached, cached: true };
        }

        const params = new URLSearchParams({
            query,
            bg: bg || 'white',
            text_color: text_color || 'black',
            blur: blur || '0'
        });

        const url = `http://127.0.0.1:3000/api/canvas/brat?${params.toString()}`;

        const result = {
            criador: 'Kyara',
            type: 'image',
            mime: 'image/webp',
            query,
            url
        };

        setCache(cacheKey, result);

        return { ok: true, ...result };

    } catch (err) {
        console.error('[BRAT] Erro:', err);
        return { ok: false, msg: err.message };
    }
}


async function gerarbratvid(query, bg, text_color, bpm, blur) {
    const checkAPI = await verificarAPI();
    if (checkAPI !== true) return { ok: false, msg: checkAPI };

    try {
        if (!query) return { ok: false, msg: 'O texto (query) é obrigatório' };

        const cacheKey = `bratvid:${query.toLowerCase()}:${bg}:${text_color}:${bpm}:${blur}`;
        const cached = getCached(cacheKey);
        if (cached) return { ok: true, ...cached, cached: true };

        // =====================================================
        // BRATVID LOCAL — NÃO DEPENDE DA VEX API
        // =====================================================

        const params = new URLSearchParams({
            query,
            bg: bg || 'white',
            text_color: text_color || 'black',
            bpm: bpm || '120',
            blur: blur || '0'
        });

        const url =
            `http://127.0.0.1:3000/api/canvas/bratvideo?${params.toString()}`;

        const result = {
            criador: 'Kyara',
            type: 'video',
            mime: 'video/mp4',
            query,
            url
        };

        setCache(cacheKey, result);
        return { ok: true, ...result };

    } catch (err) {
        return { ok: false, msg: err.message };
    }
}


async function gerarwelcomecard(
    avatar,
    nome,
    texto,
    fundo,
    corMoldura,
    corLinhas,
    glow
) {
    try {
        if (!avatar || !nome) {
            return {
                ok: false,
                msg: 'Avatar e Nome são obrigatórios para o Welcome Card'
            };
        }

        const params = new URLSearchParams({
            avatar: String(avatar),
            nome: String(nome),
            texto: String(texto || ''),
            fundo: String(fundo || ''),
            corMoldura: String(corMoldura || ''),
            corLinhas: String(corLinhas || ''),
            glow: String(glow || 'false')
        });

        const url =
            `http://127.0.0.1:3000/api/canvas/welcome2?${params.toString()}`;

        return {
            ok: true,
            criador: 'Kyara',
            type: 'image',
            mime: 'image/png',
            nome,
            url
        };

    } catch (err) {
        return {
            ok: false,
            msg: err.message
        };
    }
}



export {
    gerarbrat,
    gerarbratvid,
    gerarwelcomecard
};
