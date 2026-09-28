import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_DIR = path.join(process.cwd(), 'dados', 'database');
const DB_FILE = path.join(DB_DIR, 'quizcasal.json');

const TOTAL = 10;
const LETRAS = ['A', 'B', 'C', 'D'];

function garantirDB() {
  fs.mkdirSync(DB_DIR, { recursive: true });

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(
        {
          sessoes: {}
        },
        null,
        2
      )
    );
  }
}

function lerDB() {
  garantirDB();

  try {
    const data = JSON.parse(
      fs.readFileSync(DB_FILE, 'utf8')
    );

    if (!data || typeof data !== 'object') {
      return { sessoes: {} };
    }

    if (!data.sessoes || typeof data.sessoes !== 'object') {
      data.sessoes = {};
    }

    return data;
  } catch {
    return { sessoes: {} };
  }
}

function salvarDB(data) {
  garantirDB();

  const tmp = `${DB_FILE}.tmp`;

  fs.writeFileSync(
    tmp,
    JSON.stringify(data, null, 2)
  );

  fs.renameSync(tmp, DB_FILE);
}

function limparJid(jid) {
  return String(jid || '').trim();
}

function mesmoJid(a, b) {
  return limparJid(a) === limparJid(b);
}

function idAleatorio(tamanho = 5) {
  return crypto
    .randomBytes(tamanho)
    .toString('hex')
    .toUpperCase();
}

function embaralhar(array) {
  const lista = [...array];

  for (let i = lista.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }

  return lista;
}

/*
 * ============================================================
 * PERGUNTAS PRONTAS
 * ============================================================
 *
 * O dono NÃO cria as perguntas.
 *
 * O bot apresenta estas perguntas uma por uma.
 *
 * O dono responde somente:
 *
 *   Sushi
 *   Café
 *   Castanho
 *
 * etc.
 *
 * Se a resposta já existir nas opções, ela é marcada.
 * Se não existir, ela entra como resposta correta e
 * uma das alternativas antigas é substituída.
 */

const PERGUNTAS_BASE = [
  {
    pergunta: 'Qual é a minha comida favorita?',
    opcoes: [
      'Sushi',
      'Hambúrguer',
      'Pizza',
      'Amendoim'
    ]
  },

  {
    pergunta: 'Qual é a minha bebida favorita?',
    opcoes: [
      'Coca-Cola',
      'Suco',
      'Café',
      'Milk-shake'
    ]
  },

  {
    pergunta: 'Qual é a cor do meu cabelo?',
    opcoes: [
      'Preto',
      'Loiro',
      'Castanho',
      'Ruivo'
    ]
  },

  {
    pergunta: 'Qual é o meu animal favorito?',
    opcoes: [
      'Cachorro',
      'Gato',
      'Lobo',
      'Coelho'
    ]
  },

  {
    pergunta: 'Qual é a minha cor favorita?',
    opcoes: [
      'Azul',
      'Preto',
      'Roxo',
      'Vermelho'
    ]
  },

  {
    pergunta: 'Qual é o meu jogo favorito?',
    opcoes: [
      'Minecraft',
      'Free Fire',
      'Roblox',
      'Fortnite'
    ]
  },

  {
    pergunta: 'Qual é o meu filme favorito?',
    opcoes: [
      'Vingadores',
      'Homem-Aranha',
      'Dragon Ball',
      'Batman'
    ]
  },

  {
    pergunta: 'Qual é o meu estilo de música favorito?',
    opcoes: [
      'Rap',
      'Rock',
      'Funk',
      'Pop'
    ]
  },

  {
    pergunta: 'Qual é o meu lugar favorito?',
    opcoes: [
      'Praia',
      'Casa',
      'Parque',
      'Cinema'
    ]
  },

  {
    pergunta: 'Qual é a coisa que eu mais gosto?',
    opcoes: [
      'Dormir',
      'Jogar',
      'Conversar',
      'Assistir filmes'
    ]
  }
];

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function prepararPerguntas() {
  return PERGUNTAS_BASE.map((base, indice) => ({
    id: `Q${idAleatorio(4)}`,
    numero: indice + 1,
    pergunta: base.pergunta,

    opcoesBase: [...base.opcoes],

    opcoes: [],
    correta: null,

    respostaDono: null,
    respostaParceiro: null,

    escolhida: null,
    respondida: false
  }));
}

/*
 * Procura a resposta do dono nas quatro alternativas.
 *
 * Exemplo:
 *
 * opções:
 * Sushi
 * Hambúrguer
 * Pizza
 * Amendoim
 *
 * dono:
 * Amendoim
 *
 * resultado:
 * Amendoim = correta
 */
function encontrarOpcao(pergunta, resposta) {
  const alvo = normalizar(resposta);

  if (!alvo) return -1;

  return pergunta.opcoesBase.findIndex(
    opcao => normalizar(opcao) === alvo
  );
}

/*
 * Se o dono responder algo que não existe nas opções,
 * a resposta dele passa a ser a correta.
 *
 * Mantemos 4 opções:
 * - resposta do dono
 * - 3 alternativas
 */
function montarOpcoes(pergunta, respostaDono) {
  const resposta = String(respostaDono || '').trim();

  if (!resposta) {
    throw new Error('Resposta vazia.');
  }

  const indiceExistente =
    encontrarOpcao(pergunta, resposta);

  let opcoes;

  if (indiceExistente >= 0) {
    opcoes = [...pergunta.opcoesBase];
  } else {
    opcoes = [
      resposta,
      ...pergunta.opcoesBase
        .filter(
          opcao =>
            normalizar(opcao) !== normalizar(resposta)
        )
        .slice(0, 3)
    ];
  }

  opcoes = embaralhar(opcoes).slice(0, 4);

  pergunta.opcoes = opcoes.map(
    (texto, indice) => ({
      id: `O${idAleatorio(4)}${indice}`,
      texto,
      correta:
        normalizar(texto) ===
        normalizar(resposta)
    })
  );

  pergunta.correta =
    pergunta.opcoes.find(opcao => opcao.correta)?.id ||
    null;

  pergunta.respostaDono = resposta;

  return pergunta;
}

/*
 * ============================================================
 * JID / @USUÁRIO
 * ============================================================
 *
 * NÃO usa LID.
 *
 * O participante é sempre armazenado como JID:
 *
 * 5511999999999@s.whatsapp.net
 *
 * Quando for mostrado:
 *
 * @5511999999999
 */

function numeroDoJid(jid) {
  return limparJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
}

function mencionar(jid) {
  const numero = numeroDoJid(jid);

  return numero
    ? `@${numero}`
    : '@usuário';
}

function obterMencionado(
  mentionedJids = [],
  texto = ''
) {
  if (
    Array.isArray(mentionedJids) &&
    mentionedJids.length
  ) {
    return limparJid(mentionedJids[0]);
  }

  const match = String(texto || '').match(
    /@(\d{8,15})/
  );

  if (match) {
    return `${match[1]}@s.whatsapp.net`;
  }

  return '';
}

/*
 * ============================================================
 * SESSÃO
 * ============================================================
 */

