// ============================================================
// 📋 SISTEMA DE ATUALIZAÇÕES — KYARA
// ============================================================

const VERSAO = '11.0.0';

const ATUALIZACOES = [
    {
        versao: '11.0.0',
        data: '25/11/2026',
        titulo: 'Menus mais limpos, comandos e velocidade',
        itens: [
            '🎨 Menu principal, downloads e figurinhas reorganizados, com menos informação repetida.',
            '📥 Novos atalhos no menu: playaudio e playvideo para baixar áudio ou vídeo diretamente.',
            '🎵 Menu de figurinhas atualizado: audiosticker, bratvid, figurante2, sfig e sfiganim.',
            '🧩 Comandos de conversão e personalização reunidos: sticker, st2, sbg, toimg, togif, renomear, rgtake e take.',
            '🏷️ Figurinhas feitas por comandos em grupos passam a identificar o nome do grupo em mensagem separada, sem escrever na arte.',
            '⚡ Conversão WebP e carregamento dos menus otimizados.',
            '📋 Histórico público disponível por atualizacoes ou novidades.'
        ]
    },
    {
        versao: '1.0.0',
        data: '30/08/2026',
        titulo: 'Sistema inicial de atualizações',
        itens: [
            '📋 Criado o comando de atualizações',
            '📦 Sistema organizado por versão',
            '🕐 Registro de data das alterações',
            '📝 Suporte a múltiplas alterações por versão'
        ]
    },
    {
        versao: '2.0.0',
        data: '30/08/2026',
        titulo: 'Jogo da Discórdia',
        itens: [
            '🎭 Novo Jogo da Discórdia',
            '❤️ Sistema de corações',
            '🎨 Sistema de cores dos jogadores',
            '👥 Suporte para até 12 jogadores',
            '💔 Sistema de roubo',
            '❤️ Sistema de doação',
            '⏭️ Sistema de pular turno',
            '🏆 Sistema de vitória',
            '💀 Sistema de eliminação',
            '📊 Ranking da partida',
            '📜 Histórico de ações',
            '📖 Sistema de regras',
            '🔄 Sistema de rodadas',
            '🛡️ Proteções contra erros e partidas finalizadas'
        ]
    }
];

// ============================================================
// UTILIDADES
// ============================================================

function formatarAtualizacao(atualizacao) {
    let texto = '';

    texto += `╭━━━〔 🚀 ATUALIZAÇÃO ${atualizacao.versao} 〕━━━╮\n`;
    texto += `┃ 📅 ${atualizacao.data}\n`;
    texto += `┃ 📝 ${atualizacao.titulo}\n`;
    texto += `┃\n`;

    for (const item of atualizacao.itens) {
        texto += `┃ ${item}\n`;
    }

    texto += `╰━━━━━━━━━━━━━━━━━━━━━━╯`;

    return texto;
}

// ============================================================
// TODAS AS ATUALIZAÇÕES
// ============================================================

export function gerarAtualizacoes(limite = 5, prefixo = '!') {
    const lista = ATUALIZACOES.slice(0, limite);

    let texto = '';

    texto += `╭━━━〔 📋 ATUALIZAÇÕES KYARA 〕━━━╮\n`;
    texto += `┃ 🤖 Versão atual: ${VERSAO}\n`;
    texto += `┃ 📦 Histórico de atualizações\n`;
    texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

    for (const atualizacao of lista) {
        texto += formatarAtualizacao(atualizacao);
        texto += '\n\n';
    }

    texto += `💡 Use ${prefixo}menu para abrir as categorias e consultar os comandos.`;

    return texto.trim();
}

// ============================================================
// ATUALIZAÇÃO MAIS RECENTE
// ============================================================

export function gerarUltimaAtualizacao() {
    if (!ATUALIZACOES.length) {
        return '📋 Nenhuma atualização registrada.';
    }

    return formatarAtualizacao(ATUALIZACOES[0]);
}

// ============================================================
// ADICIONAR ATUALIZAÇÃO EM MEMÓRIA
// ============================================================

export function adicionarAtualizacao({
    versao,
    data,
    titulo,
    itens = []
}) {
    if (!versao || !titulo) {
        return false;
    }

    ATUALIZACOES.unshift({
        versao: String(versao),
        data: String(data || new Date().toLocaleDateString('pt-BR')),
        titulo: String(titulo),
        itens: Array.isArray(itens) ? itens.map(String) : []
    });

    return true;
}

// ============================================================
// INFORMAÇÕES
// ============================================================

export function obterVersaoKyara() {
    return VERSAO;
}

export function obterAtualizacoes() {
    return ATUALIZACOES.map(item => ({
        ...item,
        itens: [...item.itens]
    }));
}

// ============================================================
// EXPORTAÇÃO
// ============================================================

export default {
    gerarAtualizacoes,
    gerarUltimaAtualizacao,
    adicionarAtualizacao,
    obterVersaoKyara,
    obterAtualizacoes
};
