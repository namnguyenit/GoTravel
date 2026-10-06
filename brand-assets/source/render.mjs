// Render the original vectors. Requires the existing frontend sharp dependency.
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir, readdir } from 'node:fs/promises';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(root, 'front_end/package.json'));
const sharp = require('sharp');
const { brands } = JSON.parse(await readFile(join(root, 'brand-assets/source/brands.json'), 'utf8'));
for (const brand of brands) {
  const dir = join(root, 'brand-assets/exports', brand.key);
  for (const size of [32, 64, 180]) await sharp(join(dir, `${brand.key}-icon.svg`)).resize(size, size).png().toFile(join(dir, `${brand.key}-icon-${size}.png`));
  for (const variant of ['symbol', 'symbol-black', 'symbol-white']) await sharp(join(dir, `${brand.key}-${variant}.svg`)).resize(512, 512).png().toFile(join(dir, `${brand.key}-${variant}-512.png`));
  for (const variant of ['lockup', 'lockup-black', 'lockup-white']) await sharp(join(dir, `${brand.key}-${variant}.svg`)).resize({ width: 1200 }).png().toFile(join(dir, `${brand.key}-${variant}-1200.png`));
}
await sharp(join(root, 'brand-assets/brand-family.svg')).png().toFile(join(root, 'brand-assets/brand-family.png'));
// Application SVGs and small app icons; large print assets stay in the export kit.
for (const app of ['front_end', 'auth_front-end', 'payment_portal']) {
  const dir = join(root, app, 'public/brand'); await mkdir(dir, { recursive: true });
  for (const brand of brands) for (const file of await readdir(join(root, 'brand-assets/exports', brand.key))) {
    if (file.endsWith('.svg') || /-icon-(32|180)\.png$/.test(file)) {
      const data = await readFile(join(root, 'brand-assets/exports', brand.key, file));
      await import('node:fs/promises').then(fs => fs.writeFile(join(dir, file), data));
    }
  }
}
console.log('Transparent PNG, SVG and application logo assets exported.');
