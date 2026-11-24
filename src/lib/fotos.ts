/** Fotos del carrusel de la portada (archivos en public/img/). El orden es el de aparición. */
import { ruta } from './rutas';

export interface Foto {
  archivo: string;
  alt: string;
  titulo: string;
  nota: string;
}

export const FOTOS: Foto[] = [
  { archivo: 'mesa.jpg', alt: 'Mesa decorada con panetón, chocolate caliente y globos navideños frente a un letrero de Feliz Navidad', titulo: 'Mesa de Nochebuena', nota: 'Tradición que perdura en cada generación' },
  { archivo: 'salon.jpg', alt: 'La familia reunida en mesas con manteles rojos durante el compartir del año pasado', titulo: 'La familia reunida', nota: 'Así vivimos el compartir del año pasado' },
];

export const urlFoto = (f: Foto) => ruta('/img/' + f.archivo);
