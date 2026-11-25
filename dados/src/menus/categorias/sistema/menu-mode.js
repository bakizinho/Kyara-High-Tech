import fs from 'fs';
import path from 'path';
import { areMenuButtonsConfigured } from './menu-button-state.js';

const ROOT = process.cwd();

const CONFIG_DIR = path.join(
  ROOT,
  'config'
);

const CONFIG_FILE = path.join(
  CONFIG_DIR,
  'menu-mode.json'
);

const DEFAULT_CONFIG = {
  mode: 'normal'
};

function garantirConfig() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, {
      recursive: true
    });
  }

  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(
        DEFAULT_CONFIG,
        null,
        2
      ),
      'utf8'
    );
  }
}

function getStoredMenuMode() {
  garantirConfig();

  try {
    const data = JSON.parse(
      fs.readFileSync(CONFIG_FILE, 'utf8')
    );

    return data.mode === 'interactive'
      ? 'interactive'
      : 'normal';
  } catch {
    return 'normal';
  }
}


export function getMenuMode() {
  return getStoredMenuMode() === 'interactive' &&
    areMenuButtonsConfigured()
    ? 'interactive'
    : 'normal';
}

export function setMenuMode(mode) {
  garantirConfig();

  const normalized =
    mode === 'interactive'
      ? 'interactive'
      : 'normal';

  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify(
      {
        mode: normalized
      },
      null,
      2
    ),
    'utf8'
  );

  return normalized;
}

export function isInteractiveMenu() {
  return getMenuMode() === 'interactive';
}

export function isNormalMenu() {
  return getMenuMode() === 'normal';
}
