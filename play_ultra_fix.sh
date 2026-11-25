#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(pwd)"
Y="$ROOT/dados/src/funcs/downloads/youtube.js"
M="$ROOT/dados/src/features/kyaraMediaCommands.js"

[ -f "$Y" ] || {
  echo "❌ youtube.js não encontrado."
  exit 1
}

[ -f "$M" ] || {
  echo "❌ kyaraMediaCommands.js não encontrado."
  exit 1
}

BACKUP="$ROOT/dados/src/.backup-play-ultra-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

cp "$Y" "$BACKUP/youtube.js"
cp "$M" "$BACKUP/kyaraMediaCommands.js"

export Y M

python3 <<'PY'
from pathlib import Path
import os

Y = Path(os.environ["Y"])
M = Path(os.environ["M"])

yt = Y.read_text(encoding="utf-8")
md = M.read_text(encoding="utf-8")

def replace_between(text, start_marker, end_marker, replacement):
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    return text[:start] + replacement + text[end:]

# ============================================================
# 1. PESQUISA ULTRA
#    TED + yt-search em paralelo.
# ============================================================

search_new = r'''async function searchLegacy(query) {
  const termo =
    String(query || '').trim();

  if (!termo) {
    return {
      ok: false,
      msg: 'Digite algo para pesquisar.'
    };
  }

  /*
   * ⚡ CORRIDA DE PESQUISA
   *
   * O primeiro resultado válido ganha.
   */

  const tedJob =
    (async () => {
      const resultado =
        await Promise.race([
          kyaraTedSearch(termo),

          new Promise((_, reject) => {
            setTimeout(
              () =>
                reject(
                  new Error(
                    'TED search timeout'
                  )
                ),
              4500
            );
          })
        ]);

      if (
        !resultado?.ok ||
        !resultado?.data?.url
      ) {
        throw new Error(
          'TED sem resultado'
        );
      }

      console.log(
        '[YOUTUBE SEARCH] ⚡ TED API'
      );

      return resultado;
    })();

  const ytJob =
    (async () => {
      const resultado =
        await Promise.race([
          ytSearch(termo),

          new Promise((_, reject) => {
            setTimeout(
              () =>
                reject(
                  new Error(
                    'yt-search timeout'
                  )
                ),
              4500
            );
          })
        ]);

      const video =
        resultado?.videos?.[0];

      if (!video?.videoId) {
        throw new Error(
          'yt-search sem resultado'
        );
      }

      console.log(
        '[YOUTUBE SEARCH] ⚡ yt-search'
      );

      return {
        ok: true,

        data: {
          videoId:
            video.videoId,

          title:
            video.title ||
            'Sem título',

          url:
            video.url ||
            `https://www.youtube.com/watch?v=${video.videoId}`,

          thumbnail:
            video.thumbnail ||
            video.image ||
            '',

          author: {
            name:
              video.author?.name ||
              video.author ||
              'Desconhecido'
          },

          seconds:
            segundos(
              video.seconds
            ),

          timestamp:
            video.timestamp ||
            formatarDuracao(
              video.seconds
            ),

          views:
            Number(
              video.views
            ) || 0,

          ago:
            video.ago ||
            '',

          description:
            video.description ||
            ''
        }
      };
    })();

  try {
    return await Promise.any([
      tedJob,
      ytJob
    ]);
  } catch (error) {
    console.warn(
      '[YOUTUBE SEARCH] ⚠️ TED/yt-search:',
      error?.message ||
      error
    );
  }

  /*
   * Fallback final.
   */
  try {
    const resultadoBruto =
      await executarBuscaYtDlpRapida(
        termo,
        7000
      );

    const informacoes =
      extrairJson(
        resultadoBruto?.stdout
      );

    const video =
      Array.isArray(
        informacoes?.entries
      )
        ? informacoes.entries[0]
        : informacoes;

    if (
      video?.id ||
      video?.videoId
    ) {
      const id =
        video.videoId ||
        video.id;

      const endereco =
        video.webpage_url ||
        `https://www.youtube.com/watch?v=${id}`;

      return {
        ok: true,

        data:
          dadosNormalizados(
            {
              ...video,
              id
            },
            endereco
          )
      };
    }

  } catch (error) {
    console.warn(
      '[YOUTUBE SEARCH] yt-dlp fallback:',
      error?.message ||
      error
    );
  }

  return {
    ok: false,
    msg:
      'Não foi possível encontrar o vídeo agora. Tente novamente em alguns segundos.'
  };
}
'''

yt = replace_between(
    yt,
    "async function searchLegacy(query) {",
    "\n\n\nasync function search(query) {",
    search_new
)

