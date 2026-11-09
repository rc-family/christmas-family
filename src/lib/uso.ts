/**
 * Resumen de uso del sitio a partir de navidad_eventos: embudo, dispositivos, fricción y música.
 * Puro (sin DOM) para poder probarlo y reutilizarlo en el Excel.
 */
import type { Database } from './database.types';

export type EventoRow = Database['public']['Tables']['navidad_eventos']['Row'];

export interface PasoEmbudo { clave: string; etiqueta: string; sesiones: number; pct: number }
export interface Conteo { clave: string; n: number }

export interface ResumenUso {
  sesiones: number;
  usuarios: number;
  embudo: PasoEmbudo[];
  dispositivos: Conteo[];
  navegadores: Conteo[];
  origenes: Conteo[];
  camposFallidos: Conteo[];
  intentosFallidos: number;
  erroresGuardar: number;
  segundosMediana: number | null;
  musica: { abrieron: number; dieronPlay: number; pistas: Conteo[] };
  ultimos: EventoRow[];
}

/** Pasos del embudo, en orden. Cada paso cuenta sesiones distintas que llegaron a él. */
const PASOS: [string, string][] = [
  ['visita', 'Entraron al sitio'],
  ['vio_login', 'Vieron el ingreso'],
  ['ingreso', 'Ingresaron con su correo'],
  ['vio_formulario', 'Vieron el formulario'],
  ['guardo', 'Guardaron su respuesta'],
];

const ETIQUETAS: Record<string, string> = {
  visita: 'Visita', vio_login: 'Vio el ingreso', ingreso: 'Ingresó', vio_formulario: 'Vio el formulario',
  validacion_fallo: 'Validación fallida', guardo: 'Guardó', edito: 'Editó', agrego_nino: 'Agregó niño',
  agrego_acompanante: 'Agregó acompañante', cancelo: 'Canceló', reconfirmo: 'Reconfirmó', error_guardar: 'Error al guardar',
  musica_abrio: 'Abrió la música', musica_play: 'Dio play', musica_cambio: 'Cambió canción', musica_mute: 'Silenció',
  admin_abrio: 'Abrió el panel', admin_excel: 'Exportó Excel',
};
export const etiquetaEvento = (e: string) => ETIQUETAS[e] ?? e;

const CAMPOS: Record<string, string> = {
  nombre: 'Nombre', parentesco: 'Parentesco', celular: 'Celular', asiste: 'Asistencia', acompanante: 'Acompañante', nino: 'Niño',
};

function contar(valores: (string | null | undefined)[], vacio = 'desconocido'): Conteo[] {
  const m = new Map<string, number>();
  for (const v of valores) { const k = v || vacio; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m].map(([clave, n]) => ({ clave, n })).sort((a, b) => b.n - a.n);
}

function detalle(e: EventoRow): Record<string, unknown> {
  return e.detalle && typeof e.detalle === 'object' && !Array.isArray(e.detalle) ? (e.detalle as Record<string, unknown>) : {};
}

export function resumirUso(todos: EventoRow[]): ResumenUso {
  // El panel de organización no es uso de las familias: sus eventos quedan fuera de los indicadores,
  // pero sí se muestran en la lista de últimos eventos.
  const eventos = todos.filter((e) => !/\/admin\/?$/.test(e.pagina));
  // Una persona = una sesión de navegador; si ingresó, la unimos por user_id para no contarla dos veces.
  const persona = (e: EventoRow) => e.user_id ?? 's:' + e.sesion;
  const sesionUsuario = new Map<string, string>();
  for (const e of eventos) if (e.user_id) sesionUsuario.set(e.sesion, e.user_id);
  const quien = (e: EventoRow) => e.user_id ?? sesionUsuario.get(e.sesion) ?? persona(e);

  const porPaso = new Map<string, Set<string>>();
  for (const e of eventos) {
    if (!porPaso.has(e.evento)) porPaso.set(e.evento, new Set());
    porPaso.get(e.evento)!.add(quien(e));
  }
  const total = new Set(eventos.map(quien)).size;
  // Acumulativo: quien llegó a un paso cuenta también en los anteriores (p. ej. quien entra con sesión
  // guardada no ve el login, pero sí "ingresó"). Así el embudo nunca sube de un paso al siguiente.
  const embudo = PASOS.map(([clave, etiqueta], i) => {
    const llegaron = new Set<string>();
    for (const [k] of PASOS.slice(i)) porPaso.get(k)?.forEach((q) => llegaron.add(q));
    const n = llegaron.size;
    return { clave, etiqueta, sesiones: n, pct: total ? Math.round((n / total) * 100) : 0 };
  });

  // Dispositivo y navegador: uno por persona (el de su primer evento)
  const primero = new Map<string, EventoRow>();
  for (const e of [...eventos].sort((a, b) => a.creado.localeCompare(b.creado))) {
    const k = quien(e); if (!primero.has(k)) primero.set(k, e);
  }
  const primeros = [...primero.values()];

  const fallos = eventos.filter((e) => e.evento === 'validacion_fallo');
  const campos = fallos.flatMap((e) => String(detalle(e).campos ?? '').split(',').filter(Boolean));

  const segundos = eventos
    .filter((e) => e.evento === 'guardo' && detalle(e).nuevo === true)
    .map((e) => Number(detalle(e).segundos)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  const mediana = segundos.length ? segundos[Math.floor(segundos.length / 2)] : null;

  const plays = eventos.filter((e) => e.evento === 'musica_play' || e.evento === 'musica_cambio');

  return {
    sesiones: total,
    usuarios: new Set(eventos.map((e) => e.user_id).filter(Boolean)).size,
    embudo,
    dispositivos: contar(primeros.map((e) => e.dispositivo)),
    navegadores: contar(primeros.map((e) => e.navegador)),
    origenes: contar(primeros.map((e) => e.desde), 'directo'),
    camposFallidos: contar(campos).map((c) => ({ clave: CAMPOS[c.clave] ?? c.clave, n: c.n })),
    intentosFallidos: fallos.length,
    erroresGuardar: eventos.filter((e) => e.evento === 'error_guardar').length,
    segundosMediana: mediana,
    musica: {
      abrieron: porPaso.get('musica_abrio')?.size ?? 0,
      dieronPlay: porPaso.get('musica_play')?.size ?? 0,
      pistas: contar(plays.map((e) => String(detalle(e).pista ?? ''))).filter((c) => c.clave !== 'desconocido'),
    },
    ultimos: [...todos].sort((a, b) => b.creado.localeCompare(a.creado)).slice(0, 40),
  };
}

/** Texto corto del detalle para la lista de últimos eventos (sin datos personales). */
export function detalleTexto(e: EventoRow): string {
  const d = detalle(e);
  switch (e.evento) {
    case 'guardo': return `${d.nuevo ? 'nuevo' : 'cambio'} · ${d.asiste} · ${d.ninos} niño(s), ${d.acompanantes} acomp.` + (d.segundos ? ` · ${d.segundos}s` : '');
    case 'validacion_fallo': return 'faltó: ' + String(d.campos ?? '').split(',').map((c) => CAMPOS[c] ?? c).join(', ');
    case 'error_guardar': return String(d.mensaje ?? '');
    case 'musica_play': case 'musica_cambio': return String(d.pista ?? '');
    case 'musica_mute': return d.silenciado ? 'silenció' : 'activó sonido';
    case 'visita': return d.ref ? 'desde ' + d.ref : '';
    default: return '';
  }
}
