// ============================================================
// 📖 SISTEMA DE INFORMAÇÕES DE COMANDOS — KYARA
// ============================================================

const COMANDOS = {
    discordia: {
        nome: 'Jogo da Discórdia',
        versao: '2.0.0',
        status: '🟢 Ativo',
        categoria: '🎮 Jogos',
        descricao: 'Jogo multiplayer de estratégia baseado em corações, roubo, doação e sobrevivência.',
        uso: '!discordia',
        aliases: ['discordia'],
        comandos: [
            'criar',
            'entrar',
            'sair',
            'iniciar',
            'cor',
            'cores',
            'doar',
            'roubar',
            'pular',
            'status',
            'ranking',
            'logs',
            'regras',
            'finalizar'
        ],
        exemplos: [
            '!discordia criar',
            '!discordia entrar',
            '!discordia iniciar',
            '!discordia cor azul',
            '!discordia doar @usuario 2',
            '!discordia roubar @usuario 2',
            '!discordia ranking'
        ],
        observacoes: [
            '❤️ Cada jogador começa com 7 corações.',
            '👥 A partida suporta de 2 a 12 jogadores.',
            '⚡ Cada ação permite de 1 a 2 corações.',
            '💀 Jogadores com 0 corações são eliminados.',
            '🏆 O último jogador vivo vence.'
        ]
    },

    ping: {
        nome: 'Ping',
        versao: '1.0.0',
        status: '🟢 Ativo',
        categoria: '🛠️ Utilidades',
        descricao: 'Verifica se a Kyara está respondendo.',
        uso: '!ping',
        aliases: ['ping'],
        comandos: [],
        exemplos: [
            '!ping'
        ],
        observacoes: [
            '⚡ Comando simples de teste.',
            '📡 Pode ser usado para verificar a resposta do bot.'
        ]
    },

    menu: {
        nome: 'Menu',
        versao: '1.0.0',
        status: '🟢 Ativo',
        categoria: '📚 Sistema',
        descricao: 'Exibe o menu principal de comandos da Kyara.',
        uso: '!menu',
        aliases: ['menu', 'ajuda', 'help'],
        comandos: [],
        exemplos: [
            '!menu',
            '!ajuda'
        ],
        observacoes: [
            '📚 Mostra os comandos disponíveis.'
        ]
    },

    atualizacoes: {
        nome: 'Atualizações',
        versao: '1.0.0',
        status: '🟢 Ativo',
        categoria: '📋 Sistema',
        descricao: 'Mostra as atualizações recentes da Kyara.',
        uso: '!atualizacoes',
        aliases: ['atualizacoes', 'updates', 'update'],
        comandos: [],
        exemplos: [
            '!atualizacoes',
            '!updates'
        ],
        observacoes: [
            '📋 Mostra o histórico recente de alterações.'
        ]
    },

    'comando-info': {
        nome: 'Informações de Comandos',
        versao: '1.0.0',
        status: '🟢 Ativo',
        categoria: '📖 Sistema',
        descricao: 'Mostra informações detalhadas sobre um comando.',
        uso: '!comando info <comando>',
        aliases: ['comandoinfo', 'cmdinfo'],
        comandos: [],
        exemplos: [
            '!comando info discordia',
            '!comando info ping',
            '!comando info menu'
        ],
        observacoes: [
            '📖 Mostra descrição, versão, uso e exemplos.',
            '🔎 O comando pode ser pesquisado pelo nome ou alias.'
        ]
    }
};

// ============================================================
// NORMALIZAÇÃO
// ============================================================

function normalizar(texto) {
    return String(texto || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '');
}

// ============================================================
// LOCALIZAR COMANDO
// ============================================================

export function obterInfoComando(nome) {
    const procurado = normalizar(nome);

    if (!procurado) {
        return null;
    }

    for (const [chave, dados] of Object.entries(COMANDOS)) {
        if (normalizar(chave) === procurado) {
            return {
                chave,
                ...dados
            };
        }

        if (
            Array.isArray(dados.aliases) &&
            dados.aliases.some(alias => normalizar(alias) === procurado)
        ) {
            return {
                chave,
                ...dados
            };
        }
    }

    return null;
}

// ============================================================
// GERAR INFORMAÇÕES
// ============================================================

export function gerarInfoComando(nome, prefixo = '!') {
    const comando = obterInfoComando(nome);

    if (!comando) {
        return {
            encontrado: false,
            texto:
                `❌ Comando não encontrado: ${nome}\n\n` +
                `💡 Exemplo:\n` +
                `${prefixo}comando info discordia`
        };
    }

    let texto = '';

    texto += `╭━━━〔 📖 COMANDO 〕━━━╮\n`;
    texto += `┃ 🎮 ${comando.nome}\n`;
    texto += `┃ 📦 Versão: ${comando.versao}\n`;
    texto += `┃ ${comando.status}\n`;
    texto += `┃ ${comando.categoria}\n`;
    texto += `╰━━━━━━━━━━━━━━━━━━╯\n\n`;

    texto += `📝 DESCRIÇÃO\n`;
    texto += `${comando.descricao}\n\n`;

    texto += `⚡ USO\n`;
    texto += `${comando.uso.replace(/^!/, prefixo)}\n\n`;

    if (comando.aliases?.length) {
        texto += `🔀 ALIASES\n`;
        texto += comando.aliases.map(alias => `${prefixo}${alias}`).join(' • ');
        texto += '\n\n';
    }

    if (comando.comandos?.length) {
        texto += `🎮 AÇÕES DISPONÍVEIS\n`;

        for (const acao of comando.comandos) {
            texto += `• ${prefixo}${comando.chave} ${acao}\n`;
        }

        texto += '\n';
    }

    if (comando.exemplos?.length) {
        texto += `💡 EXEMPLOS\n`;

        for (const exemplo of comando.exemplos) {
            texto += `${exemplo.replace(/^!/, prefixo)}\n`;
        }

        texto += '\n';
    }

    if (comando.observacoes?.length) {
        texto += `📌 INFORMAÇÕES\n`;

        for (const observacao of comando.observacoes) {
            texto += `${observacao}\n`;
        }

        texto += '\n';
    }

    texto += `━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `🤖 Kyara • Sistema de informações`;

    return {
        encontrado: true,
        comando,
        texto
    };
}

// ============================================================
// LISTAR COMANDOS CADASTRADOS
// ============================================================

export function listarComandosInfo(prefixo = '!') {
    let texto = '';

    texto += `╭━━━〔 📚 COMANDOS CADASTRADOS 〕━━━╮\n`;
    texto += `┃ 🤖 Kyara\n`;
    texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

    for (const [chave, comando] of Object.entries(COMANDOS)) {
        texto += `• ${prefixo}${chave} — ${comando.nome}\n`;
    }

    texto += `\n💡 Use:\n`;
    texto += `${prefixo}comando info <comando>`;

    return texto;
}

// ============================================================
// EXPORTAÇÃO
// ============================================================

export default {
    obterInfoComando,
    gerarInfoComando,
    listarComandosInfo
};
