/**
 * Reproductor de villancicos: botón en la barra superior que abre un panel con
 * reproducir/pausar, anterior/siguiente, silenciar, volumen y lista de pistas.
 * Recuerda pista, volumen y estado en localStorage para que siga entre páginas.
 */
import { PISTAS } from '../lib/musica';

const CLAVE = 'navidad.musica';

interface Estado {
  i: number;
  vol: number;
  mute: boolean;
  sonando: boolean;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

const audio = $<HTMLAudioElement>('musicaAudio');
const btn = $<HTMLButtonElement>('musicaBtn');
const panel = $<HTMLDivElement>('musicaPanel');
const play = $<HTMLButtonElement>('mPlay');
const prev = $<HTMLButtonElement>('mPrev');
const next = $<HTMLButtonElement>('mNext');
const mute = $<HTMLButtonElement>('mMute');
const vol = $<HTMLInputElement>('mVol');
const titulo = $<HTMLElement>('mTitulo');
const interprete = $<HTMLElement>('mInterprete');
const lista = $<HTMLOListElement>('mLista');
const aviso = $<HTMLElement>('mAviso');

if (audio && btn && panel && play && prev && next && mute && vol && titulo && interprete && lista && aviso) {
  const estado: Estado = leer();
  let pendiente = false; // quería sonar pero el navegador bloqueó el autoplay

  function leer(): Estado {
    const base: Estado = { i: 0, vol: 0.25, mute: false, sonando: false };
    try {
      const raw = localStorage.getItem(CLAVE);
      if (!raw) return base;
      const e = JSON.parse(raw) as Partial<Estado>;
      return {
        i: Number.isInteger(e.i) && e.i! >= 0 && e.i! < PISTAS.length ? e.i! : 0,
        vol: typeof e.vol === 'number' && e.vol >= 0 && e.vol <= 1 ? e.vol : 0.25,
        mute: !!e.mute,
        sonando: !!e.sonando,
      };
    } catch {
      return base;
    }
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* sin almacenamiento */ }
  }

  function pintarLista() {
    lista.innerHTML = '';
    PISTAS.forEach((p, idx) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'm-pista' + (idx === estado.i ? ' activa' : '');
      b.setAttribute('aria-current', idx === estado.i ? 'true' : 'false');
      b.innerHTML = `<span class="m-num">${idx + 1}</span><span class="m-txt"><strong>${p.titulo}</strong><small>${p.interprete}</small></span>`;
      b.addEventListener('click', () => cargar(idx, true));
      li.appendChild(b);
      lista.appendChild(li);
    });
  }

  function pintar() {
    const p = PISTAS[estado.i];
    titulo.textContent = p.titulo;
    interprete.textContent = p.interprete;
    const sonando = !audio.paused && !audio.ended;
    play.textContent = sonando ? '❚❚' : '▶';
    play.setAttribute('aria-label', sonando ? 'Pausar' : 'Reproducir');
    mute.textContent = estado.mute || estado.vol === 0 ? '🔇' : estado.vol < 0.5 ? '🔉' : '🔊';
    mute.setAttribute('aria-label', estado.mute ? 'Activar sonido' : 'Silenciar');
    mute.setAttribute('aria-pressed', String(estado.mute));
    vol.value = String(Math.round(estado.vol * 100));
    btn.classList.toggle('sonando', sonando && !estado.mute);
    btn.setAttribute('aria-label', sonando ? 'Música: sonando. Abrir reproductor' : 'Abrir reproductor de música');
    lista.querySelectorAll<HTMLButtonElement>('.m-pista').forEach((b, idx) => {
      b.classList.toggle('activa', idx === estado.i);
      b.setAttribute('aria-current', idx === estado.i ? 'true' : 'false');
    });
  }

  function aplicarVolumen() {
    audio.volume = estado.vol;
    audio.muted = estado.mute;
  }

  async function reproducir() {
    estado.sonando = true;
    guardar();
    try {
      await audio.play();
      pendiente = false;
      aviso.hidden = true;
    } catch {
      // Autoplay bloqueado: se intentará con el primer toque del usuario.
      pendiente = true;
      aviso.hidden = false;
    }
    pintar();
  }

  function pausar() {
    estado.sonando = false;
    pendiente = false;
    audio.pause();
    guardar();
    pintar();
  }

  function cargar(idx: number, sonar: boolean) {
    estado.i = ((idx % PISTAS.length) + PISTAS.length) % PISTAS.length;
    audio.src = PISTAS[estado.i].url;
    aplicarVolumen();
    guardar();
    pintar();
    if (sonar) void reproducir();
  }

  function abrir(abierto: boolean) {
    panel.hidden = !abierto;
    btn.setAttribute('aria-expanded', String(abierto));
    if (abierto) play.focus();
  }

  // Controles
  btn.addEventListener('click', () => abrir(panel.hidden));
  play.addEventListener('click', () => (audio.paused ? void reproducir() : pausar()));
  prev.addEventListener('click', () => cargar(estado.i - 1, estado.sonando || !audio.paused));
  next.addEventListener('click', () => cargar(estado.i + 1, estado.sonando || !audio.paused));
  mute.addEventListener('click', () => {
    estado.mute = !estado.mute;
    aplicarVolumen();
    guardar();
    pintar();
  });
  vol.addEventListener('input', () => {
    estado.vol = Number(vol.value) / 100;
    if (estado.vol > 0) estado.mute = false;
    aplicarVolumen();
    guardar();
    pintar();
  });
  audio.addEventListener('ended', () => cargar(estado.i + 1, true));
  audio.addEventListener('play', pintar);
  audio.addEventListener('pause', pintar);
  audio.addEventListener('error', () => {
    // Si una pista falla, pasa a la siguiente sin quedarse en silencio.
    if (estado.sonando) cargar(estado.i + 1, true);
  });

  // Cerrar con Escape o clic fuera
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) { abrir(false); btn.focus(); }
  });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    if (!panel.hidden && !panel.contains(t) && !btn.contains(t)) abrir(false);
  });

  // Si venía sonando de otra página y el navegador lo bloquea, arranca con el primer toque.
  const reanudar = () => {
    if (pendiente) void reproducir();
    document.removeEventListener('pointerdown', reanudar);
    document.removeEventListener('keydown', reanudar);
  };
  document.addEventListener('pointerdown', reanudar);
  document.addEventListener('keydown', reanudar);

  pintarLista();
  cargar(estado.i, estado.sonando);
}
