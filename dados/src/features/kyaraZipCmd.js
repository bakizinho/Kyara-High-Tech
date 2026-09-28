import fs from 'fs';
import path from 'path';
import os from 'os';
import zlib from 'zlib';

const DB_PATH = path.resolve(
  'dados/database/zipcmd-authorized.json'
);

/*
 * ============================================================
 * KYARA ZIPCMD
 * ============================================================
 *
 * #zipcmd tiktok
 *   → exporta somente o arquivo do TikTok
 *
 * #zipcmd menu
 *   → exporta o módulo completo do menu
 *
 * O sistema não envia o index.js inteiro para comandos
 * que possuem implementação própria.
 * ============================================================
 */

const COMMAND_MAP = {
  tiktok: 'dados/src/funcs/downloads/tiktok.js',
  play: 'dados/src/features/kyaraMediaCommands.js',
  play2: 'dados/src/features/kyaraMediaCommands.js',
  playaudio: 'dados/src/features/kyaraMediaCommands.js',
  playvideo: 'dados/src/features/kyaraMediaCommands.js',
  playvid: 'dados/src/features/kyaraMediaCommands.js',
  ytmp3: 'dados/src/features/kyaraMediaCommands.js',
  ytmp4: 'dados/src/features/kyaraMediaCommands.js',

  pinterest: 'dados/src/funcs/downloads/pinterest.js',
  pin: 'dados/src/funcs/downloads/pinterest.js',

  instagram: 'dados/src/features/kyaraMediaCommands.js',
  facebook: 'dados/src/features/kyaraMediaCommands.js',
  kwai: 'dados/src/features/kyaraMediaCommands.js',
  twitter: 'dados/src/features/kyaraMediaCommands.js',
  x: 'dados/src/features/kyaraMediaCommands.js',

  menu: 'dados/src/index.js'
};

const COMMAND_ALIASES = {
  tiktokaudio: 'tiktok',
  tiktokvideo: 'tiktok',
  tiktoks: 'tiktok',
  tiktoksearch: 'tiktok',
  ttk: 'tiktok',
  tkk: 'tiktok'
};

function loadAuthorized() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];

    const data = JSON.parse(
      fs.readFileSync(DB_PATH, 'utf8')
    );

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveAuthorized(list) {
  fs.mkdirSync(
    path.dirname(DB_PATH),
    { recursive: true }
  );

  fs.writeFileSync(
    DB_PATH,
    JSON.stringify(list, null, 2),
    'utf8'
  );
}

function normalizeJid(value = '') {
  return String(value)
    .trim()
    .split('@')[0]
    .replace(/\D/g, '');
}

function crc32(buffer) {
  let crc = 0 ^ -1;

  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];

    for (let j = 0; j < 8; j++) {
      crc =
        (crc >>> 1) ^
        (0xEDB88320 & -(crc & 1));
    }
  }

  return (crc ^ -1) >>> 0;
}

function uint16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value & 0xffff);
  return buffer;
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function createZip(filePath, archiveName) {
  const input = fs.readFileSync(filePath);
  const compressed = zlib.deflateRawSync(input);
  const name = Buffer.from(archiveName, 'utf8');

  const localHeader = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    uint16(20),
    uint16(0),
    uint16(8),
    uint16(0),
    uint16(0),
    uint32(crc32(input)),
    uint32(compressed.length),
    uint32(input.length),
    uint16(name.length),
    uint16(0),
    name,
    compressed
  ]);

  const centralOffset = localHeader.length;

  const centralHeader = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x01, 0x02]),
    uint16(20),
    uint16(20),
    uint16(0),
    uint16(8),
    uint16(0),
    uint16(0),
    uint32(crc32(input)),
    uint32(compressed.length),
    uint32(input.length),
    uint16(name.length),
    uint16(0),
    uint16(0),
    uint16(0),
    uint16(0),
    uint32(0),
    uint32(0),
    name
  ]);

  const endRecord = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    uint16(0),
    uint16(0),
    uint16(1),
    uint16(1),
    uint32(centralHeader.length),
    uint32(centralOffset),
    uint16(0)
  ]);

  const output = Buffer.concat([
    localHeader,
    centralHeader,
    endRecord
  ]);

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kyara-zip-')
  );

  const outputPath = path.join(
    tempDir,
    `${archiveName}.zip`
  );

  fs.writeFileSync(
    outputPath,
    output
  );

  return outputPath;
}

