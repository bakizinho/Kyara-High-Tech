/**
 * KYARA EXPERIMENTAL PLANNER ENGINE
 *
 * Transforma uma intenção detectada em um plano.
 *
 * IMPORTANTE:
 * Este módulo NÃO executa ferramentas.
 * Ele apenas descreve o que poderia ser executado.
 */

const INTENT_PLANS = {
  YOUTUBE: {
    tool: 'kyara-tube',
    action: 'search',
    description: 'Pesquisar conteúdo de vídeo'
  },

  BROWSER: {
    tool: 'kyara-browser',
    action: 'search',
    description: 'Pesquisar conteúdo na web'
  },

  GAME: {
    tool: 'kyara-games',
    action: 'open',
    description: 'Abrir ou localizar um jogo'
  },

  MEMORY: {
    tool: 'kyara-memory',
    action: 'recall',
    description: 'Consultar memória contextual'
  },

  AI: {
    tool: 'kyara-ai',
    action: 'respond',
    description: 'Processar solicitação com IA'
  },

  ADMIN: {
    tool: 'kyara-knowledge',
    action: 'inspect',
    description: 'Consultar configuração/conhecimento'
  },

  UNKNOWN: {
    tool: 'kyara-ai',
    action: 'respond',
    description: 'Processamento geral'
  },

  EMPTY: {
    tool: 'kyara-ai',
    action: 'respond',
    description: 'Processamento geral'
  }
};

function normalizeText(text = '') {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function extractQuery(text = '') {
  const normalized = normalizeText(text);

  return normalized
    .replace(/^\/(youtube|yt|browser|search|jogo|game)\b/i, '')
    .trim();
}

export function createPlan({
  text = '',
  analysis = {}
} = {}) {

  const normalized = normalizeText(text);

  const intent =
    analysis?.intent || 'UNKNOWN';

  const confidence =
    Number.isFinite(analysis?.confidence)
      ? analysis.confidence
      : 0;

  const definition =
    INTENT_PLANS[intent] ||
    INTENT_PLANS.UNKNOWN;

  const query =
    extractQuery(normalized);

  const plan = {
    id:
      `plan-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    version: '1.0.0',

    status: 'PLANNED',

    intent,

    confidence,

    input: normalized,

    steps: [
      {
        order: 1,
        type: 'TOOL',
        tool: definition.tool,
        action: definition.action,
        query
      }
    ],

    metadata: {
      description: definition.description,
      generatedAt: new Date().toISOString()
    }
  };

  return plan;
}

export function validatePlan(plan) {

  if (!plan || typeof plan !== 'object') {
    return {
      valid: false,
      errors: ['Plano inválido.']
    };
  }

  const errors = [];

  if (!plan.id) {
    errors.push('Plano sem ID.');
  }

  if (!plan.intent) {
    errors.push('Plano sem intenção.');
  }

  if (!Array.isArray(plan.steps) || !plan.steps.length) {
    errors.push('Plano sem etapas.');
  }

  for (const step of plan.steps || []) {

    if (!step.tool) {
      errors.push(
        `Etapa ${step.order || '?'} sem ferramenta.`
      );
    }

    if (!step.action) {
      errors.push(
        `Etapa ${step.order || '?'} sem ação.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  createPlan,
  validatePlan
};
