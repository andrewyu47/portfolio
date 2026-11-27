#!/usr/bin/env node
// Turns a photograph into a one-ink print, the way make-portrait.mjs does for the headshot.
//
//   node scripts/make-photo.mjs [--preview]
//
// Reads   src/assets/room-capstone-source.jpg   (a frame from the session recording)
//         src/assets/room-skill-demo-source.jpg (a frame from another session, screen blurred)
// Writes  public/img/<name>.png                 (white on transparent: used as a CSS mask,
//                                                so the ink color follows the tokens)
// With --preview it also writes .shots/photo-preview-<name>.png in the site's two inks.
//
// Two layers make each plate. Tone is carried by a halftone screen. Fine detail that a
// screen would lose (the words on the slide) is printed as line work: solid ink where the
// picture is nearly black, bare stock where small bright shapes sit inside a dark area.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src/assets/room-capstone-source.jpg');
const SKILL_SRC = path.join(root, 'src/assets/room-skill-demo-source.jpg');

/**
 * One entry per print. `crop` is in source pixels. `pink` is the flat pink disc printed
 * under the instructor: centre and radius as fractions of the print's width and height
 * (the radius is a fraction of the width). Photo.astro places the same disc in CSS.
 */
const PRINTS = [
  { name: 'room-capstone', crop: { left: 0, top: 20, width: 1920, height: 1000 }, width: 2000, cell: 7, pink: { cx: 0.9125, cy: 0.47, r: 0.086 } },
  { name: 'room-capstone-tight', crop: { left: 700, top: 40, width: 1220, height: 840 }, width: 1220, cell: 6, pink: { cx: 0.862, cy: 0.535, r: 0.136 } },
  // A second room, from the Skill demo on the first morning. The source frame was cropped and
  // its screen blurred before it was saved, so the people seated in front are not in the file.
  { name: 'room-skill-demo', src: SKILL_SRC, crop: { left: 0, top: 0, width: 1420, height: 770 }, width: 1600, cell: 7, gamma: 0.36, pink: { cx: 0.868, cy: 0.45, r: 0.085 } },
];

const ANGLE = (45 * Math.PI) / 180;
const clamp = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, t) => {
  const k = clamp((t - a) / (b - a));
  return k * k * (3 - 2 * k);
};
// The room was dim, so lift the middle tones before screening: the wall prints as a
// middle tone, concrete and skin print light, and only the display prints solid.
// How far to lift the middle tones. Each print may set its own `gamma`: a darker room needs a
// lower number, or the wall prints solid and the figure disappears into it.
let GAMMA = 0.55;
const lift = (l) => Math.pow(l, GAMMA);
const coverage = (l) => Math.pow(clamp((1 - lift(l) - 0.1) / 0.72), 1.3);

async function makePrint({ name, src = SRC, crop, width, cell, pink, gamma = 0.55 }) {
  GAMMA = gamma;
  const height = Math.round((width * crop.height) / crop.width);
  const base = sharp(src).extract(crop).resize(width, height).grayscale().normalise();
  const fine = await base.clone().sharpen({ sigma: 1 }).raw().toBuffer();
  const soft = await base.clone().blur(cell * 0.45).raw().toBuffer();
  const area = await base.clone().blur(cell * 2.5).raw().toBuffer();
  const W = width;
  const H = height;
  const at = (buf, x, y) => buf[Math.min(H - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x)))] / 255;

  const cos = Math.cos(ANGLE);
  const sin = Math.sin(ANGLE);
  const maxR = cell * 0.74;
  const out = Buffer.alloc(W * H * 4);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x * cos + y * sin;
      const v = -x * sin + y * cos;
      const iu = Math.round(u / cell);
      const iv = Math.round(v / cell);
      let alpha = 0;
      for (let du = -1; du <= 1; du++) {
        for (let dv = -1; dv <= 1; dv++) {
          const cu = (iu + du) * cell;
          const cv = (iv + dv) * cell;
          const amount = coverage(at(soft, cu * cos - cv * sin, cu * sin + cv * cos));
          if (amount < 0.03) continue;
          const a = clamp(maxR * Math.sqrt(amount) - Math.hypot(u - cu, v - cv) + 0.6);
          if (a > alpha) alpha = a;
        }
      }
      // Line work: near-black prints solid, and bright detail inside a dark area stays bare.
      const lf = lift(at(fine, x, y));
      const dark = smooth(0.5, 0.66, 1 - lift(at(area, x, y)));
      alpha = Math.max(alpha, smooth(0.68, 0.8, 1 - lf) * dark);
      alpha *= 1 - smooth(0.55, 0.75, lf) * dark;

      const o = (y * W + x) * 4;
      out[o] = 255;
      out[o + 1] = 255;
      out[o + 2] = 255;
      out[o + 3] = Math.round(alpha * 255);
    }
  }

  const file = path.join(root, 'public/img', `${name}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 9, palette: true, colours: 16 })
    .toFile(file);
  console.log(`print mask: ${path.relative(root, file)} ${W}x${H} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);

  if (process.argv.includes('--preview')) {
    const STOCK = [0xed, 0xef, 0xea];
    const TEAL = [0x0b, 0x5f, 0x69];
    const PINK = [0xff, 0x4f, 0xa3];
    const prev = Buffer.alloc(W * H * 3);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const onPink = Math.hypot(x - pink.cx * W, y - pink.cy * H) <= pink.r * W;
        const under = STOCK.map((c, i) => (onPink ? (c * PINK[i]) / 255 : c));
        const a = out[(y * W + x) * 4 + 3] / 255;
        const o = (y * W + x) * 3;
        for (let i = 0; i < 3; i++) prev[o + i] = Math.round(under[i] + ((under[i] * TEAL[i]) / 255 - under[i]) * a);
      }
    }
    const p = path.join(root, '.shots', `photo-preview-${name}.png`);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    await sharp(prev, { raw: { width: W, height: H, channels: 3 } }).resize(Math.round(W / 2)).png().toFile(p);
    console.log(`preview: ${path.relative(root, p)}`);
  }
}

for (const print of PRINTS) await makePrint(print);
