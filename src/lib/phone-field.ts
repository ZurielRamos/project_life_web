/**
 * Campo de teléfono con selector de indicativo (bandera + buscador).
 *
 * Uso: inserta `phoneFieldHtml(...)` en el markup, luego llama a
 * `initPhoneField(root)` y lee el número internacional con `getFullPhone`.
 * Las banderas son imágenes (flagcdn.com) porque los emojis de bandera no se
 * ven en Windows.
 */

interface Country {
  iso: string;
  dial: string;
  mask: string;
  name: string;
}

/**
 * [ISO, indicativo, máscara nacional]. En la máscara cada `X` es un dígito;
 * el resto son separadores literales.
 */
const US_MASK = '(XXX) XXX-XXXX';
const RAW: [string, string, string][] = [
  ['CO', '57', 'XXX XXX XXXX'], ['MX', '52', 'XX XXXX XXXX'],
  ['US', '1', US_MASK], ['CA', '1', US_MASK], ['ES', '34', 'XXX XX XX XX'],
  ['AR', '54', 'XX XXXX-XXXX'], ['BR', '55', 'XX XXXXX-XXXX'],
  ['CL', '56', 'X XXXX XXXX'], ['PE', '51', 'XXX XXX XXX'],
  ['EC', '593', 'XX XXX XXXX'], ['VE', '58', 'XXX XXX XXXX'],
  ['BO', '591', 'X XXX XXXX'], ['PY', '595', 'XXX XXX XXX'],
  ['UY', '598', 'X XXX XXXX'], ['PA', '507', 'XXXX-XXXX'],
  ['CR', '506', 'XXXX XXXX'], ['GT', '502', 'XXXX XXXX'],
  ['SV', '503', 'XXXX XXXX'], ['HN', '504', 'XXXX-XXXX'],
  ['NI', '505', 'XXXX XXXX'], ['CU', '53', 'X XXX XXXX'],
  ['DO', '1', US_MASK], ['PR', '1', US_MASK], ['JM', '1', US_MASK],
  ['HT', '509', 'XX XX XXXX'], ['FR', '33', 'X XX XX XX XX'],
  ['DE', '49', 'XXX XXXXXXXX'], ['IT', '39', 'XXX XXX XXXX'],
  ['PT', '351', 'XXX XXX XXX'], ['GB', '44', 'XXXX XXXXXX'],
  ['NL', '31', 'X XXXXXXXX'], ['BE', '32', 'XXX XX XX XX'],
  ['CH', '41', 'XX XXX XX XX'], ['AT', '43', 'XXX XXXXXXX'],
  ['IE', '353', 'XX XXX XXXX'], ['SE', '46', 'XX XXX XX XX'],
  ['NO', '47', 'XXX XX XXX'], ['DK', '45', 'XX XX XX XX'],
  ['FI', '358', 'XX XXX XXXX'], ['PL', '48', 'XXX XXX XXX'],
  ['GR', '30', 'XXX XXX XXXX'], ['RU', '7', 'XXX XXX-XX-XX'],
  ['UA', '380', 'XX XXX XXXX'], ['TR', '90', 'XXX XXX XX XX'],
  ['CN', '86', 'XXX XXXX XXXX'], ['JP', '81', 'XX XXXX XXXX'],
  ['KR', '82', 'XX XXXX XXXX'], ['IN', '91', 'XXXXX XXXXX'],
  ['AU', '61', 'XXX XXX XXX'], ['NZ', '64', 'XX XXX XXXX'],
  ['AE', '971', 'XX XXX XXXX'], ['SA', '966', 'XX XXX XXXX'],
  ['IL', '972', 'XX XXX XXXX'], ['ZA', '27', 'XX XXX XXXX'],
  ['MA', '212', 'XX XXX XXXX'], ['EG', '20', 'XX XXXX XXXX'],
];

/** Países con largo variable: se acepta hasta 2 dígitos menos que la máscara. */
const LOOSE = new Set(['DE', 'GB', 'AT', 'IT', 'BR', 'AR']);

/** Dígitos de ejemplo para el placeholder (Colombia: celular real, empieza en 3). */
const EXAMPLES: Record<string, string> = { CO: '3001234567' };

const DEFAULT_ISO = 'CO';

/** Cantidad de dígitos que admite una máscara. */
const maskDigits = (mask: string) => (mask.match(/X/g) ?? []).length;

/** Aplica la máscara a los dígitos dados (sin separadores colgantes). */
function applyMask(mask: string, digits: string): string {
  let out = '';
  let d = 0;
  for (const ch of mask) {
    if (d >= digits.length) break;
    if (ch === 'X') {
      out += digits[d];
      d += 1;
    } else {
      out += ch;
    }
  }
  return out;
}

