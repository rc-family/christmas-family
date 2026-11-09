/** Lista del reproductor: canciones propias de la familia, servidas desde public/musica/. */
import { ruta } from './rutas';

export interface Pista {
  titulo: string;
  interprete: string;
  url: string;
}

export const PISTAS: Pista[] = [
  { titulo: 'Juntos otra vez', interprete: 'Canción del compartir', url: ruta('/musica/juntos-otra-vez.mp3') },
  { titulo: 'Cada año nos volvemos a encontrar', interprete: 'Canción del compartir', url: ruta('/musica/cada-anio-nos-volvemos-a-encontrar.mp3') },
  { titulo: 'Cada año una silla más', interprete: 'Canción del compartir', url: ruta('/musica/cada-anio-una-silla-mas.mp3') },
  { titulo: 'High Altitude Noel', interprete: 'Canción del compartir', url: ruta('/musica/high-altitude-noel.mp3') },
  { titulo: 'Bells Over the Altiplano', interprete: 'Canción del compartir', url: ruta('/musica/bells-over-the-altiplano.mp3') },
];
