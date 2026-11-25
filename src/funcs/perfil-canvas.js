import {
  createCanvas,
  loadImage,
  GlobalFonts
} from '@napi-rs/canvas';

import fs from 'fs';
import path from 'path';

import {
  loadLevelingSafe,
  getLevelingUser
} from '../utils/database.js';

const HOME = process.env.HOME || '';
const PREFIX = process.env.PREFIX || '';

const ROOT = path.join(
  HOME,
  'storage/BKkyara-/dados'
);

const CUSTOM_DIR = path.join(
  ROOT,
  'perfil-fotos'
);

const CUSTOM_DB = path.join(
  ROOT,
  'perfil-custom.json'
);

const FONT = `${PREFIX}/share/fonts/TTF/DejaVuSans.ttf`;
const FONT_BOLD = `${PREFIX}/share/fonts/TTF/DejaVuSans-Bold.ttf`;
const FONT_NAME = 'DejaVu Sans';

const W = 720;
const H = 1280;

const GIF_FPS = 6;
const GIF_FRAMES = 66;

const photoCache = new Map();
const bioCache = new Map();

const PHOTO_TTL = 10 * 60 * 1000;
const BIO_TTL = 2 * 60 * 1000;

function ensureFont() {
  try {
    if (
      fs.existsSync(FONT) &&
      !GlobalFonts.has(FONT_NAME)
    ) {
      GlobalFonts.registerFromPath(
        FONT,
        FONT_NAME
      );

      if (fs.existsSync(FONT_BOLD)) {
        GlobalFonts.registerFromPath(
          FONT_BOLD,
          `${FONT_NAME} Bold`
        );
      }
    }
  } catch {}

  return GlobalFonts.has(FONT_NAME)
    ? FONT_NAME
    : 'sans-serif';
}

function clean(value, fallback = '') {
  const s = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  return s || fallback;
}

function jidBase(jid) {
  return String(jid || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/[^0-9A-Za-z_-]/g, '');
}

function sameJid(a, b) {
  if (!a || !b) return false;

  return (
    String(a) === String(b) ||
    jidBase(a) === jidBase(b)
  );
}

function cacheGet(map, key, ttl) {
  const item = map.get(key);

  if (!item) return null;

  if (Date.now() - item.time > ttl) {
    map.delete(key);
    return null;
  }

  return item.value;
}

function cacheSet(map, key, value) {
  map.set(key, {
    time: Date.now(),
    value
  });

  if (map.size > 150) {
    const first = map.keys().next().value;

    if (first !== undefined) {
      map.delete(first);
    }
  }

  return value;
}

function timeout(promise, ms, fallback = null) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise(resolve =>
      setTimeout(
        () => resolve(fallback),
        ms
      )
    )
  ]).catch(() => fallback);
}

function rgba(hex, alpha) {
  const h = String(hex)
    .replace('#', '');

  const normalized =
    h.length === 3
      ? h.split('').map(x => x + x).join('')
      : h;

  const n = parseInt(normalized, 16);

  return (
    `rgba(${(n >> 16) & 255},` +
    `${(n >> 8) & 255},` +
    `${n & 255},${alpha})`
  );
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function hash(value) {
  let h = 2166136261;

  for (const char of String(value)) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

function initials(name) {
  const parts = clean(name, 'Kyara')
    .split(/\s+/)
    .filter(Boolean);

  return (
    (parts[0]?.[0] || 'K') +
    (parts[1]?.[0] || 'Y')
  ).toUpperCase();
}

function getCustomPhoto(keys) {
  try {
    const db = JSON.parse(
      fs.readFileSync(
        CUSTOM_DB,
        'utf8'
      )
    );

    for (const key of keys) {
      const file = db[key];

      if (!file) continue;

      const full = path.join(
        CUSTOM_DIR,
        file
      );

      if (fs.existsSync(full)) {
        return full;
      }
    }
  } catch {}

  return null;
}

function findParticipant(
  target,
  groupMetadata
) {
  const participants =
    Array.isArray(
      groupMetadata?.participants
    )
      ? groupMetadata.participants
      : [];

  return (
    participants.find(p =>
      sameJid(target, p?.id) ||
      sameJid(target, p?.lid)
    ) || null
  );
}

function resolveIdentity({
  target,
  sender,
  pushname,
  groupMetadata
}) {
  const participant =
    findParticipant(
      target,
      groupMetadata
    );

  const isSelf =
    sameJid(target, sender);

  let name = '';

  if (isSelf) {
    name = clean(
      pushname,
      'Usuário'
    );
  } else {
    name = clean(
      participant?.notify ||
      participant?.name ||
      participant?.displayName ||
      participant?.verifiedName,
      ''
    );
  }

  if (!name) {
    name =
      `@${jidBase(target) || 'usuario'}`;
  }

  const ids = [
    target,
    participant?.id,
    participant?.lid
  ]
    .filter(Boolean)
    .map(String);

  return {
    participant,
    name,
    ids: [...new Set(ids)],
    displayId:
      participant?.id || target
  };
}

async function getPhoto({
  nazu,
  ids = [],
  target,
  sender,
  from,
  photoJid,
  participant
}) {
  const candidates = [];

  function addCandidate(value) {
    if (!value) return;

    let jid = String(value).trim();

    if (!jid) return;

    jid = jid.replace(
      /^(\\d+):\\d+(@.+)$/,
      '$1$2'
    );

    if (
      jid.endsWith('@g.us') ||
      jid.endsWith('@broadcast') ||
      jid === 'status@broadcast'
    ) {
      return;
    }

    if (!candidates.includes(jid)) {
      candidates.push(jid);
    }
  }

  /*
   * ==========================================================
   * AUTOR REAL — PRIORIDADE ABSOLUTA
   * ==========================================================
   */

  addCandidate(photoJid);

  /*
   * Se o WhatsApp entregou @lid,
   * tenta encontrar o PN/JID real no participante.
   */

  const isLid =
    String(photoJid || '').endsWith('@lid');

  if (isLid && participant) {
    addCandidate(participant.id);
    addCandidate(participant.pn);
    addCandidate(participant.jid);
    addCandidate(participant.phoneNumber);
  }

  /*
   * IDs do participante são permitidos somente quando
   * pertencem ao autor identificado.
   */

  if (participant) {
    addCandidate(participant.id);
    addCandidate(participant.pn);
    addCandidate(participant.jid);
  }

  /*
   * Em conversa privada, remoteJid representa o usuário.
   * Em grupo, jamais usar remoteJid.
   */

  if (
    !photoJid &&
    from &&
    !String(from).endsWith('@g.us') &&
    !String(from).endsWith('@broadcast')
  ) {
    addCandidate(from);
  }

  const unique = [
    ...new Set(candidates)
  ];

  console.log(
    '[PERFIL V16] AUTOR:',
    photoJid || 'não informado'
  );

  console.log(
    '[PERFIL V16] PARTICIPANTE:',
    participant
      ? JSON.stringify({
          id: participant.id,
          lid: participant.lid,
          pn: participant.pn,
          jid: participant.jid
        })
      : 'não informado'
  );

  console.log(
    '[PERFIL V16] CANDIDATOS FOTO:',
    JSON.stringify(unique)
  );

  if (!unique.length) {
    console.log(
      '[PERFIL V16] ❌ nenhum JID de autor.'
    );

    return null;
  }

  /*
   * ==========================================================
   * CACHE
   * ==========================================================
   */

  const now = Date.now();

  for (const jid of unique) {
    const cached =
      photoCache.get(jid);

    if (
      cached?.image &&
      now - cached.ts < PHOTO_TTL
    ) {
      console.log(
        '[PERFIL V16] ✓ CACHE:',
        jid
      );

      return cached.image;
    }
  }

  /*
   * ==========================================================
   * WHATSAPP PROFILE PICTURE
   * ==========================================================
   */

  for (const jid of unique) {
    for (const type of [
      'image',
      'preview'
    ]) {
      try {
        console.log(
          '[PERFIL V16] tentando:',
          jid,
          type
        );

        if (
          typeof nazu?.profilePictureUrl !==
          'function'
        ) {
          throw new Error(
            'profilePictureUrl não disponível'
          );
        }

        const url =
          await Promise.race([
            nazu.profilePictureUrl(
              jid,
              type
            ),

            new Promise(
              (_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        'profilePictureUrl timeout após 30000ms'
                      )
                    ),
                  30000
                )
            )
          ]);

        if (!url) {
          continue;
        }

        console.log(
          '[PERFIL V16] URL encontrada:',
          jid,
          type
        );

        const response =
          await fetch(
            url,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 Kyara'
              },
              signal:
                AbortSignal.timeout(
                  12000
                )
            }
          );

        if (!response.ok) {
          console.log(
            '[PERFIL V16] HTTP:',
            response.status
          );

          continue;
        }

        const buffer =
          Buffer.from(
            await response.arrayBuffer()
          );

        if (!buffer.length) {
          continue;
        }

        const image =
          await loadImage(buffer);

        if (
          !image ||
          !image.width ||
          !image.height
        ) {
          continue;
        }

        photoCache.set(
          jid,
          {
            image,
            ts: Date.now()
          }
        );

        console.log(
          '[PERFIL V16] ✓ FOTO DO AUTOR:',
          jid,
          buffer.length,
          'bytes'
        );

        return image;

      } catch (error) {
        console.log(
          '[PERFIL V16] falhou:',
          jid,
          type,
          String(
            error?.message ||
            error
          ).slice(0, 180)
        );
      }
    }
  }

  console.log(
    '[PERFIL V16] ❌ FOTO DO AUTOR NÃO ENCONTRADA'
  );

  return null;
}

