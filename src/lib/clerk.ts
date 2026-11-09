import { Clerk } from '@clerk/clerk-js';
import { ui } from '@clerk/ui';
import { esES } from '@clerk/localizations';
import { ruta } from './rutas';

const key = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;

export const clerk = key ? new Clerk(key) : null;
// Solo en desarrollo: acceso desde la consola para depurar el token.
if (import.meta.env.DEV && clerk) (window as unknown as { __clerk: Clerk }).__clerk = clerk;
let loading: Promise<Clerk | null> | null = null;

/** Carga Clerk una sola vez. Devuelve null si falta la clave publicable. */
export function loadClerk(): Promise<Clerk | null> {
  if (!clerk) return Promise.resolve(null);
  // clerk-js v6 no incluye la interfaz: se pasa el paquete @clerk/ui empaquetado con la app.
  loading ??= clerk
    .load({ ui, localization: esES, signInUrl: ruta('/'), signUpUrl: ruta('/'), afterSignOutUrl: ruta('/') })
    .then(() => clerk);
  return loading;
}

export interface Usuario {
  id: string;
  email: string;
  /** Rol en el public metadata de Clerk ({"role": "admin"} para organizadores). */
  rol: string | null;
}

function rolDe(u: { publicMetadata?: Record<string, unknown> } | null | undefined): string | null {
  const r = u?.publicMetadata?.role;
  return typeof r === 'string' ? r : null;
}

/** Usuario con sesión activa en Clerk, o null. */
export async function usuarioActual(): Promise<Usuario | null> {
  const c = await loadClerk();
  const u = c?.user;
  if (!c?.session || !u) return null;
  return { id: u.id, email: u.primaryEmailAddress?.emailAddress ?? '', rol: rolDe(u) };
}

/** true si el usuario tiene role = "admin" en su public metadata de Clerk. */
export async function esAdmin(): Promise<boolean> {
  const c = await loadClerk();
  return rolDe(c?.user) === 'admin';
}

/** Token de sesión de Clerk para Supabase (integración third-party auth). */
export async function tokenSupabase(): Promise<string | null> {
  const c = await loadClerk();
  return (await c?.session?.getToken()) ?? null;
}

/** Paleta de la hoja aplicada a los componentes de Clerk. */
export const aparienciaClerk = {
  variables: {
    colorPrimary: '#b8322c',
    colorText: '#1c241f',
    colorTextSecondary: '#5e6a63',
    colorBackground: '#fbf8f2',
    colorInputBackground: '#f1ece2',
    colorInputText: '#1c241f',
    colorNeutral: '#1c241f',
    borderRadius: '10px',
    fontFamily: '"Figtree", system-ui, sans-serif',
    fontSize: '15px',
  },
  elements: {
    rootBox: { width: '100%' },
    cardBox: { width: '100%', maxWidth: 'none', boxShadow: 'none', border: '1.5px solid #d9d2c3' },
    card: { padding: '22px 18px' },
    footer: { display: 'none' },
    header: { display: 'none' },
    formButtonPrimary: { fontWeight: '700', fontSize: '15px', padding: '12px 18px' },
  },
};
