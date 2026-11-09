import { supabase, requireUser, isAdmin, signOut } from '../lib/supabase';
import { edadAlCompartir, aniosAlCompartir, rangoEdad } from '../lib/edad';
import type { FamiliaRow, AcompananteRow, NinoRow } from '../lib/database.types';
import * as XLSX from 'xlsx';
import { el, tarjetaFamilia } from '../lib/tarjeta';
import { registrar, registrarVisita, usuarioEventos } from '../lib/eventos';
import { resumirUso, etiquetaEvento, detalleTexto, type EventoRow, type ResumenUso, type Conteo } from '../lib/uso';
import { emitirTotales } from '../lib/metricas';

type Familia = FamiliaRow & { navidad_acompanantes: AcompananteRow[]; navidad_ninos: NinoRow[] };
type Fila = (string | number)[];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const ORDEN_RANGOS = ['0-1', '1-3', '4-6', '7-9', '10+'];
const ORDEN_AYUDA = ['Comida', 'Decoración', 'Juegos', 'Papá Noel', 'Música'];

/** Texto legible para errores de Supabase (objetos planos) o excepciones. */
function mensajeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const o = e as { message?: string; code?: string; hint?: string; details?: string };
    const partes = [o.message, o.details, o.hint].filter(Boolean);
    return (o.code ? `[${o.code}] ` : '') + (partes.join('. ') || JSON.stringify(e));
  }
  return String(e);
}
$('logoutBtn').addEventListener('click', signOut);

function td(text: string, cls = '') { return el('td', cls, text); }
function tr(cells: HTMLTableCellElement[]) { const r = el('tr'); cells.forEach((c) => r.appendChild(c)); return r; }
function fecha(iso: string) { return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }); }

/** Lista clave → valor dentro de una tarjeta de resumen. */
function llenarDl(dl: HTMLElement, filas: [string, number | string, boolean?][]) {
  dl.innerHTML = '';
  for (const [k, v, sub] of filas) {
    dl.appendChild(el('dt', sub ? 'sub' : '', k));
    dl.appendChild(el('dd', '', String(v)));
  }
}

/** Datos de la última carga, listos para exportar a Excel. */
const hojas = { resumen: [] as Fila[], familias: [] as Fila[], acompanantes: [] as Fila[], ninos: [] as Fila[], uso: [] as Fila[] };

