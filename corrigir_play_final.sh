#!/data/data/com.termux/files/usr/bin/bash
set -e

cd ~/storage/BKkyara- || exit 1

MEDIA="dados/src/features/kyaraMediaCommands.js"
YTDLP="dados/src/funcs/downloads/youtube.js"

echo "=========================================="
echo "       KYARA - PLAY FINAL"
echo "=========================================="
echo

[ -f "$MEDIA" ] || {
  echo "ERRO: $MEDIA não existe."
  exit 1
}

[ -f "$YTDLP" ] || {
  echo "ERRO: $YTDLP não existe."
  exit 1
}

echo "[1/6] Backup..."

cp "$MEDIA" "$MEDIA.bak-play-final2"
cp "$YTDLP" "$YTDLP.bak-play-final2"

echo "OK"

echo
echo "[2/6] Instalando Native Flow..."

python3 - <<'PY'
from pathlib import Path

p = Path("dados/src/features/kyaraMediaCommands.js")
s = p.read_text()

# ---------------------------------------------------------
# IMPORTS
# ---------------------------------------------------------

if "generateWAMessageFromContent" not in s:
    s = """import {
  generateWAMessageFromContent,
  prepareWAMessageMedia
} from 'baileys';

""" + s

# ---------------------------------------------------------
# SUBSTITUIR SENDCARD INTEIRA
# ---------------------------------------------------------

start = s.find("async function sendCard(")
end = s.find("async function handle(", start)

if start == -1:
    raise SystemExit("ERRO: async function sendCard não encontrada.")

if end == -1:
    raise SystemExit("ERRO: async function handle não encontrada.")

new_sendcard = r'''async function sendCard({
  nazu,
  from,
  info,
  prefix,
  data
}) {
  cleanupButtons();

  const url =
    cleanUrl(
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
      platform
    ).slice(0, 100);

  const duration =
    data?.timestamp ||
    'Não informado';

  const views =
    formatViews(
      data?.views
    );

  /*
   * Pinterest continua sendo imagem.
   */
  if (
    platform === 'Pinterest'
  ) {
    const image =
      await pinterestImage(
        url
      );

    if (!image.ok) {
      throw new Error(
        image.msg
      );
    }

    await nazu.sendMessage(
      from,
      {
        image: {
          url:
            image.remoteUrl
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
   * Tokens curtos para não colocar URLs enormes
   * dentro dos IDs dos botões.
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

  /*
   * Native Flow:
   * os dois quick_reply ficam no MESMO ARRAY,
   * permitindo que o WhatsApp os apresente lado a lado.
   */
  const buttons = [
    {
      name: 'quick_reply',

      buttonParamsJson:
        JSON.stringify({
          display_text:
            '🎵 Baixar Áudio',

          id:
            `${prefix}playaudio ${audioToken}`
        })
    },

    {
      name: 'quick_reply',

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
   * Miniatura opcional.
   */
  let header = {};

  if (data?.thumbnail) {
    try {
      header =
        await prepareWAMessageMedia(
          {
            image: {
              url:
                data.thumbnail
            }
          },
          {
            upload:
              nazu.waUploadToServer
          }
        );
    } catch {
      header = {};
    }
  }

  const interactive =
    {
      body: {
        text:
          caption
      },

      footer: {
        text:
          '🌸 Kyara • © Baki'
      },

      header: {
        title:
          title,

        subtitle:
          `${platform} • Qualidade máxima`,

        hasMediaAttachment:
          Boolean(
            data?.thumbnail &&
            header?.imageMessage
          ),

        ...(header?.imageMessage
          ? {
              imageMessage:
                header.imageMessage
            }
          }
          : {})
      },

      nativeFlowMessage: {
        buttons,

        messageParamsJson:
          JSON.stringify({
            from:
              'kyara-play',

            version:
              1
          })
      }
    };

  const msg =
    generateWAMessageFromContent(
      from,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage:
              interactive
          }
        }
      },
      {
        userJid:
          from,

        quoted:
          info
      }
    );

  const bizNode = {
    tag: 'biz',
    attrs: {},
    content: [
      {
        tag: 'interactive',
        attrs: {
          type:
            'native_flow'
        },
        content: [
          {
            tag: 'native_flow',
            attrs: {
              v:
                '1'
            }
          }
        ]
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

  return true;
}

'''

s = s[:start] + new_sendcard + s[end:]

# ---------------------------------------------------------
# CORRIGIR O BLOCO DE PLATAFORMA/URL DO HANDLE
# ---------------------------------------------------------

handle_start = s.find("async function handle(")

if handle_start == -1:
    raise SystemExit("ERRO: handle não encontrada.")

platform_start = s.find(
    "  const platform =",
    handle_start
)

if platform_start == -1:
    raise SystemExit(
        "ERRO: bloco const platform não encontrado."
    )

url_comment = s.find(
    "  /*\n   * URL:",
    platform_start
)

