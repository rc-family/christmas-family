-- Totales agregados del registro (sin datos personales) para métricas de Sentry.
-- Cuenta solo familias que no respondieron "No". Cualquier usuario con sesión puede llamarla.
create or replace function public.navidad_totales()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with fam as (
    select id, asiste from public.navidad_familias
  ),
  activas as (select id from fam where asiste <> 'No')
  select jsonb_build_object(
    'familias', (select count(*) from fam),
    'familias_si', (select count(*) from fam where asiste = 'Sí'),
    'familias_por_confirmar', (select count(*) from fam where asiste = 'Por confirmar'),
    'familias_no', (select count(*) from fam where asiste = 'No'),
    'padres', (select count(*) from activas),
    'acompanantes', (select count(*) from public.navidad_acompanantes a join activas f on f.id = a.familia_id),
    'ninos_varones', (select count(*) from public.navidad_ninos n join activas f on f.id = n.familia_id where n.sexo = 'Niño'),
    'ninos_mujeres', (select count(*) from public.navidad_ninos n join activas f on f.id = n.familia_id where n.sexo = 'Niña')
  );
$$;
revoke all on function public.navidad_totales() from public, anon;
grant execute on function public.navidad_totales() to authenticated;
