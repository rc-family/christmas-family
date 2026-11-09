export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
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
      navidad_eventos: {
        Row: {
          ancho: number | null
          creado: string
          desde: string | null
          detalle: Json
          dispositivo: string
          evento: string
          id: number
          navegador: string | null
          pagina: string
          sesion: string
          user_id: string | null
        }
        Insert: {
          ancho?: number | null
          creado?: string
          desde?: string | null
          detalle?: Json
          dispositivo: string
          evento: string
          id?: never
          navegador?: string | null
          pagina: string
          sesion: string
          user_id?: string | null
        }
        Update: {
          ancho?: number | null
          creado?: string
          desde?: string | null
          detalle?: Json
          dispositivo?: string
          evento?: string
          id?: never
          navegador?: string | null
          pagina?: string
          sesion?: string
          user_id?: string | null
        }
        Relationships: []
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
      navidad_guardar_respuesta: { Args: { p_email: string; p_datos: Json }; Returns: string }
      navidad_is_admin: { Args: never; Returns: boolean }
      navidad_totales: { Args: never; Returns: Json }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
