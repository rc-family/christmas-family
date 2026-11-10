/** Modal "Detalles" del encabezado: muestra Cuándo, Dónde y Plazo en un <dialog> nativo. */
const btn = document.getElementById('detallesBtn');
const modal = document.getElementById('detallesModal') as HTMLDialogElement | null;

if (btn && modal && typeof modal.showModal === 'function') {
  btn.addEventListener('click', (e) => {
    e.preventDefault(); // sin <dialog> el enlace sigue llevando a la sección #detalles
    modal.showModal();
  });
  const cerrar = () => modal.close();
  document.getElementById('detallesCerrar')?.addEventListener('click', cerrar);
  document.getElementById('detallesOk')?.addEventListener('click', cerrar);
  // Clic en el fondo oscuro (fuera de la caja) también cierra
  modal.addEventListener('click', (e) => {
    const r = modal.getBoundingClientRect();
    const fuera = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (e.target === modal && fuera) cerrar();
  });
  modal.addEventListener('close', () => btn.focus());
}
export {};
