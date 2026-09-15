#!/bin/bash
SRC="dados/src"; INDEX="$SRC/index.js"
cp "$INDEX" "$INDEX.fix-menudono-$(date +%Y%m%d-%H%M%S)"
echo "🔧 Corrigindo menudono..."

python3 <<'PY'
from pathlib import Path
p = Path("dados/src/index.js")
s = p.read_text(encoding='utf-8')

# Remove qualquer menudono quebrado do V9
import re
# Apaga todos os cases menudono duplicados
s = re.sub(r"case 'menudono':.*?break;\s*case 'menudono_old':", "case 'menudono_old':", s, flags=re.DOTALL)
s = re.sub(r"case 'menudono':.*?break;", "", s, flags=re.DOTALL)

# Encontra onde inserir - antes do case menulite ou menu
target = "case 'menulite':"
if target not in s:
    target = "case 'menu':"

new_case = """
      case 'menudono':
      case 'ownermenu':
        try {
          if (!isOwner) {
            await reply("⚠️ Este menu é exclusivo para o dono do bot.");
            return;
          }
          console.log('[KYARA V9] Tentando abrir Native Flow OS');
          try {
            const flowModule = await import('./core/nativeFlow/owner-flow.js');
            // seu connect chama a conexão de nazu, então passamos nazu mesmo
            await flowModule.sendOwnerMain(nazu, from, {
              botName: nomebot || 'KYARA',
              userName: pushname || info?.pushName || nomedono || 'Dono',
              prefix: prefix || '/',
              ownerId: numerodono || null
            });
            console.log('[KYARA V9] Native Flow enviado com sucesso');
          } catch (flowErr) {
            console.error('[KYARA V9] Flow falhou, fallback textual:', flowErr.message, flowErr.stack);
            // FALLBACK - seu menu antigo de 436 linhas
            await sendMenuWithMedia('dono', menuDono);
          }
        } catch (error) {
          console.error('Erro fatal menudono:', error);
          await reply("❌ Erro ao carregar painel do dono: " + error.message);
        }
        break;

"""

if target in s:
    s = s.replace(target, new_case + "\n      " + target)
    print("✅ menudono reinserido antes de", target)
else:
    # se não achou, insere antes do último break do switch
    s = s.replace("default:", new_case + "\n      default:")
    print("✅ menudono inserido antes do default")

p.write_text(s, encoding='utf-8')
PY

node --check "$INDEX" && echo "✅ index.js validado"

echo ""
echo "Agora teste manualmente:"
echo "node --input-type=module -e \"import('./dados/src/core/nativeFlow/owner-flow.js').then(m=>console.log('OK', Object.keys(m)))\""
node --input-type=module <<'TEST'
try {
  const m = await import('./dados/src/core/nativeFlow/owner-flow.js')
  console.log('✅ owner-flow.js carregado:', Object.keys(m))
  const m2 = await import('./dados/src/core/nativeFlow/native-flow.js')
  console.log('✅ native-flow.js carregado:', Object.keys(m2))
  console.log('✅ Teste OK - pode iniciar a Kyara')
} catch(e) {
  console.error('❌ Erro no import:', e.message)
  console.error(e.stack)
}
TEST