async function getBio(
  nazu,
  ids
) {
  for (const id of ids) {
    const key = String(id);

    const cached =
      cacheGet(
        bioCache,
        key,
        BIO_TTL
      );

    if (cached) return cached;

    try {
      const status =
        await timeout(
          nazu.fetchStatus(id),
          700
        );

      const raw =
        status?.[0]?.status;

      const bio =
        raw?.status || raw;

      if (bio) {
        return cacheSet(
          bioCache,
          key,
          clean(
            bio,
            'Sem bio disponível'
          )
        );
      }
    } catch {}
  }

  return 'Sem bio disponível';
}

function getRealLevel(ids) {
  try {
    const leveling =
      loadLevelingSafe();

    for (const id of ids) {
      if (leveling?.users?.[id]) {
        const u =
          leveling.users[id];

        return {
          level:
            Math.max(
              1,
              Number(u.level) || 1
            ),
          xp:
            Math.max(
              0,
              Number(u.xp) || 0
            ),
          messages:
            Number(u.messages) || 0,
          commands:
            Number(u.commands) || 0
        };
      }
    }

    const u =
      getLevelingUser(
        leveling,
        ids[0]
      );

    return {
      level:
        Math.max(
          1,
          Number(u?.level) || 1
        ),
      xp:
        Math.max(
          0,
          Number(u?.xp) || 0
        ),
      messages:
        Number(u?.messages) || 0,
      commands:
        Number(u?.commands) || 0
    };
  } catch {
    return {
      level: 1,
      xp: 0,
      messages: 0,
      commands: 0
    };
  }
}

function xpNext(level) {
  return Math.floor(
    100 *
    Math.pow(
      1.1,
      Math.max(0, level - 1)
    )
  );
}

function randomStats() {
  const labels = [
    'Carisma',
    'Sorte',
    'Energia',
    'Criatividade',
    'Foco',
    'Coragem'
  ];

  const stats = {};

  for (const label of labels) {
    stats[label] =
      Math.floor(
        Math.random() * 101
      );
  }

  return stats;
}

function average(stats) {
  const values =
    Object.values(stats);

  return Math.round(
    values.reduce(
      (a, b) => a + b,
      0
    ) / values.length
  );
}

function rank(power) {
  if (power >= 90) return 'LENDÁRIO';
  if (power >= 75) return 'ELITE';
  if (power >= 60) return 'AVANÇADO';
  if (power >= 40) return 'VETERANO';

  return 'INICIANTE';
}

function randomHumor() {
  const list = [
    'TRANQUILÃO',
    'ANIMADO',
    'FOCADO',
    'ZEN',
    'CRIATIVO',
    'MISTERIOSO'
  ];

  return list[
    Math.floor(
      Math.random() *
      list.length
    )
  ];
}

