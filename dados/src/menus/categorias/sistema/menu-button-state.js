import fs from 'node:fs';
import path from 'node:path';

const CONFIG_FILE = path.resolve(
  process.cwd(),
  'config',
  'menu-adaptativo.json'
);

const DEFAULTS = Object.freeze({
  enabled: true,
  nativeFlow: true,
  fallback: true,
  buttonsEnabled: true
});

function readStoredConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return null;

  const parsed = JSON.parse(
    fs.readFileSync(CONFIG_FILE, 'utf8')
  );

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('A configuração dos botões não é um objeto JSON válido.');
  }

  return parsed;
}

export function readMenuButtonState() {
  try {
    return {
      ...DEFAULTS,
      ...(readStoredConfig() || {})
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function areMenuButtonsEnabled() {
  const config = readMenuButtonState();

  return config.enabled !== false &&
    config.nativeFlow !== false &&
    config.buttonsEnabled !== false;
}

export function areMenuButtonsConfigured() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return false;

    const config = JSON.parse(
      fs.readFileSync(CONFIG_FILE, 'utf8')
    );

    return config?.enabled !== false &&
      config?.nativeFlow !== false &&
      config?.buttonsEnabled !== false;
  } catch {
    return false;
  }
}

export function arePlayButtonsEnabled() {
  return readMenuButtonState().enabled !== false;
}

function saveConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });

  const temporary = CONFIG_FILE +
    '.tmp-' + process.pid + '-' + Date.now();

  try {
    fs.writeFileSync(
      temporary,
      JSON.stringify(config, null, 2) + '\n',
      'utf8'
    );

    fs.renameSync(temporary, CONFIG_FILE);
  } catch (error) {
    try {
      fs.rmSync(temporary, { force: true });
    } catch {}

    throw error;
  }
}

// Compatibilidade com #botoes: o campo enabled continua ligado,
// enquanto nativeFlow e buttonsEnabled controlam os botões do menu.
export function writeMenuButtonState(enabled) {
  const current = readMenuButtonState();

  const updated = {
    ...current,
    enabled: true,
    nativeFlow: Boolean(enabled),
    buttonsEnabled: Boolean(enabled)
  };

  saveConfig(updated);
  return updated;
}

// Controle usado por #botoesmenu: atualiza os três campos.
export function setMenuButtonsEnabled(enabled) {
  let current = {};

  if (fs.existsSync(CONFIG_FILE)) {
    current = readStoredConfig() || {};
  }

  const value = Boolean(enabled);

  const updated = {
    ...current,
    enabled: value,
    nativeFlow: value,
    buttonsEnabled: value
  };

  saveConfig(updated);
  return updated;
}
