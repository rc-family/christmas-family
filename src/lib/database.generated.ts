// Tipos de las tablas navidad_* del proyecto khrmsbteunrzpdsrrhjy (equivalente a `supabase gen types`, 2026-11-08). user_id es el id de usuario de Clerk.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      navidad_acompanantes: {
        Row: {
          celular: string | null
          familia_id: string
          id: string
          nombre: string
          orden: number
          relacion: string
          restricciones: string | null
        }
        Insert: {
          celular?: string | null
          familia_id: string
          id?: string
          nombre: string
          orden?: number
          relacion: string
          restricciones?: string | null
        }
        Update: {
          celular?: string | null
          familia_id?: string
          id?: string
          nombre?: string
          orden?: number
          relacion?: string
          restricciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navidad_acompanantes_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "navidad_familias"
            referencedColumns: ["id"]
          },
        ]
      }
      navidad_familias: {
        Row: {
          asiste: string
          ayuda: string[]
          celular: string
          comentarios: string | null
          created_at: string
          email: string
          id: string
          nombre: string
          parentesco: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asiste: string
          ayuda?: string[]
          celular: string
          comentarios?: string | null
          created_at?: string
          email: string
          id?: string
          nombre: string
          parentesco: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asiste?: string
          ayuda?: string[]
          celular?: string
          comentarios?: string | null
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          parentesco?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      navidad_ninos: {
        Row: {
          alergias: string | null
          familia_id: string
          fecha_nacimiento: string
          id: string
          intereses: string | null
          nombre: string
          orden: number
          sexo: string
        }
        Insert: {
          alergias?: string | null
          familia_id: string
          fecha_nacimiento: string
          id?: string
          intereses?: string | null
          nombre: string
          orden?: number
          sexo: string
        }
        Update: {
          alergias?: string | null
          familia_id?: string
          fecha_nacimiento?: string
          id?: string
          intereses?: string | null
          nombre?: string
          orden?: number
          sexo?: string
        }
        Relationships: [
          {
            foreignKeyName: "navidad_ninos_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "navidad_familias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      navidad_es_mi_familia: { Args: { fid: string }; Returns: boolean }
      navidad_is_admin: { Args: never; Returns: boolean }
      navidad_uid: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
