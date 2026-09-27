import https from "node:https";

const cache =
  new Map();

const CACHE_TTL =
  30 * 60 * 1000;

const REQUEST_TIMEOUT =
  15000;


function getCached(key) {
  const item =
    cache.get(key);

  if (!item) {
    return null;
  }

  if (
    Date.now() - item.ts >
    CACHE_TTL
  ) {
    cache.delete(key);
    return null;
  }

  return item.value;
}


function setCache(
  key,
  value
) {
  if (cache.size >= 500) {
    const first =
      cache.keys()
        .next()
        .value;

    if (first) {
      cache.delete(first);
    }
  }

  cache.set(
    key,
    {
      ts: Date.now(),
      value
    }
  );
}


function request(
  url,
  options = {},
  redirects = 0
) {
  return new Promise(
    (resolve, reject) => {

      if (redirects > 6) {
        reject(
          new Error(
            "Muitos redirecionamentos."
          )
        );
        return;
      }

      let parsed;

      try {
        parsed =
          new URL(url);
      } catch {
        reject(
          new Error(
            "URL inválida."
          )
        );
        return;
      }

      const req =
        https.get(
          parsed,
          {
            headers: {
              "User-Agent":
                options.userAgent ||
                "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36",

              "Accept":
                options.accept ||
                "text/html,application/xhtml+xml,application/json,*/*",

              "Accept-Language":
                "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
            }
          },
          res => {

            const status =
              Number(
                res.statusCode || 0
              );

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

            const chunks = [];

            res.on(
              "data",
              chunk => {
                chunks.push(
                  Buffer.from(chunk)
                );
              }
            );

            res.on(
              "end",
              () => {

                const body =
                  Buffer
                    .concat(chunks)
                    .toString("utf8");

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
                  headers:
                    res.headers,

                  url:
                    parsed.toString()
                });
              }
            );
          }
        );

      req.on(
        "error",
        reject
      );

      req.setTimeout(
        REQUEST_TIMEOUT,
        () => {
          req.destroy(
            new Error(
              "Timeout."
            )
          );
        }
      );
    }
  );
}


function decodeHtml(value) {
  return String(
    value || ""
  )
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/gi, "/");
}


