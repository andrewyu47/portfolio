#!/usr/bin/env node
// Generates the two tiling textures that give the page its printed material.
//
//   node scripts/make-textures.mjs
//
// Writes  public/img/paper-grain.png  a faint speckle laid over the whole page (the stock)
//         public/img/ink-mask.png     an alpha mask for solid ink: slightly mottled, with the
//                                     pinholes a risograph drum leaves in large flat areas
//
// The output is deterministic (seeded), so rebuilding never changes the look.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/img');
fs.mkdirSync(outDir, { recursive: true });

// Small seeded generator (mulberry32).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value noise: a coarse random lattice, smoothly interpolated, wrapping at the edges. */
function cloud(size, cells, rand) {
  const lattice = Array.from({ length: cells * cells }, () => rand());
  const at = (x, y) => lattice[(((y % cells) + cells) % cells) * cells + (((x % cells) + cells) % cells)];
  const ease = (t) => t * t * (3 - 2 * t);
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells;
      const fy = (y / size) * cells;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = ease(fx - x0);
      const ty = ease(fy - y0);
      const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
      const bot = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
      out[y * size + x] = top * (1 - ty) + bot * ty;
    }
  }
  return out;
}

// ---- Paper grain: dark specks on transparent, meant to sit over the stock at low opacity.
{
  const size = 256;
  const rand = rng(20261125);
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const r = rand();
    // Most of the sheet is clean. A few fibres are darker, fewer still are lighter.
    let alpha = 0;
    let value = 0;
    if (r > 0.86) alpha = Math.round((r - 0.86) * 300); // dark fibre, up to about 42
    else if (r < 0.05) { value = 255; alpha = Math.round((0.05 - r) * 500); } // light fleck
    buf[i * 4] = value;
    buf[i * 4 + 1] = value;
    buf[i * 4 + 2] = value;
    buf[i * 4 + 3] = alpha;
  }
  const file = path.join(outDir, 'paper-grain.png');
  await sharp(buf, { raw: { width: size, height: size, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);
  console.log(`paper grain: ${path.relative(root, file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
}

// ---- Ink mask: mostly solid, gently mottled, with pinholes.
{
  const size = 512;
  const rand = rng(7041992);
  const low = cloud(size, 6, rand);
  const mid = cloud(size, 28, rand);
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    // Density drifts a little across the drum, and a little more at a finer scale.
    let density = 0.9 + low[i] * 0.07 + mid[i] * 0.06;
    const r = rand();
    if (r > 0.985) density -= 0.55; // a pinhole
    else if (r > 0.94) density -= 0.16; // a thin spot
    const alpha = Math.round(Math.min(1, Math.max(0.3, density)) * 255);
    buf[i * 4] = 255;
    buf[i * 4 + 1] = 255;
    buf[i * 4 + 2] = 255;
    buf[i * 4 + 3] = alpha;
  }
  const file = path.join(outDir, 'ink-mask.png');
  await sharp(buf, { raw: { width: size, height: size, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);
  console.log(`ink mask: ${path.relative(root, file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
}
