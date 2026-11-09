/**
 * Medición de uso: registra acciones (no datos personales) en navidad_eventos.
 * Nunca bloquea la interfaz ni lanza: si falla, se ignora en silencio.
 */
import { supabase } from './supabase';

export type Evento =
  | 'visita' | 'vio_login' | 'ingreso' | 'vio_formulario' | 'validacion_fallo' | 'guardo' | 'edito'
  | 'agrego_nino' | 'agrego_acompanante' | 'cancelo' | 'reconfirmo' | 'error_guardar'
  | 'musica_abrio' | 'musica_play' | 'musica_cambio' | 'musica_mute'
  | 'admin_abrio' | 'admin_excel';

type Detalle = Record<string, string | number | boolean | null>;

const CLAVE_SESION = 'navidad.visitante';
const CLAVE_DESDE = 'navidad.desde';

/**
 * Id aleatorio por navegador: vive en localStorage, así una misma persona que cierra y vuelve a abrir
 * la pestaña sigue contando como una sola. Si localStorage no está disponible (modo privado estricto),
 * cae a sessionStorage y, en último caso, a un id por carga de página.
 */
let idEnMemoria: string | null = null;
function sesionId(): string {
  if (idEnMemoria) return idEnMemoria;
  const nuevo = () => crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  // El propio acceso a localStorage puede lanzar (modo privado estricto), por eso va dentro del try.
  for (const almacen of [() => localStorage, () => sessionStorage]) {
    try {
      const store = almacen();
      let s = store.getItem(CLAVE_SESION);
      if (!s) { s = nuevo(); store.setItem(CLAVE_SESION, s); }
      idEnMemoria = s;
      return s;
    } catch { /* probar el siguiente almacén */ }
  }
  idEnMemoria = nuevo();
  return idEnMemoria;
}

/** Origen de la visita (?desde=whatsapp en la invitación). Se recuerda para toda la sesión. */
function desde(): string | null {
  try {
    const p = new URLSearchParams(location.search).get('desde');
    if (p) sessionStorage.setItem(CLAVE_DESDE, p.slice(0, 40));
    return sessionStorage.getItem(CLAVE_DESDE);
  } catch {
    return null;
  }
}

function navegador(): string {
  const ua = navigator.userAgent;
  const m = ua.match(/(Edg|OPR|SamsungBrowser|Chrome|Firefox|Safari)\/(\d+)/g) ?? [];
  // Chrome y Edge también incluyen "Safari"; nos quedamos con el más específico
  const pref = ['Edg', 'OPR', 'SamsungBrowser', 'Firefox', 'Chrome', 'Safari'];
  for (const p of pref) {
    const hit = m.find((x) => x.startsWith(p + '/'));
    if (hit) return hit.replace('Edg', 'Edge').replace('OPR', 'Opera').replace('/', ' ');
  }
  return 'otro';
}

const dispositivo = () => (matchMedia('(pointer: coarse)').matches || innerWidth < 768 ? 'movil' : 'escritorio');

let userId: string | null = null;
/** Lo llama la página cuando conoce al usuario, para ligar los eventos siguientes. */
export function usuarioEventos(id: string | null) { userId = id; }

/** Registra un evento. No espera respuesta ni lanza errores. */
export function registrar(evento: Evento, detalle: Detalle = {}) {
  try {
    const fila = {
      evento, detalle, user_id: userId, sesion: sesionId(),
      pagina: location.pathname.slice(0, 120), dispositivo: dispositivo(), navegador: navegador(),
      ancho: innerWidth, desde: desde(),
    };
    void supabase.from('navidad_eventos').insert(fila).then(({ error }) => {
      if (error && import.meta.env.DEV) console.warn('[eventos]', evento, error.message);
    });
  } catch { /* nunca interrumpir la página por la medición */ }
}

/** Evento de visita a la página actual, una vez por carga. */
export function registrarVisita() {
  registrar('visita', { ref: document.referrer ? new URL(document.referrer).hostname : '' });
}
