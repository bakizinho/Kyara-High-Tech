import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'dados', 'database', 'figban.json');

function loadDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function saveDatabase(data) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function cleanId(value) {
  return String(value || '')
    .split(':')[0]
    .replace(/@s\.whatsapp\.net$/i, '')
    .replace(/@lid$/i, '')
    .replace(/@g\.us$/i, '');
}

function sameId(a, b) {
  return cleanId(a) && cleanId(a) === cleanId(b);
}

function getContext(message) {
  return (
    message?.extendedTextMessage?.contextInfo ||
    message?.imageMessage?.contextInfo ||
    message?.videoMessage?.contextInfo ||
    message?.stickerMessage?.contextInfo ||
    message?.viewOnceMessage?.message?.extendedTextMessage?.contextInfo ||
    {}
  );
}

function getQuotedMessage(info) {
  const message = info?.message || {};
  const context = getContext(message);
  return context.quotedMessage || null;
}

function getStickerHash(sticker) {
  const hash = sticker?.fileSha256;
  if (!hash) return null;

  if (Buffer.isBuffer(hash)) return hash.toString('base64');

  if (hash?.type === 'Buffer' && Array.isArray(hash.data)) {
    return Buffer.from(hash.data).toString('base64');
  }

  return String(hash);
}

function isStickerMessage(message) {
  return Boolean(
    message?.stickerMessage ||
    message?.viewOnceMessage?.message?.stickerMessage ||
    message?.viewOnceMessageV2?.message?.stickerMessage
  );
}

function getStickerMessage(message) {
  return (
    message?.stickerMessage ||
    message?.viewOnceMessage?.message?.stickerMessage ||
    message?.viewOnceMessageV2?.message?.stickerMessage ||
    null
  );
}

function getQuotedParticipant(info) {
  const context = getContext(info?.message || {});
  return context.participant || context.remoteJid || null;
}

function isProtected(target, {
  sender,
  isOwner,
  groupAdmins = [],
  botNumberLid,
  botId
}) {
  if (!target) return true;

  if (isOwner && sameId(sender, target)) return true;
  if (sameId(target, sender)) return true;
  if (sameId(target, botNumberLid)) return true;
  if (sameId(target, botId)) return true;

  return groupAdmins.some(admin => sameId(admin, target));
}

function isOwnerCommand(command, args) {
  const sub = String(args?.[0] || '').toLowerCase();

  return (
    command === 'fig' ||
    command === 'figban'
  ) && (
    sub === 'painel' ||
    sub === 'criar' ||
    sub === 'renomear' ||
    sub === 'ativar' ||
    sub === 'desativar' ||
    sub === 'recriar' ||
    sub === 'destruir'
  );
}

function formatList(database) {
  const entries = Object.entries(database);

  if (!entries.length) {
    return (
      '╭━━━〔 🎴 FIGBAN • LISTA 〕━━━╮\n' +
      '│\n' +
      '│ ❌ Nenhuma figurinha cadastrada.\n' +
      '│\n' +
      '╰━━━━━━━━━━━━━━━━━━━━━━╯'
    );
  }

  const lines = entries.map(([name, value], index) => {
    const active = value?.active !== false;
    return `${index + 1}. ${active ? '🟢' : '🔴'} *${name}*`;
  });

  return (
    '╭━━━〔 🎴 FIGBAN • LISTA 〕━━━╮\n' +
    '│\n' +
    lines.map(line => `│ ${line}`).join('\n') +
    '\n│\n' +
    `│ 📦 Total: *${entries.length}*\n` +
    '╰━━━━━━━━━━━━━━━━━━━━━━╯'
  );
}

function formatPanel(database) {
  const entries = Object.entries(database);
  const active = entries.filter(([, value]) => value?.active !== false).length;

  return (
    '╭━━━〔 🎴 FIGBAN • PAINEL 〕━━━╮\n' +
    '│\n' +
    `│ 📦 Cadastradas: *${entries.length}*\n` +
    `│ 🟢 Ativas: *${active}*\n` +
    `│ 🔴 Inativas: *${entries.length - active}*\n` +
    '│\n' +
    '│ 👑 CONTROLE DO DONO\n' +
    '│\n' +
    '│ /figban criar <nome>\n' +
    '│ /figban renomear <antigo> <novo>\n' +
    '│ /figban ativar <nome>\n' +
    '│ /figban desativar <nome>\n' +
    '│ /figban recriar <nome>\n' +
    '│ /figban destruir <nome>\n' +
    '│\n' +
    '╰━━━━━━━━━━━━━━━━━━━━━━╯'
  );
}

