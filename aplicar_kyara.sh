#!/data/data/com.termux/files/usr/bin/bash
set -e

cd ~/storage/BKkyara-

echo "=============================================="
echo "       🔧 CORREÇÃO REAL — BKkyara / Kyara"
echo "=============================================="
echo

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="backup-kyara-$STAMP"

mkdir -p "$BACKUP"

echo "💾 Criando backup: $BACKUP"
echo

for f in \
  dados/src/index.js \
  dados/src/utils/database.js \
  dados/src/features/weeklyLevel.js \
  dados/src/features/themeStickers.js \
  dados/src/features/kyaraSpecialCommands.js
do
  if [ -f "$f" ]; then
    cp -p "$f" "$BACKUP/$(basename "$f")"
    echo "  ✓ $f"
  fi
done

echo
echo "🧩 Instalando handler principal da Kyara..."

cat > dados/src/features/kyaraSpecialCommands.js <<'EOF_KYARA'
import {
  loadLevelingSafe,
  getLevelingUser,
  calculateNextLevelXp
} from '../utils/database.js';

import { getUserName, idsMatch } from '../utils/helpers.js';

import {
  syncWeeklyVIP,
  getWeeklyRanking,
  getWeeklyStatus,
  submitIdea,
  listIdeas,
  addWeeklyXP
} from './weeklyLevel.js';

import { sendThemeStickers } from './themeStickers.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeName(id) {
  try {
    return getUserName(id);
  } catch {
    return String(id || '').split('@')[0];
  }
}

function parseStickerArgs(q = '') {
  const parts = String(q || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return {
      theme: '',
      quantity: 5
    };
  }

  const last = parts[parts.length - 1];

  if (/^\d+$/.test(last)) {
    const quantity = Number(last);

    if (parts.length === 1) {
      return {
        theme: '',
        quantity
      };
    }

    return {
      theme: parts.slice(0, -1).join(' ').trim(),
      quantity
    };
  }

  return {
    theme: parts.join(' ').trim(),
    quantity: 5
  };
}

function weeklyOptions(premiumList, premiumFile) {
  return {
    premiumList: premiumList || {},
    premiumFile
  };
}

async function handleLevel({
  sender,
  pushname,
  reply,
  premiumList,
  premiumFile
}) {
  syncWeeklyVIP(
    weeklyOptions(premiumList, premiumFile)
  );

  const levelingData = loadLevelingSafe();
  const user = getLevelingUser(
    levelingData,
    sender
  );

  const level =
    Math.max(
      1,
      Number(user?.level) || 1
    );

  const xp =
    Math.max(
      0,
      Number(user?.xp) || 0
    );

  const nextXp =
    Math.max(
      1,
      Number(calculateNextLevelXp(level)) || 1
    );

  const percent =
    clamp(
      Math.floor((xp / nextXp) * 100),
      0,
      100
    );

  const filled =
    Math.min(
      10,
      Math.floor(percent / 10)
    );

  const bar =
    '█'.repeat(filled) +
    '░'.repeat(10 - filled);

  const missing =
    Math.max(
      0,
      nextXp - xp
    );

  const weekly =
    getWeeklyStatus(sender);

  const weeklyXP =
    Number(weekly?.userXP) || 0;

  const name =
    pushname ||
    safeName(sender);

  const text =
    `╭━━━〔 ⭐ *LEVEL* 〕━━━╮\n` +
    `│ 👤 Jogador: *${name}*\n` +
    `│\n` +
    `│ 📊 Nível: *${level}*\n` +
    `│ 🎖️ Patente: *${user?.patent || 'Iniciante'}*\n` +
    `│\n` +
    `│ ✨ XP: *${xp} / ${nextXp}*\n` +
    `│ 📈 [${bar}] *${percent}%*\n` +
    `│ 🎯 Falta: *${missing} XP*\n` +
    `│\n` +
    `│ 💬 Mensagens: *${Number(user?.messages) || 0}*\n` +
    `│ ⚡ Comandos: *${Number(user?.commands) || 0}*\n` +
    `│ 🗓️ XP semanal: *${weeklyXP}*\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`;

  await reply(text);
}

