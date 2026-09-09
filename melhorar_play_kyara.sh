#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$(pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP=".backup-play-kyara-${STAMP}"

echo "============================================"
echo "🎵 KYARA — MELHORIA DO PLAY"
echo "============================================"
echo

mkdir -p "$BACKUP"

cp -a dados/src/index.js "$BACKUP/index.js"
cp -a dados/src/funcs/downloads/youtube.js "$BACKUP/youtube.js"

echo "📦 Backup criado: $BACKUP"

python3 - "$ROOT" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])

# ============================================================
# INDEX.JS
# ============================================================

idx = root / "dados/src/index.js"
s = idx.read_text(encoding="utf-8")

# ------------------------------------------------------------
# Helper Native Flow do PLAY
# ------------------------------------------------------------

if "async function enviarResultadoPlayKyara" not in s:

    marker = "// ==================== BOTÕES CLICÁVEIS NAZUNA ===================="

    if marker not in s:
        raise SystemExit(
            "❌ Não encontrei o ponto seguro para inserir o PLAY."
        )

    helper = r'''// ================================================================
// 🎵 PLAY KYARA — RESULTADO COM CAPA + BOTÕES
// ================================================================

async function enviarResultadoPlayKyara({
  nazu,
  from,
  info,
  video,
  prefix = '/'
}) {
  const data = video?.data;

  if (
    !data?.url ||
    !data?.videoId
  ) {
    throw new Error(
      'Resultado do YouTube incompleto.'
    );
  }

  const title =
    String(
      data.title ||
      'Música'
    ).slice(0, 180);

  const author =
    String(
      data.author?.name ||
      'YouTube'
    ).slice(0, 100);

  const duration =
    String(
      data.timestamp ||
      'Desconhecida'
    );

  const views =
    typeof data.views === 'number'
      ? data.views.toLocaleString('pt-BR')
      : String(data.views || '0');

  const thumbnail =
    data.thumbnail ||
    `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`;

  /*
   * Botões:
   *
   * /playaudio VIDEO_ID
   * /playvideo VIDEO_ID
   *
   * Assim não colocamos a URL inteira dentro do botão.
   */

  const buttons = [
    {
      name: 'quick_reply',

      buttonParamsJson:
        JSON.stringify({
          display_text:
            '🎵 Baixar Áudio',

          id:
            `${prefix}playaudio ${data.videoId}`
        })
    },

    {
      name: 'quick_reply',

      buttonParamsJson:
        JSON.stringify({
          display_text:
            '🎬 Baixar Vídeo',

          id:
            `${prefix}playvideo ${data.videoId}`
        })
    }
  ];

  const caption =
    `🎵 *${title}*\n\n` +
    `👤 *Artista/Canal:* ${author}\n` +
    `⏱️ *Duração:* ${duration}\n` +
    `👀 *Visualizações:* ${views}\n\n` +
    `🌸 *Kyara*\n` +
    `Selecione o formato desejado:`;

  /*
   * Prepara a thumbnail para o Native Flow.
   */

  const imageMessage =
    await prepareWAMessageMedia(
      {
        image: {
          url: thumbnail
        }
      },
      {
        upload:
          nazu.waUploadToServer
      }
    );

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

            interactiveMessage: {

              header: {
                hasMediaAttachment: true,

                imageMessage:
                  imageMessage.imageMessage
              },

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

                messageVersion:
                  1
              }
            }
          }
        }
      },
      {
        quoted: info,

        userJid:
          nazu?.user?.id
      }
    );

  /*
   * Nó necessário para o Native Flow.
   */

  const bizNode = {
    tag: 'biz',

    attrs: {
      actual_actors: '2',
      host_storage: '2',

      privacy_mode_ts:
        String(
          Math.floor(
            Date.now() / 1000
          ) - 77980457
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

  console.log(
    `[PLAY KYARA] ✅ Resultado enviado: ${title}`
  );
}


// ================================================================
// FIM — PLAY KYARA
// ================================================================

'''

    s = s.replace(
        marker,
        helper + marker,
        1
    )

    print("✅ Interface do PLAY criada.")

else:
    print("ℹ️ Interface do PLAY já existia.")

# ------------------------------------------------------------
# Substitui SOMENTE o case play/ytmp3
# ------------------------------------------------------------

start = s.find(
    "      case 'play':\n      case 'ytmp3':"
)

end = s.find(
    "      case 'playvid':",
    start
)

if start == -1:
    raise SystemExit(
        "❌ Não encontrei o bloco atual do case play."
    )

if end == -1:
    raise SystemExit(
        "❌ Não encontrei o início do playvid."
    )

