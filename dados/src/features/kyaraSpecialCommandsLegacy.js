import {
  loadLevelingSafe,
  getLevelingUser,
  calculateNextLevelXp
} from '../utils/database.js';

import {
  getUserName,
  idsMatch
} from '../utils/helpers.js';

import {
  syncWeeklyVIP,
  getWeeklyRanking,
  getWeeklyStatus,
  submitIdea,
  listIdeas,
  addWeeklyXP
} from './weeklyLevel.js';

import {
  sendThemeStickers
} from './themeStickers.js';

import {
  generateWAMessageFromContent,
  prepareWAMessageMedia
} from 'baileys';

import * as youtube from '../funcs/downloads/youtube.js';
import * as tiktok from '../funcs/downloads/tiktok.js';
import * as igdl from '../funcs/downloads/igdl.js';
import * as kwai from '../funcs/downloads/kwai.js';
import * as pinterest from '../funcs/downloads/pinterest.js';
import * as facebook from '../funcs/downloads/facebook.js';
import * as twitter from '../funcs/utils/twitter.js';

function clamp(value, min, max) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

function safeName(id) {
  try {
    return getUserName(id);
  } catch {
    return String(id || '')
      .split('@')[0];
  }
}

function parseStickerArgs(q = '') {
  const parts =
    String(q || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (!parts.length) {
    return {
      theme: '',
      quantity: 5
    };
  }

  const last =
    parts[parts.length - 1];

  if (/^\d+$/.test(last)) {
    const quantity =
      Number(last);

    if (parts.length === 1) {
      return {
        theme: '',
        quantity
      };
    }

    return {
      theme:
        parts
          .slice(0, -1)
          .join(' ')
          .trim(),

      quantity
    };
  }

  return {
    theme:
      parts
        .join(' ')
        .trim(),

    quantity: 5
  };
}

function weeklyOptions(
  premiumList,
  premiumFile
) {
  return {
    premiumList:
      premiumList || {},

    premiumFile
  };
}

async function handleLevel({
  sender,
  pushname,
  prefix = '/',
  reply,
  premiumList,
  premiumFile
}) {
  syncWeeklyVIP(
    weeklyOptions(
      premiumList,
      premiumFile
    )
  );

  const levelingData =
    loadLevelingSafe();

  const user =
    getLevelingUser(
      levelingData,
      sender
    );

  const level =
    Math.max(
      1,
      Number(user?.level) || 1
    );

  const xp =
    Math.max(
      0,
      Number(user?.xp) || 0
    );

  const nextXp =
    Math.max(
      1,
      Number(
        calculateNextLevelXp(level)
      ) || 1
    );

  const percent =
    clamp(
      Math.floor(
        (xp / nextXp) * 100
      ),
      0,
      100
    );

  const filled =
    Math.min(
      10,
      Math.floor(
        percent / 10
      )
    );

  const bar =
    '█'.repeat(filled) +
    '░'.repeat(
      10 - filled
    );

  const missing =
    Math.max(
      0,
      nextXp - xp
    );

  const weekly =
    getWeeklyStatus(sender);

  const weeklyXP =
    Number(
      weekly?.userXP
    ) || 0;

  const name =
    pushname ||
    safeName(sender);

  const text =
    `╭━━━〔 ⭐ *LEVEL* 〕━━━╮\n` +
    `│ 👤 Jogador: *${name}*\n` +
    `│\n` +
    `│ 📊 Nível: *${level}*\n` +
    `│ 🎖️ Patente: *${user?.patent || 'Iniciante'}*\n` +
    `│\n` +
    `│ ✨ XP: *${xp} / ${nextXp}*\n` +
    `│ 📈 [${bar}] *${percent}%*\n` +
    `│ 🎯 Falta: *${missing} XP*\n` +
    `│\n` +
    `│ 💬 Mensagens: *${Number(user?.messages) || 0}*\n` +
    `│ ⚡ Comandos: *${Number(user?.commands) || 0}*\n` +
    `│ 🗓️ XP semanal: *${weeklyXP}*\n` +
    `│ 💡 Digite *${prefix || '/'}levelinfo* para saber mais.\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`;

  await reply(text);
}

async function handleLevelInfo({
  prefix,
  reply
}) {
  return reply(
    `╭━━━〔 📚 *LEVEL — COMO FUNCIONA* 〕━━━╮\n` +
    `│\n` +
    `│ ⭐ *O que é o Level?*\n` +
    `│ É o sistema de progressão da Kyara.\n` +
    `│ Sua atividade gera XP e permite subir de nível.\n` +
    `│\n` +
    `│ ✨ *XP*\n` +
    `│ Mensagens e comandos podem gerar XP.\n` +
    `│ O XP acumulado aparece em ${prefix}level.\n` +
    `│\n` +
    `│ 📊 *NÍVEL*\n` +
    `│ Quando seu XP atingir o necessário,\n` +
    `│ você sobe de nível automaticamente.\n` +
    `│\n` +
    `│ 🎖️ *PATENTE*\n` +
    `│ Sua patente acompanha seu progresso.\n` +
    `│\n` +
    `│ 🏆 *RANKING*\n` +
    `│ ${prefix}ranklevel\n` +
    `│ Mostra quem possui mais Level.\n` +
    `│\n` +
    `│ 🗓️ *RANKING SEMANAL*\n` +
    `│ ${prefix}ranksemanal\n` +
    `│ Mostra quem mais ganhou XP na semana.\n` +
    `│\n` +
    `│ 🎁 *PRÊMIO*\n` +
    `│ O ranking semanal participa da recompensa\n` +
    `│ definida pelo sistema da Kyara.\n` +
    `│\n` +
    `│ 💡 *COMANDOS*\n` +
    `│ ${prefix}level\n` +
    `│ ${prefix}levelinfo\n` +
    `│ ${prefix}ranklevel\n` +
    `│ ${prefix}ranksemanal\n` +
    `│ ${prefix}menulevel\n` +
    `│\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
  );
}

async function handleRankLevel({
  isGroup,
  groupMembers,
  reply
}) {
  const levelingData =
    loadLevelingSafe();

  let entries =
    Object.entries(
      levelingData?.users || {}
    );

  if (isGroup) {
    const members =
      Array.isArray(groupMembers)
        ? groupMembers
        : [];

    if (members.length) {
      entries =
        entries.filter(
          ([id]) =>
            members.some(
              member => {
                try {
                  return idsMatch(
                    id,
                    member
                  );
                } catch {
                  return (
                    String(id) ===
                    String(member)
                  );
                }
              }
            )
        );
    }
  }

  const ranking =
    entries
      .map(
        ([id, user]) => ({
          id,

          level:
            Math.max(
              1,
              Number(user?.level) || 1
            ),

          xp:
            Math.max(
              0,
              Number(user?.xp) || 0
            ),

          messages:
            Math.max(
              0,
              Number(user?.messages) || 0
            ),

          patent:
            user?.patent ||
            'Iniciante'
        })
      )
      .sort(
        (a, b) =>
          b.level - a.level ||
          b.xp - a.xp ||
          b.messages - a.messages
      )
      .slice(0, 15);

  if (!ranking.length) {
    return reply(
      isGroup
        ? '📊 *RANKING DE LEVEL*\n\nNenhum membro do grupo possui XP registrado ainda.'
        : '📊 *RANKING DE LEVEL*\n\nNenhum usuário possui XP registrado ainda.'
    );
  }

  const mentions =
    ranking.map(
      user => user.id
    );

  const lines = [
    `╭━━━〔 🏆 *RANKING DE LEVEL* 〕━━━╮`,
    `│ ${isGroup ? '👥 Grupo atual' : '🌎 Ranking global'}`,
    `│`
  ];

  ranking.forEach(
    (user, index) => {
      const medal =
        ['🥇', '🥈', '🥉'][index] ||
        `${index + 1}º`;

      lines.push(
        `│ ${medal} @${safeName(user.id)}`
      );

      lines.push(
        `│    📊 Nível *${user.level}* • ✨ ${user.xp} XP`
      );

      lines.push(
        `│    🎖️ ${user.patent} • 💬 ${user.messages} msgs`
      );

      if (
        index !==
        ranking.length - 1
      ) {
        lines.push('│');
      }
    }
  );

  lines.push('│');

  lines.push(
    '│ 💡 Continue ativo para subir!'
  );

  lines.push(
    '╰━━━━━━━━━━━━━━━━━━━━╯'
  );

  await reply(
    lines.join('\n'),
    {
      mentions
    }
  );
}

async function handleWeeklyRank({
  sender,
  reply,
  premiumList,
  premiumFile
}) {
  const sync =
    syncWeeklyVIP(
      weeklyOptions(
        premiumList,
        premiumFile
      )
    );

  const ranking =
    getWeeklyRanking(15);

  const status =
    getWeeklyStatus(sender);

  if (!ranking.length) {
    return reply(
      `╭━━━〔 🏆 *RANKING SEMANAL* 〕━━━╮\n` +
      `│ 📅 Semana: *${status?.weekKey || 'atual'}*\n` +
      `│\n` +
      `│ 📭 Nenhuma atividade registrada.\n` +
      `│\n` +
      `│ 🎁 Prêmio: *VIP*\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`
    );
  }

  const mentions =
    ranking.map(
      user => user.id
    );

  const lines = [
    `╭━━━〔 🏆 *RANKING SEMANAL* 〕━━━╮`,
    `│ 📅 Semana: *${status?.weekKey || 'atual'}*`,
    `│`
  ];

  ranking.forEach(
    (user, index) => {
      const medal =
        ['🥇', '🥈', '🥉'][index] ||
        `${index + 1}º`;

      lines.push(
        `│ ${medal} @${safeName(user.id)} — *${Number(user.xp) || 0} XP*`
      );
    }
  );

  lines.push('│');

  if (
    sync?.changed &&
    sync?.winner
  ) {
    lines.push(
      `│ 👑 Vencedor da semana anterior: @${safeName(sync.winner)}`
    );

    lines.push(
      sync.awarded
        ? '│ 🎁 VIP semanal concedido!'
        : '│ 🎁 O vencedor já possuía VIP.'
    );

    mentions.push(
      sync.winner
    );

    lines.push('│');
  }

  lines.push(
    '│ 🎁 Prêmio do fechamento: *VIP*'
  );

  lines.push(
    '╰━━━━━━━━━━━━━━━━━━━━╯'
  );

  await reply(
    lines.join('\n'),
    {
      mentions: [
        ...new Set(mentions)
      ]
    }
  );
}

async function handleLevelMenu({
  sender,
  prefix,
  reply,
  premiumList,
  premiumFile
}) {
  syncWeeklyVIP(
    weeklyOptions(
      premiumList,
      premiumFile
    )
  );

  const status =
    getWeeklyStatus(sender);

  await reply(
    `╭━━━〔 ⭐ *MENU LEVEL* 〕━━━╮\n` +
    `│\n` +
    `│ 📊 ${prefix}level\n` +
    `│ 📊 ${prefix}nivel\n` +
    `│ 🏆 ${prefix}ranklevel\n` +
    `│ 🏆 ${prefix}ranksemanal\n` +
    `│ 🏆 ${prefix}rankingsemanal\n` +
    `│ 🏆 ${prefix}topsemanal\n` +
    `│\n` +
    `│ 💡 ${prefix}ideia <sua ideia>\n` +
    `│ 📦 ${prefix}caixadeideias\n` +
    `│\n` +
    `│ 🗓️ Semana: *${status?.weekKey || 'atual'}*\n` +
    `│ 🎁 Prêmio semanal: *VIP*\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`
  );
}

async function handleIdea({
  q,
  sender,
  pushname,
  reply
}) {
  const text =
    String(q || '').trim();

  if (!text) {
    return reply(
      `╭━━━〔 💡 *CAIXA DE IDEIAS* 〕━━━╮\n` +
      `│\n` +
      `│ Use:\n` +
      `│ /ideia sua ideia aqui\n` +
      `│\n` +
      `│ ✨ Sua sugestão será registrada.\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`
    );
  }

  const result =
    submitIdea({
      userId: sender,

      name:
        pushname ||
        safeName(sender),

      idea: text
    });

  if (!result?.success) {
    return reply(
      `❌ Não consegui registrar sua ideia.` +
      (
        result?.error
          ? `\n\n${result.error}`
          : ''
      )
    );
  }

  try {
    addWeeklyXP(
      sender,
      20,
      pushname
    );
  } catch {}

  await reply(
    `╭━━━〔 💡 *IDEIA REGISTRADA* 〕━━━╮\n` +
    `│ 🆔 Nº *${result.id}*\n` +
    `│ 👤 ${pushname || safeName(sender)}\n` +
    `│\n` +
    `│ 📝 ${result.item?.text || text}\n` +
    `│\n` +
    `│ ⭐ +20 XP semanal\n` +
    `│\n` +
    `│ Obrigado por ajudar a melhorar a *Kyara*! ✨\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`
  );
}

async function handleIdeas({
  reply
}) {
  const ideas =
    listIdeas({
      status: null,
      limit: 20
    });

  if (!ideas.length) {
    return reply(
      `╭━━━〔 💡 *CAIXA DE IDEIAS* 〕━━━╮\n` +
      `│\n` +
      `│ 📭 Nenhuma ideia registrada.\n` +
      `│\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`
    );
  }

  const lines = [
    `╭━━━〔 💡 *CAIXA DE IDEIAS* 〕━━━╮`,
    `│`
  ];

  ideas.forEach(
    (item, index) => {
      const text =
        item?.text ??
        item?.idea ??
        'Sem texto';

      const name =
        item?.name ||
        safeName(
          item?.userId ||
          item?.user ||
          ''
        );

      const date =
        item?.createdAt
          ? new Date(
              item.createdAt
            ).toLocaleDateString(
              'pt-BR'
            )
          : 'sem data';

      lines.push(
        `│ 💡 *#${item.id}* — ${name}`
      );

      lines.push(
        `│ 📝 ${text}`
      );

      lines.push(
        `│ 📅 ${date}`
      );

      if (
        index !==
        ideas.length - 1
      ) {
        lines.push('│');
      }
    }
  );

  lines.push('│');

  lines.push(
    '╰━━━━━━━━━━━━━━━━━━━━╯'
  );

  await reply(
    lines.join('\n')
  );
}

