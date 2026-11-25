/*
 * KYARA NATIVE MEDIA ALBUM
 * Baileys 7.x
 */

const MAX_ALBUM_ITEMS = 10;

function normalizarTipo(tipo) {
  const v = String(tipo || '').trim().toLowerCase();

  if (['image', 'imagem', 'photo', 'foto'].includes(v)) {
    return 'image';
  }

  if (['video', 'videoclip', 'mp4'].includes(v)) {
    return 'video';
  }

  return '';
}

function normalizarItem(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const type = normalizarTipo(
    item.type ||
    item.tipo ||
    item.mediaType ||
    item.media_type
  );

  const source =
    item.source ??
    item.data ??
    item.url ??
    item.media ??
    null;

  if (!type || !source) {
    return null;
  }

  return {
    ...item,
    type,
    source
  };
}

export async function sendKyaraMediaAlbum(
  sock,
  jid,
  rawItems,
  options = {}
) {
  const items = (
    Array.isArray(rawItems)
      ? rawItems
      : []
  )
    .map(normalizarItem)
    .filter(Boolean)
    .slice(0, MAX_ALBUM_ITEMS);

  if (!items.length) {
    throw new Error('Nenhuma mídia válida para o álbum.');
  }

  const expectedImageCount = items.filter(
    item => item.type === 'image'
  ).length;

  const expectedVideoCount = items.filter(
    item => item.type === 'video'
  ).length;

  const parent = await sock.sendMessage(
    jid,
    {
      album: {
        expectedImageCount,
        expectedVideoCount
      }
    },
    options.parentOptions || {}
  );

  const parentKey = parent?.key;

  if (!parentKey) {
    throw new Error(
      'O WhatsApp não retornou a chave do álbum.'
    );
  }

  const enviados = [];
  const falhas = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];

    try {
      const mediaSource =
        typeof item.source === 'string'
          ? { url: item.source }
          : item.source;

      const payload =
        item.type === 'video'
          ? {
              video: mediaSource,
              mimetype: item.mimetype || 'video/mp4'
            }
          : {
              image: mediaSource,
              mimetype: item.mimetype || 'image/jpeg'
            };

      if (item.caption) {
        payload.caption = String(item.caption).slice(0, 1024);
      }

      await sock.sendMessage(
        jid,
        {
          ...payload,
          albumParentKey: parentKey
        },
        options.childOptions || {}
      );

      enviados.push(index + 1);
    } catch (error) {
      const erroDetalhado =
        error?.stack ||
        error?.message ||
        String(error);

      console.error(
        `[KYARA MEDIA ALBUM] ❌ Falha ${index + 1}/${items.length}:`,
        erroDetalhado
      );

      falhas.push({
        index: index + 1,
        error:
          error?.message ||
          String(error)
      });
    }
  }

  if (!enviados.length) {
    throw new Error('Nenhuma mídia do álbum foi enviada.');
  }

  return {
    ok: true,
    parentKey,
    total: items.length,
    enviados: enviados.length,
    falhas
  };
}

export default {
  sendKyaraMediaAlbum
};
