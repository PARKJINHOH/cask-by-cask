import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputDir = path.join(__dirname, '../public/images');

const IMAGES = ['cognac-category', 'etc-category', 'whisky-category', 'wine-category'];
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 82;
const PNG_QUALITY = 80;

async function getSize(filePath) {
  const s = await stat(filePath);
  return (s.size / 1024).toFixed(1) + ' KB';
}

for (const name of IMAGES) {
  const input = path.join(inputDir, `${name}.png`);
  const outWebP = path.join(inputDir, `${name}.webp`);
  const outPng = path.join(inputDir, `${name}.png`); // overwrite original

  const beforeSize = await getSize(input);

  // WebP 변환 (주 포맷)
  await sharp(input)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outWebP);

  // PNG 최적화 (fallback용 — 원본 덮어쓰기)
  const tmpBuffer = await sharp(input)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .png({ quality: PNG_QUALITY, compressionLevel: 9 })
    .toBuffer();

  await sharp(tmpBuffer).toFile(outPng);

  const afterWebP = await getSize(outWebP);
  const afterPng = await getSize(outPng);

  console.log(`${name}`);
  console.log(`  원본 PNG : ${beforeSize}`);
  console.log(`  최적화 PNG : ${afterPng}`);
  console.log(`  WebP    : ${afterWebP}`);
  console.log('');
}