function buildCountries(): Country[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(['es'], { type: 'region' });
  } catch {
    names = null;
  }
  const list = RAW.map(([iso, dial, mask]) => ({
    iso,
    dial,
    mask,
    name: names?.of(iso) ?? iso,
  }));
  // Colombia primero (mercado principal); el resto alfabético.
  return list.sort((a, b) => {
    if (a.iso === DEFAULT_ISO) return -1;
    if (b.iso === DEFAULT_ISO) return 1;
    return a.name.localeCompare(b.name, 'es');
  });
}

const COUNTRIES = buildCountries();

const flagSrc = (iso: string, w: 20 | 40) =>
  `https://flagcdn.com/w${w}/${iso.toLowerCase()}.png`;

const flagImg = (iso: string, name: string) =>
  `<img class="ca-flag" src="${flagSrc(iso, 20)}" srcset="${flagSrc(iso, 40)} 2x" width="22" height="16" alt="" loading="lazy" decoding="async" data-flag-name="${name}" />`;

/** Markup del campo. `label` es el texto visible sobre el campo. */
export function phoneFieldHtml(label: string): string {
  const def = COUNTRIES.find((c) => c.iso === DEFAULT_ISO)!;
  return `
  <div class="ca-field ca-col2 ca-phone-field">
    <span id="ca-phone-label-${Math.random().toString(36).slice(2, 8)}" data-phone-label>${label}</span>
    <div class="ca-phone" data-phone>
      <button type="button" class="ca-phone-btn" data-phone-btn aria-haspopup="listbox" aria-expanded="false" aria-label="Seleccionar indicativo del país">
        <span data-phone-flag>${flagImg(def.iso, def.name)}</span>
        <span class="ca-phone-dial" data-phone-dial>+${def.dial}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <input class="ca-phone-input" type="tel" name="phone" inputmode="numeric" autocomplete="tel-national" placeholder="300 123 4567" aria-label="Número de celular" required />
      <div class="ca-phone-menu" data-phone-menu hidden>
        <input class="ca-phone-search" type="search" data-phone-search placeholder="Buscar país o indicativo…" aria-label="Buscar país" autocomplete="off" />
        <ul class="ca-phone-list" role="listbox" data-phone-list></ul>
      </div>
    </div>
  </div>`;
}

