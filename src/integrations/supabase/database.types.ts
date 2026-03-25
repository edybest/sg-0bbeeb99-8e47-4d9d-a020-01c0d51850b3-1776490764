/* eslint-disable @typescript-eslint/no-empty-object-type */
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
      blok_games: {
        Row: {
          created_at: string | null
          game_date: string
          id: string
          member_id: string | null
          member_name: string
          score_1: number
          score_2: number
          score_3: number
          total_score: number | null
          updated_at: string | null
          winner: string | null
        }
        Insert: {
          created_at?: string | null
          game_date: string
          id?: string
          member_id?: string | null
          member_name: string
          score_1?: number
          score_2?: number
          score_3?: number
          total_score?: number | null
          updated_at?: string | null
          winner?: string | null
        }
        Update: {
          created_at?: string | null
          game_date?: string
          id?: string
          member_id?: string | null
          member_name?: string
          score_1?: number
          score_2?: number
          score_3?: number
          total_score?: number | null
          updated_at?: string | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blok_games_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          edited_at: string | null
          id: string
          message: string
          room_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          message: string
          room_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          message?: string
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          id: string
          is_banned: boolean | null
          is_silenced: boolean | null
          joined_at: string | null
          last_read_at: string | null
          member_id: string
          room_id: string
          silence_reason: string | null
          silenced_at: string | null
          silenced_by: string | null
        }
        Insert: {
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          id?: string
          is_banned?: boolean | null
          is_silenced?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          member_id: string
          room_id: string
          silence_reason?: string | null
          silenced_at?: string | null
          silenced_by?: string | null
        }
        Update: {
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          id?: string
          is_banned?: boolean | null
          is_silenced?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          member_id?: string
          room_id?: string
          silence_reason?: string | null
          silenced_at?: string | null
          silenced_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_silenced_by_fkey"
            columns: ["silenced_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_public: boolean | null
          last_message_at: string | null
          name: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_public?: boolean | null
          last_message_at?: string | null
          name?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_public?: boolean | null
          last_message_at?: string | null
          name?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
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
          player_count: number
          prize_count: number
          prizes: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_count: number
          prize_count: number
          prizes?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          player_count?: number
          prize_count?: number
          prizes?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      gallery_albums: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          position_order: number | null
          updated_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          position_order?: number | null
          updated_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          position_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_albums_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          album_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          position_order: number | null
          title: string | null
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          album_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          position_order?: number | null
          title?: string | null
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          album_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          position_order?: number | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "gallery_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_permissions: {
        Row: {
          can_add_albums: boolean | null
          can_add_images: boolean | null
          can_delete_albums: boolean | null
          can_delete_images: boolean | null
          can_edit_albums: boolean | null
          can_edit_images: boolean | null
          created_at: string | null
          granted_by: string
          id: string
          member_id: string
          updated_at: string | null
        }
        Insert: {
          can_add_albums?: boolean | null
          can_add_images?: boolean | null
          can_delete_albums?: boolean | null
          can_delete_images?: boolean | null
          can_edit_albums?: boolean | null
          can_edit_images?: boolean | null
          created_at?: string | null
          granted_by: string
          id?: string
          member_id: string
          updated_at?: string | null
        }
        Update: {
          can_add_albums?: boolean | null
          can_add_images?: boolean | null
          can_delete_albums?: boolean | null
          can_delete_images?: boolean | null
          can_edit_albums?: boolean | null
          can_edit_images?: boolean | null
          created_at?: string | null
          granted_by?: string
          id?: string
          member_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_permissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
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
          is_fivefive: boolean | null
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
          is_fivefive?: boolean | null
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
          is_fivefive?: boolean | null
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
      lane_assignments: {
        Row: {
          created_at: string | null
          game_id: string
          id: string
          lane_position: string
          member_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          game_id: string
          id?: string
          lane_position: string
          member_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          game_id?: string
          id?: string
          lane_position?: string
          member_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lane_assignments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lane_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      lane_configurations: {
        Row: {
          created_at: string | null
          id: string
          lane_sebenar: string
          lane_undian: string
          position_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lane_sebenar: string
          lane_undian: string
          position_order?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lane_sebenar?: string
          lane_undian?: string
          position_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      lane_spin_results: {
        Row: {
          created_at: string | null
          game_id: string
          id: string
          lane_position: string
          member_id: string
          spun_at: string | null
        }
        Insert: {
          created_at?: string | null
          game_id: string
          id?: string
          lane_position: string
          member_id: string
          spun_at?: string | null
        }
        Update: {
          created_at?: string | null
          game_id?: string
          id?: string
          lane_position?: string
          member_id?: string
          spun_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lane_spin_results_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lane_spin_results_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_feedback: {
        Row: {
          admin_reply: string | null
          category: string
          created_at: string | null
          id: string
          member_id: string
          message: string
          replied_at: string | null
          replied_by: string | null
          screenshot_url: string | null
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          admin_reply?: string | null
          category: string
          created_at?: string | null
          id?: string
          member_id: string
          message: string
          replied_at?: string | null
          replied_by?: string | null
          screenshot_url?: string | null
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          admin_reply?: string | null
          category?: string
          created_at?: string | null
          id?: string
          member_id?: string
          message?: string
          replied_at?: string | null
          replied_by?: string | null
          screenshot_url?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_feedback_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_feedback_replied_by_fkey"
            columns: ["replied_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          last_accessed_at: string | null
          member_id: string
          session_token: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          last_accessed_at?: string | null
          member_id: string
          session_token: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_accessed_at?: string | null
          member_id?: string
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
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
          tac_code: string | null
          tac_expiry: string | null
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
          tac_code?: string | null
          tac_expiry?: string | null
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
          tac_code?: string | null
          tac_expiry?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      mini_blok: {
        Row: {
          created_at: string | null
          date: string
          id: string
          location: string | null
          num_games: number
          owner_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          location?: string | null
          num_games?: number
          owner_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          location?: string | null
          num_games?: number
          owner_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mini_blok_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_blok_collaborators: {
        Row: {
          created_at: string | null
          id: string
          member_id: string
          mini_blok_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id: string
          mini_blok_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string
          mini_blok_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mini_blok_collaborators_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini_blok_collaborators_mini_blok_id_fkey"
            columns: ["mini_blok_id"]
            isOneToOne: false
            referencedRelation: "mini_blok"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_blok_players: {
        Row: {
          created_at: string | null
          handicap: number | null
          id: string
          mini_blok_id: string
          player_name: string
          scores: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          handicap?: number | null
          id?: string
          mini_blok_id: string
          player_name: string
          scores?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          handicap?: number | null
          id?: string
          mini_blok_id?: string
          player_name?: string
          scores?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mini_blok_players_mini_blok_id_fkey"
            columns: ["mini_blok_id"]
            isOneToOne: false
            referencedRelation: "mini_blok"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_blok_shares: {
        Row: {
          created_at: string | null
          created_by_member_id: string
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          mini_blok_id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          created_by_member_id: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          mini_blok_id: string
          revoked_at?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          created_by_member_id?: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          mini_blok_id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "mini_blok_shares_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini_blok_shares_mini_blok_id_fkey"
            columns: ["mini_blok_id"]
            isOneToOne: false
            referencedRelation: "mini_blok"
            referencedColumns: ["id"]
          },
        ]
      }
      nav_layout_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      notification_recipients: {
        Row: {
          delivered_at: string | null
          member_id: string
          notification_id: string
          read_at: string | null
        }
        Insert: {
          delivered_at?: string | null
          member_id: string
          notification_id: string
          read_at?: string | null
        }
        Update: {
          delivered_at?: string | null
          member_id?: string
          notification_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          message: string
          target_date: string | null
          target_type: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message: string
          target_date?: string | null
          target_type: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message?: string
          target_date?: string | null
          target_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      page_access_control: {
        Row: {
          access_level: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          page_name: string
          page_path: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          page_name: string
          page_path: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          page_name?: string
          page_path?: string
          updated_at?: string | null
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
      training_scores: {
        Row: {
          created_at: string | null
          frame1_roll1: string | null
          frame1_roll2: string | null
          frame1_split: boolean | null
          frame10_roll1: string | null
          frame10_roll2: string | null
          frame10_roll3: string | null
          frame10_split: boolean | null
          frame2_roll1: string | null
          frame2_roll2: string | null
          frame2_split: boolean | null
          frame3_roll1: string | null
          frame3_roll2: string | null
          frame3_split: boolean | null
          frame4_roll1: string | null
          frame4_roll2: string | null
          frame4_split: boolean | null
          frame5_roll1: string | null
          frame5_roll2: string | null
          frame5_split: boolean | null
          frame6_roll1: string | null
          frame6_roll2: string | null
          frame6_split: boolean | null
          frame7_roll1: string | null
          frame7_roll2: string | null
          frame7_split: boolean | null
          frame8_roll1: string | null
          frame8_roll2: string | null
          frame8_split: boolean | null
          frame9_roll1: string | null
          frame9_roll2: string | null
          frame9_split: boolean | null
          id: string
          location: string | null
          member_id: string
          notes: string | null
          total_score: number | null
          training_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          frame1_roll1?: string | null
          frame1_roll2?: string | null
          frame1_split?: boolean | null
          frame10_roll1?: string | null
          frame10_roll2?: string | null
          frame10_roll3?: string | null
          frame10_split?: boolean | null
          frame2_roll1?: string | null
          frame2_roll2?: string | null
          frame2_split?: boolean | null
          frame3_roll1?: string | null
          frame3_roll2?: string | null
          frame3_split?: boolean | null
          frame4_roll1?: string | null
          frame4_roll2?: string | null
          frame4_split?: boolean | null
          frame5_roll1?: string | null
          frame5_roll2?: string | null
          frame5_split?: boolean | null
          frame6_roll1?: string | null
          frame6_roll2?: string | null
          frame6_split?: boolean | null
          frame7_roll1?: string | null
          frame7_roll2?: string | null
          frame7_split?: boolean | null
          frame8_roll1?: string | null
          frame8_roll2?: string | null
          frame8_split?: boolean | null
          frame9_roll1?: string | null
          frame9_roll2?: string | null
          frame9_split?: boolean | null
          id?: string
          location?: string | null
          member_id: string
          notes?: string | null
          total_score?: number | null
          training_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          frame1_roll1?: string | null
          frame1_roll2?: string | null
          frame1_split?: boolean | null
          frame10_roll1?: string | null
          frame10_roll2?: string | null
          frame10_roll3?: string | null
          frame10_split?: boolean | null
          frame2_roll1?: string | null
          frame2_roll2?: string | null
          frame2_split?: boolean | null
          frame3_roll1?: string | null
          frame3_roll2?: string | null
          frame3_split?: boolean | null
          frame4_roll1?: string | null
          frame4_roll2?: string | null
          frame4_split?: boolean | null
          frame5_roll1?: string | null
          frame5_roll2?: string | null
          frame5_split?: boolean | null
          frame6_roll1?: string | null
          frame6_roll2?: string | null
          frame6_split?: boolean | null
          frame7_roll1?: string | null
          frame7_roll2?: string | null
          frame7_split?: boolean | null
          frame8_roll1?: string | null
          frame8_roll2?: string | null
          frame8_split?: boolean | null
          frame9_roll1?: string | null
          frame9_roll2?: string | null
          frame9_split?: boolean | null
          id?: string
          location?: string | null
          member_id?: string
          notes?: string | null
          total_score?: number | null
          training_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_scores_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_member_id: { Args: never; Returns: string }
      generate_mini_blok_share: {
        Args: { p_mini_blok_id: string }
        Returns: string
      }
      get_member_chat_rooms: {
        Args: { p_member_id: string }
        Returns: {
          is_banned: boolean
          is_public: boolean
          is_silenced: boolean
          last_message_at: string
          room_id: string
          room_name: string
          room_type: string
          unread_count: number
        }[]
      }
      get_member_id_from_auth: { Args: never; Returns: string }
      get_mini_blok_shared: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          date: string
          location: string
          mini_blok_id: string
          num_games: number
          owner_id: string
          players: Json
          title: string
          updated_at: string
        }[]
      }
      get_or_create_direct_chat: {
        Args: { member1_id: string; member2_id: string }
        Returns: string
      }
      get_user_chat_rooms: {
        Args: { user_uuid: string }
        Returns: {
          room_id: string
        }[]
      }
      is_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
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
