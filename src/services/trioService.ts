import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TrioRecord = Database["public"]["Tables"]["trio_records"]["Row"];
type TrioRecordInsert = Database["public"]["Tables"]["trio_records"]["Insert"];
type TrioRecordUpdate = Database["public"]["Tables"]["trio_records"]["Update"];

export interface TrioPlayer {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  handicap: number;
}

export interface TrioRecordWithPlayers extends TrioRecord {
  player1?: TrioPlayer | null;
  player2?: TrioPlayer | null;
  player3?: TrioPlayer | null;
}

/**
 * Get trio record for a specific game
 */
export async function getTrioRecordByGame(gameId: string): Promise<TrioRecordWithPlayers | null> {
  const { data, error } = await supabase
    .from("trio_records")
    .select(`
      *,
      player1:members!trio_records_player1_id_fkey(id, username, full_name, avatar_url, handicap),
      player2:members!trio_records_player2_id_fkey(id, username, full_name, avatar_url, handicap),
      player3:members!trio_records_player3_id_fkey(id, username, full_name, avatar_url, handicap)
    `)
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching trio record:", error);
    throw error;
  }

  return data as TrioRecordWithPlayers | null;
}

/**
 * Create or update trio record for a game
 */
export async function upsertTrioRecord(data: TrioRecordInsert): Promise<TrioRecord> {
  try {
    console.log("upsertTrioRecord called with data:", data);

    // Check if record exists
    const { data: existing, error: checkError } = await supabase
      .from("trio_records")
      .select("id")
      .eq("game_id", data.game_id!)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing trio record:", checkError);
      throw new Error(`Gagal menyemak rekod sedia ada: ${checkError.message}`);
    }

    console.log("Existing trio record:", existing);

    if (existing) {
      // Update existing record
      console.log("Updating existing trio record:", existing.id);

      const { data: updated, error: updateError } = await supabase
        .from("trio_records")
        .update(data as TrioRecordUpdate)
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating trio record:", {
          error: updateError,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
        });
        throw new Error(`Gagal mengemas kini rekod: ${updateError.message}`);
      }

      console.log("Trio record updated successfully:", updated);
      return updated;
    } else {
      // Create new record
      console.log("Creating new trio record");

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
        if (insertError.code === "23505") {
          throw new Error("Rekod trio untuk game ini sudah wujud");
        } else if (insertError.code === "23503") {
          throw new Error("Pemain atau game tidak dijumpai");
        } else if (insertError.code === "42501") {
          throw new Error("Anda tidak mempunyai kebenaran untuk mencipta rekod trio. Sila pastikan anda log masuk sebagai admin.");
        }

        throw new Error(`Gagal mencipta rekod: ${insertError.message}`);
      }

      console.log("Trio record created successfully:", created);
      return created;
    }
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
 * Delete trio record
 */
export async function deleteTrioRecord(gameId: string): Promise<void> {
  const { error } = await supabase
    .from("trio_records")
    .delete()
    .eq("game_id", gameId);

  if (error) {
    console.error("Error deleting trio record:", error);
    throw error;
  }
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