function render(fams: Familia[]) {
  const cont = $('familias'), rowsN = $('rowsNinos');
  cont.innerHTML = ''; rowsN.innerHTML = '';
  hojas.ninos = [['Niño', 'Fecha de nacimiento', 'Edad al 5/12', 'Sexo', 'Intereses', 'Alergias', 'Familia', 'Parentesco', 'Celular', 'Asiste']];
  hojas.familias = [['Responsable', 'Parentesco', 'Celular', 'Correo', 'Asiste', 'Adultos', 'Niños', 'Ayuda', 'Comentarios', 'Enviado']];
  hojas.acompanantes = [['Acompañante', 'Relación', 'Celular', 'Restricciones', 'Familia', 'Asiste']];

  // Contadores (solo familias que no dijeron "No")
  let padres = 0, acompanantes = 0, ninos = 0, varones = 0, mujeres = 0;
  const asiste: Record<string, number> = { 'Sí': 0, 'Por confirmar': 0, 'No': 0 };
  const rangos: Record<string, number> = {};
  const ayudas: Record<string, number> = {};
  let conRestricciones = 0, conAlergias = 0;
  const ninosPlano: { n: NinoRow; f: Familia }[] = [];

  for (const f of fams) {
    const acomp = [...f.navidad_acompanantes].sort((a, b) => a.orden - b.orden);
    const kids = [...f.navidad_ninos].sort((a, b) => a.orden - b.orden);
    const cuenta = f.asiste !== 'No';
    asiste[f.asiste] = (asiste[f.asiste] || 0) + 1;
    if (cuenta) {
      padres++; acompanantes += acomp.length;
      conRestricciones += acomp.filter((a) => a.restricciones).length;
      f.ayuda.forEach((a) => { ayudas[a] = (ayudas[a] || 0) + 1; });
      for (const n of kids) {
        ninos++; if (n.sexo === 'Niño') varones++; else mujeres++;
        if (n.alergias) conAlergias++;
        const r = rangoEdad(n.fecha_nacimiento); rangos[r] = (rangos[r] || 0) + 1;
      }
    }
    kids.forEach((n) => ninosPlano.push({ n, f }));

    // Tarjeta de la familia: responsable + acompañantes + hijos (con datos para filtrar)
    const card = tarjetaFamilia({
      nombre: f.nombre, parentesco: f.parentesco, celular: f.celular, email: f.email, asiste: f.asiste,
      ayuda: f.ayuda, comentarios: f.comentarios, enviado: fecha(f.updated_at),
      acompanantes: acomp,
      ninos: kids.map((n) => ({ nombre: n.nombre, fecha: n.fecha_nacimiento, sexo: n.sexo, intereses: n.intereses, alergias: n.alergias })),
    });
    card.dataset.asiste = f.asiste;
    card.dataset.busca = [f.nombre, f.parentesco, f.celular, f.email, ...acomp.map((a) => a.nombre), ...kids.map((n) => n.nombre)].join(' ').toLowerCase();
    cont.appendChild(card);
    for (const a of acomp) hojas.acompanantes.push([a.nombre, a.relacion, a.celular ?? '', a.restricciones ?? '', f.nombre, f.asiste]);
    for (const n of kids) hojas.ninos.push([n.nombre, n.fecha_nacimiento, edadAlCompartir(n.fecha_nacimiento), n.sexo, n.intereses ?? '', n.alergias ?? '', f.nombre, f.parentesco, f.celular, f.asiste]);

    hojas.familias.push([
      f.nombre, f.parentesco, f.celular, f.email, f.asiste, 1 + acomp.length, kids.length,
      f.ayuda.join(', '), f.comentarios ?? '', fecha(f.updated_at),
    ]);
  }

  // Lista plana de niños, de menor a mayor
  ninosPlano.sort((a, b) => aniosAlCompartir(a.n.fecha_nacimiento) - aniosAlCompartir(b.n.fecha_nacimiento) || a.n.fecha_nacimiento.localeCompare(b.n.fecha_nacimiento) * -1);
  for (const { n, f } of ninosPlano) {
    rowsN.appendChild(tr([
      td(n.nombre), td(edadAlCompartir(n.fecha_nacimiento), 'num'), td(n.sexo),
      td(n.intereses ?? ''), td(n.alergias ?? ''), td(`${f.nombre} (${f.parentesco})`), td(f.asiste),
    ]));
  }

  // Resumen
  const adultos = padres + acompanantes;
  $('stAdultos').textContent = String(adultos);
  llenarDl($('dlAdultos'), [
    ['Responsables del registro', padres],
    ['Acompañantes', acompanantes],
    ['Con restricción alimentaria', conRestricciones, true],
  ]);
  $('stNinos').textContent = String(ninos);
  llenarDl($('dlNinos'), [
    ['Niños', varones], ['Niñas', mujeres],
    ...ORDEN_RANGOS.map((r): [string, number, boolean] => [r + ' años', rangos[r] || 0, true]),
    ['Con alergias', conAlergias, true],
  ]);
  $('stFamilias').textContent = String(fams.length);
  llenarDl($('dlFamilias'), [
    ['Sí, vamos', asiste['Sí'] || 0], ['Por confirmar', asiste['Por confirmar'] || 0], ['No podrán', asiste['No'] || 0],
  ]);
  const listaAyuda = ORDEN_AYUDA.filter((a) => ayudas[a]).map((a): [string, number] => [a, ayudas[a]]);
  if (listaAyuda.length) llenarDl($('dlAyuda'), listaAyuda);
  else { $('dlAyuda').innerHTML = ''; $('dlAyuda').appendChild(el('span', 'vacio', 'Nadie se ha ofrecido aún')); }

  hojas.resumen = [
    ['Indicador', 'Cantidad'],
    ['Familias', fams.length], ['Familias: sí, vamos', asiste['Sí'] || 0], ['Familias: por confirmar', asiste['Por confirmar'] || 0], ['Familias: no podrán', asiste['No'] || 0],
    ['Adultos', adultos], ['Adultos: responsables', padres], ['Adultos: acompañantes', acompanantes], ['Adultos con restricción alimentaria', conRestricciones],
    ['Niños (total)', ninos], ['Niños', varones], ['Niñas', mujeres],
    ...ORDEN_RANGOS.map((r): Fila => ['Niños de ' + r + ' años', rangos[r] || 0]),
    ['Niños con alergias', conAlergias],
    ...listaAyuda.map(([a, v]): Fila => ['Ayuda: ' + a, v]),
  ];

  if (!fams.length) {
    cont.appendChild(el('p', 'hint', 'Aún no hay respuestas.'));
    rowsN.appendChild(tr([td('Aún no hay niños registrados.')]));
  }
  aplicarFiltro();
}

