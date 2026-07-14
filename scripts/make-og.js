#!/usr/bin/env node
// Generate a sharp, self-contained 1200x630 OG/Twitter share image for a lookbook:
// a gradient masthead with title + subtitle + a cascade of 2-4 real product photos.
//
// Why this exists: hand-rolling the SVG + sharp compositing from scratch cost real time every
// build. This is the template — tweak the CONFIG, drop 2-4 hero JPGs next to it, run it.
//
// Usage:
//   1) Pick 2-4 representative product images (one per bucket reads best). Download them locally
//      (curl the CDN URLs — Shopify/Etsy/BigCommerce/Backcountry all curl fine; SFCC/Patagonia
//      images 404 via curl, so source those from a retailer CDN — see storefront-gotchas.md).
//   2) From a scratch dir:  npm i sharp
//   3) node make-og.js       (writes og.png into OUT_PATH)
//   4) Open og.png to eyeball it; COMMIT the PNG so CI stays a dependency-free static upload.
//
// Edit CONFIG below (or wire argv/JSON in) — keep it a literal so it's obvious what to change.

const sharp = require('sharp');
const fs = require('fs');

const CONFIG = {
  OUT_PATH: process.argv[2] || './og.png',
  W: 1200, H: 630,
  kicker: 'A SHOPPING LOOKBOOK',
  title: ['The Big-Head', 'Hat Lookbook'],              // 1-2 lines, serif, ~92px
  sub: [                                                 // 1-2 lines; wrap <tspan> for an accent word
    ['18 hats, verified live & sorted by whether they come', null],
    ['in a real ', '7¾–8', ' — because no one-size hat fits.'],  // [pre, accent, post]
  ],
  chips: [                                               // {t, fg, bg} — one per bucket/mood
    { t: 'Patagonia-outdoorsy', fg: '#8fb89c', bg: '#233028' },
    { t: 'Crimson Tide',        fg: '#e0a09b', bg: '#33211f' },
    { t: 'irreverent',          fg: '#b6a6e0', bg: '#2a2438' },
  ],
  tiles: ['./outdoor.jpg', './crimson.jpg', './irrev.jpg'],  // 2-4 local product photos
  // palette (dark, warm) — swap to match the page's mood
  bg1: '#20242a', bg2: '#2c2a24', bg3: '#3a3128',
  ink: '#f0ebe1', ink2: '#a99f8e', sub2: '#cfc6b6', accent: '#8fb89c',
  paper: '#faf8f2',
};

async function tile(src, size, paper) {
  const inner = size - 24;
  const img = await sharp(src).resize(inner, inner, { fit: 'contain', background: paper }).toBuffer();
  const round = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="26" fill="${paper}"/></svg>`);
  return sharp(round).composite([{ input: img, top: 12, left: 12 }]).png().toBuffer();
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

(async () => {
  const c = CONFIG, S = 250;
  const tiles = await Promise.all(c.tiles.map(t => tile(t, S, c.paper)));

  const titleSVG = c.title.map((line, i) =>
    `<text x="68" y="${250 + i * 95}" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="92" fill="${c.ink}">${esc(line)}</text>`).join('');
  const subSVG = c.sub.map((parts, i) => {
    const y = 420 + i * 42;
    const inner = parts.length === 3
      ? `${esc(parts[0])}<tspan fill="${c.accent}" font-weight="700">${esc(parts[1])}</tspan>${esc(parts[2])}`
      : esc(parts[0]);
    return `<text x="70" y="${y}" font-family="Helvetica,Arial,sans-serif" font-size="30" fill="${c.sub2}">${inner}</text>`;
  }).join('');
  let cx = 70;
  const chipSVG = c.chips.map(ch => {
    const w = 44 + ch.t.length * 11.5;
    const g = `<rect x="${cx}" y="516" width="${Math.round(w)}" height="46" rx="23" fill="${ch.bg}"/>` +
              `<text x="${cx + 22}" y="545" font-family="Helvetica,Arial,sans-serif" font-size="21" font-weight="700" fill="${ch.fg}">${esc(ch.t)}</text>`;
    cx += w + 16;
    return g;
  }).join('');

  const bg = Buffer.from(`
  <svg width="${c.W}" height="${c.H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c.bg1}"/><stop offset="0.55" stop-color="${c.bg2}"/><stop offset="1" stop-color="${c.bg3}"/>
      </linearGradient>
      <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${c.accent}"/><stop offset="0.5" stop-color="#d7b877"/><stop offset="1" stop-color="#c98a86"/>
      </linearGradient>
    </defs>
    <rect width="${c.W}" height="${c.H}" fill="url(#g)"/>
    <rect x="0" y="0" width="${c.W}" height="8" fill="url(#acc)"/>
    <text x="70" y="150" font-family="Georgia,serif" font-size="30" fill="${c.ink2}" letter-spacing="4">${esc(c.kicker)}</text>
    ${titleSVG}${subSVG}${chipSVG}
  </svg>`);

  // cascade the tiles down the right edge
  const positions = [{ top: 70, left: 900 }, { top: 195, left: 830 }, { top: 330, left: 900 }, { top: 455, left: 830 }];
  const composite = tiles.map((input, i) => ({ input, top: positions[i].top, left: positions[i].left }));

  await sharp(bg).composite(composite).png().toFile(c.OUT_PATH);
  console.log('og.png written:', fs.statSync(c.OUT_PATH).size, 'bytes ->', c.OUT_PATH);
})();
