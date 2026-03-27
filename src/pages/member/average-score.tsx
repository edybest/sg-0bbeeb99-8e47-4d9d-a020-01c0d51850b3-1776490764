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
    overall_score: number;
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
  }, [searchQuery, players, sortMode]);

  async function loadPlayerStats() {
    try {
      setLoading(true);

      // STEP 1: Ambil semua game BLOK beserta game_players (like Hall of Fame approach)
      const { data: games, error } = await supabase
        .from("games")
        .select(`
          id,
          game_name,
          game_date,
          game_players (
            member_id,
            overall_score
          )
        `)
        .in("game_type", ["BLOK", "Blok Rasmi 10 PIN"])
        .order("game_date", { ascending: false });

      if (error) {
        console.error("Error loading games:", error);
        throw error;
      }

      console.log("Games with players:", games);

      // STEP 2: Collect unique member IDs
      const memberIds = new Set<string>();
      (games || []).forEach((game: any) => {
        const players = game.game_players || [];
        players.forEach((player: any) => {
          if (player.member_id) {
            memberIds.add(player.member_id);
          }
        });
      });

      console.log("Unique member IDs:", Array.from(memberIds));

      // STEP 3: Fetch member details for those IDs (non-admin only)
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("id, username, full_name, avatar_url, sex, birthday, is_admin")
        .in("id", Array.from(memberIds))
        .eq("is_admin", false);

      if (membersError) {
        console.error("Error loading members:", membersError);
        throw membersError;
      }

      console.log("Members data:", membersData);

      // Create a map of members for quick lookup
      const membersMap = new Map(
        (membersData || []).map(m => [m.id, m])
      );

      // STEP 4: Build player stats
      const statsMap = new Map<string, PlayerStats>();

      (games || []).forEach((game: any) => {
        const players = game.game_players || [];
        
        players.forEach((playerData: any) => {
          const member = membersMap.get(playerData.member_id);
          if (!member) return; // Skip if admin or not found

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
            overall_score: playerData.overall_score ?? 0,
          });
        });
      });

      console.log("Stats map:", statsMap);

      // STEP 5: Kira handicap untuk setiap pemain
      const stats: PlayerStats[] = [];
      
      for (const player of Array.from(statsMap.values())) {
        // Susun games mengikut tarikh (terkini dulu)
        const sortedGames = [...player.recent_games].sort((a, b) => {
          return new Date(b.game_date).getTime() - new Date(a.game_date).getTime();
        });

        // Ambil 3 games terkini
        const last3Games = sortedGames.slice(0, 3);

        // Kira average (purata overall_score dari 3 games)
        const avgOf3 = last3Games.length > 0
          ? Math.round(last3Games.reduce((sum, g) => sum + g.overall_score, 0) / last3Games.length)
          : 0;

        // Kira handicap berdasarkan syarat baru
        const handicap = await calculateHandicap(
          player.member_id,
          player.sex,
          last3Games,
          [],
          avgOf3
        );

        stats.push({
          ...player,
          recent_games: last3Games,
          average_of_3: avgOf3,
          calculated_handicap: handicap,
        });
      }

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

  async function calculateHandicap(
    memberId: string,
    sex: string | null,
    last3Games: { game_date: string; overall_score: number }[],
    allBlokGames: { id: string; game_date: string }[],
    avgScore: number
  ): Promise<number> {
    // SYARAT 1: Mesti ada 3 BLOK terkini
    if (last3Games.length < 3) {
      await updateMemberHandicap(memberId, 0);
      return 0;
    }

    // SYARAT 2: Semak kehadiran dalam 5 BLOK terkini
    const last5Bloks = allBlokGames.slice(0, 5);
    const memberGameDates = new Set(last3Games.map(g => g.game_date));
    
    let consecutiveMissed = 0;
    for (const blok of last5Bloks) {
      if (!memberGameDates.has(blok.game_date)) {
        consecutiveMissed++;
      } else {
        break; // Reset jika ada kehadiran
      }
    }

    // Jika tidak sertai 5 BLOK berturut-turut
    if (consecutiveMissed >= 5) {
      await updateMemberHandicap(memberId, 0);
      return 0;
    }

    // SYARAT 3: Kira handicap berdasarkan jantina dan average score
    let handicap = 0;

    if (sex === "men") {
      // Lelaki: 750-799 = handicap 15
      if (avgScore >= 750 && avgScore <= 799) {
        handicap = 15;
      }
    } else if (sex === "women") {
      // Perempuan:
      if (avgScore >= 850 && avgScore <= 949) {
        handicap = 15;
      } else if (avgScore >= 750 && avgScore <= 849) {
        handicap = 25;
      } else if (avgScore <= 749) {
        handicap = 35;
      }
    }

    // Maksimum handicap = 35
    handicap = Math.min(handicap, 35);

    // STEP 4: Simpan ke database
    await updateMemberHandicap(memberId, handicap);

    return handicap;
  }

  async function updateMemberHandicap(memberId: string, handicap: number) {
    try {
      const { error } = await supabase
        .from("members")
        .update({ handicap })
        .eq("id", memberId);

      if (error) {
        console.error("Failed to update handicap for member", memberId, error);
      }
    } catch (err) {
      console.error("Update handicap error:", err);
    }
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

    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "username") {
        return a.username.localeCompare(b.username);
      }
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
                <CardTitle className="text-sm">Nota Handicap (Sistem Baru)</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-rose-700 space-y-1">
                <p className="font-semibold">Syarat Asas:</p>
                <p>• Dikira berdasarkan 3 BLOK terakhir yang ahli sertai</p>
                <p>• Kurang dari 3 BLOK → handicap = 0</p>
                <p>• Tidak sertai 5 BLOK berturut-turut → handicap = 0</p>
                
                <p className="font-semibold mt-3">Kiraan Handicap (Lelaki):</p>
                <p>• Total score 750-799 → handicap 15</p>
                <p>• Lain-lain → handicap 0</p>
                
                <p className="font-semibold mt-3">Kiraan Handicap (Perempuan):</p>
                <p>• Total score 850-949 → handicap 15</p>
                <p>• Total score 750-849 → handicap 25</p>
                <p>• Total score ≤749 → handicap 35</p>
                <p>• Lain-lain → handicap 0</p>
                
                <p className="font-semibold mt-3">Catatan:</p>
                <p>• Maksimum handicap = 35</p>
                <p>• Handicap disimpan secara automatik ke database</p>
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
                                  <Badge variant="outline">{game.overall_score}</Badge>
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
                              {player.recent_games[0].overall_score > player.recent_games[1].overall_score ? (
                                <>
                                  <TrendingUp className="h-3 w-3 text-green-600" />
                                  <span className="text-green-600">Naik</span>
                                </>
                              ) : player.recent_games[0].overall_score < player.recent_games[1].overall_score ? (
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