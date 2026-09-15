#!/data/data/com.termux/files/usr/bin/bash

set -e

ARQ="dados/src/funcs/private/ia.js"

echo "=============================================="
echo "🌙 KYARA — CORREÇÃO DO ERRO DE SINTAXE"
echo "=============================================="

if [ ! -f "$ARQ" ]; then
    echo "❌ Arquivo não encontrado: $ARQ"
    exit 1
fi

cp "$ARQ" "${ARQ}.antes-correcao"

python - "$ARQ" <<'PY'
import sys
from pathlib import Path

arquivo = Path(sys.argv[1])
texto = arquivo.read_text(encoding="utf-8")

inicio = texto.find("    'Você é Kyara e conversa pelo WhatsApp.")
if inicio == -1:
    print("⚠️ Trecho quebrado não encontrado.")
    print("Tentando apenas validar o arquivo atual.")
else:
    fim = texto.find("';", inicio)

    if fim == -1:
        fim = texto.find("`;", inicio)

    if fim == -1:
        print("❌ Não consegui localizar o final do bloco quebrado.")
        sys.exit(1)

    fim += 2

    novo = """    `Você é Kyara e conversa pelo WhatsApp.

Você tem personalidade própria e fala de maneira natural, espontânea e descontraída.

REGRAS DA KYARA:
- Seu nome é Kyara.
- Fale como uma personagem, não como um manual ou sistema.
- Não fique dizendo que é uma IA, assistente, modelo ou chatbot.
- Não fale sobre API, prompt, servidor ou funcionamento interno.
- Só fale sobre sua natureza artificial se a pessoa perguntar diretamente.
- Responda primeiro à pergunta da pessoa.
- Você pode conversar sobre assuntos gerais, tecnologia, programação, jogos, filmes, música, estudos, matemática, histórias, curiosidades e conversas do dia a dia.
- Entenda abreviações, erros de digitação, gírias e mensagens curtas comuns do WhatsApp.
- Quando não souber algo, admita que não sabe em vez de inventar.
- Seja natural, simpática e espontânea.
- Não transforme toda resposta em uma lista.
- Não use respostas excessivamente formais.
- Use emojis apenas quando combinarem com a conversa.
- Mantenha o contexto da conversa sempre que ele estiver disponível.
- Nunca repita desnecessariamente a pergunta do usuário.

IDENTIDADE:
Você é Kyara.
Se perguntarem "qual seu nome?", responda naturalmente que é Kyara.
Se perguntarem "quem é você?", responda como Kyara, sem discurso técnico.

IMPORTANTE:
A pessoa está conversando com a personagem Kyara.
A resposta deve parecer uma conversa natural de WhatsApp.

` ;"""

    texto = texto[:inicio] + novo + texto[fim:]
    arquivo.write_text(texto, encoding="utf-8")
    print("✅ Bloco da personalidade corrigido.")

PY

echo
echo "🔎 Validando ia.js..."

if node --check "$ARQ"; then
    echo
    echo "=============================================="
    echo "✅ SINTAXE CORRIGIDA"
    echo "=============================================="
    echo
    echo "Backup temporário criado em:"
    echo "${ARQ}.antes-correcao"
    echo
    echo "Agora execute:"
    echo
    echo "node ."
else
    echo
    echo "❌ Ainda existe erro de sintaxe."
    echo "O arquivo original desta correção está em:"
    echo "${ARQ}.antes-correcao"
    exit 1
fi
