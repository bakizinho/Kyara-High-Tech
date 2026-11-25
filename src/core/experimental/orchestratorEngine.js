/**
 * KYARA EXPERIMENTAL ORCHESTRATOR ENGINE
 *
 * Coordena:
 *
 * mensagem
 *   ↓
 * análise
 *   ↓
 * plano
 *   ↓
 * validação
 *   ↓
 * execução
 *
 * IMPORTANTE:
 * A execução real permanece DESLIGADA por padrão.
 */

import {
  analyzeMessage,
  planMessage
} from './index.js';

import {
  executePlan
} from './actionEngine.js';

export async function orchestrateMessage(
  text = '',
  {
    dryRun = true,
    context = {},
    execute = true
  } = {}
) {

  const analysis =
    analyzeMessage(text);

  const planned =
    planMessage(text);

  const result = {
    input: text,
    analysis,
    plan: planned.plan,
    validation: planned.validation,
    execution: null
  };

  if (!planned.validation.valid) {
    return {
      ...result,
      execution: {
        status: 'INVALID_PLAN',
        results: []
      }
    };
  }

  if (!execute) {
    return {
      ...result,
      execution: {
        status: 'NOT_EXECUTED',
        results: []
      }
    };
  }

  const execution =
    await executePlan(
      planned.plan,
      {
        dryRun,
        context
      }
    );

  result.execution = execution;

  return result;
}

export default {
  orchestrateMessage
};
