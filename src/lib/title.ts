/**
 * Título de la pestaña y del SEO de una tienda.
 *
 * - Si la tienda define un título SEO propio, se usa tal cual.
 * - Si no: «Título | Eslogan». Sin eslogan (o si el título ya lo incluye),
 *   solo el título. Sin título, se usa el nombre de la tienda.
 */
export interface StoreTitleParts {
  seoTitle?: string | null;
  title?: string | null;
  name: string;
  tagline?: string | null;
}

export function composeStoreTitle(parts: StoreTitleParts): string {
  const seo = parts.seoTitle?.trim();
  if (seo) return seo;
  const base = parts.title?.trim() || parts.name.trim();
  const slogan = parts.tagline?.trim();
  if (!slogan || base.toLowerCase().includes(slogan.toLowerCase())) return base;
  return `${base} | ${slogan}`;
}
