-- El cierre del registro también en RLS: después de la fecha nadie puede escribir en las tablas
-- aunque llame a la API directamente (la RPC navidad_guardar_respuesta ya lo comprobaba).
-- La lectura no cambia. Debe aplicarse después de 20261109184037_navidad_cierre_registro.sql.
create or replace function public.navidad_registro_abierto()
returns boolean
language sql
stable
as $$ select now() <= public.navidad_cierre_registro() $$;
grant execute on function public.navidad_registro_abierto() to anon, authenticated;

-- Familias
drop policy if exists "familias: crear propia" on public.navidad_familias;
create policy "familias: crear propia" on public.navidad_familias
  for insert to authenticated
  with check (user_id = public.navidad_uid() and public.navidad_registro_abierto());

drop policy if exists "familias: editar propia" on public.navidad_familias;
create policy "familias: editar propia" on public.navidad_familias
  for update to authenticated
  using (user_id = public.navidad_uid() and public.navidad_registro_abierto())
  with check (user_id = public.navidad_uid() and public.navidad_registro_abierto());

drop policy if exists "familias: borrar propia" on public.navidad_familias;
create policy "familias: borrar propia" on public.navidad_familias
  for delete to authenticated
  using (user_id = public.navidad_uid() and public.navidad_registro_abierto());

-- Acompañantes: una política por operación de escritura (la de lectura se mantiene)
drop policy if exists "acompanantes: escribir propios" on public.navidad_acompanantes;
create policy "acompanantes: crear propios" on public.navidad_acompanantes
  for insert to authenticated
  with check (public.navidad_es_mi_familia(familia_id) and public.navidad_registro_abierto());
create policy "acompanantes: editar propios" on public.navidad_acompanantes
  for update to authenticated
  using (public.navidad_es_mi_familia(familia_id) and public.navidad_registro_abierto())
  with check (public.navidad_es_mi_familia(familia_id) and public.navidad_registro_abierto());
create policy "acompanantes: borrar propios" on public.navidad_acompanantes
  for delete to authenticated
  using (public.navidad_es_mi_familia(familia_id) and public.navidad_registro_abierto());

-- Niños
drop policy if exists "ninos: escribir propios" on public.navidad_ninos;
create policy "ninos: crear propios" on public.navidad_ninos
  for insert to authenticated
  with check (public.navidad_es_mi_familia(familia_id) and public.navidad_registro_abierto());
create policy "ninos: editar propios" on public.navidad_ninos
  for update to authenticated
  using (public.navidad_es_mi_familia(familia_id) and public.navidad_registro_abierto())
  with check (public.navidad_es_mi_familia(familia_id) and public.navidad_registro_abierto());
create policy "ninos: borrar propios" on public.navidad_ninos
  for delete to authenticated
  using (public.navidad_es_mi_familia(familia_id) and public.navidad_registro_abierto());
