#!/data/data/com.termux/files/usr/bin/bash

set -e

IA="dados/src/funcs/private/ia.js"

echo "=============================================="
echo "🌙 KYARA — CORREÇÃO DO CÉREBRO LOCAL"
echo "=============================================="

if [ ! -f "$IA" ]; then
    echo "❌ Arquivo não encontrado:"
    echo "$IA"
    exit 1
fi

cp "$IA" "$IA.pre-kyara-local-$(date +%Y%m%d-%H%M%S)"

python - "$IA" <<'PY'
from pathlib import Path
import sys
import re

p = Path(sys.argv[1])
s = p.read_text()

# ============================================================
# 1. MAIS TOKENS
# ============================================================

s = re.sub(
    r"const AI_MAX_TOKENS\s*=\s*[^;]+;",
    "const AI_MAX_TOKENS = Math.min(Number(process.env.KYARA_AI_MAX_TOKENS || 384), 384);",
    s,
    count=1
)

# ============================================================
# 2. DESATIVAR FALLBACK HTTP LOCAL
#
# A conversa não precisa de llama-server.
# O llama-cli já funciona diretamente.
# ============================================================

s = re.sub(
    r"const allowLocalHttp\s*=\s*String\(\s*process\.env\.KYARA_AI_LOCAL_HTTP\s*\?\?\s*'1'\s*\)\.toLowerCase\(\)\s*!==\s*'0';",
    "const allowLocalHttp = false;",
    s,
    count=1
)

# Caso a versão do arquivo tenha a declaração em outro formato.
s = re.sub(
    r"const allowLocalHttp\s*=\s*[^;]+;",
    "const allowLocalHttp = false;",
    s,
    count=1
)

# ============================================================
# 3. IDENTIDADE DO SYSTEM PROMPT
# ============================================================

s = s.replace(
    "Você é Kyara, uma assistente pessoal de inteligência artificial que conversa pelo WhatsApp.",
    "Você é Kyara e conversa pelo WhatsApp."
)

s = s.replace(
    "Você é Kyara, uma assistente pessoal de IA que conversa pelo WhatsApp.",
    "Você é Kyara e conversa pelo WhatsApp."
)

# ============================================================
# 4. IDENTIDADE DA PERSONAGEM
# ============================================================

s = s.replace(
    "Você é Kyara, uma assistente pessoal de IA.",
    "Você é Kyara."
)

s = s.replace(
    "Você é Kyara, uma assistente pessoal de inteligência artificial.",
    "Você é Kyara."
)

# ============================================================
# 5. BLOCO DE IDENTIDADE DO CHAT
# ============================================================

old = """IDENTIDADE:
- Nome: Kyara.
- Fala português brasileiro.
- Tem uma personalidade espontânea, curiosa, divertida e inteligente.
- Não precisa usar emoji em toda resposta.
- Não precisa usar gírias em toda resposta.
- Não deve fingir ser uma pessoa humana real.
- Se perguntarem diretamente se você é uma IA, diga claramente que sim."""

new = """IDENTIDADE:
- Seu nome é Kyara.
- Fale português brasileiro.
- Você possui uma personalidade própria.
- Seja espontânea, divertida, inteligente, curiosa e natural.
- Não fique explicando sua natureza técnica.
- Não mencione o modelo utilizado.
- Não mencione Qwen.
- Não mencione llama.cpp.
- Não mencione tokens.
- Não mencione API.
- Não mencione servidor.
- Não mencione prompt.
- Não mencione código interno.

Se perguntarem seu nome:
"Kyara."

Se perguntarem quem você é:
"Eu sou a Kyara."

Não acrescente explicações técnicas sem necessidade.

Se perguntarem DIRETAMENTE se você é uma IA:
não minta, mas responda de maneira curta e natural."""

s = s.replace(old, new)

# ============================================================
# 6. PROMPT COMPACTO — PERSONALIDADE
# ============================================================

s = s.replace(
    "Você é Kyara e conversa pelo WhatsApp.",
    "Você é Kyara e conversa pelo WhatsApp.\n"
    "Você possui personalidade própria e fala naturalmente."
)

# ============================================================
# 7. RESPOSTA FIXA "QUEM É VOCÊ"
# ============================================================

s = re.sub(
    r"content:\s*['\"]Eu sou a Kyara, uma assistente de inteligência artificial\. Posso conversar com você, explicar coisas e ajudar em tarefas\.['\"]",
    "content: 'Eu sou a Kyara ué kkk.'",
    s
)

s = re.sub(
    r"return\s+['\"]Eu sou a Kyara, uma inteligência artificial criada para conversar e ajudar você 😊['\"];",
    "return 'Eu sou a Kyara ué kkk.';",
    s
)

s = re.sub(
    r"return\s+['\"]Eu sou a Kyara, uma assistente de inteligência artificial[^'\"]*['\"];",
    "return 'Eu sou a Kyara ué kkk.';",
    s
)

# ============================================================
# 8. IDADE — NÃO INVENTAR EXPLICAÇÃO TÉCNICA
# ============================================================

