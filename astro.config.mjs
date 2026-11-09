// @ts-check
import { defineConfig } from 'astro/config';
import sentry from '@sentry/astro';

// En CI, GitHub Pages inyecta SITE_URL y BASE_PATH (ver .github/workflows/deploy.yml).
// Con dominio propio la base es "/", con la URL de GitHub sería "/christmas-family".
const site = process.env.SITE_URL ?? 'https://navidad.familiacrispin.com';
const base = process.env.BASE_PATH || '/';

// Sentry: la configuración de ejecución vive en sentry.client.config.ts.
// Aquí solo va lo de build: subida de mapas de código (requiere SENTRY_AUTH_TOKEN, solo en CI).
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

export default defineConfig({
  output: 'static',
  site,
  base,
  integrations: [
    sentry({
      // Sitio estático: no hay servidor que instrumentar
      enabled: { client: true, server: false },
      org: 'mobitec-ca',
      project: 'christmas-family',
      authToken: sentryAuthToken,
      telemetry: false,
      sourcemaps: {
        // Sin token (local) no se suben mapas; con token (CI) se suben y se borran del dist publicado
        disable: !sentryAuthToken,
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      release: {
        name: process.env.PUBLIC_SENTRY_RELEASE || undefined,
      },
    }),
  ],
});
