#!/data/data/com.termux/files/usr/bin/bash
set -e

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP=".backup-play-visual-${STAMP}"

mkdir -p "$BACKUP"

cp -a dados/src/index.js "$BACKUP/index.js"
cp -a dados/src/funcs/downloads/youtube.js "$BACKUP/youtube.js"

echo "📦 Backup: $BACKUP"

python3 <<'PY'
from pathlib import Path
import re

root = Path(".")

idx = root / "dados/src/index.js"
yt = root / "dados/src/funcs/downloads/youtube.js"

s = idx.read_text(encoding="utf-8")
y = yt.read_text(encoding="utf-8")

# ============================================================
# 1. PLAY — BOTÕES LADO A LADO
# ============================================================

start = s.find("async function enviarResultadoPlayKyara")
if start == -1:
    raise SystemExit("❌ Função enviarResultadoPlayKyara não encontrada.")

# Procura o final da função antes do próximo marcador
end_marker = "// ==================== BOTÕES CLICÁVEIS NAZUNA ===================="
end = s.find(end_marker, start)

if end == -1:
    # fallback: procura o próximo grande comentário
    end = s.find("// ================================================================", start)

if end == -1:
    raise SystemExit("❌ Não consegui localizar o final do helper do PLAY.")

novo_helper = r'''async function enviarResultadoPlayKyara({
  nazu,
  from,
  info,
  video,
  prefix = '/'
}) {

  const data = video?.data

  if (!data?.url || !data?.videoId) {
    throw new Error('Resultado do YouTube incompleto.')
  }

  const title =
    String(data.title || 'Música')
      .slice(0, 180)

  const author =
    String(
      data.author?.name ||
      'YouTube'
    ).slice(0, 100)

  const duration =
    String(
      data.timestamp ||
      'Desconhecida'
    )

  const views =
    typeof data.views === 'number'
      ? data.views.toLocaleString('pt-BR')
      : String(data.views || '0')

  const thumbnail =
    data.thumbnail ||
    `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`

  /*
   * ============================================================
   * IMPORTANTE:
   *
   * Aqui usamos o sistema clássico de buttons do WhatsApp.
   *
   * Diferente do Native Flow que estava sendo usado antes,
   * esse formato permite que os dois botões apareçam
   * lado a lado.
   * ============================================================
   */

  const buttons = [

    {
      buttonId:
        `${prefix}playaudio ${data.videoId}`,

      buttonText: {
        displayText:
          '🎵 Baixar Áudio'
      },

      type: 1
    },

    {
      buttonId:
        `${prefix}playvideo ${data.videoId}`,

      buttonText: {
        displayText:
          '🎬 Baixar Vídeo'
      },

      type: 1
    }

  ]

  const caption =
    `🎵 *${title}*\n\n` +
    `👤 *Artista/Canal:* ${author}\n` +
    `⏱️ *Duração:* ${duration}\n` +
    `👀 *Visualizações:* ${views}\n\n` +
    `🌸 *Kyara*\n` +
    `Selecione o formato desejado:`

  /*
   * A própria API do Baileys prepara a mensagem
   * com imagem + botões.
   */

  await nazu.sendMessage(
    from,
    {
      image: {
        url: thumbnail
      },

      caption,

      footer:
        '🌸 Kyara • © Baki',

      buttons,

      headerType: 4
    },
    {
      quoted: info
    }
  )

  console.log(
    `[PLAY KYARA] ✅ Resultado enviado com botões lado a lado: ${title}`
  )
}

'''

s = s[:start] + novo_helper + s[end:]

print("✅ Interface PLAY alterada para botões lado a lado.")


# ============================================================
# 2. DOWNLOAD — ADICIONA PROGRESSO VISUAL
# ============================================================

# Substitui o case playaudio até playvideo
start = s.find("case 'playaudio':")
end = s.find("case 'playvideo':", start)

if start == -1 or end == -1:
    raise SystemExit("❌ Cases playaudio/playvideo não encontrados.")

