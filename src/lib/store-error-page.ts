import logoSvg from '../assets/logo-inkttex.svg?raw';

/** Escapa texto para insertarlo de forma segura en HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Mismo número que usa el detalle de producto cuando no hay variable definida.
const FALLBACK_WHATSAPP = '573207104999';

const WHATSAPP_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.511-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"/></svg>';

interface ErrorPageOptions {
  status: 404 | 503;
  /** Host solicitado; se muestra y se incluye en el mensaje de WhatsApp. */
  host: string;
}

/**
 * Página para hosts de tienda que no se pueden servir:
 * - 404: la tienda no existe o no está registrada, con un botón de WhatsApp
 *   para solicitarla.
 * - 503: error temporal al consultar la API.
 */
export function renderStoreErrorPage({
  status,
  host,
}: ErrorPageOptions): Response {
  // Solo mostramos hosts bien formados; el resto se trata como genérico.
  const cleanHost = host.split(',')[0].trim().replace(/:\d+$/, '');
  const safeHost = /^[a-z0-9.-]{1,100}$/i.test(cleanHost)
    ? cleanHost.toLowerCase()
    : '';
  const hostHtml = safeHost ? `<strong>${escapeHtml(safeHost)}</strong>` : '';

  const phone = (
    import.meta.env.PUBLIC_WHATSAPP_PHONE ?? FALLBACK_WHATSAPP
  ).replace(/\D/g, '');
  const message = safeHost
    ? `Hola, quiero solicitar la tienda ${safeHost}`
    : 'Hola, quiero solicitar una tienda';
  const whatsappHref = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  const siteUrl = import.meta.env.PUBLIC_SITE_URL;

  const is404 = status === 404;
  const title = is404 ? 'Esta tienda no existe' : 'Tienda no disponible';
  const body = is404
    ? `${hostHtml ? `La tienda ${hostHtml}` : 'La tienda a la que intentas acceder'} no existe o todavía no está registrada. ¿Quieres tenerla? Escríbenos y la solicitas.`
    : 'No pudimos cargar la tienda en este momento. Inténtalo de nuevo en unos minutos.';

  const action =
    is404 && phone
      ? `<a class="btn" href="${escapeHtml(whatsappHref)}" target="_blank" rel="noopener noreferrer">${WHATSAPP_ICON}Solicitar esta tienda por WhatsApp</a>`
      : '';
  const home = siteUrl
    ? `<a class="link" href="${escapeHtml(siteUrl)}">Ir a Inkttex</a>`
    : '';

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0b;color:#fff;font-family:'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif;padding:24px}
  main{width:100%;max-width:460px;text-align:center}
  .logo{display:block;width:140px;margin:0 auto 32px}
  .logo svg{width:100%;height:auto;display:block}
  .logo .st0{fill:#fff}
  h1{font-size:1.75rem;line-height:1.2;margin:0 0 12px}
  p{margin:0 0 28px;color:rgba(255,255,255,.75);line-height:1.6;overflow-wrap:anywhere}
  p strong{color:#fff}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:#25d366;color:#0b0b0b;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:999px;min-height:48px}
  .btn:hover{background:#3be07a}
  .link{display:block;margin-top:20px;color:rgba(255,255,255,.7);font-size:.9rem}
  .btn:focus-visible,.link:focus-visible{outline:3px solid #01b7bb;outline-offset:3px}
</style>
</head>
<body>
<main>
<span class="logo" role="img" aria-label="Inkttex">${logoSvg}</span>
<h1>${title}</h1>
<p>${body}</p>
${action}
${home}
</main>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      // Sin caché en el CDN: si se crea la tienda, debe verse enseguida.
      'Cache-Control': 'no-store',
    },
  });
}
