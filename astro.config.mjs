// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// URL base del sitio (sin barra final). Se usa para construir URLs absolutas
// (canonical, Open Graph, Twitter Cards). Configúrala en producción con la
// variable de entorno PUBLIC_SITE_URL (p. ej. https://www.inkttex.com).
const SITE_URL = process.env.PUBLIC_SITE_URL ?? 'https://www.inkttex.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: 'server',
  // Sin servicio de optimización de imágenes en runtime: las imágenes del home
  // y el banner se pre-convierten a AVIF EN LOCAL (ver scripts/convert-bg-avif.mjs)
  // y se sirven como archivos estáticos con hash desde la CDN, sin transcodificar
  // en la función serverless en cada request.
  adapter: vercel(),
});
