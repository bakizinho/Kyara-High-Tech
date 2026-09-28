import fs from 'node:fs'
import path from 'node:path'

const FILE =
  path.join(
    process.cwd(),
    'dados',
    'database',
    'dono',
    'customCommands.json'
  )

const sessions =
  new Map()

const TTL =
  10 * 60 * 1000

const CATEGORIES =
  Object.freeze([
    ['1', 'downloads', '📥 Downloads'],
    ['2', 'logos', '🎨 Logos'],
    ['3', 'edits', '✏️ Edits'],
    ['4', 'admin', '👮 Administração'],
    ['5', 'brincadeiras', '🎮 Brincadeiras'],
    ['6', 'ferramentas', '🧰 Ferramentas'],
    ['7', 'figurinhas', '🎨 Figurinhas'],
    ['8', 'alteradores', '✨ Alteradores'],
    ['9', 'rpg', '⚔️ RPG'],
    ['10', 'artista', '🎨 Artista'],
    ['11', 'vip', '⭐ VIP'],
    ['12', 'dono', '👑 Dono'],
    ['13', 'ia', '🧠 IA'],
    ['14', 'personalizado', '🛠️ Personalizado'],
    ['15', 'outros', '📦 Outros']
  ])

function sessionKey(
  from,
  sender
) {
  return `${from || ''}|${sender || ''}`
}

function normalize(
  value
) {
  return String(
    value || ''
  )
    .trim()
    .replace(
      /^[.#\/!]+/,
      ''
    )
    .toLowerCase()
    .normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /\s+/g,
      ''
    )
}

function validTrigger(
  value
) {
  return /^[a-z0-9_][a-z0-9_-]{1,31}$/i.test(
    value
  )
}

function ensure() {
  fs.mkdirSync(
    path.dirname(FILE),
    {
      recursive: true
    }
  )

  if (
    !fs.existsSync(FILE)
  ) {
    fs.writeFileSync(
      FILE,
      JSON.stringify(
        {
          commands: []
        },
        null,
        2
      ),
      'utf8'
    )
  }
}

function load() {
  ensure()

  try {
    const data =
      JSON.parse(
        fs.readFileSync(
          FILE,
          'utf8'
        )
      )

    return Array.isArray(
      data?.commands
    )
      ? data.commands
      : []

  } catch {
    return []
  }
}

function save(
  commands
) {
  ensure()

  const temp =
    `${FILE}.tmp-${process.pid}-${Date.now()}`

  fs.writeFileSync(
    temp,
    JSON.stringify(
      {
        commands
      },
      null,
      2
    ),
    'utf8'
  )

  fs.renameSync(
    temp,
    FILE
  )

  return true
}

function textOf(
  info
) {
  const message =
    info?.message || {}

  /*
   * Native Flow.
   */
  try {
    const raw =
      message
        ?.interactiveResponseMessage
        ?.nativeFlowResponseMessage
        ?.paramsJson

    if (raw) {
      const params =
        JSON.parse(
          raw
        )

      if (
        params?.id
      ) {
        return String(
          params.id
        ).trim()
      }
    }
  } catch {}

  return String(
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentWithCaptionMessage?.caption ||
    info?.text ||
    ''
  ).trim()
}

function categoryFromInput(
  input
) {
  const raw =
    String(
      input || ''
    )
      .trim()
      .toLowerCase()

  const byNumber =
    CATEGORIES.find(
      item =>
        item[0] === raw
    )

  if (
    byNumber
  ) {
    return byNumber
  }

  const byId =
    CATEGORIES.find(
      item =>
        item[1] === raw
    )

  if (
    byId
  ) {
    return byId
  }

  const byLabel =
    CATEGORIES.find(
      item =>
        item[2]
          .toLowerCase()
          .includes(raw)
    )

  return byLabel ||
    CATEGORIES[
      CATEGORIES.length - 1
    ]
}

function categoryLabel(
  id
) {
  return (
    CATEGORIES.find(
      item =>
        item[1] === id
    )?.[2] ||
    '📦 Outros'
  )
}

function askCategory(
  reply
) {
  return reply(
    [
      '🗂️ *CATEGORIA DO COMANDO*',
      '',
      ...CATEGORIES.map(
        item =>
          `${item[0]}️⃣ ${item[2]}`
      ),
      '',
      'Envie o número ou o nome.',
      '',
      'Para cancelar: *cancelar*'
    ].join('\n')
  )
}

