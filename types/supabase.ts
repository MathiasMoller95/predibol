export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MatchPhase = "group" | "round_of_16" | "quarter" | "semi" | "final";
export type MatchStatus = "scheduled" | "live" | "finished";
export type TiebreakerRule = "most_exact_scores" | "most_correct_results" | "earliest_submission";

export type Database = {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string;
          name: string;
          slug: string;
          primary_color: string | null;
          secondary_color: string | null;
          logo_url: string | null;
          admin_id: string;
          points_correct_result: number;
          points_correct_difference: number;
          points_exact_score: number;
          pre_tournament_bonus_champion: number;
          pre_tournament_bonus_runner_up: number;
          pre_tournament_bonus_third_place: number;
          pre_tournament_bonus_top_scorer: number;
          pre_tournament_bonus_best_player: number;
          pre_tournament_bonus_best_goalkeeper: number;
          tiebreaker_rule: TiebreakerRule;
          is_public: boolean;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          logo_url?: string | null;
          admin_id: string;
          points_correct_result?: number;
          points_correct_difference?: number;
          points_exact_score?: number;
          pre_tournament_bonus_champion?: number;
          pre_tournament_bonus_runner_up?: number;
          pre_tournament_bonus_third_place?: number;
          pre_tournament_bonus_top_scorer?: number;
          pre_tournament_bonus_best_player?: number;
          pre_tournament_bonus_best_goalkeeper?: number;
          tiebreaker_rule?: TiebreakerRule;
          is_public?: boolean;
          description?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          logo_url?: string | null;
          admin_id?: string;
          points_correct_result?: number;
          points_correct_difference?: number;
          points_exact_score?: number;
          pre_tournament_bonus_champion?: number;
          pre_tournament_bonus_runner_up?: number;
          pre_tournament_bonus_third_place?: number;
          pre_tournament_bonus_top_scorer?: number;
          pre_tournament_bonus_best_player?: number;
          pre_tournament_bonus_best_goalkeeper?: number;
          tiebreaker_rule?: TiebreakerRule;
          is_public?: boolean;
          description?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          display_name: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          display_name: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          display_name?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          phase: MatchPhase;
          home_team: string;
          away_team: string;
          match_time: string;
          home_score: number | null;
          away_score: number | null;
          status: MatchStatus;
          locked_at: string | null;
          home_win_odds: number | null;
          draw_odds: number | null;
          away_win_odds: number | null;
          ai_home_score: number | null;
          ai_away_score: number | null;
          odds_updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          phase: MatchPhase;
          home_team: string;
          away_team: string;
          match_time: string;
          home_score?: number | null;
          away_score?: number | null;
          status?: MatchStatus;
          locked_at?: string | null;
          home_win_odds?: number | null;
          draw_odds?: number | null;
          away_win_odds?: number | null;
          ai_home_score?: number | null;
          ai_away_score?: number | null;
          odds_updated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          phase?: MatchPhase;
          home_team?: string;
          away_team?: string;
          match_time?: string;
          home_score?: number | null;
          away_score?: number | null;
          status?: MatchStatus;
          locked_at?: string | null;
          home_win_odds?: number | null;
          draw_odds?: number | null;
          away_win_odds?: number | null;
          ai_home_score?: number | null;
          ai_away_score?: number | null;
          odds_updated_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          group_id: string;
          match_id: string;
          predicted_home: number;
          predicted_away: number;
          predicted_winner: "home" | "away" | "draw" | null;
          points_earned: number;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          group_id: string;
          match_id: string;
          predicted_home: number;
          predicted_away: number;
          predicted_winner?: "home" | "away" | "draw" | null;
          points_earned?: number;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          group_id?: string;
          match_id?: string;
          predicted_home?: number;
          predicted_away?: number;
          predicted_winner?: "home" | "away" | "draw" | null;
          points_earned?: number;
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pre_tournament_picks: {
        Row: {
          id: string;
          user_id: string;
          group_id: string;
          champion: string | null;
          runner_up: string | null;
          third_place: string | null;
          top_scorer: string | null;
          best_player: string | null;
          best_goalkeeper: string | null;
          locked: boolean;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          group_id: string;
          champion?: string | null;
          runner_up?: string | null;
          third_place?: string | null;
          top_scorer?: string | null;
          best_player?: string | null;
          best_goalkeeper?: string | null;
          locked?: boolean;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          group_id?: string;
          champion?: string | null;
          runner_up?: string | null;
          third_place?: string | null;
          top_scorer?: string | null;
          best_player?: string | null;
          best_goalkeeper?: string | null;
          locked?: boolean;
          submitted_at?: string;
        };
        Relationships: [];
      };
      leaderboard: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          total_points: number;
          predictions_made: number;
          exact_scores: number;
          correct_results: number;
          rank: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          total_points?: number;
          predictions_made?: number;
          exact_scores?: number;
          correct_results?: number;
          rank?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          total_points?: number;
          predictions_made?: number;
          exact_scores?: number;
          correct_results?: number;
          rank?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_group_public_by_slug: {
        Args: { _slug: string };
        Returns: {
          id: string;
          name: string;
          slug: string;
          primary_color: string | null;
          secondary_color: string | null;
          admin_id: string;
          created_at: string;
        }[];
      };
    };
    Enums: {
      match_phase: MatchPhase;
      match_status: MatchStatus;
      tiebreaker_rule: TiebreakerRule;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
