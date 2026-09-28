import fs from 'node:fs/promises'
import path from 'node:path'

const PROJECT_ROOT =
  process.env.KYARA_ROOT ||
  process.cwd()

const DATA_DIR =
  path.join(
    PROJECT_ROOT,
    'dados',
    'data'
  )

const SEEN_FILE =
  path.join(
    DATA_DIR,
    'rule34-seen.json'
  )

const MAX_IMAGES = 20
const DEFAULT_CONCURRENCY = 6
const MAX_STORED_IDS_PER_QUERY = 5000

const state = new Map()

let loaded = false

let writeQueue =
  Promise.resolve()


function text(value) {

  return String(
    value ?? ''
  ).trim()

}


function normalizeQuery(query) {

  return text(query)
    .toLowerCase()
    .replace(/\s+/g, ' ')

}


function historyKey(
  jid,
  query
) {

  return (
    `${text(jid)}::` +
    `${normalizeQuery(query)}`
  )

}


async function ensureLoaded() {

  if (loaded) {
    return
  }

  loaded = true

  await fs.mkdir(
    DATA_DIR,
    {
      recursive: true
    }
  )

  try {

    const raw =
      await fs.readFile(
        SEEN_FILE,
        'utf8'
      )

    const parsed =
      JSON.parse(raw)

    for (
      const [key, value]
      of Object.entries(
        parsed || {}
      )
    ) {

      if (
        !Array.isArray(value)
      ) {
        continue
      }

      state.set(
        key,
        new Set(
          value
            .map(text)
            .filter(Boolean)
        )
      )

    }

  } catch (error) {

    if (
      error?.code !==
      'ENOENT'
    ) {

      console.warn(
        '[RULE34-ALBUM] Histórico inválido:',
        error?.message ||
        error
      )

    }

  }

}


function snapshot() {

  return Object.fromEntries(

    [...state.entries()]
      .map(
        ([key, ids]) => [
          key,
          [...ids]
        ]
      )

  )

}


async function saveState() {

  await ensureLoaded()

  const payload =
    JSON.stringify(
      snapshot(),
      null,
      2
    )

  const tmp =
    `${SEEN_FILE}.tmp-` +
    `${process.pid}-` +
    `${Date.now()}`

  const operation =
    writeQueue
      .catch(() => {})
      .then(
        async () => {

          await fs.writeFile(
            tmp,
            payload,
            'utf8'
          )

          await fs.rename(
            tmp,
            SEEN_FILE
          )

        }
      )
      .catch(
        async error => {

          try {

            await fs.rm(
              tmp,
              {
                force: true
              }
            )

          } catch {}

          throw error

        }
      )

  writeQueue =
    operation

  return operation

}


function extractId(item) {

  return text(

    item?.id ??

    item?.postId ??

    item?.post_id ??

    item?.resultId ??

    item?.file_id ??

    item?.hash ??

    ''

  )

}


function extractUrl(item) {

  return text(

    item?.url ??

    item?.fileUrl ??

    item?.file_url ??

    item?.mediaUrl ??

    item?.media_url ??

    item?.downloadUrl ??

    item?.download_url ??

    item?.imageUrl ??

    item?.image_url ??

    item?.image ??

    item?.sample_url ??

    ''

  )

}


function extractThumb(item) {

  return text(

    item?.thumbnail ??

    item?.thumb ??

    item?.preview ??

    item?.sample ??

    item?.sample_url ??

    ''

  )

}


function normalizeRule34Item(
  item,
  index = 0
) {

  const id =
    extractId(item)

  const url =
    extractUrl(item)

  const thumb =
    extractThumb(item)

  const identity =
    id ||
    url ||
    `index:${index}`

  return {

    ...item,

    id,

    url,

    thumb,

    identity

  }

}


function isAllowedRule34Url(
  url
) {

  try {

    const parsed =
      new URL(url)

    const host =
      parsed.hostname
        .toLowerCase()

    return (
      host ===
        'rule34.xxx' ||

      host.endsWith(
        '.rule34.xxx'
      )
    )

  } catch {

    return false

  }

}


function isLikelyImageUrl(
  url
) {

  try {

    const pathname =
      new URL(url)
        .pathname
        .toLowerCase()

    if (
      /\.(jpe?g|png|webp)$/i
        .test(pathname)
    ) {

      return true

    }

    return (
      pathname.includes(
        '/images/'
      ) ||

      pathname.includes(
        '/thumbs/'
      )
    )

  } catch {

    return false

  }

}


export async function getRule34Seen(
  jid,
  query
) {

  await ensureLoaded()

  return new Set(
    state.get(
      historyKey(
        jid,
        query
      )
    ) || []
  )

}


