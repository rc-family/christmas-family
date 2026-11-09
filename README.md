# Compartir navideño de la familia

Registro de participantes para el compartir navideño (sábado 5 de diciembre de 2026). Sitio estático en
[Astro](https://astro.build), autenticación por código al correo con [Clerk](https://clerk.com) y datos en Supabase.

## Flujo

1. `/` — la persona escribe su correo y recibe un código de 6 dígitos (componente `SignIn` de Clerk, con alta automática).
2. Ingresa el código y pasa a `/registro`.
3. `/registro` — formulario de la familia: papá/mamá, acompañantes adultos, niños (edad al 5 de diciembre), ayuda y comentarios.
   Cada correo tiene **una** respuesta; al volver a entrar se precarga y se puede editar.
4. `/admin` — solo organizadores (usuarios de Clerk con `role: admin` en su public metadata): resumen de adultos, niños
   y familias, una tarjeta por familia (padre/madre, acompañantes e hijos), lista de niños, exportación a Excel (.xlsx)
   y actualización en vivo.

## Puesta en marcha

```bash
npm install
cp .env.example .env   # y completa las variables
npm run dev
```

Variables en `.env`:

| Variable | Valor |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | URL del proyecto (Project Settings → API) |
| `PUBLIC_SUPABASE_ANON_KEY` | Clave publicable `sb_publishable_...` (o anon key legada) |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable key de Clerk (`pk_test_...` en desarrollo, `pk_live_...` en producción) |

## Clerk + Supabase

Clerk autentica y envía los códigos por correo (no requiere SMTP). Supabase guarda los datos y valida el token de
sesión de Clerk como proveedor externo. Pasos de configuración, una sola vez:

### 1. Crear la aplicación en Clerk

1. En [dashboard.clerk.com](https://dashboard.clerk.com) crea una aplicación.
2. En **Configure → Email, phone, username**: activa *Email address* como obligatorio y, en sus opciones,
   *Email verification code*. Desactiva *Password*, *Username*, *Name* y cualquier otro campo obligatorio.
   Desactiva también los proveedores sociales (Google, etc.) si no los quieres.
3. En **Configure → API keys** copia la *Publishable key* a `PUBLIC_CLERK_PUBLISHABLE_KEY` en `.env`.
4. En **Configure → Sessions → Customize session token** agrega el public metadata al token, para que las
   políticas RLS de Supabase puedan leer el rol:

   ```json
   { "metadata": "{{user.public_metadata}}" }
   ```

### Organizadores (rol admin)

Un organizador es un usuario de Clerk con `{"role": "admin"}` en su **public metadata**. Para asignarlo:
**Users → (usuario) → Metadata → Public → Edit** y guarda:

```json
{ "role": "admin" }
```

El cambio llega al token en menos de un minuto (o al cerrar y volver a abrir sesión). Con ese rol la app muestra el
enlace *Ver respuestas* y Supabase permite leer todas las familias; sin él, cada persona ve solo su registro.

### 2. Conectar Clerk con Supabase

1. En Clerk, **Configure → Integrations → Supabase → Activate**. Esto agrega el claim `"role": "authenticated"` al
   token y muestra el **dominio de Clerk** (por ejemplo `xxxx-yyyy-12.clerk.accounts.dev`).
2. En Supabase (proyecto `christmas-family`), **Authentication → Sign In / Providers → Third-party Auth → Add provider →
   Clerk** y pega ese dominio.
3. En la pestaña **Supabase Auth** de esa misma pantalla, desactiva *Allow new users to sign up* y el proveedor
   **Email**. Así nadie puede obtener un token `authenticated` por fuera de Clerk.

Con esto, cada petición a Supabase va firmada con el token de Clerk (`createClient(..., { accessToken })`) y las
políticas RLS leen el id de usuario del claim `sub` mediante la función `navidad_uid()`.

### 3. Base de datos

La migración está en `supabase/migrations/` y ya se aplicó al proyecto `khrmsbteunrzpdsrrhjy`:

- `navidad_familias` — una fila por usuario de Clerk (`user_id` texto, único).
- `navidad_acompanantes` y `navidad_ninos` — hijos de la familia, se reemplazan completos en cada envío.
- Funciones `navidad_uid()`, `navidad_is_admin()` y `navidad_es_mi_familia(uuid)` usadas por las políticas RLS.

RLS: cada usuario lee y escribe solo su familia; los organizadores leen todo. `navidad_is_admin()` devuelve `true`
cuando el token de Clerk trae `metadata.role = 'admin'` (ver *Organizadores* arriba). La app usa el mismo dato
(`user.publicMetadata.role`) solo para decidir qué mostrar; el control real está en la base.

En desarrollo la instancia de Clerk queda expuesta como `window.__clerk` para inspeccionar el token desde la consola.

## Despliegue (CI/CD con GitHub Actions)

El workflow `.github/workflows/deploy.yml` corre en cada push y pull request a `main`:

1. **Verificar**: `npm ci`, `npx astro check` y `npm run build`.
2. **Desplegar** (solo en push a `main`): compila con la URL y la ruta base que entrega `actions/configure-pages`
   y publica `dist/` en GitHub Pages. El sitio queda en el dominio configurado en Settings → Pages
   (`navidad.familiacrispin.com`); sin dominio propio funcionaría igual en `rc-family.github.io/christmas-family`,
   porque todas las rutas internas pasan por `ruta()` (`src/lib/rutas.ts`).

Configuración necesaria, una sola vez:

- **Settings → Pages → Source: GitHub Actions** (ya está así).
- **Secretos del repositorio** (Settings → Secrets and variables → Actions), con los mismos valores del `.env`:

  ```bash
  gh secret set PUBLIC_SUPABASE_URL -R rc-family/christmas-family --body "https://khrmsbteunrzpdsrrhjy.supabase.co"
  gh secret set PUBLIC_SUPABASE_ANON_KEY -R rc-family/christmas-family --body "sb_publishable_..."
  gh secret set PUBLIC_CLERK_PUBLISHABLE_KEY -R rc-family/christmas-family --body "pk_test_..."
  gh secret set PUBLIC_SENTRY_DSN -R rc-family/christmas-family --body "https://...@o....ingest.us.sentry.io/..."
  gh secret set SENTRY_AUTH_TOKEN -R rc-family/christmas-family --body "sntrys_..."
  ```

  `SENTRY_AUTH_TOKEN` es un token de organización de Sentry (Settings → Auth Tokens, alcance `project:releases`
  y `org:read`) que el build usa solo para subir los mapas de código; nunca llega al navegador.

- Para pasar Clerk a producción: crea la instancia Production con el dominio, repite el token personalizado
  (`metadata`) y la integración con Supabase, registra el nuevo dominio de Clerk en Supabase Third-party Auth y
  actualiza el secreto `PUBLIC_CLERK_PUBLISHABLE_KEY` con la clave `pk_live_...`.

Para compilar a mano: `npm run build` genera `dist/` estático; `SITE_URL` y `BASE_PATH` son opcionales.

## Medición de uso

- Tabla `navidad_eventos` (migración `20261110_navidad_eventos.sql`): un evento por acción, sin datos
  personales. Visitantes anónimos y usuarios pueden insertar (la base valida el nombre del evento y el
  tamaño); solo los organizadores pueden leer; nadie puede editar ni borrar.
- `src/lib/eventos.ts` expone `registrar(evento, detalle)`; se llama desde login, registro, música y admin.
  Cada navegador guarda un identificador aleatorio en localStorage (`navidad.visitante`) para contar personas.
  Eventos: visita, vio_login, ingreso, vio_formulario, validacion_fallo, guardo, edito, agrego_nino,
  agrego_acompanante, cancelo, reconfirmo, error_guardar, musica_*, admin_*.
- `src/lib/uso.ts` resume los eventos (embudo acumulativo por persona, dispositivos, fricción, música) y el
  panel `/admin` lo muestra en la sección "Uso del sitio"; el Excel incluye la hoja "Uso".
- Origen de la visita: si la invitación enlaza con `?desde=whatsapp`, ese valor se guarda en cada evento.

## Monitoreo con Sentry

### Métricas (Application Metrics)

- El guardado del registro usa la función `navidad_guardar_respuesta()` (migración
  `20261110_navidad_guardar_respuesta.sql`), que escribe familia, acompañantes y niños en una sola transacción;
  así los totales nunca se leen a medias.
- `src/lib/metricas.ts` envía gauges con el estado actual del registro tras cada guardado y al abrir el
  panel: `registro.adultos` (atributo `tipo`: total, padre_madre, acompanante), `registro.ninos` (atributo
  `sexo`: total, nino, nina) y `registro.familias` (atributo `asiste`). Los totales salen de la función
  `navidad_totales()` (migración `20261110_navidad_totales.sql`), que devuelve solo conteos.
- Counters por acción: `registro.guardado` (atributos `nuevo`, `asiste`), `registro.guardado.adultos` y
  `registro.guardado.ninos` (atributo `sexo`).
- Se ven en Sentry → Explore → Metrics, filtrando por `sentry.environment:production`.


- Proyecto `christmas-family` en la organización `mobitec-ca` (plataforma Astro / navegador).
- `sentry.client.config.ts` inicializa el SDK con errores, trazas de rendimiento y grabación de sesión
  (textos enmascarados). Toma el DSN de `PUBLIC_SENTRY_DSN`; sin DSN no envía nada.
- `astro.config.mjs` registra la integración solo para el cliente (el sitio es estático) y, cuando existe
  `SENTRY_AUTH_TOKEN`, sube los mapas de código al build y los borra del `dist/` publicado.
- El pipeline etiqueta cada despliegue con `release = SHA del commit` (`PUBLIC_SENTRY_RELEASE`) y
  `environment = production`; en `npm run dev` el entorno es `development`.

## Estructura

```
src/
  layouts/Base.astro       # cabecera HTML, fuentes, hoja sobre fondo pino
  styles/global.css        # diseño (tokens, chips, tarjetas, tablas, modo oscuro)
  lib/clerk.ts             # carga de Clerk, usuario actual, token para Supabase, apariencia
  lib/supabase.ts          # cliente con token de Clerk, requireUser, isAdmin, signOut
  lib/edad.ts              # edad al 5 de diciembre y rangos
  lib/database.types.ts    # tipos de las tablas
  pages/index.astro        # login (componente SignIn de Clerk)
  pages/registro.astro     # formulario
  pages/admin.astro        # panel de organizadores
  scripts/*.ts             # lógica de cada página
supabase/migrations/       # SQL aplicado al proyecto
```
