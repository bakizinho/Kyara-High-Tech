#!/data/data/com.termux/files/usr/bin/bash

set +e

PROJECT="$HOME/storage/BKkyara-"
cd "$PROJECT" || exit 1

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$PROJECT/dados/backup-correcao-kyara-$TIMESTAMP"
LOG="$PROJECT/kyara-auditoria-$TIMESTAMP.log"

mkdir -p "$BACKUP_DIR"

echo "══════════════════════════════════════════════" | tee "$LOG"
echo "🛠️ CORREÇÃO E AUDITORIA — KYARA" | tee -a "$LOG"
echo "══════════════════════════════════════════════" | tee -a "$LOG"
echo
echo "📂 Projeto:"
pwd | tee -a "$LOG"
echo

INDEX="dados/src/index.js"

if [ ! -f "$INDEX" ]; then
    echo "❌ $INDEX não encontrado." | tee -a "$LOG"
    exit 1
fi

# ============================================================
# 1. BACKUP DO ARQUIVO QUE SERÁ ALTERADO
# ============================================================

cp -p "$INDEX" "$BACKUP_DIR/index.js"

echo "✅ Backup criado:"
echo "   $BACKUP_DIR/index.js"
echo

# ============================================================
# 2. DETECTAR E CORRIGIR O 'let' ISOLADO DA KYARA
# ============================================================

echo "🔎 Procurando erro conhecido no index.js..."

python3 - "$INDEX" <<'PY'
import sys

arquivo = sys.argv[1]

with open(arquivo, "r", encoding="utf-8") as f:
    texto = f.read()

antigo = """  // Verificar se é personalidade customizada
  let
"""

novo = """  // Verificar se é personalidade customizada
  let customPrompt = null;
"""

if antigo in texto:
    texto = texto.replace(antigo, novo, 1)

    with open(arquivo, "w", encoding="utf-8") as f:
        f.write(texto)

    print("✅ Corrigido: 'let' isolado -> 'let customPrompt = null;'")
else:
    print("ℹ️ Padrão exato do erro não encontrado.")

PY

echo

# ============================================================
# 3. VERIFICAR O TRECHO DA KYARA
# ============================================================

echo "🔎 Trecho relacionado à personalidade/customPrompt:"

grep -n -A18 -B5 \
    -E "personalidade customizada|customPrompt|assistentePersonality" \
    "$INDEX" | head -80

echo

# ============================================================
# 4. NODE --CHECK EM TODO O CÓDIGO JAVASCRIPT
# ============================================================

echo "══════════════════════════════════════════════"
echo "🧪 VERIFICAÇÃO DE SINTAXE JAVASCRIPT"
echo "══════════════════════════════════════════════"

JS_TOTAL=0
JS_OK=0
JS_BAD=0

while IFS= read -r -d '' arquivo; do
    JS_TOTAL=$((JS_TOTAL + 1))

    if node --check "$arquivo" >/dev/null 2>&1; then
        JS_OK=$((JS_OK + 1))
    else
        JS_BAD=$((JS_BAD + 1))

        echo
        echo "❌ ERRO DE SINTAXE:"
        echo "$arquivo"

        node --check "$arquivo" 2>&1 | head -30
    fi
done < <(
    find . \
        -type f \
        -name "*.js" \
        ! -path "./node_modules/*" \
        ! -path "./dados/backup-*/*" \
        ! -path "./backup-*/*" \
        -print0
)

echo
echo "📊 JavaScript:"
echo "   Total : $JS_TOTAL"
echo "   OK    : $JS_OK"
echo "   Erros : $JS_BAD"
echo

# ============================================================
# 5. VALIDAR JSON
# ============================================================

echo "══════════════════════════════════════════════"
echo "🧪 VERIFICAÇÃO DOS JSON"
echo "══════════════════════════════════════════════"

JSON_TOTAL=0
JSON_OK=0
JSON_BAD=0

while IFS= read -r -d '' arquivo; do
    JSON_TOTAL=$((JSON_TOTAL + 1))

    if node -e '
const fs = require("fs");
JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
' "$arquivo" >/dev/null 2>&1; then
        JSON_OK=$((JSON_OK + 1))
    else
        JSON_BAD=$((JSON_BAD + 1))

        echo
        echo "❌ JSON INVÁLIDO:"
        echo "$arquivo"

        node -e '
