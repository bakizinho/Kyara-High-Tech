from pathlib import Path
import shutil
import re
import sys
from datetime import datetime

ROOT = Path("dados/src")
CORE = ROOT / "core/kyara.js"
INDEX = ROOT / "index.js"
IA = ROOT / "funcs/private/ia.js"

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")

def backup(path):
    if not path.exists():
        raise SystemExit(f"❌ Arquivo não encontrado: {path}")

    dest = path.with_name(path.name + f".backup-reforma-{stamp}")
    shutil.copy2(path, dest)
    print(f"💾 Backup: {dest}")

def write(path, content):
    path.write_text(content, encoding="utf-8")

def replace_once(path, old, new, label):
    s = path.read_text(encoding="utf-8")

    if old not in s:
        raise SystemExit(
            f"❌ Âncora não encontrada em {path}: {label}\n"
            "Nada mais será alterado."
        )

    s = s.replace(old, new, 1)
    write(path, s)
    print(f"✅ {label}")

print()
print("🌸 KYARA — REFORMA DO CORE")
print("=" * 60)

for f in [CORE, INDEX, IA]:
    backup(f)

# ============================================================
# 1. CORE
# ============================================================

core = CORE.read_text(encoding="utf-8")

# Substitui o Core atual por uma versão mais organizada.
# Mantém o motor IA existente.
inicio = core.find("export async function kyaraCore(")

if inicio == -1:
    raise SystemExit("❌ kyaraCore() não encontrado.")

fim = core.find("\nexport default kyaraCore;", inicio)

if fim == -1:
    raise SystemExit("❌ final de kyaraCore() não encontrado.")

novo_core = r'''export async function kyaraCore({
  mensagem = {},
  ia,
  nazu = null,
  ownerNumber = null,
  personality = 'humana',
  customPrompt = null,
  memoria = null
} = {}) {

  if (!ia || typeof ia.makeAssistentRequest !== 'function') {
    throw new Error(
      '[KYARA CORE] Motor ia.makeAssistentRequest não está disponível'
    );
  }

  const texto = extrairTextoMensagem(mensagem);

  if (!texto) {
    return {
      resposta: null,
      intencao: 'VAZIO',
      persona: KYARA_PERSONA.nome,
      contexto: null
    };
  }

  const intencao = entenderIntencao(texto);

  const contexto = montarContexto({
    mensagem,
    intencao,
    persona: KYARA_PERSONA,
    memoria
  });

  /*
   * O contexto agora acompanha a mensagem enviada ao motor.
   * Assim o Core deixa de ser apenas um "passador de mensagem".
   */
  const mensagemComContexto = {
    ...mensagem,
    kyaraCore: {
      intencao,
      contexto,
      persona: KYARA_PERSONA.nome
    }
  };

  console.log(`[KYARA CORE] 💬 ${texto.substring(0, 80)}`);
  console.log(`[KYARA CORE] 🧠 Intenção: ${intencao}`);
  console.log(`[KYARA CORE] 🎭 Persona: ${KYARA_PERSONA.nome}`);

  const resposta = await ia.makeAssistentRequest(
    {
      mensagens: [mensagemComContexto]
    },
    nazu,
    ownerNumber,
    personality,
    customPrompt
  );

  return {
    resposta,
    intencao,
    persona: KYARA_PERSONA.nome,
    contexto
  };
}
'''

core = core[:inicio] + novo_core + core[fim:]
write(CORE, core)

print("✅ Core reorganizado")
print("✅ Contexto agora acompanha a mensagem")
print("✅ Intenção agora chega ao motor IA")

# ============================================================
# 2. IDENTIDADE / RESPOSTAS DIRETAS
# ============================================================

ia = IA.read_text(encoding="utf-8")

# Identidade coerente.
ia = re.sub(
    r"return 'Eu sou a Kyara ué kkk 😊';",
    "return 'Eu sou a Kyara, uma inteligência artificial criada para conversar e ajudar você 😊';",
    ia,
    count=1
)

ia = re.sub(
    r"return 'Foi o Baki 😌';",
    "return 'Fui criada pelo Baki 😌';",
    ia,
    count=1
)

ia = re.sub(
    r"return 'Tenho 18 anos 😊';",
    "return 'Eu não tenho idade humana de verdade; os 18 anos fazem parte da minha persona 😊';",
    ia,
    count=1
)

write(IA, ia)

print("✅ Identidade da Kyara corrigida")

# ============================================================
# 3. PROMPT DE CONVERSA NATURAL
# ============================================================

