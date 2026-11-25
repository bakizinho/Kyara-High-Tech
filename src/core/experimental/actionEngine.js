/**
 * KYARA EXPERIMENTAL ACTION ENGINE
 *
 * Camada de execução controlada.
 *
 * Por padrão, o engine funciona em DRY-RUN.
 * Isso significa que ele NÃO dispara ações reais.
 *
 * Ferramentas reais poderão ser conectadas posteriormente.
 */

const handlers = new Map();

const executionHistory = [];

export function registerAction(tool, action, handler) {

  if (
    typeof tool !== 'string' ||
    typeof action !== 'string' ||
    typeof handler !== 'function'
  ) {
    return false;
  }

  const key = `${tool}:${action}`;

  handlers.set(key, handler);

  return true;
}

export function unregisterAction(tool, action) {

  const key = `${tool}:${action}`;

  return handlers.delete(key);
}

export function listActions() {

  return [...handlers.entries()]
    .map(([key]) => {

      const [tool, action] =
        key.split(':');

      return {
        tool,
        action
      };
    });
}

export async function executePlan(
  plan,
  {
    dryRun = true,
    context = {}
  } = {}
) {

  if (
    !plan ||
    !Array.isArray(plan.steps)
  ) {
    throw new Error(
      'Plano inválido para execução.'
    );
  }

  const execution = {
    id:
      `exec-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    planId: plan.id,

    dryRun,

    startedAt:
      new Date().toISOString(),

    results: []
  };

  for (const step of plan.steps) {

    const key =
      `${step.tool}:${step.action}`;

    const handler =
      handlers.get(key);

    if (dryRun) {

      execution.results.push({
        order: step.order,
        tool: step.tool,
        action: step.action,
        status: 'SIMULATED',
        query: step.query
      });

      continue;
    }

    if (!handler) {

      execution.results.push({
        order: step.order,
        tool: step.tool,
        action: step.action,
        status: 'NO_HANDLER'
      });

      continue;
    }

    try {

      const result =
        await handler({
          step,
          context
        });

      execution.results.push({
        order: step.order,
        tool: step.tool,
        action: step.action,
        status: 'SUCCESS',
        result
      });

    } catch (error) {

      execution.results.push({
        order: step.order,
        tool: step.tool,
        action: step.action,
        status: 'ERROR',
        error:
          error?.message ||
          String(error)
      });
    }
  }

  execution.finishedAt =
    new Date().toISOString();

  executionHistory.push(execution);

  if (executionHistory.length > 100) {
    executionHistory.shift();
  }

  return execution;
}

export function getExecutionHistory() {

  return [...executionHistory];
}

export function clearExecutionHistory() {

  executionHistory.length = 0;
}

export default {
  registerAction,
  unregisterAction,
  listActions,
  executePlan,
  getExecutionHistory,
  clearExecutionHistory
};
