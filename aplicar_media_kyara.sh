#!/data/data/com.termux/files/usr/bin/bash

set -e

echo "=============================================="
echo "      🌸 KYARA MEDIA PATCH — V3"
echo "=============================================="
echo

BASE="$HOME/storage/BKkyara-/dados/src"
INDEX="$BASE/index.js"
YOUTUBE="$BASE/funcs/downloads/youtube.js"

if [ ! -f "$INDEX" ]; then
  echo "❌ index.js não encontrado:"
  echo "$INDEX"
  exit 1
fi

if [ ! -f "$YOUTUBE" ]; then
  echo "❌ youtube.js não encontrado:"
  echo "$YOUTUBE"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"

echo "📦 Criando backups..."

cp "$INDEX" "$INDEX.bak-media-v3-$STAMP"
cp "$YOUTUBE" "$YOUTUBE.bak-media-v3-$STAMP"

echo "✅ Backups criados."
echo

python - "$INDEX" "$YOUTUBE" <<'PY'
import sys
from pathlib import Path

index_path = Path(sys.argv[1])
youtube_path = Path(sys.argv[2])

index = index_path.read_text()
youtube = youtube_path.read_text()

# =========================================================
# 1. ALTERAR ASSINATURA DO AUTODL
# =========================================================

old = "async function handleAutoDownload(nazu, from, url, info) {"
new = "async function handleAutoDownload(nazu, from, url, info, mode = 'video') {"

if old not in index:
    raise SystemExit(
        "ERRO: assinatura original de handleAutoDownload não encontrada."
    )

index = index.replace(old, new, 1)

# =========================================================
# 2. YOUTUBE DO AUTODL
# =========================================================

old = """      // YouTube - baixar apenas áudio (MP3)
      if (platformName === 'YouTube') {
        result = await youtube.mp3(url, 128);
        if (result && result.ok) {
          await nazu.sendMessage(from, {
            audio: result.buffer,
            mimetype: 'audio/mpeg',
            fileName: result.filename || 'audio.mp3'
          }, { quoted: info });
          return true;
        }
      }
"""

new = """      // YouTube - respeitar modo do AutoDL
      if (platformName === 'YouTube') {
        if (mode === 'audio') {
          result = await youtube.mp3(url, 128);

          if (result && result.ok) {
            await nazu.sendMessage(from, {
              audio: result.buffer,
              mimetype: 'audio/mpeg',
              fileName: result.filename || 'audio.mp3'
            }, { quoted: info });

            return true;
          }
        } else {
          result = await youtube.mp4(url, 720);

          if (result && result.ok) {
            await nazu.sendMessage(from, {
              video: result.buffer,
              mimetype: 'video/mp4',
              fileName: result.filename || 'video.mp4'
            }, { quoted: info });

            return true;
          }
        }
      }
"""

if old not in index:
    raise SystemExit(
        "ERRO: bloco YouTube do handleAutoDownload não encontrado."
    )

index = index.replace(old, new, 1)

# =========================================================
# 3. GATILHO DO AUTODL
# =========================================================

old = """    if (isGroup && groupData.autodl && budy2.includes('http') && !isCmd) {
      const urlMatch = body.match(/(https?:\\/\\/[^\\s]+)/g);
      if (urlMatch && urlMatch.length > 0) {
        // Processa apenas o primeiro link encontrado
        try {
          handleAutoDownload(nazu, from, urlMatch[0], info)
            .then(() => null)
            .catch((e) => {
              console.error('Erro no autodl:', e);
            });
        } catch (e) {
          console.error('Erro no autodl:', e);
        }
      }
    }
"""

new = """    if (
      isGroup &&
      (groupData.autodlMode || groupData.autodl) &&
      budy2.includes('http') &&
      !isCmd
    ) {
      const autoMode =
        groupData.autodlMode ||
        (groupData.autodl ? 'video' : 'off');

      const urlMatch =
        body.match(/(https?:\\/\\/[^\\s]+)/g);

      if (
        autoMode !== 'off' &&
        urlMatch &&
        urlMatch.length > 0
      ) {
        try {
          handleAutoDownload(
            nazu,
            from,
            urlMatch[0],
            info,
            autoMode
          )
            .then(() => null)
            .catch((e) => {
              console.error('Erro no autodl:', e);
            });
        } catch (e) {
          console.error('Erro no autodl:', e);
        }
      }
    }
"""

if old not in index:
    raise SystemExit(
        "ERRO: gatilho do AutoDL não encontrado."
    )

index = index.replace(old, new, 1)

# =========================================================
# 4. COMANDOS AUTODL
# =========================================================

start_marker = "      case 'autodl':"
end_marker = "      case 'antidoc':"

start = index.find(start_marker)
end = index.find(end_marker, start)

if start == -1:
    raise SystemExit(
        "ERRO: case 'autodl' não encontrado."
    )

if end == -1:
    raise SystemExit(
        "ERRO: final do bloco AutoDL não encontrado."
    )

