/*
 * =========================================================
 * KYARA ANTI-PAYMENT — PROTEÇÃO CENTRAL
 * =========================================================
 *
 * UM ÚNICO SISTEMA PARA:
 *
 * 💳 Payment
 * 👻 Mensagens invisíveis
 * 🫥 Unicode invisível / zero-width / bidi
 * 🧬 Payload suspeito/ofuscado
 * ⚡ Flood
 * 🔁 Repetição
 * 💬 Quoted/reply de mensagens suspeitas
 * 🧹 Rastreamento temporário das mensagens conhecidas
 *
 * FLUXO DE PUNIÇÃO:
 *
 * 1. FECHA O GRUPO
 * 2. APAGA AS MENSAGENS CONHECIDAS DO ATAQUE
 * 3. REMOVE O INFRATOR
 * 4. RESPONDE À MENSAGEM ORIGINAL
 * 5. ABRE O GRUPO
 *
 * IMPORTANTE:
 * A Kyara só consegue apagar mensagens que recebeu
 * e para as quais possui uma messageKey válida.
 *
 * NÃO existe acesso ao tráfego Wi-Fi, satélite,
 * operadora ou mensagens que o WhatsApp nunca entregou.
 * =========================================================
 */

import {
  isActiveGroupRestriction,
} from "../utils/database.js";

import {
  jidNormalizedUser,
} from "baileys";

const handledMessages = new Map();
const attackStates = new Map();
const incidentByMessage = new Map();

/*
 * Evita que várias mensagens do mesmo ataque
 * iniciem várias punições simultaneamente.
 */
const pendingIncidents = new Map();

const HANDLED_TTL = 15000;
const ATTACK_TTL = 120000;
const INCIDENT_TTL = 10 * 60 * 1000;

/*
 * Pequena janela para juntar as mensagens
 * do mesmo ataque antes da punição.
 */
const BATCH_SETTLE_MS = 1500;

const FLOOD_WINDOW = 10000;
const FLOOD_LIMIT = 4;

const MAX_TRACKED_MESSAGES = 50;

const PAYMENT_KEYS = new Set([
  "paymentMessage",
  "requestPaymentMessage",
  "requestPayment",
  "sendPaymentMessage",
  "sendPayment",
  "payment",
  "paymentInviteMessage",
  "paymentInvite",
  "declinePaymentRequest",
  "cancelPaymentRequest",
]);

const PAYMENT_BUTTON_NAMES = new Set([
  "payment_info",
  "review_and_pay",
]);

const PAYMENT_FIELD_NAMES = new Set([
  "payment_settings",
  "payment_configuration",
  "payment_status",
  "payment_timestamp",
  "reference_id",
  "total_amount",
  "payment_method",
]);

const WRAPPER_KEYS = new Set([
  "ephemeralMessage",
  "viewOnceMessage",
  "viewOnceMessageV2",
  "viewOnceMessageV2Extension",
  "documentWithCaptionMessage",
  "editedMessage",
  "deviceSentMessage",
  "keepInChatMessage",
  "futureproofMessage",
]);

const INVISIBLE_RE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\u206A-\u206F\uFEFF]/g;

const ZERO_WIDTH_RE =
  /[\u200B-\u200D\uFEFF]/g;

/* =========================================================
 * UTILITÁRIOS
 * =========================================================
 */

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object"
  );
}

function sameId(a, b) {
  return Boolean(
    a &&
    b &&
    String(a) === String(b)
  );
}

function unique(values) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map(String)
    ),
  ];
}

/* =========================================================
 * MESSAGE KEY
 * =========================================================
 */

function normalizeMessageKey(
  info,
  fallbackParticipant = "",
) {
  const key =
    info?.key ||
    info ||
    {};

  if (
    !key?.remoteJid ||
    !key?.id
  ) {
    return null;
  }

  const participant =
    key.participant ||
    key.participantAlt ||
    key.participantPn ||
    fallbackParticipant ||
    undefined;

  return {
    remoteJid:
      key.remoteJid,

    fromMe:
      Boolean(key.fromMe),

    id:
      key.id,

    ...(participant && !key.fromMe
      ? { participant }
      : {}),
  };
}

/* =========================================================
 * UNWRAP
 * =========================================================
 */

function unwrapMessage(value) {
  let current =
    value?.message ||
    value?.msg ||
    value;

  const visited =
    new Set();

  for (
    let depth = 0;
    depth < 12;
    depth += 1
  ) {
    if (
      !isObject(current) ||
      visited.has(current)
    ) {
      break;
    }

    visited.add(current);

    let changed =
      false;

    for (
      const key of WRAPPER_KEYS
    ) {
      const candidate =
        current?.[key];

      if (
        candidate?.message
      ) {
        current =
          candidate.message;

        changed =
          true;

        break;
      }
    }

    if (!changed) {
      break;
    }
  }

  return current || {};
}

/* =========================================================
 * TEXTO
 * =========================================================
 */

function collectText(
  value,
  output = [],
  depth = 0,
  seen = new Set(),
) {
  if (
    depth > 10 ||
    value == null
  ) {
    return output;
  }

  if (
    typeof value === "string"
  ) {
    if (
      value.length <= 100000
    ) {
      output.push(value);
    }

    return output;
  }

  if (
    !isObject(value) ||
    seen.has(value)
  ) {
    return output;
  }

  if (
    typeof Buffer !== "undefined" &&
    Buffer.isBuffer(value)
  ) {
    return output;
  }

  seen.add(value);

  for (
    const [key, child]
    of Object.entries(value)
  ) {
    if (
      key === "conversation" ||
      key === "text" ||
      key === "caption" ||
      key === "contentText" ||
      key === "title" ||
      key === "description" ||
      key === "note"
    ) {
      collectText(
        child,
        output,
        depth + 1,
        seen,
      );

      continue;
    }

    if (
      key === "message" ||
      key === "ephemeralMessage" ||
      key === "viewOnceMessage" ||
      key === "viewOnceMessageV2" ||
      key === "extendedTextMessage" ||
      key === "imageMessage" ||
      key === "videoMessage" ||
      key === "documentMessage"
    ) {
      collectText(
        child,
        output,
        depth + 1,
        seen,
      );
    }
  }

  return output;
}

