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
  /** Precio específico de la talla en centavos (null = usar precio base). */
  priceCents: number | null;
  /** Medidas por dimensión del size chart (claves = sizeChartColumns). */
  measurements: Record<string, number>;
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
  /** Dimensiones del size chart (columnas). */
  sizeChartColumns: string[];
  /** Unidad del size chart ("cm" | "inch"). */
  sizeChartUnit: string | null;
  composition: string | null;
  careInstructions: string | null;
  createdAt: string;
  /** Datos para "crea tu propia camiseta" (null si no personalizable). */
  customization: StorefrontCustomization | null;
}

/** Datos para personalizar el producto con una imagen propia. */
export interface StorefrontCustomization {
  productId: string;
  sessionId: string;
  designSmartObjectUuid: string;
  areaWidthPx: number;
  areaHeightPx: number;
}

export interface StorefrontListResult {
  items: StorefrontProduct[];
  total: number;
  limit: number;
  offset: number;
}
