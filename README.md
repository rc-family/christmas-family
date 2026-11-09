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

## Despliegue

`npm run build` genera `dist/` estático. Sirve en Netlify, Vercel, Cloudflare Pages o GitHub Pages.
Para producción crea la instancia *Production* en Clerk (requiere un dominio propio), usa su `pk_live_...` y
registra el nuevo dominio de Clerk en Supabase → Third-party Auth.

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
