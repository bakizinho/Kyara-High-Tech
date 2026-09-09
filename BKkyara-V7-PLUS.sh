#!/data/data/com.termux/files/usr/bin/bash

set -e

PROJECT="$HOME/storage/BKkyara-"
MEDIA="$PROJECT/dados/src/features/kyaraMediaCommands.js"
PINTEREST="$PROJECT/dados/src/funcs/downloads/pinterest.js"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "       KYARA V7 PLUS — PATCH PINTEREST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

cd "$PROJECT"

echo "[1/6] Verificando arquivos..."

test -f "$MEDIA" || {
  echo "❌ Não encontrei:"
  echo "$MEDIA"
  exit 1
}

test -f "$PINTEREST" || {
  echo "❌ Não encontrei:"
  echo "$PINTEREST"
  exit 1
}

echo "✅ Arquivos encontrados."

echo
echo "[2/6] Criando backup..."

BACKUP="$PROJECT/backups/V7-PLUS-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

cp "$MEDIA" "$BACKUP/kyaraMediaCommands.js"
cp "$PINTEREST" "$BACKUP/pinterest.js"

echo "✅ Backup:"
echo "   $BACKUP"

echo
echo "[3/6] Verificando Pinterest atual..."

grep -q "export" "$PINTEREST" && echo "✅ pinterest.js possui exports."
grep -q "async function" "$PINTEREST" && echo "✅ Funções assíncronas encontradas."

echo
echo "[4/6] Instalando proteção V7 PLUS..."

python - "$MEDIA" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

if "KYARA_V7_PLUS_PINTEREST_GATE" in text:
    print("⚠️ Gate V7 PLUS já existe.")
    print("Nenhuma duplicação será feita.")
    raise SystemExit(0)

anchor = """  /*
   * AUDIO.
   */"""

if anchor not in text:
    print("❌ Não encontrei o ponto seguro de inserção do gate.")
    print("O arquivo atual não corresponde à estrutura esperada.")
    raise SystemExit(2)

gate = r"""
  /*
   * ============================================================
   * KYARA_V7_PLUS_PINTEREST_GATE
   * ============================================================
   *
   * Pinterest NÃO deve passar por youtube.info(),
   * youtube.mp3() ou youtube.mp4().
   */

  {
    const pinterestCommand =
      cmd === 'pin' ||
      cmd === 'pinterest';

    const pinterestUrl =
      typeof query === 'string' &&
      query.trim() &&
      platformOf(query) === 'Pinterest';

    const pinterestPlay =
      cmd === 'play' &&
      pinterestUrl;

    if (pinterestCommand || pinterestPlay) {
      console.log('[PINTEREST V7 PLUS] Entrada detectada:', query);

      try {
        let result;

        if (isUrl(query)) {
          console.log('[PINTEREST V7 PLUS] Baixando URL...');
          result = await pinterest.dl(query);
        } else {
          console.log('[PINTEREST V7 PLUS] Pesquisando:', query);
          result = await pinterest.search(query);
        }

        if (!result) {
          await reply(
            '❌ Não encontrei conteúdo público do Pinterest.'
          );
          return true;
        }

        const image =
          result.url ||
          result.directLink ||
          result.image ||
          result.imageUrl ||
          result.thumbnail ||
          result.media;

        if (!image) {
          await reply(
            '❌ Encontrei o Pin, mas não consegui obter a imagem.'
          );
          return true;
        }

        try {
          await nazo.sendMessage(
            from,
            {
              image: {
                url: image
              },
              caption: '📌 *Pinterest V7 PLUS*'
            },
            {
              quoted: options?.msg
            }
          );

          console.log('[PINTEREST V7 PLUS] Enviado por URL.');
          return true;

        } catch (remoteError) {
          console.log(
            '[PINTEREST V7 PLUS] Falha no envio remoto:',
            remoteError?.message || remoteError
          );
        }

        try {
          const response = await fetch(image);

          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status}`
            );
          }

          const buffer = Buffer.from(
            await response.arrayBuffer()
          );

          await nazo.sendMessage(
            from,
            {
              image: buffer,
              caption: '📌 *Pinterest V7 PLUS*'
            },
            {
              quoted: options?.msg
            }
          );

          console.log('[PINTEREST V7 PLUS] Enviado por buffer.');
          return true;

        } catch (bufferError) {
          console.log(
            '[PINTEREST V7 PLUS] Falha no buffer:',
            bufferError?.message || bufferError
          );

          await reply(
            '❌ Não consegui enviar a mídia do Pinterest.'
          );

          return true;
        }

      } catch (error) {
        console.log(
          '[PINTEREST V7 PLUS] Erro:',
          error?.message || error
        );

        await reply(
          '❌ Não foi possível obter esse conteúdo do Pinterest.'
        );

        /*
         * MUITO IMPORTANTE:
         * Mesmo com erro, retorna true.
         * Assim o Pinterest não cai no sistema legado
         * nem no youtube/yt-dlp.
         */
        return true;
      }
    }
  }

"""

text = text.replace(anchor, gate + "\n" + anchor, 1)

path.write_text(text, encoding="utf-8")

print("✅ Gate V7 PLUS instalado.")
PY

echo
echo "[5/6] Validando JavaScript..."

node --check "$PINTEREST"
echo "✅ pinterest.js"

node --check "$MEDIA"
echo "✅ kyaraMediaCommands.js"

echo
echo "[6/6] Auditoria..."

python - "$MEDIA" <<'PY'
from pathlib import Path
import sys

text = Path(sys.argv[1]).read_text(encoding="utf-8")

checks = {
    "Gate V7 PLUS": "KYARA_V7_PLUS_PINTEREST_GATE" in text,
    "/pin": "cmd === 'pin'" in text,
    "/pinterest": "cmd === 'pinterest'" in text,
    "Pinterest URL": "platformOf(query) === 'Pinterest'" in text,
    "pinterest.dl": "await pinterest.dl(query)" in text,
    "pinterest.search": "await pinterest.search(query)" in text,
    "return true": "return true;" in text,
}

ok = True

for name, value in checks.items():
    print(("✅ " if value else "❌ ") + name)
    if not value:
        ok = False

if not ok:
    print()
    print("❌ Auditoria falhou.")
    sys.exit(1)

print()
print("✅ Auditoria V7 PLUS concluída.")
PY

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "              ✅ V7 PLUS INSTALADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "BACKUP:"
echo "$BACKUP"
echo
echo "NOVOS/CORRIGIDOS:"
echo "  📌 /pin <pesquisa>"
echo "  📌 /pinterest <pesquisa>"
echo "  📌 /pin <URL Pinterest>"
echo "  📌 /pinterest <URL Pinterest>"
echo "  📌 /play <URL Pinterest>"
echo
echo "PROTEÇÕES:"
echo "  ✅ Pinterest separado do YouTube"
echo "  ✅ Sem youtube.info() para Pinterest"
echo "  ✅ Sem queda para yt-dlp"
echo "  ✅ URL pin.it"
echo "  ✅ URL pinterest.com"
echo "  ✅ Pesquisa Pinterest"
echo "  ✅ Retorno true após erro"
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AGORA EXECUTE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "npm start"
echo
echo "Depois teste:"
echo "/pin sukuna"
echo "/pinterest sukuna"
echo "/pin https://pin.it/5WFM9IQ5H"
echo "/pinterest https://pin.it/5WFM9IQ5H"
echo "/play https://pin.it/5WFM9IQ5H"
echo
echo "IMPORTANTE:"
echo "Não deve aparecer:"
echo "[YTDLP INFO] Pinterest"
echo

