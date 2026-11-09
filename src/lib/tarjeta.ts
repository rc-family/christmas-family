import { edadAlCompartir } from './edad';

/** Datos mínimos para pintar la tarjeta de una familia (la usan el registro y el panel). */
export interface TarjetaAdulto { nombre: string; relacion: string; celular?: string | null; restricciones?: string | null }
export interface TarjetaNino { nombre: string; fecha: string; sexo: string; intereses?: string | null; alergias?: string | null }
export interface TarjetaDatos {
  nombre: string; parentesco: string; celular: string; email?: string | null;
  asiste: string; ayuda: string[]; comentarios?: string | null; enviado?: string | null;
  acompanantes: TarjetaAdulto[]; ninos: TarjetaNino[];
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export const claseAsiste = (a: string) => (a === 'Sí' ? 'si' : a === 'No' ? 'no' : 'pc');
export const textoAsiste = (a: string) => (a === 'Sí' ? 'Sí, vamos' : a === 'No' ? 'No podrán' : 'Por confirmar');

/** Tarjeta con padre/madre, acompañantes e hijos. */
export function tarjetaFamilia(d: TarjetaDatos): HTMLElement {
  const card = el('article', 'fam' + (d.asiste === 'No' ? ' no' : ''));
  const head = el('header', 'fam-head');
  const quien = el('div');
  quien.appendChild(el('strong', '', d.nombre));
  quien.appendChild(el('span', 'meta', ` · ${d.parentesco} · ${d.celular}`));
  head.append(quien, el('span', 'badge ' + claseAsiste(d.asiste), textoAsiste(d.asiste)));
  card.appendChild(head);

  const body = el('div', 'fam-body');
  const colA = el('div');
  colA.appendChild(el('h4', '', `Adultos (${1 + d.acompanantes.length})`));
  const ulA = el('ul');
  const liP = el('li');
  liP.append(d.nombre, el('span', 'sub', ['Responde', d.parentesco, d.email].filter(Boolean).join(' · ')));
  ulA.appendChild(liP);
  for (const a of d.acompanantes) {
    const li = el('li');
    li.append(a.nombre, el('span', 'sub', [a.relacion, a.celular, a.restricciones ? 'Restricción: ' + a.restricciones : ''].filter(Boolean).join(' · ')));
    ulA.appendChild(li);
  }
  colA.appendChild(ulA);

  const colN = el('div');
  colN.appendChild(el('h4', '', `Niños (${d.ninos.length})`));
  const ulN = el('ul');
  if (!d.ninos.length) ulN.appendChild(el('li', 'sub', 'Sin niños registrados'));
  for (const n of d.ninos) {
    const li = el('li');
    li.append(n.nombre, el('span', 'age', edadAlCompartir(n.fecha)), ` · ${n.sexo}`);
    const detalle = [n.intereses ? 'Le gusta: ' + n.intereses : '', n.alergias ? 'Alergias: ' + n.alergias : ''].filter(Boolean).join(' · ');
    if (detalle) li.appendChild(el('span', 'sub', detalle));
    ulN.appendChild(li);
  }
  colN.appendChild(ulN);
  body.append(colA, colN);
  card.appendChild(body);

  const foot = el('footer', 'fam-foot');
  if (d.ayuda.length) foot.appendChild(el('span', '', 'Ayuda: ' + d.ayuda.join(', ')));
  if (d.comentarios) foot.appendChild(el('span', '', '“' + d.comentarios + '”'));
  if (d.enviado) foot.appendChild(el('span', '', 'Enviado ' + d.enviado));
  if (foot.childElementCount) card.appendChild(foot);
  return card;
}