/* =========================================================
 * DETECÇÃO INVISÍVEL
 * =========================================================
 */

function analyzeInvisible(
  infoOrMessage,
) {
  const root =
    infoOrMessage?.message
      ? infoOrMessage.message
      : infoOrMessage;

  const texts =
    collectText(root);

  let hasInvisible =
    false;

  let invisibleOnly =
    false;

  let hasVisibleText =
    false;

  let invisibleCount =
    0;

  let zeroWidthCount =
    0;

  let directionCount =
    0;

  for (
    const text of texts
  ) {
    const invisible =
      text.match(
        INVISIBLE_RE,
      ) || [];

    const zeroWidth =
      text.match(
        ZERO_WIDTH_RE,
      ) || [];

    const direction =
      text.match(
        /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,
      ) || [];

    invisibleCount +=
      invisible.length;

    zeroWidthCount +=
      zeroWidth.length;

    directionCount +=
      direction.length;

    if (
      invisible.length
    ) {
      hasInvisible =
        true;
    }

    const visible =
      text
        .replace(
          INVISIBLE_RE,
          "",
        )
        .replace(
          /\s+/g,
          "",
        );

    if (
      visible.length
    ) {
      hasVisibleText =
        true;
    }
  }

  const compact =
    texts
      .join("")
      .replace(
        /\s/g,
        "",
      );

  invisibleOnly =
    compact.length > 0 &&
    compact
      .replace(
        INVISIBLE_RE,
        "",
      )
      .length === 0;

  return {
    texts,

    hasInvisible,

    invisibleOnly,

    structurallyEmpty:
      texts.length === 0 ||
      !hasVisibleText,

    invisibleCount,

    zeroWidthCount,

    directionCount,
  };
}

/* =========================================================
 * PAYMENT
 * =========================================================
 */

