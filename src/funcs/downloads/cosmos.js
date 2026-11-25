

// ===============================
// KYARA COSMOS SEARCH ENGINE FIX
// ===============================

function kyaraCosmosNormalize(text=""){
    return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9\s]/g," ")
    .replace(/\s+/g," ")
    .trim();
}


function kyaraCosmosScore(item, query){

    const q =
      kyaraCosmosNormalize(query);

    const text =
      kyaraCosmosNormalize(
        [
          item?.title,
          item?.name,
          item?.description,
          item?.caption,
          item?.url
        ].join(" ")
      );


    let score = 0;


    for(const word of q.split(" ")){

        if(!word) continue;


        if(text.includes(word))
            score += 10;


        if(
          item?.title &&
          kyaraCosmosNormalize(item.title)
          .includes(word)
        )
            score += 20;

    }


    // rejeita totalmente sem relação
    if(score === 0)
        return -999;


    return score;
}


function kyaraCosmosQuality(item){

    const url =
      item?.url ||
      item?.image ||
      "";


    if(/thumb|small|preview|120x|150x|200x/i.test(url))
        return -20;


    if(/original|large|1920|1080/i.test(url))
        return 20;


    return 5;
}


function kyaraCosmosRank(results, query){

    return results
    .map(item=>({

        ...item,

        cosmosScore:
          kyaraCosmosScore(
            item,
            query
          )
          +
          kyaraCosmosQuality(item)

    }))

    .filter(
      x=>x.cosmosScore > 0
    )

    .sort(
      (a,b)=>
      b.cosmosScore-a.cosmosScore
    );

}


globalThis.kyaraCosmosSeen ??= new Set();


function kyaraCosmosUnique(items){

    return items.filter(x=>{

        const key =
          x.url ||
          x.image ||
          x.src;


        if(!key)
            return false;


        if(
          kyaraCosmosSeen.has(key)
        )
            return false;


        kyaraCosmosSeen.add(key);

        return true;

    });

}


import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const TMP_DIR =
  path.join(
    os.tmpdir(),
    'kyara-cosmos'
  );

const COMMONS_API =
  'https://commons.wikimedia.org/w/api.php';

const DEFAULT_LIMIT = 10;
const NORMAL_LIMIT = 10;
const OWNER_LIMIT = 30;

const SEARCH_POOL = 50;

const CACHE_TTL =
  10 * 60 * 1000;

const REQUEST_TIMEOUT = 15000;

const SEARCH_CACHE =
  new Map();

/*
 * Termos que devem ser descartados
 * completamente.
 */


/*
 * Termos que normalmente indicam
 * resultado indireto ou pouco útil.
 */
const STRONG_NEGATIVE_TERMS = [
  'cosplayer',
  'cosplay',
  'costume',
  'convention',
  'festival',
  'event',
  'merchandise',
  'product',
  'plush',
  'toy',
  'figurine',
  'statue',
  'museum',
  'exhibition',
  'sponsored'
];

const GEO_NEGATIVE_TERMS = [
  'city',
  'street',
  'road',
  'avenue',
  'district',
  'municipality',
  'province',
  'county',
  'state',
  'map',
  'locator',
  'geographic',
  'geographical',
  'landmark',
  'building',
  'station',
  'temple',
  'church',
  'bridge'
];

/*
 * =========================================================
 * FILTRO SEMÂNTICO FORTE DO COSMOS
 * =========================================================
 *
 * O Wikimedia pode retornar resultados que apenas possuem
 * uma palavra relacionada à pesquisa.
 *
 * Exemplo:
 *   "goku"
 * pode retornar:
 *   - roupas
 *   - kanji
 *   - cosplay
 *   - eventos
 *   - produtos
 *   - pessoas
 *   - locais
 *
 * Estes filtros tentam separar o assunto visual principal
 * do ruído.
 */

const HARD_REJECT_TERMS = [
  'shirt',
  't-shirt',
  'tshirt',
  'shorts',
  'pants',
  'trousers',
  'shoe',
  'shoes',
  'clothing',
  'clothes',
  'jacket',
  'dress',
  'uniform',
  'outfit',
  'fashion',
  'brand',
  'logo',
  'label',
  'packaging',
  'package',
  'advertisement',
  'advertising',
  'poster',
  'flyer',
  'brochure',
  'catalog',
  'menu',
  'document',
  'book',
  'page',
  'screenshot',
  'diagram',
  'chart',
  'graph',
  'sign',
  'symbol',
  'kanji',
  'hiragana',
  'katakana',
  'text',
  'writing',
  'calligraphy',
  'tattoo'
];

const PERSON_REJECT_TERMS = [
  'portrait',
  'selfie',
  'headshot',
  'person',
  'man',
  'woman',
  'boy',
  'girl',
  'people',
  'photograph of',
  'photo of',
  'model'
];

const OBJECT_REJECT_TERMS = [
  'toy',
  'plush',
  'plushie',
  'figurine',
  'figure',
  'statue',
  'sculpture',
  'doll',
  'model kit',
  'action figure',
  'merch',
  'merchandise',
  'product',
  'product photo',
  'store',
  'shop',
  'retail'
];

const LOCATION_REJECT_TERMS = [
  'city',
  'street',
  'road',
  'avenue',
  'building',
  'station',
  'airport',
  'bridge',
  'church',
  'temple',
  'museum',
  'park',
  'square',
  'landscape',
  'map',
  'location',
  'district',
  'municipality',
  'province',
  'county'
];

const EVENT_REJECT_TERMS = [
  'convention',
  'conference',
  'festival',
  'event',
  'expo',
  'exhibition',
  'opening',
  'ceremony',
  'audience',
  'stage'
];

