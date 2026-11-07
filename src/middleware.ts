import { defineMiddleware } from 'astro:middleware';
import { resolveStoreByHost } from './lib/store';

/**
 * Detecta la tienda según el host (subdominio o dominio propio) y la deja en
 * `Astro.locals.store`. Si el host es el sitio principal, `store` es null y
 * todo se comporta como antes.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Detrás de Vercel el host original llega en x-forwarded-host.
  const host =
    context.request.headers.get('x-forwarded-host') ?? context.url.host;
  context.locals.store = await resolveStoreByHost(host);
  return next();
});