function askResponse(
  session,
  reply,
  prefix
) {
  session.step =
    'response'

  session.createdAt =
    Date.now()

  return reply(
    [
      '📝 *RESPOSTA DO COMANDO*',
      '',
      `⚡ ${prefix}${session.trigger}`,
      '',
      'Agora envie a resposta que o comando deverá mandar.',
      '',
      '*#use#* = usuário que executou',
      '*#gif* = adicionar GIF/vídeo',
      '',
      'Para cancelar: *cancelar*'
    ].join('\n')
  )
}

function askGif(
  session,
  reply
) {
  session.step =
    'gif'

  session.createdAt =
    Date.now()

  return reply(
    [
      '🎞️ *MÍDIA DO COMANDO*',
      '',
      'Responda esta mensagem com um GIF/vídeo.',
      '',
      'O vídeo será salvo dentro do comando.',
      '',
      'Para cancelar: *cancelar*'
    ].join('\n')
  )
}

async function finish(
  session,
  sessionKeyValue,
  prefix,
  reply,
  gif
) {
  const commands =
    load()

  const trigger =
    normalize(
      session.trigger
    )

  if (
    !validTrigger(trigger)
  ) {
    await reply(
      '❌ Gatilho inválido.'
    )

    return true
  }

  if (
    commands.some(
      item =>
        normalize(
          item.trigger
        ) === trigger
    )
  ) {
    await reply(
      `❌ O comando ${prefix}${trigger} já existe.`
    )

    return true
  }

  const caption =
    String(
      session.template ||
      ''
    )
      .replace(
        /#gif/gi,
        ''
      )
      .trim()

  const command = {
    id:
      `creator-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    trigger,

    category:
      session.category ||
      'outros',

    categoryName:
      categoryLabel(
        session.category
      ),

    response:
      gif
        ? {
            type:
              'video',

            buffer:
              Buffer.from(
                gif
              ).toString(
                'base64'
              ),

            caption,

            mimetype:
              'video/mp4',

            gifPlayback:
              true,

            fileName:
              `${trigger}.mp4`
          }
        : caption,

    createdAt:
      new Date().toISOString(),

    createdBy:
      String(
        session.createdBy ||
        ''
      ),

    settings: {
      ownerOnly:
        false,

      adminOnly:
        false,

      context:
        'both',

      params:
        [],

      actionTemplate:
        true,

      category:
        session.category ||
        'outros'
    },

    usage:
      `${prefix}${trigger}`
  }

  commands.push(
    command
  )

  save(
    commands
  )

  sessions.delete(
    sessionKeyValue
  )

  await reply(
    [
      gif
        ? '✅ *COMANDO COM GIF CRIADO*'
        : '✅ *COMANDO CRIADO*',

      '',

      `⚡ *${prefix}${trigger}*`,

      `🗂️ ${command.categoryName}`,

      '',

      '📝 Resposta:',

      caption ||
        'Sem texto',

      gif
        ? '\n🎞️ Vídeo/GIF: salvo.'
        : '',

      '',

      `Digite *${prefix}${trigger}* para testar.`
    ].join('\n')
  )

  return true
}

export function getCategories() {
  return CATEGORIES.map(
    item => ({
      id:
        item[1],

      title:
        item[2]
    })
  )
}

export function getCategoryLabel(
  id
) {
  return categoryLabel(
    id
  )
}

export async function startCreate({
  sender,
  from,
  isOwnerOrSub,
  trigger = '',
  reply
} = {}) {
  if (
    !isOwnerOrSub
  ) {
    await reply(
      '╭─ 🚫 *SEM PERMISSÃO*\n│ Apenas dono e subdonos podem criar comandos.\n╰────────────────────────╯'
    )

    return true
  }

  const key =
    sessionKey(
      from,
      sender
    )

  const name =
    normalize(
      trigger
    )

  if (
    name &&
    !validTrigger(name)
  ) {
    await reply(
      '❌ Nome inválido. Use letras, números, _ ou -.'
    )

    return true
  }

  if (
    name &&
    load().some(
      item =>
        normalize(
          item.trigger
        ) === name
    )
  ) {
    await reply(
      `❌ O comando ${name} já existe.`
    )

    return true
  }

  sessions.set(
    key,
    {
      step:
        name
          ? 'category'
          : 'name',

      trigger:
        name,

      category:
        '',

      template:
        '',

      createdBy:
        String(
          sender || ''
        ),

      createdAt:
        Date.now()
    }
  )

  if (
    name
  ) {
    await reply(
      [
        '✨ *CRIADOR AVANÇADO*',
        '',
        `⚡ Comando: *${name}*`,
        '',
        'Primeiro escolha a categoria.'
      ].join('\n')
    )

    await askCategory(
      reply
    )

  } else {
    await reply(
      [
        '✨ *CRIADOR AVANÇADO*',
        '',
        'Qual será o nome do comando?',
        '',
        'Exemplo: *beijar*'
      ].join('\n')
    )
  }

  return true
}

export async function handleCreate({
  sender,
  from,
  isOwnerOrSub,
  info,
  reply,
  getGifBuffer,
  prefix = '/'
} = {}) {
  const key =
    sessionKey(
      from,
      sender
    )

  const session =
    sessions.get(
      key
    )

  if (
    !session
  ) {
    return false
  }

  if (
    Date.now() -
    session.createdAt >
    TTL
  ) {
    sessions.delete(
      key
    )

    await reply(
      `⏱️ Criação expirada. Use ${prefix}criarcmd novamente.`
    )

    return true
  }

  if (
    !isOwnerOrSub
  ) {
    sessions.delete(
      key
    )

    await reply(
      '🚫 Apenas dono e subdonos podem usar este criador.'
    )

    return true
  }

  const text =
    textOf(
      info
    )

  if (
    /^(cancelar|cancel|sair)$/i.test(
      text
    )
  ) {
    sessions.delete(
      key
    )

    await reply(
      '❎ Criação cancelada.'
    )

    return true
  }

  if (
    session.step ===
    'name'
  ) {
    const name =
      normalize(
        text
      )

    if (
      !validTrigger(name)
    ) {
      await reply(
        '❌ Nome inválido. Exemplo: *beijar*'
      )

      return true
    }

    if (
      load().some(
        item =>
          normalize(
            item.trigger
          ) === name
      )
    ) {
      await reply(
        `❌ O comando ${prefix}${name} já existe.`
      )

      return true
    }

    session.trigger =
      name

    await reply(
      `✅ Comando definido: *${prefix}${name}*`
    )

    await askCategory(
      reply
    )

    session.step =
      'category'

    session.createdAt =
      Date.now()

    return true
  }

  if (
    session.step ===
    'category'
  ) {
    const selected =
      categoryFromInput(
        text
      )

    session.category =
      selected[1]

    await reply(
      [
        '✅ *CATEGORIA DEFINIDA*',
        '',
        selected[2],
        '',
        `Comando: ${prefix}${session.trigger}`
      ].join('\n')
    )

    await askResponse(
      session,
      reply,
      prefix
    )

    return true
  }

  if (
    session.step ===
    'response'
  ) {
    if (
      !text
    ) {
      await reply(
        '❌ A resposta não pode ficar vazia.'
      )

      return true
    }

    session.template =
      text

    session.createdAt =
      Date.now()

    if (
      /#gif/i.test(
        text
      )
    ) {
      await askGif(
        session,
        reply
      )

      return true
    }

    session.step =
      'gif-choice'

    await reply(
      [
        '🎞️ *ADICIONAR GIF?*',
        '',
        'Envie *#gif* para anexar um vídeo/GIF.',
        'Ou envie *não* para finalizar somente com texto.'
      ].join('\n')
    )

    return true
  }

  if (
    session.step ===
    'gif-choice'
  ) {
    if (
      /^#gif$/i.test(
        text
      )
    ) {
      await askGif(
        session,
        reply
      )

      return true
    }

    if (
      /^(não|nao|sem|skip|pular)$/i.test(
        text
      )
    ) {
      await finish(
        session,
        key,
        prefix,
        reply,
        null
      )

      return true
    }

    await reply(
      '❌ Responda *#gif* ou *não*.'
    )

    return true
  }

  if (
    session.step ===
    'gif'
  ) {
    const video =
      info?.message?.videoMessage ||
      info?.message?.viewOnceMessage?.message?.videoMessage ||
      info?.message?.viewOnceMessageV2?.message?.videoMessage ||
      info?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ||
      info?.message?.viewOnceMessageV2?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ||
      null

    const gif =
      video &&
      typeof getGifBuffer ===
      'function'
        ? await getGifBuffer()
        : null

    if (
      !gif ||
      !Buffer.isBuffer(gif) ||
      !gif.length
    ) {
      await reply(
        '❌ Não encontrei um GIF/vídeo. Responda esta mensagem com a mídia.'
      )

      return true
    }

    await finish(
      session,
      key,
      prefix,
      reply,
      gif
    )

    return true
  }

  return false
}