audio_case = r'''case 'playaudio':
      case 'ytmaudio':

        try {

          const videoId =
            String(q || '')
              .trim()
              .split(/\s+/)[0]

          if (
            !videoId ||
            !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)
          ) {

            return reply(
              `❌ Música inválida.\n\n` +
              `Use:\n` +
              `${prefix}play <nome da música>`
            )

          }

          const videoUrl =
            `https://www.youtube.com/watch?v=${videoId}`

          /*
           * ========================================================
           * MENSAGEM DE PROGRESSO
           * ========================================================
           */

          let progressMessage = null
          let ultimoPercentual = -1
          let ultimoUpdate = 0

          const atualizarProgresso = async (percentual) => {

            const agora = Date.now()

            percentual =
              Math.max(
                1,
                Math.min(
                  100,
                  Math.round(Number(percentual) || 1
                )
              )

            /*
             * Evita editar dezenas de mensagens por segundo.
             * Atualiza no máximo uma vez a cada 1.5s,
             * mas sempre permite 1% e 100%.
             */

            if (
              percentual !== 100 &&
              percentual === ultimoPercentual
            ) {
              return
            }

            if (
              percentual !== 100 &&
              agora - ultimoUpdate < 1500
            ) {
              return
            }

            ultimoPercentual = percentual
            ultimoUpdate = agora

            const blocos =
              10

            const completos =
              Math.round(
                (percentual / 100) * blocos
              )

            const barra =
              '█'.repeat(completos) +
              '░'.repeat(
                Math.max(
                  0,
                  blocos - completos
                )
              )

            const texto =
              `╭━━━〔 🎵 *KYARA PLAY* 〕━━━╮\n` +
              `│\n` +
              `│ 🎵 *Baixando áudio...*\n` +
              `│\n` +
              `│ [${barra}] *${percentual}%*\n` +
              `│\n` +
              `│ ⏳ Aguarde...\n` +
              `│\n` +
              `╰━━━━━━━━━━━━━━━━━━━━╯`

            try {

              if (!progressMessage) {

                progressMessage =
                  await nazu.sendMessage(
                    from,
                    {
                      text: texto
                    },
                    {
                      quoted: info
                    }
                  )

              } else {

                await nazu.sendMessage(
                  from,
                  {
                    text: texto,

                    edit:
                      progressMessage.key
                  }
                )

              }

            } catch (err) {

              console.log(
                '[PLAY PROGRESS] Falha ao editar:',
                err?.message
              )

            }

          }

          await atualizarProgresso(1)

          /*
           * O youtube.js agora recebe callback de progresso.
           */

          const dlRes =
            await youtube.mp3(
              videoUrl,
              atualizarProgresso
            )

          if (!dlRes?.ok) {

            if (progressMessage) {

              await nazu.sendMessage(
                from,
                {
                  text:
                    `❌ *Download falhou*\n\n` +
                    `${dlRes?.msg || 'Erro desconhecido.'}`,

                  edit:
                    progressMessage.key
                }
              )

            }

            return
          }

          await atualizarProgresso(100)

          /*
           * Pequena pausa para o usuário conseguir ver
           * o 100% antes do arquivo chegar.
           */

          await new Promise(
            resolve =>
              setTimeout(resolve, 400)
          )

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
          )

          console.log(
            `[PLAY AUDIO] ✅ Áudio enviado: ${videoId}`
          )

        } catch (error) {

          console.error(
            '[PLAY AUDIO] ❌',
            error
          )

          return reply(
            '❌ Não foi possível baixar o áudio.'
          )

        }

        break;


      '''

s = s[:start] + audio_case + s[end:]

# localizar novamente playvideo
start = s.find("case 'playvideo':")
# vai até o próximo case após ele
end = s.find("break;", start)

if start == -1 or end == -1:
    raise SystemExit("❌ Case playvideo não encontrado.")

# inclui o break;
end += len("break;")