function center(
  ctx,
  value,
  y,
  size,
  color,
  font,
  weight = 700
) {
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font =
    `${weight} ${size}px "${font}"`;

  ctx.fillText(
    value,
    W / 2,
    y
  );

  ctx.textAlign = 'left';
}

function wrap(
  ctx,
  value,
  maxWidth,
  maxLines = 2
) {
  const words =
    clean(
      value,
      'Sem bio disponível'
    ).split(/\s+/);

  const lines = [];
  let current = '';

  for (const word of words) {
    const test =
      current
        ? `${current} ${word}`
        : word;

    if (
      ctx.measureText(test).width <=
      maxWidth
    ) {
      current = test;
    } else {
      if (current) {
        lines.push(current);
      }

      current = word;

      if (
        lines.length >=
        maxLines
      ) {
        break;
      }
    }
  }

  if (
    current &&
    lines.length < maxLines
  ) {
    lines.push(current);
  }

  return lines;
}

async function renderProfileFrame({
  data,
  photo,
  phase
}) {
  const f = ensureFont();

  const canvas =
    createCanvas(W, H);

  const ctx =
    canvas.getContext('2d');

  const PURPLE = '#a78bfa';
  const BLUE = '#60a5fa';
  const PINK = '#f0abfc';

  ctx.fillStyle = '#05030d';
  ctx.fillRect(0, 0, W, H);

  const bg =
    ctx.createRadialGradient(
      360,
      160,
      20,
      360,
      650,
      800
    );

  bg.addColorStop(
    0,
    '#30135c'
  );

  bg.addColorStop(
    .45,
    '#13092e'
  );

  bg.addColorStop(
    1,
    '#030208'
  );

  ctx.fillStyle = bg;
  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  // PARTICULAS
  for (let i = 0; i < 42; i++) {
    const sx =
      hash(`x-${i}`) % W;

    const sy =
      hash(`y-${i}`) % H;

    const px =
      (sx + phase * 35) % W;

    const py =
      sy +
      Math.sin(
        phase *
        Math.PI *
        2 +
        i
      ) *
      5;

    ctx.fillStyle =
      rgba(
        i % 2
          ? BLUE
          : PINK,
        .08 +
        (i % 4) * .035
      );

    ctx.beginPath();

    ctx.arc(
      px,
      py,
      1 + (i % 3),
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  // GRID
  ctx.save();

  ctx.globalAlpha = .035;
  ctx.strokeStyle = '#ffffff';

  for (
    let x = 0;
    x < W;
    x += 48
  ) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (
    let y = 0;
    y < H;
    y += 48
  ) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.restore();

  // BORDA
  ctx.strokeStyle =
    rgba(PURPLE, .7);

  ctx.lineWidth = 2;

  rr(
    ctx,
    14,
    14,
    W - 28,
    H - 28,
    26
  );

  ctx.stroke();

  // HEADER
  rr(
    ctx,
    34,
    34,
    W - 68,
    60,
    17
  );

  ctx.fillStyle =
    'rgba(255,255,255,.055)';

  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font =
    `900 23px "${f}"`;

  ctx.fillText(
    '♛ KYARA',
    54,
    72
  );

  ctx.fillStyle = PINK;
  ctx.font =
    `700 12px "${f}"`;

  ctx.textAlign = 'right';

  ctx.fillText(
    'LAVENDER • LIVE',
    W - 54,
    70
  );

  ctx.textAlign = 'left';

  // FOTO
  const cx = W / 2;
  const cy = 250;
  const radius = 112;

  const angle =
    phase *
    Math.PI *
    2;

  const pulse =
    1 +
    Math.sin(angle) *
    .018;

  ctx.save();

  ctx.shadowColor = PURPLE;
  ctx.shadowBlur =
    28 +
    Math.sin(angle) * 14;

  ctx.fillStyle =
    rgba(PURPLE, .14);

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    radius + 20,
    0,
    Math.PI * 2
  );

  ctx.fill();
  ctx.restore();


  // ========================================================
  // KYARA V16 — LAVENDER GOD MODE
  // FOTO FIXA + ENERGIA ANIMADA
  // ========================================================

  const t =
    phase *
    Math.PI *
    2;

  const glow =
    0.72 +
    0.28 *
    Math.sin(t * 2);

  /*
   * ========================================================
   * HALO CENTRAL
   * ========================================================
   */

  ctx.save();

  ctx.globalCompositeOperation =
    'screen';

  const halo =
    ctx.createRadialGradient(
      cx,
      cy,
      radius * 0.70,
      cx,
      cy,
      radius * 2.45
    );

  halo.addColorStop(
    0,
    'rgba(240,171,252,0.16)'
  );

  halo.addColorStop(
    0.30,
    'rgba(167,139,250,0.12)'
  );

  halo.addColorStop(
    0.62,
    'rgba(96,165,250,0.07)'
  );

  halo.addColorStop(
    1,
    'rgba(0,0,0,0)'
  );

  ctx.fillStyle =
    halo;

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    radius * 2.45,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();


  /*
   * ========================================================
   * AURAS PULSANTES
   * ========================================================
   */

  ctx.save();

  ctx.globalCompositeOperation =
    'screen';

  for (
    let i = 0;
    i < 3;
    i++
  ) {

    const rr =
      radius +
      17 +
      i * 18 +
      Math.sin(
        t * 2 + i
      ) * 3;

    ctx.globalAlpha =
      (
        0.08 +
        i * 0.025
      ) *
      glow;

    ctx.lineWidth =
      5 -
      i * 0.8;

    ctx.strokeStyle =
      i === 1
        ? PINK
        : i === 2
          ? BLUE
          : PURPLE;

    ctx.shadowColor =
      ctx.strokeStyle;

    ctx.shadowBlur =
      24 +
      i * 10;

    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      rr,
      0,
      Math.PI * 2
    );

    ctx.stroke();
  }

  ctx.restore();


  /*
   * ========================================================
   * 10 ANÉIS SEGMENTADOS
   * ========================================================
   */

  ctx.save();

  ctx.globalCompositeOperation =
    'screen';

  ctx.lineCap =
    'round';

  for (
    let i = 0;
    i < 10;
    i++
  ) {

    const rr =
      radius +
      27 +
      i * 13;

    const speed =
      (
        0.35 +
        (i % 4) * 0.16
      ) *
      (
        i % 2
          ? -1
          : 1
      );

    const rot =
      t *
      speed +
      i * 0.73;

    const arcs =
      2 +
      (i % 3);

    const gap =
      0.18 +
      (i % 4) *
      0.035;

    ctx.globalAlpha =
      (
        0.20 -
        i * 0.010
      ) *
      (
        0.75 +
        glow * 0.35
      );

    ctx.strokeStyle =
      i % 3 === 0
        ? PINK
        : i % 3 === 1
          ? PURPLE
          : BLUE;

    ctx.shadowColor =
      ctx.strokeStyle;

    ctx.shadowBlur =
      11 +
      (i % 3) * 7;

    ctx.lineWidth =
      i % 4 === 0
        ? 3
        : 1.35;

    for (
      let j = 0;
      j < arcs;
      j++
    ) {

      const begin =
        rot +
        j *
          (
            Math.PI *
            2 /
            arcs
          ) +
        gap;

      const len =
        0.46 +
        (i % 3) *
        0.12;

      ctx.beginPath();

      ctx.arc(
        cx,
        cy,
        rr,
        begin,
        begin + len
      );

      ctx.stroke();
    }
  }

  ctx.restore();


  /*
   * ========================================================
   * RAIOS RADIAIS
   * ========================================================
   */

  ctx.save();

  ctx.globalCompositeOperation =
    'screen';

  for (
    let arm = 0;
    arm < 4;
    arm++
  ) {

    const base =
      t *
        (
          arm % 2
            ? -0.55
            : 0.72
        ) +
      arm *
        Math.PI /
        2;

    const inner =
      radius +
      15;

    const outer =
      radius +
      154;

    ctx.globalAlpha =
      0.16 +
      glow *
        0.12;

    ctx.strokeStyle =
      arm % 2
        ? BLUE
        : PINK;

    ctx.shadowColor =
      ctx.strokeStyle;

    ctx.shadowBlur =
      20;

    ctx.lineWidth =
      1.5;

    ctx.beginPath();

    for (
      let k = 0;
      k <= 18;
      k++
    ) {

      const p =
        k /
        18;

      const rr =
        inner +
        (
          outer -
          inner
        ) *
        p;

      const wobble =
        Math.sin(
          t * 2.5 +
          arm * 2 +
          k * 1.7
        ) *
        (
          2 +
          p * 6
        );

      const aa =
        base +
        wobble *
        0.008;

      const x =
        cx +
        Math.cos(aa) *
        rr;

      const y =
        cy +
        Math.sin(aa) *
        rr;

      if (
        k === 0
      ) {
        ctx.moveTo(
          x,
          y
        );
      } else {
        ctx.lineTo(
          x,
          y
        );
      }
    }

    ctx.stroke();
  }

  ctx.restore();


  /*
   * ========================================================
   * 64 PARTÍCULAS ORBITAIS
   * ========================================================
   */

  ctx.save();

  ctx.globalCompositeOperation =
    'screen';

  for (
    let i = 0;
    i < 64;
    i++
  ) {

    const band =
      i % 8;

    const rr =
      radius +
      39 +
      band * 15 +
      Math.sin(
        i * 1.7
      ) *
      5;

    const direction =
      i % 2
        ? -1
        : 1;

    const speed =
      0.18 +
      (i % 5) *
      0.045;

    const aa =
      i * 0.61 +
      t *
      speed *
      direction;

    const wobble =
      Math.sin(
        t *
          (
            1.5 +
            (i % 3) *
            0.2
          ) +
        i
      ) *
      4;

    const px =
      cx +
      Math.cos(aa) *
      (
        rr +
        wobble
      );

    const py =
      cy +
      Math.sin(aa) *
      (
        rr +
        wobble
      );

    const size =
      0.9 +
      (i % 4) *
      0.65;

    const alpha =
      0.22 +
      0.28 *
      (
        0.5 +
        0.5 *
        Math.sin(
          t * 2 +
          i
        )
      );

    ctx.globalAlpha =
      alpha;

    ctx.fillStyle =
      i % 3 === 0
        ? PINK
        : i % 3 === 1
          ? PURPLE
          : BLUE;

    ctx.shadowColor =
      ctx.fillStyle;

    ctx.shadowBlur =
      9 +
      (i % 3) *
      4;

    ctx.beginPath();

    ctx.arc(
      px,
      py,
      size,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.restore();


  /*
   * ========================================================
   * ESTRELAS
   * ========================================================
   */

  ctx.save();

  ctx.globalCompositeOperation =
    'screen';

  for (
    let i = 0;
    i < 12;
    i++
  ) {

    const aa =
      i *
        (
          Math.PI *
          2 /
          12
        ) -
      t *
        (
          0.18 +
          (i % 2) *
          0.10
        );

    const rr =
      radius +
      88 +
      (i % 3) *
      30;

    const sx =
      cx +
      Math.cos(aa) *
      rr;

    const sy =
      cy +
      Math.sin(aa) *
      rr;

    const starPulse =
      0.6 +
      0.4 *
      Math.sin(
        t * 3 +
        i
      );

    const sz =
      2.5 +
      (i % 3) *
      1.2;

    ctx.globalAlpha =
      0.30 *
      starPulse;

    ctx.strokeStyle =
      i % 2
        ? PINK
        : BLUE;

    ctx.shadowColor =
      ctx.strokeStyle;

    ctx.shadowBlur =
      15;

    ctx.lineWidth =
      1.4;

    ctx.beginPath();

    ctx.moveTo(
      sx - sz * 2.5,
      sy
    );

    ctx.lineTo(
      sx + sz * 2.5,
      sy
    );

    ctx.moveTo(
      sx,
      sy - sz * 2.5
    );

    ctx.lineTo(
      sx,
      sy + sz * 2.5
    );

    ctx.stroke();
  }

  ctx.restore();


  /*
   * ========================================================
   * 18 FAÍSCAS
   * ========================================================
   */

  ctx.save();

  ctx.globalCompositeOperation =
    'screen';

  for (
    let i = 0;
    i < 18;
    i++
  ) {

    const aa =
      i *
        0.91 +
      t *
        (
          i % 2
            ? -0.45
            : 0.55
        );

    const rr =
      radius +
      58 +
      (i % 6) *
      19;

    const sx =
      cx +
      Math.cos(aa) *
      rr;

    const sy =
      cy +
      Math.sin(aa) *
      rr;

    const len =
      4 +
      (i % 4) *
      2;

    const c =
      i % 2
        ? PINK
        : PURPLE;

    ctx.globalAlpha =
      0.18 +
      0.25 *
      (
        0.5 +
        0.5 *
        Math.sin(
          t * 4 +
          i
        )
      );

    ctx.strokeStyle =
      c;

    ctx.shadowColor =
      c;

    ctx.shadowBlur =
      12;

    ctx.lineWidth =
      1.2;

    ctx.beginPath();

    ctx.moveTo(
      sx - len,
      sy - len * 0.25
    );

    ctx.lineTo(
      sx + len,
      sy + len * 0.25
    );

    ctx.moveTo(
      sx - len * 0.25,
      sy + len
    );

    ctx.lineTo(
      sx + len * 0.25,
      sy - len
    );

    ctx.stroke();
  }

  ctx.restore();


  /*
   * ========================================================
   * BRILHO PERCORRENDO O ARO
   * ========================================================
   */

  ctx.save();

  ctx.globalCompositeOperation =
    'screen';

  const sweep =
    t %
    (
      Math.PI *
      2
    );

  ctx.globalAlpha =
    0.55;

  ctx.strokeStyle =
    '#ffffff';

  ctx.shadowColor =
    PINK;

  ctx.shadowBlur =
    18;

  ctx.lineWidth =
    2.5;

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    radius + 10,
    sweep,
    sweep + 0.30
  );

  ctx.stroke();

  ctx.restore();


  /*
   * ========================================================
   * BORDA DO AVATAR
   * FOTO NÃO SE MOVE
   * ========================================================
   */

  ctx.save();

  ctx.globalCompositeOperation =
    'screen';

  ctx.globalAlpha =
    0.95;

  ctx.lineCap =
    'round';

  ctx.lineWidth =
    5;

  ctx.strokeStyle =
    PINK;

  ctx.shadowColor =
    PINK;

  ctx.shadowBlur =
    20;

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    radius + 4,
    t * 0.35,
    t * 0.35 +
      Math.PI * 1.45
  );

  ctx.stroke();

  ctx.lineWidth =
    2;

  ctx.strokeStyle =
    BLUE;

  ctx.shadowColor =
    BLUE;

  ctx.shadowBlur =
    14;

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    radius + 11,
    -t * 0.50,
    -t * 0.50 +
      Math.PI * 0.95
  );

  ctx.stroke();

  ctx.restore();


