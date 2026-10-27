// Tipos del storefront público, alineados con la API (StorefrontService).

export type ProductFit = 'men' | 'women' | 'unisex' | 'kids' | 'family';

export interface StorefrontColor {
  id: string | null;
  name: string | null;
  hex: string | null;
  /** Todas las imágenes renderizadas de este color. */
  images: string[];
}

export interface StorefrontSize {
  name: string;
  label: string | null;
}

export interface StorefrontProduct {
  id: string;
  code: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  fit: ProductFit | null;
  category: string | null;
  priceCents: number | null;
  currency: string | null;
  cover: string | null;
  colors: StorefrontColor[];
  sizes: StorefrontSize[];
  composition: string | null;
  careInstructions: string | null;
  createdAt: string;
}

export interface StorefrontListResult {
  items: StorefrontProduct[];
  total: number;
  limit: number;
  offset: number;
}
