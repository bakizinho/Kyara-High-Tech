/**
 * KYARA TOOL REGISTRY
 *
 * Catálogo central das ferramentas disponíveis.
 *
 * Não executa ferramentas automaticamente.
 * Apenas registra capacidades e metadados.
 */

const tools = new Map();

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export function registerTool({
  name,
  description = '',
  category = 'general',
  enabled = true,
  handler = null,
  metadata = {}
} = {}) {

  const id = normalizeName(name);

  if (!id) {
    throw new Error('[KYARA TOOLS] Nome inválido.');
  }

  tools.set(id, {
    id,
    name: String(name),
    description: String(description),
    category: String(category),
    enabled: Boolean(enabled),
    handler: typeof handler === 'function' ? handler : null,
    metadata: metadata && typeof metadata === 'object'
      ? { ...metadata }
      : {},
    registeredAt: Date.now()
  });

  return tools.get(id);
}

export function unregisterTool(name) {
  return tools.delete(normalizeName(name));
}

export function getTool(name) {
  return tools.get(normalizeName(name)) || null;
}

export function hasTool(name) {
  return tools.has(normalizeName(name));
}

export function listTools({
  category = null,
  enabledOnly = false
} = {}) {

  let result = [...tools.values()];

  if (category) {
    result = result.filter(
      tool => tool.category === category
    );
  }

  if (enabledOnly) {
    result = result.filter(
      tool => tool.enabled
    );
  }

  return result.map(tool => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    category: tool.category,
    enabled: tool.enabled,
    metadata: { ...tool.metadata }
  }));
}

export function setToolEnabled(name, enabled) {

  const tool = getTool(name);

  if (!tool) {
    return false;
  }

  tool.enabled = Boolean(enabled);

  return true;
}

export function getToolStats() {

  const all = [...tools.values()];

  return {
    total: all.length,
    enabled: all.filter(t => t.enabled).length,
    disabled: all.filter(t => !t.enabled).length,
    categories: [...new Set(all.map(t => t.category))]
  };
}

/*
 * Ferramentas básicas da própria Kyara.
 * Elas representam capacidades; a execução real continua
 * sendo responsabilidade dos módulos existentes.
 */

registerTool({
  name: 'kyara-ai',
  description: 'Motor de inteligência da Kyara.',
  category: 'ai'
});

registerTool({
  name: 'kyara-memory',
  description: 'Memória contextual local.',
  category: 'memory'
});

registerTool({
  name: 'kyara-knowledge',
  description: 'Conhecimento dinâmico do projeto.',
  category: 'knowledge'
});

registerTool({
  name: 'kyara-browser',
  description: 'Sistema de navegador da Kyara.',
  category: 'web'
});

registerTool({
  name: 'kyara-tube',
  description: 'Sistema de vídeo da Kyara.',
  category: 'media'
});

registerTool({
  name: 'kyara-games',
  description: 'Central experimental de jogos.',
  category: 'games'
});

export default {
  registerTool,
  unregisterTool,
  getTool,
  hasTool,
  listTools,
  setToolEnabled,
  getToolStats
};
