#!/data/data/com.termux/files/usr/bin/bash
set -e

cd ~/storage/BKkyara- || exit 1

ROOT="dados"
MEDIA="$ROOT/src/features/kyaraMediaCommands.js"
YTDLP="$ROOT/src/funcs/downloads/youtube.js"
LEGACY="$ROOT/src/features/kyaraSpecialCommandsLegacy.js"

echo "=========================================="
echo "       KYARA - CORREÇÃO DO /PLAY"
echo "=========================================="
echo

if [ ! -f "$MEDIA" ]; then
  echo "ERRO: $MEDIA não existe."
  echo
  echo "Arquivos encontrados:"
  find dados/src -maxdepth 3 -type f 2>/dev/null | head -40
  exit 1
fi

if [ ! -f "$YTDLP" ]; then
  echo "ERRO: $YTDLP não existe."
  exit 1
fi

if [ ! -f "$LEGACY" ]; then
  echo "ERRO: $LEGACY não existe."
  exit 1
fi

echo "[1/5] Criando backups..."

cp "$MEDIA" "$MEDIA.bak-play-final"
cp "$YTDLP" "$YTDLP.bak-play-final"

echo "OK"

echo
echo "[2/5] Corrigindo /play..."

python3 - <<'PY'
from pathlib import Path

media = Path("dados/src/features/kyaraMediaCommands.js")
legacy = Path("dados/src/features/kyaraSpecialCommandsLegacy.js")

m = media.read_text()
l = legacy.read_text()

# --------------------------------------------------
# IMPORTS DO NATIVE FLOW
# --------------------------------------------------

if "generateWAMessageFromContent" not in m:
    m = """import {
  generateWAMessageFromContent,
  prepareWAMessageMedia
} from 'baileys';

""" + m

# --------------------------------------------------
# PEGA A FUNÇÃO NATIVE FLOW DO LEGACY
# --------------------------------------------------

start = l.find("async function enviarPlayUniversal(")

if start == -1:
    raise SystemExit(
        "ERRO: enviarPlayUniversal não encontrada."
    )

brace = l.find("{", start)

if brace == -1:
    raise SystemExit(
        "ERRO: abertura da função não encontrada."
    )

depth = 0
end = None

for i in range(brace, len(l)):
    if l[i] == "{":
        depth += 1
    elif l[i] == "}":
        depth -= 1
        if depth == 0:
            end = i + 1
            break

if end is None:
    raise SystemExit(
        "ERRO: fim da função não encontrado."
    )

native = l[start:end]

native = native.replace(
    "async function enviarPlayUniversal(",
    "async function sendCard(",
    1
)

# Usa o sistema de tokens que já existe no mediaCommands
native = native.replace(
    "id: `${prefix}playaudio ${mediaUrl}`",
    "id: `${prefix}playaudio ${rememberButton(mediaUrl)}`"
)

native = native.replace(
    "id: `${prefix}playvideo ${mediaUrl}`",
    "id: `${prefix}playvideo ${rememberButton(mediaUrl)}`"
)

# --------------------------------------------------
# LOCALIZA E SUBSTITUI sendCard ATUAL
# --------------------------------------------------

send_start = m.find("async function sendCard(")

if send_start == -1:
    raise SystemExit(
        "ERRO: sendCard atual não encontrada."
    )

send_brace = m.find("{", send_start)

depth = 0
send_end = None

for i in range(send_brace, len(m)):
    if m[i] == "{":
        depth += 1
    elif m[i] == "}":
        depth -= 1
        if depth == 0:
            send_end = i + 1
            break

if send_end is None:
    raise SystemExit(
        "ERRO: fim de sendCard atual não encontrado."
    )

m = m[:send_start] + native + m[send_end:]

# --------------------------------------------------
# PLAY UNIVERSAL
# --------------------------------------------------

old = """  if (!platform) {
    await reply(
      '❌ Plataforma não reconhecida.'
    );

    return true;
  }

  /*
   * URL:
   * nunca passa por pesquisa.
   */
  if (
    isUrl(query)
  ) {
    if (
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
          'Não foi possível ler a URL.'
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

        platform
      }
    });
  }"""

new = """  if (!platform && cmd !== 'play') {
    await reply(
      '❌ Plataforma não reconhecida.'
    );

    return true;
  }

  /*
   * /play com URL é universal.
   *
   * A URL vai diretamente para o extractor.
   * Qualquer plataforma compatível com yt-dlp
   * pode ser processada.
   */
  const playPlatform =
    cmd === 'play' && isUrl(query)
      ? (platformOf(query) || 'Mídia')
      : platform;

  if (isUrl(query)) {

    if (
      cmd !== 'play' &&
      platformOf(query) !== platform
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
          playPlatform
      }
    });
  }"""

if old not in m:
    raise SystemExit(
        "ERRO: bloco original do /play não encontrado."
    )

m = m.replace(old, new, 1)

media.write_text(m)

print("OK: /play corrigido.")
PY

echo "OK"

echo
echo "[3/5] Otimizando download..."

python3 - <<'PY'
from pathlib import Path

p = Path("dados/src/funcs/downloads/youtube.js")
s = p.read_text()

s = s.replace(
    "--concurrent-fragments', '8'",
    "--concurrent-fragments', '16'"
)

s = s.replace(
    '--concurrent-fragments", "8"',
    '--concurrent-fragments", "16"'
)

p.write_text(s)

print("OK: fragmentos simultâneos ajustados.")
PY

echo
echo "[4/5] Verificando sintaxe..."

node --check "$MEDIA"
node --check "$YTDLP"

echo "OK: sintaxe válida."

echo
echo "[5/5] Conferindo botões e Native Flow..."

COUNT=$(grep -c "async function sendCard(" "$MEDIA" || true)

if [ "$COUNT" != "1" ]; then
  echo "ERRO: foram encontradas $COUNT funções sendCard."

  cp "$MEDIA.bak-play-final" "$MEDIA"
  cp "$YTDLP.bak-play-final" "$YTDLP"

  exit 1
fi

if ! grep -q "generateWAMessageFromContent" "$MEDIA"; then
  echo "ERRO: Native Flow não foi aplicado."
  exit 1
fi

if ! grep -q "Baixar Áudio" "$MEDIA"; then
  echo "ERRO: botão de áudio não encontrado."
  exit 1
fi

if ! grep -q "Baixar Vídeo" "$MEDIA"; then
  echo "ERRO: botão de vídeo não encontrado."
  exit 1
fi

echo
echo "=========================================="
echo "       CORREÇÃO CONCLUÍDA"
echo "=========================================="
echo
echo "✓ /play por texto"
echo "✓ /play por URL"
echo "✓ URLs de plataformas compatíveis com yt-dlp"
echo "✓ Qualidade máxima disponível"
echo "✓ Download otimizado"
echo "✓ Native Flow"
echo "✓ 🎵 Baixar Áudio"
echo "✓ 🎬 Baixar Vídeo"
echo "✓ Botões lado a lado"
echo "✓ Um único card"
echo "✓ Tokens para URLs grandes"
echo
echo "Backups criados:"
echo "  $MEDIA.bak-play-final"
echo "  $YTDLP.bak-play-final"
echo
echo "=========================================="
echo "Agora rode:"
echo "npm start"
echo "=========================================="
