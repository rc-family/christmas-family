-- Medición de uso: un evento por acción relevante (embudo de registro, música, admin).
-- Cualquier visitante puede insertar (con límites); solo los organizadores pueden leer.
-- Nunca se guardan datos personales en `detalle` (lo controla la app, no la base).

create table if not exists public.navidad_eventos (
  id          bigint generated always as identity primary key,
  creado      timestamptz not null default now(),
  evento      text not null,
  detalle     jsonb not null default '{}'::jsonb,
  user_id     text,                 -- id de Clerk cuando la persona ya ingresó
  sesion      text not null,        -- id aleatorio por navegador (localStorage) para unir los pasos de una persona
  pagina      text not null,
  dispositivo text not null,        -- "movil" | "escritorio"
  navegador   text,
  ancho       integer,
  desde       text,                 -- origen de la visita (?desde=whatsapp)
  constraint navidad_eventos_evento_valido check (evento in (
    'visita', 'vio_login', 'ingreso', 'vio_formulario', 'validacion_fallo', 'guardo', 'edito',
    'agrego_nino', 'agrego_acompanante', 'cancelo', 'reconfirmo', 'error_guardar',
    'musica_abrio', 'musica_play', 'musica_cambio', 'musica_mute',
    'admin_abrio', 'admin_excel'
  )),
  constraint navidad_eventos_detalle_pequeno check (pg_column_size(detalle) <= 2000),
  constraint navidad_eventos_textos_cortos check (
    length(sesion) <= 40 and length(pagina) <= 120 and length(dispositivo) <= 20
    and coalesce(length(navegador), 0) <= 60 and coalesce(length(desde), 0) <= 40
    and coalesce(length(user_id), 0) <= 80
  )
);

create index if not exists navidad_eventos_creado_idx on public.navidad_eventos (creado desc);
create index if not exists navidad_eventos_sesion_idx on public.navidad_eventos (sesion);

alter table public.navidad_eventos enable row level security;

-- Insertar: visitantes anónimos y usuarios con sesión. El user_id, si viene, debe ser el propio.
drop policy if exists "eventos: insertar" on public.navidad_eventos;
create policy "eventos: insertar" on public.navidad_eventos
  for insert to anon, authenticated
  with check (user_id is null or user_id = public.navidad_uid());

-- Leer: solo organizadores. No hay políticas de update ni delete.
drop policy if exists "eventos: leer si admin" on public.navidad_eventos;
create policy "eventos: leer si admin" on public.navidad_eventos
  for select to authenticated
  using (public.navidad_is_admin());

grant insert on public.navidad_eventos to anon, authenticated;
grant select on public.navidad_eventos to authenticated;
grant execute on function public.navidad_uid() to anon;

-- Realtime: el panel de organización se suscribe a las inserciones para refrescar los indicadores en vivo.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'navidad_eventos'
  ) then
    alter publication supabase_realtime add table public.navidad_eventos;
  end if;
end $$;
