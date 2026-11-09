/** Rutas absolutas respetando la ruta base del sitio (import.meta.env.BASE_URL). */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const ruta = (p: string) => BASE + (p.startsWith('/') ? p : '/' + p);
