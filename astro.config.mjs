// @ts-check
import { defineConfig } from 'astro/config';

// En CI, GitHub Pages inyecta SITE_URL y BASE_PATH (ver .github/workflows/deploy.yml).
// Con dominio propio la base es "/", con la URL de GitHub sería "/christmas-family".
const site = process.env.SITE_URL ?? 'https://navidad.familiacrispin.com';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  output: 'static',
  site,
  base,
});
