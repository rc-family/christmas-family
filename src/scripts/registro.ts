import { supabase, requireUser, isAdmin, signOut } from '../lib/supabase';
import { edadAlCompartir } from '../lib/edad';
import { tarjetaFamilia } from '../lib/tarjeta';
import type { Asiste, Sexo, AcompananteRow, NinoRow } from '../lib/database.types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

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

const form = $<HTMLFormElement>('form');
const confirm = $('confirm');
const kids = $('kids');
const adults = $('adults');
const kidTpl = $<HTMLTemplateElement>('kidTpl');
const adultTpl = $<HTMLTemplateElement>('adultTpl');
const statusEl = $('status');
const cStatus = $('cStatus');
let seq = 0;

interface Nino { nombre: string; fecha: string; edad: string; sexo: string; intereses: string; alergias: string }
interface Acompanante { nombre: string; relacion: string; celular: string; restricciones: string }
interface Respuesta {
  nombre: string; parentesco: string; celular: string; asiste: string;
  ayuda: string[]; comentarios: string; acompanantes: Acompanante[]; ninos: Nino[];
}

/** Última respuesta guardada en la base (null si aún no envió). */
let guardada: Respuesta | null = null;

function q<T extends HTMLElement>(root: ParentNode, sel: string) { return root.querySelector(sel) as T; }

function addKid(data?: Partial<NinoRow>) {
  seq++;
  const node = kidTpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
  q(node, '.idx').textContent = String(kids.children.length + 1);
  node.querySelectorAll<HTMLInputElement>('.sexo input').forEach((r, i) => { r.name = 'sexo_' + seq; r.id = `sexo_${seq}_${i}`; });
  const fecha = q<HTMLInputElement>(node, '.k_fecha'), age = q(node, '.age');
  const refreshAge = () => { const a = edadAlCompartir(fecha.value); age.textContent = a ? a + ' al 5 dic' : ''; };
  fecha.addEventListener('input', refreshAge);
  q(node, '.rm').addEventListener('click', () => { node.remove(); renumber(kids); });
  if (data) {
    q<HTMLInputElement>(node, '.k_nombre').value = data.nombre ?? '';
    fecha.value = data.fecha_nacimiento ?? '';
    q<HTMLInputElement>(node, '.k_intereses').value = data.intereses ?? '';
    q<HTMLInputElement>(node, '.k_alergias').value = data.alergias ?? '';
    node.querySelectorAll<HTMLInputElement>('.sexo input').forEach((r) => { r.checked = r.value === data.sexo; });
    refreshAge();
  }
  kids.appendChild(node);
  return node;
}

function addAdult(data?: Partial<AcompananteRow>) {
  const node = adultTpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
  q(node, '.idx').textContent = String(adults.children.length + 1);
  q(node, '.rm').addEventListener('click', () => { node.remove(); renumber(adults); });
  if (data) {
    q<HTMLInputElement>(node, '.a_nombre').value = data.nombre ?? '';
    q<HTMLSelectElement>(node, '.a_relacion').value = data.relacion ?? '';
    q<HTMLInputElement>(node, '.a_celular').value = data.celular ?? '';
    q<HTMLInputElement>(node, '.a_restricciones').value = data.restricciones ?? '';
  }
  adults.appendChild(node);
  return node;
}

function renumber(container: HTMLElement) {
  [...container.children].forEach((k, i) => { q(k, '.idx').textContent = String(i + 1); });
}

function enfocar(node: HTMLElement, sel: string) {
  node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  q<HTMLInputElement>(node, sel).focus({ preventScroll: true });
}

$('addKid').addEventListener('click', () => enfocar(addKid(), '.k_nombre'));
$('addAdult').addEventListener('click', () => enfocar(addAdult(), '.a_nombre'));
$('logoutBtn').addEventListener('click', signOut);

function readForm(): Respuesta {
  const v = (id: string) => $<HTMLInputElement>(id).value.trim();
  const asiste = (document.querySelector<HTMLInputElement>('input[name="p_asiste"]:checked'))?.value ?? '';
  const ayuda = [...document.querySelectorAll<HTMLInputElement>('input[name="ayuda"]:checked')].map((c) => c.value);
  const ninos: Nino[] = [...kids.children].map((k) => ({
    nombre: q<HTMLInputElement>(k, '.k_nombre').value.trim(),
    fecha: q<HTMLInputElement>(k, '.k_fecha').value,
    edad: edadAlCompartir(q<HTMLInputElement>(k, '.k_fecha').value),
    sexo: k.querySelector<HTMLInputElement>('.sexo input:checked')?.value ?? '',
    intereses: q<HTMLInputElement>(k, '.k_intereses').value.trim(),
    alergias: q<HTMLInputElement>(k, '.k_alergias').value.trim(),
  }));
  const acompanantes: Acompanante[] = [...adults.children].map((a) => ({
    nombre: q<HTMLInputElement>(a, '.a_nombre').value.trim(),
    relacion: q<HTMLSelectElement>(a, '.a_relacion').value,
    celular: q<HTMLInputElement>(a, '.a_celular').value.trim(),
    restricciones: q<HTMLInputElement>(a, '.a_restricciones').value.trim(),
  }));
  return { nombre: v('p_nombre'), parentesco: v('p_parentesco'), celular: v('p_celular'), asiste, ayuda, comentarios: v('p_comentarios'), acompanantes, ninos };
}

