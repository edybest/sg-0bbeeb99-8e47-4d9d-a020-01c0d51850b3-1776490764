import { useState, useEffect, useRef } from "react";
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
import { Trophy, Calendar, TrendingUp, ArrowLeft, Award, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { MemberLayout } from "@/components/member/MemberLayout";
import { fivefiveService } from "@/services/fivefiveService";

type Member = Tables<"members">;
type Game = Tables<"games">;

interface FiveFiveParticipant {
  member_id: string;
  username: string;
  // handicap info
  handicap: number;
  per_game_handicap: number;
  // raw scores (before handicap)
  raw_game1_score: number;
  raw_game2_score: number;
  raw_game3_score: number;
  raw_game4_score: number;
  raw_game5_score: number;
  // adjusted scores (after handicap)
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

// Default prize structure for Five-Five per game (can be adjusted later)
const FIVE_FIVE_GAME_PRIZES: number[] = [50, 30, 20, 10, 5];

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
          handicap,
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

      // Fetch dynamic prize configuration based on the number of players
      let gamePrizes: number[] = [];
      try {
        const prizeConfig = await fivefiveService.getPrizeConfiguration(playersData.length);
        if (prizeConfig && prizeConfig.prizes) {
          gamePrizes = prizeConfig.prizes;
        }
      } catch (e) {
        console.error("Error loading prize config, using empty fallback", e);
      }

      const participantsWithRankings: FiveFiveParticipant[] = playersData.map((player) => {
        const memberHandicap = player.handicap ?? 0;
        const perGameHandicap = memberHandicap > 0 ? Math.floor(memberHandicap / 5) : 0;

        const rawGame1 = player.game1_score || 0;
        const rawGame2 = player.game2_score || 0;
        const rawGame3 = player.game3_score || 0;
        const rawGame4 = player.game4_score || 0;
        const rawGame5 = player.game5_score || 0;

        return {
          member_id: player.member_id,
          username: player.members?.username || "Unknown",
          handicap: memberHandicap,
          per_game_handicap: perGameHandicap,
          raw_game1_score: rawGame1,
          raw_game2_score: rawGame2,
          raw_game3_score: rawGame3,
          raw_game4_score: rawGame4,
          raw_game5_score: rawGame5,
          game1_score: rawGame1 + perGameHandicap,
          game2_score: rawGame2 + perGameHandicap,
          game3_score: rawGame3 + perGameHandicap,
          game4_score: rawGame4 + perGameHandicap,
          game5_score: rawGame5 + perGameHandicap,
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
        };
      });

      for (let gameNum = 1; gameNum <= 5; gameNum++) {
        const scoreKey = `game${gameNum}_score` as keyof FiveFiveParticipant;
        const rankKey = `game${gameNum}_rank` as keyof FiveFiveParticipant;
        const prizeKey = `game${gameNum}_prize` as keyof FiveFiveParticipant;

        const sortedByGame = [...participantsWithRankings].sort(
          (a, b) => (b[scoreKey] as number) - (a[scoreKey] as number)
        );

        const scoreGroups: { score: number; players: FiveFiveParticipant[] }[] = [];
        
        sortedByGame.forEach((player) => {
          const score = player[scoreKey] as number;
          const lastGroup = scoreGroups[scoreGroups.length - 1];
          if (lastGroup && lastGroup.score === score) {
            lastGroup.players.push(player);
          } else {
            scoreGroups.push({ score, players: [player] });
          }
        });

        let currentRankOffset = 0;

        scoreGroups.forEach((group) => {
          const numPlayers = group.players.length;
          const rankForGroup = currentRankOffset + 1;
          
          let totalPrizeForGroup = 0;
          for (let i = 0; i < numPlayers; i++) {
            const prizeIndex = currentRankOffset + i;
            if (prizeIndex < gamePrizes.length) {
              totalPrizeForGroup += gamePrizes[prizeIndex];
            }
          }
          
          const exactPrizePerPlayer = numPlayers > 0 ? totalPrizeForGroup / numPlayers : 0;
          // Bundarkan ke RM0.50 terdekat ke bawah (cth: 45.33 -> 45.00, 45.83 -> 45.50)
          const prizePerPlayer = Math.floor(exactPrizePerPlayer * 2) / 2;

          group.players.forEach((player) => {
            const originalPlayer = participantsWithRankings.find((p) => p.member_id === player.member_id);
            if (originalPlayer) {
              (originalPlayer[rankKey] as number) = rankForGroup;
              (originalPlayer[prizeKey] as number) = prizePerPlayer;
            }
          });

          currentRankOffset += numPlayers;
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

      participantsWithRankings.sort((a, b) => {
        if (b.total_prize !== a.total_prize) return b.total_prize - a.total_prize;
        
        const totalA = a.game1_score + a.game2_score + a.game3_score + a.game4_score + a.game5_score;
        const totalB = b.game1_score + b.game2_score + b.game3_score + b.game4_score + b.game5_score;
        if (totalA !== totalB) return totalB - totalA;
        
        if (a.game5_score !== b.game5_score) return b.game5_score - a.game5_score;
        if (a.game4_score !== b.game4_score) return b.game4_score - a.game4_score;
        if (a.game3_score !== b.game3_score) return b.game3_score - a.game3_score;
        if (a.game2_score !== b.game2_score) return b.game2_score - a.game2_score;
        return b.game1_score - a.game1_score;
      });

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

  // Auth loading state is handled by PageAccessGuard; we do not block the whole page here.

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
      "from-blue-500/10 to-blue-600/10  ",
      "from-green-500/10 to-green-600/10  ",
      "from-purple-500/10 to-purple-600/10  ",
      "from-orange-500/10 to-orange-600/10  ",
      "from-pink-500/10 to-pink-600/10  ", // kept for distinction
    ];
    return gradients[gameNum - 1] || gradients[0];
  };

  const getGameBorder = (gameNum: number) => {
    const borders = [
      "border-blue-200 ",
      "border-green-200 ",
      "border-purple-200 ",
      "border-orange-200 ",
      "border-pink-200 ", // kept for distinction
    ];
    return borders[gameNum - 1] || borders[0];
  };

  const getGameBadgeColor = (gameNum: number) => {
    const colors = [
      "bg-blue-100 text-blue-700  ",
      "bg-green-100 text-green-700  ",
      "bg-purple-100 text-purple-700  ",
      "bg-orange-100 text-orange-700  ",
      "bg-pink-100 text-pink-700  ", // kept for distinction
    ];
    return colors[gameNum - 1] || colors[0];
  };

  return (
    <PageAccessGuard
      pagePath="/member/five-five"
      requireAuth={true}
      renderLoading={() => null}
    >
      <MemberLayout>
        <>
          <SEO title="FiveFive - AMBC Club" />
          <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
            <main className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
              {loadingData && !selectedGameId ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-64 w-full rounded-xl" />
                </div>
              ) : games.length === 0 ? (
                <Alert className="border-amber-200 bg-amber-50  ">
                  <AlertDescription className="text-amber-900 ">
                    Tiada data FiveFive tersedia. Sila hubungi admin untuk maklumat lanjut.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {/* Game Selector Card */}
                  <Card className="shadow-lg border-2 border-sky-100 bg-gradient-to-br from-white to-sky-50/30">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-sky-900">
                          <Calendar className="w-5 h-5 text-sky-600" />
                          Pilih Tarikh Game
                        </CardTitle>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                            <SelectTrigger className="w-full sm:w-72 border-2 hover:border-sky-300 transition-colors">
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
                    <Alert className="border-amber-200 bg-amber-50  ">
                      <AlertDescription className="text-amber-900 ">
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
                              className="shadow-lg border-2 border-sky-200 overflow-hidden"
                            >
                              {/* Card Header - Always Visible */}
                              <div 
                                className="p-4 bg-gradient-to-r from-sky-50 to-blue-50 cursor-pointer hover:bg-sky-100 transition-colors"
                                onClick={() => toggleCard(participant.member_id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-xs border-sky-300 text-sky-700 bg-white">
                                        #{index + 1}
                                      </Badge>
                                      <h3 className="font-bold text-sky-900 text-lg">
                                        {participant.username}
                                      </h3>
                                    </div>

                                    {participant.handicap > 0 && (
                                      <p className="text-xs text-sky-700 mb-2">
                                        Handicap:{" "}
                                        <span className="font-semibold">
                                          {participant.handicap}
                                        </span>{" "}
                                        (
                                        <span className="font-semibold">
                                          +{participant.per_game_handicap}
                                        </span>{" "}
                                        / game)
                                      </p>
                                    )}

                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-5 h-5 text-yellow-600" />
                                      <span className="text-2xl font-bold text-yellow-700 ">
                                        {formatCurrency(participant.total_prize)}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-sky-600"
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
                                <CardContent className="p-4 space-y-3 bg-white">
                                  {[1, 2, 3, 4, 5].map((gameNum) => {
                                    const rawKey = `raw_game${gameNum}_score` as keyof FiveFiveParticipant;
                                    const scoreKey = `game${gameNum}_score` as keyof FiveFiveParticipant;
                                    const rankKey = `game${gameNum}_rank` as keyof FiveFiveParticipant;
                                    const prizeKey = `game${gameNum}_prize` as keyof FiveFiveParticipant;
                                    
                                    const rawScore = participant[rawKey] as number;
                                    const finalScore = participant[scoreKey] as number;
                                    const addedHcp = participant.per_game_handicap;

                                    return (
                                      <div
                                        key={gameNum}
                                        className={`p-3 rounded-lg border-2 bg-gradient-to-r ${getGameGradient(gameNum)} ${getGameBorder(gameNum)}`}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <Badge className={getGameBadgeColor(gameNum)}>
                                            🎯 Game {gameNum}
                                          </Badge>
                                          <span className="text-2xl drop-shadow-sm">
                                            {getRankDisplay(participant[rankKey] as number)}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
                                          <div>
                                            <p className="text-[10px] uppercase tracking-wide text-sky-600">
                                              Score Asal
                                            </p>
                                            <p className="text-base font-semibold text-sky-900">
                                              {rawScore}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] uppercase tracking-wide text-sky-600">
                                              Handicap / Game
                                            </p>
                                            <p className="text-base font-semibold text-sky-900">
                                              +{addedHcp}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] uppercase tracking-wide text-sky-600">
                                              Score Akhir
                                            </p>
                                            <p className="text-base font-bold text-sky-900">
                                              {finalScore}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="mt-2 flex justify-between items-center">
                                          <p className="text-[10px] uppercase tracking-wide text-sky-600">
                                            Prize
                                          </p>
                                          <p className="text-sm font-bold text-emerald-600">
                                            {(participant[prizeKey] as number) > 0
                                              ? formatCurrency(participant[prizeKey] as number)
                                              : "-"}
                                          </p>
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
                      <Card className="hidden md:block shadow-xl border-2 border-sky-200 overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-sky-600 to-blue-600">
                          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
                            <span className="flex items-center gap-2">
                              <Award className="w-5 h-5" />
                              Keputusan FiveFive - Prize Per Game
                            </span>
                            {selectedGame && (
                              <Badge variant="secondary" className="text-sm bg-white/20 text-white border-white/30 hover:bg-white/30">
                                {formatDate(selectedGame.game_date)}
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 bg-white">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-sky-300">
                                  <TableHead className="font-bold text-sky-900 sticky left-0 bg-sky-100 z-10 min-w-[150px] shadow-md">
                                    Nama Pemain
                                  </TableHead>
                                  
                                  {/* Game 1 */}
                                  <TableHead colSpan={3} className={`font-bold text-center border-l-2 ${getGameBorder(1)} bg-gradient-to-r ${getGameGradient(1)}`}>
                                    <div className="flex items-center justify-center gap-2 py-1">
                                      <span className="text-blue-700 ">🎯 Game 1</span>
                                    </div>
                                  </TableHead>
                                  
                                  {/* Game 2 */}
                                  <TableHead colSpan={3} className={`font-bold text-center border-l-2 ${getGameBorder(2)} bg-gradient-to-r ${getGameGradient(2)}`}>
                                    <div className="flex items-center justify-center gap-2 py-1">
                                      <span className="text-green-700 ">🎯 Game 2</span>
                                    </div>
                                  </TableHead>
                                  
                                  {/* Game 3 */}
                                  <TableHead colSpan={3} className={`font-bold text-center border-l-2 ${getGameBorder(3)} bg-gradient-to-r ${getGameGradient(3)}`}>
                                    <div className="flex items-center justify-center gap-2 py-1">
                                      <span className="text-purple-700 ">🎯 Game 3</span>
                                    </div>
                                  </TableHead>
                                  
                                  {/* Game 4 */}
                                  <TableHead colSpan={3} className={`font-bold text-center border-l-2 ${getGameBorder(4)} bg-gradient-to-r ${getGameGradient(4)}`}>
                                    <div className="flex items-center justify-center gap-2 py-1">
                                      <span className="text-orange-700 ">🎯 Game 4</span>
                                    </div>
                                  </TableHead>
                                  
                                  {/* Game 5 */}
                                  <TableHead colSpan={3} className={`font-bold text-center border-l-2 ${getGameBorder(5)} bg-gradient-to-r ${getGameGradient(5)}`}>
                                    <div className="flex items-center justify-center gap-2 py-1">
                                      <span className="text-pink-700 ">🎯 Game 5</span>
                                    </div>
                                  </TableHead>
                                  
                                  {/* Total */}
                                  <TableHead className="font-bold text-center bg-gradient-to-r from-yellow-100 to-yellow-200 border-l-2 border-yellow-300 sticky right-0 z-10 shadow-md min-w-[120px]">
                                    <div className="flex items-center justify-center gap-2 py-1">
                                      <DollarSign className="w-4 h-4 text-yellow-700 " />
                                      <span className="text-yellow-800 ">Total Prize</span>
                                    </div>
                                  </TableHead>
                                </TableRow>
                                <TableRow className="bg-sky-50/50">
                                  <TableHead className="sticky left-0 bg-sky-50 z-10"></TableHead>
                                  
                                  {[1, 2, 3, 4, 5].map((gameNum) => (
                                    <>
                                      <TableHead className="text-center text-xs font-semibold text-sky-600 border-l border-sky-200">Rank</TableHead>
                                      <TableHead className="text-center text-xs font-semibold text-sky-600">Score</TableHead>
                                      <TableHead className="text-right text-xs font-semibold text-sky-600">Prize</TableHead>
                                    </>
                                  ))}
                                  
                                  <TableHead className="sticky right-0 bg-yellow-50 z-10 border-l-2 border-yellow-300 "></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {participants.map((participant, index) => (
                                  <TableRow
                                    key={participant.member_id}
                                    className={`
                                      ${index % 2 === 0 ? "bg-white " : "bg-sky-50/30 "}
                                      hover:bg-blue-50 transition-all duration-200 border-b border-sky-200
                                    `}
                                  >
                                    <TableCell className="font-semibold text-sky-900 sticky left-0 bg-inherit z-10 shadow-sm border-r border-sky-100">
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sky-400 text-sm">#{index + 1}</span>
                                          <span>{participant.username}</span>
                                        </div>
                                        {participant.handicap > 0 && (
                                          <span className="text-[11px] text-sky-600">
                                            HC: {participant.handicap} (+{participant.per_game_handicap}/gm)
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>

                                    {[1, 2, 3, 4, 5].map((gameNum) => {
                                      const scoreKey = `game${gameNum}_score` as keyof FiveFiveParticipant;
                                      const rankKey = `game${gameNum}_rank` as keyof FiveFiveParticipant;
                                      const prizeKey = `game${gameNum}_prize` as keyof FiveFiveParticipant;
                                      
                                      return (
                                        <>
                                          <TableCell className="text-center text-lg border-l border-sky-200 bg-white/50">
                                            {getRankDisplay(participant[rankKey] as number)}
                                          </TableCell>
                                          <TableCell className="text-center tabular-nums font-medium text-sky-700 bg-white/50">
                                            {participant[scoreKey]}
                                          </TableCell>
                                          <TableCell className="text-right tabular-nums bg-white/50">
                                            {(participant[prizeKey] as number) > 0 ? (
                                              <span className="text-emerald-600 font-semibold">
                                                {formatCurrency(participant[prizeKey] as number)}
                                              </span>
                                            ) : (
                                              <span className="text-gray-300 ">-</span>
                                            )}
                                          </TableCell>
                                        </>
                                      );
                                    })}

                                    <TableCell className="text-right font-bold tabular-nums bg-gradient-to-r from-yellow-50 to-yellow-100 sticky right-0 z-10 shadow-lg border-l-2 border-yellow-300">
                                      {participant.total_prize > 0 ? (
                                        <span className="text-yellow-700 text-lg">
                                          {formatCurrency(participant.total_prize)}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 ">-</span>
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
                        <Card className="shadow-xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 via-sky-50 to-blue-50">
                          <CardContent className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/60 shadow-md">
                                <div className="p-3 rounded-full bg-yellow-200 ">
                                  <Trophy className="w-8 h-8 text-yellow-700 " />
                                </div>
                                <div>
                                  <p className="text-sm text-sky-600 font-medium">Jumlah Hadiah Keseluruhan</p>
                                  <p className="text-3xl font-bold text-yellow-700 ">
                                    {formatCurrency(participants.reduce((sum, p) => sum + p.total_prize, 0))}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/60 shadow-md">
                                <div className="p-3 rounded-full bg-blue-200">
                                  <Award className="w-8 h-8 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm text-sky-600 font-medium">Jumlah Peserta</p>
                                  <p className="text-3xl font-bold text-blue-600">
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
            </main>
          </div>
        </>
      </MemberLayout>
    </PageAccessGuard>
  );
}