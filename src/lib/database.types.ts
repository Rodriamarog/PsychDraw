export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_usage: {
        Row: {
          analysis_id: string | null
          error_message: string | null
          estimated_cost: number | null
          id: string
          month_year: string
          psychologist_id: string
          request_status: string
          request_timestamp: string | null
        }
        Insert: {
          analysis_id?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          month_year: string
          psychologist_id: string
          request_status: string
          request_timestamp?: string | null
        }
        Update: {
          analysis_id?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          month_year?: string
          psychologist_id?: string
          request_status?: string
          request_timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "drawing_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "psychologists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_api_usage_analysis"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "drawing_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_api_usage_psychologist"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "psychologists"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          age: number | null
          client_identifier: string | null
          client_notes: string | null
          created_at: string | null
          gender: Database["public"]["Enums"]["gender_enum"] | null
          id: string
          is_active: boolean | null
          name: string
          psychologist_id: string
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          client_identifier?: string | null
          client_notes?: string | null
          created_at?: string | null
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          id?: string
          is_active?: boolean | null
          name: string
          psychologist_id: string
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          client_identifier?: string | null
          client_notes?: string | null
          created_at?: string | null
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          id?: string
          is_active?: boolean | null
          name?: string
          psychologist_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "psychologists"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_analyses: {
        Row: {
          analysis_date: string | null
          client_id: string
          created_at: string | null
          drawing_processed: boolean | null
          drawing_type_id: string
          id: string
          psychologist_id: string
          raw_analysis: Json
          temp_drawing_path: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_date?: string | null
          client_id: string
          created_at?: string | null
          drawing_processed?: boolean | null
          drawing_type_id: string
          id?: string
          psychologist_id: string
          raw_analysis: Json
          temp_drawing_path?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_date?: string | null
          client_id?: string
          created_at?: string | null
          drawing_processed?: boolean | null
          drawing_type_id?: string
          id?: string
          psychologist_id?: string
          raw_analysis?: Json
          temp_drawing_path?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawing_analyses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_analyses_drawing_type_id_fkey"
            columns: ["drawing_type_id"]
            isOneToOne: false
            referencedRelation: "drawing_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_analyses_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "psychologists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_drawing_type"
            columns: ["drawing_type_id"]
            isOneToOne: false
            referencedRelation: "drawing_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_psychologist"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "psychologists"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      psychologists: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          analysis_id: string
          generated_at: string | null
          id: string
          report_path: string
          report_storage_bucket: string
        }
        Insert: {
          analysis_id: string
          generated_at?: string | null
          id?: string
          report_path: string
          report_storage_bucket?: string
        }
        Update: {
          analysis_id?: string
          generated_at?: string | null
          id?: string
          report_path?: string
          report_storage_bucket?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_analysis"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "drawing_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "drawing_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_processed_drawings: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      gender_enum: "Male" | "Female" | "Non-Binary"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      gender_enum: ["Male", "Female", "Non-Binary"],
    },
  },
} as const
