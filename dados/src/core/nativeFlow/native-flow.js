import fs from 'fs'
import os from 'os'

import {
  proto,
  generateWAMessageFromContent,
  isJidGroup,
  prepareWAMessageMedia
} from 'baileys'

import {
  normalizeOutgoingContent
} from '../runtime/kyara-runtime.js'

const PRIVACY_MODE_TS_OFFSET =
  77980457

const stringify =
  value =>
    JSON.stringify(
      value
    )

function privacyTimestamp() {
  return String(
    Math.floor(
      Date.now() / 1000
    ) -
    PRIVACY_MODE_TS_OFFSET
  )
}

function bizNode() {
  return {
    tag: 'biz',

    attrs: {
      actual_actors: '2',
      host_storage: '2',
      privacy_mode_ts:
        privacyTimestamp()
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
  }
}

function additionalNodes(
  jid
) {
  const node =
    bizNode()

  if (
    isJidGroup(
      jid
    )
  ) {
    return [
      node
    ]
  }

  return [
    {
      tag: 'bot',

      attrs: {
        biz_bot: '1'
      }
    },

    node
  ]
}

function nativeButton(
  name,
  params
) {
  return proto
    .Message
    .InteractiveMessage
    .NativeFlowMessage
    .NativeFlowButton
    .create({
      name,
      buttonParamsJson:
        stringify(
          params
        )
    })
}

export function singleSelect(
  displayText,
  sections
) {
  return {
    name:
      'single_select',

    buttonParamsJson:
      stringify({
        title:
          displayText,

        sections
      })
  }
}

export function quickReply(
  displayText,
  id
) {
  return {
    name:
      'quick_reply',

    buttonParamsJson:
      stringify({
        display_text:
          displayText,

        id
      })
  }
}

export function copyBtn(
  displayText,
  copyCode
) {
  return {
    name:
      'cta_copy',

    buttonParamsJson:
      stringify({
        display_text:
          displayText,

        copy_code:
          copyCode
      })
  }
}

export function row(
  title,
  description,
  id
) {
  return {
    title,
    description,
    id
  }
}

export function getMetrics() {
  const memory =
    process.memoryUsage()

  return {
    ram:
      Math.round(
        memory.rss /
        1024 /
        1024
      ),

    heap:
      Math.round(
        memory.heapUsed /
        1024 /
        1024
      ),

    cores:
      os.cpus().length ||
      1,

    up:
      Math.floor(
        process.uptime()
      ),

    load:
      'ONLINE',

    model:
      'Native Flow'
  }
}

export async function sendFlow(
  Kyara,
  jid,
  {
    text = '',
    footer = '',
    title = '',
    buttons = [],
    media = null,
    mentionedJid = [],
    viewOnce = false
  } = {}
) {
  if (!Kyara || typeof Kyara.sendMessage !== 'function') {
    throw new Error('Socket Kyara inválido ou sem sendMessage');
  }

  const nativeFlow = (Array.isArray(buttons) ? buttons : [])
    .map((button) => {
      let params = {};

      try {
        params =
          typeof button?.buttonParamsJson === 'string'
            ? JSON.parse(button.buttonParamsJson)
            : {};
      } catch {
        params = {};
      }

      const name = String(button?.name || '');
      const displayText = String(
        params.display_text ||
        params.title ||
        button?.text ||
        'Selecionar'
      ).trim();

      if (name === 'quick_reply') {
        const id = String(params.id || '').trim();
        return id ? { text: displayText, id } : null;
      }

      if (name === 'cta_url') {
        const url = String(params.url || '').trim();
        return url
          ? { text: displayText, url }
          : null;
      }

      if (name === 'cta_copy') {
        const copy = String(params.copy_code || '').trim();
        return copy
          ? { text: displayText, copy }
          : null;
      }

      if (name === 'cta_call') {
        const call = String(params.phone_number || '').trim();
        return call
          ? { text: displayText, call }
          : null;
      }

      if (
        name === 'single_select' &&
        Array.isArray(params.sections) &&
        params.sections.length
      ) {
        return {
          text: displayText,
          sections: params.sections
        };
      }

      return null;
    })
    .filter(Boolean);

  const messageText = [title, text]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join('\n\n');

  const content = {
    text: messageText || '🌸 BKkyara',
    footer: String(footer || ''),
    nativeFlow,
    interactiveAsTemplate: false,
    viewOnce: false
  };

  if (Array.isArray(mentionedJid) && mentionedJid.length) {
    content.mentions = mentionedJid;
  }

  if (media && typeof media === 'object') {
    for (const key of ['image', 'video', 'document']) {
      if (media[key]) content[key] = media[key];
    }
  }

  const result = await Kyara.sendMessage(jid, content);

  console.log(
    `[KYARA FLOW] Native Flow enviado via sendMessage: ${jid} | botões: ${nativeFlow.length}`
  );

  return result;
}
