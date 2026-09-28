import fs from 'fs'
import path from 'path'
import {
  generateWAMessageFromContent,
  proto,
  jidNormalizedUser
} from 'baileys'

const FILE = path.join(
  process.cwd(),
  'dados',
  'database',
  'artists.json'
)

const ACHIEVEMENTS = [
  ['🎨 Primeiro Passo', 1],
  ['🔥 Artista Ativo', 5],
  ['🌟 Criador', 10],
  ['🤝 Parceiro', 1, 'collab'],
  ['🏆 Destaque', 1, 'showcase'],
  ['👑 Veterano', 50]
]

const SPECIALTIES = [
  'Arte Digital',
  'Arte Tradicional',
  'Pintura',
  'OC',
  'Anime/Manga',
  'Concept Art',
  'Cenários',
  'Ilustração',
  'Animação'
]

function defaultData() {
  return {
    users: {},
    challenges: [],
    showcases: [],
    collabs: []
  }
}

function load() {
  try {
    if (!fs.existsSync(FILE)) return defaultData()

    const data = JSON.parse(
      fs.readFileSync(FILE, 'utf8')
    )

    if (!data || typeof data !== 'object') {
      return defaultData()
    }

    data.users ||= {}
    data.challenges ||= []
    data.showcases ||= []
    data.collabs ||= []

    return data
  } catch {
    return defaultData()
  }
}

function save(data) {
  fs.mkdirSync(
    path.dirname(FILE),
    { recursive: true }
  )

  const tmp = `${FILE}.tmp`

  fs.writeFileSync(
    tmp,
    JSON.stringify(data, null, 2)
  )

  fs.renameSync(tmp, FILE)
}

