-- Cierre del registro: después del domingo 22 de noviembre de 2026 a las 23:59:59 (hora de Lima, UTC-5)
-- la base rechaza cualquier guardado. La misma fecha vive en src/lib/edad.ts (CIERRE_REGISTRO);
-- si se cambia una, cambiar la otra.
create or replace function public.navidad_cierre_registro()
returns timestamptz
language sql
immutable
as $$ select timestamptz '2026-11-23 04:59:59+00' $$;
grant execute on function public.navidad_cierre_registro() to anon, authenticated;

create or replace function public.navidad_guardar_respuesta(p_email text, p_datos jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid text := public.navidad_uid();
  v_fid uuid;
begin
  if v_uid is null then
    raise exception 'Sesión no válida' using errcode = '42501';
  end if;
  if now() > public.navidad_cierre_registro() then
    raise exception 'El registro cerró el domingo 22 de noviembre. Para cambios, escribe a la organizadora.' using errcode = 'P0001';
  end if;

  insert into public.navidad_familias (user_id, email, nombre, parentesco, celular, asiste, ayuda, comentarios)
  values (
    v_uid, p_email,
    p_datos->>'nombre', p_datos->>'parentesco', p_datos->>'celular', p_datos->>'asiste',
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_datos->'ayuda', '[]'::jsonb)) x), '{}'::text[]),
    nullif(p_datos->>'comentarios', '')
  )
  on conflict (user_id) do update set
    email = excluded.email, nombre = excluded.nombre, parentesco = excluded.parentesco, celular = excluded.celular,
    asiste = excluded.asiste, ayuda = excluded.ayuda, comentarios = excluded.comentarios
  returning id into v_fid;

  delete from public.navidad_acompanantes where familia_id = v_fid;
  delete from public.navidad_ninos where familia_id = v_fid;

  insert into public.navidad_acompanantes (familia_id, nombre, relacion, celular, restricciones, orden)
  select v_fid, a->>'nombre', a->>'relacion', nullif(a->>'celular', ''), nullif(a->>'restricciones', ''), (ord - 1)::int
  from jsonb_array_elements(coalesce(p_datos->'acompanantes', '[]'::jsonb)) with ordinality as t(a, ord);

  insert into public.navidad_ninos (familia_id, nombre, fecha_nacimiento, sexo, intereses, alergias, orden)
  select v_fid, n->>'nombre', (n->>'fecha_nacimiento')::date, n->>'sexo', nullif(n->>'intereses', ''), nullif(n->>'alergias', ''), (ord - 1)::int
  from jsonb_array_elements(coalesce(p_datos->'ninos', '[]'::jsonb)) with ordinality as t(n, ord);

  return v_fid;
end;
$$;