function normalizeEscapes(value) {
  return decodeHtml(
    String(value || "")
      .replace(/\\u002F/gi, "/")
      .replace(/\\u002f/gi, "/")
      .replace(/\\\//g, "/")
      .replace(/\\u003A/gi, ":")
      .replace(/\\u003a/gi, ":")
      .replace(/\\u0026/gi, "&")
      .trim()
  );
}


function cleanUrl(value) {
  return normalizeEscapes(
    String(value || "")
      .replace(
        /^["'`]+/,
        ""
      )
      .replace(
        /["'`,;)\]}]+$/g,
        ""
      )
  );
}


function isPinimgImage(
  value
) {
  try {

    const u =
      new URL(
        cleanUrl(value)
      );

    if (
      u.hostname
        .toLowerCase() !==
      "i.pinimg.com"
    ) {
      return false;
    }

    const path =
      u.pathname.toLowerCase();

    return (
      /\.(jpg|jpeg|png|webp|gif)$/i
        .test(path) ||
      /\/(?:originals|736x|564x|474x|400x|291x|236x|170x)\//i
        .test(path)
    );

  } catch {
    return false;
  }
}



/*
 * Converte URLs pequenas do Pinterest para candidatos
 * de resolução maior.
 *
 * A existência real da URL é verificada pelo downloader
 * do feature, portanto não assumimos que "originals"
 * sempre exista.
 */
function promotePinimgUrl(value) {
  const raw = cleanUrl(value);

  if(!raw){
    return null;
  }

  try {
    const u = new URL(raw);

    if(
      u.hostname.toLowerCase() !==
      "i.pinimg.com"
    ){
      return raw;
    }

    u.pathname =
      u.pathname.replace(
        /\/(?:170x|236x|291x|400x|474x|564x|736x|originals)\//i,
        "/originals/"
      );

    return u.toString();

  } catch {
    return raw;
  }
}

function normalizeImage(
  value
) {
  const image =
    cleanUrl(value);

  if(
    !isPinimgImage(image)
  ){
    return null;
  }

  return promotePinimgUrl(
    image
  );
}


function imageKey(value) {
  try {

    const u =
      new URL(value);

    return (
      u.hostname
        .toLowerCase() +
      u.pathname
        .replace(
          /\/(?:originals|736x|564x|474x|400x|291x|236x|170x)\//i,
          "/SIZE/"
        )
    );

  } catch {
    return String(value);
  }
}


function dedupeImages(
  values
) {
  const map =
    new Map();

  for (
    const value
    of values
  ) {
    const image =
      normalizeImage(value);

    if (!image) {
      continue;
    }

    const key =
      imageKey(image);

    if (
      !map.has(key)
    ) {
      map.set(
        key,
        image
      );
    }
  }

  return [
    ...map.values()
  ];
}


function extractPinimg(
  html
) {
  const values = [];

  const patterns = [

    /https?:\/\/i\.pinimg\.com\/[^"'<>\\\s]+/gi,

    /https?:\\\/\\\/i\.pinimg\.com\\\/[^"'<>\\\s]+/gi,

    /["'](https?:\/\/i\.pinimg\.com\/[^"']+)["']/gi

  ];

  for (
    const regex
    of patterns
  ) {

    let match;

    while (
      (match =
        regex.exec(
          html
        ))
    ) {

      const image =
        normalizeImage(
          match[1] ||
          match[0]
        );

      if (image) {
        values.push(image);
      }
    }
  }

  return dedupeImages(
    values
  );
}


function extractPins(
  html
) {
  const links = [];

  const regex =
    /href=["']([^"']+)["']/gi;

  let match;

  while (
    (match =
      regex.exec(
        html
      ))
  ) {

    let href =
      decodeHtml(
        match[1]
      );

    href =
      normalizeEscapes(
        href
      );

    try {

      if (
        href.startsWith("//")
      ) {
        href =
          "https:" +
          href;
      }

      const parsed =
        new URL(
          href,
          "https://www.bing.com"
        );

      if (
        parsed.hostname
          .toLowerCase()
          .includes(
            "bing.com"
          )
      ) {
        const redirected =
          parsed.searchParams.get(
            "u"
          );

        if (redirected) {
          href =
            redirected;
        }
      }

    } catch {}

    try {

      const parsed =
        new URL(href);

      const host =
        parsed.hostname
          .toLowerCase();

      if (
        (
          host ===
            "pinterest.com" ||
          host ===
            "www.pinterest.com" ||
          host.endsWith(
            ".pinterest.com"
          )
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


async function resolvePinterest(
  url
) {
  console.log(
    "[PINTEREST] Abrindo:",
    url
  );

  const response =
    await request(
      url,
      {
        accept:
          "text/html,application/xhtml+xml,*/*"
      }
    );

  const images =
    extractPinimg(
      response.body
    );

  if (!images.length) {
    throw new Error(
      "Imagem não encontrada na página."
    );
  }

  return {
    finalUrl:
      response.url,

    image:
      images[0],

    images
  };
}


async function searchBingImages(
  query
) {
  const url =
    "https://www.bing.com/images/search?q=" +
    encodeURIComponent(
      `site:pinterest.com ${query}`
    ) +
    "&form=HDRSC2";

  console.log(
    "[PINTEREST] Bing Images:",
    query
  );

  const response =
    await request(
      url,
      {
        accept:
          "text/html,application/xhtml+xml,*/*"
      }
    );

  const body =
    normalizeEscapes(
      response.body
    );

  const images = [];

  /*
   * Bing Images costuma transportar
   * o endereço original em "murl".
   */
  const murl =
    /"(?:murl|mediaurl|imgurl)"\s*:\s*"([^"]+)"/gi;

  let match;

  while (
    (match =
      murl.exec(
        body
      ))
  ) {

    const image =
      normalizeImage(
        match[1]
      );

    if (image) {
      images.push(image);
    }
  }

  /*
   * Fallback: procurar pinimg cru
   * no HTML inteiro.
   */
  images.push(
    ...extractPinimg(
      body
    )
  );

  return dedupeImages(
    images
  );
}


async function searchPinterestPage(
  query
) {
  const url =
    "https://www.pinterest.com/search/pins/?q=" +
    encodeURIComponent(
      query
    );

  console.log(
    "[PINTEREST] Página Pinterest:",
    query
  );

  try {

    const response =
      await request(
        url,
        {
          accept:
            "text/html,application/xhtml+xml,*/*"
        }
      );

    return extractPinimg(
      response.body
    );

  } catch (error) {

    console.log(
      "[PINTEREST] Página direta:",
      error?.message ||
      error
    );

    return [];
  }
}


async function searchBingPins(
  query
) {
  const url =
    "https://www.bing.com/search?q=" +
    encodeURIComponent(
      `site:pinterest.com/pin/ ${query}`
    );

  console.log(
    "[PINTEREST] Bing Web:",
    query
  );

  try {

    const response =
      await request(
        url
      );

    return extractPins(
      response.body
    );

  } catch (error) {

    console.log(
      "[PINTEREST] Bing Web:",
      error?.message ||
      error
    );

    return [];
  }
}


async function search(query) {
  const originalQuery = String(query || "").trim();

  if (!originalQuery) {
    return {
      ok: false,
      error: "Informe o que deseja pesquisar no Pinterest."
    };
  }

  const searchTerm =
    /óbito|obito/i.test(originalQuery)
      ? "Obito Uchiha Naruto"
      : originalQuery;

  const cacheKey = `search:v8:${originalQuery.toLowerCase()}`;
  const cached = getCached(cacheKey);

  if (cached?.ok && Array.isArray(cached.urls) && cached.urls.length) {
    return cached;
  }

  const found = [];

  const add = (image, pinUrl = "") => {
    const normalized = normalizeImage(image);
    if (!normalized) return;

    const key = imageKey(normalized);

    if (found.some(item => imageKey(item.image) === key)) {
      return;
    }

    found.push({
      image: normalized,
      pinUrl: cleanUrl(pinUrl) || ""
    });
  };

  const collect = (results) => {
    if (!Array.isArray(results)) return;

    for (const item of results) {
      if (found.length >= 8) break;

      if (typeof item === "string") {
        add(item);
        continue;
      }

      if (!item || typeof item !== "object") continue;

      add(
        item.image ||
        item.imageUrl ||
        item.thumbnail ||
        item.url ||
        item.directLink ||
        item.src ||
        item.media,
        item.pinUrl ||
        item.pin ||
        item.sourceUrl ||
        item.link
      );

      if (Array.isArray(item.images)) {
        for (const image of item.images) {
          if (found.length >= 8) break;
          add(image, item.pinUrl || item.pin || item.sourceUrl || "");
        }
      }

      if (Array.isArray(item.urls)) {
        for (const image of item.urls) {
          if (found.length >= 8) break;
          add(image, item.pinUrl || item.pin || item.sourceUrl || "");
        }
      }
    }
  };

  console.log("[PINTEREST] Pesquisa:", searchTerm);

  // 1 — Bing Images
  try {
    console.log("[PINTEREST] Bing Images:", searchTerm);
    const results = await searchBingImages(searchTerm);
    collect(results);
    console.log("[PINTEREST] Bing Images encontrou:", found.length);
  } catch (error) {
    console.log(
      "[PINTEREST] Bing Images ignorado:",
      error?.message || error
    );
  }

  // 2 — Pinterest diretamente
  if (found.length < 8) {
    try {
      console.log("[PINTEREST] Página Pinterest:", searchTerm);
      const results = await searchPinterestPage(searchTerm);
      collect(results);
      console.log("[PINTEREST] Pinterest encontrou:", found.length);
    } catch (error) {
      console.log(
        "[PINTEREST] Página Pinterest ignorada:",
        error?.message || error
      );
    }
  }

  // 3 — Bing Web / Pins
  if (found.length < 8) {
    try {
      console.log("[PINTEREST] Bing Web:", searchTerm);
      const results = await searchBingPins(searchTerm);
      collect(results);
      console.log("[PINTEREST] Bing Web encontrou:", found.length);

      // Alguns resultados vêm apenas com a URL do Pin.
      if (found.length < 8 && Array.isArray(results)) {
        for (const item of results) {
          if (found.length >= 8) break;

          const pinUrl =
            typeof item === "string"
              ? item
              : item?.pinUrl ||
                item?.pin ||
                item?.url ||
                item?.link ||
                "";

          if (!/pinterest\./i.test(String(pinUrl))) continue;

          try {
            const image = await resolvePinterest(pinUrl);
            add(image, pinUrl);
          } catch {}
        }
      }
    } catch (error) {
      console.log(
        "[PINTEREST] Bing Web ignorado:",
        error?.message || error
      );
    }
  }

  // 4 — Se alguma fonte devolveu URLs escondidas em objetos,
  // normaliza novamente antes de desistir.
  if (found.length < 8) {
    try {
      const fallback = await searchPinterestPage(
        `${searchTerm} pinterest`
      );
      collect(fallback);
    } catch {}
  }

  const result = {
    ok: found.length > 0,
    query: searchTerm,
    source: "Pinterest",
    image: found[0]?.image || null,
    imageUrl: found[0]?.image || null,
    url: found[0]?.pinUrl || null,
    directLink: found[0]?.image || null,
    urls: found.map(item => item.image),
    results: found
  };

  console.log(
    "[PINTEREST] Resultado final:",
    found.length,
    "imagem(ns)"
  );

  if (result.ok) {
    setCache(cacheKey, result);
  }

  return result;
}

async function dl(url) {

  try {

    const resolved =
      await resolvePinterest(
        url
      );

    return {
      ok: true,

      criador:
        "Kyara",

      type:
        "image",

      mime:
        "image/jpeg",

      url:
        resolved.image,

      image:
        resolved.image,

      urls:
        resolved.images,

      sourceUrl:
        resolved.finalUrl
    };

  } catch (error) {

    return {
      ok: false,

      msg:
        error?.message ||
        "Não foi possível obter o Pin."
    };
  }
}


export {
  search,
  dl
};