new_play = r'''      // ============================================================
      // 🎵 PLAY KYARA
      // ============================================================

      case 'play':
      case 'ytmp3':

        try {

          if (!q?.trim()) {

            return reply(
              `╭━━━〔 🎵 *PLAY KYARA* 〕━━━╮\n` +
              `│\n` +
              `│ 🔎 Pesquise uma música:\n` +
              `│ ${prefix}play <nome da música>\n` +
              `│\n` +
              `│ 📝 Exemplo:\n` +
              `│ ${prefix}play Believer\n` +
              `│\n` +
              `╰━━━━━━━━━━━━━━━━━━━━╯`
            );

          }

          const query =
            q.trim();

          /*
           * Pesquisa somente.
           *
           * O download NÃO acontece aqui.
           * Isso deixa o PLAY muito mais rápido.
           */

          console.log(
            `[PLAY KYARA] 🔎 Pesquisando: ${query}`
          );

          const result =
            await youtube.search(
              query
            );

          if (
            !result?.ok ||
            !result.data?.videoId
          ) {

            return reply(
              result?.msg ||
              '❌ Nenhuma música encontrada.'
            );

          }

          /*
           * Limite de 30 minutos.
           */

          if (
            result.data.seconds &&
            result.data.seconds > 1800
          ) {

            return reply(
              `⚠️ *Música muito longa*\n\n` +
              `⏱️ Duração: *${result.data.timestamp}*\n` +
              `📌 Limite: *30 minutos*`
            );

          }

          /*
           * Mostra capa + informações + botões.
           */

          await enviarResultadoPlayKyara({
            nazu,
            from,
            info,
            video: result,
            prefix
          });

        } catch (error) {

          console.error(
            '[PLAY KYARA] ❌',
            error
          );

          return reply(
            '❌ Não consegui pesquisar essa música.\n' +
            'Tente novamente em alguns segundos.'
          );

        }

        break;


      // ============================================================
      // 🎵 PLAY — BAIXAR ÁUDIO
      // ============================================================

      case 'playaudio':
      case 'ytmaudio':

        try {

          const videoId =
            String(q || '')
              .trim()
              .split(/\s+/)[0];

          /*
           * IDs do YouTube possuem normalmente
           * 11 caracteres, mas aceitamos uma margem.
           */

          if (
            !videoId ||
            !/^[A-Za-z0-9_-]{6,20}$/.test(
              videoId
            )
          ) {

            return reply(
              `❌ Música inválida.\n\n` +
              `Use:\n` +
              `${prefix}play <nome da música>`
            );

          }

          await reply(
            '🎵 *Baixando áudio...*\n' +
            '⏳ Aguarde um momento.'
          );

          const videoUrl =
            `https://www.youtube.com/watch?v=${videoId}`;

          const dlRes =
            await youtube.mp3(
              videoUrl
            );

          if (
            !dlRes?.ok
          ) {

            return reply(
              `❌ Erro ao baixar o áudio:\n` +
              `${dlRes?.msg || 'Falha no download.'}`
            );

          }

          await nazu.sendMessage(
            from,
            {
              audio:
                dlRes.buffer,

              mimetype:
                'audio/mpeg',

              fileName:
                dlRes.filename ||
                'audio.mp3'
            },
            {
              quoted: info
            }
          );

          console.log(
            `[PLAY AUDIO] ✅ Áudio enviado: ${videoId}`
          );

        } catch (error) {

          console.error(
            '[PLAY AUDIO] ❌',
            error
          );

          return reply(
            '❌ Não foi possível enviar o áudio.'
          );

        }

        break;


      // ============================================================
      // 🎬 PLAY — BAIXAR VÍDEO
      // ============================================================

      case 'playvideo':
      case 'ytmvideo':

        try {

          const videoId =
            String(q || '')
              .trim()
              .split(/\s+/)[0];

          if (
            !videoId ||
            !/^[A-Za-z0-9_-]{6,20}$/.test(
              videoId
            )
          ) {

            return reply(
              `❌ Vídeo inválido.\n\n` +
              `Use:\n` +
              `${prefix}play <nome da música>`
            );

          }

          await reply(
            '🎬 *Baixando vídeo...*\n' +
            '⏳ Aguarde um momento.'
          );

          const videoUrl =
            `https://www.youtube.com/watch?v=${videoId}`;

          const dlRes =
            await youtube.mp4(
              videoUrl
            );

          if (
            !dlRes?.ok
          ) {

            return reply(
              `❌ Erro ao baixar o vídeo:\n` +
              `${dlRes?.msg || 'Falha no download.'}`
            );

          }

          await nazu.sendMessage(
            from,
            {
              video:
                dlRes.buffer,

              fileName:
                dlRes.filename ||
                'video.mp4',

              mimetype:
                'video/mp4'
            },
            {
              quoted: info
            }
          );

          console.log(
            `[PLAY VIDEO] ✅ Vídeo enviado: ${videoId}`
          );

        } catch (error) {

          console.error(
            '[PLAY VIDEO] ❌',
            error
          );

          return reply(
            '❌ Não foi possível enviar o vídeo.'
          );

        }

        break;


'''

s = s[:start] + new_play + s[end:]

idx.write_text(
    s,
    encoding='utf-8'
)

print("✅ case /play atualizado.")
print("✅ /playaudio criado.")
print("✅ /playvideo criado.")


# ============================================================
# YOUTUBE.JS — BUSCA MAIS RÁPIDA
# ============================================================

