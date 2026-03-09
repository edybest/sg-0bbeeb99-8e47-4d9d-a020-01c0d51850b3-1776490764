import { supabase } from "@/integrations/supabase/client";

export interface SpinResult {
  id: string;
  game_id: string;
  member_id: string;
  lane_position: string;
  spun_at: string;
}

/**
 * Check if member has already spun for a game
 */
export async function getMemberSpinResult(
  gameId: string,
  memberId: string
): Promise<SpinResult | null> {
  const { data, error } = await supabase
    .from("lane_spin_results")
    .select("*")
    .eq("game_id", gameId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) {
    console.error("Error getting spin result:", error);
    throw error;
  }

  return data;
}

/**
 * Get all spin results for a game
 */
export async function getGameSpinResults(gameId: string): Promise<SpinResult[]> {
  const { data, error } = await supabase
    .from("lane_spin_results")
    .select("*")
    .eq("game_id", gameId)
    .order("spun_at", { ascending: true });

  if (error) {
    console.error("Error getting game spin results:", error);
    throw error;
  }

  return data || [];
}

/**
 * Save member's spin result
 */
export async function saveSpinResult(
  gameId: string,
  memberId: string,
  lanePosition: string
): Promise<SpinResult> {
  const { data, error } = await supabase
    .from("lane_spin_results")
    .insert({
      game_id: gameId,
      member_id: memberId,
      lane_position: lanePosition
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving spin result:", error);
    throw error;
  }

  return data;
}

/**
 * Get spun lane positions for a game (to exclude from wheel)
 */
export async function getSpunLanePositions(gameId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("lane_spin_results")
    .select("lane_position")
    .eq("game_id", gameId);

  if (error) {
    console.error("Error getting spun lanes:", error);
    throw error;
  }

  return data?.map(r => r.lane_position) || [];
}