import fs from 'node:fs';
import path from 'node:path';

import { sendBrowserHtml } from './kyaraBrowser.js';

const ROOT = process.cwd();

const HTML_FILE = path.join(
  ROOT,
  'dados',
  'api',
  'kyara-youtube.html'
);

const PUBLIC_URL_FILE = path.join(
  ROOT,
  'dados',
  '.kyara-browser-public-url'
);

const LOCAL_API = 'http://127.0.0.1:3000';

function getPublicUrl() {
  const env =
    String(
      process.env.KYARA_BROWSER_PUBLIC_URL || ''
    )
      .trim()
      .replace(/\/+$/, '');

  if (/^https?:\/\//i.test(env)) {
    return env;
  }

  try {
    const fileUrl =
      fs.readFileSync(
        PUBLIC_URL_FILE,
        'utf8'
      )
        .trim()
        .replace(/\/+$/, '');

    if (/^https?:\/\//i.test(fileUrl)) {
      return fileUrl;
    }
  } catch {}

  return '';
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function videoId(value) {
  const text = String(value || '');

  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{6,})/,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return '';
}

function formatViews(value) {
  const n = Number(value || 0);

  if (!Number.isFinite(n) || n <= 0) {
    return '';
  }

  if (n >= 1000000) {
    return (
      (n / 1000000)
        .toFixed(n >= 10000000 ? 0 : 1)
        .replace('.0', '') +
      ' mi visualizações'
    );
  }

  if (n >= 1000) {
    return (
      (n / 1000)
        .toFixed(n >= 10000 ? 0 : 1)
        .replace('.0', '') +
      ' mil visualizações'
    );
  }

  return (
    n.toLocaleString('pt-BR') +
    ' visualizações'
  );
}

function normalizeVideo(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const url =
    item.url ||
    item.link ||
    '';

  const id =
    videoId(url) ||
    String(
      item.videoId ||
      item.id?.videoId ||
      ''
    );

  if (!id) {
    return null;
  }

  const finalUrl =
    url ||
    `https://www.youtube.com/watch?v=${id}`;

  const thumbnail =
    item.thumbnail?.url ||
    item.thumbnail ||
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return {
    id,
    url: finalUrl,
    thumbnail,
    title:
      item.title ||
      item.name ||
      'Vídeo do YouTube',
    channel:
      item.channelTitle ||
      item.channel ||
      item.author ||
      item.uploader ||
      'YouTube',
    views:
      formatViews(
        item.views ??
        item.viewCount ??
        item.viewsText
      ),
    duration:
      item.duration ||
      '',
    ago:
      item.ago ||
      ''
  };
}

function renderInitialCards(results) {
  const videos =
    Array.isArray(results)
      ? results
          .map(normalizeVideo)
          .filter(Boolean)
          .slice(0, 6)
      : [];

  if (!videos.length) {
    return `
      <div class="empty">
        Nenhum vídeo encontrado.
      </div>
    `;
  }

  return videos
    .map(video => `
      <article
        class="video-card"
        data-id="${esc(video.id)}"
        data-url="${esc(video.url)}"
      >
        <img
          class="thumb"
          src="${esc(video.thumbnail)}"
          alt=""
        >

        <div class="video-info">
          <div class="video-title">
            ${esc(video.title)}
          </div>

          <div class="video-channel">
            ${esc(video.channel)}
          </div>

          <div class="video-meta">
            ${
              esc(
                [
                  video.views,
                  video.ago,
                  video.duration
                ]
                  .filter(Boolean)
                  .join(' • ')
              )
            }
          </div>
        </div>
      </article>
    `)
    .join('');
}

async function searchInitial(query) {
  const url =
    LOCAL_API +
    '/api/browser/search?query=' +
    encodeURIComponent(query) +
    '&siteUrl=' +
    encodeURIComponent(
      'https://www.youtube.com'
    );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      12000
    );

  try {
    const response =
      await fetch(
        url,
        {
          signal:
            controller.signal
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    return Array.isArray(data?.results)
      ? data.results
      : [];

  } catch (error) {
    console.log(
      '[KYARA YOUTUBE] busca:',
      error.message
    );

    return [];

  } finally {
    clearTimeout(timeout);
  }
}

export async function handleKyaraYouTubeCommand(
  options = {}
) {
  const command =
    String(
      options.command ||
      options.cmd ||
      ''
    )
      .trim()
      .toLowerCase()
      .replace(/^[/#]/, '');

  if (command !== 'youtube') {
    return false;
  }

  const query =
    String(
      options.q ||
      options.query ||
      options.args ||
      options.text ||
      ''
    ).trim() || 'Minecraft';

  console.log(
    '[KYARA YOUTUBE] buscando:',
    query
  );

  let html;

  try {
    html =
      fs.readFileSync(
        HTML_FILE,
        'utf8'
      );
  } catch (error) {
    console.error(
      '[KYARA YOUTUBE] HTML:',
      error.message
    );

    return true;
  }

  const publicUrl =
    getPublicUrl();

  const apiBase =
    publicUrl ||
    LOCAL_API;

  const results =
    await searchInitial(query);

  console.log(
    '[KYARA YOUTUBE] resultados reais:',
    results.length
  );

  const initialCards =
    renderInitialCards(results);

  const initialData =
    results
      .map(normalizeVideo)
      .filter(Boolean)
      .slice(0, 6);

  html =
    html
      .split('__KYARA_API_BASE__')
      .join(
        JSON.stringify(apiBase)
      )
      .split('__KYARA_INITIAL_QUERY__')
      .join(
        JSON.stringify(query)
      )
      .split('__KYARA_INITIAL_RESULTS__')
      .join(
        initialCards
      )
      .split('__KYARA_INITIAL_DATA__')
      .join(
        JSON.stringify(initialData)
      );

  console.log(
    '[KYARA YOUTUBE] HTML final:',
    Buffer.byteLength(
      html,
      'utf8'
    ),
    'bytes'
  );

  try {
    await sendBrowserHtml(
      options,
      html
    );

    console.log(
      '[KYARA YOUTUBE] mini-app enviada'
    );

  } catch (error) {
    console.error(
      '[KYARA YOUTUBE] envio:',
      error?.message ||
      error
    );
  }

  return true;
}