async function handleRankLevel({
  isGroup,
  groupMembers,
  reply
}) {
  const levelingData =
    loadLevelingSafe();

  let entries =
    Object.entries(
      levelingData?.users || {}
    );

  if (isGroup) {
    const members =
      Array.isArray(groupMembers)
        ? groupMembers
        : [];

    if (members.length) {
      entries =
        entries.filter(([id]) =>
          members.some(member => {
            try {
              return idsMatch(id, member);
            } catch {
              return String(id) === String(member);
            }
          })
        );
    }
  }

  const ranking =
    entries
      .map(([id, user]) => ({
        id,
        level:
          Math.max(
            1,
            Number(user?.level) || 1
          ),
        xp:
          Math.max(
            0,
            Number(user?.xp) || 0
          ),
        messages:
          Math.max(
            0,
            Number(user?.messages) || 0
          ),
        patent:
          user?.patent ||
          'Iniciante'
      }))
      .sort(
        (a, b) =>
          b.level - a.level ||
          b.xp - a.xp ||
          b.messages - a.messages
      )
      .slice(0, 15);

  if (!ranking.length) {
    return reply(
      isGroup
        ? '📊 *RANKING DE LEVEL*\n\nNenhum membro do grupo possui XP registrado ainda.'
        : '📊 *RANKING DE LEVEL*\n\nNenhum usuário possui XP registrado ainda.'
    );
  }

  const mentions =
    ranking.map(user => user.id);

  const lines = [
    `╭━━━〔 🏆 *RANKING DE LEVEL* 〕━━━╮`,
    `│ ${isGroup ? '👥 Grupo atual' : '🌎 Ranking global'}`,
    `│`
  ];

  ranking.forEach((user, index) => {
    const medal =
      ['🥇', '🥈', '🥉'][index] ||
      `${index + 1}º`;

    lines.push(
      `│ ${medal} @${safeName(user.id)}`
    );

    lines.push(
      `│    📊 Nível *${user.level}* • ✨ ${user.xp} XP`
    );

    lines.push(
      `│    🎖️ ${user.patent} • 💬 ${user.messages} msgs`
    );

    if (
      index !==
      ranking.length - 1
    ) {
      lines.push('│');
    }
  });

  lines.push('│');
  lines.push(
    '│ 💡 Continue ativo para subir!'
  );
  lines.push(
    '╰━━━━━━━━━━━━━━━━━━━━╯'
  );

  await reply(
    lines.join('\n'),
    { mentions }
  );
}

async function handleWeeklyRank({
  sender,
  reply,
  premiumList,
  premiumFile
}) {
  const sync =
    syncWeeklyVIP(
      weeklyOptions(
        premiumList,
        premiumFile
      )
    );

  const ranking =
    getWeeklyRanking(15);

  const status =
    getWeeklyStatus(sender);

  if (!ranking.length) {
    return reply(
      `╭━━━〔 🏆 *RANKING SEMANAL* 〕━━━╮\n` +
      `│ 📅 Semana: *${status?.weekKey || 'atual'}*\n` +
      `│\n` +
      `│ 📭 Nenhuma atividade registrada.\n` +
      `│\n` +
      `│ 🎁 Prêmio: *VIP*\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`
    );
  }

  const mentions =
    ranking.map(
      user => user.id
    );

  const lines = [
    `╭━━━〔 🏆 *RANKING SEMANAL* 〕━━━╮`,
    `│ 📅 Semana: *${status?.weekKey || 'atual'}*`,
    `│`
  ];

  ranking.forEach(
    (user, index) => {
      const medal =
        ['🥇', '🥈', '🥉'][index] ||
        `${index + 1}º`;

      lines.push(
        `│ ${medal} @${safeName(user.id)} — *${Number(user.xp) || 0} XP*`
      );
    }
  );

  lines.push('│');

  if (sync?.changed && sync?.winner) {
    lines.push(
      `│ 👑 Vencedor da semana anterior: @${safeName(sync.winner)}`
    );

    lines.push(
      sync.awarded
        ? '│ 🎁 VIP semanal concedido!'
        : '│ 🎁 O vencedor já possuía VIP.'
    );

    mentions.push(sync.winner);

    lines.push('│');
  }

  lines.push(
    '│ 🎁 Prêmio do fechamento: *VIP*'
  );

  lines.push(
    '╰━━━━━━━━━━━━━━━━━━━━╯'
  );

  await reply(
    lines.join('\n'),
    {
      mentions: [
        ...new Set(mentions)
      ]
    }
  );
}

