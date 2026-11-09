/**
 * Sentry en el navegador: errores, trazas de rendimiento y grabación de sesión.
 * El DSN viene de PUBLIC_SENTRY_DSN (.env en local, secreto en GitHub Actions).
 * Sin DSN el SDK no envía nada, así que en local se puede dejar vacío.
 */
import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  environment: import.meta.env.MODE, // "development" en npm run dev, "production" en el build
  release: import.meta.env.PUBLIC_SENTRY_RELEASE || undefined, // SHA del commit, inyectado por el pipeline

  integrations: [
    // Trazas: carga de página, navegación y peticiones a Supabase/Clerk
    Sentry.browserTracingIntegration(),
    // Grabación de sesión con textos enmascarados (el formulario tiene datos de familias)
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],

  // Sitio de bajo tráfico: capturamos todas las trazas
  tracesSampleRate: 1.0,
  // Grabamos 10 % de las sesiones y el 100 % de las que tienen un error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Ignorar ruido conocido de extensiones y del propio navegador
  ignoreErrors: ['ResizeObserver loop', 'Non-Error promise rejection captured'],
});