async function handleStickers({
  q,
  prefix,
  isGroup,
  sender,
  from,
  nazu,
  info,
  reply
}) {
  const parsed =
    parseStickerArgs(q);

  const theme =
    parsed.theme;

  const quantity =
    parsed.quantity;

  if (!theme) {
    return reply(
      `╭━━━〔 🎨 *FIGURINHAS* 〕━━━╮\n` +
      `│\n` +
      `│ ${prefix}figurinhas goku 3\n` +
      `│ ${prefix}figurinhas naruto 5\n` +
      `│ ${prefix}figurinhas gatos 10\n` +
      `│\n` +
      `│ 🔢 Quantidade: *1 a 20*\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 20
  ) {
    return reply(
      '❌ A quantidade deve ser um número inteiro entre *1 e 20*.'
    );
  }

  const destino =
    isGroup
      ? sender
      : from;

  await reply(
    `╭━━━〔 🎨 *FIGURINHAS* 〕━━━╮\n` +
    `│ 🎯 Tema: *${theme}*\n` +
    `│ 🔢 Quantidade: *${quantity}*\n` +
    `│ 📬 ${isGroup ? 'Enviarei no seu privado.' : 'Enviarei aqui.'}\n` +
    `│ ⏳ Pesquisando imagens...\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`
  );

  const result =
    await sendThemeStickers({
      nazu,
      destino,
      tema: theme,
      quantidade: quantity,
      author: 'Baki',
      packname: 'Kyara',
      quoted:
        isGroup
          ? undefined
          : info
    });

  await nazu.sendMessage(
    destino,
    {
      text:
        `╭━━━〔 ✅ *PACOTE FINALIZADO* 〕━━━╮\n` +
        `│ 🎯 Tema: *${theme}*\n` +
        `│ 📦 Solicitadas: *${result?.requested ?? quantity}*\n` +
        `│ ✅ Enviadas: *${result?.sent ?? 0}*\n` +
        `│ ⚠️ Falhas: *${result?.failed ?? 0}*\n` +
        `│\n` +
        `│ 🎨 Pacote: *Kyara*\n` +
        `│ ✨ Créditos: *Baki*\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯`
    }
  );

  return true;
}

/* ================================================================
 * KYARA MEDIA — DETECÇÃO UNIVERSAL
 * ================================================================ */

function isMediaUrl(value) {
  return /^https?:\/\/\S+$/i.test(
    String(value || '').trim()
  );
}

function detectarPlataforma(url) {
  try {
    const host =
      new URL(
        String(url).trim()
      )
        .hostname
        .toLowerCase()
        .replace(/^www\./, '');

    if (
      host === 'youtube.com' ||
      host === 'youtu.be' ||
      host.endsWith('.youtube.com')
    ) {
      return 'YouTube';
    }

    if (
      host === 'tiktok.com' ||
      host.endsWith('.tiktok.com')
    ) {
      return 'TikTok';
    }

    if (
      host === 'instagram.com' ||
      host === 'instagr.am' ||
      host.endsWith('.instagram.com')
    ) {
      return 'Instagram';
    }

    if (
      host === 'facebook.com' ||
      host === 'fb.watch' ||
      host.endsWith('.facebook.com')
    ) {
      return 'Facebook';
    }

    if (
      host === 'kwai.com' ||
      host === 'kwai-video.com' ||
      host.endsWith('.kwai.com')
    ) {
      return 'Kwai';
    }

    if (
      host === 'x.com' ||
      host === 'twitter.com' ||
      host.endsWith('.x.com') ||
      host.endsWith('.twitter.com')
    ) {
      return 'Twitter/X';
    }

    if (
      host === 'pinterest.com' ||
      host === 'pin.it' ||
      host.endsWith('.pinterest.com')
    ) {
      return 'Pinterest';
    }

    return '';

  } catch {
    return '';
  }
}

function formatViews(value) {
  const n =
    Number(value);

  return Number.isFinite(n) &&
    n > 0
    ? n.toLocaleString('pt-BR')
    : '0';
}

async function enviarPlayUniversal({
  nazu,
  from,
  info,
  reply,
  prefix,
  data
}) {
  const mediaUrl =
    data?.sourceUrl ||
    data?.url;

  if (!mediaUrl) {
    throw new Error(
      'URL da mídia não encontrada.'
    );
  }

  const title =
    String(
      data?.title ||
      'Mídia'
    ).slice(0, 180);

  const author =
    String(
      data?.author?.name ||
      data?.uploader ||
      data?.channel ||
      data?.platform ||
      'Desconhecido'
    ).slice(0, 100);

  const duration =
    String(
      data?.timestamp ||
      'Desconhecida'
    );

  const views =
    formatViews(
      data?.views
    );

  const platform =
    data?.platform ||
    detectarPlataforma(
      mediaUrl
    ) ||
    'Mídia';

  const thumbnail =
    data?.thumbnail ||
    (
      data?.videoId
        ? `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`
        : ''
    );

  const buttons = [
    {
      name: 'quick_reply',

      buttonParamsJson:
        JSON.stringify({
          display_text:
            '🎵 Baixar Áudio',

          id:
            `${prefix}playaudio ${mediaUrl}`
        })
    },

    {
      name: 'quick_reply',

      buttonParamsJson:
        JSON.stringify({
          display_text:
            '🎬 Baixar Vídeo',

          id:
            `${prefix}playvideo ${mediaUrl}`
        })
    }
  ];

  const caption =
    `🎵 *${title}*\n\n` +
    `👤 *Artista/Canal:* ${author}\n` +
    `⏱️ *Duração:* ${duration}\n` +
    `👀 *Visualizações:* ${views}\n` +
    `🌐 *Fonte:* ${platform}\n\n` +
    `🌸 *Kyara*\n` +
    `Selecione o formato desejado:`;

  let imageMessage =
    null;

  if (thumbnail) {
    try {
      const response =
        await fetch(
          thumbnail
        );

      if (response.ok) {
        const buffer =
          Buffer.from(
            await response.arrayBuffer()
          );

        if (buffer.length) {
          const prepared =
            await prepareWAMessageMedia(
              {
                image: buffer
              },
              {
                upload:
                  nazu.waUploadToServer
              }
            );

          imageMessage =
            prepared?.imageMessage ||
            null;
        }
      }

    } catch (error) {
      console.warn(
        `[PLAY KYARA] Thumbnail indisponível: ${error?.message || error}`
      );
    }
  }

  const interactiveMessage = {
    body: {
      text: caption
    },

    footer: {
      text:
        '🌸 Kyara • © Baki'
    },

    nativeFlowMessage: {
      buttons,

      messageParamsJson:
        '{}',

      messageVersion: 1
    }
  };

  if (imageMessage) {
    interactiveMessage.header = {
      hasMediaAttachment: true,
      imageMessage
    };
  }

  const msg =
    generateWAMessageFromContent(
      from,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },

            interactiveMessage
          }
        }
      },
      {
        quoted: info,
        userJid:
          nazu?.user?.id
      }
    );

  const bizNode = {
    tag: 'biz',

    attrs: {
      actual_actors: '2',

      host_storage: '2',

      privacy_mode_ts:
        String(
          Math.floor(
            Date.now() / 1000
          ) -
          77980457
        )
    },

    content: [
      {
        tag: 'interactive',

        attrs: {
          type: 'native_flow',
          v: '1'
        },

        content: [
          {
            tag: 'native_flow',

            attrs: {
              v: '9',
              name: 'mixed'
            }
          }
        ]
      },

      {
        tag: 'quality_control',

        attrs: {
          source_type:
            'third_party'
        }
      }
    ]
  };

  const additionalNodes =
    from.endsWith('@g.us')
      ? [bizNode]
      : [
          {
            tag: 'bot',

            attrs: {
              biz_bot: '1'
            }
          },

          bizNode
        ];

  await nazu.relayMessage(
    from,
    msg.message,
    {
      messageId:
        msg.key.id,

      additionalNodes
    }
  );
}

async function baixarAudioUniversal(
  url
) {
  return youtube.mp3(url);
}

async function baixarVideoUniversal(
  url
) {
  return youtube.mp4(url);
}

async function enviarVideoResult({
  nazu,
  from,
  info,
  reply,
  result
}) {
  if (
    !result?.ok ||
    !result.buffer
  ) {
    await reply(
      `❌ ${
        result?.msg ||
        'Não foi possível baixar o vídeo.'
      }`
    );

    return false;
  }

  try {
    await nazu.sendMessage(
      from,
      {
        video:
          result.buffer,

        mimetype:
          result.mimetype ||
          'video/mp4',

        fileName:
          result.filename ||
          'video.mp4'
      },
      {
        quoted: info
      }
    );

  } catch (error) {
    const texto =
      String(
        error?.message ||
        error ||
        ''
      );

    if (
      texto.includes('ENOSPC') ||
      texto
        .toLowerCase()
        .includes('size')
    ) {
      await reply(
        '📦 O vídeo é grande; enviando como documento...'
      );

      await nazu.sendMessage(
        from,
        {
          document:
            result.buffer,

          fileName:
            result.filename ||
            'video.mp4',

          mimetype:
            result.mimetype ||
            'video/mp4'
        },
        {
          quoted: info
        }
      );

    } else {
      throw error;
    }
  }

  return true;
}

async function handleMediaSpecialCommand(
  options
) {
  // KYARA_PLAY_ONLY_NEW_MEDIA
  // O sistema novo kyaraMediaCommands.js é o único
  // responsável pelos comandos de mídia.

  const __kyaraCentralMediaCommands = new Set([
    'play',
    'playaudio',
    'playvideo',
    'playvid',
    'ytmp3',
    'ytmp4',
    'tiktok',
    'instagram',
    'facebook',
    'kwai',
    'twitter',
    'x',
    'pinterest',
    'pin'
  ]);

  const __kyaraCurrentMediaCommand =
    String(options?.command || '')
      .trim()
      .toLowerCase();

  if (__kyaraCentralMediaCommands.has(__kyaraCurrentMediaCommand)) {
    return false;
  }

  const {
    command,
    q,
    prefix = '/',
    from,
    nazu,
    info,
    reply
  } = options;

  const cmd =
    String(command || '')
      .trim()
      .toLowerCase();

  const query =
    String(q || '').trim();


  /*
   * ==========================================================
   * 🚫 MÍDIA CENTRALIZADA
   *
   * O sistema novo em kyaraMediaCommands.js é o único
   * responsável por /play, /playaudio e /playvideo.
   *
   * Isso impede que uma segunda implementação do mesmo
   * comando seja executada.
   * ==========================================================
   */
  const centralizedMediaCommands = [
    'play',
    'playaudio',
    'playvideo',
    'playvid',
    'ytmp3',
    'ytmp4',
    'tiktok',
    'instagram',
    'facebook',
    'kwai',
    'twitter',
    'x',
    'pinterest',
    'pin'
  ];

  if (
    centralizedMediaCommands.includes(cmd)
  ) {
    return false;
  }

  const supported = [
    'play',
    'ytmp3',
    'playaudio',
    'playvideo',
    'playvid',
    'ytmp4',

    'tiktok',
    'tiktokaudio',
    'tiktokvideo',
    'tiktoks',
    'tiktoksearch',
    'ttk',
    'tkk',

    'instagram',
    'igdl',
    'ig',
    'instavideo',
    'igstory',

    'facebook',
    'fb',
    'fbdl',
    'facebookdl',

    'kwai',

    'twitter',
    'x',
    'twitterdl',

    'pinterest',
    'pin'
  ];

  if (!supported.includes(cmd)) {
    return false;
  }

  if (!query) {
    await reply(
      `❌ Informe uma pesquisa ou URL.\n\n` +
      `Exemplo: ${prefix}${cmd} goku`
    );

    return true;
  }

  try {

    /*
     * ============================================================
     * /PLAY
     * ============================================================
     *
     * TEXTO:
     * YouTube.
     *
     * URL:
     * detecção automática.
     */
    if (
      cmd === 'play' ||
      cmd === 'ytmp3'
    ) {

      if (isMediaUrl(query)) {
        const platform =
          detectarPlataforma(
            query
          );

        if (!platform) {
          await reply(
            '❌ Plataforma não reconhecida. Envie uma URL de mídia suportada.'
          );

          return true;
        }

        await reply(
          `🔎 Obtendo informações de ${platform}...`
        );

        const meta =
          await youtube.info(
            query
          );

        if (!meta?.ok) {
          await reply(
            meta?.msg ||
            '❌ Não foi possível obter os metadados dessa URL.'
          );

          return true;
        }

        if (
          Number(
            meta.data?.seconds ||
            0
          ) > 1800
        ) {
          await reply(
            `⚠️ *Mídia muito longa*\n\n` +
            `⏱️ Duração: *${meta.data.timestamp || 'desconhecida'}*\n` +
            `📌 Limite: *30 minutos*`
          );

          return true;
        }

        await enviarPlayUniversal({
          nazu,
          from,
          info,
          reply,
          prefix,

          data: {
            ...meta.data,

            sourceUrl:
              query,

            platform
          }
        });

        return true;
      }

      /*
       * Texto sempre pesquisa YouTube.
       */
      const resultado =
        await youtube.search(
          query
        );

      if (
        !resultado?.ok ||
        !resultado?.data
      ) {
        await reply(
          resultado?.msg ||
          '❌ Nenhuma música encontrada no YouTube.'
        );

        return true;
      }

      if (
        Number(
          resultado.data.seconds ||
          0
        ) > 1800
      ) {
        await reply(
          `⚠️ *Música muito longa*\n\n` +
          `⏱️ Duração: *${resultado.data.timestamp || 'desconhecida'}*\n` +
          `📌 Limite: *30 minutos*`
        );

        return true;
      }

      await enviarPlayUniversal({
        nazu,
        from,
        info,
        reply,
        prefix,

        data: {
          ...resultado.data,

          sourceUrl:
            resultado.data.url,

          platform:
            'YouTube'
        }
      });

      return true;
    }

    /*
     * ============================================================
     * /PLAYAUDIO
     * ============================================================
     */
    if (
      cmd === 'playaudio'
    ) {
      const url =
        isMediaUrl(query)
          ? query
          : /^[A-Za-z0-9_-]{6,20}$/.test(query)
            ? `https://www.youtube.com/watch?v=${query}`
            : '';

      if (!url) {
        await reply(
          '❌ Envie uma URL completa ou um ID válido do YouTube.'
        );

        return true;
      }

      await reply(
        '🎵 *Baixando áudio em alta qualidade...*'
      );

      const result =
        await baixarAudioUniversal(
          url
        );

      if (
        !result?.ok ||
        !result.buffer
      ) {
        await reply(
          `❌ ${
            result?.msg ||
            'Falha no download do áudio.'
          }`
        );

        return true;
      }

      await nazu.sendMessage(
        from,
        {
          audio:
            result.buffer,

          mimetype:
            result.mimetype ||
            'audio/mpeg',

          fileName:
            result.filename ||
            'audio.mp3'
        },
        {
          quoted: info
        }
      );

      return true;
    }

    /*
     * ============================================================
     * /PLAYVIDEO
     * ============================================================
     */
    if (
      cmd === 'playvideo' ||
      cmd === 'playvid' ||
      cmd === 'ytmp4'
    ) {
      let url = '';

      if (
        isMediaUrl(query)
      ) {
        url = query;

      } else if (
        /^[A-Za-z0-9_-]{6,20}$/.test(
          query
        )
      ) {
        url =
          `https://www.youtube.com/watch?v=${query}`;
      }

      if (!url) {
        await reply(
          '❌ Envie uma URL completa ou um ID válido do YouTube.'
        );

        return true;
      }

      await reply(
        '🎬 *Baixando vídeo na maior qualidade disponível...*'
      );

      const result =
        await baixarVideoUniversal(
          url
        );

      await enviarVideoResult({
        nazu,
        from,
        info,
        reply,
        result
      });

      return true;
    }

    /*
     * ============================================================
     * TIKTOK
     * ============================================================
     *
     * URL:
     * yt-dlp direto.
     *
     * TEXTO:
     * usa a pesquisa existente do módulo TikTok.
     */
    if (
      cmd === 'tiktok' ||
      cmd === 'tiktokaudio' ||
      cmd === 'tiktokvideo' ||
      cmd === 'tiktoks' ||
      cmd === 'tiktoksearch' ||
      cmd === 'ttk' ||
      cmd === 'tkk'
    ) {

      if (
        isMediaUrl(query)
      ) {
        if (
          detectarPlataforma(
            query
          ) !== 'TikTok'
        ) {
          await reply(
            '❌ Este comando espera uma URL do TikTok.'
          );

          return true;
        }

        await reply(
          '🎬 *Baixando TikTok na maior qualidade disponível...*'
        );

        const result =
          await baixarVideoUniversal(
            query
          );

        await enviarVideoResult({
          nazu,
          from,
          info,
          reply,
          result
        });

        return true;
      }

      const result =
        await tiktok.search(
          query
        );

      if (!result?.ok) {
        await reply(
          result?.msg ||
          '❌ Nenhum vídeo encontrado no TikTok.'
        );

        return true;
      }

      const url =
        result?.urls?.[0];

      if (!url) {
        await reply(
          '❌ A pesquisa do TikTok não retornou uma URL utilizável.'
        );

        return true;
      }

      await reply(
        '🎬 *Baixando resultado do TikTok...*'
      );

      const downloaded =
        await baixarVideoUniversal(
          result.link || url
        );

      if (
        downloaded?.ok
      ) {
        await enviarVideoResult({
          nazu,
          from,
          info,
          reply,
          result: downloaded
        });

      } else {
        await nazu.sendMessage(
          from,
          {
            video: {
              url
            },

            caption:
              result.title ||
              undefined
          },
          {
            quoted: info
          }
        );
      }

      return true;
    }

    /*
     * ============================================================
     * INSTAGRAM
     * ============================================================
     */
    if (
      cmd === 'instagram' ||
      cmd === 'igdl' ||
      cmd === 'ig' ||
      cmd === 'instavideo' ||
      cmd === 'igstory'
    ) {

      if (!isMediaUrl(query)) {
        await reply(
          '📸 Para Instagram, envie a URL do post/reel/story.\n\n' +
          `Exemplo: ${prefix}${cmd} https://www.instagram.com/reel/...`
        );

        return true;
      }

      if (
        detectarPlataforma(
          query
        ) !== 'Instagram'
      ) {
        await reply(
          '❌ Este comando espera uma URL do Instagram.'
        );

        return true;
      }

      await reply(
        '📸 *Baixando Instagram na maior qualidade disponível...*'
      );

      const result =
        await baixarVideoUniversal(
          query
        );

      if (result?.ok) {
        await enviarVideoResult({
          nazu,
          from,
          info,
          reply,
          result
        });

        return true;
      }

      /*
       * Fallback para o módulo Instagram
       * existente.
       */
      const fallback =
        await igdl.dl(
          query
        );

      if (!fallback?.ok) {
        await reply(
          result?.msg ||
          fallback?.msg ||
          '❌ Não foi possível baixar o Instagram.'
        );

        return true;
      }

      for (
        const item of
        fallback.data || []
      ) {
        if (!item?.url) {
          continue;
        }

        await nazu.sendMessage(
          from,
          {
            [item.type || 'video']: {
              url: item.url
            }
          },
          {
            quoted: info
          }
        );
      }

      return true;
    }

    /*
     * ============================================================
     * FACEBOOK
     * ============================================================
     */
    if (
      cmd === 'facebook' ||
      cmd === 'fb' ||
      cmd === 'fbdl' ||
      cmd === 'facebookdl'
    ) {

      if (!isMediaUrl(query)) {
        await reply(
          `📹 Envie uma URL do Facebook.\n\n` +
          `Exemplo: ${prefix}${cmd} https://www.facebook.com/...`
        );

        return true;
      }

      if (
        detectarPlataforma(
          query
        ) !== 'Facebook'
      ) {
        await reply(
          '❌ Este comando espera uma URL do Facebook.'
        );

        return true;
      }

      await reply(
        '📹 *Baixando Facebook na maior qualidade disponível...*'
      );

      const result =
        await baixarVideoUniversal(
          query
        );

      if (result?.ok) {
        await enviarVideoResult({
          nazu,
          from,
          info,
          reply,
          result
        });

        return true;
      }

      /*
       * Fallback existente.
       */
      const fallback =
        await facebook.downloadHD(
          query
        );

      if (!fallback?.ok) {
        await reply(
          result?.msg ||
          fallback?.msg ||
          '❌ Não foi possível baixar o Facebook.'
        );

        return true;
      }

      await enviarVideoResult({
        nazu,
        from,
        info,
        reply,
        result: fallback
      });

      return true;
    }

    /*
     * ============================================================
     * KWAI
     * ============================================================
     */
    if (
      cmd === 'kwai'
    ) {

      if (!isMediaUrl(query)) {
        await reply(
          `🎬 Para Kwai, envie a URL do vídeo.\n\n` +
          `Exemplo: ${prefix}kwai https://www.kwai.com/...`
        );

        return true;
      }

      if (
        detectarPlataforma(
          query
        ) !== 'Kwai'
      ) {
        await reply(
          '❌ Este comando espera uma URL do Kwai.'
        );

        return true;
      }

      await reply(
        '🎬 *Baixando Kwai na maior qualidade disponível...*'
      );

      const result =
        await baixarVideoUniversal(
          query
        );

      if (result?.ok) {
        await enviarVideoResult({
          nazu,
          from,
          info,
          reply,
          result
        });

        return true;
      }

      /*
       * Fallback existente.
       */
      const fallback =
        await kwai.dl(
          query
        );

      if (!fallback?.ok) {
        await reply(
          result?.msg ||
          fallback?.msg ||
          '❌ Não foi possível baixar o Kwai.'
        );

        return true;
      }

      for (
        const item of
        fallback.data || []
      ) {
        if (
          !item?.buff &&
          !item?.url
        ) {
          continue;
        }

        await nazu.sendMessage(
          from,
          {
            video:
              item.buff ||
              {
                url: item.url
              },

            mimetype:
              item.mime ||
              'video/mp4'
          },
          {
            quoted: info
          }
        );
      }

      return true;
    }

    /*
     * ============================================================
     * TWITTER / X
     * ============================================================
     */
    if (
      cmd === 'twitter' ||
      cmd === 'x' ||
      cmd === 'twitterdl'
    ) {

      if (!isMediaUrl(query)) {
        await reply(
          `🐦 Envie uma URL do Twitter/X.\n\n` +
          `Exemplo: ${prefix}${cmd} https://x.com/.../status/...`
        );

        return true;
      }

      const platform =
        detectarPlataforma(
          query
        );

      if (
        platform !== 'Twitter/X'
      ) {
        await reply(
          '❌ Este comando espera uma URL do Twitter/X.'
        );

        return true;
      }

      await reply(
        '🐦 *Baixando Twitter/X na maior qualidade disponível...*'
      );

      const result =
        await baixarVideoUniversal(
          query
        );

      if (result?.ok) {
        await enviarVideoResult({
          nazu,
          from,
          info,
          reply,
          result
        });

        return true;
      }

      /*
       * Fallback para o módulo Twitter existente.
       */
      const fallback =
        await twitter.getInfo(
          query
        );

      if (
        !fallback?.ok ||
        !fallback?.media?.length
      ) {
        await reply(
          result?.msg ||
          fallback?.msg ||
          '❌ Não foi possível obter a mídia do Twitter/X.'
        );

        return true;
      }

      for (
        const media of
        fallback.media
      ) {
        if (
          media.type === 'photo'
        ) {
          await nazu.sendMessage(
            from,
            {
              image: {
                url:
                  media.urlHD ||
                  media.url
              }
            },
            {
              quoted: info
            }
          );

          continue;
        }

        if (media.url) {
          await nazu.sendMessage(
            from,
            {
              video: {
                url: media.url
              },

              mimetype:
                'video/mp4'
            },
            {
              quoted: info
            }
          );
        }
      }

      return true;
    }

    /*
     * ============================================================
     * PINTEREST
     * ============================================================
     *
     * URL:
     * imagem automaticamente.
     *
     * TEXTO:
     * pesquisa Pinterest.
     */
    if (
      cmd === 'pinterest' ||
      cmd === 'pin'
    ) {

      if (
        isMediaUrl(query)
      ) {
        if (
          detectarPlataforma(
            query
          ) !== 'Pinterest'
        ) {
          await reply(
            '❌ Este comando espera uma URL do Pinterest.'
          );

          return true;
        }

        await reply(
          '📌 *Baixando imagem do Pinterest...*'
        );

        const result =
          await pinterest.dl(
            query
          );

        if (
          !result?.ok ||
          !result.urls?.length
        ) {
          /*
           * Fallback de metadados pelo yt-dlp.
           */
          const meta =
            await youtube.info(
              query
            );

          if (
            meta?.ok &&
            meta.data?.thumbnail
          ) {
            await nazu.sendMessage(
              from,
              {
                image: {
                  url:
                    meta.data.thumbnail
                }
              },
              {
                quoted: info
              }
            );

            return true;
          }

          await reply(
            result?.msg ||
            '❌ Não foi possível obter a imagem do Pinterest.'
          );

          return true;
        }

        for (
          const imageUrl of
          result.urls
        ) {
          await nazu.sendMessage(
            from,
            {
              image: {
                url: imageUrl
              },

              mimetype:
                result.mime ||
                'image/jpeg'
            },
            {
              quoted: info
            }
          );
        }

        return true;
      }

      const result =
        await pinterest.search(
          query
        );

      if (
        !result?.ok ||
        !result.urls?.length
      ) {
        await reply(
          result?.msg ||
          '❌ Nenhuma imagem encontrada no Pinterest.'
        );

        return true;
      }

      await nazu.sendMessage(
        from,
        {
          image: {
            url:
              result.urls[0]
          },

          caption:
            `📌 *Pinterest*\n\n` +
            `🔎 Pesquisa: *${query}*\n` +
            `🌸 *Kyara*`
        },
        {
          quoted: info
        }
      );

      return true;
    }

    return false;

  } catch (error) {
    console.error(
      `[KYARA MEDIA] Erro em ${cmd}:`,
      error?.stack ||
      error?.message ||
      error
    );

    await reply(
      `❌ Não foi possível processar *${cmd}*.\n\n` +
      `${error?.message || 'Erro desconhecido.'}`
    );

    return true;
  }
}

