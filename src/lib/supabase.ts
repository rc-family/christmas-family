import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { tokenSupabase, usuarioActual, loadClerk, esAdmin, type Usuario } from './clerk';
import { ruta } from './rutas';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY en el archivo .env');
}

/**
 * Cliente de Supabase que firma cada petición con el token de sesión de Clerk.
 * Supabase lo valida como proveedor externo (Authentication → Third-party Auth → Clerk)
 * y las políticas RLS leen el id de usuario desde el claim sub.
 */
export const supabase = createClient<Database>(url, key, {
  accessToken: tokenSupabase,
});

/** Devuelve el usuario autenticado en Clerk o redirige al login. */
export async function requireUser(): Promise<Usuario | null> {
  const user = await usuarioActual();
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.replace(`${ruta('/')}?next=${next}`);
    return null;
  }
  return user;
}

/**
 * Organizador = role "admin" en el public metadata de Clerk. Esto solo decide qué se muestra;
 * el acceso a los datos lo garantiza RLS leyendo el mismo rol desde el claim `metadata` del token.
 */
export const isAdmin = esAdmin;

export async function signOut() {
  const c = await loadClerk();
  if (c) await c.signOut();
  location.replace(ruta('/'));
}
