#!/data/data/com.termux/files/usr/bin/bash

set -e

MEDIA="$HOME/storage/BKkyara-/dados/src/features/kyaraMediaCommands.js"

echo "============================================================"
echo "          KYARA — CORREÇÃO DO RETORNO DO PLAY"
echo "============================================================"
echo

if [ ! -f "$MEDIA" ]; then
    echo "❌ Arquivo não encontrado:"
    echo "$MEDIA"
    exit 1
fi

BACKUP="$HOME/storage/BKkyara-/backup-play-return-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

cp "$MEDIA" "$BACKUP/kyaraMediaCommands.js"

echo "[1/4] Backup criado:"
echo "$BACKUP"
echo

python3 - "$MEDIA" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

old = """  await nazu.relayMessage(
    from,
    msg.message,
    {
      messageId:
        msg.key.id,

      additionalNodes
    }
  );
}

async function handle(options = {}) {"""

new = """  await nazu.relayMessage(
    from,
    msg.message,
    {
      messageId:
        msg.key.id,

      additionalNodes
    }
  );

  // IMPORTANTE:
  // sendCard tratou o comando com sucesso.
  // O index.js precisa receber true para NÃO
  // continuar até o "Comando não encontrado".
  return true;
}

async function handle(options = {}) {"""

if old not in s:
    raise SystemExit(
        "❌ Não encontrei exatamente o final de sendCard. "
        "Nenhuma alteração foi feita."
    )

s = s.replace(old, new, 1)

p.write_text(s)

print("✓ sendCard agora retorna true")
PY

echo
echo "[2/4] Validando sintaxe..."

node --check "$MEDIA"

echo "✓ kyaraMediaCommands.js OK"
echo

echo "[3/4] Conferindo correção..."

grep -n -A8 -B5 "sendCard tratou o comando" "$MEDIA" || true

echo
echo "[4/4] Finalizado."

echo
echo "============================================================"
echo "             PLAY CORRIGIDO"
echo "============================================================"
echo
echo "✓ Card continua igual"
echo "✓ Native Flow continua igual"
echo "✓ Botões continuam iguais"
echo "✓ Download continua igual"
echo "✓ sendCard agora retorna true"
echo "✓ index.js não deve mais cair no comando não encontrado"
echo "✓ Sintaxe validada"
echo
echo "Backup:"
echo "$BACKUP"
echo
echo "============================================================"
echo
echo "AGORA:"
echo
echo "npm start"
echo
echo "TESTE:"
echo
echo "/play eren"
echo
echo "ESPERADO:"
echo "1 único card"
echo "SEM 'Comando não encontrado'"
echo
echo "============================================================"
