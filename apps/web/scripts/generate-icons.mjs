import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../packages/core/package.json",
  ),
);
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const markPath = resolve(root, "public/brand/lyvora-mark.png");
const publicDir = resolve(root, "public");
const appDir = resolve(root, "src/app");
mkdirSync(publicDir, { recursive: true });
mkdirSync(appDir, { recursive: true });

const BG = "#fbf8fc";

async function writeIcon(dest, size, padRatio) {
  const img = await loadImage(markPath);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, size, size);
  const pad = Math.round(size * padRatio);
  const box = size - pad * 2;
  const scale = Math.min(box / img.width, box / img.height);
  const width = img.width * scale;
  const height = img.height * scale;
  ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
  writeFileSync(dest, canvas.toBuffer("image/png"));
}

await writeIcon(resolve(publicDir, "favicon-32.png"), 32, 0.08);
await writeIcon(resolve(publicDir, "icon-192.png"), 192, 0.12);
await writeIcon(resolve(publicDir, "icon-512.png"), 512, 0.18);
await writeIcon(resolve(appDir, "icon.png"), 48, 0.08);
await writeIcon(resolve(appDir, "apple-icon.png"), 180, 0.12);
console.log("icons ok");
