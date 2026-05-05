// Convert PNGs (and JPGs) under web/public/ to .webp in-place.
// Quality 82 — visually identical to PNG for our hero photography but
// roughly 10-15% the file size. Resizes anything wider than 2000px.
//
// Usage:
//   node scripts/convert-images.mjs
//   node scripts/convert-images.mjs --keep-original   (don't delete sources)

import { readdir, stat, unlink } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const KEEP = process.argv.includes("--keep-original");
const MAX_WIDTH = 2000;
const QUALITY = 82;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let originalBytes = 0;
let outputBytes = 0;
let count = 0;

for await (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase();
  if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg") continue;

  const out = file.replace(/\.(png|jpe?g)$/i, ".webp");
  const srcStat = await stat(file);
  originalBytes += srcStat.size;

  const meta = await sharp(file).metadata();
  const pipeline = sharp(file);
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }
  await pipeline.webp({ quality: QUALITY, effort: 4 }).toFile(out);

  const outStat = await stat(out);
  outputBytes += outStat.size;
  count++;

  const ratio = ((outStat.size / srcStat.size) * 100).toFixed(1);
  const rel = file.slice(ROOT.length + 1).replace(/\\/g, "/");
  console.log(
    `  ${rel} → ${rel.replace(/\.(png|jpe?g)$/i, ".webp")}  (${kb(srcStat.size)} → ${kb(outStat.size)}, ${ratio}%)`
  );

  if (!KEEP) await unlink(file);
}

console.log(
  `\nConverted ${count} files: ${kb(originalBytes)} → ${kb(outputBytes)} (${((outputBytes / originalBytes) * 100).toFixed(1)}%).${KEEP ? " (kept originals)" : ""}`
);

function kb(b) {
  if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}
