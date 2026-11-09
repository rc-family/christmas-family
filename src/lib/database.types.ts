// Alias de uso en la app sobre los tipos generados por Supabase.
import type { Database } from './database.generated';
export type { Database };

export type Asiste = 'Sí' | 'Por confirmar' | 'No';
export type Sexo = 'Niño' | 'Niña';

type Tablas = Database['public']['Tables'];
export type FamiliaRow = Tablas['navidad_familias']['Row'];
export type FamiliaInsert = Tablas['navidad_familias']['Insert'];
export type AcompananteRow = Tablas['navidad_acompanantes']['Row'];
export type AcompananteInsert = Tablas['navidad_acompanantes']['Insert'];
export type NinoRow = Tablas['navidad_ninos']['Row'];
export type NinoInsert = Tablas['navidad_ninos']['Insert'];
