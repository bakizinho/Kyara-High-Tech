#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$(pwd)"
INDEX="$ROOT/dados/src/index.js"
YOUTUBE="$ROOT/dados/src/funcs/downloads/youtube.js"

echo "============================================"
echo "🚀 BKkyara — PLAY RÁPIDO"
echo "============================================"
echo

if [ ! -f "$INDEX" ] || [ ! -f "$YOUTUBE" ]; then
  echo "❌ Arquivos do PLAY não encontrados."
  exit 1
fi

TMP_INDEX="$INDEX.play.tmp"
TMP_YOUTUBE="$YOUTUBE.play.tmp"

cleanup() {
  rm -f "$TMP_INDEX" "$TMP_YOUTUBE"
}
trap cleanup EXIT

# ============================================================
# 1. YOUTUBE.JS
# ============================================================

python3 - "$YOUTUBE" "$TMP_YOUTUBE" <<'PY'
from pathlib import Path
import sys

src = Path(sys.argv[1])
dst = Path(sys.argv[2])

s = src.read_text(encoding="utf-8")

# ------------------------------------------------------------
# Executor yt-dlp com progresso + otimização de velocidade.
# ------------------------------------------------------------

a = s.find("async function executarYtDlp(args) {")
b = s.find("\nfunction extrairJson", a)

if a == -1 or b == -1:
    raise SystemExit("❌ Estrutura executarYtDlp não encontrada.")

executor = r'''async function executarYtDlp(args, onProgress = null) {
  return new Promise((resolve, reject) => {
    const processo = spawn(
      'yt-dlp',
      [
        '--newline',
        '--progress',
        '--no-warnings',
        '--retries', '2',
        '--fragment-retries', '2',
        '--socket-timeout', '15',
        ...args
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )

    let stdout = ''
    let stderr = ''

    const processar = (chunk, destino) => {
      const texto = String(chunk || '')

      if (destino === 'stdout') {
        stdout += texto
      } else {
        stderr += texto
      }

      if (typeof onProgress === 'function') {
        const matches = texto.matchAll(
          /\[download\]\s+(\d+(?:\.\d+)?)%/g
        )

        for (const match of matches) {
          const valor = Number(match[1])

          if (Number.isFinite(valor)) {
            try {
              onProgress(
                Math.max(0, Math.min(100, valor))
              )
            } catch {}
          }
        }
      }
    }

    processo.stdout.on(
      'data',
      chunk => processar(chunk, 'stdout')
    )

    processo.stderr.on(
      'data',
      chunk => processar(chunk, 'stderr')
    )

    processo.on('error', reject)

    processo.on('close', codigo => {
      if (codigo === 0) {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim()
        })
        return
      }

      reject(
        new Error(
          stderr.trim() ||
          stdout.trim() ||
          `yt-dlp terminou com código ${codigo}`
        )
      )
    })
  })
}
'''

s = s[:a] + executor + s[b:]

# Import correto do spawn.
s = s.replace(
    "import { execFile } from 'child_process'",
    "import { execFile, spawn } from 'child_process'",
    1
)

# ------------------------------------------------------------
# Search mais rápido.
# ------------------------------------------------------------

old_search = """    const resultado = await executarYtDlp([
      '--no-playlist',
      '--flat-playlist',
      '--dump-single-json',
      `ytsearch1:${query.trim()}`
    ])"""

new_search = """    const resultado = await executarYtDlp([
      '--no-playlist',
      '--flat-playlist',
      '--dump-single-json',
      '--skip-download',
      `ytsearch1:${query.trim()}`
    ])"""

s = s.replace(old_search, new_search, 1)

# ------------------------------------------------------------
# MP3
# ------------------------------------------------------------

a = s.find("async function mp3(url)")
b = s.find("\n/**\n * Baixa vídeo MP4", a)

if a == -1 or b == -1:
    raise SystemExit("❌ Função MP3 não encontrada.")

mp3 = s[a:b]

mp3 = mp3.replace(
    "async function mp3(url) {",
    "async function mp3(url, options = {}) {",
    1
)

old = """    await executarYtDlp([
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
    ])"""

new = """    await executarYtDlp([
      '--no-playlist',
      '-f',
      'bestaudio/best',
      '--extract-audio',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '128K',
      '--postprocessor-args',
      'ffmpeg:-threads 0',
      '--no-part',
      '--output',
      saida,
      url
    ], options.onProgress)"""

