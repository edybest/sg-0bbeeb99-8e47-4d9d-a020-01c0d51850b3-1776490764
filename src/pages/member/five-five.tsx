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
import { SEO } from "@/components/SEO";
import { Trophy, Calendar, TrendingUp, ArrowLeft, Loader2, Award, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PageAccessGuard } from "@/components/PageAccessGuard";

type Member = Tables<"members">;
type Game = Tables<"games">;

interface FiveFiveParticipant {
  member_id: string;
  username: string;
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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (memberId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedCards(newExpanded);
  };

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
          members!inner(username)
        `)
        .eq("game_id", gameId)
        .eq("is_fivefive", true);

      if (playersError) throw playersError;

      if (!playersData || playersData.length === 0) {
        setParticipants([]);
        setLoading(false);
        return;
      }

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

      const participantsWithRankings: FiveFiveParticipant[] = playersData.map((player) => ({
        member_id: player.member_id,
        username: player.members?.username || "Unknown",
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

      for (let gameNum = 1; gameNum <= 5; gameNum++) {
        const scoreKey = `game${gameNum}_score` as keyof FiveFiveParticipant;
        const rankKey = `game${gameNum}_rank` as keyof FiveFiveParticipant;
        const prizeKey = `game${gameNum}_prize` as keyof FiveFiveParticipant;

        const sortedByGame = [...participantsWithRankings].sort(
          (a, b) => (b[scoreKey] as number) - (a[scoreKey] as number)
        );

        let currentRank = 1;
        let previousScore = -1;
        let playersAtSameRank = 0;

        sortedByGame.forEach((player, index) => {
          const score = player[scoreKey] as number;

          if (score === previousScore) {
            playersAtSameRank++;
          } else {
            currentRank = index + 1;
            playersAtSameRank = 0;
          }

          const originalPlayer = participantsWithRankings.find((p) => p.member_id === player.member_id);
          if (originalPlayer) {
            (originalPlayer[rankKey] as number) = currentRank;

            if (currentRank <= prizes.length) {
              (originalPlayer[prizeKey] as number) = prizes[currentRank - 1] || 0;
            }
          }

          previousScore = score;
        });
      }

      participantsWithRankings.forEach((participant) => {
        participant.total_prize =
          participant.game1_prize +
          participant.game2_prize +
          participant.game3_prize +
          participant.game4_prize +
          participant.game5_prize;
      });

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const getGameGradient = (gameNum: number) => {
    const gradients = [
      "from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20",
      "from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20",
      "from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20",
      "from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20",
      "from-pink-500/10 to-pink-600/10 dark:from-pink-500/20 dark:to-pink-600/20",
    ];
    return gradients[gameNum - 1] || gradients[0];
  };

  const getGameBorder = (gameNum: number) => {
    const borders = [
      "border-blue-200 dark:border-blue-800",
      "border-green-200 dark:border-green-800",
      "border-purple-200 dark:border-purple-800",
      "border-orange-200 dark:border-orange-800",
      "border-pink-200 dark:border-pink-800",
    ];
    return borders[gameNum - 1] || borders[0];
  };

  const getGameBadgeColor = (gameNum: number) => {
    const colors = [
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    ];
    return colors[gameNum - 1] || colors[0];
  };

  return (
    <PageAccessGuard pagePath="/member/five-five" requireAuth={true}>
      <>
        <SEO title="FiveFive - AMBC Club" />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-pink-800/10">
          <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/member")}
                  className="shrink-0 hover:bg-pink-50 dark:hover:bg-pink-800/20 hover:border-red-300 dark:hover:border-pink-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
                    FiveFive
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Prize Per Game - Juara Setiap Game
                  </p>
                </div>
              </div>
            </div>

            {loadingData && !selectedGameId ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : games.length === 0 ? (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                <AlertDescription className="text-amber-900 dark:text-amber-200">
                  Tiada data FiveFive tersedia. Sila hubungi admin untuk maklumat lanjut.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-6">
                {/* Game Selector Card */}
                <Card className="shadow-lg border-2 border-pink-100 dark:border-pink-800/30 bg-gradient-to-br from-white to-pink-50/30 dark:from-gray-800 dark:to-pink-800/10">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Calendar className="w-5 h-5 text-primary" />
                        Pilih Tarikh Game
                      </CardTitle>
                      <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                        <SelectTrigger className="w-full sm:w-72 border-2 hover:border-red-300 dark:hover:border-pink-600 transition-colors">
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
                  <Card className="shadow-lg">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <Skeleton className="h-8 w-full rounded-lg" />
                        <Skeleton className="h-8 w-full rounded-lg" />
                        <Skeleton className="h-8 w-full rounded-lg" />
                      </div>
                    </CardContent>
                  </Card>
                ) : participants.length === 0 ? (
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                    <AlertDescription className="text-amber-900 dark:text-amber-200">
                      Tiada peserta FiveFive untuk game ini.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* MOBILE VIEW - Card Based Layout */}
                    <div className="md:hidden space-y-4">
                      {participants.map((participant, index) => {
                        const isExpanded = expandedCards.has(participant.member_id);
                        return (
                          <Card 
                            key={participant.member_id}
                            className="shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden"
                          >
                            {/* Card Header - Always Visible */}
                            <div 
                              className="p-4 bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-800/20 dark:to-pink-700/20 cursor-pointer"
                              onClick={() => toggleCard(participant.member_id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="text-xs">
                                      #{index + 1}
                                    </Badge>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                                      {participant.username}
                                    </h3>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-yellow-600" />
                                    <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                                      {formatCurrency(participant.total_prize)}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-6 h-6" />
                                  ) : (
                                    <ChevronDown className="w-6 h-6" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Expandable Game Details */}
                            {isExpanded && (
                              <CardContent className="p-4 space-y-3">
                                {[1, 2, 3, 4, 5].map((gameNum) => {
                                  const scoreKey = `game${gameNum}_score` as keyof FiveFiveParticipant;
                                  const rankKey = `game${gameNum}_rank` as keyof FiveFiveParticipant;
                                  const prizeKey = `game${gameNum}_prize` as keyof FiveFiveParticipant;
                                  
                                  return (
                                    <div
                                      key={gameNum}
                                      className={`p-3 rounded-lg border-2 bg-gradient-to-r ${getGameGradient(gameNum)} ${getGameBorder(gameNum)}`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <Badge className={getGameBadgeColor(gameNum)}>
                                          🎯 Game {gameNum}
                                        </Badge>
                                        <span className="text-2xl">
                                          {getRankDisplay(participant[rankKey] as number)}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <p className="text-xs text-gray-600 dark:text-gray-400">Score</p>
                                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                                            {participant[scoreKey]}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600 dark:text-gray-400">Prize</p>
                                          <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                            {(participant[prizeKey] as number) > 0
                                              ? formatCurrency(participant[prizeKey] as number)
                                              : "-"}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </CardContent>
                            )}
                          </Card>
                        );
                      })}
                    </div>

                    {/* DESKTOP VIEW - Table Layout */}
                    <Card className="hidden md:block shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-primary to-pink-600 dark:from-pink-600 dark:to-pink-700">
                        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
                          <span className="flex items-center gap-2">
                            <Award className="w-5 h-5" />
                            Keputusan FiveFive - Prize Per Game
                          </span>
                          {selectedGame && (
                            <Badge variant="secondary" className="text-sm bg-white/20 text-white border-white/30">
                              {formatDate(selectedGame.game_date)}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                                <TableHead className="font-bold text-gray-900 dark:text-white sticky left-0 bg-gray-100 dark:bg-gray-800 z-10 min-w-[150px] shadow-md">
                                  Nama Pemain
                                </TableHead>
                                
                                {/* Game 1 */}
                                <TableHead colSpan={3} className={`font-bold text-center border-l-2 ${getGameBorder(1)} bg-gradient-to-r ${getGameGradient(1)}`}>
                                  <div className="flex items-center justify-center gap-2 py-1">
                                    <span className="text-blue-700 dark:text-blue-300">🎯 Game 1</span>
                                  </div>
                                </TableHead>
                                
                                {/* Game 2 */}
                                <TableHead colSpan={3} className={`font-bold text-center border-l-2 ${getGameBorder(2)} bg-gradient-to-r ${getGameGradient(2)}`}>
                                  <div className="flex items-center justify-center gap-2 py-1">
                                    <span className="text-green-700 dark:text-green-300">🎯 Game 2</span>
                                  </div>
                                </TableHead>
                                
                                {/* Game 3 */}
                                <TableHead colSpan={3} className={`font-bold text-center border-l-2 ${getGameBorder(3)} bg-gradient-to-r ${getGameGradient(3)}`}>
                                  <div className="flex items-center justify-center gap-2 py-1">
                                    <span className="text-purple-700 dark:text-purple-300">🎯 Game 3</span>
                                  </div>
                                </TableHead>
                                
                                {/* Game 4 */}
                                <TableHead colSpan={3} className={`font-bold text-center border-l-2 ${getGameBorder(4)} bg-gradient-to-r ${getGameGradient(4)}`}>
                                  <div className="flex items-center justify-center gap-2 py-1">
                                    <span className="text-orange-700 dark:text-orange-300">🎯 Game 4</span>
                                  </div>
                                </TableHead>
                                
                                {/* Game 5 */}
                                <TableHead colSpan={3} className={`font-bold text-center border-l-2 ${getGameBorder(5)} bg-gradient-to-r ${getGameGradient(5)}`}>
                                  <div className="flex items-center justify-center gap-2 py-1">
                                    <span className="text-pink-700 dark:text-pink-300">🎯 Game 5</span>
                                  </div>
                                </TableHead>
                                
                                {/* Total */}
                                <TableHead className="font-bold text-center bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 border-l-2 border-yellow-300 dark:border-yellow-700 sticky right-0 z-10 shadow-md min-w-[120px]">
                                  <div className="flex items-center justify-center gap-2 py-1">
                                    <DollarSign className="w-4 h-4 text-yellow-700 dark:text-yellow-400" />
                                    <span className="text-yellow-800 dark:text-yellow-300">Total Prize</span>
                                  </div>
                                </TableHead>
                              </TableRow>
                              <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                                <TableHead className="sticky left-0 bg-gray-50 dark:bg-gray-800 z-10"></TableHead>
                                
                                {[1, 2, 3, 4, 5].map((gameNum) => (
                                  <>
                                    <TableHead className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">Rank</TableHead>
                                    <TableHead className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Score</TableHead>
                                    <TableHead className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Prize</TableHead>
                                  </>
                                ))}
                                
                                <TableHead className="sticky right-0 bg-yellow-50 dark:bg-yellow-900/20 z-10 border-l-2 border-yellow-300 dark:border-yellow-700"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {participants.map((participant, index) => (
                                <TableRow
                                  key={participant.member_id}
                                  className={`
                                    ${index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/30"}
                                    hover:bg-pink-50 dark:hover:bg-pink-800/20 transition-all duration-200 border-b border-gray-200 dark:border-gray-700
                                  `}
                                >
                                  <TableCell className="font-semibold text-gray-900 dark:text-white sticky left-0 bg-inherit z-10 shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-400 dark:text-gray-500 text-sm">#{index + 1}</span>
                                      {participant.username}
                                    </div>
                                  </TableCell>

                                  {[1, 2, 3, 4, 5].map((gameNum) => {
                                    const scoreKey = `game${gameNum}_score` as keyof FiveFiveParticipant;
                                    const rankKey = `game${gameNum}_rank` as keyof FiveFiveParticipant;
                                    const prizeKey = `game${gameNum}_prize` as keyof FiveFiveParticipant;
                                    
                                    return (
                                      <>
                                        <TableCell className="text-center text-lg border-l border-gray-200 dark:border-gray-700">
                                          {getRankDisplay(participant[rankKey] as number)}
                                        </TableCell>
                                        <TableCell className="text-center tabular-nums font-medium text-gray-700 dark:text-gray-300">
                                          {participant[scoreKey]}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                          {(participant[prizeKey] as number) > 0 ? (
                                            <span className="text-green-600 dark:text-green-400 font-semibold">
                                              {formatCurrency(participant[prizeKey] as number)}
                                            </span>
                                          ) : (
                                            <span className="text-gray-300 dark:text-gray-600">-</span>
                                          )}
                                        </TableCell>
                                      </>
                                    );
                                  })}

                                  <TableCell className="text-right font-bold tabular-nums bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 sticky right-0 z-10 shadow-lg border-l-2 border-yellow-300 dark:border-yellow-700">
                                    {participant.total_prize > 0 ? (
                                      <span className="text-yellow-700 dark:text-yellow-400 text-lg">
                                        {formatCurrency(participant.total_prize)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-500">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Summary Card */}
                    {participants.length > 0 && (
                      <Card className="shadow-xl border-2 border-yellow-300 dark:border-yellow-700 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-pink-800/20">
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 shadow-md">
                              <div className="p-3 rounded-full bg-yellow-200 dark:bg-yellow-800">
                                <Trophy className="w-8 h-8 text-yellow-700 dark:text-yellow-300" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Jumlah Hadiah Keseluruhan</p>
                                <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                                  {formatCurrency(participants.reduce((sum, p) => sum + p.total_prize, 0))}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 shadow-md">
                              <div className="p-3 rounded-full bg-red-200 dark:bg-pink-700">
                                <Award className="w-8 h-8 text-pink-600 dark:text-red-300" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Jumlah Peserta</p>
                                <p className="text-3xl font-bold text-primary dark:text-red-400">
                                  {participants.length} Players
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