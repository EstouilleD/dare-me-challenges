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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      boosts: {
        Row: {
          boost_type: string
          coin_cost: number
          created_at: string
          id: string
          target_challenge_id: string | null
          target_proof_id: string | null
          user_id: string
        }
        Insert: {
          boost_type: string
          coin_cost: number
          created_at?: string
          id?: string
          target_challenge_id?: string | null
          target_proof_id?: string | null
          user_id: string
        }
        Update: {
          boost_type?: string
          coin_cost?: number
          created_at?: string
          id?: string
          target_challenge_id?: string | null
          target_proof_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boosts_target_challenge_id_fkey"
            columns: ["target_challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boosts_target_proof_id_fkey"
            columns: ["target_proof_id"]
            isOneToOne: false
            referencedRelation: "proofs"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_types: {
        Row: {
          created_at: string
          description: string | null
          has_proof: boolean | null
          has_quantity: boolean | null
          icon: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          has_proof?: boolean | null
          has_quantity?: boolean | null
          icon: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          has_proof?: boolean | null
          has_quantity?: boolean | null
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          ask_numeric_score: boolean | null
          created_at: string
          demo_audio_url: string | null
          demo_photo_url: string | null
          demo_video_url: string | null
          description: string
          end_date: string
          frequency_period: string | null
          frequency_quantity: number | null
          id: string
          is_public: boolean | null
          owner_id: string
          quantity_target: number | null
          start_date: string
          status: string
          title: string
          type_id: string
          updated_at: string
        }
        Insert: {
          ask_numeric_score?: boolean | null
          created_at?: string
          demo_audio_url?: string | null
          demo_photo_url?: string | null
          demo_video_url?: string | null
          description: string
          end_date: string
          frequency_period?: string | null
          frequency_quantity?: number | null
          id?: string
          is_public?: boolean | null
          owner_id: string
          quantity_target?: number | null
          start_date: string
          status?: string
          title: string
          type_id: string
          updated_at?: string
        }
        Update: {
          ask_numeric_score?: boolean | null
          created_at?: string
          demo_audio_url?: string | null
          demo_photo_url?: string | null
          demo_video_url?: string | null
          description?: string
          end_date?: string
          frequency_period?: string | null
          frequency_quantity?: number | null
          id?: string
          is_public?: boolean | null
          owner_id?: string
          quantity_target?: number | null
          start_date?: string
          status?: string
          title?: string
          type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "challenge_types"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_balances: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_packs: {
        Row: {
          coin_amount: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_cents: number
          stripe_price_id: string | null
        }
        Insert: {
          coin_amount: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          stripe_price_id?: string | null
        }
        Update: {
          coin_amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          recipient_email: string | null
          recipient_user_id: string | null
          sender_id: string
          status: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          recipient_email?: string | null
          recipient_user_id?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          recipient_email?: string | null
          recipient_user_id?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          end_date_hours_before: number
          end_date_reminder: boolean
          frequency_reminder: boolean
          id: string
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date_hours_before?: number
          end_date_reminder?: boolean
          frequency_reminder?: boolean
          id?: string
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date_hours_before?: number
          end_date_reminder?: boolean
          frequency_reminder?: boolean
          id?: string
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      participations: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          is_active: boolean | null
          is_done: boolean | null
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_done?: boolean | null
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_done?: boolean | null
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string
          full_name: string | null
          id: string
          profile_photo_url: string | null
          updated_at: string
          use_avatar: boolean | null
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          display_name: string
          email: string
          full_name?: string | null
          id: string
          profile_photo_url?: string | null
          updated_at?: string
          use_avatar?: boolean | null
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string
          full_name?: string | null
          id?: string
          profile_photo_url?: string | null
          updated_at?: string
          use_avatar?: boolean | null
        }
        Relationships: []
      }
      proof_comments: {
        Row: {
          created_at: string
          id: string
          proof_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proof_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proof_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_comments_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: false
            referencedRelation: "proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_reactions: {
        Row: {
          created_at: string
          id: string
          proof_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proof_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proof_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_reactions_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: false
            referencedRelation: "proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proofs: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          image_url: string | null
          participation_id: string
          quantity_value: number | null
          text: string | null
          video_url: string | null
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          participation_id: string
          quantity_value?: number | null
          text?: string | null
          video_url?: string | null
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          participation_id?: string
          quantity_value?: number | null
          text?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proofs_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proofs_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          challenge_id: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      votes: {
        Row: {
          created_at: string
          id: string
          numeric_score: number | null
          proof_id: string
          vote_type: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          numeric_score?: number | null
          proof_id: string
          vote_type: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          numeric_score?: number | null
          proof_id?: string
          vote_type?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: false
            referencedRelation: "proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
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
      get_coin_balance: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
      spend_coins: {
        Args: {
          _amount: number
          _description: string
          _reference_id?: string
          _type: string
          _user_id: string
        }
        Returns: boolean
      }
      update_challenge_status: { Args: never; Returns: undefined }
      user_participates_in_challenge: {
        Args: { _challenge_id: string; _user_id: string }
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
