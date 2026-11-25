import fs from 'node:fs';
import path from 'node:path';

import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
  jidNormalizedUser
} from 'baileys';

import { getConfiguredBotName, getConfiguredPrefix, KYARA_CREATOR_NAME } from '../identity/kyara-identity.js';
import { applyMenuFont, getMenuDesignWithDefaults } from '../../utils/database.js';
import { isInteractiveMenu } from '../../menus/menu-mode.js';
import { areMenuButtonsEnabled } from '../../menus/categorias/sistema/menu-button-state.js';

/*
 * ============================================================
 *                    KYARA-SYSTΞM MENU ADAPTATIVO
 * KYARA_MENU_NATIVE_PATCH_V1
 * ============================================================
 *
 * Native Flow real:
 *
 *   single_select
 *   cta_url
 *
 * Os IDs precisam coincidir com o dispatcher central.
 * ============================================================
 */

const CONFIG = {

  channels: [

    {
      name:
        '↗ O COMEÇO • CANAL OFICIAL',

      url:
        'https://whatsapp.com/channel/0029VbCXBCy8fewmEhto8J0w'
    },

    {
      name:
        '↗ 𝗞𝗬𝗔𝗥𝗔-𝗦𝗬𝗦𝗧Ξ𝗠 • CANAL OFICIAL',

      url:
        'https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r'
    }

  ],

  footer:
    '𝗞𝗬𝗔𝗥𝗔-𝗦𝗬𝗦𝗧Ξ𝗠 • SISTEMA'
};

/*
 * ============================================================
 * CATEGORIAS REAIS
 * ============================================================
 *
 * NÃO usar IDs inventados.
 */

const MENUS_ORIGINAIS = [

  {
    title:
      'DOWNLOADS',

    description:
      'MÚSICAS • VÍDEOS • MÍDIAS',

    id:
      'menudown'
  },

  {
    title:
      'LOGOS',

    description:
      'LOGOS • ARTES',

    id:
      'menulogos'
  },

  {
    title:
      'EDITS',

    description:
      'Efeitos e edições',

    id:
      'menuedits'
  },

  {
    title:
      'FIGURINHAS',

    description:
      'ᴄʀɪᴀʀ • ᴄᴏɴᴠᴇʀᴛᴇʀ',

    id:
      'menufig'
  },

  {
    title:
      'FERRAMENTAS',

    description:
      'UTILIDADES',

    id:
      'ferramentas'
  },

  {
    title:
      'ALTERADORES',

    description:
      'ÁUDIO • VOZ • TEXTOS • EFEITOS',

    id:
      'alteradores'
  },

  {
    title:
      'BRINCADEIRAS',

    description:
      'JOGOS E DIVERSÃO',

    id:
      'menubn'
  },

  {
    title:
      'RPG',

    description:
      'SISTEMA RPG',

    id:
      'menurpg'
  },

  {
    title:
      'ADMINISTRAÇÃO',

    description:
      'FERRAMENTAS ADMINISTRATIVAS',

    id:
      'menuadm'
  },

  {
    title: 'LEVEL UP',
    description: 'NÍVEL E RANKING',
    id: 'menulevel'
  },

  {
    title:
      'MEMBROS',

    description:
      'RECURSOS PARA MEMBROS',

    id:
      'menumemb'
  },

  {
    title:
      'VIP',

    description:
      'SISTEMA VIP',

    id:
      'menuvip'
  },

  {
    title: 'ATUALIZAÇÕES',
    description: 'Novos comandos e melhorias',
    id: 'atualizacoes'
  },

  {
    title:
      'DONO',

    description:
      'FERRAMENTAS EXCLUSIVAS',

    id:
      'menudono'
  }

];

/*
 * ============================================================
 * UTILIDADES
 * ============================================================
 */

function safeText(
  value,
  fallback = ''
) {

  const result =
    String(
      value ?? ''
    )
      .replace(
        /[\r\n]+/g,
        ' '
      )
      .trim();

  return result || fallback;
}

function digits(
  value = ''
) {

  return String(
    value || ''
  ).replace(
    /\D/g,
    ''
  );
}

function numberFromJid(
  jid = ''
) {

  return digits(
    String(jid || '')
      .split('@')[0]
      .split(':')[0]
  );
}

