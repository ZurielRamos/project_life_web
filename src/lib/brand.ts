import { fallbackSite, type SiteConfig } from './site';
import { composeStoreTitle } from './title';
import type { StoreConfig } from './store';

/**
 * Marca efectiva de la petición. Todo el front debe leer nombre, textos,
 * logo, contacto y redes de aquí, nunca con textos fijos.
 *
 * - Con tienda resuelta (`Astro.locals.store`): sale de su configuración.
 * - Sin tienda (solo desarrollo y previews de Vercel, que no tienen dominio
 *   de tienda): valores por defecto de la plataforma y variables PUBLIC_*.
 */
export interface Brand {
  /** true cuando no hay tienda (desarrollo / previews). */
  isDefault: boolean;
  name: string;
  /** Título para pestaña y SEO. */
  title: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  /** Color de marca #RRGGBB validado, o null. */
  primaryColor: string | null;
  /** Segundo color de marca #RRGGBB validado, o null. */
  secondaryColor: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  /** Número de WhatsApp (solo dígitos) o cadena vacía si no hay. */
  whatsappDigits: string;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  locale: string;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Configuración del sitio: menú, footer, home, contacto, páginas… */
  site: SiteConfig;
}

/** Valores de la plataforma cuando no hay tienda. */
const DEFAULT_NAME = 'Inkttex';
const DEFAULT_TAGLINE = 'Tu idea, tu prenda';
const DEFAULT_DESCRIPTION =
  'Miles de diseños para tu ropa o crea el tuyo. Estampamos camisetas, hoodies y básicos para mujer, hombre, familia y kids. Explora el catálogo.';

const HEX = /^#[0-9a-fA-F]{6}$/;

const digits = (value: string | null | undefined): string =>
  (value ?? '').replace(/\D/g, '');

const clean = (value: string | null | undefined): string | null => {
  const v = (value ?? '').trim();
  return v ? v : null;
};

export function getBrand(store: StoreConfig | null | undefined): Brand {
  if (!store) {
    const env = import.meta.env;
    return {
      isDefault: true,
      name: DEFAULT_NAME,
      title: `${DEFAULT_NAME} — ${DEFAULT_TAGLINE} | Ropa personalizada`,
      tagline: DEFAULT_TAGLINE,
      description: DEFAULT_DESCRIPTION,
      logoUrl: null,
      faviconUrl: null,
      primaryColor: null,
      secondaryColor: null,
      contactEmail: clean(env.PUBLIC_CONTACT_EMAIL),
      phone: null,
      address: null,
      whatsappDigits: digits(env.PUBLIC_WHATSAPP_PHONE),
      instagram: clean(env.PUBLIC_INSTAGRAM_URL),
      facebook: clean(env.PUBLIC_FACEBOOK_URL),
      tiktok: clean(env.PUBLIC_TIKTOK_URL),
      locale: 'es',
      seoTitle: null,
      seoDescription: null,
      site: fallbackSite(),
    };
  }

  const links = store.socialLinks ?? {};
  return {
    isDefault: false,
    name: store.name,
    title: composeStoreTitle(store),
    tagline: clean(store.tagline),
    description: clean(store.description),
    logoUrl: clean(store.logoUrl),
    faviconUrl: clean(store.faviconUrl),
    primaryColor:
      store.primaryColor && HEX.test(store.primaryColor)
        ? store.primaryColor
        : null,
    secondaryColor:
      store.secondaryColor && HEX.test(store.secondaryColor)
        ? store.secondaryColor
        : null,
    contactEmail: clean(store.contactEmail),
    phone: clean(store.phone),
    address: clean(store.address),
    // Sin número propio no se usa el de la plataforma: una tienda no debe
    // mandar a sus clientes al WhatsApp de otra.
    whatsappDigits: digits(links.whatsapp),
    instagram: clean(links.instagram),
    facebook: clean(links.facebook),
    tiktok: clean(links.tiktok),
    locale: clean(store.locale) ?? 'es',
    seoTitle: clean(store.seoTitle),
    seoDescription: clean(store.seoDescription),
    site: store.site ?? fallbackSite(),
  };
}

/** Descripción por defecto de la plataforma (para el layout sin tienda). */
export const DEFAULT_BRAND_DESCRIPTION = DEFAULT_DESCRIPTION;

/**
 * Origen real de la petición. Detrás de Vercel el host original llega en
 * x-forwarded-host; es el que ve el usuario (subdominio o dominio propio).
 */
export function getRequestOrigin(request: Request, fallback: URL): URL {
  const forwardedHost = request.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim();
  const forwardedProto = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim();
  // Solo aceptamos un host bien formado; si no, caemos al origen de Astro.
  if (forwardedHost && /^[a-z0-9.-]+(:\d+)?$/i.test(forwardedHost)) {
    return new URL(
      `${forwardedProto === 'http' ? 'http' : 'https'}://${forwardedHost}`,
    );
  }
  return new URL(fallback.origin);
}

/** Mapea el idioma de la tienda al formato de Open Graph (es -> es_ES). */
export function ogLocale(locale: string): string {
  const normalized = locale.replace('-', '_');
  if (normalized.includes('_')) return normalized;
  const map: Record<string, string> = {
    es: 'es_ES',
    en: 'en_US',
    pt: 'pt_BR',
    fr: 'fr_FR',
    de: 'de_DE',
    it: 'it_IT',
  };
  return map[normalized] ?? normalized;
}

/** "#RRGGBB" -> "r, g, b" (para usar en rgba(var(--accent-rgb), a)). */
export function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