video_case = r'''case 'playvideo':
      case 'ytmvideo':

        try {

          const videoId =
            String(q || '')
              .trim()
              .split(/\s+/)[0]

          if (
            !videoId ||
            !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)
          ) {

            return reply(
              `❌ Vídeo inválido.\n\n` +
              `Use:\n` +
              `${prefix}play <nome da música>`
            )

          }

          const videoUrl =
            `https://www.youtube.com/watch?v=${videoId}`

          let progressMessage = null
          let ultimoPercentual = -1
          let ultimoUpdate = 0

          const atualizarProgresso = async (percentual) => {

            const agora = Date.now()

            percentual =
              Math.max(
                1,
                Math.min(
                  100,
                  Math.round(Number(percentual) || 1
                )
              )

            if (
              percentual !== 100 &&
              percentual === ultimoPercentual
            ) {
              return
            }

            if (
              percentual !== 100 &&
              agora - ultimoUpdate < 1500
            ) {
              return
            }

            ultimoPercentual = percentual
            ultimoUpdate = agora

            const completos =
              Math.round(
                (percentual / 100) * 10
              )

            const barra =
              '█'.repeat(completos) +
              '░'.repeat(
                Math.max(
                  0,
                  10 - completos
                )
              )

            const texto =
              `╭━━━〔 🎬 *KYARA PLAY* 〕━━━╮\n` +
              `│\n` +
              `│ 🎬 *Baixando vídeo...*\n` +
              `│\n` +
              `│ [${barra}] *${percentual}%*\n` +
              `│\n` +
              `│ ⏳ Aguarde...\n` +
              `│\n` +
              `╰━━━━━━━━━━━━━━━━━━━━╯`

            try {

              if (!progressMessage) {

                progressMessage =
                  await nazu.sendMessage(
                    from,
                    {
                      text: texto
                    },
                    {
                      quoted: info
                    }
                  )

              } else {

                await nazu.sendMessage(
                  from,
                  {
                    text: texto,

                    edit:
                      progressMessage.key
                  }
                )

              }

            } catch (err) {

              console.log(
                '[PLAY PROGRESS] Falha ao editar:',
                err?.message
              )

            }

          }

          await atualizarProgresso(1)

          const dlRes =
            await youtube.mp4(
              videoUrl,
              atualizarProgresso
            )

          if (!dlRes?.ok) {

            if (progressMessage) {

              await nazu.sendMessage(
                from,
                {
                  text:
                    `❌ *Download falhou*\n\n` +
                    `${dlRes?.msg || 'Erro desconhecido.'}`,

                  edit:
                    progressMessage.key
                }
              )

            }

            return
          }

          await atualizarProgresso(100)

          await new Promise(
            resolve =>
              setTimeout(resolve, 400)
          )

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
          )

          console.log(
            `[PLAY VIDEO] ✅ Vídeo enviado: ${videoId}`
          )

        } catch (error) {

          console.error(
            '[PLAY VIDEO] ❌',
            error
          )

          return reply(
            '❌ Não foi possível baixar o vídeo.'
          )

        }

        break;'''

s = s[:start] + video_case + s[end:]

idx.write_text(s, encoding="utf-8")

print("✅ Download agora possui mensagem de progresso.")


# ============================================================
# 3. YOUTUBE.JS — PROGRESSO REAL DO YT-DLP
# ============================================================

# Adiciona spawn
if "import { spawn } from 'child_process'" not in y:
    y = y.replace(
        "import { execFile } from 'child_process'",
        "import { execFile, spawn } from 'child_process'"
    )

# Adiciona função executar com progresso
marker = "function extrairJson(stdout) {"

if "function executarYtDlpComProgresso" not in y:

    helper = r'''
async function executarYtDlpComProgresso(args, onProgress) {

  return await new Promise((resolve, reject) => {

    const processo =
      spawn(
        'yt-dlp',
        [
          ...args,

          '--newline',

          '--progress-template',
          'download:%(progress._percent_str)s'
        ],
        {
          stdio: [
            'ignore',
            'pipe',
            'pipe'
          ]
        }
      )

    let stdout = ''
    let stderr = ''

    processo.stdout.on(
      'data',
      chunk => {

        const texto =
          String(chunk)

        stdout += texto

        const matches =
          texto.matchAll(
            /(\d+(?:\.\d+)?)%/g
          )

        for (const match of matches) {

          const percentual =
            Number(match[1])

          if (
            Number.isFinite(percentual) &&
            onProgress
          ) {

            Promise.resolve(
              onProgress(percentual)
            ).catch(() => {})

          }

        }

      }
    )

    processo.stderr.on(
      'data',
      chunk => {

        stderr +=
          String(chunk)

      }
    )

    processo.on(
      'error',
      reject
    )

    processo.on(
      'close',
      code => {

        if (code === 0) {

          resolve({
            stdout:
              stdout.trim(),

            stderr:
              stderr.trim()
          })

        } else {

          reject(
            new Error(
              stderr.trim() ||
              stdout.trim() ||
              `yt-dlp encerrou com código ${code}`
            )
          )

        }

      }
    )

  })

}

'''

    y = y.replace(
        marker,
        helper + marker,
        1
    )

    print("✅ Executor de download com progresso criado.")


# ------------------------------------------------------------
# MP3
# ------------------------------------------------------------

mp3_start = y.find("async function mp3(url)")
mp4_start = y.find("async function mp4(url)", mp3_start)

if mp3_start == -1 or mp4_start == -1:
    raise SystemExit("❌ Não encontrei mp3/mp4 no youtube.js.")

