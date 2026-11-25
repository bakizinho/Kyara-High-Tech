#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$(pwd)"
INDEX="$ROOT/dados/src/index.js"
YT="$ROOT/dados/src/funcs/downloads/youtube.js"

[ -f "$INDEX" ] || { echo "❌ Execute na raiz do BKkyara."; exit 1; }
[ -f "$YT" ] || { echo "❌ youtube.js não encontrado."; exit 1; }

STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ROOT/dados/database/backups/turbo-$STAMP"

cp "$INDEX" "$ROOT/dados/database/backups/turbo-$STAMP/index.js"
cp "$YT" "$ROOT/dados/database/backups/turbo-$STAMP/youtube.js"

node --input-type=module <<'NODE'
import fs from 'node:fs';

const root = process.cwd();
const indexFile = `${root}/dados/src/index.js`;
const ytFile = `${root}/dados/src/funcs/downloads/youtube.js`;

let index = fs.readFileSync(indexFile, 'utf8');
let yt = fs.readFileSync(ytFile, 'utf8');

function replaceOnce(src, re, replacement, label) {
  const out = src.replace(re, replacement);
  if (out === src) {
    throw new Error(`Não encontrei o bloco: ${label}`);
  }
  return out;
}

/* ============================================================
   1. TED AUDIO — REMOVE HEAD DESNECESSÁRIO
   ============================================================ */

yt = replaceOnce(
  yt,
  /async function kyaraTedAudio\(url\) \{[\s\S]*?\n\}\n\nasync function kyaraTedVideo/,
`async function kyaraTedAudio(url) {
  const key = kyaraTedKey();

  if (!key) {
    return null;
  }

  const source =
    String(url || '').trim();

  if (!/^https?:\\/\\//i.test(source)) {
    return null;
  }

  // ⚡ ULTRA:
  // Não faz HEAD antes do áudio.
  // A própria URL já pode ser entregue ao Baileys.
  return kyaraTedUrl(source);
}

async function kyaraTedVideo`,
  'kyaraTedAudio'
);

/* ============================================================
   2. PLAY AUDIO — CACHE ANTES DE QUALQUER REDE
   ============================================================ */

yt = replaceOnce(
  yt,
  /async function prefetchAudioFile\(url\) \{\n  const source = String\(url \|\| ''\)\.trim\(\);\n\n  \/\*\n   \* ========================================================\n   \* ⚡ TED AUDIO DIRECT/,
`async function prefetchAudioFile(url) {
  const source =
    String(url || '').trim();

  if (!source) {
    throw new Error(
      'URL do YouTube vazia.'
    );
  }

  // ⚡ CACHE PRIMEIRO.
  // Se já foi resolvido, não chama TED nem yt-dlp.
  const now = Date.now();

  const cached =
    __kyaraRealAudioCache.get(
      source
    );

  if (
    cached &&
    cached.expiresAt > now &&
    cached.url
  ) {
    console.log(
      '[PLAY AUDIO] ⚡ CACHE HIT INSTANTÂNEO'
    );

    return cached.url;
  }

  const running =
    __kyaraRealAudioInflight.get(
      source
    );

  if (running) {
    console.log(
      '[PLAY AUDIO] 🔄 REUTILIZANDO PREFETCH'
    );

    return running;
  }

  /*
   * ========================================================
   * ⚡ TED AUDIO DIRECT`,
  'prefetchAudioFile cache'
);

/* Remove cache duplicado antigo dentro da função. */

yt = yt.replace(
`  const now = Date.now();

  const cached =
    __kyaraRealAudioCache.get(source);

  if (
    cached &&
    cached.expiresAt > now &&
    cached.url
  ) {
    console.log(
      '[PLAY AUDIO] ⚡ CACHE HIT'
    );

    return cached.url;
  }

  const running =
    __kyaraRealAudioInflight.get(source);

  if (running) {
    console.log(
      '[PLAY AUDIO] 🔄 REUTILIZANDO PREFETCH'
    );

    return running;
  }

`,
''
);

/* ============================================================
   3. TED VIDEO — TIMEOUT MENOR
   ============================================================ */

yt = yt.replace(
`      () => controller.abort(),
      15000
`,
`      () => controller.abort(),
      8000
`
);

/* ============================================================
   4. PLAY — NÃO ESPERA THUMBNAIL
   ============================================================ */

index = replaceOnce(
  index,
  /  \/\*\n   \* Baixa a thumbnail diretamente para memória\.[\s\S]*?\n  const interactiveMessage = \{/,
`  // ⚡ ULTRA PLAY:
  // Não baixa nem prepara thumbnail antes de responder.
  // Remove uma requisição + upload do caminho crítico.
  const interactiveMessage = {`,
  'thumbnail play'
);

/* ============================================================
   5. REMOVE HEADER DE IMAGEM
   ============================================================ */

index = replaceOnce(
  index,
  /  \/\*\n   \* Só adiciona o header de imagem quando a thumbnail[\s\S]*?\n  \}\n\n  const msg =/,
`  const msg =`,
  'image header play'
);

/* ============================================================
   6. PLAY — PREFETCH DO ÁUDIO EM BACKGROUND
   ============================================================ */

index = replaceOnce(
  index,
  /  console\.log\(\n    `\[PLAY KYARA\] ✅ Resultado enviado: \$\{title\}`\n  \);\n\}/,
`  console.log(
    '[PLAY KYARA] ✅ Resultado enviado: ' + title
  );

  // ⚡ PREFETCH SILENCIOSO.
  // O /play não espera isso.
  // Quando o usuário clicar, o áudio pode já estar pronto.
  if (
    typeof youtube?.prefetchAudioFile === 'function' &&
    /^https?:\\/\\//i.test(mediaUrl)
  ) {
    youtube
      .prefetchAudioFile(mediaUrl)
      .catch(() => {});
  }
}`,
  'play prefetch'
);

