import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClubLogo } from "@/components/ClubLogo";
import { SEO } from "@/components/SEO";
import { Trophy, Calendar, TrendingUp, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PageAccessGuard } from "@/components/PageAccessGuard";

type Member = Tables<"members">;
type Game = Tables<"games">;

interface FiveFiveParticipant {
  member_id: string;
  member_name: string;
  game1_score: number;
  game2_score: number;
  game3_score: number;
  game4_score: number;
  game5_score: number;
  game1_rank: number;
  game2_rank: number;
  game3_rank: number;
  game4_rank: number;
  game5_rank: number;
  game1_prize: number;
  game2_prize: number;
  game3_prize: number;
  game4_prize: number;
  game5_prize: number;
  total_prize: number;
}

interface GameWithDate {
  id: string;
  game_date: string;
  game_format: string | null;
}

export default function FiveFivePage() {
  const router = useRouter();
  const { member, loading, isAuthenticated } = useAuth(false);
  const { toast } = useToast();
  const [loadingData, setLoading] = useState(true);
  const [games, setGames] = useState<GameWithDate[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [participants, setParticipants] = useState<FiveFiveParticipant[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameWithDate | null>(null);

  const loadGamesWithFiveFive = async () => {
    setLoading(true);
    try {
      const { data: gamesData, error } = await supabase
        .from("games")
        .select(`
          id,
          game_date,
          game_format,
          game_players!inner(is_fivefive)
        `)
        .eq("game_players.is_fivefive", true)
        .order("game_date", { ascending: false });

      if (error) throw error;

      if (gamesData && gamesData.length > 0) {
        const uniqueGames = Array.from(
          new Map(gamesData.map((g) => [g.id, { id: g.id, game_date: g.game_date, game_format: g.game_format }])).values()
        );

        setGames(uniqueGames);

        if (uniqueGames.length > 0) {
          setSelectedGameId(uniqueGames[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading games:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateRankingsAndPrizes = async (gameId: string) => {
    setLoading(true);
    try {
      const game = games.find((g) => g.id === gameId);
      if (game) {
        setSelectedGame(game);
      }

      // Get all players with FiveFive flag
      const { data: playersData, error: playersError } = await supabase
        .from("game_players")
        .select(`
          member_id,
          is_fivefive,
          game1_score,
          game2_score,
          game3_score,
          game4_score,
          game5_score,
          members!inner(full_name)
        `)
        .eq("game_id", gameId)
        .eq("is_fivefive", true);

      if (playersError) throw playersError;

      if (!playersData || playersData.length === 0) {
        setParticipants([]);
        setLoading(false);
        return;
      }

      // Get prize configuration for this player count
      const playerCount = playersData.length;
      const { data: prizeConfig, error: prizeError } = await supabase
        .from("fivefive_prizes")
        .select("*")
        .eq("player_count", playerCount)
        .maybeSingle();

      if (prizeError) throw prizeError;

      const prizes: number[] = Array.isArray(prizeConfig?.prizes)
        ? prizeConfig.prizes.map(Number)
        : [];

      // Calculate rankings and prizes for each game
      const participantsWithRankings: FiveFiveParticipant[] = playersData.map((player) => ({
        member_id: player.member_id,
        member_name: player.members?.full_name || "Unknown",
        game1_score: player.game1_score || 0,
        game2_score: player.game2_score || 0,
        game3_score: player.game3_score || 0,
        game4_score: player.game4_score || 0,
        game5_score: player.game5_score || 0,
        game1_rank: 0,
        game2_rank: 0,
        game3_rank: 0,
        game4_rank: 0,
        game5_rank: 0,
        game1_prize: 0,
        game2_prize: 0,
        game3_prize: 0,
        game4_prize: 0,
        game5_prize: 0,
        total_prize: 0,
      }));

      // Calculate rankings and prizes for each game (1-5)
      for (let gameNum = 1; gameNum <= 5; gameNum++) {
        const scoreKey = `game${gameNum}_score` as keyof FiveFiveParticipant;
        const rankKey = `game${gameNum}_rank` as keyof FiveFiveParticipant;
        const prizeKey = `game${gameNum}_prize` as keyof FiveFiveParticipant;

        // Sort by score for this specific game (highest first)
        const sortedByGame = [...participantsWithRankings].sort(
          (a, b) => (b[scoreKey] as number) - (a[scoreKey] as number)
        );

        // Assign ranks based on score (handle ties)
        let currentRank = 1;
        let previousScore = -1;
        let playersAtSameRank = 0;

        sortedByGame.forEach((player, index) => {
          const score = player[scoreKey] as number;

          if (score === previousScore) {
            // Same score = same rank
            playersAtSameRank++;
          } else {
            // New score = new rank (skip ranks for tied players)
            currentRank = index + 1;
            playersAtSameRank = 0;
          }

          // Find original player in array and update rank
          const originalPlayer = participantsWithRankings.find((p) => p.member_id === player.member_id);
          if (originalPlayer) {
            (originalPlayer[rankKey] as number) = currentRank;

            // Assign prize based on rank
            if (currentRank <= prizes.length) {
              (originalPlayer[prizeKey] as number) = prizes[currentRank - 1] || 0;
            }
          }

          previousScore = score;
        });
      }

      // Calculate total prizes
      participantsWithRankings.forEach((participant) => {
        participant.total_prize =
          participant.game1_prize +
          participant.game2_prize +
          participant.game3_prize +
          participant.game4_prize +
          participant.game5_prize;
      });

      // Sort by total prize (highest first) for display
      participantsWithRankings.sort((a, b) => b.total_prize - a.total_prize);

      setParticipants(participantsWithRankings);
    } catch (err) {
      console.error("Error calculating FiveFive data:", err);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGamesWithFiveFive();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      calculateRankingsAndPrizes(selectedGameId);
    }
  }, [selectedGameId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toFixed(2)}`;
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <PageAccessGuard pagePath="/member/five-five" requireAuth={true}>
      <>
        <SEO title="FiveFive - AMBC Club" />
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/member")}
                  className="shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <ClubLogo size="md" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    FiveFive
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Prize Per Game - Juara Setiap Game</p>
                </div>
              </div>
            </div>

            {loadingData && !selectedGameId ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : games.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Tiada data FiveFive tersedia. Sila hubungi admin untuk maklumat lanjut.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-red-600" />
                        Pilih Tarikh Game
                      </CardTitle>
                      <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                        <SelectTrigger className="w-full sm:w-64">
                          <SelectValue placeholder="Pilih tarikh..." />
                        </SelectTrigger>
                        <SelectContent>
                          {games.map((game) => (
                            <SelectItem key={game.id} value={game.id}>
                              {formatDate(game.game_date)} {game.game_format ? `- ${game.game_format}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                </Card>

                {loadingData ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ) : participants.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      Tiada peserta FiveFive untuk game ini.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            Agihan Hadiah FiveFive Per Game
                          </span>
                          {selectedGame && (
                            <Badge variant="outline" className="text-sm">
                              {formatDate(selectedGame.game_date)}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50 dark:bg-gray-800">
                                <TableHead className="font-semibold">Nama Pemain</TableHead>
                                <TableHead className="font-semibold text-center">G1 Rank</TableHead>
                                <TableHead className="font-semibold text-right">G1 Score</TableHead>
                                <TableHead className="font-semibold text-right">G1 Prize</TableHead>
                                <TableHead className="font-semibold text-center">G2 Rank</TableHead>
                                <TableHead className="font-semibold text-right">G2 Score</TableHead>
                                <TableHead className="font-semibold text-right">G2 Prize</TableHead>
                                <TableHead className="font-semibold text-center">G3 Rank</TableHead>
                                <TableHead className="font-semibold text-right">G3 Score</TableHead>
                                <TableHead className="font-semibold text-right">G3 Prize</TableHead>
                                <TableHead className="font-semibold text-center">G4 Rank</TableHead>
                                <TableHead className="font-semibold text-right">G4 Score</TableHead>
                                <TableHead className="font-semibold text-right">G4 Prize</TableHead>
                                <TableHead className="font-semibold text-center">G5 Rank</TableHead>
                                <TableHead className="font-semibold text-right">G5 Score</TableHead>
                                <TableHead className="font-semibold text-right">G5 Prize</TableHead>
                                <TableHead className="font-semibold text-right bg-yellow-50 dark:bg-yellow-900/20">
                                  Total Prize
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {participants.map((participant, index) => (
                                <TableRow
                                  key={participant.member_id}
                                  className={`
                                    ${index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/50"}
                                    hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors
                                  `}
                                >
                                  <TableCell className="font-medium sticky left-0 bg-inherit">
                                    {participant.member_name}
                                  </TableCell>

                                  {/* Game 1 */}
                                  <TableCell className="text-center text-lg">
                                    {getRankDisplay(participant.game1_rank)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-gray-600 dark:text-gray-400">
                                    {participant.game1_score}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {participant.game1_prize > 0 ? (
                                      <span className="text-green-600 dark:text-green-400 font-medium">
                                        {formatCurrency(participant.game1_prize)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>

                                  {/* Game 2 */}
                                  <TableCell className="text-center text-lg">
                                    {getRankDisplay(participant.game2_rank)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-gray-600 dark:text-gray-400">
                                    {participant.game2_score}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {participant.game2_prize > 0 ? (
                                      <span className="text-green-600 dark:text-green-400 font-medium">
                                        {formatCurrency(participant.game2_prize)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>

                                  {/* Game 3 */}
                                  <TableCell className="text-center text-lg">
                                    {getRankDisplay(participant.game3_rank)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-gray-600 dark:text-gray-400">
                                    {participant.game3_score}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {participant.game3_prize > 0 ? (
                                      <span className="text-green-600 dark:text-green-400 font-medium">
                                        {formatCurrency(participant.game3_prize)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>

                                  {/* Game 4 */}
                                  <TableCell className="text-center text-lg">
                                    {getRankDisplay(participant.game4_rank)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-gray-600 dark:text-gray-400">
                                    {participant.game4_score}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {participant.game4_prize > 0 ? (
                                      <span className="text-green-600 dark:text-green-400 font-medium">
                                        {formatCurrency(participant.game4_prize)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>

                                  {/* Game 5 */}
                                  <TableCell className="text-center text-lg">
                                    {getRankDisplay(participant.game5_rank)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-gray-600 dark:text-gray-400">
                                    {participant.game5_score}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {participant.game5_prize > 0 ? (
                                      <span className="text-green-600 dark:text-green-400 font-medium">
                                        {formatCurrency(participant.game5_prize)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>

                                  {/* Total Prize */}
                                  <TableCell className="text-right font-bold tabular-nums bg-yellow-50 dark:bg-yellow-900/20 sticky right-0">
                                    {participant.total_prize > 0 ? (
                                      <span className="text-yellow-700 dark:text-yellow-400 text-lg">
                                        {formatCurrency(participant.total_prize)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>

                    {participants.length > 0 && (
                      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
                        <CardContent className="p-6">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <Trophy className="w-8 h-8 text-yellow-600" />
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Jumlah Hadiah Keseluruhan</p>
                                <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                                  {formatCurrency(participants.reduce((sum, p) => sum + p.total_prize, 0))}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Jumlah Peserta</p>
                                <p className="text-3xl font-bold text-red-600">
                                  {participants.length}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    </PageAccessGuard>
  );
}