# ============================================================
# 2. PLAYVIDEO ULTRA
#
# TED CONFIG -> yt-dlp
# ambos começam juntos.
#
# Sem download de MP4.
# Sem Buffer.
# Sem youtube.mp4().
# ============================================================

video_stream_new = r'''async function streamVideo(url) {
  const endereco =
    normalizarUrl(url);

  if (
    !/^https?:\/\//i.test(
      endereco
    )
  ) {
    return {
      ok: false,
      msg: 'URL inválida.'
    };
  }

  limparPlayVideoStreamCache();

  const cached =
    playVideoStreamCache.get(
      endereco
    );

  if (
    cached &&
    cached.expires > Date.now()
  ) {
    console.log(
      '[PLAY VIDEO] ⚡ CACHE'
    );

    return {
      ok: true,
      url:
        cached.url,
      mimetype:
        cached.mimetype ||
        'video/mp4'
    };
  }

  const running =
    playVideoStreamInflight.get(
      endereco
    );

  if (running) {
    console.log(
      '[PLAY VIDEO] ⚡ INFLIGHT'
    );

    return running;
  }

  const job =
    (async () => {

      /*
       * ======================================================
       * TED — USA API_KEY_TED DO CONFIG.JSON
       * ======================================================
       */

      const tedJob =
        (async () => {

          const direct =
            await Promise.race([
              kyaraTedVideo(
                endereco
              ),

              new Promise((_, reject) => {
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        'TED vídeo timeout'
                      )
                    ),
                  7000
                );
              })
            ]);

          if (!direct) {
            throw new Error(
              'TED sem URL direta'
            );
          }

          console.log(
            '[PLAY VIDEO] 🚀 TED DIRECT'
          );

          return {
            ok: true,
            url:
              direct,
            mimetype:
              'video/mp4'
          };
        })();

      /*
       * ======================================================
       * YT-DLP — FALLBACK/PARCEIRO
       *
       * Progressivo até 480p:
       * vídeo + áudio juntos.
       * ======================================================
       */

      const ytJob =
        (async () => {

          const args = [
            '--quiet',
            '--no-warnings',
            '--no-playlist',
            '--no-check-formats',

            '--socket-timeout',
            '5',

            '--extractor-retries',
            '1',

            '-f',
            'best[height<=480][ext=mp4][vcodec!=none][acodec!=none]/best[height<=480][vcodec!=none][acodec!=none]',

            '--get-url',

            endereco
          ];

          const resultado =
            await executarYtDlp(
              args
            );

          const streamUrl =
            String(
              resultado.stdout ||
              ''
            )
              .split(/\r?\n/)
              .map(
                item =>
                  item.trim()
              )
              .filter(
                item =>
                  /^https?:\/\//i.test(
                    item
                  )
              )
              .at(-1) ||
            '';

          if (!streamUrl) {
            throw new Error(
              'yt-dlp sem URL de vídeo'
            );
          }

          console.log(
            '[PLAY VIDEO] ⚡ yt-dlp DIRECT'
          );

          return {
            ok: true,
            url:
              streamUrl,
            mimetype:
              'video/mp4'
          };
        })();

      /*
       * O primeiro que funcionar ganha.
       */
      let resultado;

      try {

        resultado =
          await Promise.any([
            tedJob,
            ytJob
          ]);

      } catch (error) {

        console.warn(
          '[PLAY VIDEO] ❌ TED + yt-dlp:',
          error?.message ||
          error
        );

        return {
          ok: false,
          msg:
            'Não foi possível obter o vídeo diretamente.'
        };
      }

      if (
        resultado?.url
      ) {

        playVideoStreamCache.set(
          endereco,
          {
            url:
              resultado.url,

            mimetype:
              resultado.mimetype ||
              'video/mp4',

            expires:
              Date.now() +
              PLAY_VIDEO_STREAM_CACHE_TTL
          }
        );
      }

      return resultado;

    })();

  playVideoStreamInflight.set(
    endereco,
    job
  );

  try {
    return await job;

  } finally {
    playVideoStreamInflight.delete(
      endereco
    );
  }
}
'''

yt = replace_between(
    yt,
    "async function streamVideo(url) {",
    "\n\n\n/* KYARA_VOICE_CACHE_V1 */",
    video_stream_new
)

# ============================================================
# 3. ÁUDIO
#
# Mantém o mecanismo rápido.
# Apenas aumenta o cache da URL direta.
# ============================================================

yt = yt.replace(
    "const KYARA_REAL_AUDIO_TTL = 55 * 1000;",
    "const KYARA_REAL_AUDIO_TTL = 3 * 60 * 1000;"
)