yt = root / "dados/src/funcs/downloads/youtube.js"
y = yt.read_text(encoding='utf-8')

if "import ytSearch from 'yt-search'" not in y:

    y = (
        "import ytSearch from 'yt-search'\n"
        + y
    )

    print("✅ yt-search ativado.")

# Localiza search()
start = y.find(
    "async function search(query) {"
)

end = y.find(
    "\n}\n\n/**\n * Baixa áudio",
    start
)

if start == -1 or end == -1:

    raise SystemExit(
        "❌ Não consegui localizar a função search() do YouTube."
    )

new_search = r'''async function search(query) {

  const termo =
    String(
      query || ''
    ).trim();

  if (!termo) {

    return {
      ok: false,
      msg:
        'Digite o nome do vídeo ou música.'
    };

  }

  /*
   * ============================================================
   * PESQUISA RÁPIDA
   *
   * yt-search não precisa iniciar um processo do yt-dlp.
   * Para pesquisa por nome isso deixa a resposta inicial
   * significativamente mais leve.
   * ============================================================
   */

  if (
    !/youtube\.com|youtu\.be/i.test(
      termo
    )
  ) {

    try {

      const resultado =
        await ytSearch(
          termo
        );

      const video =
        resultado?.videos?.[0];

      if (
        video?.videoId ||
        video?.url
      ) {

        const id =
          video.videoId ||
          String(
            video.url
          ).match(
            /[?&]v=([^&]+)/
          )?.[1];

        if (id) {

          const url =
            video.url ||
            `https://www.youtube.com/watch?v=${id}`;

          return {
            ok: true,

            data: {

              videoId:
                id,

              url,

              title:
                video.title ||
                'Vídeo sem título',

              description:
                video.description ||
                '',

              thumbnail:
                video.thumbnail ||
                video.image ||
                `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,

              seconds:
                segundos(
                  video.seconds ??
                  video.duration
                ),

              timestamp:
                video.timestamp ||
                formatarDuracao(
                  video.seconds ??
                  video.duration
                ),

              views:
                video.views ||
                0,

              ago:
                video.ago ||
                '',

              author: {
                name:
                  video.author?.name ||
                  video.author ||
                  'YouTube'
              }

            }
          };

        }

      }

    } catch (error) {

      console.warn(
        '[YOUTUBE SEARCH] yt-search falhou; usando yt-dlp:',
        error.message
      );

    }

  }

  /*
   * ============================================================
   * FALLBACK / LINK DIRETO
   * ============================================================
   */

  try {

    const resultado =
      await executarYtDlp([
        '--no-playlist',
        '--flat-playlist',
        '--dump-single-json',

        /youtube\.com|youtu\.be/i.test(
          termo
        )
          ? termo
          : `ytsearch1:${termo}`
      ]);

    const dados =
      extrairJson(
        resultado.stdout
      );

    const video =
      dados?.entries?.[0] ||
      dados;

    if (!video?.id) {

      return {
        ok: false,
        msg:
          'Nenhum vídeo encontrado.'
      };

    }

    const url =
      video.webpage_url ||
      video.url ||
      `https://www.youtube.com/watch?v=${video.id}`;

    return {
      ok: true,

      data: {

        videoId:
          video.id,

        url,

        title:
          video.title ||
          'Vídeo sem título',

        description:
          video.description ||
          '',

        thumbnail:
          video.thumbnail ||
          `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,

        seconds:
          segundos(
            video.duration
          ),

        timestamp:
          formatarDuracao(
            video.duration
          ),

        views:
          video.view_count ||
          0,

        ago:
          video.upload_date ||
          '',

        author: {
          name:
            video.uploader ||
            video.channel ||
            'YouTube'
        }

      }
    };

  } catch (error) {

    console.error(
      '[YOUTUBE SEARCH]',
      error
    );

    return {
      ok: false,
      msg:
        'Não foi possível pesquisar no YouTube: ' +
        error.message
    };

  }

}'''

y = (
    y[:start]
    + new_search
    + y[end + 2:]
)

yt.write_text(
    y,
    encoding='utf-8'
)

print("✅ Busca do YouTube otimizada.")
PY

echo
echo "============================================"
echo "🔎 VALIDANDO"
echo "============================================"

node --check dados/src/index.js
node --check dados/src/funcs/downloads/youtube.js

echo "✅ index.js"
echo "✅ youtube.js"

echo
echo "=== PLAY ==="
grep -nE \
"enviarResultadoPlayKyara|case 'play':|case 'playaudio':|case 'playvideo':" \
dados/src/index.js | head -20

echo
echo "=== BUSCA RÁPIDA ==="
grep -n "yt-search" \
dados/src/funcs/downloads/youtube.js | head -5

echo
echo "============================================"
echo "✅ PLAY KYARA INSTALADO"
echo "============================================"
echo
echo "Agora execute:"
echo
echo "npm start"
echo
echo "Teste:"
echo
echo "/play nome de uma música"
echo
echo "Depois clique:"
echo "🎵 Baixar Áudio"
echo "🎬 Baixar Vídeo"
echo
