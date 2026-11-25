import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const CONFIG_PATH =
  path.resolve(
    process.cwd(),
    'config',
    'menu-media.json'
  )

const MEDIA_DIR =
  path.resolve(
    process.cwd(),
    'dados',
    'midias'
  )

const CACHE_DIR =
  path.join(
    MEDIA_DIR,
    'menu-cache'
  )

const MAX_REMOTE_BYTES =
  32 * 1024 * 1024

function atomicWrite(
  filePath,
  content
) {
  const temp =
    `${filePath}.tmp-${process.pid}-${Date.now()}`

  fs.writeFileSync(
    temp,
    content,
    'utf8'
  )

  fs.renameSync(
    temp,
    filePath
  )
}

function ensure() {
  fs.mkdirSync(
    path.dirname(CONFIG_PATH),
    { recursive: true }
  )

  fs.mkdirSync(
    MEDIA_DIR,
    { recursive: true }
  )

  fs.mkdirSync(
    CACHE_DIR,
    { recursive: true }
  )

  if (!fs.existsSync(CONFIG_PATH)) {
    atomicWrite(
      CONFIG_PATH,
      JSON.stringify(
        {
          enabled: true,
          global: null,
          admin: null
        },
        null,
        2
      )
    )
  }
}

/*
 * API unificada de mídia.
 *
 * setMenuGif continua existindo por compatibilidade.
 * setMenuMedia é o nome oficial novo.
 */

export function getMenuMediaConfig() {
  ensure()

  try {
    const data =
      JSON.parse(
        fs.readFileSync(
          CONFIG_PATH,
          'utf8'
        )
      )

    return {
      enabled:
        data?.enabled !== false,

      global:
        typeof data?.global === 'string'
          ? data.global.trim() || null
          : null,

      admin:
        typeof data?.admin === 'string'
          ? data.admin.trim() || null
          : null
    }

  } catch (error) {

    console.error(
      '[MENU MEDIA] Config inválida; usando padrão:',
      error?.message || error
    )

    return {
      enabled: true,
      global: null,
      admin: null
    }
  }
}

export function setMenuGif(
  scope,
  value
) {
  ensure()

  const config =
    getMenuMediaConfig()

  const key =
    scope === 'admin'
      ? 'admin'
      : 'global'

  const v =
    String(value || '').trim()

  config[key] =
    /^(off|desativar|desligar|remover)$/i.test(v)
      ? null
      : (v || null)

  config.enabled = true

  atomicWrite(
    CONFIG_PATH,
    JSON.stringify(
      config,
      null,
      2
    )
  )

  return config
}

function isUrl(value) {
  return /^https?:\/\//i.test(
    String(value || '').trim()
  )
}

function resolveConfiguredPath(
  value
) {
  const raw =
    String(value || '').trim()

  if (
    !raw ||
    isUrl(raw)
  ) {
    return null
  }

  const candidates = [
    path.isAbsolute(raw)
      ? raw
      : path.resolve(
          process.cwd(),
          raw
        ),

    path.resolve(
      MEDIA_DIR,
      path.basename(raw)
    )
  ]

  return (
    candidates.find(
      item => fs.existsSync(item)
    ) || null
  )
}

function ext(filePath) {
  return path.extname(
    String(filePath || '')
  ).toLowerCase()
}

function isValidFile(
  filePath
) {
  try {
    const stat =
      fs.statSync(filePath)

    return (
      stat.isFile() &&
      stat.size > 0
    )

  } catch {
    return false
  }
}

function isDefaultMenuImage(
  filePath
) {
  try {
    return (
      path.resolve(filePath) ===
      path.resolve(
        MEDIA_DIR,
        'menu.jpg'
      )
    )
  } catch {
    return false
  }
}

function findSiblingAnimation() {
  const files = [
    'menu.mp4',
    'menu.gif',
    'menu.webm',
    'menu.m4v',
    'menu.mov',
    'menu.mkv'
  ]

  for (const name of files) {

    const file =
      path.join(
        MEDIA_DIR,
        name
      )

    if (
      isValidFile(file)
    ) {
      return file
    }
  }

  return null
}

function isVideoPath(
  filePath
) {
  return [
    '.mp4',
    '.m4v',
    '.webm',
    '.mov',
    '.mkv',
    '.gif'
  ].includes(
    ext(filePath)
  )
}

