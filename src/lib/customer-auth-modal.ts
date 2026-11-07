/**
 * Modal de acceso de CLIENTES del storefront (un solo flujo para entrar o
 * crear cuenta).
 *
 *  1. Celular  → se envía un OTP por WhatsApp.
 *  2. Código   → se verifica el OTP (se envía solo al completar los 6 dígitos).
 *       · Si el cliente ya existe: inicia sesión y termina.
 *       · Si es nuevo: pasa al paso 3.
 *  3. Datos    → stepper corto (3 pasos) para no saturar con preguntas.
 *
 * Se carga con dynamic import() solo cuando el cliente pulsa el gate de
 * "Regístrate para ver todas las imágenes".
 */
import '../styles/customer-auth.css';
// Logo de marca como markup crudo (conserva sus colores y escala nítido).
import logoSvg from '../assets/logo-inkttex.svg?raw';
import {
  CONSENT_VERSION,
  INTEREST_OPTIONS,
  completeRegistration,
  requestOtp,
  verifyOtp as verifyOtpRequest,
  type CustomerProfile,
} from './customer';
import { initOtpInput, otpInputHtml } from './otp-input';
import { getFullPhone, initPhoneField, phoneFieldHtml } from './phone-field';

/** Longitud del código OTP (debe coincidir con el backend: 6 dígitos). */
const OTP_LENGTH = 6;
/** Segundos antes de poder reenviar el código (igual que el backend). */
const RESEND_SECONDS = 30;
/** Pasos del formulario de datos para clientes nuevos. */
const PROFILE_STEPS = 3;

/** Glifo de WhatsApp (Simple Icons, CC0). Hereda el color con currentColor. */
const waIcon = (size = 16) =>
  `<svg class="ca-wa" viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;

let checkSeq = 0;

/**
 * Casilla personalizada (no nativa): un botón con role="checkbox" y
 * aria-checked, accesible con teclado (Espacio/Enter) y lector de pantalla.
 * Todo el renglón (casilla + texto) es clicable.
 */
function checkHtml(name: string, checked: boolean, text: string): string {
  const id = `ca-check-${(checkSeq += 1)}`;
  return `<div class="ca-checkrow" data-check-row>
    <button type="button" class="ca-check" role="checkbox" aria-checked="${checked}" aria-labelledby="${id}" data-check="${name}">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
    </button>
    <span class="ca-check-label" id="${id}">${text}</span>
  </div>`;
}

/** Activa el comportamiento de todas las casillas personalizadas del modal. */
function initChecks(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-check-row]').forEach((row) => {
    const box = row.querySelector<HTMLElement>('[data-check]')!;
    row.addEventListener('click', () => {
      const next = box.getAttribute('aria-checked') !== 'true';
      box.setAttribute('aria-checked', String(next));
    });
  });
}

const isChecked = (root: HTMLElement, name: string): boolean =>
  root
    .querySelector(`[data-check="${name}"]`)
    ?.getAttribute('aria-checked') === 'true';

interface OpenAuthOptions {
  /**
   * Obsoleto: ya no hay pestañas de registro/login; el flujo es único. Se
   * conserva para no romper a quienes todavía lo pasan.
   */
  initialMode?: 'register' | 'login';
  /** Origen del registro (p. ej. slug del producto) para segmentación. */
  signupOrigin?: string;
  /** Callback al autenticarse (login o registro) con éxito. */
  onSuccess: (customer: CustomerProfile) => void;
}

type View = 'phone' | 'otp' | 'profile';

const interestChips = INTEREST_OPTIONS.map(
  (o) =>
    `<label class="ca-chip"><input type="checkbox" value="${o.value}" /><span>${o.label}</span></label>`,
).join('');

/** Escapa texto para insertarlo en HTML (el nombre lo define la tienda). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Marca de la tienda actual, publicada por el layout en <html data-brand-*>. */
function readBrand(): { name: string; logoHtml: string } {
  const d = document.documentElement.dataset;
  const name = d.brandName || 'Inkttex';
  const logo = d.brandLogo;
  let logoHtml: string;
  if (logo) {
    logoHtml = `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name)}" />`;
  } else if (d.brandDefault === 'true') {
    logoHtml = logoSvg;
  } else {
    logoHtml = `<span class="ca-brand-name">${escapeHtml(name)}</span>`;
  }
  return { name, logoHtml };
}

