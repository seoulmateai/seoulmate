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
      characters: {
        Row: {
          age: number
          avatar_path: string
          background: string
          badge: string
          bio: string
          blur_data_url: string | null
          created_at: string
          extra_rules: string | null
          id: string
          intro: string
          is_active: boolean
          keywords: string[]
          name: string
          occupation: string
          persona_version: number
          personality: string
          sort_order: number
          speech_style: string
          updated_at: string
        }
        Insert: {
          age: number
          avatar_path: string
          background: string
          badge?: string
          bio: string
          blur_data_url?: string | null
          created_at?: string
          extra_rules?: string | null
          id?: string
          intro: string
          is_active?: boolean
          keywords?: string[]
          name: string
          occupation: string
          persona_version?: number
          personality: string
          sort_order?: number
          speech_style: string
          updated_at?: string
        }
        Update: {
          age?: number
          avatar_path?: string
          background?: string
          badge?: string
          bio?: string
          blur_data_url?: string | null
          created_at?: string
          extra_rules?: string | null
          id?: string
          intro?: string
          is_active?: boolean
          keywords?: string[]
          name?: string
          occupation?: string
          persona_version?: number
          personality?: string
          sort_order?: number
          speech_style?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_rooms: {
        Row: {
          character_id: string
          created_at: string
          id: number
          last_message_at: string | null
          last_message_preview: string | null
          last_read_message_id: number | null
          memory_summary: string | null
          summarized_until_message_id: number | null
          summary_updated_at: string | null
          user_id: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: never
          last_message_at?: string | null
          last_message_preview?: string | null
          last_read_message_id?: number | null
          memory_summary?: string | null
          summarized_until_message_id?: number | null
          summary_updated_at?: string | null
          user_id: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: never
          last_message_at?: string | null
          last_message_preview?: string | null
          last_read_message_id?: number | null
          memory_summary?: string | null
          summarized_until_message_id?: number | null
          summary_updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          answer: string | null
          answered_at: string | null
          category: string
          content: string
          created_at: string
          email: string
          id: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          category?: string
          content: string
          created_at?: string
          email: string
          id?: never
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          category?: string
          content?: string
          created_at?: string
          email?: string
          id?: never
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_calls: {
        Row: {
          cached_input_tokens: number | null
          character_id: string | null
          created_at: string
          error_code: string | null
          id: number
          input_tokens: number | null
          latency_ms: number | null
          model: string
          output_tokens: number | null
          persona_version: number | null
          provider: string
          purpose: string
          room_id: number | null
          status: string
          turn_id: string | null
          user_id: string | null
        }
        Insert: {
          cached_input_tokens?: number | null
          character_id?: string | null
          created_at?: string
          error_code?: string | null
          id?: never
          input_tokens?: number | null
          latency_ms?: number | null
          model: string
          output_tokens?: number | null
          persona_version?: number | null
          provider?: string
          purpose?: string
          room_id?: number | null
          status: string
          turn_id?: string | null
          user_id?: string | null
        }
        Update: {
          cached_input_tokens?: number | null
          character_id?: string | null
          created_at?: string
          error_code?: string | null
          id?: never
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string
          output_tokens?: number | null
          persona_version?: number | null
          provider?: string
          purpose?: string
          room_id?: number | null
          status?: string
          turn_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_calls_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: number
          role: string
          room_id: number
          turn_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          role: string
          room_id: number
          turn_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          role?: string
          room_id?: number
          turn_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_verified_at: string
          age_verify_provider: string
          birth_date: string
          created_at: string
          id: string
          marketing_agreed: boolean
          nickname: string
          privacy_agreed_at: string
          role: string
          status: string
          terms_agreed_at: string
          updated_at: string
        }
        Insert: {
          age_verified_at?: string
          age_verify_provider?: string
          birth_date: string
          created_at?: string
          id: string
          marketing_agreed?: boolean
          nickname: string
          privacy_agreed_at?: string
          role?: string
          status?: string
          terms_agreed_at?: string
          updated_at?: string
        }
        Update: {
          age_verified_at?: string
          age_verify_provider?: string
          birth_date?: string
          created_at?: string
          id?: string
          marketing_agreed?: boolean
          nickname?: string
          privacy_agreed_at?: string
          role?: string
          status?: string
          terms_agreed_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          category: string
          created_at: string
          id: number
          memo: string | null
          message_id: number | null
          resolved_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: never
          memo?: string | null
          message_id?: number | null
          resolved_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: never
          memo?: string | null
          message_id?: number | null
          resolved_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          reply_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          reply_count?: number
          usage_date: string
          user_id: string
        }
        Update: {
          reply_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_onboarding: {
        Args: {
          p_birth_date: string
          p_marketing_agreed?: boolean
          p_nickname: string
        }
        Returns: {
          age_verified_at: string
          age_verify_provider: string
          birth_date: string
          created_at: string
          id: string
          marketing_agreed: boolean
          nickname: string
          privacy_agreed_at: string
          role: string
          status: string
          terms_agreed_at: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_reply_quota: {
        Args: { p_limit: number; p_user_id: string }
        Returns: number
      }
      refund_reply_quota: { Args: { p_user_id: string }; Returns: undefined }
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
