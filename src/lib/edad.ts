/** Fecha del compartir: sábado 5 de diciembre de 2026. */
export const FECHA_COMPARTIR = new Date(2026, 11, 5);
export const FECHA_COMPARTIR_ISO = '2026-12-05';
export const FECHA_COMPARTIR_TEXTO = 'sábado 5 de diciembre';
/** Datos del evento que se muestran al ingresar. */
export const DATOS_COMPARTIR = {
  fecha: 'Sábado 05 de diciembre',
  hora: 'Empezaremos desde las 06:00 p. m.',
  lugar: 'Por confirmar',
  lugarNota: 'Lo avisaremos por el grupo de WhatsApp de la familia.',
  limite: 'Domingo 22 de noviembre',
};

/** Cierre del registro: domingo 22 de noviembre de 2026, 23:59:59 hora de Lima (UTC-5). Misma fecha que navidad_cierre_registro() en la base. */
export const CIERRE_REGISTRO = new Date('2026-11-23T04:59:59Z');
export const registroCerrado = (ahora: Date = new Date()) => ahora > CIERRE_REGISTRO;

/** Organizadora de contacto para problemas con el código o el registro. Celular con código de país, solo dígitos. */
export const CONTACTO = {
  nombre: 'Rocío',
  celular: '', // ej. '51999999999'; vacío = se muestra solo el nombre, sin enlace
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
