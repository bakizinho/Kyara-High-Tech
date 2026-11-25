import fs from 'node:fs'
import path from 'node:path'

const CONFIG_PATH = path.resolve(
  process.cwd(),
  'dados',
  'src',
  'config.json'
)

const FALLBACK_NAME =
  'KYARA'

const FALLBACK_PREFIX =
  '#'

/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

function readConfig() {
  try {

    if (
      !fs.existsSync(
        CONFIG_PATH
      )
    ) {
      return {}
    }

    const raw =
      fs.readFileSync(
        CONFIG_PATH,
        'utf8'
      )

    const parsed =
      JSON.parse(
        raw
      )

    return (
      parsed &&
      typeof parsed === 'object'
    )
      ? parsed
      : {}

  } catch {
    return {}
  }
}

function cleanValue(
  value,
  fallback
) {

  const result =
    String(
      value ?? ''
    )
      .replace(
        /[\r\n]+/g,
        ' '
      )
      .trim()

  return (
    result ||
    fallback
  )
}

/*
 * ============================================================
 * IDENTIDADE
 * ============================================================
 */

export function getConfiguredBotName() {

  const config =
    readConfig()

  return cleanValue(
    config?.nomebot,
    FALLBACK_NAME
  )
}

export function getConfiguredPrefix() {

  const config =
    readConfig()

  const prefix =
    cleanValue(
      config?.prefixo,
      FALLBACK_PREFIX
    )

  /*
   * O prefixo deve ser um único
   * símbolo/fragmento seguro.
   */
  return (
    prefix
      .slice(0, 4) ||
    FALLBACK_PREFIX
  )
}

/*
 * ============================================================
 * EMOJIS / GLYPHS DA KYARA
 *
 * Unicode normal.
 * Não é sticker.
 * ============================================================
 */

export const KYARA_EMOJIS =
  Object.freeze({

    bot:
      '🤖',

    brand:
      '🌸',

    success:
      '✅',

    error:
      '❌',

    warning:
      '⚠️',

    admin:
      '👑',

    menu:
      '🌸',

    heart:
      '💜',

    loading:
      '⏳',

    info:
      'ℹ️',

    fire:
      '🔥',

    sparkles:
      '✨',

    lock:
      '🔒',

    unlock:
      '🔓',

    settings:
      '⚙️',

    download:
      '⬇️',

    tools:
      '🛠️',

    vip:
      '💎',

    owner:
      '👑',

    online:
      '🟢',

    offline:
      '🔴',

    section:
      '୨୧',

    star:
      '✦',

    flower:
      '❁',

    bullet:
      '┃',

    divider:
      '┈',

    arrow:
      '➜',

    sparkle2:
      '𖹭',

    diamond:
      '◇',

    crown:
      '♛'

  })

export function getKyaraEmoji(
  name,
  fallback = ''
) {

  return (
    KYARA_EMOJIS[
      String(name || '')
    ] ||
    fallback
  )
}

/*
 * ============================================================
 * ADMIN
 * ============================================================
 */

export function botNeedsAdminMessage() {

  return (
    `${getKyaraEmoji('error')} ` +
    `O ${getConfiguredBotName()} ` +
    `precisa ser administrador para isso!`
  )
}

/*
 * ============================================================
 * COMANDO
 * ============================================================
 */

