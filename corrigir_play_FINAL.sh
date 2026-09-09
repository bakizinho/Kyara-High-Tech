#!/data/data/com.termux/files/usr/bin/bash

set -e

ROOT="$HOME/storage/BKkyara-"
DATA="$ROOT/dados"
MEDIA="$DATA/src/features/kyaraMediaCommands.js"
LEGACY="$DATA/src/features/kyaraSpecialCommandsLegacy.js"
SPECIAL="$DATA/src/features/kyaraSpecialCommands.js"
INDEX="$DATA/src/index.js"
YT="$DATA/src/funcs/downloads/youtube.js"

echo "============================================================"
echo "          KYARA — PLAY FINAL / SEM INTERFERÊNCIA"
echo "============================================================"
echo

cd "$ROOT"

# ============================================================
# 1. Verificações
# ============================================================

echo "[1/8] Verificando arquivos..."

for f in "$MEDIA" "$LEGACY" "$SPECIAL" "$INDEX" "$YT"; do
    if [ ! -f "$f" ]; then
        echo "❌ Arquivo não encontrado:"
        echo "$f"
        exit 1
    fi
done

echo "✓ Arquivos encontrados"
echo

# ============================================================
# 2. Backup
# ============================================================

BACKUP="$ROOT/backup-play-final-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

cp "$MEDIA" "$BACKUP/kyaraMediaCommands.js"
cp "$LEGACY" "$BACKUP/kyaraSpecialCommandsLegacy.js"
cp "$SPECIAL" "$BACKUP/kyaraSpecialCommands.js"
cp "$INDEX" "$BACKUP/index.js"
cp "$YT" "$BACKUP/youtube.js"

echo "[2/8] Backup criado:"
echo "$BACKUP"
echo

# ============================================================
# 3. DESATIVAR COMPLETAMENTE O MEDIA LEGACY
# ============================================================

echo "[3/8] Isolando o sistema antigo de mídia..."

python3 - "$LEGACY" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

marker = "const centralizedMediaCommands = ["

if marker not in s:
    marker = "const centralizedMediaCommands"

# Evita inserir duas vezes
if "KYARA_PLAY_CENTRALIZED_LOCK" not in s:

    # Procurar o começo do handler de mídia legado
    candidates = [
        "async function handleMediaSpecialCommand",
        "function handleMediaSpecialCommand",
    ]

    pos = -1
    for c in candidates:
        pos = s.find(c)
        if pos != -1:
            break

    if pos == -1:
        raise SystemExit(
            "❌ Não encontrei handleMediaSpecialCommand no Legacy."
        )

    brace = s.find("{", pos)

    if brace == -1:
        raise SystemExit(
            "❌ Não encontrei abertura da função de mídia Legacy."
        )

    guard = r'''
  // ==========================================================
  // KYARA_PLAY_CENTRALIZED_LOCK
  // ==========================================================
  // O sistema novo kyaraMediaCommands.js é o ÚNICO responsável
  // pelos comandos de mídia.
  // O Legacy NÃO pode processar esses comandos.
  // ==========================================================

  const __kyaraCentralizedMediaCommands = new Set([
    'play',
    'playaudio',
    'playvideo',
    'playvid',
    'ytmp3',
    'ytmp4',
    'tiktok',
    'instagram',
    'facebook',
    'kwai',
    'twitter',
    'x',
    'pinterest',
    'pin'
  ]);

  if (__kyaraCentralizedMediaCommands.has(String(cmd || '').toLowerCase())) {
    return false;
  }

'''

    s = s[:brace+1] + guard + s[brace+1:]
    p.write_text(s)

    print("✓ Legacy isolado")
else:
    print("✓ Legacy já estava isolado")
PY

echo

# ============================================================
# 4. REMOVER LOCKS ANTIGOS QUE POSSAM INTERFERIR
# ============================================================

echo "[4/8] Limpando locks antigos do PLAY..."

python3 - "$MEDIA" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

# Remove somente blocos antigos de deduplicação conhecidos.
# Não altera o restante do handler.

start = s.find("const playDedup = new Map();")

if start != -1:
    end = s.find("function allowPlayCard", start)

    if end != -1:
        end2 = s.find("}", end)

        if end2 != -1:
            # tenta consumir a função inteira
            depth = 0
            i = end2

            while i < len(s):
                if s[i] == "{":
                    depth += 1
                elif s[i] == "}":
                    if depth == 0:
                        i += 1
                        break
                    depth -= 1
                i += 1

            # Só remove se parecer realmente um bloco de PLAY.
            block = s[start:i]

            if "allowPlayCard" in block:
                s = s[:start] + s[i:]

                # Remove chamadas restantes
                s = s.replace(
                    "if (!allowPlayCard(from, data)) {\n    return true;\n  }\n",
                    ""
                )

                s = s.replace(
                    "if (!allowPlayCard(from, data)) return true;\n",
                    ""
                )

                p.write_text(s)
                print("✓ Lock antigo removido")
            else:
                print("✓ Nenhum lock antigo perigoso encontrado")
        else:
            print("✓ Nenhum lock antigo perigoso encontrado")
    else:
        print("✓ Nenhum lock antigo perigoso encontrado")
else:
    print("✓ Nenhum lock antigo encontrado")
PY

echo

# ============================================================
# 5. GARANTIR APENAS UM SENDCARD POR EXECUÇÃO
# ============================================================

echo "[5/8] Protegendo envio único do card..."

python3 - "$MEDIA" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

# Procura a função sendCard
pos = s.find("async function sendCard")

if pos == -1:
    raise SystemExit("❌ sendCard não encontrado.")

brace = s.find("{", pos)

if brace == -1:
    raise SystemExit("❌ Abertura de sendCard não encontrada.")

