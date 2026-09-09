#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$(pwd)"
IDX="$ROOT/dados/src/features/kyaraMediaCommands.js"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP=".backup-play-universal-$STAMP"

if [ ! -f "$IDX" ]; then
  echo "❌ Arquivo não encontrado:"
  echo "$IDX"
  echo
  echo "Entre na pasta raiz da Kyara antes de executar."
  exit 1
fi

mkdir -p "$BACKUP"
cp -a "$IDX" "$BACKUP/kyaraMediaCommands.js"

echo "📦 Backup criado em: $BACKUP"
echo "🛠️ Aplicando PLAY universal..."

python3 - "$IDX" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
s = path.read_text(encoding="utf-8")

# ============================================================
# 1. IMPORTS DO NATIVE FLOW
# ============================================================

if "generateWAMessageFromContent" not in s:
    marker = "import * as youtube from '../funcs/downloads/youtube.js';"

    if marker not in s:
        raise SystemExit(
            "❌ Não encontrei o import do youtube.js."
        )

    s = s.replace(
        marker,
        """import {
  generateWAMessageFromContent,
  prepareWAMessageMedia
} from 'baileys';

""" + marker,
        1
    )

# ============================================================
# 2. SUBSTITUI SENDCARD
# ============================================================

start = s.find("async function sendCard({")
end = s.find("async function handle(options = {}) {", start)

if start == -1 or end == -1:
    raise SystemExit(
        "❌ Não consegui localizar sendCard/handle."
    )

new_send_card = r'''async function sendCard({
  nazu,
  from,
  info,
  prefix,
  data
}) {
  cleanupButtons();

  const url = cleanUrl(
    data?.sourceUrl ||
    data?.url
  );

  if (!url) {
    throw new Error(
      'URL da mídia não encontrada.'
    );
  }

  const platform =
    data?.platform ||
    platformOf(url) ||
    'Mídia';

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
      platform ||
      'Desconhecido'
    ).slice(0, 100);

  const duration =
    data?.timestamp ||
    'Não informado';

  const views =
    formatViews(
      data?.views
    );

  /*
   * Pinterest continua como imagem.
   */
  if (platform === 'Pinterest') {

    const image =
      await pinterestImage(url);

    if (!image.ok) {
      throw new Error(
        image.msg
      );
    }

    await nazu.sendMessage(
      from,
      {
        image: {
          url: image.remoteUrl
        },

        caption:
          `📌 *${title}*\n\n` +
          `🌸 *Kyara*`
      },
      {
        quoted: info
      }
    );

    return true;
  }

  /*
   * ============================================================
   * BOTÕES
   * ============================================================
   *
   * A URL real fica no cache.
   *
   * O WhatsApp recebe somente um token curto.
   *
   * Isso evita problemas com URLs enormes.
   */

  const audioToken =
    rememberButton(url);

  const videoToken =
    rememberButton(url);

  const caption =
    `🎵 *${title}*\n\n` +
    `👤 *Artista/Canal:* ${author}\n` +
    `⏱️ *Duração:* ${duration}\n` +
    `👀 *Visualizações:* ${views}\n` +
    `🌐 *Fonte:* ${platform}\n\n` +
    `🌸 *Kyara*\n` +
    `Selecione o formato desejado:`;

  const buttons = [

    {
      name:
        'quick_reply',

      buttonParamsJson:
        JSON.stringify({
          display_text:
            '🎵 Baixar Áudio',

          id:
            `${prefix}playaudio ${audioToken}`
        })
    },

    {
      name:
        'quick_reply',

      buttonParamsJson:
        JSON.stringify({
          display_text:
            '🎬 Baixar Vídeo',

          id:
            `${prefix}playvideo ${videoToken}`
        })
    }

  ];

  /*
   * ============================================================
   * THUMBNAIL
   * ============================================================
   */

  let imageMessage = null;

  const thumbnail =
    data?.thumbnail ||
    (
      data?.videoId
        ? `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`
        : ''
    );

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
                image:
                  buffer
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

  /*
   * ============================================================
   * NATIVE FLOW
   * ============================================================
   */

  const interactiveMessage = {

    body: {
      text:
        caption
    },

    footer: {
      text:
        '🌸 Kyara • © Baki'
    },

    nativeFlowMessage: {

      buttons,

      messageParamsJson:
        '{}',

      messageVersion:
        1
    }
  };

  if (imageMessage) {

    interactiveMessage.header = {

      hasMediaAttachment:
        true,

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

              deviceListMetadata:
                {},

              deviceListMetadataVersion:
                2
            },

            interactiveMessage
          }
        }
      },
      {
        quoted:
          info,

        userJid:
          nazu?.user?.id
      }
    );

  /*
   * ============================================================
   * NÓ NECESSÁRIO PARA O NATIVE FLOW
   * ============================================================
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

  const additionalNodes =
    from.endsWith('@g.us')

      ? [
          bizNode
        ]

      : [

          {
            tag:
              'bot',

            attrs: {

              biz_bot:
                '1'
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

  console.log(
    `[PLAY KYARA] ✅ Card enviada: ${title}`
  );

  return true;
}

'''

s = (
    s[:start] +
    new_send_card +
    s[end:]
)

# ============================================================
# 3. /PLAY COM URL DEVE SER UNIVERSAL
# ============================================================

old = r'''  if (
    isUrl(query)
  ) {
    if (
      platformOf(query) !==
      platform
    ) {
      await reply(
        `❌ Esta URL não pertence ao ${platform}.`
      );

      return true;
    }

    const meta =
      await getInfo(query);
'''

new = r'''  if (
    isUrl(query)
  ) {

    /*
     * /play URL é universal.
     *
     * Não exigimos que platformOf()
     * conheça previamente o domínio.
     *
     * O yt-dlp tenta descobrir o extractor.
     */

    const meta =
      await getInfo(query);
'''

if old not in s:
    raise SystemExit(
        "❌ Bloco de URL do /play não encontrado."
    )

s = s.replace(
    old,
    new,
    1
)

# ============================================================
# 4. PLATAFORMA DA URL
# ============================================================

needle = r'''        platform
      }
    });
'''

replacement = r'''        platform:
          platformOf(query) ||
          meta.data?.platform ||
          meta.data?.extractor ||
          'Mídia'
      }
    });
'''

pos =
s.find(
    "const meta =\n      await getInfo(query);"
)

if pos == -1:
    raise SystemExit(
        "❌ Não encontrei o bloco getInfo do /play."
    )

pos2 =
s.find(
    needle,
    pos
)

if pos2 == -1:
    raise SystemExit(
        "❌ Não encontrei a plataforma do card do /play."
    )

s = (
    s[:pos2] +
    s[pos2:].replace(
        needle,
        replacement,
        1
    )
)

path.write_text(
    s,
    encoding="utf-8"
)

print(
    "✅ kyaraMediaCommands.js atualizado."
)
PY

node --check dados/src/features/kyaraMediaCommands.js

echo
echo "============================================"
echo "✅ PLAY KYARA ATUALIZADO"
echo "============================================"
echo
echo "Agora o /play aceita:"
echo
echo "  /play nome da música"
echo "  /play URL"
echo
echo "E o resultado terá:"
echo
echo "  🎵 Baixar Áudio"
echo "  🎬 Baixar Vídeo"
echo
echo "Reinicie a Kyara:"
echo
echo "  npm start"
echo