/** Rellena el formulario con una respuesta (la guardada o una nueva). */
function poblar(d: Respuesta) {
  $<HTMLInputElement>('p_nombre').value = d.nombre;
  $<HTMLInputElement>('p_parentesco').value = d.parentesco;
  $<HTMLInputElement>('p_celular').value = d.celular;
  $<HTMLTextAreaElement>('p_comentarios').value = d.comentarios;
  document.querySelectorAll<HTMLInputElement>('input[name="p_asiste"]').forEach((r) => { r.checked = r.value === d.asiste; });
  document.querySelectorAll<HTMLInputElement>('input[name="ayuda"]').forEach((c) => { c.checked = d.ayuda.includes(c.value); });
  adults.innerHTML = ''; kids.innerHTML = '';
  d.acompanantes.forEach((a) => addAdult(a));
  d.ninos.forEach((n) => addKid({ nombre: n.nombre, fecha_nacimiento: n.fecha, sexo: n.sexo, intereses: n.intereses, alergias: n.alergias }));
}

function validate(d: Respuesta): string {
  if (!d.nombre || !d.parentesco || !d.celular || !d.asiste) return 'Completa nombre, parentesco, celular y asistencia.';
  for (const a of d.acompanantes) if (!a.nombre || !a.relacion) return 'En cada acompañante: nombre y relación.';
  for (const n of d.ninos) if (!n.nombre || !n.fecha || !n.sexo) return 'En cada niño: nombre, fecha de nacimiento y sexo (o quita el bloque vacío).';
  return '';
}

/* ---------- Vistas ---------- */

function primerNombre(n: string) { return n.trim().split(/\s+/)[0] || ''; }

