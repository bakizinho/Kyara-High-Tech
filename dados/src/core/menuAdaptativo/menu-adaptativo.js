import fs from 'node:fs';
import path from 'node:path';

import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
  jidNormalizedUser
} from 'baileys';

/*
 * ============================================================
 *                    KYARA MENU ADAPTATIVO
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
        '📢 O COMEÇO • Canal Oficial',

      url:
        'https://whatsapp.com/channel/0029VbCXBCy8fewmEhto8J0w'
    },

    {
      name:
        '🤖 BOT-KYARA • Canal Oficial',

      url:
        'https://whatsapp.com/channel/0029VbCs39EIyPtbsseKIP3r'
    }

  ],

  footer:
    '🌸 KYARA • Menu Interativo'
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
      '📥 Downloads',

    description:
      'Baixar músicas, vídeos e mídias',

    id:
      'menudown'
  },

  {
    title:
      '🎨 Logos',

    description:
      'Criar logos e artes',

    id:
      'menulogos'
  },

  {
    title:
      '✏️ Edits',

    description:
      'Efeitos e edições',

    id:
      'menuedits'
  },

  {
    title:
      '🖼️ Figurinhas',

    description:
      'Criar e converter figurinhas',

    id:
      'menufig'
  },

  {
    title:
      '🛠️ Ferramentas',

    description:
      'Utilidades da Kyara',

    id:
      'ferramentas'
  },

  {
    title:
      '✨ Alteradores',

    description:
      'Áudio, voz, textos e efeitos',

    id:
      'alteradores'
  },

  {
    title:
      '🎮 Brincadeiras',

    description:
      'Jogos e diversão',

    id:
      'menubn'
  },

  {
    title:
      '⚔️ RPG',

    description:
      'Sistema RPG da Kyara',

    id:
      'menurpg'
  },

  {
    title:
      '⚙️ Administração',

    description:
      'Ferramentas administrativas',

    id:
      'menuadm'
  },

  {
    title:
      '👥 Membros',

    description:
      'Ferramentas para membros',

    id:
      'menumemb'
  },

  {
    title:
      '⭐ VIP',

    description:
      'Sistema VIP',

    id:
      'menuvip'
  },

  {
    title:
      '👑 Dono',

    description:
      'Ferramentas exclusivas do dono',

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

function buildRows() {

  return MENUS_ORIGINAIS.map(
    item => ({

      title:
        item.title,

      description:
        item.description,

      id:
        item.id

    })
  );
}

/*
 * ============================================================
 * BOTÕES NATIVE FLOW
 * ============================================================
 */

function buildNativeFlowButtons() {

  const rows =
    buildRows();

  const first =
    rows.slice(
      0,
      6
    );

  const second =
    rows.slice(
      6,
      12
    );

  return [

    {
      name:
        'single_select',

      buttonParamsJson:
        JSON.stringify({

          title:
            '🌸 CATEGORIAS KYARA',

          sections: [

            {
              title:
                '📚 MENU PRINCIPAL',

              rows:
                first
            },

            {
              title:
                '🌸 MAIS CATEGORIAS',

              rows:
                second
            }

          ]

        })

    },

    {
      name:
        'cta_url',

      buttonParamsJson:
        JSON.stringify({

          display_text:
            CONFIG
              .channels[0]
              .name,

          url:
            CONFIG
              .channels[0]
              .url,

          merchant_url:
            CONFIG
              .channels[0]
              .url

        })

    },

    {
      name:
        'cta_url',

      buttonParamsJson:
        JSON.stringify({

          display_text:
            CONFIG
              .channels[1]
              .name,

          url:
            CONFIG
              .channels[1]
              .url,

          merchant_url:
            CONFIG
              .channels[1]
              .url

        })

    }

  ];
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
    mentionJid = null
  } = {}
) {

  const role =
    owner
      ? '👑 DONO'
      : admin
        ? '🛡️ ADM'
        : '🌸 MEMBRO';

  const mentionNumber =
    numberFromJid(
      mentionJid || ''
    );

  const user =
    safeText(
      pushName,
      'usuário'
    );

  const greetingTarget =
    mentionNumber
      ? '@' + mentionNumber
      : user;

  return [

    `${greeting()}, ${greetingTarget}! 🌸`,

    '',

    `╭━━〔 🌸 *BOT-KYARA* 〕━━╮`,

    `┃ 👤 Acesso: ${role}`,

    `┃ ⚡ Online: ${uptime()}`,

    `┃ 🧠 RAM: ${memory()}`,

    `┃ 📚 Categorias: ${MENUS_ORIGINAIS.length}`,

    `╰━━━━━━━━━━━━━━━━━━━━╯`,

    '',

    '👇 *Toque em CATEGORIAS KYARA para selecionar um menu.*',

    '📢 Os dois canais oficiais estão nos botões abaixo.'

  ].join('\n');
}
/*
 * ============================================================
 * MENÇÃO
 * ============================================================
 */

async function resolveMentionJid(
  sock,
  sender
) {

  if (!sender) {
    return null;
  }

  const normalized =
    jidNormalizedUser(
      sender
    );

  if (
    !normalized.endsWith(
      '@lid'
    )
  ) {

    return normalized;
  }

  try {

    const mapping =
      sock
        ?.signalRepository
        ?.lidMapping;

    if (
      mapping &&
      typeof mapping
        .getPNForLID ===
        'function'
    ) {

      const pn =
        await mapping.getPNForLID(
          normalized
        );

      if (pn) {

        return jidNormalizedUser(
          pn
        );
      }
    }

  } catch {}

  return normalized;
}

