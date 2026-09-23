// Generates brand imagery (docs/DESIGN.md §5).
//   public/hero-wave.jpg  1440x810 — oscilloscope key visual (v3: multi-channel + crosshair + cursors)
//   public/og-main.png    1200x630 — social card
// Run: node scripts/gen-art.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// ── Lissajous curve path ──────────────────────────────────────
function lissajous({ cx, cy, ax, ay, fx, fy, phase, points = 1400 }) {
  let d = '';
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2;
    const x = cx + ax * Math.sin(fx * t + phase);
    const y = cy + ay * Math.sin(fy * t);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return d;
}

function scopeLayers(cx, cy, rx, ry, phase, o) {
  const opts = { cx, cy, ax: rx, ay: ry, phase };
  const sharpPath = lissajous(opts);
  const glowPath = lissajous({ ...opts, points: 700 });
  return `
    <path d="${glowPath}" fill="none" stroke="#00FFA3" stroke-opacity="${o * 0.5}" stroke-width="10" filter="url(#blur)"/>
    <path d="${sharpPath}" fill="none" stroke="#CCFFE9" stroke-opacity="${o}" stroke-width="2"/>`;
}

// ── shared defs & texture ─────────────────────────────────────
function defs(W, H) {
  return `<defs>
    <filter id="blur" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="1.4" fill="#000" opacity="0.5"/>
    </pattern>
    <pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse">
      <path d="M72 0H0V72" fill="none" stroke="#1B2026" stroke-width="1"/>
    </pattern>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.4"/>
    </radialGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  </defs>`;
}

function texture(W, H) {
  return `
    <rect width="${W}" height="${H}" fill="url(#scan)" opacity="0.18"/>
    <rect width="${W}" height="${H}" fill="url(#grid)"/>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.04"/>
    <rect width="${W}" height="${H}" fill="url(#vig)" opacity="0.7"/>`;
}

const HUD = `
  font-family="JetBrains Mono, DejaVu Sans Mono, Menlo, monospace" fill="#5A6470" font-size="15" letter-spacing="2"`;

// ── instrument layers: crosshair + measurement cursors ───────
function crosshair(cx, cy, W, H) {
  return `
  <g stroke="#20262E" stroke-width="1" stroke-dasharray="2 6">
    <line x1="90" y1="${cy}" x2="${W - 90}" y2="${cy}"/>
    <line x1="${cx}" y1="80" x2="${cx}" y2="${H - 80}"/>
  </g>
  <g stroke="#2A313B" stroke-width="1">
    <circle cx="${cx}" cy="${cy}" r="5" fill="none"/>
    <line x1="${cx - 12}" y1="${cy}" x2="${cx - 5}" y2="${cy}"/>
    <line x1="${cx + 5}" y1="${cy}" x2="${cx + 12}" y2="${cy}"/>
    <line x1="${cx}" y1="${cy - 12}" x2="${cx}" y2="${cy - 5}"/>
    <line x1="${cx}" y1="${cy + 5}" x2="${cx}" y2="${cy + 12}"/>
  </g>`;
}

function cursors(xA, xB, yTop, yBottom, delta) {
  const mid = (xA + xB) / 2;
  return `
  <g stroke="#39414D" stroke-width="1" stroke-dasharray="3 5">
    <line x1="${xA}" y1="${yTop}" x2="${xA}" y2="${yBottom}"/>
    <line x1="${xB}" y1="${yTop}" x2="${xB}" y2="${yBottom}"/>
  </g>
  <text x="${xA}" y="${yTop - 10}" text-anchor="middle" ${HUD}>A</text>
  <text x="${xB}" y="${yTop - 10}" text-anchor="middle" ${HUD}>B</text>
  <text x="${mid}" y="${yTop - 10}" text-anchor="middle" font-family="JetBrains Mono, DejaVu Sans Mono, Menlo, monospace" fill="#00FFA3" fill-opacity="0.8" font-size="15" letter-spacing="2">${delta}</text>`;
}

