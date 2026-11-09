-- Registro del compartir navideño. Proyecto Supabase christmas-family (khrmsbteunrzpdsrrhjy).
-- Autenticación con Clerk (third-party auth): el usuario se identifica por el claim sub del JWT de Clerk (texto).
-- Aplicada el 2026-11-08 (migración navidad_auth_clerk). Estado final del esquema.

create table public.navidad_familias (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,          -- id de usuario de Clerk (claim sub)
  email text not null,
  nombre text not null,
  parentesco text not null,
  celular text not null,
  asiste text not null check (asiste in ('Sí','Por confirmar','No')),
  ayuda text[] not null default '{}',
  comentarios text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.navidad_acompanantes (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.navidad_familias(id) on delete cascade,
  nombre text not null,
  relacion text not null,
  celular text,
  restricciones text,
  orden int not null default 0
);
create index navidad_acompanantes_familia_idx on public.navidad_acompanantes(familia_id);

create table public.navidad_ninos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.navidad_familias(id) on delete cascade,
  nombre text not null,
  fecha_nacimiento date not null,
  sexo text not null check (sexo in ('Niño','Niña')),
  intereses text,
  alergias text,
  orden int not null default 0
);
create index navidad_ninos_familia_idx on public.navidad_ninos(familia_id);

-- Organizadores: por correo (claim email del token de Clerk) o por id de usuario de Clerk.
create table public.navidad_admins (
  email text primary key,
  clerk_user_id text,
  created_at timestamptz not null default now()
);

create or replace function public.navidad_set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger navidad_familias_updated_at
before update on public.navidad_familias
for each row execute function public.navidad_set_updated_at();

-- Id del usuario autenticado (sub del JWT de Clerk). No usar auth.uid(): el sub de Clerk no es uuid.
create or replace function public.navidad_uid()
returns text
language sql stable
set search_path = public
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;
revoke all on function public.navidad_uid() from public, anon;
grant execute on function public.navidad_uid() to authenticated;

create or replace function public.navidad_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.navidad_admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
       or (a.clerk_user_id is not null and a.clerk_user_id = public.navidad_uid())
  );
$$;
revoke all on function public.navidad_is_admin() from public, anon;
grant execute on function public.navidad_is_admin() to authenticated;

create or replace function public.navidad_es_mi_familia(fid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.navidad_familias f
    where f.id = fid and f.user_id = public.navidad_uid()
  );
$$;
revoke all on function public.navidad_es_mi_familia(uuid) from public, anon;
grant execute on function public.navidad_es_mi_familia(uuid) to authenticated;

alter table public.navidad_familias enable row level security;
alter table public.navidad_acompanantes enable row level security;
alter table public.navidad_ninos enable row level security;
alter table public.navidad_admins enable row level security;

create policy "familias: leer propia o admin" on public.navidad_familias
  for select to authenticated
  using (user_id = public.navidad_uid() or public.navidad_is_admin());
create policy "familias: crear propia" on public.navidad_familias
  for insert to authenticated
  with check (user_id = public.navidad_uid());
create policy "familias: editar propia" on public.navidad_familias
  for update to authenticated
  using (user_id = public.navidad_uid()) with check (user_id = public.navidad_uid());
create policy "familias: borrar propia" on public.navidad_familias
  for delete to authenticated
  using (user_id = public.navidad_uid());

create policy "acompanantes: leer propios o admin" on public.navidad_acompanantes
  for select to authenticated
  using (public.navidad_es_mi_familia(familia_id) or public.navidad_is_admin());
create policy "acompanantes: escribir propios" on public.navidad_acompanantes
  for all to authenticated
  using (public.navidad_es_mi_familia(familia_id))
  with check (public.navidad_es_mi_familia(familia_id));

create policy "ninos: leer propios o admin" on public.navidad_ninos
  for select to authenticated
  using (public.navidad_es_mi_familia(familia_id) or public.navidad_is_admin());
create policy "ninos: escribir propios" on public.navidad_ninos
  for all to authenticated
  using (public.navidad_es_mi_familia(familia_id))
  with check (public.navidad_es_mi_familia(familia_id));

create policy "admins: leer si admin" on public.navidad_admins
  for select to authenticated
  using (public.navidad_is_admin());

insert into public.navidad_admins(email) values ('rcronald@gmail.com');

-- Realtime para el panel de organizadores (respeta RLS)
alter publication supabase_realtime add table public.navidad_familias;
alter publication supabase_realtime add table public.navidad_acompanantes;
alter publication supabase_realtime add table public.navidad_ninos;
