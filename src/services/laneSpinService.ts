import { supabase } from "@/integrations/supabase/client";

export interface SpinResult {
  id: string;
  game_id: string;
  member_id: string;
  lane_position: string;
  spun_at: string;
  members?: {
    username: string;
    full_name: string;
  } | null;
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
    .select(`
      id,
      game_id,
      member_id,
      lane_position,
      spun_at,
      members:members!lane_spin_results_member_id_fkey(
        username,
        full_name
      )
    `)
    .eq("game_id", gameId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) {
    console.error("Error getting spin result:", error);
    throw error;
  }

  return data as SpinResult | null;
}

/**
 * Get all spin results for a game
 */
export async function getGameSpinResults(gameId: string): Promise<SpinResult[]> {
  const { data, error } = await supabase
    .from("lane_spin_results")
    .select(`
      id,
      game_id,
      member_id,
      lane_position,
      spun_at,
      members:members!lane_spin_results_member_id_fkey(
        username,
        full_name
      )
    `)
    .eq("game_id", gameId)
    .order("spun_at", { ascending: true });

  if (error) {
    console.error("Error getting game spin results:", error);
    throw error;
  }

  // Fetch couple data separately for members who are in couples
  if (data && data.length > 0) {
    const memberIds = data.map(d => d.member_id).filter(Boolean);
    
    if (memberIds.length > 0) {
      const { data: coupleData } = await supabase
        .from("couples")
        .select(`
          id,
          couple_name,
          player1_id,
          player2_id,
          player1:members!couples_player1_id_fkey(username, full_name),
          player2:members!couples_player2_id_fkey(username, full_name)
        `)
        .or(`player1_id.in.(${memberIds.join(',')}),player2_id.in.(${memberIds.join(',')})`);

      // Attach couple data to results
      const enrichedData = data.map((result: any) => {
        const couple = coupleData?.find(
          c => c.player1_id === result.member_id || c.player2_id === result.member_id
        );
        return {
          ...result,
          couples: couple ? [couple] : []
        };
      });

      return enrichedData as SpinResult[];
    }
  }

  return (data || []) as SpinResult[];
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
    console.error("Error saving spin result:", {
      message: error.message,
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint,
      gameId,
      memberId,
      lanePosition,
    });
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

/**
 * Reset all spin results for a game (Admin only)
 */
export async function resetAllSpinResults(gameId: string): Promise<void> {
  const { error } = await supabase
    .from("lane_spin_results")
    .delete()
    .eq("game_id", gameId);

  if (error) {
    console.error("Error resetting spin results:", error);
    throw error;
  }
}