novo_mp3 = r'''async function mp3(url, onProgress) {

  const pasta = path.join(
    process.cwd(),
    '.tmp-youtube',
    `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  )

  fs.mkdirSync(
    pasta,
    {
      recursive: true
    }
  )

  try {

    const saida =
      path.join(
        pasta,
        'audio.%(ext)s'
      )

    await executarYtDlpComProgresso(
      [
        '--no-playlist',
        '--no-warnings',

        '-f',
        'bestaudio/best',

        '--extract-audio',
        '--audio-format',
        'mp3',

        '--audio-quality',
        '128K',

        '--no-part',

        '--output',
        saida,

        url
      ],

      onProgress
    )

    if (onProgress) {
      await onProgress(100)
    }

    const arquivos =
      fs.readdirSync(pasta)

    const arquivo =
      arquivos.find(
        nome =>
          nome
            .toLowerCase()
            .endsWith('.mp3')
      )

    if (!arquivo) {
      throw new Error(
        'O áudio não foi gerado pelo FFmpeg.'
      )
    }

    const caminho =
      path.join(
        pasta,
        arquivo
      )

    const buffer =
      fs.readFileSync(caminho)

    if (!buffer.length) {
      throw new Error(
        'O arquivo de áudio ficou vazio.'
      )
    }

    return {
      ok: true,

      buffer,

      title:
        'YouTube Audio',

      thumbnail:
        '',

      filename:
        'audio.mp3'
    }

  } catch (err) {

    console.error(
      '[YOUTUBE MP3]',
      err
    )

    return {
      ok: false,

      msg:
        err.message
    }

  } finally {

    try {

      fs.rmSync(
        pasta,
        {
          recursive: true,
          force: true
        }
      )

    } catch {}

  }

}

'''

y = y[:mp3_start] + novo_mp3 + y[mp4_start:]


# ------------------------------------------------------------
# MP4
# ------------------------------------------------------------

mp4_start = y.find("async function mp4(url)")

# Procura export default no final
end = y.find("export default", mp4_start)

if end == -1:
    end = len(y)

novo_mp4 = r'''async function mp4(url, onProgress) {

  const pasta =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'kyara-youtube-video-'
      )
    )

  try {

    const saida =
      path.join(
        pasta,
        'video.%(ext)s'
      )

    await executarYtDlpComProgresso(
      [
        '--no-playlist',
        '--no-warnings',

        '-f',
        'bv*+ba/b',

        '--merge-output-format',
        'mp4',

        '--no-part',

        '--output',
        saida,

        url
      ],

      onProgress
    )

    if (onProgress) {
      await onProgress(100)
    }

    const arquivos =
      fs.readdirSync(pasta)

    const arquivo =
      arquivos.find(
        nome =>
          nome
            .toLowerCase()
            .endsWith('.mp4')
      )

    if (!arquivo) {
      throw new Error(
        'O vídeo não foi gerado pelo FFmpeg.'
      )
    }

    const caminho =
      path.join(
        pasta,
        arquivo
      )

    const buffer =
      fs.readFileSync(caminho)

    if (!buffer.length) {
      throw new Error(
        'O arquivo de vídeo ficou vazio.'
      )
    }

    return {
      ok: true,

      buffer,

      title:
        'YouTube Video',

      thumbnail:
        '',

      filename:
        'video.mp4'
    }

  } catch (err) {

    console.error(
      '[YOUTUBE MP4]',
      err
    )

    return {
      ok: false,

      msg:
        err.message
    }

  } finally {

    try {

      fs.rmSync(
        pasta,
        {
          recursive: true,
          force: true
        }
      )

    } catch {}

  }

}

'''

y = y[:mp4_start] + novo_mp4 + y[end:]

yt.write_text(y, encoding="utf-8")

print("✅ yt-dlp agora fornece progresso para o PLAY.")

PY

echo
echo "============================================"
echo "🔎 VALIDANDO"
echo "============================================"

node --check dados/src/index.js
node --check dados/src/funcs/downloads/youtube.js

echo
echo "✅ index.js OK"
echo "✅ youtube.js OK"

echo
echo "=== BOTÕES ==="
grep -n "Baixar Áudio\|Baixar Vídeo" dados/src/index.js | head -10

echo
echo "=== PROGRESSO ==="
grep -n "executarYtDlpComProgresso\|atualizarProgresso" \
  dados/src/index.js \
  dados/src/funcs/downloads/youtube.js | head -20

echo
echo "============================================"
echo "✅ CORREÇÃO INSTALADA"
echo "============================================"
echo
echo "Execute:"
echo
echo "npm start"
echo
echo "Teste:"
echo
echo "/play Believer"
echo
echo "Os botões devem aparecer:"
echo
echo "[ 🎵 Baixar Áudio ] [ 🎬 Baixar Vídeo ]"
echo
echo "Ao clicar, o progresso será atualizado automaticamente."
echo
