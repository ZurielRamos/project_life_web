// Cliente de autenticación de CLIENTES (compradores del storefront).
// Es un dominio separado del admin: token propio guardado en localStorage.

const API_URL =
  import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000/api';

const TOKEN_KEY = 'inkttex.customer.token';
const CUSTOMER_KEY = 'inkttex.customer.profile';

/** Vista pública del cliente que devuelve la API. */
export interface CustomerProfile {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  gender: 'female' | 'male' | 'other' | 'prefer_not' | null;
  city: string | null;
  interests: string[];
  marketingOptIn: boolean;
  createdAt: string;
}

export interface CustomerAuthResult {
  accessToken: string;
  customer: CustomerProfile;
}

/** Datos que se capturan de un cliente nuevo (tras verificar el OTP). */
export interface RegisterCustomerInput {
  /** Token emitido al verificar el OTP de un número nuevo. */
  registrationToken: string;
  name: string;
  email?: string;
  gender?: 'female' | 'male' | 'other' | 'prefer_not';
  city?: string;
  interests?: string[];
  acquisitionSource?: string;
  marketingOptIn: boolean;
  consentVersion?: string;
  signupOrigin?: string;
}

/** Respuesta del primer paso: se envió un OTP por WhatsApp. */
export interface OtpRequestedResult {
  otpSent: true;
  /** Celular normalizado al que se envió el código. */
  phone: string;
}

// ---------------------------------------------------------------------------
// Sesión en el navegador
// ---------------------------------------------------------------------------

/** Almacén donde vive la sesión actual (sessionStorage si no se recordó). */
function sessionStore(): Storage | null {
  if (typeof localStorage === 'undefined') return null;
  if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage;
  if (localStorage.getItem(TOKEN_KEY)) return localStorage;
  return null;
}

export function getCustomerToken(): string | null {
  return sessionStore()?.getItem(TOKEN_KEY) ?? null;
}

export function getCustomerProfile(): CustomerProfile | null {
  const raw = sessionStore()?.getItem(CUSTOMER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CustomerProfile;
  } catch {
    return null;
  }
}

export function isCustomerLoggedIn(): boolean {
  return !!getCustomerToken();
}

function persistSession(result: CustomerAuthResult, remember = true): void {
  if (typeof localStorage === 'undefined') return;
  // Limpia cualquier sesión previa para no dejarla en el otro almacén.
  clearCustomerSession();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, result.accessToken);
  store.setItem(CUSTOMER_KEY, JSON.stringify(result.customer));
}

export function clearCustomerSession(): void {
  if (typeof localStorage === 'undefined') return;
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(TOKEN_KEY);
    store.removeItem(CUSTOMER_KEY);
  }
}

// ---------------------------------------------------------------------------
// Llamadas a la API
// ---------------------------------------------------------------------------

/** Normaliza el mensaje de error de NestJS (message puede ser arreglo). */
async function readError(res: Response, fallback: string): Promise<Error> {
  let message = fallback;
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (body.message) {
      message = Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;
    }
  } catch {
    /* sin cuerpo JSON */
  }
  const err = new Error(message) as Error & { status: number };
  err.status = res.status;
  return err;
}

/** Resultado de verificar el OTP: sesión iniciada o registro pendiente. */
export type VerifyOtpOutcome =
  | { status: 'authenticated'; result: CustomerAuthResult }
  | { status: 'registration_required'; registrationToken: string };

/**
 * Paso 1: pide el envío de un OTP por WhatsApp al número (tenga cuenta o no).
 */
