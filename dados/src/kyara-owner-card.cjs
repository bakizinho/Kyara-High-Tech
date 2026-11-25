'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(__dirname, '../..');
const CONFIG = path.join(ROOT, 'dados/src/config.json');
const UPLOADS = path.join(ROOT, 'dados/api/uploads');
const OUTPUT = path.join(UPLOADS, 'kyara-owner-card.mp4');
const META = path.join(UPLOADS, 'kyara-owner-card.meta.json');

const W = 1080;
const H = 1920;
const FPS = 20;
const FRAMES = 100;
const AVATAR = 230;
const AVATAR_X = Math.round((W - AVATAR) / 2);
const AVATAR_Y = 335;
const CENTER_X = W / 2;
const CENTER_Y = AVATAR_Y + AVATAR / 2;

function xml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function signatureFor(config) {
  return crypto.createHash('sha256')
    .update(JSON.stringify({
      profile: config.kyaraOwnerProfile || {},
      number: String(config.numerodono || '')
    }))
    .digest('hex');
}

function wrapText(value, maxChars, maxLines) {
  const words = String(value || '').replace(/\r/g, '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    if (word.length > maxChars) {
      if (line) {
        lines.push(line);
        line = '';
      }

      for (let i = 0; i < word.length; i += maxChars) {
        if (lines.length >= maxLines) break;
        lines.push(word.slice(i, i + maxChars));
      }

      if (lines.length >= maxLines) break;
      continue;
    }

    const candidate = line ? line + ' ' + word : word;

    if (candidate.length <= maxChars) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;

      if (lines.length >= maxLines) break;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);

  if (lines.length >= maxLines) {
    const fullText = words.join(' ');
    if (lines.join(' ').length < fullText.length) {
      lines[lines.length - 1] =
        lines[lines.length - 1].replace(/[.…]*$/, '') + '…';
    }
  }

  return lines.length ? lines : ['Perfil do proprietário'];
}