// FOTO CIRCULAR — FIXA

  ctx.save();

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    radius,
    0,
    Math.PI * 2
  );

  ctx.clip();

  if (photo) {

    const scale =
      Math.max(
        (radius * 2) /
          photo.width,

        (radius * 2) /
          photo.height
      );

    const dw =
      photo.width *
      scale;

    const dh =
      photo.height *
      scale;

    /*
     * FOTO 100% PARADA.
     * Nenhum sin/cos.
     * Nenhum pulse.
     * Nenhum deslocamento.
     */

    ctx.drawImage(
      photo,
      cx - dw / 2,
      cy - dh / 2,
      dw,
      dh
    );

  } else {

    const avatar =
      ctx.createLinearGradient(
        cx - radius,
        cy - radius,
        cx + radius,
        cy + radius
      );

    avatar.addColorStop(
      0,
      PURPLE
    );

    avatar.addColorStop(
      1,
      BLUE
    );

    ctx.fillStyle =
      avatar;

    ctx.fillRect(
      cx - radius,
      cy - radius,
      radius * 2,
      radius * 2
    );

    ctx.fillStyle =
      '#fff';

    ctx.textAlign =
      'center';

    ctx.textBaseline =
      'middle';

    ctx.font =
      '900 62px "' +
      f +
      '"';

    ctx.fillText(
      data.initials,
      cx,
      cy
    );

    ctx.textAlign =
      'left';

    ctx.textBaseline =
      'alphabetic';
  }

  ctx.restore();

  // ANÉIS
  ctx.save();

  ctx.lineCap = 'round';

  ctx.strokeStyle = PURPLE;
  ctx.lineWidth = 6;

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    radius + 9,
    angle,
    angle +
    Math.PI * 1.5
  );

  ctx.stroke();

  ctx.strokeStyle = PINK;
  ctx.lineWidth = 3;

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    radius + 19,
    -angle,
    -angle +
    Math.PI * 1.15
  );

  ctx.stroke();

  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    radius + 29,
    angle + .5,
    angle + 1.9
  );

  ctx.stroke();

  ctx.restore();

  // PONTOS ORBITAIS
  for (let i = 0; i < 4; i++) {
    const a =
      angle +
      i *
      (Math.PI * 2 / 4);

    const ox =
      cx +
      Math.cos(a) *
      (radius + 21);

    const oy =
      cy +
      Math.sin(a) *
      (radius + 21);

    ctx.fillStyle =
      i % 2
        ? PINK
        : BLUE;

    ctx.beginPath();

    ctx.arc(
      ox,
      oy,
      4,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    radius + 2,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  // NOME
  center(
    ctx,
    clean(
      data.name,
      'Usuário'
    )
      .slice(0, 25)
      .toUpperCase(),
    420,
    35,
    '#ffffff',
    f,
    900
  );

  center(
    ctx,
    `@${jidBase(data.number) || 'usuario'}`,
    447,
    16,
    '#aaa0c3',
    f,
    600
  );

  // LEVEL
  rr(
    ctx,
    110,
    472,
    500,
    48,
    24
  );

  ctx.fillStyle =
    'rgba(255,255,255,.05)';

  ctx.fill();

  ctx.strokeStyle =
    rgba(PINK, .45);

  ctx.stroke();

  center(
    ctx,
    `★ ${data.rank} • NÍVEL ${data.level}`,
    503,
    17,
    '#eee7ff',
    f,
    800
  );

  // BIO
  rr(
    ctx,
    34,
    550,
    W - 68,
    122,
    18
  );

  ctx.fillStyle =
    'rgba(255,255,255,.045)';

  ctx.fill();

  ctx.strokeStyle =
    rgba(PURPLE, .28);

  ctx.stroke();

  ctx.fillStyle = PURPLE;
  ctx.font =
    `800 15px "${f}"`;

  ctx.fillText(
    'BIO',
    54,
    579
  );

  ctx.fillStyle = '#eee8f7';
  ctx.font =
    `500 15px "${f}"`;

  const bioLines =
    wrap(
      ctx,
      data.bio,
      600,
      2
    );

  bioLines.forEach(
    (line, index) => {
      ctx.fillText(
        line,
        54,
        606 +
        index * 21
      );
    }
  );

  ctx.fillStyle = PINK;
  ctx.font =
    `800 13px "${f}"`;

  ctx.fillText(
    'HUMOR',
    54,
    655
  );

  ctx.fillStyle = '#e1d9ec';
  ctx.font =
    `600 13px "${f}"`;

  ctx.fillText(
    data.humor,
    125,
    655
  );

  // ATRIBUTOS
  ctx.fillStyle = '#f1eaff';
  ctx.font =
    `900 22px "${f}"`;

  ctx.fillText(
    'NÍVEIS DE BRINCADEIRA',
    42,
    724
  );

  ctx.fillStyle = '#8e82a4';
  ctx.font =
    `600 10px "${f}"`;

  ctx.textAlign = 'right';

  ctx.fillText(
    'ALEATÓRIO • CADA /PERFIL',
    W - 42,
    724
  );

  ctx.textAlign = 'left';

  const entries =
    Object.entries(data.stats);

  const positions = [
    [42, 765],
    [382, 765],
    [42, 835],
    [382, 835],
    [42, 905],
    [382, 905]
  ];

  entries.forEach(
    ([label, value], index) => {
      const [x, y] =
        positions[index];

      const width = 245;

      ctx.fillStyle = '#d9d1e9';
      ctx.font =
        `600 14px "${f}"`;

      ctx.fillText(
        label,
        x,
        y
      );

      ctx.fillStyle = '#fff';
      ctx.font =
        `800 13px "${f}"`;

      ctx.textAlign = 'right';

      ctx.fillText(
        `${value}%`,
        x + width,
        y
      );

      ctx.textAlign = 'left';

      rr(
        ctx,
        x,
        y + 10,
        width,
        8,
        4
      );

      ctx.fillStyle =
        'rgba(255,255,255,.10)';

      ctx.fill();

      rr(
        ctx,
        x,
        y + 10,
        Math.max(
          5,
          width * value / 100
        ),
        8,
        4
      );

      const gradient =
        ctx.createLinearGradient(
          x,
          0,
          x + width,
          0
        );

      gradient.addColorStop(
        0,
        PURPLE
      );

      gradient.addColorStop(
        1,
        PINK
      );

      ctx.fillStyle = gradient;
      ctx.fill();
    }
  );

  // XP
  rr(
    ctx,
    34,
    950,
    W - 68,
    104,
    18
  );

  ctx.fillStyle =
    'rgba(255,255,255,.045)';

  ctx.fill();

  ctx.strokeStyle =
    rgba(BLUE, .28);

  ctx.stroke();

  ctx.fillStyle = '#f1eaff';
  ctx.font =
    `800 16px "${f}"`;

  ctx.fillText(
    `XP ${data.xp}/${data.nextXp}`,
    54,
    984
  );

  ctx.fillStyle = '#988cab';
  ctx.font =
    `700 13px "${f}"`;

  ctx.textAlign = 'right';

  ctx.fillText(
    `${data.xpPercent}%`,
    W - 54,
    984
  );

  ctx.textAlign = 'left';

  rr(
    ctx,
    54,
    1004,
    W - 108,
    10,
    5
  );

  ctx.fillStyle =
    'rgba(255,255,255,.10)';

  ctx.fill();

  rr(
    ctx,
    54,
    1004,
    Math.max(
      5,
      (W - 108) *
      data.xpPercent /
      100
    ),
    10,
    5
  );

  const xpGradient =
    ctx.createLinearGradient(
      54,
      0,
      W - 54,
      0
    );

  xpGradient.addColorStop(
    0,
    PURPLE
  );

  xpGradient.addColorStop(
    1,
    PINK
  );

  ctx.fillStyle = xpGradient;
  ctx.fill();

  // BADGES
  ctx.fillStyle = '#d2c8e4';
  ctx.font =
    `800 14px "${f}"`;

  ctx.fillText(
    'BADGES',
    42,
    1100
  );

  [
    'AURORA',
    'NIGHT OWL',
    'DEBUG MASTER'
  ].forEach(
    (badge, index) => {
      const x =
        42 +
        index * 222;

      rr(
        ctx,
        x,
        1115,
        202,
        36,
        18
      );

      ctx.fillStyle =
        'rgba(167,139,250,.08)';

      ctx.fill();

      ctx.strokeStyle =
        rgba(PURPLE, .35);

      ctx.stroke();

      ctx.fillStyle = '#eee8ff';
      ctx.font =
        `700 11px "${f}"`;

      ctx.fillText(
        badge,
        x + 18,
        1138
      );
    }
  );

  ctx.fillStyle = '#7e7197';
  ctx.font =
    `600 10px "${f}"`;

  ctx.textAlign = 'center';

  ctx.fillText(
    'KYARA • LAVENDER PROFILE • ANIMATED',
    W / 2,
    1195
  );

  ctx.textAlign = 'left';

  return canvas.toBuffer(
    'image/png'
  );
}

async function createProfileGif(
  data,
  photo
) {

  const {
    execFile
  } =
    await import(
      'child_process'
    );

  const {
    promisify
  } =
    await import(
      'util'
    );

  const exec =
    promisify(
      execFile
    );

  const renderDir =
    path.join(
      ROOT,
      '.perfil-render'
    );

  fs.mkdirSync(
    renderDir,
    {
      recursive: true
    }
  );

  const dir =
    path.join(
      renderDir,
      'p-' +
      Date.now()
    );

  fs.mkdirSync(
    dir,
    {
      recursive: true
    }
  );

  const output =
    path.join(
      dir,
      'perfil.mp4'
    );

  try {

    /*
     * 66 frames × 6 FPS = 11 segundos.
     */

    for (
      let i = 0;
      i < GIF_FRAMES;
      i++
    ) {

      const png =
        await renderProfileFrame({
          data,
          photo,
          phase:
            i /
            GIF_FRAMES
        });

      fs.writeFileSync(
        path.join(
          dir,
          'frame-' +
          String(i)
            .padStart(
              2,
              '0'
            ) +
          '.png'
        ),
        png
      );
    }

    /*
     * WhatsApp/Baileys:
     * MP4 + gifPlayback = GIF automático.
     *
     * 720x900 reduz bastante o peso
     * mantendo o card vertical.
     */

    await exec(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',

        '-framerate',
        String(
          GIF_FPS
        ),

        '-i',
        path.join(
          dir,
          'frame-%02d.png'
        ),

        '-an',

        '-vf',
        'scale=720:-2:flags=lanczos',

        '-c:v',
        'libx264',

        '-preset',
        'veryfast',

        '-tune',
        'animation',

        '-crf',
        '27',

        '-pix_fmt',
        'yuv420p',

        '-movflags',
        '+faststart',

        '-t',
        '11',

        output
      ],
      {
        timeout:
          120000,

        maxBuffer:
          2 *
          1024 *
          1024
      }
    );

    const video =
      fs.readFileSync(
        output
      );

    if (
      !video.length
    ) {
      throw new Error(
        'Perfil animado vazio'
      );
    }

    console.log(
      '[KYARA V16] PERFIL ANIMADO:',
      (
        video.length /
        1024 /
        1024
      ).toFixed(2) +
      ' MB',
      '66 frames / 11s'
    );

    return {
      video,
      dir
    };

  } catch (
    error
  ) {

    try {

      fs.rmSync(
        dir,
        {
          recursive:
            true,

          force:
            true
        }
      );

    } catch {}

    throw error;
  }
}

