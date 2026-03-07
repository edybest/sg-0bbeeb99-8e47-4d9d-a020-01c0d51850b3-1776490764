import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type FiveFivePrize = Tables<"fivefive_prizes">;
type FiveFiveGame = Tables<"fivefive_games">;
type FiveFiveParticipant = Tables<"fivefive_participants">;

interface PrizeConfiguration {
  player_count: number;
  prize_count: number;
  prizes: number[]; // Array of prize amounts [100, 80, 50, 30, 20]
}

export interface ParticipantWithPrizes extends FiveFiveParticipant {
  member: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const fivefiveService = {
  // Get current prize configuration
  async getPrizeConfiguration(playerCount: number): Promise<PrizeConfiguration | null> {
    const { data, error } = await supabase
      .from("fivefive_prizes")
      .select("*")
      .eq("player_count", playerCount)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      player_count: data.player_count,
      prize_count: data.prize_count,
      prizes: Array.isArray(data.prizes) ? data.prizes.map(Number) : [],
    };
  },

  // Calculate prizes for all participants in a game
  async calculatePrizes(gameId: string): Promise<ParticipantWithPrizes[]> {
    // Get prize configuration
    const prizeConfig = await this.getPrizeConfiguration();
    if (!prizeConfig) {
      throw new Error("Prize configuration not found");
    }

    // Get game participants with scores
    const { data: participants, error } = await supabase
      .from("fivefive_participants")
      .select(`
        *,
        member:members(id, username, full_name, avatar_url)
      `)
      .eq("fivefive_game_id", gameId);

    if (error) throw error;
    if (!participants || participants.length === 0) {
      return [];
    }

    const results: ParticipantWithPrizes[] = [];

    // Calculate prizes for each game (G1 to G5)
    for (let gameNum = 1; gameNum <= 5; gameNum++) {
      const scoreField = `game${gameNum}_score` as keyof FiveFiveParticipant;
      const prizeField = `game${gameNum}_prize` as keyof FiveFiveParticipant;

      // Sort by score (highest first)
      const sorted = [...participants].sort((a, b) => {
        const scoreA = (a[scoreField] as number) || 0;
        const scoreB = (b[scoreField] as number) || 0;
        return scoreB - scoreA;
      });

      // Group by score to handle ties
      const scoreGroups: { [score: number]: typeof participants } = {};
      sorted.forEach((p) => {
        const score = (p[scoreField] as number) || 0;
        if (!scoreGroups[score]) {
          scoreGroups[score] = [];
        }
        scoreGroups[score].push(p);
      });

      // Distribute prizes
      let currentRank = 0;
      const uniqueScores = Object.keys(scoreGroups)
        .map(Number)
        .sort((a, b) => b - a); // Highest score first

      uniqueScores.forEach((score) => {
        const tiedPlayers = scoreGroups[score];
        const tiedCount = tiedPlayers.length;

        // Collect prizes for tied ranks
        let totalPrize = 0;
        for (let i = 0; i < tiedCount; i++) {
          const rankPos = currentRank + i;
          if (rankPos < prizeConfig.prizes.length) {
            totalPrize += prizeConfig.prizes[rankPos];
          }
        }

        // Split equally among tied players
        const prizePerPlayer = totalPrize / tiedCount;

        // Assign prize to each tied player
        tiedPlayers.forEach((player) => {
          const existingResult = results.find((r) => r.id === player.id);
          if (existingResult) {
            (existingResult[prizeField] as number) = prizePerPlayer;
          } else {
            const newResult = { ...player };
            (newResult[prizeField] as number) = prizePerPlayer;
            results.push(newResult as ParticipantWithPrizes);
          }
        });

        currentRank += tiedCount;
      });
    }

    // Calculate total prizes
    results.forEach((result) => {
      result.total_prize =
        (result.game1_prize || 0) +
        (result.game2_prize || 0) +
        (result.game3_prize || 0) +
        (result.game4_prize || 0) +
        (result.game5_prize || 0);
    });

    return results;
  },

  // Get game by ID with participants
  async getGameById(
    gameId: string
  ): Promise<(FiveFiveGame & { participants: ParticipantWithPrizes[] }) | null> {
    const { data: game, error: gameError } = await supabase
      .from("fivefive_games")
      .select("*")
      .eq("id", gameId)
      .maybeSingle();

    if (gameError) throw gameError;
    if (!game) return null;

    const participants = await this.calculatePrizes(gameId);

    return {
      ...game,
      participants,
    };
  },

  // Get all games
  async getAllGames(): Promise<FiveFiveGame[]> {
    const { data, error } = await supabase
      .from("fivefive_games")
      .select("*")
      .order("game_date", { ascending: false });

    if (error) throw error;
    return data || [];
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
  async createGame(gameDate: string, memberIds: string[]): Promise<string> {
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
      game1_score: 0,
      game2_score: 0,
      game3_score: 0,
      game4_score: 0,
      game5_score: 0,
    }));

    const { error: participantsError } = await supabase
      .from("fivefive_participants")
      .insert(participants);

    if (participantsError) throw participantsError;

    return game.id;
  },

  // Update participant scores
  async updateParticipantScores(
    participantId: string,
    scores: {
      game1_score?: number;
      game2_score?: number;
      game3_score?: number;
      game4_score?: number;
      game5_score?: number;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from("fivefive_participants")
      .update(scores)
      .eq("id", participantId);

    if (error) throw error;
  },

  // Delete game
  async deleteGame(gameId: string): Promise<void> {
    const { error } = await supabase.from("fivefive_games").delete().eq("id", gameId);

    if (error) throw error;
  },
};