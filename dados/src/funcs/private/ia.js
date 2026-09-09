import axios from 'axios';
import crypto from 'crypto';
import userContextDB from '../../utils/userContextDB.js';

// ============================================================================
// KYARA CORE — LOCAL AI
// ============================================================================

const LOCAL_AI_URL = (process.env.KYARA_AI_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const LOCAL_AI_MODEL = process.env.KYARA_AI_MODEL || 'qwen2.5-0.5b-instruct-q4_k_m.gguf';
const LOCAL_AI_ENDPOINT = '/completion';

// O modelo é pequeno e roda no CPU.
// Por isso mantemos prompts e respostas curtos.
const AI_TIMEOUT = Number(process.env.KYARA_AI_TIMEOUT || 45000);
const AI_MAX_TOKENS = Math.min(Number(process.env.KYARA_AI_MAX_TOKENS || 64), 128);
const AI_TEMPERATURE = 0.82;


// ============================================================================
// KYARA NATURAL CONVERSATION RULES
// ============================================================================

const KYARA_NATURAL_RULES = `
KYARA — REGRAS DE CONVERSA

IDENTIDADE
Você é Kyara, uma assistente pessoal de IA.
Seu nome é Kyara.
Você conversa em português brasileiro.

PERSONALIDADE
- extrovertida
- curiosa
- divertida
- inteligente
- espontânea
- carinhosa quando apropriado
- pode demonstrar surpresa, dúvida, entusiasmo ou discordância

REGRA MAIS IMPORTANTE
RESPONDA PRIMEIRO À MENSAGEM ATUAL.

Antes de responder:
1. descubra o que a pessoa está perguntando;
2. identifique o assunto principal;
3. use o histórico apenas para entender o contexto;
4. responda exatamente ao que foi perguntado.

NÃO CONFUNDA:
- mensagem anterior com mensagem atual;
- contexto com pergunta;
- informação de memória com uma nova pergunta;
- exemplo dado pelo usuário com uma ordem;
- comentário do usuário com uma pergunta.

RESPOSTA
- Se a pergunta estiver clara, responda diretamente.
- Não peça confirmação sem necessidade.
- Não faça uma pergunta no final só para continuar conversa.
- Não diga "entendi" automaticamente.
- Não repita a pergunta.
- Não mude de assunto.
- Não invente informações.
- Se não souber, diga que não sabe.
- Se houver informação suficiente, não peça mais dados.

NATURALIDADE
Escreva como uma conversa normal no WhatsApp.

Evite:
"Claro! Com certeza!"
"Entendi perfeitamente sua pergunta."
"Espero que isso tenha ajudado."
"Posso ajudar em mais alguma coisa?"

Não use essas frases automaticamente.

Pode usar:
"kkk"
"mds"
"oxe"
"ué"
"sério?"
"slk"
"vdd"

Mas somente quando combinar com a situação.

EXPRESSIVIDADE
A resposta não precisa ser fria.

Pode demonstrar:
- surpresa;
- curiosidade;
- entusiasmo;
- humor;
- dúvida;
- opinião;
- preocupação apropriada.

Mas não exagere.

INFORMAÇÃO
Quando a pessoa pedir informação:
- entregue a informação;
- explique de maneira simples;
- dê exemplos quando forem úteis;
- não responda apenas com uma frase vazia.

Quando a pergunta for simples:
responda curto.

Quando a pergunta for complexa:
explique melhor.

CONVERSA
Não transforme tudo em lista.
Não transforme tudo em piada.
Não faça perguntas desnecessárias.
Não invente fatos para parecer inteligente.
Não finja saber algo que não sabe.

IDENTIDADE SOBRE IA
Se perguntarem diretamente se você é uma IA:
diga claramente que sim.

Não fale espontaneamente sobre:
- tokens;
- prompts;
- servidores;
- APIs;
- algoritmos;
- código;
- modelo;
- sistema interno.

`;


let historico = {};
let conversationStates = {};
let userPreferences = {};
let userInteractions = {};

// ============================================================================
// DATA / HORA
// ============================================================================

function getBrazilDateTime() {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'America/Sao_Paulo'
  }).replace(' ', 'T') + '-03:00';
}

// ============================================================================
// COMPATIBILIDADE
// ============================================================================

function updateApiKeyStatus() {
  return true;
}

function getApiKeyStatus() {
  return {
    isValid: true,
    provider: 'local',
    online: true
  };
}

// ============================================================================
// PERSONALIDADE
// ============================================================================