export default async function handler({
  nazu,
  from,
  sender,
  pushname,
  info,
  reply,
  groupMetadata,
  targetJid,
  photoJid
}) {
  try {
    const target =
      targetJid || sender;

    const identity =
      resolveIdentity({
        target,
        sender,
        pushname,
        groupMetadata
      });

    const ids =
      identity.ids;

    const customKeys =
      [
        ...new Set(
          ids.flatMap(
            id => [
              String(id),
              jidBase(id)
            ]
          )
        )
      ].filter(Boolean);



    /*
     * ========================================================
     * KYARA V15.3 — AUTOR REAL
     * ========================================================
     */

    const authorParticipant =
      identity.participant || null;

    const resolvedPhotoJid =
      photoJid ||
      info?.key?.participantAlt ||
      info?.key?.participant ||
      (
        !String(from || '')
          .endsWith('@g.us')
          ? info?.key?.remoteJid
          : null
      ) ||
      null;

    console.log(
      '[PERFIL V16] AUTOR REAL:',
      resolvedPhotoJid
    );

    const [photo, bio] =
      await Promise.all([
        getPhoto({
          nazu,
          ids,
          target: targetJid,
          sender,
          from,
          photoJid:
            resolvedPhotoJid,
          participant:
            authorParticipant
        }),

        getBio(
          nazu,
          ids
        )
      ]);

    console.log(
      '[PERFIL V16] FOTO:',
      photo
        ? 'CARREGADA'
        : 'NÃO CARREGADA'
    );

    const real =
      getRealLevel(ids);

    const nextXp =
      xpNext(real.level);

    const xpPercent =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            real.xp /
            nextXp *
            100
          )
        )
      );

    const stats =
      randomStats();

    const power =
      average(stats);

    const data = {
      name:
        identity.name,

      number:
        identity.displayId,

      bio,

      humor:
        randomHumor(),

      stats,

      power,

      rank:
        rank(power),

      level:
        real.level,

      xp:
        real.xp,

      nextXp,

      xpPercent,

      initials:
        initials(
          identity.name
        )
    };

    let result;

    try {
      result =
        await createProfileGif(
          data,
          photo
        );

      await nazu.sendMessage(
        from,
        {
          video: result.video,

          mimetype:
            'video/mp4',

          fileName:
            'kyara-perfil.mp4',

          gifPlayback: true,

          caption:
            `✨ *KYARA • PERFIL LAVENDER*\n` +
            `💜 ${data.rank} • NÍVEL ${data.level}\n` +
            `⚡ POWER: ${data.power}% • XP ${data.xp}/${data.nextXp}`
        },
        {
          quoted: info
        }
      );
    } finally {
      if (result?.dir) {
        try {
          fs.rmSync(
            result.dir,
            {
              recursive: true,
              force: true
            }
          );
        } catch {}
      }
    }
  } catch (error) {
    console.error(
      '[KYARA PERFIL V16]',
      error
    );

    try {
      await reply(
        '❌ Não foi possível gerar o perfil agora.'
      );
    } catch {}
  }
}