function criarSessao(dono, parceiro, prefixo = '/') {
  return {
    id: idAleatorio(6),

    dono: limparJid(dono),
    parceiro: limparJid(parceiro),

    fase: 'CONFIGURANDO',

    indiceConfiguracao: 0,

    indiceQuiz: 0,

    perguntas: prepararPerguntas(),

    acertos: 0,
    erros: 0,

    respostas: {},

    mensagemAtualDono: null,
    mensagemAtualParceiro: null,

    prefixo,

    criadaEm: Date.now(),
    atualizadaEm: Date.now()
  };
}

function salvarSessao(sessao) {
  const db = lerDB();

  sessao.atualizadaEm = Date.now();

  db.sessoes[sessao.id] = sessao;

  salvarDB(db);
}

function encontrarSessaoDoDono(dono) {
  const db = lerDB();

  return Object.values(db.sessoes).find(
    sessao =>
      sessao &&
      sessao.fase !== 'FINALIZADO' &&
      mesmoJid(sessao.dono, dono)
  );
}

function encontrarSessao(id) {
  const db = lerDB();

  return db.sessoes[
    String(id || '').trim()
  ];
}

/*
 * ============================================================
 * ENVIO DE TEXTO
 * ============================================================
 */

async function enviarTexto(
  nazu,
  jid,
  texto,
  mentions = []
) {
  const mensagem = {
    text: String(texto || '')
  };

  if (
    Array.isArray(mentions) &&
    mentions.length
  ) {
    mensagem.mentions = mentions;
  }

  return nazu.sendMessage(
    jid,
    mensagem
  );
}

/*
 * ============================================================
 * NATIVE FLOW
 * ============================================================
 */

async function enviarFlow(
  nazu,
  jid,
  texto,
  botoes,
  rodape = '💕 QUIZ DO CASAL'
) {
  const lista =
    Array.isArray(botoes)
      ? botoes.filter(Boolean).slice(0, 6)
      : [];

  const mensagem = {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadataVersion: 2,
          deviceListMetadata: {}
        },

        interactiveMessage: {
          body: {
            text: String(texto || '')
          },

          footer: {
            text: String(
              rodape || ''
            )
          },

          nativeFlowMessage: {
            buttons: lista.map(botao => ({
              name: 'quick_reply',

              buttonParamsJson:
                JSON.stringify({
                  display_text:
                    String(
                      botao.texto
                    ),

                  id:
                    String(
                      botao.id
                    )
                })
            }))
          }
        }
      }
    }
  };

  const messageId =
    `QZ${idAleatorio(8)}`;

  await nazu.relayMessage(
    jid,
    mensagem,
    {
      messageId
    }
  );

  return {
    key: {
      remoteJid: jid,
      fromMe: true,
      id: messageId
    }
  };
}

/*
 * ============================================================
 * APAGAR MENSAGEM ANTERIOR
 *
 * Isso cria o efeito visual de "mesma mensagem"
 * mostrado na imagem.
 * ============================================================
 */

async function apagarMensagem(
  nazu,
  jid,
  key
) {
  if (!key) return;

  try {
    await nazu.sendMessage(
      jid,
      {
        delete: key
      }
    );
  } catch {}
}

/*
 * ============================================================
 * BOTÕES DAS ALTERNATIVAS
 * ============================================================
 */

function criarBotoesOpcoes(
  sessao,
  pergunta,
  selecionada = null,
  bloqueada = false
) {
  return pergunta.opcoes.map(
    (opcao, indice) => {
      const marcada =
        selecionada === opcao.id;

      const texto =
        marcada
          ? `🟣 ${LETRAS[indice]} • ${opcao.texto} ${opcao.correta ? '✅' : '❌'}`
          : `⚪ ${LETRAS[indice]} • ${opcao.texto}`;

      return {
        texto,

        id: [
          'quizcasal',
          sessao.id,
          'opcao',
          sessao.indiceQuiz,
          bloqueada
            ? 'bloqueada'
            : 'selecionar',
          opcao.id
        ].join(' ')
      };
    }
  );
}

/*
 * ============================================================
 * BOTÃO AVANÇAR
 * ============================================================
 */

function criarBotaoAvancar(sessao) {
  const ultima =
    sessao.indiceQuiz >=
    sessao.perguntas.length - 1;

  return {
    texto:
      ultima
        ? '✅ Finalizar'
        : '➡️ Avançar',

    id: [
      'quizcasal',
      sessao.id,
      'avancar',
      sessao.indiceQuiz
    ].join(' ')
  };
}

/*
 * ============================================================
 * MOSTRAR PERGUNTA AO DONO
 *
 * Aqui é onde o dono simplesmente responde:
 *
 * "Amendoim"
 *
 * Não precisa criar pergunta.
 * Não precisa informar alternativas.
 * ============================================================
 */

async function mostrarPerguntaDono(
  nazu,
  sessao
) {
  const indice =
    sessao.indiceConfiguracao;

  const pergunta =
    sessao.perguntas[indice];

  if (!pergunta) {
    return iniciarQuizParceiro(
      nazu,
      sessao
    );
  }

  const botoes =
    pergunta.opcoesBase.map(
      (opcao, i) => ({
        texto:
          (
            pergunta.respostaDono &&
            normalizar(
              pergunta.respostaDono
            ) === normalizar(opcao)
          )
            ? '🟣 ' + LETRAS[i] + ' • ' + opcao
            : '⚪ ' + LETRAS[i] + ' • ' + opcao,

        id: [
          'quizcasal',
          sessao.id,
          'dono',
          indice,
          'selecionar',
          i
        ].join(' ')
      })
    );

  botoes.push({
    texto:
      '✍️ Escrever resposta',

    id: [
      'quizcasal',
      sessao.id,
      'dono',
      indice,
      'manual'
    ].join(' ')
  });

  if (pergunta.configurada) {
    botoes.push({
      texto:
        indice >= TOTAL - 1
          ? '✅ Finalizar'
          : '➡️ Próximo',

      id: [
        'quizcasal',
        sessao.id,
        'dono',
        indice,
        'avancar'
      ].join(' ')
    });
  }

  const texto =
    '💕 *QUIZ DO CASAL*\n\n' +
    '📋 *Pergunta ' +
    (indice + 1) +
    '/' +
    TOTAL +
    '*\n\n' +
    '❓ *' +
    pergunta.pergunta +
    '*\n\n' +
    '👆 Marque a alternativa correta para você.\n' +
    'Se nenhuma servir, use *✍️ Escrever resposta*.';

  if (sessao.mensagemAtualDono) {
    await apagarMensagem(
      nazu,
      sessao.dono,
      sessao.mensagemAtualDono
    );
  }

  const enviada =
    await enviarFlow(
      nazu,
      sessao.dono,
      texto,
      botoes
    );

  sessao.mensagemAtualDono =
    enviada?.key || null;

  salvarSessao(sessao);
}


