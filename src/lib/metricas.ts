/**
 * Métricas de Sentry (Application Metrics) sobre el registro.
 * - Gauges con el estado actual (totales) tras cada guardado y al abrir el panel.
 * - Counters por acción (cada respuesta guardada), con atributos para filtrar.
 * Solo números agregados: nunca nombres ni datos personales.
 */
import * as Sentry from '@sentry/astro';
import { supabase } from './supabase';

interface Totales {
  familias: number; familias_si: number; familias_por_confirmar: number; familias_no: number;
  padres: number; acompanantes: number; ninos_varones: number; ninos_mujeres: number;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Lee los totales agregados (RPC con security definer; no expone filas). */
export async function leerTotales(): Promise<Totales | null> {
  const { data, error } = await supabase.rpc('navidad_totales');
  if (error || !data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  return {
    familias: num(d.familias), familias_si: num(d.familias_si), familias_por_confirmar: num(d.familias_por_confirmar), familias_no: num(d.familias_no),
    padres: num(d.padres), acompanantes: num(d.acompanantes), ninos_varones: num(d.ninos_varones), ninos_mujeres: num(d.ninos_mujeres),
  };
}

/** Envía a Sentry los totales actuales como gauges. Devuelve los totales o null si no se pudieron leer. */
export async function emitirTotales(origen: 'registro' | 'admin'): Promise<Totales | null> {
  try {
    const t = await leerTotales();
    if (!t) return null;
    const attrs = { origen };
    // Adultos: total y por tipo
    Sentry.metrics.gauge('registro.adultos', t.padres + t.acompanantes, { attributes: { ...attrs, tipo: 'total' } });
    Sentry.metrics.gauge('registro.adultos', t.padres, { attributes: { ...attrs, tipo: 'responsable' } });
    Sentry.metrics.gauge('registro.adultos', t.acompanantes, { attributes: { ...attrs, tipo: 'acompanante' } });
    // Niños: total y por sexo
    Sentry.metrics.gauge('registro.ninos', t.ninos_varones + t.ninos_mujeres, { attributes: { ...attrs, sexo: 'total' } });
    Sentry.metrics.gauge('registro.ninos', t.ninos_varones, { attributes: { ...attrs, sexo: 'nino' } });
    Sentry.metrics.gauge('registro.ninos', t.ninos_mujeres, { attributes: { ...attrs, sexo: 'nina' } });
    // Familias por respuesta
    Sentry.metrics.gauge('registro.familias', t.familias, { attributes: { ...attrs, asiste: 'total' } });
    Sentry.metrics.gauge('registro.familias', t.familias_si, { attributes: { ...attrs, asiste: 'si' } });
    Sentry.metrics.gauge('registro.familias', t.familias_por_confirmar, { attributes: { ...attrs, asiste: 'por_confirmar' } });
    Sentry.metrics.gauge('registro.familias', t.familias_no, { attributes: { ...attrs, asiste: 'no' } });
    return t;
  } catch {
    return null;
  }
}

/** Una respuesta guardada: cuenta la acción y lo que incluyó. */
export function contarGuardado(d: { nuevo: boolean; asiste: string; adultos: number; ninos: number; ninas: number }) {
  try {
    const base = { nuevo: d.nuevo, asiste: d.asiste };
    Sentry.metrics.count('registro.guardado', 1, { attributes: base });
    if (d.adultos) Sentry.metrics.count('registro.guardado.adultos', d.adultos, { attributes: base });
    if (d.ninos) Sentry.metrics.count('registro.guardado.ninos', d.ninos, { attributes: { ...base, sexo: 'nino' } });
    if (d.ninas) Sentry.metrics.count('registro.guardado.ninos', d.ninas, { attributes: { ...base, sexo: 'nina' } });
  } catch { /* la medición nunca interrumpe */ }
}
