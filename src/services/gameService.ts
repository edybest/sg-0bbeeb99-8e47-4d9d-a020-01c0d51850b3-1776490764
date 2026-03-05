import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Game = Database["public"]["Tables"]["games"]["Row"];
type GameInsert = Database["public"]["Tables"]["games"]["Insert"];
type GameUpdate = Database["public"]["Tables"]["games"]["Update"];
type GamePlayer = Database["public"]["Tables"]["game_players"]["Row"];
type GamePlayerInsert = Database["public"]["Tables"]["game_players"]["Insert"];
type GamePlayerUpdate = Database["public"]["Tables"]["game_players"]["Update"];

export const gameService = {
  // Get all games
  async getAllGames() {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: false });
    
    if (error) throw error;
    return data;
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
  async createGame(game: GameInsert) {
    const { data, error } = await supabase
      .from("games")
      .insert(game)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update game
  async updateGame(gameId: string, updates: GameUpdate) {
    const { data, error } = await supabase
      .from("games")
      .update(updates)
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
    const players = memberIds.map(memberId => ({
      game_id: gameId,
      member_id: memberId,
    }));

    const { data, error } = await supabase
      .from("game_players")
      .insert(players)
      .select();
    
    if (error) throw error;
    return data;
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
  async updatePlayerScores(gamePlayerId: string, scores: GamePlayerUpdate) {
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