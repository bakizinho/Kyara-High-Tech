import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname =
  path.dirname(
    fileURLToPath(import.meta.url)
  );

const DATA_DIR = path.join(
  __dirname,
  '..',
  '..',
  'database'
);

const FILE =
  path.join(
    DATA_DIR,
    'antistatus.json'
  );

/* ==========================================================
 * ARQUIVO
 * ========================================================== */

async function ensureFile() {

  await fs.mkdir(
    DATA_DIR,
    {
      recursive: true
    }
  );

  try {

    await fs.access(
      FILE
    );

  } catch {

    await fs.writeFile(
      FILE,
      '[]\n',
      'utf8'
    );
  }
}

async function readList() {

  await ensureFile();

  try {

    const data =
      JSON.parse(
        await fs.readFile(
          FILE,
          'utf8'
        )
      );

    return Array.isArray(data)

      ? [
          ...new Set(
            data
              .filter(Boolean)
              .map(String)
          )
        ]

      : [];

  } catch {

    return [];
  }
}

async function writeList(list) {

  const unique =
    [
      ...new Set(
        list
          .map(String)
      )
    ]
      .sort();

  await fs.writeFile(
    FILE,
    JSON.stringify(
      unique,
      null,
      2
    ) + '\n',
    'utf8'
  );
}

/* ==========================================================
 * API
 * ========================================================== */

export async function isEnabled(jid) {

  if (!jid) {
    return false;
  }

  const list =
    await readList();

  return list.includes(
    String(jid)
  );
}

export async function setEnabled(
  jid,
  enabled
) {

  if (!jid) {
    throw new Error(
      'JID do grupo não informado.'
    );
  }

  const group =
    String(jid);

  const list =
    await readList();

  const next =
    enabled

      ? [
          ...list,
          group
        ]

      : list.filter(
          item =>
            item !== group
        );

  await writeList(
    next
  );

  return Boolean(
    enabled
  );
}

export async function toggle(
  jid
) {

  const current =
    await isEnabled(jid);

  return setEnabled(
    jid,
    !current
  );
}

export async function list() {
  return readList();
}

/* ==========================================================
 * MESSAGE HELPERS
 * ========================================================== */

function unwrapMessage(
  message
) {

  if (
    !message ||
    typeof message !==
    'object'
  ) {

    return {};
  }

  const wrappers = [

    'ephemeralMessage',
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'documentWithCaptionMessage'

  ];

  let current =
    message;

  let changed = true;

  while (
    changed &&
    current &&
    typeof current ===
    'object'
  ) {

    changed = false;

    for (
      const key of wrappers
    ) {

      if (
        current[key]
          ?.message
      ) {

        current =
          current[key]
            .message;

        changed = true;

        break;
      }
    }
  }

  return current || {};
}

function getContext(
  content,
  type
) {

  return (

    content
      ?.[type]
      ?.contextInfo

    ||

    content
      ?.extendedTextMessage
      ?.contextInfo

    ||

    content?.contextInfo

    ||

    null
  );
}

function isDirectGroupStatus(
  info
) {

  const message =
    info?.message ||
    {};

  const content =
    unwrapMessage(
      message
    );

  const types =
    Object.keys(
      content
    );

  const serialized =
    JSON.stringify(
      message
    );

  return (

    types.includes(
      'groupStatusMessageV2'
    )

    ||

    types.includes(
      'groupStatusMessage'
    )

    ||

    Boolean(
      content
        .groupStatusMessageV2
    )

    ||

    Boolean(
      content
        .groupStatusMessage
    )

    ||

    serialized.includes(
      '"isGroupStatus":true'
    )

    ||

    serialized.includes(
      '"isGroupStatus": true'
    )
  );
}

function getMentionedStatus(
  info
) {

  const message =
    info?.message ||
    {};

  const content =
    unwrapMessage(
      message
    );

  const type =
    Object.keys(
      content
    )[0] || '';

  const context =
    getContext(
      content,
      type
    );

  const serialized =
    JSON.stringify(
      context || {}
    );

  if (
    !context
      ?.stanzaId
  ) {

    return null;
  }

  const quoted =
    context.quotedMessage;

  const isStatus =
    Boolean(

      quoted
        ?.groupStatusMessageV2

      ||

      quoted
        ?.groupStatusMessage

      ||

      context
        .groupStatusMentionMessage

      ||

      context
        .isGroupStatus

      ||

      serialized.includes(
        '"isGroupStatus":true'
      )

      ||

      serialized.includes(
        '"isGroupStatus": true'
      )
    );

  if (!isStatus) {
    return null;
  }

  return {
    context,
    stanzaId:
      context.stanzaId
  };
}

