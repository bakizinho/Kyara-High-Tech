#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(pwd)"
Y="$ROOT/dados/src/funcs/downloads/youtube.js"
M="$ROOT/dados/src/features/kyaraMediaCommands.js"

[ -f "$Y" ] || { echo "❌ $Y não encontrado."; exit 1; }
[ -f "$M" ] || { echo "❌ $M não encontrado."; exit 1; }

BACKUP="$ROOT/dados/src/.backup-play-turbo-$(date +%Y%m%d-%H%M%S)"
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

# ------------------------------------------------------------
# 1) SEARCH: TED + yt-search em paralelo
# ------------------------------------------------------------
search_new = r'''async function searchLegacy(query) {
  const termo =
    String(query || '').trim();

  if (!termo) {
    return {
      ok: false,
      msg: 'Digite algo para pesquisar.'
    };
  }

  const tedJob = (async () => {
    const result =
      await kyaraTedSearch(termo);

    if (
      result?.ok &&
      result?.data?.url
    ) {
      console.log(
        '[YOUTUBE SEARCH] ⚡ TED API'
      );
      return result;
    }

    throw new Error('TED sem resultado.');
  })();

  const ytJob = (async () => {
    const resultado =
      await Promise.race([
        ytSearch(termo),
        new Promise((_, reject) => {
          setTimeout(
            () => reject(
              new Error(
                'yt-search timeout.'
              )
            ),
            5000
          );
        })
      ]);

    const video =
      resultado?.videos?.[0];

    if (!video?.videoId) {
      throw new Error(
        'yt-search sem resultado.'
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
          Number(video.views) ||
          0,
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
  } catch {}

  try {
    const bruto =
      await executarBuscaYtDlpRapida(
        termo,
        7000
      );

    const dados =
      extrairJson(
        bruto?.stdout
      );

    const video =
      Array.isArray(dados?.entries)
        ? dados.entries[0]
        : dados;

    if (
      video?.id ||
      video?.videoId
    ) {
      const id =
        video.videoId ||
        video.id;

      const endereco =
        video.webpage_url ||
        (
          /^https?:\/\//i.test(
            String(
              video.url ||
              ''
            )
          )
            ? video.url
            : `https://www.youtube.com/watch?v=${id}`
        );

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
      '[YOUTUBE SEARCH] yt-dlp:',
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

# ------------------------------------------------------------
# 2) VIDEO STREAM: URL direta, cache, 360p.
#    Sem youtube.mp4() e sem Buffer pesado.
# ------------------------------------------------------------
stream_new = r'''async function streamVideo(url) {
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
    cached.expires >
      Date.now()
  ) {
    console.log(
      '[PLAY VIDEO] ⚡ CACHE'
    );

    return {
      ok: true,
      url:
        cached.url,
      mimetype:
        'video/mp4'
    };
  }

  const running =
    playVideoStreamInflight.get(
      endereco
    );

  if (running) {
    return running;
  }

  const job =
    (async () => {
      try {
        const resultado =
          await executarYtDlp([
            '--quiet',
            '--no-warnings',
            '--no-playlist',
            '--no-check-formats',
            '--socket-timeout',
            '5',
            '--extractor-retries',
            '1',
            '-f',
            'best[height<=360][ext=mp4][vcodec!=none][acodec!=none]/best[height<=360][vcodec!=none][acodec!=none]',
            '--get-url',
            endereco
          ]);

        const streamUrl =
          String(
            resultado.stdout ||
            ''
          )
            .split(/\r?\n/)
            .map(
              v =>
                v.trim()
            )
            .filter(
              v =>
                /^https?:\/\//i.test(
                  v
                )
            )
            .at(-1) ||
          '';

        if (streamUrl) {
          playVideoStreamCache.set(
            endereco,
            {
              url:
                streamUrl,
              expires:
                Date.now() +
                PLAY_VIDEO_STREAM_CACHE_TTL
            }
          );

          console.log(
            '[PLAY VIDEO] 🚀 DIRECT 360p'
          );

          return {
            ok: true,
            url:
              streamUrl,
            mimetype:
              'video/mp4'
          };
        }
      } catch (error) {
        console.warn(
          '[PLAY VIDEO] yt-dlp:',
          error?.message ||
          error
        );
      }

      try {
        const ted =
          await kyaraTedVideoDirect(
            endereco
          );

        if (
          ted?.ok &&
          ted.url
        ) {
          return {
            ...ted,
            mimetype:
              ted.mimetype ||
              'video/mp4'
          };
        }
      } catch (error) {
        console.warn(
          '[PLAY VIDEO] TED:',
          error?.message ||
          error
        );
      }

      return {
        ok: false,
        msg:
          'Não foi possível obter uma URL direta de vídeo.'
      };
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
    "\n\n\n\n/* KYARA_VOICE_CACHE_V1 */",
    stream_new
)

