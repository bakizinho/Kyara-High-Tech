/**
 * KYARA EXPERIMENTAL MEMORY
 *
 * Memória local estruturada.
 *
 * Segurança:
 * - não grava tokens;
 * - não grava API keys;
 * - não grava Authorization;
 * - limita tamanho;
 * - usa arquivos separados por chave.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const MEMORY_ROOT = path.resolve(
  process.cwd(),
  'dados',
  'data',
  'kyara-memory'
);

const MAX_VALUE_LENGTH = 2000;

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /apikey/i,
  /authorization/i,
  /bearer\s+/i,
  /password/i,
  /senha/i,
  /secret/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /private[_-]?key/i,
  /cookie/i,
  /credential/i
];

function ensureRoot() {
  fs.mkdirSync(MEMORY_ROOT, {
    recursive: true
  });
}

function safeKey(value) {

  return crypto
    .createHash('sha256')
    .update(String(value || ''))
    .digest('hex')
    .slice(0, 32);
}

function isSecret(value) {

  const text = String(value || '');

  return SECRET_PATTERNS.some(
    pattern => pattern.test(text)
  );
}

function sanitize(value) {

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {

    if (isSecret(value)) {
      return '[REDACTED]';
    }

    return value
      .slice(0, MAX_VALUE_LENGTH);
  }

  if (Array.isArray(value)) {

    return value
      .slice(0, 50)
      .map(sanitize);
  }

  if (typeof value === 'object') {

    const output = {};

    for (const [key, item] of Object.entries(value)) {

      if (isSecret(key)) {
        continue;
      }

      output[key] = sanitize(item);
    }

    return output;
  }

  return value;
}

function fileFor(scope, id) {

  const safeScope = safeKey(scope);
  const safeId = safeKey(id);

  return path.join(
    MEMORY_ROOT,
    `${safeScope}-${safeId}.json`
  );
}

export function remember({
  scope = 'global',
  id = 'default',
  key,
  value,
  ttl = null
} = {}) {

  if (!key) {
    return false;
  }

  if (isSecret(key) || isSecret(value)) {
    return false;
  }

  ensureRoot();

  const file = fileFor(scope, id);

  let data = {
    version: 1,
    scope,
    id,
    items: {}
  };

  try {

    if (fs.existsSync(file)) {

      const parsed =
        JSON.parse(
          fs.readFileSync(file, 'utf8')
        );

      if (parsed && typeof parsed === 'object') {
        data = parsed;
      }
    }

  } catch {
    // Se a memória estiver corrompida,
    // começa uma nova estrutura.
  }

  const now = Date.now();

  data.items ||= {};

  data.items[String(key)] = {
    value: sanitize(value),
    createdAt:
      data.items[String(key)]?.createdAt || now,
    updatedAt: now,
    expiresAt:
      ttl && Number(ttl) > 0
        ? now + Number(ttl)
        : null
  };

  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    'utf8'
  );

  return true;
}

export function recall({
  scope = 'global',
  id = 'default',
  key
} = {}) {

  if (!key) {
    return null;
  }

  const file = fileFor(scope, id);

  if (!fs.existsSync(file)) {
    return null;
  }

  try {

    const data =
      JSON.parse(
        fs.readFileSync(file, 'utf8')
      );

    const item =
      data?.items?.[String(key)];

    if (!item) {
      return null;
    }

    if (
      item.expiresAt &&
      Date.now() > item.expiresAt
    ) {

      delete data.items[String(key)];

      fs.writeFileSync(
        file,
        JSON.stringify(data, null, 2),
        'utf8'
      );

      return null;
    }

    return item.value;

  } catch {

    return null;
  }
}

export function forget({
  scope = 'global',
  id = 'default',
  key
} = {}) {

  const file = fileFor(scope, id);

  if (!fs.existsSync(file)) {
    return false;
  }

  try {

    const data =
      JSON.parse(
        fs.readFileSync(file, 'utf8')
      );

    if (!data?.items?.[String(key)]) {
      return false;
    }

    delete data.items[String(key)];

    fs.writeFileSync(
      file,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    return true;

  } catch {

    return false;
  }
}

export function listMemory({
  scope = 'global',
  id = 'default'
} = {}) {

  const file = fileFor(scope, id);

  if (!fs.existsSync(file)) {
    return [];
  }

  try {

    const data =
      JSON.parse(
        fs.readFileSync(file, 'utf8')
      );

    const now = Date.now();

    return Object.entries(
      data?.items || {}
    )
      .filter(([, item]) =>
        !item.expiresAt ||
        now <= item.expiresAt
      )
      .map(([key, item]) => ({
        key,
        value: item.value,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        expiresAt: item.expiresAt
      }));

  } catch {

    return [];
  }
}

export default {
  remember,
  recall,
  forget,
  listMemory
};