const CHARACTER_BOOST_TERMS = [
  'son goku',
  'goku',
  'kakarot',
  'dragon ball',
  'dragonball',
  'dbz',
  'dragon ball z',
  'dragon ball super',
  'super saiyan',
  'saiyan'
];

const GENERIC_IMAGE_TERMS = [
  'anime',
  'manga',
  'character',
  'illustration',
  'artwork',
  'drawing',
  'screenshot',
  'animation',
  'fictional character'
];

function cosmosText(value) {
  return normalizeText(
    String(value || '')
      .replace(/[_\-./\\()[\]{}:;,!?'"`]+/g, ' ')
  );
}


function cosmosQueryTokens(query) {
  return String(query || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}


function cosmosHasStrongMatch(item, query) {

  const text =
    cosmosText(
      [
        item?.title,
        item?.name,
        item?.description,
        item?.caption,
        item?.url
      ].join(" ")
    );

  const tokens =
    cosmosQueryTokens(query);


  if(!tokens.length)
    return false;


  return tokens.every(
    token =>
      text.includes(token)
  );
}


function cosmosContainsAny(text, terms) {
  const value = cosmosText(text);

  return terms.some(
    term =>
      value.includes(
        cosmosText(term)
      )
  );
}

function cosmosTokenMatch(text, term) {
  const value = cosmosText(text);
  const target = cosmosText(term);

  if (!value || !target) {
    return false;
  }

  const tokens =
    target
      .split(/\\s+/)
      .map(token => token.trim())
      .filter(Boolean);

  if (!tokens.length) {
    return false;
  }

  const padded =
    ` ${value} `;

  return tokens.every(
    token =>
      padded.includes(
        ` ${token} `
      ) ||
      value.includes(token)
  );
}

/*
 * Monta o texto usado para análise.
 */
function getCosmosSearchText(item) {
  return cosmosText([
    item?.title,
    item?.snippet,
    item?.description,
    item?.caption,
    item?.categories,
    item?.extmetadata?.ImageDescription?.value,
    item?.extmetadata?.ObjectName?.value,
    item?.extmetadata?.Categories?.value
  ].join(' '));
}

/*
 * Retorna:
 *
 *   rejected = resultado deve ser eliminado
 *   score    = força da relação com a pesquisa
 */
function scoreCosmosRelevance(
  item,
  query
) {
  const q =
    cosmosText(query);

  const title =
    cosmosText(
      item?.title
    );

  const snippet =
    cosmosText(
      item?.snippet
    );

  const description =
    cosmosText(
      [
        item?.description,
        item?.caption,
        item?.categories,
        item?.extmetadata?.ImageDescription?.value,
        item?.extmetadata?.ObjectName?.value,
        item?.extmetadata?.Categories?.value
      ].join(' ')
    );

  const text =
    cosmosText([
      title,
      snippet,
      description
    ].join(' '));

  if (!q || !text) {
    return {
      rejected: true,
      score: -9999,
      reason: 'sem texto'
    };
  }

  /*
   * Produtos, brinquedos e merchandising.
   *
   * Aqui descartamos imediatamente porque não
   * queremos camiseta, boneco, action figure etc.
   */
  if (
    cosmosContainsAny(
      text,
      OBJECT_REJECT_TERMS
    )
  ) {
    return {
      rejected: true,
      score: -9999,
      reason: 'object'
    };
  }

  /*
   * Roupa, propaganda, pôster, texto etc.
   */
  if (
    cosmosContainsAny(
      text,
      HARD_REJECT_TERMS
    )
  ) {
    return {
      rejected: true,
      score: -9999,
      reason: 'hard-term'
    };
  }

  const characterMatch =
    cosmosContainsAny(
      text,
      CHARACTER_BOOST_TERMS
    );

  const characterInTitle =
    cosmosContainsAny(
      title,
      CHARACTER_BOOST_TERMS
    );

  /*
   * A consulta aparece diretamente no título.
   */
  const queryInTitle =
    cosmosTokenMatch(
      title,
      q
    );

  /*
   * A consulta aparece em qualquer metadado.
   */
  const queryAnywhere =
    cosmosTokenMatch(
      text,
      q
    );

  /*
   * Eventos e locais.
   */
  const hasEvent =
    cosmosContainsAny(
      text,
      EVENT_REJECT_TERMS
    );

  const hasLocation =
    cosmosContainsAny(
      text,
      LOCATION_REJECT_TERMS
    );

  /*
   * Pessoas reais.
   *
   * Só aplicamos penalidade forte quando NÃO existe
   * evidência de personagem.
   *
   * Isso evita matar uma imagem legítima de Goku
   * porque a descrição do Wikimedia contém "person".
   */
  const hasPerson =
    cosmosContainsAny(
      text,
      PERSON_REJECT_TERMS
    );

  let score = 0;

  /*
   * =====================================================
   * RELEVÂNCIA DA CONSULTA
   * =====================================================
   */

  if (queryInTitle) {
    score += 300;
  } else if (queryAnywhere) {
    score += 100;
  }

  /*
   * =====================================================
   * PERSONAGEM / FRANQUIA
   * =====================================================
   */

  if (characterMatch) {
    score += 180;
  }

  if (characterInTitle) {
    score += 300;
  }

  /*
   * Se a pesquisa é especificamente Goku,
   * títulos contendo Goku/Kakarot/Dragon Ball
   * recebem prioridade máxima.
   */
  if (
    q === 'goku' ||
    q === 'son goku' ||
    q === 'kakarot'
  ) {
    if (
      cosmosContainsAny(
        title,
        [
          'goku',
          'son goku',
          'kakarot'
        ]
      )
    ) {
      score += 500;
    }

    if (
      cosmosContainsAny(
        title,
        [
          'dragon ball',
          'dragonball',
          'dbz',
          'dragon ball z',
          'dragon ball super'
        ]
      )
    ) {
      score += 250;
    }
  }

  /*
   * =====================================================
   * SINAIS VISUAIS
   * =====================================================
   */

  for (
    const term of GENERIC_IMAGE_TERMS
  ) {
    if (
      cosmosContainsAny(
        text,
        [term]
      )
    ) {
      score += 5;
    }
  }

  /*
   * =====================================================
   * PENALIDADES
   * =====================================================
   */

  if (hasEvent) {
    score -= 180;
  }

  if (hasLocation) {
    score -= 120;
  }

  /*
   * Pessoa real:
   *
   * Sem personagem -> penalidade pesada.
   * Com personagem -> praticamente ignoramos.
   */
  if (hasPerson) {
    if (characterMatch) {
      score -= 10;
    } else {
      score -= 220;
    }
  }

  /*
   * Se não existe nem consulta nem personagem,
   * provavelmente é ruído.
   */
  if (
    !queryAnywhere &&
    !characterMatch
  ) {
    score -= 250;
  }

  /*
   * Resultado precisa ter alguma relação forte.
   */
  if (
    score < 50
  ) {
    return {
      rejected: true,
      score,
      reason: 'baixo'
    };
  }

  return {
    rejected: false,
    score,
    reason: 'ok'
  };
}

const VISUAL_POSITIVE_TERMS = [
  'anime',
  'manga',
  'character',
  'illustration',
  'illustrated',
  'art',
  'artwork',
  'drawing',
  'draw',
  'painting',
  'wallpaper',
  'fanart',
  'fan art',
  'poster',
  'screenshot',
  'portrait',
  'digital art',
  'concept art',
  'official'
];

const PHOTO_POSITIVE_TERMS = [
  'photo',
  'photograph',
  'picture',
  'image',
  'portrait',
  'nature',
  'landscape'
];

const INTENT_TERMS = {
  anime: [
    'anime',
    'manga',
    'dragon ball',
    'dragonball',
    'naruto',
    'one piece',
    'bleach',
    'jujutsu',
    'demon slayer',
    'pokemon',
    'goku',
    'vegeta',
    'gohan',
    'trunks',
    'sasuke',
    'sakura',
    'luffy',
    'zoro',
    'ichigo'
  ],

  character: [
    'personagem',
    'character',
    'hero',
    'heroi',
    'herói',
    'villain',
    'vilao',
    'vilão',
    'protagonist',
    'protagonista'
  ],

  animal: [
    'gato',
    'cat',
    'cachorro',
    'dog',
    'cao',
    'cão',
    'wolf',
    'lobo',
    'lion',
    'leao',
    'leão',
    'tiger',
    'tigre',
    'bird',
    'passaro',
    'pássaro',
    'horse',
    'cavalo',
    'fish',
    'peixe'
  ],

  vehicle: [
    'carro',
    'car',
    'automovel',
    'automóvel',
    'automobile',
    'motorcycle',
    'motocicleta',
    'moto',
    'bike',
    'bicicleta',
    'truck',
    'caminhao',
    'caminhão',
    'bus',
    'onibus',
    'ônibus',
    'plane',
    'airplane',
    'aviao',
    'avião',
    'train',
    'trem'
  ],

  nature: [
    'paisagem',
    'landscape',
    'nature',
    'natureza',
    'mountain',
    'montanha',
    'forest',
    'floresta',
    'beach',
    'praia',
    'ocean',
    'oceano',
    'lake',
    'lago',
    'sunset',
    'sunrise',
    'waterfall',
    'cachoeira',
    'desert',
    'deserto'
  ],

  art: [
    'arte',
    'art',
    'illustration',
    'ilustracao',
    'ilustração',
    'drawing',
    'desenho',
    'painting',
    'pintura',
    'wallpaper',
    'fanart',
    'poster'
  ]
};

/*
 * Sinônimos ajudam o Wikimedia a
 * encontrar conteúdo em português
 * e inglês sem fazer várias requisições.
 */
const SYNONYMS = {
  gato: ['gato', 'cat'],
  cat: ['cat', 'gato'],

  cachorro: ['cachorro', 'dog'],
  dog: ['dog', 'cachorro'],

  carro: ['carro', 'car', 'automobile'],
  car: ['car', 'carro', 'automobile'],

  paisagem: ['paisagem', 'landscape'],
  landscape: ['landscape', 'paisagem'],

  natureza: ['natureza', 'nature'],
  nature: ['nature', 'natureza'],

  desenho: ['desenho', 'drawing'],
  drawing: ['drawing', 'desenho'],

  anime: ['anime', 'manga'],
  manga: ['manga', 'anime']
};

function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}

function normalizeText(
  value = ''
) {
  return String(value)
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}

function tokenize(
  value = ''
) {
  return [
    ...new Set(
      normalizeText(value)
        .split(/\s+/)
        .filter(
          word =>
            word.length >= 2
        )
    )
  ];
}

function cleanQuery(
  value = ''
) {
  return String(
    value || ''
  )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
    .slice(
      0,
      180
    );
}

function getCache(
  key
) {
  const item =
    SEARCH_CACHE.get(key);

  if (!item) {
    return null;
  }

  if (
    Date.now() -
      item.time >
    CACHE_TTL
  ) {
    SEARCH_CACHE.delete(
      key
    );

    return null;
  }

  return item.value;
}

function setCache(
  key,
  value
) {
  SEARCH_CACHE.set(
    key,
    {
      time: Date.now(),
      value
    }
  );

  if (
    SEARCH_CACHE.size > 100
  ) {
    const first =
      SEARCH_CACHE
        .keys()
        .next()
        .value;

    if (first) {
      SEARCH_CACHE.delete(
        first
      );
    }
  }
}

function classifyIntent(
  query
) {
  const normalized =
    normalizeText(
      query
    );

  let best =
    'general';

  let bestScore = 0;

  for (
    const [
      intent,
      terms
    ]
    of Object.entries(
      INTENT_TERMS
    )
  ) {
    let score = 0;

    for (
      const term of terms
    ) {
      const normalizedTerm =
        normalizeText(
          term
        );

      if (
        normalized ===
        normalizedTerm
      ) {
        score += 30;
      } else if (
        normalized.includes(
          normalizedTerm
        )
      ) {
        score += 10;
      }
    }

    if (
      score > bestScore
    ) {
      bestScore =
        score;

      best =
        intent;
    }
  }

  return best;
}

const COSMOS_CANONICAL_TERMS = Object.freeze({
  gato: ['cat', 'feline'],
  gatos: ['cat', 'feline'],
  gatinho: ['cat', 'kitten', 'feline'],
  gatinhos: ['cat', 'kitten', 'feline'],

  carro: ['car', 'automobile', 'vehicle'],
  carros: ['car', 'automobile', 'vehicle'],
  automovel: ['automobile', 'car', 'vehicle'],
  automóveis: ['automobile', 'car', 'vehicle'],
  veiculo: ['vehicle', 'car', 'automobile'],
  veiculos: ['vehicle', 'car', 'automobile'],

  paisagem: ['landscape', 'scenery'],
  paisagens: ['landscape', 'scenery'],

  cachorro: ['dog', 'canine'],
  cachorros: ['dog', 'canine'],
  cao: ['dog', 'canine'],
  caes: ['dog', 'canine'],

  passarinho: ['bird'],
  passaros: ['bird'],
  passaro: ['bird'],

  cavalo: ['horse', 'equine'],
  cavalos: ['horse', 'equine'],

  flor: ['flower'],
  flores: ['flower', 'flowers']
});

function hasWholeTerm(text, term) {
  const haystack =
    tokenize(
      normalizeText(
        text || ''
      )
    );

  const needle =
    tokenize(
      normalizeText(
        term || ''
      )
    );

  if (
    !haystack.length ||
    !needle.length
  ) {
    return false;
  }

  if (needle.length === 1) {
    return haystack.includes(
      needle[0]
    );
  }

  for (
    let i = 0;
    i <= haystack.length - needle.length;
    i++
  ) {
    let match = true;

    for (
      let j = 0;
      j < needle.length;
      j++
    ) {
      if (
        haystack[i + j] !==
        needle[j]
      ) {
        match = false;
        break;
      }
    }

    if (match) {
      return true;
    }
  }

  return false;
}


function hasWholePhrase(
  text,
  phrase
) {
  const haystack =
    normalizeText(
      text || ''
    );

  const needle =
    normalizeText(
      phrase || ''
    );

  if (
    !haystack ||
    !needle
  ) {
    return false;
  }

  const escaped =
    needle
      .split(/\s+/)
      .filter(Boolean)
      .map(
        word =>
          word.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          )
      )
      .join('\\s+');

  return new RegExp(
    `(?:^|\\s)${escaped}(?:$|\\s)`,
    'i'
  ).test(haystack);
}

function hasAnyWholePhrase(
  text,
  phrases
) {
  for (
    const phrase of phrases
  ) {
    if (
      hasWholePhrase(
        text,
        phrase
      )
    ) {
      return true;
    }
  }

  return false;
}

function hasAnyWholeTerm(
  text,
  terms
) {
  for (
    const term of terms
  ) {
    if (
      hasWholeTerm(
        text,
        term
      )
    ) {
      return true;
    }
  }

  return false;
}

function canonicalizeCosmosQuery(
  query
) {
  const tokens =
    tokenize(
      normalizeText(
        query || ''
      )
    );

  const output = [];

  for (
    const token of tokens
  ) {
    const mapped =
      COSMOS_CANONICAL_TERMS[
        token
      ];

    if (
      Array.isArray(mapped) &&
      mapped.length
    ) {
      output.push(
        ...mapped
      );
    } else {
      output.push(
        token
      );
    }
  }

  return [
    ...new Set(
      output.filter(Boolean)
    )
  ].join(' ');
}


function buildSearchQuery(
  query,
  intent
) {
  const clean =
    cleanQuery(query);

  const canonical =
    canonicalizeCosmosQuery(
      clean
    );

  /*
   * IMPORTANTE:
   *
   * O Wikimedia deve receber a intenção original
   * de forma simples.
   *
   * Não adicionamos "anime character", "animal",
   * "vehicle", etc. aqui porque isso pode eliminar
   * resultados legítimos antes do ranking.
   *
   * A inteligência fica no scoreResult().
   */

  return (
    `${canonical} filetype:bitmap`
  ).trim();
}

async function fetchJson(
  url,
  retries = 2
) {
  let lastError =
    null;

  for (
    let attempt = 0;
    attempt <= retries;
    attempt++
  ) {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        REQUEST_TIMEOUT
      );

    try {
      const response =
        await fetch(
          url,
          {
            signal:
              controller.signal,
            headers: {
              accept:
                'application/json',
              'user-agent':
                'Kyara-Cosmos/3.0'
            }
          }
        );

      clearTimeout(
        timeout
      );

      if (
        response.ok
      ) {
        return await response.json();
      }

      lastError =
        new Error(
          `Wikimedia HTTP ${response.status}`
        );

      const retryable =
        response.status ===
          429 ||
        response.status >=
          500;

      if (
        !retryable ||
        attempt >= retries
      ) {
        throw lastError;
      }

      const retryAfter =
        Number(
          response.headers.get(
            'retry-after'
          )
        );

      const delay =
        retryAfter > 0
          ? retryAfter *
            1000
          : 1000 *
            Math.pow(
              2,
              attempt
            );

      await sleep(
        Math.min(
          delay,
          6000
        )
      );
    } catch (error) {
      clearTimeout(
        timeout
      );

      lastError =
        error;

      if (
        attempt >= retries
      ) {
        throw error;
      }

      await sleep(
        1000 *
        Math.pow(
          2,
          attempt
        )
      );
    }
  }

  throw (
    lastError ||
    new Error(
      'Falha HTTP desconhecida.'
    )
  );
}