function findPaymentStructure(
  value,
  depth = 0,
  visited = new Set(),
) {
  if (
    !isObject(value) ||
    depth > 14 ||
    visited.has(value)
  ) {
    return null;
  }

  if (
    typeof Buffer !== "undefined" &&
    Buffer.isBuffer(value)
  ) {
    return null;
  }

  visited.add(value);

  for (
    const [key, child]
    of Object.entries(value)
  ) {
    if (
      PAYMENT_KEYS.has(key)
    ) {
      return {
        key,
        value: child,
      };
    }

    if (
      key === "name" &&
      typeof child === "string" &&
      PAYMENT_BUTTON_NAMES.has(child)
    ) {
      return {
        key:
          "interactivePaymentButton",
        value:
          child,
      };
    }

    if (
      PAYMENT_FIELD_NAMES.has(key) &&
      child !== undefined &&
      child !== null
    ) {
      return {
        key,
        value: child,
      };
    }

    if (
      key === "buttonParamsJson" &&
      typeof child === "string"
    ) {
      const lower =
        child.toLowerCase();

      if (
        lower.includes(
          "payment_settings",
        ) ||
        lower.includes(
          "payment_configuration",
        ) ||
        lower.includes(
          "review_and_pay",
        ) ||
        lower.includes(
          "total_amount",
        ) ||
        lower.includes(
          "payment_status",
        )
      ) {
        return {
          key:
            "interactivePaymentPayload",
          value:
            child,
        };
      }

      try {
        const parsed =
          JSON.parse(child);

        const nested =
          findPaymentStructure(
            parsed,
            depth + 1,
            visited,
          );

        if (nested) {
          return nested;
        }
      } catch {}
    }

    if (
      isObject(child)
    ) {
      const nested =
        findPaymentStructure(
          child,
          depth + 1,
          visited,
        );

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

/* =========================================================
 * AUTOR
 * =========================================================
 */

function getAuthorCandidates(
  info,
) {
  const key =
    info?.key || {};

  return unique([
    key.participant,
    key.participantAlt,
    key.participantPn,
    key.senderPn,

    info?.participant,
    info?.participantAlt,
    info?.participantPn,
  ]);
}

function isProtectedAuthor(
  candidates,
  botLid = "",
  ownerLid = "",
) {
  const protectedIds =
    unique([
      botLid,
      ownerLid,
    ]);

  return candidates.some(
    (author) =>
      protectedIds.some(
        (protectedId) =>
          sameId(
            author,
            protectedId,
          ),
      ),
  );
}

function findGroupParticipant(
  participants,
  candidates,
) {
  if (
    !Array.isArray(
      participants,
    )
  ) {
    return null;
  }

  return (
    participants.find(
      (participant) => {
        const ids =
          unique([
            participant?.id,
            participant?.lid,
            participant?.jid,
            participant?.phoneNumber,
          ]);

        return candidates.some(
          (candidate) =>
            ids.some(
              (id) =>
                sameId(
                  candidate,
                  id,
                ),
            ),
        );
      },
    ) ||
    null
  );
}

function participantIsAdmin(
  participant,
  metadata,
) {
  if (!participant) {
    return false;
  }

  if (
    participant.admin ===
      "admin" ||
    participant.admin ===
      "superadmin"
  ) {
    return true;
  }

  return unique([
    metadata?.owner,
    metadata?.ownerPn,
    metadata?.ownerLid,
  ]).some(
    (owner) =>
      sameId(
        owner,
        participant.id,
      ) ||
      sameId(
        owner,
        participant.lid,
      ) ||
      sameId(
        owner,
        participant.jid,
      ),
  );
}

/* =========================================================
 * DUPLICAÇÃO
 * =========================================================
 */

function wasHandled(
  messageId,
) {
  if (!messageId) {
    return false;
  }

  const now =
    Date.now();

  const previous =
    handledMessages.get(
      messageId,
    );

  if (
    previous &&
    now - previous <
      HANDLED_TTL
  ) {
    return true;
  }

  handledMessages.set(
    messageId,
    now,
  );

  for (
    const [
      id,
      timestamp,
    ]
    of handledMessages
  ) {
    if (
      now - timestamp >
      HANDLED_TTL
    ) {
      handledMessages.delete(
        id,
      );
    }
  }

  return false;
}

/* =========================================================
 * CONTEXT / QUOTED
 * =========================================================
 */

function getContextInfo(
  info,
) {
  const root =
    unwrapMessage(
      info,
    );

  const contexts =
    [];

  const visited =
    new Set();

  function walk(
    value,
    depth = 0,
  ) {
    if (
      !isObject(value) ||
      depth > 14 ||
      visited.has(value)
    ) {
      return;
    }

    visited.add(
      value,
    );

    const context =
      value?.contextInfo;

    if (
      context &&
      isObject(context)
    ) {
      contexts.push(
        context,
      );
    }

    for (
      const child of
        Object.values(value)
    ) {
      walk(
        child,
        depth + 1,
      );
    }
  }

  walk(
    root,
  );

  if (
    !contexts.length
  ) {
    return {};
  }

  /*
   * Reply normal:
   * queremos o contexto que contém a referência
   * da mensagem citada e, quando possível,
   * o próprio conteúdo citado.
   */
  const withQuoted =
    contexts.find(
      (context) =>
        Boolean(
          context?.stanzaId,
        ) &&
        Boolean(
          context?.quotedMessage,
        ),
    );

  if (
    withQuoted
  ) {
    return withQuoted;
  }

  /*
   * Alguns formatos podem trazer stanzaId
   * sem quotedMessage.
   */
  const withStanza =
    contexts.find(
      (context) =>
        Boolean(
          context?.stanzaId,
        ),
    );

  if (
    withStanza
  ) {
    return withStanza;
  }

  return (
    contexts[0] ||
    {}
  );
}

function getQuotedContext(
  info,
) {
  const context =
    getContextInfo(
      info,
    );

  const quotedMessage =
    context?.quotedMessage;

  const stanzaId =
    context?.stanzaId ||
    context?.quotedStanzaId ||
    context?.quotedMessageId ||
    "";

  const participant =
    context?.participant ||
    context?.participantAlt ||
    context?.participantPn ||
    quotedMessage
      ?.contextInfo
      ?.participant ||
    quotedMessage
      ?.contextInfo
      ?.participantAlt ||
    quotedMessage
      ?.contextInfo
      ?.participantPn ||
    quotedMessage
      ?.key
      ?.participant ||
    quotedMessage
      ?.key
      ?.participantAlt ||
    quotedMessage
      ?.key
      ?.participantPn ||
    quotedMessage
      ?.participant ||
    "";

  if (
    !stanzaId &&
    !quotedMessage
  ) {
    return null;
  }

  return {
    context,

    quotedMessage,

    stanzaId,

    participant:
      participant || "",
  };
}

function getQuotedMessageKey(
  remoteJid,
  quoted,
) {
  if (
    !quoted?.stanzaId ||
    !remoteJid
  ) {
    return null;
  }

  return {
    remoteJid,

    fromMe:
      false,

    id:
      quoted.stanzaId,

    ...(quoted.participant
      ? {
          participant:
            quoted.participant,
        }
      : {}),
  };
}

/* =========================================================
 * ESTADO DO ATAQUE
 * =========================================================
 */

function makeAttackKey(
  remoteJid,
  author,
) {
  return `${remoteJid}|${author}`;
}

function getFloodState(
  remoteJid,
  author,
) {
  const key =
    makeAttackKey(
      remoteJid,
      author,
    );

  const now =
    Date.now();

  let state =
    attackStates.get(
      key,
    );

  if (
    !state ||
    now - state.updatedAt >
      ATTACK_TTL
  ) {
    state = {
      remoteJid,
      author,

      updatedAt:
        now,

      messages:
        new Map(),

      timestamps:
        [],

      fingerprints:
        new Map(),
    };

    attackStates.set(
      key,
      state,
    );
  }

  state.updatedAt =
    now;

  state.timestamps =
    state.timestamps.filter(
      (time) =>
        now - time <=
        FLOOD_WINDOW,
    );

  state.timestamps.push(
    now,
  );

  return state;
}

function registerFingerprint(
  state,
  text,
) {
  const fingerprint =
    String(text || "")
      .replace(
        INVISIBLE_RE,
        "",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim()
      .toLowerCase()
      .slice(
        0,
        500,
      );

  if (!fingerprint) {
    return 0;
  }

  const now =
    Date.now();

  const list =
    (
      state.fingerprints.get(
        fingerprint,
      ) ||
      []
    ).filter(
      (time) =>
        now - time <=
        FLOOD_WINDOW,
    );

  list.push(
    now,
  );

  state.fingerprints.set(
    fingerprint,
    list,
  );

  return list.length;
}

function rememberAttackMessage(
  remoteJid,
  author,
  info,
  reason,
) {
  const key =
    makeAttackKey(
      remoteJid,
      author,
    );

  const now =
    Date.now();

  let state =
    attackStates.get(
      key,
    );

  if (
    !state ||
    now - state.updatedAt >
      ATTACK_TTL
  ) {
    state = {
      remoteJid,
      author,

      updatedAt:
        now,

      messages:
        new Map(),

      timestamps:
        [],

      fingerprints:
        new Map(),
    };

    attackStates.set(
      key,
      state,
    );
  }

  const messageKey =
    normalizeMessageKey(
      info,
      author,
    );

  if (
    messageKey?.id
  ) {
    state.messages.set(
      messageKey.id,
      {
        key:
          messageKey,

        info,

        reason,

        timestamp:
          now,
      },
    );
  }

  state.updatedAt =
    now;

  while (
    state.messages.size >
    MAX_TRACKED_MESSAGES
  ) {
    const first =
      state.messages.keys()
        .next()
        .value;

    if (!first) {
      break;
    }

    state.messages.delete(
      first,
    );
  }

  return state;
}

function getKnownAttackMessages(
  remoteJid,
  author,
) {
  const key =
    makeAttackKey(
      remoteJid,
      author,
    );

  const state =
    attackStates.get(
      key,
    );

  if (!state) {
    return [];
  }

  const now =
    Date.now();

  if (
    now - state.updatedAt >
    ATTACK_TTL
  ) {
    attackStates.delete(
      key,
    );

    return [];
  }

  return [
    ...state.messages.values(),
  ];
}

/* =========================================================
 * INCIDENTES
 * =========================================================
 */

function rememberIncident({
  remoteJid,
  author,
  info,
  payment = false,
}) {
  const messageId =
    info?.key?.id;

  if (!messageId) {
    return;
  }

  incidentByMessage.set(
    messageId,
    {
      remoteJid,

      author,

      messageId,

      original:
        info,

      payment,

      createdAt:
        Date.now(),
    },
  );

  const now =
    Date.now();

  for (
    const [
      id,
      incident,
    ]
    of incidentByMessage
  ) {
    if (
      now -
        incident.createdAt >
      INCIDENT_TTL
    ) {
      incidentByMessage.delete(
        id,
      );
    }
  }
}

function findIncidentForQuoted(
  remoteJid,
  quoted,
) {
  if (
    !remoteJid ||
    !quoted
  ) {
    return null;
  }

  const stanzaId =
    quoted.stanzaId ||
    "";

  /*
   * CAMINHO 1:
   * incidente já registrado em memória.
   */
  if (
    stanzaId
  ) {
    const byId =
      incidentByMessage.get(
        stanzaId,
      );

    if (
      byId &&
      byId.remoteJid ===
        remoteJid
    ) {
      return byId;
    }

    for (
      const incident of
        incidentByMessage.values()
    ) {
      if (
        incident?.remoteJid ===
          remoteJid &&
        sameId(
          incident?.messageId,
          stanzaId,
        )
      ) {
        return incident;
      }
    }
  }

  /*
   * CAMINHO 2:
   *
   * Não depende de incidentByMessage.
   *
   * Se a própria resposta contém a mensagem citada,
   * analisamos o payload dela diretamente.
   */
  const quotedMessage =
    quoted.quotedMessage;

  if (
    !quotedMessage
  ) {
    return null;
  }

  const invisible =
    analyzeInvisible(
      quotedMessage,
    );

  const payment =
    findPaymentStructure(
      quotedMessage,
    );

  const isGhost =
    Boolean(
      invisible?.hasInvisible ||
      invisible?.invisibleOnly,
    );

  if (
    !isGhost &&
    !payment
  ) {
    return null;
  }

  const author =
    quoted.participant ||
    quoted.context
      ?.participant ||
    quoted.context
      ?.participantAlt ||
    quoted.context
      ?.participantPn ||
    quotedMessage
      ?.contextInfo
      ?.participant ||
    quotedMessage
      ?.contextInfo
      ?.participantAlt ||
    quotedMessage
      ?.contextInfo
      ?.participantPn ||
    quotedMessage
      ?.key
      ?.participant ||
    quotedMessage
      ?.key
      ?.participantAlt ||
    quotedMessage
      ?.key
      ?.participantPn ||
    quotedMessage
      ?.participant ||
    "";

  if (
    !author
  ) {
    console.warn(
      "[ANTI-PAYMENT] Reply citou conteúdo Ghost, mas o autor A não foi encontrado.",
      JSON.stringify({
        remoteJid,
        stanzaId,
      }),
    );

    return null;
  }

  const originalKey =
    getQuotedMessageKey(
      remoteJid,
      {
        ...quoted,
        participant:
          author,
      },
    );

  if (
    !originalKey
  ) {
    console.warn(
      "[ANTI-PAYMENT] Ghost citado encontrado, mas não foi possível montar a chave de A.",
      JSON.stringify({
        remoteJid,
        stanzaId,
        author,
      }),
    );

    return null;
  }

  console.log(
    "[ANTI-PAYMENT] GHOST RECUPERADO PELO REPLY:",
    JSON.stringify({
      remoteJid,
      stanzaId,
      author,
      hasInvisible:
        Boolean(
          invisible?.hasInvisible,
        ),
      invisibleOnly:
        Boolean(
          invisible?.invisibleOnly,
        ),
    }),
  );

  return {
    remoteJid,

    author,

    messageId:
      stanzaId,

    original: {
      key:
        originalKey,

      message:
        quotedMessage,
    },

    payment:
      Boolean(payment),

    createdAt:
      Date.now(),
  };
}

/* =========================================================
 * GRUPO
 * =========================================================
 */

async function getMetadata(
  socket,
  remoteJid,
) {
  return socket.groupMetadata(
    remoteJid,
  );
}

async function closeGroup(
  socket,
  remoteJid,
) {
  try {
    await socket.groupSettingUpdate(
      remoteJid,
      "announcement",
    );

    return true;
  } catch (error) {
    console.error(
      "[ANTI-PAYMENT] Falha ao fechar grupo:",
      error?.message ||
        error,
    );

    return false;
  }
}

async function openGroup(
  socket,
  remoteJid,
) {
  try {
    await socket.groupSettingUpdate(
      remoteJid,
      "not_announcement",
    );

    return true;
  } catch (error) {
    console.error(
      "[ANTI-PAYMENT] Falha ao abrir grupo:",
      error?.message ||
        error,
    );

    return false;
  }
}

/* =========================================================
 * APAGAR
 * =========================================================
 */

/*
 * Mensagens de terceiros podem trazer participant como LID.
 *
 * O comando `apagar` atual já resolve isso usando:
 *
 *   jidNormalizedUser(...)
 *   socket.signalRepository.lidMapping.getPNForLID(...)
 *
 * O Anti-Payment passa a utilizar o mesmo caminho.
 */
async function resolveParticipantForDelete(
  socket,
  participant,
) {
  if (!participant) {
    return participant;
  }

  try {
    const normalized =
      jidNormalizedUser(
        participant,
      );

    if (
      !normalized.endsWith(
        "@lid",
      )
    ) {
      return normalized;
    }

    const mapping =
      socket
        ?.signalRepository
        ?.lidMapping;

    if (
      mapping &&
      typeof mapping.getPNForLID ===
        "function"
    ) {
      const pn =
        await mapping.getPNForLID(
          normalized,
        );

      if (pn) {
        return jidNormalizedUser(
          pn,
        );
      }
    }

    return normalized;
  } catch {
    return participant;
  }
}

async function deleteKey(
  socket,
  key,
  label = "mensagem",
) {
  if (
    !key?.remoteJid ||
    !key?.id
  ) {
    return false;
  }

  const fromMe =
    Boolean(
      key.fromMe,
    );

  const participantOriginal =
    !fromMe
      ? key.participant ||
        key.participantAlt ||
        key.participantPn ||
        undefined
      : undefined;

  const participantResolved =
    !fromMe &&
    participantOriginal
      ? await resolveParticipantForDelete(
          socket,
          participantOriginal,
        )
      : undefined;

  /*
   * Ordem:
   *
   * 1. JID real resolvido
   * 2. participant original
   * 3. participantAlt
   * 4. participantPn
   *
   * Só tenta o próximo identificador se o anterior
   * realmente lançar erro.
   */
  const participantCandidates =
    fromMe
      ? [
          undefined,
        ]
      : [
          ...new Set(
            [
              participantResolved,
              participantOriginal,
              key.participantAlt,
              key.participantPn,
            ].filter(
              Boolean,
            ),
          ),
        ];

  if (
    !participantCandidates.length
  ) {
    participantCandidates.push(
      undefined,
    );
  }

  let lastError =
    null;

  for (
    const participant of
      participantCandidates
  ) {
    const deleteMessage = {
      remoteJid:
        key.remoteJid,

      id:
        key.id,

      fromMe,

      ...(
        !fromMe &&
        participant
          ? {
              participant,
            }
          : {}
      ),
    };

    try {
      await socket.sendMessage(
        key.remoteJid,
        {
          delete:
            deleteMessage,
        },
      );

      console.log(
        `[ANTI-PAYMENT] ${label} apagada:`,
        JSON.stringify({
          remoteJid:
            key.remoteJid,

          messageId:
            key.id,

          fromMe,

          participantOriginal:
            participantOriginal ||
            null,

          participantUsed:
            participant ||
            null,
        }),
      );

      return true;
    } catch (error) {
      lastError =
        error;

      console.warn(
        `[ANTI-PAYMENT] Falha ao apagar ${label}; tentando outro identificador de participante:`,
        JSON.stringify({
          messageId:
            key.id,

          participantTried:
            participant ||
            null,

          error:
            error?.message ||
            String(error),
        }),
      );
    }
  }

  console.error(
    `[ANTI-PAYMENT] Falha ao apagar ${label}:`,
    lastError?.message ||
      lastError,
  );

  return false;
}

async function deleteKnownMessages(
  socket,
  entries,
) {
  let deleted =
    0;

  let failed =
    0;

  const seen =
    new Set();

  for (
    const entry of
      entries || []
  ) {
    const key =
      entry?.key;

    const identity =
      `${key?.remoteJid || ""}|${key?.id || ""}`;

    if (
      !key?.id ||
      seen.has(identity)
    ) {
      continue;
    }

    seen.add(
      identity,
    );

    if (
      await deleteKey(
        socket,
        key,
        "mensagem do ataque",
      )
    ) {
      deleted +=
        1;
    } else {
      failed +=
        1;
    }
  }

  return {
    deleted,

    failed,

    total:
      deleted +
      failed,
  };
}

/* =========================================================
 * REMOVER
 * =========================================================
 */

async function removeAuthor(
  socket,
  remoteJid,
  participant,
) {
  if (!participant) {
    return false;
  }

  try {
    await socket.groupParticipantsUpdate(
      remoteJid,
      [
        participant,
      ],
      "remove",
    );

    return true;
  } catch (error) {
    console.error(
      "[ANTI-PAYMENT] Falha ao remover autor:",
      error?.message ||
        error,
    );

    return false;
  }
}

/* =========================================================
 * VERIFICA AUTOR
 * =========================================================
 */

async function isStillInGroup(
  socket,
  remoteJid,
  author,
) {
  try {
    const metadata =
      await getMetadata(
        socket,
        remoteJid,
      );

    const participant =
      findGroupParticipant(
        metadata?.participants ||
          [],
        [
          author,
        ],
      );

    return {
      metadata,

      participant,

      inGroup:
        Boolean(
          participant,
        ),

      admin:
        participantIsAdmin(
          participant,
          metadata,
        ),
    };
  } catch (error) {
    console.error(
      "[ANTI-PAYMENT] Falha ao verificar autor:",
      error?.message ||
        error,
    );

    return {
      metadata:
        null,

      participant:
        null,

      inGroup:
        false,

      admin:
        false,
    };
  }
}

/* =========================================================
 * RESPOSTA
 * =========================================================
 */

async function replyToOriginal(
  socket,
  remoteJid,
  original,
  text,
) {
  try {
    const quoted =
      original?.key?.id
        ? original
        : null;

    await socket.sendMessage(
      remoteJid,
      {
        text,
      },
      quoted
        ? {
            quoted,
          }
        : undefined,
    );

    return true;
  } catch (error) {
    console.error(
      "[ANTI-PAYMENT] Falha ao responder:",
      error?.message ||
        error,
    );

    return false;
  }
}

/* =========================================================
 * PUNIÇÃO EM LOTE
 * =========================================================
 */

async function settleAttackBatch({
  remoteJid,
  author,
  socket,
  original,
  botLid,
  ownerLid,
  enforce,
  reason,
}) {
  const attackKey =
    makeAttackKey(
      remoteJid,
      author,
    );

  const existing =
    pendingIncidents.get(
      attackKey,
    );

  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      /*
       * Dá tempo para mensagens seguintes
       * do mesmo ataque serem registradas.
       */
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            BATCH_SETTLE_MS,
          ),
      );

      const knownMessages =
        getKnownAttackMessages(
          remoteJid,
          author,
        );

      const result =
        reason === "mensagem invisível" ||
        reason === "ghost" ||
        reason === "spam oculto"
          ? await punishInvisibleIncident({
              socket,
              remoteJid,
              author,
              original,
              knownMessages,
              botLid,
              ownerLid,
              enforce,
              reason,
            })
          : await punishIncident({
              socket,
              remoteJid,
              author,
              original,
              knownMessages,
              botLid,
              ownerLid,
              enforce,
              reason,
            });

      return result;
    } finally {
      pendingIncidents.delete(
        attackKey,
      );

      attackStates.delete(
        attackKey,
      );
    }
  })();

  pendingIncidents.set(
    attackKey,
    promise,
  );

  return promise;
}

