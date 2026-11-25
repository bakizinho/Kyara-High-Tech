#!/data/data/com.termux/files/usr/bin/bash
set -eu

ROOT="$(pwd)"
Y="$ROOT/dados/src/funcs/downloads/youtube.js"
M="$ROOT/dados/src/features/kyaraMediaCommands.js"
B="$ROOT/dados/src/.backup-play-final"

[ -f "$Y" ] || { echo "❌ youtube.js não encontrado."; exit 1; }
[ -f "$M" ] || { echo "❌ kyaraMediaCommands.js não encontrado."; exit 1; }

mkdir -p "$B"

[ -f "$B/youtube.js" ] ||
  cp "$Y" "$B/youtube.js"

[ -f "$B/kyaraMediaCommands.js" ] ||
  cp "$M" "$B/kyaraMediaCommands.js"

python3 - "$Y" "$M" <<'PY'
from pathlib import Path
import sys

y, m = map(Path, sys.argv[1:])

ys = y.read_text(encoding="utf-8")
ms = m.read_text(encoding="utf-8")

# ============================================================
# 1. PLAYVIDEO DIRETO + CACHE + INFLIGHT
# ============================================================

start = ys.index("async function streamVideo(url) {")

end = ys.index(
    "\n\n\n\n/* KYARA_VOICE_CACHE_V1 */",
    start
)

new_video = r'''async function streamVideo(url) {

  const endereco =
    normalizarUrl(url);

  if (
    !/^https?:\/\//i.test(endereco)
  ) {
    return {
      ok: false,
      msg: "URL inválida."
    };
  }

  if (
    !globalThis.__kyaraVideoDirectCache
  ) {

    globalThis.__kyaraVideoDirectCache =
      new Map();

    globalThis.__kyaraVideoDirectInflight =
      new Map();

  }

  const cache =
    globalThis.__kyaraVideoDirectCache;

  const inflight =
    globalThis.__kyaraVideoDirectInflight;

  const cached =
    cache.get(endereco);

  if (
    cached &&
    cached.expiresAt > Date.now()
  ) {

    console.log(
      "[PLAY VIDEO] ⚡ CACHE DIRECT"
    );

    return cached.result;

  }

  const running =
    inflight.get(endereco);

  if (running) {

    console.log(
      "[PLAY VIDEO] 🔄 REUTILIZANDO EXTRAÇÃO"
    );

    return running;

  }

  const job =
    (async () => {

      /*
       * MESMO MECANISMO DO ÁUDIO:
       *
       * URL remota
       *      ↓
       * Baileys
       *
       * Sem Buffer.
       * Sem download completo.
       * Sem MP4 temporário.
       */

      try {

        const tedDirect =
          await kyaraTedVideoDirect(
            endereco
          );

        if (
          tedDirect?.ok &&
          tedDirect.url
        ) {

          const result = {
            ok: true,

            url:
              tedDirect.url,

            mimetype:
              "video/mp4"
          };

          cache.set(
            endereco,
            {
              result,

              expiresAt:
                Date.now() +
                45 * 1000
            }
          );

          console.log(
            "[PLAY VIDEO] 🚀 TED DIRECT"
          );

          return result;

        }

      } catch (error) {

        console.warn(
          "[PLAY VIDEO] TED:",
          error?.message ||
          error
        );

      }

      /*
       * FALLBACK DIRETO.
       *
       * Até 480p para evitar
       * sobrecarregar o celular.
       */

      try {

        const args = [

          "--quiet",

          "--no-warnings",

          "--no-playlist",

          "--no-check-formats",

          "--socket-timeout",
          "5",

          "--extractor-retries",
          "1",

          "-f",

          "best[height<=480][ext=mp4][vcodec!=none][acodec!=none]/best[height<=480][vcodec!=none][acodec!=none]",

          "--get-url",

          endereco

        ];

        const resultado =
          await executarYtDlp(
            args
          );

        const urls =
          String(
            resultado.stdout ||
            ""
          )
            .split(/\r?\n/)
            .map(
              v => v.trim()
            )
            .filter(
              v =>
                /^https?:\/\//i.test(v)
            );

        const streamUrl =
          urls.at(-1) ||
          "";

        if (
          streamUrl
        ) {

          const result = {
            ok: true,

            url:
              streamUrl,

            mimetype:
              "video/mp4"
          };

          cache.set(
            endereco,
            {
              result,

              expiresAt:
                Date.now() +
                45 * 1000
            }
          );

          console.log(
            "[PLAY VIDEO] ⚡ YT-DLP DIRECT 480p"
          );

          return result;

        }

      } catch (error) {

        console.warn(
          "[PLAY VIDEO] yt-dlp:",
          error?.message ||
          error
        );

      }

      return {
        ok: false,

        msg:
          "Não foi possível obter uma URL direta de vídeo."
      };

    })();

  inflight.set(
    endereco,
    job
  );

  try {

    return await job;

  } finally {

    inflight.delete(
      endereco
    );

  }

}
'''