const fs = require("fs");
try {
  JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
' "$arquivo"
    fi
done < <(
    find . \
        -type f \
        -name "*.json" \
        ! -path "./node_modules/*" \
        ! -path "./dados/backup-*/*" \
        ! -path "./backup-*/*" \
        -print0
)

echo
echo "📊 JSON:"
echo "   Total : $JSON_TOTAL"
echo "   OK    : $JSON_OK"
echo "   Erros : $JSON_BAD"
echo

# ============================================================
# 6. PACKAGE.JSON
# ============================================================

echo "══════════════════════════════════════════════"
echo "📦 PACKAGE / DEPENDÊNCIAS"
echo "══════════════════════════════════════════════"

if [ -f package.json ]; then
    node -e '
const p = require("./package.json");
console.log("Nome:", p.name);
console.log("Versão:", p.version);
console.log("Tipo:", p.type);
console.log("Main:", p.main);
console.log("Start:", p.scripts?.start || "não definido");
console.log("Dependências:", Object.keys(p.dependencies || {}).length);
console.log("DevDependencies:", Object.keys(p.devDependencies || {}).length);
'
else
    echo "❌ package.json não encontrado."
fi

echo

if [ -d node_modules ]; then
    echo "📦 node_modules encontrado."
    npm ls --depth=0 --omit=dev 2>&1 | tail -100
else
    echo "⚠️ node_modules não existe neste ambiente."
    echo "   Não será instalado automaticamente."
fi

echo

# ============================================================
# 7. ENTRYPOINT REAL
# ============================================================

echo "══════════════════════════════════════════════"
echo "🚀 ENTRYPOINT"
echo "══════════════════════════════════════════════"

START_FILE=""

if [ -f package.json ]; then
    START_FILE="$(
        node -e '
const p=require("./package.json");
process.stdout.write((p.scripts && p.scripts.start) || "");
'
    )"
fi

echo "npm start:"
echo "   ${START_FILE:-não definido}"

if [ -f dados/src/.scripts/start.js ]; then
    echo
    echo "📌 Arquivo de inicialização detectado:"
    echo "   dados/src/.scripts/start.js"

    if node --check dados/src/.scripts/start.js >/dev/null 2>&1; then
        echo "✅ start.js possui sintaxe válida."
    else
        echo "❌ start.js possui erro de sintaxe:"
        node --check dados/src/.scripts/start.js
    fi
fi

echo

# ============================================================
# 8. KYARA CORE
# ============================================================

echo "══════════════════════════════════════════════"
echo "🤖 KYARA CORE"
echo "══════════════════════════════════════════════"

if [ -f dados/src/core/kyara.js ]; then

    if node --check dados/src/core/kyara.js >/dev/null 2>&1; then
        echo "✅ kyara.js: sintaxe OK."
    else
        echo "❌ kyara.js: erro:"
        node --check dados/src/core/kyara.js
    fi

else
    echo "❌ dados/src/core/kyara.js não encontrado."
fi

if [ -f dados/src/core/kyaraKnowledge.js ]; then

    if node --check dados/src/core/kyaraKnowledge.js >/dev/null 2>&1; then
        echo "✅ kyaraKnowledge.js: sintaxe OK."
    else
        echo "❌ kyaraKnowledge.js: erro:"
        node --check dados/src/core/kyaraKnowledge.js
    fi

    echo
    echo "🔎 Integração do Knowledge Engine:"

    if grep -n "getKyaraCommandKnowledge" dados/src/index.js; then
        echo
        if grep -n "getKyaraCommandKnowledge" dados/src/index.js | grep -v "import" | grep -v "export"; then
            echo "✅ getKyaraCommandKnowledge possui uso além do import."
        else
            echo "⚠️ getKyaraCommandKnowledge parece estar apenas importado."
            echo "   O mecanismo existe, mas pode não estar conectado ao fluxo da Kyara."
        fi
    else
        echo "⚠️ getKyaraCommandKnowledge não aparece no index.js."
    fi
else
    echo "⚠️ kyaraKnowledge.js não encontrado."
fi

echo

# ============================================================
# 9. IA
# ============================================================

echo "══════════════════════════════════════════════"
echo "🧠 IA"
echo "══════════════════════════════════════════════"