function extractMetadata(
  extmetadata = {}
) {
  const read =
    key =>
      String(
        extmetadata?.[key]
          ?.value ||
        ''
      ).trim();

  return {
    artist:
      read('Artist'),
    description:
      read('ImageDescription'),
    categories:
      read('Categories'),
    credit:
      read('Credit'),
    license:
      read('LicenseShortName')
  };
}

function mapCommonsResult(
  page
) {
  const info =
    Array.isArray(
      page?.imageinfo
    )
      ? page.imageinfo[0]
      : null;

  if (!info) {
    return null;
  }

  const mime =
    String(
      info.mime || ''
    ).toLowerCase();

  if (
    mime &&
    !mime.startsWith(
      'image/'
    )
  ) {
    return null;
  }

  const url =
    info.thumburl ||
    info.url ||
    '';

  if (!url) {
    return null;
  }

  const title =
    String(
      page?.title || ''
    )
      .replace(
        /^File:/i,
        ''
      )
      .trim();

  const metadata =
    extractMetadata(
      info.extmetadata
    );

  return {
    file: url,
    imageUrl: url,
    originalUrl:
      info.url ||
      url,

    thumbnail:
      info.thumburl ||
      url,

    title:
      title ||
      'Imagem sem título',

    description:
      metadata.description,

    snippet:
      String(
        page?.snippet ||
        ''
      )
        .replace(
          /<[^>]*>/g,
          ' '
        )
        .trim(),

    creator:
      metadata.artist,

    tags:
      metadata.categories,

    categories:
      metadata.categories,

    license:
      metadata.license,

    source:
      'Wikimedia Commons',

    sourceUrl:
      String(
        info.descriptionurl ||
        ''
      ),

    width:
      Number(
        info.thumbwidth ||
        info.width
      ) || 0,

    height:
      Number(
        info.thumbheight ||
        info.height
      ) || 0,

    size:
      Number(
        info.size
      ) || 0
  };
}


