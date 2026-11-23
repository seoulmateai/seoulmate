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
          affection_loss: string | null
          affection_triggers: string | null
          age: number
          appearance: string | null
          avatar_path: string
          background: string
          badge: string
          bio: string
          blur_data_url: string | null
          chat_enabled: boolean
          created_at: string
          episode_1: string | null
          episode_2: string | null
          episode_3: string | null
          episode_4: string | null
          episode_5: string | null
          extra_rules: string | null
          first_meeting: string | null
          id: string
          intro: string
          is_active: boolean
          keywords: string[]
          name: string
          occupation: string
          persona_version: number
          personality: string
          relationship: string | null
          sort_order: number
          speech_style: string
          updated_at: string
        }
        Insert: {
          affection_loss?: string | null
          affection_triggers?: string | null
          age: number
          appearance?: string | null
          avatar_path: string
          background: string
          badge?: string
          bio: string
          blur_data_url?: string | null
          chat_enabled?: boolean
          created_at?: string
          episode_1?: string | null
          episode_2?: string | null
          episode_3?: string | null
          episode_4?: string | null
          episode_5?: string | null
          extra_rules?: string | null
          first_meeting?: string | null
          id?: string
          intro: string
          is_active?: boolean
          keywords?: string[]
          name: string
          occupation: string
          persona_version?: number
          personality: string
          relationship?: string | null
          sort_order?: number
          speech_style: string
          updated_at?: string
        }
        Update: {
          affection_loss?: string | null
          affection_triggers?: string | null
          age?: number
          appearance?: string | null
          avatar_path?: string
          background?: string
          badge?: string
          bio?: string
          blur_data_url?: string | null
          chat_enabled?: boolean
          created_at?: string
          episode_1?: string | null
          episode_2?: string | null
          episode_3?: string | null
          episode_4?: string | null
          episode_5?: string | null
          extra_rules?: string | null
          first_meeting?: string | null
          id?: string
          intro?: string
          is_active?: boolean
          keywords?: string[]
          name?: string
          occupation?: string
          persona_version?: number
          personality?: string
          relationship?: string | null
          sort_order?: number
          speech_style?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_rooms: {
        Row: {
          affection: number
          character_id: string
          created_at: string
          id: number
          last_message_at: string | null
          last_message_preview: string | null
          last_read_message_id: number | null
          memory_summary: string | null
          played_stage: number
          summarized_until_message_id: number | null
          summary_updated_at: string | null
          unlocked_stage: number
          user_id: string
        }
        Insert: {
          affection?: number
          character_id: string
          created_at?: string
          id?: never
          last_message_at?: string | null
          last_message_preview?: string | null
          last_read_message_id?: number | null
          memory_summary?: string | null
          played_stage?: number
          summarized_until_message_id?: number | null
          summary_updated_at?: string | null
          unlocked_stage?: number
          user_id: string
        }
        Update: {
          affection?: number
          character_id?: string
          created_at?: string
          id?: never
          last_message_at?: string | null
          last_message_preview?: string | null
          last_read_message_id?: number | null
          memory_summary?: string | null
          played_stage?: number
          summarized_until_message_id?: number | null
          summary_updated_at?: string | null
          unlocked_stage?: number
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
      guest_turns: {
        Row: {
          affection_delta: number | null
          assistant_content: string | null
          cached_input_tokens: number | null
          character_id: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          id: string
          input_tokens: number | null
          ip_hash: string
          model: string | null
          output_tokens: number | null
          persona_version: number | null
          thought_tokens: number | null
          user_content: string | null
        }
        Insert: {
          affection_delta?: number | null
          assistant_content?: string | null
          cached_input_tokens?: number | null
          character_id: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          ip_hash: string
          model?: string | null
          output_tokens?: number | null
          persona_version?: number | null
          thought_tokens?: number | null
          user_content?: string | null
        }
        Update: {
          affection_delta?: number | null
          assistant_content?: string | null
          cached_input_tokens?: number | null
          character_id?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          ip_hash?: string
          model?: string | null
          output_tokens?: number | null
          persona_version?: number | null
          thought_tokens?: number | null
          user_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_turns_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_turns_claimed_by_fkey"
            columns: ["claimed_by"]
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
          affection_delta: number | null
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
          rubies_charged: number | null
          status: string
          thought_tokens: number | null
          turn_id: string | null
          user_id: string | null
          weighted_points: number | null
        }
        Insert: {
          affection_delta?: number | null
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
          rubies_charged?: number | null
          status: string
          thought_tokens?: number | null
          turn_id?: string | null
          user_id?: string | null
          weighted_points?: number | null
        }
        Update: {
          affection_delta?: number | null
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
          rubies_charged?: number | null
          status?: string
          thought_tokens?: number | null
          turn_id?: string | null
          user_id?: string | null
          weighted_points?: number | null
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
          image_height: number | null
          image_path: string | null
          image_width: number | null
          role: string
          room_id: number
          turn_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          image_height?: number | null
          image_path?: string | null
          image_width?: number | null
          role: string
          room_id: number
          turn_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          image_height?: number | null
          image_path?: string | null
          image_width?: number | null
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
      ruby_transactions: {
        Row: {
          created_at: string
          free_balance_after: number
          free_delta: number
          id: number
          llm_call_id: number | null
          paid_balance_after: number
          paid_delta: number
          polar_order_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          free_balance_after: number
          free_delta?: number
          id?: never
          llm_call_id?: number | null
          paid_balance_after: number
          paid_delta?: number
          polar_order_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          free_balance_after?: number
          free_delta?: number
          id?: never
          llm_call_id?: number | null
          paid_balance_after?: number
          paid_delta?: number
          polar_order_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ruby_transactions_llm_call_id_fkey"
            columns: ["llm_call_id"]
            isOneToOne: false
            referencedRelation: "llm_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ruby_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ruby_wallets: {
        Row: {
          free_balance: number
          free_date: string | null
          paid_balance: number
          pending_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          free_balance?: number
          free_date?: string | null
          paid_balance?: number
          pending_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          free_balance?: number
          free_date?: string | null
          paid_balance?: number
          pending_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ruby_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      apply_affection: {
        Args: { p_delta: number; p_room_id: number }
        Returns: {
          affection: number
          newly_unlocked: boolean
          played_stage: number
          unlocked_stage: number
        }[]
      }
      charge_ruby_usage: {
        Args: {
          p_free_daily: number
          p_llm_call_id?: number
          p_points: number
          p_user_id: string
        }
        Returns: {
          free_balance: number
          paid_balance: number
          pending_points: number
          rubies_charged: number
        }[]
      }
      claim_guest_turn: {
        Args: { p_room_id: number; p_turn_id: string; p_user_id: string }
        Returns: boolean
      }
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
      create_chat_room: {
        Args: { p_character_id: string; p_user_id: string }
        Returns: number
      }
      credit_rubies: {
        Args: {
          p_amount: number
          p_order_id?: string
          p_type?: string
          p_user_id: string
        }
        Returns: number
      }
      get_ruby_wallet: {
        Args: { p_free_daily: number; p_user_id: string }
        Returns: {
          free_balance: number
          paid_balance: number
          pending_points: number
        }[]
      }
      refund_rubies: {
        Args: { p_amount: number; p_order_id: string; p_user_id: string }
        Returns: number
      }
      reserve_guest_turn: {
        Args: {
          p_character_id: string
          p_daily_limit: number
          p_ip_hash: string
        }
        Returns: string
      }
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
