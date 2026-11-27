#!/usr/bin/env node
// Turns the headshot into a one-ink halftone, the way a risograph would print it.
//
//   node scripts/make-portrait.mjs [--preview]
//
// Reads   src/assets/portrait-source.jpg   (square crop of the headshot)
// Writes  public/img/portrait-halftone.png (white dots on transparent: used as a CSS mask,
//                                            so the ink color follows the theme)
// With --preview it also writes .shots/portrait-preview.png, composited in the site's two inks.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src/assets/portrait-source.jpg');
const OUT = path.join(root, 'public/img/portrait-halftone.png');

const SIZE = 1120; // output pixels, square
const CELL = 11; // halftone cell in output pixels
const ANGLE = (45 * Math.PI) / 180; // classic screen angle for a single ink
const MAX_R = CELL * 0.74; // radius at full black: dots just merge

// Where the face sits in the source crop (0..1), and how far the picture holds
// before it fades to bare paper. The fade drops the busy background and the jacket.
const FACE = { x: 0.5, y: 0.487 };
const HOLD = { rx: 0.235, ry: 0.36 };
const FADE = 1.75; // paper is reached at HOLD * FADE
const CLIP = 0.492; // the print is trimmed to a circle of this radius (of SIZE)

const smooth = (a, b, t) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

// Tone curve: skin prints light, hair and glasses print solid.
const curve = (l) => Math.pow(Math.min(1, Math.max(0, (l - 0.05) / 0.8)), 0.5);

// Luminance at a point, lifted toward paper the further it is from the face.
const tone = (l, x, y) => {
  const d = Math.hypot((x / SIZE - FACE.x) / HOLD.rx, (y / SIZE - FACE.y) / HOLD.ry);
  const paper = smooth(1, FADE, d);
  const t = curve(l);
  return t + (1 - t) * paper;
};

const base = sharp(SRC).resize(SIZE, SIZE, { fit: 'cover' }).grayscale().normalise();
// Blur by roughly half a cell so each dot samples the average tone of its own cell.
const { data: lum, info } = await base.clone().blur(CELL * 0.45).raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const ch = info.channels;

const cos = Math.cos(ANGLE);
const sin = Math.sin(ANGLE);

const sample = (x, y) => {
  const xi = Math.min(W - 1, Math.max(0, Math.round(x)));
  const yi = Math.min(H - 1, Math.max(0, Math.round(y)));
  return lum[(yi * W + xi) * ch] / 255;
};

/**
 * Rasterise one screen. `coverage(x, y)` says how much ink a cell centred there
 * should carry, from 0 (bare stock) to 1 (solid).
 */
function screen(coverage) {
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Into the rotated screen's coordinates.
      const u = x * cos + y * sin;
      const v = -x * sin + y * cos;
      let alpha = 0;
      const iu = Math.round(u / CELL);
      const iv = Math.round(v / CELL);
      // Check the cell and its neighbours: big dots reach into the next cell.
      for (let du = -1; du <= 1; du++) {
        for (let dv = -1; dv <= 1; dv++) {
          const cu = (iu + du) * CELL;
          const cv = (iv + dv) * CELL;
          const cx = cu * cos - cv * sin;
          const cy = cu * sin + cv * cos;
          const amount = coverage(cx, cy);
          if (amount < 0.035) continue; // stock stays stock
          const r = MAX_R * Math.sqrt(amount);
          const d = Math.hypot(u - cu, v - cv);
          const a = Math.min(1, Math.max(0, r - d + 0.6));
          if (a > alpha) alpha = a;
        }
      }
      // Trim to a circle, with a one-pixel soft edge.
      alpha *= Math.min(1, Math.max(0, CLIP * SIZE - Math.hypot(x - SIZE / 2, y - SIZE / 2) + 0.5));
      const o = (y * W + x) * 4;
      buf[o] = 255;
      buf[o + 1] = 255;
      buf[o + 2] = 255;
      buf[o + 3] = Math.round(alpha * 255);
    }
  }
  return buf;
}

async function write(buf, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 9, palette: true, colours: 16 })
    .toFile(file);
  console.log(`halftone mask: ${path.relative(root, file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
}

// Light paper: dark ink prints the shadows.
const out = screen((x, y) => 1 - tone(sample(x, y), x, y));
await write(out, OUT);

// Dark paper: light ink prints the highlights, and the fade runs to bare dark stock.
const night = screen((x, y) => {
  const d = Math.hypot((x / SIZE - FACE.x) / HOLD.rx, (y / SIZE - FACE.y) / HOLD.ry);
  return curve(sample(x, y)) * (1 - smooth(1, FADE, d)) * 0.92;
});
await write(night, OUT.replace('.png', '-night.png'));

if (process.argv.includes('--preview')) {
  const STOCK = { r: 0xed, g: 0xef, b: 0xea };
  const TEAL = { r: 0x0b, g: 0x5f, b: 0x69 };
  const PINK = { r: 0xff, g: 0x4f, b: 0xa3 };
  const prev = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Pink plate: a solid disc, slightly off-centre, printed under the teal.
      const inDisc = Math.hypot(x - W * 0.53, y - H * 0.52) < W * 0.46;
      let r = STOCK.r, g = STOCK.g, b = STOCK.b;
      if (inDisc) { r = (r * PINK.r) / 255; g = (g * PINK.g) / 255; b = (b * PINK.b) / 255; }
      const a = out[(y * W + x) * 4 + 3] / 255;
      // Multiply the teal dot over whatever is underneath.
      const tr = (r * TEAL.r) / 255, tg = (g * TEAL.g) / 255, tb = (b * TEAL.b) / 255;
      const o = (y * W + x) * 3;
      prev[o] = Math.round(r + (tr - r) * a);
      prev[o + 1] = Math.round(g + (tg - g) * a);
      prev[o + 2] = Math.round(b + (tb - b) * a);
    }
  }
  const p = path.join(root, '.shots/portrait-preview.png');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  await sharp(prev, { raw: { width: W, height: H, channels: 3 } }).resize(560, 560).png().toFile(p);
  console.log(`preview: ${path.relative(root, p)}`);
}
