import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Couple = Database["public"]["Tables"]["couples"]["Row"];
type CoupleInsert = Database["public"]["Tables"]["couples"]["Insert"];
type CoupleUpdate = Database["public"]["Tables"]["couples"]["Update"];
type CoupleScore = Database["public"]["Tables"]["couple_scores"]["Row"];
type CoupleScoreInsert = Database["public"]["Tables"]["couple_scores"]["Insert"];

export interface CoupleWithPlayers extends Couple {
  player1_name?: string;
  player2_name?: string;
}

export interface CoupleScoreWithDetails extends CoupleScore {
  couple_name?: string;
  player1_name?: string;
  player2_name?: string;
  couple_handicap?: number;
}

export interface CoupleLeaderboardEntry {
  id: string;
  couple_id: string;
  couple_name: string;
  player1_name: string;
  player2_name: string;
  game1_score: number;
  game2_score: number;
  game3_score: number;
  game4_score: number;
  game5_score: number;
  game6_score: number;
  total_score: number;
  handicap: number;
  overall_score: number;
  difference: number;
  rank: number;
  likes_count: number;
}

class CoupleService {
  // ==================== COUPLES CRUD ====================
  async getAllCouples(): Promise<CoupleWithPlayers[]> {
    const { data, error } = await supabase
      .from("couples")
      .select(`
        *,
        player1:profiles!couples_player1_id_fkey(full_name),
        player2:profiles!couples_player2_id_fkey(full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching couples:", error);
      throw error;
    }

    return (data || []).map((couple: any) => ({
      ...couple,
      player1_name: couple.player1?.full_name || "Unknown",
      player2_name: couple.player2?.full_name || "Unknown",
    }));
  }

  async getCoupleById(id: string): Promise<CoupleWithPlayers | null> {
    const { data, error } = await supabase
      .from("couples")
      .select(`
        *,
        player1:profiles!couples_player1_id_fkey(full_name),
        player2:profiles!couples_player2_id_fkey(full_name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching couple:", error);
      return null;
    }

    return {
      ...data,
      player1_name: (data as any).player1?.full_name || "Unknown",
      player2_name: (data as any).player2?.full_name || "Unknown",
    };
  }

  async createCouple(couple: CoupleInsert): Promise<Couple> {
    const { data, error } = await supabase
      .from("couples")
      .insert(couple)
      .select()
      .single();

    if (error) {
      console.error("Error creating couple:", error);
      throw error;
    }

    return data;
  }

  async updateCouple(id: string, updates: CoupleUpdate): Promise<Couple> {
    const { data, error } = await supabase
      .from("couples")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating couple:", error);
      throw error;
    }

    return data;
  }

  async deleteCouple(id: string): Promise<void> {
    const { error } = await supabase
      .from("couples")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting couple:", error);
      throw error;
    }
  }

  // ==================== COUPLE SCORES ====================
  async getCoupleScoresByGame(gameId: string): Promise<CoupleScoreWithDetails[]> {
    const { data, error } = await supabase
      .from("couple_scores")
      .select(`
        *,
        couple:couples!couple_scores_couple_id_fkey(
          couple_name,
          handicap,
          player1:profiles!couples_player1_id_fkey(full_name),
          player2:profiles!couples_player2_id_fkey(full_name)
        )
      `)
      .eq("game_id", gameId);

    if (error) {
      console.error("Error fetching couple scores:", error);
      throw error;
    }

    return (data || []).map((score: any) => ({
      ...score,
      couple_name: score.couple?.couple_name || "Unknown",
      player1_name: score.couple?.player1?.full_name || "Unknown",
      player2_name: score.couple?.player2?.full_name || "Unknown",
      couple_handicap: score.couple?.handicap || 0,
    }));
  }

  async getCoupleLeaderboard(gameId: string): Promise<CoupleLeaderboardEntry[]> {
    const scores = await this.getCoupleScoresByGame(gameId);

    const leaderboard: CoupleLeaderboardEntry[] = scores.map((score: any) => {
      const total =
        (score.game1_score || 0) +
        (score.game2_score || 0) +
        (score.game3_score || 0) +
        (score.game4_score || 0) +
        (score.game5_score || 0) +
        (score.game6_score || 0);

      const overall = total + (score.couple_handicap || 0);

      return {
        id: score.id,
        couple_id: score.couple_id,
        couple_name: score.couple_name || "Unknown",
        player1_name: score.player1_name || "Unknown",
        player2_name: score.player2_name || "Unknown",
        game1_score: score.game1_score || 0,
        game2_score: score.game2_score || 0,
        game3_score: score.game3_score || 0,
        game4_score: score.game4_score || 0,
        game5_score: score.game5_score || 0,
        game6_score: score.game6_score || 0,
        total_score: total,
        handicap: score.couple_handicap || 0,
        overall_score: overall,
        difference: 0,
        rank: 0,
        likes_count: 0,
      };
    });

    // Sort by overall score descending
    leaderboard.sort((a, b) => b.overall_score - a.overall_score);

    // Calculate ranks and differences
    const topScore = leaderboard[0]?.overall_score || 0;
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
      entry.difference = topScore - entry.overall_score;
    });

    return leaderboard;
  }

  async upsertCoupleScore(score: CoupleScoreInsert): Promise<CoupleScore> {
    const { data, error } = await supabase
      .from("couple_scores")
      .upsert(score as any, {
        onConflict: "couple_id,game_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting couple score:", error);
      throw error;
    }

    return data as CoupleScore;
  }

  async deleteCoupleScore(id: string): Promise<void> {
    const { error } = await supabase
      .from("couple_scores")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting couple score:", error);
      throw error;
    }
  }

  // ==================== REACTIONS ====================
  async getCoupleReactions(gameId: string, memberId: string) {
    const { data, error } = await supabase
      .from("couple_reactions_log")
      .select("*")
      .eq("game_id", gameId)
      .eq("member_id", memberId);

    if (error) {
      console.error("Error fetching couple reactions:", error);
      return [];
    }

    return data || [];
  }

  async addCoupleReaction(coupleScoreId: string, gameId: string, memberId: string) {
    const { error } = await supabase
      .from("couple_reactions_log")
      .insert({
        couple_score_id: coupleScoreId,
        game_id: gameId,
        member_id: memberId,
        reaction_type: "like",
      });

    if (error) {
      console.error("Error adding couple reaction:", error);
      throw error;
    }
  }

  async getCoupleReactionCounts(gameId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from("couple_reactions_log")
      .select("couple_score_id")
      .eq("game_id", gameId)
      .eq("reaction_type", "like");

    if (error) {
      console.error("Error fetching couple reaction counts:", error);
      return {};
    }

    const counts: Record<string, number> = {};
    (data || []).forEach((reaction) => {
      const id = reaction.couple_score_id;
      counts[id] = (counts[id] || 0) + 1;
    });

    return counts;
  }
}

export const coupleService = new CoupleService();