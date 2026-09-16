import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(scriptDir, '..');
const source = path.join(clientDir, 'public', 'zap-icon.svg');
const outputDir = path.join(clientDir, 'public', 'icons');

await fs.mkdir(outputDir, { recursive: true });

const assets = [
  ['icon-48.png', 48],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-512-maskable.png', 512],
  ['store-logo-300.png', 300],
];

for (const [filename, size] of assets) {
  await sharp(source)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(path.join(outputDir, filename));
}

console.log(`Generated ${assets.length} ZF brand assets in ${path.relative(clientDir, outputDir)}.`);