function scoreResult(
  item,
  query,
  intent
) {
  const title = normalizeText(item.title || '');
  const tags = normalizeText(item.tags || '');
  const categories = normalizeText(item.categories || '');
  const description = normalizeText(item.description || '');
  const snippet = normalizeText(item.snippet || '');
  const fullText = `${title} ${tags} ${categories} ${description} ${snippet}`;

  const exactQuery = normalizeText(query || '');
  const rawTokens = tokenize(exactQuery);
  const canonicalQuery = normalizeText(
    canonicalizeCosmosQuery(exactQuery)
  );
  const canonicalTokens = tokenize(canonicalQuery);

  const animalTerms = [
    'gato', 'gatos', 'gatinho', 'gatinhos', 'cat', 'cats', 'kitten', 'feline',
    'cachorro', 'cachorros', 'cao', 'caes', 'dog', 'dogs', 'puppy', 'canine',
    'passaro', 'passaros', 'passarinho', 'bird', 'birds',
    'cavalo', 'cavalos', 'horse', 'horses', 'equine'
  ];

  const vehicleTerms = [
    'carro', 'carros', 'automovel', 'automoveis', 'veiculo', 'veiculos',
    'car', 'cars', 'automobile', 'automobiles', 'vehicle', 'vehicles'
  ];

  const natureTerms = [
    'paisagem', 'paisagens', 'landscape', 'landscapes', 'scenery',
    'natureza', 'nature', 'montanha', 'montanhas', 'mountain', 'mountains',
    'praia', 'praias', 'beach', 'beaches',
    'floresta', 'florestas', 'forest', 'forests'
  ];

  const animeTerms = [
    'anime', 'manga', 'goku', 'vegeta', 'naruto', 'sasuke',
    'one piece', 'dragon ball', 'dragonball', 'pokemon', 'pokémon',
    'bleach', 'luffy', 'sailor moon', 'my hero academia',
    'demon slayer', 'jujutsu kaisen'
  ];

  const queryIsAnimal =
    hasAnyWholeTerm(exactQuery, animalTerms) ||
    hasAnyWholeTerm(canonicalQuery, animalTerms);

  const queryIsVehicle =
    hasAnyWholeTerm(exactQuery, vehicleTerms) ||
    hasAnyWholeTerm(canonicalQuery, vehicleTerms);

  const queryIsNature =
    hasAnyWholeTerm(exactQuery, natureTerms) ||
    hasAnyWholeTerm(canonicalQuery, natureTerms);

  const queryIsAnime =
    hasAnyWholeTerm(exactQuery, animeTerms) ||
    hasAnyWholeTerm(canonicalQuery, animeTerms);

  const wantsMedical = hasAnyWholePhrase(exactQuery, [
    'doenca', 'doencas', 'sintoma', 'sintomas',
    'medico', 'medica', 'medical',
    'veterinario', 'veterinaria', 'veterinary',
    'fiv', 'felv', 'peritonite',
    'infection', 'infectious', 'alopecia', 'effusion',
    'tratamento', 'treatment', 'diagnostico', 'diagnosis'
  ]);

  const wantsEvent = hasAnyWholePhrase(exactQuery, [
    'cosplay', 'convention', 'conventions',
    'festival', 'evento', 'event',
    'comicon', 'comic con', 'expo',
    'exhibition', 'otakuthon', 'cosplayer'
  ]);

  const wantsGeography = hasAnyWholePhrase(exactQuery, [
    'cidade', 'cidades', 'city', 'cities',
    'mapa', 'maps', 'provincia', 'province',
    'prefeitura', 'municipality', 'municipio',
    'estado', 'state',
    'naruto whirlpools', 'naruto tokushima'
  ]);

  let score = 0;

  const titleTokens = tokenize(title);
  const tagTokens = tokenize(tags);
  const categoryTokens = tokenize(categories);

  let titleMatches = 0;
  let metadataMatches = 0;

  // Relevância textual.
  for (const token of rawTokens) {
    if (!token || token.length < 2) continue;

    if (titleTokens.includes(token)) {
      score += 95;
      titleMatches++;
    } else if (tagTokens.includes(token)) {
      score += 42;
      metadataMatches++;
    } else if (categoryTokens.includes(token)) {
      score += 30;
      metadataMatches++;
    } else if (fullText.includes(token)) {
      score += 12;
    }
  }

  // Equivalentes PT/EN.
  for (const token of canonicalTokens) {
    if (!token || token.length < 2) continue;

    if (titleTokens.includes(token)) {
      score += 38;
    } else if (tagTokens.includes(token)) {
      score += 18;
    } else if (categoryTokens.includes(token)) {
      score += 12;
    }
  }

  // Correspondência exata no título.
  if (hasWholePhrase(title, exactQuery)) {
    score += 260;
  }

  if (hasWholePhrase(title, canonicalQuery)) {
    score += 120;
  }

  // GATOS / ANIMAIS.
  if (queryIsAnimal) {
    if (hasAnyWholeTerm(title, animalTerms)) score += 180;
    if (hasAnyWholeTerm(tags, animalTerms)) score += 75;
    if (hasAnyWholeTerm(categories, animalTerms)) score += 50;

    const medicalNoise = hasAnyWholePhrase(fullText, [
      'pleural effusion',
      'feline infectious',
      'feline viral',
      'veterinary',
      'veterinary medicine',
      'medical',
      'disease',
      'infection',
      'infectious',
      'fiv',
      'felv',
      'alopecia',
      'microchip',
      'treatment',
      'diagnosis',
      'clinic',
      'clinical',
      'pathology'
    ]);

    if (medicalNoise && !wantsMedical) score -= 260;
    if (wantsMedical && medicalNoise) score += 160;
  }

  // CARROS.
  if (queryIsVehicle) {
    if (hasAnyWholeTerm(title, vehicleTerms)) score += 170;
    if (hasAnyWholeTerm(tags, vehicleTerms)) score += 65;
    if (hasAnyWholeTerm(categories, vehicleTerms)) score += 45;

    if (hasAnyWholePhrase(title, [
      'google maps streetview car',
      'street view car',
      'streetview car',
      'car magazine',
      'automobile magazine',
      'trade journal'
    ])) {
      score -= 100;
    }

    if (hasAnyWholePhrase(fullText, [
      'pedal car',
      'kit car',
      'toy car',
      'model car',
      'scale model'
    ])) {
      score -= 45;
    }
  }

  // PAISAGENS / NATUREZA.
  if (queryIsNature) {
    if (hasAnyWholeTerm(title, natureTerms)) score += 145;
    if (hasAnyWholeTerm(tags, natureTerms)) score += 55;
    if (hasAnyWholeTerm(categories, natureTerms)) score += 40;

    if (hasAnyWholePhrase(fullText, [
      'oil painting',
      'painting',
      'engraving',
      'etching',
      'lithograph',
      'drawing',
      'print',
      'artwork',
      'yale center for british art'
    ])) {
      score -= 75;
    }
  }

  // ANIME / PERSONAGENS.
  if (queryIsAnime) {
    if (hasAnyWholeTerm(title, animeTerms)) score += 190;
    if (hasAnyWholeTerm(tags, animeTerms)) score += 65;
    if (hasAnyWholeTerm(categories, animeTerms)) score += 50;

    // Naruto cidade/geografia não deve dominar uma busca por Naruto personagem.
    const geoNoise = hasAnyWholePhrase(fullText, [
      'whirlpools',
      'tokushima',
      'prefecture',
      'naruto city',
      'naruto town',
      'naruto bridge',
      'naruto strait',
      'naruto whirlpools',
      'japan prefecture'
    ]);

    if (
      hasWholeTerm(exactQuery, 'naruto') &&
      geoNoise &&
      !wantsGeography
    ) {
      score -= 360;
    }

    // Cosplay/evento perde prioridade quando o usuário não pediu isso.
    const eventNoise = hasAnyWholePhrase(fullText, [
      'cosplay',
      'cosplayer',
      'convention',
      'comic con',
      'comicon',
      'otakuthon',
      'festival',
      'expo',
      'costume',
      'masquerade'
    ]);

    if (eventNoise && !wantsEvent) score -= 210;
    if (wantsEvent && eventNoise) score += 130;
  }

  // GOKU.
  if (hasWholePhrase(exactQuery, 'goku')) {
    if (hasAnyWholeTerm(title, ['goku', 'son goku'])) {
      score += 180;
    }

    if (hasAnyWholePhrase(fullText, [
      'cosplay',
      'cosplayer',
      'convention',
      'comic con',
      'otakuthon',
      'dragon con',
      'comiccon',
      'costume'
    ])) {
      score -= wantsEvent ? 0 : 220;
    }
  }

  // DRAGON BALL.
  if (
    hasWholePhrase(exactQuery, 'dragon ball') ||
    hasWholePhrase(exactQuery, 'dragonball')
  ) {
    if (hasAnyWholePhrase(title, [
      'dragon ball',
      'dragonball'
    ])) {
      score += 220;
    }

    if (hasAnyWholePhrase(tags, [
      'dragon ball',
      'dragonball'
    ])) {
      score += 80;
    }

    if (hasAnyWholePhrase(categories, [
      'dragon ball',
      'dragonball'
    ])) {
      score += 55;
    }

    if (hasAnyWholePhrase(fullText, [
      'restaurant',
      'gamescom',
      'street mural',
      'tourism board',
      'city wall'
    ])) {
      score -= 55;
    }
  }

  // Ruído visual para buscas de anime/personagem.
  if (queryIsAnime && !wantsEvent) {
    if (hasAnyWholePhrase(fullText, [
      'logo',
      'logo of',
      'sign',
      'restaurant',
      'building',
      'street view'
    ])) {
      score -= 45;
    }
  }

  // Qualidade da imagem.
  const width = Number(item.width) || 0;
  const height = Number(item.height) || 0;
  const pixels = width * height;

  if (pixels >= 5000000) score += 30;
  else if (pixels >= 3000000) score += 25;
  else if (pixels >= 1000000) score += 15;
  else if (pixels >= 500000) score += 7;
  else if (pixels > 0 && pixels < 100000) score -= 30;

  if (width >= 1000 && height >= 700) {
    score += 8;
  }

  if (width > 0 && height > 0) {
    const ratio = width / height;

    if (ratio > 4 || ratio < 0.25) {
      score -= 12;
    }
  }

  if (title.length > 120) {
    score -= 5;
  }

  // Se não encontrou evidência real no título/metadados,
  // deixa o resultado abaixo dos realmente relevantes.
  if (titleMatches === 0 && metadataMatches === 0) {
    score -= 25;
  }

  if (
    score <= 0
  ) {
    return -999;
  }

  return score;
}