export async function handleKyaraSpecialCommand(
  options = {}
) {
  const {
    command,
    q,
    sender,
    pushname,
    prefix,
    isGroup,
    from,
    nazu,
    info,
    reply,
    groupMembers,
    premiumList,
    premiumFile
  } = options;

  /*
   * A mídia é tratada primeiro.
   *
   * Isso faz com que os cases antigos do index.js
   * não capturem /play, /tiktok, /instagram etc.
   */
  const mediaHandled =
    await handleMediaSpecialCommand(
      options
    );

  if (mediaHandled) {
    return true;
  }

  switch (
    String(command || '')
      .trim()
      .toLowerCase()
  ) {

    case 'levelinfo':
    case 'nivelinfo':
    case 'levelajuda':
    case 'ajudalevel':
    case 'xplevel':
      await handleLevelInfo({
        prefix,
        reply
      });

      return true;

    case 'level':
    case 'nivel':
      await handleLevel({
        sender,
        pushname,
        reply,
        premiumList,
        premiumFile
      });

      return true;

    case 'ranklevel':
      await handleRankLevel({
        isGroup,
        groupMembers,
        reply
      });

      return true;

    case 'menulevel':
    case 'levelmenu':
    case 'nivelmenu':
      await handleLevelMenu({
        sender,
        prefix,
        reply,
        premiumList,
        premiumFile
      });

      return true;

    case 'ranksemanal':
    case 'rankingsemanal':
    case 'topsemanal':
    case 'ranksemana':
    case 'weeklyrank':
      await handleWeeklyRank({
        sender,
        reply,
        premiumList,
        premiumFile
      });

      return true;

    case 'ideia':
    case 'sugerir':
    case 'sugestao':
      await handleIdea({
        q,
        sender,
        pushname,
        reply
      });

      return true;

    case 'caixadeideias':
    case 'ideias':
    case 'listasideias':
      await handleIdeas({
        reply
      });

      return true;

    case 'figurinhas':
    case 'stickerpack':
    case 'packfig':
      await handleStickers({
        q,
        prefix,
        isGroup,
        sender,
        from,
        nazu,
        info,
        reply
      });

      return true;

    default:
      return false;
  }
}