function ensureUser(data, id, name = '') {
  if (!data.users[id]) {
    data.users[id] = {
      id,
      name: name || 'Artista',
      specialty: '',
      bio: '',
      artistXP: 0,
      weeklyXP: 0,
      challenges: [],
      completedChallenges: [],
      achievements: [],
      collabs: 0,
      showcases: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  const user = data.users[id]

  user.name = name || user.name || 'Artista'
  user.challenges ||= []
  user.completedChallenges ||= []
  user.achievements ||= []
  user.artistXP = Number(user.artistXP) || 0
  user.weeklyXP = Number(user.weeklyXP) || 0
  user.collabs = Number(user.collabs) || 0
  user.showcases = Number(user.showcases) || 0

  return user
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function idFromTarget(value, data) {
  const raw = String(value || '')
    .trim()
    .replace(/^@/, '')

  if (!raw) return null

  if (raw.includes('@')) {
    return raw
  }

  const digits = raw.replace(/\D/g, '')

  if (!digits) return null

  const found = Object.keys(data.users).find(
    id => id.split('@')[0] === digits
  )

  return found || `${digits}@s.whatsapp.net`
}

function award(data, id, amount) {
  const user = ensureUser(data, id)

  const xp = Math.max(
    0,
    Number(amount) || 0
  )

  user.artistXP += xp
  user.weeklyXP += xp
  user.updatedAt = new Date().toISOString()

  syncAchievements(user)

  return xp
}

function syncAchievements(user) {
  const add = achievement => {
    if (!user.achievements.includes(achievement)) {
      user.achievements.push(achievement)
    }
  }

  if (user.artistXP >= 1) add('🎨 Primeiro Passo')
  if (user.artistXP >= 5) add('🔥 Artista Ativo')
  if (user.artistXP >= 10) add('🌟 Criador')
  if (user.collabs >= 1) add('🤝 Parceiro')
  if (user.showcases >= 1) add('🏆 Destaque')
  if (user.artistXP >= 50) add('👑 Veterano')
}

function ensureCurrentChallenge(data) {
  if (data.challenges.length) {
    return data.challenges[data.challenges.length - 1]
  }

  const challenge = {
    id: `desafio-${Date.now()}`,
    title: '🌸 RECOMEÇO — Mostre sua arte',
    description:
      'Crie uma arte livre para marcar a reativação da comunidade artística da Kyara.',
    xp: 50,
    status: 'ativo',
    participants: [],
    completed: [],
    createdAt: new Date().toISOString()
  }

  data.challenges.push(challenge)

  return challenge
}

function rows(items) {
  return items.map(item => ({
    title: item.title,
    description: item.description || '',
    id: item.id
  }))
}

async function sendList(
  sock,
  jid,
  title,
  text,
  items = [],
  info
) {
  const options = items
    .map((item, index) => {
      const command = String(item.id || '').trim()
      const description = String(item.description || '').trim()
      return `${index + 1}. *${item.title || 'Opção'}*\n${description ? description + '\n' : ''}${command}`
    })
    .join('\n\n')

  const message = [
    String(text || '').trim(),
    options ? `\n\n━━━━━━━━━━━━━━━━━━\n${options}` : '',
    '\n\nResponda enviando o comando da opção desejada.'
  ].join('')

  await sock.sendMessage(
    jid,
    { text: message },
    info ? { quoted: info } : {}
  )
}

async function mainMenu(
  sock,
  jid,
  prefix,
  info
) {
  return sendList(
    sock,
    jid,
    '🌸 MENU ARTISTA',
    `🌸 *MENU ARTISTA*

A comunidade voltou. Escolha uma categoria:

🎨 Perfil • sua identidade artística
🏆 Desafios • atividades e participação
⭐ Destaques • showcases e artistas
📈 Ranking • XP da comunidade
🏅 Conquistas • evolução artística
🤝 Collabs • encontre parceiros
📚 Guias • regras e funcionamento`,
    [
      {
        title: '🎨 Meu Perfil',
        description: 'Ver e editar seu perfil artístico',
        id: `${prefix}artista perfil`
      },
      {
        title: '🏆 Desafios',
        description: 'Desafio atual, participação e histórico',
        id: `${prefix}artista desafio`
      },
      {
        title: '⭐ Destaques',
        description: 'Artista da semana e Showcase',
        id: `${prefix}artista destaque`
      },
      {
        title: '📈 Ranking',
        description: 'XP geral, semanal e sua posição',
        id: `${prefix}artista ranking`
      },
      {
        title: '🏅 Conquistas',
        description: 'Suas conquistas e próximas metas',
        id: `${prefix}artista conquistas`
      },
      {
        title: '🤝 Collabs',
        description: 'Procurar artistas e colaborações',
        id: `${prefix}artista collab`
      },
      {
        title: '📚 Guias',
        description: 'Participação, regras e XP',
        id: `${prefix}artista guia`
      }
    ],
    info
  )
}

function readGeneralLevel(id) {
  try {
    const file = path.join(
      process.cwd(),
      'dados',
      'database',
      'leveling.json'
    )

    if (!fs.existsSync(file)) {
      return { level: 0, xp: 0 }
    }

    const data = JSON.parse(
      fs.readFileSync(file, 'utf8')
    )

    const user = data?.users?.[id] || {}

    return {
      level: Number(user.level) || 0,
      xp: Number(user.xp) || 0
    }
  } catch {
    return { level: 0, xp: 0 }
  }
}

function profileText(user, level) {
  return (
    `╭─〔 🌸 *PERFIL ARTISTA* 〕─╮\n\n` +
    `👤 *Artista:* ${user.name}\n` +
    `🎨 *Especialidade:* ${user.specialty || 'Não definida'}\n` +
    `📈 *Nível Kyara:* ${level.level}\n` +
    `✨ *XP Kyara:* ${level.xp}\n` +
    `🎨 *XP Artista:* ${user.artistXP}\n` +
    `🏆 *Desafios:* ${user.completedChallenges.length}\n` +
    `🤝 *Collabs:* ${user.collabs}\n` +
    `⭐ *Showcases:* ${user.showcases}\n\n` +
    `📝 *Bio:* ${user.bio || 'Ainda não adicionada.'}\n\n` +
    `╰────────────────────╯`
  )
}

async function profileMenu(sock, jid, user, prefix, info) {
  await sendList(
    sock,
    jid,
    '🎨 MEU PERFIL',
    profileText(
      user,
      readGeneralLevel(user.id)
    ),
    [
      {
        title: '👤 Ver perfil',
        description: 'Visualizar seu perfil completo',
        id: `${prefix}artista perfil ver`
      },
      {
        title: '✏️ Editar perfil',
        description: 'Nome, especialidade e bio',
        id: `${prefix}artista perfil editar`
      },
      {
        title: '🎨 Minha especialidade',
        description: 'Definir sua área artística',
        id: `${prefix}artista especialidade`
      }
    ],
    info
  )
}

async function challengeMenu(
  sock,
  jid,
  data,
  user,
  prefix,
  info
) {
  const current = ensureCurrentChallenge(data)

  save(data)

  await sendList(
    sock,
    jid,
    '🏆 DESAFIOS',
    `🏆 *DESAFIO ATUAL*

🎨 *${current.title}*

${current.description}

✨ Recompensa: *${current.xp} XP Artista*
👥 Participantes: ${current.participants.length}`,
    [
      {
        title: '🔥 Desafio atual',
        description: 'Ver detalhes',
        id: `${prefix}artista desafio atual`
      },
      {
        title: '🎯 Participar',
        description: 'Entrar no desafio atual',
        id: `${prefix}artista desafio participar`
      },
      {
        title: '🏁 Concluir',
        description: 'Enviar sua conclusão',
        id: `${prefix}artista desafio concluir`
      },
      {
        title: '📋 Meus desafios',
        description: 'Desafios em que você entrou',
        id: `${prefix}artista desafio meus`
      },
      {
        title: '📚 Histórico',
        description: 'Desafios concluídos',
        id: `${prefix}artista desafio historico`
      }
    ],
    info
  )
}

async function highlightMenu(
  sock,
  jid,
  data,
  prefix,
  info
) {
  const recent =
    data.showcases
      .slice()
      .reverse()
      .slice(0, 5)

  const text =
    recent.length
      ? recent.map(
          (x, i) =>
            `${i + 1}. 🎨 *${x.name}*\n${x.text}`
        ).join('\n\n')
      : 'Ainda não existem showcases enviados.'

  await sendList(
    sock,
    jid,
    '⭐ DESTAQUES',
    `⭐ *DESTAQUES*

${text}`,
    [
      {
        title: '🌟 Artista da semana',
        description: 'Ver destaque semanal',
        id: `${prefix}artista destaque semana`
      },
      {
        title: '⭐ Destaques',
        description: 'Últimos artistas destacados',
        id: `${prefix}artista destaque lista`
      },
      {
        title: '🎨 Showcase',
        description: 'Ver ou enviar seu showcase',
        id: `${prefix}artista showcase`
      }
    ],
    info
  )
}

function ranking(data, userId, weekly = false) {
  return Object.values(data.users)
    .sort((a, b) => {
      const ax = weekly ? a.weeklyXP : a.artistXP
      const bx = weekly ? b.weeklyXP : b.artistXP
      return bx - ax
    })
}

async function rankingMenu(
  sock,
  jid,
  data,
  user,
  prefix,
  info
) {
  const list = ranking(data, user.id)

  const text = list.length
    ? list.slice(0, 10).map(
        (x, i) =>
          `${i + 1}. 🎨 *${x.name}* — ${x.artistXP} XP`
      ).join('\n')
    : 'Nenhum artista possui XP ainda.'

  await sendList(
    sock,
    jid,
    '📈 RANKING',
    `📈 *RANKING XP*

${text}`,
    [
      {
        title: '🏆 Ranking XP',
        description: 'XP total dos artistas',
        id: `${prefix}artista ranking xp`
      },
      {
        title: '📅 Ranking semanal',
        description: 'XP conquistado nesta semana',
        id: `${prefix}artista ranking semanal`
      },
      {
        title: '📍 Minha posição',
        description: 'Sua posição no ranking',
        id: `${prefix}artista ranking posicao`
      }
    ],
    info
  )
}

async function achievementMenu(
  sock,
  jid,
  user,
  prefix,
  info
) {
  const next = ACHIEVEMENTS
    .filter(x => !user.achievements.includes(x[0]))
    .slice(0, 5)

  await sendList(
    sock,
    jid,
    '🏅 CONQUISTAS',
    `🏅 *MINHAS CONQUISTAS*

${
  user.achievements.length
    ? user.achievements.map(x => `• ${x}`).join('\n')
    : 'Nenhuma conquista ainda.'
}`,
    [
      {
        title: '🏅 Minhas conquistas',
        description: 'Ver conquistas desbloqueadas',
        id: `${prefix}artista conquistas minhas`
      },
      {
        title: '🎯 Próximas conquistas',
        description: 'Veja o que falta desbloquear',
        id: `${prefix}artista conquistas proximas`
      }
    ],
    info
  )
}

async function collabMenu(
  sock,
  jid,
  data,
  user,
  prefix,
  info
) {
  const artists = Object.values(data.users)
    .filter(x => x.id !== user.id)
    .slice(0, 10)

  const list =
    artists.length
      ? artists.map(
          x =>
            `🎨 ${x.name} — ${
              x.specialty || 'especialidade não definida'
            }`
        ).join('\n')
      : 'Ainda não existem outros artistas cadastrados.'

  await sendList(
    sock,
    jid,
    '🤝 COLLABS',
    `🤝 *ARTISTAS DISPONÍVEIS*

${list}`,
    [
      {
        title: '🔎 Procurar artista',
        description: 'Encontrar artistas da comunidade',
        id: `${prefix}artista collab procurar`
      },
      {
        title: '🤝 Procurar colaboração',
        description: 'Ver pedidos abertos',
        id: `${prefix}artista collab pedidos`
      },
      {
        title: '📨 Criar pedido',
        description: 'Solicitar uma collab',
        id: `${prefix}artista collab criar`
      }
    ],
    info
  )
}

async function guideMenu(
  sock,
  jid,
  prefix,
  info
) {
  await sendList(
    sock,
    jid,
    '📚 GUIAS',
    `📚 *GUIA DA COMUNIDADE ARTISTA*

🎨 *Como participar*
Crie seu perfil, participe dos desafios, publique WIPs, faça collabs e envie showcases.

📜 *Regras*
Respeite outros artistas, dê créditos, não copie trabalhos e mantenha o ambiente saudável.

✨ *Sistema de XP*
Participação, desafios, collabs, showcases e contribuições podem gerar XP Artista.

🌸 A ideia é reconhecer evolução, criatividade e participação — não apenas competição.`,
    [
      {
        title: '🎨 Como participar',
        description: 'Primeiros passos',
        id: `${prefix}artista guia participar`
      },
      {
        title: '📜 Regras',
        description: 'Regras da comunidade',
        id: `${prefix}artista guia regras`
      },
      {
        title: '✨ Sistema de XP',
        description: 'Como ganhar XP Artista',
        id: `${prefix}artista guia xp`
      }
    ],
    info
  )
}

export async function handleArtistCommand({
  sock,
  jid,
  userId,
  pushName = 'Artista',
  prefix = '/',
  args = [],
  info,
  reply,
  isOwner = false
}) {
  const data = load()
  const user = ensureUser(
    data,
    userId,
    pushName
  )

  const action = normalize(args[0])
  const sub = normalize(args[1])

  if (!action) {
    save(data)
    return mainMenu(
      sock,
      jid,
      prefix,
      info
    )
  }

  if (action === 'perfil') {
    if (!sub || sub === 'ver') {
      return reply(
        profileText(
          user,
          readGeneralLevel(user.id)
        )
      )
    }

    if (sub === 'editar') {
      const values = args
        .slice(2)
        .join(' ')
        .split('|')
        .map(x => x.trim())

      if (!values[0]) {
        return reply(
          `✏️ *EDITAR PERFIL*

Use:

${prefix}artista perfil editar Nome | Especialidade | Bio

Exemplo:

${prefix}artista perfil editar Kyara | Arte Digital | Ilustrações e personagens`
        )
      }

      user.name = values[0]
      if (values[1]) user.specialty = values[1]
      if (values[2]) user.bio = values.slice(2).join(' | ')

      user.updatedAt = new Date().toISOString()
      save(data)

      return reply(
        '✅ *Perfil artístico atualizado!*\n\n' +
        profileText(
          user,
          readGeneralLevel(user.id)
        )
      )
    }

    return profileMenu(
      sock,
      jid,
      user,
      prefix,
      info
    )
  }

  if (action === 'especialidade') {
    const value = args
      .slice(1)
      .join(' ')
      .trim()

    if (!value) {
      return reply(
        `🎨 *MINHA ESPECIALIDADE*

Atual: ${
  user.specialty || 'Não definida'
}

Escolha uma:

${SPECIALTIES.map(x => `• ${x}`).join('\n')}

Para definir:

${prefix}artista especialidade Arte Digital`
      )
    }

    user.specialty = value
    save(data)

    return reply(
      `✅ Especialidade definida como *${value}*.`
    )
  }

  if (action === 'desafio') {
    const current = ensureCurrentChallenge(data)

    if (!sub) {
      save(data)
      return challengeMenu(
        sock,
        jid,
        data,
        user,
        prefix,
        info
      )
    }

    if (sub === 'atual') {
      save(data)
      return reply(
        `🏆 *${current.title}*

${current.description}

✨ Recompensa: *${current.xp} XP Artista*
👥 Participantes: ${current.participants.length}`
      )
    }

    if (sub === 'participar') {
      if (!current.participants.includes(user.id)) {
        current.participants.push(user.id)
        user.challenges.push(current.id)
        award(data, user.id, 10)
        save(data)

        return reply(
          `🔥 *Você entrou no desafio!*

🎨 ${current.title}
✨ +10 XP Artista

A recompensa principal vem ao concluir o desafio.`
        )
      }

      return reply(
        'ℹ️ Você já está participando deste desafio.'
      )
    }

    if (sub === 'concluir') {
      if (!current.participants.includes(user.id)) {
        return reply(
          `⚠️ Primeiro participe com:

${prefix}artista desafio participar`
        )
      }

      if (!current.completed.includes(user.id)) {
        current.completed.push(user.id)

        if (!user.completedChallenges.includes(current.id)) {
          user.completedChallenges.push(current.id)
        }

        award(data, user.id, Number(current.xp) || 50)
        save(data)

        return reply(
          `🏆 *DESAFIO CONCLUÍDO!*

🎨 ${current.title}
✨ +${current.xp} XP Artista
🔥 Sua participação foi registrada!`
        )
      }

      return reply(
        'ℹ️ Este desafio já está registrado como concluído para você.'
      )
    }

    if (sub === 'meus') {
      const joined = data.challenges
        .filter(x => user.challenges.includes(x.id))

      return reply(
        joined.length
          ? `📋 *MEUS DESAFIOS*\n\n${
              joined.map(
                x =>
                  `• ${x.title}${
                    user.completedChallenges.includes(x.id)
                      ? ' — ✅ concluído'
                      : ' — 🔥 participando'
                  }`
              ).join('\n')
            }`
          : '📋 Você ainda não participou de nenhum desafio.'
      )
    }

    if (sub === 'historico') {
      const completed = data.challenges
        .filter(x => user.completedChallenges.includes(x.id))

      return reply(
        completed.length
          ? `📚 *HISTÓRICO*\n\n${
              completed.map(
                x => `🏆 ${x.title}`
              ).join('\n')
            }`
          : '📚 Nenhum desafio concluído ainda.'
      )
    }

    return challengeMenu(
      sock,
      jid,
      data,
      user,
      prefix,
      info
    )
  }

  if (action === 'destaque') {
    if (!sub) {
      save(data)
      return highlightMenu(
        sock,
        jid,
        data,
        prefix,
        info
      )
    }

    if (sub === 'semana') {
      const list = ranking(
        data,
        user.id,
        true
      )

      const winner = list[0]

      return reply(
        winner
          ? `🌟 *ARTISTA DA SEMANA*

🎨 ${winner.name}
✨ ${winner.weeklyXP} XP nesta semana
🏅 ${winner.specialty || 'Especialidade não definida'}`
          : 'Ainda não existe atividade semanal registrada.'
      )
    }

    if (sub === 'lista') {
      return reply(
        data.showcases.length
          ? `⭐ *DESTAQUES*\n\n${
              data.showcases
                .slice()
                .reverse()
                .slice(0, 10)
                .map(
                  x =>
                    `🎨 *${x.name}*\n${x.text}`
                )
                .join('\n\n')
            }`
          : 'Ainda não existem destaques.'
      )
    }

    return highlightMenu(
      sock,
      jid,
      data,
      prefix,
      info
    )
  }

  if (action === 'showcase') {
    const text = args
      .slice(1)
      .join(' ')
      .trim()

    if (!text) {
      return reply(
        `🎨 *SHOWCASE*

Envie seu trabalho com:

${prefix}artista showcase [descrição ou link]

Exemplo:

${prefix}artista showcase Minha nova ilustração de personagem 🌸`
      )
    }

    data.showcases.push({
      id: `showcase-${Date.now()}`,
      userId: user.id,
      name: user.name,
      text,
      createdAt: new Date().toISOString()
    })

    user.showcases += 1
    award(data, user.id, 15)
    save(data)

    return reply(
      '⭐ *SHOWCASE ENVIADO!*\n\n' +
      '🎨 Seu trabalho entrou na galeria da comunidade.\n' +
      '✨ +15 XP Artista'
    )
  }

  if (action === 'ranking') {
    if (!sub) {
      return rankingMenu(
        sock,
        jid,
        data,
        user,
        prefix,
        info
      )
    }

    const weekly = sub === 'semanal'
    const list = ranking(
      data,
      user.id,
      weekly
    )

    if (sub === 'posicao') {
      const position =
        list.findIndex(
          x => x.id === user.id
        ) + 1

      return reply(
        position > 0
          ? `📍 *SUA POSIÇÃO*

🏆 ${position}º lugar
🎨 ${user.name}
✨ ${
  weekly
    ? user.weeklyXP
    : user.artistXP
} XP`
          : 'Você ainda não possui posição.'
      )
    }

    return reply(
      `📈 *${weekly ? 'RANKING SEMANAL' : 'RANKING XP'}*\n\n` +
      (
        list.length
          ? list.slice(0, 15).map(
              (x, i) =>
                `${i + 1}. 🎨 ${x.name} — ${
                  weekly
                    ? x.weeklyXP
                    : x.artistXP
                } XP`
            ).join('\n')
          : 'Nenhum artista registrado.'
      )
    )
  }

  if (action === 'conquistas') {
    if (!sub) {
      return achievementMenu(
        sock,
        jid,
        user,
        prefix,
        info
      )
    }

    if (sub === 'minhas') {
      return reply(
        `🏅 *MINHAS CONQUISTAS*\n\n${
          user.achievements.length
            ? user.achievements.map(x => `• ${x}`).join('\n')
            : 'Nenhuma ainda.'
        }`
      )
    }

    if (sub === 'proximas') {
      const next = ACHIEVEMENTS
        .filter(x => !user.achievements.includes(x[0]))

      return reply(
        `🎯 *PRÓXIMAS CONQUISTAS*\n\n${
          next.length
            ? next.map(
                x =>
                  `• ${x[0]} — ${
                    x[2] === 'collab'
                      ? 'Faça uma collab'
                      : x[2] === 'showcase'
                        ? 'Envie um showcase'
                        : `${x[1]} XP`
                  }`
              ).join('\n')
            : '🎉 Todas desbloqueadas!'
        }`
      )
    }

    return achievementMenu(
      sock,
      jid,
      user,
      prefix,
      info
    )
  }

  if (action === 'collab') {
    if (!sub) {
      return collabMenu(
        sock,
        jid,
        data,
        user,
        prefix,
        info
      )
    }

    if (sub === 'procurar') {
      const artists = Object.values(data.users)
        .filter(x => x.id !== user.id)
        .slice(0, 20)

      return reply(
        artists.length
          ? `🔎 *ARTISTAS*\n\n${
              artists.map(
                x =>
                  `🎨 *${x.name}*\n` +
                  `• Especialidade: ${
                    x.specialty || 'Não definida'
                  }\n` +
                  `• XP: ${x.artistXP}`
              ).join('\n\n')
            }`
          : 'Nenhum outro artista cadastrado.'
      )
    }

    if (sub === 'pedidos') {
      const requests = data.collabs.filter(
        x =>
          x.status === 'aberto' &&
          (
            x.from === user.id ||
            x.to === user.id
          )
      )

      return reply(
        requests.length
          ? `🤝 *PEDIDOS DE COLLAB*\n\n${
              requests.map(
                x =>
                  `📨 ${x.from === user.id ? 'Para' : 'De'}: ${
                    x.from === user.id ? x.to : x.from
                  }\n📝 ${x.message}`
              ).join('\n\n')
            }`
          : '🤝 Nenhum pedido de colaboração aberto para você.'
      )
    }

    if (sub === 'criar') {
      const raw = args
        .slice(2)
        .join(' ')
        .split('|')
        .map(x => x.trim())

      if (!raw[0]) {
        return reply(
          `📨 *CRIAR COLLAB*

Use:

${prefix}artista collab criar NUMERO | mensagem

Exemplo:

${prefix}artista collab criar 5584999999999 | Vamos fazer uma arte juntos?`
        )
      }

      const target = idFromTarget(
        raw[0],
        data
      )

      if (!target || target === user.id) {
        return reply('❌ Artista de destino inválido.')
      }

      ensureUser(data, target)

      const request = {
        id: `collab-${Date.now()}`,
        from: user.id,
        to: target,
        message: raw.slice(1).join(' | ') || 'Gostaria de fazer uma collab.',
        status: 'aberto',
        createdAt: new Date().toISOString()
      }

      data.collabs.push(request)
      user.collabs += 1
      award(data, user.id, 40)
      save(data)

      try {
        await sock.sendMessage(
          target,
          {
            text:
              `🤝 *NOVO PEDIDO DE COLLAB*\n\n` +
              `🎨 ${user.name}\n` +
              `📝 ${request.message}\n\n` +
              `Responda com:\n` +
              `${prefix}artista collab pedidos`
          }
        )
      } catch {}

      return reply(
        '✅ *Pedido de colaboração enviado!*\n\n✨ +40 XP Artista'
      )
    }

    return collabMenu(
      sock,
      jid,
      data,
      user,
      prefix,
      info
    )
  }

  if (action === 'guia') {
    return guideMenu(
      sock,
      jid,
      prefix,
      info
    )
  }

  if (action === 'admin') {
    if (!isOwner) {
      return reply(
        '⛔ Apenas o dono pode administrar os desafios.'
      )
    }

    if (sub === 'desafio') {
      const values = args
        .slice(2)
        .join(' ')
        .split('|')
        .map(x => x.trim())

      if (!values[0] || !values[1]) {
        return reply(
          `Uso:\n${prefix}artista admin desafio Título | Descrição | XP`
        )
      }

      const xp = Math.max(
        1,
        Number(values[2]) || 50
      )

      data.challenges.push({
        id: `desafio-${Date.now()}`,
        title: values[0],
        description: values[1],
        xp,
        status: 'ativo',
        participants: [],
        completed: [],
        createdAt: new Date().toISOString()
      })

      save(data)

      return reply(
        `✅ *Novo desafio criado!*\n\n🏆 ${values[0]}\n✨ ${xp} XP`
      )
    }
  }

  save(data)

  return mainMenu(
    sock,
    jid,
    prefix,
    info
  )
}
