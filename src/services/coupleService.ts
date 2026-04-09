import { supabase } from "@/integrations/supabase/client";

type Couple = {
  id: string;
  couple_name: string;
  player1_id: string;
  player2_id: string;
  created_at: string;
};

type CoupleInsert = {
  couple_name: string;
  player1_id: string;
  player2_id: string;
};

type CoupleUpdate = {
  couple_name?: string;
  player1_id?: string;
  player2_id?: string;
};

type CoupleScore = {
  id: string;
  couple_id: string;
  game_id: string;
  game1_score: number | null;
  game2_score: number | null;
  game3_score: number | null;
  game4_score: number | null;
  game5_score: number | null;
  game6_score: number | null;
  handicap: number | null;
  total_score: number | null;
  overall_score: number | null;
  created_at: string;
};

type CoupleScoreInsert = {
  couple_id: string;
  game_id: string;
  game1_score?: number | null;
  game2_score?: number | null;
  game3_score?: number | null;
  game4_score?: number | null;
  game5_score?: number | null;
  game6_score?: number | null;
  handicap?: number | null;
};

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
        player1:members!couples_player1_id_fkey(username),
        player2:members!couples_player2_id_fkey(username)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching couples:", error);
      throw error;
    }

    return (data || []).map((couple: any) => ({
      ...couple,
      player1_name: couple.player1?.username || "Unknown",
      player2_name: couple.player2?.username || "Unknown",
    }));
  }

  async getCoupleById(id: string): Promise<CoupleWithPlayers | null> {
    const { data, error } = await supabase
      .from("couples")
      .select(`
        *,
        player1:members!couples_player1_id_fkey(username),
        player2:members!couples_player2_id_fkey(username)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching couple:", error);
      return null;
    }

    return {
      ...data,
      player1_name: (data as any).player1?.username || "Unknown",
      player2_name: (data as any).player2?.username || "Unknown",
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

    return data as Couple;
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

    return data as Couple;
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
          player1:members!couples_player1_id_fkey(username),
          player2:members!couples_player2_id_fkey(username)
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
      player1_name: score.couple?.player1?.username || "Unknown",
      player2_name: score.couple?.player2?.username || "Unknown",
      couple_handicap: 0,
    }));
  }

  async getCoupleLeaderboard(gameId: string): Promise<CoupleLeaderboardEntry[]> {
    const scores = await this.getCoupleScoresByGame(gameId);

    // Fetch reaction counts for all couple scores in this game
    const { data: reactions, error: reactionsError } = await supabase
      .from("couple_reactions_log")
      .select("couple_score_id")
      .eq("game_id", gameId)
      .eq("reaction_type", "like");

    if (reactionsError) {
      console.error("Error fetching reactions in leaderboard:", reactionsError);
    }

    // Build reaction counts map
    const reactionCounts: Record<string, number> = {};
    (reactions || []).forEach((reaction) => {
      const id = reaction.couple_score_id;
      reactionCounts[id] = (reactionCounts[id] || 0) + 1;
    });

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
        likes_count: reactionCounts[score.id] || 0, // Include likes from start
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

  upsertCoupleScore(score) {
    const client: any = supabase;
    const tableName = "couple_scores";
    return (client.from(tableName).upsert(score, { onConflict: "couple_id,game_id" }) as any).then((result: any) => {
      if (result.error) throw result.error;
    }).catch((error: any) => {
      console.error("Error upserting couple score:", error);
      throw error;
    });
  }

  async deleteCoupleScore(id: string) {
    const client: any = supabase;
    const result: any = await client
      .from("couple_scores")
      .delete()
      .eq("id", id);

    if (result.error) {
      console.error("Error deleting couple score:", result.error);
      throw result.error;
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

export const upsertCoupleScore = async (scoreData: CoupleScoreInsert) => {
  const { data, error } = await supabase
    .from("couple_scores")
    .upsert(
      {
        couple_id: scoreData.couple_id,
        game_id: scoreData.game_id,
        game1_score: scoreData.game1_score,
        game2_score: scoreData.game2_score,
        game3_score: scoreData.game3_score,
        game4_score: scoreData.game4_score,
        game5_score: scoreData.game5_score,
        game6_score: scoreData.game6_score,
        handicap: scoreData.handicap,
      },
      {
        onConflict: "couple_id,game_id",
      }
    )
    .select();

  if (error) {
    console.error("Error upserting couple score:", error);
    throw error;
  }

  return data;
};