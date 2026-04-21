import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TrioRecord = Database["public"]["Tables"]["trio_records"]["Row"];
type TrioRecordInsert = Database["public"]["Tables"]["trio_records"]["Insert"];
type TrioRecordUpdate = Database["public"]["Tables"]["trio_records"]["Update"];

export type TrioPlayer = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  handicap?: number | null;
};

export type TrioRecordWithPlayers = {
  id: string;
  game_id: string;
  player1_id: string;
  player2_id: string;
  player3_id: string;
  player1: TrioPlayer | null;
  player2: TrioPlayer | null;
  player3: TrioPlayer | null;
  created_at: string;
  is_drawn: boolean;
  drawn_at: string | null;
};

/**
 * Get trio record for a specific game
 */
export async function getTrioRecordByGame(gameId: string): Promise<TrioRecordWithPlayers | null> {
  try {
    const { data, error } = await supabase
      .from("trio_records")
      .select(`
        *,
        player1:members!player1_id(id, username, full_name, avatar_url, handicap),
        player2:members!player2_id(id, username, full_name, avatar_url, handicap),
        player3:members!player3_id(id, username, full_name, avatar_url, handicap)
      `)
      .eq("game_id", gameId)
      .maybeSingle();

    if (error) throw error;
    return data as TrioRecordWithPlayers | null;
  } catch (error) {
    console.error("Error fetching trio record:", error);
    throw error;
  }
}

/**
 * Get ALL trio records for a specific game (supports multiple trios)
 */
export async function getAllTrioRecordsByGame(gameId: string): Promise<TrioRecordWithPlayers[]> {
  const { data, error } = await supabase
    .from("trio_records")
    .select(`
      id,
      game_id,
      player1_id,
      player2_id,
      player3_id,
      player1_score,
      player2_score,
      player3_score,
      player1_handicap,
      player2_handicap,
      player3_handicap,
      total_score,
      include_handicap,
      is_drawn,
      drawn_at,
      created_at,
      player1:members!trio_records_player1_id_fkey(id, username, full_name, avatar_url),
      player2:members!trio_records_player2_id_fkey(id, username, full_name, avatar_url),
      player3:members!trio_records_player3_id_fkey(id, username, full_name, avatar_url)
    `)
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching trio records:", error);
    throw error;
  }

  return (data || []) as TrioRecordWithPlayers[];
}

/**
 * Delete a trio record
 */
export async function deleteTrioRecord(trioId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("trio_records")
      .delete()
      .eq("id", trioId);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting trio record:", error);
    throw error;
  }
}

/**
 * Create or update trio record for a game
 */
export async function upsertTrioRecord(data: TrioRecordInsert): Promise<TrioRecord> {
  try {
    console.log("Creating new trio record with data:", data);

    // Always create new record (support multiple trios per game)
    const { data: created, error: insertError } = await supabase
      .from("trio_records")
      .insert(data)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating trio record:", {
        error: insertError,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });

      // Provide user-friendly error messages
      if (insertError.code === "23503") {
        throw new Error("Pemain atau game tidak dijumpai");
      } else if (insertError.code === "42501") {
        throw new Error("Anda tidak mempunyai kebenaran untuk mencipta rekod trio. Sila pastikan anda log masuk sebagai admin.");
      }

      throw new Error(`Gagal mencipta rekod: ${insertError.message}`);
    }

    console.log("Trio record created successfully:", created);
    return created;
  } catch (error: any) {
    console.error("upsertTrioRecord error:", error);
    throw error;
  }
}

/**
 * Get players for a specific game (from game_players table)
 */
export async function getGamePlayers(gameId: string): Promise<TrioPlayer[]> {
  const { data, error } = await supabase
    .from("game_players")
    .select(`
      member:members!game_players_member_id_fkey(
        id,
        username,
        full_name,
        avatar_url,
        handicap
      )
    `)
    .eq("game_id", gameId);

  if (error) {
    console.error("Error fetching game players:", error);
    throw error;
  }

  return data?.map((item: any) => item.member).filter(Boolean) || [];
}

/**
 * Get all trio-enabled games
 */
export async function getTrioEnabledGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("trio_enabled", true)
    .order("game_date", { ascending: false });

  if (error) {
    console.error("Error fetching trio games:", error);
    throw error;
  }

  return data || [];
}

/**
 * Update trio player scores
 */
export async function updateTrioScores(
  gameId: string,
  scores: {
    player1_score?: number;
    player2_score?: number;
    player3_score?: number;
    player1_handicap?: number;
    player2_handicap?: number;
    player3_handicap?: number;
  }
): Promise<TrioRecord> {
  const { data: existing } = await supabase
    .from("trio_records")
    .select("id, player1_handicap, player2_handicap, player3_handicap")
    .eq("game_id", gameId)
    .single();

  if (!existing) {
    throw new Error("Trio record not found");
  }

  const { data, error } = await supabase
    .from("trio_records")
    .update({
      ...scores,
      updated_at: new Date().toISOString(),
    })
    .eq("game_id", gameId)
    .select()
    .single();

  if (error) {
    console.error("Error updating trio scores:", error);
    throw error;
  }

  return data;
}

/**
 * Get trio leaderboard (all trios sorted by total_score)
 */
export async function getTrioLeaderboard(gameId: string): Promise<TrioRecordWithPlayers[]> {
  const { data, error } = await supabase
    .from("trio_records")
    .select(`
      *,
      player1:members!trio_records_player1_id_fkey(id, username, full_name, avatar_url, handicap),
      player2:members!trio_records_player2_id_fkey(id, username, full_name, avatar_url, handicap),
      player3:members!trio_records_player3_id_fkey(id, username, full_name, avatar_url, handicap)
    `)
    .eq("game_id", gameId)
    .order("total_score", { ascending: false });

  if (error) {
    console.error("Error fetching trio leaderboard:", error);
    throw error;
  }

  return (data as TrioRecordWithPlayers[]) || [];
}