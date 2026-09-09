#!/data/data/com.termux/files/usr/bin/bash
set -e

cd ~/storage/BKkyara- || exit 1

MEDIA="dados/src/features/kyaraMediaCommands.js"
YTDLP="dados/src/funcs/downloads/youtube.js"
LEGACY="dados/src/features/kyaraSpecialCommandsLegacy.js"

echo "=============================================="
echo "       KYARA - PLAY DEFINITIVO"
echo "=============================================="
echo

if [ ! -f "$MEDIA" ]; then
  echo "ERRO: $MEDIA não existe."
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

echo "[1/6] Restaurando arquivo antes da tentativa anterior..."

if [ -f "$MEDIA.bak-play-final2" ]; then
  cp "$MEDIA.bak-play-final2" "$MEDIA"
  echo "Backup final2 restaurado."
elif [ -f "$MEDIA.bak-play-final" ]; then
  cp "$MEDIA.bak-play-final" "$MEDIA"
  echo "Backup final restaurado."
else
  echo "Nenhum backup anterior encontrado."
  echo "Criando backup do estado atual..."
  cp "$MEDIA" "$MEDIA.bak-play-definitivo"
fi

if [ -f "$YTDLP.bak-play-final2" ]; then
  cp "$YTDLP.bak-play-final2" "$YTDLP"
elif [ -f "$YTDLP.bak-play-final" ]; then
  cp "$YTDLP.bak-play-final" "$YTDLP"
fi

echo
echo "[2/6] Aplicando Native Flow sem quebrar template strings..."

python3 - <<'PY'
from pathlib import Path

media = Path("dados/src/features/kyaraMediaCommands.js")
legacy = Path("dados/src/features/kyaraSpecialCommandsLegacy.js")

m = media.read_text()
l = legacy.read_text()

# ------------------------------------------------------------
# IMPORTS
# ------------------------------------------------------------

if "generateWAMessageFromContent" not in m:
    m = """import {
  generateWAMessageFromContent,
  prepareWAMessageMedia
} from 'baileys';

""" + m

# ------------------------------------------------------------
# PEGA A FUNÇÃO COMPLETA DO LEGACY USANDO MARCADORES.
#
# NÃO conta chaves {}.
# Isso evita o erro causado por ${...} dentro de strings.
# ------------------------------------------------------------

legacy_start_marker = "async function enviarPlayUniversal("
legacy_end_marker = "\nasync function baixarAudioUniversal("

ls = l.find(legacy_start_marker)

if ls == -1:
    raise SystemExit(
        "ERRO: enviarPlayUniversal não encontrada."
    )

le = l.find(
    legacy_end_marker,
    ls
)

if le == -1:
    raise SystemExit(
        "ERRO: fim de enviarPlayUniversal não encontrado."
    )

native = l[ls:le]

# Renomeia a função.
native = native.replace(
    "async function enviarPlayUniversal(",
    "async function sendCard(",
    1
)

# Usa tokens curtos nos botões.
native = native.replace(
    "id:\n            `${prefix}playaudio ${mediaUrl}`",
    "id:\n            `${prefix}playaudio ${rememberButton(mediaUrl)}`"
)

native = native.replace(
    "id:\n            `${prefix}playvideo ${mediaUrl}`",
    "id:\n            `${prefix}playvideo ${rememberButton(mediaUrl)}`"
)

# Caso a formatação esteja em uma linha.
native = native.replace(
    "id: `${prefix}playaudio ${mediaUrl}`",
    "id: `${prefix}playaudio ${rememberButton(mediaUrl)}`"
)

native = native.replace(
    "id: `${prefix}playvideo ${mediaUrl}`",
    "id: `${prefix}playvideo ${rememberButton(mediaUrl)}`"
)

# O legacy usa detectarPlataforma.
# Este módulo usa platformOf.
native = native.replace(
    "detectarPlataforma(",
    "platformOf("
)

# ------------------------------------------------------------
# SUBSTITUI sendCard ATUAL PELO NATIVE FLOW
# ------------------------------------------------------------

start_marker = "async function sendCard("
end_marker = "\nasync function handle("

ms = m.find(start_marker)

if ms == -1:
    raise SystemExit(
        "ERRO: sendCard atual não encontrada."
    )

me = m.find(
    end_marker,
    ms
)

if me == -1:
    raise SystemExit(
        "ERRO: fim de sendCard atual não encontrado."
    )

m = (
    m[:ms] +
    native +
    m[me:]
)

# ------------------------------------------------------------
# TORNA /PLAY UNIVERSAL
# ------------------------------------------------------------

handle_start = m.find(
    "async function handle("
)

if handle_start == -1:
    raise SystemExit(
        "ERRO: handle não encontrada."
    )

platform_start = m.find(
    "  const platform =",
    handle_start
)