async function assertFfmpeg() {
  try {

    await execFileAsync(
      'ffmpeg',
      ['-version'],
      {
        timeout: 15000
      }
    )

    return true

  } catch (error) {

    console.error(
      '[MENU MEDIA] FFmpeg indisponível:',
      error?.message || error
    )

    return false
  }
}

async function download(
  url,
  output
) {
  const response =
    await fetch(
      url,
      {
        redirect: 'follow',

        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; BKkyara)',

          'Accept':
            'image/gif,image/apng,image/webp,image/jpeg,image/png,video/mp4,video/webm,*/*;q=0.8'
        }
      }
    )

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    )
  }

  const contentLength =
    Number(
      response.headers.get(
        'content-length'
      ) || 0
    )

  if (
    Number.isFinite(
      contentLength
    ) &&
    contentLength >
      MAX_REMOTE_BYTES
  ) {
    throw new Error(
      `Mídia remota grande demais (${contentLength} bytes).`
    )
  }

  const type =
    String(
      response.headers.get(
        'content-type'
      ) || ''
    ).toLowerCase()

  const data =
    Buffer.from(
      await response.arrayBuffer()
    )

  if (!data.length) {
    throw new Error(
      'A URL retornou arquivo vazio.'
    )
  }

  if (
    data.length >
    MAX_REMOTE_BYTES
  ) {
    throw new Error(
      `Mídia remota excedeu ${MAX_REMOTE_BYTES} bytes.`
    )
  }

  const head =
    data.subarray(
      0,
      16
    )

  const gif =
    head.toString(
      'ascii',
      0,
      6
    ) === 'GIF87a' ||
    head.toString(
      'ascii',
      0,
      6
    ) === 'GIF89a'

  const png =
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47

  const jpg =
    head[0] === 0xff &&
    head[1] === 0xd8 &&
    head[2] === 0xff

  const webp =
    head.toString(
      'ascii',
      0,
      4
    ) === 'RIFF' &&
    head.toString(
      'ascii',
      8,
      12
    ) === 'WEBP'

  const mp4 =
    head.toString(
      'ascii',
      4,
      8
    ) === 'ftyp'

  const validMime =
    type.startsWith(
      'image/'
    ) ||
    type.startsWith(
      'video/'
    ) ||
    type.includes(
      'octet-stream'
    )

  if (
    !validMime &&
    !gif &&
    !png &&
    !jpg &&
    !webp &&
    !mp4
  ) {

    const preview =
      data
        .subarray(0, 120)
        .toString('utf8')
        .replace(
          /[\r\n]+/g,
          ' '
        )
        .slice(0, 120)

    throw new Error(
      `URL sem mídia reconhecível. ` +
      `Content-Type: ${type || 'desconhecido'} | ${preview}`
    )
  }

  fs.writeFileSync(
    output,
    data
  )
}

async function convertToMp4(
  input,
  output
) {
  if (
    !(await assertFfmpeg())
  ) {
    throw new Error(
      'FFmpeg não está disponível.'
    )
  }

  try {
    fs.rmSync(
      output,
      {
        force: true
      }
    )
  } catch {}

  await execFileAsync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',

      '-i',
      input,

      '-an',

      '-c:v',
      'libx264',

      '-profile:v',
      'baseline',

      '-level',
      '3.0',

      '-pix_fmt',
      'yuv420p',

      '-vf',
      'fps=15,scale=trunc(iw/2)*2:trunc(ih/2)*2',

      '-movflags',
      '+faststart',

      output
    ],
    {
      timeout: 120000
    }
  )

  if (
    !isValidFile(output)
  ) {
    throw new Error(
      'FFmpeg não produziu um MP4 válido.'
    )
  }
}

function metaPath(
  role
) {
  return path.join(
    CACHE_DIR,
    role === 'admin'
      ? 'menu-admin.meta'
      : 'menu-global.meta'
  )
}

function localFingerprint(
  filePath
) {
  try {

    const stat =
      fs.statSync(
        filePath
      )

    return JSON.stringify({
      source:
        path.resolve(
          filePath
        ),

      size:
        stat.size,

      mtimeMs:
        stat.mtimeMs
    })

  } catch {
    return null
  }
}