/** Conecta el selector (menú, búsqueda y selección). */
export function initPhoneField(root: HTMLElement): void {
  const wrap = root.querySelector<HTMLElement>('[data-phone]');
  if (!wrap) return;
  const btn = wrap.querySelector<HTMLButtonElement>('[data-phone-btn]')!;
  const menu = wrap.querySelector<HTMLElement>('[data-phone-menu]')!;
  const search = wrap.querySelector<HTMLInputElement>('[data-phone-search]')!;
  const list = wrap.querySelector<HTMLElement>('[data-phone-list]')!;
  const flagEl = wrap.querySelector<HTMLElement>('[data-phone-flag]')!;
  const dialEl = wrap.querySelector<HTMLElement>('[data-phone-dial]')!;
  const input = wrap.querySelector<HTMLInputElement>('.ca-phone-input')!;

  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function renderList(query = '') {
    const q = norm(query.trim().replace(/^\+/, ''));
    const items = COUNTRIES.filter(
      (c) =>
        !q ||
        norm(c.name).includes(q) ||
        c.dial.startsWith(q) ||
        c.iso.toLowerCase() === q,
    );
    list.innerHTML = items.length
      ? items
          .map(
            (c) =>
              `<li role="option" class="ca-phone-opt" data-iso="${c.iso}" aria-selected="${
                wrap.dataset.iso === c.iso
              }">${flagImg(c.iso, c.name)}<span class="ca-phone-opt-name">${c.name}</span><span class="ca-phone-opt-dial">+${c.dial}</span></li>`,
          )
          .join('')
      : '<li class="ca-phone-empty">Sin resultados</li>';
  }

  function select(iso: string) {
    const c = COUNTRIES.find((x) => x.iso === iso);
    if (!c) return;
    wrap.dataset.iso = c.iso;
    wrap.dataset.dial = c.dial;
    flagEl.innerHTML = flagImg(c.iso, c.name);
    dialEl.textContent = `+${c.dial}`;
    applyCountry(c);
    closeMenu();
    input.focus();
  }

  const current = () =>
    COUNTRIES.find((x) => x.iso === wrap.dataset.iso) ?? COUNTRIES[0];

  /** Actualiza el placeholder y vuelve a formatear lo ya escrito. */
  function applyCountry(c: Country) {
    const max = maskDigits(c.mask);
    const example = (EXAMPLES[c.iso] ?? '1234567890123456').slice(0, max);
    input.placeholder = applyMask(c.mask, example);
    reformat(input.value, null);
  }

  /**
   * Formatea el valor con la máscara del país. `caretDigits` es la cantidad
   * de dígitos a la izquierda del cursor, para devolverlo a su sitio.
   */
  function reformat(raw: string, caretDigits: number | null) {
    const c = current();
    const max = maskDigits(c.mask);
    let digits = raw.replace(/\D/g, '');
    let before = caretDigits;

    // Pegado con indicativo ("+57 300…" o "57300…" más largo que la máscara).
    const hasPlus = raw.trim().startsWith('+');
    if (
      digits.startsWith(c.dial) &&
      (hasPlus || digits.length > max)
    ) {
      digits = digits.slice(c.dial.length);
      if (before !== null) before = Math.max(0, before - c.dial.length);
    }
    // Cero inicial de marcación nacional: no forma parte del número.
    const zeros = digits.length - digits.replace(/^0+/, '').length;
    if (zeros) {
      digits = digits.slice(zeros);
      if (before !== null) before = Math.max(0, before - zeros);
    }
    digits = digits.slice(0, max);

    const formatted = applyMask(c.mask, digits);
    input.value = formatted;
    if (before === null || document.activeElement !== input) return;

    // Cursor justo después del dígito número `before`.
    const target = Math.min(before, digits.length);
    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < target) {
      if (/\d/.test(formatted[pos])) seen += 1;
      pos += 1;
    }
    input.setSelectionRange(pos, pos);
  }

  input.addEventListener('input', () => {
    const caret = input.selectionStart ?? input.value.length;
    const before = input.value.slice(0, caret).replace(/\D/g, '').length;
    reformat(input.value, before);
  });

  // El modal recorta (overflow) y tiene transform, lo que atraparía un menú
  // dentro de él. Se mueve al overlay y se posiciona con `fixed`.
  const host = root.closest<HTMLElement>('.ca-overlay') ?? document.body;
  host.appendChild(menu);
  const modal = root.closest<HTMLElement>('.ca-modal');

  function positionMenu() {
    const r = btn.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(340, window.innerWidth - margin * 2);
    const left = Math.max(
      margin,
      Math.min(r.left, window.innerWidth - width - margin),
    );
    const below = window.innerHeight - r.bottom - margin;
    const above = r.top - margin;
    // Espacio extra del buscador + paddings del menú.
    const chrome = 70;
    const openUp = below < 220 && above > below;
    const space = openUp ? above : below;
    list.style.maxHeight = `${Math.max(120, Math.min(260, space - chrome))}px`;
    menu.style.left = `${left}px`;
    menu.style.width = `${width}px`;
    if (openUp) {
      menu.style.top = 'auto';
      menu.style.bottom = `${window.innerHeight - r.top + 6}px`;
    } else {
      menu.style.bottom = 'auto';
      menu.style.top = `${r.bottom + 6}px`;
    }
  }

  function openMenu() {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    search.value = '';
    renderList();
    positionMenu();
    window.setTimeout(() => search.focus({ preventScroll: true }), 0);
  }
  function closeMenu() {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  // Al mover el modal o redimensionar, el menú fijo quedaría desfasado.
  modal?.addEventListener('scroll', closeMenu, { passive: true });
  window.addEventListener('resize', closeMenu);

  btn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  search.addEventListener('input', () => renderList(search.value));
  search.addEventListener('keydown', (e) => {
    // No dejar que Enter envíe el formulario ni que Escape cierre el modal.
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = list.querySelector<HTMLElement>('[data-iso]');
      if (first?.dataset.iso) select(first.dataset.iso);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      closeMenu();
      btn.focus();
    }
  });
  list.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-iso]');
    if (li?.dataset.iso) select(li.dataset.iso);
  });
  document.addEventListener('click', (e) => {
    const t = e.target as Node;
    if (!menu.hidden && !wrap.contains(t) && !menu.contains(t)) closeMenu();
  });

  const def = COUNTRIES.find((c) => c.iso === DEFAULT_ISO)!;
  wrap.dataset.iso = def.iso;
  wrap.dataset.dial = def.dial;
  applyCountry(def);
}

/**
 * Número internacional solo con dígitos (indicativo + número), p. ej.
 * "573001234567". Devuelve null si el número no es plausible.
 */
export function getFullPhone(root: HTMLElement): string | null {
  const wrap = root.querySelector<HTMLElement>('[data-phone]');
  const input = wrap?.querySelector<HTMLInputElement>('.ca-phone-input');
  if (!wrap || !input) return null;
  const country = COUNTRIES.find((c) => c.iso === wrap.dataset.iso);
  const national = input.value.replace(/\D/g, '').replace(/^0+/, '');
  const full = `${wrap.dataset.dial ?? ''}${national}`;
  // El número debe completar la máscara (con margen en países de largo variable).
  const expected = country ? maskDigits(country.mask) : 7;
  const min = LOOSE.has(country?.iso ?? '') ? expected - 2 : expected;
  return national.length >= min && full.length <= 15 ? full : null;
}