export function openCustomerAuthModal(opts: OpenAuthOptions): void {
  const { signupOrigin, onSuccess } = opts;
  const brand = readBrand();

  const overlay = document.createElement('div');
  overlay.className = 'ca-overlay';
  overlay.innerHTML = `
    <div class="ca-backdrop" data-close></div>
    <div class="ca-modal" role="dialog" aria-modal="true" aria-label="Entrar o crear cuenta en ${escapeHtml(brand.name)}">
      <button type="button" class="ca-close" data-close aria-label="Cerrar">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      <div class="ca-head">
        <span class="ca-logo" role="img" aria-label="${escapeHtml(brand.name)}">${brand.logoHtml}</span>
        <h2 class="ca-title" data-title></h2>
        <p class="ca-sub" data-sub></p>
      </div>

      <p class="ca-error" data-error hidden role="alert"></p>

      <!-- Paso 1: celular -->
      <form class="ca-form" data-form="phone" novalidate>
        ${phoneFieldHtml(`<span class="ca-wa-label">${waIcon(15)}Tu número de WhatsApp</span>`)}
        ${checkHtml('remember', true, 'Recordarme en este dispositivo')}
        <button type="submit" class="ca-submit" data-submit>${waIcon(18)}<span data-btn-text>Enviar código de verificación</span></button>
        <p class="ca-note">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 6v5c0 4.4 2.9 8.4 7 10 4.1-1.6 7-5.6 7-10V6l-7-3Z"/><path d="m9.5 12 2 2 3.5-4"/></svg>
          <span>Sin contraseñas. Solo usamos tu número para comprobar tu identidad.</span>
        </p>
      </form>

      <!-- Paso 2: verificación del OTP -->
      <form class="ca-form" data-form="otp" hidden novalidate>
        <div class="ca-otp-intro">
          <span class="ca-wa-badge">${waIcon(24)}</span>
          <p class="ca-otp-hint" data-otp-hint></p>
        </div>
        ${otpInputHtml(OTP_LENGTH)}
        <button type="submit" class="ca-submit" data-submit><span data-btn-text>Verificar número</span></button>
        <div class="ca-row ca-otp-actions">
          <button type="button" class="ca-link" data-otp-back>← Cambiar número</button>
          <button type="button" class="ca-link" data-otp-resend>Reenviar código</button>
        </div>
      </form>

      <!-- Paso 3 (solo clientes nuevos): datos en stepper -->
      <form class="ca-form" data-form="profile" hidden novalidate>
        <div class="ca-progress" data-progress>
          <div class="ca-progress-top">
            <span data-progress-label></span>
          </div>
          <div class="ca-progress-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${PROFILE_STEPS}">
            <i data-progress-fill></i>
          </div>
        </div>

        <div class="ca-step" data-step="1">
          <label class="ca-field">
            <span>Nombre completo *</span>
            <input type="text" name="name" autocomplete="name" placeholder="Ej: María Pérez" required />
          </label>
        </div>

        <div class="ca-step" data-step="2" hidden>
          <div class="ca-grid">
            <label class="ca-field">
              <span>Ciudad</span>
              <input type="text" name="city" autocomplete="address-level2" placeholder="Ej: Medellín" />
            </label>
            <label class="ca-field">
              <span>Género</span>
              <select name="gender">
                <option value="">Prefiero no decir</option>
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
                <option value="other">Otro</option>
              </select>
            </label>
          </div>
        </div>

        <div class="ca-step" data-step="3" hidden>
          <div class="ca-interests">
            <div class="ca-chips">${interestChips}</div>
          </div>
          ${checkHtml('marketingOptIn', false, 'Acepto los términos y recibir novedades y promociones por WhatsApp. *')}
        </div>

        <div class="ca-step-actions">
          <button type="button" class="ca-back" data-step-back hidden>Atrás</button>
          <button type="submit" class="ca-submit" data-submit>Continuar</button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => overlay.classList.add('open'));

  const $ = <T extends HTMLElement>(sel: string) =>
    overlay.querySelector<T>(sel)!;
  const titleEl = $('[data-title]');
  const subEl = $('[data-sub]');
  const errorEl = $('[data-error]');
  const phoneForm = $<HTMLFormElement>('[data-form="phone"]');
  const otpForm = $<HTMLFormElement>('[data-form="otp"]');
  const profileForm = $<HTMLFormElement>('[data-form="profile"]');
  const otpHint = $('[data-otp-hint]');
  const resendBtn = $<HTMLButtonElement>('[data-otp-resend]');
  const progressLabel = $('[data-progress-label]');
  const progressFill = $('[data-progress-fill]');
  const progressBar = $('.ca-progress-bar');
  const stepBack = $<HTMLButtonElement>('[data-step-back]');
  const profileSubmit = profileForm.querySelector<HTMLButtonElement>(
    '[data-submit]',
  )!;
  const otp = initOtpInput(otpForm, (code) => void submitOtp(code), OTP_LENGTH);
  initPhoneField(phoneForm);
  initChecks(overlay);

  /** Estado del flujo. */
  let phone = '';
  let remember = true;
  let registrationToken = '';
  let step = 1;
  let busy = false;

  function setError(msg: string | null) {
    if (msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    } else {
      errorEl.hidden = true;
    }
  }

  function setBusy(form: HTMLFormElement, on: boolean, labelBusy: string) {
    busy = on;
    const btn = form.querySelector<HTMLButtonElement>('[data-submit]');
    if (!btn) return;
    btn.disabled = on;
    // El texto vive en [data-btn-text] cuando el botón lleva icono.
    const txt = btn.querySelector<HTMLElement>('[data-btn-text]') ?? btn;
    txt.dataset.label ??= txt.textContent ?? '';
    txt.textContent = on ? labelBusy : txt.dataset.label;
  }

  /** Muestra los últimos 4 dígitos para que confirme a qué número se envió. */
  function maskPhone(p: string): string {
    const d = p.replace(/\D/g, '');
    return d.length <= 4 ? d : `•••• ${d.slice(-4)}`;
  }

  // ---------------------------------------------------------------------
  // Vistas
  // ---------------------------------------------------------------------

  const STEP_TEXT: Record<number, { title: string; sub: string }> = {
    1: {
      title: `¡Bienvenido a ${brand.name}!`,
      sub: 'Tu número quedó verificado. Cuéntanos cómo te llamas para crear tu cuenta.',
    },
    2: {
      title: '¿Desde dónde nos escribes?',
      sub: 'Opcional. Nos ayuda a mostrarte lo más relevante.',
    },
    3: {
      title: '¿Qué te interesa?',
      sub: 'Opcional. Elige lo que quieras y confirma para terminar.',
    },
  };

  function setView(view: View) {
    phoneForm.hidden = view !== 'phone';
    otpForm.hidden = view !== 'otp';
    profileForm.hidden = view !== 'profile';
    setError(null);

    if (view === 'phone') {
      titleEl.textContent = 'Identifícate para continuar';
      subEl.textContent =
        'Ingresa tu número de WhatsApp. Te enviaremos un código para verificar que eres tú. Si ya tienes cuenta, entras; si no, la creas en un minuto.';
    } else if (view === 'otp') {
      titleEl.textContent = 'Verifica tu número';
      subEl.textContent =
        'Para confirmar que este número es tuyo, ingresa el código de 6 dígitos que te enviamos por WhatsApp.';
      otp.reset();
      window.setTimeout(() => otp.focus(), 50);
    } else {
      showStep(1);
    }
  }

  function showStep(n: number) {
    step = n;
    profileForm
      .querySelectorAll<HTMLElement>('[data-step]')
      .forEach((el) => (el.hidden = Number(el.dataset.step) !== n));
    progressLabel.textContent = `Paso ${n} de ${PROFILE_STEPS}`;
    progressFill.style.width = `${(n / PROFILE_STEPS) * 100}%`;
    progressBar.setAttribute('aria-valuenow', String(n));
    stepBack.hidden = n === 1;

    const last = n === PROFILE_STEPS;
    const label = last ? 'Crear cuenta y ver mis imágenes' : 'Continuar';
    profileSubmit.dataset.label = label;
    profileSubmit.textContent = label;

    titleEl.textContent = STEP_TEXT[n].title;
    subEl.textContent = STEP_TEXT[n].sub;
    setError(null);
    window.setTimeout(() => {
      profileForm
        .querySelector<HTMLElement>(`[data-step="${n}"] input, [data-step="${n}"] select`)
        ?.focus({ preventScroll: true });
    }, 30);
  }

  // ---------------------------------------------------------------------
  // Paso 1: enviar OTP
  // ---------------------------------------------------------------------

  /** Cuenta regresiva del botón "Reenviar código". */
  let resendTimer: number | undefined;
  function startResendCooldown() {
    window.clearInterval(resendTimer);
    let left = RESEND_SECONDS;
    resendBtn.disabled = true;
    resendBtn.textContent = `Reenviar código (${left}s)`;
    resendTimer = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        window.clearInterval(resendTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Reenviar código';
      } else {
        resendBtn.textContent = `Reenviar código (${left}s)`;
      }
    }, 1000);
  }

  phoneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const full = getFullPhone(phoneForm);
    if (!full) {
      setError('Ingresa un número de celular válido.');
      return;
    }
    remember = isChecked(phoneForm, 'remember');

    setError(null);
    setBusy(phoneForm, true, 'Enviando código…');
    try {
      const sent = await requestOtp(full);
      // El backend devuelve el número normalizado; es el que se verifica.
      phone = sent.phone;
      otpHint.textContent = `Enviamos el código al WhatsApp ${maskPhone(phone)}. Puede tardar unos segundos.`;
      setView('otp');
      startResendCooldown();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo enviar el código.',
      );
    } finally {
      setBusy(phoneForm, false, '');
    }
  });

  // ---------------------------------------------------------------------
  // Paso 2: verificar OTP
  // ---------------------------------------------------------------------

  async function submitOtp(code: string) {
    if (busy) return;
    if (code.length !== OTP_LENGTH) {
      setError(`Ingresa los ${OTP_LENGTH} dígitos del código.`);
      return;
    }

    setError(null);
    otp.setInvalid(false);
    otp.setDisabled(true);
    setBusy(otpForm, true, 'Verificando…');
    try {
      const outcome = await verifyOtpRequest(phone, code, remember);
      if (outcome.status === 'authenticated') {
        close();
        onSuccess(outcome.result.customer);
        return;
      }
      // Número nuevo: a capturar datos.
      registrationToken = outcome.registrationToken;
      setBusy(otpForm, false, '');
      otp.setDisabled(false);
      setView('profile');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo verificar el código.',
      );
      setBusy(otpForm, false, '');
      otp.setDisabled(false);
      otp.reset();
      otp.setInvalid(true);
    }
  }

  // Envío manual (botón / Enter); también se dispara solo al llenar la última casilla.
  otpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    void submitOtp(otp.getCode());
  });

  $('[data-otp-back]').addEventListener('click', () => {
    if (busy) return;
    window.clearInterval(resendTimer);
    setView('phone');
  });

  resendBtn.addEventListener('click', async () => {
    if (busy || resendBtn.disabled) return;
    setError(null);
    resendBtn.disabled = true;
    try {
      await requestOtp(phone);
      otp.reset();
      otpHint.textContent = `Reenviamos el código al WhatsApp ${maskPhone(phone)}. Puede tardar unos segundos.`;
      startResendCooldown();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo reenviar el código.',
      );
      resendBtn.disabled = false;
    }
  });

  // ---------------------------------------------------------------------
  // Paso 3: datos del cliente nuevo (stepper)
  // ---------------------------------------------------------------------

  stepBack.addEventListener('click', () => {
    if (busy || step <= 1) return;
    showStep(step - 1);
  });

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(profileForm);
    const str = (k: string) => {
      const v = (fd.get(k) as string | null)?.trim();
      return v ? v : undefined;
    };

    if (step === 1 && !str('name')) {
      setError('Cuéntanos tu nombre para continuar.');
      return;
    }
    if (step < PROFILE_STEPS) {
      showStep(step + 1);
      return;
    }

    const marketingOptIn = isChecked(profileForm, 'marketingOptIn');
    if (!marketingOptIn) {
      setError('Debes aceptar los términos para crear tu cuenta.');
      return;
    }
    const name = str('name');
    if (!name) {
      showStep(1);
      setError('Cuéntanos tu nombre para continuar.');
      return;
    }

    const interests = Array.from(
      profileForm.querySelectorAll<HTMLInputElement>('.ca-chips input:checked'),
    ).map((i) => i.value);

    setError(null);
    setBusy(profileForm, true, 'Creando cuenta…');
    try {
      const { customer } = await completeRegistration(
        {
          registrationToken,
          name,
          city: str('city'),
          gender: str('gender') as
            | 'female'
            | 'male'
            | 'other'
            | 'prefer_not'
            | undefined,
          interests: interests.length ? interests : undefined,
          marketingOptIn,
          consentVersion: CONSENT_VERSION,
          signupOrigin,
        },
        remember,
      );
      close();
      onSuccess(customer);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo crear la cuenta.';
      setBusy(profileForm, false, '');
      if ((err as { status?: number }).status === 401) {
        // El token de registro venció: hay que verificar el número otra vez.
        registrationToken = '';
        setView('phone');
      }
      setError(message);
    }
  });

  // Arranca en el paso del celular.
  setView('phone');

  // ---------------------------------------------------------------------
  // Cierre
  // ---------------------------------------------------------------------
  function close() {
    window.clearInterval(resendTimer);
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    window.setTimeout(() => overlay.remove(), 240);
  }
  overlay
    .querySelectorAll('[data-close]')
    .forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  });
}