async function handleLevelMenu({
  sender,
  prefix,
  reply,
  premiumList,
  premiumFile
}) {
  syncWeeklyVIP(
    weeklyOptions(
      premiumList,
      premiumFile
    )
  );

  const status =
    getWeeklyStatus(sender);

  await reply(
    `╭━━━〔 ⭐ *MENU LEVEL* 〕━━━╮\n` +
    `│\n` +
    `│ 📊 ${prefix}level\n` +
    `│ 📊 ${prefix}nivel\n` +
    `│ 🏆 ${prefix}ranklevel\n` +
    `│ 🏆 ${prefix}ranksemanal\n` +
    `│ 🏆 ${prefix}rankingsemanal\n` +
    `│ 🏆 ${prefix}topsemanal\n` +
    `│\n` +
    `│ 💡 ${prefix}ideia <sua ideia>\n` +
    `│ 📦 ${prefix}caixadeideias\n` +
    `│\n` +
    `│ 🗓️ Semana: *${status?.weekKey || 'atual'}*\n` +
    `│ 🎁 Prêmio semanal: *VIP*\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`
  );
}

async function handleIdea({
  q,
  sender,
  pushname,
  reply
}) {
  const text =
    String(q || '').trim();

  if (!text) {
    return reply(
      `╭━━━〔 💡 *CAIXA DE IDEIAS* 〕━━━╮\n` +
      `│\n` +
      `│ Use:\n` +
      `│ /ideia sua ideia aqui\n` +
      `│\n` +
      `│ ✨ Sua sugestão será registrada.\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`
    );
  }

  const result =
    submitIdea({
      userId: sender,
      name:
        pushname ||
        safeName(sender),
      idea: text
    });

  if (!result?.success) {
    return reply(
      `❌ Não consegui registrar sua ideia.` +
      (
        result?.error
          ? `\n\n${result.error}`
          : ''
      )
    );
  }

  try {
    addWeeklyXP(
      sender,
      20,
      pushname
    );
  } catch {}

  await reply(
    `╭━━━〔 💡 *IDEIA REGISTRADA* 〕━━━╮\n` +
    `│ 🆔 Nº *${result.id}*\n` +
    `│ 👤 ${pushname || safeName(sender)}\n` +
    `│\n` +
    `│ 📝 ${result.item?.text || text}\n` +
    `│\n` +
    `│ ⭐ +20 XP semanal\n` +
    `│\n` +
    `│ Obrigado por ajudar a melhorar a *Kyara*! ✨\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`
  );
}

