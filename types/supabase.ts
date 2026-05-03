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
      api_football_fixtures: {
        Row: {
          api_fixture_id: number
          last_synced_at: string | null
          match_id: string
        }
        Insert: {
          api_fixture_id: number
          last_synced_at?: string | null
          match_id: string
        }
        Update: {
          api_fixture_id?: number
          last_synced_at?: string | null
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_football_fixtures_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      api_football_sync_state: {
        Row: {
          api_calls_remaining: number | null
          id: number
          last_error: string | null
          last_ok_at: string | null
          last_sync_at: string | null
          next_planned_poll_seconds: number | null
          updated_at: string
        }
        Insert: {
          api_calls_remaining?: number | null
          id?: number
          last_error?: string | null
          last_ok_at?: string | null
          last_sync_at?: string | null
          next_planned_poll_seconds?: number | null
          updated_at?: string
        }
        Update: {
          api_calls_remaining?: number | null
          id?: number
          last_error?: string | null
          last_ok_at?: string | null
          last_sync_at?: string | null
          next_planned_poll_seconds?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      api_football_teams: {
        Row: {
          api_team_id: number
          api_team_name: string | null
          team_name: string
        }
        Insert: {
          api_team_id: number
          api_team_name?: string | null
          team_name: string
        }
        Update: {
          api_team_id?: number
          api_team_name?: string | null
          team_name?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          display_name: string
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          display_name: string
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          display_name?: string
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          access_code: string | null
          access_mode: string
          admin_id: string
          colors: Json | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          logo_url: string | null
          name: string
          points_correct_difference: number
          points_correct_result: number
          points_exact_score: number
          powers_double_down: number
          powers_shield: number
          powers_spy: number
          pre_tournament_bonus_best_goalkeeper: number
          pre_tournament_bonus_best_player: number
          pre_tournament_bonus_champion: number
          pre_tournament_bonus_runner_up: number
          pre_tournament_bonus_third_place: number
          pre_tournament_bonus_top_scorer: number
          primary_color: string | null
          secondary_color: string | null
          slug: string
          tiebreaker_rule: Database["public"]["Enums"]["tiebreaker_rule"]
          tier: string
          member_limit: number
          payment_status: string
          stripe_session_id: string | null
          stripe_payment_intent_id: string | null
          paid_at: string | null
          amount_paid_cents: number | null
          coupon_code: string | null
        }
        Insert: {
          access_code?: string | null
          access_mode?: string
          admin_id: string
          colors?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          logo_url?: string | null
          name: string
          points_correct_difference?: number
          points_correct_result?: number
          points_exact_score?: number
          powers_double_down?: number
          powers_shield?: number
          powers_spy?: number
          pre_tournament_bonus_best_goalkeeper?: number
          pre_tournament_bonus_best_player?: number
          pre_tournament_bonus_champion?: number
          pre_tournament_bonus_runner_up?: number
          pre_tournament_bonus_third_place?: number
          pre_tournament_bonus_top_scorer?: number
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          tiebreaker_rule?: Database["public"]["Enums"]["tiebreaker_rule"]
          tier?: string
          member_limit?: number
          payment_status?: string
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          paid_at?: string | null
          amount_paid_cents?: number | null
          coupon_code?: string | null
        }
        Update: {
          access_code?: string | null
          access_mode?: string
          admin_id?: string
          colors?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          logo_url?: string | null
          name?: string
          points_correct_difference?: number
          points_correct_result?: number
          points_exact_score?: number
          powers_double_down?: number
          powers_shield?: number
          powers_spy?: number
          pre_tournament_bonus_best_goalkeeper?: number
          pre_tournament_bonus_best_player?: number
          pre_tournament_bonus_champion?: number
          pre_tournament_bonus_runner_up?: number
          pre_tournament_bonus_third_place?: number
          pre_tournament_bonus_top_scorer?: number
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          tiebreaker_rule?: Database["public"]["Enums"]["tiebreaker_rule"]
          tier?: string
          member_limit?: number
          payment_status?: string
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          paid_at?: string | null
          amount_paid_cents?: number | null
          coupon_code?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          id: string
          coupon_id: string | null
          group_id: string | null
          user_id: string | null
          discount_cents: number
          final_price_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          coupon_id?: string | null
          group_id?: string | null
          user_id?: string | null
          discount_cents: number
          final_price_cents: number
          created_at?: string
        }
        Update: {
          id?: string
          coupon_id?: string | null
          group_id?: string | null
          user_id?: string | null
          discount_cents?: number
          final_price_cents?: number
          created_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          id: string
          code: string
          type: string
          value: number
          max_uses: number | null
          times_used: number
          applicable_tiers: string[]
          expires_at: string | null
          created_by: string | null
          created_at: string
          active: boolean
        }
        Insert: {
          id?: string
          code: string
          type: string
          value?: number
          max_uses?: number | null
          times_used?: number
          applicable_tiers?: string[]
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
          active?: boolean
        }
        Update: {
          id?: string
          code?: string
          type?: string
          value?: number
          max_uses?: number | null
          times_used?: number
          applicable_tiers?: string[]
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
          active?: boolean
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string
        }
        Insert: {
          id: string
          processed_at?: string
        }
        Update: {
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          correct_results: number
          exact_scores: number
          group_id: string
          id: string
          predictions_made: number
          previous_rank: number | null
          rank: number | null
          total_points: number
          updated_at: string
          user_id: string
          virtual_bets_lost: number | null
          virtual_bets_won: number | null
          virtual_pnl: number | null
        }
        Insert: {
          correct_results?: number
          exact_scores?: number
          group_id: string
          id?: string
          predictions_made?: number
          previous_rank?: number | null
          rank?: number | null
          total_points?: number
          updated_at?: string
          user_id: string
          virtual_bets_lost?: number | null
          virtual_bets_won?: number | null
          virtual_pnl?: number | null
        }
        Update: {
          correct_results?: number
          exact_scores?: number
          group_id?: string
          id?: string
          predictions_made?: number
          previous_rank?: number | null
          rank?: number | null
          total_points?: number
          updated_at?: string
          user_id?: string
          virtual_bets_lost?: number | null
          virtual_bets_won?: number | null
          virtual_pnl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          advancing_team: string | null
          ai_away_score: number | null
          ai_home_score: number | null
          api_fixture_id: number | null
          away_score: number | null
          away_source: string | null
          away_team: string
          away_win_odds: number | null
          created_at: string
          draw_odds: number | null
          home_score: number | null
          home_source: string | null
          home_team: string
          home_win_odds: number | null
          id: string
          knockout_label: string | null
          locked_at: string | null
          manual_override: boolean
          match_minute: string | null
          match_time: string
          needs_scoring: boolean
          odds_updated_at: string | null
          phase: Database["public"]["Enums"]["match_phase"]
          source: string
          status: Database["public"]["Enums"]["match_status"]
        }
        Insert: {
          advancing_team?: string | null
          ai_away_score?: number | null
          ai_home_score?: number | null
          api_fixture_id?: number | null
          away_score?: number | null
          away_source?: string | null
          away_team: string
          away_win_odds?: number | null
          created_at?: string
          draw_odds?: number | null
          home_score?: number | null
          home_source?: string | null
          home_team: string
          home_win_odds?: number | null
          id?: string
          knockout_label?: string | null
          locked_at?: string | null
          manual_override?: boolean
          match_minute?: string | null
          match_time: string
          needs_scoring?: boolean
          odds_updated_at?: string | null
          phase: Database["public"]["Enums"]["match_phase"]
          source?: string
          status?: Database["public"]["Enums"]["match_status"]
        }
        Update: {
          advancing_team?: string | null
          ai_away_score?: number | null
          ai_home_score?: number | null
          api_fixture_id?: number | null
          away_score?: number | null
          away_source?: string | null
          away_team?: string
          away_win_odds?: number | null
          created_at?: string
          draw_odds?: number | null
          home_score?: number | null
          home_source?: string | null
          home_team?: string
          home_win_odds?: number | null
          id?: string
          knockout_label?: string | null
          locked_at?: string | null
          manual_override?: boolean
          match_minute?: string | null
          match_time?: string
          needs_scoring?: boolean
          odds_updated_at?: string | null
          phase?: Database["public"]["Enums"]["match_phase"]
          source?: string
          status?: Database["public"]["Enums"]["match_status"]
        }
        Relationships: []
      }
      power_usage: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          match_id: string
          power_type: string
          target_user_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          match_id: string
          power_type: string
          target_user_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          match_id?: string
          power_type?: string
          target_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "power_usage_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "power_usage_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "power_usage_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "power_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_tournament_picks: {
        Row: {
          best_goalkeeper: string | null
          best_player: string | null
          champion: string | null
          group_id: string
          id: string
          locked: boolean
          runner_up: string | null
          submitted_at: string
          third_place: string | null
          top_scorer: string | null
          user_id: string
        }
        Insert: {
          best_goalkeeper?: string | null
          best_player?: string | null
          champion?: string | null
          group_id: string
          id?: string
          locked?: boolean
          runner_up?: string | null
          submitted_at?: string
          third_place?: string | null
          top_scorer?: string | null
          user_id: string
        }
        Update: {
          best_goalkeeper?: string | null
          best_player?: string | null
          champion?: string | null
          group_id?: string
          id?: string
          locked?: boolean
          runner_up?: string | null
          submitted_at?: string
          third_place?: string | null
          top_scorer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_tournament_picks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          group_id: string
          id: string
          match_id: string
          points_earned: number
          predicted_advancing: string | null
          predicted_away: number
          predicted_home: number
          predicted_winner: string | null
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          match_id: string
          points_earned?: number
          predicted_advancing?: string | null
          predicted_away: number
          predicted_home: number
          predicted_winner?: string | null
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          match_id?: string
          points_earned?: number
          predicted_advancing?: string | null
          predicted_away?: number
          predicted_home?: number
          predicted_winner?: string | null
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string
          email_weekly_recap: boolean
          gdpr_consent_at: string | null
          id: string
          onboarding_completed_at: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string
          email_weekly_recap?: boolean
          gdpr_consent_at?: string | null
          id: string
          onboarding_completed_at?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          email_weekly_recap?: boolean
          gdpr_consent_at?: string | null
          id?: string
          onboarding_completed_at?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sticker_album: {
        Row: {
          created_at: string | null
          earned_from_match_id: string | null
          group_id: string
          id: string
          team: string
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          earned_from_match_id?: string | null
          group_id: string
          id?: string
          team: string
          tier: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          earned_from_match_id?: string | null
          group_id?: string
          id?: string
          team?: string
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sticker_album_earned_from_match_id_fkey"
            columns: ["earned_from_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticker_album_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticker_album_user_id_fkey"
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
      admin_group_access: {
        Args: { p_group_id: string }
        Returns: {
          access_code: string
          access_mode: string
        }[]
      }
      delete_group: { Args: { p_group_id: string }; Returns: undefined }
      get_group_public_by_slug: {
        Args: { _slug: string }
        Returns: {
          admin_id: string
          created_at: string
          id: string
          logo_url: string
          name: string
          primary_color: string
          secondary_color: string
          slug: string
        }[]
      }
      get_public_groups_with_counts: {
        Args: never
        Returns: {
          access_mode: string
          admin_id: string
          colors: Json
          description: string
          id: string
          logo_url: string
          member_count: number
          name: string
          primary_color: string
          slug: string
        }[]
      }
      invoke_send_prediction_reminders_cron: { Args: never; Returns: undefined }
      invoke_sync_matches_cron: { Args: never; Returns: undefined }
      join_group_if_room: {
        Args: { p_display_name: string; p_group_id: string }
        Returns: Json
      }
      is_group_admin: { Args: { _group_id: string }; Returns: boolean }
      is_group_member: { Args: { _group_id: string }; Returns: boolean }
      resolve_knockout_match: {
        Args: { p_away_team: string; p_home_team: string; p_match_id: string }
        Returns: undefined
      }
      snapshot_leaderboard_previous_rank: {
        Args: { gid: string }
        Returns: undefined
      }
      spy_prediction: {
        Args: {
          p_group_id: string
          p_match_id: string
          p_spy_user_id: string
          p_target_user_id: string
        }
        Returns: {
          is_shielded: boolean
          predicted_away: number
          predicted_home: number
        }[]
      }
      super_admin_metrics: { Args: { p_user_id: string }; Returns: Json }
      verify_group_access_code: {
        Args: { entered_code: string; group_slug: string }
        Returns: boolean
      }
    }
    Enums: {
      match_phase:
        | "group"
        | "round_of_16"
        | "quarter"
        | "semi"
        | "final"
        | "quarter_final"
        | "semi_final"
        | "third_place"
      match_status: "scheduled" | "live" | "finished"
      tiebreaker_rule:
        | "most_exact_scores"
        | "most_correct_results"
        | "earliest_submission"
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
      match_phase: [
        "group",
        "round_of_16",
        "quarter",
        "semi",
        "final",
        "quarter_final",
        "semi_final",
        "third_place",
      ],
      match_status: ["scheduled", "live", "finished"],
      tiebreaker_rule: [
        "most_exact_scores",
        "most_correct_results",
        "earliest_submission",
      ],
    },
  },
} as const
