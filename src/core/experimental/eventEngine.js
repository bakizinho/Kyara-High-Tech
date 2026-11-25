/**
 * KYARA EVENT ENGINE
 *
 * Barramento interno de eventos.
 *
 * Não altera automaticamente mensagens.
 * Plugins podem futuramente escutar eventos.
 */

const listeners = new Map();

export function on(event, handler) {

  if (
    typeof event !== 'string' ||
    typeof handler !== 'function'
  ) {
    return () => {};
  }

  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }

  listeners.get(event).add(handler);

  return () => off(event, handler);
}

export function off(event, handler) {

  const set = listeners.get(event);

  if (!set) {
    return false;
  }

  const removed = set.delete(handler);

  if (!set.size) {
    listeners.delete(event);
  }

  return removed;
}

export async function emit(event, payload = {}) {

  const set = listeners.get(event);

  if (!set) {
    return [];
  }

  const results = [];

  for (const handler of set) {

    try {

      results.push(
        await handler(payload)
      );

    } catch (error) {

      console.error(
        `[KYARA EVENT] Erro em ${event}:`,
        error?.message || error
      );

      results.push(null);
    }
  }

  return results;
}

export function listEvents() {

  return [...listeners.entries()]
    .map(([event, handlers]) => ({
      event,
      listeners: handlers.size
    }));
}

export default {
  on,
  off,
  emit,
  listEvents
};
