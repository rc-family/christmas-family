/** Fecha del compartir: sábado 5 de diciembre de 2026. */
export const FECHA_COMPARTIR = new Date(2026, 11, 5);
export const FECHA_COMPARTIR_ISO = '2026-12-05';
export const FECHA_COMPARTIR_TEXTO = 'sábado 5 de diciembre';
/** Datos del evento que se muestran al ingresar. */
export const DATOS_COMPARTIR = {
  fecha: '05 de diciembre del 2026',
  hora: '06:00 p. m.',
  lugar: 'Por confirmar',
};

/** Meses completos entre la fecha de nacimiento y el día del compartir (negativo si aún no nació). */
function mesesAlCompartir(fechaIso: string): number | null {
  const d = new Date(fechaIso + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  let meses = (FECHA_COMPARTIR.getFullYear() - d.getFullYear()) * 12 + (FECHA_COMPARTIR.getMonth() - d.getMonth());
  if (FECHA_COMPARTIR.getDate() < d.getDate()) meses--;
  return meses;
}

/** Edad legible el día del compartir a partir de una fecha ISO (YYYY-MM-DD). */
export function edadAlCompartir(fechaIso: string | null | undefined): string {
  if (!fechaIso) return '';
  const meses = mesesAlCompartir(fechaIso);
  if (meses === null) return '';
  const y = Math.floor(Math.max(0, meses) / 12), m = Math.max(0, meses) % 12;
  if (y <= 0) return m + (m === 1 ? ' mes' : ' meses');
  return y + (y === 1 ? ' año' : ' años') + (y < 3 ? ' ' + m + 'm' : '');
}

/** Años cumplidos (entero) el día del compartir. */
export function aniosAlCompartir(fechaIso: string): number {
  const meses = mesesAlCompartir(fechaIso) ?? 0;
  return Math.floor(Math.max(0, meses) / 12);
}

export function rangoEdad(fechaIso: string): string {
  const y = aniosAlCompartir(fechaIso);
  if (y < 1) return '0-1';
  if (y <= 3) return '1-3';
  if (y <= 6) return '4-6';
  if (y <= 9) return '7-9';
  return '10+';
}