export async function renderPerfilCard({
  nome,
  numero,
  bio,
  humor,
  fotoBuffer
}) {
  const stats =
    randomStats();

  const power =
    average(stats);

  const level =
    getRealLevel([
      numero
    ]);

  const nextXp =
    xpNext(level.level);

  return renderProfileFrame({
    data: {
      name:
        clean(nome, 'Usuário'),

      number:
        numero,

      bio:
        clean(
          bio,
          'Sem bio disponível'
        ),

      humor:
        clean(
          humor,
          'TRANQUILÃO'
        ),

      stats,

      power,

      rank:
        rank(power),

      level:
        level.level,

      xp:
        level.xp,

      nextXp,

      xpPercent:
        Math.min(
          100,
          Math.round(
            level.xp /
            nextXp *
            100
          )
        ),

      initials:
        initials(nome)
    },

    photo:
      fotoBuffer
        ? await loadImage(
            fotoBuffer
          )
        : null,

    phase: 0
  });
}

export async function resetPerfilFoto(id) {
  try {
    const db =
      JSON.parse(
        fs.readFileSync(
          CUSTOM_DB,
          'utf8'
        )
      );

    const key =
      String(id || '');

    const file =
      db[key];

    if (!file) return false;

    const full =
      path.join(
        CUSTOM_DIR,
        file
      );

    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
    }

    delete db[key];

    fs.writeFileSync(
      CUSTOM_DB,
      JSON.stringify(
        db,
        null,
        2
      )
    );

    return true;
  } catch {
    return false;
  }
}

