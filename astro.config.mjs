// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// URL base del sitio (sin barra final) para URLs absolutas (canonical, OG,
// Twitter). Si está definida PUBLIC_SITE_URL la usamos como `site`; si NO,
// dejamos `site` sin definir para que el Layout construya las URLs a partir
// del origen real de la request (evita apuntar a un dominio equivocado).
const SITE_URL = process.env.PUBLIC_SITE_URL;

// https://astro.build/config
export default defineConfig({
  ...(SITE_URL ? { site: SITE_URL } : {}),
  output: 'server',
  // Sin servicio de optimización de imágenes en runtime: las imágenes del home
  // y el banner se pre-convierten a AVIF EN LOCAL (ver scripts/convert-bg-avif.mjs)
  // y se sirven como archivos estáticos con hash desde la CDN, sin transcodificar
  // en la función serverless en cada request.
  adapter: vercel(),
});