function getReactionTarget(
  info
) {

  const message =
    unwrapMessage(
      info?.message || {}
    );

  const reaction =
    message.reactionMessage;

  return reaction
    ?.key
    ?.id
      ? reaction.key
      : null;
}

function getBaseId(
  jid
) {

  return String(
    jid || ''
  )
    .split(':')[0]
    .split('@')[0];
}

function isBotMessage(
  info,
  sock,
  participant
) {

  const sender =
    getBaseId(
      participant
    );

  const botId =
    getBaseId(
      sock?.user?.id
    );

  const botLid =
    getBaseId(
      sock?.user?.lid
    );

  return (
    Boolean(
      info?.key
        ?.fromMe
    )

    ||

    Boolean(
      sender &&
      (
        sender ===
        botId ||

        sender ===
        botLid
      )
    )
  );
}

async function deleteMessage(
  sock,
  chatId,
  key
) {

  if (
    !sock ||
    !chatId ||
    !key?.id
  ) {

    return false;
  }

  try {

    await sock.sendMessage(
      chatId,
      {
        delete: key
      }
    );

    return true;

  } catch {

    return false;
  }
}

/* ==========================================================
 * DETECTOR
 * ========================================================== */

export async function handleMessage(
  sock,
  info
) {

  const chatId =
    info?.key?.remoteJid;

  if (
    !chatId ||
    !String(chatId)
      .endsWith('@g.us')
  ) {

    return false;
  }

  const active =
    await isEnabled(
      chatId
    );

  if (!active) {
    return false;
  }

  const author =
    info?.key?.participant ||
    info?.key?.remoteJid;

  let handled = false;

  /* ========================================================
   * STATUS DIRETO
   * ======================================================== */

  if (
    isDirectGroupStatus(
      info
    )
  ) {

    const isBot =
      isBotMessage(
        info,
        sock,
        author
      );

    const key = {

      remoteJid:
        chatId,

      fromMe:
        isBot,

      id:
        info.key.id

    };

    if (
      !isBot &&
      author
    ) {

      key.participant =
        author;
    }

    handled =
      await deleteMessage(
        sock,
        chatId,
        key
      ) || handled;
  }

  /* ========================================================
   * STATUS CITADO / MENCIONADO
   * ======================================================== */

  const mention =
    getMentionedStatus(
      info
    );

  if (mention) {

    const key = {

      remoteJid:
        chatId,

      fromMe:
        false,

      id:
        mention.stanzaId

    };

    if (
      mention.context
        .participant
    ) {

      key.participant =
        mention.context
          .participant;
    }

    handled =
      await deleteMessage(
        sock,
        chatId,
        key
      ) || handled;

    globalThis
      .escutaAtivaStatus =
      Array.isArray(
        globalThis
          .escutaAtivaStatus
      )

        ? globalThis
            .escutaAtivaStatus

        : [];

    if (
      !globalThis
        .escutaAtivaStatus
        .some(
          x =>
            x.id ===
            mention.stanzaId
        )
    ) {

      globalThis
        .escutaAtivaStatus
        .push({

          id:
            mention.stanzaId,

          autor:
            mention.context
              .participant,

          grupo:
            chatId

        });
    }

    if (
      globalThis
        .escutaAtivaStatus
        .length > 500
    ) {

      globalThis
        .escutaAtivaStatus
        .splice(
          0,
          globalThis
            .escutaAtivaStatus
            .length - 500
        );
    }
  }

  /* ========================================================
   * REAÇÕES
   * ======================================================== */

  const reactionKey =
    getReactionTarget(
      info
    );

  if (
    reactionKey?.id
  ) {

    globalThis
      .escutaAtivaStatus =
      Array.isArray(
        globalThis
          .escutaAtivaStatus
      )

        ? globalThis
            .escutaAtivaStatus

        : [];

    const tracked =
      globalThis
        .escutaAtivaStatus
        .some(
          x =>
            x.id ===
            reactionKey.id
        );

    if (tracked) {

      const key = {

        remoteJid:
          chatId,

        fromMe:
          false,

        id:
          info.key.id

      };

      if (author) {

        key.participant =
          author;
      }

      handled =
        await deleteMessage(
          sock,
          chatId,
          key
        ) || handled;
    }
  }

  if (handled) {

    try {

      console.log(
        `[ANTISTATUS] Mensagem removida em ${chatId}`
      );

    } catch {}
  }

  return handled;
}