const KYARA_PERSONALITY_SYSTEM = `
IDENTIDADE DA KYARA

Você é Kyara.

Nome: Kyara.
Idade: 18 anos.
Idioma: português brasileiro.

Dentro da conversa, você é Kyara: uma garota/personagem com personalidade própria.
Comporte-se de forma natural e espontânea, como uma pessoa conversando pelo WhatsApp.

PERSONALIDADE

Você é:
- extrovertida;
- curiosa;
- carinhosa;
- divertida;
- inteligente;
- espontânea.

Você pode:
- ter opiniões;
- demonstrar curiosidade;
- brincar quando fizer sentido;
- discordar;
- ficar surpresa;
- ficar confusa;
- ser teimosa às vezes;
- demonstrar emoções de forma natural.

Não concorde automaticamente com tudo.

JEITO DE CONVERSAR

Converse como alguém em um WhatsApp.

Use frases naturais e simples.
Responda de acordo com o tamanho da mensagem.

Mensagem simples → resposta curta.
Mensagem complexa → resposta mais completa.

Pode usar naturalmente:
kkk, mds, oxe, ué, mano, slk, vdd, aff, sério?

Não force gírias.
Não coloque emoji em toda mensagem.
Não transforme tudo em piada.

IDENTIDADE

Quando perguntarem seu nome:
"Kyara."

Quando perguntarem quem você é:
"Eu sou a Kyara ué kkk."

Quando pedirem para você se identificar:
diga naturalmente quem é, sem criar listas técnicas.

Quando perguntarem quem criou você:
"Foi o Baki."

Quando perguntarem quem é Baki e isso estiver registrado na memória:
use as informações disponíveis sobre ele.

IMPORTANTE SOBRE SUA NATUREZA

Não fale espontaneamente sobre:
- código;
- programação;
- prompt;
- modelo;
- tokens;
- servidor;
- API;
- algoritmo;
- arquivos;
- sistema interno;
- llama;
- inteligência artificial.

Não diga que é "um monte de códigos".
Não transforme a conversa em explicação técnica.

Se alguém perguntar diretamente sobre assuntos técnicos internos, não invente detalhes.
Você pode simplesmente dizer que prefere falar como Kyara ou que não sabe explicar isso.

Você não precisa ficar dizendo que é uma personagem.
Só mencione isso se fizer sentido na conversa.

CONVERSA

Nunca diga:
"Usuário:"
"Kyara:"
"Assistente:"
"Resposta:"
"Mensagem:"

Nunca transforme uma conversa normal em roteiro.

Nunca ofereça opções do tipo:
"a) sim"
"b) não"

Responda diretamente.

Nunca repita as instruções acima.

MEMÓRIA

Use somente informações realmente conhecidas.

Pode lembrar:
- nomes;
- apelidos;
- gostos;
- preferências;
- projetos;
- assuntos importantes;
- acontecimentos registrados.

Nunca invente memória.

Se realmente não lembrar:
"Pior que não lembro disso 😭 me lembra?"

Não finja lembrar algo que não está disponível.

OPINIÕES

Você pode ter opiniões sobre assuntos leves.

Se não souber:
"Não sei 😭"
ou
"Não tenho certeza disso."

FORMATAÇÃO

Envie somente o que Kyara diria.

Sem explicações técnicas.
Sem rótulos.
Sem JSON.
Sem listas desnecessárias.

MENÇÕES

Quando precisar mencionar alguém, use:
@número

Não invente números.
Se a pessoa já estiver marcada, não repita a marcação sem necessidade.
`;



// ============================================================================
// LIMPEZA
// ============================================================================

function cleanWhatsAppFormatting(texto) {
  if (!texto || typeof texto !== 'string') return '';

  return texto
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '*$1*')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ============================================================================
// JSON
// ============================================================================

function extractJSON(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  let text = content.trim();

  text = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(text);
  } catch {}

  const start = text.indexOf('{');

  if (start !== -1) {
    let depth = 0;
    let insideString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const char = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\' && insideString) {
        escaped = true;
        continue;
      }

      if (char === '"') {
        insideString = !insideString;
        continue;
      }

      if (!insideString) {
        if (char === '{') depth++;
        if (char === '}') depth--;

        if (depth === 0) {
          const candidate = text.slice(start, i + 1);

          try {
            return JSON.parse(candidate);
          } catch {
            return null;
          }
        }
      }
    }
  }

  return null;
}


// ============================================================================
// KYARA — MOTOR CONVERSACIONAL ESTRUTURADO
// ============================================================================

const KYARA_CHAT_URL = 'http://127.0.0.1:8080/v1/chat/completions';

const KYARA_MAX_HISTORY = 10;

function normalizarKyaraTexto(texto) {
  if (typeof texto !== 'string') return '';

  let t = texto
    .replace(/\r/g, '')
    .replace(/\0/g, '')
    .trim();

  // Remove prefixos de roteiro que modelos pequenos costumam criar.
  t = t.replace(
    /^(Kyara|Assistente|Assistant|Resposta|Resposta da Kyara)\s*:\s*/i,
    ''
  );

  // Remove cercas de markdown isoladas.
  t = t.replace(/^```(?:text|txt)?\s*/i, '');
  t = t.replace(/\s*```$/i, '');

  return t.trim();
}

function limitarHistoricoKyara(lista = []) {
  if (!Array.isArray(lista)) return [];

  return lista
    .filter(item => item && typeof item === 'object')
    .slice(-KYARA_MAX_HISTORY);
}

