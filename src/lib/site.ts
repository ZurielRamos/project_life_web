/**
 * Configuración del sitio web de una tienda (espejo de los tipos de la API:
 * api/src/modules/stores/site-config.ts). La API entrega la configuración ya
 * normalizada y completa; aquí solo se tipan los datos y se define el
 * respaldo que usa localhost cuando no hay tienda.
 */

export type SiteFit = 'women' | 'family' | 'men' | 'unisex' | 'kids';

export interface SiteLink {
  label: string;
  url: string;
}

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  linkLabel: string;
  linkUrl: string;
  backgroundColor: string;
  textColor: string;
}

export type HeaderLayout =
  | 'logo-center'
  | 'logo-left'
  | 'logo-left-menu-center'
  | 'logo-right'
  | 'stacked';

export interface HeaderConfig {
  navItems: SiteLink[];
  layout: HeaderLayout;
  appearance: 'transparent' | 'dark' | 'light';
  logoSize: 'sm' | 'md' | 'lg';
  menuCase: 'as-typed' | 'uppercase';
  sticky: boolean;
  showSearch: boolean;
  showFavorites: boolean;
  showAccount: boolean;
  mobileMenu: boolean;
}

/** Opciones del encabezado por defecto (para tiendas que no las definieron). */
export const DEFAULT_HEADER_OPTIONS: Omit<HeaderConfig, 'navItems'> = {
  layout: 'logo-center',
  appearance: 'transparent',
  logoSize: 'md',
  menuCase: 'as-typed',
  sticky: true,
  showSearch: true,
  showFavorites: false,
  showAccount: true,
  mobileMenu: true,
};

export interface FooterColumn {
  title: string;
  links: SiteLink[];
}