async function selecionarRespostaDono(
  nazu,
  sessao,
  sender,
  indice,
  opcaoIndex
) {
  if (
    !mesmoJid(
      sender,
      sessao.dono
    )
  ) {
    return true;
  }

  if (
    sessao.fase !==
    'CONFIGURANDO'
  ) {
    return true;
  }

  if (
    Number(indice) !==
    Number(sessao.indiceConfiguracao)
  ) {
    return true;
  }

  const pergunta =
    sessao.perguntas[indice];

  const opcao =
    pergunta?.opcoesBase?.[
      Number(opcaoIndex)
    ];

  if (!pergunta || !opcao) {
    return true;
  }

  montarOpcoes(
    pergunta,
    opcao
  );

  pergunta.opcaoDonoSelecionada =
    pergunta.correta;

  pergunta.configurada =
    true;

  salvarSessao(sessao);

  await mostrarPerguntaDono(
    nazu,
    sessao
  );

  return true;
}


async function iniciarRespostaManualDono(
  nazu,
  sessao,
  sender,
  indice
) {
  if (
    !mesmoJid(
      sender,
      sessao.dono
    )
  ) {
    return true;
  }

  if (
    Number(indice) !==
    Number(sessao.indiceConfiguracao)
  ) {
    return true;
  }

  const pergunta =
    sessao.perguntas[indice];

  if (!pergunta) {
    return true;
  }

  sessao.fase =
    'AGUARDANDO_RESPOSTA_MANUAL';

  sessao.manualIndice =
    indice;

  salvarSessao(sessao);

  await apagarMensagem(
    nazu,
    sessao.dono,
    sessao.mensagemAtualDono
  );

  sessao.mensagemAtualDono =
    null;

  await enviarTexto(
    nazu,
    sessao.dono,
    '✍️ *Digite a resposta correta:*\n\n' +
    '❓ ' +
    pergunta.pergunta +
    '\n\n' +
    'Sua resposta será usada somente nesta pergunta.'
  );

  return true;
}


async function processarRespostaManualDono(
  nazu,
  sessao,
  texto
) {
  const resposta =
    String(texto || '').trim();

  if (!resposta) {
    return true;
  }

  const indice =
    Number(
      sessao.manualIndice
    );

  const pergunta =
    sessao.perguntas[indice];

  if (!pergunta) {
    return false;
  }

  montarOpcoes(
    pergunta,
    resposta
  );

  pergunta.opcaoDonoSelecionada =
    pergunta.correta;

  pergunta.configurada =
    true;

  sessao.fase =
    'CONFIGURANDO';

  sessao.indiceConfiguracao =
    indice;

  delete sessao.manualIndice;

  salvarSessao(sessao);

  await enviarTexto(
    nazu,
    sessao.dono,
    '✅ *Resposta salva!*\n\n' +
    '🎯 Resposta correta: *' +
    resposta +
    '*\n\n' +
    'Agora toque em *➡️ Próximo*.'
  );

  await mostrarPerguntaDono(
    nazu,
    sessao
  );

  return true;
}


async function avancarDono(
  nazu,
  sessao,
  sender,
  indice
) {
  if (
    !mesmoJid(
      sender,
      sessao.dono
    )
  ) {
    return true;
  }

  if (
    sessao.fase !==
    'CONFIGURANDO'
  ) {
    return true;
  }

  if (
    Number(indice) !==
    Number(sessao.indiceConfiguracao)
  ) {
    return true;
  }

  const pergunta =
    sessao.perguntas[indice];

  if (
    !pergunta?.configurada ||
    !pergunta.correta
  ) {
    await enviarTexto(
      nazu,
      sessao.dono,
      '⚠️ Primeiro marque uma alternativa ou use *✍️ Escrever resposta*.'
    );

    return true;
  }

  sessao.indiceConfiguracao =
    indice + 1;

  salvarSessao(sessao);

  if (
    sessao.indiceConfiguracao >=
    TOTAL
  ) {
    return finalizarConfiguracao(
      nazu,
      sessao
    );
  }

  await mostrarPerguntaDono(
    nazu,
    sessao
  );

  return true;
}


/*
 * ============================================================
 * PROCESSAR RESPOSTA DO DONO
 * ============================================================
 */

async function processarRespostaDono(
  nazu,
  sessao,
  texto
) {
  const resposta =
    String(texto || '').trim();

  if (!resposta) return true;

  const pergunta =
    sessao.perguntas[
      sessao.indiceConfiguracao
    ];

  if (!pergunta) return true;

  montarOpcoes(
    pergunta,
    resposta
  );

  sessao.indiceConfiguracao++;

  salvarSessao(sessao);

  if (
    sessao.indiceConfiguracao >= TOTAL
  ) {
    await finalizarConfiguracao(
      nazu,
      sessao
    );

    return true;
  }

  await enviarTexto(
    nazu,
    sessao.dono,
    `✅ *Resposta salva!*\n\n` +
    `🎯 Correta: *${resposta}*\n\n` +
    `Agora vamos para a pergunta ` +
    `*${sessao.indiceConfiguracao + 1}/${TOTAL}*.`
  );

  await mostrarPerguntaDono(
    nazu,
    sessao
  );

  return true;
}

/*
 * ============================================================
 * FINALIZA CONFIGURAÇÃO
 * ============================================================
 */

async function finalizarConfiguracao(
  nazu,
  sessao
) {
  sessao.fase = 'CONVIDANDO';
  sessao.indiceQuiz = 0;

  salvarSessao(sessao);

  await enviarTexto(
    nazu,
    sessao.dono,
    `💕 *QUIZ DO CASAL FINALIZADO!*\n\n` +
    `🆔 Código: *${sessao.id}*\n` +
    `📝 Perguntas: *${sessao.perguntas.length}*\n\n` +
    `💌 Enviando o quiz para ${mencionar(sessao.parceiro)}...`,
    [sessao.parceiro]
  );

  await enviarConvite(
    nazu,
    sessao
  );
}

/*
 * ============================================================
 * CONVITE DO PARCEIRO
 * ============================================================
 */

async function enviarConvite(
  nazu,
  sessao
) {
  const texto =
    `💕 *QUIZ DO CASAL*\n\n` +
    `🆔 *${sessao.id}*\n\n` +
    `Você foi convidado para responder ` +
    `um quiz personalizado!\n\n` +
    `📝 *${sessao.perguntas.length} perguntas*\n` +
    `🎯 *4 alternativas por pergunta*\n` +
    `💞 Resultado no final\n\n` +
    `O quiz está pronto.\n` +
    `Deseja começar?`;

  const enviada =
    await enviarFlow(
      nazu,
      sessao.parceiro,
      texto,
      [
        {
          texto: '💖 Aceitar',

          id: [
            'quizcasal',
            sessao.id,
            'convite',
            'aceitar'
          ].join(' ')
        },

        {
          texto: '❌ Recusar',

          id: [
            'quizcasal',
            sessao.id,
            'convite',
            'recusar'
          ].join(' ')
        }
      ]
    );

  sessao.mensagemAtualParceiro =
    enviada?.key || null;

  salvarSessao(sessao);
}

/*
 * ============================================================
 * COMEÇAR QUIZ
 * ============================================================
 */