/* =========================================================
 * PUNIÇÃO CENTRAL
 * =========================================================
 */

/*
 * =========================================================
 * PUNIÇÃO EXCLUSIVA DE GHOST / MENSAGEM INVISÍVEL
 * =========================================================
 *
 * Regra:
 *
 * A = autor da mensagem invisível.
 * B = pessoa que eventualmente responde/cita A.
 *
 * B nunca é alvo desta função.
 *
 * Somente a mensagem original de A é apagada.
 */

async function punishInvisibleIncident({
  socket,
  remoteJid,
  author,
  original,
  knownMessages = [],
  botLid,
  ownerLid,
  enforce = true,
  reason =
    "mensagem invisível",
}) {
  const result = {
    handled:
      false,

    closed:
      false,

    deleted:
      false,

    deletedCount:
      0,

    deleteFailedCount:
      0,

    removed:
      false,

    replied:
      false,

    opened:
      false,

    skipped:
      false,
  };

  if (
    !original?.key?.id
  ) {
    console.warn(
      "[ANTI-PAYMENT] Ghost sem mensagem original de A.",
      JSON.stringify({
        remoteJid,
        author,
      }),
    );

    return result;
  }

  if (
    !enforce
  ) {
    console.log(
      "[ANTI-PAYMENT DRY-RUN] Ghost confirmado:",
      JSON.stringify({
        remoteJid,
        author,
        originalMessageId:
          original?.key?.id,
        reason,
      }),
    );

    result.handled =
      true;

    return result;
  }

  if (
    isProtectedAuthor(
      [
        author,
      ],
      botLid,
      ownerLid,
    )
  ) {
    result.skipped =
      true;

    return result;
  }

  /*
   * SOMENTE A:
   *
   * original = Ghost que disparou
   * knownMessages = outros Ghosts registrados
   * do mesmo remoteJid + author
   *
   * A resposta de B não está nesse estado.
   */
  const entries =
    [];

  const seen =
    new Set();

  function addEntry(
    entry,
  ) {
    const key =
      entry?.key;

    if (
      !key?.remoteJid ||
      !key?.id
    ) {
      return;
    }

    if (
      key.remoteJid !==
        remoteJid
    ) {
      return;
    }

    if (
      key.fromMe ===
        true
    ) {
      return;
    }

    const id =
      String(
        key.id,
      );

    if (
      seen.has(id)
    ) {
      return;
    }

    seen.add(
      id,
    );

    entries.push({
      key,
    });
  }

  /*
   * Primeiro o Ghost que foi citado/detectado.
   */
  addEntry({
    key:
      normalizeMessageKey(
        original,
        author,
      ),
  });

  /*
   * Depois os outros Ghosts de A.
   *
   * knownMessages já pertence ao estado
   * remoteJid + author.
   */
  for (
    const entry of
      knownMessages || []
  ) {
    addEntry(
      entry,
    );
  }

  console.log(
    "[ANTI-PAYMENT] GHOST: mensagens de A preparadas para DELETE:",
    JSON.stringify({
      remoteJid,
      author,
      count:
        entries.length,
      ids:
        entries.map(
          (entry) =>
            entry.key.id,
        ),
    }),
  );

  const status =
    await isStillInGroup(
      socket,
      remoteJid,
      author,
    );

  /*
   * A já saiu:
   * ainda apagamos o que estiver disponível,
   * sem tentar remover novamente.
   */
  if (
    !status.inGroup ||
    status.admin
  ) {
    const deletion =
      await deleteKnownMessages(
        socket,
        entries,
      );

    result.deletedCount =
      deletion.deleted;

    result.deleteFailedCount =
      deletion.failed;

    result.deleted =
      deletion.deleted >
      0;

    result.handled =
      true;

    console.log(
      "[ANTI-PAYMENT] GHOST DE A JÁ FORA:",
      JSON.stringify({
        remoteJid,
        author,
        deletion,
      }),
    );

    return result;
  }

  /*
   * A ainda está no grupo:
   *
   * FECHAR
   * ↓
   * APAGAR A
   * ↓
   * REMOVER A
   * ↓
   * RESPONDER A
   * ↓
   * ABRIR
   */
  result.closed =
    await closeGroup(
      socket,
      remoteJid,
    );

  try {
    const deletion =
      await deleteKnownMessages(
        socket,
        entries,
      );

    result.deletedCount =
      deletion.deleted;

    result.deleteFailedCount =
      deletion.failed;

    result.deleted =
      deletion.deleted >
      0;

    result.removed =
      await removeAuthor(
        socket,
        remoteJid,
        author,
      );

    result.replied =
      await replyToOriginal(
        socket,
        remoteJid,
        original,
        `🛡️ Mensagem invisível removida.\n\nO autor foi removido por ${reason}.`,
      );

    result.handled =
      true;
  } finally {
    result.opened =
      await openGroup(
        socket,
        remoteJid,
      );
  }

  console.log(
    "[ANTI-PAYMENT] GHOST TRATADO:",
    JSON.stringify({
      remoteJid,
      author,
      originalMessageId:
        original?.key?.id ||
        null,
      deletedCount:
        result.deletedCount,
      deleteFailedCount:
        result.deleteFailedCount,
      result,
      action:
        "somente-mensagens-de-A",
    }),
  );

  return result;
}

