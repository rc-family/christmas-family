import { ruta } from '../lib/rutas';
import { loadClerk, aparienciaClerk, aparienciaPortada } from '../lib/clerk';
import { registrar, registrarVisita } from '../lib/eventos';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const next = new URLSearchParams(location.search).get('next');
const destino = next && next.startsWith('/') && !next.startsWith('//') ? next : ruta('/registro');

registrarVisita();

(async () => {
  const clerk = await loadClerk();
  $('checking').hidden = true;
  if (!clerk) { $('noKey').hidden = false; return; }

  // Los accesos a "Mi registro" (enlace del menú e icono de usuario) solo aparecen con sesión iniciada.
  const accesos = ['usuarioBtn', 'miRegistroLink'].map((id) => document.getElementById(id));
  const mostrarUsuario = () => accesos.forEach((el) => { if (el) el.hidden = !clerk.session; });
  mostrarUsuario();
  clerk.addListener(mostrarUsuario);

  if (clerk.session) { location.replace(destino); return; }

  $('signin').hidden = false;
  registrar('vio_login');
  // Cuando Clerk crea la sesión (código correcto), lo registramos antes de que redirija.
  let registrado = false;
  clerk.addListener(({ session }) => { if (session && !registrado) { registrado = true; registrar('ingreso'); } });
  const raiz = $<HTMLDivElement>('clerkSignIn');
  clerk.mountSignIn(raiz, {
    appearance: document.body.classList.contains('portada') ? aparienciaPortada : aparienciaClerk,
    withSignUp: true,                 // un solo flujo: si el correo es nuevo, crea la cuenta
    forceRedirectUrl: destino,
    signUpForceRedirectUrl: destino,
  });
  adaptarPasos(raiz, clerk);
})();

/**
 * La tarjeta de ingreso cambia sus textos según el paso del componente de Clerk:
 * correo (inicio) o código de 6 dígitos (emailCode). Clerk pinta su propio marcado;
 * aquí solo leemos qué paso muestra y ajustamos lo que está fuera de él.
 */
function adaptarPasos(raiz: HTMLElement, clerk: NonNullable<Awaited<ReturnType<typeof loadClerk>>>) {
  const paso = document.getElementById('loginPaso');
  const chip = document.getElementById('loginChip');
  const titulo = document.getElementById('loginTitulo');
  const hint = document.getElementById('loginHint');
  const hintCodigo = document.getElementById('loginHintCodigo');
  const correo = document.getElementById('loginCorreo');
  const cambiar = document.getElementById('loginCambiar');
  const seguridad = document.getElementById('loginSeguridad');
  if (!paso || !chip || !titulo || !hint || !hintCodigo || !correo || !cambiar || !seguridad) return;

  // "Cambiar correo" pulsa el botón de editar que Clerk tiene en su cabecera (oculta por estilo).
  cambiar.addEventListener('click', () => raiz.querySelector<HTMLButtonElement>('.cl-identityPreviewEditButton')?.click());

  let actual = '';
  const aplicar = () => {
    const enCodigo = !!raiz.querySelector('.cl-signIn-emailCode, .cl-signUp-emailCode');
    const boton = raiz.querySelector<HTMLElement>('.cl-signIn-emailCode .cl-formButtonPrimary span, .cl-signUp-emailCode .cl-formButtonPrimary span');
    if (enCodigo && boton) {
      const nodo = Array.from(boton.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
      if (nodo && nodo.textContent !== 'Verificar código y continuar') nodo.textContent = 'Verificar código y continuar';
    }
    const siguiente = enCodigo ? 'codigo' : 'correo';
    if (siguiente === actual) return;
    actual = siguiente;
    if (enCodigo) {
      // Primero lo que muestra el propio Clerk (refleja el flujo activo); si no, el cliente.
      const id = raiz.querySelector('.cl-identityPreviewText')?.textContent?.trim() || clerk.client?.signUp?.emailAddress || clerk.client?.signIn?.identifier || '';
      correo.textContent = id;
      paso.textContent = 'Clave temporal';
      chip.textContent = 'Sesión cifrada';
      titulo.textContent = 'Ingresa tu código de 6 dígitos';
    } else {
      paso.textContent = 'Paso 01 de 02';
      chip.textContent = 'Sin contraseña';
      titulo.textContent = 'Ingresa con tu correo';
    }
    hint.hidden = enCodigo;
    hintCodigo.hidden = !enCodigo;
    seguridad.hidden = !enCodigo;
    document.getElementById('login')?.classList.toggle('en-codigo', enCodigo);
  };
  new MutationObserver(aplicar).observe(raiz, { childList: true, subtree: true });
  aplicar();
}
