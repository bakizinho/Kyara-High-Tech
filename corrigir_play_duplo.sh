#!/data/data/com.termux/files/usr/bin/bash
set -e

FILE="dados/src/features/kyaraMediaCommands.js"

echo "=============================================="
echo "       KYARA - ANTI DUPLICAÇÃO DO PLAY"
echo "=============================================="
echo

if [ ! -f "$FILE" ]; then
  echo "❌ Arquivo não encontrado:"
  echo "$FILE"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP=".backup-play-lock-$STAMP"

mkdir -p "$BACKUP"
cp "$FILE" "$BACKUP/kyaraMediaCommands.js"

echo "[1/4] Backup criado:"
echo "$BACKUP"
echo

python3 - "$FILE" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
s = path.read_text(encoding="utf-8")

# ============================================================
# 1. Inserir sistema de lock/deduplicação
# ============================================================

marker = "const buttonUrls = new Map();"

if marker not in s:
    raise SystemExit("❌ Não encontrei o sistema buttonUrls.")

if "const playLocks = new Map();" not in s:
    insert = r'''
/*
 * ============================================================
 * 🔒 PLAY LOCK
 *
 * Impede que o mesmo /play seja processado duas vezes
 * por caminhos diferentes do sistema.
 * ============================================================
 */
const playLocks = new Map();

const PLAY_LOCK_TTL = 12000;

function acquirePlayLock({
  from,
  sender,
  command,
  query
}) {
  const key =
    [
      String(from || ''),
      String(sender || ''),
      String(command || ''),
      String(query || '')
        .trim()
        .toLowerCase()
    ].join('|');

  const now = Date.now();

  const previous =
    playLocks.get(key);

  if (
    previous &&
    now - previous < PLAY_LOCK_TTL
  ) {
    console.log(
      `[PLAY LOCK] ⛔ Duplicado bloqueado: ${command} ${query}`
    );

    return false;
  }

  playLocks.set(
    key,
    now
  );

  /*
   * Limpeza automática.
   */
  setTimeout(
    () => {
      const current =
        playLocks.get(key);

      if (
        current === now
      ) {
        playLocks.delete(key);
      }
    },
    PLAY_LOCK_TTL + 1000
  ).unref?.();

  return true;
}

'''
    s = s.replace(
        marker,
        insert + marker,
        1
    )

# ============================================================
# 2. Localizar início do handle
# ============================================================

handle_marker = "async function handle({"

pos = s.find(handle_marker)

if pos == -1:
    # fallback caso a assinatura esteja quebrada em linhas
    handle_marker = "async function handle("
    pos = s.find(handle_marker)

if pos == -1:
    raise SystemExit("❌ Não encontrei a função handle().")

# ============================================================
# 3. Encontrar a região inicial onde cmd/query existem
# ============================================================

search_start = pos

needle_cmd = "const cmd"

cmd_pos = s.find(
    needle_cmd,
    search_start
)

if cmd_pos == -1:
    raise SystemExit(
        "❌ Não encontrei 'const cmd' dentro do handle()."
    )

# Encontrar final da declaração de cmd.
line_end = s.find("\n", cmd_pos)

if line_end == -1:
    raise SystemExit(
        "❌ Não consegui localizar o final da declaração cmd."
    )

# ============================================================
# 4. Inserir lock imediatamente depois da preparação do cmd
# ============================================================

# Não inserir duas vezes.
if "[PLAY LOCK] 🔐" not in s:

    block = r'''
  
  /*
   * ==========================================================
   * 🔐 PROTEÇÃO CONTRA DUPLICAÇÃO DO /PLAY
   * ==========================================================
   *
   * Só aplicamos ao comando play.
   */
  if (
    cmd === 'play'
  ) {
    const allowed =
      acquirePlayLock({
        from,
        sender:
          options?.sender ||
          info?.key?.participant ||
          info?.participant ||
          '',
        command:
          cmd,
        query
      });

    if (!allowed) {
      return true;
    }

    console.log(
      `[PLAY LOCK] 🔐 Processando uma única vez: ${query}`
    );
  }

'''

    # inserir depois da linha da declaração cmd,
    # mas precisamos achar um ponto seguro antes dos próximos blocos.
    #
    # Procuramos o primeiro "const query" depois de cmd.
    query_pos = s.find(
        "const query",
        cmd_pos
    )

    if query_pos == -1:
        raise SystemExit(
            "❌ Não encontrei 'const query' dentro do handle()."
        )

    query_line_end = s.find(
        "\n",
        query_pos
    )

    if query_line_end == -1:
        raise SystemExit(
            "❌ Não encontrei o final da declaração query."
        )

    s = (
        s[:query_line_end + 1]
        +
        block
        +
        s[query_line_end + 1:]
    )

    print("✅ PLAY LOCK inserido.")
else:
    print("⚠️ PLAY LOCK já estava presente.")

path.write_text(
    s,
    encoding="utf-8"
)

PY

echo
echo "[2/4] Verificando sintaxe..."

node --check "$FILE"

echo "✅ Sintaxe válida."

echo
echo "[3/4] Conferindo proteção..."

grep -n "PLAY LOCK" "$FILE" || true

echo
echo "[4/4] Concluído."

echo
echo "=============================================="
echo "       ANTI DUPLICAÇÃO APLICADO"
echo "=============================================="
echo
echo "Agora:"
echo
echo "1. Pare o bot atual."
echo "2. Inicie novamente."
echo "3. Teste:"
echo
echo "/play eren"
echo
echo "No terminal deverá aparecer:"
echo
echo "[PLAY LOCK] 🔐 Processando uma única vez"
echo
echo "Se outro caminho tentar executar:"
echo
echo "[PLAY LOCK] ⛔ Duplicado bloqueado"
echo
echo "=============================================="
