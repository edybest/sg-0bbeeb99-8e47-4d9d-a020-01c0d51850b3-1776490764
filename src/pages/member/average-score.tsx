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
import { ArrowLeft, Search, TrendingUp, Target, Award, Loader2, BarChart3, TrendingDown, AlertCircle, Calendar } from "lucide-react";
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
  current_handicap_in_db?: number;
};

export default function AverageScorePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingData, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<"username" | "score">("username");

  useEffect(() => {
    loadPlayerStats();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [searchQuery, players, sortMode]);

  async function loadPlayerStats() {
    try {
      setLoading(true);

      // STEP 1: Ambil games yang layak untuk handicap (exclude 9 PIN dan 369)
      // Filter menggunakan NOT ILIKE untuk exclude pattern
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
        .not("game_name", "ilike", "%9 pin%")
        .not("game_name", "ilike", "%9pin%")
        .not("game_name", "ilike", "%369%")
        .order("game_date", { ascending: false })
        .limit(60); // Kurangkan limit ke 60 untuk jadikan load lebih pantas

      if (error) {
        console.error("Error loading games:", error);
        throw error;
      }

      console.log(`Loaded ${games?.length || 0} eligible BLOK games`);

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

      if (memberIds.size === 0) {
        console.log("No players found in games");
        setPlayers([]);
        setFilteredPlayers([]);
        return;
      }

      console.log(`Found ${memberIds.size} unique players`);

      // STEP 3: Fetch member details (non-admin only) dengan order by username
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("id, username, full_name, avatar_url, sex, birthday, handicap")
        .in("id", Array.from(memberIds))
        .eq("is_admin", false)
        .order("username", { ascending: true });

      if (membersError) {
        console.error("Error loading members:", membersError);
        throw membersError;
      }

      console.log(`Loaded ${membersData?.length || 0} members`);

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
          if (!member) return;

          let player = statsMap.get(member.id);
          if (!player) {
            player = {
              member_id: member.id,
              username: member.username,
              full_name: member.full_name,
              avatar_url: member.avatar_url,
              sex: member.sex,
              birthday: member.birthday,
              current_handicap_in_db: member.handicap,
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

      console.log(`Built stats for ${statsMap.size} players`);

      // STEP 5: Kira handicap untuk setiap pemain
      const stats: PlayerStats[] = [];
      
      for (const player of Array.from(statsMap.values())) {
        // Tapis skor bawah 400 (tidak dikira untuk purata)
        const validGames = player.recent_games.filter(g => g.overall_score >= 400);

        // Susun games mengikut tarikh (terkini dulu)
        const sortedGames = [...validGames].sort((a, b) => {
          return new Date(b.game_date).getTime() - new Date(a.game_date).getTime();
        });

        // Ambil 3 games terkini
        const last3Games = sortedGames.slice(0, 3);

        // Kira average (purata overall_score dari 3 games)
        const avgOf3 = last3Games.length > 0
          ? Math.round(last3Games.reduce((sum, g) => sum + g.overall_score, 0) / last3Games.length)
          : 0;

        // Kira handicap secara sync (tanpa DB await loop)
        const handicap = calculateHandicapSync(
          player.sex,
          last3Games,
          games || [],
          avgOf3
        );

        // Hanya update pangkalan data jika handicap berubah (mengelakkan panggilan API serentak yang melambatkan page)
        if (player.current_handicap_in_db !== handicap) {
          updateMemberHandicap(player.member_id, handicap).catch(() => {});
        }

        stats.push({
          ...player,
          recent_games: last3Games,
          average_of_3: avgOf3,
          calculated_handicap: handicap,
        });
      }

      // Sort by username (ascending) as default
      stats.sort((a, b) => a.username.localeCompare(b.username));

      setPlayers(stats);
      setFilteredPlayers(stats);
    } catch (error) {
      console.error("Load stats error:", error);
    } finally {
      setLoading(false);
    }
  }

  function calculateHandicapSync(
    sex: string | null,
    last3Games: { game_date: string; overall_score: number }[],
    allBlokGames: any[],
    avgScore: number
  ): number {
    if (last3Games.length < 3) return 0;

    const last10Bloks = allBlokGames.slice(0, 10);
    const memberGameDates = new Set(last3Games.map(g => g.game_date));
    
    let consecutiveMissed = 0;
    for (const blok of last10Bloks) {
      if (!memberGameDates.has(blok.game_date)) {
        consecutiveMissed++;
      } else {
        break;
      }
    }

    if (consecutiveMissed >= 10) return 0;

    let handicap = 0;
    const s = sex?.toLowerCase() || "";
    const isMale = s === "men" || s === "male" || s === "lelaki";
    const isFemale = s === "women" || s === "female" || s === "perempuan";

    if (isMale) {
      if (avgScore <= 799) handicap = 15;
    } else if (isFemale) {
      if (avgScore >= 850 && avgScore <= 949) handicap = 15;
      else if (avgScore >= 750 && avgScore <= 849) handicap = 25;
      else if (avgScore <= 749) handicap = 35;
    }

    return Math.min(handicap, 35);
  }

  async function calculateHandicap(
    memberId: string,
    sex: string | null,
    last3Games: { game_date: string; overall_score: number }[],
    allBlokGames: any[],
    avgScore: number
  ): Promise<number> {
    return calculateHandicapSync(sex, last3Games, allBlokGames, avgScore);
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

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return (
    <MemberLayout>
      <SEO title="Average Score - AMBC Club" description="Statistik purata skor ahli" />
      <div className="min-h-screen bg-slate-50/50 pb-24">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="container flex h-16 items-center justify-between px-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <Link href="/member">
                <Button variant="ghost" size="icon" className="text-slate-600 hover:text-sky-600 hover:bg-sky-50">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Average Score</h1>
                <p className="text-xs text-slate-500">Purata & Handicap</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Controls & Info (Takes 4 cols on large screens) */}
            <div className="space-y-6 lg:col-span-4 xl:col-span-3">
              {/* Search Bar */}
              <Card className="border-sky-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Cari pemain..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-slate-200 focus-visible:ring-sky-500"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Sort Mode Toggle */}
              <Card className="border-sky-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Button
                      variant={sortMode === "username" ? "default" : "outline"}
                      onClick={() => setSortMode("username")}
                      className={`flex-1 ${sortMode === "username" ? "bg-sky-600 hover:bg-sky-700 text-white border-transparent" : "text-slate-600 hover:text-sky-600 hover:bg-sky-50 border-slate-200"}`}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Username
                    </Button>
                    <Button
                      variant={sortMode === "score" ? "default" : "outline"}
                      onClick={() => setSortMode("score")}
                      className={`flex-1 ${sortMode === "score" ? "bg-sky-600 hover:bg-sky-700 text-white border-transparent" : "text-slate-600 hover:text-sky-600 hover:bg-sky-50 border-slate-200"}`}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Skor
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200 shadow-sm hidden md:block">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-sky-800">
                    <AlertCircle className="h-4 w-4" />
                    Nota Handicap (Sistem Baru)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-700 space-y-1">
                  <p className="font-semibold text-slate-800">Syarat Asas:</p>
                  <p>• Dikira berdasarkan 3 BLOK terakhir</p>
                  <p>• Kurang dari 3 BLOK → handicap = 0</p>
                  <p>• Tidak sertai 10 BLOK berturut-turut → handicap = 0</p>
                  <p className="font-semibold text-red-500 mt-1">• Game 9 PIN dan 369 TIDAK dikira</p>
                  <p className="font-semibold text-red-500">• Skor bawah 400 TIDAK dikira</p>
                  
                  <p className="font-semibold mt-3 text-slate-800">Lelaki:</p>
                  <p>• Total score bawah ≤799 → handicap 15</p>
                  
                  <p className="font-semibold mt-3 text-slate-800">Perempuan:</p>
                  <p>• Total score 850-949 → handicap 15</p>
                  <p>• Total score 750-849 → handicap 25</p>
                  <p>• Total score ≤749 → handicap 35</p>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Player Stats List (Takes 8 cols on large screens) */}
            <div className="lg:col-span-8 xl:col-span-9">
              {loadingData ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                </div>
              ) : filteredPlayers.length === 0 ? (
                <Card className="border-dashed border-slate-200 bg-transparent shadow-none">
                  <CardContent className="py-20 text-center text-slate-500">
                    <Target className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>Tiada pemain dijumpai</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredPlayers.map((player, index) => (
                    <Card
                      key={player.member_id}
                      className="transform transition-all hover:-translate-y-1 hover:shadow-md border-sky-100 overflow-hidden flex flex-col bg-white"
                    >
                      <CardContent className="p-0 flex-1 flex flex-col">
                        {/* Top Section: Avatar & Basic Info */}
                        <div className="p-4 flex items-center gap-3 border-b border-slate-100">
                          <div className="text-center w-8">
                            <span className="text-lg font-bold text-slate-300">#{index + 1}</span>
                          </div>

                          <Link href={`/member/profile?id=${player.member_id}`} className="flex-shrink-0">
                            {player.avatar_url ? (
                              <Image
                                src={player.avatar_url}
                                alt={player.username}
                                width={48}
                                height={48}
                                className="rounded-full border-2 border-sky-100 object-cover h-12 w-12"
                                loading="lazy"
                                unoptimized
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                {player.username[0].toUpperCase()}
                              </div>
                            )}
                          </Link>

                          <div className="flex-1 min-w-0">
                            <Link href={`/member/profile?id=${player.member_id}`}>
                              <h3 className="font-bold text-slate-800 hover:text-sky-600 transition-colors truncate">
                                {player.full_name}
                              </h3>
                              <p className="text-xs text-slate-500 truncate">@{player.username}</p>
                            </Link>
                          </div>
                        </div>

                        {/* Middle Section: Scores & Handicap */}
                        <div className="px-4 py-3 bg-slate-50/50 flex justify-between items-center border-b border-slate-100">
                          <div>
                            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Avg 3 Games</p>
                            <p className="text-2xl font-bold text-sky-600 drop-shadow-sm">
                              {player.average_of_3}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">Handicap</p>
                            <Badge className={player.calculated_handicap > 0 ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300 border-none"}>
                              {player.calculated_handicap}
                            </Badge>
                          </div>
                        </div>

                        {/* Bottom Section: Recent Games */}
                        <div className="p-4 bg-white flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-slate-600">3 Game Terkini</p>
                            {player.recent_games.length >= 2 && (
                              <span className="flex items-center gap-1 text-[10px] bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                                {player.recent_games[0].overall_score > player.recent_games[1].overall_score ? (
                                  <>
                                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                                    <span className="text-emerald-600 font-medium">Naik</span>
                                  </>
                                ) : player.recent_games[0].overall_score < player.recent_games[1].overall_score ? (
                                  <>
                                    <TrendingDown className="h-3 w-3 text-red-500" />
                                    <span className="text-red-600 font-medium">Turun</span>
                                  </>
                                ) : (
                                  <span className="text-slate-500">Sama</span>
                                )}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            {player.recent_games.length > 0 ? (
                              player.recent_games.map((game, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 rounded-md p-2 border border-slate-100/50">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-slate-700 truncate font-medium">{game.game_name}</p>
                                    <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                                      <Calendar className="h-3 w-3" />
                                      {formatDate(game.game_date)}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="flex-shrink-0 bg-white text-sky-700 border-sky-200 font-bold px-2 py-0.5">
                                    {game.overall_score}
                                  </Badge>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 rounded-md border border-slate-100/50 border-dashed">Belum sertai sebarang permainan</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </MemberLayout>
  );
}