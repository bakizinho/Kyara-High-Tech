import sharp from 'sharp';

function escapar(texto) {
    return String(texto || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function limitar(texto, tamanho = 22) {
    const t = String(texto || '');

    if (t.length <= tamanho) {
        return t;
    }

    return t.slice(0, tamanho - 3) + '...';
}

async function svgParaPng(svg) {
    return await sharp(Buffer.from(svg))
        .png()
        .resize(1000, 500, {
            fit: 'contain'
        })
        .toBuffer();
}

async function gerarLogo({ query, type }) {
    try {
        if (!query) {
            return {
                ok: false,
                msg: 'Digite o texto do logotipo.'
            };
        }

        console.log(
            `[LOGO LOCAL] 🎨 Gerando "${type}" para "${query}"`
        );

        const texto = escapar(limitar(query));

        const svg = `
<svg width="1000" height="500" viewBox="0 0 1000 500"
     xmlns="http://www.w3.org/2000/svg">

    <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#111111"/>
            <stop offset="50%" stop-color="#292929"/>
            <stop offset="100%" stop-color="#050505"/>
        </linearGradient>

        <filter id="shadow">
            <feGaussianBlur stdDeviation="12"/>
        </filter>

        <linearGradient id="text" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#dddddd"/>
            <stop offset="100%" stop-color="#888888"/>
        </linearGradient>
    </defs>

    <rect width="1000" height="500" rx="35" fill="url(#bg)"/>

    <ellipse
        cx="500"
        cy="300"
        rx="360"
        ry="90"
        fill="#000000"
        opacity="0.7"
        filter="url(#shadow)"
    />

    <text
        x="500"
        y="285"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="92"
        font-weight="900"
        fill="#000000"
        opacity="0.8">
        ${texto}
    </text>

    <text
        x="500"
        y="270"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="92"
        font-weight="900"
        fill="url(#text)"
        stroke="#000000"
        stroke-width="4"
        paint-order="stroke">
        ${texto}
    </text>

    <text
        x="500"
        y="370"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="28"
        fill="#aaaaaa"
        letter-spacing="8">
        ${escapar(String(type || 'KYARA').toUpperCase())}
    </text>

</svg>`;

        const buffer = await svgParaPng(svg);

        return {
            ok: true,
            criador: 'Kyara',
            type: 'image',
            mime: 'image/png',
            buffer
        };

    } catch (err) {
        console.error('[LOGO LOCAL] ❌', err);

        return {
            ok: false,
            msg: `Erro ao gerar logotipo: ${err.message}`
        };
    }
}

async function gerarLogo2({ query, query2, type }) {
    try {
        if (!query || !query2) {
            return {
                ok: false,
                msg: 'Digite os dois textos do logotipo.'
            };
        }

        console.log(
            `[LOGO2 LOCAL] 🎨 "${query}" + "${query2}"`
        );

        const texto1 = escapar(limitar(query));
        const texto2 = escapar(limitar(query2));

        const svg = `
<svg width="1000" height="500" viewBox="0 0 1000 500"
     xmlns="http://www.w3.org/2000/svg">

    <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#101010"/>
            <stop offset="100%" stop-color="#303030"/>
        </linearGradient>

        <linearGradient id="a" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="100%" stop-color="#888888"/>
        </linearGradient>
    </defs>

    <rect width="1000" height="500" rx="35" fill="url(#bg)"/>

    <text
        x="500"
        y="245"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="78"
        font-weight="900"
        fill="url(#a)"
        stroke="#000"
        stroke-width="5"
        paint-order="stroke">
        ${texto1}
    </text>

    <text
        x="500"
        y="335"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="70"
        font-weight="700"
        fill="#eeeeee"
        stroke="#000"
        stroke-width="4"
        paint-order="stroke">
        ${texto2}
    </text>

    <text
        x="500"
        y="410"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="24"
        fill="#999999"
        letter-spacing="7">
        ${escapar(String(type || 'KYARA').toUpperCase())}
    </text>

</svg>`;

        const buffer = await svgParaPng(svg);

        return {
            ok: true,
            criador: 'Kyara',
            type: 'image',
            mime: 'image/png',
            buffer
        };

    } catch (err) {
        console.error('[LOGO2 LOCAL] ❌', err);

        return {
            ok: false,
            msg: `Erro ao gerar logotipo: ${err.message}`
        };
    }
}

export {
    gerarLogo,
    gerarLogo2
};
