/**
 * Resolución de la tienda a partir del host de la petición. El front se
 * sirve desde Vercel con un dominio comodín (*.dominio.com) y, más adelante,
 * dominios propios; la API decide a qué tienda corresponde cada host.
 */

import type { SiteConfig } from './site';

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
  /** Segundo color de marca (final de los degradados). */
  secondaryColor: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  socialLinks: Record<string, string | undefined>;
  currency: string;
  locale: string;
  seoTitle: string | null;
  seoDescription: string | null;
  publicUrl: string | null;
  /** Configuración del sitio (apariencia y contenido), ya completa. */
  site: SiteConfig;
}

/** Resultado de resolver el host de una petición. */
export type HostResolution =
  /** localhost sin tienda por defecto: valores de la plataforma (brand.ts). */
  | { kind: 'default' }
  | { kind: 'store'; store: StoreConfig }
  /** Host sin tienda asociada. */
  | { kind: 'not-found' }
  /** No se pudo consultar la API. */
  | { kind: 'error' };

interface CacheEntry {
  resolution: Extract<HostResolution, { kind: 'store' | 'not-found' }>;
  expiresAt: number;
}

/** Caché en memoria por instancia: evita pegarle a la API en cada request. */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

function envValue(name: string): string {
  return (
    process.env[name] ??
    (import.meta.env as Record<string, string | undefined>)[name] ??
    ''
  ).trim();
}

/** Desarrollo local: sin dominio de tienda. */
function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1';
}

/** URLs técnicas de Vercel (previews / alias del proyecto). */
function isVercelHost(host: string): boolean {
  return host.endsWith('.vercel.app');
}

async function fetchStore(
  cacheKey: string,
  query: string,
): Promise<HostResolution> {
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.resolution;

  try {
    const res = await fetch(`${API_URL}/storefront/store?${query}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.status === 404) {
      const resolution = { kind: 'not-found' } as const;
      cache.set(cacheKey, { resolution, expiresAt: Date.now() + CACHE_TTL_MS });
      return resolution;
    }
    if (!res.ok) {
      console.error(`[store] ${res.status} al resolver ${query}`);
      return { kind: 'error' };
    }
    const store = (await res.json()) as StoreConfig;
    const resolution = { kind: 'store', store } as const;
    cache.set(cacheKey, { resolution, expiresAt: Date.now() + CACHE_TTL_MS });
    return resolution;
  } catch (err) {
    console.error('[store] error de red al resolver tienda:', err);
    return { kind: 'error' };
  }
}

/**
 * Resuelve la tienda de la petición. Todo el sitio es de tiendas: la API
 * decide por host (subdominio del dominio base o dominio propio).
 *
 * En localhost y *.vercel.app no hay dominio de tienda: se fija una con
 * DEFAULT_STORE_SLUG. Sin ella, localhost usa los valores por defecto de la
 * plataforma y *.vercel.app responde "no existe".
 */
export async function resolveStoreByHost(
  rawHost: string,
): Promise<HostResolution> {
  const host = rawHost.trim().toLowerCase().replace(/:\d+$/, '');
  if (!host) return { kind: 'not-found' };

  if (isLocalHost(host) || isVercelHost(host)) {
    const slug = envValue('DEFAULT_STORE_SLUG').toLowerCase();
    if (slug) {
      return fetchStore(`slug:${slug}`, `slug=${encodeURIComponent(slug)}`);
    }
    // Local: valores por defecto de la plataforma. Vercel: no se sirve un
    // catálogo sin tienda; hay que fijar DEFAULT_STORE_SLUG para previews.
    return isLocalHost(host) ? { kind: 'default' } : { kind: 'not-found' };
  }

  return fetchStore(`host:${host}`, `host=${encodeURIComponent(host)}`);
}