# ============================================================
# 4. PLAYAUDIO
#
# Não usar FFmpeg.
# Não usar prefetchVoiceFile.
# URL direta.
# ============================================================

audio_start = md.index(
    "if (\n        platformOf(url) === 'YouTube'"
)

audio_end = md.find(
    "\n\n    /*\n     * FALLBACK UNIVERSAL",
    audio_start
)

if audio_end == -1:
    raise SystemExit(
        "❌ Final do bloco PLAYAUDIO não encontrado."
    )

audio_new = r'''if (
        platformOf(url) === 'YouTube'
      ) {
        try {
          const started =
            Date.now();

          console.log(
            '[PLAY AUDIO] ⚡ DIRECT'
          );

          const audioUrl =
            await youtube.prefetchAudioFile(
              url
            );

          if (
            !audioUrl ||
            !/^https?:\/\//i.test(
              audioUrl
            )
          ) {
            throw new Error(
              'URL direta de áudio inválida.'
            );
          }

          console.log(
            `[PLAY AUDIO] ⚡ URL pronta em ${Date.now() - started}ms`
          );

          await nazu.sendMessage(
            from,
            {
              audio: {
                url:
                  audioUrl
              },

              /*
               * TED /play_audio/v9 retorna
               * áudio compatível com MP3.
               *
               * Mantemos a rota rápida:
               * sem FFmpeg e sem arquivo local.
               */
              mimetype:
                'audio/mpeg',

              ptt: false,

              fileName:
                'KYARA-PLAY.mp3'
            },
            {
              quoted:
                info
            }
          );

          console.log(
            `[PLAY AUDIO] ✅ enviado em ${Date.now() - started}ms`
          );

          return true;

        } catch (error) {

          console.warn(
            '[PLAY AUDIO] ❌',
            error?.message ||
            error
          );

          throw error;
        }
      }'''

md = (
    md[:audio_start]
    + audio_new
    + md[audio_end:]
)

# ============================================================
# 5. PLAYVIDEO
#
# Apenas stream direto.
# Remove youtube.mp4() do caminho do botão.
# ============================================================

video_start = md.index(
    "if (\n      platformOf(url) === 'YouTube'"
)

video_end = md.find(
    "\n    await reply(\n      '🎬 *Preparando vídeo...*'",
    video_start
)

if video_end == -1:
    raise SystemExit(
        "❌ Final do bloco PLAYVIDEO não encontrado."
    )

video_cmd_new = r'''if (
      platformOf(url) === 'YouTube'
    ) {
      try {
        const started =
          Date.now();

        console.log(
          '[PLAYVIDEO] ⚡ DIRECT'
        );

        const stream =
          await youtube.streamVideo(
            url
          );

        if (
          !stream?.ok ||
          !stream?.url ||
          !/^https?:\/\//i.test(
            stream.url
          )
        ) {
          throw new Error(
            stream?.msg ||
            'URL direta inválida.'
          );
        }

        console.log(
          `[PLAYVIDEO] ✅ URL pronta em ${Date.now() - started}ms`
        );

        await nazu.sendMessage(
          from,
          {
            video: {
              url:
                stream.url
            },

            mimetype:
              stream.mimetype ||
              'video/mp4',

            fileName:
              'KYARA-PLAY.mp4'
          },
          {
            quoted:
              info
          }
        );

        console.log(
          `[PLAYVIDEO] ✅ enviado em ${Date.now() - started}ms`
        );

        return true;

      } catch (error) {

        console.warn(
          '[PLAYVIDEO] ❌',
          error?.message ||
          error
        );

        await reply(
          '❌ Não consegui preparar o vídeo direto agora.'
        );

        return true;
      }
    }'''

md = (
    md[:video_start]
    + video_cmd_new
    + md[video_end:]
)

Y.write_text(
    yt,
    encoding='utf-8'
)

M.write_text(
    md,
    encoding='utf-8'
)

print(
    '✅ PATCH ULTRA APLICADO'
)
PY

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔎 VALIDANDO JAVASCRIPT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

node --check "$Y"
node --check "$M"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PLAY ULTRA PRONTO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "⚡ .play"
echo "   → TED + yt-search em paralelo"
echo
echo "🎵 .playaudio"
echo "   → URL direta"
echo "   → sem FFmpeg"
echo "   → sem arquivo local"
echo "   → cache de 3 minutos"
echo
echo "🎬 .playvideo"
echo "   → TED DIRECT + yt-dlp em paralelo"
echo "   → cache"
echo "   → fallback 480p"
echo "   → sem youtube.mp4()"
echo "   → sem Buffer gigante"
echo
echo "📦 Backup:"
echo "$BACKUP"
echo
echo "🚀 Execute:"
echo "npm start"