export function isZipAuthorized(jids) {
  const candidates =
    Array.isArray(jids)
      ? jids
      : [jids];

  const normalizedCandidates =
    candidates
      .map(normalizeJid)
      .filter(Boolean);

  if (!normalizedCandidates.length) {
    return false;
  }

  return loadAuthorized().some(item => {
    const normalizedItem =
      normalizeJid(item);

    return normalizedCandidates.includes(
      normalizedItem
    );
  });
}

export function addZipAuthorized(jid) {
  const normalized =
    normalizeJid(jid);

  if (!normalized) return false;

  const list =
    loadAuthorized();

  if (!list.includes(normalized)) {
    list.push(normalized);
    saveAuthorized(list);
  }

  return true;
}

export function removeZipAuthorized(jid) {
  const normalized =
    normalizeJid(jid);

  if (!normalized) return false;

  const list =
    loadAuthorized();

  const next =
    list.filter(
      item =>
        normalizeJid(item) !== normalized
    );

  saveAuthorized(next);

  return next.length !== list.length;
}

export function listZipAuthorized() {
  return loadAuthorized();
}

function resolveCommand(command) {
  const requested =
    String(command || '')
      .trim()
      .toLowerCase()
      .replace(/^[/!#.]+/, '');

  const canonical =
    COMMAND_ALIASES[requested] || requested;

  return {
    requested,
    canonical
  };
}

export async function exportZipCommand({
  nazu,
  info,
  from,
  command
}) {
  const { requested, canonical } =
    resolveCommand(command);

  const target = COMMAND_MAP[canonical];

  if (!target) {
    await nazu.sendMessage(
      from,
      {
        text:
          `❌ *COMANDO NÃO DISPONÍVEL*\n\n` +
          `Comando: *${requested}*\n\n` +
          `📦 Disponíveis:\n` +
          `• #zipcmd tiktok\n` +
          `• #zipcmd menu\n` +
          `• #zipcmd play\n` +
          `• #zipcmd pinterest`
      },
      { quoted: info }
    );

    return true;
  }

  const filePath = path.resolve(target);

  if (!fs.existsSync(filePath)) {
    await nazu.sendMessage(
      from,
      {
        text:
          `❌ *ARQUIVO NÃO ENCONTRADO*\n\n` +
          `⚙️ Comando: *${requested}*\n` +
          `📄 ${target}`
      },
      { quoted: info }
    );

    return true;
  }

  try {
    /*
     * Cada comando possui UMA fonte.
     *
     * #zipcmd tiktok
     *   → tiktok.js
     *
     * #zipcmd menu
     *   → index.js completo
     *
     * #zipcmd pinterest
     *   → kyaraMediaCommands.js
     */

    const archiveName =
      `kyara-command-${requested}`;

    const zipPath =
      createZip(
        filePath,
        archiveName
      );

    if (!fs.existsSync(zipPath)) {
      throw new Error(
        'O arquivo ZIP não foi criado.'
      );
    }

    const buffer =
      fs.readFileSync(zipPath);

    if (!Buffer.isBuffer(buffer) || !buffer.length) {
      throw new Error(
        'O ZIP foi criado vazio.'
      );
    }

    /*
     * Validação real da assinatura ZIP:
     * PK\x03\x04 = início de arquivo ZIP.
     */
    if (
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      throw new Error(
        'A assinatura do ZIP é inválida.'
      );
    }

    /*
     * IMPORTANTE:
     * enviar Buffer diretamente como document.
     * Nunca converter o ZIP para texto/string.
     */
    await nazu.sendMessage(
      from,
      {
        document: buffer,
        mimetype: 'application/zip',
        fileName: `${archiveName}.zip`,
        caption:
          `📦 *KYARA • EXPORTADOR*\n\n` +
          `⚙️ Comando: *${requested}*\n` +
          `🔗 Fonte: *${target}*\n` +
          `📊 ${(buffer.length / 1024).toFixed(1)} KB\n\n` +
          `✅ Somente a implementação selecionada foi exportada.`
      },
      { quoted: info }
    );

    /*
     * Remove o temporário somente depois
     * que o Buffer já foi entregue ao Baileys.
     */
    try {
      fs.rmSync(
        path.dirname(zipPath),
        {
          recursive: true,
          force: true
        }
      );
    } catch {}

    return true;

  } catch (error) {
    console.error(
      '[ZIPCMD] Falha na exportação:',
      error
    );

    await nazu.sendMessage(
      from,
      {
        text:
          `❌ *FALHA AO EXPORTAR*\n\n` +
          `⚙️ Comando: *${requested}*\n` +
          `💥 ${error.message}`
      },
      { quoted: info }
    );

    return true;
  }
}
