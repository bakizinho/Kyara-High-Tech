import https from 'https';

const cache = new Map();

const CACHE_TTL = 30 * 60 * 1000;
const REQUEST_TIMEOUT = 15000;


/*
 * ============================================================
 * CACHE
 * ============================================================
 */

function getCached(key) {

  const item = cache.get(key);

  if (!item) {
    return null;
  }

  if (Date.now() - item.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return item.val;
}


function setCache(key, val) {

  if (cache.size >= 500) {

    const first =
      cache.keys().next().value;

    cache.delete(first);
  }

  cache.set(key, {
    val,
    ts: Date.now()
  });
}


/*
 * ============================================================
 * HTTP
 * ============================================================
 */

function request(url, options = {}, redirects = 0) {

  return new Promise((resolve, reject) => {

    if (redirects > 5) {
      reject(
        new Error('Muitos redirecionamentos')
      );
      return;
    }

    let parsed;

    try {
      parsed = new URL(url);
    } catch {
      reject(
        new Error('URL inválida')
      );
      return;
    }

    const req = https.get(
      parsed,
      {
        headers: {
          'User-Agent':
            options.userAgent ||
            'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',

          'Accept':
            options.accept ||
            'text/html,application/xhtml+xml,application/json,*/*',

          'Accept-Language':
            'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      },
      res => {

        const status =
          Number(res.statusCode || 0);

        /*
         * REDIRECT
         */

        if (
          status >= 300 &&
          status < 400 &&
          res.headers.location
        ) {

          const next =
            new URL(
              res.headers.location,
              parsed
            ).toString();

          res.resume();

          request(
            next,
            options,
            redirects + 1
          )
            .then(resolve)
            .catch(reject);

          return;
        }

        let body = '';

        res.setEncoding('utf8');

        res.on(
          'data',
          chunk => {
            body += chunk;
          }
        );

        res.on(
          'end',
          () => {

            if (
              status < 200 ||
              status >= 300
            ) {

              reject(
                new Error(
                  `HTTP ${status}`
                )
              );

              return;
            }

            resolve({
              status,
              body,
              headers: res.headers,
              url: parsed.toString()
            });
          }
        );
      }
    );

    req.on(
      'error',
      reject
    );

    req.setTimeout(
      REQUEST_TIMEOUT,
      () => {

        req.destroy(
          new Error(
            'Timeout'
          )
        );

      }
    );

  });
}


/*
 * ============================================================
 * HTML
 * ============================================================
 */

function decodeHtml(value) {

  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}


function cleanUrl(value) {

  return decodeHtml(
    String(value || '')
      .replace(/\\u002F/g, '/')
      .replace(/\\\//g, '/')
      .replace(/&amp;/g, '&')
      .trim()
  );
}


function isImageUrl(url) {

  const value =
    String(url || '').toLowerCase();

  return (
    value.includes('pinimg.com') ||
    /\.(jpg|jpeg|png|webp)(\?|$)/i.test(value)
  );
}


function extractMetaImages(html) {

  const urls = [];

  /*
   * og:image
   */

  const ogRegex =
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;

  let match;

  while (
    (match = ogRegex.exec(html))
  ) {

    const url =
      cleanUrl(match[1]);

    if (isImageUrl(url)) {
      urls.push(url);
    }
  }


  /*
   * content antes do property/name
   */

  const reverseRegex =
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/gi;

  while (
    (match = reverseRegex.exec(html))
  ) {

    const url =
      cleanUrl(match[1]);

    if (isImageUrl(url)) {
      urls.push(url);
    }
  }


  /*
   * URLs pinimg espalhadas no HTML
   */

  const pinimgRegex =
    /https?:\\?\/\\?\/[^"'\\\s<>]+pinimg\.com[^"'\\\s<>]*/gi;

  while (
    (match = pinimgRegex.exec(html))
  ) {

    let url =
      cleanUrl(match[0]);

    url =
      url.replace(/\\u0026/g, '&');

    if (isImageUrl(url)) {
      urls.push(url);
    }
  }


  return [
    ...new Set(
      urls
    )
  ];
}


/*
 * ============================================================
 * PINTEREST URL
 * ============================================================
 */

function isPinterestUrl(value) {

  try {

    const u =
      new URL(value);

    const host =
      u.hostname
        .toLowerCase();

    return (
      host === 'pin.it' ||
      host === 'pinterest.com' ||
      host === 'www.pinterest.com' ||
      host.endsWith('.pinterest.com')
    );

  } catch {

    return false;
  }
}


/*
 * ============================================================
 * RESOLVER PINTEREST
 * ============================================================
 */

async function resolvePinterest(url) {

  console.log(
    `[PINTEREST] Abrindo: ${url}`
  );

  const page =
    await request(
      url,
      {
        accept:
          'text/html,application/xhtml+xml,*/*'
      }
    );

  const images =
    extractMetaImages(
      page.body
    );

  if (!images.length) {

    throw new Error(
      'Imagem não encontrada na página'
    );
  }

  return {
    finalUrl:
      page.url,

    image:
      images[0],

    images
  };
}


/*
 * ============================================================
 * PESQUISA WEB
 *
 * NÃO usa VEX.
 * NÃO usa yt-dlp.
 * NÃO usa API local.
 * ============================================================
 */

async function searchDuckDuckGo(query) {

  const url =
    'https://html.duckduckgo.com/html/?q=' +
    encodeURIComponent(
      `site:pinterest.com/pin/ ${query}`
    );

  console.log(
    `[PINTEREST] Pesquisa DDG: ${query}`
  );

  const response =
    await request(
      url
    );

  const links = [];

  /*
   * Links dos resultados
   */

  const regex =
    /href=["']([^"']+)["']/gi;

  let match;

  while (
    (match = regex.exec(response.body))
  ) {

    let href =
      decodeHtml(
        match[1]
      );

    /*
     * DDG pode devolver links
     * de redirecionamento.
     */

    try {

      if (
        href.startsWith('//')
      ) {
        href =
          'https:' + href;
      }

      const parsed =
        new URL(
          href,
          'https://html.duckduckgo.com'
        );

      if (
        parsed.hostname
          .includes('duckduckgo.com') &&
        parsed.searchParams.has('uddg')
      ) {

        href =
          parsed.searchParams.get(
            'uddg'
          );
      }

    } catch {}

    try {

      const parsed =
        new URL(href);

      const host =
        parsed.hostname
          .toLowerCase();

      if (
        host === 'pinterest.com' ||
        host === 'www.pinterest.com' ||
        host.endsWith('.pinterest.com')
      ) {

        if (
          /\/pin\//i.test(
            parsed.pathname
          )
        ) {

          links.push(
            parsed.toString()
          );
        }
      }

    } catch {}

  }

  return [
    ...new Set(
      links
    )
  ];
}


/*
 * ============================================================
 * PESQUISA BING — FALLBACK
 * ============================================================
 */

async function searchBing(query) {

  const url =
    'https://www.bing.com/search?q=' +
    encodeURIComponent(
      `site:pinterest.com/pin/ ${query}`
    );

  console.log(
    `[PINTEREST] Pesquisa Bing: ${query}`
  );

  const response =
    await request(
      url
    );

  const links = [];

  const regex =
    /href=["'](https?:\/\/[^"']+)["']/gi;

  let match;

  while (
    (match = regex.exec(response.body))
  ) {

    let href =
      cleanUrl(
        match[1]
      );

    try {

      const parsed =
        new URL(href);

      const host =
        parsed.hostname
          .toLowerCase();

      if (
        (
          host === 'pinterest.com' ||
          host === 'www.pinterest.com' ||
          host.endsWith('.pinterest.com')
        ) &&
        /\/pin\//i.test(
          parsed.pathname
        )
      ) {

        links.push(
          parsed.toString()
        );
      }

    } catch {}

  }

  return [
    ...new Set(
      links
    )
  ];
}


/*
 * ============================================================
 * SEARCH
 * ============================================================
 */

async function search(query) {

  query =
    String(query || '')
      .trim()
      .replace(/\s+/g, ' ');

  if (!query) {

    return {
      ok: false,
      msg:
        'Digite o que deseja pesquisar.'
    };
  }


  const cacheKey =
    `search:${query.toLowerCase()}`;

  const cached =
    getCached(
      cacheKey
    );

  if (cached) {

    console.log(
      '[PINTEREST] Resultado em cache'
    );

    return {
      ok: true,
      ...cached,
      cached: true
    };
  }


  console.log(
    `[PINTEREST] Pesquisando: ${query}`
  );


  let links = [];


  /*
   * PRIMEIRA FONTE
   */

  try {

    links =
      await searchDuckDuckGo(
        query
      );

  } catch (error) {

    console.error(
      '[PINTEREST] DDG:',
      error?.message ||
      error
    );

  }


  /*
   * SEGUNDA FONTE
   */

  if (!links.length) {

    try {

      links =
        await searchBing(
          query
        );

    } catch (error) {

      console.error(
        '[PINTEREST] Bing:',
        error?.message ||
        error
      );

    }

  }


  console.log(
    `[PINTEREST] Pins encontrados: ${links.length}`
  );


  if (!links.length) {

    return {
      ok: false,

      msg:
        '❌ Nenhum Pin do Pinterest foi encontrado.'
    };
  }


  /*
   * Tenta abrir vários pins.
   */

  const images = [];


  for (
    const pin of links.slice(0, 8)
  ) {

    try {

      const result =
        await resolvePinterest(
          pin
        );

      if (
        result?.image
      ) {

        images.push({
          pin,
          image:
            result.image
        });

      }

    } catch (error) {

      console.log(
        `[PINTEREST] Pin ignorado: ${error?.message || error}`
      );

    }

  }


  if (!images.length) {

    return {
      ok: false,

      msg:
        '❌ Os Pins foram encontrados, mas não foi possível obter as imagens.'
    };
  }


  const result = {

    criador:
      'Kyara',

    type:
      'image',

    mime:
      'image/jpeg',

    query,

    count:
      images.length,

    urls:
      images.map(
        item => item.image
      ),

    pins:
      images.map(
        item => item.pin
      )

  };


  setCache(
    cacheKey,
    result
  );


  console.log(
    `[PINTEREST] Imagens obtidas: ${result.count}`
  );


  return {
    ok: true,
    ...result
  };
}


/*
 * ============================================================
 * DOWNLOAD / URL
 * ============================================================
 */

async function dl(url) {

  url =
    String(url || '')
      .trim();

  if (!url) {

    return {
      ok: false,
      msg:
        'URL inválida.'
    };
  }


  if (
    !isPinterestUrl(url)
  ) {

    return {
      ok: false,

      msg:
        '❌ Essa URL não pertence ao Pinterest.'
    };
  }


  const cacheKey =
    `download:${url}`;


  const cached =
    getCached(
      cacheKey
    );

  if (cached) {

    return {
      ok: true,
      ...cached,
      cached: true
    };
  }


  try {

    const result =
      await resolvePinterest(
        url
      );


    const data = {

      criador:
        'Kyara',

      type:
        'image',

      mime:
        'image/jpeg',

      url:
        result.image,

      urls:
        result.images,

      sourceUrl:
        result.finalUrl

    };


    setCache(
      cacheKey,
      data
    );


    return {
      ok: true,
      ...data
    };

  } catch (error) {

    console.error(
      '[PINTEREST] URL:',
      error?.message ||
      error
    );

    return {

      ok: false,

      msg:
        '❌ Não foi possível obter a imagem desse Pin.'
    };

  }

}


export {
  search,
  dl
};
