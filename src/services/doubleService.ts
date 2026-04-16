import { supabase } from "@/integrations/supabase/client";

export const doubleService = {
  /**
   * Auto-sync double scores from individual game_players
   * This function calculates double scores WITHOUT handicap (scratch scores only)
   */
  async syncDoubleScoresForGame(gameId: string): Promise<{ 
    success: boolean; 
    message: string;
    updatedCount: number;
    details: any[];
  }> {
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
        return {
          success: false,
          message: `Ralat mengambil rekod double: ${doubleError.message}`,
          updatedCount: 0,
          details: []
        };
      }

      if (!doubleRecords || doubleRecords.length === 0) {
        console.log("⚠️ [DOUBLE SYNC] No double records found for this game");
        return {
          success: false,
          message: "Tiada rekod pasangan Double dijumpai untuk game ini. Sila tambah pasangan Double terlebih dahulu.",
          updatedCount: 0,
          details: []
        };
      }

      // Get all player scores for this game
      const { data: players, error: playersError } = await supabase
        .from("game_players")
        .select(`
          member_id,
          total_score,
          game1_score,
          game2_score,
          game3_score,
          game4_score,
          game5_score,
          handicap
        `)
        .eq("game_id", gameId);

      console.log("👥 [DOUBLE SYNC] Player scores fetched:", {
        count: players?.length || 0,
        players: players,
        error: playersError
      });

      if (playersError) {
        console.error("❌ [DOUBLE SYNC] Error fetching player scores:", playersError);
        return {
          success: false,
          message: `Ralat mengambil skor pemain: ${playersError.message}`,
          updatedCount: 0,
          details: []
        };
      }

      if (!players || players.length === 0) {
        return {
          success: false,
          message: "Tiada skor pemain dijumpai untuk game ini. Sila masukkan skor individu terlebih dahulu.",
          updatedCount: 0,
          details: []
        };
      }

      // Create a map for quick lookup
      const playerScoreMap = new Map<string, any>();
      (players || []).forEach((p) => {
        // Calculate total manually from individual games (scratch score only, no handicap)
        const manualTotal = 
          (p.game1_score || 0) + 
          (p.game2_score || 0) + 
          (p.game3_score || 0) + 
          (p.game4_score || 0) + 
          (p.game5_score || 0);
        
        playerScoreMap.set(p.member_id, {
          total_score: p.total_score || manualTotal,
          manual_total: manualTotal,
          handicap: p.handicap || 0
        });
      });

      console.log("🗺️ [DOUBLE SYNC] Player score map:", Object.fromEntries(playerScoreMap));

      // Update each double record
      const updates = [];
      const details = [];
      
      for (const record of doubleRecords) {
        const p1Data = playerScoreMap.get(record.player1_id);
        const p2Data = playerScoreMap.get(record.player2_id);
        
        const player1Score = p1Data?.manual_total || 0;
        const player2Score = p2Data?.manual_total || 0;
        const totalScore = player1Score + player2Score;

        console.log(`📝 [DOUBLE SYNC] Calculating for record ${record.id}:`, {
          player1_id: record.player1_id,
          player1_score: player1Score,
          player1_handicap: p1Data?.handicap || 0,
          player2_id: record.player2_id,
          player2_score: player2Score,
          player2_handicap: p2Data?.handicap || 0,
          total: totalScore,
          note: "TANPA HANDICAP"
        });

        details.push({
          record_id: record.id,
          player1_score: player1Score,
          player2_score: player2Score,
          total: totalScore
        });

        updates.push({
          id: record.id,
          player1_score: player1Score,
          player2_score: player2Score,
          total_score: totalScore,
        });
      }

      console.log("📦 [DOUBLE SYNC] Prepared updates:", updates);

      // Batch update all double records
      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from("double_records")
          .upsert(updates);

        if (updateError) {
          console.error("❌ [DOUBLE SYNC] Error updating double records:", updateError);
          return {
            success: false,
            message: `Ralat mengemas kini skor double: ${updateError.message}`,
            updatedCount: 0,
            details: []
          };
        }
        
        console.log(`✅ [DOUBLE SYNC] Successfully synced ${updates.length} double records`);
        return {
          success: true,
          message: `Berjaya sync ${updates.length} pasangan Double! (tanpa handicap)`,
          updatedCount: updates.length,
          details
        };
      }
      
      return {
        success: false,
        message: "Tiada data untuk dikemas kini.",
        updatedCount: 0,
        details: []
      };
    } catch (error: any) {
      console.error("❌ [DOUBLE SYNC] Error in syncDoubleScoresForGame:", error);
      return {
        success: false,
        message: `Ralat tidak dijangka: ${error?.message || 'Unknown error'}`,
        updatedCount: 0,
        details: []
      };
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