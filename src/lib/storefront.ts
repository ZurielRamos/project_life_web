import type {
  ProductFit,
  StorefrontListResult,
  StorefrontProduct,
} from './types';

const API_URL =
  import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000/api';

export interface ListOptions {
  fit?: ProductFit | string;
  category?: string;
  q?: string;
  /** Producto base (uuid). */
  product?: string;
  /** Selección manual: ids de diseños, se devuelven en ese orden. */
  ids?: string[];
  sort?: 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'random';
  limit?: number;
  offset?: number;
  /** Slug de la tienda: limita el catálogo a lo que publica esa tienda. */
  store?: string;
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
  if (opts.product) params.set('product', opts.product);
  if (opts.ids?.length) params.set('ids', opts.ids.join(','));
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.limit != null) params.set('limit', String(opts.limit));
  if (opts.offset != null) params.set('offset', String(opts.offset));
  if (opts.store) params.set('store', opts.store);

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
  opts: { limit?: number; offset?: number; store?: string } = {},
): Promise<StorefrontListResult> {
  const query = q.trim();
  if (!query) return emptyResult(opts);

  const params = new URLSearchParams({ q: query });
  if (opts.limit != null) params.set('limit', String(opts.limit));
  if (opts.offset != null) params.set('offset', String(opts.offset));
  if (opts.store) params.set('store', opts.store);

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
  store?: string,
): Promise<StorefrontProduct | null> {
  const qs = store ? `?store=${encodeURIComponent(store)}` : '';
  const url = `${API_URL}/storefront/designs/${encodeURIComponent(slug)}${qs}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as StorefrontProduct;
  } catch {
    return null;
  }
}

/** Sube la imagen del usuario (data URI) para personalizar. Público. */
export async function uploadCustomImage(
  dataUri: string,
): Promise<{ url: string; width: number; height: number } | null> {
  try {
    const res = await fetch(`${API_URL}/custom/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUri }),
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      url: string;
      width: number;
      height: number;
    };
  } catch {
    return null;
  }
}

export interface CustomRenderParams {
  productId: string;
  sessionId: string;
  imageUrl: string;
  designSmartObjectUuid: string;
  placement: {
    xPx: number;
    yPx: number;
    widthPx: number;
    heightPx: number;
    rotation?: number;
  };
  colorId?: string;
  /** Hex del color a tintar (p.ej. "#000000"). Más fiable que colorId. */
  colorHex?: string;
}

/** Resultado de un render de sesión personalizada. */
export interface CustomRenderResult {
  /** URLs de las imágenes renderizadas. */
  images: string[];
  /** Nº total de mockups de la sesión (para el gate de registro). */
  totalMockups: number;
}

/**
 * Preview GRATIS (sin registro): renderiza SOLO la primera imagen de la
 * sesión y devuelve el total de mockups para mostrar el resto borroso.
 * Público.
 */
export async function previewCustomSession(
  params: CustomRenderParams,
): Promise<CustomRenderResult> {
  const res = await fetch(`${API_URL}/custom/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`No se pudo generar la vista previa (${res.status})`);
  }
  const data = (await res.json()) as Partial<CustomRenderResult>;
  return { images: data.images ?? [], totalMockups: data.totalMockups ?? 0 };
}

/**
 * Sesión COMPLETA (requiere sesión de cliente): renderiza todos los mockups
 * del color. Requiere token de cliente; respeta el tope por hora.
 * Lanza un error con `.status` para que el front distinga 401 (sesión
 * expirada) y 403 (tope alcanzado).
 */
export async function renderCustomSession(
  params: CustomRenderParams,
  token: string,
): Promise<CustomRenderResult> {
  const res = await fetch(`${API_URL}/custom/render-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    let message = `No se pudieron generar las imágenes (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
      }
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    const err = new Error(message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as Partial<CustomRenderResult>;
  return { images: data.images ?? [], totalMockups: data.totalMockups ?? 0 };
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
  locale = 'es',
): string | null {
  if (cents == null) return null;
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(locale, {
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