export async function handleFigban({
  nazu,
  info,
  from,
  isGroup,
  isOwner,
  isGroupAdmin,
  sender,
  botNumberLid,
  botId,
  groupAdmins = [],
  command,
  args = [],
  reply
}) {
  if (!isGroup) return false;

  const database = loadDatabase();
  const sub = String(args?.[0] || '').toLowerCase();

  /*
   * LISTA:
   * Admin e dono podem consultar.
   * Não cria, altera ou remove nada.
   */
  if (
    (command === 'figban' || command === 'fig') &&
    sub === 'lista'
  ) {
    if (!isOwner && !isGroupAdmin) {
      await reply('❌ Apenas administradores podem consultar a lista do FIGBAN.');
      return true;
    }

    await reply(formatList(database));
    return true;
  }

  /*
   * PAINEL:
   * Exclusivo do dono.
   */
  if (
    (command === 'figban' || command === 'fig') &&
    sub === 'painel'
  ) {
    if (!isOwner) {
      await reply('❌ O painel de controle do FIGBAN é exclusivo do dono.');
      return true;
    }

    await reply(formatPanel(database));
    return true;
  }

  /*
   * Comandos administrativos do FIGBAN.
   * Somente o dono pode criar, alterar ou destruir.
   */
  if (isOwnerCommand(command, args)) {
    if (!isOwner) {
      await reply('❌ Somente o dono pode alterar o FIGBAN.');
      return true;
    }

    const action = sub;
    const rest = args.slice(1);
    const name = String(rest.join(' ') || '').trim().toLowerCase();

    if (action === 'criar') {
      const sticker = getStickerMessage(getQuotedMessage(info));

      if (!sticker) {
        await reply('❌ Responda a uma figurinha para cadastrá-la.');
        return true;
      }

      if (!name) {
        await reply('❌ Informe um nome.\nExemplo: /figban criar ban18');
        return true;
      }

      const hash = getStickerHash(sticker);

      if (!hash) {
        await reply('❌ Não consegui identificar essa figurinha.');
        return true;
      }

      database[name] = {
        hash,
        active: true,
        updatedAt: new Date().toISOString()
      };

      saveDatabase(database);

      await reply(
        `✅ FIGBAN criado.\n\n` +
        `🏷️ Nome: *${name}*\n` +
        `🟢 Status: *ativo*`
      );

      return true;
    }

    if (action === 'renomear') {
      const oldName = String(rest[0] || '').trim().toLowerCase();
      const newName = String(rest.slice(1).join(' ') || '').trim().toLowerCase();

      if (!oldName || !newName) {
        await reply('❌ Use: /figban renomear <antigo> <novo>');
        return true;
      }

      if (!database[oldName]) {
        await reply(`❌ FIGBAN *${oldName}* não encontrado.`);
        return true;
      }

      if (database[newName]) {
        await reply(`❌ Já existe um FIGBAN chamado *${newName}*.`);
        return true;
      }

      database[newName] = {
        ...database[oldName],
        updatedAt: new Date().toISOString()
      };

      delete database[oldName];
      saveDatabase(database);

      await reply(`✅ FIGBAN renomeado: *${oldName}* → *${newName}*`);
      return true;
    }

    if (action === 'ativar' || action === 'desativar') {
      if (!name) {
        await reply(`❌ Use: /figban ${action} <nome>`);
        return true;
      }

      if (!database[name]) {
        await reply(`❌ FIGBAN *${name}* não encontrado.`);
        return true;
      }

      database[name].active = action === 'ativar';
      database[name].updatedAt = new Date().toISOString();

      saveDatabase(database);

      await reply(
        `${action === 'ativar' ? '🟢' : '🔴'} FIGBAN *${name}* ` +
        `${action === 'ativar' ? 'ativado' : 'desativado'}.`
      );

      return true;
    }

    if (action === 'destruir') {
      if (!name) {
        await reply('❌ Use: /figban destruir <nome>');
        return true;
      }

      if (!database[name]) {
        await reply(`❌ FIGBAN *${name}* não encontrado.`);
        return true;
      }

      delete database[name];
      saveDatabase(database);

      await reply(`🗑️ FIGBAN *${name}* destruído.`);
      return true;
    }

    if (action === 'recriar') {
      const sticker = getStickerMessage(getQuotedMessage(info));

      if (!name) {
        await reply('❌ Use: /figban recriar <nome> respondendo à nova figurinha.');
        return true;
      }

      if (!sticker) {
        await reply('❌ Responda à nova figurinha que substituirá o FIGBAN.');
        return true;
      }

      if (!database[name]) {
        await reply(`❌ FIGBAN *${name}* não encontrado.`);
        return true;
      }

      const hash = getStickerHash(sticker);

      if (!hash) {
        await reply('❌ Não consegui identificar a nova figurinha.');
        return true;
      }

      database[name] = {
        ...database[name],
        hash,
        active: true,
        updatedAt: new Date().toISOString()
      };

      saveDatabase(database);

      await reply(`♻️ FIGBAN *${name}* recriado e ativado.`);
      return true;
    }
  }

  /*
   * Cadastro legado:
   * /figban <nome>
   * Continua funcionando somente para o dono.
   */
  if (
    command === 'figban' ||
    command === 'stickerban' ||
    command === 'figbanir'
  ) {
    if (!isOwner) {
      if (isGroupAdmin) {
        await reply(
          '❌ Administradores podem apenas consultar o FIGBAN com:\n' +
          '/figban lista'
        );
      } else {
        await reply('❌ Apenas o dono pode configurar o FIGBAN.');
      }

      return true;
    }

    const sticker = getStickerMessage(getQuotedMessage(info));
    const name = String(args.join(' ') || '').trim().toLowerCase();

    if (!sticker) {
      await reply('❌ Responda a uma figurinha para cadastrá-la.');
      return true;
    }

    if (!name) {
      await reply('❌ Informe um nome para a figurinha.\nExemplo: /figban ban18');
      return true;
    }

    const hash = getStickerHash(sticker);

    if (!hash) {
      await reply('❌ Não consegui identificar essa figurinha.');
      return true;
    }

    database[name] = {
      hash,
      active: true,
      updatedAt: new Date().toISOString()
    };

    saveDatabase(database);

    await reply(`✅ Figurinha cadastrada como *${name}*.`);
    return true;
  }

  /*
   * Uso automático:
   * administrador envia uma figurinha cadastrada respondendo
   * à mensagem do membro que será removido.
   */
  if (!isStickerMessage(info?.message || {})) return false;

  if (!isOwner && !isGroupAdmin) return false;

  const sticker = getStickerMessage(info?.message || {});
  const hash = getStickerHash(sticker);

  if (!hash) return false;

  const entry = Object.entries(database).find(
    ([, value]) =>
      value?.hash === hash &&
      value?.active !== false
  );

  if (!entry) return false;

  const target = getQuotedParticipant(info);

  if (!target) {
    await reply('❌ Responda à mensagem da pessoa que deverá ser removida.');
    return true;
  }

  if (isProtected(target, {
    sender,
    isOwner,
    groupAdmins,
    botNumberLid,
    botId
  })) {
    if (isOwner && sameId(target, sender)) {
      await reply('🛡️ Não posso remover o dono do grupo.');
    } else if (sameId(target, botNumberLid) || sameId(target, botId)) {
      await reply('🛡️ Não posso remover o próprio bot.');
    } else if (groupAdmins.some(admin => sameId(admin, target))) {
      await reply('🛡️ Não posso remover um administrador.');
    } else {
      await reply('🛡️ Não posso remover este participante.');
    }

    return true;
  }

  try {
    await nazu.groupParticipantsUpdate(from, [target], 'remove');

    await nazu.sendMessage(
      from,
      {
        text:
          `🚫 *FIGBAN*\n\n` +
          `@${String(target).split('@')[0]} foi removido(a) do grupo.\n` +
          `🏷️ Figurinha: *${entry[0]}*`,
        mentions: [target]
      },
      { quoted: info }
    );
  } catch (error) {
    console.error('[FIGBAN] Erro ao remover alvo:', error);
    await reply('❌ Não consegui remover essa pessoa. Verifique se o bot é administrador.');
  }

  return true;
}