async function punishIncident({
  socket,
  remoteJid,
  author,
  original,
  knownMessages,
  botLid,
  ownerLid,
  enforce = true,
  reason =
    "conteúdo suspeito",
}) {
  const result = {
    handled:
      false,

    closed:
      false,

    deleted:
      0,

    deleteFailed:
      0,

    removed:
      false,

    replied:
      false,

    opened:
      false,

    skipped:
      false,
  };

  if (!enforce) {
    console.log(
      "[ANTI-PAYMENT DRY-RUN]",
      JSON.stringify({
        remoteJid,
        author,
        reason,
        knownMessages:
          knownMessages?.length ||
          0,
      }),
    );

    result.handled =
      true;

    return result;
  }

  if (
    isProtectedAuthor(
      [
        author,
      ],
      botLid,
      ownerLid,
    )
  ) {
    result.skipped =
      true;

    return result;
  }

  const status =
    await isStillInGroup(
      socket,
      remoteJid,
      author,
    );

  if (
    !status.inGroup ||
    status.admin
  ) {
    result.skipped =
      true;

    return result;
  }

  /*
   * 1. FECHAR
   */
  result.closed =
    await closeGroup(
      socket,
      remoteJid,
    );

  try {
    /*
     * 2. APAGAR
     */
    const entries =
      [];

    const seen =
      new Set();

    for (
      const entry of
        knownMessages ||
        []
    ) {
      const id =
        entry?.key?.id;

      if (
        !id ||
        seen.has(id)
      ) {
        continue;
      }

      seen.add(id);

      entries.push(
        entry,
      );
    }

    if (
      original?.key?.id &&
      !seen.has(
        original.key.id,
      )
    ) {
      entries.push({
        key:
          normalizeMessageKey(
            original,
            author,
          ),

        info:
          original,
      });
    }

    const deletion =
      await deleteKnownMessages(
        socket,
        entries,
      );

    result.deleted =
      deletion.deleted;

    result.deleteFailed =
      deletion.failed;

    /*
     * 3. REMOVER
     */
    result.removed =
      await removeAuthor(
        socket,
        remoteJid,
        author,
      );

    /*
     * 4. RESPONDER
     */
    result.replied =
      await replyToOriginal(
        socket,
        remoteJid,
        original,
        `🛡️ Mensagem suspeita removida.\n\nO autor foi removido por ${reason}.`,
      );

    result.handled =
      true;
  } finally {
    /*
     * 5. ABRIR
     */
    result.opened =
      await openGroup(
        socket,
        remoteJid,
      );
  }

  console.log(
    "[ANTI-PAYMENT] AÇÕES CONCLUÍDAS",
    JSON.stringify({
      remoteJid,
      author,
      reason,
      result,
    }),
  );

  return result;
}