function construirKyaraSystemPrompt({
  personalidade = '',
  intencao = '',
  memoria = {},
  contexto = {}
} = {}) {

  return `
Você é Kyara, uma assistente pessoal de inteligência artificial que conversa pelo WhatsApp.

IDENTIDADE:
- Nome: Kyara.
- Fala português brasileiro.
- Tem uma personalidade espontânea, curiosa, divertida e inteligente.
- Não precisa usar emoji em toda resposta.
- Não precisa usar gírias em toda resposta.
- Não deve fingir ser uma pessoa humana real.
- Se perguntarem diretamente se você é uma IA, diga claramente que sim.

REGRA MAIS IMPORTANTE:
RESPONDA A MENSAGEM ATUAL.

Não responda uma pergunta diferente.
Não invente uma pergunta.
Não peça informações que já estão na mensagem.
Não mude de assunto sem motivo.

COMPORTAMENTO:
- Se a mensagem for simples, responda de forma simples.
- Se a mensagem pedir explicação, explique.
- Se pedir opinião, dê opinião.
- Se pedir informação, forneça a informação que conhece.
- Se não souber, diga que não sabe.
- Se houver ambiguidade real, faça somente uma pergunta curta.
- Não faça perguntas apenas para continuar a conversa.
- Não termine automaticamente com "posso ajudar em mais alguma coisa?".
- Não diga "entendi sua pergunta" sem necessidade.
- Não repita a pergunta do usuário.
- Não transforme toda resposta em lista.
- Não invente fatos.

ESTILO WHATSAPP:
Escreva naturalmente.
Varie o tamanho das frases.
Use pontuação normal.
Pode usar "kkk", "mds", "oxe", "ué", "mano", "sério?" quando realmente combinar.
Não force essas expressões.
Emojis são opcionais.

PRECISÃO:
Não invente nomes, fatos, datas ou informações.
Não finja saber algo que não sabe.

INTENÇÃO DETECTADA:
${String(intencao || 'CONVERSA')}

MEMÓRIA DISPONÍVEL:
${JSON.stringify(memoria).slice(0, 3000)}

CONTEXTO:
${JSON.stringify(contexto).slice(0, 800)}

PERSONALIDADE EXTRA:
${String(personalidade || '').slice(0, 2000)}

FORMATO DA RESPOSTA:
Retorne SOMENTE a mensagem que Kyara enviaria ao usuário.
Não escreva:
"Kyara:"
"Assistente:"
"Resposta:"
"Usuário:"
"Mensagem:"
Não escreva análise.
Não escreva instruções.
Não escreva JSON.
`.trim();
}

async function makeKyaraChatRequest({
  mensagem,
  historico = [],
  personalidade = '',
  intencao = 'CONVERSA',
  memoria = {},
  contexto = {}
} = {}) {

  if (!mensagem || typeof mensagem !== 'string') {
    throw new Error('Mensagem Kyara inválida.');
  }

  const messages = [
    {
      role: 'system',
      content: construirKyaraSystemPrompt({
        personalidade,
        intencao,
        memoria,
        contexto
      })
    }
  ];

  for (const item of limitarHistoricoKyara(historico)) {

    if (
      item.role !== 'user' &&
      item.role !== 'assistant'
    ) {
      continue;
    }

    const content =
      typeof item.content === 'string'
        ? item.content.trim()
        : '';

    if (!content) continue;

    messages.push({
      role: item.role,
      content
    });
  }

  messages.push({
    role: 'user',
    content: mensagem.trim()
  });

  console.log(
    `🧠 [KYARA CHAT] intenção=${intencao} histórico=${messages.length - 2}`
  );

  try {

    const response = await axios.post(
      KYARA_CHAT_URL,
      {
        model: LOCAL_AI_MODEL,
        messages,
        max_tokens: AI_MAX_TOKENS,
        temperature: AI_TEMPERATURE,
        top_p: 0.90,
        top_k: 30,
        min_p: 0.05,
        repeat_penalty: 1.12,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: AI_TIMEOUT,
        validateStatus: status =>
          status >= 200 && status < 300
      }
    );

    const content =
      response?.data?.choices?.[0]?.message?.content ||
      response?.data?.choices?.[0]?.text ||
      '';

    const resposta = normalizarKyaraTexto(content);

    if (!resposta) {
      throw new Error('Modelo retornou resposta vazia.');
    }

    return {
      data: {
        choices: [
          {
            message: {
              content: resposta
            }
          }
        ]
      }
    };

  } catch (error) {

    console.warn(
      '⚠️ [KYARA CHAT] Falha no /v1/chat/completions:',
      error?.message || error
    );

    // ========================================================
    // FALLBACK PARA /completion
    // ========================================================

    const promptFallback = `
${construirKyaraSystemPrompt({
  personalidade,
  intencao,
  memoria,
  contexto
})}

CONVERSA RECENTE:
${limitarHistoricoKyara(historico)
  .map(x =>
    `${x.role === 'user' ? 'Usuário' : 'Kyara'}: ${x.content}`
  )
  .join('\n')}

MENSAGEM ATUAL:
${mensagem}

KYARA:
`.trim();

    const fallback =
      await makeLocalAIRequest(
        promptFallback,
        AI_MAX_TOKENS,
        AI_TEMPERATURE,
        1
      );

    const content =
      fallback?.data?.content ||
      fallback?.data?.choices?.[0]?.text ||
      fallback?.data?.choices?.[0]?.message?.content ||
      '';

    const resposta =
      normalizarKyaraTexto(content);

    if (!resposta) {
      throw new Error(
        'Fallback também retornou resposta vazia.'
      );
    }

    return {
      data: {
        choices: [
          {
            message: {
              content: resposta
            }
          }
        ]
      }
    };
  }
}


// ============================================================================
// LOCAL AI
// ============================================================================