if url_comment == -1:
    raise SystemExit(
        "ERRO: bloco URL não encontrado."
    )

# Encontrar o início do bloco de texto.
text_comment = s.find(
    "  /*\n   * TEXTO:",
    url_comment
)

if text_comment == -1:
    raise SystemExit(
        "ERRO: bloco TEXTO não encontrado."
    )

new_platform_url = r'''  const platform =
    cmd === 'play'
      ? (
          isUrl(query)
            ? (
                platformOf(query) ||
                'Mídia'
              )
            : 'YouTube'
        )
      : (
          {
            tiktok: 'TikTok',
            instagram: 'Instagram',
            facebook: 'Facebook',
            kwai: 'Kwai',
            twitter: 'Twitter/X',
            x: 'Twitter/X',
            pinterest: 'Pinterest',
            pin: 'Pinterest'
          }[cmd]
        );

  /*
   * Somente comandos específicos de plataforma
   * precisam de plataforma conhecida.
   *
   * /play é universal.
   */
  if (
    !platform &&
    cmd !== 'play'
  ) {
    await reply(
      '❌ Plataforma não reconhecida.'
    );

    return true;
  }

  /*
   * URL:
   *
   * /play aceita qualquer URL que o yt-dlp
   * consiga processar.
   */
  if (
    isUrl(query)
  ) {
    if (
      cmd !== 'play' &&
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

    if (!meta?.ok) {
      await reply(
        `❌ ${
          meta?.msg ||
          'Não foi possível processar esta URL.'
        }`
      );

      return true;
    }

    return sendCard({
      nazu,
      from,
      info,
      prefix,

      data: {
        ...meta.data,

        sourceUrl:
          query,

        platform:
          cmd === 'play'
            ? (
                platformOf(query) ||
                'Mídia'
              )
            : platform
      }
    });
  }

'''

s = (
    s[:platform_start] +
    new_platform_url +
    s[text_comment:]
)

p.write_text(s)

print("OK: Native Flow e /play universal aplicados.")
PY

echo "OK"

echo
echo "[3/6] Acelerando yt-dlp..."

python3 - <<'PY'
from pathlib import Path

p = Path("dados/src/funcs/downloads/youtube.js")
s = p.read_text()

s = s.replace(
    "'--concurrent-fragments', '8'",
    "'--concurrent-fragments', '16'"
)

s = s.replace(
    '"--concurrent-fragments", "8"',
    '"--concurrent-fragments", "16"'
)

p.write_text(s)

print("OK")
PY

echo
echo "[4/6] Verificando sintaxe..."

node --check "$MEDIA"
node --check "$YTDLP"

echo "OK"

echo
echo "[5/6] Conferindo estrutura..."

SENDCARD=$(grep -c "async function sendCard(" "$MEDIA" || true)
NATIVE=$(grep -c "generateWAMessageFromContent" "$MEDIA" || true)
AUDIO=$(grep -c "🎵 Baixar Áudio" "$MEDIA" || true)
VIDEO=$(grep -c "🎬 Baixar Vídeo" "$MEDIA" || true)

echo "sendCard: $SENDCARD"
echo "Native Flow: $NATIVE"
echo "Botão áudio: $AUDIO"
echo "Botão vídeo: $VIDEO"

if [ "$SENDCARD" != "1" ]; then
  echo "ERRO: sendCard inválido."
  cp "$MEDIA.bak-play-final2" "$MEDIA"
  cp "$YTDLP.bak-play-final2" "$YTDLP"
  exit 1
fi

if [ "$NATIVE" = "0" ]; then
  echo "ERRO: Native Flow não encontrado."
  cp "$MEDIA.bak-play-final2" "$MEDIA"
  cp "$YTDLP.bak-play-final2" "$YTDLP"
  exit 1
fi

if [ "$AUDIO" = "0" ] || [ "$VIDEO" = "0" ]; then
  echo "ERRO: botões não encontrados."
  cp "$MEDIA.bak-play-final2" "$MEDIA"
  cp "$YTDLP.bak-play-final2" "$YTDLP"
  exit 1
fi

echo
echo "[6/6] Finalizado."

echo
echo "=========================================="
echo "       PLAY CORRIGIDO COM SUCESSO"
echo "=========================================="
echo
echo "✓ /play por pesquisa"
echo "✓ /play por URL"
echo "✓ URL universal via yt-dlp"
echo "✓ YouTube"
echo "✓ TikTok"
echo "✓ Instagram"
echo "✓ X/Twitter"
echo "✓ Outras plataformas suportadas"
echo "✓ Melhor qualidade disponível"
echo "✓ Download otimizado"
echo "✓ Native Flow"
echo "✓ Botões na mesma linha"
echo "✓ Um único card do /play"
echo
echo "Backup:"
echo "$MEDIA.bak-play-final2"
echo "$YTDLP.bak-play-final2"
echo
echo "Agora:"
echo
echo "npm start"
echo
