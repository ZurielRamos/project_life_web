/**
 * Resolución de la tienda a partir del host de la petición. El front se
 * sirve desde Vercel con un dominio comodín (*.dominio.com) y, más adelante,
 * dominios propios; la API decide a qué tienda corresponde cada host.
 */

const API_URL =
  import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000/api';

/** Configuración pública de una tienda (GET /storefront/store). */
export interface StoreConfig {
  slug: string;
  name: string;
  title: string | null;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  socialLinks: Record<string, string | undefined>;
  currency: string;
  locale: string;
  seoTitle: string | null;
  seoDescription: string | null;
  publicUrl: string | null;
}

interface CacheEntry {
  store: StoreConfig | null;
  expiresAt: number;
}

/** Caché en memoria por instancia: evita pegarle a la API en cada request. */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

/**
 * Hosts del sitio principal (no son tiendas): se omite la consulta a la API.
 * STORES_BASE_DOMAIN es el dominio base (ej. "inkttex.com").
 */
function isMainSiteHost(host: string): boolean {
  const base = (
    process.env.STORES_BASE_DOMAIN ??
    import.meta.env.STORES_BASE_DOMAIN ??
    ''
  )
    .trim()
    .toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.vercel.app')) return true;
  if (base && (host === base || host === `www.${base}`)) return true;
  return false;
}

/**
 * Devuelve la tienda asociada al host o null si es el sitio principal, si no
 * existe o si la API falla (en ese caso se sirve el sitio principal).
 */
export async function resolveStoreByHost(
  rawHost: string,
): Promise<StoreConfig | null> {
  const host = rawHost.trim().toLowerCase().replace(/:\d+$/, '');
  if (!host || isMainSiteHost(host)) return null;

  const cached = cache.get(host);
  if (cached && cached.expiresAt > Date.now()) return cached.store;

  try {
    const res = await fetch(
      `${API_URL}/storefront/store?host=${encodeURIComponent(host)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (res.status === 404) {
      cache.set(host, { store: null, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }
    if (!res.ok) {
      console.error(`[store] ${res.status} al resolver host ${host}`);
      return null;
    }
    const store = (await res.json()) as StoreConfig;
    cache.set(host, { store, expiresAt: Date.now() + CACHE_TTL_MS });
    return store;
  } catch (err) {
    console.error('[store] error de red al resolver host:', err);
    return null;
  }
}
