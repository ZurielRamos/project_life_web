// Helper para servir las imágenes de fondo del home ya optimizadas a AVIF en
// LOCAL (ver scripts/convert-bg-avif.mjs). NO hay ninguna transformación en
// runtime: estos archivos estáticos se importan con `?url` y Vite los emite
// con hash al bundle final. Servimos AVIF responsive + un JPG de fallback.

// Mapa { ruta -> URL final hasheada } de todos los AVIF optimizados.
const avifUrls = import.meta.glob<string>(
  '../assets/optimized/*.avif',
  { eager: true, query: '?url', import: 'default' },
);

// Mapa de los JPG de fallback.
const jpgUrls = import.meta.glob<string>(
  '../assets/optimized/*-fallback.jpg',
  { eager: true, query: '?url', import: 'default' },
);

export interface BgSources {
  /** srcset de AVIF (una o varias resoluciones) con sus anchos. */
  avifSrcset: string;
  /** URL del JPG de fallback para navegadores sin soporte AVIF. */
  fallback: string;
}

/**
 * Devuelve el srcset AVIF y el fallback JPG para un nombre base de imagen
 * (p. ej. "bg_hero" o "bg_hero_mobile"). Lee las variantes generadas en
 * src/assets/optimized.
 */
export function bgSources(base: string): BgSources {
  const entries: { url: string; width: number }[] = [];

  for (const [p, url] of Object.entries(avifUrls)) {
    // p === '../assets/optimized/bg_hero-1920.avif'
    const file = p.split('/').pop() ?? '';
    const m = file.match(/^(.+)-(\d+)\.avif$/);
    if (!m) continue;
    const [, name, width] = m;
    if (name !== base) continue;
    entries.push({ url, width: Number(width) });
  }

  entries.sort((a, b) => a.width - b.width);

  const avifSrcset = entries.map((e) => `${e.url} ${e.width}w`).join(', ');

  const fallbackEntry = Object.entries(jpgUrls).find(([p]) =>
    (p.split('/').pop() ?? '').startsWith(`${base}-fallback.jpg`),
  );
  const fallback = fallbackEntry ? fallbackEntry[1] : '';

  return { avifSrcset, fallback };
}
