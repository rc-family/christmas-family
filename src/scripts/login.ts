import { loadClerk, aparienciaClerk } from '../lib/clerk';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const next = new URLSearchParams(location.search).get('next');
const destino = next && next.startsWith('/') && !next.startsWith('//') ? next : '/registro';

(async () => {
  const clerk = await loadClerk();
  $('checking').hidden = true;
  if (!clerk) { $('noKey').hidden = false; return; }

  if (clerk.session) { location.replace(destino); return; }

  $('signin').hidden = false;
  clerk.mountSignIn($('clerkSignIn'), {
    appearance: aparienciaClerk,
    withSignUp: true,                 // un solo flujo: si el correo es nuevo, crea la cuenta
    forceRedirectUrl: destino,
    signUpForceRedirectUrl: destino,
  });
})();