// ============================================================
// IMAGE STUDIO
// ============================================================

function imageTheme(theme) {
  const themes = {
    lavender: {
      bg: '#080511',
      a: '#a78bfa',
      b: '#f0abfc',
      title: 'LAVENDER'
    },

    cyber: {
      bg: '#03080e',
      a: '#22d3ee',
      b: '#60a5fa',
      title: 'CYBER'
    },

    love: {
      bg: '#10050b',
      a: '#f472b6',
      b: '#fb7185',
      title: 'LOVE'
    },

    gold: {
      bg: '#0d0903',
      a: '#f59e0b',
      b: '#facc15',
      title: 'GOLD'
    },

    dark: {
      bg: '#050505',
      a: '#a1a1aa',
      b: '#ffffff',
      title: 'DARK'
    }
  };

  return (
    themes[
      String(theme || '')
        .toLowerCase()
        .trim()
    ] ||
    themes.lavender
  );
}

function drawWrappedCenter(
  ctx,
  value,
  y,
  size,
  maxWidth,
  font
) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';

  ctx.font =
    `900 ${size}px "${font}"`;

  const words =
    clean(
      value,
      'KYARA'
    )
      .slice(0, 220)
      .split(/\s+/);

  const lines = [];
  let line = '';

  for (const word of words) {
    const test =
      line
        ? `${line} ${word}`
        : word;

    if (
      ctx.measureText(test).width <=
      maxWidth
    ) {
      line = test;
    } else {
      if (line) {
        lines.push(line);
      }

      line = word;

      if (lines.length >= 5) {
        break;
      }
    }
  }

  if (
    line &&
    lines.length < 5
  ) {
    lines.push(line);
  }

  const start =
    y -
    (lines.length - 1) *
    32;

  lines.forEach(
    (lineText, index) => {
      ctx.fillText(
        lineText,
        W / 2,
        start +
        index * 64
      );
    }
  );

  ctx.textAlign = 'left';
}

