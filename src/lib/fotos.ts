/** Fotos del carrusel de la portada (archivos en public/img/). El orden es el de aparición. */
import { ruta } from './rutas';

export interface Foto {
  archivo: string;
  alt: string;
  titulo: string;
  nota: string;
  /** Punto de la foto que se conserva al recortarla (object-position); por defecto el centro. */
  foco?: string;
}

export const FOTOS: Foto[] = [
  { archivo: 'mesa.jpg', alt: 'Mesa decorada con panetón, chocolate caliente y globos navideños frente a un letrero de Feliz Navidad', titulo: 'Mesa de Nochebuena', nota: 'Tradición que perdura en cada generación' },
  { archivo: 'salon.jpg', alt: 'La familia reunida en mesas con manteles rojos durante el compartir del año pasado', titulo: 'La familia reunida', nota: 'Así vivimos el compartir del año pasado' },
  { archivo: 'familia-1.jpg', alt: 'Toda la familia saludando a la cámara junto a Papá Noel y los animadores, frente a un arco de globos navideños', titulo: 'Todos a la foto', nota: 'Saludos, risas y Papá Noel de invitado', foco: '50% 62%' },
  { archivo: 'familia-2.jpg', alt: 'Foto grupal de la familia, varios con polos blancos navideños, delante de un arco de globos rojos, verdes y dorados', titulo: 'La familia completa', nota: 'Grandes y chicos en una sola foto', foco: '50% 68%' },
  { archivo: 'familia-3.jpg', alt: 'La familia reunida alrededor de Papá Noel, con un payaso sentado al frente haciendo la señal de la paz', titulo: 'Con Papá Noel', nota: 'La visita que nadie se quiere perder', foco: '50% 55%' },
  { archivo: 'familia-4.jpg', alt: 'La familia posando frente a una pared con guirnaldas y luces navideñas, con los más jóvenes agachados adelante', titulo: 'Entre luces y guirnaldas', nota: 'Un recuerdo más para el álbum', foco: '50% 60%' },
];

export const urlFoto = (f: Foto) => ruta('/img/' + f.archivo);