export interface FooterConfig {
  about: string;
  columns: FooterColumn[];
  legalLinks: SiteLink[];
  copyright: string;
  showSocial: boolean;
  showContactInfo: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ContactPageConfig {
  enabled: boolean;
  title: string;
  intro: string;
  showForm: boolean;
  formButtonLabel: string;
  whatsappMessage: string;
  hours: string;
  mapEmbedUrl: string;
  faqTitle: string;
  faqs: FaqItem[];
}

export interface SitePage {
  slug: string;
  title: string;
  content: string;
  published: boolean;
}

export interface IntegrationsConfig {
  googleAnalyticsId: string;
  metaPixelId: string;
  googleSiteVerification: string;
}

export interface CategoryTileConfig {
  id: string;
  enabled: boolean;
  title: string;
  kicker: string;
  cta: string;
  url: string;
  imageUrl: string;
  mobileImageUrl: string;
  /** Imagen incluida en el front (bg_mujer…) mientras no haya una propia. */
  defaultImage: '' | 'bg_mujer' | 'bg_familia' | 'bg_hombre' | 'bg_hoodie' | 'bg_kids';
}

interface HomeSectionBase {
  id: string;
  enabled: boolean;
}

export interface HeroSection extends HomeSectionBase {
  type: 'hero';
  kicker: string;
  titleLine: string;
  titleAccent: string;
  subtitle: string;
  searchPlaceholder: string;
  suggestions: string[];
  chips: SiteLink[];
  imageUrl: string;
  mobileImageUrl: string;
}

export interface CategoriesSection extends HomeSectionBase {
  type: 'categories';
  tiles: CategoryTileConfig[];
}

export interface FeaturedSection extends HomeSectionBase {
  type: 'featured';
  title: string;
  subtitle: string;
  limit: number;
  fit: SiteFit | '';
  ctaLabel: string;
  ctaUrl: string;
}

export interface BannerSection extends HomeSectionBase {
  type: 'banner';
  title: string;
  text: string;
  imageUrl: string;
  mobileImageUrl: string;
  buttonLabel: string;
  buttonUrl: string;
  align: 'left' | 'center' | 'right';
}

export interface TextSection extends HomeSectionBase {
  type: 'text';
  title: string;
  body: string;
  align: 'left' | 'center';
}

export type HomeSection =
  | HeroSection
  | CategoriesSection
  | FeaturedSection
  | BannerSection
  | TextSection;

export interface SiteConfig {
  announcement: AnnouncementConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  home: { sections: HomeSection[] };
  contact: ContactPageConfig;
  pages: SitePage[];
  integrations: IntegrationsConfig;
}

/**
 * Respaldo para localhost sin tienda. Replica los valores por defecto de la
 * API; en producción siempre llega la configuración de la tienda.
 */
export function fallbackSite(): SiteConfig {
  const tile = (
    id: string,
    title: string,
    kicker: string,
    cta: string,
    fit: SiteFit,
    defaultImage: CategoryTileConfig['defaultImage'],
  ): CategoryTileConfig => ({
    id,
    enabled: true,
    title,
    kicker,
    cta,
    url: `/tienda?fit=${fit}`,
    imageUrl: '',
    mobileImageUrl: '',
    defaultImage,
  });
  return {
    announcement: {
      enabled: false,
      text: '',
      linkLabel: '',
      linkUrl: '',
      backgroundColor: '#0b0b0b',
      textColor: '#ffffff',
    },
    header: {
      ...DEFAULT_HEADER_OPTIONS,
      navItems: [
        { label: 'MUJER', url: '/tienda?fit=women' },
        { label: 'FAMILIAR', url: '/tienda?fit=family' },
        { label: 'HOMBRE', url: '/tienda?fit=men' },
        { label: 'UNISEX', url: '/tienda?fit=unisex' },
        { label: 'KIDS', url: '/tienda?fit=kids' },
      ],
    },
    footer: {
      about: '',
      columns: [
        {
          title: 'Comprar',
          links: [
            { label: 'Mujer', url: '/tienda?fit=women' },
            { label: 'Hombre', url: '/tienda?fit=men' },
            { label: 'Unisex', url: '/tienda?fit=unisex' },
            { label: 'Kids', url: '/tienda?fit=kids' },
            { label: 'Todo el catálogo', url: '/tienda' },
          ],
        },
        { title: 'Ayuda', links: [{ label: 'Contacto', url: '/contacto' }] },
      ],
      legalLinks: [],
      copyright: '',
      showSocial: true,
      showContactInfo: true,
    },
    home: {
      sections: [
        {
          id: 'hero',
          type: 'hero',
          enabled: true,
          kicker: '',
          titleLine: 'Miles de diseños para tu ropa,',
          titleAccent: 'o crea el tuyo',
          subtitle:
            'Explora nuestro catálogo o descríbenos lo que imaginas. Lo estampamos en la prenda que elijas.',
          searchPlaceholder: 'Quiero una camiseta minimalista…',
          suggestions: [
            'una camiseta minimalista',
            'un diseño de anime',
            'el logo de mi marca',
            'una ilustración a mi gusto',
            'un hoodie oversize negro',
            'lo que se me ocurra…',
          ],
          chips: [
            { label: 'Anime', url: '/tienda?q=anime' },
            { label: 'Minimalista', url: '/tienda?q=minimalista' },
            { label: 'Streetwear', url: '/tienda?q=streetwear' },
            { label: 'Tu logo', url: '/tienda?q=logo%20de%20marca' },
          ],
          imageUrl: '',
          mobileImageUrl: '',
        },
        {
          id: 'categories',
          type: 'categories',
          enabled: true,
          tiles: [
            tile('women', 'Mujer', 'Lo nuevo en ella', 'Descubre su estilo', 'women', 'bg_mujer'),
            tile('family', 'Familiar', 'Juntos, a juego', 'Explora los looks', 'family', 'bg_familia'),
            tile('men', 'Hombre', 'Corte oversize', 'Descubre su estilo', 'men', 'bg_hombre'),
            tile('unisex', 'Unisex', 'Básicos sin género', 'Explora los esenciales', 'unisex', 'bg_hoodie'),
            tile('kids', 'Kids', 'Estilo en miniatura', 'Descubre la línea Kids', 'kids', 'bg_kids'),
          ],
        },
      ],
    },
    contact: {
      enabled: true,
      title: 'Contáctanos',
      intro: '¿Tienes una pregunta o quieres un pedido personalizado? Escríbenos.',
      showForm: true,
      formButtonLabel: 'Enviar por WhatsApp',
      whatsappMessage: 'Hola, tengo una consulta',
      hours: '',
      mapEmbedUrl: '',
      faqTitle: 'Preguntas frecuentes',
      faqs: [],
    },
    pages: [],
    integrations: {
      googleAnalyticsId: '',
      metaPixelId: '',
      googleSiteVerification: '',
    },
  };
}

/** true si el enlace sale del sitio (http/https). */
export function isExternalLink(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