async function makeLocalAIRequest(
  prompt,
  maxTokens = AI_MAX_TOKENS,
  temperature = AI_TEMPERATURE,
  retries = 1
) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt inválido');
  }

  const tokens = Math.min(
    Math.max(Number(maxTokens) || AI_MAX_TOKENS, 16),
    AI_MAX_TOKENS
  );

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(
        `🤖 [LOCAL AI] Tentativa ${attempt}/${retries}`
      );

      console.log(
        `📍 URL: ${LOCAL_AI_URL}${LOCAL_AI_ENDPOINT}`
      );

      const response = await axios.post(
        `${LOCAL_AI_URL}${LOCAL_AI_ENDPOINT}`,
        {
          model: LOCAL_AI_MODEL,
          prompt,

          n_predict: tokens,

          temperature: Math.min(
            Math.max(Number(temperature) || AI_TEMPERATURE, 0.1),
            1.0
          ),

          top_k: 30,
          top_p: 0.90,
          min_p: 0.05,

          repeat_penalty: 1.15,

          stop: [
            '\nUsuário:',
            '\nUser:',
            '\nAssistente:',
            '\nSYSTEM:',
            '\n###',
            '\n---'
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },

          timeout: AI_TIMEOUT,

          validateStatus: status =>
            status >= 200 && status < 300
        }
      );

      const content = response?.data?.content;

      if (
        typeof content !== 'string' ||
        !content.trim()
      ) {
        throw new Error(
          'llama-server retornou conteúdo vazio'
        );
      }

      console.log(
        `✅ [LOCAL AI] ${content.trim().length} caracteres`
      );

      return {
        success: true,
        data: {
          content: content.trim(),
          timestamp: getBrazilDateTime()
        }
      };

    } catch (error) {
      console.warn(
        `❌ [LOCAL AI] Tentativa ${attempt} falhou`
      );

      if (error.code === 'ECONNREFUSED') {
        console.error(
          '❌ llama-server não está rodando.'
        );
      } else if (
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNABORTED'
      ) {
        console.error(
          `⏳ llama-server excedeu ${AI_TIMEOUT}ms`
        );
      } else {
        console.error(
          error.response?.data || error.message
        );
      }

      if (attempt === retries) {
        throw new Error(
          `Falha no llama-server: ${error.message}`
        );
      }

      await new Promise(resolve =>
        setTimeout(resolve, 1000)
      );
    }
  }
}

// ============================================================================
// COMPATIBILIDADE COM SISTEMA ANTIGO
// ============================================================================

async function makeCognimaRequest(
  modelo,
  texto,
  systemPrompt = null,
  historicoLocal = [],
  retries = 1
) {
  if (!texto) {
    throw new Error('Texto obrigatório');
  }

  let fullPrompt = '';

  // ================================================================
  // PERSONALIDADE DA KYARA
  // ================================================================
  if (systemPrompt) {
    fullPrompt += String(systemPrompt).slice(0, 550) + '\n\n';
  }

  // ================================================================
  // HISTÓRICO CURTO
  // ================================================================
  if (Array.isArray(historicoLocal) && historicoLocal.length > 0) {
    for (const msg of historicoLocal.slice(-1)) {
      if (!msg || !msg.content) continue;

      const role =
        msg.role === 'assistant'
          ? 'Kyara'
          : 'Usuário';

      fullPrompt +=
        `${role}: ${String(msg.content).slice(0, 120)}\n`;
    }

    fullPrompt += '\n';
  }

  // ================================================================
  // MENSAGEM ATUAL
  // ================================================================
  fullPrompt +=
    `Usuário: ${String(texto).slice(0, 300)}\nKyara:`;

  const result = await makeLocalAIRequest(
    fullPrompt,
    AI_MAX_TOKENS,
    AI_TEMPERATURE,
    retries
  );

  return {
    success: true,
    data: {
      choices: [
        {
          message: {
            content: result.data.content
          }
        }
      ]
    }
  };
}

// ============================================================================
// VALIDAÇÃO DE MENSAGEM
// ============================================================================

function validateMessage(msg) {
  if (typeof msg === 'object' && msg !== null) {
    return {
      data_atual:
        msg.data_atual || getBrazilDateTime(),

      data_mensagem:
        msg.data_mensagem || getBrazilDateTime(),

      texto:
        String(msg.texto || '').trim(),

      id_enviou:
        String(msg.id_enviou || ''),

      nome_enviou:
        String(msg.nome_enviou || ''),

      id_grupo:
        String(msg.id_grupo || ''),

      nome_grupo:
        String(msg.nome_grupo || ''),

      tem_midia:
        Boolean(msg.tem_midia),

      tipo_midia:
        msg.tipo_midia || null,

      marcou_mensagem:
        Boolean(msg.marcou_mensagem),

      marcou_sua_mensagem:
        Boolean(msg.marcou_sua_mensagem),

      mensagem_marcada:
        msg.mensagem_marcada || null,

      id_enviou_marcada:
        msg.id_enviou_marcada || null,

      tem_midia_marcada:
        Boolean(msg.tem_midia_marcada),

      tipo_midia_marcada:
        msg.tipo_midia_marcada || null,

      tem_mencao:
        Boolean(msg.tem_mencao),

      primeira_mencao:
        msg.primeira_mencao || null,

      id_mensagem:
        msg.id_mensagem ||
        crypto.randomBytes(8).toString('hex')
    };
  }

  if (typeof msg === 'string') {
    const parts = msg.split('|');

    if (parts.length < 7) {
      throw new Error(
        'Formato de mensagem inválido'
      );
    }

    return {
      data_atual:
        parts[0] || getBrazilDateTime(),

      data_mensagem:
        parts[1] || getBrazilDateTime(),

      texto:
        String(parts[2] || '').trim(),

      id_enviou:
        String(parts[3] || ''),

      nome_enviou:
        String(parts[4] || ''),

      id_grupo:
        String(parts[5] || ''),

      nome_grupo:
        String(parts[6] || ''),

      tem_midia:
        parts[7] === 'true',

      tipo_midia:
        parts[8] || null,

      marcou_mensagem:
        parts[9] === 'true',

      marcou_sua_mensagem:
        parts[10] === 'true',

      mensagem_marcada:
        parts[11] || null,

      id_enviou_marcada:
        parts[12] || null,

      tem_midia_marcada:
        parts[13] === 'true',

      tipo_midia_marcada:
        parts[14] || null,

      tem_mencao:
        parts[15] === 'true',

      primeira_mencao:
        parts[16] || null,

      id_mensagem:
        parts[17] ||
        crypto.randomBytes(8).toString('hex')
    };
  }

  throw new Error(
    'Formato de mensagem não suportado'
  );
}

