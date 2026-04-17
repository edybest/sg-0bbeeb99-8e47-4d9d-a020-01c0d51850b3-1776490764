import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type TrioRecord = Tables<"trio_records"> & {
  player1: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  player2: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  player3: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
};

/**
 * Fetch all trio records for a specific game
 */
export async function fetchTrioRecords(gameId: string): Promise<TrioRecord[]> {
  const { data, error } = await supabase
    .from("trio_records")
    .select(
      `
      *,
      player1:members!trio_records_player1_id_fkey(id, username, avatar_url),
      player2:members!trio_records_player2_id_fkey(id, username, avatar_url),
      player3:members!trio_records_player3_id_fkey(id, username, avatar_url)
    `
    )
    .eq("game_id", gameId)
    .order("total_score", { ascending: false });

  if (error) throw error;
  return (data || []) as TrioRecord[];
}

/**
 * Create a new trio record
 */
export async function createTrioRecord(
  gameId: string,
  player1Id: string,
  player2Id: string,
  player3Id: string,
  player1Score: number,
  player2Score: number,
  player3Score: number,
  player1Handicap: number,
  player2Handicap: number,
  player3Handicap: number,
  createdBy: string
) {
  const { data, error } = await supabase
    .from("trio_records")
    .insert({
      game_id: gameId,
      player1_id: player1Id,
      player2_id: player2Id,
      player3_id: player3Id,
      player1_score: player1Score,
      player2_score: player2Score,
      player3_score: player3Score,
      player1_handicap: player1Handicap,
      player2_handicap: player2Handicap,
      player3_handicap: player3Handicap,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing trio record
 */
export async function updateTrioRecord(
  trioId: string,
  updates: {
    player1_id?: string;
    player2_id?: string;
    player3_id?: string;
    player1_score?: number;
    player2_score?: number;
    player3_score?: number;
    player1_handicap?: number;
    player2_handicap?: number;
    player3_handicap?: number;
  }
) {
  const { data, error } = await supabase
    .from("trio_records")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", trioId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a trio record
 */
export async function deleteTrioRecord(trioId: string) {
  const { error } = await supabase.from("trio_records").delete().eq("id", trioId);
  if (error) throw error;
}

/**
 * Toggle trio_enabled for a game
 */
export async function toggleTrioEnabled(gameId: string, enabled: boolean) {
  const { data, error } = await supabase
    .from("games")
    .update({ trio_enabled: enabled })
    .eq("id", gameId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Calculate trio scores from game_players data
 */
export async function calculateTrioScores(
  gameId: string,
  player1Id: string,
  player2Id: string,
  player3Id: string
): Promise<{
  player1Score: number;
  player2Score: number;
  player3Score: number;
  player1Handicap: number;
  player2Handicap: number;
  player3Handicap: number;
}> {
  const { data: players, error } = await supabase
    .from("game_players")
    .select("member_id, total_score, handicap")
    .eq("game_id", gameId)
    .in("member_id", [player1Id, player2Id, player3Id]);

  if (error) throw error;

  const player1 = players?.find((p) => p.member_id === player1Id);
  const player2 = players?.find((p) => p.member_id === player2Id);
  const player3 = players?.find((p) => p.member_id === player3Id);

  return {
    player1Score: player1?.total_score || 0,
    player2Score: player2?.total_score || 0,
    player3Score: player3?.total_score || 0,
    player1Handicap: player1?.handicap || 0,
    player2Handicap: player2?.handicap || 0,
    player3Handicap: player3?.handicap || 0,
  };
}