export async function rememberRule34(
  jid,
  query,
  itemsOrIds = []
) {

  await ensureLoaded()

  const key =
    historyKey(
      jid,
      query
    )

  const set =
    state.get(key) ||
    new Set()

  for (
    const entry
    of itemsOrIds
  ) {

    const item =
      typeof entry ===
      'object'

        ? normalizeRule34Item(
            entry
          )

        : {
            identity:
              text(entry),

            id:
              text(entry)
          }

    const identity =
      text(
        item.id ||
        item.identity
      )

    if (identity) {

      set.add(
        identity
      )

    }

  }

  while (
    set.size >
    MAX_STORED_IDS_PER_QUERY
  ) {

    const first =
      set.values()
        .next()
        .value

    if (
      first ===
      undefined
    ) {

      break

    }

    set.delete(
      first
    )

  }

  state.set(
    key,
    set
  )

  await saveState()

  return set.size

}


export async function pickFreshRule34(
  jid,
  query,
  results,
  limit = MAX_IMAGES
) {

  const seen =
    await getRule34Seen(
      jid,
      query
    )

  const fresh = []

  const local =
    new Set()

  const wanted =
    Math.max(
      1,
      Math.min(
        Number(limit) ||
          MAX_IMAGES,
        MAX_IMAGES
      )
    )

  const list =
    Array.isArray(results)
      ? results
      : []

  for (
    let index = 0;
    index < list.length;
    index += 1
  ) {

    const item =
      normalizeRule34Item(
        list[index],
        index
      )

    const identity =
      item.id ||
      item.url ||
      item.identity

    if (
      !identity
    ) {

      continue

    }

    if (
      seen.has(identity)
    ) {

      continue

    }

    if (
      local.has(identity)
    ) {

      continue

    }

    if (
      !item.url ||
      !isAllowedRule34Url(
        item.url
      )
    ) {

      continue

    }

    if (
      !isLikelyImageUrl(
        item.url
      )
    ) {

      continue

    }

    local.add(
      identity
    )

    fresh.push(
      item
    )

    if (
      fresh.length >=
      wanted
    ) {

      break

    }

  }

  return fresh

}


export async function collectFreshRule34({

  jid,

  query,

  limit =
    MAX_IMAGES,

  startPage =
    0,

  maxPages =
    50,

  fetchPage

}) {

  if (
    typeof fetchPage !==
    'function'
  ) {

    throw new TypeError(
      'collectFreshRule34: fetchPage deve ser uma função'
    )

  }

  const wanted =
    Math.max(
      1,
      Math.min(
        Number(limit) ||
          MAX_IMAGES,
        MAX_IMAGES
      )
    )

  const result = []

  const local =
    new Set()

  const firstPage =
    Number(startPage) || 0

  const lastPage =
    firstPage +
    (
      Number(maxPages) ||
      50
    )

  for (
    let page = firstPage;
    page < lastPage &&
    result.length < wanted;
    page += 1
  ) {

    const pageItems =
      await fetchPage(
        page
      )

    if (
      !Array.isArray(
        pageItems
      ) ||
      pageItems.length === 0
    ) {

      break

    }

    const fresh =
      await pickFreshRule34(
        jid,
        query,
        pageItems,
        wanted
      )

    for (
      const item
      of fresh
    ) {

      const identity =
        item.id ||
        item.url ||
        item.identity

      if (
        !identity ||
        local.has(identity)
      ) {

        continue

      }

      local.add(
        identity
      )

      result.push(
        item
      )

      if (
        result.length >=
        wanted
      ) {

        break

      }

    }

  }

  return result.slice(
    0,
    wanted
  )

}


async function runLimited(
  items,
  concurrency,
  worker
) {

  const width =
    Math.max(
      1,
      Math.min(
        Number(concurrency) ||
          DEFAULT_CONCURRENCY,
        MAX_IMAGES
      )
    )

  const output =
    new Array(
      items.length
    )

  let next =
    0

  const runners =
    Array.from(
      {
        length:
          Math.min(
            width,
            items.length
          )
      },
      async () => {

        while (true) {

          const index =
            next++

          if (
            index >=
            items.length
          ) {

            return

          }

          try {

            output[index] = {

              ok:
                true,

              index,

              value:
                await worker(
                  items[index],
                  index
                )

            }

          } catch (error) {

            output[index] = {

              ok:
                false,

              index,

              error

            }

          }

        }

      }
    )

  await Promise.all(
    runners
  )

  return output

}