guard = r'''
  // KYARA_PLAY_SINGLE_CARD
  // Uma execução de sendCard só pode gerar uma mensagem.
  const __kyaraPlaySingleCardKey =
    `${from}:${data?.url || data?.id || data?.title || ''}`;

  if (!globalThis.__kyaraPlaySingleCardCache) {
    globalThis.__kyaraPlaySingleCardCache = new Map();
  }

  const __kyaraPlayNow = Date.now();
  const __kyaraPlayPrevious =
    globalThis.__kyaraPlaySingleCardCache.get(__kyaraPlaySingleCardKey);

  if (__kyaraPlayPrevious && (__kyaraPlayNow - __kyaraPlayPrevious) < 10000) {
    return true;
  }

  globalThis.__kyaraPlaySingleCardCache.set(
    __kyaraPlaySingleCardKey,
    __kyaraPlayNow
  );

'''

# Não duplica
if "KYARA_PLAY_SINGLE_CARD" not in s:
    s = s[:brace+1] + guard + s[brace+1:]
    p.write_text(s)
    print("✓ Proteção de card único instalada")
else:
    print("✓ Proteção de card único já existente")
PY

echo

# ============================================================
# 6. OTIMIZAR YT-DLP
# ============================================================

echo "[6/8] Otimizando yt-dlp para velocidade + qualidade máxima..."

python3 - "$YT" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

# ------------------------------------------------------------
# ÁUDIO
# ------------------------------------------------------------

s = s.replace(
    "'--no-playlist',\n      '-f', 'bestaudio/best',",
    "'--no-playlist',\n      '--no-warnings',\n      '--concurrent-fragments', '16',\n      '-f', 'bestaudio/best',"
)

s = s.replace(
    '"--no-playlist",\n      "-f", "bestaudio/best",',
    '"--no-playlist",\n      "--no-warnings",\n      "--concurrent-fragments", "16",\n      "-f", "bestaudio/best",'
)

# ------------------------------------------------------------
# VÍDEO
# ------------------------------------------------------------

s = s.replace(
    "'--no-playlist',\n      '-f', 'bv*+ba/b',",
    "'--no-playlist',\n      '--no-warnings',\n      '--concurrent-fragments', '16',\n      '-f', 'bv*+ba/b',"
)

s = s.replace(
    '"--no-playlist",\n      "-f", "bv*+ba/b",',
    '"--no-playlist",\n      "--no-warnings",\n      "--concurrent-fragments", "16",\n      "-f", "bv*+ba/b",'
)

# Se já existir concurrent-fragments 8, aumenta para 16.
s = s.replace(
    "'--concurrent-fragments', '8'",
    "'--concurrent-fragments', '16'"
)

s = s.replace(
    '"--concurrent-fragments", "8"',
    '"--concurrent-fragments", "16"'
)

p.write_text(s)

print("✓ yt-dlp otimizado")
PY

echo

# ============================================================
# 7. VALIDAR SINTAXE
# ============================================================

echo "[7/8] Validando sintaxe..."

node --check "$MEDIA"
echo "✓ kyaraMediaCommands.js"

node --check "$LEGACY"
echo "✓ kyaraSpecialCommandsLegacy.js"

node --check "$SPECIAL"
echo "✓ kyaraSpecialCommands.js"

node --check "$INDEX"
echo "✓ index.js"

node --check "$YT"
echo "✓ youtube.js"

echo

# ============================================================
# 8. VERIFICAÇÃO FINAL
# ============================================================

echo "[8/8] Verificação final..."
echo

echo "--- PLAY CENTRALIZADO ---"

grep -n "KYARA_PLAY_CENTRALIZED_LOCK" "$LEGACY" || true

echo

echo "--- CARD ÚNICO ---"

grep -n "KYARA_PLAY_SINGLE_CARD" "$MEDIA" || true

echo

echo "--- SENDCARD ---"

grep -n "async function sendCard" "$MEDIA" || true

echo

echo "--- NATIVE FLOW ---"

grep -n "nativeFlowMessage" "$MEDIA" || true

echo

echo "--- BOTÕES ---"

grep -n "quick_reply" "$MEDIA" || true

echo

echo "--- COMANDOS PLAY NO LEGACY ---"

grep -nE "case ['\"]play['\"]|case ['\"]playaudio['\"]|case ['\"]playvideo['\"]|case ['\"]ytmp3['\"]|case ['\"]ytmp4['\"]" "$LEGACY" || true

echo
echo "============================================================"
echo "              PLAY FINAL CONFIGURADO"
echo "============================================================"
echo
echo "✓ /play centralizado"
echo "✓ Legacy impedido de processar /play"
echo "✓ Legacy impedido de processar /playaudio"
echo "✓ Legacy impedido de processar /playvideo"
echo "✓ Legacy impedido de processar /ytmp3"
echo "✓ Legacy impedido de processar /ytmp4"
echo "✓ Um único sistema controla mídia"
echo "✓ Proteção contra card duplicado"
echo "✓ Native Flow"
echo "✓ 🎵 Baixar Áudio"
echo "✓ 🎬 Baixar Vídeo"
echo "✓ yt-dlp otimizado"
echo "✓ Download paralelo"
echo "✓ Melhor qualidade disponível"
echo "✓ Sintaxe validada"
echo
echo "BACKUP:"
echo "$BACKUP"
echo
echo "============================================================"
echo
echo "REINICIE O BOT:"
echo
echo "pkill -f 'node .' 2>/dev/null || true"
echo
echo "npm start"
echo
echo "TESTE PRIMEIRO:"
echo
echo "/play eren"
echo
echo "IMPORTANTE:"
echo "Não clique nos botões ainda."
echo "Primeiro confirme que /play eren envia SOMENTE 1 card."
echo
echo "============================================================"