/* =========================================================
 * QUOTED DE INCIDENTE
 * =========================================================
 */

async function handleQuotedIncident({
  socket,
  remoteJid,
  webMessage,
  botLid,
  ownerLid,
  enforce,
}) {
  const quoted =
    getQuotedContext(
      webMessage,
    );

  if (!quoted) {
    return false;
  }

  const incident =
    findIncidentForQuoted(
      remoteJid,
      quoted,
    );

  if (!incident) {
    return false;
  }

  /*
   * Quoted só pode acionar o fluxo Ghost se a mensagem
   * originalmente registrada realmente for invisível.
   *
   * Uma resposta normal de B não deve virar incidente.
   */
  const originalInvisible =
    incident?.original
      ? analyzeInvisible(
          incident.original,
        )
      : null;

  const originalIsGhost =
    Boolean(
      originalInvisible?.hasInvisible,
    );

  if (!originalIsGhost) {
    return false;
  }

  const author =
    incident.author ||
    quoted.participant;

  if (!author) {
    return false;
  }

  if (
    isProtectedAuthor(
      [
        author,
      ],
      botLid,
      ownerLid,
    )
  ) {
    return false;
  }

  const status =
    await isStillInGroup(
      socket,
      remoteJid,
      author,
    );

  /*
   * AUTOR A JÁ FOI REMOVIDO:
   *
   * A mensagem atual é de B.
   * B somente ajudou a localizar o incidente original.
   *
   * Portanto:
   * - NÃO apagar a mensagem de B;
   * - NÃO remover B;
   * - NÃO tentar remover A novamente;
   * - apagar somente a mensagem original registrada de A.
   */
  if (
    !status.inGroup ||
    status.admin
  ) {
    if (!enforce) {
      console.log(
        "[ANTI-PAYMENT DRY-RUN] Resposta de terceiro localizou incidente de autor já removido.",
        JSON.stringify({
          remoteJid,
          responseId:
            webMessage?.key?.id,
          originalAuthor:
            author,
          action:
            "preservar-B-e-nao-remover-A",
          originalAvailable:
            Boolean(
              incident?.original,
            ),
        }),
      );

      return true;
    }

    let originalDeleted =
      false;

    /*
     * APAGA SOMENTE A MENSAGEM ORIGINAL DE A.
     *
     * Nunca usamos webMessage aqui porque ele
     * pertence a B.
     */
    if (incident?.original) {
      originalDeleted =
        await deleteKey(
          socket,
          normalizeMessageKey(
            incident.original,
            author,
          ),
          "mensagem invisível original do incidente",
        );
    }

    console.log(
      "[ANTI-PAYMENT] Resposta de terceiro localizou incidente de autor já removido:",
      JSON.stringify({
        remoteJid,
        responseId:
          webMessage?.key?.id,
        originalAuthor:
          author,
        originalMessageId:
          incident?.original?.key?.id ||
          null,
        originalDeleted,
        action:
          "preservar-B-e-apagar-somente-A",
      }),
    );

    return true;
  }

  /*
   * AINDA NO GRUPO:
   *
   * somente A é alvo.
   * B nunca entra neste fluxo como mensagem a apagar.
   */
  await punishInvisibleIncident({
    socket,
    remoteJid,
    author,
    original:
      incident.original,

  knownMessages:
    getKnownAttackMessages(
      remoteJid,
      author,
    ),
    botLid,
    ownerLid,
    enforce,
    reason:
      "mensagem invisível",
  });

  return true;
}