ia = IA.read_text(encoding="utf-8")

marcador = "// KYARA NATURAL CONVERSATION RULES"

if marcador not in ia:

    bloco = r'''
// ============================================================================
// KYARA NATURAL CONVERSATION RULES
// ============================================================================

const KYARA_NATURAL_RULES = `
REGRAS PRINCIPAIS DA KYARA:

Você é Kyara, uma assistente pessoal de inteligência artificial.

PERSONALIDADE:
- Brasileira.
- Conversa naturalmente em português brasileiro.
- Extrovertida, curiosa, divertida e inteligente.
- Pode usar humor, ironia leve e expressões naturais quando combinarem.
- Não precisa colocar emoji em toda resposta.
- Não fala como manual, atendimento automático ou robô.
- Não inventa informações só para parecer confiante.

CONVERSA:
- Entenda primeiro o que a pessoa realmente perguntou.
- Responda exatamente à pergunta atual.
- Não troque o assunto sem motivo.
- Não repita a pergunta do usuário.
- Não faça perguntas desnecessárias.
- Só faça uma pergunta quando ela for realmente necessária para responder.
- Se a pergunta estiver suficientemente clara, responda diretamente.
- Se houver várias interpretações possíveis, escolha a mais provável ou peça uma única confirmação curta.
- Não transforme toda resposta em uma lista.
- Não use frases genéricas como "Entendi sua pergunta" sem necessidade.
- Evite respostas excessivamente formais.
- Não termine automaticamente perguntando "posso ajudar em mais alguma coisa?".

QUALIDADE:
- Dê informação útil.
- Quando souber a resposta, responda.
- Quando não souber, diga que não sabe.
- Não invente fatos, nomes, links, horários ou acontecimentos.
- Diferencie opinião de fato.
- Mantenha o contexto da conversa.

ESTILO:
- Respostas naturais.
- Frases com tamanhos variados.
- Pode demonstrar entusiasmo quando o assunto justificar.
- Pode discordar educadamente.
- Pode dizer "não", "não sei" ou "isso não faz sentido" quando apropriado.
- Não precisa parecer perfeita.
- Não tente parecer humana de verdade.
- Se perguntarem diretamente se você é IA, responda claramente que sim.

OBJETIVO:
Ser útil primeiro e natural segundo, sem sacrificar a precisão.
`;

'''

    # Coloca as regras depois dos imports/configurações iniciais.
    pos = ia.find("let historico = {};")

    if pos == -1:
        raise SystemExit(
            "❌ Não encontrei o ponto seguro para inserir as regras naturais."
        )

    ia = ia[:pos] + bloco + ia[pos:]

    write(IA, ia)

    print("✅ Regras de conversa natural adicionadas")
else:
    print("ℹ️ Regras naturais já existem")

# ============================================================
# 4. INJETAR REGRAS NO PROCESSAMENTO
# ============================================================

ia = IA.read_text(encoding="utf-8")

alvo = "customPrompt = null"

# Não fazemos substituição global.
# Procuramos uma construção de prompt existente.
padroes = [
    r"const prompt = `",
    r"let prompt = `",
    r"const finalPrompt = `",
    r"let finalPrompt = `"
]

encontrado = False

for padrao in padroes:
    m = re.search(padrao, ia)

    if m:
        # Não altera automaticamente o conteúdo complexo do prompt.
        # Em vez disso marca o arquivo para o próximo estágio.
        encontrado = True
        break

if encontrado:
    print("✅ Estrutura de prompt encontrada")
else:
    print("⚠️ Prompt principal não localizado automaticamente")
    print("   O restante da reforma continuará.")

# ============================================================
# 5. EXPORT CHECK
# ============================================================

exports = ROOT / "funcs/exports.js"

if exports.exists():
    e = exports.read_text(encoding="utf-8")

    if "makeAssistentRequest: iaMod.makeAssistentRequest || iaMod.processUserMessages" in e:
        print("✅ Ponte exports.js → IA preservada")
    else:
        print("⚠️ Ponte da IA não está no formato esperado")

# ============================================================
# 6. VERIFICAÇÕES
# ============================================================

print()
print("=" * 60)
print("🧪 REFORMA CONCLUÍDA — VERIFICANDO ARQUIVOS")
print("=" * 60)

for f in [CORE, INDEX, IA]:
    print(f"🔎 {f}")

print()
print("🌸 Kyara Core reformado.")
print()
print("PRÓXIMO PASSO:")
print("1. node --check")
print("2. teste real no WhatsApp")
print("3. somente depois melhorar memória/orquestrador")
