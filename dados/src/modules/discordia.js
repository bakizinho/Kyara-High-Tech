import fs from 'fs';
import path from 'path';

/*
╔══════════════════════════════════════════════╗
║          🎭 JOGO DA DISCÓRDIA              ║
║                KYARA                       ║
║              VERSÃO 2.0.0                  ║
╚══════════════════════════════════════════════╝

Sistema completo:
- Lobby
- 2 a 12 jogadores
- 12 cores
- 7 ❤️ iniciais
- Doação
- Roubo
- Pular turno
- Eliminação
- Vitória
- Rodadas
- Status
- Ranking
- Logs
- Regras
- Changelog / Atualizações
- Proteções contra erros
*/

// ======================================================
// CONFIGURAÇÕES
// ======================================================

const VERSAO_DISCORDIA = '2.0.0';

const CORACOES_INICIAIS = 7;
const MAX_CORACOES_ACAO = 2;
const MIN_JOGADORES = 2;
const MAX_HISTORICO = 50;

const DATABASE_DIR = path.join(
    process.cwd(),
    'dados',
    'database'
);

const DATABASE_FILE = path.join(
    DATABASE_DIR,
    'discordia.json'
);

// ======================================================
// CORES
// ======================================================

const CORES_DISCORDIA = {
    vermelho: '🔴',
    azul: '🔵',
    verde: '🟢',
    amarelo: '🟡',
    roxo: '🟣',
    laranja: '🟠',
    rosa: '🌸',
    preto: '⚫',
    branco: '⚪',
    ciano: '🩵',
    marrom: '🟤',
    dourado: '🌟'
};

const CORES_NOMES = Object.keys(CORES_DISCORDIA);
const MAX_JOGADORES = CORES_NOMES.length;

// ======================================================
// ATUALIZAÇÕES / CHANGELOG
// ======================================================

const ATUALIZACOES = [
    {
        versao: '2.0.0',
        data: '30/08/2026',
        tipo: '✨ GRANDE ATUALIZAÇÃO',
        itens: [
            'Sistema completo do Jogo da Discórdia',
            'Sistema de atualizações e changelog',
            'Novo comando !discordia atualizacoes',
            'Novo comando !discordia sobre',
            '12 cores disponíveis',
            'Limite máximo de 12 jogadores',
            'Sistema de rodadas',
            'Sistema de eliminação',
            'Sistema de vitória',
            'Ranking de jogadores',
            'Histórico de até 50 eventos',
            'Proteções contra turnos inválidos',
            'Proteção contra partidas finalizadas',
            'Proteção contra loops infinitos',
            'Tratamento global de erros'
        ]
    },
    {
        versao: '1.0.0',
        data: '30/08/2026',
        tipo: '🚀 LANÇAMENTO',
        itens: [
            'Primeira versão do módulo',
            'Sistema de lobby',
            'Doação de corações',
            'Roubo de corações',
            'Sistema de turnos',
            'Sistema de vitória'
        ]
    }
];

// ======================================================
// BANCO DE DADOS
// ======================================================

function garantirBanco() {
    if (!fs.existsSync(DATABASE_DIR)) {
        fs.mkdirSync(DATABASE_DIR, {
            recursive: true
        });
    }

    if (!fs.existsSync(DATABASE_FILE)) {
        fs.writeFileSync(
            DATABASE_FILE,
            '{}',
            'utf8'
        );
    }
}

function carregarBanco() {
    garantirBanco();

    try {
        const conteudo = fs.readFileSync(
            DATABASE_FILE,
            'utf8'
        );

        if (!conteudo.trim()) {
            return {};
        }

        const dados = JSON.parse(conteudo);

        if (
            typeof dados !== 'object' ||
            dados === null ||
            Array.isArray(dados)
        ) {
            return {};
        }

        return dados;
    } catch (error) {
        console.error(
            '[DISCORDIA] Erro ao carregar banco:',
            error
        );

        return {};
    }
}

function salvarBanco(dados) {
    garantirBanco();

    try {
        const temporario =
            `${DATABASE_FILE}.tmp`;

        fs.writeFileSync(
            temporario,
            JSON.stringify(dados, null, 2),
            'utf8'
        );

        fs.renameSync(
            temporario,
            DATABASE_FILE
        );

        return true;
    } catch (error) {
        console.error(
            '[DISCORDIA] Erro ao salvar banco:',
            error
        );

        return false;
    }
}

function obterPartida(jid) {
    if (!jid) {
        return null;
    }

    const banco = carregarBanco();

    return banco[jid] || null;
}

function salvarPartida(jid, partida) {
    if (!jid || !partida) {
        return false;
    }

    const banco = carregarBanco();

    banco[jid] = partida;

    return salvarBanco(banco);
}

function apagarPartida(jid) {
    if (!jid) {
        return false;
    }

    const banco = carregarBanco();

    delete banco[jid];

    return salvarBanco(banco);
}

// ======================================================
// UTILIDADES
// ======================================================

function numeroJogador(jid) {
    return String(jid || '')
        .replace('@s.whatsapp.net', '')
        .replace('@lid', '')
        .replace('@g.us', '');
}

function mencionar(jid) {
    if (!jid) {
        return '@jogador';
    }

    return `@${numeroJogador(jid)}`;
}

function coracoes(qtd) {
    const numero = Math.max(
        0,
        Number(qtd) || 0
    );

    if (numero > 10) {
        return `❤️×${numero}`;
    }

    return '❤️'.repeat(numero);
}

