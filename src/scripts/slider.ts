/** Carrusel de fotos de la portada: pase automático, flechas, puntos y pausa al pasar el cursor o enfocar. */
const slider = document.getElementById('slider');
if (slider) {
  const slides = Array.from(slider.querySelectorAll<HTMLElement>('.slide'));
  const puntos = Array.from(slider.querySelectorAll<HTMLButtonElement>('.sl-dots button'));
  const prev = slider.querySelector<HTMLButtonElement>('.sl-btn.prev');
  const next = slider.querySelector<HTMLButtonElement>('.sl-btn.next');
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INTERVALO = 6000;
  let i = 0;
  let temporizador: number | undefined;
  let pausado = false;

  function mostrar(n: number) {
    i = ((n % slides.length) + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle('activa', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
    puntos.forEach((p, k) => p.setAttribute('aria-current', k === i ? 'true' : 'false'));
  }
  function programar() {
    clearTimeout(temporizador);
    if (slides.length < 2 || sinMovimiento || pausado || document.hidden) return;
    temporizador = window.setTimeout(() => { mostrar(i + 1); programar(); }, INTERVALO);
  }

  prev?.addEventListener('click', () => { mostrar(i - 1); programar(); });
  next?.addEventListener('click', () => { mostrar(i + 1); programar(); });
  puntos.forEach((p, k) => p.addEventListener('click', () => { mostrar(k); programar(); }));
  slider.addEventListener('mouseenter', () => { pausado = true; clearTimeout(temporizador); });
  slider.addEventListener('mouseleave', () => { pausado = false; programar(); });
  slider.addEventListener('focusin', () => { pausado = true; clearTimeout(temporizador); });
  slider.addEventListener('focusout', () => { pausado = false; programar(); });
  document.addEventListener('visibilitychange', programar);

  // Deslizar con el dedo en móvil
  let x0: number | null = null;
  slider.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) { mostrar(dx < 0 ? i + 1 : i - 1); programar(); }
  });

  mostrar(0);
  programar();
}
