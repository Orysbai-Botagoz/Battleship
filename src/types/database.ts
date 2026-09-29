import type { GameState } from "@/types/game";

export type PersistedGameStatus = "in_progress" | "won" | "lost";

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface UserStats {
  user_id: string;
  wins: number;
  losses: number;
  games_played: number;
  current_streak: number;
  best_streak: number;
}

export interface PersistedGame {
  id: string;
  user_id: string;
  status: PersistedGameStatus;
  difficulty: GameState["difficulty"];
  player_board: GameState["playerBoard"];
  ai_board: GameState["aiBoard"];
  history: GameState["moveHistory"];
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserProfile;
        Insert: Omit<UserProfile, "created_at"> & { created_at?: string };
        Update: Partial<UserProfile>;
      };
      user_stats: {
        Row: UserStats;
        Insert: UserStats;
        Update: Partial<UserStats>;
      };
      games: {
        Row: PersistedGame;
        Insert: Omit<PersistedGame, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PersistedGame>;
      };
    };
  };
}