/* ============================================================
   7. AUTODL — YOUTUBE DIRETO
   ============================================================ */

index = replaceOnce(
  index,
  /      if \(\n        mode === 'audio'\n      \) \{[\s\S]*?      \/\*[\s\S]*?FALLBACK INSTAGRAM/,
`      const isYoutube =
        /(?:youtube\\.com|youtu\\.be)/i.test(
          lower
        );

      if (mode === 'audio') {

        /*
         * ⚡ YOUTUBE AUDIO DIRETO
         *
         * Não:
         * - baixa Buffer
         * - salva arquivo
         * - converte
         *
         * Entrega a URL diretamente ao WhatsApp.
         */

        if (
          isYoutube &&
          typeof youtube.prefetchAudioFile === 'function'
        ) {

          const audioUrl =
            await youtube.prefetchAudioFile(
              endereco
            );

          if (audioUrl) {

            await nazu.sendMessage(
              from,
              {
                audio: {
                  url: audioUrl
                },

                mimetype:
                  'audio/mp4',

                ptt:
                  false,

                fileName:
                  'KYARA-AUDIO.m4a'
              },
              {
                quoted: info
              }
            );

            return true;
          }
        }

        /*
         * Fallback para outras plataformas.
         */

        const result =
          await youtube.mp3(
            endereco,
            128
          );

        if (
          result?.ok &&
          result.buffer
        ) {

          await nazu.sendMessage(
            from,
            {
              audio:
                result.buffer,

              mimetype:
                result.mimetype ||
                'audio/mpeg',

              fileName:
                result.filename ||
                'audio.mp3'
            },
            {
              quoted:
                info
            }
          );

          return true;
        }

      } else {

        /*
         * ⚡ YOUTUBE VIDEO DIRETO
         *
         * Stream progressivo.
         * Sem Buffer completo no Termux.
         */

        if (
          isYoutube &&
          typeof youtube.streamVideo === 'function'
        ) {

          const direct =
            await youtube.streamVideo(
              endereco
            );

          if (
            direct?.ok &&
            direct.url
          ) {

            await nazu.sendMessage(
              from,
              {
                video: {
                  url:
                    direct.url
                },

                mimetype:
                  direct.mimetype ||
                  'video/mp4',

                fileName:
                  'KYARA-VIDEO.mp4'
              },
              {
                quoted:
                  info
              }
            );

            return true;
          }
        }

        /*
         * Fallback para Instagram/TikTok/etc.
         */

        const result =
          await youtube.mp4(
            endereco,
            720
          );

        if (
          result?.ok &&
          result.buffer
        ) {

          await nazu.sendMessage(
            from,
            {
              video:
                result.buffer,

              mimetype:
                result.mimetype ||
                'video/mp4',

              fileName:
                result.filename ||
                'video.mp4'
            },
            {
              quoted:
                info
            }
          );

          return true;
        }
      }

      /*
       * FALLBACK INSTAGRAM`,
  'autodl stream'
);

fs.writeFileSync(
  indexFile,
  index
);

fs.writeFileSync(
  ytFile,
  yt
);

console.log(
  '✅ Turbo aplicado.'
);
NODE

node --check "$INDEX"
node --check "$YT"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ KYARA TURBO APLICADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "✓ /play sem esperar thumbnail"
echo "✓ /play faz prefetch do áudio"
echo "✓ /playaudio usa cache primeiro"
echo "✓ TED Audio sem HEAD"
echo "✓ AutoDL YouTube em stream direto"
echo "✓ AutoDL áudio sem Buffer"
echo "✓ AutoDL vídeo sem Buffer"
echo "✓ Fallbacks preservados"
echo "✓ Backup criado automaticamente"
echo
echo "Backup:"
echo "dados/database/backups/turbo-$STAMP/"
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ Reinicie a Kyara agora."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
