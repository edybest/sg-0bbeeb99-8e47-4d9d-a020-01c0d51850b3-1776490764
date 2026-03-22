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

class GameService {
  // List games with players
  async listGamesWithPlayers() {
    const { data, error } = await supabase
      .from("games")
      .select(`
        *,
        game_players (
          id,
          member_id,
          is_fivefive,
          members (
            full_name,
            username
          )
        )
      `)
      .order("game_date", { ascending: false });

    if (error) throw error;

    return (data || []).map((game) => {
      const players = Array.isArray(game.game_players)
        ? game.game_players.map((gp: any) => ({
            id: gp.id,
            member_id: gp.member_id,
            member_name: gp.members?.full_name || gp.members?.username || "Unknown",
            username: gp.members?.username,
            full_name: gp.members?.full_name,
            is_fivefive: gp.is_fivefive,
          }))
        : [];

      return {
        ...game,
        player_count: players.length,
        five_five_count: players.filter((p) => p.is_fivefive).length,
        players,
      };
    });
  }

  // Update player's Five-Five status
  async updatePlayerFiveFiveStatus(playerId: string, isFiveFive: boolean) {
    const { data, error } = await supabase
      .from("game_players")
      .update({ is_fivefive: isFiveFive })
      .eq("id", playerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete a player from a game by game_player ID
  async deletePlayerFromGameById(playerId: string): Promise<boolean> {
    const { error } = await supabase
      .from("game_players")
      .delete()
      .eq("id", playerId);

    if (error) throw error;
    return true;
  }

  /**
   * Get available members for a game (members not already in the game)
   */
  async getAvailableMembersForGame(gameId: string) {
    try {
      // Get all members already in this game
      const { data: existingPlayers, error: playersError } = await supabase
        .from("game_players")
        .select("member_id")
        .eq("game_id", gameId);

      if (playersError) throw playersError;

      const existingMemberIds = existingPlayers?.map(p => p.member_id) || [];

      // Get all active members
      const { data: allMembers, error: membersError } = await supabase
        .from("members")
        .select("id, username, full_name")
        .eq("is_active", true)
        .order("username");

      if (membersError) throw membersError;

      // Filter out members already in the game (client-side filtering)
      const availableMembers = (allMembers || []).filter(
        member => !existingMemberIds.includes(member.id)
      );

      return availableMembers as Array<{ id: string; username: string; full_name: string }>;
    } catch (error) {
      console.error("Error fetching available members:", error);
      throw error;
    }
  }

  /**
   * Add a player to an existing game
   */
  async addPlayerToGame(gameId: string, memberId: string, isFiveFive: boolean = false) {
    try {
      // Get member details
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("username, full_name")
        .eq("id", memberId)
        .single();

      if (memberError) throw memberError;

      // Insert player
      const { error: insertError } = await supabase
        .from("game_players")
        .insert({
          game_id: gameId,
          member_id: memberId,
          username: member.username,
          full_name: member.full_name,
          is_fivefive: isFiveFive,
        });

      if (insertError) throw insertError;
      return true;
    } catch (error) {
      console.error("Error adding player to game:", error);
      throw error;
    }
  }

  // Get all games
  async getAllGames() {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: false });
    
    if (error) throw error;
    return data as Game[];
  }

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
  }

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
  }

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
  }

  // Delete game
  async deleteGame(gameId: string) {
    const { error } = await supabase
      .from("games")
      .delete()
      .eq("id", gameId);
    
    if (error) throw error;
  }

  // Add players to game
  async addPlayersToGame(gameId: string, memberIds: string[]) {
    const gamePlayers = memberIds.map((memberId) => ({
      game_id: gameId,
      member_id: memberId,
    }));

    const { error } = await supabase.from("game_players").insert(gamePlayers);

    if (error) throw error;
  }

  async addPlayersToGameWithFiveFive(
    gameId: string, 
    players: Array<{ member_id: string; is_fivefive: boolean }>
  ) {
    // First, get existing players in this game
    const { data: existingPlayers, error: fetchError } = await supabase
      .from("game_players")
      .select("member_id")
      .eq("game_id", gameId);

    if (fetchError) throw fetchError;

    // Get list of existing member IDs
    const existingMemberIds = new Set(
      existingPlayers?.map((p) => p.member_id) || []
    );

    // Filter out players that already exist in this game
    const newPlayers = players.filter(
      (player) => !existingMemberIds.has(player.member_id)
    );

    // If no new players to add, return early
    if (newPlayers.length === 0) {
      return {
        added: 0,
        skipped: players.length,
        message: "Semua pemain yang dipilih sudah berada dalam game ini",
      };
    }

    // Prepare game players data for new players only
    const gamePlayers = newPlayers.map((player) => ({
      game_id: gameId,
      member_id: player.member_id,
      is_fivefive: player.is_fivefive,
    }));

    // Insert new players
    const { error } = await supabase.from("game_players").insert(gamePlayers);

    if (error) throw error;

    return {
      added: newPlayers.length,
      skipped: players.length - newPlayers.length,
      message:
        newPlayers.length === players.length
          ? `${newPlayers.length} pemain berjaya ditambah`
          : `${newPlayers.length} pemain ditambah, ${players.length - newPlayers.length} pemain diabaikan (sudah wujud)`,
    };
  }

  // Remove player from game
  async removePlayerFromGame(gameId: string, memberId: string) {
    const { error } = await supabase
      .from("game_players")
      .delete()
      .eq("game_id", gameId)
      .eq("member_id", memberId);
    
    if (error) throw error;
  }

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
  }

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
  }

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
  }

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
  }
}

export const gameService = new GameService();