IA="dados/src/funcs/private/ia.js"

if [ -f "$IA" ]; then

    if node --check "$IA" >/dev/null 2>&1; then
        echo "✅ ia.js: sintaxe OK."
    else
        echo "❌ ia.js possui erro:"
        node --check "$IA"
    fi

    echo
    echo "🔎 makeAssistentRequest:"
    grep -n -E \
        "makeAssistentRequest|processUserMessages|getSystemPrompt" \
        "$IA" | tail -30

else
    echo "❌ ia.js não encontrado."
fi

echo

# ============================================================
# 10. TTS / GRADIUM — SOMENTE NOMES DAS VARIÁVEIS
# ============================================================

echo "══════════════════════════════════════════════"
echo "🔊 TTS / GRADIUM"
echo "══════════════════════════════════════════════"

if [ -f dados/src/funcs/tts/ler.js ]; then

    grep -oE \
        "GRADIUM_[A-Z0-9_]+" \
        dados/src/funcs/tts/ler.js \
        | sort -u

    echo
    echo "⚠️ Os valores das chaves não serão exibidos."
else
    echo "⚠️ ler.js não encontrado."
fi

echo

# ============================================================
# 11. DETECTAR VARIÁVEIS DE AMBIENTE REFERENCIADAS
# ============================================================

echo "══════════════════════════════════════════════"
echo "🔐 VARIÁVEIS DE AMBIENTE REFERENCIADAS"
echo "══════════════════════════════════════════════"

grep -RhoE \
    "process\.env\.[A-Za-z_][A-Za-z0-9_]*" \
    dados/src \
    --include="*.js" \
    --exclude-dir=node_modules \
    --exclude-dir="backup-"* \
    2>/dev/null \
    | sed 's/process\.env\.//' \
    | sort -u \
    | head -200

echo
echo "⚠️ Nenhum valor de variável de ambiente será mostrado."

# ============================================================
# 12. GIT
# ============================================================

echo
echo "══════════════════════════════════════════════"
echo "🌿 GIT"
echo "══════════════════════════════════════════════"

if [ -d .git ]; then
    echo "✅ Repositório Git detectado."
    git status --short 2>/dev/null | head -100
else
    echo "ℹ️ .git não encontrado."
fi

# ============================================================
# 13. RESULTADO FINAL
# ============================================================

echo
echo "══════════════════════════════════════════════"
echo "✅ AUDITORIA FINALIZADA"
echo "══════════════════════════════════════════════"

echo
echo "ERROS ENCONTRADOS:"
echo "   JavaScript: $JS_BAD"
echo "   JSON:       $JSON_BAD"

echo
echo "ERROS CORRIGIDOS:"

if grep -q "let customPrompt = null;" "$INDEX"; then
    echo "   ✅ index.js — customPrompt inicializado corretamente."
else
    echo "   ⚠️ customPrompt não foi localizado na forma esperada."
fi

echo
echo "ARQUIVOS ALTERADOS:"
echo "   $INDEX"

echo
echo "BACKUP:"
echo "   $BACKUP_DIR"

echo
echo "LOG:"
echo "   $LOG"

echo
echo "TESTES REALIZADOS:"
echo "   ✅ node --check em JavaScript"
echo "   ✅ validação de JSON"
echo "   ✅ análise de package.json"
echo "   ✅ análise de dependências"
echo "   ✅ análise do entrypoint"
echo "   ✅ análise do Kyara Core"
echo "   ✅ análise do Knowledge Engine"
echo "   ✅ análise da IA"
echo "   ✅ análise do TTS/Gradium"
echo "   ✅ análise das variáveis de ambiente"
echo "   ✅ análise do Git"

echo

if [ "$JS_BAD" -eq 0 ] && [ "$JSON_BAD" -eq 0 ]; then
    echo "STATUS FINAL:"
    echo "🟢 SINTAXE E JSON OK"
else
    echo "STATUS FINAL:"
    echo "🔴 AINDA EXISTEM ERROS"
fi

echo
echo "⚠️ O bot NÃO será iniciado automaticamente por este script."
echo "   Isso evita iniciar WhatsApp durante a auditoria."
echo
echo "Para iniciar depois:"
echo "   npm start"
echo

