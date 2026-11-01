// Pre-convierte las imágenes de fondo del home a AVIF (y un JPG de fallback)
// en varios anchos responsive. Se ejecuta EN LOCAL: los resultados son
// archivos estáticos que se sirven tal cual, sin ninguna optimización en
// runtime (ni Sharp en la función ni Vercel Image Optimization).
//
// Uso: node scripts/convert-bg-avif.mjs
//
// Salida: src/assets/optimized/<nombre>-<ancho>.avif  y  <nombre>-fallback.jpg

import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, '..', 'src', 'assets');
const OUT = path.join(ASSETS, 'optimized');

// Anchos responsive según orientación. Desktop = apaisada, Mobile = vertical.
const DESKTOP_WIDTHS = [768, 1280, 1920, 2560];
const MOBILE_WIDTHS = [480, 768, 1080];

// Calidad AVIF (0-100). 50 da muy buena calidad visual con peso bajo.
const AVIF_QUALITY = 50;
// effort 0-9: más alto = mejor compresión pero más lento (solo afecta en local).
const AVIF_EFFORT = 6;
// Ancho del JPG de fallback (navegadores sin AVIF).
const FALLBACK_WIDTH = 1280;
const FALLBACK_QUALITY = 72;

async function main() {
  await mkdir(OUT, { recursive: true });

  const files = (await readdir(ASSETS)).filter(
    (f) => /^bg_.*\.jpg$/i.test(f),
  );

  if (files.length === 0) {
    console.log('No se encontraron imágenes bg_*.jpg en', ASSETS);
    return;
  }

  for (const file of files) {
    const src = path.join(ASSETS, file);
    const base = file.replace(/\.jpg$/i, '');
    const meta = await sharp(src).metadata();
    const isMobile = /_mobile$/i.test(base) || meta.height > meta.width;
    const widths = (isMobile ? MOBILE_WIDTHS : DESKTOP_WIDTHS).filter(
      // No reescalamos hacia arriba del tamaño original.
      (w) => w <= (meta.width ?? Infinity),
    );
    // Garantiza al menos un ancho (el original si es menor que el mínimo).
    if (widths.length === 0) widths.push(meta.width ?? MOBILE_WIDTHS[0]);

    for (const w of widths) {
      const outAvif = path.join(OUT, `${base}-${w}.avif`);
      await sharp(src)
        .resize({ width: w, withoutEnlargement: true })
        .avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT })
        .toFile(outAvif);
      console.log('✓', path.relative(ASSETS, outAvif));
    }

    // JPG de fallback (único, tamaño medio) para navegadores sin AVIF.
    const outJpg = path.join(OUT, `${base}-fallback.jpg`);
    await sharp(src)
      .resize({ width: FALLBACK_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: FALLBACK_QUALITY, mozjpeg: true })
      .toFile(outJpg);
    console.log('✓', path.relative(ASSETS, outJpg));
  }

  console.log('\nListo. Archivos en', path.relative(process.cwd(), OUT));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