export function commandExample(
  command
) {

  const prefix =
    getConfiguredPrefix()

  const cleanCommand =
    String(
      command ?? ''
    )
      .trim()
      .replace(
        /^[!/#.$%+]+/,
        ''
      )

  return (
    `${prefix}${cleanCommand}`
  )
}

/*
 * ============================================================
 * HEADER
 * ============================================================
 */

export function kyaraHeader(
  text = ''
) {

  const brand =
    getKyaraEmoji(
      'brand'
    )

  const name =
    getConfiguredBotName()

  return (
    `${brand} *${name}*` +
    (
      text
        ? ` • ${text}`
        : ''
    )
  )
}

/*
 * ============================================================
 * FORMATADOR GLOBAL
 *
 * Este é o ponto mais importante.
 *
 * Tudo que passar por ele ganha:
 *
 * - nome atual
 * - prefixo atual
 * - comandos atualizados
 * - emojis centrais
 *
 * Os canais oficiais são preservados.
 * ============================================================
 */

export function formatKyaraText(
  text
) {

  let value =
    String(
      text ?? ''
    )

  const name =
    getConfiguredBotName()

  const prefix =
    getConfiguredPrefix()

  /*
   * Protege URLs e nomes oficiais
   * antes de substituir identidade.
   */
  const protectedParts = []

  const protect = (
    valueToProtect
  ) => {

    const index =
      protectedParts.push(
        valueToProtect
      ) - 1

    return (
      `\u0000KYARA_PROTECTED_${index}\u0000`
    )
  }

  /*
   * URLs.
   */
  value =
    value.replace(
      /https?:\/\/[^\s]+/gi,
      protect
    )

  /*
   * Canal oficial.
   */
  value =
    value.replace(
      /BOT-KYARA\s*[•\-]\s*Canal\s+Oficial/gi,
      protect
    )

  value =
    value.replace(
      /CANAL\s+OFICIAL\s+BOT-KYARA/gi,
      protect
    )

  value =
    value.replace(
      /canal\s+BOT-KYARA/gi,
      protect
    )

  /*
   * Identidade antiga.
   *
   * Fazemos isso somente em texto
   * que sai para o usuário.
   */
  value =
    value.replace(
      /\bBOT-KYARA\b/gi,
      name
    )

  value =
    value.replace(
      /\bBKkyara\b/gi,
      name
    )

  /*
   * "Kyara" também acompanha o nome.
   *
   * Não altera URLs porque já foram
   * protegidas acima.
   */
  value =
    value.replace(
      /\bKyara\b/gi,
      name
    )

  /*
   * ==========================================================
   * PREFIXO
   * ==========================================================
   *
   * Converte:
   *
   * /menu  -> #menu
   * !menu  -> #menu
   * #menu  -> #menu
   *
   * em praticamente qualquer texto.
   */

  /*
   * Comando após espaço/início.
   */
  value =
    value.replace(
      /(^|[\s(【\[])([!/#.$%+]+)([a-zA-Z0-9_][a-zA-Z0-9_-]*)/g,
      (
        _match,
        beginning,
        _oldPrefix,
        command
      ) => (
        `${beginning}${prefix}${command}`
      )
    )

  /*
   * Comando depois de:
   *
   * use
   * exemplo
   * ex
   * digite
   * envie
   * comando
   * teste
   * tente
   * execute
   * chame
   * rode
   */
  value =
    value.replace(
      /\b(use|exemplo|ex|digite|envie|comando|teste|tente|execute|chame|rode|rodar|use o comando)\s+([!/#.$%+]+)([a-zA-Z0-9_][a-zA-Z0-9_-]*)\b/gi,
      (
        _match,
        cue,
        _oldPrefix,
        command
      ) => (
        `${cue} ${prefix}${command}`
      )
    )

  /*
   * Restaura URLs e canal oficial.
   */
  value =
    value.replace(
      /\u0000KYARA_PROTECTED_(\d+)\u0000/g,
      (
        _match,
        index
      ) => (
        protectedParts[
          Number(index)
        ] ?? ''
      )
    )

  return value
}

/*
 * Alias semântico para lugares onde
 * o código quer formatar uma resposta.
 */
export function formatKyaraResponse(
  text
) {
  return formatKyaraText(
    text
  )
}

/*
 * ============================================================
 * EXPORT DEFAULT
 * ============================================================
 */

export default {
  getConfiguredBotName,
  getConfiguredPrefix,
  getKyaraEmoji,
  botNeedsAdminMessage,
  commandExample,
  kyaraHeader,
  formatKyaraText,
  formatKyaraResponse,
  KYARA_EMOJIS
}