async function loadImage(reference) {
  const value = String(reference || '').trim();
  if (!value) return null;

  if (value.startsWith('/uploads/')) {
    const name = path.basename(value);

    if (!/^kyara-\d+-[a-z0-9]+\.(png|jpe?g|webp|gif)$/i.test(name)) {
      return null;
    }

    const file = path.join(UPLOADS, name);
    return fs.existsSync(file) ? fs.readFileSync(file) : null;
  }

  if (!/^https?:\/\//i.test(value)) return null;

  const parsed = new URL(value);

  // Se a URL aponta para um upload deste projeto, usa o arquivo local.
  if (parsed.pathname.startsWith('/uploads/')) {
    return loadImage(parsed.pathname);
  }

  const response = await fetch(value, {
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error('Falha ao baixar imagem: HTTP ' + response.status);
  }

  const length = Number(response.headers.get('content-length') || 0);
  if (length > 12 * 1024 * 1024) {
    throw new Error('Imagem externa maior que 12 MB.');
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (!buffer.length || buffer.length > 12 * 1024 * 1024) {
    throw new Error('Imagem externa inválida ou muito grande.');
  }

  return buffer;
}

async function cropToFill(buffer, width, height, xPercent = 50, yPercent = 50) {
  const meta = await sharp(buffer).metadata();
  const iw = meta.width;
  const ih = meta.height;

  if (!iw || !ih) throw new Error('Não foi possível ler as dimensões da imagem.');

  const targetAspect = width / height;
  const sourceAspect = iw / ih;

  let cropWidth = iw;
  let cropHeight = ih;
  let left = 0;
  let top = 0;

  if (sourceAspect > targetAspect) {
    cropWidth = Math.max(1, Math.round(ih * targetAspect));
    left = Math.round((iw - cropWidth) * Math.min(100, Math.max(0, xPercent)) / 100);
  } else if (sourceAspect < targetAspect) {
    cropHeight = Math.max(1, Math.round(iw / targetAspect));
    top = Math.round((ih - cropHeight) * Math.min(100, Math.max(0, yPercent)) / 100);
  }

  left = Math.max(0, Math.min(left, iw - cropWidth));
  top = Math.max(0, Math.min(top, ih - cropHeight));

  return sharp(buffer)
    .extract({
      left,
      top,
      width: cropWidth,
      height: cropHeight
    })
    .resize(width, height, { fit: 'fill' })
    .png()
    .toBuffer();
}

function defaultBannerSvg() {
  return Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="740">
    <defs>
      <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#2d0c34"/>
        <stop offset=".48" stop-color="#a51c83"/>
        <stop offset="1" stop-color="#301052"/>
      </linearGradient>
      <radialGradient id="g">
        <stop stop-color="#ff68d7" stop-opacity=".7"/>
        <stop offset="1" stop-color="#ff68d7" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#b)"/>
    <circle cx="170" cy="130" r="290" fill="url(#g)"/>
    <circle cx="920" cy="190" r="360" fill="url(#g)" opacity=".65"/>
    <g fill="none" stroke="#ff9be8" stroke-opacity=".3">
      <circle cx="180" cy="170" r="90"/>
      <circle cx="180" cy="170" r="145"/>
      <circle cx="900" cy="260" r="170"/>
      <path d="M0 550 L440 0 M640 740 L1080 190"/>
    </g>
  </svg>`);
}

function staticCardSvg(profile, number) {
  const name = String(profile.name || 'Proprietário').slice(0, 80);
  const role = String(profile.role || 'Proprietário / Desenvolvedor').slice(0, 80);
  const bio = String(profile.bio || 'Perfil oficial do proprietário da KYARA.').slice(0, 500);
  const contact = String(profile.contact || '').slice(0, 100);

  const nameFont = name.length > 30 ? 43 : name.length > 20 ? 49 : 58;
  const nameLines = wrapText(name, name.length > 30 ? 28 : 23, 3);
  const roleLines = wrapText(role, 39, 2);
  const bioLines = wrapText(bio, 52, 12);

  const contactLines = [];
  if (contact) contactLines.push(...wrapText(contact, 46, 2));
  if (number) contactLines.push(...wrapText('WhatsApp: +' + number, 46, 2));
  if (!contactLines.length) contactLines.push('Contato não configurado');

  const parts = [];

  parts.push(`
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#120714" stop-opacity=".22"/>
        <stop offset=".52" stop-color="#120714" stop-opacity=".38"/>
        <stop offset="1" stop-color="#100713" stop-opacity="1"/>
      </linearGradient>
      <linearGradient id="pink" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="#ff7bdf"/>
        <stop offset=".5" stop-color="#ff40c4"/>
        <stop offset="1" stop-color="#b85bff"/>
      </linearGradient>
      <radialGradient id="halo">
        <stop stop-color="#ff40c4" stop-opacity=".4"/>
        <stop offset="1" stop-color="#ff40c4" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect width="${W}" height="790" fill="url(#fade)"/>
    <circle cx="540" cy="450" r="205" fill="url(#halo)"/>
    <rect x="22" y="22" width="1036" height="1876" rx="40"
      fill="none" stroke="#ff8ce3" stroke-opacity=".54" stroke-width="2"/>
    <rect x="40" y="40" width="1000" height="1840" rx="30"
      fill="none" stroke="#d74bcb" stroke-opacity=".18" stroke-width="1"/>

    <text x="540" y="83" text-anchor="middle" fill="#ffd7f4"
      font-family="DejaVu Sans, sans-serif" font-size="24"
      letter-spacing="7">KYARA SYSTΞM</text>
    <text x="540" y="123" text-anchor="middle" fill="#e9b8e4"
      font-family="DejaVu Sans, sans-serif" font-size="15"
      letter-spacing="4">PERFIL DO PROPRIETÁRIO</text>
    <path d="M310 156 H770" stroke="url(#pink)" stroke-width="2" opacity=".8"/>
  `);

  let y = 650;

  for (const line of nameLines) {
    parts.push(`<text x="540" y="${y}" text-anchor="middle"
      fill="#fff4fc" font-family="DejaVu Sans, sans-serif"
      font-size="${nameFont}" font-weight="700">${xml(line)}</text>`);
    y += nameFont + 8;
  }

  y += 8;

  for (const line of roleLines) {
    parts.push(`<text x="540" y="${y}" text-anchor="middle"
      fill="#e7b4e1" font-family="DejaVu Sans, sans-serif"
      font-size="29">${xml(line)}</text>`);
    y += 38;
  }

  y += 18;
  parts.push(`<path d="M210 ${y} H870" stroke="url(#pink)" stroke-width="2" opacity=".8"/>`);
  y += 42;

  parts.push(`<text x="120" y="${y}" fill="#ff8cdb"
    font-family="DejaVu Sans, sans-serif" font-size="20"
    font-weight="700" letter-spacing="4">SOBRE MIM</text>`);

  y += 48;

  for (const line of bioLines) {
    parts.push(`<text x="120" y="${y}" fill="#f6eaf4"
      font-family="DejaVu Sans, sans-serif" font-size="26">${xml(line)}</text>`);
    y += 37;
  }

  y += 20;

  const contactHeight = 80 + contactLines.length * 34;
  parts.push(`<rect x="90" y="${y}" width="900" height="${contactHeight}"
    rx="24" fill="#2a102d" fill-opacity=".88"
    stroke="#e650c5" stroke-opacity=".8" stroke-width="2"/>`);
  parts.push(`<text x="130" y="${y + 38}" fill="#ff9ee6"
    font-family="DejaVu Sans, sans-serif" font-size="18"
    font-weight="700" letter-spacing="3">CONTATO</text>`);

  let cy = y + 72;

  for (const line of contactLines) {
    parts.push(`<text x="130" y="${cy}" fill="#fff2fc"
      font-family="DejaVu Sans, sans-serif" font-size="23">${xml(line)}</text>`);
    cy += 34;
  }

  parts.push(`
    <path d="M220 1790 H440 M640 1790 H860"
      stroke="url(#pink)" stroke-width="2" opacity=".65"/>
    <text x="540" y="1800" text-anchor="middle" fill="#e9b1df"
      font-family="DejaVu Sans, sans-serif" font-size="16"
      letter-spacing="3">KYARA • OWNER CARD</text>
    <text x="540" y="1840" text-anchor="middle" fill="#a77ca6"
      font-family="DejaVu Sans, sans-serif" font-size="14"
      letter-spacing="2">PERSONALIZADO NO PAINEL</text>
  `);

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"
    width="${W}" height="${H}">${parts.join('\n')}</svg>`);
}

function orbitSvg(frame) {
  const angle = 2 * Math.PI * frame / FRAMES;
  const degrees = angle * 180 / Math.PI;
  const radius = 141;
  const x = CENTER_X + radius * Math.cos(angle);
  const y = CENTER_Y + radius * Math.sin(angle);
  const x2 = CENTER_X + radius * Math.cos(angle + Math.PI);
  const y2 = CENTER_Y + radius * Math.sin(angle + Math.PI);

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <linearGradient id="ring">
          <stop stop-color="#ffccf5" stop-opacity=".1"/>
          <stop offset=".48" stop-color="#ff52d6"/>
          <stop offset="1" stop-color="#c45cff"/>
        </linearGradient>
        <filter id="glow" x="-200%" y="-200%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="8"/>
        </filter>
      </defs>

      <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="118"
        fill="none" stroke="#ffb5ef" stroke-width="3" opacity=".95"/>

      <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${radius}"
        fill="none" stroke="#ff52d6" stroke-opacity=".15" stroke-width="7"/>

      <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${radius}"
        fill="none" stroke="url(#ring)" stroke-width="4"
        stroke-dasharray="170 716" transform="rotate(${degrees} ${CENTER_X} ${CENTER_Y})"/>

      <circle cx="${x}" cy="${y}" r="19" fill="#ff4acb" opacity=".65" filter="url(#glow)"/>
      <circle cx="${x}" cy="${y}" r="8" fill="#fff1fc" stroke="#ff4acb" stroke-width="3"/>
      <circle cx="${x2}" cy="${y2}" r="5" fill="#f6a8ff" stroke="#fff1fc" stroke-width="2"/>
    </svg>`);
}

async function main() {
  fs.mkdirSync(UPLOADS, { recursive: true });

  const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const profile = config.kyaraOwnerProfile || {};
  const number = String(config.numerodono || '').replace(/\D/g, '');

  let banner = null;
  let photo = null;

  try {
    banner = await loadImage(profile.banner);
  } catch (error) {
    console.warn('[OWNER CARD] Banner indisponível:', error.message);
  }

  try {
    photo = await loadImage(profile.image);
  } catch (error) {
    console.warn('[OWNER CARD] Foto indisponível:', error.message);
  }

  if (!banner) banner = defaultBannerSvg();

  const bannerBuffer = await cropToFill(
    banner,
    W,
    740,
    50,
    Number(profile.bannerY ?? 50)
  );

  if (!photo) {
    const initial = xml(String(profile.name || 'K').trim().charAt(0).toUpperCase() || 'K');
    photo = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${AVATAR}" height="${AVATAR}">
        <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#6e1b68"/><stop offset="1" stop-color="#251039"/>
        </linearGradient></defs>
        <rect width="${AVATAR}" height="${AVATAR}" rx="${AVATAR / 2}" fill="url(#a)"/>
        <text x="115" y="151" text-anchor="middle" font-size="108"
          font-family="DejaVu Sans, sans-serif" font-weight="700" fill="#ffe5fa">${initial}</text>
      </svg>`);
  }

  const avatarSquare = await cropToFill(
    photo,
    AVATAR,
    AVATAR,
    Number(profile.photoX ?? 50),
    Number(profile.photoY ?? 50)
  );

  const mask = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${AVATAR}" height="${AVATAR}">
      <circle cx="${AVATAR / 2}" cy="${AVATAR / 2}" r="${AVATAR / 2}" fill="white"/>
    </svg>`);

  const avatar = await sharp(avatarSquare)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const overlay = staticCardSvg(profile, number);

  const staticBase = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: '#100713'
    }
  })
    .composite([
      { input: bannerBuffer, left: 0, top: 0 },
      { input: overlay, left: 0, top: 0 }
    ])
    .png()
    .toBuffer();

  const finalBase = await sharp(staticBase)
    .composite([{ input: avatar, left: AVATAR_X, top: AVATAR_Y }])
    .png()
    .toBuffer();

  const tempDir = fs.mkdtempSync(path.join(UPLOADS, '.owner-card-'));
  const temporaryVideo = path.join(UPLOADS, '.kyara-owner-card-' + process.pid + '.mp4');

  try {
    for (let i = 0; i < FRAMES; i++) {
      const framePath = path.join(tempDir, 'frame-' + String(i).padStart(3, '0') + '.png');

      await sharp(finalBase)
        .composite([{ input: orbitSvg(i), left: 0, top: 0 }])
        .png({ compressionLevel: 6 })
        .toFile(framePath);
    }

    await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-framerate', String(FPS),
      '-start_number', '0',
      '-i', path.join(tempDir, 'frame-%03d.png'),
      '-frames:v', String(FRAMES),
      '-an',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '24',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      temporaryVideo
    ], {
      timeout: 180000,
      maxBuffer: 2 * 1024 * 1024
    });

    fs.renameSync(temporaryVideo, OUTPUT);

    fs.writeFileSync(META, JSON.stringify({
      signature: signatureFor(config),
      generatedAt: new Date().toISOString(),
      width: W,
      height: H,
      fps: FPS,
      frames: FRAMES
    }, null, 2));

    console.log('[OWNER CARD] Cartão Full HD atualizado:', OUTPUT);
  } finally {
    try {
      if (fs.existsSync(temporaryVideo)) fs.unlinkSync(temporaryVideo);
    } catch {}

    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error('[OWNER CARD] Erro:', error);
  process.exitCode = 1;
});