async function iniciarQuizParceiro(
  nazu,
  sessao
) {
  sessao.fase = 'RESPONDENDO';
  sessao.indiceQuiz = 0;
  sessao.acertos = 0;
  sessao.erros = 0;

  salvarSessao(sessao);

  await mostrarPerguntaParceiro(
    nazu,
    sessao
  );
}

/*
 * ============================================================
 * MOSTRAR PERGUNTA DO PARCEIRO
 * ============================================================
 */

async function mostrarPerguntaParceiro(
  nazu,
  sessao
) {
  const pergunta =
    sessao.perguntas[
      sessao.indiceQuiz
    ];

  if (!pergunta) {
    return finalizarQuiz(
      nazu,
      sessao
    );
  }

  const numero =
    sessao.indiceQuiz + 1;

  const resposta =
    pergunta.respostaParceiro;

  const bloqueada =
    Boolean(pergunta.respondida);

  const texto =
    `💕 *QUIZ DO CASAL - ${sessao.id}*\n\n` +
    `🔹 *${numero} de ${TOTAL}*\n\n` +
    `❓ *${pergunta.pergunta}*\n\n` +
    pergunta.opcoes
      .map(
        (opcao, i) =>
          `${resposta === opcao.id ? '🟣' : '⚪'} ` +
          `*${LETRAS[i]}* • ${opcao.texto}` +
          `${
            resposta === opcao.id
              ? opcao.correta
                ? ' ✅'
                : ' ❌'
              : ''
          }`
      )
      .join('\n') +
    `\n\n` +
    (
      bloqueada
        ? '🔒 *Esta pergunta já foi respondida.*'
        : '👆 Toque em uma alternativa.'
    );

  const botoes =
    bloqueada
      ? [
          ...criarBotoesOpcoes(
            sessao,
            pergunta,
            resposta,
            true
          ),
          criarBotaoAvancar(sessao)
        ]
      : [
          ...criarBotoesOpcoes(
            sessao,
            pergunta
          )
        ];

  if (sessao.mensagemAtualParceiro) {
    await apagarMensagem(
      nazu,
      sessao.parceiro,
      sessao.mensagemAtualParceiro
    );
  }

  botoes.push({
    texto: '✍️ Outra resposta',
    id: [
      'quizcasal',
      sessao.id,
      'manual',
      sessao.indiceQuiz
    ].join(' ')
  });

  const enviada =
    await enviarFlow(
      nazu,
      sessao.parceiro,
      texto,
      botoes
    );

  sessao.mensagemAtualParceiro =
    enviada?.key || null;

  salvarSessao(sessao);
}


/* ============================================================
 * QUIZCASAL — PARTE 2/3
 * ============================================================
 * Convite
 * Aceitar / recusar
 * Perguntas do participante
 * Seleção
 * Bloqueio
 * Avançar
 * Resultado
 * ============================================================ */

function obterRespostaParceiro(
  pergunta
) {
  if (
    !pergunta ||
    !pergunta.respostaParceiro
  ) {
    return null;
  }

  return pergunta.opcoes.find(
    opcao =>
      opcao.id ===
      pergunta.respostaParceiro
  ) || null;
}

function obterRespostaCorreta(
  pergunta
) {
  if (
    !pergunta ||
    !pergunta.correta
  ) {
    return null;
  }

  return pergunta.opcoes.find(
    opcao =>
      opcao.id ===
      pergunta.correta
  ) || null;
}

function respostaJaFeita(
  pergunta
) {
  return Boolean(
    pergunta &&
    pergunta.respondida &&
    pergunta.respostaParceiro
  );
}

function percentual(
  acertos,
  total
) {
  if (!total) {
    return 0;
  }

  return Math.round(
    (
      Number(acertos) /
      Number(total)
    ) * 100
  );
}

/*
 * ============================================================
 * TEXTO DEPOIS QUE O PARCEIRO SELECIONA
 * ============================================================
 */

function textoRespostaSelecionada(
  sessao,
  pergunta,
  selecionada
) {
  const numero =
    sessao.indiceQuiz + 1;

  const correta =
    obterRespostaCorreta(
      pergunta
    );

  const foiCorreta =
    Boolean(
      correta &&
      selecionada &&
      correta.id ===
        selecionada.id
    );

  return (
    `💕 *QUIZ DO CASAL - ${sessao.id}*\n\n` +
    `📌 *${numero} de ${sessao.perguntas.length}*\n\n` +
    `*${pergunta.pergunta}*\n\n` +
    pergunta.opcoes
      .map(
        (opcao, i) => {
          const marcada =
            opcao.id ===
            selecionada.id;

          return (
            `${marcada ? "🟣" : "⚪"} ` +
            `*${LETRAS[i]}* • ${opcao.texto}` +
            (
              marcada
                ? (
                    foiCorreta
                      ? " ✅"
                      : " ❌"
                  )
                : ""
            )
          );
        }
      )
      .join("\n") +
    "\n\n" +
    `✅ *Você selecionou:* ${selecionada.texto}\n\n` +
    (
      foiCorreta
        ? "💚 Você acertou!"
        : "🟡 Resposta registrada!"
    ) +
    "\n\n" +
    "👇 Toque em *Avançar*."
  );
}

/*
 * ============================================================
 * MOSTRAR RESULTADO INDIVIDUAL
 * ============================================================
 */

function resultadoParaUsuario(
  sessao,
  resultado,
  papel
) {
  const dono =
    papel === "D";

  const linhas =
    resultado.detalhes.map(
      item => {
        const suaResposta =
          dono
            ? item.respostaDono
            : item.respostaParceiro;

        const respostaDoOutro =
          dono
            ? item.respostaParceiro
            : item.respostaDono;

        const marca =
          item.acertou
            ? "✅"
            : "❌";

        return (
          `${item.numero}. *${item.pergunta}*\n` +
          `Você: ${suaResposta || "—"}\n` +
          `Dela: ${respostaDoOutro || "—"} ${marca}\n` +
          `Correta: ${item.correta || "—"}`
        );
      }
    ).join("\n\n");

  let frase =
    "👀 Ainda existem algumas coisas para descobrir!";

  if (
    resultado.percentual === 100
  ) {
    frase =
      "💖 Vocês combinaram em tudo!";
  } else if (
    resultado.percentual >= 80
  ) {
    frase =
      "🥰 Vocês se conhecem muito bem!";
  } else if (
    resultado.percentual >= 60
  ) {
    frase =
      "💕 Boa sintonia!";
  } else if (
    resultado.percentual >= 40
  ) {
    frase =
      "😅 Ainda existem algumas surpresas!";
  }

  return (
    `💕 *QUIZ DO CASAL FINALIZADO! - ${sessao.id}*\n\n` +
    `🏆 Você acertou *${resultado.acertos} de ${resultado.total}!* \n` +
    `💞 *${resultado.percentual}% de compatibilidade*\n\n` +
    `✅ Acertos: *${resultado.acertos}*\n` +
    `❌ Erros: *${resultado.erros}*\n\n` +
    "━━━━━━━━━━━━━━━━━━\n" +
    "📋 *Resumo das perguntas*\n\n" +
    `${linhas}\n\n` +
    "━━━━━━━━━━━━━━━━━━\n\n" +
    `${frase}\n\n` +
    "💕 Obrigado por participar do Quiz do Casal!"
  );
}

