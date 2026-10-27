import type {
  ProductFit,
  StorefrontListResult,
  StorefrontProduct,
} from './types';

const API_URL =
  import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000/api';

export interface ListOptions {
  fit?: ProductFit;
  category?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

/**
 * Lista productos de la tienda pública. Resiliente: ante cualquier fallo
 * de red/API devuelve una lista vacía para no romper el render SSR.
 */
export async function listStorefrontDesigns(
  opts: ListOptions = {},
): Promise<StorefrontListResult> {
  const params = new URLSearchParams();
  if (opts.fit) params.set('fit', opts.fit);
  if (opts.category) params.set('category', opts.category);
  if (opts.q) params.set('q', opts.q);
  if (opts.limit != null) params.set('limit', String(opts.limit));
  if (opts.offset != null) params.set('offset', String(opts.offset));

  const qs = params.toString();
  const url = `${API_URL}/storefront/designs${qs ? `?${qs}` : ''}`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.error(`[storefront] ${res.status} al cargar ${url}`);
      return emptyResult(opts);
    }
    return (await res.json()) as StorefrontListResult;
  } catch (err) {
    console.error('[storefront] error de red:', err);
    return emptyResult(opts);
  }
}

/**
 * Búsqueda semántica (por vectores) de diseños a partir de una consulta en
 * lenguaje natural. Pega al endpoint público /storefront/search. Resiliente:
 * ante cualquier fallo devuelve una lista vacía.
 */
export async function searchStorefrontDesigns(
  q: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<StorefrontListResult> {
  const query = q.trim();
  if (!query) return emptyResult(opts);

  const params = new URLSearchParams({ q: query });
  if (opts.limit != null) params.set('limit', String(opts.limit));
  if (opts.offset != null) params.set('offset', String(opts.offset));

  const url = `${API_URL}/storefront/search?${params.toString()}`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.error(`[storefront] ${res.status} al buscar ${url}`);
      return emptyResult(opts);
    }
    return (await res.json()) as StorefrontListResult;
  } catch (err) {
    console.error('[storefront] error de red en búsqueda:', err);
    return emptyResult(opts);
  }
}

/** Detalle de un producto por slug. Devuelve null si no existe o falla. */
export async function getStorefrontDesign(
  slug: string,
): Promise<StorefrontProduct | null> {
  const url = `${API_URL}/storefront/designs/${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as StorefrontProduct;
  } catch {
    return null;
  }
}

function emptyResult(opts: ListOptions): StorefrontListResult {
  return {
    items: [],
    total: 0,
    limit: opts.limit ?? 24,
    offset: opts.offset ?? 0,
  };
}

/** Formatea precio en centavos a moneda legible. */
export function formatPrice(
  cents: number | null,
  currency: string | null,
): string | null {
  if (cents == null) return null;
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat('es', {
      style: 'currency',
      currency: currency ?? 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency ?? ''}`.trim();
  }
}

/** Metadatos de cada género para títulos y cabeceras de la tienda. */
export const FIT_META: Record<
  ProductFit,
  { label: string; title: string; kicker: string }
> = {
  women: { label: 'Mujer', title: 'Mujer', kicker: 'Tienda' },
  men: { label: 'Hombre', title: 'Hombre', kicker: 'Tienda' },
  unisex: { label: 'Unisex', title: 'Unisex', kicker: 'Tienda' },
  kids: { label: 'Kids', title: 'Niños', kicker: 'Tienda' },
  family: { label: 'Familiar', title: 'Familiar', kicker: 'Tienda' },
};