export async function requestOtp(phone: string): Promise<OtpRequestedResult> {
  const res = await fetch(`${API_URL}/customers/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    throw await readError(res, 'No se pudo enviar el código de verificación.');
  }
  return (await res.json()) as OtpRequestedResult;
}

/**
 * Paso 2: verifica el OTP. Si el cliente ya existe, guarda la sesión
 * (`remember` decide localStorage o sessionStorage). Si es nuevo, devuelve el
 * token con el que se completa el registro.
 */
export async function verifyOtp(
  phone: string,
  code: string,
  remember = true,
): Promise<VerifyOtpOutcome> {
  const res = await fetch(`${API_URL}/customers/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) {
    throw await readError(res, 'No se pudo verificar el código.');
  }
  const body = (await res.json()) as
    | ({ status: 'authenticated' } & CustomerAuthResult)
    | { status: 'registration_required'; registrationToken: string };
  if (body.status === 'registration_required') return body;
  const result: CustomerAuthResult = {
    accessToken: body.accessToken,
    customer: body.customer,
  };
  persistSession(result, remember);
  return { status: 'authenticated', result };
}

/**
 * Paso 3 (solo clientes nuevos): crea la cuenta con los datos capturados y
 * guarda la sesión.
 */
export async function completeRegistration(
  input: RegisterCustomerInput,
  remember = true,
): Promise<CustomerAuthResult> {
  const res = await fetch(`${API_URL}/customers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await readError(res, 'No se pudo completar el registro.');
  }
  const result = (await res.json()) as CustomerAuthResult;
  persistSession(result, remember);
  return result;
}

/** Verifica la sesión actual contra la API. Limpia si es inválida. */
export async function fetchCurrentCustomer(): Promise<CustomerProfile | null> {
  const token = getCustomerToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/customers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) clearCustomerSession();
      return null;
    }
    const profile = (await res.json()) as CustomerProfile;
    // Mantiene el perfil local al día (nuevas columnas, cambios hechos en
    // otro dispositivo, etc.).
    persistProfile(profile);
    return profile;
  } catch {
    return null;
  }
}

/** Guarda el perfil actualizado en localStorage (sin tocar el token). */
export function persistProfile(profile: CustomerProfile): void {
  // Escribe en el almacén donde vive la sesión (local o de sesión).
  sessionStore()?.setItem(CUSTOMER_KEY, JSON.stringify(profile));
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  gender?: 'female' | 'male' | 'other' | 'prefer_not';
  city?: string;
  interests?: string[];
}

/** Actualiza el perfil del cliente autenticado y refresca la sesión local. */
export async function updateCustomerProfile(
  input: UpdateCustomerInput,
): Promise<CustomerProfile> {
  const token = getCustomerToken();
  if (!token) throw new Error('No hay sesión iniciada.');
  const res = await fetch(`${API_URL}/customers/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readError(res, 'No se pudo guardar el perfil.');
  const profile = (await res.json()) as CustomerProfile;
  persistProfile(profile);
  return profile;
}

/** Cambia la preferencia de marketing del cliente. */
export async function updateMarketingOptIn(
  value: boolean,
): Promise<CustomerProfile> {
  const token = getCustomerToken();
  if (!token) throw new Error('No hay sesión iniciada.');
  const res = await fetch(`${API_URL}/customers/me/marketing`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ marketingOptIn: value }),
  });
  if (!res.ok) throw await readError(res, 'No se pudo guardar la preferencia.');
  const profile = (await res.json()) as CustomerProfile;
  persistProfile(profile);
  return profile;
}

/**
 * Líneas de negocio / intereses para segmentación. Se usan como multi-select
 * en el formulario de registro.
 */
export const INTEREST_OPTIONS: { value: string; label: string }[] = [
  { value: 'moda', label: 'Moda y ropa' },
  { value: 'decoracion', label: 'Decoración' },
  { value: 'hogar', label: 'Hogar' },
  { value: 'arte', label: 'Arte y diseño' },
  { value: 'mascotas', label: 'Mascotas' },
  { value: 'deporte', label: 'Deporte' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'empresas', label: 'Empresas y regalos corporativos' },
  { value: 'eventos', label: 'Eventos y celebraciones' },
];

/** Versión vigente del texto de consentimiento. */
export const CONSENT_VERSION = '2026-01';