function greeting() {

  const hour =
    new Date().getHours();

  if (
    hour >= 5 &&
    hour < 12
  ) {
    return 'Bom dia';
  }

  if (
    hour >= 12 &&
    hour < 18
  ) {
    return 'Boa tarde';
  }

  return 'Boa noite';
}

function uptime() {

  const total =
    Math.floor(
      process.uptime()
    );

  const hours =
    Math.floor(
      total / 3600
    );

  const minutes =
    Math.floor(
      (total % 3600) / 60
    );

  const seconds =
    total % 60;

  if (hours > 0) {

    return (
      hours +
      'h ' +
      minutes +
      'm'
    );
  }

  if (minutes > 0) {

    return (
      minutes +
      'm ' +
      seconds +
      's'
    );
  }

  return (
    seconds +
    's'
  );
}

function memory() {

  const used =
    process.memoryUsage()
      .rss /
    1024 /
    1024;

  return (
    used.toFixed(1) +
    ' MB'
  );
}


function loadOwnerConfig() {

  try {

    const configPath =
      path.resolve(
        process.cwd(),
        'dados',
        'src',
        'config.json'
      );

    return JSON.parse(
      fs.readFileSync(
        configPath,
        'utf8'
      )
    );

  } catch (error) {

    console.warn(
      '[MENU][OWNER] Falha ao ler config.json:',
      error?.message ||
      error
    );

    return {};
  }
}

function isOwner(
  jid = ''
) {

  const raw =
    String(
      jid || ''
    ).trim();

  if (!raw) {
    return false;
  }

  const normalized =
    jidNormalizedUser(
      raw
    );

  const number =
    numberFromJid(
      normalized
    );

  const config =
    loadOwnerConfig();

  const ownerNumber =
    digits(
      config?.numerodono
    );

  const ownerLid =
    String(
      config?.lidowner ||
      ''
    ).trim();

  /*
   * Primeiro: LID EXATO configurado.
   */
  if (
    ownerLid &&
    normalized ===
      jidNormalizedUser(
        ownerLid
      )
  ) {
    return true;
  }

  /*
   * Segundo: número oficial do dono.
   */
  if (
    ownerNumber &&
    number === ownerNumber
  ) {
    return true;
  }

  return false;
}
/*
 * ============================================================
 * MÍDIA
 * ============================================================
 */


function encontrarMidiaMenu() {

  const base =
    path.resolve(
      process.cwd(),
      'dados',
      'midias'
    );

  /*
   * MENU ESTÁTICO:
   * Nunca usar MP4/GIF aqui.
   * O menu deve abrir como imagem,
   * sem botão de play.
   */

  const candidates = [

    {
      type: 'image',
      file:
        path.join(
          base,
          'menu.jpg'
        )
    },

    {
      type: 'image',
      file:
        path.join(
          base,
          'menu.jpeg'
        )
    },

    {
      type: 'image',
      file:
        path.join(
          base,
          'menu.png'
        )
    },

    {
      type: 'image',
      file:
        path.join(
          base,
          'kyara.jpg'
        )
    },

    {
      type: 'image',
      file:
        path.join(
          base,
          'kyara.png'
        )
    }

  ];

  for (
    const candidate of candidates
  ) {

    if (
      fs.existsSync(
        candidate.file
      )
    ) {

      return {

        type:
          candidate.type,

        path:
          candidate.file

      };

    }

  }

  return null;
}
/*
 * ============================================================
 * LINHAS DO SELECT
 * ============================================================
 */

function kyaraSmallCapsDisplay(value) {
  const map = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ',
    f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ',
    k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ',
    p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ',
    u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
  };

  return Array.from(
    String(value ?? '').normalize('NFD')
  )
    .map(char => {
      const lower = char.toLowerCase();
      return map[lower] || char;
    })
    .join('');
}

function buildRows(prefix = '') {
  const items = [
    {
      id: 'menuartista',
      title: '🎨 ARTISTA',
      description: 'Menu de artista'
    },
    ...MENUS_ORIGINAIS.filter(item => item.id !== 'menuartista')
  ];

  return items.map(item => ({
    title: kyaraSmallCapsDisplay(item.title),
    description: kyaraSmallCapsDisplay(item.description),
    id: String(prefix) + item.id
  }));
}

/*
 * ============================================================
 * BOTÕES NATIVE FLOW
 * ============================================================
 */

/*
 * SANDRO_COMPAT_MENU_V2
 * Controle global dos botões usando o config existente.
 */


