import { ruta } from '../lib/rutas';
import { loadClerk, aparienciaClerk } from '../lib/clerk';
import { registrar, registrarVisita } from '../lib/eventos';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const next = new URLSearchParams(location.search).get('next');
const destino = next && next.startsWith('/') && !next.startsWith('//') ? next : ruta('/registro');

registrarVisita();

(async () => {
  const clerk = await loadClerk();
  $('checking').hidden = true;
  if (!clerk) { $('noKey').hidden = false; return; }

  if (clerk.session) { location.replace(destino); return; }

  $('signin').hidden = false;
  registrar('vio_login');
  // Cuando Clerk crea la sesión (código correcto), lo registramos antes de que redirija.
  let registrado = false;
  clerk.addListener(({ session }) => { if (session && !registrado) { registrado = true; registrar('ingreso'); } });
  clerk.mountSignIn($('clerkSignIn'), {
    appearance: aparienciaClerk,
    withSignUp: true,                 // un solo flujo: si el correo es nuevo, crea la cuenta
    forceRedirectUrl: destino,
    signUpForceRedirectUrl: destino,
  });
})();
