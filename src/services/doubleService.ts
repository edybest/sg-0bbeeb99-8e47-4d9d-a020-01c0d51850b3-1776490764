import { supabase } from "@/integrations/supabase/client";

export const doubleService = {
  /**
   * Auto-sync double scores from individual game_players
   * This function calculates double scores WITHOUT handicap (scratch scores only)
   */
  async syncDoubleScoresForGame(gameId: string): Promise<void> {
    try {
      // Get all double records for this game
      const { data: doubleRecords, error: doubleError } = await supabase
        .from("double_records")
        .select("id, player1_id, player2_id")
        .eq("game_id", gameId);

      if (doubleError) {
        console.error("Error fetching double records:", doubleError);
        return;
      }

      if (!doubleRecords || doubleRecords.length === 0) {
        console.log("No double records found for this game");
        return;
      }

      // Get all player scores for this game
      const { data: players, error: playersError } = await supabase
        .from("game_players")
        .select("member_id, total_score")
        .eq("game_id", gameId);

      if (playersError) {
        console.error("Error fetching player scores:", playersError);
        return;
      }

      // Create a map for quick lookup
      const playerScoreMap = new Map<string, number>();
      (players || []).forEach((p) => {
        // Use total_score WITHOUT handicap (scratch score only)
        playerScoreMap.set(p.member_id, p.total_score || 0);
      });

      // Update each double record
      const updates = doubleRecords.map((record) => {
        const player1Score = playerScoreMap.get(record.player1_id) || 0;
        const player2Score = playerScoreMap.get(record.player2_id) || 0;
        const totalScore = player1Score + player2Score;

        return {
          id: record.id,
          player1_score: player1Score,
          player2_score: player2Score,
          total_score: totalScore,
        };
      });

      // Batch update all double records
      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from("double_records")
          .upsert(updates);

        if (updateError) {
          console.error("Error updating double records:", updateError);
        } else {
          console.log(`✅ Successfully synced ${updates.length} double records`);
        }
      }
    } catch (error) {
      console.error("Error in syncDoubleScoresForGame:", error);
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