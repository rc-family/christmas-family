/** Menú desplegable del icono de usuario (correo de la sesión y "Salir"). */
const btn = document.getElementById('usuarioMenuBtn');
const panel = document.getElementById('usuarioMenu');

if (btn && panel) {
  const abrir = (si: boolean) => {
    panel.hidden = !si;
    btn.setAttribute('aria-expanded', String(si));
    if (si) panel.querySelector<HTMLElement>('.usuario-item:not([hidden])')?.focus();
  };
  btn.addEventListener('click', () => abrir(!!panel.hidden));
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    if (!panel.hidden && !panel.contains(t) && !btn.contains(t)) abrir(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) { abrir(false); btn.focus(); }
  });
}
export {};