/*
 * ============================================================
 * CALCULAR RESULTADO
 * ============================================================
 */

function calcularResultadoFinal(
  sessao
) {
  let acertos = 0;

  let erros = 0;

  const detalhes = [];

  sessao.perguntas.forEach(
    (pergunta, indice) => {
      const correta =
        obterRespostaCorreta(
          pergunta
        );

      const respostaDono =
        String(
          pergunta.respostaDono ||
          correta?.texto ||
          ""
        );

      const respostaParceiro =
        obterRespostaParceiro(
          pergunta
        );

      const acertou =
        Boolean(
          correta &&
          respostaParceiro &&
          respostaParceiro.id ===
            correta.id
        );

      if (acertou) {
        acertos++;
      } else {
        erros++;
      }

      detalhes.push({
        numero:
          indice + 1,

        pergunta:
          pergunta.pergunta,

        respostaDono,

        respostaParceiro:
          respostaParceiro?.texto ||
          "Não respondida",

        correta:
          correta?.texto ||
          "—",

        acertou
      });
    }
  );

  const total =
    sessao.perguntas.length;

  return {
    acertos,

    erros,

    total,

    percentual:
      percentual(
        acertos,
        total
      ),

    detalhes
  };
}

/*
 * ============================================================
 * FINALIZAR QUIZ
 * ============================================================
 */

async function finalizarQuizReal(
  nazu,
  sessao
) {
  if (
    sessao.fase ===
    "FINALIZADO"
  ) {
    return true;
  }

  sessao.fase =
    "FINALIZADO";

  const resultado =
    calcularResultadoFinal(
      sessao
    );

  sessao.resultado =
    resultado;

  sessao.finalizadoEm =
    Date.now();

  sessao.atualizadaEm =
    Date.now();

  salvarSessao(sessao);

  const db =
    lerDB();

  if (
    !Array.isArray(
      db.historico
    )
  ) {
    db.historico = [];
  }

  db.historico.push({
    id:
      sessao.id,

    dono:
      sessao.dono,

    parceiro:
      sessao.parceiro,

    acertos:
      resultado.acertos,

    erros:
      resultado.erros,

    total:
      resultado.total,

    percentual:
      resultado.percentual,

    finalizadoEm:
      sessao.finalizadoEm
  });

  if (
    db.historico.length >
    100
  ) {
    db.historico =
      db.historico.slice(
        -100
      );
  }

  db.sessoes[
    sessao.id
  ] = sessao;

  salvarDB(db);

  /*
   * Remove a última carta do parceiro
   * para deixar o resultado limpo.
   */
  await apagarMensagem(
    nazu,
    sessao.parceiro,
    sessao.mensagemAtualParceiro
  );

  sessao.mensagemAtualParceiro =
    null;

  /*
   * Resultado no PV do parceiro.
   */
  await enviarTexto(
    nazu,
    sessao.parceiro,
    resultadoParaUsuario(
      sessao,
      resultado,
      "P"
    )
  );

  /*
   * Resultado no PV do dono.
   */
  await enviarTexto(
    nazu,
    sessao.dono,
    resultadoParaUsuario(
      sessao,
      resultado,
      "D"
    )
  );

  return true;
}

/*
 * ============================================================
 * ACEITAR CONVITE
 * ============================================================
 */

async function aceitarConviteReal(
  nazu,
  sessao,
  sender
) {
  /*
   * JID puro.
   * Não comparar com LID.
   */
  if (
    !mesmoJid(
      sender,
      sessao.parceiro
    )
  ) {
    await enviarTexto(
      nazu,
      sender,
      "⛔ Este convite foi enviado para outro @usuário."
    );

    return true;
  }

  if (
    sessao.fase !==
    "CONVIDANDO"
  ) {
    await enviarTexto(
      nazu,
      sender,
      "⚠️ Este quiz não está mais aguardando uma resposta."
    );

    return true;
  }

  sessao.fase =
    "RESPONDENDO";

  sessao.indiceQuiz =
    0;

  sessao.atualizadaEm =
    Date.now();

  salvarSessao(sessao);

  await apagarMensagem(
    nazu,
    sessao.parceiro,
    sessao.mensagemAtualParceiro
  );

  sessao.mensagemAtualParceiro =
    null;

  await enviarTexto(
    nazu,
    sessao.parceiro,
    `💕 *QUIZ DO CASAL*\n\n` +
    `✅ Você entrou no quiz *${sessao.id}*!\n\n` +
    `Serão *${sessao.perguntas.length} perguntas*.\n\n` +
    `Escolha uma alternativa para cada pergunta.\n` +
    `Depois de responder, a pergunta ficará bloqueada.\n\n` +
    `Boa sorte! 💖`
  );

  await enviarTexto(
    nazu,
    sessao.dono,
    `💕 *QUIZ DO CASAL*\n\n` +
    `✅ ${mencionar(sessao.parceiro)} aceitou o quiz!\n\n` +
    `Agora ele(a) vai responder as ${sessao.perguntas.length} perguntas.\n\n` +
    `Você receberá o resultado no final.`,
    [sessao.parceiro]
  );

  await mostrarPerguntaParceiro(
    nazu,
    sessao
  );

  return true;
}

/*
 * ============================================================
 * RECUSAR CONVITE
 * ============================================================
 */

async function recusarConviteReal(
  nazu,
  sessao,
  sender
) {
  if (
    !mesmoJid(
      sender,
      sessao.parceiro
    )
  ) {
    await enviarTexto(
      nazu,
      sender,
      "⛔ Este convite não pertence a você."
    );

    return true;
  }

  sessao.fase =
    "RECUSADO";

  sessao.atualizadaEm =
    Date.now();

  salvarSessao(sessao);

  await apagarMensagem(
    nazu,
    sessao.parceiro,
    sessao.mensagemAtualParceiro
  );

  await enviarTexto(
    nazu,
    sessao.parceiro,
    `❌ *QUIZ RECUSADO*\n\n` +
    `O Quiz do Casal *${sessao.id}* foi recusado.`
  );

  await enviarTexto(
    nazu,
    sessao.dono,
    `❌ *QUIZ ENCERRADO*\n\n` +
    `${mencionar(sessao.parceiro)} recusou o convite.`,
    [sessao.parceiro]
  );

  return true;
}

/*
 * ============================================================
 * SELECIONAR ALTERNATIVA
 * ============================================================
 */