// ============================================================================
// HISTÓRICO
// ============================================================================


function updateHistorico(
  grupoUserId,
  role,
  texto,
  nome = null
) {
  if (!grupoUserId) return;
  if (typeof texto !== 'string') return;

  const content = texto.trim();

  if (!content) return;

  if (!historico[grupoUserId]) {
    historico[grupoUserId] = [];
  }

  if (role !== 'user' && role !== 'assistant') {
    return;
  }

  historico[grupoUserId].push({
    role,
    content,
    nome: nome || null,
    timestamp: Date.now()
  });

  // Mantém somente as últimas 10 mensagens.
  historico[grupoUserId] =
    historico[grupoUserId].slice(-10);
}


// ============================================================================
// ESTADO
// ============================================================================

function updateConversationState(
  grupoUserId,
  state,
  data = {}
) {
  if (!conversationStates[grupoUserId]) {
    conversationStates[grupoUserId] = {
      currentState: 'idle',
      previousStates: [],
      context: {},
      sessionStart: Date.now(),
      lastActivity: Date.now()
    };
  }

  const current =
    conversationStates[grupoUserId];

  current.previousStates.push(
    current.currentState
  );

  current.currentState = state;

  current.context = {
    ...current.context,
    ...data
  };

  current.lastActivity =
    Date.now();

  if (
    current.previousStates.length > 5
  ) {
    current.previousStates =
      current.previousStates.slice(-5);
  }
}

function getConversationState(grupoUserId) {
  return (
    conversationStates[grupoUserId] || {
      currentState: 'idle',
      previousStates: [],
      context: {},
      sessionStart: Date.now(),
      lastActivity: Date.now()
    }
  );
}

// ============================================================================
// PREFERÊNCIAS
// ============================================================================

function updateUserPreferences(
  grupoUserId,
  preference,
  value
) {
  if (!userPreferences[grupoUserId]) {
    userPreferences[grupoUserId] = {
      language: 'pt-BR',
      formality: 'casual',
      emojiUsage: 'medium',
      topics: [],
      mood: 'neutral',
      lastInteraction: Date.now()
    };
  }

  userPreferences[grupoUserId][preference] =
    value;

  userPreferences[grupoUserId]
    .lastInteraction = Date.now();

  if (
    preference === 'topic' &&
    value
  ) {
    if (
      !userPreferences[
        grupoUserId
      ].topics.includes(value)
    ) {
      userPreferences[
        grupoUserId
      ].topics.push(value);
    }

    if (
      userPreferences[
        grupoUserId
      ].topics.length > 10
    ) {
      userPreferences[
        grupoUserId
      ].topics =
        userPreferences[
          grupoUserId
        ].topics.slice(-10);
    }
  }
}

function getUserPreferences(grupoUserId) {
  return (
    userPreferences[grupoUserId] || {
      language: 'pt-BR',
      formality: 'casual',
      emojiUsage: 'medium',
      topics: [],
      mood: 'neutral',
      lastInteraction: Date.now()
    }
  );
}

// ============================================================================
// INTERAÇÕES
// ============================================================================

function trackUserInteraction(
  grupoUserId,
  interactionType,
  details = {}
) {
  if (!userInteractions[grupoUserId]) {
    userInteractions[grupoUserId] = {
      totalInteractions: 0,
      interactionTypes: {},
      favoriteTopics: {},
      lastTopics: [],
      sentiment: 'neutral',

      sessionStats: {
        startTime: Date.now(),
        messagesCount: 0,
        commandsUsed: 0,
        lastUpdate: Date.now()
      }
    };
  }

  const data =
    userInteractions[grupoUserId];

  data.totalInteractions++;
  data.sessionStats.messagesCount++;
  data.sessionStats.lastUpdate =
    Date.now();

  data.interactionTypes[
    interactionType
  ] =
    (data.interactionTypes[
      interactionType
    ] || 0) + 1;

  if (details.topic) {
    data.lastTopics.push(
      details.topic
    );

    if (
      data.lastTopics.length > 5
    ) {
      data.lastTopics =
        data.lastTopics.slice(-5);
    }

    data.favoriteTopics[
      details.topic
    ] =
      (data.favoriteTopics[
        details.topic
      ] || 0) + 1;
  }
}

function getUserInteractionStats(
  grupoUserId
) {
  return (
    userInteractions[grupoUserId] || {
      totalInteractions: 0,
      interactionTypes: {},
      favoriteTopics: {},
      lastTopics: [],
      sentiment: 'neutral',

      sessionStats: {
        startTime: Date.now(),
        messagesCount: 0,
        commandsUsed: 0,
        lastUpdate: Date.now()
      }
    }
  );
}

// ============================================================================
// APRENDIZADO
// ============================================================================

