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
  adapter: vercel({
    // Reflejamos la preferencia de formatos (AVIF primero, WebP de respaldo)
    // también en la config de imágenes de Vercel, por si algún asset llegara
    // a optimizarse por su API.
    imagesConfig: {
      formats: ['image/avif', 'image/webp'],
      sizes: [320, 480, 640, 768, 1024, 1280, 1536, 1920, 2560],
      minimumCacheTTL: 31536000,
    },
  }),
  image: {
    // Usamos el servicio Sharp propio de Astro (en vez del de Vercel) para que
    // respete el formato solicitado por imagen y genere AVIF real tanto en dev
    // como en build. Ajustamos la calidad de AVIF para un buen equilibrio
    // peso/calidad.
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: false,
      },
    },
  },
});