async function selecionarAlternativaReal(
  nazu,
  sessao,
  sender,
  indice,
  opcaoId
) {
  if (
    !mesmoJid(
      sender,
      sessao.parceiro
    )
  ) {
    await enviarTexto(
      nazu,
      sender,
      "⛔ Esta seleção pertence ao participante do quiz."
    );

    return true;
  }

  if (
    sessao.fase !==
    "RESPONDENDO"
  ) {
    await enviarTexto(
      nazu,
      sender,
      "⚠️ Este quiz não está mais ativo."
    );

    return true;
  }

  if (
    Number(indice) !==
    Number(sessao.indiceQuiz)
  ) {
    await enviarTexto(
      nazu,
      sender,
      "⚠️ Esta pergunta não está mais ativa."
    );

    return true;
  }

  const pergunta =
    sessao.perguntas[
      indice
    ];

  if (!pergunta) {
    return true;
  }

  /*
   * Impede clicar novamente depois de responder.
   */
  if (
    respostaJaFeita(
      pergunta
    )
  ) {
    await mostrarPerguntaParceiro(
      nazu,
      sessao
    );

    return true;
  }

  const opcao =
    pergunta.opcoes.find(
      item =>
        item.id ===
        opcaoId
    );

  if (!opcao) {
    await enviarTexto(
      nazu,
      sender,
      "❌ Alternativa inválida."
    );

    return true;
  }

  pergunta.respostaParceiro =
    opcao.id;

  pergunta.respondida =
    true;

  /*
   * Guarda o resultado dessa pergunta.
   */
  if (
    opcao.id ===
    pergunta.correta
  ) {
    sessao.acertos++;
  } else {
    sessao.erros++;
  }

  sessao.atualizadaEm =
    Date.now();

  salvarSessao(sessao);

  /*
   * Apaga a carta anterior e coloca
   * a versão selecionada.
   */
  await apagarMensagem(
    nazu,
    sessao.parceiro,
    sessao.mensagemAtualParceiro
  );

  sessao.mensagemAtualParceiro =
    null;

  const texto =
    textoRespostaSelecionada(
      sessao,
      pergunta,
      opcao
    );

  const enviada =
    await enviarFlow(
      nazu,
      sessao.parceiro,
      texto,
      [
        ...pergunta.opcoes.map(
          (item, posicao) => ({
            texto:
              item.id === opcao.id
                ? `🟣 ${LETRAS[posicao]} • ${item.texto} ${item.correta ? "✅" : "❌"}`
                : `🔒 ${LETRAS[posicao]} • ${item.texto}`,

            id:
              [
                "quizcasal",
                sessao.id,
                "bloqueada",
                indice,
                item.id
              ].join(" ")
          })
        ),

        {
          texto:
            indice >=
            sessao.perguntas.length - 1
              ? "✅ Finalizar"
              : "➡️ Avançar",

          id:
            [
              "quizcasal",
              sessao.id,
              "avancar",
              indice
            ].join(" ")
        }
      ]
    );

  sessao.mensagemAtualParceiro =
    enviada?.key ||
    null;

  salvarSessao(sessao);

  return true;
}

/*
 * ============================================================
 * AVANÇAR
 * ============================================================
 */

async function avancarReal(
  nazu,
  sessao,
  sender,
  indice
) {
  if (
    !mesmoJid(
      sender,
      sessao.parceiro
    )
  ) {
    return true;
  }

  if (
    sessao.fase !==
    "RESPONDENDO"
  ) {
    return true;
  }

  if (
    Number(indice) !==
    Number(sessao.indiceQuiz)
  ) {
    return true;
  }

  const pergunta =
    sessao.perguntas[
      sessao.indiceQuiz
    ];

  if (
    !respostaJaFeita(
      pergunta
    )
  ) {
    await enviarTexto(
      nazu,
      sender,
      "⚠️ Escolha uma alternativa antes de avançar."
    );

    return true;
  }

  /*
   * Última pergunta.
   */
  if (
    sessao.indiceQuiz >=
    sessao.perguntas.length - 1
  ) {
    return finalizarQuizReal(
      nazu,
      sessao
    );
  }

  await apagarMensagem(
    nazu,
    sessao.parceiro,
    sessao.mensagemAtualParceiro
  );

  sessao.mensagemAtualParceiro =
    null;

  sessao.indiceQuiz++;

  sessao.atualizadaEm =
    Date.now();

  salvarSessao(sessao);

  /*
   * Pequeno atraso para o efeito
   * da imagem: resposta antiga sai
   * e a próxima entra.
   */
  await new Promise(
    resolve =>
      setTimeout(
        resolve,
        180
      )
  );

  await mostrarPerguntaParceiro(
    nazu,
    sessao
  );

  return true;
}

/*
 * ============================================================
 * BOTÃO CLICADO
 * ============================================================
 *
 * Todos os botões do QuizCasal usam:
 *
 * quizcasal ID ...
 *
 * ============================================================
 */

export async function handleQuizCasalButton({
  nazu,
  jid,
  sender,
  buttonId
}) {
  try {
    const partes =
      String(
        buttonId || ""
      )
        .trim()
        .split(/\s+/);

    if (
      partes[0] !==
      "quizcasal"
    ) {
      return false;
    }

    const sessionId =
      partes[1];

    const acao =
      partes[2];

    const valor =
      partes.slice(3);

    const sessao =
      encontrarSessao(
        sessionId
      );

    if (!sessao) {
      await enviarTexto(
        nazu,
        jid,
        "⚠️ Este Quiz do Casal não existe mais."
      );

      return true;
    }

    /*
     * ----------------------------------------------------------
     * CONVITE
     * ----------------------------------------------------------
     */

    if (
      acao ===
      "convite"
    ) {
      const decisao =
        valor[0];

      if (
        decisao ===
        "aceitar"
      ) {
        return aceitarConviteReal(
          nazu,
          sessao,
          sender
        );
      }

      if (
        decisao ===
        "recusar"
      ) {
        return recusarConviteReal(
          nazu,
          sessao,
          sender
        );
      }

      return true;
    }

    /*
     * ----------------------------------------------------------
     * AÇÕES DO CRIADOR
     * ----------------------------------------------------------
     */

    if (
      acao ===
      'dono'
    ) {
      if (
        !mesmoJid(
          sender,
          sessao.dono
        )
      ) {
        return true;
      }

      const indice =
        Number(valor[0]);

      const tipo =
        valor[1];

      if (
        tipo ===
        'selecionar'
      ) {
        return selecionarRespostaDono(
          nazu,
          sessao,
          sender,
          indice,
          Number(valor[2])
        );
      }

      if (
        tipo ===
        'manual'
      ) {
        return iniciarRespostaManualDono(
          nazu,
          sessao,
          sender,
          indice
        );
      }

      if (
        tipo ===
        'avancar'
      ) {
        return avancarDono(
          nazu,
          sessao,
          sender,
          indice
        );
      }

      return true;
    }

    /*
     * ----------------------------------------------------------
     * ESCOLHA
     * ----------------------------------------------------------
     */

    if (
      acao ===
      "opcao"
    ) {
      const indice =
        Number(
          valor[0]
        );

      const tipo =
        valor[1];

      const opcaoId =
        valor
          .slice(2)
          .join(" ");

      if (
        tipo ===
        "selecionar"
      ) {
        return selecionarAlternativaReal(
          nazu,
          sessao,
          sender,
          indice,
          opcaoId
        );
      }

      if (
        tipo ===
        "bloqueada"
      ) {
        await enviarTexto(
          nazu,
          sender,
          "🔒 Essa pergunta já foi respondida."
        );

        return true;
      }

      return true;
    }

    /*
     * ----------------------------------------------------------
     * AVANÇAR
     * ----------------------------------------------------------
     */

    if (
      acao ===
      "avancar"
    ) {
      const indice =
        Number(
          valor[0]
        );

      return avancarReal(
        nazu,
        sessao,
        sender,
        indice
      );
    }

    /*
     * ----------------------------------------------------------
     * COMPATIBILIDADE COM EVENTUAIS IDs ANTIGOS
     * ----------------------------------------------------------
     */

    if (
      acao ===
      "res"
    ) {
      const papel =
        valor[0];

      const indice =
        Number(
          valor[1]
        );

      const tipo =
        valor[2];

      const opcaoId =
        valor
          .slice(3)
          .join(" ");

      if (
        tipo ===
        "select"
      ) {
        return selecionarAlternativaReal(
          nazu,
          sessao,
          sender,
          indice,
          opcaoId
        );
      }

      if (
        tipo ===
        "next"
      ) {
        return avancarReal(
          nazu,
          sessao,
          sender,
          indice
        );
      }

      if (
        tipo ===
        "noop"
      ) {
        await enviarTexto(
          nazu,
          sender,
          "🔒 Essa seleção já foi registrada."
        );

        return true;
      }
    }

    return true;

  } catch (error) {
    console.error(
      "[QUIZCASAL][BUTTON]",
      error?.stack ||
      error
    );

    return false;
  }
}