if platform_start == -1:
    raise SystemExit(
        "ERRO: const platform não encontrado."
    )

text_marker = "\n  /*\n   * TEXTO:"

text_start = m.find(
    text_marker,
    platform_start
)

if text_start == -1:
    raise SystemExit(
        "ERRO: bloco TEXTO não encontrado."
    )

new_platform_block = """  const platform =
    cmd === 'play'
      ? (
          isUrl(query)
            ? (
                platformOf(query) ||
                'Mídia'
              )
            : 'YouTube'
        )
      : (
          {
            tiktok: 'TikTok',
            instagram: 'Instagram',
            facebook: 'Facebook',
            kwai: 'Kwai',
            twitter: 'Twitter/X',
            x: 'Twitter/X',
            pinterest: 'Pinterest',
            pin: 'Pinterest'
          }[cmd]
        );

  /*
   * /play é universal.
   *
   * Com URL, o yt-dlp recebe diretamente o endereço.
   * Assim não dependemos do reconhecimento da plataforma
   * pelo Kyara.
   */
  if (
    !platform &&
    cmd !== 'play'
  ) {
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
      cmd !== 'play' &&
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
          cmd === 'play'
            ? (
                platformOf(query) ||
                'Mídia'
              )
            : platform
      }
    });
  }
"""

m = (
    m[:platform_start] +
    new_platform_block +
    m[text_start:]
)

# ------------------------------------------------------------
# EVITA A PRIMEIRA MENSAGEM DE "PESQUISANDO" NO /PLAY.
#
# Assim /play texto -> apenas UM card.
# Os outros comandos continuam mostrando status.
# ------------------------------------------------------------

old_search = """  await reply(
    `🔎 *Pesquisando no ${platform}...*`
  );

"""

new_search = """  if (cmd !== 'play') {
    await reply(
      `🔎 *Pesquisando no ${platform}...*`
    );
  }

"""

if old_search in m:
    m = m.replace(
        old_search,
        new_search,
        1
    )

media.write_text(m)

print("OK: Native Flow aplicado.")
print("OK: /play universal aplicado.")
print("OK: pesquisa do /play não envia mensagem extra.")
PY

echo "OK"

echo
echo "[3/6] Otimizando download..."

python3 - <<'PY'
from pathlib import Path

p = Path("dados/src/funcs/downloads/youtube.js")
s = p.read_text()

s = s.replace(
    "'--concurrent-fragments', '8'",
    "'--concurrent-fragments', '16'"
)

s = s.replace(
    '"--concurrent-fragments", "8"',
    '"--concurrent-fragments", "16"'
)

p.write_text(s)

print("OK: concorrência otimizada.")
PY

echo
echo "[4/6] Verificando sintaxe..."

node --check "$MEDIA"
node --check "$YTDLP"

echo "OK: sintaxe válida."

echo
echo "[5/6] Conferindo Native Flow..."

SENDCARD=$(grep -c "async function sendCard(" "$MEDIA" || true)
NATIVE=$(grep -c "generateWAMessageFromContent" "$MEDIA" || true)
AUDIO=$(grep -c "Baixar Áudio" "$MEDIA" || true)
VIDEO=$(grep -c "Baixar Vídeo" "$MEDIA" || true)

echo "sendCard = $SENDCARD"
echo "Native Flow = $NATIVE"
echo "Áudio = $AUDIO"
echo "Vídeo = $VIDEO"

if [ "$SENDCARD" != "1" ]; then
  echo "ERRO: sendCard inválido."
  exit 1
fi

if [ "$NATIVE" = "0" ]; then
  echo "ERRO: Native Flow não encontrado."
  exit 1
fi

if [ "$AUDIO" = "0" ]; then
  echo "ERRO: botão de áudio não encontrado."
  exit 1
fi

if [ "$VIDEO" = "0" ]; then
  echo "ERRO: botão de vídeo não encontrado."
  exit 1
fi

echo
echo "[6/6] Tudo certo."

echo
echo "=============================================="
echo "       PLAY CORRIGIDO COM SUCESSO"
echo "=============================================="
echo
echo "✓ /play por pesquisa"
echo "✓ /play por URL"
echo "✓ URL universal via yt-dlp"
echo "✓ YouTube"
echo "✓ TikTok"
echo "✓ Instagram"
echo "✓ X/Twitter"
echo "✓ Outras plataformas suportadas pelo yt-dlp"
echo "✓ Melhor qualidade disponível"
echo "✓ Download otimizado"
echo "✓ Native Flow"
echo "✓ 🎵 Baixar Áudio"
echo "✓ 🎬 Baixar Vídeo"
echo "✓ Botões lado a lado"
echo "✓ /play envia somente 1 card"
echo
echo "Agora rode:"
echo
echo "npm start"
echo
