 
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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      club_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fivefive_games: {
        Row: {
          created_at: string | null
          game_date: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          game_date: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          game_date?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fivefive_participants: {
        Row: {
          created_at: string | null
          fivefive_game_id: string
          game1_prize: number | null
          game1_score: number | null
          game2_prize: number | null
          game2_score: number | null
          game3_prize: number | null
          game3_score: number | null
          game4_prize: number | null
          game4_score: number | null
          game5_prize: number | null
          game5_score: number | null
          id: string
          member_id: string
          total_prize: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fivefive_game_id: string
          game1_prize?: number | null
          game1_score?: number | null
          game2_prize?: number | null
          game2_score?: number | null
          game3_prize?: number | null
          game3_score?: number | null
          game4_prize?: number | null
          game4_score?: number | null
          game5_prize?: number | null
          game5_score?: number | null
          id?: string
          member_id: string
          total_prize?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fivefive_game_id?: string
          game1_prize?: number | null
          game1_score?: number | null
          game2_prize?: number | null
          game2_score?: number | null
          game3_prize?: number | null
          game3_score?: number | null
          game4_prize?: number | null
          game4_score?: number | null
          game5_prize?: number | null
          game5_score?: number | null
          id?: string
          member_id?: string
          total_prize?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fivefive_participants_fivefive_game_id_fkey"
            columns: ["fivefive_game_id"]
            isOneToOne: false
            referencedRelation: "fivefive_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fivefive_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      fivefive_prizes: {
        Row: {
          created_at: string | null
          id: string
          prize_count: number
          prizes: Json
          total_players: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          prize_count: number
          prizes?: Json
          total_players: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          prize_count?: number
          prizes?: Json
          total_players?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      game_players: {
        Row: {
          average_score: number | null
          created_at: string | null
          game_id: string
          game1_score: number | null
          game2_score: number | null
          game3_score: number | null
          game4_score: number | null
          game5_score: number | null
          handicap: number | null
          id: string
          member_id: string
          overall_score: number | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          average_score?: number | null
          created_at?: string | null
          game_id: string
          game1_score?: number | null
          game2_score?: number | null
          game3_score?: number | null
          game4_score?: number | null
          game5_score?: number | null
          handicap?: number | null
          id?: string
          member_id: string
          overall_score?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          average_score?: number | null
          created_at?: string | null
          game_id?: string
          game1_score?: number | null
          game2_score?: number | null
          game3_score?: number | null
          game4_score?: number | null
          game5_score?: number | null
          handicap?: number | null
          id?: string
          member_id?: string
          overall_score?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string | null
          game_date: string
          game_format: string | null
          game_name: string
          game_type: string | null
          id: string
          is_official: boolean | null
          location: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          game_date: string
          game_format?: string | null
          game_name: string
          game_type?: string | null
          id?: string
          is_official?: boolean | null
          location?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          game_date?: string
          game_format?: string | null
          game_name?: string
          game_type?: string | null
          id?: string
          is_official?: boolean | null
          location?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      members: {
        Row: {
          avatar_url: string | null
          birthday: string
          bowling_technique: string | null
          created_at: string | null
          email: string | null
          full_name: string
          handicap: number | null
          id: string
          is_admin: boolean | null
          is_verified: boolean | null
          phone: string
          sex: string
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          birthday: string
          bowling_technique?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          handicap?: number | null
          id?: string
          is_admin?: boolean | null
          is_verified?: boolean | null
          phone: string
          sex: string
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          birthday?: string
          bowling_technique?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          handicap?: number | null
          id?: string
          is_admin?: boolean | null
          is_verified?: boolean | null
          phone?: string
          sex?: string
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { user_uuid: string }; Returns: boolean }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