/*
 * ============================================================
 * COMANDO /quizcasal
 * ============================================================
 */

export async function handleQuizCasal({
  nazu,
  jid,
  sender,
  args = [],
  mentionedJids = [],
  prefix = "/",
  isGroup = false
}) {
  try {
    const partes =
      Array.isArray(args)
        ? args.map(
            x =>
              String(x || "")
          )
        : [];

    /*
     * ----------------------------------------------------------
     * BOTÕES
     * ----------------------------------------------------------
     */

    if (
      partes[0] &&
      (
        partes[1] === "convite" ||
        partes[1] === "dono" ||
        partes[1] === "opcao" ||
        partes[1] === "avancar" ||
        partes[1] === "res"
      )
    ) {
      return handleQuizCasalButton({
        nazu,
        jid,
        sender,
        buttonId:
          [
            "quizcasal",
            ...partes
          ].join(" ")
      });
    }

    /*
     * ----------------------------------------------------------
     * COMANDO NOVO
     * ----------------------------------------------------------
     */

    const parceiro =
      obterMencionado(
        mentionedJids,
        partes.join(" ")
      );

    if (!parceiro) {
      await enviarTexto(
        nazu,
        jid || sender,
        `💕 *QUIZ DO CASAL*\n\n` +
        `Marque o @usuário que vai participar.\n\n` +
        `Exemplo:\n` +
        `${prefix}quizcasal @5511999999999\n\n` +
        `📌 O quiz inteiro acontece no *PV*.`
      );

      return true;
    }

    /*
     * O JID do alvo é mantido como veio.
     */
    if (
      mesmoJid(
        parceiro,
        sender
      )
    ) {
      await enviarTexto(
        nazu,
        jid || sender,
        "❌ Você não pode fazer o Quiz do Casal consigo mesmo."
      );

      return true;
    }

    /*
     * Se veio do grupo:
     * manda o aviso no grupo e continua a criação
     * diretamente no PV do dono.
     */
    if (isGroup) {
      await enviarTexto(
        nazu,
        jid,
        `💕 *QUIZ DO CASAL*\n\n` +
        `✅ O quiz foi iniciado no seu *PV*.\n\n` +
        `📩 Confira sua conversa privada com a Kyara.`
      );
    }

    /*
     * A partir daqui, tudo no PV do dono.
     */
    await iniciarCriacao(
      nazu,
      sender,
      parceiro,
      prefix
    );

    return true;

  } catch (error) {
    console.error(
      "[QUIZCASAL][COMMAND]",
      error?.stack ||
      error
    );

    await enviarTexto(
      nazu,
      jid || sender,
      `❌ Erro no Quiz do Casal.\n\n` +
      `${error?.message || error}`
    );

    return true;
  }
}

/*
 * ============================================================
 * MENSAGENS NORMAIS DO DONO
 * ============================================================
 *
 * Quando o dono recebe:
 *
 * Pergunta 1/10
 *
 * ele simplesmente responde:
 *
 * Amendoim
 *
 * O index.js vai chamar esta função.
 * ============================================================
 */

export async function handleQuizCasalMessage({
  nazu,
  jid,
  sender,
  body,
  isGroup = false
}) {
  try {
    if (
      isGroup
    ) {
      return false;
    }

    /*
     * No PV, remoteJid/jid precisa ser o mesmo
     * JID do usuário.
     */
    if (
      !mesmoJid(
        jid,
        sender
      )
    ) {
      return false;
    }

    const sessao =
      encontrarSessaoDoDono(
        sender
      );

    if (!sessao) {
      return false;
    }

    if (
      sessao.fase !==
      "AGUARDANDO_RESPOSTA_MANUAL"
    ) {
      return false;
    }

    const texto =
      String(
        body || ""
      ).trim();

    if (!texto) {
      return false;
    }

    return processarRespostaManualDono(
      nazu,
      sessao,
      texto
    );

  } catch (error) {
    console.error(
      "[QUIZCASAL][MESSAGE]",
      error?.stack ||
      error
    );

    return false;
  }
}

/*
 * ============================================================
 * CANCELAR
 * ============================================================
 */

export async function cancelarQuizCasal({
  nazu,
  jid,
  sender
}) {
  const banco =
    lerDB();

  const sessao =
    Object.values(
      banco.sessoes
    ).find(
      item =>
        item &&
        (
          item.fase ===
            "CONFIGURANDO" ||
          item.fase ===
            "CONVIDANDO" ||
          item.fase ===
            "RESPONDENDO"
        ) &&
        (
          mesmoJid(
            item.dono,
            sender
          ) ||
          mesmoJid(
            item.parceiro,
            sender
          )
        )
    );

  if (!sessao) {
    await enviarTexto(
      nazu,
      jid || sender,
      "ℹ️ Você não possui um Quiz do Casal ativo."
    );

    return true;
  }

  sessao.fase =
    "CANCELADO";

  sessao.canceladoEm =
    Date.now();

  salvarSessao(sessao);

  await enviarTexto(
    nazu,
    sessao.dono,
    `🛑 *QUIZ DO CASAL CANCELADO*\n\n` +
    `🆔 ${sessao.id}`
  );

  if (
    sessao.parceiro
  ) {
    await enviarTexto(
      nazu,
      sessao.parceiro,
      `🛑 *QUIZ DO CASAL ENCERRADO*\n\n` +
      `O quiz foi cancelado.`
    );
  }

  return true;
}

/*
 * ============================================================
 * EXPORT FINAL
 * ============================================================
 */

