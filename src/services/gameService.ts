import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Game = Database["public"]["Tables"]["games"]["Row"];
type GameInsert = Database["public"]["Tables"]["games"]["Insert"];
type GameUpdate = Database["public"]["Tables"]["games"]["Update"];
type GamePlayer = Database["public"]["Tables"]["game_players"]["Row"];
type GamePlayerInsert = Database["public"]["Tables"]["game_players"]["Insert"];
type GamePlayerUpdate = Database["public"]["Tables"]["game_players"]["Update"];

export const gameService = {
  async getAllGames() {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getGameById(id: string) {
    const { data, error } = await supabase
      .from("games")
      .select("*, game_players(*, members(*))")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createGame(game: GameInsert) {
    const { data, error } = await supabase
      .from("games")
      .insert(game)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateGame(id: string, updates: GameUpdate) {
    const { data, error } = await supabase
      .from("games")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteGame(id: string) {
    const { error } = await supabase
      .from("games")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  async addPlayerToGame(gamePlayer: GamePlayerInsert) {
    const { data, error } = await supabase
      .from("game_players")
      .insert(gamePlayer)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updatePlayerScore(id: string, updates: GamePlayerUpdate) {
    const { data, error } = await supabase
      .from("game_players")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async removePlayerFromGame(id: string) {
    const { error } = await supabase
      .from("game_players")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  async getGamePlayers(gameId: string) {
    const { data, error } = await supabase
      .from("game_players")
      .select("*, members(*)")
      .eq("game_id", gameId)
      .order("overall_score", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getMemberGames(memberId: string, limit?: number) {
    let query = supabase
      .from("game_players")
      .select("*, games(*)")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  },

  async getLeaderboard(gameId?: string) {
    let query = supabase
      .from("game_players")
      .select("*, members(*), games(*)");
    
    if (gameId) {
      query = query.eq("game_id", gameId);
    }
    
    query = query.order("overall_score", { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }
};