/**
 * KYARA EXPERIMENTAL INTENT ENGINE
 *
 * Classificador leve, sem IA externa.
 *
 * Serve como primeira camada antes de um futuro
 * roteador de agentes.
 */

const RULES = [

  {
    intent: 'YOUTUBE',
    patterns: [
      /\byoutube\b/i,
      /\bvídeo\b/i,
      /\bvideo\b/i,
      /\bshorts?\b/i
    ]
  },

  {
    intent: 'BROWSER',
    patterns: [
      /\bnavegador\b/i,
      /\bbrowser\b/i,
      /\bsite\b/i,
      /\blink\b/i,
      /\bpesquisa\b/i,
      /\bpesquisar\b/i
    ]
  },

  {
    intent: 'GAME',
    patterns: [
      /\bjogo\b/i,
      /\bjogar\b/i,
      /\bgame\b/i,
      /\bgames\b/i
    ]
  },

  {
    intent: 'MEMORY',
    patterns: [
      /\blembra\b/i,
      /\blembrar\b/i,
      /\bmemória\b/i,
      /\bmemoria\b/i,
      /\besquece\b/i,
      /\besquecer\b/i
    ]
  },

  {
    intent: 'AI',
    patterns: [
      /\bia\b/i,
      /\binteligência artificial\b/i,
      /\binteligencia artificial\b/i,
      /\bkyara\b/i
    ]
  },

  {
    intent: 'ADMIN',
    patterns: [
      /\badmin\b/i,
      /\badministrador\b/i,
      /\bdono\b/i,
      /\bconfiguração\b/i,
      /\bconfiguracao\b/i
    ]
  }
];

export function detectExperimentalIntent(text = '') {

  const input = String(text || '').trim();

  if (!input) {
    return {
      intent: 'EMPTY',
      confidence: 1,
      matches: []
    };
  }

  const matches = [];

  for (const rule of RULES) {

    const hits =
      rule.patterns.filter(
        pattern => pattern.test(input)
      );

    if (hits.length) {

      matches.push({
        intent: rule.intent,
        score: hits.length
      });
    }
  }

  matches.sort(
    (a, b) => b.score - a.score
  );

  const winner = matches[0];

  if (!winner) {

    return {
      intent: 'UNKNOWN',
      confidence: 0,
      matches: []
    };
  }

  const confidence =
    Math.min(
      1,
      0.45 + winner.score * 0.15
    );

  return {
    intent: winner.intent,
    confidence,
    matches
  };
}

export default {
  detectExperimentalIntent
};