async function localMedia(
  filePath,
  role
) {
  if (
    !isValidFile(
      filePath
    )
  ) {
    return null
  }

  /*
   * IMPORTANTE:
   * menu.jpg é o fallback antigo.
   * Se existir uma animação irmã,
   * ela ganha prioridade.
   */

  if (
    isDefaultMenuImage(
      filePath
    )
  ) {

    const animated =
      findSiblingAnimation()

    if (animated) {
      return localMedia(
        animated,
        role
      )
    }
  }

  if (
    !isVideoPath(
      filePath
    )
  ) {
    return {
      type: 'image',
      path: filePath
    }
  }

  /*
   * MP4 já está no formato ideal.
   */

  if (
    ext(filePath) === '.mp4'
  ) {
    return {
      type: 'video',
      path: filePath
    }
  }

  /*
   * GIF/WebM/MOV etc:
   * transforma em MP4 compatível.
   */

  const cache =
    path.join(
      CACHE_DIR,
      role === 'admin'
        ? 'menu-admin.mp4'
        : 'menu-global.mp4'
    )

  const meta =
    metaPath(role)

  const fingerprint =
    localFingerprint(
      filePath
    )

  if (
    fingerprint &&
    isValidFile(cache)
  ) {
    try {

      if (
        fs.readFileSync(
          meta,
          'utf8'
        ).trim() ===
        fingerprint
      ) {
        return {
          type: 'video',
          path: cache
        }
      }

    } catch {}
  }

  const tempDir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'bkkyara-menu-local-'
      )
    )

  const input =
    path.join(
      tempDir,
      `entrada${ext(filePath)}`
    )

  try {

    fs.copyFileSync(
      filePath,
      input
    )

    await convertToMp4(
      input,
      cache
    )

    if (fingerprint) {

      fs.writeFileSync(
        meta,
        fingerprint,
        'utf8'
      )
    }

    return {
      type: 'video',
      path: cache
    }

  } catch (error) {

    console.error(
      '[MENU MEDIA] Falha ao converter mídia local:',
      error?.message || error
    )

    return null

  } finally {

    try {

      fs.rmSync(
        tempDir,
        {
          recursive: true,
          force: true
        }
      )

    } catch {}
  }
}

export const setMenuMedia = setMenuGif

export async function getMenuMedia(
  role = 'global'
) {
  const config =
    getMenuMediaConfig()

  if (
    !config.enabled
  ) {
    return null
  }

  const selected =
    role === 'admin'
      ? (
          config.admin ||
          config.global
        )
      : config.global

  /*
   * Sem configuração:
   * animação primeiro, foto depois.
   */

  if (!selected) {

    const animated =
      findSiblingAnimation()

    return animated
      ? localMedia(
          animated,
          role
        )
      : null
  }

  /*
   * Caminho local.
   */

  const local =
    resolveConfiguredPath(
      selected
    )

  if (local) {

    return localMedia(
      local,
      role
    )
  }

  /*
   * Não é local nem URL.
   */

  if (
    !isUrl(selected)
  ) {
    return null
  }

  /*
   * URL externa:
   * baixa e cria cache MP4.
   */

  const cache =
    path.join(
      CACHE_DIR,
      role === 'admin'
        ? 'menu-admin.mp4'
        : 'menu-global.mp4'
    )

  const meta =
    metaPath(role)

  try {

    if (
      isValidFile(cache) &&
      fs.existsSync(meta) &&
      fs.readFileSync(
        meta,
        'utf8'
      ).trim() ===
        selected
    ) {
      return {
        type: 'video',
        path: cache
      }
    }

  } catch {}

  const tempDir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'bkkyara-menu-url-'
      )
    )

  const input =
    path.join(
      tempDir,
      'entrada'
    )

  try {

    await download(
      selected,
      input
    )

    await convertToMp4(
      input,
      cache
    )

    fs.writeFileSync(
      meta,
      selected,
      'utf8'
    )

    return {
      type: 'video',
      path: cache
    }

  } catch (error) {

    console.error(
      '[MENU MEDIA] Falha no GIF/vídeo configurado:',
      error?.message || error
    )

    return null

  } finally {

    try {

      fs.rmSync(
        tempDir,
        {
          recursive: true,
          force: true
        }
      )

    } catch {}
  }
}