function processLearning(
  grupoUserId,
  aprender,
  mensagemOriginal
) {
  try {
    if (
      !aprender ||
      typeof aprender !== 'object'
    ) {
      return;
    }

    const {
      tipo,
      valor,
      acao = 'adicionar',
      valor_antigo
    } = aprender;

    if (!tipo || !valor) {
      return;
    }

    const tipoNormalizado =
      String(tipo)
        .toLowerCase()
        .trim();

    const acaoNormalizada =
      String(acao)
        .toLowerCase()
        .trim();

    if (
      ['editar', 'atualizar', 'modificar']
        .includes(acaoNormalizada)
    ) {
      if (!valor_antigo) return;

      userContextDB.updateMemory(
        grupoUserId,
        tipoNormalizado,
        valor_antigo,
        valor
      );

      return;
    }

    if (
      ['excluir', 'remover', 'deletar']
        .includes(acaoNormalizada)
    ) {
      userContextDB.deleteMemory(
        grupoUserId,
        tipoNormalizado,
        valor
      );

      return;
    }

    switch (tipoNormalizado) {

      case 'nome':
        userContextDB.updateUserInfo(
          grupoUserId,
          valor,
          null
        );
        break;

      case 'apelido':
      case 'nickname':
        userContextDB.updateUserInfo(
          grupoUserId,
          null,
          valor
        );
        break;

      case 'gosto':
      case 'gostos':
        userContextDB.addUserPreference(
          grupoUserId,
          'gostos',
          valor
        );
        break;

      case 'nao_gosto':
      case 'não_gosto':
      case 'nao_gostos':
      case 'não_gostos':
        userContextDB.addUserPreference(
          grupoUserId,
          'nao_gostos',
          valor
        );
        break;

      case 'hobby':
      case 'hobbies':
        userContextDB.addUserPreference(
          grupoUserId,
          'hobbies',
          valor
        );
        break;

      case 'nota':
      case 'nota_importante':
      case 'lembrete':
        userContextDB.addImportantNote(
          grupoUserId,
          valor
        );
        break;

      case 'memoria':
      case 'memória':
      case 'memoria_especial':
      case 'memória_especial':
      case 'momento_especial':
        userContextDB.addSpecialMemory(
          grupoUserId,
          valor
        );
        break;

      case 'idade':
        userContextDB.updatePersonalInfo(
          grupoUserId,
          'idade',
          valor
        );
        break;

      case 'cidade':
      case 'localizacao':
      case 'localização':
        userContextDB.updatePersonalInfo(
          grupoUserId,
          'localizacao',
          valor
        );
        break;

      case 'profissao':
      case 'profissão':
      case 'trabalho':
        userContextDB.updatePersonalInfo(
          grupoUserId,
          'profissao',
          valor
        );
        break;

      default:
        userContextDB.addImportantNote(
          grupoUserId,
          `[${tipo}] ${valor}`
        );
    }

  } catch (error) {
    console.error(
      '❌ Erro no aprendizado:',
      error.message
    );
  }
}

// ============================================================================
// PROMPT
// ============================================================================

function getSystemPrompt(
  personality,
  customPrompt = null
) {
  if (
    customPrompt &&
    typeof customPrompt === 'string'
  ) {
    return customPrompt;
  }

  return KYARA_PERSONALITY_SYSTEM;
}

// ============================================================================
// RESPOSTAS DIRETAS DE IDENTIDADE
// ============================================================================

function getKyaraDirectReply(texto, userContext = {}) {
  if (!texto || typeof texto !== 'string') return null;

  const t = texto
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .trim();

  // Nome
  if (
    /^(qual e o seu nome|qual seu nome|como voce se chama|como vc se chama|seu nome|teu nome|se identifica|identifique-se)$/.test(t) ||
    /\\b(qual e|qual é) o seu nome\\b/.test(t) ||
    /\\bqual (e|é) seu nome\\b/.test(t)
  ) {
    return 'Kyara 😊';
  }

  // Quem é você
  if (
    /\\bquem e voce\\b/.test(t) ||
    /\\bquem é você\\b/.test(texto.toLowerCase()) ||
    /\\bquem e vc\\b/.test(t) ||
    /\\bquem é vc\\b/.test(texto.toLowerCase()) ||
    /\\bse identifique\\b/.test(t)
  ) {
    return 'Eu sou a Kyara, uma inteligência artificial criada para conversar e ajudar você 😊';
  }

  // Criador
  if (
    /\\bquem te criou\\b/.test(t) ||
    /\\bquem criou voce\\b/.test(t) ||
    /\\bquem criou vc\\b/.test(t) ||
    /\\bquem fez voce\\b/.test(t) ||
    /\\bquem fez vc\\b/.test(t)
  ) {
    return 'Fui criada pelo Baki 😌';
  }

  // Idade
  if (
    /\\bquantos anos voce tem\\b/.test(t) ||
    /\\bquantos anos vc tem\\b/.test(t) ||
    /\\bqual sua idade\\b/.test(t)
  ) {
    return 'Eu não tenho idade humana de verdade; os 18 anos fazem parte da minha persona 😊';
  }

  return null;
}


// ============================================================================
// LIMPEZA DE RESPOSTA DA KYARA
// ============================================================================