export async function gerarImagemKyara(
  texto,
  tema = 'lavender'
) {
  const f = ensureFont();
  const colors =
    imageTheme(tema);

  const canvas =
    createCanvas(W, H);

  const ctx =
    canvas.getContext('2d');

  ctx.fillStyle =
    colors.bg;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  const gradient =
    ctx.createRadialGradient(
      360,
      250,
      10,
      360,
      650,
      850
    );

  gradient.addColorStop(
    0,
    rgba(colors.a, .38)
  );

  gradient.addColorStop(
    .5,
    rgba(colors.b, .13)
  );

  gradient.addColorStop(
    1,
    rgba(colors.bg, 0)
  );

  ctx.fillStyle = gradient;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  for (let i = 0; i < 70; i++) {
    const x =
      hash(`${texto}:x:${i}`) % W;

    const y =
      hash(`${texto}:y:${i}`) % H;

    ctx.fillStyle =
      rgba(
        i % 2
          ? colors.a
          : colors.b,
        .10 +
        (i % 4) * .025
      );

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      1 + (i % 3),
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.strokeStyle =
    rgba(colors.a, .8);

  ctx.lineWidth = 3;

  rr(
    ctx,
    22,
    22,
    W - 44,
    H - 44,
    28
  );

  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font =
    `900 26px "${f}"`;

  ctx.fillText(
    '♛ KYARA • IMAGE STUDIO',
    52,
    78
  );

  ctx.fillStyle =
    colors.b;

  ctx.font =
    `800 13px "${f}"`;

  ctx.fillText(
    colors.title,
    52,
    105
  );

  ctx.save();

  ctx.shadowColor =
    colors.a;

  ctx.shadowBlur = 30;

  ctx.strokeStyle =
    colors.a;

  ctx.lineWidth = 5;

  ctx.beginPath();

  ctx.arc(
    W / 2,
    360,
    150,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  ctx.restore();

  ctx.strokeStyle =
    colors.b;

  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.arc(
    W / 2,
    360,
    168,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  drawWrappedCenter(
    ctx,
    texto,
    590,
    48,
    600,
    f
  );

  const line =
    ctx.createLinearGradient(
      90,
      0,
      W - 90,
      0
    );

  line.addColorStop(
    0,
    colors.a
  );

  line.addColorStop(
    1,
    colors.b
  );

  ctx.fillStyle = line;

  rr(
    ctx,
    90,
    730,
    W - 180,
    5,
    3
  );

  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font =
    `800 16px "${f}"`;

  ctx.textAlign = 'center';

  ctx.fillText(
    'GERADO PELO CANVAS DA KYARA',
    W / 2,
    820
  );

  ctx.fillStyle =
    rgba(colors.b, .8);

  ctx.font =
    `600 12px "${f}"`;

  ctx.fillText(
    'KYARA • HIGH-TECH IMAGE ENGINE',
    W / 2,
    850
  );

  ctx.textAlign = 'left';

  return canvas.toBuffer(
    'image/png'
  );
}

export async function gerarImagemHandler({
  nazu,
  from,
  info,
  q,
  reply
}) {
  try {
    if (!clean(q)) {
      return reply(
        '🖼️ *KYARA IMAGE STUDIO*\n\n' +
        'Use:\n' +
        '/gerarimg texto | tema\n\n' +
        '🎨 Temas:\n' +
        '• lavender\n' +
        '• cyber\n' +
        '• love\n' +
        '• gold\n' +
        '• dark\n\n' +
        'Exemplo:\n' +
        '/gerarimg KYARA HIGH-TECH | cyber'
      );
    }

    const parts =
      String(q)
        .split('|')
        .map(x => x.trim());

    const texto = parts[0];
    const tema =
      parts[1] || 'lavender';

    if (!texto) {
      return reply(
        '❌ Informe o texto da imagem.'
      );
    }

    const image =
      await gerarImagemKyara(
        texto,
        tema
      );

    await nazu.sendMessage(
      from,
      {
        image,
        mimetype: 'image/png',
        fileName: 'kyara-image.png',
        caption:
          `🖼️ *KYARA • IMAGE STUDIO*\n` +
          `🎨 Tema: ${tema}`
      },
      {
        quoted: info
      }
    );
  } catch (error) {
    console.error(
      '[KYARA IMAGE STUDIO]',
      error
    );

    try {
      await reply(
        '❌ Não consegui gerar a imagem.'
      );
    } catch {}
  }
}
