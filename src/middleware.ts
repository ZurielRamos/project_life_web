import { defineMiddleware } from 'astro:middleware';
import { resolveStoreByHost } from './lib/store';
import { renderStoreErrorPage } from './lib/store-error-page';

/**
 * Detecta la tienda según el host (subdominio o dominio propio) y la deja en
 * `Astro.locals.store`. Todo el sitio es de tiendas: un host sin tienda
 * asociada responde 404. Solo en desarrollo/previews `store` puede ser null.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Detrás de Vercel el host original llega en x-forwarded-host.
  const host =
    context.request.headers.get('x-forwarded-host') ?? context.url.host;
  const resolution = await resolveStoreByHost(host);

  switch (resolution.kind) {
    case 'store':
      context.locals.store = resolution.store;
      return next();
    case 'default':
      context.locals.store = null;
      return next();
    case 'not-found':
      return renderStoreErrorPage({ status: 404, host });
    case 'error':
      return renderStoreErrorPage({ status: 503, host });
  }
});