/* ---------- Filtros de familias (asistencia + búsqueda) ---------- */
function normalizar(t: string) { return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function aplicarFiltro() {
  const asiste = (document.querySelector<HTMLInputElement>('input[name="fAsiste"]:checked')?.value) ?? '';
  const texto = normalizar($<HTMLInputElement>('filtroTexto').value.trim());
  const cards = document.querySelectorAll<HTMLElement>('#familias .fam');
  let visibles = 0;
  cards.forEach((c) => {
    const ok = (!asiste || c.dataset.asiste === asiste) && (!texto || normalizar(c.dataset.busca ?? '').includes(texto));
    c.hidden = !ok;
    if (ok) visibles++;
  });
  const fam = (n: number) => `${n} ${n === 1 ? 'familia' : 'familias'}`;
  $('filtroCuenta').textContent = cards.length ? (visibles === cards.length ? fam(cards.length) : `${visibles} de ${fam(cards.length)}`) : '';
  const sinResultados = $('familias').querySelector<HTMLElement>('.sin-resultados');
  if (cards.length && !visibles) {
    if (!sinResultados) $('familias').appendChild(el('p', 'hint sin-resultados', 'Ninguna familia coincide con el filtro.'));
  } else sinResultados?.remove();
}
$('filtroAsiste').addEventListener('change', aplicarFiltro);
$('filtroTexto').addEventListener('input', aplicarFiltro);

/* ---------- Uso del sitio ---------- */

function dlConteos(dl: HTMLElement, items: Conteo[], vacio = 'Sin datos aún') {
  if (!items.length) { dl.innerHTML = ''; dl.appendChild(el('span', 'vacio', vacio)); return; }
  llenarDl(dl, items.slice(0, 6).map((c): [string, number] => [c.clave, c.n]));
}

function renderUso(eventos: EventoRow[]) {
  const u: ResumenUso = resumirUso(eventos);
  $('usoPersonas').textContent = String(u.sesiones);

  const ol = $('usoEmbudo'); ol.innerHTML = '';
  u.embudo.forEach((p, i) => {
    const li = el('li');
    const fila = el('div', 'fila'); fila.appendChild(el('span', '', p.etiqueta)); fila.appendChild(el('b', '', `${p.sesiones} · ${p.pct}%`));
    const barra = el('div', 'barra'); const rel = el('i'); rel.style.width = p.pct + '%'; barra.appendChild(rel);
    li.appendChild(fila); li.appendChild(barra);
    const prev = u.embudo[i - 1];
    if (prev && prev.sesiones > p.sesiones) li.appendChild(el('div', 'caida', `−${prev.sesiones - p.sesiones} se quedaron en el paso anterior`));
    ol.appendChild(li);
  });

  dlConteos($('usoDispositivos'), u.dispositivos);
  dlConteos($('usoNavegadores'), u.navegadores);
  dlConteos($('usoOrigenes'), u.origenes);
  llenarDl($('usoFriccion'), [
    ['Intentos con campos faltantes', u.intentosFallidos],
    ['Errores al guardar', u.erroresGuardar],
    ['Tiempo típico hasta guardar', u.segundosMediana === null ? '—' : u.segundosMediana < 90 ? `${u.segundosMediana} s` : `${Math.round(u.segundosMediana / 60)} min`],
  ]);
  dlConteos($('usoCampos'), u.camposFallidos, 'Nadie ha fallado la validación');
  llenarDl($('usoMusica'), [['Abrieron el reproductor', u.musica.abrieron], ['Dieron play', u.musica.dieronPlay]]);
  dlConteos($('usoPistas'), u.musica.pistas, 'Nadie ha puesto música aún');

  const rows = $('rowsEventos'); rows.innerHTML = '';
  for (const e of u.ultimos) {
    rows.appendChild(tr([
      td(fecha(e.creado), 'num'), td(etiquetaEvento(e.evento)), td(detalleTexto(e)), td(e.pagina),
      td(`${e.dispositivo} · ${e.navegador ?? ''}`), td(e.user_id ? e.user_id.slice(-6) : 'anónimo ' + e.sesion.slice(0, 6), 'mono'),
    ]));
  }
  if (!u.ultimos.length) rows.appendChild(tr([td('Aún no hay eventos.')]));

  hojas.uso = [
    ['Indicador', 'Valor'],
    ['Personas distintas', u.sesiones], ['Con sesión iniciada', u.usuarios],
    ...u.embudo.map((p): Fila => [`Embudo: ${p.etiqueta}`, `${p.sesiones} (${p.pct}%)`]),
    ...u.dispositivos.map((c): Fila => ['Dispositivo: ' + c.clave, c.n]),
    ...u.navegadores.map((c): Fila => ['Navegador: ' + c.clave, c.n]),
    ...u.origenes.map((c): Fila => ['Origen: ' + c.clave, c.n]),
    ['Intentos con campos faltantes', u.intentosFallidos], ['Errores al guardar', u.erroresGuardar],
    ['Tiempo típico hasta guardar (s)', u.segundosMediana ?? ''],
    ...u.camposFallidos.map((c): Fila => ['Campo que falló: ' + c.clave, c.n]),
    ['Música: abrieron el reproductor', u.musica.abrieron], ['Música: dieron play', u.musica.dieronPlay],
    ...u.musica.pistas.map((c): Fila => ['Canción: ' + c.clave, c.n]),
  ];
}

async function cargarUso() {
  const desde = new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from('navidad_eventos').select('*').gte('creado', desde).order('creado', { ascending: false }).limit(5000);
  if (error) throw error;
  renderUso((data ?? []) as EventoRow[]);
}

async function cargar() {
  const { data, error } = await supabase
    .from('navidad_familias')
    .select('*, navidad_acompanantes(*), navidad_ninos(*)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  render((data ?? []) as Familia[]);
  void emitirTotales('admin');
}

/** Ancho de columna aproximado según el contenido más largo. */
function anchos(filas: Fila[]) {
  return (filas[0] ?? []).map((_, c) => ({ wch: Math.min(50, Math.max(10, ...filas.map((r) => String(r[c] ?? '').length + 2))) }));
}

/* ---------- Pestañas (Respuestas / Uso del sitio), con #uso en la URL ---------- */
const VISTAS = ['respuestas', 'uso'] as const;
type Vista = typeof VISTAS[number];
function mostrarVista(v: Vista) {
  $('vistaRespuestas').hidden = v !== 'respuestas';
  $('vistaUso').hidden = v !== 'uso';
  document.querySelectorAll<HTMLButtonElement>('.tabs [data-vista]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.vista === v)));
  if (location.hash !== (v === 'uso' ? '#uso' : '')) history.replaceState(null, '', v === 'uso' ? '#uso' : location.pathname);
}
document.querySelectorAll<HTMLButtonElement>('.tabs [data-vista]').forEach((b) => b.addEventListener('click', () => mostrarVista(b.dataset.vista as Vista)));
window.addEventListener('hashchange', () => mostrarVista(location.hash === '#uso' ? 'uso' : 'respuestas'));

$('xlsxBtn').addEventListener('click', () => {
  const wb = XLSX.utils.book_new();
  const agregar = (nombre: string, filas: Fila[]) => {
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws['!cols'] = anchos(filas);
    XLSX.utils.book_append_sheet(wb, ws, nombre);
  };
  agregar('Resumen', hojas.resumen);
  agregar('Familias', hojas.familias);
  agregar('Acompañantes', hojas.acompanantes);
  agregar('Niños', hojas.ninos);
  agregar('Uso', hojas.uso);
  registrar('admin_excel');
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `compartir-navideno-${fecha}.xlsx`);
});

(async () => {
  const user = await requireUser();
  if (!user) return;
  $('userEmail').textContent = user.email;
  const ok = await isAdmin();
  $('loading').hidden = true;
  if (!ok) { $('denied').hidden = false; return; }
  // El rol está en Clerk; comprobamos que también llegue a Supabase dentro del token.
  const { data: okDb, error: errDb } = await supabase.rpc('navidad_is_admin');
  if (errDb) {
    // Supabase no aceptó el token: normalmente el dominio de Clerk no está registrado en Third-party Auth.
    $('denied').hidden = false;
    $('denied').textContent = 'Supabase rechazó tu sesión de Clerk (' + mensajeError(errDb) + '). '
      + 'Revisa que el dominio de esta instancia de Clerk esté registrado en Supabase: Authentication → Sign In / Providers → Third-party Auth.';
    return;
  }
  if (okDb !== true) {
    $('denied').hidden = false;
    $('denied').textContent = 'Tu usuario tiene el rol admin en Clerk, pero el token de sesión no lo incluye. '
      + 'En Clerk ve a Configure → Sessions → Customize session token y agrega { "metadata": "{{user.public_metadata}}" }; luego cierra sesión y vuelve a entrar.';
    return;
  }
  $('panel').hidden = false;
  mostrarVista(location.hash === '#uso' ? 'uso' : 'respuestas');
  usuarioEventos(user.id);
  registrarVisita();
  registrar('admin_abrio');
  try { await cargar(); }
  catch (e) { $('denied').hidden = false; $('denied').textContent = 'No se pudieron cargar las respuestas: ' + mensajeError(e); }
  cargarUso().catch((e) => { $('usoError').hidden = false; $('usoError').textContent = 'No se pudo cargar el uso: ' + mensajeError(e); });

  // Actualización en vivo. Un guardado produce varias notificaciones casi simultáneas (familia, niños,
  // acompañantes); las agrupamos y recargamos una sola vez cuando ya terminaron.
  let tRespuestas: ReturnType<typeof setTimeout> | undefined;
  let tUso: ReturnType<typeof setTimeout> | undefined;
  const recargarRespuestas = () => { clearTimeout(tRespuestas); tRespuestas = setTimeout(() => cargar().catch(() => {}), 600); };
  const recargarUso = () => { clearTimeout(tUso); tUso = setTimeout(() => cargarUso().catch(() => {}), 600); };
  supabase.channel('navidad')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'navidad_familias' }, recargarRespuestas)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'navidad_ninos' }, recargarRespuestas)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'navidad_acompanantes' }, recargarRespuestas)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'navidad_eventos' }, recargarUso)
    .subscribe();
})();