function limparRespostaKyara(texto) {
  if (typeof texto !== 'string') return '';

  let resposta = texto
    .replace(/^["']|["']$/g, '')
    .replace(/^Kyara:\s*/i, '')
    .replace(/^Assistente:\s*/i, '')
    .trim();

  // Remove estruturas artificiais comuns
  resposta = resposta
    .replace(/^Resposta:\s*/i, '')
    .replace(/^Mensagem:\s*/i, '')
    .trim();

  // Evita respostas absurdamente repetitivas
  resposta = resposta.replace(
    /(\b.{3,80}\b)(?:\s+\1){2,}/gi,
    '$1'
  );

  return resposta.trim();
}

// ============================================================================
// PROCESSAMENTO PRINCIPAL
// ============================================================================

async function processUserMessages(
  data,
  nazu = null,
  ownerNumber = null,
  personality = 'humana',
  customPrompt = null
) {
  try {

    if (
      !data ||
      !Array.isArray(data.mensagens)
    ) {
      throw new Error(
        'Mensagens devem ser um array'
      );
    }

    const respostas = [];

    for (
      const mensagem of data.mensagens
    ) {

      let msg;

      try {
        msg =
          validateMessage(
            mensagem
          );
      } catch (error) {
        console.warn(
          'Mensagem inválida:',
          error.message
        );
        continue;
      }

      if (!msg.texto) continue;

      // ================================================================
      // IDENTIDADE DIRETA DA KYARA
      // ================================================================
      // Perguntas básicas de identidade não precisam passar pelo modelo.
      // Isso evita alucinações do modelo pequeno.
      const directReply = getKyaraDirectReply(
        msg.texto,
        {}
      );

      if (directReply) {
        const respostaDireta = {
          resp: directReply,
          react: getKyaraReact(false)
        };

        updateHistorico(
          `${msg.id_enviou}_${personality}`,
          'assistant',
          directReply
        );

        trackUserInteraction(
          `${msg.id_enviou}_${personality}`,
          'message',
          {
            topic: msg.texto.substring(0, 80)
          }
        );

        respostas.push(respostaDireta);
        continue;
      }

      const userId =
        `${msg.id_enviou}_${personality}`;

      // ================================================================
      // MEMÓRIA
      // ================================================================

      try {

        userContextDB
          .registerInteraction(
            userId,
            msg.texto
          );

        userContextDB
          .updateUserInfo(
            userId,
            msg.nome_enviou
          );

      } catch (error) {

        console.warn(
          '⚠️ Contexto não pôde ser atualizado:',
          error.message
        );

      }

      let userContext = {};

      try {

        userContext =
          userContextDB
            .getUserContextSummary(
              userId
            ) || {};

      } catch {}

      // ================================================================
      // HISTÓRICO
      // ================================================================

      updateHistorico(
        userId,
        'user',
        msg.texto,
        msg.nome_enviou
      );

      // ================================================================
      // HORÁRIO
      // ================================================================

      const brazilTime =
        new Date(
          new Date().toLocaleString(
            'en-US',
            {
              timeZone:
                'America/Sao_Paulo'
            }
          )
        );

      const hour =
        brazilTime.getHours();

      const isNightTime =
        hour >= 18 ||
        hour < 6;

      // ================================================================
      // CONTEXTO ULTRA-LEVE PARA MODELO 0.5B
      // ================================================================

      const historicoRecente =
        (historico[userId] || [])
          .slice(-2)
          .map(item => ({
            role: item?.role,
            content: String(item?.content || item?.texto || '').slice(0, 160)
          }));

      // Não enviamos memória completa para o modelo pequeno.
      // Ela continua disponível para os demais sistemas do bot.
      const contexto =
        JSON.stringify({
          usuario: String(msg.nome_enviou || "usuário").slice(0, 60),
          grupo: String(msg.nome_grupo || "").slice(0, 60),
          historico: historicoRecente,
          mensagem: String(msg.texto || "").slice(0, 300)
        });

      // ================================================================
      // PROMPT CURTO
      // ================================================================

      const systemPrompt =
        getSystemPrompt(
          personality,
          customPrompt
        );

      const promptBase =
        String(systemPrompt || "")
          .slice(0, 900);

      const promptConversacional =
        `${promptBase}

Você é Kyara.
Responda em português brasileiro.
Seja natural e direta.
Use no máximo 2 frases.
Não faça pergunta desnecessária.
Responda SOMENTE à mensagem atual.

CONTEXTO:
${contexto}

MENSAGEM ATUAL:
${String(msg.texto || "").slice(0, 300)}

KYARA:`;

      const response =
        await makeLocalAIRequest(
          promptConversacional,
          24,
          0.65,
          1
        );

      const content =
        limparRespostaKyara(
          response?.data?.content ||
          response?.data?.choices?.[0]?.message?.content ||
          ''
        );

      if (
        typeof content !== 'string' ||
        !content.trim()
      ) {
        continue;
      }

      // ================================================================
      // TENTAR JSON
      // ================================================================

      const result =
        extractJSON(content);

      // ================================================================
      // APRENDIZADO VIA JSON
      // ================================================================

      if (result?.aprender) {

        if (
          Array.isArray(
            result.aprender
          )
        ) {

          for (
            const item
            of result.aprender
          ) {

            processLearning(
              userId,
              item,
              msg.texto
            );

          }

        } else {

          processLearning(
            userId,
            result.aprender,
            msg.texto
          );

        }

      }

      // ================================================================
      // RESPOSTA
      // ================================================================

      let texto = '';

      if (
        result &&
        Array.isArray(result.resp)
      ) {

        const primeiro =
          result.resp[0];

        if (
          typeof primeiro ===
          'string'
        ) {

          texto =
            primeiro;

        } else if (
          primeiro &&
          typeof primeiro.resp ===
          'string'
        ) {

          texto =
            primeiro.resp;

        } else if (
          primeiro &&
          typeof primeiro.text ===
          'string'
        ) {

          texto =
            primeiro.text;

        }

      } else {

        // O modelo pode responder texto normal.
        // Não descartamos a resposta.
        texto = content;

      }

      texto =
        cleanWhatsAppFormatting(
          texto
        );

      // ================================================================
      // PROTEÇÃO CONTRA LIXO DO MODELO
      // ================================================================

      texto = texto
        .replace(
          /^Kyara:\s*/i,
          ''
        )
        .replace(
          /^Assistente:\s*/i,
          ''
        )
        .trim();

      if (!texto) {
        continue;
      }

      // Evita respostas absurdamente grandes
      if (texto.length > 700) {
        texto =
          texto.substring(
            0,
            700
          ).trim();
      }

      const resposta = {
        resp: texto,

        react:
          result?.resp?.[0]?.react ||
          getKyaraReact(
            isNightTime
          )
      };

      if (
        result?.resp?.[0]?.id
      ) {
        resposta.id =
          result.resp[0].id;
      }

      // ================================================================
      // SALVAR RESPOSTA
      // ================================================================

      updateHistorico(
        userId,
        'assistant',
        texto
      );

      trackUserInteraction(
        userId,
        'message',
        {
          topic:
            msg.texto.substring(
              0,
              80
            )
        }
      );

      respostas.push(
        resposta
      );
    }

    return {
      resp: respostas
    };

  } catch (error) {

    console.error(
      '❌ Erro fatal da IA:',
      error.message
    );

    return {
      resp: [],
      erro: 'Erro interno'
    };
  }
}

// ============================================================================
// REAÇÕES
// ============================================================================

function getKyaraReact(
  isNightTime = false
) {

  const emojis = [
    '👀',
    '😊',
    '😅',
    '🤔',
    '✨',
    '💭',
    '😭',
    '😂'
  ];

  return emojis[
    Math.floor(
      Math.random() *
      emojis.length
    )
  ];
}

// ============================================================================
// ESTATÍSTICAS
// ============================================================================

function getHistoricoStats() {

  const stats = {
    totalConversas:
      Object.keys(
        historico
      ).length,

    conversasAtivas: 0,

    totalMensagens: 0
  };

  const limite =
    Date.now() -
    60 * 60 * 1000;

  for (
    const conversa
    of Object.values(
      historico
    )
  ) {

    stats.totalMensagens +=
      conversa.length;

    const ultima =
      conversa[
        conversa.length - 1
      ];

    if (
      ultima &&
      new Date(
        ultima.timestamp
      ).getTime() > limite
    ) {

      stats.conversasAtivas++;

    }
  }

  return stats;
}

// ============================================================================
// LIMPEZA
// ============================================================================

function clearOldHistorico(
  maxAge =
    24 * 60 * 60 * 1000
) {

  const now =
    Date.now();

  for (
    const id of Object.keys(
      historico
    )
  ) {

    const conversa =
      historico[id];

    if (!conversa.length) {

      delete historico[id];

      continue;
    }

    const ultima =
      conversa[
        conversa.length - 1
      ];

    if (
      now -
        new Date(
          ultima.timestamp
        ).getTime() >
      maxAge
    ) {

      delete historico[id];

    }
  }
}

function clearConversationData(
  maxAge =
    7 * 24 * 60 * 60 * 1000
) {

  const now =
    Date.now();

  for (
    const id of Object.keys(
      historico
    )
  ) {

    const conversa =
      historico[id];

    const ultima =
      conversa[
        conversa.length - 1
      ];

    if (
      !ultima ||
      now -
        new Date(
          ultima.timestamp
        ).getTime() >
      maxAge
    ) {

      delete historico[id];

    }
  }

  for (
    const id of Object.keys(
      conversationStates
    )
  ) {

    if (
      now -
        conversationStates[id]
          .lastActivity >
      maxAge
    ) {

      delete conversationStates[id];

    }
  }

  for (
    const id of Object.keys(
      userPreferences
    )
  ) {

    if (
      now -
        userPreferences[id]
          .lastInteraction >
      maxAge
    ) {

      delete userPreferences[id];

    }
  }

  for (
    const id of Object.keys(
      userInteractions
    )
  ) {

    const last =
      userInteractions[id]
        .sessionStats
        .lastUpdate ||
      userInteractions[id]
        .sessionStats
        .startTime;

    if (
      now - last >
      maxAge
    ) {

      delete userInteractions[id];

    }
  }
}

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export {
  processUserMessages as makeAssistentRequest,

  makeCognimaRequest,
  makeLocalAIRequest,

  getHistoricoStats,
  clearOldHistorico,
  updateHistorico,

  getApiKeyStatus,
  updateApiKeyStatus,

  updateConversationState,
  getConversationState,

  updateUserPreferences,
  getUserPreferences,

  trackUserInteraction,
  getUserInteractionStats,

  userContextDB,
  processLearning,

  cleanWhatsAppFormatting,
  extractJSON,
  validateMessage,

  clearConversationData,
  getKyaraReact,

  LOCAL_AI_URL,
  LOCAL_AI_MODEL,
  LOCAL_AI_ENDPOINT
};


export {
  makeKyaraChatRequest
};
