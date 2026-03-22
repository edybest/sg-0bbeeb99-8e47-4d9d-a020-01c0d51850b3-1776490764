import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, TrendingUp, Target, Award, Loader2, BarChart3, TrendingDown, AlertCircle } from "lucide-react";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { MemberLayout } from "@/components/member/MemberLayout";

type PlayerStats = {
  member_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  sex: string | null;
  birthday: string | null;
  recent_games: {
    game_name: string;
    game_date: string;
    average_score: number;
  }[];
  average_of_3: number;
  calculated_handicap: number;
};

export default function AverageScorePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingData, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<"username" | "score">("score");

  useEffect(() => {
    loadPlayerStats();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [searchQuery, players]);

  async function loadPlayerStats() {
    try {
      setLoading(true);

      // Single joined query: get all non-admin members' official Blok games
      const { data, error } = await supabase
        .from("game_players")
        .select(`
          member_id,
          average_score,
          games!inner (
            game_name,
            game_date,
            game_type
          ),
          members!inner (
            id,
            username,
            full_name,
            avatar_url,
            sex,
            birthday,
            is_admin
          )
        `)
        .eq("games.game_type", "Blok Rasmi 10 PIN")
        .eq("members.is_admin", false);

      if (error) {
        console.error("AverageScore - game_players joined fetch error:", error);
        throw error;
      }

      type Row = {
        member_id: string;
        average_score: number | null;
        games: {
          game_name: string;
          game_date: string;
          game_type: string;
        } | null;
        members: {
          id: string;
          username: string;
          full_name: string;
          avatar_url: string | null;
          sex: string | null;
          birthday: string | null;
          is_admin: boolean | null;
        } | null;
      };

      const statsMap = new Map<string, PlayerStats>();

      (data as Row[] | null | undefined || []).forEach((row) => {
        const member = row.members;
        const game = row.games;

        if (!member || !game) return;

        // Defensive: skip admin if any slip through
        if (member.is_admin) return;

        let player = statsMap.get(member.id);
        if (!player) {
          player = {
            member_id: member.id,
            username: member.username,
            full_name: member.full_name,
            avatar_url: member.avatar_url,
            sex: member.sex,
            birthday: member.birthday,
            recent_games: [],
            average_of_3: 0,
            calculated_handicap: 0,
          };
          statsMap.set(member.id, player);
        }

        player.recent_games.push({
          game_name: game.game_name,
          game_date: game.game_date,
          average_score: row.average_score ?? 0,
        });
      });

      const stats: PlayerStats[] = Array.from(statsMap.values()).map((player) => {
        const sortedGames = [...player.recent_games].sort((a, b) => {
          const dateA = new Date(a.game_date).getTime();
          const dateB = new Date(b.game_date).getTime();
          return dateB - dateA;
        }).slice(0, 3);

        const avgOf3 =
          sortedGames.length > 0
            ? Math.round(
                sortedGames.reduce((sum, g) => sum + g.average_score, 0) /
                  sortedGames.length
              )
            : 0;

        const handicap = calculateHandicap(
          { sex: player.sex, birthday: player.birthday } as any,
          sortedGames as any[],
          avgOf3
        );

        return {
          ...player,
          recent_games: sortedGames,
          average_of_3: avgOf3,
          calculated_handicap: handicap,
        };
      });

      // Sort by average score (highest first)
      stats.sort((a, b) => b.average_of_3 - a.average_of_3);

      setPlayers(stats);
      setFilteredPlayers(stats);
    } catch (error) {
      console.error("Load stats error:", error);
    } finally {
      setLoading(false);
    }
  }

  function calculateHandicap(
    member: any,
    recentGames: any[],
    avgScore: number
  ): number {
    const isFemale = member.sex === "Perempuan";
    const age = member.birthday 
      ? new Date().getFullYear() - new Date(member.birthday).getFullYear()
      : 0;
    const isUnder15 = age < 15;

    // Not enough games
    if (recentGames.length < 3) {
      return isFemale ? 25 : 0; // Female bowlers get max 25 hcp
    }

    // Check if last game was more than 1 month ago
    const lastGameDate = new Date(recentGames[0].game_date);
    const monthsAgo = Math.floor(
      (Date.now() - lastGameDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    if (monthsAgo > 1) {
      return isFemale ? 25 : 0; // Reset to 0, except females get 25
    }

    // Calculate handicap: (200 - average) * 0.8
    const baseHandicap = Math.max(0, Math.round((200 - avgScore) * 0.8));

    // Under 15 gets minimum 15 hcp
    if (isUnder15 && baseHandicap < 15) {
      return 15;
    }

    // Female max 25 hcp
    if (isFemale && baseHandicap > 25) {
      return 25;
    }

    return baseHandicap;
  }

  function filterPlayers() {
    let filtered = players;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = players.filter(
        (p) =>
          p.username.toLowerCase().includes(query) ||
          p.full_name.toLowerCase().includes(query)
      );
    }

    // Apply sorting based on sortMode
    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "username") {
        return a.username.localeCompare(b.username); // A to Z
      }
      // Default: sort by score (highest first)
      return b.average_of_3 - a.average_of_3;
    });

    setFilteredPlayers(sorted);
  }

  return (
    <PageAccessGuard
      pagePath="/member/average-score"
      requireAuth={true}
      renderLoading={() => null}
    >
      <MemberLayout>
        <SEO title="Average Score - AMBC Club" description="Statistik purata skor ahli" />
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <Link href="/member">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-lg font-bold">Average Score</h1>
                  <p className="text-xs text-muted-foreground">Purata & Handicap</p>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="container mx-auto px-4 py-6">
            {/* Search Bar */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari pemain..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sort Mode Toggle */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Button
                    variant={sortMode === "score" ? "default" : "outline"}
                    onClick={() => setSortMode("score")}
                    className={sortMode === "score" ? "bg-pink-600 hover:bg-pink-700" : ""}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Skor
                  </Button>
                  <Button
                    variant={sortMode === "username" ? "default" : "outline"}
                    onClick={() => setSortMode("username")}
                    className={sortMode === "username" ? "bg-pink-600 hover:bg-pink-700" : ""}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Username
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="mb-6 bg-pink-50 border-pink-200">
              <CardHeader>
                <CardTitle className="text-sm">Nota Handicap</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-rose-700 space-y-1">
                <p>• Dikira berdasarkan 3 blok terakhir (Blok Rasmi 10 PIN sahaja)</p>
                <p>• Belum cukup 3 kali: 0 hcp (perempuan: 25 hcp)</p>
                <p>• Bawah umur 15: minimum 15 hcp</p>
                <p>• Bawah umur 15: minimum 15 hcp</p>
                <p>• Lebih 1 bulan tidak join: 0 hcp (perempuan: 25 hcp)</p>
                <p>• Formula: (200 - purata) × 0.8</p>
              </CardContent>
            </Card>

            {/* Player Stats */}
            {loadingData ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
              </div>
            ) : filteredPlayers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-rose-500">
                  Tiada pemain dijumpai
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPlayers.map((player, index) => (
                  <Card
                    key={player.member_id}
                    className="transform transition-all hover:scale-[1.01] hover:shadow-lg"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Rank */}
                        <div className="text-center min-w-[40px]">
                          <span className="text-xl font-bold text-rose-700">#{index + 1}</span>
                        </div>

                        {/* Avatar & Name */}
                        <Link href={`/member/profile?id=${player.member_id}`} className="flex-shrink-0">
                          {player.avatar_url ? (
                            <Image
                              src={player.avatar_url}
                              alt={player.username}
                              width={48}
                              height={48}
                              className="rounded-full border-2 border-blue-600"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold text-lg">
                              {player.username[0].toUpperCase()}
                            </div>
                          )}
                        </Link>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <Link href={`/member/profile?id=${player.member_id}`}>
                            <h3 className="font-bold hover:text-pink-600 transition-colors truncate">
                              {player.full_name}
                            </h3>
                            <p className="text-sm text-rose-600">@{player.username}</p>
                          </Link>

                          {/* Recent 3 Games */}
                          <div className="mt-3 space-y-2">
                            {player.recent_games.length > 0 ? (
                              player.recent_games.map((game, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-rose-50 rounded p-2">
                                  <span className="text-rose-600 truncate mr-2">{game.game_name}</span>
                                  <Badge variant="outline">{game.average_score}</Badge>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-rose-500 italic">Belum join game</p>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="text-right space-y-2">
                          <div>
                            <p className="text-xs text-rose-500">Avg 3 Games</p>
                            <p className="text-2xl font-bold text-pink-600">
                              {player.average_of_3}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-rose-500">Handicap</p>
                            <Badge className="bg-green-600 text-white">
                              {player.calculated_handicap}
                            </Badge>
                          </div>
                          {player.recent_games.length >= 2 && (
                            <div className="flex items-center justify-end gap-1 text-xs">
                              {player.recent_games[0].average_score > player.recent_games[1].average_score ? (
                                <>
                                  <TrendingUp className="h-3 w-3 text-green-600" />
                                  <span className="text-green-600">Naik</span>
                                </>
                              ) : player.recent_games[0].average_score < player.recent_games[1].average_score ? (
                                <>
                                  <TrendingDown className="h-3 w-3 text-pink-600" />
                                  <span className="text-pink-600">Turun</span>
                                </>
                              ) : (
                                <span className="text-rose-500">Sama</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      </MemberLayout>
    </PageAccessGuard>
  );
}