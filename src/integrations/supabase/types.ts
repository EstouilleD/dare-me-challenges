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
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon: string
          id?: string
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          page_url: string | null
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          page_url?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          page_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
            foreignKeyName: "boosts_target_challenge_id_fkey"
            columns: ["target_challenge_id"]
            isOneToOne: false
            referencedRelation: "v_top_challenges"
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
      categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      certificate_purchases: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_purchases_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_purchases_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "v_top_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_posts: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          text: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          text: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_posts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_posts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "v_top_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_shares: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          platform: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          platform?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          platform?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_shares_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_shares_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "v_top_challenges"
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
          category_id: string | null
          community_id: string | null
          community_only: boolean
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
          is_surprise: boolean
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
          category_id?: string | null
          community_id?: string | null
          community_only?: boolean
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
          is_surprise?: boolean
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
          category_id?: string | null
          community_id?: string | null
          community_only?: boolean
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
          is_surprise?: boolean
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
            foreignKeyName: "challenges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "v_top_communities"
            referencedColumns: ["id"]
          },
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
      communities: {
        Row: {
          accent_color: string | null
          banner_url: string | null
          category: string
          created_at: string
          description: string
          id: string
          is_verified: boolean
          logo_url: string | null
          member_count: number
          name: string
          owner_id: string
          pinned_post_id: string | null
          requires_approval: boolean
          reward_description: string | null
          rules: string | null
          slug: string
          sponsor_cta_text: string | null
          sponsor_cta_url: string | null
          type: Database["public"]["Enums"]["community_type"]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          accent_color?: string | null
          banner_url?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_verified?: boolean
          logo_url?: string | null
          member_count?: number
          name: string
          owner_id: string
          pinned_post_id?: string | null
          requires_approval?: boolean
          reward_description?: string | null
          rules?: string | null
          slug: string
          sponsor_cta_text?: string | null
          sponsor_cta_url?: string | null
          type?: Database["public"]["Enums"]["community_type"]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          accent_color?: string | null
          banner_url?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_verified?: boolean
          logo_url?: string | null
          member_count?: number
          name?: string
          owner_id?: string
          pinned_post_id?: string | null
          requires_approval?: boolean
          reward_description?: string | null
          rules?: string | null
          slug?: string
          sponsor_cta_text?: string | null
          sponsor_cta_url?: string | null
          type?: Database["public"]["Enums"]["community_type"]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_pinned_post_id_fkey"
            columns: ["pinned_post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_invitations: {
        Row: {
          community_id: string
          created_at: string
          id: string
          invitee_email: string | null
          invitee_user_id: string | null
          inviter_id: string
          status: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          invitee_email?: string | null
          invitee_user_id?: string | null
          inviter_id: string
          status?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          invitee_email?: string | null
          invitee_user_id?: string | null
          inviter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_invitations_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invitations_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "v_top_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_invite_links: {
        Row: {
          code: string
          community_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          uses: number
        }
        Insert: {
          code?: string
          community_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          uses?: number
        }
        Update: {
          code?: string
          community_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_invite_links_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invite_links_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "v_top_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "v_top_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          community_id: string
          created_at: string
          id: string
          text: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          text: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "v_top_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_users: {
        Row: {
          account_status: string
          created_at: string | null
          deleted_at: string
          deleted_by: string | null
          deletion_reason: string | null
          display_name: string
          email: string
          full_name: string | null
          id: string
          original_user_id: string
        }
        Insert: {
          account_status?: string
          created_at?: string | null
          deleted_at?: string
          deleted_by?: string | null
          deletion_reason?: string | null
          display_name: string
          email: string
          full_name?: string | null
          id?: string
          original_user_id: string
        }
        Update: {
          account_status?: string
          created_at?: string | null
          deleted_at?: string
          deleted_by?: string | null
          deletion_reason?: string | null
          display_name?: string
          email?: string
          full_name?: string | null
          id?: string
          original_user_id?: string
        }
        Relationships: []
      }
      fair_play_flags: {
        Row: {
          challenge_id: string | null
          created_at: string
          details: Json | null
          flag_type: string
          id: string
          is_resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          details?: Json | null
          flag_type: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id: string
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          details?: Json | null
          flag_type?: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fair_play_flags_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fair_play_flags_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "v_top_challenges"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "invitations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "v_top_challenges"
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
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
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
            foreignKeyName: "participations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "v_top_challenges"
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
            foreignKeyName: "proofs_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "v_top_challenges"
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
          {
            foreignKeyName: "reports_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "v_top_challenges"
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
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          category_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_referrals: {
        Row: {
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
          reward_granted: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
          reward_granted?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
          reward_granted?: boolean
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
      v_active_users: {
        Row: {
          dau: number | null
          mau: number | null
          wau: number | null
        }
        Relationships: []
      }
      v_challenge_metrics: {
        Row: {
          avg_participants: number | null
          completion_rate: number | null
          created_7d: number | null
          joins_7d: number | null
          proofs_7d: number | null
          total_created: number | null
          total_joins: number | null
          total_proofs: number | null
          total_votes: number | null
          votes_7d: number | null
        }
        Relationships: []
      }
      v_community_metrics: {
        Row: {
          active_community_challenges: number | null
          brand_communities: number | null
          new_members_7d: number | null
          total_communities: number | null
        }
        Relationships: []
      }
      v_engagement_trends: {
        Row: {
          boosters_used: number | null
          challenges_created: number | null
          challenges_joined: number | null
          day: string | null
          proofs_submitted: number | null
          votes_submitted: number | null
        }
        Relationships: []
      }
      v_monetization: {
        Row: {
          active_premium: number | null
          boosts_7d: number | null
          certificates_7d: number | null
          total_boost_coins: number | null
          total_boosts: number | null
          total_certificates: number | null
          total_users: number | null
        }
        Relationships: []
      }
      v_retention: {
        Row: {
          d1_retention: number | null
          d30_retention: number | null
          d7_retention: number | null
        }
        Relationships: []
      }
      v_top_challenges: {
        Row: {
          id: string | null
          participant_count: number | null
          proof_count: number | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
      v_top_communities: {
        Row: {
          challenge_count: number | null
          id: string | null
          member_count: number | null
          name: string | null
          new_members_7d: number | null
          slug: string | null
          type: Database["public"]["Enums"]["community_type"] | null
        }
        Relationships: []
      }
      v_user_growth: {
        Row: {
          day: string | null
          signups: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_award_badges: { Args: { _user_id: string }; Returns: undefined }
      get_coin_balance: { Args: { _user_id: string }; Returns: number }
      get_community_leaderboard: {
        Args: { _community_id: string }
        Returns: {
          avatar_url: string
          challenges_completed: number
          challenges_won: number
          display_name: string
          honor_votes: number
          profile_photo_url: string
          proofs_submitted: number
          total_points: number
          use_avatar: boolean
          user_id: string
        }[]
      }
      get_community_role: {
        Args: { _community_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["community_role"]
      }
      get_recommended_challenges: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          category_icon: string
          category_name: string
          description: string
          end_date: string
          id: string
          owner_avatar_url: string
          owner_name: string
          owner_photo_url: string
          owner_use_avatar: boolean
          participant_count: number
          relevance_score: number
          status: string
          title: string
          type_icon: string
          type_name: string
        }[]
      }
      get_trending_challenges: {
        Args: { _limit?: number }
        Returns: {
          category_icon: string
          category_name: string
          community_name: string
          community_slug: string
          description: string
          end_date: string
          id: string
          is_public: boolean
          owner_avatar_url: string
          owner_name: string
          owner_photo_url: string
          owner_use_avatar: boolean
          participant_count: number
          start_date: string
          status: string
          title: string
          trending_score: number
          type_icon: string
          type_name: string
        }[]
      }
      get_trending_communities: {
        Args: { _limit?: number }
        Returns: {
          category: string
          description: string
          id: string
          is_verified: boolean
          logo_url: string
          member_count: number
          name: string
          slug: string
          trending_score: number
          type: Database["public"]["Enums"]["community_type"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_community_admin: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_community_member: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_community_moderator: {
        Args: { _community_id: string; _user_id: string }
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
      community_role: "owner" | "admin" | "moderator" | "member"
      community_type: "public" | "private" | "brand"
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
      community_role: ["owner", "admin", "moderator", "member"],
      community_type: ["public", "private", "brand"],
    },
  },
} as const