/* =========================================================
 * RISCO
 * =========================================================
 */

function calculateRisk({
  payment,
  invisible,
  floodCount,
  repeatedCount,
}) {
  let score =
    0;

  const reasons =
    [];

  if (payment) {
    score +=
      10;

    reasons.push(
      "payment",
    );
  }

  if (
    invisible.hasInvisible
  ) {
    score +=
      2;

    reasons.push(
      "caracteres invisíveis",
    );
  }

  if (
    invisible.invisibleOnly
  ) {
    score +=
      3;

    reasons.push(
      "mensagem visualmente invisível",
    );
  }

  if (
    invisible.zeroWidthCount >
      0 &&
    !invisible.invisibleOnly
  ) {
    score +=
      2;

    reasons.push(
      "texto ofuscado por zero-width",
    );
  }

  if (
    invisible.directionCount >
      0
  ) {
    score +=
      2;

    reasons.push(
      "controle bidirecional",
    );
  }

  if (
    floodCount >=
    FLOOD_LIMIT
  ) {
    score +=
      3;

    reasons.push(
      `flood (${floodCount} mensagens/${FLOOD_WINDOW}ms)`,
    );
  }

  if (
    repeatedCount >=
    2
  ) {
    score +=
      2;

    reasons.push(
      `repetição (${repeatedCount})`,
    );
  }

  return {
    score,
    reasons,
  };
}

/* =========================================================
 * HANDLER PRINCIPAL
 * =========================================================
 */