/*
 * ============================================================
 * PREPARAR MÍDIA
 *
 * A mídia é opcional.
 * Se a mídia der erro, os botões continuam.
 * ============================================================
 */

async function prepareMenuMedia(
  sock
) {

  const media =
    encontrarMidiaMenu();

  if (!media) {
    return null;
  }

  try {

    const buffer =
      fs.readFileSync(
        media.path
      );

    if (
      media.type ===
      'video'
    ) {

      const prepared =
        await prepareWAMessageMedia(
          {
            video:
              buffer
          },
          {
            upload:
              sock.waUploadToServer
          }
        );

      if (
        prepared
          ?.videoMessage
      ) {

        return {
          type:
            'video',

          message:
            prepared
              .videoMessage
        };
      }

    } else {

      const prepared =
        await prepareWAMessageMedia(
          {
            image:
              buffer
          },
          {
            upload:
              sock.waUploadToServer
          }
        );

      if (
        prepared
          ?.imageMessage
      ) {

        return {
          type:
            'image',

          message:
            prepared
              .imageMessage
        };
      }
    }

  } catch (error) {

    console.warn(
      '[MENU] Mídia ignorada:',
      error?.message ||
      error
    );
  }

  return null;
}

/*
 * ============================================================
 * ENVIO DO NATIVE FLOW
 * ============================================================
 */

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

  const mentionJid =
    await resolveMentionJid(
      sock,
      options.sender ||
      jid
    );

  const text =
    buildMenuText(
      pushName,
      {
        owner,
        admin,
        mentionJid
      }
    );

  const buttons =
    buildNativeFlowButtons();

  /*
   * Primeiro tentamos mídia.
   * Se não funcionar, o Native Flow continua sem mídia.
   */

  const preparedMedia =
    await prepareMenuMedia(
      sock
    );

  const header =
    preparedMedia
      ? {

          title:
            owner
              ? '👑 KYARA • OWNER MODE'
              : admin
                ? '⚙️ KYARA • ADMIN MODE'
                : '🌸 KYARA • USER MODE',

          hasMediaAttachment:
            true,

          ...(preparedMedia.type === 'video'
            ? {
                videoMessage:
                  preparedMedia.message
              }
            : {
                imageMessage:
                  preparedMedia.message
              })

        }
      : {

          title:
            owner
              ? '👑 KYARA • OWNER MODE'
              : admin
                ? '⚙️ KYARA • ADMIN MODE'
                : '🌸 KYARA • USER MODE',

          hasMediaAttachment:
            false

        };

  const interactive =
    proto.Message.InteractiveMessage.create({

      header:
        proto.Message.InteractiveMessage.Header.create(
          header
        ),

      body:
        proto.Message.InteractiveMessage.Body.create({
          text
        }),

      footer:
        proto.Message.InteractiveMessage.Footer.create({
          text:
            CONFIG.footer
        }),

      nativeFlowMessage:
        proto.Message.InteractiveMessage
          .NativeFlowMessage.create({

            buttons,

            /*
             * Compatibilidade maior:
             * string vazia em vez de objeto vazio.
             */
            messageParamsJson:
              '',

            messageVersion:
              1

          })

    });

  interactive.contextInfo = {

    mentionedJid:
      mentionJid
        ? [mentionJid]
        : []

  };

  const msg =
    generateWAMessageFromContent(
      normalizedJid,
      {

        viewOnceMessage: {

          message: {

            messageContextInfo: {

              deviceListMetadata:
                {},

              deviceListMetadataVersion:
                2

            },

            interactiveMessage:
              interactive

          }

        }

      },
      {

        quoted:
          options.info ||
          undefined,

        userJid:
          sock?.user?.id ||
          normalizedJid

      }
    );

  if (
    !msg?.message ||
    !msg?.key?.id
  ) {

    throw new Error(
      'Native Flow inválido'
    );
  }

  /*
   * Mantém o nó auxiliar já usado no projeto.
   */

  const bizNode = {

    tag:
      'biz',

    attrs: {

      actual_actors:
        '2',

      host_storage:
        '2',

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

        tag:
          'interactive',

        attrs: {

          type:
            'native_flow',

          v:
            '1'

        },

        content: [

          {

            tag:
              'native_flow',

            attrs: {

              v:
                '9',

              name:
                'mixed'

            }

          }

        ]

      },

      {

        tag:
          'quality_control',

        attrs: {

          source_type:
            'third_party'

        }

      }

    ]

  };

  console.log(
    '[MENU] Enviando Native Flow:',
    buttons.length,
    'botões'
  );




  await sock.relayMessage(
    normalizedJid,
    msg.message,
    {

      messageId:
        msg.key.id,

      additionalNodes:
        [bizNode]

    }
  );

  console.log(
    '[MENU] ✅ Native Flow enviado:',
    msg.key.id
  );

  return {

    ok:
      true,

    messageId:
      msg.key.id,

    buttons:
      buttons.length,

    media:
      preparedMedia?.type ||
      null

  };
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
