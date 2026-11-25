import fs from 'node:fs';

const CATALOG = JSON.parse(
  fs.readFileSync(
    new URL('./catalog.json', import.meta.url),
    'utf8'
  )
);

const SITES = CATALOG.sites || {};
const ALIASES = CATALOG.aliases || {};

const NATIVE_SITE_IDS = new Set(
  CATALOG.native || ['rule34']
);

function normalizarSite(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function normalizarConsulta(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolverKyaraImageSite(value) {
  const key = normalizarSite(value);

  if (SITES[key]) {
    return SITES[key];
  }

  const alias = ALIASES[key];

  if (alias && SITES[alias]) {
    return SITES[alias];
  }

  for (const site of Object.values(SITES)) {
    if (
      key === normalizarSite(site.host) ||
      key === normalizarSite(site.nome)
    ) {
      return site;
    }
  }

  return null;
}

export function isKyaraImageSite(value) {
  const site = resolverKyaraImageSite(value);

  if (!site) {
    return false;
  }

  if (NATIVE_SITE_IDS.has(site.id)) {
    return false;
  }

  const kind =
    String(site.kind || '')
      .trim()
      .toLowerCase();

  if (kind === 'video' || kind === 'audio') {
    return false;
  }

  const category =
    String(site.category || '')
      .trim()
      .toLowerCase();

  if (
    category === 'video' ||
    category === 'adult-video' ||
    category === 'audio'
  ) {
    return false;
  }

  const imageCategories = new Set([
    'imagem',
    'imagem-social',
    'wallpaper',
    'booru',
    'booru-adulto',
    'galeria',
    'galeria-adulto',
    'furry',
    'gif',
    'manga',
    'quadrinhos',
    'quadrinhos-adulto',
    'ai',
    '3d',
    'museu',
    'museum',
    'foto',
    'arte',
    'arte-social',
    'arte-adulto',
    'portfolio',
    'host-imagem',
    'arquivo',
    'imageboard',
    'documentos-visuais',
    'colecoes-visuais'
  ]);

  if (imageCategories.has(category)) {
    return true;
  }

  if (
    String(site.engine || '')
      .trim()
      .toLowerCase() === 'adaptive'
  ) {
    return true;
  }

  return false;
}

function shellQuote(value) {
  return `'${String(value ?? '')
    .replaceAll("'", "'\\''")}'`;
}

export function construirComandoBuscaSitePrime(
  site,
  consulta,
  quantidade = 10
) {
  const resolved =
    resolverKyaraImageSite(site);

  if (!resolved) {
    return null;
  }

  if (NATIVE_SITE_IDS.has(resolved.id)) {
    return null;
  }

  const limite = Math.max(
    1,
    Math.min(
      Number(quantidade) || 10,
      10
    )
  );

  const busca =
    normalizarConsulta(consulta);

  if (!busca) {
    return null;
  }

  /*
   * O executor do Kyara decide qual script Python
   * deve receber o comando. Portanto, o Site PRIME
   * retorna somente a instrução lógica "search ...".
   *
   * Isso evita que executarPythonJson() confunda
   * o comando PRIME com um comando normal do bot_videos.py.
   */
  return [
    'search',
    shellQuote(resolved.id),
    String(limite),
    shellQuote(busca)
  ].join(' ');
}

export function listarKyaraImageSites() {
  return Object.values(SITES);
}

export function listarKyaraImageSitesPorCategoria(
  categoria
) {
  const key = normalizarSite(categoria);

  if (!key) {
    return listarKyaraImageSites();
  }

  return Object.values(SITES).filter(
    site =>
      normalizarSite(
        site.category
      ) === key
  );
}

export default {
  resolverKyaraImageSite,
  isKyaraImageSite,
  construirComandoBuscaSitePrime,
  listarKyaraImageSites,
  listarKyaraImageSitesPorCategoria
};