export async function sendRule34Album(

  sock,

  jid,

  rawResults,

  {

    quoted,

    historyJid,

    historyQuery,

    concurrency =
      DEFAULT_CONCURRENCY,

    captionResolver,

    mediaUploadTimeoutMs,

    maxImages =
      MAX_IMAGES

  } = {}

) {

  if (
    !sock ||
    typeof sock.sendMessage !==
    'function'
  ) {

    throw new TypeError(
      'sendRule34Album: socket inválido'
    )

  }

  if (!jid) {

    throw new TypeError(
      'sendRule34Album: jid vazio'
    )

  }

  const requested =
    Math.max(
      1,
      Math.min(
        Number(maxImages) ||
          MAX_IMAGES,
        MAX_IMAGES
      )
    )

  const normalized =
    await pickFreshRule34(

      historyJid ||
        jid,

      historyQuery ||
        '',

      Array.isArray(
        rawResults
      )
        ? rawResults
        : [],

      requested

    )

  if (
    !normalized.length
  ) {

    return {

      ok:
        false,

      reason:
        'no-results',

      sent:
        [],

      failed:
        []

    }

  }

  /* =====================================================
   * ÁLBUM PAI — Baileys 7.0.0-rc14
   * ===================================================== */

  const parentOptions = {}

  if (quoted) {

    parentOptions.quoted =
      quoted

  }

  if (
    mediaUploadTimeoutMs
  ) {

    parentOptions
      .mediaUploadTimeoutMs =
      mediaUploadTimeoutMs

  }

  const parent =
    await sock.sendMessage(

      jid,

      {

        album: {

          expectedImageCount:
            normalized.length,

          expectedVideoCount:
            0

        }

      },

      parentOptions

    )

  const parentKey =
    parent?.key

  if (
    !parentKey?.id
  ) {

    throw new Error(
      'Baileys não retornou a chave do álbum'
    )

  }

  /* =====================================================
   * IMAGENS DO ÁLBUM
   *
   * URL DIRETA.
   * SEM salvar em /downloads.
   * SEM Python.
   * ===================================================== */

  const results =
    await runLimited(

      normalized,

      concurrency,

      async (
        item,
        index
      ) => {

        const caption =
          typeof captionResolver ===
          'function'

            ? text(
                await captionResolver(
                  item,
                  index,
                  normalized.length
                )
              )

            : ''

        const content = {

          image: {

            url:
              item.url

          },

          albumParentKey:
            parentKey

        }

        if (caption) {

          content.caption =
            caption

        }

        const options = {}

        if (
          mediaUploadTimeoutMs
        ) {

          options
            .mediaUploadTimeoutMs =
            mediaUploadTimeoutMs

        }

        return sock.sendMessage(

          jid,

          content,

          options

        )

      }

    )

  const sent =
    results

      .filter(
        entry =>
          entry?.ok
      )

      .map(
        entry =>
          normalized[
            entry.index
          ]
      )

  const failed =
    results

      .filter(
        entry =>
          !entry?.ok
      )

      .map(
        entry => ({

          item:
            normalized[
              entry.index
            ],

          error:
            entry?.error

        })
      )

  /* =====================================================
   * SÓ MARCA COMO VISTO O QUE FOI REALMENTE ENVIADO
   * ===================================================== */

  if (
    historyJid &&
    historyQuery &&
    sent.length
  ) {

    await rememberRule34(

      historyJid,

      historyQuery,

      sent

    )

  }

  return {

    ok:
      sent.length > 0,

    parentKey,

    requested:
      normalized.length,

    sent,

    failed

  }

}


export async function sendRule34ImageInstant(

  sock,

  jid,

  rawItem,

  {

    quoted,

    caption =
      '',

    mediaUploadTimeoutMs

  } = {}

) {

  const item =
    normalizeRule34Item(
      rawItem
    )

  if (
    !item.url ||
    !isAllowedRule34Url(
      item.url
    ) ||
    !isLikelyImageUrl(
      item.url
    )
  ) {

    throw new Error(
      'URL de imagem Rule34 inválida'
    )

  }

  const options = {}

  if (quoted) {

    options.quoted =
      quoted

  }

  if (
    mediaUploadTimeoutMs
  ) {

    options
      .mediaUploadTimeoutMs =
      mediaUploadTimeoutMs

  }

  const content = {

    image: {

      url:
        item.url

    }

  }

  if (
    text(caption)
  ) {

    content.caption =
      text(caption)

  }

  return sock.sendMessage(

    jid,

    content,

    options

  )

}


export async function clearRule34History(
  jid,
  query
) {

  await ensureLoaded()

  state.delete(
    historyKey(
      jid,
      query
    )
  )

  await saveState()

}


export {

  MAX_IMAGES,

  DEFAULT_CONCURRENCY,

  normalizeRule34Item,

  isAllowedRule34Url,

  isLikelyImageUrl

}
