import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type FiveFiveGame = Tables<"fivefive_games">;
type FiveFiveParticipant = Tables<"fivefive_participants">;
type FiveFivePrize = Tables<"fivefive_prizes">;
type Member = Tables<"members">;

export interface FiveFiveGameWithDetails extends FiveFiveGame {
  participants: (FiveFiveParticipant & {
    member: Member;
  })[];
}

export interface PrizeCalculation {
  member_id: string;
  member: Member;
  game1_prize: number;
  game2_prize: number;
  game3_prize: number;
  game4_prize: number;
  game5_prize: number;
  total_prize: number;
}

export const fivefiveService = {
  // Get all FiveFive games
  async getAllGames(): Promise<FiveFiveGame[]> {
    const { data, error } = await supabase
      .from("fivefive_games")
      .select("*")
      .order("game_date", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get game by ID with participants
  async getGameById(gameId: string): Promise<FiveFiveGameWithDetails | null> {
    const { data, error } = await supabase
      .from("fivefive_games")
      .select(`
        *,
        participants:fivefive_participants(
          *,
          member:members(*)
        )
      `)
      .eq("id", gameId)
      .single();

    if (error) throw error;
    return data as FiveFiveGameWithDetails;
  },

  // Get games by date
  async getGamesByDate(date: string): Promise<FiveFiveGame[]> {
    const { data, error } = await supabase
      .from("fivefive_games")
      .select("*")
      .eq("game_date", date)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create new FiveFive game
  async createGame(gameDate: string, memberIds: string[]): Promise<FiveFiveGame> {
    // Create game
    const { data: game, error: gameError } = await supabase
      .from("fivefive_games")
      .insert({ game_date: gameDate })
      .select()
      .single();

    if (gameError) throw gameError;

    // Add participants
    const participants = memberIds.map((memberId) => ({
      fivefive_game_id: game.id,
      member_id: memberId,
    }));

    const { error: participantsError } = await supabase
      .from("fivefive_participants")
      .insert(participants);

    if (participantsError) throw participantsError;

    return game;
  },

  // Update participant scores and prizes
  async updateParticipantScoresAndPrizes(
    participantId: string,
    scores: {
      game1_score?: number;
      game2_score?: number;
      game3_score?: number;
      game4_score?: number;
      game5_score?: number;
    },
    prizes: {
      game1_prize?: number;
      game2_prize?: number;
      game3_prize?: number;
      game4_prize?: number;
      game5_prize?: number;
      total_prize?: number;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from("fivefive_participants")
      .update({ ...scores, ...prizes })
      .eq("id", participantId);

    if (error) throw error;
  },

  // Get prize configuration
  async getPrizeConfiguration(): Promise<FiveFivePrize[]> {
    const { data, error } = await supabase
      .from("fivefive_prizes")
      .select("*")
      .order("rank_position", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Calculate prizes for a game based on scores
  async calculatePrizes(gameId: string): Promise<PrizeCalculation[]> {
    // Get game with participants and their scores
    const game = await this.getGameById(gameId);
    if (!game || !game.participants) return [];

    // Get prize configuration
    const prizeConfig = await this.getPrizeConfiguration();
    if (!prizeConfig || prizeConfig.length === 0) return [];

    const results: PrizeCalculation[] = [];

    // Calculate prizes for each game (G1 to G5)
    for (let gameNum = 1; gameNum <= 5; gameNum++) {
      const scoreField = `game${gameNum}_score` as keyof FiveFiveParticipant;
      const prizeField = `game${gameNum}_prize` as keyof PrizeCalculation;

      // Sort participants by this game's score (highest first)
      const sorted = [...game.participants]
        .filter((p) => p[scoreField] !== null)
        .sort((a, b) => (b[scoreField] as number) - (a[scoreField] as number));

      // Group by score to handle ties
      const scoreGroups: { [score: number]: any[] } = {};
      sorted.forEach((participant: any) => {
        const score = participant[scoreField] as number;
        if (!scoreGroups[score]) {
          scoreGroups[score] = [];
        }
        scoreGroups[score].push(participant);
      });

      // Distribute prizes
      let currentRank = 0;
      const uniqueScores = Object.keys(scoreGroups)
        .map(Number)
        .sort((a, b) => b - a);

      for (const score of uniqueScores) {
        const playersWithScore = scoreGroups[score];
        const tiedCount = playersWithScore.length;

        // Collect prizes for tied players
        let totalPrizeForTied = 0;
        const ranksToConsider: number[] = [];

        for (let i = 0; i < tiedCount; i++) {
          const rankPos = currentRank + i + 1;
          ranksToConsider.push(rankPos);
          const prizeConfig = await this.getPrizeForRank(rankPos);
          if (prizeConfig) {
            totalPrizeForTied += prizeConfig.prize_amount;
          }
        }

        // Split prize equally among tied players
        const prizePerPlayer = totalPrizeForTied / tiedCount;

        // Update results for each tied player
        playersWithScore.forEach((participant: any) => {
          let existing = results.find((r) => r.member_id === participant.member_id);
          if (!existing) {
            existing = {
              member_id: participant.member_id,
              member: participant.member,
              game1_prize: 0,
              game2_prize: 0,
              game3_prize: 0,
              game4_prize: 0,
              game5_prize: 0,
              total_prize: 0,
            };
            results.push(existing);
          }
          (existing as any)[prizeField] = prizePerPlayer;
        });

        currentRank += tiedCount;
      }
    }

    // Calculate total prizes
    results.forEach((result) => {
      result.total_prize =
        result.game1_prize +
        result.game2_prize +
        result.game3_prize +
        result.game4_prize +
        result.game5_prize;
    });

    return results;
  },

  // Get prize for specific rank
  async getPrizeForRank(rankPosition: number): Promise<FiveFivePrize | null> {
    const { data, error } = await supabase
      .from("fivefive_prizes")
      .select("*")
      .eq("rank_position", rankPosition)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Delete game
  async deleteGame(gameId: string): Promise<void> {
    const { error } = await supabase.from("fivefive_games").delete().eq("id", gameId);

    if (error) throw error;
  },
};