if old not in mp3:
    raise SystemExit("❌ Chamada MP3 não encontrada.")

mp3 = mp3.replace(old, new, 1)

s = s[:a] + mp3 + s[b:]

# ------------------------------------------------------------
# MP4
# ------------------------------------------------------------

a = s.find("async function mp4(url)")
b = s.find("\nexport {", a)

if a == -1 or b == -1:
    raise SystemExit("❌ Função MP4 não encontrada.")

mp4 = s[a:b]

mp4 = mp4.replace(
    "async function mp4(url) {",
    "async function mp4(url, options = {}) {",
    1
)

old = """    await executarYtDlp([
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
    ])"""

new = """    await executarYtDlp([
      '--no-playlist',
      '-f',
      'bv*[height<=360]+ba/b[height<=360]/b',
      '--merge-output-format',
      'mp4',
      '--postprocessor-args',
      'ffmpeg:-threads 0',
      '--no-part',
      '--output',
      saida,
      url
    ], options.onProgress)"""

if old not in mp4:
    raise SystemExit("❌ Chamada MP4 não encontrada.")

mp4 = mp4.replace(old, new, 1)

s = s[:a] + mp4 + s[b:]

# Adiciona export spawn já utilizado.
dst.write_text(s, encoding="utf-8")

print("YOUTUBE_TMP_OK")
PY

# ============================================================
# 2. INDEX.JS
# ============================================================

python3 - "$INDEX" "$TMP_INDEX" <<'PY'
from pathlib import Path
import sys

src = Path(sys.argv[1])
dst = Path(sys.argv[2])

s = src.read_text(encoding="utf-8")

# ============================================================
# BOTÕES DO PLAY
# ============================================================

marker = "    switch (command) {"

if marker not in s:
    raise SystemExit("❌ switch(command) não encontrado.")