async function handleIdeas({
  reply
}) {
  const ideas =
    listIdeas({
      status: null,
      limit: 20
    });

  if (!ideas.length) {
    return reply(
      `╭━━━〔 💡 *CAIXA DE IDEIAS* 〕━━━╮\n` +
      `│\n` +
      `│ 📭 Nenhuma ideia registrada.\n` +
      `│\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`
    );
  }

  const lines = [
    `╭━━━〔 💡 *CAIXA DE IDEIAS* 〕━━━╮`,
    `│`
  ];

  ideas.forEach(
    (item, index) => {
      const text =
        item?.text ??
        item?.idea ??
        'Sem texto';

      const name =
        item?.name ||
        safeName(
          item?.userId ||
          item?.user ||
          ''
        );

      const date =
        item?.createdAt
          ? new Date(
              item.createdAt
            ).toLocaleDateString(
              'pt-BR'
            )
          : 'sem data';

      lines.push(
        `│ 💡 *#${item.id}* — ${name}`
      );

      lines.push(
        `│ 📝 ${text}`
      );

      lines.push(
        `│ 📅 ${date}`
      );

      if (
        index !==
        ideas.length - 1
      ) {
        lines.push('│');
      }
    }
  );

  lines.push('│');
  lines.push(
    '╰━━━━━━━━━━━━━━━━━━━━╯'
  );

  await reply(
    lines.join('\n')
  );
}

