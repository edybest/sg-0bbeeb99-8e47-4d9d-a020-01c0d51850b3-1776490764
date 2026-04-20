import React, { useState, useEffect } from "react";
import { MemberLayout } from "@/components/member/MemberLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/router";
import { Trophy, Users, Medal, TrendingUp, ArrowLeft, ArrowUp, ArrowDown, Calendar } from "lucide-react";
import Link from "next/link";
import { getTrioEnabledGames, getAllTrioRecordsByGame } from "@/services/trioService";
import { getGamesByDate } from "@/services/gameService";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";
import { Crown, Zap, Star } from "lucide-react";

type Member = Database["public"]["Tables"]["members"]["Row"];
type Game = Database["public"]["Tables"]["games"]["Row"];

interface TrioTeam {
  id: string;
  rank: number;
  teamName: string;
  playerA: string;
  playerAId: string;
  playerB: string;
  playerBId: string;
  playerC: string;
  playerCId: string;
  scoreA: number;
  scoreB: number;
  scoreC: number;
  totalScore: number;
  averageScore: number;
}

export default function TrioPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { date } = router.query;

  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [trios, setTrios] = useState<TrioRecordWithPlayers[]>([]);
  const [sortedTrios, setSortedTrios] = useState<TrioRecordWithPlayers[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (router.query.date) {
      setSelectedDate(router.query.date as string);
    }
  }, [router.query]);

  useEffect(() => {
    if (selectedDate) {
      loadTrioData();
    }
  }, [selectedDate]);

  useEffect(() => {
    // Sort trios by total_score descending
    const sorted = [...trios].sort((a, b) => {
      const scoreA = a.total_score || 0;
      const scoreB = b.total_score || 0;
      return scoreB - scoreA;
    });
    setSortedTrios(sorted);
  }, [trios]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load trio-enabled games
      const trioGames = await getTrioEnabledGames();
      setGames(trioGames);
      
      // If date from URL, use it, otherwise use first game
      if (router.query.date) {
        setSelectedDate(router.query.date as string);
      } else if (trioGames.length > 0) {
        setSelectedDate(trioGames[0].game_date);
      }
    } catch (error) {
      console.error("Error loading games:", error);
      toast({
        title: "Error",
        description: "Gagal memuatkan data games",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadTrioData() {
    if (!selectedDate) return;

    try {
      setLoading(true);
      
      // Find game for this date
      const game = games.find(g => g.game_date === selectedDate);
      if (!game) {
        setTrioTeams([]);
        return;
      }
      
      // Get trio records for this game
      const trioRecords = await getAllTrioRecordsByGame(game.id);
      
      // Get all player scores from game_players table
      const { data: gamePlayers, error: scoresError } = await supabase
        .from("game_players")
        .select("member_id, overall_score")
        .eq("game_id", game.id);
      
      if (scoresError) {
        console.error("Error fetching scores:", scoresError);
        throw scoresError;
      }
      
      // Calculate trio teams with real scores
      const teams: TrioTeam[] = [];
      
      for (const trio of trioRecords) {
        if (!trio.player1 || !trio.player2 || !trio.player3) continue;
        
        // Get overall_score for each player from game_players
        const playerAScore = gamePlayers?.find(gp => gp.member_id === trio.player1!.id);
        const playerBScore = gamePlayers?.find(gp => gp.member_id === trio.player2!.id);
        const playerCScore = gamePlayers?.find(gp => gp.member_id === trio.player3!.id);
        
        const scoreA = playerAScore?.overall_score || 0;
        const scoreB = playerBScore?.overall_score || 0;
        const scoreC = playerCScore?.overall_score || 0;
        
        const totalScore = scoreA + scoreB + scoreC;
        const averageScore = Math.round((totalScore / 3) * 100) / 100; // Round to 2 decimals
        
        teams.push({
          id: trio.id,
          rank: 0, // Will be calculated after sorting
          teamName: trio.player1.username,
          playerA: trio.player1.username,
          playerAId: trio.player1.id,
          playerB: trio.player2.username,
          playerBId: trio.player2.id,
          playerC: trio.player3.username,
          playerCId: trio.player3.id,
          scoreA,
          scoreB,
          scoreC,
          totalScore,
          averageScore,
        });
      }
      
      // Sort by total score (highest first) and assign ranks
      teams.sort((a, b) => b.totalScore - a.totalScore);
      teams.forEach((team, index) => {
        team.rank = index + 1;
      });
      
      setTrioTeams(teams);
    } catch (error) {
      console.error("Error loading trio data:", error);
      toast({
        title: "Error",
        description: "Gagal memuatkan data trio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function getRankIcon(index: number) {
    if (index === 0) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600" />;
    return <Star className="w-5 h-5 text-slate-400" />;
  }

  function getRankBadgeColor(index: number) {
    if (index === 0) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
    if (index === 1) return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
    if (index === 2) return "bg-gradient-to-r from-amber-500 to-amber-700 text-white";
    return "bg-slate-200 text-slate-700";
  }

  function getCardBorderColor(index: number) {
    if (index === 0) return "border-yellow-400 ring-2 ring-yellow-400 shadow-xl shadow-yellow-100";
    if (index === 1) return "border-gray-400 ring-2 ring-gray-300 shadow-lg shadow-gray-100";
    if (index === 2) return "border-amber-500 ring-2 ring-amber-400 shadow-lg shadow-amber-100";
    return "border-slate-200";
  }

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Hero Header */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('/bowling-pattern.svg')] opacity-10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Trophy className="w-12 h-12 text-yellow-300 animate-pulse" />
              <h1 className="text-5xl font-black tracking-tight drop-shadow-lg">TRIO LEADERBOARD</h1>
              <Trophy className="w-12 h-12 text-yellow-300 animate-pulse" />
            </div>
            <p className="text-center text-xl text-indigo-100 font-medium">
              Pasukan Trio Terbaik - Battle Royale Edition
            </p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -top-8 -left-8 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Game Selection */}
        <Card className="p-6 mb-8 border-2 border-indigo-100 shadow-lg bg-gradient-to-r from-white to-indigo-50">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Pilih Tarikh Game</h2>
          </div>
          <Select value={selectedGameId} onValueChange={setSelectedGameId}>
            <SelectTrigger className="w-full bg-white text-lg h-14 border-indigo-200 focus:ring-indigo-500">
              <SelectValue placeholder="Pilih game untuk lihat leaderboard" />
            </SelectTrigger>
            <SelectContent>
              {games.map((game) => (
                <SelectItem key={game.id} value={game.id} className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    {new Date(game.game_date).toLocaleDateString("ms-MY", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })} - {game.game_name || "Game"}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Leaderboard */}
        {games.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 shadow-lg">
            <Trophy className="w-20 h-20 mx-auto mb-4 text-slate-300" />
            <h3 className="text-2xl font-bold mb-2">Tiada Game Trio</h3>
            <p className="text-muted-foreground">Belum ada game dengan Trio Mode diaktifkan.</p>
          </Card>
        ) : sortedTrios.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 shadow-lg">
            <Users className="w-20 h-20 mx-auto mb-4 text-slate-300" />
            <h3 className="text-2xl font-bold mb-2">Tiada Pasukan Trio</h3>
            <p className="text-muted-foreground">Belum ada pasukan trio untuk game ini.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Top 3 Podium */}
            {sortedTrios.slice(0, 3).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* 2nd Place */}
                {sortedTrios[1] && (
                  <Card className="p-6 border-2 border-gray-400 bg-gradient-to-br from-gray-50 to-gray-100 shadow-xl transform hover:scale-105 transition-all duration-300">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-300 rounded-full mb-3 shadow-lg">
                        <Medal className="w-10 h-10 text-gray-600" />
                      </div>
                      <div className="text-6xl font-black text-gray-600 mb-2">2</div>
                      <Badge className="bg-gray-400 text-white text-sm px-3 py-1">SILVER</Badge>
                    </div>
                    <div className="space-y-2 text-center">
                      <div className="text-sm font-semibold text-gray-600">Player A</div>
                      <div className="text-xl font-bold text-gray-900">{sortedTrios[1].player1?.username}</div>
                      <div className="text-xs text-gray-500 mb-2">Player B: {sortedTrios[1].player2?.username} • Player C: {sortedTrios[1].player3?.username}</div>
                      <div className="flex items-center justify-center gap-2 mt-4 bg-white/70 rounded-lg p-3">
                        <TrendingUp className="w-5 h-5 text-gray-600" />
                        <span className="text-3xl font-black text-gray-700">{sortedTrios[1].total_score || 0}</span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* 1st Place */}
                {sortedTrios[0] && (
                  <Card className="p-8 border-4 border-yellow-400 bg-gradient-to-br from-yellow-50 via-yellow-100 to-amber-100 shadow-2xl transform md:-translate-y-4 hover:scale-105 transition-all duration-300">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mb-3 shadow-2xl animate-pulse">
                        <Crown className="w-12 h-12 text-white" />
                      </div>
                      <div className="text-7xl font-black text-yellow-600 mb-2 drop-shadow-lg">1</div>
                      <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-base px-4 py-1.5 shadow-lg">CHAMPION 🏆</Badge>
                    </div>
                    <div className="space-y-3 text-center">
                      <div className="text-sm font-bold text-yellow-700 uppercase tracking-wider">Player A</div>
                      <div className="text-2xl font-black text-yellow-900">{sortedTrios[0].player1?.username}</div>
                      <div className="text-sm text-yellow-700 mb-3">Player B: {sortedTrios[0].player2?.username} • Player C: {sortedTrios[0].player3?.username}</div>
                      <div className="flex items-center justify-center gap-2 mt-4 bg-white/80 rounded-xl p-4 shadow-lg">
                        <Zap className="w-6 h-6 text-yellow-600" />
                        <span className="text-4xl font-black text-yellow-700">{sortedTrios[0].total_score || 0}</span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* 3rd Place */}
                {sortedTrios[2] && (
                  <Card className="p-6 border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 shadow-xl transform hover:scale-105 transition-all duration-300">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-400 rounded-full mb-3 shadow-lg">
                        <Medal className="w-10 h-10 text-amber-700" />
                      </div>
                      <div className="text-6xl font-black text-amber-700 mb-2">3</div>
                      <Badge className="bg-amber-500 text-white text-sm px-3 py-1">BRONZE</Badge>
                    </div>
                    <div className="space-y-2 text-center">
                      <div className="text-sm font-semibold text-amber-700">Player A</div>
                      <div className="text-xl font-bold text-amber-900">{sortedTrios[2].player1?.username}</div>
                      <div className="text-xs text-amber-700 mb-2">Player B: {sortedTrios[2].player2?.username} • Player C: {sortedTrios[2].player3?.username}</div>
                      <div className="flex items-center justify-center gap-2 mt-4 bg-white/70 rounded-lg p-3">
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                        <span className="text-3xl font-black text-amber-700">{sortedTrios[2].total_score || 0}</span>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Rest of Rankings */}
            {sortedTrios.slice(3).map((trio, idx) => {
              const actualIndex = idx + 3;
              return (
                <Card
                  key={trio.id}
                  className={`p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2 ${getCardBorderColor(actualIndex)}`}
                >
                  <div className="flex items-center gap-6">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0">
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${getRankBadgeColor(actualIndex)} shadow-lg`}>
                        <span className="text-3xl font-black">{actualIndex + 1}</span>
                      </div>
                    </div>

                    {/* Team Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getRankIcon(actualIndex)}
                        <h3 className="text-2xl font-black text-slate-900 truncate">
                          {trio.player1?.username || "Unknown"}
                        </h3>
                        <Badge variant="outline" className="text-xs">Player A</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-slate-600">Player B:</span>
                          <span className="font-semibold text-slate-900">{trio.player2?.username || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-slate-600">Player C:</span>
                          <span className="font-semibold text-slate-900">{trio.player3?.username || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-semibold text-slate-600 mb-1">Total Score</div>
                      <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        <span className="text-3xl font-black text-slate-900">{trio.total_score || 0}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push("/member")}
            className="px-8 py-6 text-lg font-bold border-2 hover:bg-indigo-50 hover:border-indigo-300"
          >
            ← Kembali ke Dashboard
          </Button>
        </div>
      </div>
    </MemberLayout>
  );
}