helper = r'''
    // ============================================================
    // 🌸 BKkyara — PLAY INTERATIVO
    // ============================================================

    async function enviarPlayInterativo(video) {
      const thumbnail = video?.thumbnail || '';
      let imageMessage = null;

      if (thumbnail) {
        try {
          const respostaImagem = await axios.get(
            thumbnail,
            {
              responseType: 'arraybuffer',
              timeout: 5000,
              maxContentLength: 5 * 1024 * 1024
            }
          );

          const preparado = await prepareWAMessageMedia(
            {
              image: Buffer.from(respostaImagem.data)
            },
            {
              upload: nazu.waUploadToServer
            }
          );

          imageMessage =
            preparado?.imageMessage || null;
        } catch (e) {
          console.log(
            '[PLAY] Não foi possível preparar thumbnail:',
            e?.message || e
          );
        }
      }

      const encodedUrl =
        encodeURIComponent(video.url);

      const buttons = [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '🎵 Baixar Áudio',
            id: `${prefix}playaudio:${encodedUrl}`
          })
        },
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '🎬 Baixar Vídeo',
            id: `${prefix}playvideo:${encodedUrl}`
          })
        }
      ];

      const views =
        typeof video.views === 'number'
          ? video.views.toLocaleString('pt-BR')
          : String(video.views || '0');

      const body =
        `🎵 *${video.title}*\n\n` +
        `👤 *Artista/Canal:* ${video.author?.name || 'YouTube'}\n` +
        `⏱️ *Duração:* ${video.timestamp || 'Desconhecida'}\n` +
        `👀 *Visualizações:* ${views}\n\n` +
        `🌸 *Kyara*\n` +
        `Selecione o formato desejado:`;

      const msg = generateWAMessageFromContent(
        from,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2
              },

              interactiveMessage: {
                ...(imageMessage
                  ? {
                      header: {
                        hasMediaAttachment: true,
                        imageMessage
                      }
                    }
                  : {}),

                body: {
                  text: body
                },

                footer: {
                  text: 'Kyara • © Baki'
                },

                nativeFlowMessage: {
                  buttons,
                  messageParamsJson: '{}',
                  messageVersion: 1
                }
              }
            }
          }
        },
        {
          quoted: info,
          userJid: nazu?.user?.id
        }
      );

      const bizNode = {
        tag: 'biz',
        attrs: {
          actual_actors: '2',
          host_storage: '2',
          privacy_mode_ts: String(
            Math.floor(Date.now() / 1000) - 77980457
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
              source_type: 'third_party'
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
          messageId: msg.key.id,
          additionalNodes
        }
      );

      console.log(
        '[PLAY] Seleção enviada:',
        video.title
      );
    }

    async function baixarPlayRapido(
      tipo,
      url
    ) {
      const emoji =
        tipo === 'audio' ? '🎵' : '🎬';

      const nome =
        tipo === 'audio'
          ? 'áudio'
          : 'vídeo';

      let progressoAtual = 0;
      let ultimaAtualizacao = 0;

      const progresso = await nazu.sendMessage(
        from,
        {
          text:
            `${emoji} *Preparando ${nome}...*\n\n` +
            `⏳ *1%*`
        },
        {
          quoted: info
        }
      );

      const atualizar = async valor => {
        const porcentagem = Math.max(
          1,
          Math.min(
            100,
            Math.floor(Number(valor) || 1)
          )
        );

        const agora = Date.now();

        if (
          porcentagem !== 100 &&
          porcentagem === progressoAtual
        ) {
          return;
        }

        if (
          porcentagem !== 100 &&
          agora - ultimaAtualizacao < 450
        ) {
          return;
        }

        progressoAtual = porcentagem;
        ultimaAtualizacao = agora;

        const blocos =
          Math.floor(porcentagem / 10);

        const barra =
          '█'.repeat(blocos) +
          '░'.repeat(10 - blocos);

        try {
          await nazu.sendMessage(
            from,
            {
              text:
                `${emoji} *Baixando ${nome}...*\n\n` +
                `[${barra}] *${porcentagem}%*\n` +
                `⚡ Processamento rápido`
            },
            {
              edit: progresso.key
            }
          );
        } catch {}
      };

      try {
        const resultado =
          tipo === 'audio'
            ? await youtube.mp3(
                url,
                {
                  onProgress: atualizar
                }
              )
            : await youtube.mp4(
                url,
                {
                  onProgress: atualizar
                }
              );

        if (!resultado?.ok) {
          await nazu.sendMessage(
            from,
            {
              text:
                `❌ Não foi possível baixar o ${nome}.\n\n` +
                `${resultado?.msg || 'Erro desconhecido.'}`
            },
            {
              edit: progresso.key
            }
          );

          return;
        }

        await atualizar(100);

        if (tipo === 'audio') {
          await nazu.sendMessage(
            from,
            {
              audio: resultado.buffer,
              mimetype: 'audio/mpeg',
              fileName:
                resultado.filename || 'audio.mp3'
            },
            {
              quoted: info
            }
          );
        } else {
          await nazu.sendMessage(
            from,
            {
              video: resultado.buffer,
              mimetype: 'video/mp4',
              fileName:
                resultado.filename || 'video.mp4'
            },
            {
              quoted: info
            }
          );
        }

        try {
          await nazu.sendMessage(
            from,
            {
              text:
                `${emoji} *${nome[0].toUpperCase() + nome.slice(1)} enviado com sucesso!* ✅`
            },
            {
              edit: progresso.key
            }
          );
        } catch {}

      } catch (error) {
        console.error(
          `[PLAY ${tipo.toUpperCase()}]`,
          error
        );

        try {
          await nazu.sendMessage(
            from,
            {
              text:
                `❌ Erro ao baixar o ${nome}.\n\n` +
                `${error?.message || 'Erro desconhecido.'}`
            },
            {
              edit: progresso.key
            }
          );
        } catch {}
      }
    }

'''

s = s.replace(
    marker,
    helper + marker,
    1
)

# ============================================================
# BOTÃO CLICADO: playaudio:<URL> / playvideo:<URL>
# ============================================================

needle = "    var command = isCmd ? matchedAlias ? matchedAlias.command : normalizar(bodyWithoutPrefix.split(/ +/).shift().trim()).replace(/\\s+/g, '') : null;"

if needle not in s:
    raise SystemExit(
        "❌ Declaração de command não encontrada."
    )

button_parser = r'''
    // ============================================================
    // PLAY — RECEBE CLIQUE DO BOTÃO COM URL CODIFICADA
    // ============================================================

    if (
      isCmd &&
      typeof command === 'string'
    ) {
      const playButton =
        command.match(
          /^play(audio|video):(.+)$/i
        );

      if (playButton) {
        const tipo =
          playButton[1].toLowerCase();

        try {
          q = decodeURIComponent(
            playButton[2]
          );
        } catch {
          q = playButton[2];
        }

        command =
          tipo === 'audio'
            ? 'playaudio'
            : 'playvideo';
      }
    }

'''

s = s.replace(
    needle,
    needle + "\n" + button_parser,
    1
)