ys =
  ys[:start] +
  new_video +
  ys[end:]

# TED vídeo: 8s -> 5s
ys =
  ys.replace(
    """() => controller.abort(),
      8000""",
    """() => controller.abort(),
      5000""",
    1
  )

y.write_text(
  ys,
  encoding="utf-8"
)

# ============================================================
# 2. PLAYAUDIO = VOZ REAL + WAVEFORM
# ============================================================

start =
  ms.index(
    """          if (
        platformOf(url) === 'YouTube'"""
  )

end =
  ms.index(
    """
    /*
     * FALLBACK UNIVERSAL""",
    start
  )

new_audio = r'''          if (
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
              'prefetchVoiceFile não está disponível no youtube.js.'
            );

          }

          /*
           * OGG/Opus + ptt:true
           * = mensagem de voz real
           * = waveform do WhatsApp.
           *
           * O card já inicia o prefetch.
           */

          const voiceFile =
            await youtube.prefetchVoiceFile(
              url
            );

          console.log(
            `[PLAY AUDIO] ⚡ Voz pronta em ${Date.now() - started}ms`
          );

          await nazu.sendMessage(
            from,
            {

              audio: {
                url:
                  voiceFile
              },

              mimetype:
                'audio/ogg; codecs=opus',

              ptt:
                true,

              fileName:
                'KYARA-PLAY.ogg'

            },
            {
              quoted:
                info
            }
          );

          console.log(
            `[PLAY AUDIO] ✅ VOZ/WAVEFORM enviada em ${Date.now() - started}ms`
          );

          return true;

        } catch (error) {

          console.warn(
            '[PLAY AUDIO] ❌ Voz falhou:',
            error?.message ||
            error
          );

          throw error;

        }

      }
'''

ms =
  ms[:start] +
  new_audio +
  ms[end:]

# ============================================================
# 3. PREFETCH DO CARD = VOZ REAL
# ============================================================

old_prefetch = """  /*
   * 🎙️ VOZ
   */
  if (
    typeof youtube.prefetchAudioFile ===
    'function'
  ) {

    tarefas.push(

      youtube
        .prefetchAudioFile(
          source
        )"""

new_prefetch = """  /*
   * 🎙️ VOZ REAL — OGG/OPUS + WAVEFORM
   */
  if (
    typeof youtube.prefetchVoiceFile ===
    'function'
  ) {

    tarefas.push(

      youtube
        .prefetchVoiceFile(
          source
        )"""

if old_prefetch not in ms:

  raise SystemExit(
    "❌ Bloco de prefetch de áudio não encontrado."
  )

ms =
  ms.replace(
    old_prefetch,
    new_prefetch,
    1
  )

ms =
  ms.replace(
    "'[PLAY TURBO] 🎵 Áudio pronto:',",
    "'[PLAY TURBO] 🎙️ Voz pronta:',",
    1
  )

m.write_text(
  ms,
  encoding="utf-8"
)

PY

node --check "$Y"
node --check "$M"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ KYARA PLAY FINAL APLICADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎙️ Áudio: OGG/Opus + ptt:true + waveform"
echo "⚡ Voz: prefetch começa no card"
echo "🎬 Vídeo: URL direta → Baileys"
echo "⚡ Vídeo: cache + inflight"
echo "📱 Fallback: MP4 progressivo até 480p"
echo "🚫 Sem Buffer gigante"
echo "🚫 Sem download completo do vídeo"
echo
echo "📦 Backup:"
echo "$B"
echo
echo "Reinicie o bot:"
echo "node dados/src/.scripts/start.js"
echo

rm -f kyara_play_final.sh
