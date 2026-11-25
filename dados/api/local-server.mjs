import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const HOST = '127.0.0.1';
const PORT = 3000;
const execFileAsync = promisify(execFile);

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:3210',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function xmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&apos;'
  })[c]);
}

function wrapText(value, max = 17) {
  const words = String(value || 'kyara')
    .replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';

  for (const word of words) {
    if (!word) continue;
    const next = line ? `${line} ${word}` : word;

    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }

    if (lines.length >= 5) break;
  }

  if (line && lines.length < 6) lines.push(line);
  return lines.length ? lines : ['kyara'];
}

function bratSvg(text) {
  const lines = wrapText(text, 17);
  const size = lines.length > 4 ? 45 : lines.some(x => x.length > 13) ? 43 : 54;
  const startY = 256 - ((lines.length - 1) * size * 0.52);

  const labels = lines.map((line, i) =>
    `<text x="256" y="${Math.round(startY + i * size * 1.03)}"
      text-anchor="middle" dominant-baseline="middle"
      font-family="Arial Black,Impact,sans-serif"
      font-size="${size}" font-weight="900"
      fill="#111111">${xmlEscape(line.toLowerCase())}</text>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"
    viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#8ace00"/>
    ${labels}
  </svg>`;
}

function welcomeSvg(name, group) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500"
    viewBox="0 0 900 500">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#090914"/>
        <stop offset="1" stop-color="#32204c"/>
      </linearGradient>
    </defs>
    <rect width="900" height="500" rx="28" fill="url(#bg)"/>
    <circle cx="760" cy="90" r="150" fill="#9b5cff" opacity=".13"/>
    <circle cx="100" cy="460" r="180" fill="#42d9ff" opacity=".10"/>
    <text x="54" y="95" fill="#bd9cff" font-size="22"
      font-family="Arial,sans-serif" letter-spacing="5">KYARA OS</text>
    <text x="54" y="235" fill="#ffffff" font-size="54"
      font-weight="bold" font-family="Arial,sans-serif">BEM-VINDO(A)</text>
    <text x="54" y="305" fill="#c7b5ff" font-size="34"
      font-family="Arial,sans-serif">${xmlEscape(name).slice(0, 80)}</text>
    <text x="54" y="380" fill="#cbd0e4" font-size="22"
      font-family="Arial,sans-serif">${xmlEscape(group).slice(0, 90)}</text>
    <path d="M54 420 H846" stroke="#a78bfa" stroke-opacity=".5"/>
    <text x="54" y="462" fill="#9ba4c5" font-size="16"
      font-family="Arial,sans-serif">SISTEMA LOCAL • CANVAS</text>
  </svg>`;
}

async function svgToPng(svg) {
  const input = Buffer.from(svg, 'utf8');

  try {
    const mod = await import('sharp');
    const sharp = mod.default || mod;
    return await sharp(input).png().toBuffer();
  } catch (sharpError) {
    try {
      const mod = await import('@napi-rs/canvas');
      const canvas = mod.createCanvas(512, 512);
      const image = await mod.loadImage(input);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, 512, 512);
      return canvas.toBuffer('image/png');
    } catch {
      try {
        const mod = await import('canvas');
        const canvas = mod.createCanvas(512, 512);
        const image = await mod.loadImage(input);
        canvas.getContext('2d').drawImage(image, 0, 0, 512, 512);
        return canvas.toBuffer('image/png');
      } catch {
        throw new Error(
          'Nenhum renderizador disponível. Verifique sharp ou canvas no node_modules.'
        );
      }
    }
  }
}

function sendImage(res, data, type) {
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:3210'
  });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:3210',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (req.method !== 'GET') {
    return json(res, 405, { ok: false, error: 'Use GET.' });
  }

  let url;
  try {
    url = new URL(req.url, `http://${HOST}:${PORT}`);
  } catch {
    return json(res, 400, { ok: false, error: 'URL inválida.' });
  }

  if (url.pathname === '/' || url.pathname === '/api/health') {
    return json(res, 200, {
      ok: true,
      service: 'KYARA LOCAL API',
      port: PORT,
      host: HOST,
      canvas: true,
      time: new Date().toISOString()
    });
  }

  try {
    if (url.pathname === '/api/canvas/brat') {
      const text = url.searchParams.get('text')
        || url.searchParams.get('texto')
        || url.searchParams.get('message')
        || url.searchParams.get('msg')
        || url.searchParams.get('frase')
        || 'kyara';

      const png = await svgToPng(bratSvg(text));
      return sendImage(res, png, 'image/png');
    }

    if (url.pathname === '/api/canvas/welcome2') {
      const name = url.searchParams.get('nome')
        || url.searchParams.get('name')
        || url.searchParams.get('username')
        || url.searchParams.get('usuario')
        || 'Novo membro';

      const group = url.searchParams.get('grupo')
        || url.searchParams.get('group')
        || 'Que bom ter você aqui!';

      const png = await svgToPng(welcomeSvg(name, group));
      return sendImage(res, png, 'image/png');
    }

    if (url.pathname === '/api/canvas/bratvideo') {
      const text = url.searchParams.get('text')
        || url.searchParams.get('texto')
        || url.searchParams.get('message')
        || url.searchParams.get('msg')
        || 'kyara';

      const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'kyara-canvas-'));
      const input = path.join(temp, 'frame.png');
      const output = path.join(temp, 'brat.mp4');

      try {
        const png = await svgToPng(bratSvg(text));
        await fs.writeFile(input, png);

        await execFileAsync('ffmpeg', [
          '-hide_banner', '-loglevel', 'error', '-y',
          '-loop', '1', '-framerate', '15', '-i', input,
          '-t', '3', '-vf', 'format=yuv420p',
          '-c:v', 'libx264', '-movflags', '+faststart',
          output
        ], { timeout: 30000, maxBuffer: 1024 * 1024 });

        const video = await fs.readFile(output);
        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Content-Length': video.length,
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': 'http://127.0.0.1:3210'
        });
        return res.end(video);
      } catch (error) {
        console.error('[Canvas vídeo]', error.message);
        return json(res, 503, {
          ok: false,
          error: 'Vídeo indisponível. Verifique se o ffmpeg está instalado.'
        });
      } finally {
        await fs.rm(temp, { recursive: true, force: true }).catch(() => {});
      }
    }

    return json(res, 404, {
      ok: false,
      error: 'Rota não encontrada.',
      path: url.pathname
    });
  } catch (error) {
    console.error('[KYARA API]', error.stack || error.message);
    return json(res, 500, { ok: false, error: error.message });
  }
});

server.on('error', error => {
  console.error('[KYARA API] Falha ao abrir a porta:', error.message);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`[KYARA API] http://${HOST}:${PORT}`);
  console.log('[KYARA API] Canvas: brat, bratvideo, welcome2');
});
