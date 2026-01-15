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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bulk_transfer_items: {
        Row: {
          amount: string
          bulk_transfer_id: string
          created_at: string
          error_message: string | null
          id: string
          recipient_address: string
          status: string
          tx_hash: string | null
        }
        Insert: {
          amount: string
          bulk_transfer_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_address: string
          status?: string
          tx_hash?: string | null
        }
        Update: {
          amount?: string
          bulk_transfer_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_address?: string
          status?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_transfer_items_bulk_transfer_id_fkey"
            columns: ["bulk_transfer_id"]
            isOneToOne: false
            referencedRelation: "bulk_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_transfers: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          failed_count: number | null
          id: string
          status: string
          successful_count: number | null
          token_address: string | null
          token_symbol: string
          total_amount: string
          total_recipients: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          failed_count?: number | null
          id?: string
          status?: string
          successful_count?: number | null
          token_address?: string | null
          token_symbol: string
          total_amount: string
          total_recipients: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          failed_count?: number | null
          id?: string
          status?: string
          successful_count?: number | null
          token_address?: string | null
          token_symbol?: string
          total_amount?: string
          total_recipients?: number
        }
        Relationships: []
      }
      encrypted_wallet_keys: {
        Row: {
          created_at: string | null
          encrypted_key: string
          id: string
          key_iv: string
          key_salt: string
          updated_at: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          encrypted_key: string
          id?: string
          key_iv: string
          key_salt: string
          updated_at?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          encrypted_key?: string
          id?: string
          key_iv?: string
          key_salt?: string
          updated_at?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          id_back_path: string
          id_front_path: string
          id_number: string
          nationality: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          id?: string
          id_back_path: string
          id_front_path: string
          id_number: string
          nationality?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          id_back_path?: string
          id_front_path?: string
          id_number?: string
          nationality?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          progress: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          progress?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          progress?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nft_collections: {
        Row: {
          chain: string
          contract_address: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          metadata_url: string | null
          name: string | null
          token_id: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          chain?: string
          contract_address: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          metadata_url?: string | null
          name?: string | null
          token_id: string
          user_id: string
          wallet_id: string
        }
        Update: {
          chain?: string
          contract_address?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          metadata_url?: string | null
          name?: string | null
          token_id?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nft_collections_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          kyc_status: string | null
          preferred_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          kyc_status?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          kyc_status?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          reward_amount: string
          reward_symbol: string | null
          reward_type: string
          sent_at: string | null
          status: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          reward_amount: string
          reward_symbol?: string | null
          reward_type: string
          sent_at?: string | null
          status?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          reward_amount?: string
          reward_symbol?: string | null
          reward_type?: string
          sent_at?: string | null
          status?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staking_positions: {
        Row: {
          amount: string
          apy: number
          created_at: string | null
          earned: string | null
          ends_at: string | null
          id: string
          lock_days: number
          pool_name: string
          started_at: string | null
          status: string | null
          token_address: string | null
          token_symbol: string
          updated_at: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: string
          apy: number
          created_at?: string | null
          earned?: string | null
          ends_at?: string | null
          id?: string
          lock_days?: number
          pool_name: string
          started_at?: string | null
          status?: string | null
          token_address?: string | null
          token_symbol: string
          updated_at?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: string
          apy?: number
          created_at?: string | null
          earned?: string | null
          ends_at?: string | null
          id?: string
          lock_days?: number
          pool_name?: string
          started_at?: string | null
          status?: string | null
          token_address?: string | null
          token_symbol?: string
          updated_at?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staking_positions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: string
          block_number: number | null
          created_at: string
          from_address: string
          gas_used: string | null
          id: string
          status: string
          to_address: string
          token_address: string | null
          token_symbol: string
          tx_hash: string
          tx_timestamp: string | null
          tx_type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: string
          block_number?: number | null
          created_at?: string
          from_address: string
          gas_used?: string | null
          id?: string
          status?: string
          to_address: string
          token_address?: string | null
          token_symbol: string
          tx_hash: string
          tx_timestamp?: string | null
          tx_type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: string
          block_number?: number | null
          created_at?: string
          from_address?: string
          gas_used?: string | null
          id?: string
          status?: string
          to_address?: string
          token_address?: string | null
          token_symbol?: string
          tx_hash?: string
          tx_timestamp?: string | null
          tx_type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cards: {
        Row: {
          balance: number | null
          card_number: string
          card_tier: string
          created_at: string | null
          id: string
          is_locked: boolean | null
          nft_badge_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          card_number: string
          card_tier?: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          nft_badge_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          card_number?: string
          card_tier?: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          nft_badge_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_learning_stats: {
        Row: {
          certificates_earned: string[] | null
          created_at: string | null
          id: string
          last_activity_date: string | null
          level: number | null
          streak_days: number | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          certificates_earned?: string[] | null
          created_at?: string | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          streak_days?: number | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          certificates_earned?: string[] | null
          created_at?: string | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          streak_days?: number | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          bulk_send_defaults: Json | null
          created_at: string | null
          favorite_token: string | null
          id: string
          recent_addresses: Json | null
          updated_at: string | null
          user_id: string
          walletconnect_sessions: Json | null
        }
        Insert: {
          bulk_send_defaults?: Json | null
          created_at?: string | null
          favorite_token?: string | null
          id?: string
          recent_addresses?: Json | null
          updated_at?: string | null
          user_id: string
          walletconnect_sessions?: Json | null
        }
        Update: {
          bulk_send_defaults?: Json | null
          created_at?: string | null
          favorite_token?: string | null
          id?: string
          recent_addresses?: Json | null
          updated_at?: string | null
          user_id?: string
          walletconnect_sessions?: Json | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          address: string
          chain: string
          created_at: string
          id: string
          is_primary: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          chain?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          chain?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
