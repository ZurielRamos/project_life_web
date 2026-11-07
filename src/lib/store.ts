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

/** Resultado de resolver el host de una petición. */
export type HostResolution =
  /** Sitio principal (no es una tienda). */
  | { kind: 'main' }
  | { kind: 'store'; store: StoreConfig }
  /** Host de tienda (subdominio o dominio propio) sin tienda asociada. */
  | { kind: 'not-found' }
  /** No se pudo consultar la API; no se debe servir el sitio principal. */
  | { kind: 'error' };

interface CacheEntry {
  resolution: Extract<HostResolution, { kind: 'store' | 'not-found' }>;
  expiresAt: number;
}

/** Caché en memoria por instancia: evita pegarle a la API en cada request. */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

function envValue(name: string): string {
  return (process.env[name] ?? (import.meta.env as Record<string, string>)[name] ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Hosts del sitio principal (no son tiendas): se omite la consulta a la API.
 * Son: localhost, los despliegues *.vercel.app, el dominio base, www y tienda
 * bajo el dominio base (donde vive el sitio actual) y los que se indiquen en
 * MAIN_SITE_HOSTS (lista separada por comas).
 */
function isMainSiteHost(host: string, base: string): boolean {
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.vercel.app')) return true;
  if (host === base || host === `www.${base}` || host === `tienda.${base}`) {
    return true;
  }
  return envValue('MAIN_SITE_HOSTS')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
    .includes(host);
}

/**
 * Resuelve el host de la petición:
 * - Sin STORES_BASE_DOMAIN configurado, la función de tiendas está apagada y
 *   todo se sirve como sitio principal (así nunca se rompe el sitio actual).
 * - Un host de tienda sin tienda asociada devuelve `not-found`: NO se cae al
 *   sitio principal, para que un subdominio inventado no muestre la tienda
 *   de Inkttex.
 */
export async function resolveStoreByHost(
  rawHost: string,
): Promise<HostResolution> {
  const base = envValue('STORES_BASE_DOMAIN');
  if (!base) return { kind: 'main' };

  const host = rawHost.trim().toLowerCase().replace(/:\d+$/, '');
  if (!host || isMainSiteHost(host, base)) return { kind: 'main' };

  const cached = cache.get(host);
  if (cached && cached.expiresAt > Date.now()) return cached.resolution;

  try {
    const res = await fetch(
      `${API_URL}/storefront/store?host=${encodeURIComponent(host)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (res.status === 404) {
      const resolution = { kind: 'not-found' } as const;
      cache.set(host, { resolution, expiresAt: Date.now() + CACHE_TTL_MS });
      return resolution;
    }
    if (!res.ok) {
      console.error(`[store] ${res.status} al resolver host ${host}`);
      return { kind: 'error' };
    }
    const store = (await res.json()) as StoreConfig;
    const resolution = { kind: 'store', store } as const;
    cache.set(host, { resolution, expiresAt: Date.now() + CACHE_TTL_MS });
    return resolution;
  } catch (err) {
    console.error('[store] error de red al resolver host:', err);
    return { kind: 'error' };
  }
}
