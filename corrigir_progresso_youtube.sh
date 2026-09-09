#!/data/data/com.termux/files/usr/bin/bash
set -e

FILE="dados/src/funcs/downloads/youtube.js"

echo "============================================"
echo "🔧 CORRIGINDO PROGRESSO DO PLAY"
echo "============================================"
echo

if [ ! -f "$FILE" ]; then
  echo "❌ Arquivo não encontrado: $FILE"
  exit 1
fi

BACKUP=".backup-youtube-progress-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
cp "$FILE" "$BACKUP/youtube.js"

echo "📦 Backup: $BACKUP"

python3 - "$FILE" <<'PY'
from pathlib import Path
import sys
import re

file = Path(sys.argv[1])
s = file.read_text(encoding="utf-8")

# ------------------------------------------------------------
# 1. Troca o executor interno por um executor com progresso.
# ------------------------------------------------------------

start = s.find("async function executarYtDlp(args) {")
end = s.find("\nfunction extrairJson", start)

if start == -1 or end == -1:
    raise SystemExit(
        "❌ Não encontrei a função executarYtDlp na estrutura esperada."
    )

novo_executor = r'''async function executarYtDlp(args, onProgress = null) {
  return new Promise((resolve, reject) => {
    const processo = spawn(
      'yt-dlp',
      ['--newline', '--progress', ...args],
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
        const encontrados = texto.matchAll(
          /\[download\]\s+(\d+(?:\.\d+)?)%/g
        )

        for (const encontrado of encontrados) {
          const valor = Number(encontrado[1])

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

    processo.on('error', error => {
      reject(error)
    })

    processo.on('close', codigo => {
      if (codigo === 0) {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim()
        })
        return
      }

      const mensagem =
        stderr.trim() ||
        stdout.trim() ||
        `yt-dlp terminou com código ${codigo}`

      reject(new Error(mensagem))
    })
  })
}
'''

s = s[:start] + novo_executor + s[end:]

# ------------------------------------------------------------
# 2. Importa spawn.
# ------------------------------------------------------------

s = s.replace(
    "import { execFile } from 'child_process'",
    "import { spawn } from 'child_process'",
    1
)

# ------------------------------------------------------------
# 3. MP3 aceita callback de progresso.
# ------------------------------------------------------------

s = s.replace(
    "async function mp3(url) {",
    "async function mp3(url, options = {}) {",
    1
)

mp3_start = s.find("async function mp3(")
mp4_start = s.find("\n/**\n * Baixa vídeo MP4", mp3_start)

if mp3_start == -1 or mp4_start == -1:
    raise SystemExit("❌ Estrutura da função MP3 não encontrada.")

mp3_block = s[mp3_start:mp4_start]

# Só altera o PRIMEIRO executarYtDlp do MP3.
mp3_block = mp3_block.replace(
    "await executarYtDlp([",
    "await executarYtDlp([",
    1
)

# Adiciona callback no fechamento do download.
match = re.search(
    r"(await executarYtDlp\(\[[\s\S]*?\n\s*url\n\s*\])",
    mp3_block
)

if not match:
    raise SystemExit(
        "❌ Chamada de download MP3 não encontrada."
    )

chamada = match.group(1)

if "options.onProgress" not in chamada:
    nova_chamada = chamada[:-2] + ", options.onProgress)"
    mp3_block = (
        mp3_block[:match.start()] +
        nova_chamada +
        mp3_block[match.end():]
    )

s = s[:mp3_start] + mp3_block + s[mp4_start:]

# ------------------------------------------------------------
# 4. MP4 aceita callback de progresso.
# ------------------------------------------------------------

s = s.replace(
    "async function mp4(url) {",
    "async function mp4(url, options = {}) {",
    1
)

mp4_start = s.find("async function mp4(")
export_start = s.find("\nexport {", mp4_start)

if mp4_start == -1 or export_start == -1:
    raise SystemExit("❌ Estrutura da função MP4 não encontrada.")

mp4_block = s[mp4_start:export_start]

match = re.search(
    r"(await executarYtDlp\(\[[\s\S]*?\n\s*url\n\s*\])",
    mp4_block
)

if not match:
    raise SystemExit(
        "❌ Chamada de download MP4 não encontrada."
    )

chamada = match.group(1)

if "options.onProgress" not in chamada:
    nova_chamada = chamada[:-2] + ", options.onProgress)"
    mp4_block = (
        mp4_block[:match.start()] +
        nova_chamada +
        mp4_block[match.end():]
    )

s = s[:mp4_start] + mp4_block + s[export_start:]

file.write_text(s, encoding="utf-8")

print("PATCH_OK")
PY

echo
echo "============================================"
echo "🔎 VALIDANDO SINTAXE"
echo "============================================"

node --check "$FILE"

echo
echo "============================================"
echo "✅ PROGRESSO CORRIGIDO"
echo "============================================"
echo
echo "🎵 MP3: progresso 1% → 100%"
echo "🎬 MP4: progresso 1% → 100%"
echo "📝 Uma única mensagem será atualizada."
echo
echo "Agora execute:"
echo
echo "npm start"
echo
echo "Teste:"
echo "/play Believer"
echo
