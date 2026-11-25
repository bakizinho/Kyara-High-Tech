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
    Array.isArray(rawItems) ? rawItems : []
  )
    .map(normalizarItem)
    .filter(Boolean)
    .slice(0, MAX_ALBUM_ITEMS);

  if (!items.length) {
    throw new Error("Nenhuma mídia válida para o álbum.");
  }

  if (!sock || typeof sock.sendMessage !== "function" || !jid) {
    throw new Error("Socket ou destino inválido para enviar o álbum.");
  }

  const makePayload = item => {
    const source =
      typeof item.source === "string"
        ? { url: item.source }
        : item.source;

    const payload =
      item.type === "video"
        ? {
            video: source,
            mimetype: item.mimetype || "video/mp4"
          }
        : {
            image: source,
            mimetype: item.mimetype || "image/jpeg"
          };

    if (item.caption) {
      payload.caption = String(item.caption).slice(0, 1024);
    }

    return payload;
  };

  // Uma única mídia é enviada como imagem/vídeo normal.
  if (items.length === 1) {
    const result = await sock.sendMessage(
      jid,
      makePayload(items[0]),
      options.childOptions || options.parentOptions || {}
    );

    return {
      ok: true,
      parentKey: result?.key || null,
      total: 1,
      enviados: 1,
      falhas: []
    };
  }

  // Nesta versão do Baileys, album deve ser um array de mídias.
  const albumPayload = items.map(makePayload);

  const result = await sock.sendMessage(
    jid,
    { album: albumPayload },
    options.parentOptions || {}
  );

  console.log(
    `[KYARA MEDIA ALBUM] ✅ Álbum enviado: ${albumPayload.length} mídia(s)`
  );

  return {
    ok: true,
    parentKey: result?.key || null,
    total: albumPayload.length,
    enviados: albumPayload.length,
    falhas: []
  };
}


export default {
  sendKyaraMediaAlbum
};
