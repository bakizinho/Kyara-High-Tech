#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const configFile = path.join(root, 'dados/src/config.json');
const packageFile = path.join(root, 'package.json');
const authFile = path.join(root, 'dados/database/qr-code/creds.json');

const blue = '\x1b[38;2;55;135;255m';
const cyan = '\x1b[38;2;65;205;255m';
const white = '\x1b[38;2;235;242;255m';
const muted = '\x1b[38;2;135;155;185m';
const green = '\x1b[38;2;80;210;155m';
const red = '\x1b[38;2;250;105;115m';
const reset = '\x1b[0m';
const paint = (value, color = white) => `${color}${value}${reset}`;

function readJson(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function maskNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'Não configurado';
  if (digits.length <= 7) return '••••';
  return `${digits.slice(0, 3)} •••• ${digits.slice(-2)}`;
}

function getSessionStatus() {
  if (!fs.existsSync(authFile)) return 'Não encontrada';
  const creds = readJson(authFile, null);
  if (creds?.registered === true) return 'Registrada';
  return 'Arquivos encontrados';
}

function showProfile(config, pkg) {
  const creator = String(config.autor || pkg.author || 'Não informado');
  const repo = String(config.github_ofc || pkg.repository?.url || 'Não configurado')
    .replace(/^git\+/, '')
    .replace(/\.git$/, '');

  const channelEnabled = config.kyaraChannel?.enabled !== false;
  const channelUrl = String(
    config.kyaraChannel?.url ||
    config.channels?.botKyara ||
    'Não configurado'
  ).replace(/^https?:\/\//, '');

  const rows = [
    ['BOT', config.nomebot || 'KYARA-SYSTΞM'],
    ['PROPRIETÁRIO', config.nomedono || 'Não configurado'],
    ['CONTATO', maskNumber(config.numerodono)],
    ['PREFIXO', config.prefixo || '#'],
    ['VERSÃO', pkg.version || 'Não informada'],
    ['NODE.JS', process.version],
    ['AMBIENTE', `${os.type()} · ${os.arch()}`],
    ['SESSÃO WHATSAPP', getSessionStatus()],
    ['VER CANAL', channelEnabled ? 'Proteção ativa' : 'Configuração divergente'],
    ['CANAL', channelUrl],
    ['REPOSITÓRIO', repo],
    ['CRÉDITOS DO CRIADOR', creator]
  ];

  const width = Math.max(68, Math.min(process.stdout.columns || 80, 88));
  const labelWidth = 21;
  const valueWidth = width - labelWidth - 7;

  const splitValue = value => {
    const raw = String(value).replace(/[\r\n]+/g, ' ');
    const parts = [];
    for (let i = 0; i < raw.length; i += valueWidth) {
      parts.push(raw.slice(i, i + valueWidth));
    }
    return parts.length ? parts : [''];
  };

  console.log('');
  console.log(paint(`╭${'━'.repeat(width - 2)}╮`, blue));

  const heading = 'KYARA-SYSTΞM · PERFIL DO SISTEMA';
  const left = Math.max(0, Math.floor((width - 2 - heading.length) / 2));

  console.log(
    `${paint('│', blue)}${' '.repeat(left)}` +
    `${paint(heading, white)}` +
    `${' '.repeat(Math.max(0, width - 2 - left - heading.length))}` +
    `${paint('│', blue)}`
  );

  console.log(paint(`├${'─'.repeat(width - 2)}┤`, blue));

  for (const [label, value] of rows) {
    const parts = splitValue(value);

    parts.forEach((part, index) => {
      const labelText = index === 0 ? label : '';

      console.log(
        `${paint('│', blue)} ${paint(labelText.padEnd(labelWidth), cyan)} ` +
        `${paint(part.padEnd(valueWidth), white)} ${paint('│', blue)}`
      );
    });
  }

  console.log(paint(`╰${'━'.repeat(width - 2)}╯`, blue));
  console.log(paint('Créditos do criador são somente leitura neste configurador.', muted));
  console.log('');
}

async function main() {
  if (!fs.existsSync(configFile)) {
    throw new Error('dados/src/config.json não foi encontrado.');
  }

  const config = readJson(configFile, null);
  const pkg = readJson(packageFile, {});

  if (!config) throw new Error('config.json está inválido.');

  showProfile(config, pkg);

  if (process.argv.includes('--ver')) return;

  const rl = readline.createInterface({ input: stdin, output: stdout });

  const ask = async (label, current) => {
    const answer = await rl.question(
      `${paint(label, cyan)} ${paint(`[${current || 'vazio'}]`, muted)}: `
    );

    return answer.trim() || String(current || '');
  };

  try {
    console.log(paint('Deixe em branco para manter o valor atual.', muted));
    console.log(paint('O número abaixo define quem recebe permissões de proprietário.', muted));
    console.log(paint('Os créditos do criador não são editados nesta tela.', muted));
    console.log('');

    const bot = await ask('Nome do bot', config.nomebot || 'KYARA-SYSTΞM');
    const owner = await ask('Nome do proprietário', config.nomedono || 'VØX');

    const number = await ask(
      'WhatsApp do proprietário (DDI + DDD + número)',
      config.numerodono || ''
    );

    const bio = await ask(
      'Descrição do perfil',
      config.kyaraOwnerProfile?.bio ||
      'Proprietário e responsável pelo projeto.'
    );

    const digits = number.replace(/\D/g, '');

    if (!bot || !owner) {
      throw new Error('O nome do bot e o nome do proprietário são obrigatórios.');
    }

    if (!digits || digits.length < 12) {
      throw new Error('Informe o número completo com DDI, DDD e telefone.');
    }

    const previousDigits = String(config.numerodono || '').replace(/\D/g, '');
    const ownerNumberChanged = Boolean(
      previousDigits && previousDigits !== digits
    );

    const backup =
      `${configFile}.BACKUP_PROFILE_` +
      new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

    fs.copyFileSync(configFile, backup);

    config.nomebot = bot;
    config.nomedono = owner;
    config.numerodono = digits;

    if (ownerNumberChanged) {
      // Evita manter permissões associadas ao LID do número anterior.
      delete config.lidowner;
    }

    // config.autor não é alterado: representa os créditos do criador.

    config.menu ??= {};
    config.menu.title = `🌸 ${bot} • MENU`;
    config.menu.footer =
      `🌸 ${bot} • ${config.autor || pkg.author || 'Créditos do projeto'}`;

    config.ownerMenu ??= {};
    config.ownerMenu.title = `👑 ${bot} • DONO MODE`;
    config.ownerMenu.footer =
      `👑 ${owner} • ${config.autor || pkg.author || 'Créditos do projeto'}`;
    config.ownerMenu.panelTitle = `📂 PAINEL ${bot}`;

    config.kyaraOwnerProfile ??= {};
    config.kyaraOwnerProfile.name = owner;
    config.kyaraOwnerProfile.role = 'Proprietário / Desenvolvedor';
    config.kyaraOwnerProfile.bio = bio;
    config.kyaraOwnerProfile.contact = digits;

    const temp = `${configFile}.tmp`;

    fs.writeFileSync(temp, JSON.stringify(config, null, 2) + '\n');
    JSON.parse(fs.readFileSync(temp, 'utf8'));
    fs.renameSync(temp, configFile);

    console.log('');
    console.log(paint('✓ PERFIL ATUALIZADO', green));
    console.log(`${paint('Bot:', cyan)} ${bot}`);
    console.log(`${paint('Proprietário:', cyan)} ${owner}`);
    console.log(`${paint('Número:', cyan)} ${maskNumber(digits)}`);
    console.log(`${paint('Créditos preservados:', cyan)} ${config.autor || pkg.author || 'Não informado'}`);

    if (ownerNumberChanged) {
      console.log(
        paint(
          'O identificador LID anterior foi removido; o novo será resolvido pelo WhatsApp.',
          muted
        )
      );
    }

    console.log(`${paint('Backup:', muted)} ${path.basename(backup)}`);
    console.log('');

    showProfile(config, pkg);
  } finally {
    rl.close();
  }
}

main().catch(error => {
  console.error(`${red}✖ ${error.message}${reset}`);
  process.exitCode = 1;
});
