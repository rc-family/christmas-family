-- Organizadores: usuarios de Clerk con public metadata {"role": "admin"}.
-- Clerk debe exponer el metadata en el token (Configure → Sessions → Customize session token):
--   { "metadata": "{{user.public_metadata}}" }
create or replace function public.navidad_is_admin()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'metadata' ->> 'role', '') = 'admin';
$$;
revoke all on function public.navidad_is_admin() from public, anon;
grant execute on function public.navidad_is_admin() to authenticated;

-- Ya no hace falta la lista de organizadores en la base.
drop policy if exists "admins: leer si admin" on public.navidad_admins;
drop table if exists public.navidad_admins;