async function handleStickers({
  q,
  prefix,
  isGroup,
  sender,
  from,
  nazu,
  info,
  reply
}) {
  const parsed =
    parseStickerArgs(q);

  const theme =
    parsed.theme;

  const quantity =
    parsed.quantity;

  if (!theme) {
    return reply(
      `╭━━━〔 🎨 *FIGURINHAS* 〕━━━╮\n` +
      `│\n` +
      `│ ${prefix}figurinhas goku 3\n` +
      `│ ${prefix}figurinhas naruto 5\n` +
      `│ ${prefix}figurinhas gatos 10\n` +
      `│\n` +
      `│ 🔢 Quantidade: *1 a 20*\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 20
  ) {
    return reply(
      '❌ A quantidade deve ser um número inteiro entre *1 e 20*.'
    );
  }

  const destino =
    isGroup
      ? sender
      : from;

  await reply(
    `╭━━━〔 🎨 *FIGURINHAS* 〕━━━╮\n` +
    `│ 🎯 Tema: *${theme}*\n` +
    `│ 🔢 Quantidade: *${quantity}*\n` +
    `│ 📬 ${isGroup ? 'Enviarei no seu privado.' : 'Enviarei aqui.'}\n` +
    `│ ⏳ Pesquisando imagens...\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`
  );

  const result =
    await sendThemeStickers({
      nazu,
      destino,
      tema: theme,
      quantidade: quantity,
      author: 'Baki',
      packname: 'Kyara',
      quoted:
        isGroup
          ? undefined
          : info
    });

  await nazu.sendMessage(
    destino,
    {
      text:
        `╭━━━〔 ✅ *PACOTE FINALIZADO* 〕━━━╮\n` +
        `│ 🎯 Tema: *${theme}*\n` +
        `│ 📦 Solicitadas: *${result?.requested ?? quantity}*\n` +
        `│ ✅ Enviadas: *${result?.sent ?? 0}*\n` +
        `│ ⚠️ Falhas: *${result?.failed ?? 0}*\n` +
        `│\n` +
        `│ 🎨 Pacote: *Kyara*\n` +
        `│ ✨ Créditos: *Baki*\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯`
    }
  );

  return true;
}

export async function handleKyaraSpecialCommand(options = {}) {
  const {
    command,
    q,
    sender,
    pushname,
    prefix,
    isGroup,
    from,
    nazu,
    info,
    reply,
    groupMembers,
    premiumList,
    premiumFile
  } = options;

  switch (
    String(command || '')
      .trim()
      .toLowerCase()
  ) {
    case 'level':
    case 'nivel':
      await handleLevel({
        sender,
        pushname,
        reply,
        premiumList,
        premiumFile
      });
      return true;

    case 'ranklevel':
      await handleRankLevel({
        isGroup,
        groupMembers,
        reply
      });
      return true;

    case 'menulevel':
    case 'levelmenu':
    case 'nivelmenu':
      await handleLevelMenu({
        sender,
        prefix,
        reply,
        premiumList,
        premiumFile
      });
      return true;

    case 'ranksemanal':
    case 'rankingsemanal':
    case 'topsemanal':
    case 'ranksemana':
    case 'weeklyrank':
      await handleWeeklyRank({
        sender,
        reply,
        premiumList,
        premiumFile
      });
      return true;

    case 'ideia':
    case 'sugerir':
    case 'sugestao':
      await handleIdea({
        q,
        sender,
        pushname,
        reply
      });
      return true;

    case 'caixadeideias':
    case 'ideias':
    case 'listasideias':
      await handleIdeas({
        reply
      });
      return true;

    case 'figurinhas':
    case 'stickerpack':
    case 'packfig':
      await handleStickers({
        q,
        prefix,
        isGroup,
        sender,
        from,
        nazu,
        info,
        reply
      });
      return true;

    default:
      return false;
  }
}
EOF_KYARA

echo "  ✓ kyaraSpecialCommands.js"

echo
echo "🔧 Garantindo integração do handler no index.js..."

python3 <<'PY'
from pathlib import Path

p = Path("dados/src/index.js")
s = p.read_text(encoding="utf-8")

IMPORT = "import { handleKyaraSpecialCommand } from './features/kyaraSpecialCommands.js';"

if IMPORT not in s:
    marker = "import fs from 'fs';"
    if marker not in s:
        raise SystemExit("❌ Não encontrei o ponto seguro para inserir o import.")
    s = s.replace(
        marker,
        IMPORT + "\n" + marker,
        1
    )
    print("  ✓ Import da Kyara adicionado.")
else:
    print("  ✓ Import da Kyara já existe.")

HANDLER_MARKER = "// ⭐ KYARA_SPECIAL_HANDLER_V2"

handler = r'''
    // ⭐ KYARA_SPECIAL_HANDLER_V2
    // Comandos centralizados da Kyara.
    // Este bloco vem antes do switch antigo para evitar
    // que os cases legados capturem os comandos novos.
    if (isCmd) {
      try {
        const kyaraHandled =
          await handleKyaraSpecialCommand({
            command,
            q,
            sender,
            pushname,
            prefix: groupPrefix || prefix,
            isGroup,
            from,
            nazu,
            info,
            reply,
            groupMembers: AllgroupMembers,
            premiumList: premiumListaZinha,
            premiumFile:
              pathz.join(
                DONO_DIR,
                'premium.json'
              )
          });

        if (kyaraHandled) {
          return;
        }
      } catch (kyaraError) {
        console.error(
          '[KYARA SPECIAL V2]',
          kyaraError?.stack ||
          kyaraError?.message ||
          kyaraError
        );

        await reply(
          '❌ A Kyara encontrou um erro ao executar esse comando.'
        );

        return;
      }
    }

'''

if HANDLER_MARKER not in s:
    # Procuramos o primeiro switch principal do comando.
    candidates = [
        "    switch (command) {",
        "    switch(command) {",
        "    switch (command) {"
    ]

    pos = -1
    found = None

    for candidate in candidates:
        pos = s.find(candidate)
        if pos != -1:
            found = candidate
            break

    if pos == -1:
        raise SystemExit(
            "❌ Não encontrei o switch(command) principal."
        )

    s = s[:pos] + handler + s[pos:]

    print(
        "  ✓ Handler V2 inserido antes do switch principal."
    )
else:
    print(
        "  ✓ Handler V2 já estava instalado."
    )

# Corrige explicitamente o parser quebrado das figurinhas
# no case legado. O handler V2 já captura o comando antes dele,
# mas também corrigimos o texto para impedir confusão futura.
s = s.replace(
    "q.trim().split(/\\\\s+/)",
    "q.trim().split(/\\s+/)"
)

# Impede o case RPG legado de possuir ranklevel.
# O handler V2 agora é o responsável pelo /ranklevel.
s = s.replace(
    "case 'ranklevel':\ncase 'ranklvl':\ncase 'rankinglevel':",
    "case 'ranklvl':\ncase 'rankinglevel':"
)

p.write_text(s, encoding="utf-8")
print("  ✓ index.js atualizado.")
PY

echo
echo "🔧 Verificando weeklyLevel.js..."

python3 <<'PY'
from pathlib import Path

p = Path("dados/src/features/weeklyLevel.js")

if not p.exists():
    raise SystemExit("❌ weeklyLevel.js não existe.")

s = p.read_text(encoding="utf-8")

required = [
    "export function addWeeklyXP",
    "export function getWeeklyRanking",
    "export function getWeeklyStatus",
    "export function syncWeeklyVIP",
    "export function submitIdea",
    "export function listIdeas"
]

missing = [
    item for item in required
    if item not in s
]

if missing:
    print("⚠️ weeklyLevel.js ainda não possui:")
    for item in missing:
        print("   -", item)
    print()
    print("O arquivo será preservado para não destruir código existente.")
else:
    print("  ✓ weeklyLevel.js possui as funções necessárias.")
PY

echo
echo "🔧 Verificando themeStickers.js..."

python3 <<'PY'
from pathlib import Path

p = Path("dados/src/features/themeStickers.js")

if not p.exists():
    raise SystemExit("❌ themeStickers.js não existe.")

s = p.read_text(encoding="utf-8")

if "export async function sendThemeStickers" not in s:
    raise SystemExit(
        "❌ themeStickers.js não possui sendThemeStickers."
    )

if "searchThemeImages" not in s:
    print(
        "⚠️ searchThemeImages não encontrada. "
        "A busca pode depender do código legado."
    )
else:
    print(
        "  ✓ themeStickers.js possui busca por tema."
    )
PY

echo
echo "🔎 Validando integração..."

grep -q "KYARA_SPECIAL_HANDLER_V2" dados/src/index.js
grep -q "handleKyaraSpecialCommand" dados/src/index.js

echo "  ✓ Handler encontrado no index.js."
echo

echo "🧪 Verificando sintaxe..."

FILES=(
  dados/src/index.js
  dados/src/utils/database.js
  dados/src/features/weeklyLevel.js
  dados/src/features/themeStickers.js
  dados/src/features/kyaraSpecialCommands.js
)

for f in "${FILES[@]}"; do
  node --check "$f"
  echo "  ✅ $f"
done

echo
echo "🧪 Testando import do handler..."

node --input-type=module <<'NODE'
import { handleKyaraSpecialCommand } from './dados/src/features/kyaraSpecialCommands.js';

if (typeof handleKyaraSpecialCommand !== 'function') {
  throw new Error('handleKyaraSpecialCommand não foi exportado corretamente.');
}

console.log('  ✅ Export do handler funcionando.');
NODE

echo
echo "🔎 Verificando axios..."

if [ -d node_modules/axios ]; then
  echo "  ✅ axios instalada."
else
  echo "  ⚠️ axios não encontrada."
  echo "     Execute: npm install"
fi

echo
echo "=============================================="
echo "       ✅ CORREÇÃO APLICADA"
echo "=============================================="
echo
echo "Backup criado em:"
echo "  $BACKUP"
echo
echo "Comandos corrigidos pelo handler:"
echo
echo "  /level"
echo "  /nivel"
echo "  /ranklevel"
echo "  /menulevel"
echo "  /levelmenu"
echo "  /nivelmenu"
echo "  /ranksemanal"
echo "  /rankingsemanal"
echo "  /topsemanal"
echo "  /ranksemana"
echo "  /weeklyrank"
echo "  /ideia"
echo "  /caixadeideias"
echo "  /ideias"
echo "  /listasideias"
echo "  /figurinhas"
echo "  /stickerpack"
echo "  /packfig"
echo
echo "🎨 Figurinhas: Kyara"
echo "✨ Créditos: Baki"
echo
echo "🚀 Para iniciar:"
echo "  npm start"
echo