// ── hero: 1440x810 ────────────────────────────────────────────
const HW = 1440, HH = 810;
const cx = HW / 2, cy = HH / 2 + 10;
const heroSvg = `<svg width="${HW}" height="${HH}" viewBox="0 0 ${HW} ${HH}" xmlns="http://www.w3.org/2000/svg">
  ${defs(HW, HH)}
  <rect width="${HW}" height="${HH}" fill="#0A0C0F"/>
  ${crosshair(cx, cy, HW, HH)}
  <g>
    ${scopeLayers(cx, cy, 520, 300, Math.PI / 2, 1.0)}
    <path d="${lissajous({ cx, cy, ax: 430, ay: 250, fx: 5, fy: 4, phase: Math.PI / 4, points: 1100 })}"
      fill="none" stroke="#00E896" stroke-opacity="0.45" stroke-width="1.2"/>
    <path d="${lissajous({ cx, cy, ax: 300, ay: 185, fx: 2, fy: 3, phase: Math.PI / 3, points: 900 })}"
      fill="none" stroke="#00FFA3" stroke-opacity="0.35" stroke-width="1.2"/>
  </g>
  ${cursors(cx - 268, cx + 312, 78, HH - 78, 'Δ 12.4 ms')}
  <!-- scope ticks -->
  <g stroke="#2A313B" stroke-width="1">
    ${Array.from({ length: 29 }, (_, i) => `<line x1="${(cx - 560) + i * 40}" y1="${cy - 4}" x2="${(cx - 560) + i * 40}" y2="${cy + (i % 7 === 0 ? 8 : 4)}"/>`).join('')}
  </g>
  <!-- HUD labels -->
  <text x="44" y="52" ${HUD}>CH1 · x1zz</text>
  <text x="${HW - 44}" y="52" ${HUD} text-anchor="end">500 mV / div</text>
  <text x="44" y="${HH - 36}" ${HUD}>5 ms / div</text>
  <text x="${HW - 44}" y="${HH - 36}" ${HUD} text-anchor="end">TRIG ●</text>
  ${texture(HW, HH)}
</svg>`;

// ── og: 1200x630 ──────────────────────────────────────────────
const OW = 1200, OH = 630;
const ogSvg = `<svg width="${OW}" height="${OH}" viewBox="0 0 ${OW} ${OH}" xmlns="http://www.w3.org/2000/svg">
  ${defs(OW, OH)}
  <rect width="${OW}" height="${OH}" fill="#0A0C0F"/>
  ${cursors(300, 560, 96, OH - 96, 'Δ 12.4 ms')}
  <g>
    <path d="${lissajous({ cx: OW + 140, cy: OH - 60, ax: 620, ay: 420, fx: 3, fy: 2, phase: Math.PI / 2, points: 1300 })}"
      fill="none" stroke="#00FFA3" stroke-opacity="0.18" stroke-width="6" filter="url(#blur)"/>
    <path d="${lissajous({ cx: OW + 140, cy: OH - 60, ax: 620, ay: 420, fx: 3, fy: 2, phase: Math.PI / 2, points: 1400 })}"
      fill="none" stroke="#7DFFCB" stroke-opacity="0.4" stroke-width="1.3"/>
    <path d="${lissajous({ cx: -80, cy: 40, ax: 460, ay: 300, fx: 5, fy: 4, phase: Math.PI / 4, points: 1000 })}"
      fill="none" stroke="#00CC82" stroke-opacity="0.25" stroke-width="1.1"/>
  </g>
  <rect x="0" y="0" width="${OW}" height="4" fill="#00FFA3"/>
  <text x="80" y="250" font-family="JetBrains Mono, DejaVu Sans Mono, Menlo, monospace" font-size="110" font-weight="800" fill="#F2F4F8" letter-spacing="-4">x1zz<tspan fill="#00FFA3">.</tspan></text>
  <text x="84" y="316" font-family="JetBrains Mono, DejaVu Sans Mono, Menlo, monospace" font-size="25" fill="#97A0B0">compilers · type systems · data infrastructure in Rust</text>
  <text x="84" y="540" ${HUD}>x1zz.com</text>
  ${texture(OW, OH)}
</svg>`;

await mkdir('public', { recursive: true });
await sharp(Buffer.from(heroSvg)).jpeg({ quality: 84, mozjpeg: true }).toFile('public/hero-wave.jpg');
await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9, palette: true }).toFile('public/og-main.png');
console.log('public/hero-wave.jpg + public/og-main.png written');
