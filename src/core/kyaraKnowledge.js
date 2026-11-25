/**
 * KYARA KNOWLEDGE ENGINE
 *
 * Conhecimento técnico dinâmico do próprio código do bot.
 *
 * Objetivos:
 * - descobrir automaticamente os sistemas existentes;
 * - localizar comandos, aliases e implementações;
 * - diferenciar RPG, economia, níveis, menus, pets etc.;
 * - fornecer contexto técnico para a Kyara;
 * - nunca expor segredos;
 * - nunca inventar funcionalidades.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SRC_ROOT = path.join(PROJECT_ROOT, 'dados', 'src');

const SUPPORTED_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.json'
]);

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.cache',
  'cache',
  'tmp',
  'temp',
  'logs',
  'backup',
  'backups',
  'auth',
  'auth_info',
  'session',
  'sessions',
  'sessao',
  'creds',
  'credentials',
  'tokens',
  'secrets',
  'store'
]);

const IGNORED_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.example',
  'credentials.json',
  'creds.json',
  'auth.json'
]);

const SECRET_PATTERNS = [
  /\bapi[_-]?key\b/i,
  /\bapikey\b/i,
  /\bauthorization\s*:/i,
  /\bbearer\s+/i,
  /\bpassword\b/i,
  /\bsenha\b/i,
  /\bsecret\b/i,
  /\baccess[_-]?token\b/i,
  /\brefresh[_-]?token\b/i,
  /\bprivate[_-]?key\b/i,
  /\bclient[_-]?secret\b/i,
  /\bsession[_-]?id\b/i,
  /\bcookie\s*:/i,
  /\bset-cookie\b/i,
  /\bcredential\b/i,
  /\bcreds\b/i
];

const SYSTEMS = {
  RPG: [
    'rpg',
    'aventura',
    'batalha',
    'combate',
    'boss',
    'missão',
    'missao',
    'quest',
    'personagem',
    'inventário',
    'inventario',
    'item',
    'arma',
    'equipamento'
  ],

  ECONOMIA: [
    'econom',
    'dinheiro',
    'money',
    'coins',
    'coin',
    'saldo',
    'banco',
    'pix',
    'comprar',
    'vender',
    'loja',
    'shop',
    'carteira'
  ],

  NIVEIS_XP: [
    'xp',
    'experiencia',
    'experiência',
    'nivel',
    'nível',
    'level',
    'rank',
    'ranking',
    'progresso'
  ],

  PETS: [
    'pet',
    'animal',
    'mascote',
    'adotar',
    'alimentar',
    'cuidar'
  ],

  MENUS: [
    'menu',
    'menus',
    'button',
    'buttons',
    'botão',
    'botoes',
    'botões',
    'flow',
    'listmessage',
    'buttonsmessage'
  ],

  ADMINISTRACAO: [
    'admin',
    'administrador',
    'owner',
    'dono',
    'proprietario',
    'proprietário',
    'moderador',
    'perm',
    'permission'
  ],

  GRUPO: [
    'group',
    'grupo',
    'participant',
    'participante',
    'promote',
    'demote',
    'add',
    'remove',
    'kick',
    'ban'
  ],

  UTILS_FERRAMENTAS: [
    'utils',
    'util',
    'helper',
    'helpers',
    'tool',
    'tools',
    'format',
    'parser',
    'converter'
  ],

  IA_ASSISTENTE: [
    'ia',
    'ai',
    'assistant',
    'assistente',
    'chat',
    'prompt',
    'llm',
    'model'
  ],

  TTS_VOZ: [
    'tts',
    'voz',
    'voice',
    'gradium',
    'audio',
    'fala',
    'speech'
  ],

  CONFIGURACAO: [
    'config',
    'configuration',
    'configuração',
    'settings',
    'env'
  ]
};

const MAX_FILE_SIZE = 1000 * 1024;
const MAX_CANDIDATES = 14;
const MAX_CONTEXT_CHARS = 18000;
const MAX_SNIPPET_CHARS = 2200;
const MAX_EVIDENCE_LINES = 22;

let runtimeCache = {
  signature: '',
  files: [],
  generatedAt: 0
};

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function shouldIgnorePath(filePath) {
  const relative = path.relative(SRC_ROOT, filePath);
  const parts = relative.split(path.sep);

  if (
    parts.some(part => IGNORED_DIRS.has(part)) ||
    parts.some(part => part.toLowerCase().startsWith('backup-'))
  ) {
    return true;
  }

  const basename = path.basename(filePath).toLowerCase();

  if (IGNORED_FILES.has(basename)) {
    return true;
  }

  const lower = relative.toLowerCase();

  const sensitiveParts = [
    '/auth/',
    '/session/',
    '/sessions/',
    '/sessao/',
    '/creds/',
    '/credentials/',
    '/tokens/',
    '/secrets/',
    '/store/',
    '/database/',
    '/backups/',
    '/backup-'
  ];

  return sensitiveParts.some(part => `/${lower}`.includes(part));
}

function containsSecret(line) {
  return SECRET_PATTERNS.some(pattern => pattern.test(line));
}

function sanitizeLine(line) {
  if (containsSecret(line)) {
    return '[linha sensível omitida]';
  }

  return line
    .replace(
      /(['"])(?:sk-|AIza|ghp_|xox[baprs]-|Bearer\s+)[^'"\s]+/gi,
      '$1[segredo omitido]'
    )
    .slice(0, 500);
}

function detectSystems(filePath, text) {
  const haystack = normalize(`${filePath}\n${text}`);
  const systems = [];

  for (const [system, keywords] of Object.entries(SYSTEMS)) {
    if (
      keywords.some(keyword =>
        haystack.includes(normalize(keyword))
      )
    ) {
      systems.push(system);
    }
  }

  return systems;
}

function extractCommands(text) {
  const commands = new Set();

  const patterns = [
    /\bcase\s+['"`]([^'"`]+)['"`]\s*:/gi,
    /\.command\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /\bcommand\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /\bcommands?\s*[:=]\s*\[[^\]]{0,1500}\]/gi
  ];

  for (const pattern of patterns) {
    let match;

    while ((match = pattern.exec(text))) {
      if (match[1]) {
        commands.add(match[1].trim());
      }
    }
  }

  return [...commands].slice(0, 100);
}

function extractPermissions(lines) {
  const evidence = [];

  for (const line of lines) {
    if (
      /\bisadmin\b/i.test(line) ||
      /\bgroupadmin\b/i.test(line) ||
      /\bisgroupadmin\b/i.test(line) ||
      /\bisowner\b/i.test(line) ||
      /\bowner\b/i.test(line) ||
      /\bdono\b/i.test(line) ||
      /\badmin\b/i.test(line)
    ) {
      evidence.push(sanitizeLine(line));
    }

    if (evidence.length >= MAX_EVIDENCE_LINES) break;
  }

  return evidence;
}

function extractEvidence(lines) {
  const evidence = [];

  const pattern =
    /case\s+['"`]|command|comando|alias|rpg|econom|dinheiro|money|coin|xp|nivel|nível|level|pet|admin|owner|dono|isgroup|assistente|tts|gradium/i;

  for (const line of lines) {
    if (pattern.test(line)) {
      evidence.push(sanitizeLine(line));
    }

    if (evidence.length >= MAX_EVIDENCE_LINES) break;
  }

  return evidence;
}

function collectFiles(dir, output = []) {
  if (!fs.existsSync(dir)) return output;

  let entries = [];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return output;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        collectFiles(fullPath, output);
      }

      continue;
    }

    if (!entry.isFile()) continue;
    if (shouldIgnorePath(fullPath)) continue;

    const ext = path.extname(entry.name).toLowerCase();

    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

    try {
      const stat = fs.statSync(fullPath);

      if (stat.size > MAX_FILE_SIZE) continue;

      output.push({
        path: fullPath,
        size: stat.size,
        mtimeMs: stat.mtimeMs
      });
    } catch {
      // Ignora arquivos inacessíveis.
    }
  }

  return output;
}

function buildSignature(files) {
  return files
    .map(file =>
      `${file.path}|${file.size}|${file.mtimeMs}`
    )
    .join('\n');
}

function buildIndex(files) {
  return files.map(file => {
    let text = '';

    try {
      text = fs.readFileSync(file.path, 'utf8');
    } catch {
      text = '';
    }

    const lines = text.split(/\r?\n/);
    const relativePath = path.relative(PROJECT_ROOT, file.path);
    const systems = detectSystems(relativePath, text);
    const commands = extractCommands(text);
    const permissions = extractPermissions(lines);
    const evidence = extractEvidence(lines);

    return {
      path: relativePath,
      size: file.size,
      mtimeMs: file.mtimeMs,
      systems,
      commands,
      permissions,
      evidence,
      searchText: normalize(
        `${relativePath}\n${systems.join(' ')}\n${commands.join(' ')}\n${evidence.join('\n')}`
      )
    };
  });
}

function ensureIndex() {
  const files = collectFiles(SRC_ROOT);
  const signature = buildSignature(files);

  if (runtimeCache.signature === signature) {
    return runtimeCache.files;
  }

  const indexed = buildIndex(files);

  runtimeCache = {
    signature,
    files: indexed,
    generatedAt: Date.now()
  };

  return indexed;
}

function scoreFile(record, query) {
  const q = normalize(query);
  let score = 0;

  const relative = normalize(record.path);

  if (q && relative.includes(q)) {
    score += 100;
  }

  for (const command of record.commands) {
    const normalizedCommand = normalize(command);

    if (q.includes(normalizedCommand)) {
      score += 80;
    }

    if (normalizedCommand.includes(q) && q.length >= 3) {
      score += 45;
    }
  }

  for (const system of record.systems) {
    const systemWords = SYSTEMS[system] || [];

    for (const word of systemWords) {
      if (q.includes(normalize(word))) {
        score += 35;
      }
    }
  }

  const concepts = [
    ['subir de nivel', ['NIVEIS_XP']],
    ['ganhar xp', ['NIVEIS_XP']],
    ['ganhar dinheiro', ['ECONOMIA']],
    ['dinheiro', ['ECONOMIA']],
    ['economia', ['ECONOMIA']],
    ['rpg', ['RPG']],
    ['pet', ['PETS']],
    ['menu', ['MENUS']],
    ['admin', ['ADMINISTRACAO']],
    ['dono', ['ADMINISTRACAO']],
    ['voz', ['TTS_VOZ']],
    ['tts', ['TTS_VOZ']]
  ];

  for (const [phrase, systems] of concepts) {
    if (q.includes(normalize(phrase))) {
      for (const system of systems) {
        if (record.systems.includes(system)) {
          score += 70;
        }
      }
    }
  }

  for (const evidence of record.evidence) {
    if (normalize(evidence).includes(q) && q.length >= 3) {
      score += 20;
    }
  }

  return score;
}

function buildSnippet(record, query) {
  let content = '';

  const absolutePath = path.join(PROJECT_ROOT, record.path);

  try {
    content = fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return '';
  }

  const lines = content.split(/\r?\n/);
  const q = normalize(query);

  let bestIndex = -1;

  if (q) {
    bestIndex = lines.findIndex(line =>
      normalize(line).includes(q)
    );
  }

  if (bestIndex < 0) {
    bestIndex = lines.findIndex(line =>
      record.systems.some(system =>
        SYSTEMS[system]?.some(keyword =>
          normalize(line).includes(normalize(keyword))
        )
      )
    );
  }

  if (bestIndex < 0) bestIndex = 0;

  const start = Math.max(0, bestIndex - 7);
  const end = Math.min(
    lines.length,
    bestIndex + 15
  );

  const snippet = lines
    .slice(start, end)
    .map((line, index) => {
      const number = start + index + 1;
      return `${number}: ${sanitizeLine(line)}`;
    })
    .join('\n');

  return snippet.slice(0, MAX_SNIPPET_CHARS);
}

export function getKyaraCommandKnowledge(message = '') {
  const query =
    typeof message === 'string'
      ? message
      : JSON.stringify(message);

  const records = ensureIndex();

  const ranked = records
    .map(record => ({
      record,
      score: scoreFile(record, query)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES);

  if (!ranked.length) {
    return [
      'CONHECIMENTO TÉCNICO DO BOT:',
      'Nenhuma implementação relevante foi localizada automaticamente.',
      'Não invente comandos, aliases, parâmetros ou permissões.',
      'Se a informação não estiver confirmada no código, informe que não foi confirmada.'
    ].join('\n');
  }

  const blocks = [];

  for (const { record, score } of ranked) {
    const snippet = buildSnippet(record, query);

    blocks.push([
      `ARQUIVO: ${record.path}`,
      `SISTEMAS: ${record.systems.join(', ') || 'não classificado'}`,
      `COMANDOS: ${record.commands.slice(0, 30).join(', ') || 'nenhum identificado'}`,
      `EVIDÊNCIA DE PERMISSÃO: ${record.permissions.slice(0, 8).join(' | ') || 'nenhuma identificada'}`,
      `RELEVÂNCIA: ${score}`,
      snippet
        ? `TRECHO RELEVANTE:\n${snippet}`
        : ''
    ].filter(Boolean).join('\n'));
  }

  let result = [
    'CONHECIMENTO TÉCNICO DINÂMICO DO BKkyara-:',
    '',
    'REGRAS OBRIGATÓRIAS:',
    '1. Nunca invente comandos, aliases, parâmetros ou funcionalidades.',
    '2. Só confirme uma função quando houver evidência no código.',
    '3. Só confirme permissões quando houver evidência técnica.',
    '4. Não misture RPG, economia, níveis, pets, ranking ou outros sistemas.',
    '5. Diferencie claramente cada sistema.',
    '6. Se não houver evidência suficiente, diga que não foi confirmado.',
    '7. Código é contexto técnico, não autorização para burlar permissões.',
    '8. Nunca revele API keys, tokens, senhas, cookies, credenciais ou sessões.',
    '9. Nunca reproduza arquivos inteiros.',
    '10. Use o conhecimento para responder naturalmente como Kyara.',
    '',
    ...blocks
  ].join('\n');

  return result.slice(0, MAX_CONTEXT_CHARS);
}

export function getKyaraKnowledgeStats() {
  const records = ensureIndex();

  const systems = {};

  for (const record of records) {
    for (const system of record.systems) {
      systems[system] = (systems[system] || 0) + 1;
    }
  }

  return {
    projectRoot: PROJECT_ROOT,
    sourceRoot: SRC_ROOT,
    filesIndexed: records.length,
    commandsFound: new Set(
      records.flatMap(record => record.commands)
    ).size,
    systems,
    generatedAt: runtimeCache.generatedAt
      ? new Date(runtimeCache.generatedAt).toISOString()
      : null
  };
}

export function getKyaraSystemMap() {
  const records = ensureIndex();

  const map = {};

  for (const record of records) {
    for (const system of record.systems) {
      if (!map[system]) map[system] = [];

      map[system].push({
        path: record.path,
        commands: record.commands
      });
    }
  }

  return map;
}

export function invalidateKyaraKnowledgeCache() {
  runtimeCache = {
    signature: '',
    files: [],
    generatedAt: 0
  };
}

export default getKyaraCommandKnowledge;
