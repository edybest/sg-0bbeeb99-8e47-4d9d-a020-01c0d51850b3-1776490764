import { supabase } from "@/integrations/supabase/client";

export const doubleService = {
  /**
   * Auto-sync double scores from individual game_players
   * This function calculates double scores WITHOUT handicap (scratch scores only)
   */
  async syncDoubleScoresForGame(gameId: string): Promise<void> {
    console.log("🔄 [DOUBLE SYNC] Starting sync for game:", gameId);
    
    try {
      // Get all double records for this game
      const { data: doubleRecords, error: doubleError } = await supabase
        .from("double_records")
        .select("id, player1_id, player2_id")
        .eq("game_id", gameId);

      console.log("📊 [DOUBLE SYNC] Double records fetched:", {
        count: doubleRecords?.length || 0,
        records: doubleRecords,
        error: doubleError
      });

      if (doubleError) {
        console.error("❌ [DOUBLE SYNC] Error fetching double records:", doubleError);
        return;
      }

      if (!doubleRecords || doubleRecords.length === 0) {
        console.log("⚠️ [DOUBLE SYNC] No double records found for this game");
        return;
      }

      // Get all player scores for this game
      const { data: players, error: playersError } = await supabase
        .from("game_players")
        .select("member_id, total_score")
        .eq("game_id", gameId);

      console.log("👥 [DOUBLE SYNC] Player scores fetched:", {
        count: players?.length || 0,
        players: players,
        error: playersError
      });

      if (playersError) {
        console.error("❌ [DOUBLE SYNC] Error fetching player scores:", playersError);
        return;
      }

      // Create a map for quick lookup
      const playerScoreMap = new Map<string, number>();
      (players || []).forEach((p) => {
        // Use total_score WITHOUT handicap (scratch score only)
        playerScoreMap.set(p.member_id, p.total_score || 0);
      });

      console.log("🗺️ [DOUBLE SYNC] Player score map:", Object.fromEntries(playerScoreMap));

      // Update each double record
      const updates = doubleRecords.map((record) => {
        const player1Score = playerScoreMap.get(record.player1_id) || 0;
        const player2Score = playerScoreMap.get(record.player2_id) || 0;
        const totalScore = player1Score + player2Score;

        console.log(`📝 [DOUBLE SYNC] Calculating for record ${record.id}:`, {
          player1_id: record.player1_id,
          player1_score: player1Score,
          player2_id: record.player2_id,
          player2_score: player2Score,
          total: totalScore
        });

        return {
          id: record.id,
          player1_score: player1Score,
          player2_score: player2Score,
          total_score: totalScore,
        };
      });

      console.log("📦 [DOUBLE SYNC] Prepared updates:", updates);

      // Batch update all double records
      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from("double_records")
          .upsert(updates);

        if (updateError) {
          console.error("❌ [DOUBLE SYNC] Error updating double records:", updateError);
        } else {
          console.log(`✅ [DOUBLE SYNC] Successfully synced ${updates.length} double records`);
        }
      }
    } catch (error) {
      console.error("❌ [DOUBLE SYNC] Error in syncDoubleScoresForGame:", error);
    }
  },

  /**
   * Get double records leaderboard for a game
   */
  async getDoubleLeaderboard(gameId: string) {
    try {
      const { data, error } = await supabase
        .from("double_records")
        .select(`
          *,
          player1:members!double_records_player1_id_fkey(id, username, full_name, avatar_url),
          player2:members!double_records_player2_id_fkey(id, username, full_name, avatar_url)
        `)
        .eq("game_id", gameId)
        .order("total_score", { ascending: false });

      if (error) {
        console.error("Error fetching double leaderboard:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getDoubleLeaderboard:", error);
      return [];
    }
  },
};