export const quizCasalCommands = [
  "quizcasal",
  "quizcasal_entrar",
  "quizcasal_cancelar",
  "quizcasal_res"
];

export default {
  handleQuizCasal,
  handleQuizCasalMessage,
  handleQuizCasalButton,
  cancelarQuizCasal
};


/*
 * ============================================================
 * 💕 QUIZCASAL — CORREÇÃO DA CRIAÇÃO
 * ============================================================
 *
 * Esta função é usada pelo handleQuizCasal().
 *
 * O quiz é montado no PV do dono.
 * O parceiro é armazenado como JID/@número.
 *
 * ============================================================
 */

async function iniciarCriacao(
  nazu,
  donoJid,
  parceiroJid,
  prefixo = '#'
) {
  donoJid = limparJid(donoJid);
  parceiroJid = limparJid(parceiroJid);

  if (!donoJid) {
    throw new Error(
      'Não foi possível identificar o JID do dono.'
    );
  }

  if (!parceiroJid) {
    throw new Error(
      'Não foi possível identificar o JID do parceiro.'
    );
  }

  if (mesmoJid(donoJid, parceiroJid)) {
    return enviarTexto(
      nazu,
      donoJid,
      '❌ Você não pode criar um Quiz do Casal com você mesmo.'
    );
  }

  const banco = lerDB();

  const existente = Object.values(
    banco.sessoes || {}
  ).find(session => {
    if (!session) return false;

    if (
      session.fase === 'FINALIZADO' ||
      session.fase === 'CANCELADO'
    ) {
      return false;
    }

    const a = limparJid(session.dono);
    const b = limparJid(session.parceiro);

    return (
      (a === donoJid && b === parceiroJid) ||
      (a === parceiroJid && b === donoJid)
    );
  });

  if (existente) {
    return enviarTexto(
      nazu,
      donoJid,
      `⚠️ Você já possui um QuizCasal ativo com essa pessoa.\n\n🆔 Código: *${existente.id}*`
    );
  }

  const session = criarSessao(
    donoJid,
    parceiroJid,
    prefixo || '#'
  );

  banco.sessoes[session.id] = session;
  salvarDB(banco);

  await enviarTexto(
    nazu,
    donoJid,
    `💕 *QUIZ DO CASAL*\n\n` +
    `🆔 Código: *${session.id}*\n\n` +
    `👤 Parceiro: *${mencionar(parceiroJid)}*\n\n` +
    `📝 O quiz já possui as perguntas prontas.\n\n` +
    `Você só precisa responder cada pergunta com a opção que representa você.\n\n` +
    `Quando uma pergunta não tiver a resposta exata entre as opções, use *✍️ Outra resposta*.\n\n` +
    `🚀 Vamos começar!`,
    [parceiroJid]
  );

  await mostrarPerguntaDono(
    nazu,
    session
  );

  return true;
}


/*
 * ============================================================
 * EXPORTS
 * ============================================================
 *
 * Reexporta a função para o handleQuizCasal e mantém
 * os exports usados pelo index.js.
 * ============================================================
 */

export {
  iniciarCriacao
};


/*
 * ============================================================
 * 💕 QUIZCASAL — NÚCLEO DE BANCO
 * ============================================================
 *
 * Restaura as funções internas utilizadas pelo sistema:
 *
 *   garantirBanco()
 *   lerDB()
 *   salvarDB()
 *
 * O banco fica separado do restante do bot.
 *
 * ============================================================
 */

function quizCasalGarantirBanco() {
  const dir = path.dirname(DB_FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(
      dir,
      {
        recursive: true
      }
    );
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(
        {
          sessoes: {},
          historico: []
        },
        null,
        2
      ),
      "utf8"
    );
  }
}


function quizCasalLerBanco() {
  quizCasalGarantirBanco();

  try {
    const bruto =
      fs.readFileSync(
        DB_FILE,
        "utf8"
      );

    const data =
      JSON.parse(bruto);

    if (
      !data ||
      typeof data !== "object"
    ) {
      throw new Error(
        "Banco inválido."
      );
    }

    if (
      !data.sessoes ||
      typeof data.sessoes !== "object"
    ) {
      data.sessoes = {};
    }

    if (
      !Array.isArray(
        data.historico
      )
    ) {
      data.historico = [];
    }

    return data;

  } catch (error) {

    console.error(
      "[QUIZCASAL][DB] Banco inválido. Recriando.",
      error?.message || error
    );

    const novoBanco = {
      sessoes: {},
      historico: []
    };

    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(
        novoBanco,
        null,
        2
      ),
      "utf8"
    );

    return novoBanco;
  }
}


function quizCasalSalvarBanco(
  data
) {
  quizCasalGarantirBanco();

  const temporario =
    `${DB_FILE}.tmp`;

  fs.writeFileSync(
    temporario,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf8"
  );

  fs.renameSync(
    temporario,
    DB_FILE
  );
}


/*
 * ============================================================
 * 🔧 ALIASES INTERNOS
 * ============================================================
 *
 * O restante do QuizCasal utiliza os nomes originais.
 * ============================================================
 */

const lerBanco =
  quizCasalLerBanco;

const salvarBanco =
  quizCasalSalvarBanco;

const garantirBanco =
  quizCasalGarantirBanco;


/*
 * ============================================================
 * 💕 FINALIZAÇÃO DA SESSÃO
 * ============================================================
 */

function quizCasalRegistrarHistorico(
  session,
  resultado = null
) {
  const banco =
    lerDB();

  const registro = {
    id:
      session?.id || null,

    dono:
      session?.dono || null,

    parceiro:
      session?.parceiro || null,

    perguntas:
      Array.isArray(
        session?.perguntas
      )
        ? session.perguntas.length
        : 0,

    resultado:
      resultado || null,

    finalizadoEm:
      Date.now()
  };

  banco.historico.push(
    registro
  );

  /*
   * Mantém somente os últimos 100
   * resultados para evitar crescimento
   * infinito do arquivo.
   */
  if (
    banco.historico.length > 100
  ) {
    banco.historico =
      banco.historico.slice(-100);
  }

  salvarDB(
    banco
  );

  return registro;
}


/*
 * ============================================================
 * 🧹 LIMPEZA AUTOMÁTICA
 * ============================================================
 */

function quizCasalLimparSessoesAntigas() {
  const banco =
    lerDB();

  const agora =
    Date.now();

  const LIMITE =
    1000 * 60 * 60 * 24 * 7;

  let alterou = false;

  for (
    const [id, session]
    of Object.entries(
      banco.sessoes
    )
  ) {

    if (
      !session ||
      !session.atualizadaEm
    ) {
      continue;
    }

    if (
      agora -
      session.atualizadaEm >
      LIMITE
    ) {

      delete banco.sessoes[id];

      alterou = true;
    }
  }

  if (alterou) {
    salvarDB(
      banco
    );
  }
}


/*
 * Executa a limpeza somente quando
 * este módulo é carregado.
 */
try {
  quizCasalLimparSessoesAntigas();
} catch (error) {
  console.error(
    "[QUIZCASAL][DB] Falha na limpeza:",
    error?.message || error
  );
}