function buildNativeFlowButtons(prefix = '#', stage = 'home') {
  const bold = value =>
    Array.from(String(value), char => {
      const n = char.codePointAt(0);
      if (n >= 65 && n <= 90) return String.fromCodePoint(0x1D5D4 + n - 65);
      if (n >= 97 && n <= 122) return String.fromCodePoint(0x1D5EE + n - 97);
      if (n >= 48 && n <= 57) return String.fromCodePoint(0x1D7EC + n - 48);
      return char;
    }).join('');

  const categories = buildRows(prefix)
    .filter(item =>
      !String(item.id).replace(/^[#!./$]+/, '').endsWith('menudono')
    )
    .map(item => ({
      title: String(item.title || '').slice(0, 24),
      description: String(item.description || '').slice(0, 72),
      id: String(item.id)
    }));

  const options = [
    {
      title: '📂 ' + bold('MENUS'),
      description: 'Abrir todas as categorias disponíveis',
      id: String(prefix) + 'kyara_select_menus'
    },
    {
      title: '↗ ' + bold('O COMEÇO'),
      description: 'Abrir o canal oficial O Começo',
      id: String(prefix) + 'kyara_channel_comeco'
    },
    {
      title: '📢 ' + bold('KYARA-SYSTΞM'),
      description: 'Abrir o canal oficial fixo da Kyara',
      id: String(prefix) + 'kyara_channel_bot'
    },
    {
      title: '📋 ' + bold('COPIAR COMANDO'),
      description: 'Comando: ' + String(prefix) + 'menu',
      id: String(prefix) + 'kyara_copiar_comando'
    }
  ];

  const isCategories = stage === 'categories';
  const rows = isCategories ? categories : options;
  const sections = [];

  for (let i = 0; i < rows.length; i += 8) {
    sections.push({
      title: i === 0
        ? (isCategories ? '📚 CATEGORIAS KYARA' : '📚 OPÇÕES')
        : '🌸 MAIS OPÇÕES',
      rows: rows.slice(i, i + 8)
    });
  }

  const buttons = [];

  if (!isCategories) {
    buttons.push({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
      display_text: '👤 ' + bold('PERFIL'),
        id: String(prefix) + 'perfil'
      })
    });
  }

  buttons.push({
    name: 'single_select',
    buttonParamsJson: JSON.stringify({
      title: isCategories ? '📂 ' + bold('MENUS') : bold('SELECIONAR'),
      sections
    })
  });

  return buttons;
}
/*
 * ============================================================
 * TEXTO
 * ============================================================
 */


function buildMenuText(
  pushName,
  {
    owner = false,
    admin = false,
    mentionJid = null,
    stage = 'home'
  } = {}
) {
  const botName = safeText(getConfiguredBotName(), '𝗞𝗬𝗔𝗥𝗔-𝗦𝗬𝗦𝗧Ξ𝗠');
  const creatorName = KYARA_CREATOR_NAME;
  const ownerName = safeText(loadOwnerConfig()?.nomedono, creatorName);
  const mentionNumber = numberFromJid(mentionJid || '');
  const user = safeText(pushName, 'usuário');
  const target = mentionNumber ? '@' + mentionNumber : user;

  const role = owner
    ? '👑 DONO'
    : admin
      ? '⚙️ ADMIN'
      : '🌸 MEMBRO';

  return [
    '╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮',
    '       ✦ ' + botName + ' ✦',
    '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯',
    '',
    greeting() + ', ' + target + '!',
    'Bem-vindo(a) ao menu oficial.',
    '',
    '『 👤 USUÁRIO 』',
    '╰➤ ' + target,
    '『 🤖 BOT 』',
    '╰➤ ' + botName,
    '『 👑 DONO 』',
    '╰➤ ' + ownerName,
    '『 ✦ CRIADOR 』',
    '╰➤ ' + creatorName,
    '『 🛡️ PERFIL 』',
    '╰➤ ' + role,
    '',
    String(stage).startsWith('categories')
      ? '⟢ Selecione uma categoria no menu ⟣'
      : '⟢ Toque em PERFIL para executar direto ou em SELECIONAR para ver menus, canais e copiar o comando. ⟣',

  ].join('\n');
}