new_commands = """      case 'autodl':
      case 'autodown':
      case 'autodlaudio':
      case 'autodlvideo':
      case 'autodloff':
        try {
          if (!isGroup) {
            return reply("Isso só pode ser usado em grupo 💔");
          }

          if (!isGroupAdmin) {
            return reply("Você precisa ser adm 💔");
          }

          const arg =
            String(q || '')
              .trim()
              .toLowerCase();

          let mode = null;

          if (
            command === 'autodlaudio' ||
            arg === 'audio'
          ) {
            mode = 'audio';
          }

          else if (
            command === 'autodlvideo' ||
            arg === 'video'
          ) {
            mode = 'video';
          }

          else if (
            command === 'autodloff' ||
            arg === 'off' ||
            arg === 'desligar'
          ) {
            mode = 'off';
          }

          if (mode) {
            groupData.autodlMode = mode;
            groupData.autodl = mode !== 'off';

            fs.writeFileSync(
              groupFile,
              JSON.stringify(groupData, null, 2)
            );
          }

          const current =
            groupData.autodlMode ||
            (groupData.autodl ? 'video' : 'off');

          let status;

          if (current === 'audio') {
            status = '🎵 ÁUDIO';
          }

          else if (current === 'video') {
            status = '🎬 VÍDEO';
          }

          else {
            status = '⛔ DESLIGADO';
          }

          await reply(
            `⚡ *AutoDL*\\n\\n` +
            `Status atual: *${status}*\\n\\n` +
            `🎵 /autodlaudio — baixar links em áudio\\n` +
            `🎬 /autodlvideo — baixar links em vídeo\\n` +
            `⛔ /autodloff — desligar\\n\\n` +
            `Também funciona:\\n` +
            `/autodl audio\\n` +
            `/autodl video\\n` +
            `/autodl off`
          );

        } catch (e) {
          console.error(e);
          await reply("Ocorreu um erro 💔");
        }

        break;
"""

index = index[:start] + new_commands + index[end:]

# =========================================================
# 5. SALVAR INDEX
# =========================================================

index_path.write_text(index)

# =========================================================
# 6. YOUTUBE VIDEO MAIS RÁPIDO
# =========================================================

old = """        /*
         * MAIOR QUALIDADE DISPONÍVEL.
         */
        '-f',
        'bv*+ba/b',
"""

new = """        /*
         * Limita a 720p e prioriza MP4/H264 + AAC.
         * Isso evita baixar formatos gigantes desnecessariamente.
         */
        '-f',
        `bv*[height<=${Number.isFinite(Number(onProgress)) ? Math.min(Math.max(Number(onProgress), 360), 720) : 720}][vcodec^=avc1][ext=mp4]+ba[acodec^=mp4a]/b[height<=${Number.isFinite(Number(onProgress)) ? Math.min(Math.max(Number(onProgress), 360), 720) : 720}][ext=mp4]/bv*[height<=${Number.isFinite(Number(onProgress)) ? Math.min(Math.max(Number(onProgress), 360), 720) : 720}]+ba/b[height<=${Number.isFinite(Number(onProgress)) ? Math.min(Math.max(Number(onProgress), 360), 720) : 720}]`,
"""

if old not in youtube:
    raise SystemExit(
        "ERRO: formato antigo do YouTube não encontrado."
    )

youtube = youtube.replace(old, new, 1)

old = """        '--concurrent-fragments',
        '16',
"""

new = """        '--concurrent-fragments',
        '8',
"""

if old not in youtube:
    raise SystemExit(
        "ERRO: configuração de fragmentos do YouTube não encontrada."
    )

youtube = youtube.replace(old, new, 1)

youtube_path.write_text(youtube)

print("OK: index.js atualizado.")
print("OK: AutoDL agora possui modos audio/video/off.")
print("OK: YouTube AutoDL respeita o modo.")
print("OK: YouTube vídeo limitado a 720p.")
print("OK: YouTube vídeo prioriza MP4/H264/AAC.")
print("OK: fragmentos reduzidos para 8.")
PY

echo
echo "🔎 Verificando sintaxe..."

node --check "$INDEX"
echo "✅ index.js OK"

node --check "$YOUTUBE"
echo "✅ youtube.js OK"

echo
echo "=============================================="
echo "           🌸 PATCH CONCLUÍDO"
echo "=============================================="
echo

echo "📌 Pinterest:"
echo "   /pinterest sukuna"
echo "   /pin sukuna"
echo "   /pinterest <link>"
echo

echo "⚡ AutoDL:"
echo "   /autodlaudio"
echo "   /autodlvideo"
echo "   /autodloff"
echo "   /autodl audio"
echo "   /autodl video"
echo "   /autodl off"
echo

echo "🎬 YouTube vídeo:"
echo "   máximo 720p"
echo "   prioridade MP4/H264/AAC"
echo "   8 fragmentos simultâneos"
echo

echo "📦 Backups:"
echo "   $INDEX.bak-media-v3-$STAMP"
echo "   $YOUTUBE.bak-media-v3-$STAMP"
echo

echo "✅ PRONTO"
