import https from 'https';
import fs from 'fs';
import verificarAPI from '../API.js';

const CONFIG_FILE = JSON.parse(
  fs.readFileSync(new URL('../../config.json', import.meta.url), 'utf8')
);

const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

function getCached(key) {
  const item = cache.get(key);

  if (!item) return null;

  if (Date.now() - item.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return item.val;
}

function setCache(key, val) {
  if (cache.size >= 1000) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  cache.set(key, {
    val,
    ts: Date.now()
  });
}



async function removeBg(url) {

  const checkAPI = await verificarAPI();

  if (checkAPI !== true) {
    return {
      ok: false,
      msg: checkAPI
    };
  }

  try {

    if (!url || typeof url !== 'string') {
      return {
        ok: false,
        msg: 'URL da imagem é obrigatória'
      };
    }

    const cached = getCached(`removebg:${url}`);

    if (cached) {
      return {
        ok: true,
        ...cached,
        cached: true
      };
    }

    const { apikey_vex, site_vex } = CONFIG_FILE;

    const download =
      `${site_vex}/api/ferramentas/removebg?apikey=${apikey_vex}&query=${encodeURIComponent(url)}`;

    console.log('[RemoveBG] URL:', download);

    const response = await fetch(download);

    console.log('[RemoveBG] Status:', response.status);
    console.log('[RemoveBG] Headers:', Object.fromEntries(response.headers.entries()));

    const buffer = await response.arrayBuffer();

    console.log('[RemoveBG] Tamanho:', buffer.byteLength);

    if (!buffer || buffer.byteLength < 1000) {

      const text = Buffer.from(buffer).toString();

      console.log('[RemoveBG] Resposta:', text);

      return {
        ok: false,
        msg: 'A API não retornou uma imagem válida.'
      };

    }

    const result = {
      status: true,
      criador: 'Tokyo',
      type: 'image',
      mime: 'image/png',
      download
    };

    setCache(`removebg:${url}`, result);

    return {
      ok: true,
      ...result
    };

  } catch (error) {

    console.log('[RemoveBG] Erro:', error);

    return {
      ok: false,
      msg: error.message || 'Erro ao remover fundo da imagem'
    };

  }

}




async function upscale(url, scale = 2) {

  const checkAPI = await verificarAPI();

  if (checkAPI !== true) {
    throw new Error(checkAPI);
  }

  try {

    if (!url || typeof url !== 'string') {
      return {
        ok: false,
        msg: 'URL da imagem é obrigatória'
      };
    }

    const cached = getCached(`upscale:${url}:${scale}`);

    if (cached) {
      return {
        ok: true,
        ...cached,
        cached: true
      };
    }

    const { apikey_vex, site_vex } = CONFIG_FILE;

    const download =
      `${site_vex}/api/ferramentas/upscale?apikey=${apikey_vex}&query=${encodeURIComponent(url)}&scale=${scale}`;

    const result = {
      status: true,
      criador: 'Tokyo',
      type: 'image',
      mime: 'image/png',
      scale,
      download
    };

    setCache(`upscale:${url}:${scale}`, result);

    return {
      ok: true,
      ...result
    };

  } catch (error) {

    throw new Error(
      error.message || 'Erro ao melhorar imagem'
    );

  }

}

export default {
  removeBg,
  upscale
};

export {
  removeBg,
  upscale
};