import sharp from 'sharp';

const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

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
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
    }

    cache.set(key, {
        val,
        ts: Date.now()
    });
}

async function editarImagem(buffer, type) {
    let imagem = sharp(buffer);

    const metadata = await imagem.metadata();

    if (!metadata.width || !metadata.height) {
        throw new Error('Imagem inválida.');
    }

    switch (type) {

        // Preto e branco
        case 'blackwhite':
            imagem = imagem
                .grayscale()
                .normalize();
            break;

        // Desfoque
        case 'desfoque':
            imagem = imagem.blur(8);
            break;

        // Efeito jornal
        case 'jornal':
            imagem = imagem
                .grayscale()
                .normalize()
                .sharpen({
                    sigma: 1.5,
                    m1: 1,
                    m2: 2
                })
                .modulate({
                    brightness: 1.05,
                    saturation: 0
                });
            break;

        // Efeito cinema
        case 'cinema':
            imagem = imagem
                .modulate({
                    brightness: 0.95,
                    saturation: 0.85
                })
                .linear(
                    [1.08, 1.02, 0.94],
                    [-5, -2, 4]
                )
                .sharpen(1.2);
            break;

        // Wojak / reação
        case 'wojakreaction':
            imagem = imagem
                .resize({
                    width: 1000,
                    height: 1000,
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .sharpen({
                    sigma: 1.5,
                    m1: 1,
                    m2: 2
                })
                .normalize();
            break;

        default:
            throw new Error(`Tipo de edição não suportado: ${type}`);
    }

    return await imagem
        .png({
            compressionLevel: 6
        })
        .toBuffer();
}

async function geraredit({ query, type }) {
    try {
        if (!query || !type) {
            return {
                ok: false,
                msg: '❌ Parâmetros obrigatórios não informados.'
            };
        }

        if (!Buffer.isBuffer(query)) {
            return {
                ok: false,
                msg: '❌ A imagem recebida é inválida.'
            };
        }

        const cacheKey = `edit:${type}:${query.length}:${query.subarray(0, 32).toString('hex')}`;

        const cached = getCached(cacheKey);

        if (cached) {
            console.log(`[EDIT LOCAL] ♻️ Cache: ${type}`);

            return {
                ok: true,
                ...cached,
                cached: true
            };
        }

        console.log(
            `[EDIT LOCAL] 🎨 Processando: ${type} (${query.length} bytes)`
        );

        const buffer = await editarImagem(query, type);

        if (!buffer || buffer.length < 100) {
            return {
                ok: false,
                msg: '❌ Não foi possível gerar a imagem.'
            };
        }

        const response = {
            buffer,
            type: 'image',
            mime: 'image/png'
        };

        setCache(cacheKey, response);

        console.log(
            `[EDIT LOCAL] ✅ Concluído: ${buffer.length} bytes`
        );

        return {
            ok: true,
            ...response
        };

    } catch (err) {
        console.error('[EDIT LOCAL] ❌', err);

        return {
            ok: false,
            msg: `❌ Erro ao processar imagem: ${err.message}`
        };
    }
}

export {
    geraredit
};