# ------------------------------------------------------------
# 3) CARD #PLAY: prefetch VOZ REAL + VÍDEO
# ------------------------------------------------------------
prefetch_new = r'''function prefetchPlayMedia(url) {
  const source =
    cleanUrl(url);

  if (
    !source ||
    platformOf(source) !==
      'YouTube'
  ) {
    return;
  }

  const tarefas = [];

  if (
    typeof youtube.prefetchVoiceFile ===
    'function'
  ) {
    tarefas.push(
      youtube
        .prefetchVoiceFile(source)
        .then(file => {
          console.log(
            '[PLAY TURBO] 🎙️ Voz pronta:',
            file ? 'SIM' : 'NÃO'
          );
        })
        .catch(error => {
          console.warn(
            '[PLAY TURBO] Voz:',
            error?.message ||
            error
          );
        })
    );
  }

  if (
    typeof youtube.streamVideo ===
    'function'
  ) {
    tarefas.push(
      youtube
        .streamVideo(source)
        .then(result => {
          console.log(
            '[PLAY TURBO] 🎬 Vídeo pronto:',
            result?.url
              ? 'SIM'
              : 'NÃO'
          );
        })
        .catch(error => {
          console.warn(
            '[PLAY TURBO] Vídeo:',
            error?.message ||
            error
          );
        })
    );
  }

  if (tarefas.length) {
    void Promise.allSettled(
      tarefas
    );
  }
}
'''

md = replace_between(
    md,
    "function prefetchPlayMedia(url) {",
    "\nfunction resolveButton(value) {",
    prefetch_new
)

# ------------------------------------------------------------
# 4) PLAYAUDIO: OGG/Opus + ptt:true
# ------------------------------------------------------------
audio_new = r'''if (
        platformOf(url) === 'YouTube'
      ) {
        try {
          const started =
            Date.now();

          console.log(
            '[PLAY AUDIO] 📩 Clique recebido'
          );

          if (
            typeof youtube.prefetchVoiceFile !==
            'function'
          ) {
            throw new Error(
              'prefetchVoiceFile não está disponível.'
            );
          }

          const voiceFile =
            await youtube.prefetchVoiceFile(
              url
            );

          if (!voiceFile) {
            throw new Error(
              'OGG/Opus não foi gerado.'
            );
          }

          await nazu.sendMessage(
            from,
            {
              audio: {
                url:
                  voiceFile
              },
              mimetype:
                'audio/ogg; codecs=opus',
              ptt: true,
              fileName:
                'KYARA-PLAY.ogg'
            },
            {
              quoted:
                info
            }
          );

          console.log(
            `[PLAY AUDIO] ✅ VOZ enviada em ${Date.now() - started}ms`
          );

          return true;

        } catch (error) {
          console.warn(
            '[PLAY AUDIO] ❌ Voz:',
            error?.message ||
            error
          );

          throw error;
        }
      }
'''

md = replace_between(
    md,
    "if (\n        platformOf(url) === 'YouTube'\n      ) {",
    "\n    /*\n     * FALLBACK UNIVERSAL",
    audio_new
)

# ------------------------------------------------------------
# 5) PLAYVIDEO: somente URL direta.
#    Remove o fallback youtube.mp4(), que é o pesado.
# ------------------------------------------------------------
video_new = r'''if (
      platformOf(url) === 'YouTube'
    ) {
      try {
        const started =
          Date.now();

        console.log(
          '[PLAYVIDEO] ⚡ Stream direto...'
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
            'Stream inválido.'
          );
        }

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
              'KYARA-PLAY-360P.mp4'
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
          '❌ Não consegui preparar o vídeo direto agora.\n' +
          'Tente novamente em alguns segundos.'
        );

        return true;
      }
    }
'''

md = replace_between(
    md,
    "if (\n      platformOf(url) === 'YouTube'\n    ) {",
    "\n\n    await reply(\n      '🎬 *Preparando vídeo...*'",
    video_new
)

Y.write_text(yt, encoding="utf-8")
M.write_text(md, encoding="utf-8")

print("✅ PATCH_OK")
PY

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔎 VALIDANDO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

node --check "$Y"
node --check "$M"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ KYARA PLAY TURBO APLICADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎵 .play       → TED + yt-search em paralelo"
echo "🎙️ .playaudio  → OGG/Opus + ptt:true + prefetch"
echo "🎬 .playvideo  → URL direta 360p"
echo "🚫 sem fallback youtube.mp4() pesado"
echo
echo "📦 Backup: $BACKUP"
echo
echo "🚀 Reinicie com:"
echo "npm start"