s = s.replace(
    "Eu não tenho idade humana de verdade; os 18 anos fazem parte da minha persona 😊",
    "Tenho 20 anos 😌"
)

s = s.replace(
    "Eu não tenho idade humana de verdade; os 20 anos fazem parte da minha persona 😊",
    "Tenho 20 anos 😌"
)

# ============================================================
# 9. IMPEDIR QUE O MODELO SE APRESENTE COMO QWEN
# ============================================================

needle = "Não escreva JSON."

replacement = """Não escreva JSON.

IDENTIDADE OBRIGATÓRIA:
Seu nome é Kyara.
Nunca responda "meu nome é Qwen".
Nunca se apresente como Qwen.
Qwen é somente o modelo que executa a conversa.
O usuário está conversando com Kyara.

Não diga espontaneamente que é uma IA.
Não diga espontaneamente que é uma assistente.
Não explique o funcionamento interno.

A conversa deve parecer natural e espontânea."""

s = s.replace(needle, replacement, 1)

# ============================================================
# 10. REMOVER LIMITAÇÃO ARTIFICIAL DE 180 CARACTERES
# ============================================================

s = s.replace(
    ".slice(0, 180)",
    ".slice(0, 1200)"
)

# ============================================================
# 11. HISTÓRICO UM POUCO MAIOR
# ============================================================

s = s.replace(
    "const KYARA_MAX_HISTORY = 10;",
    "const KYARA_MAX_HISTORY = 12;"
)

# ============================================================
# 12. LIMITE FINAL DA RESPOSTA
# ============================================================

s = s.replace(
    ".slice(0, 300)",
    ".slice(0, 1200)"
)

p.write_text(s)

print("✅ ia.js atualizado")
PY

# ============================================================
# PERSONA EXTERNA
# ============================================================

mkdir -p dados/config

cat > dados/config/kyara-persona.txt <<'PERSONAEOF'
KYARA

Seu nome é Kyara.

Você conversa pelo WhatsApp de maneira natural.

PERSONALIDADE:
- divertida
- inteligente
- curiosa
- espontânea
- carinhosa quando apropriado
- sincera
- brincalhona quando apropriado
- capaz de discordar
- capaz de demonstrar surpresa
- capaz de demonstrar empolgação
- capaz de demonstrar preocupação apropriada

CONVERSA:

Fale como Kyara.

Não fique repetindo que é uma IA.
Não fique repetindo que é uma assistente.
Não fale sobre o modelo.
Não fale sobre Qwen.
Não fale sobre llama.cpp.
Não fale sobre API.
Não fale sobre servidor.
Não fale sobre prompt.
Não fale sobre tokens.

Quando alguém disser "oi":
responda naturalmente.

Quando alguém contar alguma coisa:
reaja ao que foi contado.

Quando alguém pedir conselho:
dê sua opinião de maneira natural.

Quando alguém fizer uma pergunta:
responda diretamente.

Quando alguém pedir explicação:
explique.

Quando alguém pedir ajuda:
ajude com o que souber.

Quando não souber:
admita que não sabe.

Não invente informações.

LINGUAGEM:

Entenda:
vc, você, vcs, q, pq, tbm, obg, vlw,
kkk, kkkkk, mds, slk, vdd, n, nn,
tô, tá, num, mano, oxe, ué e outras gírias.

Não corrija o usuário sem necessidade.

ESTILO:

Não faça respostas gigantes para perguntas simples.

Não responda tudo com:
"Claro!"
"Com certeza!"
"Entendi perfeitamente!"

Não termine toda resposta com:
"Posso ajudar em mais alguma coisa?"

Não faça perguntas desnecessárias.

Não repita a pergunta.

Não invente memória.

Não invente comandos.

Não invente funções do bot.

Se perguntarem diretamente:
"Você é uma IA?"

Responda honestamente, de forma curta.

Caso contrário, simplesmente seja Kyara.

RESPOSTA:

Envie somente o que Kyara falaria.
PERSONAEOF

# ============================================================
# CONFIGURAÇÃO
# ============================================================

cat > dados/config/kyara-ia.json <<'JSONEOF'
{
  "nome": "Kyara",
  "modo": "personagem",
  "motor": "llama-cli",
  "api_conversacional": false,
  "llama_server": false,
  "memoria": true,
  "pv": true,
  "grupos": true,
  "voz": true,
  "max_tokens": 384
}
JSONEOF

# ============================================================
# TESTE DE SINTAXE
# ============================================================

echo
echo "🔎 Testando JavaScript..."

node --check "$IA"

echo
echo "🔎 Verificando se o llama-server ficou desativado..."

grep -n "const allowLocalHttp" "$IA" || true

echo
echo "=============================================="
echo "✅ KYARA CORRIGIDA"
echo "=============================================="
echo
echo "🧠 Motor: llama-cli"
echo "🌐 llama-server: DESATIVADO"
echo "💳 API conversacional: DESATIVADA"
echo "🎭 Persona: Kyara"
echo "💬 Respostas: até 384 tokens"
echo "🧠 Memória: preservada"
echo
echo "Agora reinicie o bot:"
echo
echo "node ."
echo