function familyKey(
  title
) {
  return normalizeText(
    title
  )
    .replace(
      /\b(copy|version|v\d+|final|edited|cropped)\b/g,
      ''
    )
    .replace(
      /\b\d{1,4}\b/g,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}

function titleSimilarity(
  a,
  b
) {
  const left =
    new Set(
      tokenize(a)
    );

  const right =
    new Set(
      tokenize(b)
    );

  if (
    !left.size ||
    !right.size
  ) {
    return 0;
  }

  let common = 0;

  for (
    const word of left
  ) {
    if (
      right.has(word)
    ) {
      common++;
    }
  }

  return (
    common /
    Math.max(
      left.size,
      right.size
    )
  );
}

function diversify(
  results,
  limit
) {
  const selected = [];

  const families =
    new Set();

  /*
   * Primeiro passe:
   * uma imagem por família.
   */
  for (
    const item of results
  ) {
    if (
      selected.length >=
      limit
    ) {
      break;
    }

    const family =
      familyKey(
        item.title
      );

    if (
      family &&
      families.has(family)
    ) {
      continue;
    }

    const tooSimilar =
      selected.some(
        existing =>
          titleSimilarity(
            existing.title,
            item.title
          ) >= 0.78
      );

    if (
      tooSimilar
    ) {
      continue;
    }

    if (family) {
      families.add(
        family
      );
    }

    selected.push(
      item
    );
  }

  /*
   * Segundo passe:
   * preenche caso o primeiro
   * não consiga atingir o limite.
   */
  if (
    selected.length <
    limit
  ) {
    for (
      const item of results
    ) {
      if (
        selected.length >=
        limit
      ) {
        break;
      }

      const exists =
        selected.some(
          current =>
            current.file ===
              item.file
        );

      if (
        exists
      ) {
        continue;
      }

      selected.push(
        item
      );
    }
  }

  return selected;
}

async function searchCommons(
  query,
  limit
) {
  const intent =
    classifyIntent(
      query
    );

  /*
   * COSMOS SEM FILTRO SEMÂNTICO
   *
   * Envia exatamente o que o usuário pesquisou.
   * A API continua cuidando da pesquisa/relevância.
   */
  const searchQuery =
    String(query || "")
      .trim();

  const url =
    new URL(
      COMMONS_API
    );

  url.searchParams.set(
    'action',
    'query'
  );

  url.searchParams.set(
    'format',
    'json'
  );

  url.searchParams.set(
    'formatversion',
    '2'
  );

  url.searchParams.set(
    'generator',
    'search'
  );

  url.searchParams.set(
    'gsrsearch',
    searchQuery
  );

  url.searchParams.set(
    'gsrnamespace',
    '6'
  );

  url.searchParams.set(
    'gsrlimit',
    String(
      SEARCH_POOL
    )
  );

  url.searchParams.set(
    'gsrsort',
    'relevance'
  );

  url.searchParams.set(
    'gsrprop',
    'snippet'
  );

  url.searchParams.set(
    'prop',
    'imageinfo'
  );

  url.searchParams.set(
    'iiprop',
    'url|mime|size|extmetadata'
  );

  url.searchParams.set(
    'iiurlwidth',
    '1600'
  );

  const data =
    await fetchJson(
      url.toString()
    );

  const pages =
    Array.isArray(
      data?.query?.pages
    )
      ? data.query.pages
      : [];

  const seenUrls =
    new Set();

  const seenTitles =
    new Set();

  const results = [];

  for (
    const page of pages
  ) {
    const item =
      mapCommonsResult(
        page
      );

    if (!item) {
      continue;
    }

    /*
     * FILTRO SEMÂNTICO FORTE
     */
    const relevance =
      scoreCosmosRelevance(
        item,
        query
      );

    if (
      relevance.rejected
    ) {
      continue;
    }

    item.cosmosScore =
      relevance.score;

    const urlKey =
      normalizeText(
        item.file
      );

    const titleKey =
      normalizeText(
        item.title
      );

    if (
      !urlKey ||
      seenUrls.has(
        urlKey
      )
    ) {
      continue;
    }

    /*
     * Mesmo arquivo com pequenas
     * diferenças de nome não entra duas vezes.
     */
    if (
      titleKey &&
      seenTitles.has(
        titleKey
      )
    ) {
      continue;
    }

    seenUrls.add(
      urlKey
    );

    if (titleKey) {
      seenTitles.add(
        titleKey
      );
    }

    item.intent =
      intent;

    item.score =
      scoreResult(
        item,
        query,
        intent
      );

    /*
     * SEM FILTRO SEMÂNTICO:
     *
     * Não descartamos resultado por:
     * - score;
     * - categoria;
     * - palavras bloqueadas;
     * - falta de correspondência no título;
     * - falta de metadados;
     * - heurísticas de anime/personagem;
     * - heurísticas de animal/veículo/natureza.
     *
     * O score continua sendo calculado para permitir
     * ordenação quando existir informação suficiente,
     * mas NÃO elimina resultados.
     */

    results.push(
      item
    );
  }

  results.sort(
    (a, b) => {
      /*
       * Primeiro: relevância semântica.
       * Depois: score antigo como desempate.
       */
      const aCosmos =
        Number.isFinite(
          Number(a.cosmosScore)
        )
          ? Number(a.cosmosScore)
          : -9999;

      const bCosmos =
        Number.isFinite(
          Number(b.cosmosScore)
        )
          ? Number(b.cosmosScore)
          : -9999;

      if (
        bCosmos !==
        aCosmos
      ) {
        return (
          bCosmos -
          aCosmos
        );
      }

      if (
        b.score !==
        a.score
      ) {
        return (
          b.score -
          a.score
        );
      }

      /*
       * Desempate pela resolução.
       */
      const aPixels =
        (a.width || 0) *
        (a.height || 0);

      const bPixels =
        (b.width || 0) *
        (b.height || 0);

      return (
        bPixels -
        aPixels
      );
    }
  );

  return diversify(
    results,
    limit
  );
}

export async function searchCosmos(
  query,
  limit = DEFAULT_LIMIT
) {
  const clean =
    cleanQuery(
      query
    );

  if (!clean) {
    return [];
  }

  const safeLimit =
    Math.max(
      1,
      Math.min(
        Number(limit) ||
          DEFAULT_LIMIT,
        OWNER_LIMIT
      )
    );

  const cacheKey =
    `${normalizeText(clean)}:${safeLimit}`;

  const cached =
    getCache(
      cacheKey
    );

  if (cached) {
    return cached;
  }

  let results = [];

  try {
    /*
     * UMA ÚNICA chamada.
     *
     * Nada de Openverse.
     * Nada de 5-10 buscas em sequência.
     */
    results =
      await searchCommons(
        clean,
        safeLimit
      );
  } catch (error) {
    console.warn(
      '[COSMOS] Busca Wikimedia falhou:',
      error?.message ||
      error
    );

    results = [];
  }

  const finalResults =
    results.slice(
      0,
      safeLimit
    );

  setCache(
    cacheKey,
    finalResults
  );

  return finalResults;
}

export async function executeCosmos(
  query,
  isOwner = false,
  requestedLimit = null
) {
  const clean =
    cleanQuery(
      query
    );

  if (!clean) {
    return {
      ok: false,
      files: [],
      query: '',
      message:
        'Use: #cosmos [quantidade] <pesquisa>'
    };
  }

  const maximum =
    isOwner
      ? OWNER_LIMIT
      : NORMAL_LIMIT;

  const requested =
    Number.isInteger(
      Number(
        requestedLimit
      )
    ) &&
    Number(
      requestedLimit
    ) > 0
      ? Number(
          requestedLimit
        )
      : DEFAULT_LIMIT;

  const limit =
    Math.min(
      requested,
      maximum
    );

  const results =
    await searchCosmos(
      clean,
      limit
    );

  if (!results.length) {
    return {
      ok: false,
      files: [],
      query: clean,
      limit,
      maximum,
      intent:
        classifyIntent(
          clean
        ),
      message:
        `Nenhuma imagem encontrada para "${clean}".`
    };
  }

  /*
   * Mantém item.file porque
   * kyaraMediaCommands.js usa:
   *
   * image: { url: item.file }
   */
  const files =
    results.map(
      (item, index) => ({
        ...item,

        index:
          index + 1,

        file:
          item.file ||
          item.imageUrl ||
          item.originalUrl
      })
    );

  return {
    ok: true,

    query: clean,

    limit,

    maximum,

    intent:
      classifyIntent(
        clean
      ),

    source: [
      ...new Set(
        files.map(
          item =>
            item.source
        )
      )
    ],

    files
  };
}

export async function cleanupCosmosFiles(
  files = []
) {
  if (
    !Array.isArray(
      files
    )
  ) {
    return;
  }

  for (
    const item of files
  ) {
    const localPath =
      item?.localPath ||
      (
        typeof item?.file ===
          'string' &&
        item.file.startsWith(
          TMP_DIR
        )
          ? item.file
          : null
      );

    if (!localPath) {
      continue;
    }

    try {
      await fs.unlink(
        localPath
      );
    } catch (error) {
      if (
        error?.code !==
        'ENOENT'
      ) {
        console.warn(
          '[COSMOS] Falha limpando temporário:',
          error?.message ||
          error
        );
      }
    }
  }
}

export async function clearCosmosCache() {
  SEARCH_CACHE.clear();

  try {
    const files =
      await fs.readdir(
        TMP_DIR
      );

    await Promise.all(
      files.map(
        async filename => {
          try {
            await fs.unlink(
              path.join(
                TMP_DIR,
                filename
              )
            );
          } catch {
            // Arquivo já removido.
          }
        }
      )
    );
  } catch (error) {
    if (
      error?.code !==
      'ENOENT'
    ) {
      console.warn(
        '[COSMOS] Falha limpando cache:',
        error?.message ||
        error
      );
    }
  }
}
