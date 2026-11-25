/**
 * KYARA EXPERIMENTAL ENGINE
 *
 * Núcleo experimental da nova arquitetura.
 */

import {
  detectExperimentalIntent
} from './intentEngine.js';

import {
  emit
} from './eventEngine.js';

import {
  getToolStats,
  listTools
} from './toolRegistry.js';

import {
  remember,
  recall,
  forget,
  listMemory
} from './memory.js';

import {
  createPlan,
  validatePlan
} from './plannerEngine.js';


import {

  executePlan,
  registerAction,
  unregisterAction,
  listActions,
  getExecutionHistory,
  clearExecutionHistory
} from './actionEngine.js';

const startedAt = Date.now();

import { orchestrateMessage } from './orchestratorEngine.js';
export function getExperimentalStatus() {

  return {
    enabled: true,

    version:
      '1.1.0-experimental',

    uptimeMs:
      Date.now() - startedAt,

    tools:
      getToolStats(),

    actions:
      listActions()
  };
}

export function analyzeMessage(text = '') {

  const intent =
    detectExperimentalIntent(text);

  return {
    intent:
      intent.intent,

    confidence:
      intent.confidence,

    matches:
      intent.matches,

    tools:
      listTools({
        enabledOnly: true
      })
  };
}

export function planMessage(text = '') {

  const analysis =
    analyzeMessage(text);

  const plan =
    createPlan({
      text,
      analysis
    });

  return {
    analysis,
    plan,
    validation:
      validatePlan(plan)
  };
}

export async function processExperimentalMessage({
  text = '',
  scope = 'global',
  id = 'default',
  message = {}
} = {}) {

  const planned =
    planMessage(text);

  await emit(
    'message:analyzed',
    {
      text,
      analysis: planned.analysis,
      plan: planned.plan,
      message
    }
  );

  return {
    analysis:
      planned.analysis,

    plan:
      planned.plan,

    validation:
      planned.validation,

    memory: {
      scope,
      id
    }
  };
}

export {
  remember,
  recall,
  forget,
  listMemory,

  createPlan,
  validatePlan,

  orchestrateMessage,

  executePlan,
  registerAction,
  unregisterAction,
  listActions,
  getExecutionHistory,
  clearExecutionHistory
};

export default {
  getExperimentalStatus,
  analyzeMessage,
  planMessage,
  processExperimentalMessage,

  remember,
  recall,
  forget,
  listMemory,

  createPlan,
  validatePlan,


  orchestrateMessage,

  executePlan,
  registerAction,
  unregisterAction,
  listActions,
  getExecutionHistory,
  clearExecutionHistory
};