function buildPlainMenuText(
  pushName,
  {
    owner = false,
    admin = false,
    mentionJid = null,
    prefix = getConfiguredPrefix()
  } = {}
) {
  const botName = safeText(
    getConfiguredBotName(),
    '𝗞𝗬𝗔𝗥𝗔-𝗦𝗬𝗦𝗧Ξ𝗠'
  );

  const ownerName = safeText(
    loadOwnerConfig()?.nomedono,
    KYARA_CREATOR_NAME
  );

  const mentionNumber = numberFromJid(mentionJid || '');
  const user = safeText(pushName, 'usuário');
  const target = mentionNumber ? '@' + mentionNumber : user;
  const p = safeText(prefix, getConfiguredPrefix());

  const role = owner
    ? '👑 DONO'
    : admin
      ? '⚙️ ADMIN'
      : '🌸 MEMBRO';

  // Design editável pelo menuDesign.json.
  const design = getMenuDesignWithDefaults(botName, target) || {};

  const hour = new Date().getHours();
  const currentGreeting =
    hour < 12 ? 'Bom dia' :
    hour < 18 ? 'Boa tarde' : 'Boa noite';

  const defaultHeader =
    '╭━━━━━━〔 ✦ {botName} ✦ 〕━━━━━━╮\n' +
    '┃ 👋 {greeting}, {userName}!\n' +
    '╰━━━━━━━━━━━━ ◈ ━━━━━━━━━━━━╯';

  const header = String(design.header || defaultHeader)
    .replace(/\{botName\}/g, botName)
    .replace(/\{userName\}/g, target)
    .replace(/#user#/g, target)
    .replace(/\{greeting\}/g, currentGreeting);

  const top = String(design.menuTopBorder || '╭━━〔 ');
  const bottom = String(
    design.bottomBorder || '╰━━━━━━━━━━━━━━━━━━━━╯'
  );
  const middle = String(design.middleBorder || '┃');
  const titleIcon = String(design.menuTitleIcon || '✦');
  const itemIcon = String(design.menuItemIcon || '✧ ');
  const separatorIcon = String(design.separatorIcon || '◇');

  const available = buildRows(p).filter(item =>
    !String(item.id)
      .replace(/^[#!./$]+/, '')
      .toLowerCase()
      .endsWith('menudono')
  );

  const keyOf = item => {
    const value = String(item.id || '').toLowerCase();

    return value.startsWith(p.toLowerCase())
      ? value.slice(p.length).replace(/^[#!./$]+/, '')
      : value.replace(/^[#!./$]+/, '');
  };

  const groups = [
    {
      title: '🎨 CRIAÇÃO & VISUAL',
      ids: ['menuartista', 'menulogos', 'menuedits', 'menufig']
    },
    {
      title: '📥 MÍDIA & DOWNLOADS',
      ids: ['menudown']
    },
    {
      title: '🧰 FERRAMENTAS & EFEITOS',
      ids: ['ferramentas', 'alteradores']
    },
    {
      title: '🎮 JOGOS & RPG',
      ids: ['menubn', 'menurpg']
    },
    {
      title: '🛡️ ADMINISTRAÇÃO',
      ids: ['menuadm']
    },
    {
      title: '👥 COMUNIDADE & PROGRESSO',
      ids: ['menumemb', 'menuvip', 'menulevel']
    }
  ];

  const categoryBlocks = [];
  const used = new Set();

  for (const group of groups) {
    const items = available.filter(item =>
      group.ids.includes(keyOf(item))
    );

    if (!items.length) continue;

    for (const item of items) {
      used.add(keyOf(item));
    }

    categoryBlocks.push(
      '',
      top + separatorIcon + ' ' + group.title,
      middle,
      ...items.map(item =>
        middle + ' ' + itemIcon +
        String(item.title) + ': ' + item.id
      ),
      bottom
    );
  }

  const otherItems = available.filter(item =>
    !used.has(keyOf(item))
  );

  if (otherItems.length) {
    categoryBlocks.push(
      '',
      top + separatorIcon + ' OUTROS MENUS',
      middle,
      ...otherItems.map(item =>
        middle + ' ' + itemIcon +
        String(item.title) + ': ' + item.id
      ),
      bottom
    );
  }

  const content = [
    header,
    '',
    top + titleIcon + ' CENTRAL DE MENUS',
    middle,
    middle + ' ✦ Central organizada por categoria',
    middle + ' 👤 Usuário: ' + target,
    middle + ' 🤖 Bot: ' + botName,
    middle + ' 👑 Dono: ' + ownerName,
    middle + ' ✦ Criador: ' + KYARA_CREATOR_NAME,
    middle + ' 🛡️ Perfil: ' + role,

    ...categoryBlocks,

    '',
    'Use ' + p + 'menu para voltar à central.',
    'Use ' + p + 'perfil para abrir seu perfil.',
    '',
    '↗ O COMEÇO • CANAL OFICIAL',
    'https://whatsapp.com/channel/0029VbCXBCy8fewmEhto8J0w',
    '↗ KYARA-SYSTΞM • CANAL OFICIAL',
    'https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r'
  ].join('\n').replace(/\n{3,}/g, '\n\n');

  return applyMenuFont(content, design.fontStyle, p);
}

/*
 * ============================================================
 * PREPARAR MÍDIA
 *
 * A mídia é opcional.
 * Se a mídia der erro, os botões continuam.
 * ============================================================
 */

async function prepareMenuMedia(sock) {
  const media = encontrarMidiaMenu();

  if (media?.path && fs.existsSync(media.path)) {
    try {
      const buffer = fs.readFileSync(media.path);

      if (buffer.length) {
        const prepared = media.type === 'video'
          ? await prepareWAMessageMedia(
              { video: buffer },
              { upload: sock.waUploadToServer }
            )
          : await prepareWAMessageMedia(
              { image: buffer },
              { upload: sock.waUploadToServer }
            );

        if (media.type === 'video' && prepared?.videoMessage) {
          return { type: 'video', message: prepared.videoMessage };
        }

        if (prepared?.imageMessage) {
          return { type: 'image', message: prepared.imageMessage };
        }
      }
    } catch (error) {
      console.warn(
        '[MENU] Foto configurada indisponível:',
        error?.message || error
      );
    }
  }

  // A foto de perfil é somente uma alternativa se não houver mídia de menu.
  try {
    const botJid = sock?.user?.id;

    if (botJid && typeof sock.profilePictureUrl === 'function') {
      const profileUrl = await sock
        .profilePictureUrl(botJid, 'image')
        .catch(() => null);

      if (profileUrl) {
        const response = await fetch(profileUrl);

        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());

          if (buffer.length) {
            const prepared = await prepareWAMessageMedia(
              { image: buffer },
              { upload: sock.waUploadToServer }
            );

            if (prepared?.imageMessage) {
              return { type: 'image', message: prepared.imageMessage };
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn(
      '[MENU] Foto de perfil alternativa indisponível:',
      error?.message || error
    );
  }

  return null;
}

/*
 * ============================================================
 * ENVIO DO NATIVE FLOW
 * ============================================================
 */

function markKyaraMenuCommandHandled(info) {
  const id = String(info?.key?.id || '');
  if (!id) return;

  let handled = globalThis.__KYARA_MENU_HANDLED_IDS__;

  if (!(handled instanceof Set)) {
    handled = new Set();
    globalThis.__KYARA_MENU_HANDLED_IDS__ = handled;
  }

  handled.add(id);

  while (handled.size > 300) {
    handled.delete(handled.values().next().value);
  }
}

async function enviarMenuAdaptativo(
  sock,
  jid,
  pushName = 'usuário',
  options = {}
) {

  if (
    !sock?.relayMessage
  ) {

    throw new Error(
      'Socket sem relayMessage'
    );
  }

  if (!jid) {

    throw new Error(
      'JID vazio'
    );
  }

  const normalizedJid =
    jidNormalizedUser(
      jid
    );

  const owner =
    options.owner ??
    isOwner(
      options.sender ||
      jid
    );

  const admin =
    Boolean(
      options.isAdmin
    ) ||
    Boolean(
      options.admin
    );

  const mentionCandidate =
    options.sender ||
    (typeof jid === 'string' &&
      (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid'))
      ? jid
      : null);

  const mentionJid =
    typeof mentionCandidate === 'string' && mentionCandidate.includes('@')
      ? jidNormalizedUser(mentionCandidate)
      : null;

  const buttonsEnabled = areMenuButtonsEnabled();

  const text = buildMenuText(
    pushName,
    {
      owner,
      admin,
      mentionJid,
      stage: options.stage || 'home'
    }
  );

  if (!buttonsEnabled) {
    const rawPlainText = buildPlainMenuText(pushName, {
      owner,
      admin,
      mentionJid,
      prefix: options.prefix || getConfiguredPrefix()
    });

    // Mantém o conteúdo e as fontes existentes, reduzindo bordas
    // muito compridas que quebram a apresentação em telas pequenas.
    const plainText = String(rawPlainText || '')
      .split(/\r?\n/)
      .map((line) => {
        const clean = line.replace(/[ \t]+$/, '');

        if (/MENUS DISPONÍVEIS/i.test(clean)) {
          return '╭── 📚 MENUS DISPONÍVEIS ──╮';
        }

        return clean.replace(/[━═─]{24,}/g, (run) => run.slice(0, 22));
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const fsModule = await import('node:fs');
    const pathModule = await import('node:path');
    const fsLocal = fsModule.default || fsModule;
    const pathLocal = pathModule.default || pathModule;

    let configuredMedia = null;

    try {
      const mediaModule = await import('./menu-media.js');

      if (typeof mediaModule.getMenuMedia === 'function') {
        configuredMedia = await mediaModule.getMenuMedia('global');
      }
    } catch (mediaConfigError) {
      console.warn(
        '[MENU] Configuração de capa indisponível:',
        mediaConfigError?.message || mediaConfigError
      );
    }

    const configuredPath =
      typeof configuredMedia?.path === 'string'
        ? pathLocal.resolve(process.cwd(), configuredMedia.path)
        : null;

    const imageCandidates = [
      configuredPath && /\.(jpe?g|png|webp)$/i.test(configuredPath)
        ? configuredPath
        : null,
      pathLocal.resolve(process.cwd(), 'dados', 'midias', 'menu.jpg'),
      pathLocal.resolve(process.cwd(), 'dados', 'midias', 'menu.jpeg'),
      pathLocal.resolve(process.cwd(), 'dados', 'midias', 'menu.png'),
      pathLocal.resolve(process.cwd(), 'dados', 'midias', 'menu.webp')
    ].filter(Boolean);

    const imagePath = imageCandidates.find((file) =>
      fsLocal.existsSync(file)
    );

    const defaultVideo = pathLocal.resolve(
      process.cwd(), 'dados', 'midias', 'menu.mp4'
    );

    const videoPath =
      configuredPath &&
      /\.mp4$/i.test(configuredPath) &&
      fsLocal.existsSync(configuredPath)
        ? configuredPath
        : fsLocal.existsSync(defaultVideo)
          ? defaultVideo
          : null;

    const mediaPath = imagePath || videoPath;
    const mentions = mentionJid ? [mentionJid] : [];
    let delivered = false;

    if (mediaPath) {
      try {
        const buffer = fsLocal.readFileSync(mediaPath);

        if (buffer.length && /\.(jpe?g|png|webp)$/i.test(mediaPath)) {
          await sock.sendMessage(
            normalizedJid,
            {
              image: buffer,
              caption: plainText,
              mentions
            },
            { quoted: options.info || undefined }
          );

          delivered = true;
        } else if (buffer.length && /\.mp4$/i.test(mediaPath)) {
          await sock.sendMessage(
            normalizedJid,
            {
              video: buffer,
              mimetype: 'video/mp4',
              caption: plainText,
              gifPlayback: true,
              mentions
            },
            { quoted: options.info || undefined }
          );

          delivered = true;
        }
      } catch (mediaError) {
        console.warn(
          '[MENU] Capa não enviada; usando texto como fallback:',
          mediaError?.message || mediaError
        );
      }
    }

    if (!delivered) {
      await sock.sendMessage(
        normalizedJid,
        {
          text: plainText,
          mentions
        },
        { quoted: options.info || undefined }
      );
    }

    markKyaraMenuCommandHandled(options.info);

    console.log(
      delivered
        ? '[MENU] Capa e menu enviados sem botões.'
        : '[MENU] Menu textual enviado; capa indisponível.'
    );

    return {
      ok: true,
      messageId: null,
      buttons: 0,
      media: delivered ? mediaPath : null
    };
  }

  const buttons =
    buildNativeFlowButtons(
      options.prefix || getConfiguredPrefix(),
      options.stage === 'categories' ? 'categories' : 'home'
    );

  /*
   * Primeiro tentamos mídia.
   * Se não funcionar, o Native Flow continua sem mídia.
   */

  // O menu interativo é leve: Native Flow/RAW sem imagem local.
  const { sendFlow } = await import('../nativeFlow/native-flow.js');
  let flowMedia = null;

  try {
    const mediaModule = await import('./menu-media.js');
    flowMedia = await mediaModule.getMenuMedia('global');
  } catch (mediaError) {
    console.warn('[MENU] Não consegui carregar a capa configurada:', mediaError?.message || mediaError);
  }

  if (!flowMedia?.path || !fs.existsSync(flowMedia.path)) {
    flowMedia = encontrarMidiaMenu();
  }

  try {
    const result = await sendFlow(sock, normalizedJid, {
      text,
      footer: safeText(getConfiguredBotName(), '𝗞𝗬𝗔𝗥𝗔-𝗦𝗬𝗦𝗧Ξ𝗠') + ' • ' + KYARA_CREATOR_NAME + ' • SISTEMA',
      title: owner
        ? '👑 ' + safeText(getConfiguredBotName(), '𝗞𝗬𝗔𝗥𝗔-𝗦𝗬𝗦𝗧Ξ𝗠') + ' • OWNER MODE'
        : admin
          ? '⚙️ ' + safeText(getConfiguredBotName(), '𝗞𝗬𝗔𝗥𝗔-𝗦𝗬𝗦𝗧Ξ𝗠') + ' • ADMIN MODE'
          : '🌸 ' + safeText(getConfiguredBotName(), '𝗞𝗬𝗔𝗥𝗔-𝗦𝗬𝗦𝗧Ξ𝗠') + ' • USER MODE',
      buttons,
      media: flowMedia,
      mentionedJid: mentionJid ? [mentionJid] : [],
      viewOnce: false
    });

    markKyaraMenuCommandHandled(options.info);
    console.log('[MENU] Native Flow central enviado:', result?.key?.id || 'OK');

    return {
      ok: true,
      messageId: result?.key?.id || null,
      buttons: buttons.length,
      media: flowMedia ? (flowMedia.type || 'image') : null
    };
  } catch (error) {
    console.error('[MENU] Native Flow central falhou:', error?.stack || error);

    await sock.sendMessage(
      normalizedJid,
      {
        text: buildPlainMenuText(pushName, {
          owner,
          admin,
          mentionJid,
          prefix: options.prefix || getConfiguredPrefix()
        }),
        mentions: mentionJid ? [mentionJid] : []
      },
      { quoted: options.info || undefined }
    );

    return {
      ok: false,
      messageId: null,
      buttons: 0,
      media: null
    };
  }

}

/*
 * ============================================================
 * LEITOR DE CLIQUES
 * ============================================================
 */

function getInteractiveCommand(
  message
) {

  try {

    const response =
      message
        ?.interactiveResponseMessage;

    if (!response) {
      return null;
    }

    const raw =
      response
        ?.nativeFlowResponseMessage
        ?.paramsJson;

    if (raw) {

      const params =
        JSON.parse(raw);

      return (
        params?.id ||
        params?.selectedId ||
        params?.rowId ||
        params?.button_id ||
        null
      );
    }

    const template =
      message
        ?.templateButtonReplyMessage;

    if (
      template?.selectedId
    ) {

      return String(
        template.selectedId
      ).trim();
    }

    const button =
      message
        ?.buttonsResponseMessage;

    if (
      button?.selectedButtonId
    ) {

      return String(
        button.selectedButtonId
      ).trim();
    }

    const list =
      message
        ?.listResponseMessage;

    if (
      list
        ?.singleSelectReply
        ?.selectedRowId
    ) {

      return String(
        list
          .singleSelectReply
          .selectedRowId
      ).trim();
    }

  } catch (error) {

    console.error(
      '[MENU][CLICK]',
      error?.message ||
      error
    );
  }

  return null;
}

/*
 * ============================================================
 * API PRINCIPAL
 * ============================================================
 */

async function menuKyaraAdaptativo(
  sock,
  jid,
  pushName = 'usuário',
  options = {}
) {

  return await enviarMenuAdaptativo(
    sock,
    jid,
    pushName,
    options
  );
}

export {

  CONFIG,

  MENUS_ORIGINAIS,

  isOwner,

  buildRows,

  buildNativeFlowButtons,

  encontrarMidiaMenu,

  enviarMenuAdaptativo,

  menuKyaraAdaptativo,

  getInteractiveCommand

};