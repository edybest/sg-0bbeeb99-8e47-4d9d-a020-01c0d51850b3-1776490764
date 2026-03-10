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
import { ArrowLeft, Search, TrendingUp, Target, Award, Loader2, BarChart3, TrendingDown } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { useAuth } from "@/hooks/useAuth";
import { PageAccessGuard } from "@/components/PageAccessGuard";

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
  const { member, loading, isAuthenticated } = useAuth(false);
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingData, setLoading] = useState(true);

  useEffect(() => {
    loadPlayerStats();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [searchQuery, players]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  async function loadPlayerStats() {
    try {
      setLoading(true);

      // Get all members
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select("id, username, full_name, avatar_url, sex, birthday");

      if (membersError) throw membersError;

      const statsPromises = members?.map(async (member) => {
        // Get last 3 official Blok games
        const { data: recentGames } = await supabase
          .from("game_players")
          .select(`
            average_score,
            games!inner (
              game_name,
              game_date,
              game_type
            )
          `)
          .eq("member_id", member.id)
          .eq("games.game_type", "Blok Rasmi 10 PIN")
          .order("games.game_date", { ascending: false })
          .limit(3);

        const games = recentGames?.map((g: any) => ({
          game_name: g.games.game_name,
          game_date: g.games.game_date,
          average_score: g.average_score
        })) || [];

        // Calculate average of 3 recent games
        const avgOf3 = games.length > 0
          ? Math.round(games.reduce((sum, g) => sum + g.average_score, 0) / games.length)
          : 0;

        // Calculate handicap based on requirements
        const handicap = calculateHandicap(member, games, avgOf3);

        return {
          member_id: member.id,
          username: member.username,
          full_name: member.full_name,
          avatar_url: member.avatar_url,
          sex: member.sex,
          birthday: member.birthday,
          recent_games: games,
          average_of_3: avgOf3,
          calculated_handicap: handicap
        };
      }) || [];

      const stats = await Promise.all(statsPromises);
      
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

    // Check if last game was more than 3 months ago
    const lastGameDate = new Date(recentGames[0].game_date);
    const monthsAgo = Math.floor(
      (Date.now() - lastGameDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    if (monthsAgo > 3) {
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
    if (!searchQuery) {
      setFilteredPlayers(players);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = players.filter(
      (p) =>
        p.username.toLowerCase().includes(query) ||
        p.full_name.toLowerCase().includes(query)
    );
    setFilteredPlayers(filtered);
  }

  return (
    <PageAccessGuard pagePath="/member/average-score" requireAuth={true}>
      <>
        <SEO title="Average Score - AMBC Club" description="Player average scores and handicaps" />
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
                <ClubLogo size="sm" />
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

            {/* Info Card */}
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm">Nota Handicap</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-gray-700 space-y-1">
                <p>• Dikira berdasarkan 3 blok terakhir (Blok Rasmi 10 PIN sahaja)</p>
                <p>• Belum cukup 3 kali: 0 hcp (perempuan: 25 hcp)</p>
                <p>• Bawah umur 15: minimum 15 hcp</p>
                <p>• Lebih 3 bulan tidak join: 0 hcp (perempuan: 25 hcp)</p>
                <p>• Formula: (200 - purata) × 0.8</p>
              </CardContent>
            </Card>

            {/* Player Stats */}
            {loadingData ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredPlayers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
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
                          <span className="text-xl font-bold text-gray-700">#{index + 1}</span>
                        </div>

                        {/* Avatar & Name */}
                        <Link href={`/member/profile?id=${player.member_id}`} className="flex-shrink-0">
                          {player.avatar_url ? (
                            <Image
                              src={player.avatar_url}
                              alt={player.username}
                              width={50}
                              height={50}
                              className="rounded-full border-2 border-blue-600"
                            />
                          ) : (
                            <div className="w-[50px] h-[50px] rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                              {player.username[0].toUpperCase()}
                            </div>
                          )}
                        </Link>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <Link href={`/member/profile?id=${player.member_id}`}>
                            <h3 className="font-bold hover:text-blue-600 transition-colors truncate">
                              {player.full_name}
                            </h3>
                            <p className="text-sm text-gray-600">@{player.username}</p>
                          </Link>

                          {/* Recent 3 Games */}
                          <div className="mt-3 space-y-2">
                            {player.recent_games.length > 0 ? (
                              player.recent_games.map((game, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded p-2">
                                  <span className="text-gray-600 truncate mr-2">{game.game_name}</span>
                                  <Badge variant="outline">{game.average_score}</Badge>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-gray-500 italic">Belum join game</p>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="text-right space-y-2">
                          <div>
                            <p className="text-xs text-gray-500">Avg 3 Games</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {player.average_of_3}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Handicap</p>
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
                                  <TrendingDown className="h-3 w-3 text-red-600" />
                                  <span className="text-red-600">Turun</span>
                                </>
                              ) : (
                                <span className="text-gray-500">Sama</span>
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
      </>
    </PageAccessGuard>
  );
}