/** Muestra la pantalla de agradecimiento con lo registrado y las opciones para cambiarlo. */
function mostrarConfirmacion(d: Respuesta) {
  const nombre = primerNombre(d.nombre);
  const noVa = d.asiste === 'No';
  $('cTitulo').textContent = noVa ? `Gracias por avisarnos, ${nombre}` : `¡Gracias por registrarte, ${nombre}!`;
  $('cLead').textContent = noVa
    ? 'Guardamos que no podrán acompañarnos. Si cambian de planes, aquí mismo puedes volver a confirmar.'
    : d.asiste === 'Sí'
      ? 'Tu respuesta quedó guardada. ¡Los esperamos el sábado 5 de diciembre!'
      : 'Tu respuesta quedó guardada como "Por confirmar". Cuando lo sepan, vuelve aquí y actualízala.';
  const t = $('cTarjeta'); t.innerHTML = '';
  t.appendChild(tarjetaFamilia({ ...d, ninos: d.ninos.map((n) => ({ nombre: n.nombre, fecha: n.fecha, sexo: n.sexo, intereses: n.intereses, alergias: n.alergias })) }));
  $('btnCancel').hidden = noVa;
  $('btnReconfirm').hidden = !noVa;
  $('cancelBox').hidden = true;
  cStatus.textContent = ''; cStatus.className = 'status';
  form.hidden = true;
  confirm.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Muestra el formulario; opcionalmente agrega un bloque nuevo y lo enfoca. */
function mostrarFormulario(agregar?: 'nino' | 'adulto') {
  confirm.hidden = true;
  form.hidden = false;
  $('submit').textContent = guardada ? 'Guardar cambios' : 'Enviar respuesta';
  $('backBtn').hidden = !guardada;
  statusEl.textContent = ''; statusEl.className = 'status';
  if (agregar === 'nino') enfocar(addKid(), '.k_nombre');
  else if (agregar === 'adulto') enfocar(addAdult(), '.a_nombre');
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Datos ---------- */

/** Guarda: upsert de la familia y reemplazo completo de acompañantes y niños. */
async function guardar(userId: string, email: string, d: Respuesta) {
  const { data: fam, error: e1 } = await supabase
    .from('navidad_familias')
    .upsert({
      user_id: userId, email,
      nombre: d.nombre, parentesco: d.parentesco, celular: d.celular,
      asiste: d.asiste as Asiste, ayuda: d.ayuda, comentarios: d.comentarios || null,
    }, { onConflict: 'user_id' })
    .select('id')
    .single();
  if (e1 || !fam) throw e1 ?? new Error('No se pudo guardar la familia');

  const fid = fam.id;
  const [{ error: e2 }, { error: e3 }] = await Promise.all([
    supabase.from('navidad_acompanantes').delete().eq('familia_id', fid),
    supabase.from('navidad_ninos').delete().eq('familia_id', fid),
  ]);
  if (e2 || e3) throw e2 ?? e3;

  if (d.acompanantes.length) {
    const { error } = await supabase.from('navidad_acompanantes').insert(
      d.acompanantes.map((a, i) => ({ familia_id: fid, nombre: a.nombre, relacion: a.relacion, celular: a.celular || null, restricciones: a.restricciones || null, orden: i })),
    );
    if (error) throw error;
  }
  if (d.ninos.length) {
    const { error } = await supabase.from('navidad_ninos').insert(
      d.ninos.map((n, i) => ({ familia_id: fid, nombre: n.nombre, fecha_nacimiento: n.fecha, sexo: n.sexo as Sexo, intereses: n.intereses || null, alergias: n.alergias || null, orden: i })),
    );
    if (error) throw error;
  }
}

/** Lee el registro previo del usuario, si existe. */
async function cargar(userId: string): Promise<Respuesta | null> {
  const { data, error } = await supabase
    .from('navidad_familias')
    .select('*, navidad_acompanantes(*), navidad_ninos(*)')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const acomp = (data.navidad_acompanantes as AcompananteRow[]).sort((a, b) => a.orden - b.orden);
  const ninos = (data.navidad_ninos as NinoRow[]).sort((a, b) => a.orden - b.orden);
  return {
    nombre: data.nombre, parentesco: data.parentesco, celular: data.celular, asiste: data.asiste,
    ayuda: data.ayuda, comentarios: data.comentarios ?? '',
    acompanantes: acomp.map((a) => ({ nombre: a.nombre, relacion: a.relacion, celular: a.celular ?? '', restricciones: a.restricciones ?? '' })),
    ninos: ninos.map((n) => ({ nombre: n.nombre, fecha: n.fecha_nacimiento, edad: edadAlCompartir(n.fecha_nacimiento), sexo: n.sexo, intereses: n.intereses ?? '', alergias: n.alergias ?? '' })),
  };
}

(async () => {
  const user = await requireUser();
  if (!user) return;
  $('userEmail').textContent = user.email;
  isAdmin().then((ok) => { if (ok) $('adminLink').hidden = false; });

  /** Valida, guarda y pasa a la confirmación. Devuelve false si falló. */
  async function enviar(d: Respuesta, status: HTMLElement, botones: HTMLButtonElement[]) {
    const err = validate(d);
    status.className = 'status';
    if (err) { status.textContent = err; status.classList.add('err'); return false; }
    botones.forEach((b) => (b.disabled = true));
    status.textContent = 'Guardando...';
    try {
      await guardar(user!.id, user!.email, d);
      guardada = d;
      poblar(d);
      mostrarConfirmacion(d);
      return true;
    } catch (e) {
      status.textContent = 'No se pudo guardar: ' + mensajeError(e); status.classList.add('err');
      return false;
    } finally { botones.forEach((b) => (b.disabled = false)); }
  }

  try {
    guardada = await cargar(user.id);
  } catch (e) {
    statusEl.textContent = 'No pudimos cargar tu registro anterior; puedes llenarlo de nuevo.';
    statusEl.className = 'status err';
  }
  $('loading').hidden = true;
  if (guardada) { poblar(guardada); mostrarConfirmacion(guardada); }
  else mostrarFormulario();

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    enviar(readForm(), statusEl, [$<HTMLButtonElement>('submit')]);
  });
  $('backBtn').addEventListener('click', () => { if (guardada) { poblar(guardada); mostrarConfirmacion(guardada); } });

  // Opciones de la confirmación
  $('btnEdit').addEventListener('click', () => mostrarFormulario());
  $('btnAddKid').addEventListener('click', () => mostrarFormulario('nino'));
  $('btnAddAdult').addEventListener('click', () => mostrarFormulario('adulto'));
  $('btnCancel').addEventListener('click', () => { $('cancelBox').hidden = false; $('cancelBox').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  $('cancelNo').addEventListener('click', () => { $('cancelBox').hidden = true; });

  const cambiarAsistencia = (asiste: Asiste, boton: HTMLButtonElement) => {
    if (!guardada) return;
    enviar({ ...guardada, asiste }, cStatus, [boton]);
  };
  $('cancelYes').addEventListener('click', () => cambiarAsistencia('No', $<HTMLButtonElement>('cancelYes')));
  $('btnReconfirm').addEventListener('click', () => cambiarAsistencia('Sí', $<HTMLButtonElement>('btnReconfirm')));
})();
