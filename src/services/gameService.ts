import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Helper type for Game since generated types might be slightly off due to recent migrations
type Game = {
  id: string;
  game_name: string;
  game_type: string;
  game_date: string;
  year: number;
  location?: string | null;
  is_official?: boolean | null;
  game_format?: string | null;
  created_at?: string;
  updated_at?: string;
};

type GamePlayer = {
  id: string;
  game_id: string;
  member_id: string;
  game1_score: number;
  game2_score: number;
  game3_score: number;
  game4_score: number;
  game5_score: number;
  handicap: number;
  total_score?: number;
  overall_score?: number;
  average_score?: number;
  created_at?: string;
  updated_at?: string;
};

export const gameService = {
  // Get all games
  async getAllGames() {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: false });
    
    if (error) throw error;
    return data as Game[];
  },

  // Get game by ID with players
  async getGameById(gameId: string) {
    const { data, error } = await supabase
      .from("games")
      .select(`
        *,
        game_players (
          *,
          members (
            id,
            username,
            full_name,
            avatar_url
          )
        )
      `)
      .eq("id", gameId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create new game
  async createGame(game: Partial<Game>) {
    // Calculate year from game_date if not provided
    if (!game.year && game.game_date) {
      game.year = new Date(game.game_date).getFullYear();
    }

    const { data, error } = await supabase
      .from("games")
      .insert(game as any)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update game
  async updateGame(gameId: string, updates: Partial<Game>) {
    // Calculate year from game_date if date changed
    if (updates.game_date) {
      updates.year = new Date(updates.game_date).getFullYear();
    }

    const { data, error } = await supabase
      .from("games")
      .update(updates as any)
      .eq("id", gameId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete game
  async deleteGame(gameId: string) {
    const { error } = await supabase
      .from("games")
      .delete()
      .eq("id", gameId);
    
    if (error) throw error;
  },

  // Add players to game
  async addPlayersToGame(gameId: string, memberIds: string[]) {
    const gamePlayers = memberIds.map((memberId) => ({
      game_id: gameId,
      member_id: memberId,
    }));

    const { error } = await supabase.from("game_players").insert(gamePlayers);

    if (error) throw error;
  },

  async addPlayersToGameWithFiveFive(
    gameId: string, 
    players: Array<{ member_id: string; is_fivefive: boolean }>
  ) {
    const gamePlayers = players.map((player) => ({
      game_id: gameId,
      member_id: player.member_id,
      is_fivefive: player.is_fivefive,
    }));

    const { error } = await supabase.from("game_players").insert(gamePlayers);

    if (error) throw error;
  },

  // Remove player from game
  async removePlayerFromGame(gameId: string, memberId: string) {
    const { error } = await supabase
      .from("game_players")
      .delete()
      .eq("game_id", gameId)
      .eq("member_id", memberId);
    
    if (error) throw error;
  },

  // Update player scores
  async updatePlayerScores(gamePlayerId: string, scores: Partial<GamePlayer>) {
    const { data, error } = await supabase
      .from("game_players")
      .update(scores)
      .eq("id", gamePlayerId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get all players in a game
  async getGamePlayers(gameId: string) {
    const { data, error } = await supabase
      .from("game_players")
      .select(`
        *,
        members (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("game_id", gameId)
      .order("overall_score", { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get member's game history
  async getMemberGameHistory(memberId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from("game_players")
      .select(`
        *,
        games (
          id,
          name,
          game_type,
          game_date
        )
      `)
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  // Get member's recent 3 games for handicap calculation
  async getMemberRecentGames(memberId: string) {
    const { data, error } = await supabase
      .from("game_players")
      .select(`
        *,
        games (
          id,
          name,
          game_type,
          game_date
        )
      `)
      .eq("member_id", memberId)
      .eq("games.game_type", "Blok Rasmi 10 PIN")
      .order("created_at", { ascending: false })
      .limit(3);
    
    if (error) throw error;
    return data;
  },
};