function normalizarTexto(texto) {
    return String(texto || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function obterCorJogador(jogador) {
    if (
        jogador &&
        jogador.cor &&
        CORES_DISCORDIA[jogador.cor]
    ) {
        return jogador.cor;
    }

    return 'azul';
}

function emojiCorJogador(jogador) {
    const cor = obterCorJogador(jogador);

    return CORES_DISCORDIA[cor] || '🔵';
}

function listarCores() {
    return CORES_NOMES
        .map(
            cor =>
                `${CORES_DISCORDIA[cor]} ${cor}`
        )
        .join('\n');
}

function registrarHistorico(partida, evento) {
    if (!partida) {
        return;
    }

    if (!Array.isArray(partida.historico)) {
        partida.historico = [];
    }

    partida.historico.push({
        ...evento,
        timestamp: Date.now()
    });

    if (
        partida.historico.length >
        MAX_HISTORICO
    ) {
        partida.historico =
            partida.historico.slice(
                -MAX_HISTORICO
            );
    }
}

function obterJogadoresVivos(partida) {
    if (
        !partida ||
        !Array.isArray(partida.ordem)
    ) {
        return [];
    }

    return partida.ordem.filter(id => {
        const jogador =
            partida.jogadores?.[id];

        return (
            jogador &&
            !jogador.eliminado &&
            Number(jogador.coracoes) > 0
        );
    });
}

function obterTurnoAtual(partida) {
    if (
        !partida ||
        !Array.isArray(partida.ordem) ||
        partida.ordem.length === 0
    ) {
        return null;
    }

    const vivos =
        obterJogadoresVivos(partida);

    if (!vivos.length) {
        return null;
    }

    if (
        !Number.isInteger(partida.turno) ||
        partida.turno < 0
    ) {
        partida.turno = 0;
    }

    return partida.ordem[partida.turno] || null;
}

// ======================================================
// AVANÇAR TURNO
// ======================================================

function avancarTurno(partida) {
    if (
        !partida ||
        partida.status !== 'ativo'
    ) {
        return null;
    }

    const vivos =
        obterJogadoresVivos(partida);

    if (vivos.length <= 1) {
        return verificarVitoria(partida);
    }

    const ordem = partida.ordem;

    if (!ordem.length) {
        return null;
    }

    const turnoAnterior =
        Number.isInteger(partida.turno)
            ? partida.turno
            : 0;

    for (
        let tentativa = 1;
        tentativa <= ordem.length;
        tentativa++
    ) {
        const proximoIndice =
            (
                turnoAnterior +
                tentativa
            ) % ordem.length;

        const proximoId =
            ordem[proximoIndice];

        const jogador =
            partida.jogadores?.[proximoId];

        if (
            jogador &&
            !jogador.eliminado &&
            jogador.coracoes > 0
        ) {
            if (proximoIndice === 0) {
                partida.rodada =
                    Number(partida.rodada || 1) + 1;
            }

            partida.turno = proximoIndice;

            return proximoId;
        }
    }

    return null;
}

// ======================================================
// VITÓRIA
// ======================================================

function verificarVitoria(partida) {
    if (!partida) {
        return null;
    }

    const vivos =
        obterJogadoresVivos(partida);

    if (vivos.length === 1) {
        partida.status = 'finalizado';

        registrarHistorico(partida, {
            tipo: 'vitoria',
            vencedor: vivos[0]
        });

        return vivos[0];
    }

    return null;
}

// ======================================================
// FRASES
// ======================================================

const FRASES = {
    roubo: [
        (j, a, q) =>
            `💔 ${j} roubou ${q} ❤️ de ${a}!`,

        (j, a, q) =>
            `🗡️ ${j} atacou ${a} e levou ${q} ❤️!`,

        (j, a, q) =>
            `😈 ${j} foi cruel e roubou ${q} ❤️ de ${a}!`,

        (j, a, q) =>
            `🔥 ${j} meteu a mão e pegou ${q} ❤️ de ${a}!`
    ],

    doacao: [
        (j, a, q) =>
            `❤️ ${j} doou ${q} ❤️ para ${a}!`,

        (j, a, q) =>
            `🥰 ${j} foi generoso e deu ${q} ❤️ para ${a}!`,

        (j, a, q) =>
            `💝 ${j} presenteou ${a} com ${q} ❤️!`,

        (j, a, q) =>
            `✨ ${j} compartilhou ${q} ❤️ com ${a}!`
    ],

    eliminado: [
        a =>
            `💀 ${a} foi ELIMINADO!`,

        a =>
            `☠️ ${a} foi ELIMINADO!`,

        a =>
            `🪦 ${a} caiu! ELIMINADO!`,

        a =>
            `⚰️ ${a} perdeu todos os corações! ELIMINADO!`
    ],

    vitoria: [
        v =>
            `🏆 ${v} VENCEU o Jogo da Discórdia!`,

        v =>
            `👑 ${v} é o grande CAMPEÃO!`,

        v =>
            `🎉 ${v} sobreviveu e VENCEU!`
    ]
};

function fraseAleatoria(tipo, ...args) {
    const opcoes = FRASES[tipo];

    if (
        !Array.isArray(opcoes) ||
        !opcoes.length
    ) {
        return '';
    }

    const indice =
        Math.floor(
            Math.random() * opcoes.length
        );

    return opcoes[indice](...args);
}

// ======================================================
// CRIAR
// ======================================================

export function criarPartida(jid, criador) {
    if (!jid || !criador) {
        return {
            erro: true,
            mensagem:
                '❌ Não foi possível identificar a partida.'
        };
    }

    if (obterPartida(jid)) {
        return {
            erro: true,
            mensagem:
                '⚠️ Já existe um Jogo da Discórdia neste grupo.'
        };
    }

    const partida = {
        versao: VERSAO_DISCORDIA,
        status: 'lobby',
        criador,
        turno: 0,
        rodada: 1,
        ordem: [criador],

        jogadores: {
            [criador]: {
                id: criador,
                coracoes: CORACOES_INICIAIS,
                cor: 'azul',
                eliminado: false
            }
        },

        historico: [],
        criadaEm: Date.now()
    };

    registrarHistorico(partida, {
        tipo: 'criacao',
        jogador: criador
    });

    salvarPartida(jid, partida);

    return {
        erro: false,
        partida
    };
}

// ======================================================
// ENTRAR
// ======================================================

export function entrarPartida(jid, jogador) {
    const partida = obterPartida(jid);

    if (!partida) {
        return {
            erro: true,
            mensagem:
                '❌ Não existe uma partida.\n\n' +
                'Use: !discordia criar'
        };
    }

    if (partida.status !== 'lobby') {
        return {
            erro: true,
            mensagem:
                '❌ A partida já começou.'
        };
    }

    if (partida.jogadores?.[jogador]) {
        return {
            erro: true,
            mensagem:
                '⚠️ Você já está na partida.'
        };
    }

    if (
        partida.ordem.length >=
        MAX_JOGADORES
    ) {
        return {
            erro: true,
            mensagem:
                `❌ Limite máximo de ${MAX_JOGADORES} jogadores atingido.`
        };
    }

    const coresUsadas =
        Object.values(partida.jogadores)
            .map(j => j.cor)
            .filter(Boolean);

    const corDisponivel =
        CORES_NOMES.find(
            cor =>
                !coresUsadas.includes(cor)
        );

    if (!corDisponivel) {
        return {
            erro: true,
            mensagem:
                '❌ Não há mais cores disponíveis.'
        };
    }

    partida.jogadores[jogador] = {
        id: jogador,
        coracoes: CORACOES_INICIAIS,
        cor: corDisponivel,
        eliminado: false
    };

    partida.ordem.push(jogador);

    registrarHistorico(partida, {
        tipo: 'entrada',
        jogador
    });

    salvarPartida(jid, partida);

    return {
        erro: false,
        partida
    };
}

// ======================================================
// SAIR
// ======================================================

export function sairPartida(jid, jogador) {
    const partida = obterPartida(jid);

    if (!partida) {
        return {
            erro: true,
            mensagem:
                '❌ Não existe uma partida.'
        };
    }

    if (partida.status !== 'lobby') {
        return {
            erro: true,
            mensagem:
                '❌ Não é possível sair depois que o jogo começou.'
        };
    }

    if (!partida.jogadores?.[jogador]) {
        return {
            erro: true,
            mensagem:
                '❌ Você não está na partida.'
        };
    }

    if (partida.criador === jogador) {
        apagarPartida(jid);

        return {
            erro: false,
            mensagem:
                '🛑 O criador cancelou a partida.'
        };
    }

    delete partida.jogadores[jogador];

    partida.ordem =
        partida.ordem.filter(
            id => id !== jogador
        );

    registrarHistorico(partida, {
        tipo: 'saida',
        jogador
    });

    salvarPartida(jid, partida);

    return {
        erro: false,
        mensagem:
            '👋 Você saiu da partida.'
    };
}

// ======================================================
// ESCOLHER COR
// ======================================================

export function escolherCor(
    jid,
    jogador,
    cor
) {
    const partida = obterPartida(jid);

    if (!partida) {
        return {
            erro: true,
            mensagem:
                '❌ Não existe uma partida.'
        };
    }

    if (partida.status !== 'lobby') {
        return {
            erro: true,
            mensagem:
                '❌ Você só pode trocar de cor antes do início.'
        };
    }

    if (!partida.jogadores?.[jogador]) {
        return {
            erro: true,
            mensagem:
                '❌ Você não está na partida.\n\n' +
                'Use: !discordia entrar'
        };
    }

    cor = normalizarTexto(cor);

    if (!CORES_DISCORDIA[cor]) {
        return {
            erro: true,
            mensagem:
                '❌ Cor inválida.\n\n' +
                '🎨 CORES DISPONÍVEIS\n\n' +
                listarCores() +
                '\n\nUse:\n' +
                '!discordia cor azul'
        };
    }

    const donoDaCor =
        Object.entries(partida.jogadores)
            .find(
                ([id, dados]) =>
                    id !== jogador &&
                    obterCorJogador(dados) === cor
            );

    if (donoDaCor) {
        return {
            erro: true,
            mensagem:
                `${CORES_DISCORDIA[cor]} A cor ${cor} já está sendo usada por outro jogador.`
        };
    }

    partida.jogadores[jogador].cor = cor;

    registrarHistorico(partida, {
        tipo: 'cor',
        jogador,
        cor
    });

    salvarPartida(jid, partida);

    return {
        erro: false,
        partida,
        mensagem:
            `${CORES_DISCORDIA[cor]} Sua cor agora é ${cor}!`
    };
}

// ======================================================
// INICIAR
// ======================================================

export function iniciarPartida(jid, jogador) {
    const partida = obterPartida(jid);

    if (!partida) {
        return {
            erro: true,
            mensagem:
                '❌ Não existe uma partida.'
        };
    }

    if (partida.criador !== jogador) {
        return {
            erro: true,
            mensagem:
                '❌ Somente quem criou a partida pode iniciá-la.'
        };
    }

    if (partida.status !== 'lobby') {
        return {
            erro: true,
            mensagem:
                '⚠️ A partida já foi iniciada.'
        };
    }

    if (
        partida.ordem.length <
        MIN_JOGADORES
    ) {
        return {
            erro: true,
            mensagem:
                `❌ São necessários pelo menos ${MIN_JOGADORES} jogadores para começar.`
        };
    }

    partida.status = 'ativo';
    partida.turno = 0;
    partida.rodada = 1;

    registrarHistorico(partida, {
        tipo: 'inicio'
    });

    salvarPartida(jid, partida);

    return {
        erro: false,
        partida
    };
}

// ======================================================
// VALIDAÇÃO DE AÇÃO
// ======================================================

function validarAcao(
    partida,
    jogador,
    alvo,
    quantidade
) {
    if (!partida) {
        return '❌ Não existe uma partida.';
    }

    if (partida.status !== 'ativo') {
        return '❌ Esta partida não está ativa.';
    }

    if (!partida.jogadores?.[jogador]) {
        return '❌ Você não está na partida.';
    }

    if (!partida.jogadores?.[alvo]) {
        return '❌ O jogador escolhido não está na partida.';
    }

    if (jogador === alvo) {
        return '❌ Você não pode escolher a si mesmo.';
    }

    const player =
        partida.jogadores[jogador];

    const target =
        partida.jogadores[alvo];

    if (player.eliminado) {
        return '❌ Você foi eliminado.';
    }

    if (target.eliminado) {
        return '❌ Esse jogador já foi eliminado.';
    }

    if (
        obterTurnoAtual(partida) !== jogador
    ) {
        return (
            '⏳ Ainda não é o seu turno.\n\n' +
            `🎯 Turno atual: ${mencionar(
                obterTurnoAtual(partida)
            )}`
        );
    }

    if (
        !Number.isInteger(quantidade) ||
        quantidade < 1 ||
        quantidade > MAX_CORACOES_ACAO
    ) {
        return (
            `❌ Você pode usar de 1 a ${MAX_CORACOES_ACAO} ❤️.`
        );
    }

    return null;
}

// ======================================================
// DOAR
// ======================================================

export function doar(
    jid,
    jogador,
    alvo,
    quantidade
) {
    const partida = obterPartida(jid);

    const erro = validarAcao(
        partida,
        jogador,
        alvo,
        quantidade
    );

    if (erro) {
        return {
            erro: true,
            mensagem: erro
        };
    }

    const player =
        partida.jogadores[jogador];

    const target =
        partida.jogadores[alvo];

    if (
        player.coracoes <= quantidade
    ) {
        return {
            erro: true,
            mensagem:
                '❌ Você precisa ficar com pelo menos 1 ❤️ para continuar vivo.'
        };
    }

    player.coracoes -= quantidade;
    target.coracoes += quantidade;

    let eliminado = null;

    if (player.coracoes <= 0) {
        player.coracoes = 0;
        player.eliminado = true;
        eliminado = jogador;
    }

    registrarHistorico(partida, {
        tipo: 'doacao',
        jogador,
        alvo,
        quantidade
    });

    if (eliminado) {
        registrarHistorico(partida, {
            tipo: 'eliminacao',
            jogador: eliminado,
            motivo: 'doacao'
        });
    }

    const vencedor =
        verificarVitoria(partida);

    if (!vencedor) {
        avancarTurno(partida);
    }

    salvarPartida(jid, partida);

    return {
        erro: false,
        partida,
        eliminado,
        vencedor
    };
}

// ======================================================
// ROUBAR
// ======================================================

export function roubar(
    jid,
    jogador,
    alvo,
    quantidade
) {
    const partida = obterPartida(jid);

    const erro = validarAcao(
        partida,
        jogador,
        alvo,
        quantidade
    );

    if (erro) {
        return {
            erro: true,
            mensagem: erro
        };
    }

    const player =
        partida.jogadores[jogador];

    const target =
        partida.jogadores[alvo];

    if (
        target.coracoes < quantidade
    ) {
        return {
            erro: true,
            mensagem:
                `❌ ${mencionar(alvo)} não possui ${quantidade} ❤️.`
        };
    }

    target.coracoes -= quantidade;
    player.coracoes += quantidade;

    let eliminado = null;

    if (target.coracoes <= 0) {
        target.coracoes = 0;
        target.eliminado = true;
        eliminado = alvo;
    }

    registrarHistorico(partida, {
        tipo: 'roubo',
        jogador,
        alvo,
        quantidade
    });

    if (eliminado) {
        registrarHistorico(partida, {
            tipo: 'eliminacao',
            jogador: eliminado,
            motivo: 'roubo'
        });
    }

    const vencedor =
        verificarVitoria(partida);

    if (!vencedor) {
        avancarTurno(partida);
    }

    salvarPartida(jid, partida);

    return {
        erro: false,
        partida,
        eliminado,
        vencedor
    };
}

// ======================================================
// PULAR TURNO
// ======================================================

export function pularTurno(
    jid,
    jogador
) {
    const partida = obterPartida(jid);

    if (!partida) {
        return {
            erro: true,
            mensagem:
                '❌ Não existe uma partida.'
        };
    }

    if (partida.status !== 'ativo') {
        return {
            erro: true,
            mensagem:
                '❌ A partida não está ativa.'
        };
    }

    if (!partida.jogadores?.[jogador]) {
        return {
            erro: true,
            mensagem:
                '❌ Você não está na partida.'
        };
    }

    if (
        partida.jogadores[jogador].eliminado
    ) {
        return {
            erro: true,
            mensagem:
                '❌ Você foi eliminado.'
        };
    }

    if (
        obterTurnoAtual(partida) !== jogador
    ) {
        return {
            erro: true,
            mensagem:
                '⏳ Ainda não é o seu turno.'
        };
    }

    registrarHistorico(partida, {
        tipo: 'pular',
        jogador
    });

    avancarTurno(partida);

    salvarPartida(jid, partida);

    return {
        erro: false,
        partida
    };
}

// ======================================================
// STATUS
// ======================================================

export function gerarStatus(partida) {
    if (!partida) {
        return (
            '❌ Não existe uma partida.'
        );
    }

    const vivos =
        obterJogadoresVivos(partida);

    let texto =
        '🎭「 STATUS — JOGO DA DISCÓRDIA 」🎭\n\n';

    texto +=
        `📦 Versão: ${partida.versao || VERSAO_DISCORDIA}\n`;

    texto +=
        `🔄 Rodada: ${partida.rodada || 1}\n`;

    texto +=
        `👥 Jogadores: ${partida.ordem.length}/${MAX_JOGADORES}\n`;

    texto +=
        `❤️ Vivos: ${vivos.length}\n`;

    texto +=
        `📌 Estado: ${
            partida.status === 'lobby'
                ? '🟡 Lobby'
                : partida.status === 'ativo'
                    ? '🟢 Em andamento'
                    : '🏁 Finalizada'
        }\n\n`;

    texto +=
        '━━━━━━━━━━━━━━━━━━\n\n';

    for (const id of partida.ordem) {
        const jogador =
            partida.jogadores[id];

        if (!jogador) {
            continue;
        }

        const emoji =
            emojiCorJogador(jogador);

        const estado =
            jogador.eliminado
                ? ' 💀 ELIMINADO'
                : '';

        const turno =
            partida.status === 'ativo' &&
            obterTurnoAtual(partida) === id
                ? ' 🎯'
                : '';

        texto +=
            `${emoji} ${mencionar(id)}${turno}\n` +
            `🎨 ${obterCorJogador(jogador)}\n` +
            `❤️ ${coracoes(jogador.coracoes)}${estado}\n\n`;
    }

    if (partida.status === 'ativo') {
        const atual =
            obterTurnoAtual(partida);

        if (atual) {
            texto +=
                '━━━━━━━━━━━━━━━━━━\n' +
                `🎯 Turno: ${mencionar(atual)}\n`;
        }
    }

    return texto;
}

// ======================================================
// RANKING
// ======================================================

export function gerarRanking(partida) {
    if (!partida) {
        return (
            '❌ Não existe uma partida.'
        );
    }

    const jogadores =
        partida.ordem
            .map(id => partida.jogadores[id])
            .filter(Boolean)
            .sort(
                (a, b) =>
                    b.coracoes - a.coracoes
            );

    let texto =
        '🏆「 RANKING — JOGO DA DISCÓRDIA 」🏆\n\n';

    jogadores.forEach(
        (jogador, index) => {
            const posicao =
                index === 0
                    ? '🥇'
                    : index === 1
                        ? '🥈'
                        : index === 2
                            ? '🥉'
                            : `${index + 1}º`;

            const eliminado =
                jogador.eliminado
                    ? ' 💀'
                    : '';

            texto +=
                `${posicao} ${emojiCorJogador(jogador)} ` +
                `${mencionar(jogador.id)}${eliminado}\n` +
                `🎨 ${obterCorJogador(jogador)}\n` +
                `❤️ ${coracoes(jogador.coracoes)}\n\n`;
        }
    );

    return texto;
}

// ======================================================
// LOGS
// ======================================================

export function gerarLogs(
    partida,
    limite = 10
) {
    if (!partida) {
        return (
            '❌ Não existe uma partida.'
        );
    }

    const eventos =
        Array.isArray(partida.historico)
            ? partida.historico.slice(-limite)
            : [];

    if (!eventos.length) {
        return (
            '📜 Nenhum evento registrado ainda.'
        );
    }

    let texto =
        '📜「 HISTÓRICO DA PARTIDA 」📜\n\n';

    for (const evento of eventos) {
        switch (evento.tipo) {
            case 'criacao':
                texto +=
                    `🎭 ${mencionar(evento.jogador)} criou a partida.\n`;
                break;

            case 'inicio':
                texto +=
                    '🔥 Jogo iniciado!\n';
                break;

            case 'entrada':
                texto +=
                    `➕ ${mencionar(evento.jogador)} entrou.\n`;
                break;

            case 'saida':
                texto +=
                    `➖ ${mencionar(evento.jogador)} saiu.\n`;
                break;

            case 'cor':
                texto +=
                    `🎨 ${mencionar(evento.jogador)} escolheu ${evento.cor}.\n`;
                break;

            case 'doacao':
                texto +=
                    `❤️ ${mencionar(evento.jogador)} doou ` +
                    `${evento.quantidade} ❤️ para ` +
                    `${mencionar(evento.alvo)}.\n`;
                break;

            case 'roubo':
                texto +=
                    `💔 ${mencionar(evento.jogador)} roubou ` +
                    `${evento.quantidade} ❤️ de ` +
                    `${mencionar(evento.alvo)}.\n`;
                break;

            case 'pular':
                texto +=
                    `⏭️ ${mencionar(evento.jogador)} pulou o turno.\n`;
                break;

            case 'eliminacao':
                texto +=
                    `💀 ${mencionar(evento.jogador)} foi eliminado.\n`;
                break;

            case 'vitoria':
                texto +=
                    `🏆 ${mencionar(evento.vencedor)} venceu!\n`;
                break;

            default:
                break;
        }
    }

    return texto;
}

// ======================================================
// REGRAS
// ======================================================

export function obterRegras() {
    return (
        'ˏ 𓏧 𓏲「 REGRAS DO JOGO 」𓏲 𓏧࿐\n\n' +

        `❤️ Cada jogador começa com ${CORACOES_INICIAIS} corações.\n\n` +

        '🎯 No seu turno, você pode:\n' +
        `• ❤️ Doar 1 ou ${MAX_CORACOES_ACAO} corações para alguém\n` +
        `• 💔 Roubar 1 ou ${MAX_CORACOES_ACAO} corações de alguém\n` +
        '• ⏭️ Pular o turno\n\n' +

        '💀 Quem chegar a 0 ❤️ é eliminado.\n' +
        '🏆 O último jogador vivo vence.\n\n' +

        `⚠️ Máximo por ação: ${MAX_CORACOES_ACAO} ❤️\n` +
        `👥 Jogadores: ${MIN_JOGADORES} a ${MAX_JOGADORES}\n\n` +

        '━━━━━━━━━━━━━━━━━━\n\n' +

        '⚡ Dica:\n' +
        'Doe para aliados, roube dos rivais e ' +
        'cuidado para não ficar sem corações!'
    );
}

// ======================================================
// CORES
// ======================================================

export function obterCoresDiscordia() {
    return {
        ...CORES_DISCORDIA
    };
}

// ======================================================
// ATUALIZAÇÕES
// ======================================================

export function gerarAtualizacoes(
    limite = 5
) {
    const atualizacoes =
        ATUALIZACOES.slice(0, limite);

    let texto =
        '🛠️「 ATUALIZAÇÕES — DISCORDIA 」🛠️\n\n';

    texto +=
        `📦 Versão atual: ${VERSAO_DISCORDIA}\n\n`;

    for (const atualizacao of atualizacoes) {
        texto +=
            '━━━━━━━━━━━━━━━━━━\n' +
            `📦 v${atualizacao.versao}\n` +
            `📅 ${atualizacao.data}\n` +
            `${atualizacao.tipo}\n\n`;

        for (const item of atualizacao.itens) {
            texto += `• ${item}\n`;
        }

        texto += '\n';
    }

    texto +=
        '━━━━━━━━━━━━━━━━━━\n' +
        '💡 Este é o histórico de atualizações do módulo.';

    return texto;
}

// ======================================================
// SOBRE
// ======================================================

export function gerarSobre() {
    return (
        '🎭「 JOGO DA DISCÓRDIA 」🎭\n\n' +

        `📦 Versão: ${VERSAO_DISCORDIA}\n` +
        '🤖 Sistema: Kyara\n' +
        `👥 Máximo: ${MAX_JOGADORES} jogadores\n` +
        `❤️ Corações iniciais: ${CORACOES_INICIAIS}\n` +
        `⚡ Máximo por ação: ${MAX_CORACOES_ACAO} ❤️\n\n` +

        '🎮 Recursos:\n' +
        '• Doação\n' +
        '• Roubo\n' +
        '• Turnos\n' +
        '• Eliminação\n' +
        '• Ranking\n' +
        '• Logs\n' +
        '• Changelog\n\n' +

        '🛠️ Use:\n' +
        '!discordia atualizacoes'
    );
}

// ======================================================
// FINALIZAR
// ======================================================

export function finalizarPartida(
    jid,
    jogador
) {
    const partida = obterPartida(jid);

    if (!partida) {
        return {
            erro: true,
            mensagem:
                '❌ Não existe uma partida.'
        };
    }

    if (partida.criador !== jogador) {
        return {
            erro: true,
            mensagem:
                '❌ Somente o criador pode finalizar.'
        };
    }

    apagarPartida(jid);

    return {
        erro: false,
        mensagem:
            '🛑 Jogo da Discórdia finalizado.'
    };
}

// ======================================================
// HANDLER PRINCIPAL
// ======================================================

export async function executarDiscordia({
    sock,
    msg,
    args = [],
    jid,
    remetente
}) {
    try {
        if (!jid) {
            jid =
                msg?.key?.remoteJid;
        }

        if (!remetente) {
            remetente =
                msg?.key?.participant ||
                msg?.participant;
        }

        if (
            !jid ||
            !jid.endsWith('@g.us')
        ) {
            return {
                texto:
                    '❌ O Jogo da Discórdia só funciona em grupos.',
                mentions: []
            };
        }

        const comando =
            normalizarTexto(args[0]);

        const mencoes =
            msg?.message
                ?.extendedTextMessage
                ?.contextInfo
                ?.mentionedJid || [];

        const enviar = async (
            texto,
            mentions = []
        ) => {
            if (sock?.sendMessage) {
                await sock.sendMessage(
                    jid,
                    {
                        text: texto,
                        mentions
                    },
                    {
                        quoted: msg
                    }
                );
            }

            return {
                texto,
                mentions
            };
        };

        // ==================================================
        // MENU
        // ==================================================

        if (
            !comando ||
            comando === 'menu' ||
            comando === 'ajuda'
        ) {
            return enviar(
                'ˏ 𓏧 𓏲「 JOGO DA DISCÓRDIA 」𓏲 𓏧࿐\n\n' +

                `❤️ Cada jogador começa com ${CORACOES_INICIAIS} corações.\n\n` +

                '🎮 COMANDOS\n\n' +

                '!discordia criar\n' +
                '!discordia entrar\n' +
                '!discordia iniciar\n\n' +

                '🎨 !discordia cor vermelho\n\n' +

                '❤️ !discordia doar @pessoa 2\n' +
                '💔 !discordia roubar @pessoa 2\n' +
                '⏭️ !discordia pular\n\n' +

                '📊 !discordia status\n' +
                '🏆 !discordia ranking\n' +
                '📜 !discordia logs\n' +
                '📖 !discordia regras\n' +
                '🎨 !discordia cores\n\n' +

                '🛠️ !discordia atualizacoes\n' +
                'ℹ️ !discordia sobre\n\n' +

                '🚪 !discordia sair\n' +
                '🛑 !discordia finalizar\n\n' +

                '━━━━━━━━━━━━━━━━━━\n\n' +

                `⚠️ Máximo por ação: ${MAX_CORACOES_ACAO} ❤️\n` +
                '💀 0 ❤️ = eliminado\n' +
                '🏆 Último jogador vivo = vencedor\n\n' +
                `📦 Versão ${VERSAO_DISCORDIA}`
            );
        }

        // ==================================================
        // ATUALIZAÇÕES
        // ==================================================

        if (
            comando === 'atualizacoes' ||
            comando === 'novidades' ||
            comando === 'changelog'
        ) {
            return enviar(
                gerarAtualizacoes()
            );
        }

        // ==================================================
        // SOBRE
        // ==================================================

        if (
            comando === 'sobre' ||
            comando === 'versao'
        ) {
            return enviar(
                gerarSobre()
            );
        }

        // ==================================================
        // REGRAS
        // ==================================================

        if (comando === 'regras') {
            return enviar(
                obterRegras()
            );
        }

        // ==================================================
        // CORES
        // ==================================================

        if (comando === 'cores') {
            return enviar(
                '🎨「 CORES DISPONÍVEIS 」🎨\n\n' +
                listarCores() +
                '\n\n' +
                'Use:\n' +
                '!discordia cor azul\n\n' +
                '⚠️ Cada cor só pode ser usada por um jogador.\n' +
                `👥 Máximo: ${MAX_JOGADORES} jogadores`
            );
        }

        // ==================================================
        // CRIAR
        // ==================================================

        if (comando === 'criar') {
            const resultado =
                criarPartida(
                    jid,
                    remetente
                );

            if (resultado.erro) {
                return enviar(
                    resultado.mensagem
                );
            }

            return enviar(
                '🎭「 JOGO DA DISCÓRDIA 」🎭\n\n' +

                '🔥 Uma nova partida foi criada!\n\n' +

                '👑 Criador:\n' +
                `${mencionar(remetente)}\n\n` +

                `❤️ Corações iniciais: ${CORACOES_INICIAIS}\n\n` +

                '👥 Para participar:\n' +
                '!discordia entrar\n\n' +

                '🎨 Escolher cor:\n' +
                '!discordia cor vermelho\n\n' +

                '🚀 Depois:\n' +
                '!discordia iniciar',
                [remetente]
            );
        }

        // ==================================================
        // ENTRAR
        // ==================================================

        if (comando === 'entrar') {
            const resultado =
                entrarPartida(
                    jid,
                    remetente
                );

            if (resultado.erro) {
                return enviar(
                    resultado.mensagem
                );
            }

            const jogador =
                resultado.partida
                    .jogadores[remetente];

            return enviar(
                `${emojiCorJogador(jogador)} ${mencionar(remetente)} entrou!\n\n` +

                `❤️ Corações: ${CORACOES_INICIAIS}\n` +

                `🎨 Cor automática: ${jogador.cor}\n\n` +

                `👥 Jogadores: ${resultado.partida.ordem.length}/${MAX_JOGADORES}\n\n` +

                '🎨 Você pode trocar sua cor:\n' +
                '!discordia cor azul\n\n' +

                '🚀 O criador pode iniciar com:\n' +
                '!discordia iniciar',
                [remetente]
            );
        }

        // ==================================================
        // COR
        // ==================================================

        if (comando === 'cor') {
            const corEscolhida =
                normalizarTexto(args[1]);

            if (!corEscolhida) {
                return enviar(
                    '🎨「 CORES DO JOGO 」🎨\n\n' +
                    listarCores() +
                    '\n\nUse:\n' +
                    '!discordia cor vermelho'
                );
            }

            const resultado =
                escolherCor(
                    jid,
                    remetente,
                    corEscolhida
                );

            if (resultado.erro) {
                return enviar(
                    resultado.mensagem
                );
            }

            const jogador =
                resultado.partida
                    .jogadores[remetente];

            return enviar(
                `${emojiCorJogador(jogador)}「 COR ESCOLHIDA 」${emojiCorJogador(jogador)}\n\n` +

                `${mencionar(remetente)}\n\n` +

                'Sua cor agora é:\n' +
                `${emojiCorJogador(jogador)} ${jogador.cor}\n\n` +

                `❤️ Corações: ${jogador.coracoes}`,
                [remetente]
            );
        }

        // ==================================================
        // SAIR
        // ==================================================

        if (comando === 'sair') {
            const resultado =
                sairPartida(
                    jid,
                    remetente
                );

            return enviar(
                resultado.mensagem
            );
        }

        // ==================================================
        // INICIAR
        // ==================================================

        if (comando === 'iniciar') {
            const resultado =
                iniciarPartida(
                    jid,
                    remetente
                );

            if (resultado.erro) {
                return enviar(
                    resultado.mensagem
                );
            }

            const partida =
                resultado.partida;

            const primeiro =
                obterTurnoAtual(partida);

            return enviar(
                '🔥🔥 JOGO INICIADO! 🔥🔥\n\n' +

                `❤️ Todos começam com ${CORACOES_INICIAIS} corações.\n\n` +

                `👥 Jogadores: ${partida.ordem.length}\n\n` +

                '━━━━━━━━━━━━━━━━━━\n\n' +

                '🎯 PRIMEIRO TURNO:\n\n' +

                `👉 ${mencionar(primeiro)}\n\n` +

                'Você pode:\n\n' +

                '❤️ !discordia doar @pessoa 2\n' +
                '💔 !discordia roubar @pessoa 2\n' +
                '⏭️ !discordia pular\n\n' +

                `⚠️ Máximo: ${MAX_CORACOES_ACAO} ❤️`,
                partida.ordem
            );
        }

        // ==================================================
        // PULAR
        // ==================================================

        if (comando === 'pular') {
            const resultado =
                pularTurno(
                    jid,
                    remetente
                );

            if (resultado.erro) {
                return enviar(
                    resultado.mensagem
                );
            }

            const partida =
                resultado.partida;

            const proximo =
                obterTurnoAtual(partida);

            return enviar(
                `⏭️ ${mencionar(remetente)} pulou o turno.\n\n` +

                '━━━━━━━━━━━━━━━━━━\n\n' +

                `🔄 Rodada: ${partida.rodada}\n\n` +

                '🎯 PRÓXIMO TURNO:\n\n' +

                `👉 ${mencionar(proximo)}`,
                [
                    remetente,
                    proximo
                ].filter(Boolean)
            );
        }

        // ==================================================
        // STATUS
        // ==================================================

        if (comando === 'status') {
            const partida =
                obterPartida(jid);

            if (!partida) {
                return enviar(
                    '❌ Não existe uma partida neste grupo.'
                );
            }

            return enviar(
                gerarStatus(partida),
                partida.ordem
            );
        }

        // ==================================================
        // RANKING
        // ==================================================

        if (comando === 'ranking') {
            const partida =
                obterPartida(jid);

            if (!partida) {
                return enviar(
                    '❌ Não existe uma partida neste grupo.'
                );
            }

            return enviar(
                gerarRanking(partida),
                partida.ordem
            );
        }

        // ==================================================
        // LOGS
        // ==================================================

        if (
            comando === 'logs' ||
            comando === 'historico'
        ) {
            const partida =
                obterPartida(jid);

            if (!partida) {
                return enviar(
                    '❌ Não existe uma partida neste grupo.'
                );
            }

            return enviar(
                gerarLogs(partida),
                partida.ordem
            );
        }

        // ==================================================
        // FINALIZAR
        // ==================================================

        if (
            comando === 'finalizar' ||
            comando === 'cancelar'
        ) {
            const resultado =
                finalizarPartida(
                    jid,
                    remetente
                );

            return enviar(
                resultado.mensagem
            );
        }

        // ==================================================
        // DOAR / ROUBAR
        // ==================================================

        if (
            comando === 'doar' ||
            comando === 'roubar'
        ) {
            if (!mencoes.length) {
                return enviar(
                    '❌ Você precisa mencionar alguém.\n\n' +

                    'Exemplo:\n' +
                    `!discordia ${comando} @pessoa 2`
                );
            }

            const alvo =
                mencoes[0];

            const quantidade =
                Number.parseInt(
                    args[2],
                    10
                );

            if (!Number.isInteger(quantidade)) {
                return enviar(
                    '❌ Informe quantos ❤️ deseja usar.\n\n' +

                    'Exemplo:\n' +
                    `!discordia ${comando} @pessoa 2`
                );
            }

            let resultado;

            if (comando === 'doar') {
                resultado =
                    doar(
                        jid,
                        remetente,
                        alvo,
                        quantidade
                    );
            } else {
                resultado =
                    roubar(
                        jid,
                        remetente,
                        alvo,
                        quantidade
                    );
            }

            if (resultado.erro) {
                return enviar(
                    resultado.mensagem
                );
            }

            const partida =
                resultado.partida;

            const jogador =
                partida.jogadores[remetente];

            const jogadorAlvo =
                partida.jogadores[alvo];

            let texto = '';

            // ----------------------------------------------
            // DOAÇÃO
            // ----------------------------------------------

            if (comando === 'doar') {
                const frase =
                    fraseAleatoria(
                        'doacao',
                        mencionar(remetente),
                        mencionar(alvo),
                        quantidade
                    );

                texto =
                    '❤️「 DOAÇÃO 」❤️\n\n' +

                    `${frase}\n\n` +

                    `${emojiCorJogador(jogador)} ${mencionar(remetente)}:\n` +
                    `🎨 ${obterCorJogador(jogador)}\n` +
                    `❤️ ${coracoes(jogador.coracoes)}\n\n` +

                    `${emojiCorJogador(jogadorAlvo)} ${mencionar(alvo)}:\n` +
                    `🎨 ${obterCorJogador(jogadorAlvo)}\n` +
                    `❤️ ${coracoes(jogadorAlvo.coracoes)}`;

                if (resultado.eliminado) {
                    texto +=
                        '\n\n' +
                        fraseAleatoria(
                            'eliminado',
                            mencionar(resultado.eliminado)
                        );
                }
            }

            // ----------------------------------------------
            // ROUBO
            // ----------------------------------------------

            if (comando === 'roubar') {
                const frase =
                    fraseAleatoria(
                        'roubo',
                        mencionar(remetente),
                        mencionar(alvo),
                        quantidade
                    );

                texto =
                    '💔「 ROUBO 」💔\n\n' +

                    `${frase}\n\n` +

                    `${emojiCorJogador(jogador)} ${mencionar(remetente)}:\n` +
                    `🎨 ${obterCorJogador(jogador)}\n` +
                    `❤️ ${coracoes(jogador.coracoes)}\n\n` +

                    `${emojiCorJogador(jogadorAlvo)} ${mencionar(alvo)}:\n` +
                    `🎨 ${obterCorJogador(jogadorAlvo)}\n` +
                    `❤️ ${coracoes(jogadorAlvo.coracoes)}`;

                if (resultado.eliminado) {
                    texto +=
                        '\n\n' +
                        fraseAleatoria(
                            'eliminado',
                            mencionar(resultado.eliminado)
                        );
                }
            }

            // ----------------------------------------------
            // VENCEDOR
            // ----------------------------------------------

            if (resultado.vencedor) {
                const vencedor =
                    partida.jogadores[
                        resultado.vencedor
                    ];

                texto +=
                    '\n\n━━━━━━━━━━━━━━━━━━\n\n' +

                    '🏆🏆🏆 FIM DE JOGO! 🏆🏆🏆\n\n' +

                    `${fraseAleatoria(
                        'vitoria',
                        mencionar(resultado.vencedor)
                    )}\n\n` +

                    `${emojiCorJogador(vencedor)} Cor: ${obterCorJogador(vencedor)}\n` +
                    `❤️ ${coracoes(vencedor.coracoes)}\n` +
                    `🔄 Rodadas: ${partida.rodada || 1}\n\n` +

                    '🎉 PARABÉNS! 🎉';
            } else {
                const proximo =
                    obterTurnoAtual(partida);

                texto +=
                    '\n\n━━━━━━━━━━━━━━━━━━\n\n' +

                    `🔄 Rodada: ${partida.rodada || 1}\n\n` +

                    '🎯 PRÓXIMO TURNO:\n\n' +

                    `👉 ${mencionar(proximo)}`;
            }

            return enviar(
                texto,
                [
                    remetente,
                    alvo,
                    ...(resultado.vencedor
                        ? [resultado.vencedor]
                        : [obterTurnoAtual(partida)]
                    )
                ].filter(Boolean)
            );
        }

        // ==================================================
        // COMANDO DESCONHECIDO
        // ==================================================

        return enviar(
            '❌ Comando desconhecido.\n\n' +
            'Use:\n' +
            '!discordia'
        );

    } catch (error) {
        console.error(
            '❌ [DISCORDIA] Erro:',
            error
        );

        return {
            texto:
                '❌ Ocorreu um erro no Jogo da Discórdia. Tente novamente.',
            mentions: []
        };
    }
}

// ======================================================
// EXPORT DEFAULT
// ======================================================

export default {
    executarDiscordia,
    criarPartida,
    entrarPartida,
    iniciarPartida,
    escolherCor,
    doar,
    roubar,
    pularTurno,
    obterPartida,
    gerarStatus,
    gerarRanking,
    gerarLogs,
    obterRegras,
    finalizarPartida,
    obterCoresDiscordia,
    gerarAtualizacoes,
    gerarSobre
};