export async function handleAntiPayment({
  socket,
  remoteJid,
  webMessage,
  isGroup,
  botLid = "",
  ownerLid = "",
  enforce = true,
}) {


  if (
    !socket ||
    !remoteJid ||
    !webMessage
  ) {
    return false;
  }

  if (
    !isGroup ||
    !remoteJid.endsWith(
      "@g.us",
    )
  ) {
    return false;
  }

  if (
    !isActiveGroupRestriction(
      remoteJid,
      "anti-payment",
    )
  ) {
    return false;
  }

  if (
    webMessage?.key?.fromMe
  ) {
    return false;
  }

  const messageId =
    webMessage?.key?.id;

  if (
    messageId &&
    wasHandled(
      messageId,
    )
  ) {
    return true;
  }

  /*
   * PRIMEIRO:
   * verificar se é resposta a incidente conhecido.
   */
  const quotedHandled =
    await handleQuotedIncident({
      socket,
      remoteJid,
      webMessage,
      botLid,
      ownerLid,
      enforce,
    });

  if (
    quotedHandled
  ) {
    return true;
  }

  const payment =
    findPaymentStructure(
      webMessage,
    );

  const invisible =
    analyzeInvisible(
      webMessage,
    );

  /*
   * Sem payment e sem sinal
   * invisível, não interferir.
   */
  if (
    !payment &&
    !invisible.hasInvisible
  ) {
    return false;
  }

  const authorCandidates =
    getAuthorCandidates(
      webMessage,
    );

  if (
    !authorCandidates.length
  ) {
    console.warn(
      "[ANTI-PAYMENT] Conteúdo suspeito detectado, mas autor não identificado.",
    );

    return false;
  }

  if (
    isProtectedAuthor(
      authorCandidates,
      botLid,
      ownerLid,
    )
  ) {
    return false;
  }

  let metadata;

  try {
    metadata =
      await getMetadata(
        socket,
        remoteJid,
      );
  } catch (error) {
    console.error(
      "[ANTI-PAYMENT] Não foi possível obter metadata:",
      error?.message ||
        error,
    );

    return false;
  }

  const participant =
    findGroupParticipant(
      metadata?.participants ||
        [],
      authorCandidates,
    );

  if (!participant) {
    console.warn(
      "[ANTI-PAYMENT] Autor não localizado no grupo.",
    );

    return false;
  }

  /*
   * Nunca punir administrador.
   */
  if (
    participantIsAdmin(
      participant,
      metadata,
    )
  ) {
    return false;
  }

  const author =
    participant.id ||
    participant.lid ||
    participant.jid ||
    authorCandidates[0];

  /*
   * Cria/atualiza o estado do autor ANTES da
   * decisão final. Assim as mensagens seguintes
   * podem ser acumuladas na mesma janela.
   */
  const state =
    getFloodState(
      remoteJid,
      author,
    );

  const stateAfter =
    rememberAttackMessage(
      remoteJid,
      author,
      webMessage,
      payment
        ? "payment"
        : invisible.hasInvisible
          ? "invisible"
          : "observed",
    );

  const texts =
    invisible.texts ||
    [];

  const repeatedCount =
    Math.max(
      ...texts.map(
        (text) =>
          registerFingerprint(
            state,
            text,
          ),
      ),
      0,
    );

  const floodCount =
    state.timestamps.length;

  const risk =
    calculateRisk({
      payment:
        Boolean(payment),

      invisible,

      floodCount,

      repeatedCount,
    });

  /*
   * PAYMENT:
   * confirmado diretamente.
   *
   * INVISÍVEL:
   * mensagem somente invisível
   * pode confirmar imediatamente,
   * mas a punição aguarda a pequena
   * janela BATCH_SETTLE_MS.
   */
  const invisibleConfirmed =
    Boolean(invisible?.hasInvisible);

  const confirmed =
    Boolean(payment) ||
    invisibleConfirmed ||
    risk.score >= 5;

  if (invisibleConfirmed) {
    console.log(
      "[ANTI-PAYMENT] MENSAGEM INVISÍVEL CONFIRMADA",
      JSON.stringify({
        remoteJid,
        messageId,
        author,
        zeroWidthCount:
          invisible?.zeroWidthCount || 0,
        directionCount:
          invisible?.directionCount || 0,
        invisibleOnly:
          Boolean(invisible?.invisibleOnly),
        structurallyEmpty:
          Boolean(invisible?.structurallyEmpty),
      }),
    );
  }

  /*
   * Toda mensagem suspeita entra no
   * registro de incidente para permitir
   * quoted/reply posteriormente.
   */
  if (
    payment ||
    invisible.hasInvisible
  ) {
    rememberIncident({
      remoteJid,

      author,

      info:
        webMessage,

      payment:
        Boolean(payment),
    });
  }

  if (!confirmed) {
    return false;
  }

  console.log(
    "[ANTI-PAYMENT] INCIDENTE DETECTADO",
    JSON.stringify({
      remoteJid,

      messageId,

      author,

      type:
        payment
          ? "payment"
          : "invisible-spam",

      score:
        risk.score,

      reasons:
        risk.reasons,

      knownMessages:
        stateAfter.messages.size,

      batchWindow:
        BATCH_SETTLE_MS,
    }),
  );

  /*
   * Não pune imediatamente.
   *
   * Primeiro coleta mensagens adicionais
   * do mesmo autor durante a janela.
   */
  await settleAttackBatch({
    remoteJid,

    author,

    socket,

    original:
      webMessage,

    botLid,

    ownerLid,

    enforce,

    reason:
      payment
        ? "envio de pagamento suspeito"
        : "mensagem invisível",
  });

  return true;
}

/*
 * Mantido para compatibilidade
 * com possíveis imports antigos.
 */
export async function defendAgainstPayment({
  socket,
  remoteJid,
  userLid,
  messageKey,
}) {
  if (
    !socket ||
    !remoteJid ||
    !userLid ||
    !messageKey?.id
  ) {
    return false;
  }

  return false;
}

export function getPaymentMessage(
  webMessage,
) {
  return findPaymentStructure(
    webMessage,
  );
}

export function getAntiPaymentDebugState() {
  return {
    handledMessages:
      handledMessages.size,

    attackStates:
      attackStates.size,

    incidents:
      incidentByMessage.size,
  };
}