# ============================================================
# SUBSTITUI O PLAY ANTIGO
# ============================================================

a = s.find("      case 'play':")
b = s.find("      case 'spotifydl':", a)

if a == -1 or b == -1:
    raise SystemExit(
        "❌ Bloco principal do PLAY não encontrado."
    )

novo_play = r'''      case 'play':
      case 'ytmp3':
        try {
          if (!q?.trim()) {
            return reply(
              `╭━━━〔 🎵 *PLAY* 〕━━━╮\n` +
              `│\n` +
              `│ 🔎 Pesquise uma música ou envie\n` +
              `│ um link do YouTube.\n` +
              `│\n` +
              `│ 📌 Exemplo:\n` +
              `│ ${prefix}play Believer\n` +
              `│\n` +
              `╰━━━━━━━━━━━━━━━━━━━━╯`
            );
          }

          const busca =
            q.trim();

          // Link direto: não faz busca.
          if (
            busca.includes('youtube.com') ||
            busca.includes('youtu.be')
          ) {
            const resultado = {
              videoId: '',
              url: busca,
              title: 'Vídeo do YouTube',
              description: '',
              thumbnail: '',
              seconds: 0,
              timestamp: 'Desconhecida',
              views: 0,
              ago: '',
              author: {
                name: 'YouTube'
              }
            };

            try {
              await enviarPlayInterativo(
                resultado
              );
            } catch (e) {
              console.error(
                '[PLAY] Erro interface direta:',
                e
              );

              return reply(
                '❌ Não consegui montar os botões do PLAY.'
              );
            }

            return;
          }

          console.log(
            `[PLAY] Pesquisando: ${busca}`
          );

          const resultado =
            await youtube.search(busca);

          if (!resultado?.ok) {
            return reply(
              `❌ ${resultado?.msg || 'Nenhum resultado encontrado.'}`
            );
          }

          const video =
            resultado.data;

          if (
            video.seconds &&
            video.seconds > 1800
          ) {
            return reply(
              `⚠️ Este vídeo possui *${video.timestamp}*.\n` +
              `O limite do PLAY é 30 minutos.`
            );
          }

          await enviarPlayInterativo(
            video
          );

          return;

        } catch (error) {
          console.error(
            'Erro no comando PLAY:',
            error
          );

          return reply(
            '❌ Ocorreu um erro ao pesquisar no YouTube.'
          );
        }

      case 'playaudio':
        try {
          if (!q?.trim()) {
            return reply(
              '❌ Música não identificada.'
            );
          }

          await baixarPlayRapido(
            'audio',
            q.trim()
          );

          return;

        } catch (error) {
          console.error(
            '[PLAY AUDIO]',
            error
          );

          return reply(
            '❌ Erro ao baixar o áudio.'
          );
        }

      case 'playvideo':
        try {
          if (!q?.trim()) {
            return reply(
              '❌ Vídeo não identificado.'
            );
          }

          await baixarPlayRapido(
            'video',
            q.trim()
          );

          return;

        } catch (error) {
          console.error(
            '[PLAY VIDEO]',
            error
          );

          return reply(
            '❌ Erro ao baixar o vídeo.'
          );
        }

'''

s = s[:a] + novo_play + s[b:]

# Escreve somente o arquivo temporário.
dst.write_text(s, encoding="utf-8")

print("INDEX_TMP_OK")
PY

echo
echo "============================================"
echo "🔎 VALIDANDO ANTES DE INSTALAR"
echo "============================================"

node --check "$TMP_YOUTUBE"
echo "✅ youtube.js: OK"

node --check "$TMP_INDEX"
echo "✅ index.js: OK"

echo
echo "============================================"
echo "📥 INSTALANDO"
echo "============================================"

mv "$TMP_YOUTUBE" "$YOUTUBE"
mv "$TMP_INDEX" "$INDEX"

echo "✅ youtube.js instalado."
echo "✅ index.js instalado."

echo
echo "============================================"
echo "🚀 PLAY ATUALIZADO"
echo "============================================"
echo
echo "🎵 Pesquisa:"
echo "   /play Believer"
echo
echo "🎛️ Botões:"
echo "   [ 🎵 Baixar Áudio ] [ 🎬 Baixar Vídeo ]"
echo
echo "⚡ Download otimizado."
echo "📊 Progresso: 1% → 100%"
echo "🌸 Interface Kyara."
echo
echo "Agora:"
echo "npm start"
echo
